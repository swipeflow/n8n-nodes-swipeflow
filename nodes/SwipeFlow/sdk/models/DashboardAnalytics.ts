/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { ActivityType } from './ActivityType';
import type { ItemStatus } from './ItemStatus';
export type DashboardAnalytics = {
    /**
     * Number of pending approvals
     */
    pendingApprovals?: number;
    /**
     * Trend data for various metrics
     */
    trends?: {
        pendingApprovals?: Record<string, string>;
        approvalRate?: Record<string, string>;
        completionRate?: Record<string, string>;
        responseTime?: Record<string, string>;
        dailyNewItems?: Record<string, string>;
    };
    /**
     * Average response time in hours
     */
    averageResponseTime?: number;
    /**
     * Approval rate percentage
     */
    approvalRate?: number;
    /**
     * Completion rate percentage
     */
    completionRate?: number;
    /**
     * Number of new items created today
     */
    dailyNewItems?: number;
    recentActivity?: Array<{
        /**
         * Item ID
         */
        itemId?: string;
        /**
         * Project ID
         */
        projectId?: string;
        /**
         * Project name
         */
        projectName?: string;
        /**
         * Item title
         */
        title?: string;
        status?: ItemStatus;
        /**
         * Activity timestamp
         */
        timestamp?: string;
        activityType?: ActivityType;
        /**
         * User who performed the action
         */
        actor?: string;
        /**
         * Optional comment
         */
        comment?: string;
    }>;
    projectStatus?: Array<{
        /**
         * Project name
         */
        name?: string;
        /**
         * Project progress percentage
         */
        progress?: number;
    }>;
};

