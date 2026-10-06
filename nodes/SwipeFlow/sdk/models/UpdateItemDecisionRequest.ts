/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateItemDecisionRequest = {
    /**
     * Decision status
     */
    decision: UpdateItemDecisionRequest.decision;
    /**
     * Comment for the decision (required when decision is 'change_requested')
     */
    comment?: string;
    /**
     * Target version for change request (only valid when decision is 'change_requested'). If omitted, applies to latest version.
     */
    targetVersion?: number;
};
export namespace UpdateItemDecisionRequest {
    /**
     * Decision status
     */
    export enum decision {
        APPROVED = 'approved',
        REJECTED = 'rejected',
        CHANGE_REQUESTED = 'change_requested',
    }
}

