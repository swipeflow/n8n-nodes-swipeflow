/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { MediaSettings } from './MediaSettings';
import type { NotificationPreference } from './NotificationPreference';
export type Settings = {
    /**
     * UI theme
     */
    theme?: string;
    /**
     * Automatically switch to dark mode based on system preference
     */
    autoDarkMode?: boolean;
    mediaSettings?: MediaSettings;
    notificationPreferences?: Array<NotificationPreference>;
    /**
     * Whether to notify the user about actions they themselves performed (excludes API key, OAuth and MCP activity, which always notifies). Defaults to false.
     */
    notifySelfActions?: boolean;
    /**
     * Whether the item queue auto-switches to grid view in landscape orientation (mobile/tablet) or on desktop-sized screens
     */
    autoGridLandscape?: boolean;
};

