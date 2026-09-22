import type { IDataObject } from 'n8n-workflow';

export type WebhookEnvelope = { event?: unknown; timestamp?: unknown; data?: unknown };

function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Items in webhook payloads are raw database documents, so the ID is `_id`; deletions carry `itemId` instead. */
export function itemIdOf(data: IDataObject): string | undefined {
	const item = isObject(data.item) ? data.item : undefined;
	const id = item?.id ?? item?._id ?? data.itemId;
	return typeof id === 'string' && id ? id : undefined;
}

function parseMetadata(item: IDataObject): IDataObject {
	if (typeof item.metadata !== 'string') return item;
	try {
		return { ...item, metadata: JSON.parse(item.metadata) as IDataObject };
	} catch {
		return item;
	}
}

/**
 * Flattens a SwipeFlow webhook delivery into the shape the Trigger emits. Keeps the
 * original `event`, `timestamp`, `item` and `decision` fields and adds `itemId` and
 * `projectId` so workflows do not have to dig them out of the raw document.
 */
export function normalizeEvent(envelope: WebhookEnvelope): IDataObject | undefined {
	const { event, timestamp, data } = envelope;
	if (typeof event !== 'string' || !isObject(data)) return undefined;

	if (event === 'project.trigger') {
		const { projectId, triggerName, triggerEvent, triggeredBy, ...payload } = data;
		return {
			event,
			timestamp,
			projectId,
			triggerName,
			triggerEvent,
			triggeredBy,
			...(Object.keys(payload).length && { payload }),
		} as IDataObject;
	}

	const item = isObject(data.item) ? parseMetadata(data.item) : undefined;
	const itemId = itemIdOf(data);
	const projectId = item?.projectId;

	return {
		event,
		timestamp,
		...(projectId !== undefined && { projectId }),
		...(itemId && { itemId }),
		...(item && { item }),
		...(data.decision !== undefined && { decision: data.decision }),
		...(data.processed !== undefined && { processed: data.processed }),
		...(data.version !== undefined && { version: data.version }),
		...(data.userId !== undefined && { userId: data.userId }),
	} as IDataObject;
}
