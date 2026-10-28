/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
export type WebhookCursor = {
    /**
     * Public event id watermark - everything at or before it is settled for this webhook. Null when nothing is safe to advance to yet.
     */
    cursor?: string | null;
};

