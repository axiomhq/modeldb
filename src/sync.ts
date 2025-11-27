/*
  Data transformation and persistence helpers for cron/admin refresh.
  This module is worker-safe (no Node APIs) and can run in scheduled jobs.
*/
import { z } from 'zod';
import type { Model, Providers } from './schema';

// ========== Display Name Generation ==========
// Curated display names for models that need special formatting.
// The algorithm handles: date detection, GPT hyphenation, common acronyms.
// Only add entries here for: lowercase variants (mini/nano), brand casing,
// abbreviations (3.5T), special suffixes (-latest → remove), custom formatting.
const DISPLAY_NAMES: Record<string, string> = {
  // OpenAI - special formatting needed
  'gpt-4o': 'GPT-4o', // lowercase 'o' suffix
  'gpt-4o-mini': 'GPT-4o mini', // lowercase 'mini'
  'gpt-4.1-mini': 'GPT-4.1 mini',
  'gpt-4.1-nano': 'GPT-4.1 nano',
  'o4-mini': 'o4 mini', // lowercase 'o' prefix and 'mini'
  'o3-mini': 'o3 mini',
  'o3-pro': 'o3 Pro',
  o3: 'o3',
  o1: 'o1',
  'o1-mini': 'o1 mini',
  'o1-pro': 'o1 Pro',
  'o1-preview': 'o1 Preview',
  'chatgpt-4o-latest': 'ChatGPT-4o', // drop -latest
  'gpt-3.5-turbo': 'GPT 3.5T', // T abbreviation
  'gpt-3.5-turbo-instruct': 'GPT 3.5T Instruct',
  'gpt-3.5-turbo-16k': 'GPT 3.5T 16k',

  // Anthropic - version formatting
  'claude-sonnet-4-20250514': 'Claude 4 Sonnet', // reorder version
  'claude-opus-4-20250514': 'Claude 4 Opus',
  'claude-3-7-sonnet-latest': 'Claude 3.7 Sonnet', // dot version, drop -latest
  'claude-3-5-haiku-latest': 'Claude 3.5 Haiku',
  'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
  'claude-3-opus-latest': 'Claude 3 Opus',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet', // drop date
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-instant-1.2': 'Claude Instant 1.2',
  'claude-instant-1': 'Claude Instant 1',

  // Google - brand name
  'gemini-2.0-flash': 'Gemini 2.0 Flash', // drop implied "latest"
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite', // hyphenated Lite
  'gemini-1.5-flash-8b': 'Gemini 1.5 Flash-8B',

  // Meta/Llama - special formatting
  'llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick Instruct (17Bx128E)',
  'llama-4-scout-17b-16e-instruct': 'Llama 4 Scout Instruct (17Bx16E)',
  'llama-3-70b-chat-hf': 'Llama 3 70B Instruct Reference', // rename chat-hf
  'llama-3-8b-chat-hf': 'Llama 3 8B Instruct Reference',
  'llama-2-70b-chat': 'LLaMA 2 70b Chat', // LLaMA casing for v2
  'llama3.3-70b': 'Llama 3.3 70B', // dot notation
  'llama3.2-3b': 'Llama 3.2 3B',
  'llama3.2-1b': 'Llama 3.2 1B',
  'llama3.1-70b': 'Llama 3.1 70B',
  'llama3.1-8b': 'Llama 3.1 8B',
  'llama3-70b': 'Llama 3 70B',
  'llama3-8b': 'Llama 3 8B',

  // Mistral - drop -latest, special naming
  'mistral-large-latest': 'Mistral Large',
  'pixtral-large-latest': 'Pixtral Large',
  'mistral-medium-latest': 'Mistral Medium 3',
  'mistral-small-latest': 'Mistral Small',
  'codestral-latest': 'Codestral',
  'ministral-8b-latest': 'Ministral 8B',
  'ministral-3b-latest': 'Ministral 3B',
  'open-mistral-nemo': 'Mistral NeMo', // drop open-, NeMo casing
  'open-codestral-mamba': 'Codestral Mamba',
  'open-mixtral-8x22b': 'Mixtral 8x22B',
  'mistral-7b-instruct-v0.1': 'Mistral (7B) Instruct', // drop version
  'mixtral-8x7b': 'Mixtral 8x7B',

  // Gemma - it → Instruct
  'gemma-2-27b-it': 'Gemma-2 Instruct (27B)',
  'gemma-2-9b-it': 'Gemma-2 Instruct (9B)',
  'gemma-2b-it': 'Gemma Instruct (2B)',

  // DeepSeek - brand casing
  'deepseek-v3': 'DeepSeek V3',
  'deepseek-r1': 'DeepSeek R1',
  'deepseek-llm-67b-chat': 'DeepSeek LLM Chat (67B)',

  // Qwen - QwQ naming
  'qwq-32b': 'Qwen QwQ 32B',
  'qwen-2-vl-72b-instruct': 'Qwen-2VL (72B) Instruct',
  'qwq-32b-preview': 'Qwen QwQ 32B Preview',

  // Other - special formatting
  'wizardlm-2-8x22b': 'WizardLM-2 (8x22B)',
  'wizardlm-2-7b': 'WizardLM-2 7B',
  'dbrx-instruct': 'DBRX Instruct',
  'nous-hermes-2-mixtral-8x7b-dpo': 'Nous Hermes 2 - Mixtral 8x7B-DPO',
  'nous-hermes-llama2-13b': 'Nous: Hermes 13B',
  'mythomax-l2-13b': 'MythoMax-L2 (13B)',

  // AWS Bedrock - version suffixes
  'nova-pro-v1:0': 'Nova Pro',
  'nova-micro-v1:0': 'Nova Micro',
  'nova-lite-v1:0': 'Nova Lite',
  'command-r-plus-v1:0': 'Command R+',
  'command-r-v1:0': 'Command R',
};

