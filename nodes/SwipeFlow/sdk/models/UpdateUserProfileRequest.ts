/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { UserAddress } from './UserAddress';
export type UpdateUserProfileRequest = {
    /**
     * User's first name
     */
    firstName?: string;
    /**
     * User's last name
     */
    lastName?: string;
    /**
     * User's phone number
     */
    phoneNumber?: string;
    /**
     * ISO 3166-1 alpha-2 country of the user, independent of the address
     */
    country?: string;
    address?: UserAddress;
};

