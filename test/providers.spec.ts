import type { OpenAPIHono } from '@hono/zod-openapi';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectCSV, expectJSON, makeRequest, parseCSV } from './helpers/api';
import { createTestApp } from './helpers/test-app';

describe('/api/v1/providers endpoints', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/v1/providers', () => {
    describe('Basic functionality', () => {
      it('should list all providers', async () => {
        const response = await makeRequest(app, '/api/v1/providers');
        expect(response.status).toBe(200);

        const providers = await expectJSON(response);
        expect(typeof providers).toBe('object');
        expect(Object.keys(providers).length).toBeGreaterThan(0);

        Object.entries(providers).forEach(([_providerId, models]) => {
          expect(Array.isArray(models)).toBe(true);
          expect(models.length).toBeGreaterThan(0);
        });
      });

      it('should include correct provider information', async () => {
        const response = await makeRequest(app, '/api/v1/providers');
        const providers = await expectJSON(response);

        expect(providers.openai).toBeDefined();
        expect(Array.isArray(providers.openai)).toBe(true);
        expect(providers.openai.length).toBeGreaterThan(0);

        expect(providers.anthropic).toBeDefined();
        expect(Array.isArray(providers.anthropic)).toBe(true);
      });

      it('should return providers in consistent order', async () => {
        const response1 = await makeRequest(app, '/api/v1/providers');
        const providers1 = await expectJSON(response1);

        const response2 = await makeRequest(app, '/api/v1/providers');
        const providers2 = await expectJSON(response2);

        expect(Object.keys(providers1)).toEqual(Object.keys(providers2));
      });
    });

    describe('CSV format', () => {
      it('should return CSV format when requested', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers?format=csv&headers=true'
        );
        expect(response.status).toBe(200);

        const csv = await expectCSV(response);
        const lines = csv.trim().split('\n');

        expect(lines.length).toBeGreaterThan(1);
        expect(lines[0]).toContain('provider');
        expect(lines[0]).toContain('model_id');
      });

      it('should handle CSV without headers', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers?format=csv&headers=false'
        );
        const csv = await expectCSV(response);

        const lines = csv.trim().split('\n');
        expect(lines[0]).not.toContain('provider');

        expect(lines.length).toBeGreaterThan(0);
      });
    });
  });

  describe('GET /api/v1/providers/:id', () => {
    describe('Basic functionality', () => {
      it('should return models for a specific provider', async () => {
        const response = await makeRequest(app, '/api/v1/providers/openai');
        expect(response.status).toBe(200);

        const models = await expectJSON(response);
        expect(Array.isArray(models)).toBe(true);
        expect(models.length).toBeGreaterThan(0);

        models.forEach((model) => {
          expect(model.provider_id).toBe('openai');
          expect(model.provider_name).toBe('OpenAI');
        });
      });

      it('should return 404 for non-existent provider', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/non-existent-provider'
        );
        expect(response.status).toBe(404);

        const error = await expectJSON(response);
        expect(error).toEqual({ error: 'Provider not found' });
      });

      it('should handle different provider IDs', async () => {
        const providers = ['openai', 'anthropic', 'google', 'cohere'];

        for (const providerId of providers) {
          const response = await makeRequest(
            app,
            `/api/providers/${providerId}`
          );
          if (response.status === 200) {
            const models = await expectJSON(response);
            expect(models.every((m) => m.provider_id === providerId)).toBe(
              true
            );
          }
        }
      });
    });

    describe('Query parameters', () => {
      it('should support field projection', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/openai?project=model_id,model_type'
        );
        const models = await expectJSON(response);

        expect(models.length).toBeGreaterThan(0);
        models.forEach((model) => {
          expect(Object.keys(model).sort()).toEqual(['model_id', 'model_type']);
        });
      });

      it('should support fill-with-zeros', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/openai?fill-with-zeros=true'
        );
        const models = await expectJSON(response);

        models.forEach((model) => {
          expect(model.cache_read_cost_per_token).toBe(0);
          expect(model.cache_write_cost_per_token).toBe(0);
        });
      });
    });

    describe('CSV format', () => {
      it('should return CSV format for provider models', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/openai?format=csv&headers=true'
        );
        expect(response.status).toBe(200);

        const csv = await expectCSV(response);
        const lines = csv.trim().split('\n');

        expect(lines.length).toBeGreaterThan(1);
        expect(lines[0]).toContain('model_id');

        const data = parseCSV(csv);
        data.forEach((row) => {
          expect(row.provider_id).toBe('openai');
        });
      });

      it('should handle CSV with projection', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/openai?format=csv&project=model_id,model_type&headers=true'
        );
        const csv = await expectCSV(response);

        const lines = csv.trim().split('\n');
        expect(lines[0]).toBe('model_id,model_type');
      });

      it('should return CSV error format for 404', async () => {
        const response = await makeRequest(
          app,
          '/api/v1/providers/non-existent?format=csv'
        );
        expect(response.status).toBe(404);

        const csv = await expectCSV(response);
        expect(csv).toBe('error\n"Provider not found"');
      });
    });

    describe('Error handling', () => {
      it('should handle URL encoding in provider IDs', async () => {
        const response = await makeRequest(app, '/api/v1/providers/openai');
        expect(response.status).toBe(200);
      });

      it('should handle provider ID case sensitivity', async () => {
        const response = await makeRequest(app, '/api/v1/providers/OpenAI');
        expect(response.status).toBe(404);
      });
    });
  });
});
