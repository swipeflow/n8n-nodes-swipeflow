/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { DeliveryError } from './DeliveryError';
import type { WebhookDeliveryStatus } from './WebhookDeliveryStatus';
export type WebhookDelivery = {
    id?: string;
    webhookId?: string;
    /**
     * Public event id
     */
    eventId?: string;
    eventType?: string;
    status?: WebhookDeliveryStatus;
    attempts?: number;
    /**
     * The delivery this one replays, when it is a replay
     */
    replayOf?: string | null;
    lastError?: DeliveryError;
    createdAt?: string;
    finishedAt?: string | null;
};

