/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuditEventActor } from './AuditEventActor';
import type { AuditEventTarget } from './AuditEventTarget';
import type { AuditEventType } from './AuditEventType';
export type AuditEvent = {
    id?: string;
    type?: AuditEventType;
    actor?: AuditEventActor;
    projectId?: string | null;
    /**
     * The user this event is about, when distinct from the actor
     */
    subjectUserId?: string | null;
    target?: AuditEventTarget;
    /**
     * Event-specific detail. Never contains secrets.
     */
    metadata?: Record<string, any> | null;
    /**
     * Projects an API-key event is relevant to, even though the event has no `projectId`: the key's explicit permission scope, or — for an unscoped key — the owner's project memberships at the time of the event.
     */
    relatedProjectIds?: Array<string> | null;
    /**
     * Request context. Included for the caller's own feed and the admin feed; on a project feed only for a platform admin or the project's OWNER/ADMIN.
     */
    context?: {
        ip?: string;
        userAgent?: string;
        requestId?: string;
        /**
         * Which surface the request came through.
         */
        clientType?: AuditEvent.clientType;
    } | null;
    /**
     * When the event was recorded, in UTC (ISO 8601, e.g. `2024-01-15T10:30:00.000Z`). Millisecond precision.
     */
    createdAt?: string;
};
export namespace AuditEvent {
    /**
     * Which surface the request came through.
     */
    export enum clientType {
        WEB = 'web',
        IOS = 'ios',
        ANDROID = 'android',
        API = 'api',
        OAUTH = 'oauth',
        MCP = 'mcp',
    }
}

