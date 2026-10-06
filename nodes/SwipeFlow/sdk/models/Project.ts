/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { ProjectMember } from './ProjectMember';
import type { ProjectTrigger } from './ProjectTrigger';
export type Project = {
    /**
     * Project ID
     */
    id?: string;
    /**
     * Project name
     */
    name?: string;
    /**
     * Project description
     */
    description?: string;
    members?: Array<ProjectMember>;
    /**
     * Whether the project is archived
     */
    isArchived?: boolean;
    /**
     * Whether the project is starred
     */
    isStarred?: boolean;
    /**
     * Total number of items in the project
     */
    totalItems?: number;
    /**
     * Number of pending items
     */
    pendingItems?: number;
    /**
     * Number of approved items
     */
    approvedItems?: number;
    /**
     * Timestamp of last item posted
     */
    lastItemPostedAt?: string;
    triggers?: Array<ProjectTrigger>;
    /**
     * Project creation timestamp
     */
    createdAt?: string;
    /**
     * Project last update timestamp
     */
    updatedAt?: string;
    /**
     * Only present on the single-project detail read (not the list). usedBytes counts this project's pending, uploaded, and in-flight-import media — informational; the full quota + limit breakdown is at GET /v1/projects/{projectId}/media/usage.
     */
    mediaUsage?: {
        usedBytes?: number;
    };
};

