import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import {
	CREDENTIALS_NAME,
	DEFAULT_BASE_URL,
	DOCS_URL,
	ICON,
} from '../nodes/SwipeFlow/shared/constants';

export class SwipeFlowApi implements ICredentialType {
	// Renaming this would orphan every credential already saved by existing users.
	name = CREDENTIALS_NAME;

	displayName = 'SwipeFlow API';

	icon = ICON;

	documentationUrl = DOCS_URL;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create one in SwipeFlow under Settings → API Keys',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: DEFAULT_BASE_URL,
			description: 'Only change this for a staging or self-hosted SwipeFlow deployment',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { 'X-API-Key': '={{$credentials.apiKey}}' },
		},
	};

	test: ICredentialTestRequest = {
		request: {
			// Credentials saved before baseUrl existed have no value for it.
			baseURL: `={{$credentials.baseUrl || "${DEFAULT_BASE_URL}"}}`,
			url: '/v1/projects',
			qs: { limit: 1 },
		},
	};
}
