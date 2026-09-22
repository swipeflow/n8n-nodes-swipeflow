import type { INodeProperties } from 'n8n-workflow';
import {
	CONTENT_HINT,
	CONTENT_TYPE_OPTIONS,
	forV2,
	projectLocator,
	returnAllAndLimit,
} from './common';

const ITEM_ID_OPERATIONS = [
	'approve',
	'createVersion',
	'delete',
	'get',
	'getStatus',
	'getVersion',
	'listVersions',
	'markProcessed',
	'reject',
	'requestChanges',
	'wait',
];

const ALL_OPERATIONS = [...ITEM_ID_OPERATIONS, 'create', 'getAll', 'getNext', 'sendAndWait'];
const WAIT_OPERATIONS = ['sendAndWait', 'wait'];

export const itemOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: forV2('item'),
	default: 'create',
	options: [
		{
			name: 'Approve',
			value: 'approve',
			description: 'Approve an item',
			action: 'Approve an item',
		},
		{
			name: 'Create',
			value: 'create',
			description: 'Create an item for review',
			action: 'Create an item',
		},
		{
			name: 'Create and Wait for Decision',
			value: 'sendAndWait',
			description:
				'Create an item, then pause the workflow until a reviewer approves, rejects or requests changes',
			action: 'Create an item and wait for a decision',
		},
		{
			name: 'Create Version',
			value: 'createVersion',
			description: 'Submit a revised version of an item',
			action: 'Create an item version',
		},
		{ name: 'Delete', value: 'delete', description: 'Delete an item', action: 'Delete an item' },
		{ name: 'Get', value: 'get', description: 'Get an item by ID', action: 'Get an item' },
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get many items in a project',
			action: 'Get many items',
		},
		{
			name: 'Get Next Pending',
			value: 'getNext',
			description: 'Get the next item awaiting review',
			action: 'Get the next pending item',
		},
		{
			name: 'Get Status',
			value: 'getStatus',
			description: 'Get an item’s current status and latest decision',
			action: 'Get an item status',
		},
		{
			name: 'Get Version',
			value: 'getVersion',
			description: 'Get one version of an item',
			action: 'Get an item version',
		},
		{
			name: 'List Versions',
			value: 'listVersions',
			description: 'Get the versions of an item',
			action: 'List item versions',
		},
		{
			name: 'Mark as Processed',
			value: 'markProcessed',
			description: 'Confirm that an approved or rejected decision was acted on',
			action: 'Mark an item as processed',
		},
		{ name: 'Reject', value: 'reject', description: 'Reject an item', action: 'Reject an item' },
		{
			name: 'Request Changes',
			value: 'requestChanges',
			description: 'Ask for changes to an item',
			action: 'Request changes to an item',
		},
		{
			name: 'Wait for Decision',
			value: 'wait',
			description: 'Pause the workflow until a reviewer decides on an existing item',
			action: 'Wait for a decision on an item',
		},
	],
};

