/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserAddress } from './UserAddress';
export type UserProfile = {
    /**
     * User ID
     */
    id?: string;
    /**
     * User's email address
     */
    email?: string;
    /**
     * User's first name
     */
    firstName?: string;
    /**
     * User's last name
     */
    lastName?: string;
    /**
     * URL to user's profile picture
     */
    picture?: string;
    /**
     * User's phone number
     */
    phoneNumber?: string;
    /**
     * ISO 3166-1 alpha-2 country of the user, independent of the address
     */
    country?: string;
    address?: UserAddress;
    /**
     * User's membership tier
     */
    membership?: UserProfile.membership;
    /**
     * Whether email is verified
     */
    emailVerified?: boolean;
    /**
     * Indicates whether the user has administrative privileges. Used for UI purposes only — all admin actions are validated server-side.
     *
     */
    isAdmin?: boolean;
    /**
     * Account creation timestamp
     */
    createdAt?: string;
    /**
     * First login timestamp
     */
    firstLoginAt?: string;
    /**
     * Last login timestamp
     */
    lastLoginAt?: string;
};
export namespace UserProfile {
    /**
     * User's membership tier
     */
    export enum membership {
        FREE = 'free',
        PRO = 'pro',
        TEAM = 'team',
    }
}

