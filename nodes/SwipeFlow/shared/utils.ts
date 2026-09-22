import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
} from 'n8n-workflow';

/** Accepts what an n8n `json` parameter can yield: a JSON string, an object from an expression, or nothing. */
export function parseJsonParameter(
	node: INode,
	value: unknown,
	name: string,
	itemIndex: number,
): IDataObject | undefined {
	if (value === undefined || value === null || value === '') return undefined;

	let parsed: unknown = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value);
		} catch (error) {
			throw new NodeOperationError(node, `"${name}" is not valid JSON`, {
				itemIndex,
				description: (error as Error).message,
			});
		}
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new NodeOperationError(node, `"${name}" must be a JSON object`, { itemIndex });
	}
	return parsed as IDataObject;
}

export function splitIds(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

export function toExecutionData(
	ctx: IExecuteFunctions,
	data: IDataObject | IDataObject[],
	itemIndex: number,
): INodeExecutionData[] {
	return ctx.helpers.constructExecutionMetaData(ctx.helpers.returnJsonArray(data), {
		itemData: { item: itemIndex },
	});
}
