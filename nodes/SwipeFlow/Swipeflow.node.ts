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
import { ICON, DOCS_URL, CREDENTIALS_NAME, getProjects, testCredential, apiRequest } from '../../GenericFunctions';

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
          { name: 'Approve', value: 'approve', description: 'Approve an item', action: 'Approve item' },
          { name: 'Create', value: 'create', action: 'Create a new item', description: 'Create a new item' },
          { name: 'Create Version', value: 'createVersion', description: 'Create a new version of an item', action: 'Create item version' },
          { name: 'Delete', value: 'delete', description: 'Delete an item by ID', action: 'Delete item' },
          { name: 'Get', value: 'get', description: 'Get a single item by ID', action: 'Get item by ID' },
          { name: 'Get Many', value: 'getAll', description: 'Get many items in a project with filtering and sorting', action: 'Get items' },
          { name: 'Reject', value: 'reject', description: 'Reject an item', action: 'Reject item' },
          { name: 'Request Changes', value: 'requestChanges', description: 'Request changes to an item with comment', action: 'Request changes' },
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
        description: 'Select a project to fetch, update, or delete. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
            operation: ['getAll', 'create']
          },
        },
        required: true,
        default: '',
        description: 'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
            operation: ['get', 'approve', 'reject', 'requestChanges', 'createVersion', 'delete']
          },
        },
        default: '',
        description: 'The unique identifier of the item'
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
            operation: ['get', 'delete', 'approve', 'reject', 'requestChanges', 'createVersion']
          },
        },
        required: true,
        default: '',
        description: 'Select the project containing this item. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      // Item: Decision comment (optional for approve/reject)
      {
        displayName: 'Comment',
        name: 'comment',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['approve', 'reject']
          },
        },
        default: '',
        description: 'Optional comment for the decision'
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
            operation: ['requestChanges']
          },
        },
        default: '',
        description: 'Required comment explaining what changes are needed'
      },
      // Item: Create Version fields
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['createVersion']
          },
        },
        default: '',
        description: 'Updated title for the item (optional)'
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['createVersion']
          },
        },
        default: '',
        description: 'Updated description for the item (optional)'
      },
      {
        displayName: 'Content Type',
        name: 'contentType',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['createVersion']
          },
        },
        options: [
          { name: 'Audio URL', value: 'audio' },
          { name: 'HTML', value: 'html' },
          { name: 'Image URL', value: 'image' },
          { name: 'Text', value: 'text' },
          { name: 'Video URL', value: 'video' }
        ],
        default: 'text',
        description: 'The type of content this item contains'
      },
      {
        displayName: 'Content',
        name: 'content',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['createVersion']
          },
        },
        default: '',
        description: 'Updated content for the item (optional)'
      },
      {
        displayName: 'Metadata',
        name: 'metadata',
        type: 'json',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['createVersion']
          },
        },
        default: '',
        description: 'Updated metadata for the item as JSON (optional)'
      },
      // Item: Include versions (optional for get operation)
      {
        displayName: 'Include All Versions',
        name: 'includeVersions',
        type: 'boolean',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['get']
          },
        },
        default: false,
        description: 'Whether to include all versions of the item in the response'
      },
      // Item: Get Items filters and options
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
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
        description: 'Filter items by status'
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
          },
        },
        default: '',
        description: 'Search items by title, description, or content'
      },
      {
        displayName: 'Sort By',
        name: 'sortBy',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
          },
        },
        options: [
          { name: 'Created At', value: 'createdAt' },
          { name: 'Updated At', value: 'updatedAt' },
          { name: 'Title', value: 'title' },
          { name: 'Status', value: 'status' }
        ],
        default: 'createdAt',
        description: 'Field to sort items by'
      },
      {
        displayName: 'Sort Order',
        name: 'sortOrder',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
          },
        },
        options: [
          { name: 'Descending (Newest First)', value: 'desc' },
          { name: 'Ascending (Oldest First)', value: 'asc' }
        ],
        default: 'desc',
        description: 'Sort order for items'
      },
      {
        displayName: 'Page',
        name: 'page',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
          },
        },
        default: 1,
        description: 'Page number for pagination'
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
            operation: ['getAll']
          },
        },
        default: 50,
        description: 'Max number of results to return'
      },
      {
        displayName: 'Include All Versions',
        name: 'includeVersions',
        type: 'boolean',
        displayOptions: {
          show: {
            resource: ['item'],
            operation: ['getAll']
          },
        },
        default: false,
        description: 'Whether to include all versions for each item in the response'
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
          { name: 'Audio', value: 'audio', description: 'Audio URL' },
          { name: 'HTML', value: 'html', description: 'HTML content' },
          { name: 'Image', value: 'image', description: 'Image URL' },
          { name: 'Text', value: 'text', description: 'Plain text content' },
          { name: 'Video', value: 'video', description: 'Video URL' }
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
        description: 'Select a project from your SwipeFlow account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		usableAsTool: true,
  };

  methods = {
    loadOptions: {
      getProjects: async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        return getProjects.call(this);
      }
    },
    credentialTest: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          
          const response = await apiRequest.call(this, 'POST', `/v1/projects/${projectId}/items`, {
            title,
            description: (description as string) || undefined,
            content: {
              type: contentType,
              data: content
            },
            metadata: metadata || undefined,
          });
          results.push({ json: response });
        }
        // Get Items
        else if (resource === 'item' && operation === 'getAll') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const status = this.getNodeParameter('status', i, '') as string;
          const search = this.getNodeParameter('search', i, '') as string;
          const sortBy = this.getNodeParameter('sortBy', i, 'createdAt') as string;
          const sortOrder = this.getNodeParameter('sortOrder', i, 'desc') as string;
          const page = this.getNodeParameter('page', i, 1) as number;
          const limit = this.getNodeParameter('limit', i, 10) as number;
          const includeVersions = this.getNodeParameter('includeVersions', i, false) as boolean;
          
          const queryParams: IDataObject = {};
          if (status) queryParams.status = status;
          if (search) queryParams.search = search;
          if (sortBy) queryParams.sortBy = sortBy;
          if (sortOrder) queryParams.sortOrder = sortOrder;
          if (page && page > 1) queryParams.page = page;
          if (limit && limit !== 10) queryParams.limit = Math.min(limit, 100);
          if (includeVersions) queryParams.includeVersions = true;
          
          const response = await apiRequest.call(this, 'GET', `/v1/projects/${projectId}/items`, {}, queryParams);
          const items = response.items || response;
          results.push(...(Array.isArray(items) ? items.map((item: IDataObject) => ({ json: item })) : [{ json: response }]));
        }
        // Get Item
        else if (resource === 'item' && operation === 'get') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const includeVersions = this.getNodeParameter('includeVersions', i, false) as boolean;
          
          const queryParams = includeVersions ? { includeVersions: true } : {};
          const response = await apiRequest.call(this, 'GET', `/v1/projects/${projectId}/items/${itemId}`, {}, queryParams);
          results.push({ json: response });
        }
        // Approve Item
        else if (resource === 'item' && operation === 'approve') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const comment = this.getNodeParameter('comment', i, '') as string;
          
          const response = await apiRequest.call(this, 'PUT', `/v1/projects/${projectId}/items/${itemId}/decision`, {
            decision: 'approved',
            comment: (comment as string) || undefined,
          });
          results.push({ json: response });
        }
        // Reject Item
        else if (resource === 'item' && operation === 'reject') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const comment = this.getNodeParameter('comment', i, '') as string;
          
          const response = await apiRequest.call(this, 'PUT', `/v1/projects/${projectId}/items/${itemId}/decision`, {
            decision: 'rejected',
            comment: (comment as string) || undefined,
          });
          results.push({ json: response });
        }
        // Request Changes
        else if (resource === 'item' && operation === 'requestChanges') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const comment = this.getNodeParameter('comment', i) as string;
          
          const response = await apiRequest.call(this, 'PUT', `/v1/projects/${projectId}/items/${itemId}/decision`, {
            decision: 'change_requested',
            comment: comment as string,
          });
          results.push({ json: response });
        }
        // Create Item Version
        else if (resource === 'item' && operation === 'createVersion') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          const title = this.getNodeParameter('title', i, '') as string;
          const description = this.getNodeParameter('description', i, '') as string;
          const contentType = this.getNodeParameter('contentType', i, '') as string;
          const content = this.getNodeParameter('content', i, '') as string;
          const metadata = this.getNodeParameter('metadata', i, {}) as Record<string, unknown>;
          
          const versionData: IDataObject = {};
          if (title) versionData.title = title;
          if (description) versionData.description = description;
          if (contentType && content) {
            versionData.content = {
              type: contentType,
              data: content
            };
          }
          if (metadata && Object.keys(metadata).length > 0) {
            versionData.metadata = metadata;
          }
          
          const response = await apiRequest.call(this, 'POST', `/v1/projects/${projectId}/items/${itemId}/versions`, versionData);
          results.push({ json: response });
        }
        // Delete Item
        else if (resource === 'item' && operation === 'delete') {
          const projectId = this.getNodeParameter('projectId', i) as string;
          const itemId = this.getNodeParameter('itemId', i) as string;
          await apiRequest.call(this, 'DELETE', `/v1/projects/${projectId}/items/${itemId}`);
          results.push({ json: { success: true, itemId, projectId } });
        }
        // --- Project operations ---
        else if (resource === 'project') {
          if (operation === 'list') {
            // List Projects
            const response = await apiRequest.call(this, 'GET', '/v1/projects');
            const projects = response.projects || response;
            results.push(...(Array.isArray(projects) ? projects.map((project: IDataObject) => ({ json: project })) : [{ json: response }]));
          } else if (operation === 'fetch') {
            // Fetch Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            const response = await apiRequest.call(this, 'GET', `/v1/projects/${projectId}`);
            results.push({ json: response });
          } else if (operation === 'create') {
            // Create Project
            const name = this.getNodeParameter('name', i) as string;
            const description = this.getNodeParameter('description', i, '');
            
            const response = await apiRequest.call(this, 'POST', '/v1/projects', {
              name,
              description: description as string,
            });
            results.push({ json: response });
          } else if (operation === 'update') {
            // Update Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            const name = this.getNodeParameter('name', i) as string;
            const description = this.getNodeParameter('description', i, '');
            
            const response = await apiRequest.call(this, 'PUT', `/v1/projects/${projectId}`, {
              name,
              description: (description as string) || undefined,
            });
            results.push({ json: response });
          } else if (operation === 'delete') {
            // Delete Project
            const projectId = this.getNodeParameter('projectId', i) as string;
            await apiRequest.call(this, 'DELETE', `/v1/projects/${projectId}`);
            results.push({ json: { success: true, projectId } });
          }
        }
        // --- Other: Generic API Call ---
        else if (resource === 'other' && operation === 'apiRequest') {
          const method = this.getNodeParameter('method', i) as string;
          const endpoint = this.getNodeParameter('endpoint', i) as string;
          const body = this.getNodeParameter('body', i, {});
          const query = this.getNodeParameter('query', i, {});
          const queryObj: IDataObject | undefined = (typeof query === 'object' && query !== null && !Array.isArray(query)) ? query as IDataObject : undefined;
          
          // For generic API calls, use the original apiRequest function
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
