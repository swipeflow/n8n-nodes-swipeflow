import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  IDataObject,
  IHttpRequestMethods,
  NodeApiError,
  JsonValue,
  ILoadOptionsFunctions,
  INodePropertyOptions,
  INodeCredentialTestResult,
  ICredentialTestFunctions,
} from 'n8n-workflow';
import { ICON, DOCS_URL, CREDENTIALS_NAME, apiRequest, getProjects, testCredential } from '../../GenericFunctions';

/**
 * Helper to ensure the correct type for method property
 */
function asHttpMethod(method: string): IHttpRequestMethods | undefined {
  const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return allowed.includes(method.toUpperCase()) ? (method.toUpperCase() as IHttpRequestMethods) : undefined;
}

export class Swipeflow implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SwipeFlow',
    name: 'swipeflow',
    icon: ICON,
    documentationUrl: DOCS_URL,
    group: ['input'],
    version: 1,
    description: 'Interact with SwipeFlow API',
    defaults: {
      name: 'SwipeFlow',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: CREDENTIALS_NAME,
        required: true,
        testedBy: 'testCredential',
      },
    ],
    properties: [
      // Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Item', value: 'item', description: 'Operations on items' },
          { name: 'Project', value: 'project', description: 'Operations on projects' },
          { name: 'Other', value: 'other', description: 'Other and advanced operations' }
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
          { name: 'Create', value: 'create', description: 'Create a new item', action: 'Create a new item' },
          { name: 'Fetch Items', value: 'fetchAll', description: 'Fetch all items in a project', action: 'Fetch all items' },
          { name: 'Get Item', value: 'get', description: 'Get a single item by ID', action: 'Get item by ID' },
          { name: 'Review Item', value: 'review', description: 'Push a review decision (approve/reject/revise) on an item', action: 'Review item' },
          { name: 'Delete Item', value: 'delete', description: 'Delete an item by ID', action: 'Delete item' }
        ],
        default: 'create',
        required: true,
        displayOptions: {
          show: { resource: ['item'] }
        },
     },
      // Operation selector for Project
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Create', value: 'create', action: 'Create a new project', description: 'Create a new project' },
          { name: 'Delete', value: 'delete', action: 'Delete a project', description: 'Delete a project' },
          { name: 'Fetch', value: 'fetch', action: 'Fetch a project by ID', description: 'Fetch a project by ID' },
          { name: 'List', value: 'list', action: 'List all projects', description: 'List all projects' },
          { name: 'Update', value: 'update', action: 'Update a project', description: 'Update a project' }
        ],
        default: 'list',
        required: true,
        displayOptions: {
          show: { resource: ['project'] }
        },
     },
      // Operation selector for Other
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Generic API Call', value: 'apiRequest', action: 'Make an arbitrary api request to swipe flow', description: 'Make an arbitrary API request to SwipeFlow' }
        ],
        default: 'apiRequest',
        required: true,
        displayOptions: {
          show: { resource: ['other'] }
        },
        description: 'Other operations'
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
            operation: ['fetch', 'update', 'delete']
          },
        },
        required: true,
        default: '',
        description: 'Select a project to fetch, update, or delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
            operation: ['create', 'update']
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
            operation: ['create', 'update']
          },
        },
      },
      // Item: Project (for create, fetchAll, review)
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
            operation: ['fetchAll', 'create', 'review']
          },
        },
        required: true,
        default: '',
        description: 'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
      },
      // Item: Item ID (for get, review, delete)
      {
        displayName: 'Item ID',
        name: 'itemId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['get', 'review', 'delete']
          },
        },
        default: '',
        description: 'The unique identifier of the item.'
      },
      // Item: Decision (for review)
      {
        displayName: 'Decision',
        name: 'decision',
        type: 'options',
        required: true,
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['review']
          },
        },
        options: [
          { name: 'Approve', value: 'approved' },
          { name: 'Reject', value: 'rejected' },
          { name: 'Revise', value: 'revised' }
        ],
        default: 'approved',
        description: 'The decision to set on the item.'
      },
      // Item: Decision comment (optional)
      {
        displayName: 'Comment',
        name: 'comment',
        type: 'string',
        required: false,
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['review']
          },
        },
        default: '',
        description: 'Optional comment for the decision.'
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
            operation: ['create']
          },
        },
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        required: false,
        default: '',
        description: 'A detailed description of the item',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['create']
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
          { name: 'Text', value: 'text', description: 'Plain text content' },
          { name: 'HTML', value: 'html', description: 'HTML content' },
          { name: 'Image', value: 'image', description: 'Image URL' },
          { name: 'Video', value: 'video', description: 'Video URL' },
          { name: 'Audio', value: 'audio', description: 'Audio URL' },
        ],
        description: 'The type of content this item contains',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['create']
          },
        },
      },
      {
        displayName: 'Content',
        name: 'content',
        type: 'string',
        required: true,
        default: '',
        description: 'The main content of the item. For media types (image, video, audio), provide the URL.',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['create']
          },
        },
      },
      {
        displayName: 'Metadata (JSON)',
        name: 'metadata',
        type: 'json',
        required: false,
        default: '',
        description: 'Optional JSON metadata for the item',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['create']
          },
        },
      },
      {
        displayName: 'Expiration Date',
        name: 'expiresAt',
        type: 'dateTime',
        required: false,
        default: '',
        description: 'Optional expiration date for the item',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['create']
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
            operation: ['apiRequest']
          },
        },
        required: true,
        default: '',
        description: 'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
            operation: ['apiRequest']
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
            operation: ['apiRequest']
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
            operation: ['apiRequest']
          },
        },
        description: 'Query params as JSON',
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
      }
    },
  };

  // --- Main execute for actions ---
  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    const results = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // --- Item operations ---
        if (resource === 'item' && operation === 'create') {
          // Create Item
          const projectId = this.getNodeParameter('projectId', i) as string;
          const title = this.getNodeParameter('title', i) as string;
          const description = this.getNodeParameter('description', i, '');
          const contentType = this.getNodeParameter('contentType', i) as string;
          const content = this.getNodeParameter('content', i) as string;
          const metadata = this.getNodeParameter('metadata', i, {});
          const expiresAt = this.getNodeParameter('expiresAt', i, '');
          const response = await apiRequest.call(this, 'POST', `/projects/${projectId}/items`, {
            title,
            description,
            content: {
              type: contentType,
              data: content
            },
            metadata,
            expiresAt,
          });
          results.push({ json: response });
        }
        // Fetch Items
        else if (resource === 'item' && operation === 'fetchAll') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const response = await apiRequest.call(this, 'GET', `/projects/${projectId}/items`);
          results.push(...(Array.isArray(response) ? response.map((item: IDataObject) => ({ json: item })) : [{ json: response }]));
        }
        // Get Item
        else if (resource === 'item' && operation === 'get') {
          const itemId = this.getNodeParameter('itemId', i) as string;
          const response = await apiRequest.call(this, 'GET', `/items/${itemId}`);
          results.push({ json: response });
        }
        // Review Item
        else if (resource === 'item' && operation === 'review') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const decision = this.getNodeParameter('decision', i) as string;
          const comment = this.getNodeParameter('comment', i, '');
          const response = await apiRequest.call(this, 'POST', `/projects/${projectId}/items/${itemId}/decisions`, {
            decision,
            comment,
          });
          results.push({ json: response });
        }
        // Delete Item
        else if (resource === 'item' && operation === 'delete') {
          const itemId = this.getNodeParameter('itemId', i) as string;
          const response = await apiRequest.call(this, 'DELETE', `/items/${itemId}`);
          results.push({ json: response });
        }
        // --- Project operations ---
        else if (resource === 'project') {
          if (operation === 'list') {
            // List Projects
            const response = await apiRequest.call(this, 'GET', '/projects');
            results.push(...(Array.isArray(response) ? response.map((project: IDataObject) => ({ json: project })) : [{ json: response }]));
          } else if (operation === 'fetch') {
            // Fetch Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            const response = await apiRequest.call(this, 'GET', `/projects/${projectId}`);
            results.push({ json: response });
          } else if (operation === 'create') {
            // Create Project
            const name = this.getNodeParameter('name', i) as string;
            const description = this.getNodeParameter('description', i, '');
            const response = await apiRequest.call(this, 'POST', '/projects', {
              name,
              description,
            });
            results.push({ json: response });
          } else if (operation === 'update') {
            // Update Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            const name = this.getNodeParameter('name', i) as string;
            const description = this.getNodeParameter('description', i, '');
            const response = await apiRequest.call(this, 'PUT', `/projects/${projectId}`, {
              name,
              description,
            });
            results.push({ json: response });
          } else if (operation === 'delete') {
            // Delete Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            const response = await apiRequest.call(this, 'DELETE', `/projects/${projectId}`);
            results.push({ json: response });
          }
        }
        // --- Other: Generic API Call ---
        else if (resource === 'other' && operation === 'apiRequest') {
          const method = this.getNodeParameter('method', i) as string;
          const endpoint = this.getNodeParameter('endpoint', i) as string;
          const body = this.getNodeParameter('body', i, {});
          const query = this.getNodeParameter('query', i, {});
          const queryObj: IDataObject | undefined = (typeof query === 'object' && query !== null && !Array.isArray(query)) ? query as IDataObject : undefined;
          const response = await apiRequest.call(this, asHttpMethod(method) as IHttpRequestMethods, endpoint, body as IDataObject, queryObj);
          results.push({ json: response });
        }
      } catch (err) {
        // NodeApiError expects JsonObject, but err may not be compatible; cast to unknown then to JsonObject
        throw new NodeApiError(this.getNode(), err as unknown as { [key: string]: JsonValue });
      }
    }
    return [results];
  }
}
