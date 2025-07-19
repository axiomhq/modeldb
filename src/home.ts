import { modelsList } from './data/list';
import { modelsMetadata } from './data/metadata';
import pkg from '../package.json';

function pad(str: string, len: number, align: 'left' | 'right' = 'left'): string {
  if (str.length >= len) return str.substring(0, len);
  if (align === 'left') return str + ' '.repeat(len - str.length);
  return ' '.repeat(len - str.length) + str;
}

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function progressBar(value: number, max: number, width: number = 20): string {
  const percentage = Math.min(value / max, 1);
  const filled = Math.max(1, Math.floor(percentage * width));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function calculateStats() {
  const providerStats: Record<string, number> = {};
  const typeStats: Record<string, number> = {};
  const capabilities = {
    function_calling: 0,
    vision: 0,
    json_mode: 0,
    parallel_functions: 0,
  };
  let deprecatedCount = 0;

  for (const model of modelsList) {
    providerStats[model.provider_id] = (providerStats[model.provider_id] || 0) + 1;
    typeStats[model.model_type] = (typeStats[model.model_type] || 0) + 1;

    if (model.supports_function_calling) {
      capabilities.function_calling++;
    }
    if (model.supports_vision) {
      capabilities.vision++;
    }
    if (model.supports_json_mode) {
      capabilities.json_mode++;
    }
    if (model.supports_parallel_functions) {
      capabilities.parallel_functions++;
    }

    if (model.deprecation_date) {
      deprecatedCount++;
    }
  }

  return {
    providers: providerStats,
    types: typeStats,
    capabilities,
    activeCount: modelsList.length - deprecatedCount,
    deprecatedCount,
  };
}

function buildProviderStats(stats: Record<string, number>): string {
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(stats));

  let output = '┌────────────────────────────────┬───────┬──────────────────────────────┐\n';
  output += '│ Provider                       │ Count │ Distribution                 │\n';
  output += '├────────────────────────────────┼───────┼──────────────────────────────┤\n';

  for (const [provider, count] of sorted) {
    output += `│ ${pad(provider, 30)} │ ${pad(count.toString(), 5, 'right')} │ ${progressBar(count, maxCount, 28)} │\n`;
  }

  output += '└────────────────────────────────┴───────┴──────────────────────────────┘\n';
  return output;
}

function buildTypeStats(stats: Record<string, number>): string {
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(stats));

  let output = '┌────────────────────────────────┬───────┬──────────────────────────────┐\n';
  output += '│ Model Type                     │ Count │ Distribution                 │\n';
  output += '├────────────────────────────────┼───────┼──────────────────────────────┤\n';

  for (const [type, count] of sorted) {
    output += `│ ${pad(type, 30)} │ ${pad(count.toString(), 5, 'right')} │ ${progressBar(count, maxCount, 28)} │\n`;
  }

  output += '└────────────────────────────────┴───────┴──────────────────────────────┘\n';
  return output;
}

function buildCapabilitiesMatrix(capabilities: any, total: number): string {
  let output = '┌────────────────────────────────┬───────┬──────────────────────────────┐\n';
  output += '│ Capability                     │ Count │ Distribution                 │\n';
  output += '├────────────────────────────────┼───────┼──────────────────────────────┤\n';

  const caps = [
    { name: 'Function Calling', key: 'function_calling' },
    { name: 'Vision', key: 'vision' },
    { name: 'JSON Mode', key: 'json_mode' },
    { name: 'Parallel Functions', key: 'parallel_functions' },
  ];

  for (const cap of caps) {
    const count = capabilities[cap.key];
    output += `│ ${pad(cap.name, 30)} │ ${pad(count.toString(), 5, 'right')} │ ${progressBar(count, total, 28)} │\n`;
  }

  output += '└────────────────────────────────┴───────┴──────────────────────────────┘\n';
  return output;
}

export function buildHome(): string {
  const stats = calculateStats();
  const totalModels = modelsList.length;
  const lastUpdated = new Date(modelsMetadata.generated_at).toLocaleDateString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ModelDB - Free API for AI model information including provider details, costs, context windows, and capabilities">
  <title>ModelDB - AI Model Information API</title>
  <style>
    /* Light mode (default) */
    body {
      margin: 0;
      padding: 0;
      background-color: #fff;
      color: #000;
      font-family: 'Courier New', monospace;
      margin: 20px;
    }
    pre {
      margin: 0;
      padding: 0;
      overflow-x: auto;
      line-height: 1.4;
    }
    a {
      color: #000;
      text-decoration: underline;
    }
    a:hover {
      text-decoration: underline;
      color: #000;
    }
    .skip-link:focus {
      position: static !important;
      left: auto !important;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0a0a0a;
        color: #fafafa;
      }
      a {
        color: #fafafa;
        text-decoration: underline;
      }
      a:hover {
        color: #fafafa;
        text-decoration: underline;
      }
    }
  </style>
