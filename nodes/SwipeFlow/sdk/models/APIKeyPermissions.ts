/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
export type APIKeyPermissions = {
    /**
     * Read permission
     */
    read?: boolean;
    /**
     * Write permission
     */
    write?: boolean;
    /**
     * Allowed project IDs (null means all projects)
     */
    projectIds?: Array<string> | null;
};

