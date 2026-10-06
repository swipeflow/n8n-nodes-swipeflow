/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { AuditEvent } from './AuditEvent';
export type AuditEventPage = {
    data?: Array<AuditEvent>;
    /**
     * Opaque cursor for the next page, or null when there are no more events
     */
    nextCursor?: string | null;
    hasMore?: boolean;
};

