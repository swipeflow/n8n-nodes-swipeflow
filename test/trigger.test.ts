import { createHmac } from 'crypto';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { SwipeflowTrigger } from '../nodes/SwipeFlow/SwipeflowTrigger.node';
import { fakeContext } from './helpers/context';
import { FakeSwipeFlow } from './helpers/fakeApi';

const trigger = new SwipeflowTrigger();
const hooks = trigger.webhookMethods.default;
const secret = 'a'.repeat(64);
const project = { mode: 'id', value: 'p1' };

let api: FakeSwipeFlow;
beforeEach(() => {
	api = new FakeSwipeFlow();
});

const signed = (
	payload: object,
	options: { event?: string; secret?: string; timestamp?: string; bodyOnly?: boolean } = {},
) => {
	const rawBody = JSON.stringify(payload);
	const timestamp = options.timestamp ?? new Date().toISOString();
	const key = options.secret ?? secret;
	const signature = createHmac('sha256', key)
		.update(options.bodyOnly ? rawBody : `${timestamp}.${rawBody}`)
		.digest('hex');
	return {
		rawBody,
		body: payload,
		headers: {
			'x-swipeflow-signature': signature,
			'x-swipeflow-timestamp': timestamp,
			'x-swipeflow-event': options.event ?? (payload as { event: string }).event,
		},
	};
};

const item = { _id: 'i1', projectId: 'p1', title: 'Post', status: 'approved' };
const approved = {
	event: 'item.approved',
	timestamp: new Date().toISOString(),
	data: { item, userId: 'u1', decision: { decision: 'approved', comment: 'ok' } },
};

const receive = (
	delivery: ReturnType<typeof signed>,
	options: {
		typeVersion?: number;
		events?: string[];
		verifySignature?: boolean;
		staticData?: Record<string, unknown>;
	} = {},
) => {
	const {
		typeVersion = 2,
		events = ['item.approved', 'item.rejected'],
		verifySignature,
		staticData = { secret },
	} = options;
	const context = fakeContext({
		api,
		typeVersion,
		staticData,
		body: delivery.body,
		rawBody: delivery.rawBody,
		headers: delivery.headers,
		params: {
			projectId: project,
			events,
			options: verifySignature === undefined ? {} : { verifySignature },
		},
	});
	return { ...context, result: trigger.webhook.call(context.ctx as never) };
};

describe('webhook: signature verification (version 2)', () => {
	it('emits a correctly signed delivery', async () => {
		const result = await receive(signed(approved)).result;
		expect(result.workflowData?.[0][0].json).toMatchObject({
			event: 'item.approved',
			itemId: 'i1',
			projectId: 'p1',
			decision: { comment: 'ok' },
		});
	});

	it.each([
		[
			'a body that was changed after signing',
			() => ({
				...signed(approved),
				rawBody: JSON.stringify({ ...approved, data: { item: { ...item, _id: 'i2' } } }),
			}),
		],
		['a signature from another secret', () => signed(approved, { secret: 'b'.repeat(64) })],
		[
			'a stale timestamp',
			() => signed(approved, { timestamp: new Date(Date.now() - 3600_000).toISOString() }),
		],
		['no signature headers', () => ({ ...signed(approved), headers: {} })],
	])('rejects %s with 401 and does not start the workflow', async (_label, make) => {
		const { result, response } = receive(make());
		const out = await result;
		expect(out).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(401);
	});

	it('can be switched off in the node options', async () => {
		const out = await receive({ ...signed(approved), headers: {} }, { verifySignature: false })
			.result;
		expect(out.workflowData).toBeDefined();
	});

	it('accepts deliveries when no secret is known, e.g. a webhook created by version 1', async () => {
		const out = await receive({ ...signed(approved), headers: {} }, { staticData: {} }).result;
		expect(out.workflowData).toBeDefined();
	});

	it('accepts the test event that SwipeFlow signs without a timestamp', async () => {
		const payload = {
			event: 'test',
			timestamp: new Date().toISOString(),
			data: { message: 'This is a test webhook payload' },
		};
		const out = await receive(signed(payload, { bodyOnly: true })).result;
		expect(out.workflowData?.[0][0].json).toMatchObject({ event: 'test' });
	});

	it('never verifies in version 1', async () => {
		const out = await receive(
			{ ...signed(approved, { secret: 'wrong' }), headers: {} },
			{ typeVersion: 1 },
		).result;
		expect(out.workflowData).toBeDefined();
	});
});

