/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { WebhookEvent } from './WebhookEvent';
export type CreateWebhookRequest = {
    /**
     * Webhook name
     */
    name?: string;
    /**
     * Webhook URL
     */
    url: string;
    /**
     * Events to trigger the webhook
     */
    events: Array<WebhookEvent>;
    /**
     * Secret for webhook signature
     */
    secret?: string;
};

