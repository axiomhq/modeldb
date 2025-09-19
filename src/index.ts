import { env } from 'cloudflare:workers';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cache } from 'hono/cache';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { getDataStore } from './data-store';
import { buildHome } from './home';
import { getCronLogger } from './logger';
import { registerMetadataRoutes } from './metadata';
import { registerModelsRoutes } from './models';
import { registerOpenAPIRoutes } from './openapi';
import { registerProvidersRoutes } from './providers';
import {
  buildArtifacts,
  LITELLM_MODEL_URL,
  readManifest,
  runSyncToKV,
  warmLatestCache,
  writeArtifactsToKV,
} from './sync';

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
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowHeaders: ['*'],
    exposeHeaders: ['*'],
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
  const store = getDataStore(c);
  const [list, meta] = await Promise.all([
    store.getList(),
    store.getMetadata(),
  ]);
  return c.html(
    buildHome(list ?? [], meta ?? { generated_at: new Date().toISOString() })
  );
});

// Admin refresh endpoint (token-protected). POST to trigger refresh.
app.post('/admin/refresh', async (c) => {
  const auth = c.req.header('authorization') || '';
  const token = (c.env as { ADMIN_TOKEN?: string })?.ADMIN_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const force = c.req.query('force') === 'true';
  const kv = (c.env as { MODELS_KV?: KVNamespace })?.MODELS_KV;
  if (!kv) {
    return c.json({ error: 'KV not configured' }, 500);
  }

  // If not forced, check ETag to avoid unnecessary rebuilds
  if (!force) {
    try {
      const res = await fetch(LITELLM_MODEL_URL, { method: 'HEAD' });
      const remoteEtag = res.headers.get('etag');
      const manifest = await readManifest(kv);
      if (remoteEtag && manifest?.etag && remoteEtag === manifest.etag) {
        return c.json({ status: 'not_modified' }, 200);
      }
    } catch {
      // Ignore ETag check errors and proceed with refresh
    }
  }

  const artifacts = await runSyncToKV(kv);
  return c.json({
    status: 'ok',
    version: artifacts.version,
    model_count: artifacts.metadata.model_count,
  });
});

// Admin health/manifest endpoint (token-protected). GET to inspect status.
app.get('/admin/health', async (c) => {
  const auth = c.req.header('authorization') || '';
  const token = (c.env as { ADMIN_TOKEN?: string })?.ADMIN_TOKEN;
  if (!token || auth !== `Bearer ${token}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const kv = (c.env as { MODELS_KV?: KVNamespace })?.MODELS_KV;
  const manifest = kv ? await readManifest(kv) : null;

  // Check warmed cache presence
  const paths = [
    '/cache/v1/latest/list.json',
    '/cache/v1/latest/map.json',
    '/cache/v1/latest/providers.json',
    '/cache/v1/latest/metadata.json',
  ];
  const cacheChecks = await Promise.all(
    paths.map((p) =>
      caches.default.match(new Request(`https://modeldb.internal${p}`))
    )
  );

  return c.json({
    status: 'ok',
    kv_bound: Boolean(kv),
    latest: manifest?.latest ?? null,
    versions: manifest?.versions?.length ?? 0,
    cache: {
      list: Boolean(cacheChecks[0]),
      map: Boolean(cacheChecks[1]),
      providers: Boolean(cacheChecks[2]),
      metadata: Boolean(cacheChecks[3]),
    },
  });
});

// Cloudflare Scheduled event handler (hourly cron configured via wrangler.jsonc)
export async function scheduled(
  _event: ScheduledController,
  runtimeEnv: { MODELS_KV?: KVNamespace },
  _ctx: ExecutionContext
) {
  const logger = getCronLogger();
  const kv = runtimeEnv?.MODELS_KV;
  if (!kv) {
    logger.error('KV namespace not bound');
    return;
  }
  try {
    // Use remote ETag to skip if unchanged
    const head = await fetch(LITELLM_MODEL_URL, { method: 'HEAD' });
    const remoteEtag = head.headers.get('etag');
    const manifest = await readManifest(kv);
    if (remoteEtag && manifest?.etag && remoteEtag === manifest.etag) {
      logger.info('Manifest unchanged; skipping build');
      return;
    }
  } catch (e) {
    logger.error('HEAD request failed, proceeding with build', e);
    // On HEAD failure, proceed with full fetch to be safe
  }
  try {
    const artifacts = await buildArtifacts();
    await writeArtifactsToKV(kv, artifacts);
    await warmLatestCache(artifacts);
    logger.info(`Artifacts built and cached (version=${artifacts.version})`);
  } catch (e) {
    logger.error('Failed to build artifacts', e);
    // swallow to avoid failing the cron
  }
}

export default {
  fetch: app.fetch,
  scheduled,
};
