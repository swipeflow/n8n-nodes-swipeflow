import type { INodeProperties } from 'n8n-workflow';
import { forV2, projectLocator, returnAllAndLimit } from './common';

export const projectOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: forV2('project'),
	default: 'getAll',
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Create a project',
			action: 'Create a project',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a project and everything in it',
			action: 'Delete a project',
		},
		{ name: 'Get', value: 'get', description: 'Get a project by ID', action: 'Get a project' },
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get many projects',
			action: 'Get many projects',
		},
		{
			name: 'Get or Create',
			value: 'resolve',
			description: 'Get the project with a given name, creating it if it does not exist',
			action: 'Get or create a project by name',
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update a project',
			action: 'Update a project',
		},
	],
};

export const projectProperties: INodeProperties[] = [
	projectLocator('project', ['delete', 'get', 'update']),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The project name',
		displayOptions: forV2('project', ['create', 'resolve']),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'What the project is for',
		displayOptions: forV2('project', ['create', 'resolve']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: forV2('project', ['update']),
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'New description',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New name' },
		],
	},
	...returnAllAndLimit('project', ['getAll']),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: forV2('project', ['getAll']),
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Match against the project name',
			},
			{
				displayName: 'Starred',
				name: 'starred',
				type: 'boolean',
				default: true,
				description: 'Whether to return only starred projects',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
				],
			},
		],
	},
];
