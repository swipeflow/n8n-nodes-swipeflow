/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
export type WebhookDeliveryAttempt = {
    id?: string;
    /**
     * Attempt number, 1-based
     */
    'n'?: number;
    at?: string;
    latencyMs?: number | null;
    /**
     * HTTP response status code, when the request reached the receiver
     */
    status?: number | null;
    success?: boolean;
    category?: string | null;
    error?: string | null;
    responseSnippet?: string | null;
};

