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
    mode: z.string().optional(),
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

function getModelType(
  mode: string | undefined,
  modelTypeMap: Map<string, string>
): string {
  if (!mode) {
    return 'chat';
  }
  return modelTypeMap.get(mode) || mode;
}

// Discover all capability fields from LiteLLM models
function discoverCapabilities(
  litellmModels: Record<string, LiteLLMModel>
): Set<string> {
  const capabilities = new Set<string>();

  for (const model of Object.values(litellmModels)) {
    if (!model || typeof model !== 'object') {
      continue;
    }

    for (const key of Object.keys(model)) {
      if (
        key.startsWith('supports_') &&
        typeof model[key as keyof LiteLLMModel] === 'boolean'
      ) {
        capabilities.add(key);
      }
    }
  }

  return capabilities;
}

// Discover all model types from LiteLLM models
function discoverModelTypes(
  litellmModels: Record<string, LiteLLMModel>
): Map<string, string> {
  const modelTypeMap = new Map<string, string>();

  // Add known mappings
  modelTypeMap.set('chat', 'chat');
  modelTypeMap.set('completion', 'completion');
  modelTypeMap.set('embedding', 'embedding');
  modelTypeMap.set('image_generation', 'image');
  modelTypeMap.set('audio_transcription', 'audio');
  modelTypeMap.set('audio_speech', 'audio');
  modelTypeMap.set('moderation', 'moderation');
  modelTypeMap.set('rerank', 'rerank');

  // Discover any new types
  for (const model of Object.values(litellmModels)) {
    if (!model || typeof model !== 'object' || !model.mode) {
      continue;
    }

    if (!modelTypeMap.has(model.mode)) {
      // For unknown types, use the mode as-is
      modelTypeMap.set(model.mode, model.mode);
    }
  }

  return modelTypeMap;
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

  // First, spread all fields from litellm
  const model: Model = {
    ...litellmModel,

    // Then override with our transformed fields
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

    // Model type
    model_type: getModelType(litellmModel.mode, modelTypeMap || new Map()),

    // Deprecation
    deprecation_date: litellmModel.deprecation_date || null,
  };

  // Add all discovered capability fields at the root level
  // These override any existing values from the spread
  if (knownCapabilities) {
    for (const capability of knownCapabilities) {
      const value = litellmModel[capability as keyof LiteLLMModel];
      if (typeof value === 'boolean') {
        model[capability] = value;
      }
    }
  }

  // Map special cases for backward compatibility
  // supports_json_mode maps from supports_response_schema
  if (litellmModel.supports_response_schema !== undefined) {
    model.supports_json_mode = litellmModel.supports_response_schema;
  }
  // supports_parallel_functions maps from supports_parallel_function_calling
  if (litellmModel.supports_parallel_function_calling !== undefined) {
    model.supports_parallel_functions =
      litellmModel.supports_parallel_function_calling;
  }

  // Ensure legacy capabilities are present
  model.supports_function_calling = model.supports_function_calling ?? false;
  model.supports_vision = model.supports_vision ?? false;
  model.supports_json_mode = model.supports_json_mode ?? false;
  model.supports_parallel_functions =
    model.supports_parallel_functions ?? false;

  // Remove the original litellm fields that we've transformed to avoid duplication
  const fieldsToOmit = [
    'litellm_provider',
    'mode',
    'cache_creation_input_token_cost',
    'cache_read_input_token_cost',
  ] as const;

  // Create a new object without the fields we want to omit
  const cleanModel = Object.keys(model).reduce((acc, key) => {
    if (!fieldsToOmit.includes(key as any)) {
      acc[key] = model[key];
    }
    return acc;
  }, {} as Model);

  return cleanModel;
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

function generateCapabilitiesFile(capabilities: Set<string>): string {
  const capabilitiesArray = Array.from(capabilities).sort();

  // Generate friendly names by removing 'supports_' prefix
  const friendlyNames: Record<string, string> = {};
  for (const cap of capabilitiesArray) {
    const friendly = cap.replace('supports_', '');
    friendlyNames[friendly] = cap;
  }

  return `// Auto-generated file - do not edit manually
// Generated at: ${new Date().toISOString()}

export const ALL_CAPABILITIES = ${JSON.stringify(capabilitiesArray, null, 2)} as const;

export const CAPABILITY_FRIENDLY_NAMES = ${JSON.stringify(friendlyNames, null, 2)} as const;

export const LEGACY_CAPABILITY_MAP = {
  function_calling: 'supports_function_calling',
  vision: 'supports_vision',
  json_mode: 'supports_json_mode',
  parallel_functions: 'supports_parallel_functions',
} as const;

export type DiscoveredCapability = typeof ALL_CAPABILITIES[number];
`;
}

function generateModelTypesFile(modelTypeMap: Map<string, string>): string {
  // Get unique model types (the values)
  const uniqueTypes = Array.from(new Set(modelTypeMap.values())).sort();

  // Create the mapping object
  const mapping: Record<string, string> = {};
  for (const [key, value] of modelTypeMap) {
    mapping[key] = value;
  }

  return `// Auto-generated file - do not edit manually
// Generated at: ${new Date().toISOString()}

export const ALL_MODEL_TYPES = ${JSON.stringify(uniqueTypes, null, 2)} as const;

export const MODEL_TYPE_MAPPING = ${JSON.stringify(mapping, null, 2)} as const;

export type DiscoveredModelType = typeof ALL_MODEL_TYPES[number];
`;
}

function generateFileContent(
  type:
    | 'map'
    | 'list'
    | 'metadata'
    | 'providers'
    | 'capabilities'
    | 'modelTypes',
  data: any
): string {
  switch (type) {
    case 'map':
      return `import type { Model } from '../schema';

export const modelsMap: Record<string, Model> = ${JSON.stringify(data, null, 2)} as const;
`;
    case 'list':
      return `import type { Models } from '../schema';

export const modelsList: Models = ${JSON.stringify(data, null, 2)} as const;
`;
    case 'metadata':
      return `export const modelsMetadata = ${JSON.stringify(data, null, 2)} as const;
`;
    case 'providers':
      return `import type { Providers } from '../schema';


export const modelsByProvider: Providers = ${JSON.stringify(data, null, 2)} as const;
`;
    case 'capabilities':
      return generateCapabilitiesFile(data);
    case 'modelTypes':
      return generateModelTypesFile(data);
    default:
      console.error(`Unsupported type: ${type}`);
      return '';
  }
}

async function syncCommand(options: {
  source?: string;
  output?: string;
  dryRun?: boolean;
  summary?: boolean;
  diff?: boolean;
}) {
  const sourceUrl = options.source || LITELLM_MODEL_URL;
  const outputDir = options.output || path.join(__dirname, '../src');

  const spinner = ora('Fetching models from LiteLLM...').start();

  let allCapabilities: Set<string> = new Set();

  try {
    const litellmModels = await fetchModels(sourceUrl);
    spinner.succeed(
      chalk.green(
        `Fetched ${Object.keys(litellmModels).length} models from LiteLLM`
      )
    );

    const timestamp = new Date().toISOString();

    // Discover all capabilities from the models
    const capabilitySpinner = ora('Discovering capabilities...').start();
    try {
      allCapabilities = discoverCapabilities(litellmModels);
      capabilitySpinner.succeed(
        chalk.green(`Discovered ${allCapabilities.size} capabilities`)
      );
    } catch (error) {
      capabilitySpinner.fail(chalk.red('Failed to discover capabilities'));
      console.error('Error:', error);
      throw error;
    }

    // Discover all model types from the models
    const modelTypeSpinner = ora('Discovering model types...').start();
    let modelTypeMap: Map<string, string>;
    try {
      modelTypeMap = discoverModelTypes(litellmModels);
      modelTypeSpinner.succeed(
        chalk.green(`Discovered ${modelTypeMap.size} model types`)
      );
    } catch (error) {
      modelTypeSpinner.fail(chalk.red('Failed to discover model types'));
      console.error('Error:', error);
      throw error;
    }

    const transformedModels: Record<string, Model> = {};
    let successCount = 0;
    let failCount = 0;

    const transformSpinner = ora('Transforming models...').start();

    for (const [litellmName, litellmModel] of Object.entries(litellmModels)) {
      try {
        const transformed = transformModel(
          litellmName,
          litellmModel,
          allCapabilities,
          modelTypeMap
        );
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

    if (options.diff) {
      // Generate file contents
      const mapContent = generateFileContent('map', sortedModels);
      const listContent = generateFileContent(
        'list',
        Object.values(sortedModels)
      );

      const providersContent = generateFileContent(
        'providers',
        sortedProviderModels
      );

      // Compare with existing files
      const dataDir = path.join(outputDir, 'data');
      let hasDiff = false;
      const diffs: Array<{
        file: string;
        status: 'added' | 'modified' | 'same';
      }> = [];

      // Check map.ts
      const mapPath = path.join(dataDir, 'map.ts');
      const mapExists = fs.existsSync(mapPath);
      if (mapExists) {
        const isSame = fs.readFileSync(mapPath, 'utf-8') === mapContent;
        diffs.push({ file: 'map.ts', status: isSame ? 'same' : 'modified' });
        if (!isSame) {
          hasDiff = true;
        }
      } else {
        diffs.push({ file: 'map.ts', status: 'added' });
        hasDiff = true;
      }

      // Check list.ts
      const listPath = path.join(dataDir, 'list.ts');
      const listExists = fs.existsSync(listPath);
      if (listExists) {
        const isSame = fs.readFileSync(listPath, 'utf-8') === listContent;
        diffs.push({ file: 'list.ts', status: isSame ? 'same' : 'modified' });
        if (!isSame) {
          hasDiff = true;
        }
      } else {
        diffs.push({ file: 'list.ts', status: 'added' });
        hasDiff = true;
      }

      // Skip metadata.ts check since it always changes due to timestamp

      // Check providers.ts
      const providersPath = path.join(dataDir, 'providers.ts');
      const providersExists = fs.existsSync(providersPath);
      if (providersExists) {
        const isSame =
          fs.readFileSync(providersPath, 'utf-8') === providersContent;
        diffs.push({
          file: 'providers.ts',
          status: isSame ? 'same' : 'modified',
        });
        if (!isSame) {
          hasDiff = true;
        }
      } else {
        diffs.push({ file: 'providers.ts', status: 'added' });
        hasDiff = true;
      }

      // Print diff summary
      console.log(chalk.bold('\nDiff Summary:'));
      for (const diff of diffs) {
        const icon =
          diff.status === 'same' ? '✓' : diff.status === 'added' ? '+' : '~';
        const color =
          diff.status === 'same'
            ? chalk.green
            : diff.status === 'added'
              ? chalk.blue
              : chalk.yellow;
        console.log(`  ${color(icon)} ${diff.file} (${diff.status})`);
      }

      if (hasDiff) {
        console.log(
          chalk.yellow(
            '\n⚠ Differences detected. Run sync without --diff to update files.'
          )
        );
        process.exit(1);
      } else {
        console.log(
          chalk.green('\n✓ No differences detected. Files are up to date.')
        );
        process.exit(0);
      }
    } else if (options.dryRun) {
      console.log(chalk.blue('Dry run mode - no files written'));
      console.log(chalk.gray(`Would write to: ${outputDir}/`));
      console.log(chalk.gray('  - map.json'));
      console.log(chalk.gray('  - list.json'));
      console.log(chalk.gray('  - metadata.json'));
      console.log(chalk.gray('  - providers.ts'));
    } else {
      const dataDir = path.join(outputDir, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Write models-map.ts (object format)
      const mapPath = path.join(dataDir, 'map.ts');
      const mapContent = generateFileContent('map', sortedModels);
      fs.writeFileSync(mapPath, mapContent);
      console.log(chalk.green(`✓ Written to ${mapPath}`));

      // Write models-list.ts (array format)
      const modelsList = Object.values(sortedModels);
      const listPath = path.join(dataDir, 'list.ts');
      const listContent = generateFileContent('list', modelsList);
      fs.writeFileSync(listPath, listContent);
      console.log(chalk.green(`✓ Written to ${listPath}`));

      // Write models-metadata.ts
      const metadataPath = path.join(dataDir, 'metadata.ts');
      const metadataContent = generateFileContent('metadata', metadata);
      fs.writeFileSync(metadataPath, metadataContent);
      console.log(chalk.green(`✓ Written to ${metadataPath}`));

      // Write models-providers.ts
      const providersPath = path.join(dataDir, 'providers.ts');
      const providersContent = generateFileContent(
        'providers',
        sortedProviderModels
      );
      fs.writeFileSync(providersPath, providersContent);
      console.log(chalk.green(`✓ Written to ${providersPath}`));

      // Write capabilities.ts
      const capabilitiesPath = path.join(dataDir, 'capabilities.ts');
      const capabilitiesContent = generateFileContent(
        'capabilities',
        allCapabilities
      );
      fs.writeFileSync(capabilitiesPath, capabilitiesContent);
      console.log(chalk.green(`✓ Written to ${capabilitiesPath}`));

      // Write modelTypes.ts
      const modelTypesPath = path.join(dataDir, 'modelTypes.ts');
      const modelTypesContent = generateFileContent('modelTypes', modelTypeMap);
      fs.writeFileSync(modelTypesPath, modelTypesContent);
      console.log(chalk.green(`✓ Written to ${modelTypesPath}`));
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
    './src'
  )
  .option('-d, --dry-run', 'show what would be written without writing')
  .option('--summary', 'show provider summary after sync')
  .option('--diff', 'compare new output with existing files without writing')
  .action(syncCommand);

program.parse(process.argv);
