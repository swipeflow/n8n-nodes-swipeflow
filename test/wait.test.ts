import { WAIT_INDEFINITELY } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '../nodes/SwipeFlow/shared/transport';
import { isWaitWebhookFor, waitWebhookName } from '../nodes/SwipeFlow/wait/naming';
import { buildOutcome } from '../nodes/SwipeFlow/wait/outcome';
import { handleResume } from '../nodes/SwipeFlow/wait/resume';
import { waitForDecision } from '../nodes/SwipeFlow/wait/start';
import { fakeContext } from './helpers/context';
import { FakeSwipeFlow } from './helpers/fakeApi';

describe('wait webhook naming', () => {
	const name = waitWebhookName('42', 'i1');

	it('fits SwipeFlow’s 100 character limit even with long ids', () => {
		expect(waitWebhookName('1234567890123', '66f1f77bcf86cd799439099').length).toBeLessThanOrEqual(
			100,
		);
	});

	it('is matched only by the execution and item it was made for', () => {
		expect(isWaitWebhookFor(name, '42', 'i1')).toBe(true);
		expect(isWaitWebhookFor(name, '42', 'i2')).toBe(false);
		expect(isWaitWebhookFor(name, '4', 'i1')).toBe(false);
		expect(isWaitWebhookFor(undefined, '42', 'i1')).toBe(false);
	});
});

describe('buildOutcome', () => {
	it('reads the latest decision from the item when the event carries none', () => {
		const item = {
			decisions: [
				{ decision: 'change_requested', comment: 'first' },
				{ decision: 'approved', comment: 'ok', actorName: 'Riley', timestamp: 't' },
			],
		};
		expect(buildOutcome({ outcome: 'approved', projectId: 'p1', itemId: 'i1', item })).toEqual({
			decision: 'approved',
			approved: true,
			comment: 'ok',
			decidedBy: 'Riley',
			decidedAt: 't',
			itemId: 'i1',
			projectId: 'p1',
			item,
		});
	});

	it('carries the target version of a change request', () => {
		const out = buildOutcome({
			outcome: 'change_requested',
			projectId: 'p1',
			itemId: 'i1',
			decision: { comment: 'shorter', targetVersion: 2 },
		});
		expect(out).toMatchObject({
			decision: 'change_requested',
			approved: false,
			comment: 'shorter',
			targetVersion: 2,
		});
	});
});

