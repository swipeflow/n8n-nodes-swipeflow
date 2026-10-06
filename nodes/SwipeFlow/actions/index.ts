import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { createClient } from '../shared/transport';
import { toExecutionData } from '../shared/utils';
import { itemActions } from './item';
import { mediaActions } from './media';
import { otherActions } from './other';
import { ExecutionItems, type ActionHandler } from './params';
import { projectActions } from './project';
import { projectTriggerActions } from './projectTrigger';
import { webhookActions } from './webhook';

const actions: Record<string, Record<string, ActionHandler>> = {
	item: itemActions,
	media: mediaActions,
	other: otherActions,
	project: projectActions,
	projectTrigger: projectTriggerActions,
	webhook: webhookActions,
};

export async function runAction(
	ctx: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const handler = actions[resource]?.[operation];
	if (!handler) {
		throw new Error(`The operation "${operation}" is not supported for "${resource}"`);
	}

	const result = await handler(ctx, createClient(ctx), itemIndex);
	return result instanceof ExecutionItems ? result.items : toExecutionData(ctx, result, itemIndex);
}
