import {
	WAIT_INDEFINITELY,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';
import { WebhookEvent, type SwipeFlowClient, type Webhook } from '../sdk';
import { DECISION_EVENTS, WEBHOOK_INTEGRATION_PROVIDER, WEBHOOK_TYPE } from '../shared/constants';
import { configureWaitTill } from './limit';
import { isWaitWebhookFor, waitWebhookName } from './naming';
import { buildOutcome, outcomeFromStatus } from './outcome';

export const WAIT_EVENTS = [...DECISION_EVENTS, WebhookEvent.ITEM_DELETED];

function resumeUrlFor(ctx: IExecuteFunctions, itemId: string): string {
	// n8n checks the HMAC signature only for a node whose operation is sendAndWait; any other
	// waiting node must present the execution's resume token, which $execution.resumeUrl carries.
	const signed = ctx.getNodeParameter('operation', 0, '') === 'sendAndWait';
	if (signed && typeof ctx.getSignedResumeUrl === 'function') {
		return ctx.getSignedResumeUrl({ itemId });
	}

	const resumeUrl = ctx.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string;
	const queryIndex = resumeUrl.indexOf('?');
	const path = queryIndex === -1 ? resumeUrl : resumeUrl.slice(0, queryIndex);
	const query = new URLSearchParams(queryIndex === -1 ? '' : resumeUrl.slice(queryIndex + 1));
	query.set('itemId', itemId);
	return `${path}/${ctx.getNode().id}?${query}`;
}

/**
 * Registers the project webhook that resumes this execution when `itemId` is decided. The
 * registration is idempotent per execution and item: a retried node, or a second wait on the
 * same item in a loop, updates its webhook instead of adding another. A wait with a time limit
 * sets the webhook's `expiresAt` to it, so SwipeFlow stops delivering and removes the webhook
 * even if the execution is cancelled. Nothing is registered when `waitTill` has already passed.
 */
export async function registerWait(
	ctx: IExecuteFunctions,
	client: SwipeFlowClient,
	projectId: string,
	itemId: string,
	waitTill: Date,
): Promise<{ webhookId?: string }> {
	const executionId = ctx.getExecutionId();

	// If the list cannot be read, registering proceeds and may add one.
	const known = await client.webhooks
		.list(projectId, { type: WEBHOOK_TYPE, includeInactive: true })
		.catch((): Webhook[] => []);
	const ours = known.filter(
		(webhook) => webhook.integrationProvider === WEBHOOK_INTEGRATION_PROVIDER,
	);
	const existing = ours.find((webhook) => isWaitWebhookFor(webhook.name, executionId, itemId));

	let webhookId = existing?.id;
	if (waitTill.getTime() > Date.now()) {
		const registration = {
			name: waitWebhookName(executionId, itemId),
			url: resumeUrlFor(ctx, itemId),
			events: WAIT_EVENTS,
			expiresAt: waitTill.getTime() === WAIT_INDEFINITELY.getTime() ? null : waitTill.toISOString(),
		};

		if (webhookId) {
			await client.webhooks.update(projectId, webhookId, { ...registration, active: true });
		} else {
			const created = await client.webhooks.create(projectId, {
				...registration,
				type: WEBHOOK_TYPE,
				integrationProvider: WEBHOOK_INTEGRATION_PROVIDER,
				integrationLink: `${ctx.getInstanceBaseUrl().replace(/\/+$/, '')}/workflow/${ctx.getWorkflow().id}/executions/${executionId}`,
			});
			webhookId = created.id;
		}
	}

	return { webhookId };
}

/**
 * Pauses the execution until `itemId` is decided.
 *
 * SwipeFlow has no per-item callback, so each wait registers a webhook on the project that
 * points at this execution's signed resume URL, then removes it when a decision arrives.
 * The item is re-read after registering: a decision made between creating the item and
 * registering the webhook would otherwise never be delivered.
 */
export async function waitForDecision(
	ctx: IExecuteFunctions,
	client: SwipeFlowClient,
	projectId: string,
	itemId: string,
): Promise<INodeExecutionData[][]> {
	const waitTill = configureWaitTill(ctx);
	const { webhookId } = await registerWait(ctx, client, projectId, itemId, waitTill);

	const item = await client.items.get(projectId, itemId);
	const outcome = outcomeFromStatus(item.status);
	if (outcome) {
		if (webhookId) await client.webhooks.delete(projectId, webhookId);
		return [
			[
				{
					json: buildOutcome({ outcome, projectId, itemId, item: item as IDataObject }),
					pairedItem: { item: 0 },
				},
			],
		];
	}

	await ctx.putExecutionToWait(waitTill);

	// n8n resumes a timed-out wait by passing this node's input straight through, whatever is
	// returned here, so downstream nodes see no `decision` field.
	return [ctx.getInputData()];
}
