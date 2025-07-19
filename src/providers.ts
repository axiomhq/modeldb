import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { modelsByProvider } from './data/providers';
import {
  ModelPartialSchema,
  type ModelsPartial,
  PartialProvidersSchema,
  ProjectSchema,
  type ProvidersPartial,
  FormatSchema,
  HeadersSchema,
} from './schema';
import { safeParseQueryCSV, objectsToCSV } from './csv';

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
        format: FormatSchema,
        headers: HeadersSchema,
      }),
    },
    responses: {
      200: {
        description: 'List of optionally filtered providers',
        content: {
          'application/json': {
            schema: PartialProvidersSchema,
          },
          'text/csv': {
            schema: z.string(),
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

    if (query.format === 'csv') {
      const flattened: any[] = [];
      for (const [provider, models] of Object.entries(result)) {
        if (Array.isArray(models)) {
          models.forEach(model => {
            flattened.push({ provider, ...model });
          });
        }
      }
      const csv = objectsToCSV(flattened, projectFields.length > 0 ? ['provider', ...projectFields] : undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return c.json(result, 200);
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
        format: FormatSchema,
        headers: HeadersSchema,
      }),
    },
    responses: {
      200: {
        description: 'Provider models',
        content: {
          'application/json': {
            schema: z.array(ModelPartialSchema),
          },
          'text/csv': {
            schema: z.string(),
          },
        },
      },
      404: {
        description: 'Provider not found',
        content: {
          'application/json': {
            schema: z.object({
              error: z.string(),
            }),
          },
          'text/csv': {
            schema: z.string(),
          },
        },
      },
    },
  });

  app.openapi(getProvider, async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    const models = modelsByProvider[id];

    if (!models) {
      if (query.format === 'csv') {
        return c.text('error\n"Provider not found"', 404, {
          'Content-Type': 'text/csv',
        });
      }
      return c.json({ error: 'Provider not found' }, 404);
    }

    const projectFields = safeParseQueryCSV(query.project);

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
      if (query.format === 'csv') {
        const csv = objectsToCSV(projectedModels, projectFields, query.headers);
        return c.text(csv, 200, {
          'Content-Type': 'text/csv',
        });
      }
      return c.json(projectedModels, 200);
    }

    if (query.format === 'csv') {
      const csv = objectsToCSV(models, undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return c.json(models, 200);
  });
}
