/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
export type RotateWebhookSecretRequest = {
    /**
     * Custom secret to rotate in. A cryptographically random one is generated when omitted.
     */
    secret?: string;
    /**
     * How long the previous secret keeps signing alongside the new one (as `X-Swipeflow-Signature-Previous`). 0 rotates immediately with no grace window.
     */
    gracePeriodSeconds?: number;
};

