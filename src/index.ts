import { env } from 'cloudflare:workers';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { buildHome } from './home';
import { registerMetadataRoutes } from './metadata';
import { registerModelsRoutes } from './models';
import { registerOpenAPIRoutes } from './openapi';
import { registerProvidersRoutes } from './providers';

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      const firstError = result.error.issues[0];
      const field = firstError.path.join('.');
      const message = firstError.message;

      return c.json(
        {
          error: `Validation failed for field '${field}': ${message}`,
          code: 'VALIDATION_ERROR',
          details: {
            field,
            message,
          },
        },
        400
      );
    }
  },
});

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: '*',
    allowHeaders: '*',
    maxAge: 86400,
  })
);

if (env.ENV === 'production') {
  app.use('*', etag());
  app.use(
    '/api/v1/*',
    cache({
      cacheName: 'modeldb-api',
      cacheControl: 'max-age=3600, s-maxage=86400',
    })
  );
}

registerModelsRoutes(app);
registerProvidersRoutes(app);
registerOpenAPIRoutes(app);
registerMetadataRoutes(app);

app.get('/', async (c) => {
  return c.html(buildHome());
});

export default app;
