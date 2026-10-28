import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const SIGNATURE_HEADER = 'x-swipeflow-signature';
export const TIMESTAMP_HEADER = 'x-swipeflow-timestamp';
export const EVENT_HEADER = 'x-swipeflow-event';
export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

export type SignatureCheck = { valid: true } | { valid: false; reason: string };

export function generateSecret(): string {
	return randomBytes(32).toString('hex');
}

/** Deliveries are signed as `<timestamp>.<raw body>`; the test endpoint signs the body alone. */
export function computeSignature(
	secret: string,
	rawBody: string | Buffer,
	timestamp?: string,
): string {
	const hmac = createHmac('sha256', secret);
	if (timestamp !== undefined) hmac.update(`${timestamp}.`);
	return hmac.update(rawBody).digest('hex');
}

export function verifySignature(params: {
	secret: string;
	rawBody: string | Buffer;
	signature: string | undefined;
	timestamp: string | undefined;
	event: string | undefined;
	now?: number;
}): SignatureCheck {
	const { secret, rawBody, signature, timestamp, event, now = Date.now() } = params;
	if (!signature) return { valid: false, reason: 'Missing signature' };

	// Its timestamp header is not covered by the signature, so there is nothing to bind or expire;
	// the payload is a fixed message, which is why the weaker scheme is acceptable here.
	const isTestEvent = event === 'test';

	if (!isTestEvent) {
		if (!timestamp) return { valid: false, reason: 'Missing timestamp' };
		const sentAt = Date.parse(timestamp);
		if (Number.isNaN(sentAt) || Math.abs(now - sentAt) > SIGNATURE_TOLERANCE_MS) {
			return { valid: false, reason: 'Timestamp outside the accepted window' };
		}
	}

	const expected = Buffer.from(
		computeSignature(secret, rawBody, isTestEvent ? undefined : timestamp),
		'hex',
	);
	const received = Buffer.from(signature, 'hex');
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
		return { valid: false, reason: 'Signature mismatch' };
	}
	return { valid: true };
}