export const itemProperties: INodeProperties[] = [
	projectLocator('item', ALL_OPERATIONS, 'The project the item belongs to'),
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the item',
		displayOptions: forV2('item', ITEM_ID_OPERATIONS),
	},

	// Create / Create and wait
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'What the reviewer sees first',
		displayOptions: forV2('item', ['create', 'sendAndWait']),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'Context for the reviewer',
		displayOptions: forV2('item', ['create', 'sendAndWait']),
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		required: true,
		default: 'text',
		options: CONTENT_TYPE_OPTIONS,
		description: 'How the reviewer should render the content',
		displayOptions: forV2('item', ['create', 'sendAndWait']),
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		description: CONTENT_HINT,
		displayOptions: forV2('item', ['create', 'sendAndWait']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: forV2('item', ['create', 'sendAndWait']),
		options: [
			{
				displayName: 'Expiration Date',
				name: 'expiresAt',
				type: 'dateTime',
				default: '',
				description: 'When the item stops being reviewable',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'Retrying with the same key returns the original item instead of creating a duplicate. Defaults to one derived from the execution for Create and Wait for Decision.',
			},
			{
				displayName: 'Media IDs',
				name: 'mediaIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. 66f1f77bcf86cd799439099, 66f1f77bcf86cd79943909a',
				description:
					'Comma-separated IDs of uploaded media to attach, from the Media → Upload operation',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Custom JSON object stored with the item and returned in events',
			},
		],
	},

	// Create version
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: forV2('item', ['createVersion']),
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: CONTENT_HINT,
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: CONTENT_TYPE_OPTIONS,
				default: 'text',
				description: 'Applies together with Content',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'New description',
			},
			{
				displayName: 'Media IDs',
				name: 'mediaIds',
				type: 'string',
				default: '',
				description: 'Comma-separated IDs of uploaded media to attach',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'New custom JSON object',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'New title',
			},
		],
	},

	// Decisions
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		description: 'Optional note recorded with the decision',
		displayOptions: forV2('item', ['approve', 'reject']),
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		required: true,
		default: '',
		description: 'What needs to change',
		displayOptions: forV2('item', ['requestChanges']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forV2('item', ['requestChanges']),
		options: [
			{
				displayName: 'Target Version',
				name: 'targetVersion',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'The version the request applies to. Defaults to the latest.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forV2('item', ['markProcessed']),
		options: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'string',
				default: '',
				placeholder: 'e.g. published',
				description: 'Free-text note on what was done with the decision',
			},
		],
	},

	// Get
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forV2('item', ['get']),
		options: [
			{
				displayName: 'Include All Versions',
				name: 'includeVersions',
				type: 'boolean',
				default: false,
				description: 'Whether to include every version of the item',
			},
			{
				displayName: 'Resolve Media URLs',
				name: 'resolveMedia',
				type: 'boolean',
				default: false,
				description: 'Whether to replace media references in the content with temporary URLs',
			},
		],
	},

	// Get many
	...returnAllAndLimit('item', ['getAll']),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: forV2('item', ['getAll']),
		options: [
			{
				displayName: 'Processed',
				name: 'processed',
				type: 'boolean',
				default: false,
				description:
					'Whether to return only items whose decision was (true) or was not (false) marked as processed',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Match against title, description or content',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'pending',
				options: [
					{ name: 'Approved', value: 'approved' },
					{ name: 'Change Requested', value: 'change_requested' },
					{ name: 'Pending', value: 'pending' },
					{ name: 'Rejected', value: 'rejected' },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forV2('item', ['getAll']),
		options: [
			{
				displayName: 'Resolve Media URLs',
				name: 'resolveMedia',
				type: 'boolean',
				default: false,
				description: 'Whether to replace media references in the content with temporary URLs',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'createdAt',
				options: [
					{ name: 'Created At', value: 'createdAt' },
					{ name: 'Status', value: 'status' },
					{ name: 'Title', value: 'title' },
					{ name: 'Updated At', value: 'updatedAt' },
				],
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
			},
		],
	},

	// Versions
	{
		displayName: 'Version',
		name: 'version',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 1,
		description: 'The version number',
		displayOptions: forV2('item', ['getVersion']),
	},
	...returnAllAndLimit('item', ['listVersions']),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: forV2('item', ['listVersions']),
		options: [
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending (Oldest First)', value: 'asc' },
					{ name: 'Descending (Newest First)', value: 'desc' },
				],
			},
		],
	},

	// Waiting
	{
		displayName: 'Limit Wait Time',
		name: 'limitWaitTime',
		type: 'boolean',
		default: false,
		description: 'Whether to continue the workflow without a decision after a time limit',
		displayOptions: forV2('item', WAIT_OPERATIONS),
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
		displayOptions: forV2('item', WAIT_OPERATIONS, { limitWaitTime: [true] }),
	},
	{
		displayName: 'Amount',
		name: 'resumeAmount',
		type: 'number',
		typeOptions: { minValue: 0, numberPrecision: 2 },
		default: 1,
		description: 'The time to wait',
		displayOptions: forV2('item', WAIT_OPERATIONS, {
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
		displayOptions: forV2('item', WAIT_OPERATIONS, {
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
		displayOptions: forV2('item', WAIT_OPERATIONS, {
			limitWaitTime: [true],
			limitType: ['atSpecifiedTime'],
		}),
	},
];
