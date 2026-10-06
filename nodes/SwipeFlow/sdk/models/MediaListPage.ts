/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { MediaDescriptor } from './MediaDescriptor';
export type MediaListPage = {
    data?: Array<MediaDescriptor>;
    /**
     * Opaque cursor for the next page, or null when there are no more rows
     */
    nextCursor?: string | null;
    hasMore?: boolean;
};

