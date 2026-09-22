import { describe, expect, it } from 'vitest';
import { itemIdOf, normalizeEvent } from '../nodes/SwipeFlow/shared/events';

const timestamp = '2026-09-21T12:00:00.000Z';
// Items in deliveries are raw database documents: `_id`, not `id`.
const item = { _id: 'i1', projectId: 'p1', title: 'Post', status: 'approved', metadata: { a: 1 } };

describe('normalizeEvent', () => {
	it('adds itemId and projectId to a decision event and keeps the original fields', () => {
		const decision = { decision: 'approved', comment: 'Ship it' };
		expect(
			normalizeEvent({ event: 'item.approved', timestamp, data: { item, userId: 'u1', decision } }),
		).toEqual({
			event: 'item.approved',
			timestamp,
			projectId: 'p1',
			itemId: 'i1',
			item,
			decision,
			userId: 'u1',
		});
	});

	it('handles item.deleted, which carries only itemId and no item (this crashed the old trigger)', () => {
		expect(
			normalizeEvent({ event: 'item.deleted', timestamp, data: { itemId: 'i9', userId: 'u1' } }),
		).toEqual({
			event: 'item.deleted',
			timestamp,
			itemId: 'i9',
			userId: 'u1',
		});
	});

	it('handles item.processed (unsupported by the old trigger)', () => {
		const processed = { processedAt: timestamp, action: 'published' };
		expect(
			normalizeEvent({
				event: 'item.processed',
				timestamp,
				data: { item, userId: 'u1', processed },
			}),
		).toMatchObject({ event: 'item.processed', itemId: 'i1', processed });
	});

	it('exposes the version on item.updated', () => {
		expect(
			normalizeEvent({ event: 'item.updated', timestamp, data: { item, version: 3 } }),
		).toMatchObject({ version: 3 });
	});

	it('parses metadata that arrives as a JSON string and leaves unparseable strings alone', () => {
		const parsed = normalizeEvent({
			event: 'item.created',
			timestamp,
			data: { item: { ...item, metadata: '{"k":"v"}' } },
		});
		expect((parsed?.item as { metadata: unknown }).metadata).toEqual({ k: 'v' });
		const broken = normalizeEvent({
			event: 'item.created',
			timestamp,
			data: { item: { ...item, metadata: 'not json' } },
		});
		expect((broken?.item as { metadata: unknown }).metadata).toBe('not json');
	});

	it('flattens project.trigger and keeps caller-supplied payload fields under `payload`', () => {
		const data = {
			projectId: 'p1',
			triggerName: 'Publish',
			triggerEvent: 'publish',
			triggeredBy: 'a@b.c',
			campaign: 'spring',
		};
		expect(normalizeEvent({ event: 'project.trigger', timestamp, data })).toEqual({
			event: 'project.trigger',
			timestamp,
			projectId: 'p1',
			triggerName: 'Publish',
			triggerEvent: 'publish',
			triggeredBy: 'a@b.c',
			payload: { campaign: 'spring' },
		});
	});

	it('omits `payload` when a trigger carries nothing extra', () => {
		const out = normalizeEvent({
			event: 'project.trigger',
			timestamp,
			data: { projectId: 'p1', triggerName: 'x', triggerEvent: 'y', triggeredBy: 'z' },
		});
		expect(out).not.toHaveProperty('payload');
	});

	it.each([
		['no event', { data: {} }],
		['no data', { event: 'item.created' }],
		['array data', { event: 'item.created', data: [] }],
		['non-string event', { event: 5, data: {} }],
	])('returns undefined for %s', (_label, envelope) => {
		expect(normalizeEvent(envelope)).toBeUndefined();
	});
});

describe('itemIdOf', () => {
	it('prefers id, then _id, then itemId, and ignores non-strings', () => {
		expect(itemIdOf({ item: { id: 'a', _id: 'b' }, itemId: 'c' })).toBe('a');
		expect(itemIdOf({ item: { _id: 'b' }, itemId: 'c' })).toBe('b');
		expect(itemIdOf({ itemId: 'c' })).toBe('c');
		expect(itemIdOf({ item: { _id: 5 } })).toBeUndefined();
		expect(itemIdOf({})).toBeUndefined();
	});
});
