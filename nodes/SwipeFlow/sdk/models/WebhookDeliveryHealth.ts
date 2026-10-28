/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { DeliveryError } from './DeliveryError';
/**
 * System-owned delivery health, separate from the user-set `active` toggle.
 */
export type WebhookDeliveryHealth = {
    /**
     * false means deliveries are suspended (sustained failure rate); reactivate to resume
     */
    active?: boolean;
    suspendedAt?: string | null;
    reason?: string | null;
    lastError?: DeliveryError;
};

