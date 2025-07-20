# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ModelDB is a Cloudflare Workers-based REST API that provides comprehensive metadata and pricing information for AI/LLM models. It serves as a centralized database of model capabilities, costs, and specifications.

## Essential Commands

### Development
- `npm run dev` - Start the local development server with hot reload
- `npm run sync` - Sync model data from LiteLLM repository (run this to update model data)

### Testing
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

### Code Quality
- `npm run lint` - Run Biome linter with automatic fixes

### Deployment
- `npm run deploy` - Deploy to development environment
- `npm run deploy:prod` - Deploy to production (modeldb.axiom.co)

### Running a Single Test
```bash
npm test -- path/to/test.spec.ts
```

## Architecture Overview

### Data Flow
1. **Source**: LiteLLM's model pricing data (GitHub)
2. **Sync Script** (`scripts/sync.ts`): Fetches and transforms data into TypeScript files
3. **Generated Data Files**:
   - `src/data/list.ts` - Array format for filtering/iteration
   - `src/data/map.ts` - Object format for O(1) lookups
   - `src/data/providers.ts` - Pre-grouped by provider
4. **API Endpoints**: Process and serve data with filtering/formatting options
5. **Edge Deployment**: Runs on Cloudflare Workers globally

### Key Architectural Decisions

1. **Static Data Generation**: All model data is pre-generated at build time, enabling edge deployment without a database
2. **Multiple Data Structures**: Different formats (array/object/grouped) optimize for different access patterns
3. **Schema-First Design**: Zod schemas define all data structures with OpenAPI auto-generation
4. **Dual Pricing Format**: Costs stored both per-token and per-million for convenience

### API Endpoints

- `GET /models` - List all models with filtering options
- `GET /models/:id` - Get a specific model by ID
- `GET /providers` - List all providers
- `GET /providers/:id` - Get models for a specific provider
- `GET /metadata` - Get sync metadata
- `GET /openapi.json` - OpenAPI specification
- `GET /` - ASCII art home page

### Important Patterns

1. **Query Parameters**: Lists use comma-separated values (e.g., `?providers=openai,anthropic`)
2. **Field Projection**: Use `?project=model_id,provider_id` to select specific fields
3. **CSV Support**: Add `?format=csv` to any list endpoint
4. **Fill Nulls**: Use `?fill_with_zeros=true` to replace null numeric values with 0
5. **Provider Normalization**: Script normalizes provider IDs (e.g., "gemini" → "google", "vertex_ai" → "vertex")

### Model Schema Structure

Models include:
- Basic info: `model_id`, `model_name`, `provider_id`, `provider_name`
- Context windows: `max_input_tokens`, `max_output_tokens`
- Pricing: Input/output costs (both per-token and per-million)
- Cache pricing: Read/write costs for models supporting caching
- Capabilities: Function calling, vision, JSON mode, parallel functions
- Metadata: Model type, deprecation date

### Development Notes

- The codebase uses TypeScript with strict mode enabled
- Biome is configured with the ultracite preset for linting
- Tests use Vitest with Cloudflare Workers pool
- Production environment adds caching headers and ETags
- The home page uses pure ASCII art with Berkeley Mono font

### Updating Model Data

To update the model database with latest information:
1. Run `npm run sync`
2. Review the generated files in `src/data/`
3. Commit the changes
4. Deploy to production

### Common Tasks

**Adding a new filter to /models endpoint:**
1. Update the query schema in `src/models.ts`
2. Add filter logic in the route handler
3. Update OpenAPI documentation if needed

**Adding a new model field:**
1. Update Model schema in `src/schema.ts`
2. Update transformation in `scripts/sync.ts`
3. Run `npm run sync` to regenerate data
4. Update any affected endpoints

**Debugging sync issues:**
- Check `scripts/sync.ts` for data transformation logic
- Verify LiteLLM's model_prices_and_context_window.json format hasn't changed
- Review provider ID normalization and model ID cleaning logic