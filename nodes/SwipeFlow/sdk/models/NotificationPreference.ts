/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { DeliveryMethod } from './DeliveryMethod';
import type { NotificationType } from './NotificationType';
export type NotificationPreference = {
    type?: NotificationType;
    /**
     * Delivery methods
     */
    methods?: Array<DeliveryMethod>;
    /**
     * Whether notification is enabled
     */
    enabled?: boolean;
};

