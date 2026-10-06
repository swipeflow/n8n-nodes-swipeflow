/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/**
 * One file attached to an item or item version — either referenced inline in `content.data`, or attached explicitly via `media` on create/version-create without necessarily appearing in the content body at all.
 *
 */
export type AttachedMedia = {
    /**
     * Media id
     */
    id?: string;
    /**
     * Original filename, if the uploader gave one
     */
    fileName?: string;
    contentType?: string;
    /**
     * Size in bytes
     */
    size?: number;
    /**
     * Signed URL for the bytes, always present. Expires at `urlExpiresAt`; do not cache or persist it — refetch the containing item/list to refresh.
     */
    url?: string;
    /**
     * Absolute expiry for `url`. Every media entry in one response shares the same value.
     */
    urlExpiresAt?: string;
};

