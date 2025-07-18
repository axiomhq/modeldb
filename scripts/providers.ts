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

  console.log('Unknown provider:', lowerProvider)

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
