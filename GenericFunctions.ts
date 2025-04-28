import { Icon, IRequestOptions, IDataObject, ILoadOptionsFunctions, IExecuteFunctions, IHookFunctions, IHttpRequestMethods, NodeApiError, JsonObject, ICredentialTestFunctions, INodeCredentialTestResult } from 'n8n-workflow';

export const CREDENTIALS_NAME = 'SwipeFlowApiKey';
export const ICON: Icon = 'file:swipeflow.svg';
export const COLOR = '#e90158';
export const DOCS_URL = 'https://swipeflow.io/docs';
export const BASE_URL = 'https://api.swipeflow.io/v1';
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
): Promise<any> {
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
): Promise<any> {
  const options: IRequestOptions = {
    headers: {
      'X-API-Key': credentials.apiKey,
    },
    method,
    body,
    qs,
    uri: uri || `${BASE_URL}${path}`,
    json: true,
  };


  try {
    if (Object.keys(body).length === 0) {
      delete options.body;
    }
    if (Object.keys(option).length !== 0) {
      Object.assign(options, option);
    }
    return await this.helpers.request.call(this, options);
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
  const response = await apiRequest.call(this, 'GET', '/projects');
  if (!response?.projects || !Array.isArray(response.projects)) return [];
  return response.projects.map((project: any) => ({
    name: project.name || project.id,
    value: project._id,
    description: project.description || undefined,
  }));
}

export async function testCredential(this: ICredentialTestFunctions, credentials: SwipeFlowCredentials): Promise<INodeCredentialTestResult> {
  const response = await apiRequestWithCredentials.call(this, credentials, 'GET', '/users/profile');
  if (!response?.email) return { status: 'Error', message: 'Failed to fetch user profile' };
  return { status: 'OK', message: 'Successfully fetched user profile' };
}
