import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { generateSecret, verifySignature } from '../nodes/SwipeFlow/shared/signature';

const secret = 'whsec_test';
const timestamp = '2026-09-21T12:00:00.000Z';
const now = Date.parse(timestamp) + 1000;
const body = JSON.stringify({ event: 'item.approved', timestamp, data: { item: { _id: 'i1' } } });

// The backend signs `timestamp + '.' + JSON.stringify(payload)` (WebhookService.generateSignature).
const backendSignature = (payload: string, ts?: string) =>
	createHmac('sha256', secret)
		.update(ts ? `${ts}.${payload}` : payload)
		.digest('hex');

const verify = (overrides: Partial<Parameters<typeof verifySignature>[0]> = {}) =>
	verifySignature({
		secret,
		rawBody: body,
		signature: backendSignature(body, timestamp),
		timestamp,
		event: 'item.approved',
		now,
		...overrides,
	});

describe('verifySignature', () => {
	it('accepts a delivery signed the way the backend signs it', () => {
		expect(verify()).toEqual({ valid: true });
	});

	it('rejects a modified body', () => {
		expect(verify({ rawBody: body.replace('i1', 'i2') })).toMatchObject({
			valid: false,
			reason: 'Signature mismatch',
		});
	});

	it('rejects a signature made with another secret', () => {
		const forged = createHmac('sha256', 'other').update(`${timestamp}.${body}`).digest('hex');
		expect(verify({ signature: forged })).toMatchObject({ valid: false });
	});

	it('rejects a signature that is not hex or the wrong length without throwing', () => {
		expect(verify({ signature: 'not-hex' })).toMatchObject({ valid: false });
		expect(verify({ signature: 'abcd' })).toMatchObject({ valid: false });
	});

	it('rejects a replayed delivery outside the five minute window', () => {
		expect(verify({ now: now + 6 * 60 * 1000 })).toMatchObject({
			valid: false,
			reason: 'Timestamp outside the accepted window',
		});
		expect(verify({ now: now - 6 * 60 * 1000 })).toMatchObject({ valid: false });
	});

	it('rejects when the timestamp is swapped for a fresh one, since it is part of the signed data', () => {
		const fresh = new Date(now).toISOString();
		expect(verify({ timestamp: fresh })).toMatchObject({
			valid: false,
			reason: 'Signature mismatch',
		});
	});

	it('requires the headers', () => {
		expect(verify({ signature: undefined })).toMatchObject({
			valid: false,
			reason: 'Missing signature',
		});
		expect(verify({ timestamp: undefined })).toMatchObject({
			valid: false,
			reason: 'Missing timestamp',
		});
	});

	it('signs the exact bytes received, not a re-serialisation', () => {
		const spaced = body.replace(',"data"', ', "data"');
		expect(verify({ rawBody: spaced })).toMatchObject({ valid: false });
		expect(verify({ rawBody: Buffer.from(body) })).toEqual({ valid: true });
	});

	describe('the test event', () => {
		const testBody = JSON.stringify({
			event: 'test',
			timestamp,
			data: { message: 'This is a test webhook payload' },
		});

		it('is accepted with the body-only signature the test endpoint produces, whatever its timestamp header says', () => {
			const result = verifySignature({
				secret,
				rawBody: testBody,
				signature: backendSignature(testBody),
				timestamp: '2020-01-01T00:00:00.000Z',
				event: 'test',
				now,
			});
			expect(result).toEqual({ valid: true });
		});

		it('does not open a hole for real events: a body-only signature is rejected for them', () => {
			expect(verify({ signature: backendSignature(body) })).toMatchObject({
				valid: false,
				reason: 'Signature mismatch',
			});
		});
	});
});

describe('generateSecret', () => {
	it('produces distinct 256-bit hex secrets', () => {
		const [a, b] = [generateSecret(), generateSecret()];
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(a).not.toBe(b);
	});
});
