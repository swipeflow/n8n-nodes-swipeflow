import type {
	CreateItemRequest,
	CreateItemVersionRequest,
	CreateProjectRequest,
	CreateTriggerRequest,
	CreateWebhookRequest,
	Item,
	ItemList,
	ItemStatusSnapshot,
	ItemVersion,
	ItemVersionList,
	MediaDescriptor,
	MediaListPage,
	ProcessItemRequest,
	Project,
	ProjectList,
	ProjectTrigger,
	RunTriggerRequest,
	UpdateItemDecisionRequest,
	UpdateProjectRequest,
	UpdateWebhookRequest,
	Webhook,
	WebhookLog,
	WebhookTest,
} from './models';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type Query = Record<string, string | number | boolean | undefined>;
export type RequestFn = (
	method: HttpMethod,
	path: string,
	options?: { query?: Query; body?: unknown },
) => Promise<unknown>;

// The OpenAPI spec omits these, but the API accepts them on create and echoes them back.
export type CreateDynamicWebhookRequest = CreateWebhookRequest & {
	type?: 'user' | 'dynamic';
	integrationProvider?: string;
	integrationLink?: string;
};

// The API persists `expiresAt` on create, but the OpenAPI spec does not list it.
export type CreateItemInput = CreateItemRequest & { expiresAt?: string };

export type ListProjectsQuery = {
	search?: string;
	sort?: 'name' | 'createdAt' | 'updatedAt' | 'totalItems' | 'pendingItems';
	status?: 'active' | 'archived';
	starred?: boolean;
	page?: number;
	limit?: number;
};

export type ListItemsQuery = {
	status?: 'pending' | 'approved' | 'rejected' | 'change_requested';
	processed?: boolean;
	search?: string;
	sortBy?: 'createdAt' | 'title' | 'status' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
	page?: number;
	limit?: number;
	resolveMedia?: boolean;
};

export type ListMediaQuery = {
	cursor?: string;
	limit?: number;
	status?: 'upload_pending' | 'import_pending' | 'uploaded' | 'delete_pending' | 'deleted';
	attached?: boolean;
};

export type MediaUploadRequest = {
	filename: string;
	fileSize: number;
	mimeType: string;
	md5?: string;
};

export type MediaUploadTicket = MediaDescriptor & {
	upload?: { url?: string; method?: 'PUT'; headers?: Record<string, string>; expiresAt?: string };
};

export type MediaUsage = {
	usedBytes?: number;
	limitBytes?: number;
	plan?: 'free' | 'pro';
	seats?: number;
};

const id = encodeURIComponent;

/**
 * Typed surface over the SwipeFlow REST API, mirroring the method names of the
 * generated `@swipeflow/sdk` client. Requests go through the injected `RequestFn`
 * so the caller decides how authentication and HTTP are done.
 */
export class SwipeFlowClient {
	constructor(private readonly send: RequestFn) {}

	private get<T>(path: string, query?: Query) {
		return this.send('GET', path, { query }) as Promise<T>;
	}

