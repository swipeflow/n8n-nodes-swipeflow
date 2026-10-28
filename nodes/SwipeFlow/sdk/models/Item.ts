/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedMedia } from './AttachedMedia';
import type { ItemContent } from './ItemContent';
import type { ItemDecision } from './ItemDecision';
import type { ItemProcessed } from './ItemProcessed';
import type { ItemStatus } from './ItemStatus';
import type { ItemVersion } from './ItemVersion';
export type Item = {
    /**
     * Item ID
     */
    id?: string;
    /**
     * Project ID
     */
    projectId?: string;
    /**
     * Item title
     */
    title?: string;
    /**
     * Item description
     */
    description?: string;
    content?: ItemContent;
    /**
     * Media currently attached to this item — always a superset of whatever `content.data` embeds, plus anything attached without being inline. Reflects the *current* state only, same as `content`; an `ItemVersion`'s own `media` is that version's frozen snapshot instead.
     *
     */
    media?: Array<AttachedMedia>;
    /**
     * Custom metadata
     */
    metadata?: Record<string, any>;
    status?: ItemStatus;
    decisions?: Array<ItemDecision>;
    /**
     * Set once the requester has confirmed it acted on the decision (see PUT /:itemId/processed). Only ever present on 'approved'/'rejected' items — null everywhere else, including for a 'change_requested' item, which closes out via a new version instead of this.
     */
    processed?: ItemProcessed | null;
    /**
     * User who created the item
     */
    createdBy?: string;
    /**
     * Display name of who authored the current version (user, API key, or OAuth client name)
     */
    actorName?: string;
    /**
     * Version number
     */
    version?: number;
    /**
     * Creation timestamp
     */
    createdAt?: string;
    /**
     * Last update timestamp
     */
    updatedAt?: string;
    /**
     * Expiration timestamp (optional)
     */
    expiresAt?: string;
    /**
     * Array of all versions (only if includeVersions=true)
     */
    versions?: Array<ItemVersion>;
    /**
     * The idempotency key the item was created with, if any
     */
    idempotencyKey?: string;
};

