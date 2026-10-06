import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

export const V1 = { '@version': [1] } satisfies IDisplayOptions['show'];
export const V2 = { '@version': [{ _cnd: { gte: 2 } }] } satisfies IDisplayOptions['show'];

export function forV2(
	resource: string,
	operations?: string[],
	extra: Record<string, Array<string | number | boolean>> = {},
): IDisplayOptions {
	return {
		show: { ...V2, resource: [resource], ...(operations && { operation: operations }), ...extra },
	};
}

export function projectLocator(
	resource: string,
	operations: string[],
	description = 'The project to work in',
): INodeProperties {
	return { ...projectSelector(description), displayOptions: forV2(resource, operations) };
}

export function projectSelector(description = 'The project to work in'): INodeProperties {
	return {
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchProjects', searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 507f1f77bcf86cd799439011',
			},
		],
	};
}

export function returnAllAndLimit(resource: string, operations: string[]): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: forV2(resource, operations),
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: forV2(resource, operations, { returnAll: [false] }),
		},
	];
}

export const CONTENT_TYPE_OPTIONS: INodeProperties['options'] = [
	{ name: 'Audio', value: 'audio', description: 'An audio URL or media reference' },
	{ name: 'HTML', value: 'html', description: 'HTML content' },
	{ name: 'Image', value: 'image', description: 'An image URL or media reference' },
	{ name: 'Text', value: 'text', description: 'Plain text or markdown' },
	{ name: 'Video', value: 'video', description: 'A video URL or media reference' },
];

export const CONTENT_HINT =
	'For image, video and audio, provide an https URL or a media reference (media://<id>) from the Media → Upload operation. Text and HTML may embed media references inline.';

/** Delivery mode and polling settings for a node that waits on a decision. */
/** Adds conditions to a node's base display options without dropping its existing ones. */
export function withShow(base: IDisplayOptions, extra: Record<string, unknown[]>): IDisplayOptions {
	return { show: { ...base.show, ...extra } } as IDisplayOptions;
}

export function deliveryProperties(displayOptions: IDisplayOptions): INodeProperties[] {
	const pollingOnly = (base: IDisplayOptions): IDisplayOptions =>
		withShow(base, { deliveryMode: ['polling'] });
	return [
		{
			displayName: 'Delivery Mode',
			name: 'deliveryMode',
			type: 'options',
			default: 'webhook',
			description: 'How n8n learns about the decision',
			options: [
				{
					name: 'Webhook',
					value: 'webhook',
					description:
						'SwipeFlow calls n8n when the decision is made. The execution does not hold a worker.',
				},
				{
					name: 'Polling',
					value: 'polling',
					description:
						'Check SwipeFlow at an interval. Use when SwipeFlow cannot reach n8n. Holds a worker while waiting.',
				},
			],
			displayOptions,
		},
		{
			displayName: 'Polling Interval (Minutes)',
			name: 'pollingIntervalMinutes',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 5,
			description: 'Minutes between checks for a decision. Polling stops at the Limit Wait Time.',
			displayOptions: pollingOnly(displayOptions),
		},
	];
}

/** Limit Wait Time settings for a node that waits on a decision. */
export function waitLimitProperties(base: IDisplayOptions): INodeProperties[] {
	return [
		// Waiting
		{
			displayName: 'Limit Wait Time',
			name: 'limitWaitTime',
			type: 'boolean',
			default: false,
			description: 'Whether to continue the workflow without a decision after a time limit',
			displayOptions: base,
		},
		{
			displayName: 'Limit Type',
			name: 'limitType',
			type: 'options',
			default: 'afterTimeInterval',
			description: 'Sets how the wait time limit is defined',
			options: [
				{
					name: 'After Time Interval',
					value: 'afterTimeInterval',
					description: 'Waits for a certain amount of time',
				},
				{
					name: 'At Specified Time',
					value: 'atSpecifiedTime',
					description: 'Waits until a specific date and time',
				},
			],
			displayOptions: withShow(base, { limitWaitTime: [true] }),
		},
		{
			displayName: 'Amount',
			name: 'resumeAmount',
			type: 'number',
			typeOptions: { minValue: 0, numberPrecision: 2 },
			default: 1,
			description: 'The time to wait',
			displayOptions: withShow(base, {
				limitWaitTime: [true],
				limitType: ['afterTimeInterval'],
			}),
		},
		{
			displayName: 'Unit',
			name: 'resumeUnit',
			type: 'options',
			default: 'hours',
			description: 'Unit of the wait time',
			options: [
				{ name: 'Days', value: 'days' },
				{ name: 'Hours', value: 'hours' },
				{ name: 'Minutes', value: 'minutes' },
			],
			displayOptions: withShow(base, {
				limitWaitTime: [true],
				limitType: ['afterTimeInterval'],
			}),
		},
		{
			displayName: 'Max Date and Time',
			name: 'maxDateAndTime',
			type: 'dateTime',
			default: '',
			description: 'Continue the workflow at this time if there is still no decision',
			displayOptions: withShow(base, {
				limitWaitTime: [true],
				limitType: ['atSpecifiedTime'],
			}),
		},
	];
}
