import { sleep } from 'n8n-workflow';
import type { Item, SwipeFlowClient } from '../sdk';
import { outcomeFromStatus, type WaitOutcome } from './outcome';

export type PolledDecision = { outcome: WaitOutcome; item: Item };

/**
 * Reads the item every `intervalMs` until it is decided or `timeoutMs` has passed. The
 * execution keeps its worker for the whole wait, so this is the fallback for when SwipeFlow
 * cannot call n8n.
 */
export async function pollUntilDecided(
	client: SwipeFlowClient,
	projectId: string,
	itemId: string,
	{ intervalMs, timeoutMs }: { intervalMs: number; timeoutMs: number },
): Promise<PolledDecision | undefined> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const item = await client.items.get(projectId, itemId);
		const status = item.status as string;
		const outcome =
			outcomeFromStatus(item.status) ?? (status === 'deleted' ? 'deleted' : undefined);
		if (outcome) return { outcome, item };

		const remaining = deadline - Date.now();
		if (remaining <= 0) return undefined;
		await sleep(Math.min(intervalMs, remaining));
	}
}
