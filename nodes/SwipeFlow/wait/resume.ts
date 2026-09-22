import type { IDataObject, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { itemIdOf, type WebhookEnvelope } from '../shared/events';
import { createClient } from '../shared/transport';
import { isWaitWebhookFor } from './naming';
import { buildOutcome, outcomeFromEvent } from './outcome';

/**
 * Called for every event on the project, since the wait webhook subscribes to the whole
 * project. Only a decision on the item this execution is waiting for resumes it; anything
 * else is acknowledged and dropped. n8n authenticates the call itself through the signed
 * resume URL, which also covers the `itemId` query parameter used here.
 */
export async function handleResume(ctx: IWebhookFunctions): Promise<IWebhookResponseData> {
	const envelope = ctx.getBodyData() as WebhookEnvelope;
	const data = (
		typeof envelope.data === 'object' && envelope.data !== null ? envelope.data : {}
	) as IDataObject;
	const waitingFor = String((ctx.getQueryData() as IDataObject).itemId ?? '');
	const outcome = outcomeFromEvent(envelope.event);
	const eventItemId = itemIdOf(data);

	if (!outcome || !waitingFor || eventItemId !== waitingFor) {
		ctx.getResponseObject().status(200).json({ ignored: true });
		return { noWebhookResponse: true };
	}

	const item = (typeof data.item === 'object' ? data.item : undefined) as IDataObject | undefined;
	const projectId = String(item?.projectId ?? '');
	const decision = (typeof data.decision === 'object' ? data.decision : undefined) as
		| IDataObject
		| undefined;

	await removeWaitWebhook(ctx, projectId, waitingFor).catch(() => undefined);

	return {
		workflowData: [
			[{ json: buildOutcome({ outcome, projectId, itemId: waitingFor, item, decision }) }],
		],
	};
}

async function removeWaitWebhook(
	ctx: IWebhookFunctions,
	projectId: string,
	itemId: string,
): Promise<void> {
	if (!projectId) return;
	const client = createClient(ctx);
	const executionId = ctx.getExecutionId();
	const webhooks = await client.webhooks.list(projectId, { type: 'dynamic' });
	const own = webhooks.find(
		(webhook) => webhook.id && isWaitWebhookFor(webhook.name, executionId, itemId),
	);
	if (own?.id) await client.webhooks.delete(projectId, own.id);
}
