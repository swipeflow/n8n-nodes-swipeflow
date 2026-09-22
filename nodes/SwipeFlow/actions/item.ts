import { NodeOperationError, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';
import { ContentType, UpdateItemDecisionRequest, type CreateItemInput } from '../sdk';
import { parseJsonParameter, splitIds } from '../shared/utils';
import { collectPages, projectIdOf, type ActionHandler } from './params';

const asData = (value: unknown) => value as IDataObject;
const itemIdOf = (ctx: IExecuteFunctions, i: number) => ctx.getNodeParameter('itemId', i) as string;

export function buildCreateRequest(
	ctx: IExecuteFunctions,
	i: number,
	fallbackIdempotencyKey?: string,
): CreateItemInput {
	const additional = ctx.getNodeParameter('additionalFields', i, {}) as IDataObject;
	const description = ctx.getNodeParameter('description', i, '') as string;
	const metadata = parseJsonParameter(ctx.getNode(), additional.metadata, 'Metadata', i);
	const mediaIds = splitIds(additional.mediaIds as string | undefined);
	const idempotencyKey =
		(additional.idempotencyKey as string | undefined) || fallbackIdempotencyKey;

	let expiresAt: string | undefined;
	if (additional.expiresAt) {
		const parsed = new Date(additional.expiresAt as string);
		if (Number.isNaN(parsed.getTime()))
			throw new NodeOperationError(ctx.getNode(), 'Expiration Date is not a valid date', {
				itemIndex: i,
			});
		expiresAt = parsed.toISOString();
	}

	return {
		title: ctx.getNodeParameter('title', i) as string,
		...(description && { description }),
		content: {
			type: ctx.getNodeParameter('contentType', i) as ContentType,
			data: ctx.getNodeParameter('content', i) as string,
		},
		...(mediaIds.length && { media: mediaIds }),
		...(metadata && { metadata }),
		...(expiresAt && { expiresAt }),
		...(idempotencyKey && { idempotencyKey }),
	};
}

function decide(decision: UpdateItemDecisionRequest.decision): ActionHandler {
	return async (ctx, client, i) => {
		const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
		const comment = ctx.getNodeParameter('comment', i, '') as string;
		const item = await client.items.decide(projectIdOf(ctx, i), itemIdOf(ctx, i), {
			decision,
			...(comment && { comment }),
			...(options.targetVersion !== undefined && {
				targetVersion: options.targetVersion as number,
			}),
		});
		return asData(item);
	};
}

export const itemActions: Record<string, ActionHandler> = {
	create: async (ctx, client, i) =>
		asData(await client.items.create(projectIdOf(ctx, i), buildCreateRequest(ctx, i))),

	get: async (ctx, client, i) => {
		const options = ctx.getNodeParameter('options', i, {}) as {
			includeVersions?: boolean;
			resolveMedia?: boolean;
		};
		return asData(await client.items.get(projectIdOf(ctx, i), itemIdOf(ctx, i), options));
	},

	getAll: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
		const options = ctx.getNodeParameter('options', i, {}) as IDataObject;
		const items = await collectPages(ctx, i, async (page, limit) => {
			const response = await client.items.list(projectId, { ...filters, ...options, page, limit });
			return { results: response.items ?? [], pages: response.pagination?.pages };
		});
		return items.map(asData);
	},

	getNext: async (ctx, client, i) => asData(await client.items.getNext(projectIdOf(ctx, i))),

	getStatus: async (ctx, client, i) =>
		asData(await client.items.getStatus(projectIdOf(ctx, i), itemIdOf(ctx, i))),

	approve: decide(UpdateItemDecisionRequest.decision.APPROVED),
	reject: decide(UpdateItemDecisionRequest.decision.REJECTED),
	requestChanges: decide(UpdateItemDecisionRequest.decision.CHANGE_REQUESTED),

	markProcessed: async (ctx, client, i) => {
		const { action } = ctx.getNodeParameter('options', i, {}) as { action?: string };
		return asData(
			await client.items.markProcessed(
				projectIdOf(ctx, i),
				itemIdOf(ctx, i),
				action ? { action } : {},
			),
		);
	},

	delete: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const itemId = itemIdOf(ctx, i);
		await client.items.delete(projectId, itemId);
		return { success: true, itemId, projectId };
	},

	createVersion: async (ctx, client, i) => {
		const fields = ctx.getNodeParameter('updateFields', i, {}) as IDataObject;
		const metadata = parseJsonParameter(ctx.getNode(), fields.metadata, 'Metadata', i);
		const mediaIds = splitIds(fields.mediaIds as string | undefined);
		const item = await client.itemVersions.create(projectIdOf(ctx, i), itemIdOf(ctx, i), {
			...(fields.title && { title: fields.title as string }),
			...(fields.description && { description: fields.description as string }),
			...(fields.content && {
				content: {
					type: (fields.contentType as ContentType | undefined) ?? ContentType.TEXT,
					data: fields.content as string,
				},
			}),
			...(mediaIds.length && { media: mediaIds }),
			...(metadata && { metadata }),
		});
		return asData(item);
	},

	listVersions: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const itemId = itemIdOf(ctx, i);
		const { sortOrder } = ctx.getNodeParameter('options', i, {}) as { sortOrder?: 'asc' | 'desc' };
		const versions = await collectPages(ctx, i, async (page, limit) => {
			const response = await client.itemVersions.list(projectId, itemId, {
				page,
				limit,
				sortOrder,
			});
			return { results: response.versions ?? [], pages: response.pagination?.pages };
		});
		return versions.map(asData);
	},

	getVersion: async (ctx, client, i) =>
		asData(
			await client.itemVersions.get(
				projectIdOf(ctx, i),
				itemIdOf(ctx, i),
				ctx.getNodeParameter('version', i) as number,
			),
		),
};
