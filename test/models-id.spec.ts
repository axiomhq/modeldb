import type { OpenAPIHono } from '@hono/zod-openapi';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectCSV, expectJSON, makeRequest, parseCSV } from './helpers/api';
import { createTestApp } from './helpers/test-app';

describe('/api/v1/models/:id endpoint', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Basic functionality', () => {
    it('should return a specific model by ID', async () => {
      const response = await makeRequest(app, '/api/v1/models/gpt-4');
      expect(response.status).toBe(200);

      const model = await expectJSON(response);
      expect(model.model_id).toBe('gpt-4');
      expect(model.model_name).toBe('GPT-4');
      expect(model.provider_id).toBe('openai');
    });

    it('should return 404 for non-existent model', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/non-existent-model'
      );
      expect(response.status).toBe(404);

      const error = await expectJSON(response);
      expect(error).toEqual({ error: 'Model not found' });
    });

    it('should handle special characters in model ID', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-3.5-turbo-0301'
      );
      expect(response.status).toBe(200);

      const model = await expectJSON(response);
      expect(model.model_id).toBe('gpt-3.5-turbo-0301');
    });
  });

  describe('Field projection', () => {
    it('should project single field', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?project=model_id'
      );
      const model = await expectJSON(response);

      expect(Object.keys(model)).toEqual(['model_id']);
      expect(model.model_id).toBe('gpt-4');
    });

    it('should project multiple fields', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?project=model_id,provider_id,input_cost_per_million'
      );
      const model = await expectJSON(response);

      expect(Object.keys(model).sort()).toEqual([
        'input_cost_per_million',
        'model_id',
        'provider_id',
      ]);
      expect(model.model_id).toBe('gpt-4');
      expect(model.provider_id).toBe('openai');
      expect(model.input_cost_per_million).toBe(30);
    });

    it('should handle non-existent fields in projection', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?project=model_id,non_existent_field'
      );
      const model = await expectJSON(response);

      expect(Object.keys(model)).toEqual(['model_id']);
    });
  });

  describe('Fill with zeros', () => {
    it('should replace null values with zeros', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?fill-with-zeros=true'
      );
      const model = await expectJSON(response);

      expect(model.cache_read_cost_per_token).toBe(0);
      expect(model.cache_read_cost_per_million).toBe(0);
      expect(model.cache_write_cost_per_token).toBe(0);
      expect(model.cache_write_cost_per_million).toBe(0);
    });

    it('should preserve non-null values', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?fill-with-zeros=true'
      );
      const model = await expectJSON(response);

      expect(model.input_cost_per_million).toBe(30);
      expect(model.output_cost_per_million).toBe(60);
      expect(model.max_input_tokens).toBe(8192);
    });

    it('should work with projection', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/claude-3-opus?project=model_id,cache_read_cost_per_million&fill-with-zeros=true'
      );
      const model = await expectJSON(response);

      expect(Object.keys(model).sort()).toEqual([
        'cache_read_cost_per_million',
        'model_id',
      ]);
      expect(model.cache_read_cost_per_million).toBe(1.5);
    });
  });

  describe('CSV format', () => {
    it('should return CSV format for single model', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?format=csv&headers=true'
      );
      expect(response.status).toBe(200);

      const csv = await expectCSV(response);
      const lines = csv.trim().split('\n');

      expect(lines.length).toBeGreaterThan(0);
      expect(csv).toContain('model_id');
      expect(csv).toContain('gpt-4');
    });

    it('should handle CSV with projection', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?format=csv&project=model_id,provider_id&headers=true'
      );
      const csv = await expectCSV(response);

      const lines = csv.trim().split('\n');
      expect(lines[0]).toBe('model_id,provider_id');
      expect(lines[1]).toBe('gpt-4,openai');
    });

    it('should handle CSV without headers', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?format=csv&headers=false&project=model_id'
      );
      const csv = await expectCSV(response);

      const lines = csv.trim().split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('gpt-4');
    });

    it('should return CSV error format for 404', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/non-existent?format=csv'
      );
      expect(response.status).toBe(404);

      const csv = await expectCSV(response);
      expect(csv).toBe('error\n"Model not found"');
    });
  });

  describe('Model with special properties', () => {
    it('should handle embedding model without output costs', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/text-embedding-ada-002'
      );
      const model = await expectJSON(response);

      expect(model.model_type).toBe('embedding');
      expect(model.output_cost_per_token).toBe(0);
      expect(model.output_cost_per_million).toBe(0);
      expect(model.max_output_tokens).toBe(0);
    });

    it('should handle deprecated model', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-3.5-turbo-0301'
      );
      const model = await expectJSON(response);

      expect(model.deprecation_date).toBe('2024-06-13');
      expect(model.supports_function_calling).toBe(false);
    });

    it('should handle model with cache pricing', async () => {
      const response = await makeRequest(app, '/api/v1/models/claude-3-opus');
      const model = await expectJSON(response);

      expect(model.cache_read_cost_per_token).toBe(0.0000015);
      expect(model.cache_read_cost_per_million).toBe(1.5);
      expect(model.cache_write_cost_per_token).toBe(0.00001875);
      expect(model.cache_write_cost_per_million).toBe(18.75);
    });
  });

  describe('Error handling', () => {
    it('should handle URL encoding in model IDs', async () => {
      const encodedId = encodeURIComponent('gpt-3.5-turbo-0301');
      const response = await makeRequest(app, `/api/v1/models/${encodedId}`);
      expect(response.status).toBe(200);

      const model = await expectJSON(response);
      expect(model.model_id).toBe('gpt-3.5-turbo-0301');
    });

    it('should handle empty model ID', async () => {
      // With trailing slash, it actually returns 404
      const response = await makeRequest(app, '/api/v1/models/');
      expect(response.status).toBe(404);
    });

    it('should validate query parameters', async () => {
      const response = await makeRequest(
        app,
        '/api/v1/models/gpt-4?fill-with-zeros=invalid'
      );
      expect(response.status).toBe(200);

      const model = await expectJSON(response);
      expect(model.cache_read_cost_per_token).toBe(0);
    });
  });
});
