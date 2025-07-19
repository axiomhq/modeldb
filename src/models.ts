import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { modelsList } from './data/list';
import { modelsMap } from './data/map';
import {
  ModelPartialSchema,
  type ModelsPartial,
  ProjectSchema,
  FormatSchema,
  HeadersSchema,
} from './schema';
import { safeParseQueryCSV, objectsToCSV } from './csv';

export function registerModelsRoutes(app: OpenAPIHono) {
  const getModels = createRoute({
    method: 'get',
    path: '/api/models',
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


    if (query.deprecated !== undefined) {
      result = result.filter((model) =>
        query.deprecated
          ? model.deprecation_date !== undefined
          : model.deprecation_date === undefined
      );
    }


    if (projectFields.length > 0) {
      const projectedModels = result.map((model) => {
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
      const csv = objectsToCSV(result, undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return c.json(result, 200);
  });

  const getModel = createRoute({
    method: 'get',
    path: '/api/models/:id',
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
      const projectedModel: ModelsPartial = {};
      for (const field of projectFields) {
        if (field in model) {
          // @ts-expect-error
          projectedModel[field] = model[field as keyof typeof model];
        }
      }

      if (query.format === 'csv') {
        const csv = objectsToCSV([projectedModel], projectFields, query.headers);
        return c.text(csv, 200, {
          'Content-Type': 'text/csv',
        });
      }

      return c.json(projectedModel, 200);
    }

    if (query.format === 'csv') {
      const csv = objectsToCSV([model], undefined, query.headers);
      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
      });
    }

    return c.json(model, 200);
  });
}
