import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INode,
	type IWebhookFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { SwipeFlowClient, type Query, type RequestFn } from '../sdk';
import { CREDENTIALS_NAME, DEFAULT_BASE_URL } from './constants';

export type SwipeFlowContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

function compact(query: Query): IDataObject {
	return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
}

export function createTransport(ctx: SwipeFlowContext): RequestFn {
	let baseUrl: string | undefined;

	return async (method, path, options = {}) => {
		if (baseUrl === undefined) {
			const credentials = await ctx.getCredentials(CREDENTIALS_NAME);
			const configured = typeof credentials.baseUrl === 'string' ? credentials.baseUrl.trim() : '';
			baseUrl = (configured || DEFAULT_BASE_URL).replace(/\/+$/, '');
		}

		const request: IHttpRequestOptions = { method, url: `${baseUrl}${path}`, json: true };
		if (options.query) request.qs = compact(options.query);
		if (options.body !== undefined) request.body = options.body as IDataObject;

		try {
			return await ctx.helpers.httpRequestWithAuthentication.call(ctx, CREDENTIALS_NAME, request);
		} catch (error) {
			throw new NodeApiError(ctx.getNode(), error as JsonObject);
		}
	};
}

export function createClient(ctx: SwipeFlowContext): SwipeFlowClient {
	return new SwipeFlowClient(createTransport(ctx));
}

/**
 * Accepts `projects`, `/projects` and `/v1/projects`. Absolute URLs are refused so a
 * workflow can never point the credential's API key at another host.
 */
export function normalizeApiPath(node: INode, endpoint: string, itemIndex: number): string {
	const trimmed = endpoint.trim();
	if (!trimmed) {
		throw new NodeOperationError(node, 'Endpoint is required', { itemIndex });
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
		throw new NodeOperationError(
			node,
			'Endpoint must be a path on the SwipeFlow API, not a full URL',
			{ itemIndex },
		);
	}
	const path = trimmed.replace(/^\/+/, '');
	return `/${path === 'v1' || path.startsWith('v1/') ? path : `v1/${path}`}`;
}
