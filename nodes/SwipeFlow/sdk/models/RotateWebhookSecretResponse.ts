/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { Webhook } from './Webhook';
export type RotateWebhookSecretResponse = (Webhook & {
    /**
     * The new secret, shown once. It is never returned again by any other endpoint.
     */
    secret?: string;
});

