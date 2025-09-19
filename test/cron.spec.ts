import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduled } from '../src/index';

class MockKV implements KVNamespace {
  private store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  // Unused methods for this test
  async delete(_key: string): Promise<void> {
    return;
  }
  async list(): Promise<{ keys: { name: string }[] }> {
    return { keys: [] };
  }
}

describe('scheduled cron job', () => {
  const kv = new MockKV();

  beforeEach(() => {
    // Mock caches.default
    (globalThis as any).caches = {
      default: {
        match: vi.fn(async () => {
          return;
        }),
        put: vi.fn(async () => {
          return;
        }),
      },
    };

    // Mock fetch for HEAD and GET
    vi.stubGlobal('fetch', async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      const method =
        init?.method || (typeof input !== 'string' ? input.method : 'GET');
      if (method === 'HEAD') {
        return new Response(null, { headers: { etag: 'W/"etag-1"' } });
      }
      if (url.includes('model_prices_and_context_window.json')) {
        const payload = {
          'openai/gpt-4': {
            litellm_provider: 'openai',
            input_cost_per_token: 0.00003,
            output_cost_per_token: 0.00006,
            max_input_tokens: 8192,
            max_output_tokens: 8192,
          },
        };
        return new Response(JSON.stringify(payload), {
          headers: { 'content-type': 'application/json', etag: 'W/"etag-1"' },
        });
      }
      return new Response('not found', { status: 404 });
    });
  });

  it('builds artifacts, writes manifest, and warms cache', async () => {
    await scheduled({} as any, { MODELS_KV: kv }, {} as any);

    const manifestStr = await kv.get('v1:manifest');
    expect(manifestStr).not.toBeNull();
    const manifest = JSON.parse(manifestStr as string) as {
      latest: string;
      etag: string | null;
    };
    expect(manifest.latest).toBeTruthy();

    const listStr = await kv.get(`v1:${manifest.latest}:list`);
    expect(listStr).not.toBeNull();
    const list = JSON.parse(listStr as string) as any[];
    expect(list.length).toBeGreaterThan(0);
  });
});
