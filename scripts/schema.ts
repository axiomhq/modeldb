import { z } from 'zod';

// Flat model schema - all fields at root level for simplicity
export const ModelSchema = z.object({
  model: z.string().describe('Clean model identifier (e.g., "gpt-4-turbo")'),
  provider: z.string().describe('Provider identifier (e.g., "openai")'),
  model_name: z
    .string()
    .describe('Full model name for API calls (e.g., "openai/gpt-4-turbo")'),
  display_name: z.string().describe('Human-friendly display name'),
  description: z
    .string()
    .nullable()
    .optional()
    .describe('Short description of the model'),

  // Pricing - both per token and per million for convenience
  input_cost_per_token: z
    .number()
    .nullable()
    .describe('Input cost per token in USD'),
  input_cost_per_million: z
    .number()
    .nullable()
    .describe('Input cost per million tokens in USD'),
  output_cost_per_token: z
    .number()
    .nullable()
    .describe('Output cost per token in USD'),
  output_cost_per_million: z
    .number()
    .nullable()
    .describe('Output cost per million tokens in USD'),

  // Cache pricing (optional)
  cache_read_cost_per_token: z.number().nullable().optional(),
  cache_read_cost_per_million: z.number().nullable().optional(),
  cache_write_cost_per_token: z.number().nullable().optional(),
  cache_write_cost_per_million: z.number().nullable().optional(),

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

  // Capabilities - simple boolean flags
  supports_function_calling: z.boolean().default(false),
  supports_vision: z.boolean().default(false),
  supports_json_mode: z.boolean().default(false),
  supports_parallel_functions: z.boolean().default(false),
  supports_streaming: z.boolean().default(true),

  // Model type
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
});

// Type export
export type Model = z.infer<typeof ModelSchema>;
