import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { z } from 'zod';
import { generateDisplayName } from './names';
import type { Model } from './schema';

const LITELLM_MODEL_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json';

const LiteLLMModelSchema = z
  .object({
    model_name: z.string().optional(),
    litellm_provider: z.string().optional(),
    mode: z
      .enum([
        'chat',
        'embedding',
        'completion',
        'image_generation',
        'audio_transcription',
        'audio_speech',
        'moderation',
        'rerank',
      ])
      .optional(),
    supports_function_calling: z.boolean().optional(),
    supports_parallel_function_calling: z.boolean().optional(),
    supports_vision: z.boolean().optional(),
    supports_audio_input: z.boolean().optional(),
    supports_audio_output: z.boolean().optional(),
    supports_prompt_caching: z.boolean().optional(),
    supports_response_schema: z.boolean().optional(),
    supports_system_messages: z.boolean().optional(),
    input_cost_per_token: z.number().optional(),
    output_cost_per_token: z.number().optional(),
    cache_creation_input_token_cost: z.number().optional(),
    cache_read_input_token_cost: z.number().optional(),
    max_tokens: z.union([z.number(), z.string()]).optional(),
    max_input_tokens: z.number().optional(),
    max_output_tokens: z.number().optional(),
    context_window: z.number().optional(),
  })
  .passthrough();

export type LiteLLMModel = z.infer<typeof LiteLLMModelSchema>;

const PROVIDER_MAP: Record<string, { id: string; name: string }> = {
  openai: { id: 'openai', name: 'OpenAI' },
  anthropic: { id: 'anthropic', name: 'Anthropic' },
  bedrock: { id: 'bedrock', name: 'AWS Bedrock' },
  vertex_ai: { id: 'vertex_ai', name: 'Google Vertex AI' },
  gemini: { id: 'google', name: 'Google' },
  cohere: { id: 'cohere', name: 'Cohere' },
  replicate: { id: 'replicate', name: 'Replicate' },
  huggingface: { id: 'huggingface', name: 'Hugging Face' },
  together_ai: { id: 'together', name: 'Together AI' },
  deepinfra: { id: 'deepinfra', name: 'DeepInfra' },
  groq: { id: 'groq', name: 'Groq' },
  mistral: { id: 'mistral', name: 'Mistral AI' },
  perplexity: { id: 'perplexity', name: 'Perplexity' },
  anyscale: { id: 'anyscale', name: 'Anyscale' },
  cloudflare: { id: 'cloudflare', name: 'Cloudflare' },
  voyage: { id: 'voyage', name: 'Voyage AI' },
  databricks: { id: 'databricks', name: 'Databricks' },
  xai: { id: 'xai', name: 'xAI' },
  ai21: { id: 'ai21', name: 'AI21 Labs' },
};

const prefixPattern =
  /^(openai|anthropic|bedrock|vertex_ai|cohere|replicate|huggingface|together_ai|deepinfra|groq|mistral|perplexity|anyscale|cloudflare|voyage|databricks|ai21)\//;
function transformModelId(litellmName: string, provider?: string): string {
  if (provider === 'gemini') {
    if (litellmName.startsWith('gemini/gemini-')) {
      return litellmName.substring(14); // Remove 'gemini/gemini-'
    }
    if (litellmName.startsWith('gemini/')) {
      return litellmName.substring(7);
    }
  }

  if (provider === 'xai' && litellmName.startsWith('xai/')) {
    return litellmName.substring(4);
  }

  return litellmName.replace(prefixPattern, '');
}

function getModelType(mode?: string): Model['model_type'] {
  switch (mode) {
    case 'chat':
      return 'chat';
    case 'completion':
      return 'completion';
    case 'embedding':
      return 'embedding';
    case 'image_generation':
      return 'image';
    case 'audio_transcription':
    case 'audio_speech':
      return 'audio';
    case 'moderation':
      return 'moderation';
    case 'rerank':
      return 'rerank';
    default:
      return 'chat';
  }
}

