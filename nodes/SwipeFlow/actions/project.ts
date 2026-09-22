import type { IDataObject } from 'n8n-workflow';
import { collectPages, projectIdOf, type ActionHandler } from './params';

const asData = (value: unknown) => value as IDataObject;

export const projectActions: Record<string, ActionHandler> = {
	create: async (ctx, client, i) =>
		asData(
			await client.projects.create({
				name: ctx.getNodeParameter('name', i) as string,
				description: ctx.getNodeParameter('description', i, '') as string,
			}),
		),

	resolve: async (ctx, client, i) =>
		asData(
			await client.projects.resolve({
				name: ctx.getNodeParameter('name', i) as string,
				description: ctx.getNodeParameter('description', i, '') as string,
			}),
		),

	get: async (ctx, client, i) => asData(await client.projects.get(projectIdOf(ctx, i))),

	getAll: async (ctx, client, i) => {
		const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
		const projects = await collectPages(ctx, i, async (page, limit) => {
			const response = await client.projects.list({ ...filters, page, limit });
			return { results: response.projects ?? [], pages: response.pagination?.pages };
		});
		return projects.map(asData);
	},

	update: async (ctx, client, i) => {
		const fields = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;
		return asData(await client.projects.update(projectIdOf(ctx, i), fields));
	},

	delete: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		await client.projects.delete(projectId);
		return { success: true, projectId };
	},
};