describe('waitForDecision', () => {
	let api: FakeSwipeFlow;

	beforeEach(() => {
		api = new FakeSwipeFlow();
	});
	afterEach(() => vi.useRealTimers());

	const start = async (params: Record<string, unknown> = {}, itemId?: string) => {
		const item = itemId
			? api.items.get(itemId)!
			: (api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'Post' } }) as {
					id: string;
				});
		const context = fakeContext({ api, params });
		const output = await waitForDecision(context.ctx, createClient(context.ctx), 'p1', item.id);
		return { ...context, output, itemId: item.id };
	};

	it('registers a project webhook for this execution, then pauses', async () => {
		const { raw, output, itemId } = await start();

		const [webhook] = [...api.webhooks.values()];
		expect(webhook).toMatchObject({
			integrationProvider: 'n8n',
			type: 'dynamic',
			events: ['item.approved', 'item.rejected', 'item.change_requested', 'item.deleted'],
			integrationLink: 'https://n8n.test/workflow/wf1/executions/42',
		});
		expect(webhook.url).toBe(
			`https://n8n.test/webhook-waiting/42/node-1?signature=token&itemId=${itemId}`,
		);
		expect(webhook.name).toBe(`n8n wait exec=42 item=${itemId}`);
		expect(raw.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY);
		expect(output).toEqual([raw.getInputData()]);
	});

	it('signs the resume URL for Create and Wait, which n8n validates by HMAC', async () => {
		await start({ operation: 'sendAndWait' });

		expect([...api.webhooks.values()][0].url).toMatch(
			/^https:\/\/n8n\.test\/webhook-waiting\/42\/node-1\?itemId=[^&]+&signature=sig$/,
		);
	});

	it('uses the execution resume token for Wait for Decision, which n8n validates by token', async () => {
		const { itemId } = await start({ operation: 'wait' });

		expect([...api.webhooks.values()][0].url).toBe(
			`https://n8n.test/webhook-waiting/42/node-1?signature=token&itemId=${itemId}`,
		);
	});

	it('honours a time limit', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-09-21T12:00:00.000Z'));
		const { raw } = await start({
			limitWaitTime: true,
			limitType: 'afterTimeInterval',
			resumeAmount: 2,
			resumeUnit: 'hours',
		});

		expect(raw.putExecutionToWait).toHaveBeenCalledWith(new Date('2026-09-21T14:00:00.000Z'));
		expect([...api.webhooks.values()][0].expiresAt).toBe('2026-09-21T14:00:00.000Z');
	});

	it('does not wait when the item was already decided, and leaves no webhook behind', async () => {
		const created = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'Post' },
		}) as { id: string };
		api.decide(created.id, 'rejected', 'Not this one');

		const { raw, output } = await start({}, created.id);

		expect(raw.putExecutionToWait).not.toHaveBeenCalled();
		expect(api.webhooks.size).toBe(0);
		expect(output[0][0].json).toMatchObject({
			decision: 'rejected',
			approved: false,
			comment: 'Not this one',
			decidedBy: 'Riley Reviewer',
		});
	});

	it('does not add a second webhook when the same wait runs again (a retry)', async () => {
		const { itemId } = await start();
		const context = fakeContext({
			api,
			params: {
				limitWaitTime: true,
				limitType: 'afterTimeInterval',
				resumeAmount: 1,
				resumeUnit: 'hours',
			},
		});
		await waitForDecision(context.ctx, createClient(context.ctx), 'p1', itemId);

		expect(api.webhooks.size).toBe(1);
		expect(api.callsTo('POST', /\/webhooks$/)).toHaveLength(1);
		const [webhook] = [...api.webhooks.values()];
		expect(webhook.expiresAt).toMatch(/^20\d\d-/);
		expect(webhook.url).toContain(`itemId=${itemId}`);
	});

	it('revives its own webhook if it was deactivated', async () => {
		const { itemId } = await start();
		[...api.webhooks.values()][0].active = false;
		const context = fakeContext({ api });
		await waitForDecision(context.ctx, createClient(context.ctx), 'p1', itemId);
		expect(api.webhooks.size).toBe(1);
		expect([...api.webhooks.values()][0].active).toBe(true);
	});

	it('keeps separate webhooks for other items and other executions', async () => {
		const { itemId } = await start();
		const other = (
			api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'B' } }) as {
				id: string;
			}
		).id;
		const sameExecution = fakeContext({ api });
		await waitForDecision(sameExecution.ctx, createClient(sameExecution.ctx), 'p1', other);
		const otherExecution = fakeContext({ api, executionId: '43' });
		await waitForDecision(otherExecution.ctx, createClient(otherExecution.ctx), 'p1', itemId);
		expect([...api.webhooks.values()].map((w) => w.name).sort()).toEqual(
			[
				`n8n wait exec=42 item=${itemId}`,
				`n8n wait exec=42 item=${other}`,
				`n8n wait exec=43 item=${itemId}`,
			].sort(),
		);
	});

	it('registers a webhook when the existing ones cannot be listed', async () => {
		const created = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'x' },
		}) as { id: string };
		const original = api.handle.bind(api);
		vi.spyOn(api, 'handle').mockImplementation((method, url, options) => {
			if (method === 'GET' && url.includes('/webhooks')) throw api.error(500, 'boom');
			return original(method, url, options);
		});
		const context = fakeContext({ api });
		await waitForDecision(context.ctx, createClient(context.ctx), 'p1', created.id);
		expect(api.webhooks.size).toBe(1);
		expect(context.raw.putExecutionToWait).toHaveBeenCalled();
	});

	it('sets no expiry on a wait without a time limit', async () => {
		await start();
		expect([...api.webhooks.values()][0].expiresAt ?? null).toBeNull();
	});

	it('expires the webhook when the time limit passes, so SwipeFlow removes it', async () => {
		await start({
			limitWaitTime: true,
			limitType: 'atSpecifiedTime',
			maxDateAndTime: '2099-01-01T00:00:00Z',
		});
		expect([...api.webhooks.values()][0].expiresAt).toBe('2099-01-01T00:00:00.000Z');
	});

	it('moves the expiry when a retried wait registers again', async () => {
		const { itemId } = await start({
			limitWaitTime: true,
			limitType: 'atSpecifiedTime',
			maxDateAndTime: '2099-01-01T00:00:00Z',
		});
		await start(
			{ limitWaitTime: true, limitType: 'atSpecifiedTime', maxDateAndTime: '2099-06-01T00:00:00Z' },
			itemId,
		);
		const webhooks = [...api.webhooks.values()];
		expect(webhooks).toHaveLength(1);
		expect(webhooks[0].expiresAt).toBe('2099-06-01T00:00:00.000Z');
	});

	it('leaves no webhook behind when the time limit is already in the past', async () => {
		const { raw } = await start({
			limitWaitTime: true,
			limitType: 'atSpecifiedTime',
			maxDateAndTime: '2020-01-01T00:00:00Z',
		});
		expect(raw.putExecutionToWait).toHaveBeenCalledWith(new Date('2020-01-01T00:00:00Z'));
		expect(api.webhooks.size).toBe(0);
		expect(api.callsTo('POST', /\/webhooks$/)).toHaveLength(0);
	});
});

