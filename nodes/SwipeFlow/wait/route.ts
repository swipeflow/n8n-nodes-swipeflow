import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { WaitOutcome } from './outcome';

/**
 * Timed out is output 0 on purpose: when n8n resumes a timed wait it sends the input to output
 * 0 whatever the node returned, so the timeout branch has to be the one that runs by default.
 */
export const APPROVAL_OUTPUT_NAMES = [
	'Timed out',
	'Approved',
	'Rejected',
	'Change requested',
	'Always',
];

const OUTPUT_BY_OUTCOME: Record<WaitOutcome, number> = {
	timed_out: 0,
	approved: 1,
	rejected: 2,
	deleted: 2,
	change_requested: 3,
};

const ALWAYS_OUTPUT = APPROVAL_OUTPUT_NAMES.length - 1;

/**
 * Sends the decision down the output for its outcome and to the Always output, which runs
 * whatever the decision. Every other output stays empty. A deleted item takes the Rejected
 * output, since nothing was approved.
 */
export function routeToOutput(outcome: WaitOutcome, json: IDataObject): INodeExecutionData[][] {
	const outputs: INodeExecutionData[][] = APPROVAL_OUTPUT_NAMES.map(() => []);
	outputs[OUTPUT_BY_OUTCOME[outcome]] = [{ json }];
	outputs[ALWAYS_OUTPUT] = [{ json }];
	return outputs;
}
