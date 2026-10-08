import { describe, expect, it } from 'vitest';
import { type LiteLLMModel, transformModel } from '../src/sync';

function litellm(fields: Record<string, unknown>): LiteLLMModel {
  return {
    litellm_provider: 'anthropic',
    mode: 'chat',
    input_cost_per_token: 0.000_003,
    output_cost_per_token: 0.000_015,
    ...fields,
  } as LiteLLMModel;
}

describe('transformModel pricing fields', () => {
  it('keeps a genuine cache price of 0 instead of turning it into null', () => {
    const model = transformModel(
      'zero-cache-model',
      litellm({
        cache_read_input_token_cost: 0,
        cache_creation_input_token_cost: 0,
      })
    );

    expect(model?.cache_read_cost_per_token).toBe(0);
    expect(model?.cache_read_cost_per_million).toBe(0);
    expect(model?.cache_write_cost_per_token).toBe(0);
    expect(model?.cache_write_cost_per_million).toBe(0);
  });

  it('maps missing cache prices to null', () => {
    const model = transformModel('no-cache-model', litellm({}));

    expect(model?.cache_read_cost_per_token).toBeNull();
    expect(model?.cache_read_cost_per_million).toBeNull();
    expect(model?.cache_write_cost_per_token).toBeNull();
    expect(model?.cache_write_cost_per_million).toBeNull();
  });

  it('maps cache prices and drops the original LiteLLM keys', () => {
    const model = transformModel(
      'claude-sonnet-4-5',
      litellm({
        cache_read_input_token_cost: 3e-7,
        cache_creation_input_token_cost: 3.75e-6,
      })
    );

    expect(model?.cache_read_cost_per_token).toBe(3e-7);
    expect(model?.cache_read_cost_per_million).toBeCloseTo(0.3);
    expect(model?.cache_write_cost_per_token).toBe(3.75e-6);
    expect(model?.cache_write_cost_per_million).toBeCloseTo(3.75);
    expect(model?.cache_read_input_token_cost).toBeUndefined();
    expect(model?.cache_creation_input_token_cost).toBeUndefined();
  });

  it('passes long-context (above 200k) prices through', () => {
    const model = transformModel(
      'claude-sonnet-4-5',
      litellm({
        input_cost_per_token_above_200k_tokens: 6e-6,
        output_cost_per_token_above_200k_tokens: 2.25e-5,
        cache_read_input_token_cost_above_200k_tokens: 6e-7,
        cache_creation_input_token_cost_above_200k_tokens: 7.5e-6,
      })
    );

    expect(model?.input_cost_per_token_above_200k_tokens).toBe(6e-6);
    expect(model?.output_cost_per_token_above_200k_tokens).toBe(2.25e-5);
    expect(model?.cache_read_input_token_cost_above_200k_tokens).toBe(6e-7);
    expect(model?.cache_creation_input_token_cost_above_200k_tokens).toBe(
      7.5e-6
    );
  });

  it('sets missing or non-numeric long-context prices to null so the keys are always present', () => {
    const model = transformModel(
      'gpt-4o',
      litellm({
        litellm_provider: 'openai',
        output_cost_per_token_above_200k_tokens: 'not-a-number',
      })
    );

    expect(model).toMatchObject({
      input_cost_per_token_above_200k_tokens: null,
      output_cost_per_token_above_200k_tokens: null,
      cache_read_input_token_cost_above_200k_tokens: null,
      cache_creation_input_token_cost_above_200k_tokens: null,
    });
  });
});
