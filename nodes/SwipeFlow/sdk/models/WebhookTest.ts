/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WebhookTest = {
    id?: string;
    status?: WebhookTest.status;
    /**
     * HTTP response status code, when the request reached the receiver
     */
    statusCode?: number | null;
    latencyMs?: number | null;
    error?: string | null;
    responseSnippet?: string | null;
    completedAt?: string | null;
};
export namespace WebhookTest {
    export enum status {
        QUEUED = 'queued',
        SUCCEEDED = 'succeeded',
        FAILED = 'failed',
    }
}

