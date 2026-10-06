import { WAIT_INDEFINITELY } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Swipeflow } from '../nodes/SwipeFlow/Swipeflow.node';
import { SwipeflowApproval } from '../nodes/SwipeFlow/SwipeflowApproval.node';
import { createClient } from '../nodes/SwipeFlow/shared/transport';
import { pollUntilDecided } from '../nodes/SwipeFlow/wait/poll';
import { APPROVAL_OUTPUT_NAMES, routeToOutput } from '../nodes/SwipeFlow/wait/route';
import { fakeContext } from './helpers/context';
import { FakeSwipeFlow } from './helpers/fakeApi';

const TIMED_OUT = 0;
const APPROVED = 1;
const REJECTED = 2;
const CHANGES = 3;
const ALWAYS = 4;

const json = { decision: 'x' };

function firedOutputs(outputs: unknown[][]) {
	return outputs.flatMap((items, index) => (items.length ? [index] : []));
}

const limit = (minutes: number) => ({
	limitWaitTime: true,
	limitType: 'afterTimeInterval',
	resumeAmount: minutes,
	resumeUnit: 'minutes',
});

describe('routeToOutput', () => {
	it('names five outputs, with Timed out first and Always last', () => {
		expect(APPROVAL_OUTPUT_NAMES).toEqual([
			'Timed out',
			'Approved',
			'Rejected',
			'Change requested',
			'Always',
		]);
	});

	it.each([
		['timed_out', TIMED_OUT],
		['approved', APPROVED],
		['rejected', REJECTED],
		['deleted', REJECTED],
		['change_requested', CHANGES],
	] as const)('sends %s to its branch and to Always', (outcome, branch) => {
		expect(firedOutputs(routeToOutput(outcome, json))).toEqual(
			[branch, ALWAYS].sort((a, b) => a - b),
		);
	});

	it('carries the same decision on the branch and on Always', () => {
		const outputs = routeToOutput('approved', json);
		expect(outputs[APPROVED]).toEqual([{ json }]);
		expect(outputs[ALWAYS]).toEqual([{ json }]);
	});
});

describe('pollUntilDecided', () => {
	it('returns the decision once the item leaves pending', async () => {
		const api = new FakeSwipeFlow();
		const created = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'T' },
		}) as { id: string };
		const client = createClient(fakeContext({ api }).ctx as never);
		const get = vi.spyOn(client.items, 'get');
		get.mockResolvedValueOnce({ id: created.id, status: 'pending' } as never);
		get.mockResolvedValueOnce({ id: created.id, status: 'approved' } as never);

		const decided = await pollUntilDecided(client, 'p1', created.id, {
			intervalMs: 1,
			timeoutMs: 5_000,
		});

		expect(decided?.outcome).toBe('approved');
		expect(get).toHaveBeenCalledTimes(2);
	});

	it('gives up at the deadline without a decision', async () => {
		const api = new FakeSwipeFlow();
		const created = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'T' },
		}) as { id: string };
		const client = createClient(fakeContext({ api }).ctx as never);

		const decided = await pollUntilDecided(client, 'p1', created.id, {
			intervalMs: 1,
			timeoutMs: 20,
		});

		expect(decided).toBeUndefined();
	});
});

