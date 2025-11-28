/*
  Data transformation and persistence helpers for cron/admin refresh.
  This module is worker-safe (no Node APIs) and can run in scheduled jobs.
*/
import { z } from 'zod';
import { generateDisplayName, getProviderDisplayName } from './names';
import type { Model, Providers } from './schema';

export const LITELLM_MODEL_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json';

// Schema describing LiteLLM models (subset + passthrough)
const LiteLLMModelSchema = z
  .object({
    litellm_provider: z.string(),
    mode: z.string().optional(),
    supports_function_calling: z.boolean().optional(),
    supports_parallel_function_calling: z.boolean().optional(),
    supports_vision: z.boolean().optional(),
    supports_response_schema: z.boolean().optional(),
    input_cost_per_token: z.number().optional(),
    output_cost_per_token: z.number().optional(),
    cache_creation_input_token_cost: z.number().optional(),
    cache_read_input_token_cost: z.number().optional(),
    max_input_tokens: z.number().optional(),
    max_output_tokens: z.number().optional(),
    deprecation_date: z.string().optional(),
  })
  .passthrough();

export type LiteLLMModel = z.infer<typeof LiteLLMModelSchema>;

const prefixPattern =
  /^(openai|anthropic|bedrock|vertex_ai|cohere|replicate|huggingface|together_ai|deepinfra|groq|mistral|perplexity|anyscale|cloudflare|voyage|databricks|ai21)\//;

function transformModelId(litellmName: string, provider?: string): string {
  if (provider === 'google') {
    if (litellmName.startsWith('gemini/gemini-')) {
      return litellmName.substring(14);
    }
    if (litellmName.startsWith('gemini/')) {
      return litellmName.substring(7);
    }
    if (litellmName.startsWith('gemini/gemma-')) {
      return litellmName.substring(7);
    }
  }
  if (provider === 'xai' && litellmName.startsWith('xai/')) {
    return litellmName.substring(4);
  }
  return litellmName.replace(prefixPattern, '');
}

function transformProviderId(provider: string): string {
  const lowerProvider = provider.split('_ai')[0].split('_')[0].toLowerCase();
  if (lowerProvider === 'gemini') {
    return 'google';
  }
  if (lowerProvider === 'meta_llama') {
    return 'meta';
  }
  if (lowerProvider === 'mistralai') {
    return 'mistral';
  }
  if (lowerProvider === 'codestral') {
    return 'mistral';
  }
  if (lowerProvider === 'deepseek-ai') {
    return 'deepseek';
  }
  if (lowerProvider === 'bedrock_converse') {
    return 'bedrock';
  }
  if (lowerProvider.startsWith('vertex_ai')) {
    return 'vertex';
  }
  if (lowerProvider.includes('codestral')) {
    return 'mistral';
  }
  return lowerProvider;
}

function discoverCapabilities(
  litellmModels: Record<string, LiteLLMModel>
): Set<string> {
  const capabilities = new Set<string>();
  for (const model of Object.values(litellmModels)) {
    if (!model || typeof model !== 'object') {
      continue;
    }
    for (const key of Object.keys(model as Record<string, unknown>)) {
      const val = (model as Record<string, unknown>)[key];
      if (key.startsWith('supports_') && typeof val === 'boolean') {
        capabilities.add(key);
      }
    }
  }
  return capabilities;
}

function discoverModelTypes(
  litellmModels: Record<string, LiteLLMModel>
): Map<string, string> {
  const modelTypeMap = new Map<string, string>();
  modelTypeMap.set('chat', 'chat');
  modelTypeMap.set('completion', 'completion');
  modelTypeMap.set('embedding', 'embedding');
  modelTypeMap.set('image_generation', 'image');
  modelTypeMap.set('audio_transcription', 'audio');
  modelTypeMap.set('audio_speech', 'audio');
  modelTypeMap.set('moderation', 'moderation');
  modelTypeMap.set('rerank', 'rerank');
  for (const model of Object.values(litellmModels)) {
    if (!model || typeof model !== 'object' || !model.mode) {
      continue;
    }
    if (!modelTypeMap.has(model.mode)) {
      modelTypeMap.set(model.mode, model.mode);
    }
  }
  return modelTypeMap;
}

function getModelType(
  mode: string | undefined,
  modelTypeMap: Map<string, string>
): string {
  if (!mode) {
    return 'chat';
  }
  return modelTypeMap.get(mode) || mode;
}

function applyCapabilities(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  knownCapabilities?: Set<string>
) {
  if (!knownCapabilities) {
    return;
  }
  for (const capability of knownCapabilities) {
    const value = source[capability];
    if (typeof value === 'boolean') {
      target[capability] = value;
    }
  }
}

