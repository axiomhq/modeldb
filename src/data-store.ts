import type { Context } from 'hono';
import { modelsList as staticList } from './data/list';
import { modelsMap as staticMap } from './data/map';
import { modelsMetadata as staticMetadata } from './data/metadata';
import { modelsByProvider as staticProviders } from './data/providers';
import type { Model, Providers } from './schema';

type Metadata = {
  source: string;
  generated_at: string;
  model_count: number;
  schema_version: string;
};

function url(path: string): string {
  return `https://modeldb.internal${path}`;
}

async function cacheGetJSON<T>(path: string): Promise<T | null> {
  const req = new Request(url(path));
  const res = await caches.default.match(req);
  if (!res) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function cachePutJSON(path: string, data: unknown): Promise<void> {
  const req = new Request(url(path));
  const res = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
  await caches.default.put(req, res);
}

type EnvWithKV = { MODELS_KV?: KVNamespace };

async function loadFromKV<T>(env: EnvWithKV, key: string): Promise<T | null> {
  const kv = env?.MODELS_KV as KVNamespace | undefined;
  if (!kv) {
    return null;
  }
  const s = await kv.get(key);
  return s ? (JSON.parse(s) as T) : null;
}

async function getLatestVersion(c: Context): Promise<string | null> {
  const kv = (c.env as EnvWithKV)?.MODELS_KV;
  if (!kv) {
    return null;
  }
  const manifestStr = await kv.get('v1:manifest');
  if (!manifestStr) {
    return null;
  }
  const manifest = JSON.parse(manifestStr) as { latest: string | null };
  return manifest.latest ?? null;
}

async function getFromCacheOrKV<T>(
  c: Context,
  name: 'list' | 'map' | 'providers' | 'metadata'
): Promise<T | null> {
  const cachePath = `/cache/v1/latest/${name}.json`;
  const cached = await cacheGetJSON<T>(cachePath);
  if (cached) {
    return cached;
  }

  const version = await getLatestVersion(c);
  if (!version) {
    // Fallback to bundled static data during tests or cold start
    switch (name) {
      case 'list':
        return staticList as unknown as T;
      case 'map':
        return staticMap as unknown as T;
      case 'providers':
        return staticProviders as unknown as T;
      case 'metadata':
        return staticMetadata as unknown as T;
      default:
        return null;
    }
  }
  const kvVal = await loadFromKV<T>(
    c.env as EnvWithKV,
    `v1:${version}:${name}`
  );
  if (kvVal) {
    await cachePutJSON(cachePath, kvVal);
  }
  if (kvVal) {
    return kvVal;
  }
  // Second-chance fallback to bundled static data
  switch (name) {
    case 'list':
      return staticList as unknown as T;
    case 'map':
      return staticMap as unknown as T;
    case 'providers':
      return staticProviders as unknown as T;
    case 'metadata':
      return staticMetadata as unknown as T;
    default:
      return null;
  }
}

export function getDataStore(c: Context) {
  return {
    getList: async () => getFromCacheOrKV<Model[]>(c, 'list'),
    getMap: async () => getFromCacheOrKV<Record<string, Model>>(c, 'map'),
    getProviders: async () => getFromCacheOrKV<Providers>(c, 'providers'),
    getMetadata: async () => getFromCacheOrKV<Metadata>(c, 'metadata'),
  };
}
