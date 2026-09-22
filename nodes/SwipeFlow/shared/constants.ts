import type { Icon } from 'n8n-workflow';
import { WebhookEvent } from '../sdk';

export const CREDENTIALS_NAME = 'SwipeFlowApiKey';
export const ICON: Icon = 'file:swipeflow.svg';
export const DOCS_URL = 'https://swipeflow.io/docs';
export const DEFAULT_BASE_URL = 'https://api.swipeflow.io';

export const WEBHOOK_TYPE = 'dynamic';
export const WEBHOOK_INTEGRATION_PROVIDER = 'n8n';

export const DECISION_EVENTS = [
	WebhookEvent.ITEM_APPROVED,
	WebhookEvent.ITEM_REJECTED,
	WebhookEvent.ITEM_CHANGE_REQUESTED,
];

export const MAX_PAGE_SIZE = 100;
