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
	return {
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		displayOptions: forV2(resource, operations),
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
