/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ItemContent } from './ItemContent';
export type CreateItemVersionRequest = {
    /**
     * Updated item title
     */
    title?: string;
    /**
     * Updated item description
     */
    description?: string;
    content?: ItemContent;
    /**
     * Media ids to attach to the new version. Omit to carry over the previous version's media exactly, including when `content` is also changing — media is never inferred from a content change. Pass `[]` to explicitly detach everything, or a new list to replace it — any ref embedded in *this request's* `content` is included automatically regardless of this field, but a ref only present in the *previous* (unchanged, carried-over) content is not rescanned, so `[]` reliably detaches even if old content still mentions something.
     *
     */
    media?: Array<string>;
    /**
     * Updated item metadata
     */
    metadata?: Record<string, any>;
};