</head>
<body>
<a href="#main-content" class="skip-link" style="position: absolute; left: -9999px; z-index: 999; background: inherit; color: inherit; padding: 8px; text-decoration: underline;">Skip to main content</a>
<header role="banner">
<pre>
<a href="https://modeldb.info" aria-label="Axiom, Inc. homepage">Axiom, Inc.</a>                                                       <a href="https://github.com/axiomhq/modeldb" aria-label="ModelDB GitHub repository">GitHub</a>
</pre>
</header>
<main id="main-content" role="main">
<pre aria-label="ModelDB ASCII logo">
════════════════════════════════════════════════════════════════════════


      ███╗   ███╗ ██████╗ ██████╗ ███████╗██╗     ██████╗ ██████╗
      ████╗ ████║██╔═══██╗██╔══██╗██╔════╝██║     ██╔══██╗██╔══██╗
      ██╔████╔██║██║   ██║██║  ██║█████╗  ██║     ██║  ██║██████╔╝
      ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║     ██║  ██║██╔══██╗
      ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗███████╗██████╔╝██████╔╝
      ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═════╝ ╚═════╝


════════════════════════════════════════════════════════════════════════
Models: <b>${formatNumber(totalModels)}</b> | Active: <b>${formatNumber(stats.activeCount)}</b> | Deprecated: <b>${formatNumber(stats.deprecatedCount)}</b> | Last Updated: <b>${lastUpdated}</b>
════════════════════════════════════════════════════════════════════════

API for AI model information { provider, cost, context, features, ... }

▸ Completely <b>free to use</b>
▸ Built from <a href="https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json"><b>LiteLLM</b> models, cost & pricing (synced hourly)</a>
▸ <b>JSON</b> and <b>CSV</b> support
▸ Optimized for apps & data workloads
▸ Filtering and field projection
▸ OpenAPI 3.1 specification

</pre>
<section aria-label="Database Statistics">
<h2 style="position: absolute; left: -9999px;">Database Statistics</h2>
<pre>
════════════════════════════════════════════════════════════════════════
                           DATABASE STATISTICS
════════════════════════════════════════════════════════════════════════

All Providers (${Object.keys(stats.providers).length} total)
<div role="region" aria-label="Provider statistics table">
${buildProviderStats(stats.providers)}
</div>
Model Type Distribution
<div role="region" aria-label="Model type distribution table">
${buildTypeStats(stats.types)}
</div>
Capability Support Matrix
<div role="region" aria-label="Capability support matrix table">
${buildCapabilitiesMatrix(stats.capabilities, totalModels)}
</div>
</pre>
</section>
<section aria-label="Quick Examples">
<h2 style="position: absolute; left: -9999px;">Quick Examples</h2>
<pre>
════════════════════════════════════════════════════════════════════════
                            QUICK EXAMPLES
════════════════════════════════════════════════════════════════════════

List all models:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models" aria-label="API endpoint to list all models">/api/models</a>                                                      │
└──────────────────────────────────────────────────────────────────────┘

Filter by provider:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models?providers=openai,anthropic" aria-label="API endpoint to filter models by OpenAI and Anthropic providers">/api/models?providers=openai,anthropic</a>                           │
└──────────────────────────────────────────────────────────────────────┘

  Get specific fields:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models?project=model_id,model_name,input_cost_per_million" aria-label="API endpoint to get specific model fields">/api/models?project=model_id,model_name,input_cost_per_million</a>   │
└──────────────────────────────────────────────────────────────────────┘

Get a specific model:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models/gpt-4" aria-label="API endpoint to get GPT-4 model details">/api/models/gpt-4</a>                                                │
└──────────────────────────────────────────────────────────────────────┘
</pre>
</section>
<section aria-label="API Routes">
<h2 style="position: absolute; left: -9999px;">API Routes</h2>
<pre>
════════════════════════════════════════════════════════════════════════
                              API ROUTES
════════════════════════════════════════════════════════════════════════

  <a href="/api/models" aria-label="API models endpoint">/api/models</a>         List all models with filtering
  <a href="/api/models/gpt-4" aria-label="API model by ID endpoint example">/api/models/:id</a>     Get a specific model by ID
  <a href="/api/providers" aria-label="API providers endpoint">/api/providers</a>      List all providers
  <a href="/api/providers/openai" aria-label="API provider models endpoint example">/api/providers/:id</a>  Get models for a provider
  <a href="/api/metadata" aria-label="API metadata endpoint">/api/metadata</a>       Get database metadata & stats
</pre>
</section>
<section aria-label="OpenAPI Documentation">
<h2 style="position: absolute; left: -9999px;">OpenAPI Documentation</h2>
<pre>
════════════════════════════════════════════════════════════════════════
                              OPENAPI
════════════════════════════════════════════════════════════════════════

  <a href="/openapi.json" aria-label="Download OpenAPI specification">/openapi.json</a>  Download OpenAPI v3.1 specification
  <a href="/ui" aria-label="Interactive API documentation">/ui</a>            API documentation and interactive testing

════════════════════════════════════════════════════════════════════════
                                                         modeldb v1.0.0
</pre>
</section>
</main>
</body>
</html>`;
}
