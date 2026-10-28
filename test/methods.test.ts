import type { INodeProperties, INodeType } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Swipeflow } from '../nodes/SwipeFlow/Swipeflow.node';
import { SwipeflowApproval } from '../nodes/SwipeFlow/SwipeflowApproval.node';
import { SwipeflowTrigger } from '../nodes/SwipeFlow/SwipeflowTrigger.node';

type Reference = { kind: 'listSearch' | 'loadOptions'; method: string };

function referencesIn(properties: INodeProperties[] = []): Reference[] {
	return properties.flatMap((property) => {
		const found: Reference[] = [];
		const { searchListMethod, loadOptionsMethod } = property.typeOptions ?? {};
		if (searchListMethod) found.push({ kind: 'listSearch', method: searchListMethod });
		if (loadOptionsMethod) found.push({ kind: 'loadOptions', method: loadOptionsMethod });
		for (const mode of property.modes ?? []) {
			if (mode.typeOptions?.searchListMethod) {
				found.push({ kind: 'listSearch', method: mode.typeOptions.searchListMethod });
			}
		}
		const nested = (property.options ?? []).flatMap((option) =>
			'values' in option
				? referencesIn(option.values)
				: 'displayName' in option
					? referencesIn([option as INodeProperties])
					: [],
		);
		return [...found, ...nested];
	});
}

describe.each([
	['Swipeflow', new Swipeflow()],
	['SwipeflowTrigger', new SwipeflowTrigger()],
	['SwipeflowApproval', new SwipeflowApproval()],
] as [string, INodeType][])('%s dropdown methods', (_name, node) => {
	it('declares every method its properties refer to', () => {
		const declared = node.methods as Record<string, Record<string, unknown>> | undefined;
		for (const { kind, method } of referencesIn(node.description.properties)) {
			expect(Object.keys(declared?.[kind] ?? {}), `${kind} method "${method}"`).toContain(method);
		}
	});

	it('refers to at least one list method where it has a project picker', () => {
		expect(referencesIn(node.description.properties).length).toBeGreaterThan(0);
	});
});
