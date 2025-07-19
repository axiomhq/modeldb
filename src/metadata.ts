import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { modelsList } from './data/list';
import { modelsMetadata } from './data/metadata';

const MetadataSchema = z.object({
  source: z.string().describe('Source URL of the model data'),
  generated_at: z
    .string()
    .describe('ISO timestamp of when the data was generated'),
  model_count: z.number().describe('Total number of models in the database'),
  schema_version: z.string().describe('Version of the schema used'),
  stats: z.object({
    providers: z
      .record(z.string(), z.number())
      .describe('Model count by provider'),
    types: z.record(z.string(), z.number()).describe('Model count by type'),
    capabilities: z.object({
      supports_function_calling: z
        .number()
        .describe('Models supporting function calling'),
      supports_vision: z.number().describe('Models supporting vision'),
      supports_json_mode: z.number().describe('Models supporting JSON mode'),
      supports_parallel_functions: z
        .number()
        .describe('Models supporting parallel functions'),
      supports_streaming: z.number().describe('Models supporting streaming'),
    }),
    deprecation: z.object({
      active: z.number().describe('Number of active models'),
      deprecated: z.number().describe('Number of deprecated models'),
    }),
  }),
});

function calculateStatistics() {
  // Calculate provider stats
  const providerStats: Record<string, number> = {};
  const typeStats: Record<string, number> = {};
  const capabilityStats = {
    supports_function_calling: 0,
    supports_vision: 0,
    supports_json_mode: 0,
    supports_parallel_functions: 0,
    supports_streaming: 0,
  };
  let deprecatedCount = 0;

  // Process all models to gather statistics
  for (const model of modelsList) {
    // Provider stats
    providerStats[model.provider_id] =
      (providerStats[model.provider_id] || 0) + 1;

    // Type stats
    typeStats[model.model_type] = (typeStats[model.model_type] || 0) + 1;

    // Capability stats
    if (model.supports_function_calling) {
      capabilityStats.supports_function_calling++;
    }
    if (model.supports_vision) {
      capabilityStats.supports_vision++;
    }
    if (model.supports_json_mode) {
      capabilityStats.supports_json_mode++;
    }
    if (model.supports_parallel_functions) {
      capabilityStats.supports_parallel_functions++;
    }

    // Deprecation stats
    if (model.deprecation_date) {
      deprecatedCount++;
    }
  }

  return {
    providers: providerStats,
    types: typeStats,
    capabilities: capabilityStats,
    deprecation: {
      active: modelsList.length - deprecatedCount,
      deprecated: deprecatedCount,
    },
  };
}

export function registerMetadataRoutes(app: OpenAPIHono) {
  const getMetadata = createRoute({
    method: 'get',
    path: '/api/metadata',
    tags: ['Metadata'],
    summary: 'Get models metadata',
    responses: {
      200: {
        description: 'Models metadata information',
        content: {
          'application/json': {
            schema: MetadataSchema,
          },
        },
      },
    },
  });

  app.openapi(getMetadata, async (c) => {
    const stats = calculateStatistics();

    const response = {
      ...modelsMetadata,
      stats,
    };

    return c.json(response, 200);
  });
}
