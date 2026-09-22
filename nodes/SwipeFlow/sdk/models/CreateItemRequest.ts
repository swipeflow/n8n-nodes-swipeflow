/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ItemContent } from './ItemContent';
export type CreateItemRequest = {
    /**
     * Item title
     */
    title: string;
    /**
     * Item description
     */
    description?: string;
    content?: ItemContent;
    /**
     * Media ids to attach (from `POST .../media-uploads/:id/confirm`). Not inferred from `content` — any ref actually embedded in `content.data` is included automatically regardless of this field, but an attachment that isn't embedded inline only exists because it's listed here.
     *
     */
    media?: Array<string>;
    /**
     * Custom metadata
     */
    metadata?: Record<string, any>;
    /**
     * Client-supplied key for safe retries, scoped to the project. Replaying a create request with the same key returns the original item rather than creating a duplicate. Must contain a non-whitespace character.
     */
    idempotencyKey?: string;
};

