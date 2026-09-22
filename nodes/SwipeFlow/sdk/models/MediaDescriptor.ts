/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The standalone media API's shared shape — single lookup, project listing, and the upload-ticket/confirm responses. `url`/`urlExpiresAt` are null until `uploaded`.
 *
 */
export type MediaDescriptor = {
    id?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
    /**
     * Signed URL for the bytes, once uploaded. Do not cache or persist it.
     */
    url?: string | null;
    /**
     * Absolute expiry for `url`. Every row in one response shares the same value.
     */
    urlExpiresAt?: string | null;
    projectId?: string;
    status?: MediaDescriptor.status;
    createdAt?: string;
    uploadedAt?: string | null;
    /**
     * The user who uploaded the bytes — provenance only
     */
    uploadedBy?: string;
    /**
     * Items and item versions this object is attached to. Reusable across them within the project.
     */
    itemIds?: Array<string>;
    /**
     * Opaque storage fingerprint — not a portable MD5 guarantee.
     */
    etag?: string | null;
    /**
     * Base64 MD5
     */
    md5?: string | null;
    /**
     * Sanitized terminal failure detail for a URL import, retained for diagnosis.
     */
    importError?: string | null;
    /**
     * Stable machine-readable URL-import failure code; use this instead of parsing importError.
     */
    importErrorCode?: string | null;
    importFailedAt?: string | null;
};
export namespace MediaDescriptor {
    export enum status {
        UPLOAD_PENDING = 'upload_pending',
        IMPORT_PENDING = 'import_pending',
        UPLOADED = 'uploaded',
        DELETE_PENDING = 'delete_pending',
        DELETED = 'deleted',
    }
}

