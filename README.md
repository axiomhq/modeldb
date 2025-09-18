# ModelDB

REST API service for AI model metadata and costs.

**Free hosted API: [modeldb.axiom.co](https://modeldb.axiom.co)**

**Data source: [LiteLLM's model database](https://github.com/BerriAI/litellm)**

## Description

ModelDB provides a comprehensive database of AI language models with their associated metadata including costs, context windows, capabilities, and provider information. Designed for programmatic access by applications or data workloads requiring model selection, cost estimation, or capability comparison.

## Features

- Built from LiteLLM's community-maintained model pricing data
- 1000+ models from 40+ providers
- Real-time pricing in both per-token and per-million formats
- Model capabilities (vision, function calling, JSON mode)
- Context window specifications
- CSV export support
- Field projection for bandwidth optimization
- OpenAPI 3.1 specification
- CORS-enabled for browser usage
- No authentication required

## Quick Start

```bash
# List all models
curl https://modeldb.axiom.co/api/v1/models

# Get specific model
curl https://modeldb.axiom.co/api/v1/models/gpt-4o

# Filter by provider
curl "https://modeldb.axiom.co/api/v1/models?providers=openai,anthropic"

# Filter by capabilities
curl "https://modeldb.axiom.co/api/v1/models?capability=vision,function_calling"

# Export as CSV
curl "https://modeldb.axiom.co/api/v1/models?format=csv" > models.csv

# Project specific fields
curl "https://modeldb.axiom.co/api/v1/models?project=model_id,input_cost_per_million"

# Pretty print JSON output
curl "https://modeldb.axiom.co/api/v1/models/gpt-4o?pretty"
```

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/v1/models` | List all models with filtering |
| `GET /api/v1/models/:id` | Get specific model by ID |
| `GET /api/v1/providers` | List all providers |
| `GET /api/v1/providers/:id` | Get models for a provider |
| `GET /api/v1/metadata` | Get sync metadata |
| `GET /openapi.json` | OpenAPI specification |
| `GET /ui` | Interactive API documentation |

## Query Parameters

### Models Endpoint

- `prefixes` - Comma-separated list of prefixes to filter models
- `providers` - Comma-separated list of providers to filter models
- `type` - Comma-separated list of model types to filter
- `capability` - Comma-separated list of capabilities to filter (function_calling, vision, json_mode, parallel_functions)
- `deprecated` - Filter models by deprecation status (true/false)
- `project` - Comma-separated fields to return
- `format` - Output format (json or csv)
- `headers` - Include headers in CSV output (defaults to false, use headers=true to include)
- `fill-with-zeros` - Replace null values with 0
- `pretty` - Pretty print JSON output with indentation (presence of parameter enables it)

## Installation

```bash
# Clone repository
git clone https://github.com/axiomhq/modeldb.git
cd modeldb

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Update model data from LiteLLM
npm run sync
```

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Deploy to production
npm run deploy:prod
```

## Data Refresh (Cron + KV)

Model data now refreshes hourly via a Cloudflare Cron and is stored in KV (and warmed into Workers Cache). To force a refresh (e.g., first deploy), call the admin endpoint:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://modeldb.axiom.co/admin/refresh?force=true
```

Configure KV binding `MODELS_KV` and set `ADMIN_TOKEN` using Wrangler secrets. The service reads all responses from the warmed cache/KV; no runtime fetches are performed for public requests.

Admin endpoints (token required):

```bash
# Force refresh now (skip ETag with force=true)
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://modeldb.axiom.co/admin/refresh?force=true

# Health/manifest and cache status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://modeldb.axiom.co/admin/health
```

## Architecture

ModelDB uses scheduled refresh + cache-first serving:

1. Hourly cron fetches LiteLLM JSON and transforms it to prebuilt artifacts (list, map, providers, metadata).
2. Artifacts are written to Cloudflare KV and warmed into Workers Cache under `/cache/v1/latest/*.json`.
3. API routes read from Workers Cache, falling back to KV, then to bundled `src/data/*` as a last resort.
4. Admin refresh can force regeneration; a health endpoint reports manifest and cache status.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Model Data Updates

Model information is maintained by the LiteLLM community and synced hourly. To propose data changes:
- Submit PRs to [LiteLLM's model database](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json)
- This service ingests updates automatically via cron

## Acknowledgments

- [LiteLLM](https://github.com/BerriAI/litellm) and community for maintaining model data

## License

MIT © Axiom, Inc.
