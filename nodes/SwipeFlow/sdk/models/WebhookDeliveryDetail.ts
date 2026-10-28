/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WebhookDelivery } from './WebhookDelivery';
import type { WebhookDeliveryAttempt } from './WebhookDeliveryAttempt';
export type WebhookDeliveryDetail = (WebhookDelivery & {
    attemptsList?: Array<WebhookDeliveryAttempt>;
    /**
     * The source event's data — the request body this delivery sends
     */
    payload?: any;
});

