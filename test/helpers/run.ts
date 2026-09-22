import { Swipeflow } from '../../nodes/SwipeFlow/Swipeflow.node';
import { fakeContext } from './context';

const node = new Swipeflow();

export const project = { mode: 'id', value: 'p1' };

/** Executes the SwipeFlow node (version 2 unless told otherwise) against a fake context. */
export function runNode(
	options: Parameters<typeof fakeContext>[0],
	setup?: (helpers: ReturnType<typeof fakeContext>['raw']['helpers']) => void,
) {
	const context = fakeContext(options);
	// Execution starts synchronously, so anything the node reads first must be configured before it.
	setup?.(context.raw.helpers);
	return { ...context, result: node.execute.call(context.ctx as never) };
}
