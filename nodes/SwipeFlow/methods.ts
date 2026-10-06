import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { createClient } from './shared/transport';

const SEARCH_PAGE_SIZE = 50;

export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const { projects = [], pagination } = await createClient(this).projects.list({
		search: filter || undefined,
		page,
		limit: SEARCH_PAGE_SIZE,
	});

	return {
		results: projects.map((project) => ({
			name: project.name ?? String(project.id),
			value: String(project.id),
		})),
		paginationToken:
			pagination?.pages !== undefined && page < pagination.pages ? String(page + 1) : undefined,
	};
}

/** Feeds the plain dropdown of node version 1, before projects became a searchable locator. */
export async function getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { projects = [] } = await createClient(this).projects.list({ page: 1, limit: 100 });
	return projects.map((project) => ({
		name: project.name ?? String(project.id),
		value: String(project.id),
		description: project.description,
	}));
}
