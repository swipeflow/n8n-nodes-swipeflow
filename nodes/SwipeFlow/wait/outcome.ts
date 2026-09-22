import type { IDataObject } from 'n8n-workflow';
import type { Item, ItemDecision } from '../sdk';

export type WaitOutcome = 'approved' | 'rejected' | 'change_requested' | 'deleted';

const OUTCOME_BY_EVENT: Record<string, WaitOutcome> = {
	'item.approved': 'approved',
	'item.rejected': 'rejected',
	'item.change_requested': 'change_requested',
	'item.deleted': 'deleted',
};

export function outcomeFromEvent(event: unknown): WaitOutcome | undefined {
	return typeof event === 'string' ? OUTCOME_BY_EVENT[event] : undefined;
}

export function outcomeFromStatus(status: Item['status']): WaitOutcome | undefined {
	return status === 'approved' || status === 'rejected' || status === 'change_requested'
		? status
		: undefined;
}

export function buildOutcome(params: {
	outcome: WaitOutcome;
	projectId: string;
	itemId: string;
	item?: IDataObject;
	decision?: IDataObject;
}): IDataObject {
	const { outcome, projectId, itemId, item } = params;
	const decision = params.decision ?? (latestDecision(item) as IDataObject | undefined);

	return {
		decision: outcome,
		approved: outcome === 'approved',
		...(decision?.comment !== undefined && { comment: decision.comment }),
		...(decision?.actorName !== undefined && { decidedBy: decision.actorName }),
		...(decision?.timestamp !== undefined && { decidedAt: decision.timestamp }),
		...(decision?.targetVersion !== undefined && { targetVersion: decision.targetVersion }),
		itemId,
		projectId,
		...(item && { item }),
	} as IDataObject;
}

function latestDecision(item: IDataObject | undefined): ItemDecision | undefined {
	const decisions = item?.decisions;
	return Array.isArray(decisions)
		? (decisions[decisions.length - 1] as ItemDecision | undefined)
		: undefined;
}