const PROVIDER_NAMES: Record<string, string> = {
  // Major providers
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  meta: 'Meta',
  mistral: 'Mistral AI',
  xai: 'xAI',
  deepseek: 'DeepSeek',

  // Cloud providers
  bedrock: 'AWS Bedrock',
  aws: 'AWS',
  azure: 'Microsoft Azure',
  databricks: 'Databricks',
  cloudflare: 'Cloudflare',
  together: 'Together AI',
  fireworks: 'Fireworks AI',
  anyscale: 'Anyscale',
  replicate: 'Replicate',
  sagemaker: 'AWS Sage Maker',
  snowflake: 'Snowflake',
  openrouter: 'OpenRouter',
  vertex: 'Google Vertex AI',

  // Model providers
  cohere: 'Cohere',
  ai21: 'AI21 Labs',
  huggingface: 'Hugging Face',
  perplexity: 'Perplexity AI',
  groq: 'Groq',
  deepinfra: 'DeepInfra',
  voyage: 'Voyage AI',
  nvidia: 'NVIDIA',
  qwen: 'Alibaba Cloud',
  elevenlabs: 'ElevenLabs',
  deepgram: 'Deepgram',
  moonshot: 'Moonshot AI',
  watsonx: 'IBM Watsonx',

  // Other providers
  assemblyai: 'AssemblyAI',
  sonar: 'Sonar',
  palm: 'Palm AI',
  nous: 'Nous Research',
  nousresearch: 'Nous Research',
  magistral: 'Magistral AI',
  devstral: 'Devstral',
  minimax: 'MiniMax',
  zhipu: 'Zhipu AI',
};

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Matches date patterns like "2024-07-18" or "20240718" at the end of a string
const DATE_PATTERN = /[-_]?(\d{4})[-_]?(\d{2})[-_]?(\d{2})$/;

// Matches YYMM patterns like "2501" (Jan 2025) at the end, but only after a separator
const SHORT_DATE_PATTERN = /[-_](\d{2})(\d{2})$/;

/**
 * Extracts and formats a date suffix from a model ID.
 * Returns [idWithoutDate, formattedDateSuffix] or [originalId, ''] if no date found.
 */
function extractDateSuffix(modelId: string): [string, string] {
  // Try full date pattern first (YYYY-MM-DD or YYYYMMDD)
  const fullMatch = modelId.match(DATE_PATTERN);
  if (fullMatch) {
    const [fullPattern, year, month] = fullMatch;
    const monthIndex = Number.parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const idWithoutDate = modelId.slice(0, -fullPattern.length);
      return [idWithoutDate, `(${MONTH_NAMES[monthIndex]} ${year})`];
    }
  }

  // Try short date pattern (YYMM like "2501" for Jan 2025)
  const shortMatch = modelId.match(SHORT_DATE_PATTERN);
  if (shortMatch) {
    const [fullPattern, yy, mm] = shortMatch;
    const monthIndex = Number.parseInt(mm, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const year = `20${yy}`;
      const idWithoutDate = modelId.slice(0, -fullPattern.length);
      return [idWithoutDate, `(${MONTH_NAMES[monthIndex]} ${year})`];
    }
  }

  return [modelId, ''];
}

