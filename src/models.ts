import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { objectsToCSV, safeParseQueryCSV } from './csv';
import { modelsList } from './data/list';
import { modelsMap } from './data/map';
import {
  fillNullsWithZeros,
  projectModelFields,
  projectModelsFields,
} from './model-utils';
import {
  FillWithZerosSchema,
  FormatSchema,
  HeadersSchema,
  ModelPartialSchema,
  type ModelsPartial,
  ProjectSchema,
} from './schema';

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

  app.openapi(getModels, async (c) => {
    const query = c.req.valid('query');

    const prefixFilter = safeParseQueryCSV(query.prefixes);
    const providerFilter = safeParseQueryCSV(query.providers);
    const typeFilter = safeParseQueryCSV(query.type);
    const capabilityFilter = safeParseQueryCSV(query.capability);
    const projectFields = safeParseQueryCSV(query.project);

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
        return capabilityFilter.every((capability) => {
          // Map capability names to model properties
          const capabilityMap: Record<string, keyof typeof model> = {
            function_calling: 'supports_function_calling',
            vision: 'supports_vision',
            json_mode: 'supports_json_mode',
            parallel_functions: 'supports_parallel_functions',
          };

          const modelProperty = capabilityMap[capability];
          if (!modelProperty) {
            return false; // Unknown capability
          }

          return model[modelProperty] === true;
        });
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

      return c.json(finalModels, 200);
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

    return c.json(result, 200);
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

  app.openapi(getModel, async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    const model = modelsMap[id];

    if (!model) {
      if (query.format === 'csv') {
        return c.text('error\n"Model not found"', 404, {
          'Content-Type': 'text/csv',
        });
      }
      return c.json({ error: 'Model not found' }, 404);
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

      return c.json(finalModel, 200);
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

    return c.json(resultModel, 200);
  });
}
