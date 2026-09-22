/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegisterDeviceRequest = {
    /**
     * Device push notification token
     */
    deviceToken: string;
    /**
     * Device platform
     */
    deviceType: RegisterDeviceRequest.deviceType;
    /**
     * Device name
     */
    deviceName: string;
};
export namespace RegisterDeviceRequest {
    /**
     * Device platform
     */
    export enum deviceType {
        IOS = 'ios',
        ANDROID = 'android',
        WEB = 'web',
    }
}

