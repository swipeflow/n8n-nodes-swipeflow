/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WebhookLog = {
    /**
     * Log ID
     */
    id?: string;
    /**
     * Webhook ID
     */
    webhookId?: string;
    /**
     * Event that triggered the webhook
     */
    event?: string;
    /**
     * Payload sent to webhook
     */
    payload?: Record<string, any>;
    /**
     * HTTP response status code
     */
    responseStatus?: number;
    /**
     * Response body from webhook endpoint
     */
    responseBody?: string;
    /**
     * Error message if delivery failed
     */
    error?: string;
    /**
     * Delivery timestamp
     */
    timestamp?: string;
    /**
     * Request latency in milliseconds
     */
    latency?: number;
};