/**
 * Applies smart title-casing to a model name, preserving known acronyms
 * and handling special cases like version numbers.
 */
function smartTitleCase(name: string): string {
  return (
    name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      // Fix common acronyms and brand names
      .replace(/\bGpt\b/gi, 'GPT')
      .replace(/\bGPT (\d[\d.]*)/g, 'GPT-$1') // GPT 5 -> GPT-5, GPT 5.1 -> GPT-5.1
      .replace(/\bLlama\b/gi, 'Llama')
      .replace(/\bAi\b/g, 'AI')
      .replace(/\bApi\b/g, 'API')
      .replace(/\bHd\b/g, 'HD')
      .replace(/\bTts\b/g, 'TTS')
      .replace(/\bStt\b/g, 'STT')
      .replace(/(\d+)b\b/gi, '$1B') // 70b -> 70B, 7b -> 7B
  );
}

function generateDisplayName(modelId: string): string {
  if (DISPLAY_NAMES[modelId]) {
    return DISPLAY_NAMES[modelId];
  }

  // Handle fine-tuned models (e.g., "ft:gpt-4o-mini-2024-07-18")
  let isFineTuned = false;
  let baseModelId = modelId;
  if (modelId.startsWith('ft:')) {
    isFineTuned = true;
    baseModelId = modelId.substring(3); // Remove "ft:" prefix
  }

  let name = baseModelId;

  // Check if base model has a display name
  if (DISPLAY_NAMES[baseModelId]) {
    name = DISPLAY_NAMES[baseModelId];
  } else if (baseModelId.indexOf('/') > -1) {
    // Handle slash-separated IDs (e.g., "azure/gpt-5-2025-08-07")
    const parts = baseModelId.split('/');
    const last = parts.at(-1) || baseModelId;

    // Check dictionary for the last part
    if (DISPLAY_NAMES[last]) {
      name = DISPLAY_NAMES[last];
    } else {
      // Extract date and apply smart formatting
      const [idWithoutDate, dateSuffix] = extractDateSuffix(last);
      if (DISPLAY_NAMES[idWithoutDate]) {
        name = dateSuffix
          ? `${DISPLAY_NAMES[idWithoutDate]} ${dateSuffix}`
          : DISPLAY_NAMES[idWithoutDate];
      } else {
        name = smartTitleCase(idWithoutDate);
        if (dateSuffix) {
          name = `${name} ${dateSuffix}`;
        }
      }
    }
  } else {
    // Extract date suffix and check dictionary for base name
    const [idWithoutDate, dateSuffix] = extractDateSuffix(baseModelId);
    if (DISPLAY_NAMES[idWithoutDate]) {
      name = dateSuffix
        ? `${DISPLAY_NAMES[idWithoutDate]} ${dateSuffix}`
        : DISPLAY_NAMES[idWithoutDate];
    } else {
      // Auto-generate name from ID with smart title-casing
      name = smartTitleCase(idWithoutDate);
      if (dateSuffix) {
        name = `${name} ${dateSuffix}`;
      }
    }
  }

  // Add fine-tuned suffix if applicable
  return isFineTuned ? `${name} [Fine-tuned]` : name;
}

function getProviderDisplayName(provider: string): string {
  const lowerProvider = provider.toLowerCase();
  if (PROVIDER_NAMES[lowerProvider]) {
    return PROVIDER_NAMES[lowerProvider];
  }

  if (lowerProvider.startsWith('text-completion-')) {
    const maybe = lowerProvider.split('-')[2];
    if (PROVIDER_NAMES[maybe]) {
      return PROVIDER_NAMES[maybe];
    }
  }

  // Default transformation
  return provider
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bLlm\b/g, 'LLM')
    .replace(/\bApi\b/g, 'API')
    .replace(/\bMl\b/g, 'ML');
}

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
