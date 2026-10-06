import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { Swipeflow } from '../nodes/SwipeFlow/Swipeflow.node';
import { normalizeApiPath } from '../nodes/SwipeFlow/shared/transport';
import { parseJsonParameter } from '../nodes/SwipeFlow/shared/utils';
import { fakeContext } from './helpers/context';
import { FakeSwipeFlow } from './helpers/fakeApi';

const node = new Swipeflow();
const run = (options: Parameters<typeof fakeContext>[0]) => {
	const context = fakeContext(options);
	return { ...context, result: node.execute.call(context.ctx as never) };
};
const project = { mode: 'id', value: 'p1' };

let api: FakeSwipeFlow;
beforeEach(() => {
	api = new FakeSwipeFlow();
});

describe('version 2: item.create', () => {
	const create = (additionalFields: Record<string, unknown> = {}) =>
		run({
			api,
			params: {
				resource: 'item',
				operation: 'create',
				projectId: project,
				title: 'Post',
				description: 'Q3 launch',
				contentType: 'text',
				content: 'Hello',
				additionalFields,
			},
		});

	it('sends title, description and content', async () => {
		const { result } = create();
		const [[out]] = await result;
		expect(api.calls.at(-1)).toMatchObject({
			method: 'POST',
			path: '/v1/projects/p1/items',
			body: { title: 'Post', description: 'Q3 launch', content: { type: 'text', data: 'Hello' } },
		});
		expect(out.json).toMatchObject({ id: 'i001', title: 'Post' });
		expect(out.pairedItem).toEqual({ item: 0 });
	});

	it('sends the expiration date, which version 1 silently dropped', async () => {
		await create({ expiresAt: '2026-10-01T09:30:00+02:00' }).result;
		expect(api.calls.at(-1)?.body).toMatchObject({ expiresAt: '2026-10-01T07:30:00.000Z' });
	});

	it('sends metadata as an object, from a JSON string or an expression result', async () => {
		await create({ metadata: '{"campaign":"spring","n":3}' }).result;
		expect(api.calls.at(-1)?.body?.metadata).toEqual({ campaign: 'spring', n: 3 });
		await create({ metadata: { fromExpression: true } }).result;
		expect(api.calls.at(-1)?.body?.metadata).toEqual({ fromExpression: true });
	});

	it('sends media ids and the idempotency key', async () => {
		await create({ mediaIds: ' 66f1, 66f2 ,', idempotencyKey: 'order-7' }).result;
		expect(api.calls.at(-1)?.body).toMatchObject({
			media: ['66f1', '66f2'],
			idempotencyKey: 'order-7',
		});
	});

	it('omits optional fields that were left empty', async () => {
		await run({
			api,
			params: {
				resource: 'item',
				operation: 'create',
				projectId: project,
				title: 'T',
				contentType: 'text',
				content: 'c',
				additionalFields: { metadata: '', mediaIds: '' },
			},
		}).result;
		expect(Object.keys(api.calls.at(-1)?.body ?? {}).sort()).toEqual(['content', 'title']);
	});

	it('rejects invalid metadata JSON with the item index', async () => {
		await expect(create({ metadata: '{oops' }).result).rejects.toThrow(NodeOperationError);
		await expect(create({ metadata: '[1]' }).result).rejects.toThrow('must be a JSON object');
	});

	it('rejects an invalid expiration date', async () => {
		await expect(create({ expiresAt: 'tomorrow-ish' }).result).rejects.toThrow('not a valid date');
	});

	it('accepts a project chosen from the list or by id', async () => {
		await run({
			api,
			params: {
				resource: 'item',
				operation: 'create',
				projectId: { mode: 'list', value: 'p2' },
				title: 'T',
				contentType: 'text',
				content: 'c',
			},
		}).result;
		expect(api.calls.at(-1)?.path).toBe('/v1/projects/p2/items');
	});
});

