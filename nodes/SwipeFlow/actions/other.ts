import type { IDataObject } from 'n8n-workflow';
import type { HttpMethod, Query } from '../sdk';
import { createTransport, normalizeApiPath } from '../shared/transport';
import { parseJsonParameter } from '../shared/utils';
import type { ActionHandler } from './params';

export const otherActions: Record<string, ActionHandler> = {
	apiRequest: async (ctx, _client, i) => {
		const node = ctx.getNode();
		const method = ctx.getNodeParameter('method', i) as HttpMethod;
		const path = normalizeApiPath(node, ctx.getNodeParameter('endpoint', i) as string, i);
		const query = parseJsonParameter(
			node,
			ctx.getNodeParameter('query', i, ''),
			'Query Parameters',
			i,
		);
		const body = ['POST', 'PUT', 'PATCH'].includes(method)
			? parseJsonParameter(node, ctx.getNodeParameter('body', i, ''), 'Body', i)
			: undefined;

		const response = await createTransport(ctx)(method, path, {
			query: query as Query | undefined,
			body,
		});

		if (Array.isArray(response)) return response as IDataObject[];
		if (typeof response === 'object' && response !== null) return response as IDataObject;
		return response === undefined || response === ''
			? { success: true }
			: { data: response as string };
	},
};
