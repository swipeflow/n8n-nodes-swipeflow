import { defineConfig } from 'vitest/config';

export default defineConfig({
	// n8n-workflow ships sourcemaps that point at sources it does not publish; vite warns about each one.
	logLevel: 'error',
	test: {
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			// text: CI log. lcov: Codecov (or any other lcov-consuming service). json-summary/json:
			// davelosert/vitest-coverage-report-action's PR comment and step summary.
			reporter: ['text', 'lcov', 'json-summary', 'json'],
			all: true,
			include: ['nodes/**/*.ts', 'credentials/**/*.ts'],
			// Vendored from @swipeflow/sdk by scripts/sync-sdk.mjs — not our code, not our tests to write.
			exclude: ['nodes/SwipeFlow/sdk/models/**', 'nodes/SwipeFlow/sdk/models.ts', 'nodes/SwipeFlow/sdk/media.ts'],
		},
	},
});
