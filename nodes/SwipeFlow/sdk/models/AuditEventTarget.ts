/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuditEventTarget = {
    type?: AuditEventTarget.type;
    id?: string;
    displayName?: string | null;
};
export namespace AuditEventTarget {
    export enum type {
        ITEM = 'item',
        ITEM_VERSION = 'item_version',
        PROJECT = 'project',
        WEBHOOK = 'webhook',
        API_KEY = 'api_key',
        MEMBER = 'member',
        COMMENT = 'comment',
    }
}

