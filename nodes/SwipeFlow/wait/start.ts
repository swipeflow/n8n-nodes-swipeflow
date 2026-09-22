import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { WebhookEvent, type SwipeFlowClient, type Webhook } from '../sdk';
import { DECISION_EVENTS, WEBHOOK_INTEGRATION_PROVIDER, WEBHOOK_TYPE } from '../shared/constants';
import { configureWaitTill } from './limit';
import { isExpiredWaitWebhook, isWaitWebhookFor, waitWebhookName } from './naming';
import { buildOutcome, outcomeFromStatus } from './outcome';

export const WAIT_EVENTS = [...DECISION_EVENTS, WebhookEvent.ITEM_DELETED];

function resumeUrlFor(ctx: IExecuteFunctions, itemId: string): string {
	if (typeof ctx.getSignedResumeUrl === 'function') return ctx.getSignedResumeUrl({ itemId });

	// n8n versions that predate signed resume URLs.
	const resumeUrl = ctx.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string;
	return `${resumeUrl}/${ctx.getNode().id}?itemId=${encodeURIComponent(itemId)}`;
}

async function removeExpiredWaitWebhooks(
	client: SwipeFlowClient,
	projectId: string,
	webhooks: Webhook[],
): Promise<void> {
	const now = Date.now();
	const expired = webhooks.filter(
		(webhook) => webhook.id && isExpiredWaitWebhook(webhook.name, now),
	);
	await Promise.allSettled(
		expired.map((webhook) => client.webhooks.delete(projectId, webhook.id as string)),
	);
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
	const executionId = ctx.getExecutionId();

	// Registering is idempotent per execution and item: a retried node, or a second wait on the
	// same item in a loop, updates its webhook instead of adding another. If the list cannot be
	// read, registering proceeds and may add one.
	const known = await client.webhooks
		.list(projectId, { type: WEBHOOK_TYPE, includeInactive: true })
		.catch((): Webhook[] => []);
	const ours = known.filter(
		(webhook) => webhook.integrationProvider === WEBHOOK_INTEGRATION_PROVIDER,
	);
	const existing = ours.find((webhook) => isWaitWebhookFor(webhook.name, executionId, itemId));

	// A limit that has already passed resumes the execution at once, so there is nothing to
	// deliver to and a webhook would only be left behind.
	let webhookId = existing?.id;
	if (waitTill.getTime() > Date.now()) {
		const registration = {
			name: waitWebhookName(executionId, itemId, waitTill),
			url: resumeUrlFor(ctx, itemId),
			events: WAIT_EVENTS,
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

	await removeExpiredWaitWebhooks(client, projectId, ours).catch(() => undefined);
	await ctx.putExecutionToWait(waitTill);

	// n8n resumes a timed-out wait by passing this node's input straight through, whatever is
	// returned here, so downstream nodes see no `decision` field.
	return [ctx.getInputData()];
}
