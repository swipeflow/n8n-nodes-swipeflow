import { vi } from 'vitest';
import type { FakeSwipeFlow } from './fakeApi';

type Options = {
	api: FakeSwipeFlow;
	params?: Record<string, unknown>;
	typeVersion?: number;
	inputItems?: number;
	baseUrl?: string;
	staticData?: Record<string, unknown>;
	headers?: Record<string, string>;
	body?: unknown;
	rawBody?: string;
	query?: Record<string, unknown>;
	webhookUrl?: string;
	continueOnFail?: boolean;
	executionId?: string;
};

const NODE = {
	id: 'node-1',
	name: 'SwipeFlow',
	type: 'n8n-nodes-swipeflow.swipeflow',
	parameters: {},
	position: [0, 0],
};

/** A stand-in for every n8n context the node touches; requests are served by the fake API. */
export function fakeContext(options: Options) {
	const {
		api,
		params = {},
		typeVersion = 2,
		staticData = {},
		headers = {},
		query = {},
		body,
		rawBody,
	} = options;

	const response = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	};
	const httpRequestWithAuthentication = vi.fn(
		async (
			_credential: string,
			request: { method: string; url: string; qs?: Record<string, unknown>; body?: unknown },
		) => api.handle(request.method, request.url, request),
	);

	const ctx = {
		getNode: () => ({ ...NODE, typeVersion }),
		getNodeParameter: (
			name: string,
			_index?: unknown,
			fallback?: unknown,
			opts?: { extractValue?: boolean },
		) => {
			// Hook and webhook contexts take (name, fallback, options); execute contexts take (name, index, fallback, options).
			const hasIndex = typeof _index === 'number';
			const actualFallback = hasIndex ? fallback : _index;
			const actualOpts = hasIndex ? opts : (fallback as typeof opts);
			const value = name
				.split('.')
				.reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], params);
			const resolved = value === undefined ? actualFallback : value;
			return actualOpts?.extractValue &&
				typeof resolved === 'object' &&
				resolved !== null &&
				'value' in resolved
				? (resolved as { value: unknown }).value
				: resolved;
		},
		getCredentials: async () => ({
			apiKey: 'test-key',
			...(options.baseUrl !== undefined && { baseUrl: options.baseUrl }),
		}),
		getInputData: () => Array.from({ length: options.inputItems ?? 1 }, () => ({ json: {} })),
		getExecutionId: () => options.executionId ?? '42',
		getInstanceBaseUrl: () => 'https://n8n.test/',
		getWorkflow: () => ({ id: 'wf1', name: 'Publish posts', active: true }),
		getWorkflowStaticData: () => staticData,
		getSignedResumeUrl: (parameters: Record<string, string> = {}) =>
			`https://n8n.test/webhook-waiting/42/node-1?${new URLSearchParams({ ...parameters, signature: 'sig' })}`,
		getNodeWebhookUrl: () => options.webhookUrl ?? 'https://n8n.test/webhook/abc/swipeflow',
		evaluateExpression: () => 0,
		putExecutionToWait: vi.fn(async () => undefined),
		continueOnFail: () => options.continueOnFail ?? false,
		getBodyData: () => body,
		getHeaderData: () => headers,
		getQueryData: () => query,
		getRequestObject: () => ({
			body,
			rawBody: rawBody === undefined ? undefined : Buffer.from(rawBody),
		}),
		getResponseObject: () => response,
		logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
		helpers: {
			httpRequestWithAuthentication,
			httpRequest: vi.fn(),
			returnJsonArray: (data: unknown) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (
				data: Array<Record<string, unknown>>,
				meta: { itemData: { item: number } },
			) => data.map((entry) => ({ ...entry, pairedItem: meta.itemData })),
			assertBinaryData: vi.fn(),
			getBinaryDataBuffer: vi.fn(),
			prepareBinaryData: vi.fn(),
		},
	};

	return { ctx: ctx as never, raw: ctx, response, httpRequestWithAuthentication };
}
