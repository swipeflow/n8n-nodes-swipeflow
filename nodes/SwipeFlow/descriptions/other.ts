import type { INodeProperties } from 'n8n-workflow';
import { forV2 } from './common';

export const otherOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: forV2('other'),
	default: 'apiRequest',
	options: [
		{
			name: 'Custom API Call',
			value: 'apiRequest',
			description: 'Call any SwipeFlow API endpoint',
			action: 'Make a custom API call',
		},
	],
};

export const otherProperties: INodeProperties[] = [
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'GET',
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
		displayOptions: forV2('other', ['apiRequest']),
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. projects/{projectId}/items',
		description:
			'A path on the SwipeFlow API. The /v1 prefix is added if missing; full URLs are not accepted.',
		displayOptions: forV2('other', ['apiRequest']),
	},
	{
		displayName: 'Query Parameters',
		name: 'query',
		type: 'json',
		default: '{}',
		description: 'JSON object of query string parameters',
		displayOptions: forV2('other', ['apiRequest']),
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'json',
		default: '{}',
		description: 'JSON request body',
		displayOptions: forV2('other', ['apiRequest'], { method: ['POST', 'PUT', 'PATCH'] }),
	},
];
