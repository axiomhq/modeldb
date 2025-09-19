import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { z } from 'zod';
import { objectsToCSV, safeParseQueryCSV } from './csv';
import { getDataStore } from './data-store';
import { fillNullsWithZeros, projectModelsFields } from './model-utils';
import { jsonResponse } from './response-utils';
import {
  FillWithZerosSchema,
  FormatSchema,
  HeadersSchema,
  ModelPartialSchema,
  PartialProvidersSchema,
  PrettySchema,
  ProjectSchema,
  type ProvidersPartial,
} from './schema';

// Helper functions to reduce complexity

function applyProjection(
  providers: ProvidersPartial,
  projectFields: string[]
): ProvidersPartial {
  if (projectFields.length === 0) {
    return providers;
  }

  const result: ProvidersPartial = {};
  for (const [provider, models] of Object.entries(providers)) {
    result[provider] = projectModelsFields(models, projectFields);
  }
  return result;
}

function applyFillZeros(providers: ProvidersPartial): ProvidersPartial {
  const result: ProvidersPartial = {};
  for (const [provider, models] of Object.entries(providers)) {
    result[provider] = models.map((model) => fillNullsWithZeros(model));
  }
  return result;
}

function flattenProvidersForCSV(
  providers: ProvidersPartial
): Record<string, unknown>[] {
  const flattened: Record<string, unknown>[] = [];
  for (const [provider, models] of Object.entries(providers)) {
    if (Array.isArray(models)) {
      for (const model of models) {
        flattened.push({ provider, ...model });
      }
    }
  }
  return flattened;
}

function respondProviders(
  c: Context,
  result: ProvidersPartial,
  projectFields: string[],
  format: string,
  headers: boolean,
  pretty: boolean
) {
  if (format === 'csv') {
    const flattened = flattenProvidersForCSV(result);
    const csv = objectsToCSV(
      flattened,
      projectFields.length > 0 ? ['provider', ...projectFields] : undefined,
      headers
    );
    return c.text(csv, 200, { 'Content-Type': 'text/csv' });
  }
  if (format === 'jsonl') {
    const flattened = flattenProvidersForCSV(result);
    const body = flattened.map((m) => JSON.stringify(m)).join('\n');
    return c.text(body, 200, { 'Content-Type': 'application/x-ndjson' });
  }
  return jsonResponse(c, result, 200, pretty);
}

function processModelsWithOptions(
  models: ProvidersPartial[string],
  projectFields: string[],
  fillWithZeros: boolean,
  format: string,
  headers: boolean,
  pretty: boolean,
  c: Context
) {
  // Apply projection if needed
  let processedModels =
    projectFields.length > 0
      ? projectModelsFields(models, projectFields)
      : models;

  // Apply fill-with-zeros if needed
  if (fillWithZeros) {
    processedModels = processedModels.map((model) => fillNullsWithZeros(model));
  }

  // Return CSV if requested
  if (format === 'csv') {
    const csv = objectsToCSV(
      processedModels,
      projectFields.length > 0 ? projectFields : undefined,
      headers
    );
    return c.text(csv, 200, { 'Content-Type': 'text/csv' });
  }

  // Return JSON
  return jsonResponse(c, processedModels, 200, pretty);
}

export function registerProvidersRoutes(app: OpenAPIHono) {
  const getProviders = createRoute({
    method: 'get',
    path: '/api/v1/providers',
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
        'fill-with-zeros': FillWithZerosSchema,
        pretty: PrettySchema,
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
    const store = getDataStore(c);
    const providersData = (await store.getProviders()) ?? {};

    // Filter providers
    let result: ProvidersPartial = {};
    if (providerFilter.length === 0) {
      result = providersData;
    } else {
      for (const provider of providerFilter) {
        if (provider in providersData) {
          result[provider] = providersData[provider];
        }
      }
    }

    // Apply projection
    result = applyProjection(result, projectFields);

    // Apply fill-with-zeros transformation
    if (query['fill-with-zeros']) {
      result = applyFillZeros(result);
    }

    return respondProviders(
      c,
      result,
      projectFields,
      query.format,
      query.headers,
      query.pretty
    );
  });

  const getProvider = createRoute({
    method: 'get',
    path: '/api/v1/providers/:id',
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
        'fill-with-zeros': FillWithZerosSchema,
        pretty: PrettySchema,
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

    const store = getDataStore(c);
    const providers = (await store.getProviders()) ?? {};
    const models = providers?.[id];

    if (!models) {
      if (query.format === 'csv') {
        return c.text('error\n"Provider not found"', 404, {
          'Content-Type': 'text/csv',
        });
      }
      return jsonResponse(
        c,
        { error: 'Provider not found' },
        404,
        query.pretty
      );
    }

    const projectFields = safeParseQueryCSV(query.project);

    // JSONL for provider models (one object per line)
    if (query.format === 'jsonl') {
      const processed =
        projectFields.length > 0
          ? projectModelsFields(models, projectFields)
          : models;
      const finalModels = query['fill-with-zeros']
        ? processed.map((m) => fillNullsWithZeros(m))
        : processed;
      const body = finalModels.map((m) => JSON.stringify(m)).join('\n');
      return c.text(body, 200, { 'Content-Type': 'application/x-ndjson' });
    }

    return processModelsWithOptions(
      models,
      projectFields,
      query['fill-with-zeros'],
      query.format,
      query.headers,
      query.pretty,
      c
    );
  });
}