describe('webhook: events', () => {
	it('emits item.deleted, which carries no item (the old trigger threw here)', async () => {
		const out = await receive(
			signed({ event: 'item.deleted', timestamp: 't', data: { itemId: 'i9', userId: 'u1' } }),
			{ events: ['item.deleted'] },
		).result;
		expect(out.workflowData?.[0][0].json).toEqual({
			event: 'item.deleted',
			timestamp: 't',
			itemId: 'i9',
			userId: 'u1',
		});
	});

	it('emits item.processed, which the old trigger rejected as unsupported', async () => {
		const payload = {
			event: 'item.processed',
			timestamp: 't',
			data: { item, userId: 'u1', processed: { action: 'published' } },
		};
		const out = await receive(signed(payload), { events: ['item.processed'] }).result;
		expect(out.workflowData?.[0][0].json).toMatchObject({
			event: 'item.processed',
			processed: { action: 'published' },
		});
	});

	it('emits project.trigger with its extra payload', async () => {
		const payload = {
			event: 'project.trigger',
			timestamp: 't',
			data: {
				projectId: 'p1',
				triggerName: 'Go',
				triggerEvent: 'go',
				triggeredBy: 'a@b.c',
				batch: 4,
			},
		};
		const out = await receive(signed(payload), { events: ['project.trigger'] }).result;
		expect(out.workflowData?.[0][0].json).toMatchObject({
			triggerName: 'Go',
			payload: { batch: 4 },
		});
	});

	it('acknowledges but drops events the node is not subscribed to', async () => {
		const { result, response } = receive(signed({ ...approved, event: 'item.created' }));
		expect(await result).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(200);
	});

	it('rejects a request that is not a SwipeFlow event', async () => {
		const delivery = signed({ hello: 'world' }, { event: 'item.approved' });
		await expect(receive(delivery).result).rejects.toThrow(NodeOperationError);
	});
});

describe('webhookMethods.create', () => {
	const create = (typeVersion: number, staticData: Record<string, unknown> = {}) => {
		const context = fakeContext({
			api,
			typeVersion,
			staticData,
			params: { projectId: project, events: ['item.approved'] },
		});
		return { ...context, result: hooks.create.call(context.ctx as never), staticData };
	};

	it('registers a dynamic n8n webhook with a secret it generated, and remembers it (version 2)', async () => {
		const { result, staticData } = create(2);
		expect(await result).toBe(true);

		const [webhook] = [...api.webhooks.values()];
		expect(webhook).toMatchObject({
			url: 'https://n8n.test/webhook/abc/swipeflow',
			events: ['item.approved'],
			type: 'dynamic',
			integrationProvider: 'n8n',
			integrationLink: 'https://n8n.test/workflow/wf1',
			name: 'Publish posts',
		});
		expect(webhook.secret).toMatch(/^[0-9a-f]{64}$/);
		expect(staticData).toEqual({ webhookId: webhook.id, projectId: 'p1', secret: webhook.secret });
	});

	it('leaves the secret to SwipeFlow in version 1', async () => {
		const { result, staticData } = create(1);
		await result;
		expect(api.calls.at(-1)?.body).not.toHaveProperty('secret');
		expect(staticData).not.toHaveProperty('secret');
	});
});

