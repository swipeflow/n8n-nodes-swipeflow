/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { APIKeyPermissions } from './APIKeyPermissions';
export type CreateAPIKey = {
    /**
     * API key ID
     */
    id?: string;
    /**
     * The generated API key (only shown once)
     */
    key?: string;
    /**
     * API key name
     */
    name?: string;
    permissions?: APIKeyPermissions;
    /**
     * Creation timestamp
     */
    createdAt?: string;
};