function applyLegacyFlags(target: Record<string, unknown>, src: LiteLLMModel) {
  if (src.supports_response_schema !== undefined) {
    (target as { supports_json_mode?: boolean }).supports_json_mode =
      src.supports_response_schema;
  }
  if (src.supports_parallel_function_calling !== undefined) {
    (
      target as { supports_parallel_functions?: boolean }
    ).supports_parallel_functions = src.supports_parallel_function_calling;
  }
}

function ensureCapabilityDefaults(target: Record<string, unknown>) {
  const toBool = (v: unknown) => v === true;
  const t = target as Record<string, unknown> & {
    supports_function_calling?: unknown;
    supports_vision?: unknown;
    supports_json_mode?: unknown;
    supports_parallel_functions?: unknown;
  };
  t.supports_function_calling = toBool(t.supports_function_calling);
  t.supports_vision = toBool(t.supports_vision);
  t.supports_json_mode = toBool(t.supports_json_mode);
  t.supports_parallel_functions = toBool(t.supports_parallel_functions);
}

function stripOriginalFields(target: Record<string, unknown>) {
  const keys = [
    'litellm_provider',
    'mode',
    'cache_creation_input_token_cost',
    'cache_read_input_token_cost',
  ];
  const t = target as Record<string, unknown>;
  for (const k of keys) {
    t[k] = undefined;
  }
}

export function transformModel(
  litellmName: string,
  litellmModel: LiteLLMModel,
  knownCapabilities?: Set<string>,
  modelTypeMap?: Map<string, string>
): Model | null {
  const providerId = transformProviderId(litellmModel.litellm_provider);
  const modelId = transformModelId(litellmName, providerId);

  const inputCost = litellmModel.input_cost_per_token || 0;
  const outputCost = litellmModel.output_cost_per_token || 0;

  const base: Record<string, unknown> & Partial<Model> = {
    ...litellmModel,
    model_id: modelId,
    model_name: generateDisplayName(modelId),
    provider_id: providerId,
    provider_name: getProviderDisplayName(providerId),
    max_input_tokens: litellmModel.max_input_tokens || null,
    max_output_tokens: litellmModel.max_output_tokens || null,
    input_cost_per_token: inputCost,
    input_cost_per_million: inputCost * 1_000_000,
    output_cost_per_token: outputCost,
    output_cost_per_million: outputCost * 1_000_000,
    cache_read_cost_per_token: litellmModel.cache_read_input_token_cost || null,
    cache_read_cost_per_million: litellmModel.cache_read_input_token_cost
      ? (litellmModel.cache_read_input_token_cost as number) * 1_000_000
      : null,
    cache_write_cost_per_token:
      litellmModel.cache_creation_input_token_cost || null,
    cache_write_cost_per_million: litellmModel.cache_creation_input_token_cost
      ? (litellmModel.cache_creation_input_token_cost as number) * 1_000_000
      : null,
    model_type: getModelType(litellmModel.mode, modelTypeMap || new Map()),
    deprecation_date: litellmModel.deprecation_date || null,
  };

  applyCapabilities(
    base,
    litellmModel as unknown as Record<string, unknown>,
    knownCapabilities
  );
  applyLegacyFlags(base, litellmModel);
  ensureCapabilityDefaults(base);
  stripOriginalFields(base);
  return base as Model;
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((v) => stableStringify(v)).join(',')}]`;
  }
  const rec = obj as Record<string, unknown>;
  const entries = Object.keys(rec)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`);
  return `{${entries.join(',')}}`;
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

async function fetchLiteLLM(sourceUrl: string): Promise<{
  etag: string | null;
  models: Record<string, LiteLLMModel>;
}> {
  const res = await fetch(sourceUrl, { cf: { cacheTtl: 0 } });
  const serverEtag = res.headers.get('etag');
  const json = (await res.json()) as Record<string, unknown>;
  if ('sample_spec' in json) {
    (json as Record<string, unknown>).sample_spec = undefined;
  }
  const parsed: Record<string, LiteLLMModel> = {};
  for (const [k, v] of Object.entries(json)) {
    // Only keep entries that conform to the expected shape
    const result = LiteLLMModelSchema.safeParse(v);
    if (result.success) {
      parsed[k] = result.data;
    }
  }
  const signature = djb2Hash(stableStringify(json));
  const etag = serverEtag || signature;
  return { etag, models: parsed };
}

