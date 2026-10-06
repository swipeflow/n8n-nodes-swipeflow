import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { SwipeFlowClient } from '../sdk';
import { MAX_PAGE_SIZE } from '../shared/constants';

/** Wraps items a handler built itself, for results that carry binary data. */
export class ExecutionItems {
	constructor(readonly items: INodeExecutionData[]) {}
}

export type ActionResult = IDataObject | IDataObject[] | ExecutionItems;

export type ActionHandler = (
	ctx: IExecuteFunctions,
	client: SwipeFlowClient,
	itemIndex: number,
) => Promise<ActionResult>;

export function projectIdOf(ctx: IExecuteFunctions, itemIndex: number): string {
	return ctx.getNodeParameter('projectId', itemIndex, '', { extractValue: true }) as string;
}

/**
 * Follows page-number pagination until `limit` results are collected, or the end when
 * returning all. Stops on a short or empty page as well as on the reported page count, so
 * a response missing pagination metadata cannot loop forever.
 */
export async function collectPages<T>(
	ctx: IExecuteFunctions,
	itemIndex: number,
	fetchPage: (page: number, limit: number) => Promise<{ results: T[]; pages?: number }>,
): Promise<T[]> {
	const returnAll = ctx.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const wanted = returnAll ? Infinity : (ctx.getNodeParameter('limit', itemIndex, 50) as number);
	const collected: T[] = [];

	for (let page = 1; collected.length < wanted; page++) {
		const pageSize = Math.min(MAX_PAGE_SIZE, wanted - collected.length);
		const { results, pages } = await fetchPage(page, pageSize);
		collected.push(...results);
		if (results.length < pageSize || (pages !== undefined && page >= pages)) break;
	}
	return collected.slice(0, wanted);
}
