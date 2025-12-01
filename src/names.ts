/**
 * Display name generation for models and providers.
 * Shared between build-time sync (scripts/) and runtime cron (src/).
 */

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
  'claude-3-5-haiku': 'Claude 3.5 Haiku', // base name for Bedrock IDs
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet', // base name for Bedrock IDs
  'claude-3-opus-latest': 'Claude 3 Opus',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet', // drop date
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-3-haiku': 'Claude 3 Haiku', // base name for Bedrock IDs
  'claude-3-sonnet': 'Claude 3 Sonnet', // base name for Bedrock IDs
  'claude-3-opus': 'Claude 3 Opus', // base name for Bedrock IDs
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

  // AWS Bedrock - version suffixes and base names
  'nova-pro-v1:0': 'Nova Pro',
  'nova-micro-v1:0': 'Nova Micro',
  'nova-lite-v1:0': 'Nova Lite',
  'nova-pro': 'Nova Pro',
  'nova-micro': 'Nova Micro',
  'nova-lite': 'Nova Lite',
  'command-r-plus-v1:0': 'Command R+',
  'command-r-v1:0': 'Command R',
  'command-r-plus': 'Command R+', // base name for Bedrock IDs
  'command-r': 'Command R', // base name for Bedrock IDs
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

// Matches Bedrock-style date in middle: "20241022" followed by version like "-v1:0"
const BEDROCK_DATE_VERSION_PATTERN = /[-_](\d{4})(\d{2})(\d{2})[-_]v\d+:\d+$/;

// Bedrock region/provider prefixes to strip (e.g., "us.anthropic.", "eu.meta.")
const BEDROCK_PREFIX_PATTERN = /^(us|eu|apac|ap|sa)\.([a-z]+)\./i;

// Provider-only prefix (e.g., "anthropic.claude" -> "claude")
const PROVIDER_PREFIX_PATTERN = /^(anthropic|meta|cohere|mistral|ai21|amazon|stability)\./i;

/**
 * Cleans up Bedrock-style model IDs by stripping region/provider prefixes
 * and version suffixes, extracting embedded dates.
 * Returns [cleanedId, dateSuffix] where dateSuffix may be empty.
 */
function cleanBedrockId(modelId: string): [string, string] {
  let cleaned = modelId;
  let dateSuffix = '';

  // Strip region.provider prefix (e.g., "us.anthropic." or "eu.meta.")
  cleaned = cleaned.replace(BEDROCK_PREFIX_PATTERN, '');

  // Strip provider-only prefix (e.g., "anthropic." when no region)
  cleaned = cleaned.replace(PROVIDER_PREFIX_PATTERN, '');

  // Handle Bedrock date+version pattern (e.g., "-20241022-v1:0")
  const bedrockMatch = cleaned.match(BEDROCK_DATE_VERSION_PATTERN);
  if (bedrockMatch) {
    const [fullMatch, year, month, _day] = bedrockMatch;
    const monthIndex = Number.parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      dateSuffix = `(${MONTH_NAMES[monthIndex]} ${year})`;
      cleaned = cleaned.slice(0, -fullMatch.length);
    }
  }

  // Strip trailing version suffix if no date was extracted (e.g., "-v1:0")
  if (!dateSuffix) {
    cleaned = cleaned.replace(/[-_]v\d+:\d+$/, '');
  }

  return [cleaned, dateSuffix];
}

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

export function generateDisplayName(modelId: string): string {
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

  // Clean Bedrock-style IDs (e.g., "us.anthropic.claude-3-5-haiku-20241022-v1:0")
  const [cleanedId, bedrockDateSuffix] = cleanBedrockId(baseModelId);
  if (cleanedId !== baseModelId) {
    baseModelId = cleanedId;
  }

  let name = baseModelId;

  // Helper to append date suffix to name
  const appendDateSuffix = (baseName: string, dateSuffix: string): string => {
    return dateSuffix ? `${baseName} ${dateSuffix}` : baseName;
  };

  // Check if base model has a display name
  if (DISPLAY_NAMES[baseModelId]) {
    name = appendDateSuffix(DISPLAY_NAMES[baseModelId], bedrockDateSuffix);
  } else if (baseModelId.indexOf('/') > -1) {
    // Handle slash-separated IDs (e.g., "azure/gpt-5-2025-08-07")
    const parts = baseModelId.split('/');
    const last = parts.at(-1) || baseModelId;

    // Check dictionary for the last part
    if (DISPLAY_NAMES[last]) {
      name = appendDateSuffix(DISPLAY_NAMES[last], bedrockDateSuffix);
    } else {
      // Extract date and apply smart formatting
      const [idWithoutDate, dateSuffix] = extractDateSuffix(last);
      const effectiveDateSuffix = bedrockDateSuffix || dateSuffix;
      if (DISPLAY_NAMES[idWithoutDate]) {
        name = appendDateSuffix(DISPLAY_NAMES[idWithoutDate], effectiveDateSuffix);
      } else {
        name = smartTitleCase(idWithoutDate);
        name = appendDateSuffix(name, effectiveDateSuffix);
      }
    }
  } else {
    // Extract date suffix and check dictionary for base name
    const [idWithoutDate, dateSuffix] = extractDateSuffix(baseModelId);
    const effectiveDateSuffix = bedrockDateSuffix || dateSuffix;
    if (DISPLAY_NAMES[idWithoutDate]) {
      name = appendDateSuffix(DISPLAY_NAMES[idWithoutDate], effectiveDateSuffix);
    } else {
      // Auto-generate name from ID with smart title-casing
      name = smartTitleCase(idWithoutDate);
      name = appendDateSuffix(name, effectiveDateSuffix);
    }
  }

  // Add fine-tuned suffix if applicable
  return isFineTuned ? `${name} [Fine-tuned]` : name;
}

export function getProviderDisplayName(provider: string): string {
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
