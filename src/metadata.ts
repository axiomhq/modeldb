import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { objectsToCSV } from './csv';
import { ALL_CAPABILITIES } from './data/capabilities';
import { modelsList } from './data/list';
import { modelsMetadata } from './data/metadata';
import { jsonResponse } from './response-utils';
import { FormatSchema, HeadersSchema, PrettySchema } from './schema';

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
    capabilities: z
      .record(z.string(), z.number())
      .describe('Model count by capability'),
    deprecation: z.object({
      active: z.number().describe('Number of active models'),
      deprecated: z.number().describe('Number of deprecated models'),
    }),
  }),
});

function countModelCapabilities(
  model: (typeof modelsList)[0],
  capabilityStats: Record<string, number>
): void {
  // Count all capability fields directly from the model
  for (const capability of ALL_CAPABILITIES) {
    if (model[capability as keyof typeof model] === true) {
      capabilityStats[capability]++;
    }
  }
}

function calculateStatistics() {
  const providerStats: Record<string, number> = {};
  const typeStats: Record<string, number> = {};
  const capabilityStats: Record<string, number> = {};
  let deprecatedCount = 0;

  // Initialize capability stats for all discovered capabilities
  for (const capability of ALL_CAPABILITIES) {
    capabilityStats[capability] = 0;
  }

  for (const model of modelsList) {
    providerStats[model.provider_id] =
      (providerStats[model.provider_id] || 0) + 1;

    typeStats[model.model_type] = (typeStats[model.model_type] || 0) + 1;

    countModelCapabilities(model, capabilityStats);

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
    path: '/api/v1/metadata',
    tags: ['Metadata'],
    summary: 'Get models metadata',
    request: {
      query: z.object({
        format: FormatSchema,
        headers: HeadersSchema,
        pretty: PrettySchema,
      }),
    },
    responses: {
      200: {
        description: 'Models metadata information',
        content: {
          'application/json': {
            schema: MetadataSchema,
          },
          'text/csv': {
            schema: z.string(),
          },
        },
      },
    },
  });

  app.openapi(getMetadata, async (c) => {
    const query = c.req.valid('query');
    const stats = calculateStatistics();

    const response = {
      ...modelsMetadata,
      stats,
    };

    if (query.format === 'csv') {
      const flatData = [
        {
          source: response.source,
          generated_at: response.generated_at,
          model_count: response.model_count,
          schema_version: response.schema_version,
          total_providers: Object.keys(response.stats.providers).length,
          total_active: response.stats.deprecation.active,
          total_deprecated: response.stats.deprecation.deprecated,
          ...Object.entries(response.stats.providers).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [`provider_${key}`]: value,
            }),
            {}
          ),
          ...Object.entries(response.stats.types).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [`type_${key}`]: value,
            }),
            {}
          ),
          ...Object.entries(response.stats.capabilities).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [`capability_${key}`]: value,
            }),
            {}
          ),
        },
      ];
      const csv = objectsToCSV(flatData, undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return jsonResponse(c, response, 200, query.pretty);
  });
}
