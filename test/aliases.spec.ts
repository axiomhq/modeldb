import { describe, expect, it } from 'vitest';
import {
  type AliasesArtifact,
  buildAliasesArtifact,
  EMPTY_ALIASES,
  generateCandidates,
  resolveModelId,
} from '../src/aliases';
import type { Model } from '../src/schema';

const mockModel = (id: string): Model =>
  ({
    model_id: id,
    model_name: id,
    provider_id: 'test',
    provider_name: 'Test',
    input_cost_per_token: 0,
    input_cost_per_million: 0,
    output_cost_per_token: 0,
    output_cost_per_million: 0,
    supports_function_calling: false,
    supports_vision: false,
    supports_json_mode: false,
    supports_parallel_functions: false,
    model_type: 'chat',
  }) as Model;

describe('generateCandidates', () => {
  it('should return raw input as first candidate', () => {
    const candidates = generateCandidates('gpt-4');
    expect(candidates[0]).toBe('gpt-4');
  });

  it('should strip gateway prefixes', () => {
    const candidates = generateCandidates(
      'openrouter/anthropic/claude-opus-4.5'
    );
    expect(candidates).toContain('claude-opus-4.5');
  });

  it('should strip provider prefixes', () => {
    const candidates = generateCandidates('anthropic/claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4.5');
  });

  it('should normalize dot versions to dashes', () => {
    const candidates = generateCandidates('claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4-5');
  });

  it('should handle combined gateway + provider prefix', () => {
    const candidates = generateCandidates(
      'openrouter/anthropic/claude-opus-4.5'
    );
    expect(candidates).toContain('claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4-5');
  });

  it('should drop date suffix for base_latest resolution', () => {
    const candidates = generateCandidates('claude-opus-4-5-20251101');
    expect(candidates).toContain('claude-opus-4-5');
  });

  it('should handle reordered Claude pattern', () => {
    const candidates = generateCandidates('claude-4.5-opus');
    expect(candidates).toContain('claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4-5');
  });

  it('should deduplicate candidates', () => {
    const candidates = generateCandidates('gpt-4');
    const unique = [...new Set(candidates)];
    expect(candidates).toEqual(unique);
  });

  it('should handle vercel AI gateway format', () => {
    const candidates = generateCandidates('vercel/anthropic/claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4.5');
    expect(candidates).toContain('claude-opus-4-5');
  });
});

describe('buildAliasesArtifact', () => {
  it('should build base_latest from date-suffixed models', () => {
    const modelsMap = {
      'claude-opus-4-5-20251001': mockModel('claude-opus-4-5-20251001'),
      'claude-opus-4-5-20251101': mockModel('claude-opus-4-5-20251101'),
      'claude-opus-4-5-20250901': mockModel('claude-opus-4-5-20250901'),
    };

    const artifact = buildAliasesArtifact(modelsMap);

    expect(artifact.base_latest['claude-opus-4-5']).toBe(
      'claude-opus-4-5-20251101'
    );
  });

  it('should handle models without date suffix', () => {
    const modelsMap = {
      'gpt-4': mockModel('gpt-4'),
      'gpt-4-turbo': mockModel('gpt-4-turbo'),
    };

    const artifact = buildAliasesArtifact(modelsMap);

    expect(artifact.base_latest['gpt-4']).toBeUndefined();
    expect(artifact.base_latest['gpt-4-turbo']).toBeUndefined();
  });

  it('should merge custom aliases', () => {
    const modelsMap = {
      'claude-opus-4-5-20251101': mockModel('claude-opus-4-5-20251101'),
    };
    const customAliases = {
      'my-custom-alias': 'claude-opus-4-5-20251101',
    };

    const artifact = buildAliasesArtifact(modelsMap, customAliases);

    expect(artifact.aliases['my-custom-alias']).toBe(
      'claude-opus-4-5-20251101'
    );
  });

  it('should resolve transitive custom aliases', () => {
    const modelsMap = {
      canonical: mockModel('canonical'),
    };
    const customAliases = {
      'alias-a': 'alias-b',
      'alias-b': 'canonical',
    };

    const artifact = buildAliasesArtifact(modelsMap, customAliases);

    expect(artifact.aliases['alias-a']).toBe('canonical');
  });
});