describe('webhookMethods.checkExists', () => {
	const url = 'https://n8n.test/webhook/abc/swipeflow';
	const seed = (extra: Record<string, unknown> = {}) =>
		api.handle('POST', 'https://x/v1/projects/p1/webhooks', {
			body: {
				name: 'w',
				url,
				events: ['item.approved'],
				type: 'dynamic',
				integrationProvider: 'n8n',
				...extra,
			},
		}) as { id: string };
	const check = (
		typeVersion: number,
		staticData: Record<string, unknown> = {},
		events = ['item.approved'],
	) => {
		const context = fakeContext({
			api,
			typeVersion,
			staticData,
			params: { projectId: project, events },
		});
		return { ...context, result: hooks.checkExists.call(context.ctx as never), staticData };
	};
	const updates = () => api.callsTo('PUT', /webhooks\//);

	it('is false when nothing is registered for this URL', async () => {
		seed({ url: 'https://n8n.test/other' });
		expect(await check(2).result).toBe(false);
	});

	it('ignores a webhook with the same URL that another integration owns', async () => {
		seed({ integrationProvider: 'zapier' });
		expect(await check(2).result).toBe(false);
	});

	it('asks for inactive webhooks too, so they are revived rather than duplicated', async () => {
		const { id } = seed({ active: false });
		const { result } = check(2, { secret });
		expect(await result).toBe(true);
		expect(api.callsTo('GET', /webhooks$/)[0].query).toMatchObject({
			type: 'dynamic',
			includeInactive: true,
		});
		expect(api.webhooks.get(id)?.active).toBe(true);
	});

	it('is true without touching anything when events and secret already match', async () => {
		const { id } = seed({ secret });
		const { result, staticData } = check(2, { secret });
		expect(await result).toBe(true);
		expect(updates()).toHaveLength(0);
		expect(staticData).toMatchObject({ webhookId: id, projectId: 'p1' });
	});

	it('updates the events when they changed', async () => {
		const { id } = seed({ secret });
		await check(2, { secret }, ['item.approved', 'item.rejected']).result;
		expect(api.webhooks.get(id)?.events).toEqual(['item.approved', 'item.rejected']);
	});

	it('replaces the secret when it is not known here, so deliveries can be verified (version 2)', async () => {
		const { id } = seed();
		const { staticData } = check(2, {});
		await check(2, staticData).result;
		expect(api.webhooks.get(id)?.secret).toMatch(/^[0-9a-f]{64}$/);
		expect(api.webhooks.get(id)?.secret).not.toBe('server-generated');
	});

	it('never rotates the secret of a version 1 node, which does not verify', async () => {
		const { id } = seed();
		await check(1).result;
		expect(api.webhooks.get(id)?.secret).toBe('server-generated');
		expect(updates()).toHaveLength(0);
	});
});

describe('webhookMethods.delete', () => {
	const remove = (staticData: Record<string, unknown>) => {
		const context = fakeContext({ api, staticData });
		return { ...context, result: hooks.delete.call(context.ctx as never), staticData };
	};

	it('deletes the webhook and forgets everything about it', async () => {
		const { id } = api.handle('POST', 'https://x/v1/projects/p1/webhooks', {
			body: { name: 'w' },
		}) as { id: string };
		const { result, staticData } = remove({ webhookId: id, projectId: 'p1', secret });
		expect(await result).toBe(true);
		expect(api.webhooks.size).toBe(0);
		expect(staticData).toEqual({});
	});

	it('succeeds when the webhook is already gone', async () => {
		const { result, staticData } = remove({ webhookId: 'gone', projectId: 'p1', secret });
		expect(await result).toBe(true);
		expect(staticData).toEqual({});
	});

	it('surfaces any other failure', async () => {
		const original = api.handle.bind(api);
		api.handle = (method, url, options) => {
			if (method === 'DELETE') throw api.error(500, 'boom');
			return original(method, url, options);
		};
		await expect(remove({ webhookId: 'w', projectId: 'p1' }).result).rejects.toThrow(NodeApiError);
	});

	it('does not call the API when nothing was registered', async () => {
		await remove({}).result;
		expect(api.calls).toHaveLength(0);
	});
});
