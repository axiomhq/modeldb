import type { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';

const OPENAPI_PATH = '/openapi.json';
const API_UI = '/ui';

export function registerOpenAPIRoutes(app: OpenAPIHono) {
  app.doc31(OPENAPI_PATH, {
    openapi: '3.1.0',
    info: {
      title: 'ModelDB API',
      description:
        'A free API for GenAI model information based on [LiteLLM](http://litellm.ai/) model data, bought to you by [Axiom](https://axiom.co).',
      version: '0.1.0',
    },
  });

  app.get(
    '/ui',
    Scalar({
      url: OPENAPI_PATH,
      pageTitle: 'ModelDB API Reference',
      hideModels: false,
      hideDownloadButton: true,
      hideClientButton: true,
      defaultOpenAllTags: true,
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
      darkMode: true,
      withDefaultFonts: true,
      customCss: `
	     	@font-face {
	        font-family: "Berkeley Mono";
	        src: url("https://axiom.co/fonts/BerkeleyMono-Regular.woff2") format("woff2");
	        font-weight: 400;
	        font-style: normal;
	        font-display: swap;
	      }

	      @font-face {
	        font-family: "Berkeley Mono";
	        src: url("https://axiom.co/fonts/BerkeleyMono-Bold.woff2") format("woff2");
	        font-weight: 700;
	        font-style: normal;
	        font-display: swap;
	      }

			  * {
					font-family: "Berkeley Mono", "SF Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace;
			  }

				.language-select {
					font-size: 13px;
				}
      `,
      servers: [
        {
          url: 'http://localhost:8787',
          description: 'Dev',
        },
        {
          url: 'https://modeldb.axiom.co',
          description: 'Production',
        },
      ],
    })
  );
}

export function isDocsRoute(path: string) {
  return path === OPENAPI_PATH || path === API_UI;
}