describe('resolveModelId', () => {
  const modelsMap: Record<string, Model> = {
    'gpt-4': mockModel('gpt-4'),
    'claude-opus-4-5-20251101': mockModel('claude-opus-4-5-20251101'),
    'claude-sonnet-4-20251001': mockModel('claude-sonnet-4-20251001'),
  };

  const aliases: AliasesArtifact = {
    aliases: {
      'my-custom-model': 'gpt-4',
    },
    base_latest: {
      'claude-opus-4-5': 'claude-opus-4-5-20251101',
      'claude-sonnet-4': 'claude-sonnet-4-20251001',
    },
  };

  it('should return exact match immediately', () => {
    const result = resolveModelId('gpt-4', modelsMap, aliases);
    expect(result).toBe('gpt-4');
  });

  it('should resolve via alias', () => {
    const result = resolveModelId('my-custom-model', modelsMap, aliases);
    expect(result).toBe('gpt-4');
  });

  it('should resolve via base_latest', () => {
    const result = resolveModelId('claude-opus-4-5', modelsMap, aliases);
    expect(result).toBe('claude-opus-4-5-20251101');
  });

  it('should resolve Vercel gateway format', () => {
    const result = resolveModelId(
      'anthropic/claude-opus-4.5',
      modelsMap,
      aliases
    );
    expect(result).toBe('claude-opus-4-5-20251101');
  });

  it('should resolve OpenRouter gateway format', () => {
    const result = resolveModelId(
      'openrouter/anthropic/claude-opus-4.5',
      modelsMap,
      aliases
    );
    expect(result).toBe('claude-opus-4-5-20251101');
  });

  it('should return null for unknown model', () => {
    const result = resolveModelId('unknown-model', modelsMap, aliases);
    expect(result).toBeNull();
  });

  it('should handle empty aliases artifact', () => {
    const result = resolveModelId('gpt-4', modelsMap, EMPTY_ALIASES);
    expect(result).toBe('gpt-4');
  });
});

describe('resolveModelId preserves vendor-specific entries', () => {
  const modelsMap: Record<string, Model> = {
    'claude-opus-4-5-20251101': mockModel('claude-opus-4-5-20251101'),
    'openrouter/anthropic/claude-opus-4.5': mockModel(
      'openrouter/anthropic/claude-opus-4.5'
    ),
    'anthropic.claude-opus-4-5-20251101-v1:0': mockModel(
      'anthropic.claude-opus-4-5-20251101-v1:0'
    ),
    'azure/claude-opus-4-5': mockModel('azure/claude-opus-4-5'),
  };

  const aliases: AliasesArtifact = {
    aliases: {},
    base_latest: {
      'claude-opus-4-5': 'claude-opus-4-5-20251101',
    },
  };

  it('openrouter entry matches exactly, not stripped to base', () => {
    const result = resolveModelId(
      'openrouter/anthropic/claude-opus-4.5',
      modelsMap,
      aliases
    );
    expect(result).toBe('openrouter/anthropic/claude-opus-4.5');
  });

  it('bedrock entry matches exactly', () => {
    const result = resolveModelId(
      'anthropic.claude-opus-4-5-20251101-v1:0',
      modelsMap,
      aliases
    );
    expect(result).toBe('anthropic.claude-opus-4-5-20251101-v1:0');
  });

  it('azure entry matches exactly', () => {
    const result = resolveModelId('azure/claude-opus-4-5', modelsMap, aliases);
    expect(result).toBe('azure/claude-opus-4-5');
  });

  it('unknown gateway falls back to base via stripping', () => {
    const result = resolveModelId(
      'vercel/anthropic/claude-opus-4.5',
      modelsMap,
      aliases
    );
    expect(result).toBe('claude-opus-4-5-20251101');
  });

  it('nonexistent date falls back to latest via base_latest', () => {
    const result = resolveModelId(
      'claude-opus-4-5-20240101',
      modelsMap,
      aliases
    );
    expect(result).toBe('claude-opus-4-5-20251101');
  });
});
