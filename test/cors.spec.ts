import type { OpenAPIHono } from '@hono/zod-openapi';
import { beforeAll, describe, expect, it } from 'vitest';
import { makeRequest } from './helpers/api';
import { createTestApp } from './helpers/test-app';

describe('CORS configuration', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('preflight requests', () => {
    it('should handle OPTIONS requests for all endpoints', async () => {
      const endpoints = [
        '/api/v1/models',
        '/api/v1/models/test-model',
        '/api/v1/providers',
        '/api/v1/providers/openai',
        '/api/v1/metadata',
        '/openapi.json',
        '/',
      ];

      for (const endpoint of endpoints) {
        const response = await makeRequest(app, endpoint, {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization, Content-Type',
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
          'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD'
        );
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
        expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
      }
    });
  });

  describe('actual requests', () => {
    it('should include CORS headers in GET requests', async () => {
      const response = await makeRequest(app, '/api/v1/models', {
        headers: {
          Origin: 'https://example.com',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should accept requests from any origin', async () => {
      const origins = [
        'https://example.com',
        'http://localhost:3000',
        'https://app.production.com',
        'file://',
        'null',
      ];

      for (const origin of origins) {
        const response = await makeRequest(app, '/api/v1/metadata', {
          headers: {
            Origin: origin,
          },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      }
    });

    it('should accept requests with any headers', async () => {
      const response = await makeRequest(app, '/api/v1/providers', {
        headers: {
          Origin: 'https://example.com',
          'X-Custom-Header': 'custom-value',
          Authorization: 'Bearer token123',
          'X-Api-Key': 'api-key-123',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('POST/PUT/DELETE requests', () => {
    it('should handle non-GET methods in preflight', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await makeRequest(app, '/api/v1/models', {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://example.com',
            'Access-Control-Request-Method': method,
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
          'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD'
        );
      }
    });
  });

  describe('complex headers', () => {
    it('should allow any combination of headers', async () => {
      const response = await makeRequest(app, '/api/v1/models', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers':
            'Authorization, X-Custom-Header, X-Api-Key, Content-Type, Accept, User-Agent',
        },
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
    });
  });

  describe('home page', () => {
    it('should include CORS headers on home page', async () => {
      const response = await makeRequest(app, '/', {
        headers: {
          Origin: 'https://example.com',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('error responses', () => {
    it('should include CORS headers on 404 responses', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/non-existent-model',
        {
          headers: {
            Origin: 'https://example.com',
          },
        }
      );

      expect(response.status).toBe(404);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should include CORS headers on validation errors', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?format=invalid-format',
        {
          headers: {
            Origin: 'https://example.com',
          },
        }
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
