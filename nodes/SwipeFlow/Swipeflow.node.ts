import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type IHookFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { runAction } from './actions';
import { runLegacyAction } from './actions/legacyV1';
import { buildCreateRequest } from './actions/item';
import { projectIdOf } from './actions/params';
import { V2 } from './descriptions/common';
import { itemOperations, itemProperties } from './descriptions/item';
import { legacyV1Properties } from './descriptions/legacyV1';
import { mediaOperations, mediaProperties } from './descriptions/media';
import { otherOperations, otherProperties } from './descriptions/other';
import { projectOperations, projectProperties } from './descriptions/project';
import { projectTriggerOperations, projectTriggerProperties } from './descriptions/projectTrigger';
import { webhookOperations, webhookProperties } from './descriptions/webhook';
import { getProjects, searchProjects } from './methods';
import { CREDENTIALS_NAME, DOCS_URL, ICON } from './shared/constants';
import { createClient } from './shared/transport';
import { handleResume } from './wait/resume';
import { waitForDecision } from './wait/start';

export class Swipeflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SwipeFlow',
		name: 'swipeflow',
		icon: ICON,
		documentationUrl: DOCS_URL,
		group: ['input'],
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Add human approval to your workflows',
		defaults: { name: 'SwipeFlow' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: CREDENTIALS_NAME, required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{ $nodeId }}',
				restartWebhook: true,
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'item',
				displayOptions: { show: V2 },
				options: [
					{ name: 'Item', value: 'item', description: 'Things for a person to review' },
					{ name: 'Media', value: 'media', description: 'Files attached to items' },
					{ name: 'Other', value: 'other', description: 'Anything not covered above' },
					{ name: 'Project', value: 'project', description: 'Groups of items and their reviewers' },
					{
						name: 'Project Trigger',
						value: 'projectTrigger',
						description: 'Manual triggers that start workflows from SwipeFlow',
					},
					{ name: 'Webhook', value: 'webhook', description: 'Where SwipeFlow sends events' },
				],
			},
			itemOperations,
			projectOperations,
			mediaOperations,
			webhookOperations,
			projectTriggerOperations,
			otherOperations,
			...itemProperties,
			...projectProperties,
			...mediaProperties,
			...webhookProperties,
			...projectTriggerProperties,
			...otherProperties,
			...legacyV1Properties,
		],
	};

	methods = {
		listSearch: { searchProjects },
		loadOptions: { getProjects },
	};

	// n8n registers the resume webhook per waiting execution and SwipeFlow is never told about it
	// (the wait creates its own project webhook), so there is nothing to create, check or delete.
	// The hooks exist because strict lint requires them on any node that declares webhooks.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const version = this.getNode().typeVersion;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (
			version >= 2 &&
			resource === 'item' &&
			(operation === 'sendAndWait' || operation === 'wait')
		) {
			return pauseUntilDecision(this, operation);
		}

		const results: INodeExecutionData[] = [];
		const items = this.getInputData();

		for (let i = 0; i < items.length; i++) {
			try {
				results.push(
					...(version >= 2
						? await runAction(this, resource, operation, i)
						: await runLegacyAction(this, resource, operation, i)),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					results.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [results];
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return handleResume(this);
	}
}

/**
 * Only the first input item is used, as with n8n's own send-and-wait nodes: an execution
 * can be paused once per node, and the decision resumes it with a single result.
 */
async function pauseUntilDecision(
	ctx: IExecuteFunctions,
	operation: 'sendAndWait' | 'wait',
): Promise<INodeExecutionData[][]> {
	const client = createClient(ctx);
	const projectId = projectIdOf(ctx, 0);

	let itemId: string;
	if (operation === 'sendAndWait') {
		// Stable across an automatic retry of this node, distinct between loop iterations.
		const runIndex = ctx.evaluateExpression('{{ $runIndex }}', 0) as number;
		const idempotencyKey = `n8n:${ctx.getExecutionId()}:${ctx.getNode().id}:${runIndex}`;
		itemId = (await client.items.create(projectId, buildCreateRequest(ctx, 0, idempotencyKey)))
			.id as string;
	} else {
		itemId = ctx.getNodeParameter('itemId', 0) as string;
	}

	return waitForDecision(ctx, client, projectId, itemId);
}