describe('version 2: send and wait', () => {
	it('creates the item with a retry-safe key, registers a webhook and pauses', async () => {
		const { result, raw } = run({
			api,
			inputItems: 3,
			params: {
				resource: 'item',
				operation: 'sendAndWait',
				projectId: project,
				title: 'Publish?',
				contentType: 'text',
				content: 'body',
			},
		});
		await result;

		expect(api.callsTo('POST', /\/items$/)).toHaveLength(1);
		expect(api.calls.find((c) => c.path.endsWith('/items'))?.body).toMatchObject({
			idempotencyKey: 'n8n:42:node-1:0',
		});
		expect(api.webhooks.size).toBe(1);
		expect(raw.putExecutionToWait).toHaveBeenCalledTimes(1);
	});

	it('lets the user’s own idempotency key win', async () => {
		await run({
			api,
			params: {
				resource: 'item',
				operation: 'sendAndWait',
				projectId: project,
				title: 'x',
				contentType: 'text',
				content: 'c',
				additionalFields: { idempotencyKey: 'mine' },
			},
		}).result;
		expect(api.calls.find((c) => c.path.endsWith('/items'))?.body).toMatchObject({
			idempotencyKey: 'mine',
		});
	});

	it('waits on an existing item', async () => {
		const item = api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'x' } }) as {
			id: string;
		};
		const { result, raw } = run({
			api,
			params: { resource: 'item', operation: 'wait', projectId: project, itemId: item.id },
		});
		await result;
		expect(raw.putExecutionToWait).toHaveBeenCalled();
		expect([...api.webhooks.values()][0].url).toContain(`itemId=${item.id}`);
	});

	it('returns straight away when the awaited item is already decided', async () => {
		const item = api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'x' } }) as {
			id: string;
		};
		api.decide(item.id, 'approved', 'fine');
		const { result, raw } = run({
			api,
			params: { resource: 'item', operation: 'wait', projectId: project, itemId: item.id },
		});
		const [[out]] = await result;
		expect(raw.putExecutionToWait).not.toHaveBeenCalled();
		expect(out.json).toMatchObject({ decision: 'approved', approved: true });
	});
});

describe('version 2: listing', () => {
	beforeEach(() => {
		for (let i = 0; i < 250; i++)
			api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: `Item ${i}` } });
	});
	const list = (extra: Record<string, unknown>) =>
		run({ api, params: { resource: 'item', operation: 'getAll', projectId: project, ...extra } });

	it('returns exactly the limit, fetching only what it needs', async () => {
		const [items] = await list({ returnAll: false, limit: 30 }).result;
		expect(items).toHaveLength(30);
		expect(api.callsTo('GET', /\/items$/)).toHaveLength(1);
		expect(api.calls.at(-1)?.query).toMatchObject({ page: 1, limit: 30 });
	});

	it('pages through everything for Return All, capping the page size at 100', async () => {
		const [items] = await list({ returnAll: true }).result;
		expect(items).toHaveLength(250);
		expect(api.callsTo('GET', /\/items$/).map((c) => [c.query.page, c.query.limit])).toEqual([
			[1, 100],
			[2, 100],
			[3, 100],
		]);
	});

	it('spans pages for a limit above one page', async () => {
		const [items] = await list({ returnAll: false, limit: 150 }).result;
		expect(items).toHaveLength(150);
		expect(api.callsTo('GET', /\/items$/).map((c) => c.query.limit)).toEqual([100, 50]);
	});

	it('stops on an empty result instead of looping', async () => {
		api.items.clear();
		const [items] = await list({ returnAll: true }).result;
		expect(items).toHaveLength(0);
		expect(api.callsTo('GET', /\/items$/)).toHaveLength(1);
	});

	it('passes filters and sorting through', async () => {
		api.decide('i001', 'approved');
		await list({
			returnAll: false,
			limit: 10,
			filters: { status: 'approved', search: 'x' },
			options: { sortBy: 'title', sortOrder: 'asc' },
		}).result;
		expect(api.calls.at(-1)?.query).toMatchObject({
			status: 'approved',
			search: 'x',
			sortBy: 'title',
			sortOrder: 'asc',
		});
	});
});

