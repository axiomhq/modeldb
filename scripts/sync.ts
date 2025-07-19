import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { z } from 'zod';
import type { Model } from '../src/schema';
import { generateDisplayName } from './names';
import { getProviderDisplayName } from './providers';

const LITELLM_MODEL_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json';

const LiteLLMModelSchema = z
  .object({
    litellm_provider: z.string(),
    mode: z.enum([
      'chat',
      'embedding',
      'completion',
      'image_generation',
      'audio_transcription',
      'audio_speech',
      'moderation',
      'rerank',
    ]),
    supports_function_calling: z.boolean().optional(),
    supports_parallel_function_calling: z.boolean().optional(),
    supports_vision: z.boolean().optional(),
    supports_audio_input: z.boolean().optional(),
    supports_audio_output: z.boolean().optional(),
    supports_prompt_caching: z.boolean().optional(),
    supports_response_schema: z.boolean().optional(),
    supports_system_messages: z.boolean().optional(),
    supports_reasoning: z.boolean().optional(),
    supports_web_search: z.boolean().optional(),
    input_cost_per_token: z.number(),
    output_cost_per_token: z.number(),
    output_cost_per_reasoning_token: z.number().optional(),
    cache_creation_input_token_cost: z.number().optional(),
    cache_read_input_token_cost: z.number().optional(),
    search_context_cost_per_query: z
      .object({
        search_context_size_low: z.number(),
        search_context_size_medium: z.number(),
        search_context_size_high: z.number(),
      })
      .optional(),
    file_search_cost_per_1k_calls: z.number().optional(),
    file_search_cost_per_gb_per_day: z.number().optional(),
    vector_store_cost_per_gb_per_day: z.number().optional(),
    computer_use_input_cost_per_1k_tokens: z.number().optional(),
    computer_use_output_cost_per_1k_tokens: z.number().optional(),
    code_interpreter_cost_per_session: z.number().optional(),
    max_input_tokens: z.number(),
    max_output_tokens: z.number(),
    supported_regions: z.array(z.string()).optional(),
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
  const providerId = transformProviderId(litellmModel.litellm_provider);
  const modelId = transformModelId(litellmName, providerId);

  const inputCost = litellmModel.input_cost_per_token || 0;
  const outputCost = litellmModel.output_cost_per_token || 0;

  const model: Model = {
    model_id: modelId,
    model_name: generateDisplayName(modelId),

    provider_id: providerId,
    provider_name: getProviderDisplayName(providerId),

    // Context and limits
    max_input_tokens: litellmModel.max_input_tokens || null,
    max_output_tokens: litellmModel.max_output_tokens || null,

    // Pricing - both per token and per million
    input_cost_per_token: inputCost,
    input_cost_per_million: inputCost * 1_000_000,
    output_cost_per_token: outputCost,
    output_cost_per_million: outputCost * 1_000_000,

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

    // Capabilities
    supports_function_calling: litellmModel.supports_function_calling ?? false,
    supports_vision: litellmModel.supports_vision ?? false,
    supports_json_mode: litellmModel.supports_response_schema ?? false,
    supports_parallel_functions:
      litellmModel.supports_parallel_function_calling ?? false,

    // Model type
    model_type: getModelType(litellmModel.mode),

    // Deprecation
    deprecation_date: litellmModel.deprecation_date || null,
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
  const sourceUrl = options.source || LITELLM_MODEL_URL;
  const outputDir = options.output || path.join(__dirname, '../src');

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
          transformedModels[transformed.model_id] = transformed;
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
        const providerCompare = a.provider_id.localeCompare(b.provider_id);
        if (providerCompare !== 0) {
          return providerCompare;
        }
        return a.model_id.localeCompare(b.model_id);
      })
    );

    const metadata = {
      source: sourceUrl,
      generated_at: timestamp,
      model_count: Object.keys(sortedModels).length,
      schema_version: '1.0.0',
    };

    // Create provider-based grouping
    const modelsByProvider: Record<string, Model[]> = {};
    for (const model of Object.values(sortedModels)) {
      if (!modelsByProvider[model.provider_id]) {
        modelsByProvider[model.provider_id] = [];
      }
      modelsByProvider[model.provider_id].push(model);
    }

    // Sort providers and their models
    const sortedProviderModels = Object.fromEntries(
      Object.entries(modelsByProvider)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([provider, models]) => [
          provider,
          models.sort((a, b) => a.model_id.localeCompare(b.model_id)),
        ])
    );

    if (options.dryRun) {
      console.log(chalk.blue('Dry run mode - no files written'));
      console.log(chalk.gray(`Would write to: ${outputDir}/`));
      console.log(chalk.gray('  - map.json'));
      console.log(chalk.gray('  - list.json'));
      console.log(chalk.gray('  - metadata.json'));
      console.log(chalk.gray('  - providers.ts'));
    } else {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write models-map.ts (object format)
      const mapPath = path.join(outputDir, 'map.ts');
      const mapContent = `import type { Model } from '../schema';

export const modelsMap: Record<string, Model> = ${JSON.stringify(sortedModels, null, 2)} as const;
`;
      fs.writeFileSync(mapPath, mapContent);
      console.log(chalk.green(`✓ Written to ${mapPath}`));

      // Write models-list.ts (array format)
      const modelsList = Object.values(sortedModels);
      const listPath = path.join(outputDir, 'list.ts');
      const listContent = `import type { Models } from '../schema';

export const modelsList: Models = ${JSON.stringify(modelsList, null, 2)} as const;
`;
      fs.writeFileSync(listPath, listContent);
      console.log(chalk.green(`✓ Written to ${listPath}`));

      // Write models-metadata.ts
      const metadataPath = path.join(outputDir, 'metadata.ts');
      const metadataContent = `export const modelsMetadata = ${JSON.stringify(metadata, null, 2)} as const;
`;
      fs.writeFileSync(metadataPath, metadataContent);
      console.log(chalk.green(`✓ Written to ${metadataPath}`));

      // Write models-providers.ts
      const providersPath = path.join(outputDir, 'providers.ts');
      const providersContent = `import type { Providers } from '../schema';

export const modelsByProvider: Providers = ${JSON.stringify(sortedProviderModels, null, 2)} as const;
`;
      fs.writeFileSync(providersPath, providersContent);
      console.log(chalk.green(`✓ Written to ${providersPath}`));
    }

    if (options.summary) {
      const providerCounts: Record<string, number> = {};
      for (const model of Object.values(sortedModels)) {
        const providerName = getProviderDisplayName(model.provider_id);
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
    'output directory for transformed data files',
    './src/data'
  )
  .option('-d, --dry-run', 'show what would be written without writing')
  .option('--summary', 'show provider summary after sync')
  .action(syncCommand);

program.parse(process.argv);
