import type { INodeProperties } from 'n8n-workflow';
import { V1 } from './common';

// Frozen parameter set of node version 1. Saved workflows reference these names and shapes,
// so they must not change; new behaviour belongs in the version 2 descriptions.
const version1Properties: INodeProperties[] = [
	// Resource selector
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Item', value: 'item', description: 'Operations on items' },
			{ name: 'Project', value: 'project', description: 'Operations on projects' },
			{ name: 'Other', value: 'other', description: 'Other and advanced operations' },
		],
		default: 'item',
		required: true,
	},
	// Operation selector for Item
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Approve', value: 'approve', description: 'Approve an item', action: 'Approve item' },
			{
				name: 'Create',
				value: 'create',
				action: 'Create a new item',
				description: 'Create a new item',
			},
			{
				name: 'Create Version',
				value: 'createVersion',
				description: 'Create a new version of an item',
				action: 'Create item version',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item by ID',
				action: 'Delete item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single item by ID',
				action: 'Get item by ID',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many items in a project with filtering and sorting',
				action: 'Get items',
			},
			{ name: 'Reject', value: 'reject', description: 'Reject an item', action: 'Reject item' },
			{
				name: 'Request Changes',
				value: 'requestChanges',
				description: 'Request changes to an item with comment',
				action: 'Request changes',
			},
		],
		default: 'create',
		required: true,
		displayOptions: {
			show: { resource: ['item'] },
		},
	},
	// Operation selector for Project
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a new project',
				description: 'Create a new project',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a project',
				description: 'Delete a project',
			},
			{
				name: 'Fetch',
				value: 'fetch',
				action: 'Fetch a project by ID',
				description: 'Fetch a project by ID',
			},
			{
				name: 'List',
				value: 'list',
				action: 'List all projects',
				description: 'List all projects',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a project',
				description: 'Update a project',
			},
		],
		default: 'list',
		required: true,
		displayOptions: {
			show: { resource: ['project'] },
		},
	},
	// Operation selector for Other
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generic API Call',
				value: 'apiRequest',
				action: 'Make an arbitrary api request to swipe flow',
				description: 'Make an arbitrary API request to SwipeFlow',
			},
		],
		default: 'apiRequest',
		required: true,
		displayOptions: {
			show: { resource: ['other'] },
		},
		description: 'Other operations',
	},
	// Project: ID (for fetch, update, delete)
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['fetch', 'update', 'delete'],
			},
		},
		required: true,
		default: '',
		description:
			'Select a project to fetch, update, or delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// Project: Create/Update fields
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create', 'update'],
			},
		},
	},
	// Item: Project (for create and getAll)
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll', 'create'],
			},
		},
		required: true,
		default: '',
		description:
			'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// Item: Item ID (for get, approve, reject, requestRevision, createVersion, delete)
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get', 'approve', 'reject', 'requestChanges', 'createVersion', 'delete'],
			},
		},
		default: '',
		description: 'The unique identifier of the item',
	},
	// Item: Project ID (required for get, delete, and createVersion operations)
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get', 'delete', 'approve', 'reject', 'requestChanges', 'createVersion'],
			},
		},
		required: true,
		default: '',
		description:
			'Select the project containing this item. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	// Item: Decision comment (optional for approve/reject)
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['approve', 'reject'],
			},
		},
		default: '',
		description: 'Optional comment for the decision',
	},
	// Item: Decision comment (required for request revision)
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['requestChanges'],
			},
		},
		default: '',
		description: 'Required comment explaining what changes are needed',
	},
	// Item: Create Version fields
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createVersion'],
			},
		},
		default: '',
		description: 'Updated title for the item (optional)',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createVersion'],
			},
		},
		default: '',
		description: 'Updated description for the item (optional)',
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createVersion'],
			},
		},
		options: [
			{ name: 'Audio URL', value: 'audio' },
			{ name: 'HTML', value: 'html' },
			{ name: 'Image URL', value: 'image' },
			{ name: 'Text', value: 'text' },
			{ name: 'Video URL', value: 'video' },
		],
		default: 'text',
		description: 'The type of content this item contains',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createVersion'],
			},
		},
		default: '',
		description: 'Updated content for the item (optional)',
	},
	{
		displayName: 'Metadata',
		name: 'metadata',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['createVersion'],
			},
		},
		default: '',
		description: 'Updated metadata for the item as JSON (optional)',
	},
	// Item: Include versions (optional for get operation)
	{
		displayName: 'Include All Versions',
		name: 'includeVersions',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['get'],
			},
		},
		default: false,
		description: 'Whether to include all versions of the item in the response',
	},
	// Item: Get Items filters and options
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'All', value: '' },
			{ name: 'Approved', value: 'approved' },
			{ name: 'Change Requested', value: 'change_requested' },
			{ name: 'Pending', value: 'pending' },
			{ name: 'Rejected', value: 'rejected' },
		],
		default: '',
		description: 'Filter items by status',
	},
	{
		displayName: 'Search',
		name: 'search',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		default: '',
		description: 'Search items by title, description, or content',
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'Created At', value: 'createdAt' },
			{ name: 'Updated At', value: 'updatedAt' },
			{ name: 'Title', value: 'title' },
			{ name: 'Status', value: 'status' },
		],
		default: 'createdAt',
		description: 'Field to sort items by',
	},
	{
		displayName: 'Sort Order',
		name: 'sortOrder',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		options: [
			{ name: 'Descending (Newest First)', value: 'desc' },
			{ name: 'Ascending (Oldest First)', value: 'asc' },
		],
		default: 'desc',
		description: 'Sort order for items',
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		default: 1,
		description: 'Page number for pagination',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Include All Versions',
		name: 'includeVersions',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to include all versions for each item in the response',
	},
	// Item: Create fields
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'The title of the item',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'A detailed description of the item',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		required: true,
		default: 'text',
		options: [
			{ name: 'Audio', value: 'audio', description: 'Audio URL' },
			{ name: 'HTML', value: 'html', description: 'HTML content' },
			{ name: 'Image', value: 'image', description: 'Image URL' },
			{ name: 'Text', value: 'text', description: 'Plain text content' },
			{ name: 'Video', value: 'video', description: 'Video URL' },
		],
		description: 'The type of content this item contains',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		description:
			'The main content of the item. For media types (image, video, audio), provide the URL.',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Metadata (JSON)',
		name: 'metadata',
		type: 'json',
		default: '',
		description: 'Optional JSON metadata for the item',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Expiration Date',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		description: 'Optional expiration date for the item',
		displayOptions: {
			show: {
				resource: ['item'],
				operation: ['create'],
			},
		},
	},
	// Other: Generic API Call
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		displayOptions: {
			show: {
				resource: ['other'],
				operation: ['apiRequest'],
			},
		},
		required: true,
		default: '',
		description:
			'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'HTTP Method',
		name: 'method',
		type: 'options',
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
		default: 'GET',
		displayOptions: {
			show: {
				resource: ['other'],
				operation: ['apiRequest'],
			},
		},
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['other'],
				operation: ['apiRequest'],
			},
		},
		description: 'Path after /v1/, e.g. projects/{projectId}/items',
	},
	{
		displayName: 'Body (JSON)',
		name: 'body',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['other'],
				operation: ['apiRequest'],
				method: ['POST', 'PUT', 'PATCH'],
			},
		},
		description: 'Request body for POST/PUT/PATCH',
	},
	{
		displayName: 'Query Parameters (JSON)',
		name: 'query',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['other'],
				operation: ['apiRequest'],
			},
		},
		description: 'Query params as JSON',
	},
];

export const legacyV1Properties: INodeProperties[] = version1Properties.map((property) => ({
	...property,
	displayOptions: { ...property.displayOptions, show: { ...V1, ...property.displayOptions?.show } },
}));
