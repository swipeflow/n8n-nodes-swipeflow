import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { HttpMethod, Query } from '../sdk';
import { createTransport, normalizeApiPath } from '../shared/transport';
import { toExecutionData } from '../shared/utils';

/**
 * Behaviour of node version 1, kept as it was so existing workflows keep producing the
 * same results: the metadata parameter is passed through as entered, Expiration Date is
 * ignored, and item lists are unpaginated. Version 2 fixes each of these.
 */
export async function runLegacyAction(
	ctx: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const send = createTransport(ctx);
	const get = (path: string, query?: Query) => send('GET', path, { query }) as Promise<IDataObject>;
	const call = (method: HttpMethod, path: string, body?: IDataObject) =>
		send(method, path, { body }) as Promise<IDataObject>;
	const param = <T>(name: string, fallback?: unknown) =>
		ctx.getNodeParameter(name, i, fallback) as T;
	const many = (list: unknown) => toExecutionData(ctx, list as IDataObject[], i);
	const one = (data: IDataObject) => toExecutionData(ctx, data, i);
	const asList = (response: IDataObject, key: string) => {
		const list = response[key] ?? response;
		return Array.isArray(list) ? many(list) : one(response);
	};

	if (resource === 'item') {
		const projectId = param<string>('projectId', '');
		const itemId = param<string>('itemId', '');
		const itemPath = `/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}`;

		switch (operation) {
			case 'create': {
				const description = param<string>('description', '');
				return one(
					await call('POST', `/v1/projects/${encodeURIComponent(projectId)}/items`, {
						title: param<string>('title'),
						description: description || undefined,
						content: { type: param<string>('contentType'), data: param<string>('content') },
						metadata: param<IDataObject>('metadata', {}) || undefined,
					}),
				);
			}
			case 'getAll': {
				const query: Query = {};
				const status = param<string>('status', '');
				const search = param<string>('search', '');
				const sortBy = param<string>('sortBy', 'createdAt');
				const sortOrder = param<string>('sortOrder', 'desc');
				const page = param<number>('page', 1);
				const limit = param<number>('limit', 10);
				if (status) query.status = status;
				if (search) query.search = search;
				if (sortBy) query.sortBy = sortBy;
				if (sortOrder) query.sortOrder = sortOrder;
				if (page && page > 1) query.page = page;
				if (limit && limit !== 10) query.limit = Math.min(limit, 100);
				if (param<boolean>('includeVersions', false)) query.includeVersions = true;
				return asList(
					await get(`/v1/projects/${encodeURIComponent(projectId)}/items`, query),
					'items',
				);
			}
			case 'get':
				return one(
					await get(
						itemPath,
						param<boolean>('includeVersions', false) ? { includeVersions: true } : {},
					),
				);
			case 'approve':
			case 'reject':
			case 'requestChanges': {
				const decision = {
					approve: 'approved',
					reject: 'rejected',
					requestChanges: 'change_requested',
				}[operation];
				const comment = param<string>('comment', '');
				return one(
					await call('PUT', `${itemPath}/decision`, { decision, comment: comment || undefined }),
				);
			}
			case 'createVersion': {
				const version: IDataObject = {};
				const title = param<string>('title', '');
				const description = param<string>('description', '');
				const contentType = param<string>('contentType', '');
				const content = param<string>('content', '');
				const metadata = param<Record<string, unknown>>('metadata', {});
				if (title) version.title = title;
				if (description) version.description = description;
				if (contentType && content) version.content = { type: contentType, data: content };
				if (metadata && Object.keys(metadata).length > 0)
					version.metadata = metadata as IDataObject;
				return one(await call('POST', `${itemPath}/versions`, version));
			}
			case 'delete':
				await send('DELETE', itemPath);
				return one({ success: true, itemId, projectId });
		}
	}

	if (resource === 'project') {
		const projectId = param<string>('projectId', '');
		const projectPath = `/v1/projects/${encodeURIComponent(projectId)}`;

		switch (operation) {
			case 'list':
				return asList(await get('/v1/projects'), 'projects');
			case 'fetch':
				return one(await get(projectPath));
			case 'create':
				return one(
					await call('POST', '/v1/projects', {
						name: param<string>('name'),
						description: param<string>('description', ''),
					}),
				);
			case 'update':
				return one(
					await call('PUT', projectPath, {
						name: param<string>('name'),
						description: param<string>('description', '') || undefined,
					}),
				);
			case 'delete':
				await send('DELETE', projectPath);
				return one({ success: true, projectId });
		}
	}

	if (resource === 'other' && operation === 'apiRequest') {
		const method = param<HttpMethod>('method');
		const path = normalizeApiPath(ctx.getNode(), param<string>('endpoint'), i);
		const query = param<unknown>('query', {});
		const body = param<IDataObject>('body', {});
		const response = await send(method, path, {
			query:
				typeof query === 'object' && query !== null && !Array.isArray(query)
					? (query as Query)
					: undefined,
			body: Object.keys(body).length ? body : undefined,
		});
		return one(response as IDataObject);
	}

	throw new Error(`The operation "${operation}" is not supported for "${resource}"`);
}
