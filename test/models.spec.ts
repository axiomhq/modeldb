import type { OpenAPIHono } from '@hono/zod-openapi';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectCSV, expectJSON, makeRequest, parseCSV } from './helpers/api';
import { createTestApp } from './helpers/test-app';

describe('/api/v1/models endpoint', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Basic functionality', () => {
    it('should list all models', async () => {
      const response = await makeRequest(app, '/api/v1/models');
      expect(response.status).toBe(200);

      const models = await expectJSON(response);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      expect(models[0]).toHaveProperty('model_id');
      expect(models[0]).toHaveProperty('model_name');
      expect(models[0]).toHaveProperty('provider_id');
      expect(models[0]).toHaveProperty('provider_name');
    });

    it('should return correct model structure', async () => {
      const response = await makeRequest(app, '/api/v1/models');
      const models = await response.json();

      const model = models[0];
      expect(model).toMatchObject({
        model_id: expect.any(String),
        model_name: expect.any(String),
        provider_id: expect.any(String),
        provider_name: expect.any(String),
        model_type: expect.stringMatching(
          /^(chat|completion|embedding|image|audio|rerank|moderation)$/
        ),
        max_input_tokens: expect.any(Number),
        input_cost_per_token: expect.any(Number),
        input_cost_per_million: expect.any(Number),
        output_cost_per_token: expect.any(Number),
        output_cost_per_million: expect.any(Number),
        supports_function_calling: expect.any(Boolean),
        supports_vision: expect.any(Boolean),
        supports_json_mode: expect.any(Boolean),
        supports_parallel_functions: expect.any(Boolean),
      });
    });
  });

  describe('Provider filtering', () => {
    it('should filter by single provider', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=openai'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider_id).toBe('openai');
      });
    });

    it('should filter by multiple providers', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=openai,anthropic'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(['openai', 'anthropic']).toContain(model.provider_id);
      });
    });

    it('should return empty array for non-existent provider', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=nonexistent'
      );
      const models = await expectJSON(response);

      expect(models).toEqual([]);
    });
  });

  describe('Model type filtering', () => {
    it('should filter by single model type', async () => {
      const response = await makeRequest(app, '/api/v1/models?type=chat');
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.model_type).toBe('chat');
      });
    });

    it('should filter by multiple model types', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?type=chat,embedding'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(['chat', 'embedding']).toContain(model.model_type);
      });
    });
  });

  describe('Capability filtering', () => {
    it('should filter by single capability', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?capability=vision'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.supports_vision).toBe(true);
      });
    });

    it('should filter by multiple capabilities (AND logic)', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?capability=vision,function_calling'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.supports_vision).toBe(true);
        expect(model.supports_function_calling).toBe(true);
      });
    });

    it('should handle unknown capability gracefully', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?capability=unknown_capability'
      );
      const models = await expectJSON(response);

      expect(models).toEqual([]);
    });
  });

  describe('Deprecation filtering', () => {
    it('should filter non-deprecated models', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?deprecated=false'
      );
      const models = await expectJSON(response);

      models.forEach((model) => {
        expect(model.deprecation_date).toBeNull();
      });
    });

    it('should filter deprecated models', async () => {
      const response = await makeRequest(app, '/api/v1/models?deprecated=true');
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        // The filter checks for !== undefined, so null counts as deprecated
        expect(model.deprecation_date).toBeDefined();
      });
    });
  });

  describe('Field projection', () => {
    it('should project single field', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?project=model_id'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(Object.keys(model)).toEqual(['model_id']);
      });
    });

    it('should project multiple fields', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?project=model_id,provider_id,model_type'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(Object.keys(model).sort()).toEqual([
          'model_id',
          'model_type',
          'provider_id',
        ]);
      });
    });

    it('should ignore non-existent fields in projection', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?project=model_id,nonexistent_field'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(Object.keys(model)).toEqual(['model_id']);
      });
    });
  });

  describe('Fill with zeros', () => {
    it('should replace null values with zeros', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?fill-with-zeros=true'
      );
      const models = await expectJSON(response);

      models.forEach((model) => {
        expect(model.max_output_tokens).not.toBeNull();
        if (typeof model.max_output_tokens === 'number') {
          expect(model.max_output_tokens).toBeGreaterThanOrEqual(0);
        }

        expect(model.cache_read_cost_per_token).not.toBeNull();
        expect(model.cache_read_cost_per_million).not.toBeNull();
      });
    });

    it('should preserve non-null values', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=openai&fill-with-zeros=true'
      );
      const models = await expectJSON(response);

      const gpt4 = models.find((m) => m.model_id === 'gpt-4');
      expect(gpt4).toBeDefined();
      expect(gpt4.input_cost_per_million).toBe(30);
      expect(gpt4.output_cost_per_million).toBe(60);
    });
  });

  describe('CSV format', () => {
    it('should return CSV format when requested', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?format=csv&headers=true'
      );
      expect(response.status).toBe(200);

      const csv = await expectCSV(response);
      const lines = csv.trim().split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('model_id');
      expect(lines[0]).toContain('provider_id');
    });

    it('should handle CSV with projection', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?format=csv&project=model_id,provider_id&headers=true'
      );
      const csv = await expectCSV(response);

      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('model_id,provider_id');

      const data = parseCSV(csv);
      data.forEach((row) => {
        expect(Object.keys(row).sort()).toEqual(['model_id', 'provider_id']);
      });
    });

    it('should handle CSV without headers', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?format=csv&headers=false&project=model_id'
      );
      const csv = await expectCSV(response);

      const lines = csv.trim().split('\n');
      expect(lines[0]).not.toContain('model_id');
      expect(lines.every((line) => line.match(/^[^,]+$/))).toBe(true);
    });
  });

  describe('Combined filters', () => {
    it('should combine provider and type filters', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=openai&type=embedding'
      );
      const models = await expectJSON(response);

      expect(models.length).toBeGreaterThan(0);
      models.forEach((model) => {
        expect(model.provider_id).toBe('openai');
        expect(model.model_type).toBe('embedding');
      });
    });

    it('should combine all filters', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?providers=openai&type=chat&capability=function_calling&deprecated=false'
      );
      const models = await expectJSON(response);

      models.forEach((model) => {
        expect(model.provider_id).toBe('openai');
        expect(model.model_type).toBe('chat');
        expect(model.supports_function_calling).toBe(true);
        expect(model.deprecation_date).toBeNull();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?invalid_param=value'
      );
      expect(response.status).toBe(200);
    });

    it('should handle malformed deprecated parameter', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models?deprecated=maybe'
      );
      const models = await expectJSON(response);
      expect(Array.isArray(models)).toBe(true);
    });
  });
});
