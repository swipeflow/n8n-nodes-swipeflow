type Body = Record<string, unknown>;
type Call = { method: string; path: string; query: Record<string, unknown>; body?: Body };

export type FakeItem = Body & {
	id: string;
	projectId: string;
	status: string;
	decisions: Body[];
	idempotencyKey?: string;
};
export type FakeWebhook = Body & {
	id: string;
	url: string;
	name: string;
	events: string[];
	active: boolean;
	type: string;
	integrationProvider?: string;
	secret?: string;
};

/** In-memory stand-in for the parts of the SwipeFlow API the node uses. */
export class FakeSwipeFlow {
	readonly calls: Call[] = [];
	private readonly stubs: Array<{ method: string; pattern: RegExp; response: unknown }> = [];

	/** Canned answer for an endpoint the fake does not model; the latest stub for a route wins. */
	stub(method: string, pattern: RegExp, response: unknown | ((call: Call) => unknown)) {
		this.stubs.unshift({ method, pattern, response });
	}
	readonly items = new Map<string, FakeItem>();
	readonly webhooks = new Map<string, FakeWebhook>();
	readonly projects = [
		{ id: 'p1', name: 'Marketing', description: 'Campaign reviews' },
		{ id: 'p2', name: 'Support', description: '' },
	];
	private counter = 0;

	private nextId(prefix: string) {
		return `${prefix}${String(++this.counter).padStart(3, '0')}`;
	}

	handle(
		method: string,
		url: string,
		options: { qs?: Record<string, unknown>; body?: unknown } = {},
	): unknown {
		const { pathname } = new URL(url);
		const call: Call = {
			method,
			path: pathname,
			query: options.qs ?? {},
			body: options.body as Body | undefined,
		};
		this.calls.push(call);

		for (const stub of this.stubs) {
			if (stub.method === method && stub.pattern.test(pathname)) {
				return typeof stub.response === 'function' ? stub.response(call) : stub.response;
			}
		}

		let m: RegExpMatchArray | null;
		if (method === 'GET' && pathname === '/v1/projects') return this.listProjects(call.query);
		if ((m = pathname.match(/^\/v1\/projects\/([^/]+)\/items$/))) {
			if (method === 'POST') return this.createItem(m[1], call.body ?? {});
			if (method === 'GET') return this.listItems(m[1], call.query);
		}
		if ((m = pathname.match(/^\/v1\/projects\/([^/]+)\/items\/([^/]+)$/)) && method === 'GET')
			return this.getItem(m[2]);
		if ((m = pathname.match(/^\/v1\/projects\/([^/]+)\/webhooks$/))) {
			if (method === 'POST') return this.createWebhook(m[1], call.body ?? {});
			if (method === 'GET') return this.listWebhooks(call.query);
		}
		if ((m = pathname.match(/^\/v1\/projects\/([^/]+)\/webhooks\/([^/]+)$/))) {
			if (method === 'PUT') return this.updateWebhook(m[2], call.body ?? {});
			if (method === 'DELETE') return this.deleteWebhook(m[2]);
		}
		throw this.error(404, `No fake route for ${method} ${pathname}`);
	}

	error(status: number, message: string) {
		return Object.assign(new Error(message), {
			httpCode: String(status),
			response: { status, body: { message } },
		});
	}

	private listProjects(query: Record<string, unknown>) {
		const search = String(query.search ?? '').toLowerCase();
		const page = Number(query.page ?? 1);
		const limit = Number(query.limit ?? 20);
		const matching = this.projects.filter((p) => p.name.toLowerCase().includes(search));
		return {
			projects: matching.slice((page - 1) * limit, page * limit),
			pagination: {
				total: matching.length,
				page,
				pages: Math.ceil(matching.length / limit),
				limit,
			},
		};
	}

	private createItem(projectId: string, body: Body) {
		const key = body.idempotencyKey as string | undefined;
		const existing = key && [...this.items.values()].find((item) => item.idempotencyKey === key);
		if (existing) return existing;
		const item: FakeItem = {
			id: this.nextId('i'),
			projectId,
			status: 'pending',
			decisions: [],
			version: 1,
			...body,
		};
		this.items.set(item.id, item);
		return item;
	}

	private listItems(projectId: string, query: Record<string, unknown>) {
		const page = Number(query.page ?? 1);
		const limit = Number(query.limit ?? 10);
		const matching = [...this.items.values()].filter(
			(item) => item.projectId === projectId && (!query.status || item.status === query.status),
		);
		return {
			items: matching.slice((page - 1) * limit, page * limit),
			pagination: {
				total: matching.length,
				page,
				pages: Math.ceil(matching.length / limit),
				limit,
			},
		};
	}

	private getItem(itemId: string) {
		const item = this.items.get(itemId);
		if (!item) throw this.error(404, 'Item not found');
		return item;
	}

	private createWebhook(projectId: string, body: Body) {
		const webhook = {
			id: this.nextId('w'),
			projectId,
			active: true,
			secret: 'server-generated',
			...body,
		} as FakeWebhook;
		this.webhooks.set(webhook.id, webhook);
		return webhook;
	}

	private listWebhooks(query: Record<string, unknown>) {
		return [...this.webhooks.values()].filter(
			(w) => (!query.type || w.type === query.type) && (query.includeInactive === true || w.active),
		);
	}

	private updateWebhook(webhookId: string, body: Body) {
		const webhook = this.webhooks.get(webhookId);
		if (!webhook) throw this.error(404, 'Webhook not found');
		Object.assign(webhook, body);
		return webhook;
	}

	private deleteWebhook(webhookId: string) {
		if (!this.webhooks.delete(webhookId)) throw this.error(404, 'Webhook not found');
		return '';
	}

	/** Records a reviewer's decision and returns the `data` a webhook delivery would carry. */
	decide(itemId: string, decision: 'approved' | 'rejected' | 'change_requested', comment?: string) {
		const item = this.getItem(itemId);
		const entry = {
			decision,
			comment,
			actorName: 'Riley Reviewer',
			timestamp: '2026-09-21T12:00:00.000Z',
			userId: 'u1',
		};
		item.status = decision;
		item.decisions.push(entry);
		return { item: { ...item, _id: item.id }, userId: 'u1', decision: entry };
	}

	callsTo(method: string, pathPattern: RegExp) {
		return this.calls.filter((call) => call.method === method && pathPattern.test(call.path));
	}
}
