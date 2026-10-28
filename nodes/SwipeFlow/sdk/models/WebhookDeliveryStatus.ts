/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/**
 * Lifecycle state of one delivery. `held` = suspended mid-flight, resumable via reactivate. `cancelled` = permanent (webhook disabled or the source event expired). `dead` = retries exhausted, abandoned.
 */
export enum WebhookDeliveryStatus {
    QUEUED = 'queued',
    RUNNING = 'running',
    RETRYING = 'retrying',
    SUCCEEDED = 'succeeded',
    DEAD = 'dead',
    HELD = 'held',
    GONE = 'gone',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
}
