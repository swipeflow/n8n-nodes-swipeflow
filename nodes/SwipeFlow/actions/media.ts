import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { mediaRef, type MediaDescriptor } from '../sdk';
import { MAX_PAGE_SIZE } from '../shared/constants';
import { ExecutionItems, projectIdOf, type ActionHandler } from './params';

const asData = (value: unknown) => value as IDataObject;
const mediaIdOf = (ctx: IExecuteFunctions, i: number) =>
	ctx.getNodeParameter('mediaId', i) as string;
const withRef = (media: MediaDescriptor): IDataObject =>
	({ ...media, ...(media.id && { ref: mediaRef(media.id) }) }) as IDataObject;

/** Storage URLs are third-party hosts; requests to them must never carry the SwipeFlow API key. */
async function storageRequest(
	ctx: IExecuteFunctions,
	options: Parameters<IExecuteFunctions['helpers']['httpRequest']>[0],
) {
	try {
		return await ctx.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(ctx.getNode(), error as JsonObject);
	}
}

export const mediaActions: Record<string, ActionHandler> = {
	upload: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const property = ctx.getNodeParameter('binaryPropertyName', i) as string;
		const binary = ctx.helpers.assertBinaryData(i, property);
		const buffer = await ctx.helpers.getBinaryDataBuffer(i, property);
		const fileName =
			(ctx.getNodeParameter('fileName', i, '') as string) || binary.fileName || 'file';

		const ticket = await client.media.createUpload(projectId, {
			filename: fileName,
			fileSize: buffer.length,
			mimeType: binary.mimeType || 'application/octet-stream',
		});
		if (!ticket.id || !ticket.upload?.url) {
			throw new NodeOperationError(ctx.getNode(), 'SwipeFlow did not return an upload URL', {
				itemIndex: i,
			});
		}

		await storageRequest(ctx, {
			method: ticket.upload.method ?? 'PUT',
			url: ticket.upload.url,
			headers: ticket.upload.headers,
			body: buffer,
			json: false,
		});
		return withRef(await client.media.confirmUpload(ticket.id));
	},

	importFromUrl: async (ctx, client, i) => {
		const fileName = ctx.getNodeParameter('fileName', i, '') as string;
		const media = await client.media.importFromUrl(projectIdOf(ctx, i), {
			url: ctx.getNodeParameter('url', i) as string,
			...(fileName && { fileName }),
		});
		return withRef(media);
	},

	get: async (ctx, client, i) => withRef(await client.media.get(mediaIdOf(ctx, i))),

	getAll: async (ctx, client, i) => {
		const projectId = projectIdOf(ctx, i);
		const filters = ctx.getNodeParameter('filters', i, {}) as IDataObject;
		const wanted = ctx.getNodeParameter('returnAll', i, false)
			? Infinity
			: (ctx.getNodeParameter('limit', i, 50) as number);
		const collected: MediaDescriptor[] = [];

		let cursor: string | undefined;
		do {
			const page = await client.media.list(projectId, {
				...filters,
				cursor,
				limit: Math.min(MAX_PAGE_SIZE, wanted - collected.length),
			});
			collected.push(...(page.data ?? []));
			cursor = page.hasMore && page.nextCursor ? page.nextCursor : undefined;
		} while (cursor && collected.length < wanted);

		return collected.slice(0, wanted).map(withRef);
	},

	getUsage: async (ctx, client, i) => asData(await client.media.usage(projectIdOf(ctx, i))),

	delete: async (ctx, client, i) => {
		const mediaId = mediaIdOf(ctx, i);
		await client.media.delete(mediaId);
		return { success: true, mediaId };
	},

	download: async (ctx, client, i) => {
		const media = await client.media.get(mediaIdOf(ctx, i));
		if (!media.url) {
			throw new NodeOperationError(ctx.getNode(), 'This media has no download URL yet', {
				itemIndex: i,
				description: `Its status is "${media.status}"`,
			});
		}

		const content = (await storageRequest(ctx, {
			url: media.url,
			encoding: 'arraybuffer',
			json: false,
		})) as Buffer;
		const property = ctx.getNodeParameter('binaryPropertyName', i) as string;
		const binary = await ctx.helpers.prepareBinaryData(content, media.fileName, media.contentType);

		return new ExecutionItems(
			ctx.helpers.constructExecutionMetaData(
				[{ json: withRef(media), binary: { [property]: binary } }],
				{ itemData: { item: i } },
			),
		);
	},
};
