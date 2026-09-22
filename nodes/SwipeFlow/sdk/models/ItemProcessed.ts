/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/**
 * Requester-side reconciliation record — proof the decision was actually acted on, not just delivered (by webhook or by reading it), and the durable backstop for finding anything a missed or unretried webhook delivery left stranded.
 */
export type ItemProcessed = {
    /**
     * When the item was marked processed
     */
    processedAt?: string;
    /**
     * User who marked the item processed
     */
    processedBy?: string;
    /**
     * Optional free-text note on what was done with the decision
     */
    action?: string;
    /**
     * Display name of who marked it processed (user, API key, or OAuth client name)
     */
    actorName?: string;
};

