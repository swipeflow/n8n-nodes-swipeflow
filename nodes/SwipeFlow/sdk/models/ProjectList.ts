/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { PaginationMeta } from './PaginationMeta';
import type { Project } from './Project';
export type ProjectList = {
    projects?: Array<Project>;
    pagination?: PaginationMeta;
    /**
     * The caller's starred, non-archived projects. Only present on the unfiltered first page.
     */
    favorites?: Array<Project>;
};

