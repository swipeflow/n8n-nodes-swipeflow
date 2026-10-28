import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { Swipeflow } from '../nodes/SwipeFlow/Swipeflow.node';
import { SwipeflowApproval } from '../nodes/SwipeFlow/SwipeflowApproval.node';
import { CONTENT_TYPE_OPTIONS } from '../nodes/SwipeFlow/descriptions/common';

const contentTypes = (CONTENT_TYPE_OPTIONS ?? []).map(
	(option) => (option as { value: string }).value,
);

const shows = (property: INodeProperties, values: Record<string, string | number>) =>
	Object.entries(property.displayOptions?.show ?? {})
		.filter(([key]) => key !== '@version')
		.every(([key, accepted]) => (accepted as unknown[]).includes(values[key]));

const contentFor = (properties: INodeProperties[], values: Record<string, string | number>) =>
	properties.filter(
		(property) =>
			property.name === 'content' &&
			!(property.displayOptions?.show?.['@version'] as unknown[] | undefined)?.some(
				(version) => typeof version === 'number',
			) &&
			shows(property, values),
	);

describe('Content input', () => {
	it.each([
		['Create', { resource: 'item', operation: 'create' }],
		['Create and Wait for Decision', { resource: 'item', operation: 'sendAndWait' }],
	])('shows exactly one input per content type on %s', (_name, values) => {
		const { properties } = new Swipeflow().description;
		for (const contentType of contentTypes) {
			expect(contentFor(properties, { ...values, contentType }), contentType).toHaveLength(1);
		}
	});

	it('shows exactly one input per content type on the Approval node', () => {
		const { properties } = new SwipeflowApproval().description;
		for (const contentType of contentTypes) {
			expect(contentFor(properties, { contentType }), contentType).toHaveLength(1);
		}
	});

	it('gives a carousel its own example and help', () => {
		const [carousel] = contentFor(new SwipeflowApproval().description.properties, {
			contentType: 'carousel',
		});
		expect(carousel.placeholder).toContain('"items"');
		expect(carousel.description).toContain('1 to 20 slides');
	});
});
