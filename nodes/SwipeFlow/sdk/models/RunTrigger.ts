/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RunTrigger = {
    /**
     * Result message
     */
    message?: string;
    trigger?: {
        /**
         * Trigger identifier
         */
        id?: string;
        /**
         * Trigger name
         */
        name?: string;
        /**
         * Event dispatched to the webhook
         */
        event?: string;
    };
    /**
     * Payload delivered to the webhook
     */
    payload?: Record<string, any>;
    /**
     * Trigger execution timestamp
     */
    executedAt?: string;
};

