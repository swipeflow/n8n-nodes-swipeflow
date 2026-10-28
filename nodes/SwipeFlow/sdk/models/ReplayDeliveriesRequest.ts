/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { WebhookDeliveryStatus } from './WebhookDeliveryStatus';
export type ReplayDeliveriesRequest = {
    status?: WebhookDeliveryStatus;
    /**
     * Only replay deliveries created at or after this time
     */
    since?: string;
};

