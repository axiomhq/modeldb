import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { objectsToCSV, safeParseQueryCSV } from './csv';
import {
  CAPABILITY_FRIENDLY_NAMES,
  LEGACY_CAPABILITY_MAP,
} from './data/capabilities';
import { getDataStore } from './data-store';
import {
  fillNullsWithZeros,
  projectModelFields,
  projectModelsFields,
} from './model-utils';
import { jsonResponse } from './response-utils';
import {
  FillWithZerosSchema,
  FormatSchema,
  HeadersSchema,
  type Model,
  ModelPartialSchema,
  PrettySchema,
  ProjectSchema,
} from './schema';

// Helper function to check if a model has a capability
function modelHasCapability(model: Model, capability: string): boolean {
  // Check legacy mapping first for backwards compatibility
  const legacyProperty =
    LEGACY_CAPABILITY_MAP[capability as keyof typeof LEGACY_CAPABILITY_MAP];
  if (legacyProperty && model[legacyProperty as keyof typeof model] === true) {
    return true;
  }

  // Check friendly name mapping (e.g., "reasoning" -> "supports_reasoning")
  const fullCapabilityName =
    CAPABILITY_FRIENDLY_NAMES[
      capability as keyof typeof CAPABILITY_FRIENDLY_NAMES
    ];
  if (
    fullCapabilityName &&
    model[fullCapabilityName as keyof typeof model] === true
  ) {
    return true;
  }

  // Check direct capability name (e.g., "supports_reasoning")
  if (
    capability.startsWith('supports_') &&
    model[capability as keyof typeof model] === true
  ) {
    return true;
  }

  return false;
}

export function registerModelsRoutes(app: OpenAPIHono) {
  const getModels = createRoute({
    method: 'get',
    path: '/api/v1/models',
    tags: ['Models'],
    summary: 'List models',
    request: {
      query: z.object({
        prefixes: z
          .string()
          .optional()
          .describe('Comma-separated list of prefixes to filter models'),
        providers: z
          .string()
          .optional()
          .describe('Comma-separated list of providers to filter models'),
        type: z
          .string()
          .optional()
          .describe('Comma-separated list of model types to filter'),
        capability: z
          .string()
          .optional()
          .describe('Comma-separated list of capabilities to filter'),
        deprecated: z
          .string()
          .optional()
          .transform((val) => {
            if (val === 'true') {
              return true;
            }
            if (val === 'false') {
              return false;
            }
            return;
          })
          .describe('Filter models by deprecation status (true/false)'),
        project: ProjectSchema,
        format: FormatSchema,
        headers: HeadersSchema,
        'fill-with-zeros': FillWithZerosSchema,
        pretty: PrettySchema,
      }),
    },
    responses: {
      200: {
        description: 'List of optionally filtered models',
        content: {
          'application/json': {
            schema: z.array(ModelPartialSchema),
          },
          'text/csv': {
            schema: z.string(),
          },
        },
      },
    },
  });

  // biome-ignore lint: disable
  app.openapi(getModels, async (c) => {
    const query = c.req.valid('query');

    const prefixFilter = safeParseQueryCSV(query.prefixes);
    const providerFilter = safeParseQueryCSV(query.providers);
    const typeFilter = safeParseQueryCSV(query.type);
    const capabilityFilter = safeParseQueryCSV(query.capability);
    const projectFields = safeParseQueryCSV(query.project);

    const store = getDataStore(c);
    const modelsList = (await store.getList()) ?? [];

    let result = modelsList;

    if (prefixFilter.length > 0) {
      result = result.filter((model) =>
        prefixFilter.some((prefix) => model.model_id.startsWith(prefix))
      );
    }

    if (providerFilter.length > 0) {
      result = result.filter((model) =>
        providerFilter.includes(model.provider_id)
      );
    }

    if (typeFilter.length > 0) {
      result = result.filter((model) => typeFilter.includes(model.model_type));
    }

    if (capabilityFilter.length > 0) {
      result = result.filter((model) => {
        return capabilityFilter.every((capability) =>
          modelHasCapability(model, capability)
        );
      });
    }

    if (query.deprecated !== undefined) {
      result = result.filter((model) =>
        query.deprecated
          ? model.deprecation_date !== undefined
          : model.deprecation_date === undefined
      );
    }

    if (projectFields.length > 0) {
      const projectedModels = projectModelsFields(result, projectFields);

      // Apply fill-with-zeros transformation to projected models
      const finalModels = query['fill-with-zeros']
        ? projectedModels.map((model) => fillNullsWithZeros(model))
        : projectedModels;

      if (query.format === 'csv') {
        const csv = objectsToCSV(finalModels, projectFields, query.headers);
        return c.text(csv, 200, {
          'Content-Type': 'text/csv',
        });
      }

      return jsonResponse(c, finalModels, 200, query.pretty);
    }

    // Apply fill-with-zeros transformation
    if (query['fill-with-zeros']) {
      result = result.map((model) => fillNullsWithZeros(model));
    }

    if (query.format === 'csv') {
      const csv = objectsToCSV(result, undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return jsonResponse(c, result, 200, query.pretty);
  });

  const getModel = createRoute({
    method: 'get',
    path: '/api/v1/models/:id',
    tags: ['Models'],
    summary: 'Get a single model',
    request: {
      params: z.object({
        id: z.string().describe('Model ID'),
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
        description: 'Model details',
        content: {
          'application/json': {
            schema: ModelPartialSchema,
          },
          'text/csv': {
            schema: z.string(),
          },
        },
      },
      404: {
        description: 'Model not found',
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

  // biome-ignore lint: disable
  app.openapi(getModel, async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    const store = getDataStore(c);
    const map = (await store.getMap()) ?? {};
    const model = map?.[id];

    if (!model) {
      if (query.format === 'csv') {
        return c.text('error\n"Model not found"', 404, {
          'Content-Type': 'text/csv',
        });
      }
      return jsonResponse(c, { error: 'Model not found' }, 404, query.pretty);
    }

    const projectFields = safeParseQueryCSV(query.project);

    if (projectFields.length > 0) {
      const projectedModel = projectModelFields(model, projectFields);

      // Apply fill-with-zeros transformation
      const finalModel = query['fill-with-zeros']
        ? fillNullsWithZeros(projectedModel)
        : projectedModel;

      if (query.format === 'csv') {
        const csv = objectsToCSV([finalModel], projectFields, query.headers);
        return c.text(csv, 200, {
          'Content-Type': 'text/csv',
        });
      }

      return jsonResponse(c, finalModel, 200, query.pretty);
    }

    // Apply fill-with-zeros transformation to full model
    const resultModel = query['fill-with-zeros']
      ? fillNullsWithZeros(model)
      : model;

    if (query.format === 'csv') {
      const csv = objectsToCSV([resultModel], undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return jsonResponse(c, resultModel, 200, query.pretty);
  });
}
