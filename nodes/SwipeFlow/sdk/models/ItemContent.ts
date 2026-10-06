/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
import type { ContentType } from './ContentType';
export type ItemContent = {
    type?: ContentType;
    /**
     * For text/html: the content itself, which may embed one or more canonical `media://<id>` refs inline — e.g. markdown `![alt](media://66f1f77bcf86cd799439099)`. For image/video/audio: a single media ref, or an external https URL. Refs are **not** substituted for a live URL here unless the request opted in with `resolveMedia=true` — see `media[]` for why.
     *
     */
    data?: string;
};

