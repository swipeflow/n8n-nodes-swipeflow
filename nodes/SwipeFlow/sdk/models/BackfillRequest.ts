/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
export type BackfillRequest = {
    /**
     * Public event id to backfill strictly after (exclusive). Typically the webhook's reconciliation cursor.
     */
    after?: string;
    /**
     * Backfill events created at or after this time. Ignored when `after` is given.
     */
    since?: string;
};

