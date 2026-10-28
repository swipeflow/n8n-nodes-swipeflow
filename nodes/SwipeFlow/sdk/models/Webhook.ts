/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WebhookDeliveryHealth } from './WebhookDeliveryHealth';
import type { WebhookEvent } from './WebhookEvent';
export type Webhook = {
    /**
     * Webhook ID
     */
    id?: string;
    /**
     * Project ID
     */
    projectId?: string;
    /**
     * Webhook name
     */
    name?: string;
    /**
     * Webhook URL
     */
    url?: string;
    /**
     * Webhook type
     */
    type?: Webhook.type;
    /**
     * Integration provider name
     */
    integrationProvider?: string;
    /**
     * Link to integration setup
     */
    integrationLink?: string;
    /**
     * Events that trigger this webhook
     */
    events?: Array<WebhookEvent>;
    /**
     * When set, the webhook stops receiving deliveries at this instant and is deleted shortly after. Absent for webhooks that never expire.
     */
    expiresAt?: string | null;
    /**
     * Whether the webhook is active
     */
    active?: boolean;
    /**
     * Number of times webhook has been triggered
     */
    triggerCount?: number;
    deliveryStatus?: WebhookDeliveryHealth;
    /**
     * Creation timestamp
     */
    createdAt?: string;
    /**
     * Last update timestamp
     */
    updatedAt?: string;
};
export namespace Webhook {
    /**
     * Webhook type
     */
    export enum type {
        USER = 'user',
        DYNAMIC = 'dynamic',
    }
}

