/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeliveryMethod } from './DeliveryMethod';
import type { NotificationType } from './NotificationType';
export type Notification = {
    /**
     * Notification ID
     */
    id?: string;
    /**
     * User ID
     */
    userId?: string;
    type?: NotificationType;
    /**
     * Notification title
     */
    title?: string;
    /**
     * Notification body
     */
    body?: string;
    /**
     * Additional notification data
     */
    data?: Record<string, any>;
    /**
     * Whether notification has been read
     */
    read?: boolean;
    /**
     * When notification was read
     */
    readAt?: string;
    /**
     * Delivery methods used
     */
    deliveredVia?: Array<DeliveryMethod>;
    /**
     * Creation timestamp
     */
    createdAt?: string;
};

