import { NodeOperationError, WAIT_INDEFINITELY, type IExecuteFunctions } from 'n8n-workflow';

const SECONDS_PER_UNIT = { minutes: 60, hours: 60 * 60, days: 60 * 60 * 24 } as const;

export function configureWaitTill(ctx: IExecuteFunctions): Date {
	if (!ctx.getNodeParameter('limitWaitTime', 0, false)) return WAIT_INDEFINITELY;

	const limitType = ctx.getNodeParameter('limitType', 0, 'afterTimeInterval') as string;
	let waitTill: Date;

	if (limitType === 'afterTimeInterval') {
		const amount = ctx.getNodeParameter('resumeAmount', 0, 1) as number;
		const unit = ctx.getNodeParameter('resumeUnit', 0, 'hours') as keyof typeof SECONDS_PER_UNIT;
		waitTill = new Date(Date.now() + amount * SECONDS_PER_UNIT[unit] * 1000);
	} else {
		waitTill = new Date(ctx.getNodeParameter('maxDateAndTime', 0, '') as string);
	}

	if (Number.isNaN(waitTill.getTime())) {
		throw new NodeOperationError(ctx.getNode(), 'Could not configure Limit Wait Time', {
			description: 'The time limit is not a valid date',
		});
	}
	return waitTill;
}

/** Polling needs a deadline, or it would check forever, so it refuses to start without one. */
export function configurePollingLimit(ctx: IExecuteFunctions): Date {
	const waitTill = configureWaitTill(ctx);
	if (waitTill.getTime() === WAIT_INDEFINITELY.getTime()) {
		throw new NodeOperationError(ctx.getNode(), 'Polling needs a time limit', {
			description: 'Turn on Limit Wait Time so that polling stops at a set time.',
		});
	}
	return waitTill;
}
