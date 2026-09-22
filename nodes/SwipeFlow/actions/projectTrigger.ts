import type { IDataObject } from 'n8n-workflow';
import { parseJsonParameter } from '../shared/utils';
import { projectIdOf, type ActionHandler } from './params';

const asData = (value: unknown) => value as IDataObject;
const triggerIdOf = (ctx: Parameters<ActionHandler>[0], i: number) =>
	ctx.getNodeParameter('triggerId', i) as string;

export const projectTriggerActions: Record<string, ActionHandler> = {
	create: async (ctx, client, i) =>
		asData(
			await client.triggers.create(projectIdOf(ctx, i), {
				name: ctx.getNodeParameter('name', i) as string,
				event: ctx.getNodeParameter('event', i) as string,
			}),
		),

	getAll: async (ctx, client, i) => (await client.triggers.list(projectIdOf(ctx, i))).map(asData),

	delete: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const triggerId = triggerIdOf(ctx, i);
		await client.triggers.delete(projectId, triggerId);
		return { success: true, triggerId, projectId };
	},

	run: async (ctx, client, i) => {
		const payload = parseJsonParameter(
			ctx.getNode(),
			ctx.getNodeParameter('payload', i, ''),
			'Payload',
			i,
		);
		return asData(
			await client.triggers.run(
				projectIdOf(ctx, i),
				triggerIdOf(ctx, i),
				payload ? { payload } : {},
			),
		);
	},
};