export function transformModel(
  litellmName: string,
  litellmModel: LiteLLMModel
): Model | null {
  const provider = litellmModel.litellm_provider;
  if (!(provider && PROVIDER_MAP[provider])) {
    return null;
  }

  const providerInfo = PROVIDER_MAP[provider];
  const modelId = transformModelId(litellmName, provider);
  const friendlyName = generateDisplayName(modelId, provider);

  const model: Model = {
    model: modelId,
    provider: providerInfo.id,
    model_name: litellmName,
    display_name: friendlyName,
    description: null,

    // Pricing - both per token and per million
    input_cost_per_token: litellmModel.input_cost_per_token || null,
    input_cost_per_million: litellmModel.input_cost_per_token
      ? litellmModel.input_cost_per_token * 1_000_000
      : null,
    output_cost_per_token: litellmModel.output_cost_per_token || null,
    output_cost_per_million: litellmModel.output_cost_per_token
      ? litellmModel.output_cost_per_token * 1_000_000
      : null,

    // Cache pricing (optional)
    cache_read_cost_per_token: litellmModel.cache_read_input_token_cost || null,
    cache_read_cost_per_million: litellmModel.cache_read_input_token_cost
      ? litellmModel.cache_read_input_token_cost * 1_000_000
      : null,
    cache_write_cost_per_token:
      litellmModel.cache_creation_input_token_cost || null,
    cache_write_cost_per_million: litellmModel.cache_creation_input_token_cost
      ? litellmModel.cache_creation_input_token_cost * 1_000_000
      : null,

    // Context and limits
    max_input_tokens:
      litellmModel.max_input_tokens || litellmModel.context_window || null,
    max_output_tokens: litellmModel.max_output_tokens || null,

    // Capabilities
    supports_function_calling: litellmModel.supports_function_calling ?? false,
    supports_vision: litellmModel.supports_vision ?? false,
    supports_json_mode: litellmModel.supports_response_schema ?? false,
    supports_parallel_functions:
      litellmModel.supports_parallel_function_calling ?? false,
    supports_streaming: true,

    // Model type
    model_type: getModelType(litellmModel.mode),
  };

  return model;
}

async function fetchModels(url: string): Promise<Record<string, LiteLLMModel>> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            // Remove sample_spec if present
            if ('sample_spec' in jsonData) {
              jsonData.sample_spec = undefined;
            }
            resolve(jsonData);
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON: ${(error as Error).message}`)
            );
          }
        });
      })
      .on('error', (err) => {
        reject(new Error(`Failed to fetch models: ${err.message}`));
      });
  });
}

async function syncCommand(options: {
  source?: string;
  output?: string;
  dryRun?: boolean;
  summary?: boolean;
}) {
  const sourceUrl =
    options.source ||
    'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
  const outputPath =
    options.output || path.join(__dirname, '../data/models.json');

  const spinner = ora('Fetching models from LiteLLM...').start();

  try {
    const litellmModels = await fetchModels(sourceUrl);
    spinner.succeed(
      chalk.green(
        `Fetched ${Object.keys(litellmModels).length} models from LiteLLM`
      )
    );

    const timestamp = new Date().toISOString();
    const transformedModels: Record<string, Model> = {};
    let successCount = 0;
    let failCount = 0;

    const transformSpinner = ora('Transforming models...').start();

    for (const [litellmName, litellmModel] of Object.entries(litellmModels)) {
      try {
        const transformed = transformModel(litellmName, litellmModel);
        if (transformed) {
          transformedModels[transformed.model] = transformed;
          successCount++;
        } else {
          failCount++;
        }
      } catch (_error) {
        failCount++;
      }
    }

    transformSpinner.succeed(
      chalk.green(`Transformed ${successCount} models`) +
        (failCount > 0 ? chalk.yellow(` (${failCount} failed)`) : '')
    );

    const sortedModels = Object.fromEntries(
      Object.entries(transformedModels).sort(([, a], [, b]) => {
        const providerCompare = a.provider.localeCompare(b.provider);
        if (providerCompare !== 0) {
          return providerCompare;
        }
        return a.model.localeCompare(b.model);
      })
    );

    const output = {
      _metadata: {
        source: sourceUrl,
        generated_at: timestamp,
        model_count: Object.keys(sortedModels).length,
        schema_version: '1.0.0',
      },
      models: sortedModels,
    };

    if (options.dryRun) {
      console.log(chalk.blue('Dry run mode - no files written'));
      console.log(chalk.gray(`Would write to: ${outputPath}`));
    } else {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(chalk.green(`✓ Written to ${outputPath}`));
    }

    if (options.summary) {
      const providerCounts: Record<string, number> = {};
      for (const model of Object.values(sortedModels)) {
        const providerName =
          PROVIDER_MAP[model.provider]?.name || model.provider;
        providerCounts[providerName] = (providerCounts[providerName] || 0) + 1;
      }

      console.log(chalk.bold('\nProvider Summary:'));
      const sortedProviders = Object.entries(providerCounts).sort(
        ([, a], [, b]) => b - a
      );
      const maxProviderLength = Math.max(
        ...sortedProviders.map(([p]) => p.length)
      );

      for (const [provider, count] of sortedProviders) {
        const bar = '█'.repeat(Math.floor(count / 2));
        const paddedProvider = provider.padEnd(maxProviderLength);
        console.log(`  ${paddedProvider} ${chalk.cyan(bar)} ${count}`);
      }
    }
  } catch (_error) {
    spinner.fail(chalk.red('Failed to sync models'));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('modeldb')
  .description('ModelDB data transformation and management tool')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync and transform models from LiteLLM')
  .option(
    '-s, --source <url>',
    'source URL for LiteLLM data',
    LITELLM_MODEL_URL
  )
  .option(
    '-o, --output <path>',
    'output path for transformed data',
    './src/models.json'
  )
  .option('-d, --dry-run', 'show what would be written without writing')
  .option('--summary', 'show provider summary after sync')
  .action(syncCommand);

program.parse(process.argv);
