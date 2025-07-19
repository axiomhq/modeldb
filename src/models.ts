import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { modelsMap } from './data/map';
import {
  ModelPartialSchema,
  type ModelsPartial,
  ProjectSchema,
} from './schema';
import { safeParseQueryCSV } from './util';

export function registerModelsRoutes(app: OpenAPIHono) {
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
      }),
    },
    responses: {
      200: {
        description: 'Model details',
        content: {
          'application/json': {
            schema: ModelPartialSchema,
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
        },
      },
    },
  });

  app.openapi(getModel, async (c) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');

    const model = modelsMap[id];

    if (!model) {
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
      return c.json(projectedModel, 200);
    }

    return c.json(model, 200);
  });
}
