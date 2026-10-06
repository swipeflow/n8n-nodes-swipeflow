import { NodeOperationError } from 'n8n-workflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeSwipeFlow } from './helpers/fakeApi';
import { project, runNode } from './helpers/run';

let api: FakeSwipeFlow;
beforeEach(() => {
	api = new FakeSwipeFlow();
});

const exec = async (params: Record<string, unknown>, options: { inputItems?: number } = {}) => {
	const [items] = await runNode({ api, params, ...options }).result;
	return items.map((item) => item.json);
};
const lastCall = () => api.calls.at(-1)!;

describe('item operations', () => {
	const item = { resource: 'item', projectId: project, itemId: 'i7' };

	it('getNext asks for the next pending item', async () => {
		api.stub('GET', /next-item$/, { id: 'i1', status: 'pending' });
		expect(await exec({ resource: 'item', operation: 'getNext', projectId: project })).toEqual([
			{ id: 'i1', status: 'pending' },
		]);
		expect(lastCall()).toMatchObject({ method: 'GET', path: '/v1/projects/p1/next-item' });
	});

	it('getStatus returns the slim status', async () => {
		api.stub('GET', /items\/i7\/status$/, { id: 'i7', status: 'approved', version: 2 });
		expect(await exec({ ...item, operation: 'getStatus' })).toEqual([
			{ id: 'i7', status: 'approved', version: 2 },
		]);
	});

	describe('markProcessed', () => {
		it('sends the optional action', async () => {
			api.stub('PUT', /items\/i7\/processed$/, { id: 'i7' });
			await exec({ ...item, operation: 'markProcessed', options: { action: 'published' } });
			expect(lastCall()).toMatchObject({
				method: 'PUT',
				path: '/v1/projects/p1/items/i7/processed',
				body: { action: 'published' },
			});
		});

		it('sends an empty body when no action is given', async () => {
			api.stub('PUT', /items\/i7\/processed$/, { id: 'i7' });
			await exec({ ...item, operation: 'markProcessed' });
			expect(lastCall().body).toEqual({});
		});
	});

	describe('createVersion', () => {
		beforeEach(() => api.stub('POST', /versions$/, { id: 'i7', version: 2 }));

		it('sends only the fields that were set', async () => {
			await exec({
				...item,
				operation: 'createVersion',
				updateFields: { title: 'New title', description: '' },
			});
			expect(lastCall()).toMatchObject({
				method: 'POST',
				path: '/v1/projects/p1/items/i7/versions',
			});
			expect(lastCall().body).toEqual({ title: 'New title' });
		});

		it('sends content with its type, defaulting the type to text', async () => {
			await exec({
				...item,
				operation: 'createVersion',
				updateFields: { content: 'Revised', contentType: 'html' },
			});
			expect(lastCall().body).toEqual({ content: { type: 'html', data: 'Revised' } });
			await exec({ ...item, operation: 'createVersion', updateFields: { content: 'Plain' } });
			expect(lastCall().body).toEqual({ content: { type: 'text', data: 'Plain' } });
		});

		it('ignores a content type without content', async () => {
			await exec({ ...item, operation: 'createVersion', updateFields: { contentType: 'html' } });
			expect(lastCall().body).toEqual({});
		});

		it('sends media ids and parsed metadata', async () => {
			await exec({
				...item,
				operation: 'createVersion',
				updateFields: { mediaIds: 'm1, m2', metadata: '{"k":1}' },
			});
			expect(lastCall().body).toEqual({ media: ['m1', 'm2'], metadata: { k: 1 } });
		});

		it('rejects invalid metadata', async () => {
			await expect(
				runNode({
					api,
					params: { ...item, operation: 'createVersion', updateFields: { metadata: '{bad' } },
				}).result,
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('versions', () => {
		it('listVersions pages through everything and passes the sort order', async () => {
			api.stub('GET', /versions$/, (call: { query: Record<string, unknown> }) => {
				const page = Number(call.query.page);
				return {
					versions: Array.from({ length: page < 3 ? 100 : 20 }, (_, i) => ({
						version: page * 1000 + i,
					})),
					pagination: { page, pages: 3 },
				};
			});
			const versions = await exec({
				...item,
				operation: 'listVersions',
				returnAll: true,
				options: { sortOrder: 'asc' },
			});
			expect(versions).toHaveLength(220);
			expect(api.calls.map((c) => [c.query.page, c.query.limit, c.query.sortOrder])).toEqual([
				[1, 100, 'asc'],
				[2, 100, 'asc'],
				[3, 100, 'asc'],
			]);
		});

		it('listVersions honours the limit', async () => {
			api.stub('GET', /versions$/, {
				versions: Array.from({ length: 5 }, (_, i) => ({ version: i })),
				pagination: { page: 1, pages: 1 },
			});
			expect(
				await exec({ ...item, operation: 'listVersions', returnAll: false, limit: 3 }),
			).toHaveLength(3);
		});

		it('getVersion requests that version', async () => {
			api.stub('GET', /versions\/4$/, { version: 4, title: 'v4' });
			expect(await exec({ ...item, operation: 'getVersion', version: 4 })).toEqual([
				{ version: 4, title: 'v4' },
			]);
			expect(lastCall().path).toBe('/v1/projects/p1/items/i7/versions/4');
		});
	});

	it('delete reports what was deleted', async () => {
		const created = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'x' },
		}) as { id: string };
		api.stub('DELETE', /items\/i001$/, '');
		expect(
			await exec({ resource: 'item', operation: 'delete', projectId: project, itemId: created.id }),
		).toEqual([{ success: true, itemId: 'i001', projectId: 'p1' }]);
	});

	it('approve and reject omit an empty comment', async () => {
		api.stub('PUT', /decision$/, { id: 'i7' });
		await exec({ ...item, operation: 'approve', comment: '' });
		expect(lastCall().body).toEqual({ decision: 'approved' });
	});

	it('get passes its options as query parameters', async () => {
		api.stub('GET', /items\/i7$/, { id: 'i7' });
		await exec({
			...item,
			operation: 'get',
			options: { includeVersions: true, resolveMedia: true },
		});
		expect(lastCall().query).toEqual({ includeVersions: true, resolveMedia: true });
	});
});

describe('project operations', () => {
	it('create sends name and description', async () => {
		api.stub('POST', /\/v1\/projects$/, { id: 'p9', name: 'New' });
		expect(
			await exec({ resource: 'project', operation: 'create', name: 'New', description: 'About' }),
		).toEqual([{ id: 'p9', name: 'New' }]);
		expect(lastCall().body).toEqual({ name: 'New', description: 'About' });
	});

	it('create defaults the description to empty, which the API requires', async () => {
		api.stub('POST', /\/v1\/projects$/, {});
		await exec({ resource: 'project', operation: 'create', name: 'New' });
		expect(lastCall().body).toEqual({ name: 'New', description: '' });
	});

	it('resolve gets or creates by name', async () => {
		api.stub('POST', /projects\/resolve$/, { id: 'p1', name: 'Marketing' });
		await exec({ resource: 'project', operation: 'resolve', name: 'Marketing', description: '' });
		expect(lastCall()).toMatchObject({
			method: 'POST',
			path: '/v1/projects/resolve',
			body: { name: 'Marketing', description: '' },
		});
	});

	it('get fetches one project', async () => {
		api.stub('GET', /projects\/p1$/, { id: 'p1' });
		await exec({ resource: 'project', operation: 'get', projectId: project });
		expect(lastCall().path).toBe('/v1/projects/p1');
	});

	it('getAll applies filters and returns projects one per item', async () => {
		const projects = await exec({
			resource: 'project',
			operation: 'getAll',
			returnAll: true,
			filters: { search: 'supp', status: 'active' },
		});
		expect(projects.map((p) => p.name)).toEqual(['Support']);
		expect(lastCall().query).toMatchObject({
			search: 'supp',
			status: 'active',
			page: 1,
			limit: 100,
		});
	});

	it('update sends only the fields that were set', async () => {
		api.stub('PUT', /projects\/p1$/, { id: 'p1' });
		await exec({
			resource: 'project',
			operation: 'update',
			projectId: project,
			updateFields: { name: 'Renamed' },
		});
		expect(lastCall().body).toEqual({ name: 'Renamed' });
	});

	it('update sends nothing for fields that were not set', async () => {
		api.stub('PUT', /projects\/p1$/, { id: 'p1' });
		await exec({
			resource: 'project',
			operation: 'update',
			projectId: project,
			updateFields: { description: 'New text' },
		});
		expect(lastCall().body).toEqual({ description: 'New text' });
		await exec({ resource: 'project', operation: 'update', projectId: project, updateFields: {} });
		expect(lastCall().body).toEqual({});
	});

	it('delete reports what was deleted', async () => {
		api.stub('DELETE', /projects\/p1$/, '');
		expect(await exec({ resource: 'project', operation: 'delete', projectId: project })).toEqual([
			{ success: true, projectId: 'p1' },
		]);
	});
});

describe('webhook operations', () => {
	const webhook = { resource: 'webhook', projectId: project };

	it('create sends url and events, and the optional name and secret', async () => {
		await exec({
			...webhook,
			operation: 'create',
			url: 'https://example.com/hook',
			events: ['item.approved'],
			additionalFields: { name: 'Mine', secret: 's3cret' },
		});
		expect(lastCall()).toMatchObject({ method: 'POST', path: '/v1/projects/p1/webhooks' });
		expect(lastCall().body).toEqual({
			url: 'https://example.com/hook',
			events: ['item.approved'],
			name: 'Mine',
			secret: 's3cret',
		});
	});

	it('create leaves out a secret it was not given, so SwipeFlow generates one', async () => {
		await exec({
			...webhook,
			operation: 'create',
			url: 'https://example.com/hook',
			events: ['item.approved'],
		});
		expect(lastCall().body).not.toHaveProperty('secret');
	});

	it('getAll returns one item per webhook', async () => {
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', {
			body: { name: 'a', type: 'user', events: [] },
		});
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', {
			body: { name: 'b', type: 'user', events: [] },
		});
		expect((await exec({ ...webhook, operation: 'getAll' })).map((w) => w.name)).toEqual([
			'a',
			'b',
		]);
	});

	it('delete reports what was deleted', async () => {
		const created = api.handle('POST', 'https://x/v1/projects/p1/webhooks', {
			body: { name: 'a' },
		}) as { id: string };
		expect(await exec({ ...webhook, operation: 'delete', webhookId: created.id })).toEqual([
			{ success: true, webhookId: created.id, projectId: 'p1' },
		]);
		expect(api.webhooks.size).toBe(0);
	});

	it('test sends a test event', async () => {
		api.stub('POST', /webhooks\/w1\/test$/, { success: true, statusCode: 200 });
		expect(await exec({ ...webhook, operation: 'test', webhookId: 'w1' })).toEqual([
			{ success: true, statusCode: 200 },
		]);
	});
});

