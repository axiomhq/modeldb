# ModelDB

> A blazing-fast REST API for AI/LLM model metadata and pricing information, powered by Cloudflare Workers

**No hosting required! Use our free hosted API at [modeldb.axiom.co](https://modeldb.axiom.co)**

**Built on [LiteLLM](https://github.com/BerriAI/litellm)'s community-maintained model database**

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/axiomhq/modeldb)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## What is ModelDB?

ModelDB is your one-stop shop for comprehensive AI model information. Whether you're building an AI application, comparing model costs, or need to check model capabilities, ModelDB provides instant access to:

- **Real-time pricing data** for 1000+ AI models
- **Detailed model specifications** including context windows and capabilities
- **Lightning-fast responses** from Cloudflare's global edge network
- **Developer-friendly API** with OpenAPI specification
- **Cost optimization tools** with dual pricing formats (per-token and per-million)

## Quick Start

```bash
# Get all OpenAI models
curl https://modeldb.axiom.co/api/v1/providers/openai

# Get specific model details
curl https://modeldb.axiom.co/api/v1/models/gpt-4o

# Filter models by capabilities
curl "https://modeldb.axiom.co/api/v1/models?capabilities=vision,function_calling"

# Export to CSV for analysis
curl "https://modeldb.axiom.co/api/v1/models?providers=anthropic,openai&format=csv" > models.csv
```

## Features

### Smart Filtering
Filter models by provider, capabilities, context window size, and more:
```bash
# Find vision models under $0.001 per 1K tokens
curl "https://modeldb.axiom.co/api/v1/models?capabilities=vision&max_input_cost_per_million=1"
```

### Multiple Data Formats
- **JSON** - Default, perfect for applications
- **CSV** - Great for spreadsheets and data analysis
- **Field Projection** - Get only the data you need

### Always Up-to-Date
Automatically syncs with [LiteLLM's](https://github.com/BerriAI/litellm) comprehensive model database, ensuring you always have the latest pricing and capabilities. The LiteLLM community actively maintains and updates this data, making it the most reliable source for AI model information.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/models` | List all models with filtering |
| `GET /api/v1/models/:id` | Get specific model details |
| `GET /api/v1/providers` | List all providers |
| `GET /api/v1/providers/:id` | Get models for a provider |
| `GET /api/v1/metadata` | Sync status and metadata |
| `GET /openapi.json` | OpenAPI specification |

## Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/modeldb.git
cd modeldb

# Install dependencies
npm install

# Start development server
npm run dev

# Update model data
npm run sync

# Run tests
npm test
```

## Deployment

ModelDB runs on Cloudflare Workers for global low-latency access:

```bash
# Deploy to development
npm run deploy

# Deploy to production
npm run deploy:prod
```

## Use Cases

### AI Application Development
Dynamically select the most cost-effective model for your use case:
```javascript
const response = await fetch('https://modeldb.axiom.co/api/v1/models?capabilities=function_calling&max_input_cost_per_million=5');
const models = await response.json();
// Choose the best model for your budget and requirements
```

### Cost Analysis
Export model pricing to CSV for detailed cost analysis:
```bash
curl "https://modeldb.axiom.co/api/v1/models?format=csv&project=model_id,provider_name,input_cost_per_million,output_cost_per_million" > pricing.csv
```

### Model Capability Discovery
Find models with specific features:
```bash
# Models supporting parallel function calling
curl "https://modeldb.axiom.co/api/v1/models?capabilities=parallel_function_calling"
```

## Architecture

ModelDB uses a unique approach for maximum performance:

1. **Build-time Data Generation** - Model data is pre-compiled into TypeScript
2. **Edge Deployment** - Runs on Cloudflare's global network
3. **No Database Required** - All data served from memory
4. **Automatic Syncing** - GitHub Actions keep data fresh

## Contributing

We love contributions! Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

### Data Contributions

The model data itself is maintained by the amazing [LiteLLM community](https://github.com/BerriAI/litellm). If you want to:
- Add a new model or provider
- Update pricing information
- Fix model specifications

Please contribute directly to [LiteLLM's model database](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json).

## Acknowledgments

ModelDB wouldn't exist without:
- **[LiteLLM](https://github.com/BerriAI/litellm)** - For maintaining the comprehensive model database
- **The LiteLLM Community** - For keeping model data accurate and up-to-date

## License

MIT © Axiom, Inc.

---

<p align="center">Made with love by the open source community</p>
