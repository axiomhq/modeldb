import { describe, expect, it, beforeAll } from 'vitest';
import { createTestApp } from './helpers/test-app';
import { makeRequest } from './helpers/api';
import type { OpenAPIHono } from '@hono/zod-openapi';

describe('Environment-specific behavior', () => {
	describe('Development environment', () => {
		let app: OpenAPIHono;

		beforeAll(() => {
			app = createTestApp({ env: 'dev' });
		});

		it('should not include caching headers', async () => {
			const response = await makeRequest(app, '/api/models');

			expect(response.headers.get('cache-control')).toBeNull();
			expect(response.headers.get('etag')).toBeNull();
		});

		it('should include CORS headers', async () => {
			const response = await makeRequest(app, '/api/models');

			expect(response.headers.get('access-control-allow-origin')).toBe('*');
		});

		it('should handle OPTIONS requests for CORS', async () => {
			const response = await makeRequest(app, '/api/models', { method: 'OPTIONS' });

			expect(response.status).toBe(204);
			expect(response.headers.get('access-control-allow-origin')).toBe('*');
			expect(response.headers.get('access-control-allow-methods')).toBe('GET,OPTIONS');
			expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type');
		});

		it('should return detailed error messages', async () => {
			const response = await makeRequest(app, '/api/models?deprecated=invalid');
			expect(response.status).toBe(200);
		});
	});
});
