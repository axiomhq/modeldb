const DISPLAY_NAMES: Record<string, string> = {
  // OpenAI models
  'gpt-4o': 'GPT-4o',
  'gpt-4o-2024-11-20': 'GPT-4o (Nov 2024)',
  'gpt-4o-2024-08-06': 'GPT-4o (Aug 2024)',
  'gpt-4o-2024-05-13': 'GPT-4o (May 2024)',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-2025-04-14': 'GPT-4.1 (Apr 2025)',
  'gpt-4o-mini': 'GPT-4o mini',
  'gpt-4o-mini-2024-07-18': 'GPT-4o mini (Jul 2024)',
  'gpt-4.1-mini': 'GPT-4.1 mini',
  'gpt-4.1-nano': 'GPT-4.1 nano',
  'o4-mini': 'o4 mini',
  'o3-mini': 'o3 mini',
  'o3-pro': 'o3 Pro',
  o3: 'o3',
  o1: 'o1',
  'o1-mini': 'o1 mini',
  'o1-pro': 'o1 Pro',
  'o1-preview': 'o1 Preview',
  'chatgpt-4o-latest': 'ChatGPT-4o',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
  'gpt-4': 'GPT-4',
  'gpt-4.5-preview': 'GPT-4.5',
  'gpt-4o-search-preview': 'GPT-4o Search Preview',
  'gpt-4o-mini-search-preview': 'GPT-4o mini Search Preview',
  'gpt-3.5-turbo': 'GPT 3.5T',
  'gpt-3.5-turbo-0125': 'GPT 3.5T 0125',
  'gpt-3.5-turbo-1106': 'GPT 3.5T 1106',
  'gpt-3.5-turbo-instruct': 'GPT 3.5T Instruct',
  'gpt-4-32k': 'GPT 4 32k',
  'gpt-4-vision-preview': 'GPT 4 Vision-Preview',
  'gpt-3.5-turbo-16k': 'GPT 3.5T 16k',
  'text-davinci-003': 'Text Davinci 003',

  // Anthropic models
  'claude-sonnet-4-20250514': 'Claude 4 Sonnet',
  'claude-3-7-sonnet-latest': 'Claude 3.7 Sonnet',
  'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet (Feb 2025)',
  'claude-3-5-haiku-latest': 'Claude 3.5 Haiku',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Oct 2024)',
  'claude-3-5-sonnet-latest': 'Claude 3.5 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Oct 2024)',
  'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet (Jun 2024)',
  'claude-opus-4-20250514': 'Claude 4 Opus',
  'claude-3-opus-latest': 'Claude 3 Opus',
  'claude-3-opus-20240229': 'Claude 3 Opus (Feb 2024)',
  'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
  'claude-instant-1.2': 'Claude Instant 1.2',
  'claude-instant-1': 'Claude Instant 1',
  'claude-2.1': 'Claude 2.1',
  'claude-2.0': 'Claude 2.0',
  'claude-2': 'Claude 2',

  // Google models
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-lite-preview-06-17': 'Gemini 2.5 Flash-Lite Preview',
  'gemini-2.0-flash': 'Gemini 2.0 Flash Latest',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash-Lite',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-1.5-flash-8b': 'Gemini 1.5 Flash-8B',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.0-pro': 'Gemini 1.0 Pro',
  'gemini-pro': 'Gemini Pro',

  // Meta/Llama models
  'llama-4-maverick-17b-128e-instruct': 'Llama 4 Maverick Instruct (17Bx128E)',
  'llama-4-scout-17b-16e-instruct': 'Llama 4 Scout Instruct (17Bx16E)',
  'llama-3.3-70b-instruct-turbo': 'Llama 3.3 70B Instruct Turbo',
  'llama-3.3-70b-instruct-turbo-free': 'Llama 3.3 70B Instruct Turbo Free',
  'llama-3.2-90b-vision-instruct-turbo': 'Llama 3.2 90B Vision Instruct Turbo',
  'llama-3.2-11b-vision-instruct-turbo': 'Llama 3.2 11B Vision Instruct Turbo',
  'llama-vision-free': 'Llama Vision Free',
  'llama-3.2-3b-instruct-turbo': 'Llama 3.2 3B Instruct Turbo',
  'llama-3.1-405b-instruct-turbo': 'Llama 3.1 405B Instruct Turbo',
  'llama-3.1-70b-instruct-turbo': 'Llama 3.1 70B Instruct Turbo',
  'llama-3.1-8b-instruct-turbo': 'Llama 3.1 8B Instruct Turbo',
  'llama-3-70b-chat-hf': 'Llama 3 70B Instruct Reference',
  'llama-3-70b-instruct-turbo': 'Llama 3 70B Instruct Turbo',
  'llama-3-70b-instruct-lite': 'Llama 3 70B Instruct Lite',
  'llama-3-8b-chat-hf': 'Llama 3 8B Instruct Reference',
  'llama-3-8b-instruct-turbo': 'Llama 3 8B Instruct Turbo',
  'llama-3-8b-instruct-lite': 'Llama 3 8B Instruct Lite',
  'llama-2-70b-chat': 'LLaMA 2 70b Chat',
  'llama3.3-70b': 'Llama 3.3 70B',
  'llama3.2-3b': 'Llama 3.2 3B',
  'llama3.2-1b': 'Llama 3.2 1B',
  'llama3.1-70b': 'Llama 3.1 70B',
  'llama3.1-8b': 'Llama 3.1 8B',
  'llama3-70b': 'Llama 3 70B',
  'llama3-8b': 'Llama 3 8B',

  // Mistral models
  'magistral-medium-latest': 'Magistral Medium Latest',
  'magistral-small-latest': 'Magistral Small Latest',
  'devstral-small-latest': 'Devstral Small Latest',
  'mistral-large-latest': 'Mistral Large',
  'pixtral-large-latest': 'Pixtral Large',
  'mistral-medium-latest': 'Mistral Medium 3',
  'mistral-small-latest': 'Mistral Small',
  'codestral-latest': 'Codestral',
  'ministral-8b-latest': 'Ministral 8B',
  'ministral-3b-latest': 'Ministral 3B',
  'mistral-saba-latest': 'Mistral Saba',
  'pixtral-12b-2409': 'Pixtral 12B',
  'open-mistral-nemo': 'Mistral NeMo',
  'open-codestral-mamba': 'Codestral Mamba',
  'open-mixtral-8x22b': 'Mixtral 8x22B',
  'mistral-tiny': 'Mistral Tiny',
  'mistral-small': 'Mistral Small',
  'mistral-medium': 'Mistral Medium',
  'mistral-small-24b-instruct-2501': 'Mistral Small (24B) Instruct 25.01',
  'mistral-7b-instruct-v0.3': 'Mistral (7B) Instruct v0.3',
  'mistral-7b-instruct-v0.2': 'Mistral (7B) Instruct v0.2',
  'mistral-7b-instruct-v0.1': 'Mistral (7B) Instruct',
  'mixtral-8x22b-instruct-v0.1': 'Mixtral 8x22B Instruct v0.1',
  'mixtral-8x7b-instruct-v0.1': 'Mixtral 8x7B Instruct v0.1',
  'mistral-7b': 'Mistral 7B',
  'mixtral-8x7b': 'Mixtral 8x7b',

  // Google Gemma models
  'gemma-2-27b-it': 'Gemma-2 Instruct (27B)',
  'gemma-2-9b-it': 'Gemma-2 Instruct (9B)',
  'gemma-2b-it': 'Gemma Instruct (2B)',
  'gemma2-9b-it': 'Gemma 2 9B',
  'gemma-7b-it': 'Gemma 7b IT',

  // DeepSeek models
  'deepseek-v3': 'DeepSeek V3',
  'deepseek-r1': 'DeepSeek R1',
  'deepseek-r1-distill-llama-70b': 'DeepSeek R1 Distill Llama 70B',
  'deepseek-r1-distill-llama-70b-free': 'DeepSeek R1 Distill Llama 70B Free',
  'deepseek-r1-distill-qwen-14b': 'DeepSeek R1 Distill Qwen 14B',
  'deepseek-r1-distill-qwen-1.5b': 'DeepSeek R1 Distill Qwen 1.5B',
  'deepseek-llm-67b-chat': 'DeepSeek LLM Chat (67B)',
  'deepseek-coder-33b-instruct': 'Deepseek Coder 33b Instruct',

  // Qwen models
  'qwen-2.5-72b-instruct-turbo': 'Qwen 2.5 72B Instruct Turbo',
  'qwen-2.5-7b-instruct-turbo': 'Qwen 2.5 7B Instruct Turbo',
  'qwen-2.5-coder-32b-instruct': 'Qwen 2.5 Coder 32B Instruct',
  'qwq-32b': 'Qwen QwQ 32B',
  'qwen-2-vl-72b-instruct': 'Qwen-2VL (72B) Instruct',
  'qwen-2-72b-instruct': 'Qwen 2 Instruct (72B)',
  'qwq-32b-preview': 'Qwen QwQ 32B Preview',

  // Other models
  sonar: 'Sonar',
  'sonar-pro': 'Sonar Pro',
  'sonar-reasoning': 'Sonar Reasoning',
  'sonar-reasoning-pro': 'Sonar Reasoning Pro',
  'r1-1776': 'R1 1776',
  'llama-3.1-nemotron-70b-instruct-hf': 'Llama 3.1 Nemotron 70B Instruct HF',
  'wizardlm-2-8x22b': 'WizardLM-2 (8x22B)',
  'wizardlm-2-7b': 'WizardLM-2 7B',
  'dbrx-instruct': 'DBRX Instruct',
  'nous-hermes-2-mixtral-8x7b-dpo': 'Nous Hermes 2 - Mixtral 8x7B-DPO',
  'nous-hermes-2-yi-34b': 'Nous Hermes 2 Yi 34B',
  'nous-hermes-llama2-13b': 'Nous: Hermes 13B',
  'mythomax-l2-13b': 'MythoMax-L2 (13B)',
  'mythomax-l2-13b-lite': 'Gryphe MythoMax L2 Lite (13B)',
  'dolphin-mixtral-8x7b': 'Dolphin Mixtral 8x7b',

  // xAI Grok models
  'grok-4': 'Grok 4',
  'grok-2-vision': 'Grok 2 Vision',
  'grok-2': 'Grok 2',
  'grok-vision-beta': 'Grok Vision Beta',
  'grok-beta': 'Grok Beta',

  // AWS Bedrock models
  'nova-pro-v1:0': 'Nova Pro',
  'nova-micro-v1:0': 'Nova Micro',
  'nova-lite-v1:0': 'Nova Lite',
  'titan-text-premier-v1:0': 'Titan Text Premier',
  'titan-text-express-v1': 'Titan Text Express',
  'titan-text-lite-v1': 'Titan Text Lite',
  'command-r-plus-v1:0': 'Command R+',
  'command-r-v1:0': 'Command R',
  'command-text-v14': 'Command',
  'command-light-text-v14': 'Command Light',
};

export function generateDisplayName(modelId: string): string {
  if (DISPLAY_NAMES[modelId]) {
    return DISPLAY_NAMES[modelId];
  }

  if (modelId.indexOf('/') > -1) {
		const parts = modelId.split('/');
		let name = DISPLAY_NAMES[parts[parts.length-1]] || parts[parts.length-1];
		name = name.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

		parts[parts.length - 1] = name;

		return parts.reverse().join(' | ');
  }

  console.log('Unknown name:', modelId)

	return modelId
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
		.replace(/\Gpt/ig, 'GPT');
}
