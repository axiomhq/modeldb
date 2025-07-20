import { describe, expect, it } from 'vitest';
import { fillNullsWithZeros, projectModelFields, projectModelsFields } from '../src/model-utils';
import type { Model } from '../src/schema';

describe('model-utils', () => {
  describe('fillNullsWithZeros', () => {
    it('should replace null values in cost fields with 0', () => {
      const model = {
        model_id: 'test-model',
        input_cost_per_token: null,
        output_cost_per_million: null,
        cache_read_cost_per_token: null,
        cache_write_cost_per_million: null,
      };

      const result = fillNullsWithZeros(model);

      expect(result.model_id).toBe('test-model');
      expect(result.input_cost_per_token).toBe(0);
      expect(result.output_cost_per_million).toBe(0);
      expect(result.cache_read_cost_per_token).toBe(0);
      expect(result.cache_write_cost_per_million).toBe(0);
    });

    it('should replace null values in token fields with 0', () => {
      const model = {
        max_input_tokens: null,
        max_output_tokens: null,
        some_tokens_field: null,
      };

      const result = fillNullsWithZeros(model);

      expect(result.max_input_tokens).toBe(0);
      expect(result.max_output_tokens).toBe(0);
      expect(result.some_tokens_field).toBe(0);
    });

    it('should preserve non-null numeric values', () => {
      const model = {
        input_cost_per_token: 0.00003,
        output_cost_per_million: 60,
        max_input_tokens: 8192,
      };

      const result = fillNullsWithZeros(model);

      expect(result.input_cost_per_token).toBe(0.00003);
      expect(result.output_cost_per_million).toBe(60);
      expect(result.max_input_tokens).toBe(8192);
    });

    it('should not affect non-numeric fields', () => {
      const model = {
        model_id: null,
        model_name: null,
        provider_id: null,
        deprecation_date: null,
      };

      const result = fillNullsWithZeros(model);

      expect(result.model_id).toBeNull();
      expect(result.model_name).toBeNull();
      expect(result.provider_id).toBeNull();
      expect(result.deprecation_date).toBeNull();
    });

    it('should handle nested objects', () => {
      const model = {
        id: 'test',
        costs: {
          input_cost_per_token: null,
          output_cost_per_token: 0.00001,
        },
        metadata: {
          version: null,
          tokens_limit: null,
        },
      };

      const result = fillNullsWithZeros(model);

      expect(result.costs.input_cost_per_token).toBe(0);
      expect(result.costs.output_cost_per_token).toBe(0.00001);
      expect(result.metadata.version).toBeNull();
      expect(result.metadata.tokens_limit).toBe(0);
    });

    it('should handle arrays', () => {
      const models = [
        { model_id: 'test1', input_cost_per_token: null },
        { model_id: 'test2', input_cost_per_token: 0.00001 },
      ];

      const result = fillNullsWithZeros(models);

      expect(result[0].input_cost_per_token).toBe(0);
      expect(result[1].input_cost_per_token).toBe(0.00001);
    });

    it('should handle null and undefined inputs', () => {
      expect(fillNullsWithZeros(null)).toBeNull();
      expect(fillNullsWithZeros(undefined)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(fillNullsWithZeros('string')).toBe('string');
      expect(fillNullsWithZeros(123)).toBe(123);
      expect(fillNullsWithZeros(true)).toBe(true);
    });

    it('should detect numeric fields case-insensitively', () => {
      const model = {
        INPUT_COST_PER_TOKEN: null,
        Max_Output_Tokens: null,
        costPerMillion: null,
      };

      const result = fillNullsWithZeros(model);

      expect(result.INPUT_COST_PER_TOKEN).toBe(0);
      expect(result.Max_Output_Tokens).toBe(0);
      expect(result.costPerMillion).toBe(0);
    });
  });

  describe('projectModelFields', () => {
    const sampleModel: Model = {
      model_id: 'gpt-4',
      model_name: 'GPT-4',
      provider_id: 'openai',
      provider_name: 'OpenAI',
      model_type: 'chat',
      max_input_tokens: 8192,
      max_output_tokens: 4096,
      input_cost_per_token: 0.00003,
      input_cost_per_million: 30,
      output_cost_per_token: 0.00006,
      output_cost_per_million: 60,
      cache_read_cost_per_token: null,
      cache_read_cost_per_million: null,
      cache_write_cost_per_token: null,
      cache_write_cost_per_million: null,
      supports_function_calling: true,
      supports_vision: false,
      supports_json_mode: true,
      supports_parallel_functions: true,
      deprecation_date: null,
    };

    it('should project single field', () => {
      const result = projectModelFields(sampleModel, ['model_id']);

      expect(Object.keys(result)).toEqual(['model_id']);
      expect(result.model_id).toBe('gpt-4');
    });

    it('should project multiple fields', () => {
      const result = projectModelFields(sampleModel, ['model_id', 'provider_id', 'model_type']);

      expect(Object.keys(result).sort()).toEqual(['model_id', 'model_type', 'provider_id']);
      expect(result.model_id).toBe('gpt-4');
      expect(result.provider_id).toBe('openai');
      expect(result.model_type).toBe('chat');
    });

    it('should ignore non-existent fields', () => {
      const result = projectModelFields(sampleModel, ['model_id', 'non_existent_field', 'provider_id']);

      expect(Object.keys(result).sort()).toEqual(['model_id', 'provider_id']);
      expect(result.model_id).toBe('gpt-4');
      expect(result.provider_id).toBe('openai');
    });

    it('should handle empty field list', () => {
      const result = projectModelFields(sampleModel, []);

      expect(Object.keys(result)).toEqual([]);
      expect(result).toEqual({});
    });

    it('should preserve field values including nulls', () => {
      const result = projectModelFields(sampleModel, ['cache_read_cost_per_token', 'deprecation_date']);

      expect(result.cache_read_cost_per_token).toBeNull();
      expect(result.deprecation_date).toBeNull();
    });

    it('should work with partial models', () => {
      const partialModel = {
        model_id: 'test',
        provider_id: 'test-provider',
      };

      const result = projectModelFields(partialModel, ['model_id', 'provider_id', 'model_type']);

      expect(Object.keys(result).sort()).toEqual(['model_id', 'provider_id']);
      expect(result.model_id).toBe('test');
      expect(result.provider_id).toBe('test-provider');
    });
  });

  describe('projectModelsFields', () => {
    const sampleModels = [
      {
        model_id: 'gpt-4',
        provider_id: 'openai',
        model_type: 'chat' as const,
      },
      {
        model_id: 'claude-3',
        provider_id: 'anthropic',
        model_type: 'chat' as const,
      },
      {
        model_id: 'text-embedding-ada',
        provider_id: 'openai',
        model_type: 'embedding' as const,
      },
    ];

    it('should project fields from multiple models', () => {
      const result = projectModelsFields(sampleModels, ['model_id', 'provider_id']);

      expect(result).toHaveLength(3);
      result.forEach((model, index) => {
        expect(Object.keys(model).sort()).toEqual(['model_id', 'provider_id']);
        expect(model.model_id).toBe(sampleModels[index].model_id);
        expect(model.provider_id).toBe(sampleModels[index].provider_id);
      });
    });

    it('should handle empty model array', () => {
      const result = projectModelsFields([], ['model_id']);

      expect(result).toEqual([]);
    });

    it('should handle single field projection', () => {
      const result = projectModelsFields(sampleModels, ['model_type']);

      expect(result).toHaveLength(3);
      result.forEach((model, index) => {
        expect(Object.keys(model)).toEqual(['model_type']);
        expect(model.model_type).toBe(sampleModels[index].model_type);
      });
    });

    it('should ignore non-existent fields consistently', () => {
      const result = projectModelsFields(sampleModels, ['model_id', 'non_existent']);

      expect(result).toHaveLength(3);
      result.forEach((model, index) => {
        expect(Object.keys(model)).toEqual(['model_id']);
        expect(model.model_id).toBe(sampleModels[index].model_id);
      });
    });
  });
});