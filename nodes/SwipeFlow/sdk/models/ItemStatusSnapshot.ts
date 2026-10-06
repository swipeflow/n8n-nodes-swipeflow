/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { ItemDecision } from './ItemDecision';
import type { ItemStatus } from './ItemStatus';
/**
 * Slim status projection of an item — status, version, and the latest decision only, without content or metadata. The cheap alternative to fetching the full item when polling.
 */
export type ItemStatusSnapshot = {
    /**
     * Item ID
     */
    id?: string;
    status?: ItemStatus;
    /**
     * Version number
     */
    version?: number;
    /**
     * The most recent decision, or null if none has been made yet
     */
    decision?: ItemDecision | null;
};

