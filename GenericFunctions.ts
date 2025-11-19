import { Icon, IHttpRequestOptions, IDataObject, ILoadOptionsFunctions, IExecuteFunctions, IHookFunctions, IHttpRequestMethods, NodeApiError, JsonObject, ICredentialTestFunctions, INodeCredentialTestResult } from 'n8n-workflow';

export const CREDENTIALS_NAME = 'SwipeFlowApiKey';
export const ICON: Icon = 'file:swipeflow.svg';
export const COLOR = '#e90158';
export const DOCS_URL = 'https://swipeflow.io/docs';
export const BASE_URL = 'https://api.swipeflow.io';
export const WEBHOOK_TYPE = 'dynamic';
export const WEBHOOK_INTEGRATION_PROVIDER = 'n8n';

type SwipeFlowCredentials = IDataObject;

export async function apiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
  method: IHttpRequestMethods,
  path: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  uri?: string,
  option = {},
): Promise<IDataObject> {
  const credentials = await this.getCredentials(CREDENTIALS_NAME) as IDataObject;
  return apiRequestWithCredentials.call(this, credentials, method, path, body, qs, uri, option);
}

export async function apiRequestWithCredentials(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | ICredentialTestFunctions,
  credentials: SwipeFlowCredentials,
  method: IHttpRequestMethods,
  path: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  uri?: string,
  option = {},
): Promise<IDataObject> {
  const options: IHttpRequestOptions = {
    headers: {
      'X-API-Key': credentials.apiKey,
    },
    method,
    body,
    qs,
    url: uri || `${BASE_URL}${path}`,
    json: true,
  };


  try {
    if (Object.keys(body).length === 0) {
      delete options.body;
    }
    if (Object.keys(option).length !== 0) {
      Object.assign(options, option);
    }
    // Use httpRequest for better authentication support
    if ('httpRequest' in this.helpers) {
      return await this.helpers.httpRequest(options) as IDataObject;
    }
    // Fallback to request for older n8n versions or contexts where httpRequest is not available
    // eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
    return await this.helpers.request(options) as IDataObject;
  } catch (error) {
    if ('getNode' in this && typeof this.getNode === 'function') {
      throw new NodeApiError(this.getNode(), error as JsonObject);
    } else {
      // Fallback for credential tests
      throw error;
    }
  }
}

export async function getProjects(this: ILoadOptionsFunctions) {
  const response = await apiRequest.call(this, 'GET', '/v1/projects', {}, { page: 1, limit: 100 });
  
  if (!response?.projects || !Array.isArray(response.projects)) return [];
  return (response.projects as IDataObject[]).map((project) => ({
    name: String(project.name || project.id || 'Unnamed Project'),
    value: String(project.id),
    description: String(project.description || ''),
  }));
}

export async function testCredential(this: ICredentialTestFunctions, credentials: SwipeFlowCredentials): Promise<INodeCredentialTestResult> {
  try {
    await apiRequestWithCredentials.call(this, credentials, 'GET', '/v1/projects', {}, { page: 1, limit: 1 });
    return {
      status: 'OK',
      message: 'Authentication successful',
    };
  } catch (error) {
    return {
      status: 'Error',
      message: `Authentication failed: ${(error as Error).message}`,
    };
  }
}

// Helper to make typed API calls - returns the helper functions bound to credentials
export async function getApiHelpers(
  this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
  credentials?: SwipeFlowCredentials,
) {
  const creds = credentials || await this.getCredentials(CREDENTIALS_NAME) as SwipeFlowCredentials;
  
  return {
    request: (method: IHttpRequestMethods, path: string, body: IDataObject = {}, qs: IDataObject = {}) => 
      apiRequestWithCredentials.call(this, creds, method, path, body, qs),
  };
}