export type BuiltArtifacts = {
  version: string;
  etag: string | null;
  modelsMap: Record<string, Model>;
  modelsList: Model[];
  modelsByProvider: Providers;
  metadata: {
    source: string;
    generated_at: string;
    model_count: number;
    schema_version: string;
  };
};

export async function buildArtifacts(
  sourceUrl = LITELLM_MODEL_URL
): Promise<BuiltArtifacts> {
  const { etag, models } = await fetchLiteLLM(sourceUrl);
  const generated_at = new Date().toISOString();

  const capabilities = discoverCapabilities(models);
  const modelTypeMap = discoverModelTypes(models);

  const transformed: Record<string, Model> = {};
  for (const [name, m] of Object.entries(models)) {
    const t = transformModel(name, m, capabilities, modelTypeMap);
    if (t) {
      transformed[t.model_id] = t;
    }
  }

  const sortedMap = Object.fromEntries(
    Object.entries(transformed).sort(([, a], [, b]) => {
      const pc = a.provider_id.localeCompare(b.provider_id);
      return pc !== 0 ? pc : a.model_id.localeCompare(b.model_id);
    })
  );
  const list = Object.values(sortedMap);
  const providers: Providers = {};
  for (const m of list) {
    if (!providers[m.provider_id]) {
      providers[m.provider_id] = [];
    }
    providers[m.provider_id].push(m);
  }
  for (const pid of Object.keys(providers)) {
    providers[pid] = providers[pid].sort((a, b) =>
      a.model_id.localeCompare(b.model_id)
    );
  }

  const version = `${generated_at.replace(/[-:TZ.]/g, '').slice(0, 14)}Z`;
  return {
    version,
    etag: etag || null,
    modelsMap: sortedMap,
    modelsList: list,
    modelsByProvider: Object.fromEntries(
      Object.entries(providers).sort(([a], [b]) => a.localeCompare(b))
    ),
    metadata: {
      source: sourceUrl,
      generated_at,
      model_count: list.length,
      schema_version: '1.0.0',
    },
  };
}

export type Manifest = {
  latest: string | null;
  etag: string | null;
  checked_at: string | null;
  versions: Array<{
    id: string;
    generated_at: string;
    etag: string | null;
    model_count: number;
  }>;
};

export async function readManifest(kv: KVNamespace): Promise<Manifest | null> {
  const s = await kv.get('v1:manifest');
  return s ? (JSON.parse(s) as Manifest) : null;
}

export async function writeArtifactsToKV(
  kv: KVNamespace,
  artifacts: BuiltArtifacts
): Promise<Manifest> {
  const { version, modelsMap, modelsList, modelsByProvider, metadata, etag } =
    artifacts;
  await kv.put(`v1:${version}:map`, JSON.stringify(modelsMap));
  await kv.put(`v1:${version}:list`, JSON.stringify(modelsList));
  await kv.put(`v1:${version}:providers`, JSON.stringify(modelsByProvider));
  await kv.put(`v1:${version}:metadata`, JSON.stringify(metadata));

  const current = (await readManifest(kv)) || {
    latest: null,
    etag: null,
    checked_at: null,
    versions: [],
  };
  const next: Manifest = {
    latest: version,
    etag: etag || null,
    checked_at: new Date().toISOString(),
    versions: [
      ...current.versions,
      {
        id: version,
        generated_at: metadata.generated_at,
        etag: etag || null,
        model_count: metadata.model_count,
      },
    ],
  };
  await kv.put('v1:manifest', JSON.stringify(next));
  return next;
}

function cacheUrl(path: string): string {
  return `https://modeldb.internal${path}`;
}

export async function warmLatestCache(
  artifacts: BuiltArtifacts
): Promise<void> {
  const cache = caches.default;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  };
  const puts: Promise<void>[] = [];
  const entries: [string, unknown][] = [
    ['/cache/v1/latest/list.json', artifacts.modelsList],
    ['/cache/v1/latest/map.json', artifacts.modelsMap],
    ['/cache/v1/latest/providers.json', artifacts.modelsByProvider],
    ['/cache/v1/latest/metadata.json', artifacts.metadata],
  ];
  for (const [p, data] of entries) {
    const req = new Request(cacheUrl(p));
    const res = new Response(JSON.stringify(data), { headers });
    puts.push(cache.put(req, res));
  }
  await Promise.all(puts);
}

export async function runSyncToKV(kv: KVNamespace, sourceUrl?: string) {
  const artifacts = await buildArtifacts(sourceUrl);
  await writeArtifactsToKV(kv, artifacts);
  await warmLatestCache(artifacts);
  return artifacts;
}
