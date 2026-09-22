/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuditEventActor = {
    actorType?: AuditEventActor.actorType;
    /**
     * Account the action ran under, when there is one
     */
    userId?: string | null;
    /**
     * Snapshot of the acting party's display name
     */
    name?: string;
    email?: string | null;
};
export namespace AuditEventActor {
    export enum actorType {
        USER = 'user',
        API_KEY = 'api_key',
        OAUTH_CLIENT = 'oauth_client',
        SYSTEM = 'system',
    }
}

