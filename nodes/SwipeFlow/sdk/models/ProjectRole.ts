/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/**
 * Role of a member in a project:
 * - owner: Project creator, cannot be removed
 * - admin: Can manage members and settings
 * - editor: Can create and edit items
 * - viewer: Read-only access
 *
 */
export enum ProjectRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    EDITOR = 'editor',
    VIEWER = 'viewer',
}
