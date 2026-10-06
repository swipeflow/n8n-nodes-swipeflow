import { WAIT_INDEFINITELY } from 'n8n-workflow';

const NO_LIMIT = 'none';

/**
 * The SwipeFlow webhook created for a wait is named after the execution and item so the
 * resume handler can find it again without any state, and so a later wait can tell when
 * one has outlived its time limit. SwipeFlow caps webhook names at 100 characters.
 */
export function waitWebhookName(executionId: string, itemId: string, waitTill: Date): string {
	const until =
		waitTill.getTime() === WAIT_INDEFINITELY.getTime() ? NO_LIMIT : waitTill.toISOString();
	return `n8n wait exec=${executionId} item=${itemId} until=${until}`;
}

export function isWaitWebhookFor(
	name: string | undefined,
	executionId: string,
	itemId: string,
): boolean {
	return name?.startsWith(`n8n wait exec=${executionId} item=${itemId} `) ?? false;
}

export function isExpiredWaitWebhook(name: string | undefined, now: number): boolean {
	const until = /^n8n wait exec=\S+ item=\S+ until=(\S+)$/.exec(name ?? '')?.[1];
	if (!until || until === NO_LIMIT) return false;
	const expiresAt = Date.parse(until);
	return !Number.isNaN(expiresAt) && expiresAt < now;
}
