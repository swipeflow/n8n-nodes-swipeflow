/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { DecisionType } from './DecisionType';
export type ItemDecision = {
    /**
     * User who made the decision
     */
    userId?: string;
    decision?: DecisionType;
    /**
     * Optional comment for the decision
     */
    comment?: string;
    /**
     * When the decision was made
     */
    timestamp?: string;
    /**
     * Target version for change request (only present when decision is 'change_requested')
     */
    targetVersion?: number;
    /**
     * Display name of who made the decision — the user, or the API key / OAuth client name when acting on their behalf
     */
    actorName?: string;
};

