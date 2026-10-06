import type { IDataObject } from 'n8n-workflow';
import type { WebhookEvent } from '../sdk';
import { projectIdOf, type ActionHandler } from './params';

const asData = (value: unknown) => value as IDataObject;
const webhookIdOf = (ctx: Parameters<ActionHandler>[0], i: number) =>
	ctx.getNodeParameter('webhookId', i) as string;

export const webhookActions: Record<string, ActionHandler> = {
	create: async (ctx, client, i) => {
		const { name, secret } = ctx.getNodeParameter('additionalFields', i, {}) as {
			name?: string;
			secret?: string;
		};
		const webhook = await client.webhooks.create(projectIdOf(ctx, i), {
			url: ctx.getNodeParameter('url', i) as string,
			events: ctx.getNodeParameter('events', i) as WebhookEvent[],
			...(name && { name }),
			...(secret && { secret }),
		});
		return asData(webhook);
	},

	getAll: async (ctx, client, i) => (await client.webhooks.list(projectIdOf(ctx, i))).map(asData),

	delete: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const webhookId = webhookIdOf(ctx, i);
		await client.webhooks.delete(projectId, webhookId);
		return { success: true, webhookId, projectId };
	},

	test: async (ctx, client, i) =>
		asData(await client.webhooks.test(projectIdOf(ctx, i), webhookIdOf(ctx, i))),
};