describe('project trigger operations', () => {
	const trigger = { resource: 'projectTrigger', projectId: project };

	it('getAll returns one item per trigger', async () => {
		api.stub('GET', /triggers$/, [
			{ id: 't1', name: 'Go', event: 'go' },
			{ id: 't2', name: 'Stop', event: 'stop' },
		]);
		expect((await exec({ ...trigger, operation: 'getAll' })).map((t) => t.id)).toEqual([
			't1',
			't2',
		]);
	});

	it('create sends name and event', async () => {
		api.stub('POST', /triggers$/, { id: 't1' });
		await exec({ ...trigger, operation: 'create', name: 'Publish', event: 'publish' });
		expect(lastCall().body).toEqual({ name: 'Publish', event: 'publish' });
	});

	it('run sends the payload, parsed from JSON', async () => {
		api.stub('POST', /triggers\/t1\/run$/, { message: 'ok' });
		expect(
			await exec({ ...trigger, operation: 'run', triggerId: 't1', payload: '{"batch":4}' }),
		).toEqual([{ message: 'ok' }]);
		expect(lastCall()).toMatchObject({
			path: '/v1/projects/p1/triggers/t1/run',
			body: { payload: { batch: 4 } },
		});
	});

	it('run sends an empty body without a payload', async () => {
		api.stub('POST', /triggers\/t1\/run$/, { message: 'ok' });
		await exec({ ...trigger, operation: 'run', triggerId: 't1', payload: '{}' });
		expect(lastCall().body).toEqual({ payload: {} });
		await exec({ ...trigger, operation: 'run', triggerId: 't1', payload: '' });
		expect(lastCall().body).toEqual({});
	});

	it('delete reports what was deleted', async () => {
		api.stub('DELETE', /triggers\/t1$/, '');
		expect(await exec({ ...trigger, operation: 'delete', triggerId: 't1' })).toEqual([
			{ success: true, triggerId: 't1', projectId: 'p1' },
		]);
	});
});

describe('every operation offered in the UI has a handler', () => {
	it('is not "not supported"', async () => {
		const { Swipeflow } = await import('../nodes/SwipeFlow/Swipeflow.node');
		const properties = new Swipeflow().description.properties;
		const offered = properties
			.filter((p) => p.name === 'operation' && JSON.stringify(p.displayOptions).includes('"gte":2'))
			.flatMap((p) =>
				((p.displayOptions?.show as { resource: string[] }).resource ?? []).flatMap((resource) =>
					((p.options ?? []) as { value: string }[]).map((o) => [resource, o.value] as const),
				),
			);

		expect(offered.length).toBeGreaterThan(30);
		for (const [resource, operation] of offered) {
			if (operation === 'sendAndWait' || operation === 'wait') continue; // paused by the node, not routed
			api.stub('GET', /.*/, {});
			const outcome = await runNode({
				api,
				params: { resource, operation, projectId: project },
			}).result.catch((e: Error) => e);
			expect(String((outcome as Error).message ?? ''), `${resource}.${operation}`).not.toContain(
				'is not supported',
			);
		}
	});
});
