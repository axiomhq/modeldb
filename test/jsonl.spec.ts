import { describe, expect, it } from 'vitest';
import app from '../src/index';
import { makeRequest } from './helpers/api';

describe('JSONL format', () => {
  it('lists models as JSONL with provider filter', async () => {
    const res = await makeRequest(
      app,
      '/api/v1/models?format=jsonl&providers=openai'
    );
    expect(res.status).toBe(200);
    const ctype = res.headers.get('content-type') || '';
    expect(ctype.includes('application/x-ndjson')).toBe(true);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);
    const first = JSON.parse(lines[0]);
    expect(first.provider_id).toBe('openai');
  });

  it('returns a single model as one JSONL line', async () => {
    const res = await makeRequest(app, '/api/v1/models/gpt-4?format=jsonl');
    expect(res.status).toBe(200);
    const ctype2 = res.headers.get('content-type') || '';
    expect(ctype2.includes('application/x-ndjson')).toBe(true);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines.length).toBe(1);
    const obj = JSON.parse(lines[0]);
    expect(obj.model_id).toBeDefined();
  });

  it('lists provider models as JSONL', async () => {
    const res = await makeRequest(app, '/api/v1/providers/openai?format=jsonl');
    expect(res.status).toBe(200);
    const ctype3 = res.headers.get('content-type') || '';
    expect(ctype3.includes('application/x-ndjson')).toBe(true);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);
    const first = JSON.parse(lines[0]);
    expect(first.provider_id).toBe('openai');
  });
});
