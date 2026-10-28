/**
 * The SwipeFlow webhook created for a wait is named after the execution and item so the
 * resume handler can find it again without any state. SwipeFlow caps webhook names at 100
 * characters.
 */
export function waitWebhookName(executionId: string, itemId: string): string {
	return `n8n wait exec=${executionId} item=${itemId}`;
}

export function isWaitWebhookFor(
	name: string | undefined,
	executionId: string,
	itemId: string,
): boolean {
	return name === waitWebhookName(executionId, itemId);
}
