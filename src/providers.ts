import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { modelsByProvider } from './data/providers';
import {
  ModelPartialSchema,
  type ModelsPartial,
  PartialProvidersSchema,
  ProjectSchema,
  type ProvidersPartial,
} from './schema';
import { safeParseQueryCSV } from './util';

export function registerProvidersRoutes(app: OpenAPIHono) {
  const getProviders = createRoute({
    method: 'get',
    path: '/api/providers',
    tags: ['Providers'],
    summary: 'List providers',
    request: {
      query: z.object({
        filter: z
          .string()
          .optional()
          .describe('Comma-separated list of providers to return'),
        project: ProjectSchema,
      }),
    },
    responses: {
      200: {
        description: 'List of optionally filtered providers',
        content: {
          'application/json': {
            schema: PartialProvidersSchema,
          },
        },
      },
    },
  });

  app.openapi(getProviders, async (c) => {
    const query = c.req.valid('query');

    const providerFilter = safeParseQueryCSV(query.filter);
    const projectFields = safeParseQueryCSV(query.project);

    let result: ProvidersPartial = {};

    if (providerFilter.length > 0) {
      for (const provider of providerFilter) {
        if (provider in modelsByProvider) {
          result[provider] = modelsByProvider[provider];
        }
      }
    } else {
      result = modelsByProvider;
    }

    // Apply field projection if requested
    if (projectFields.length > 0) {
      for (const [provider, models] of Object.entries(result)) {
        result[provider] = models.map((model) => {
          const projectedModel: ModelsPartial = {};
          for (const field of projectFields) {
            if (field in model) {
              // @ts-expect-error
              projectedModel[field] = model[field as keyof typeof model];
            }
          }
          return projectedModel;
        });
      }
    }

    return c.json(result);
  });

  const getProvider = createRoute({
    method: 'get',
    path: '/api/providers/:id',
    tags: ['Providers'],
    summary: 'Get a single provider',
    request: {
      params: z.object({
        id: z.string().describe('Provider ID'),
      }),
      query: z.object({
        project: ProjectSchema.optional(),
      }),
    },
    responses: {
      200: {
        description: 'Provider models',
        content: {
          'application/json': {
            schema: z.array(ModelPartialSchema),
          },
        },
      },
    },
  });

  app.openapi(getProvider, async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    const models = modelsByProvider[id] || [];
    const projectFields = safeParseQueryCSV(query.project);

    // Apply field projection if requested
    if (projectFields.length > 0) {
      const projectedModels = models.map((model) => {
        const projectedModel: ModelsPartial = {};
        for (const field of projectFields) {
          if (field in model) {
            // @ts-expect-error
            projectedModel[field] = model[field as keyof typeof model];
          }
        }
        return projectedModel;
      });
      return c.json(projectedModels);
    }

    return c.json(models);
  });
}
