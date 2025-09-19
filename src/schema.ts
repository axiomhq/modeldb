import { z } from 'zod';

export const ModelSchema = z
  .object({
    provider_id: z.string().describe('Provider identifier (e.g., "openai")'),
    provider_name: z.string().describe('Human-friendly display name'),

    model_id: z
      .string()
      .describe('Clean model identifier (e.g., "gpt-4-turbo")'),
    model_name: z.string().describe('Human-friendly display name'),

    max_input_tokens: z
      .number()
      .nullable()
      .optional()
      .describe('Maximum input tokens'),
    max_output_tokens: z
      .number()
      .nullable()
      .optional()
      .describe('Maximum output tokens per request'),

    input_cost_per_token: z
      .number()
      .nullable()
      .optional()
      .describe('Input cost per token in USD'),
    input_cost_per_million: z
      .number()
      .nullable()
      .optional()
      .describe('Input cost per million tokens in USD'),
    output_cost_per_token: z.number().describe('Output cost per token in USD'),
    output_cost_per_million: z
      .number()
      .describe('Output cost per million tokens in USD'),

    cache_read_cost_per_token: z.number().nullable().optional(),
    cache_read_cost_per_million: z.number().nullable().optional(),
    cache_write_cost_per_token: z.number().nullable().optional(),
    cache_write_cost_per_million: z.number().nullable().optional(),

    supports_function_calling: z.boolean().default(false),
    supports_vision: z.boolean().default(false),
    supports_json_mode: z.boolean().default(false),
    supports_parallel_functions: z.boolean().default(false),

    model_type: z
      .string()
      .default('chat')
      .describe('Model type (e.g., chat, completion, embedding)'),

    deprecation_date: z
      .string()
      .nullable()
      .optional()
      .describe('Date when the model becomes deprecated (YYYY-MM-DD format)'),
  })
  .passthrough();

export const ModelPartialSchema = ModelSchema.partial();
export const ModelsSchema = z.array(ModelSchema);
export const ProvidersSchema = z.record(z.string(), ModelsSchema);
export const PartialProvidersSchema = z.record(
  z.string(),
  z.array(ModelSchema.partial())
);

export const ProjectSchema = z
  .string()
  .optional()
  .describe('Comma-separated list of fields to return');
export const LimitSchema = z.number().min(1).max(2000).default(2000).optional();
export const OffsetSchema = z.number().min(0).default(0).optional();

export const FormatSchema = z
  .enum(['json', 'csv', 'jsonl'])
  .default('json')
  .describe('Response format (json or csv)');

export const HeadersSchema = z
  .string()
  .optional()
  .transform((val) => val === 'true')
  .describe(
    'Include headers in CSV output (defaults to false, use headers=true to include)'
  );

export const FillWithZerosSchema = z
  .string()
  .optional()
  .default('true')
  .transform((val) => val !== 'false')
  .describe('Replace null values with 0 (true/false, defaults to true)');

export const PrettySchema = z
  .string()
  .optional()
  .transform((val) => val !== undefined)
  .describe(
    'Pretty print JSON output with indentation (presence of parameter enables it)'
  );

export type BaseModel = z.infer<typeof ModelSchema>;
export type Model = BaseModel & { [key: string]: unknown };
export type Models = Model[];
export type ModelsPartial = Partial<Model>;
export type Providers = Record<string, Models>;
export type ProvidersPartial = Record<string, Partial<Model>[]>;
