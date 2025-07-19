import { modelsList } from './data/list';
import { modelsMetadata } from './data/metadata';

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
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  let output = '┌────────────────────────────────┬───────┬──────────────────────────────┐\n';
  output += '│ Model Type                     │ Count │ Percent                      │\n';
  output += '├────────────────────────────────┼───────┼──────────────────────────────┤\n';

  for (const [type, count] of sorted) {
    const percent = ((count / total) * 100).toFixed(1);
    output += `│ ${pad(type, 30)} │ ${pad(count.toString(), 5, 'right')} │ ${pad(percent + '%', 28, 'right')} │\n`;
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
  <title>ModelDB - AI Model Information API</title>
  <style>
    /* Light mode (default) */
    body {
      margin: 0;
      padding: 0;
      background-color: #fff;
      color: #000;
      font-family: 'Courier New', monospace;
    }
    pre {
      margin: 0;
      padding: 20px;
      overflow-x: auto;
      line-height: 1.4;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      color: #0052a3;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0a0a0a;
        color: #fafafa;
      }
      a {
        color: #4db8ff;
      }
      a:hover {
        color: #80ccff;
      }
    }
  </style>
</head>
<body>
<pre>
<a href="https://modeldb.info">Axiom, Inc.</a>                                                       <a href="https://github.com/axiomhq/modeldb">GitHub</a>
────────────────────────────────────────────────────────────────────────


      ███╗   ███╗ ██████╗ ██████╗ ███████╗██╗     ██████╗ ██████╗
      ████╗ ████║██╔═══██╗██╔══██╗██╔════╝██║     ██╔══██╗██╔══██╗
      ██╔████╔██║██║   ██║██║  ██║█████╗  ██║     ██║  ██║██████╔╝
      ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║     ██║  ██║██╔══██╗
      ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗███████╗██████╔╝██████╔╝
      ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═════╝ ╚═════╝


────────────────────────────────────────────────────────────────────────

API for AI model information { provider, cost, context, features, ... }

▸ Completely free to use                              Models: ${formatNumber(totalModels)}
▸ Built from LiteLLM models & pricing                 Active: ${formatNumber(stats.activeCount)}
▸ JSON and CSV support                            Deprecated: ${formatNumber(stats.deprecatedCount)}
▸ Optimized for apps & data workloads           Last Updated: ${lastUpdated}
▸ Filtering and field projection
▸ OpenAPI specification

════════════════════════════════════════════════════════════════════════
                           DATABASE STATISTICS
════════════════════════════════════════════════════════════════════════

All Providers (${Object.keys(stats.providers).length} total)
${buildProviderStats(stats.providers)}

Model Type Distribution
${buildTypeStats(stats.types)}

Capability Support Matrix
${buildCapabilitiesMatrix(stats.capabilities, totalModels)}


════════════════════════════════════════════════════════════════════════
                            QUICK EXAMPLES
════════════════════════════════════════════════════════════════════════

List all models:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models">/api/models</a>                                                      │
└──────────────────────────────────────────────────────────────────────┘

Filter by provider:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models?providers=openai,anthropic">/api/models?providers=openai,anthropic</a>                           │
└──────────────────────────────────────────────────────────────────────┘

  Get specific fields:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models?project=model_id,model_name,input_cost_per_million">/api/models?project=model_id,model_name,input_cost_per_million</a>   │
└──────────────────────────────────────────────────────────────────────┘

Get a specific model:
┌──────────────────────────────────────────────────────────────────────┐
│ GET <a href="/api/models/gpt-4">/api/models/gpt-4</a>                                                │
└──────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════
                              API ROUTES
════════════════════════════════════════════════════════════════════════

  <a href="/api/models">/api/models</a>         List all models with filtering
  <a href="/api/models/gpt-4">/api/models/:id</a>     Get a specific model by ID
  <a href="/api/providers">/api/providers</a>      List all providers
  <a href="/api/providers/openai">/api/providers/:id</a>  Get models for a provider
  <a href="/api/metadata">/api/metadata</a>       Get database metadata & stats

════════════════════════════════════════════════════════════════════════
                              OPENAPI
════════════════════════════════════════════════════════════════════════

  <a href="/openapi.json">Download openapi.json</a>
  <a href="/ui">Explore with UI</a>

────────────────────────────────────────────────────────────────────────
                                                         modeldb v1.0.0
</pre>
</body>
</html>`;
}
