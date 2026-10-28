/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { ContentType } from './ContentType';
export type ItemContent = {
    type?: ContentType;
    /**
     * For text/html: the content itself, which may embed one or more canonical `media://<id>` refs inline — e.g. markdown `![alt](media://66f1f77bcf86cd799439099)`. For image/video/audio: a single media ref, or an external https URL. For carousel: JSON `{"items": [{"type": "image"|"video", "url": "<media ref or https URL>", "caption"?: "...", "alt"?: "..."}]}` with 1–20 items (caption/alt at most 500 characters). On create/version-create it may also be sent as that object, or as a bare array of items; it is always stored and returned as the JSON string. Refs are **not** substituted for a live URL here unless the request opted in with `resolveMedia=true` — see `media[]` for why.
     *
     */
    data?: string;
};

