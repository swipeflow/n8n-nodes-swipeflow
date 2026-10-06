/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
     * Whether the webhook is active
     */
    active?: boolean;
    /**
     * Number of times webhook has been triggered
     */
    triggerCount?: number;
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

