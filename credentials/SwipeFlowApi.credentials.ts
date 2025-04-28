import { ICredentialType, INodeProperties } from 'n8n-workflow';
import { ICON, DOCS_URL, CREDENTIALS_NAME } from '../GenericFunctions';

export class SwipeFlowApi implements ICredentialType {
  name = CREDENTIALS_NAME;
  displayName = 'SwipeFlow API Key API';
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
      description: 'Your SwipeFlow API Key',
    }
  ];
}