describe('SwipeFlow Approval node', () => {
	let api: FakeSwipeFlow;

	beforeEach(() => {
		api = new FakeSwipeFlow();
	});
	afterEach(() => vi.useRealTimers());

	const baseParams = {
		projectId: { mode: 'id', value: 'p1' },
		title: 'Publish post',
		contentType: 'text',
		content: 'Hello',
		additionalFields: {},
	};

	const run = (params: Record<string, unknown> = {}) => {
		const context = fakeContext({ api, params: { ...baseParams, ...params }, typeVersion: 1 });
		return { ...context, result: new SwipeflowApproval().execute.call(context.ctx as never) };
	};

	it('waits with no timer in webhook mode when there is no limit', async () => {
		const { raw, result } = run();
		const outputs = await result;

		expect(raw.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY);
		expect(outputs).toHaveLength(5);
		expect(firedOutputs(outputs)).toEqual([]);
		expect([...api.webhooks.values()]).toHaveLength(1);
	});

	it('resumes at the time limit in webhook mode, so the timer routes to Timed out', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-06T12:00:00.000Z'));
		const { raw, result } = run(limit(2));
		const outputs = await result;

		expect(raw.putExecutionToWait).toHaveBeenCalledWith(new Date('2026-10-06T12:02:00.000Z'));
		expect(firedOutputs(outputs)).toEqual([]);
		expect([...api.webhooks.values()][0].name).toContain('until=2026-10-06T12:02:00.000Z');
	});

	it('routes an already decided item immediately and removes its webhook', async () => {
		const decided = api.handle('POST', 'https://x/v1/projects/p1/items', {
			body: { title: 'T' },
		}) as { id: string };
		api.decide(decided.id, 'rejected', 'Not this one');
		api.stub('POST', /\/items$/, { id: decided.id });

		const context = fakeContext({ api, params: baseParams, typeVersion: 1 });
		const outputs = await new SwipeflowApproval().execute.call(context.ctx as never);

		expect(firedOutputs(outputs)).toEqual([REJECTED, ALWAYS]);
		expect(outputs[REJECTED][0].json).toMatchObject({ decision: 'rejected', approved: false });
		expect(api.webhooks.size).toBe(0);
		expect(context.raw.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('routes a limit reached while polling to Timed out, marked as an n8n timeout', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
		const pending = run({ ...limit(2), deliveryMode: 'polling', pollingIntervalMinutes: 1 });

		await vi.advanceTimersByTimeAsync(3 * 60_000);
		const outputs = await pending.result;

		expect(firedOutputs(outputs)).toEqual([TIMED_OUT, ALWAYS]);
		expect(outputs[TIMED_OUT][0].json).toMatchObject({
			decision: 'timed_out',
			approved: false,
			timeoutSource: 'n8n',
		});
		expect(pending.raw.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('routes an approval made while polling to Approved', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
		const pending = run({ ...limit(5), deliveryMode: 'polling', pollingIntervalMinutes: 1 });

		await vi.advanceTimersByTimeAsync(0);
		const [item] = [...api.items.values()];
		api.decide(item.id, 'approved', 'Looks good');
		await vi.advanceTimersByTimeAsync(60_000);
		const outputs = await pending.result;

		expect(firedOutputs(outputs)).toEqual([APPROVED, ALWAYS]);
		expect(outputs[APPROVED][0].json).toMatchObject({ decision: 'approved', approved: true });
	});

	it('returns the decision on one output when running as an AI tool', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
		const context = run({ ...limit(5), deliveryMode: 'polling', pollingIntervalMinutes: 1 });
		(context.ctx as unknown as { getNode: () => unknown }).getNode = () => ({
			id: 'node-1',
			name: 'SwipeFlow Approval Tool',
			type: '@swipeflow/n8n-nodes-swipeflow.swipeflowApprovalTool',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		});
		const pending = new SwipeflowApproval().execute.call(context.ctx as never);

		await vi.advanceTimersByTimeAsync(0);
		const [item] = [...api.items.values()];
		api.decide(item.id, 'approved', 'Looks good');
		await vi.advanceTimersByTimeAsync(60_000);
		const outputs = await pending;

		expect(outputs).toHaveLength(1);
		expect(outputs[0][0].json).toMatchObject({ decision: 'approved', approved: true });
	});

	it('refuses to poll without a time limit, before creating an item', async () => {
		const { result } = run({ deliveryMode: 'polling', pollingIntervalMinutes: 1 });

		await expect(result).rejects.toThrow('Polling needs a time limit');
		expect(api.items.size).toBe(0);
	});
});

describe('Swipeflow node polling for sendAndWait', () => {
	const params = {
		resource: 'item',
		operation: 'sendAndWait',
		projectId: { mode: 'id', value: 'p1' },
		title: 'T',
		contentType: 'text',
		content: 'C',
		additionalFields: {},
		deliveryMode: 'polling',
		pollingIntervalMinutes: 1,
	};

	afterEach(() => vi.useRealTimers());

	it('passes the input through when the time limit passes, as a time-limited webhook wait does', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
		const context = fakeContext({ api: new FakeSwipeFlow(), params: { ...params, ...limit(1) } });
		const pending = new Swipeflow().execute.call(context.ctx as never);

		await vi.advanceTimersByTimeAsync(2 * 60_000);

		expect(await pending).toEqual([context.raw.getInputData()]);
	});

	it('refuses to poll without a time limit', async () => {
		const context = fakeContext({ api: new FakeSwipeFlow(), params });

		await expect(new Swipeflow().execute.call(context.ctx as never)).rejects.toThrow(
			'Polling needs a time limit',
		);
	});
});
