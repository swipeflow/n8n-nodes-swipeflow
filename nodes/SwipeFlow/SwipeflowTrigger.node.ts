import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { V1, V2 } from './descriptions/common';
import { WEBHOOK_EVENT_OPTIONS } from './descriptions/webhook';
import { getProjects, searchProjects } from './methods';
import type { WebhookEvent } from './sdk';
import {
	CREDENTIALS_NAME,
	DOCS_URL,
	ICON,
	WEBHOOK_INTEGRATION_PROVIDER,
	WEBHOOK_TYPE,
} from './shared/constants';
import { normalizeEvent, type WebhookEnvelope } from './shared/events';
import {
	EVENT_HEADER,
	SIGNATURE_HEADER,
	TIMESTAMP_HEADER,
	generateSecret,
	verifySignature,
} from './shared/signature';
import { createClient } from './shared/transport';

const projectIdOf = (ctx: IHookFunctions | IWebhookFunctions) =>
	ctx.getNodeParameter('projectId', '', { extractValue: true }) as string;
const eventsOf = (ctx: IHookFunctions | IWebhookFunctions) =>
	ctx.getNodeParameter('events') as WebhookEvent[];
const managesSecret = (ctx: IHookFunctions) => ctx.getNode().typeVersion >= 2;

function sameEvents(a: string[] = [], b: string[]): boolean {
	return a.length === b.length && a.every((event) => b.includes(event));
}

export class SwipeflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SwipeFlow Trigger',
		name: 'swipeflowTrigger',
		icon: ICON,
		documentationUrl: DOCS_URL,
		group: ['trigger'],
		version: [1, 2],
		defaultVersion: 2,
		description: 'Starts the workflow when something happens in a SwipeFlow project',
		subtitle: '={{$parameter["events"]}}',
		defaults: { name: 'SwipeFlow Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIALS_NAME, required: true }],
		webhooks: [
			{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'swipeflow' },
		],
		properties: [
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: V1 },
			},
			{
				displayName: 'Project',
				name: 'projectId',
				type: 'resourceLocator',
				required: true,
				default: { mode: 'list', value: '' },
				description: 'The project to listen to',
				displayOptions: { show: V2 },
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
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['item.approved', 'item.rejected'],
				options: WEBHOOK_EVENT_OPTIONS,
				description: 'Which events to listen for',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: V2 },
				options: [
					{
						displayName: 'Verify Signature',
						name: 'verifySignature',
						type: 'boolean',
						default: true,
						description:
							'Whether to reject deliveries that are not signed by SwipeFlow with this webhook’s secret',
					},
				],
			},
		],
	};

	methods = {
		listSearch: { searchProjects },
		loadOptions: { getProjects },
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default');
				const staticData = this.getWorkflowStaticData('node');
				const projectId = projectIdOf(this);
				const events = eventsOf(this);
				const client = createClient(this);

				// Inactive ones are included so a deactivated webhook is revived instead of duplicated.
				const webhooks = await client.webhooks.list(projectId, {
					type: WEBHOOK_TYPE,
					includeInactive: true,
				});
				const existing = webhooks.find(
					(webhook) =>
						webhook.integrationProvider === WEBHOOK_INTEGRATION_PROVIDER && webhook.url === url,
				);
				if (!existing?.id) return false;

				staticData.webhookId = existing.id;
				staticData.projectId = projectId;

				// Without the secret we cannot verify deliveries, so replace the one SwipeFlow generated.
				const secret = managesSecret(this)
					? ((staticData.secret as string | undefined) ?? generateSecret())
					: undefined;
				const needsUpdate =
					!existing.active ||
					!sameEvents(existing.events, events) ||
					(secret !== undefined && secret !== staticData.secret);

				if (needsUpdate) {
					await client.webhooks.update(projectId, existing.id, {
						events,
						active: true,
						...(secret && { secret }),
					});
					if (secret) staticData.secret = secret;
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const projectId = projectIdOf(this);
				const secret = managesSecret(this) ? generateSecret() : undefined;
				const workflow = this.getWorkflow();

				const webhook = await createClient(this).webhooks.create(projectId, {
					name: workflow.name || 'n8n workflow',
					url: this.getNodeWebhookUrl('default') as string,
					events: eventsOf(this),
					type: WEBHOOK_TYPE,
					integrationProvider: WEBHOOK_INTEGRATION_PROVIDER,
					integrationLink: `${this.getInstanceBaseUrl().replace(/\/+$/, '')}/workflow/${workflow.id}`,
					...(secret && { secret }),
				});

				staticData.webhookId = webhook.id;
				staticData.projectId = projectId;
				if (secret) staticData.secret = secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const { webhookId, projectId } = staticData as { webhookId?: string; projectId?: string };

				if (webhookId && projectId) {
					try {
						await createClient(this).webhooks.delete(projectId, webhookId);
					} catch (error) {
						// Already gone, e.g. deleted from the SwipeFlow side.
						if (!(error instanceof NodeApiError && String(error.httpCode) === '404'))
							throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				delete staticData.webhookId;
				delete staticData.projectId;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = this.getResponseObject();
		const staticData = this.getWorkflowStaticData('node');
		const verify =
			this.getNode().typeVersion >= 2 &&
			(this.getNodeParameter('options.verifySignature', true) as boolean);

		if (verify && typeof staticData.secret === 'string') {
			const headers = this.getHeaderData();
			const req = this.getRequestObject();
			const check = verifySignature({
				secret: staticData.secret,
				rawBody: req.rawBody ?? JSON.stringify(req.body),
				signature: headers[SIGNATURE_HEADER] as string | undefined,
				timestamp: headers[TIMESTAMP_HEADER] as string | undefined,
				event: headers[EVENT_HEADER] as string | undefined,
			});
			if (!check.valid) {
				this.logger.warn(`Rejected a SwipeFlow delivery: ${check.reason}`);
				res.status(401).json({ error: check.reason });
				return { noWebhookResponse: true };
			}
		}

		const envelope = this.getBodyData() as WebhookEnvelope;
		const output = normalizeEvent(envelope);
		if (!output) {
			throw new NodeOperationError(this.getNode(), 'The request is not a SwipeFlow event', {
				description: 'It has no event name or data',
			});
		}

		const subscribed = eventsOf(this) as string[];
		if (envelope.event !== 'test' && !subscribed.includes(envelope.event as string)) {
			res.status(200).json({ ignored: true });
			return { noWebhookResponse: true };
		}

		return { workflowData: [[{ json: output as IDataObject }]] };
	}
}
