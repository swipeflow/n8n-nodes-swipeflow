import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakeSwipeFlow } from './helpers/fakeApi';
import { project, runNode } from './helpers/run';

let api: FakeSwipeFlow;
beforeEach(() => {
	api = new FakeSwipeFlow();
});

const STORAGE_URL = 'https://storage.example.com/bucket/obj?sig=abc';
const lastCall = () => api.calls.at(-1)!;

const run = (params: Record<string, unknown>, setup?: Parameters<typeof runNode>[1]) =>
	runNode({ api, params: { resource: 'media', ...params } }, setup);

describe('upload', () => {
	const bytes = Buffer.from('PNGDATA');

	const upload = (
		options: {
			ticket?: unknown;
			fileNameOverride?: string;
			binary?: Record<string, unknown>;
			storageError?: Error;
		} = {},
	) => {
		api.stub(
			'POST',
			/media-uploads$/,
			options.ticket ?? {
				id: 'm1',
				upload: { url: STORAGE_URL, method: 'PUT', headers: { 'Content-Type': 'image/png' } },
			},
		);
		api.stub('POST', /media-uploads\/m1\/confirm$/, {
			id: 'm1',
			status: 'uploaded',
			fileName: 'cat.png',
		});
		return run(
			{
				operation: 'upload',
				projectId: project,
				binaryPropertyName: 'data',
				fileName: options.fileNameOverride ?? '',
			},
			(helpers) => {
				helpers.assertBinaryData.mockReturnValue(
					options.binary ?? { fileName: 'cat.png', mimeType: 'image/png' },
				);
				helpers.getBinaryDataBuffer.mockResolvedValue(bytes);
				if (options.storageError) helpers.httpRequest.mockRejectedValue(options.storageError);
				else helpers.httpRequest.mockResolvedValue('');
			},
		);
	};

	it('requests a ticket, uploads the bytes, confirms, and returns a media reference', async () => {
		const { result, raw } = upload();
		const [[out]] = await result;

		expect(api.calls[0]).toMatchObject({
			method: 'POST',
			path: '/v1/projects/p1/media-uploads',
			body: { filename: 'cat.png', fileSize: 7, mimeType: 'image/png' },
		});
		expect(raw.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'PUT',
			url: STORAGE_URL,
			headers: { 'Content-Type': 'image/png' },
			body: bytes,
			json: false,
		});
		expect(api.calls[1]).toMatchObject({ method: 'POST', path: '/v1/media-uploads/m1/confirm' });
		expect(out.json).toMatchObject({ id: 'm1', status: 'uploaded', ref: 'media://m1' });
	});

	it('never sends the SwipeFlow API key to the storage host', async () => {
		const { result, raw, httpRequestWithAuthentication } = upload();
		await result;

		expect(
			httpRequestWithAuthentication.mock.calls.every(
				([, request]) => !String(request.url).includes('storage.example.com'),
			),
		).toBe(true);
		expect(JSON.stringify(raw.helpers.httpRequest.mock.calls)).not.toContain('test-key');
		expect(raw.helpers.httpRequest.mock.calls[0][0].headers).toEqual({
			'Content-Type': 'image/png',
		});
	});

	it('lets the file name be overridden, and falls back to defaults when the binary has none', async () => {
		await upload({ fileNameOverride: 'renamed.png' }).result;
		expect(api.calls[0].body).toMatchObject({ filename: 'renamed.png' });

		api.calls.length = 0;
		await upload({ binary: {} }).result;
		expect(api.calls[0].body).toMatchObject({
			filename: 'file',
			mimeType: 'application/octet-stream',
		});
	});

	it('fails clearly when SwipeFlow returns no upload URL, without uploading anything', async () => {
		const { result, raw } = upload({ ticket: { id: 'm1' } });
		await expect(result).rejects.toThrow('did not return an upload URL');
		expect(raw.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('reports a failed upload to storage as an API error and does not confirm', async () => {
		const context = upload({
			storageError: Object.assign(new Error('Forbidden'), { httpCode: '403' }),
		});
		await expect(context.result).rejects.toThrow(NodeApiError);
		expect(api.callsTo('POST', /confirm$/)).toHaveLength(0);
	});
});

describe('importFromUrl', () => {
	it('sends the url, and the file name only when set', async () => {
		api.stub('POST', /media\/import-url$/, { id: 'm2', status: 'import_pending' });
		const [[out]] = await run({
			operation: 'importFromUrl',
			projectId: project,
			url: 'https://example.com/a.png',
			fileName: '',
		}).result;
		expect(lastCall().body).toEqual({ url: 'https://example.com/a.png' });
		expect(out.json).toMatchObject({ id: 'm2', status: 'import_pending', ref: 'media://m2' });

		await run({
			operation: 'importFromUrl',
			projectId: project,
			url: 'https://example.com/a.png',
			fileName: 'x.png',
		}).result;
		expect(lastCall().body).toEqual({ url: 'https://example.com/a.png', fileName: 'x.png' });
	});
});

describe('get, getUsage and delete', () => {
	it('get returns the media with its reference', async () => {
		api.stub('GET', /media\/m3$/, { id: 'm3', fileName: 'a.png' });
		const [[out]] = await run({ operation: 'get', mediaId: 'm3' }).result;
		expect(out.json).toEqual({ id: 'm3', fileName: 'a.png', ref: 'media://m3' });
	});

	it('getUsage reports storage use', async () => {
		api.stub('GET', /media\/usage$/, { usedBytes: 10, limitBytes: 100, plan: 'free' });
		const [[out]] = await run({ operation: 'getUsage', projectId: project }).result;
		expect(out.json).toEqual({ usedBytes: 10, limitBytes: 100, plan: 'free' });
	});

	it('delete reports what was deleted', async () => {
		api.stub('DELETE', /media\/m3$/, '');
		const [[out]] = await run({ operation: 'delete', mediaId: 'm3' }).result;
		expect(out.json).toEqual({ success: true, mediaId: 'm3' });
	});

	it('escapes the media id so an expression cannot change the path', async () => {
		api.stub('GET', /.*/, {});
		await run({ operation: 'get', mediaId: '../../api-keys' }).result;
		expect(lastCall().path).toBe('/v1/media/..%2F..%2Fapi-keys');
	});
});

describe('getAll (cursor pagination)', () => {
	const pages = (sizes: number[]) =>
		api.stub('GET', /\/media$/, (call: { query: Record<string, unknown> }) => {
			const index = call.query.cursor ? Number(call.query.cursor) : 0;
			return {
				data: Array.from({ length: sizes[index] }, (_, i) => ({ id: `m${index}-${i}` })),
				hasMore: index < sizes.length - 1,
				nextCursor: index < sizes.length - 1 ? String(index + 1) : null,
			};
		});
	const getAll = async (params: Record<string, unknown>) =>
		(await run({ operation: 'getAll', projectId: project, ...params }).result)[0];

	it('follows cursors for Return All', async () => {
		pages([100, 100, 30]);
		expect(await getAll({ returnAll: true })).toHaveLength(230);
		expect(api.calls.map((c) => [c.query.cursor, c.query.limit])).toEqual([
			[undefined, 100],
			['1', 100],
			['2', 100],
		]);
	});

	it('stops once it has the limit, asking for no more than it needs', async () => {
		pages([100, 100]);
		const items = await getAll({ returnAll: false, limit: 25 });
		expect(items).toHaveLength(25);
		expect(api.calls).toHaveLength(1);
		expect(api.calls[0].query.limit).toBe(25);
	});

	it('gives every item a reference and passes filters through', async () => {
		pages([2]);
		const items = await getAll({
			returnAll: false,
			limit: 10,
			filters: { status: 'uploaded', attached: false },
		});
		expect(items.map((i) => i.json.ref)).toEqual(['media://m0-0', 'media://m0-1']);
		expect(api.calls[0].query).toMatchObject({ status: 'uploaded', attached: false });
	});

	it('does not loop when the API claims more pages but gives no cursor', async () => {
		api.stub('GET', /\/media$/, { data: [{ id: 'a' }], hasMore: true, nextCursor: null });
		expect(await getAll({ returnAll: true })).toHaveLength(1);
		expect(api.calls).toHaveLength(1);
	});
});

describe('download', () => {
	const download = (descriptor: Record<string, unknown>, body = Buffer.from('BYTES')) => {
		api.stub('GET', /media\/m4$/, descriptor);
		return run({ operation: 'download', mediaId: 'm4', binaryPropertyName: 'file' }, (helpers) => {
			helpers.httpRequest.mockResolvedValue(body);
			helpers.prepareBinaryData.mockResolvedValue({
				data: 'b64',
				fileName: 'cat.png',
				mimeType: 'image/png',
			});
		});
	};

	it('fetches the bytes from the signed URL and returns them as binary data', async () => {
		const { result, raw } = download({
			id: 'm4',
			url: STORAGE_URL,
			fileName: 'cat.png',
			contentType: 'image/png',
		});
		const [[out]] = await result;

		expect(raw.helpers.httpRequest).toHaveBeenCalledWith({
			url: STORAGE_URL,
			encoding: 'arraybuffer',
			json: false,
		});
		expect(raw.helpers.prepareBinaryData).toHaveBeenCalledWith(
			Buffer.from('BYTES'),
			'cat.png',
			'image/png',
		);
		expect(out.binary).toEqual({
			file: { data: 'b64', fileName: 'cat.png', mimeType: 'image/png' },
		});
		expect(out.json).toMatchObject({ id: 'm4', ref: 'media://m4' });
		expect(out.pairedItem).toEqual({ item: 0 });
	});

	it('never sends the SwipeFlow API key to the storage host', async () => {
		const { result, raw, httpRequestWithAuthentication } = download({ id: 'm4', url: STORAGE_URL });
		await result;
		expect(
			httpRequestWithAuthentication.mock.calls.every(
				([, request]) => !String(request.url).includes('storage.example.com'),
			),
		).toBe(true);
		expect(JSON.stringify(raw.helpers.httpRequest.mock.calls)).not.toContain('test-key');
	});

	it('explains a media object that is not ready, and downloads nothing', async () => {
		const { result, raw } = download({ id: 'm4', url: null, status: 'import_pending' });
		await expect(result).rejects.toThrow(NodeOperationError);
		await expect(
			download({ id: 'm4', url: null, status: 'import_pending' }).result,
		).rejects.toThrow('no download URL');
		expect(raw.helpers.httpRequest).not.toHaveBeenCalled();
	});
});