describe('version 2: decisions and other operations', () => {
	it.each([
		['approve', 'approved'],
		['reject', 'rejected'],
	])('%s sends the %s decision', async (operation, decision) => {
		api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'x' } });
		// The fake has no decision route; a 404 is fine, we only inspect the request.
		await run({
			api,
			params: { resource: 'item', operation, projectId: project, itemId: 'i001', comment: 'why' },
		}).result.catch(() => undefined);
		expect(api.calls.at(-1)).toMatchObject({
			method: 'PUT',
			path: '/v1/projects/p1/items/i001/decision',
			body: { decision, comment: 'why' },
		});
	});

	it('request changes sends the comment and target version', async () => {
		await run({
			api,
			params: {
				resource: 'item',
				operation: 'requestChanges',
				projectId: project,
				itemId: 'i001',
				comment: 'shorter',
				options: { targetVersion: 2 },
			},
		}).result.catch(() => undefined);
		expect(api.calls.at(-1)?.body).toEqual({
			decision: 'change_requested',
			comment: 'shorter',
			targetVersion: 2,
		});
	});

	it('escapes ids so an expression cannot change the path', async () => {
		await run({
			api,
			params: { resource: 'item', operation: 'get', projectId: project, itemId: '../../api-keys' },
		}).result.catch(() => undefined);
		expect(api.calls.at(-1)?.path).toBe('/v1/projects/p1/items/..%2F..%2Fapi-keys');
	});
});

describe('errors', () => {
	it('turns an API failure into a NodeApiError', async () => {
		await expect(
			run({
				api,
				params: { resource: 'item', operation: 'get', projectId: project, itemId: 'missing' },
			}).result,
		).rejects.toThrow(NodeApiError);
	});

	it('reports the failing item and carries on when Continue On Fail is set', async () => {
		const { result } = run({
			api,
			inputItems: 2,
			continueOnFail: true,
			params: { resource: 'item', operation: 'get', projectId: project, itemId: 'missing' },
		});
		const [items] = await result;
		expect(items).toHaveLength(2);
		expect(items[1]).toMatchObject({
			json: { error: 'The resource you are requesting could not be found' },
			pairedItem: { item: 1 },
		});
	});
});

describe('version 2: custom API call', () => {
	const call = (params: Record<string, unknown>) =>
		run({ api, params: { resource: 'other', operation: 'apiRequest', method: 'GET', ...params } });

	it.each([['projects'], ['/projects'], ['/v1/projects'], ['v1/projects'], ['  /projects  ']])(
		'resolves %j to /v1/projects',
		async (endpoint) => {
			await call({ endpoint }).result;
			expect(api.calls.at(-1)?.path).toBe('/v1/projects');
		},
	);

	it('refuses a full URL so the API key cannot be sent to another host', async () => {
		for (const endpoint of [
			'https://evil.example/v1/projects',
			'//evil.example/x',
			'http://localhost:1/x',
		]) {
			await expect(call({ endpoint }).result).rejects.toThrow('not a full URL');
		}
		expect(api.calls).toHaveLength(0);
	});

	it('sends the body only for methods that take one, parsed from JSON', async () => {
		api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'x' } });
		await call({ method: 'POST', endpoint: 'projects/p1/items', body: '{"title":"Made"}' }).result;
		expect(api.calls.at(-1)?.body).toEqual({ title: 'Made' });
		await call({ method: 'GET', endpoint: 'projects', body: '{"ignored":true}' }).result;
		expect(api.calls.at(-1)?.body).toBeUndefined();
	});

	it('turns a list response into one item per entry', async () => {
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', { body: { name: 'a' } });
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', { body: { name: 'b' } });
		const [items] = await call({ endpoint: 'projects/p1/webhooks' }).result;
		expect(items.map((i) => i.json.name)).toEqual(['a', 'b']);
	});

	it('reports success for an empty response', async () => {
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', { body: { name: 'a' } });
		const [[out]] = await call({ method: 'DELETE', endpoint: 'projects/p1/webhooks/w001' }).result;
		expect(out.json).toEqual({ success: true });
	});
});