	private write<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown) {
		return this.send(method, path, { body }) as Promise<T>;
	}

	private remove(path: string) {
		return this.send('DELETE', path) as Promise<void>;
	}

	readonly projects = {
		list: (query: ListProjectsQuery = {}) => this.get<ProjectList>('/v1/projects', query),
		get: (projectId: string) => this.get<Project>(`/v1/projects/${id(projectId)}`),
		create: (body: CreateProjectRequest) => this.write<Project>('POST', '/v1/projects', body),
		update: (projectId: string, body: UpdateProjectRequest) =>
			this.write<Project>('PUT', `/v1/projects/${id(projectId)}`, body),
		delete: (projectId: string) => this.remove(`/v1/projects/${id(projectId)}`),
		resolve: (body: CreateProjectRequest) =>
			this.write<Project>('POST', '/v1/projects/resolve', body),
	};

	readonly items = {
		list: (projectId: string, query: ListItemsQuery = {}) =>
			this.get<ItemList>(`/v1/projects/${id(projectId)}/items`, query),
		get: (
			projectId: string,
			itemId: string,
			query: { includeVersions?: boolean; resolveMedia?: boolean } = {},
		) => this.get<Item>(`/v1/projects/${id(projectId)}/items/${id(itemId)}`, query),
		getNext: (projectId: string) => this.get<Item>(`/v1/projects/${id(projectId)}/next-item`),
		getStatus: (projectId: string, itemId: string) =>
			this.get<ItemStatusSnapshot>(`/v1/projects/${id(projectId)}/items/${id(itemId)}/status`),
		create: (projectId: string, body: CreateItemInput) =>
			this.write<Item>('POST', `/v1/projects/${id(projectId)}/items`, body),
		delete: (projectId: string, itemId: string) =>
			this.remove(`/v1/projects/${id(projectId)}/items/${id(itemId)}`),
		decide: (projectId: string, itemId: string, body: UpdateItemDecisionRequest) =>
			this.write<Item>('PUT', `/v1/projects/${id(projectId)}/items/${id(itemId)}/decision`, body),
		markProcessed: (projectId: string, itemId: string, body: ProcessItemRequest = {}) =>
			this.write<Item>('PUT', `/v1/projects/${id(projectId)}/items/${id(itemId)}/processed`, body),
	};

	readonly itemVersions = {
		list: (
			projectId: string,
			itemId: string,
			query: { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' } = {},
		) =>
			this.get<ItemVersionList>(
				`/v1/projects/${id(projectId)}/items/${id(itemId)}/versions`,
				query,
			),
		get: (projectId: string, itemId: string, version: number) =>
			this.get<ItemVersion>(
				`/v1/projects/${id(projectId)}/items/${id(itemId)}/versions/${version}`,
			),
		create: (projectId: string, itemId: string, body: CreateItemVersionRequest) =>
			this.write<Item>('POST', `/v1/projects/${id(projectId)}/items/${id(itemId)}/versions`, body),
	};

	readonly media = {
		createUpload: (projectId: string, body: MediaUploadRequest) =>
			this.write<MediaUploadTicket>('POST', `/v1/projects/${id(projectId)}/media-uploads`, body),
		confirmUpload: (mediaId: string) =>
			this.write<MediaDescriptor>('POST', `/v1/media-uploads/${id(mediaId)}/confirm`),
		importFromUrl: (projectId: string, body: { url: string; fileName?: string }) =>
			this.write<MediaDescriptor>('POST', `/v1/projects/${id(projectId)}/media/import-url`, body),
		list: (projectId: string, query: ListMediaQuery = {}) =>
			this.get<MediaListPage>(`/v1/projects/${id(projectId)}/media`, query),
		get: (mediaId: string) => this.get<MediaDescriptor>(`/v1/media/${id(mediaId)}`),
		delete: (mediaId: string) => this.remove(`/v1/media/${id(mediaId)}`),
		usage: (projectId: string) => this.get<MediaUsage>(`/v1/projects/${id(projectId)}/media/usage`),
		contentPath: (mediaId: string) => `/v1/media/${id(mediaId)}/content`,
	};

	readonly webhooks = {
		list: (
			projectId: string,
			query: { type?: 'user' | 'dynamic'; includeInactive?: boolean } = {},
		) => this.get<Webhook[]>(`/v1/projects/${id(projectId)}/webhooks`, query),
		create: (projectId: string, body: CreateDynamicWebhookRequest) =>
			this.write<Webhook>('POST', `/v1/projects/${id(projectId)}/webhooks`, body),
		update: (projectId: string, webhookId: string, body: UpdateWebhookRequest) =>
			this.write<Webhook>('PUT', `/v1/projects/${id(projectId)}/webhooks/${id(webhookId)}`, body),
		delete: (projectId: string, webhookId: string) =>
			this.remove(`/v1/projects/${id(projectId)}/webhooks/${id(webhookId)}`),
		test: (projectId: string, webhookId: string) =>
			this.write<WebhookTest>(
				'POST',
				`/v1/projects/${id(projectId)}/webhooks/${id(webhookId)}/test`,
			),
		logs: (projectId: string, webhookId: string) =>
			this.get<WebhookLog[]>(`/v1/projects/${id(projectId)}/webhooks/${id(webhookId)}/logs`),
	};

	readonly triggers = {
		list: (projectId: string) =>
			this.get<ProjectTrigger[]>(`/v1/projects/${id(projectId)}/triggers`),
		create: (projectId: string, body: CreateTriggerRequest) =>
			this.write<ProjectTrigger>('POST', `/v1/projects/${id(projectId)}/triggers`, body),
		delete: (projectId: string, triggerId: string) =>
			this.remove(`/v1/projects/${id(projectId)}/triggers/${id(triggerId)}`),
		run: (projectId: string, triggerId: string, body: RunTriggerRequest = {}) =>
			this.write<{ message?: string }>(
				'POST',
				`/v1/projects/${id(projectId)}/triggers/${id(triggerId)}/run`,
				body,
			),
	};
}