describe('handleResume', () => {
	let api: FakeSwipeFlow;
	let itemId: string;

	beforeEach(async () => {
		api = new FakeSwipeFlow();
		itemId = (
			api.handle('POST', 'https://x/v1/projects/p1/items', {
				body: { title: 'Post', projectId: 'p1' },
			}) as { id: string }
		).id;
		const context = fakeContext({ api });
		await waitForDecision(context.ctx, createClient(context.ctx), 'p1', itemId);
	});

	const deliver = (
		event: string,
		data: Record<string, unknown>,
		query: Record<string, unknown> = { itemId },
	) => {
		const context = fakeContext({ api, body: { event, timestamp: 't', data }, query });
		return { ...context, result: handleResume(context.ctx) };
	};

	it('resumes with the decision and removes the webhook it registered', async () => {
		const data = api.decide(itemId, 'approved', 'Looks good');
		const { result } = deliver('item.approved', data);

		const resumed = await result;
		expect(resumed.workflowData?.[0][0].json).toMatchObject({
			decision: 'approved',
			approved: true,
			comment: 'Looks good',
			decidedBy: 'Riley Reviewer',
			itemId,
			projectId: 'p1',
		});
		expect(api.webhooks.size).toBe(0);
	});

	it.each(['rejected', 'change_requested'] as const)('resumes on %s', async (decision) => {
		const resumed = await deliver(`item.${decision}`, api.decide(itemId, decision, 'why')).result;
		expect(resumed.workflowData?.[0][0].json).toMatchObject({ decision, approved: false });
	});

	it('resumes when the item is deleted while waiting', async () => {
		const resumed = await deliver('item.deleted', { itemId, userId: 'u1' }).result;
		expect(resumed.workflowData?.[0][0].json).toMatchObject({
			decision: 'deleted',
			approved: false,
			itemId,
		});
	});

	it('acknowledges but ignores a decision on some other item, and keeps waiting', async () => {
		const other = (
			api.handle('POST', 'https://x/v1/projects/p1/items', { body: { title: 'Other' } }) as {
				id: string;
			}
		).id;
		const { result, response } = deliver('item.approved', api.decide(other, 'approved'));

		const resumed = await result;
		expect(resumed).toEqual({ noWebhookResponse: true });
		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.json).toHaveBeenCalledWith({ ignored: true });
		expect(api.webhooks.size).toBe(1);
	});

	it.each(['item.created', 'item.updated', 'item.processed', 'project.trigger'])(
		'ignores %s for the awaited item',
		async (event) => {
			const resumed = await deliver(event, { item: { _id: itemId, projectId: 'p1' } }).result;
			expect(resumed).toEqual({ noWebhookResponse: true });
			expect(api.webhooks.size).toBe(1);
		},
	);

	it('ignores a delivery with no item id in its URL', async () => {
		const resumed = await deliver('item.approved', api.decide(itemId, 'approved'), {}).result;
		expect(resumed).toEqual({ noWebhookResponse: true });
	});

	it('still resumes if removing the webhook fails', async () => {
		const original = api.handle.bind(api);
		vi.spyOn(api, 'handle').mockImplementation((method, url, options) => {
			if (method === 'DELETE') throw api.error(500, 'boom');
			return original(method, url, options);
		});
		const resumed = await deliver('item.approved', api.decide(itemId, 'approved')).result;
		expect(resumed.workflowData).toBeDefined();
	});
});