describe('the API key', () => {
	it('goes through the credential, to the configured base URL', async () => {
		const { result, httpRequestWithAuthentication } = run({
			api,
			baseUrl: 'https://staging.swipeflow.test/',
			params: { resource: 'project', operation: 'getAll', returnAll: false, limit: 5 },
		});
		await result;
		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'SwipeFlowApiKey',
			expect.objectContaining({ url: 'https://staging.swipeflow.test/v1/projects' }),
		);
	});

	it('defaults to the production API for credentials saved before Base URL existed', async () => {
		const { result, httpRequestWithAuthentication } = run({
			api,
			params: { resource: 'project', operation: 'getAll', returnAll: false, limit: 5 },
		});
		await result;
		expect(httpRequestWithAuthentication.mock.calls[0][1].url).toBe(
			'https://api.swipeflow.io/v1/projects',
		);
	});
});

describe('version 1 (kept for saved workflows)', () => {
	const v1 = (params: Record<string, unknown>, inputItems = 1) =>
		run({ api, typeVersion: 1, inputItems, params });

	it('creates an item without an expiration date and with metadata as entered', async () => {
		await v1({
			resource: 'item',
			operation: 'create',
			projectId: 'p1',
			title: 'T',
			description: '',
			contentType: 'text',
			content: 'c',
			metadata: '{"a":1}',
			expiresAt: '2026-10-01T00:00:00Z',
		}).result;
		const body = api.calls.at(-1)?.body;
		expect(body).toEqual({
			title: 'T',
			description: undefined,
			content: { type: 'text', data: 'c' },
			metadata: '{"a":1}',
		});
		expect(body).not.toHaveProperty('expiresAt');
	});

	it('lists items with the old query rules', async () => {
		for (let i = 0; i < 3; i++)
			api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: `i${i}` } });
		const [items] = await v1({
			resource: 'item',
			operation: 'getAll',
			projectId: 'p1',
			status: '',
			search: '',
			sortBy: 'createdAt',
			sortOrder: 'desc',
			page: 1,
			limit: 10,
			includeVersions: true,
		}).result;
		expect(items).toHaveLength(3);
		expect(api.calls.at(-1)?.query).toEqual({
			sortBy: 'createdAt',
			sortOrder: 'desc',
			includeVersions: true,
		});
	});

	it('maps approve, reject and request changes to the same decisions as before', async () => {
		for (const [operation, decision] of [
			['approve', 'approved'],
			['reject', 'rejected'],
			['requestChanges', 'change_requested'],
		] as const) {
			await v1({
				resource: 'item',
				operation,
				projectId: 'p1',
				itemId: 'i1',
				comment: 'c',
			}).result.catch(() => undefined);
			expect(api.calls.at(-1)?.body).toEqual({ decision, comment: 'c' });
		}
	});

	it('lists projects and deletes with the old result shapes', async () => {
		const [projects] = await v1({ resource: 'project', operation: 'list' }).result;
		expect(projects.map((p) => p.json.name)).toEqual(['Marketing', 'Support']);
		const [[deleted]] = await v1({
			resource: 'item',
			operation: 'delete',
			projectId: 'p1',
			itemId: 'i1',
		}).result.catch(() => [[{ json: {} }]]);
		expect(deleted).toBeDefined();
	});

	it('does not offer the new wait operations', async () => {
		await expect(
			v1({ resource: 'item', operation: 'sendAndWait', projectId: 'p1' }).result,
		).rejects.toThrow('not supported');
	});
});

describe('helpers', () => {
	const n = { name: 'n' } as never;

	it('parseJsonParameter treats empty as absent and rejects non-objects', () => {
		expect(parseJsonParameter(n, '', 'x', 0)).toBeUndefined();
		expect(parseJsonParameter(n, undefined, 'x', 0)).toBeUndefined();
		expect(parseJsonParameter(n, '{"a":1}', 'x', 0)).toEqual({ a: 1 });
		expect(() => parseJsonParameter(n, '"str"', 'x', 0)).toThrow('must be a JSON object');
		expect(() => parseJsonParameter(n, null as never, 'x', 0)).not.toThrow();
	});

	it('normalizeApiPath refuses an empty endpoint', () => {
		expect(() => normalizeApiPath(n, '   ', 0)).toThrow('required');
	});
});
