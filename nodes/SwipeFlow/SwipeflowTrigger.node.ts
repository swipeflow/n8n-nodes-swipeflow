import {
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  IHookFunctions,
  IDataObject,
  ICredentialTestFunctions,
  INodeCredentialTestResult,
  NodeOperationError,
} from 'n8n-workflow';
import { ICON, DOCS_URL, CREDENTIALS_NAME, apiRequest, getProjects, WEBHOOK_INTEGRATION_PROVIDER, WEBHOOK_TYPE, testCredential } from '../../GenericFunctions';

export class SwipeflowTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SwipeFlow Trigger',
    name: 'swipeflowTrigger',
    icon: ICON,
    documentationUrl: DOCS_URL,
    group: ['trigger'],
    version: 1,
    description: 'Listen for events in SwipeFlow',
    subtitle: '={{$parameter["events"]}}',
    defaults: {
      name: 'SwipeFlow Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: CREDENTIALS_NAME,
        required: true,
        testedBy: 'testCredential',
      },
    ],
    properties: [
      {
        displayName: 'Project Name or ID',
        name: 'projectId',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getProjects',
        },
        required: true,
        default: '',
        description: 'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
      },
      {
        displayName: 'Events',
        name: 'events',
        type: 'multiOptions',
        options: [
          { name: 'Item Approved', value: 'item.approved' },
          { name: 'Item Created', value: 'item.created' },
          { name: 'Item Deleted', value: 'item.deleted' },
          { name: 'Item Rejected', value: 'item.rejected' },
          { name: 'Item Updated', value: 'item.updated' },
        ],
        default: ['item.approved', 'item.rejected'],
        description: 'Which item events to listen for',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'swipeflow',
      },
    ],
  };

  methods = {
    loadOptions: {
      getProjects: async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        return getProjects.call(this);
      }
    },
    credentialTest: {
      testCredential: async function (this: ICredentialTestFunctions, credential: any): Promise<INodeCredentialTestResult> {
        return testCredential.call(this, credential);
      },
    },
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const webhookData = this.getWorkflowStaticData('node');
        const events = this.getNodeParameter('events') as string[];
        // Check all the webhooks which exist already if it is identical to the
        // one that is supposed to get created.
        const projectId = this.getNodeParameter('projectId') as string;
        const webhooks = await apiRequest.call(this, 'GET', `/projects/${projectId}/webhooks`);
        this.logger.debug(`Fetched webhooks for project ${projectId}: ${JSON.stringify(webhooks)}`);
        for (const webhook of webhooks) {
          const sameEvents = webhook.events.length === events.length && webhook.events.every((event: string) => events.includes(event));
          // Identical webhook already exists
          if (webhook.type === WEBHOOK_TYPE && webhook.integrationProvider === WEBHOOK_INTEGRATION_PROVIDER && webhook.url === webhookUrl && sameEvents) {
            webhookData.webhookId = webhook._id as string;
            webhookData.projectId = projectId;
            return true;
          }
        }

        return false;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');
        const projectId = this.getNodeParameter('projectId') as string;
        const events = this.getNodeParameter('events') as string[];
        const url = this.getNodeWebhookUrl('default');

        this.logger.debug(`Registering webhook for project ${projectId} with events ${events}, url ${url}`);

        // Register new webhook
        const instanceBaseUrl = this.getInstanceBaseUrl().replace(/\/+$/, '');
        const response = await apiRequest.call(this, 'POST', `/projects/${projectId}/webhooks`, {
          url,
          name: this.getWorkflow().name || 'Project Webhook',
          events,
          type: WEBHOOK_TYPE,
          integrationProvider: WEBHOOK_INTEGRATION_PROVIDER,
          integrationLink: `${instanceBaseUrl}/workflow/${this.getWorkflow().id}`,
        });
        this.logger.debug(`Webhook registered with response: ${JSON.stringify(response)}`);

        webhookData.webhookId = response._id as string;
        webhookData.projectId = projectId;
        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');
        const webhookId = webhookData.webhookId as string;
        const projectId = webhookData.projectId as string;
        this.logger.debug(`Deleting webhook for project ${projectId} with webhookId ${webhookId}`);
        if (!webhookId) return true;
        const response = await apiRequest.call(this, 'DELETE', `/projects/${projectId}/webhooks/${webhookId}`);
        this.logger.debug(`Webhook deleted with response: ${JSON.stringify(response)}`);
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    // Handle incoming webhook event
    const body = this.getBodyData();
    // Validate the incoming webhook payload
    if (!body || typeof body !== 'object') {
      throw new NodeOperationError(this.getNode(), 'Invalid webhook payload');
    }

    // Extract relevant information from the webhook payload
    this.logger.debug(`Received webhook payload: ${JSON.stringify(body)}`);
    const { event, data } = body;
    const item = (data as IDataObject).item as IDataObject;

    if (!event || !item) {
      throw new NodeOperationError(this.getNode(), 'Missing event or item data in webhook payload');
    }

    // Log the received event for debugging
    this.logger.debug(`Received webhook event: ${event}`);

    // --- Ensure metadata is an object ---
    if (item.metadata && typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata);
      } catch (e) {
        // Optionally log or throw if parsing fails
        this.logger.warn('Failed to parse metadata as JSON');
      }
    }

    // Process the webhook based on the event type
    switch (event) {
      case 'item.created':
      case 'item.updated':
      case 'item.deleted':
      case 'item.approved':
      case 'item.rejected':
        // Return the processed data
        return {
          workflowData: [
            [
              {
                json: {
                  event,
                  item,
                },
              },
            ],
          ],
        };
      default:
        throw new NodeOperationError(this.getNode(), `Unsupported event type: ${event}`);
    }
  }
}
