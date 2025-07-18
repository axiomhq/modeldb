import { z } from 'zod';

export const ModelSchema = z.object({
  provider_id: z.string().describe('Provider identifier (e.g., "openai")'),
  provider_name: z.string().describe('Human-friendly display name'),

  model_id: z.string().describe('Clean model identifier (e.g., "gpt-4-turbo")'),
  model_slug: z
    .string()
    .describe('Full model name for API calls (e.g., "openai/gpt-4-turbo")'),
  model_name: z.string().describe('Human-friendly display name'),

  // Context and limits
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

  // Pricing - both per token and per million for convenience
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

  // Cache pricing (optional)
  cache_read_cost_per_token: z.number().nullable().optional(),
  cache_read_cost_per_million: z.number().nullable().optional(),
  cache_write_cost_per_token: z.number().nullable().optional(),
  cache_write_cost_per_million: z.number().nullable().optional(),

  // Capabilities
  supports_function_calling: z.boolean().default(false),
  supports_vision: z.boolean().default(false),
  supports_json_mode: z.boolean().default(false),
  supports_parallel_functions: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),

  model_type: z
    .enum([
      'chat',
      'completion',
      'embedding',
      'image',
      'audio',
      'rerank',
      'moderation',
    ])
    .default('chat'),

  deprecation_date: z
    .string()
    .nullable()
    .optional()
    .describe('Date when the model becomes deprecated (YYYY-MM-DD format)'),
});

export const ModelsSchema = z.array(ModelSchema);
export const ProvidersSchema = z.map(z.string(), z.array(ModelSchema));

export type Model = z.infer<typeof ModelSchema>;
export type Models = z.infer<typeof ModelsSchema>;
export type Provider = z.infer<typeof ProvidersSchema>;
