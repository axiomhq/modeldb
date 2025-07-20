import { vi } from 'vitest';
import { testModelMap, testModels, testProviders } from './fixtures/models';

vi.mock('../src/data/list', () => ({
  modelsList: testModels,
}));

vi.mock('../src/data/map', () => ({
  modelsMap: testModelMap,
}));

vi.mock('../src/data/providers', () => ({
  modelsByProvider: testProviders,
}));

vi.mock('../src/data/metadata', () => ({
  modelsMetadata: {
    source: 'test-fixtures',
    generated_at: '2024-01-01T00:00:00Z',
    model_count: testModels.length,
    schema_version: '1.0.0',
  },
}));

// Mock cloudflare:workers env
vi.mock('cloudflare:workers', () => ({
  env: { ENV: 'dev' },
}));
