import type { INodeProperties } from 'n8n-workflow';
import { forV2, projectLocator } from './common';

export const projectTriggerOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: forV2('projectTrigger'),
	default: 'getAll',
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Add a manual trigger to a project',
			action: 'Create a project trigger',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a manual trigger',
			action: 'Delete a project trigger',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get the manual triggers of a project',
			action: 'Get many project triggers',
		},
		{
			name: 'Run',
			value: 'run',
			description: 'Fire a manual trigger, sending its project.trigger event to webhooks',
			action: 'Run a project trigger',
		},
	],
};

export const projectTriggerProperties: INodeProperties[] = [
	projectLocator('projectTrigger', ['create', 'delete', 'getAll', 'run']),
	{
		displayName: 'Trigger ID',
		name: 'triggerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the trigger',
		displayOptions: forV2('projectTrigger', ['delete', 'run']),
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The label shown on the trigger button in SwipeFlow',
		displayOptions: forV2('projectTrigger', ['create']),
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'string',
		required: true,
		default: '',
		description: 'A name that identifies the trigger to your workflows, delivered as triggerEvent',
		displayOptions: forV2('projectTrigger', ['create']),
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		description: 'Extra JSON object merged into the event data',
		displayOptions: forV2('projectTrigger', ['run']),
	},
];
