/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedMedia } from './AttachedMedia';
import type { ItemContent } from './ItemContent';
import type { ItemDecision } from './ItemDecision';
export type ItemVersion = {
    /**
     * Version ID
     */
    id?: string;
    /**
     * Item ID
     */
    itemId?: string;
    /**
     * Project ID
     */
    projectId?: string;
    /**
     * Version number
     */
    version?: number;
    /**
     * Item title at this version
     */
    title?: string;
    /**
     * Item description at this version
     */
    description?: string;
    content?: ItemContent;
    /**
     * This version's own frozen snapshot of attached media — not affected by later versions' attachments.
     */
    media?: Array<AttachedMedia>;
    /**
     * Custom metadata at this version
     */
    metadata?: Record<string, any>;
    /**
     * Status at this version
     */
    status?: ItemVersion.status;
    decisions?: Array<ItemDecision>;
    /**
     * User who created this version
     */
    createdBy?: string;
    /**
     * Display name of who submitted this version (user, API key, or OAuth client name)
     */
    actorName?: string;
    /**
     * When this version was created / submitted (v1 == item creation)
     */
    createdAt?: string;
};
export namespace ItemVersion {
    /**
     * Status at this version
     */
    export enum status {
        PENDING = 'pending',
        APPROVED = 'approved',
        REJECTED = 'rejected',
        CHANGE_REQUESTED = 'change_requested',
    }
}

