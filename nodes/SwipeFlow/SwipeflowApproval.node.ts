import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { buildCreateRequest } from './actions/item';
import { projectIdOf } from './actions/params';
import { createAdditionalOptions } from './descriptions/item';
import {
	CONTENT_HINT,
	CONTENT_TYPE_OPTIONS,
	deliveryProperties,
	projectSelector,
	waitLimitProperties,
} from './descriptions/common';
import { CREDENTIALS_NAME, DOCS_URL, ICON } from './shared/constants';
import { createClient } from './shared/transport';
import { buildOutcome, outcomeFromStatus } from './wait/outcome';
import { configurePollingLimit, configureWaitTill } from './wait/limit';
import { pollUntilDecided } from './wait/poll';
import { APPROVAL_OUTPUT_NAMES, routeToOutput } from './wait/route';
import { handleResume, type ResumeRouter } from './wait/resume';
import { registerWait } from './wait/start';

/**
 * As an AI tool the node returns the decision on one output, since the agent reads its first
 * output only. In a workflow the decision goes down its own branch.
 */
function routerFor(nodeType: string): ResumeRouter {
	const asTool = nodeType.endsWith('Tool');
	return (outcome, json) => (asTool ? [[{ json }]] : routeToOutput(outcome, json));
}

/**
 * A human approval step for workflows and AI agents. Each run creates a SwipeFlow item and
 * leaves through the output for the reviewer's decision, and through Always.
 *
 * The time limit (Limit Wait Time) applies in both delivery modes. When it passes with no
 * decision the run takes Timed out: webhook mode relies on n8n's timer, and polling mode checks
 * SwipeFlow until the limit.
 */
export class SwipeflowApproval implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SwipeFlow Approval',
		name: 'swipeflowApproval',
		icon: ICON,
		documentationUrl: DOCS_URL,
		group: ['input'],
		version: 1,
		subtitle: '={{ "Human approval" }}',
		description:
			'Wait for a SwipeFlow decision and route to Approved, Rejected, Change requested or Timed out',
		defaults: { name: 'SwipeFlow Approval' },
		codex: {
			categories: ['HITL'],
			subcategories: { HITL: ['Human in the Loop'] },
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: APPROVAL_OUTPUT_NAMES.map(() => NodeConnectionTypes.Main),
		outputNames: APPROVAL_OUTPUT_NAMES,
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
			projectSelector('The project the approval request is created in'),
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				description: 'What the reviewer sees first',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Context for the reviewer',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				required: true,
				default: 'text',
				options: CONTENT_TYPE_OPTIONS,
				description: 'How the reviewer should render the content',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				description: CONTENT_HINT,
			},
			...deliveryProperties({}),
			...waitLimitProperties({}),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: createAdditionalOptions,
			},
		],
	};

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
		const route = routerFor(this.getNode().type);
		const polling = this.getNodeParameter('deliveryMode', 0, 'webhook') === 'polling';
		const waitTill = polling ? configurePollingLimit(this) : configureWaitTill(this);
		const client = createClient(this);
		const projectId = projectIdOf(this, 0);

		const runIndex = this.evaluateExpression('{{ $runIndex }}', 0) as number;
		const idempotencyKey = `n8n:${this.getExecutionId()}:${this.getNode().id}:${runIndex}`;
		const itemId = (
			await client.items.create(projectId, buildCreateRequest(this, 0, idempotencyKey))
		).id as string;

		if (polling) {
			const intervalMinutes = this.getNodeParameter('pollingIntervalMinutes', 0, 5) as number;
			const decided = await pollUntilDecided(client, projectId, itemId, {
				intervalMs: intervalMinutes * 60_000,
				timeoutMs: Math.max(waitTill.getTime() - Date.now(), 0),
			});
			if (!decided) {
				const timeout = buildOutcome({ outcome: 'timed_out', projectId, itemId });
				return route('timed_out', { ...timeout, timeoutSource: 'n8n' });
			}
			return route(
				decided.outcome,
				buildOutcome({
					outcome: decided.outcome,
					projectId,
					itemId,
					item: decided.item as IDataObject,
				}),
			);
		}

		const { webhookId } = await registerWait(this, client, projectId, itemId, waitTill);
		const item = await client.items.get(projectId, itemId);
		const outcome = outcomeFromStatus(item.status);
		if (outcome) {
			if (webhookId) await client.webhooks.delete(projectId, webhookId);
			return route(
				outcome,
				buildOutcome({ outcome, projectId, itemId, item: item as IDataObject }),
			);
		}

		// When the limit passes, n8n resumes with the input on output 0, which is Timed out.
		await this.putExecutionToWait(waitTill);
		return APPROVAL_OUTPUT_NAMES.map(() => []);
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return handleResume(this, routerFor(this.getNode().type));
	}
}
