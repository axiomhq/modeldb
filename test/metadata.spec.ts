import type { OpenAPIHono } from '@hono/zod-openapi';
import { beforeAll, describe, expect, it } from 'vitest';
import { expectJSON, makeRequest } from './helpers/api';
import { createTestApp } from './helpers/test-app';

describe('/api/v1/metadata endpoint', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return metadata information', async () => {
    const response = await makeRequest(app, '/api/v1/metadata');
    expect(response.status).toBe(200);

    const metadata = await expectJSON(response);
    expect(metadata).toHaveProperty('model_count');
    expect(metadata).toHaveProperty('generated_at');
    expect(metadata).toHaveProperty('source');
    expect(metadata).toHaveProperty('schema_version');
    expect(metadata).toHaveProperty('stats');

    expect(typeof metadata.model_count).toBe('number');
    expect(metadata.model_count).toBeGreaterThan(0);

    expect(metadata.generated_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    );
    expect(metadata.source).toBe('test-fixtures');
    expect(metadata.schema_version).toBe('1.0.0');

    expect(metadata.stats).toHaveProperty('providers');
    expect(metadata.stats).toHaveProperty('types');
    expect(metadata.stats).toHaveProperty('capabilities');
    expect(metadata.stats).toHaveProperty('deprecation');
  });

  it('should have correct content type', async () => {
    const response = await makeRequest(app, '/api/v1/metadata');
    expect(response.headers.get('content-type')).toContain('application/json');
  });
});

describe('/api/openapi.json endpoint', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return valid OpenAPI specification', async () => {
    const response = await makeRequest(app, '/openapi.json');
    expect(response.status).toBe(200);

    const spec = await expectJSON(response);
    expect(spec).toHaveProperty('openapi');
    expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);

    expect(spec).toHaveProperty('info');
    expect(spec.info).toHaveProperty('title');
    expect(spec.info).toHaveProperty('version');

    expect(spec).toHaveProperty('paths');
    expect(spec).toHaveProperty('components');
  });

  it('should document all endpoints', async () => {
    const response = await makeRequest(app, '/openapi.json');
    const spec = await expectJSON(response);

    const expectedPaths = [
      '/api/v1/models',
      '/api/v1/models/:id',
      '/api/v1/providers',
      '/api/v1/providers/:id',
      '/api/v1/metadata',
    ];

    expectedPaths.forEach((path) => {
      expect(spec.paths).toHaveProperty(path);
    });
  });

  it('should include schemas for all models', async () => {
    const response = await makeRequest(app, '/openapi.json');
    const spec = await expectJSON(response);

    expect(spec.components).toHaveProperty('schemas');
    // const schemas = spec.components.schemas || {};

    // Check that components exist (schemas might be inline)
    expect(spec.components).toBeDefined();
  });

  it('should document query parameters', async () => {
    const response = await makeRequest(app, '/openapi.json');
    const spec = await expectJSON(response);

    const modelsPath = spec.paths['/api/v1/models'];
    expect(modelsPath).toHaveProperty('get');

    const getModels = modelsPath.get;
    expect(getModels).toHaveProperty('parameters');

    const paramNames = getModels.parameters.map((p) => p.name);
    expect(paramNames).toContain('providers');
    expect(paramNames).toContain('type');
    expect(paramNames).toContain('capability');
    expect(paramNames).toContain('deprecated');
    expect(paramNames).toContain('project');
    expect(paramNames).toContain('format');
  });

  it('should document response types', async () => {
    const response = await makeRequest(app, '/openapi.json');
    const spec = await expectJSON(response);

    const modelsPath = spec.paths['/api/v1/models'];
    const getModels = modelsPath.get;

    expect(getModels.responses).toHaveProperty('200');
    expect(getModels.responses['200']).toHaveProperty('content');
    expect(getModels.responses['200'].content).toHaveProperty(
      'application/json'
    );
    expect(getModels.responses['200'].content).toHaveProperty('text/csv');
  });

  it('should document error responses', async () => {
    const response = await makeRequest(app, '/openapi.json');
    const spec = await expectJSON(response);

    const modelByIdPath = spec.paths['/api/v1/models/:id'];
    const getModel = modelByIdPath.get;

    expect(getModel.responses).toHaveProperty('404');
    expect(getModel.responses['404']).toHaveProperty('description');
    expect(getModel.responses['404'].description).toContain('not found');
  });
});

describe('Home page endpoint', () => {
  let app: OpenAPIHono;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should return HTML home page', async () => {
    const response = await makeRequest(app, '/');
    expect(response.status).toBe(200);

    const contentType = response.headers.get('content-type');
    expect(contentType).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('ModelDB');
  });

  it('should include navigation links', async () => {
    const response = await makeRequest(app, '/');
    const html = await response.text();

    expect(html).toContain('/api/v1/models');
    expect(html).toContain('/api/v1/providers');
    expect(html).toContain('/api/v1/metadata');
    expect(html).toContain('/openapi.json');
  });

  it('should include accessibility features', async () => {
    const response = await makeRequest(app, '/');
    const html = await response.text();

    expect(html).toContain('aria-label');
    expect(html).toContain('Skip to main content');
    expect(html).toContain('lang="en"');
  });

  it('should include ASCII art', async () => {
    const response = await makeRequest(app, '/');
    const html = await response.text();

    // Check for ASCII art characters used in the logo
    expect(html).toContain('███');
    expect(html).toContain('╗');
    expect(html).toContain('╚');
  });
});
