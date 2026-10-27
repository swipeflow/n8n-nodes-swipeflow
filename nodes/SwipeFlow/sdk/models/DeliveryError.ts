/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DeliveryError = {
    kind?: DeliveryError.kind;
    category?: string;
    status?: number | null;
    message?: string | null;
};
export namespace DeliveryError {
    export enum kind {
        TRANSIENT = 'transient',
        PERMANENT = 'permanent',
    }
}

