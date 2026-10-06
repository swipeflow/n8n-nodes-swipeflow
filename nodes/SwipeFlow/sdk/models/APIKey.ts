/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { APIKeyPermissions } from './APIKeyPermissions';
export type APIKey = {
    /**
     * API key ID
     */
    id?: string;
    /**
     * API key name
     */
    name?: string;
    /**
     * Masked API key (only first and last 3 characters visible)
     */
    maskedKey?: string;
    permissions?: APIKeyPermissions;
    /**
     * Last usage timestamp
     */
    lastUsed?: string;
    /**
     * Creation timestamp
     */
    createdAt?: string;
};

