// i started this then i went to far to come back so we will live with this forever - njpatel
import { modelsList } from './data/list';
import { modelsMetadata } from './data/metadata';

function pad(str: string, len: number, align: 'left' | 'right' = 'left'): string {
  if (str.length >= len) return str.substring(0, len);
  if (align === 'left') return str + ' '.repeat(len - str.length);
  return ' '.repeat(len - str.length) + str;
}

// Strip HTML tags to get visible text length
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Pad string considering HTML content
function padHtml(str: string, len: number, align: 'left' | 'right' = 'left'): string {
  const visibleLength = stripHtml(str).length;
  if (visibleLength >= len) {
    // If visible content is too long, we need to truncate the actual content
    return str;
  }
  const paddingNeeded = len - visibleLength;
  if (align === 'left') return str + ' '.repeat(paddingNeeded);
  return ' '.repeat(paddingNeeded) + str;
}

// ASCII Box Drawing Characters
const BOX = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
};

function sectionHeader(title: string, width: number = 72): string {
  const padding = Math.max(0, width - title.length - 2);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  const line = '═'.repeat(width);
  return `${line}\n${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}\n${line}`;
}

function box(content: string, width: number = 72): string {
  // Handle content that might contain HTML tags
  const lines = content.split('\n');
  const paddedLines = lines.map(line => {
    // For single-line content, we need to ensure proper spacing
    // The box should have 2 chars for borders and 2 for padding on each side
    const innerWidth = width - 4;
    return `${BOX.VERTICAL} ${line}${' '.repeat(Math.max(0, innerWidth - line.length))} ${BOX.VERTICAL}`;
  });

  const top = BOX.TOP_LEFT + BOX.HORIZONTAL.repeat(width - 2) + BOX.TOP_RIGHT;
  const bottom = BOX.BOTTOM_LEFT + BOX.HORIZONTAL.repeat(width - 2) + BOX.BOTTOM_RIGHT;

  return [top, ...paddedLines, bottom].join('\n');
}

interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

function table(columns: TableColumn[], rows: any[][]): string {
  const totalWidth = columns.reduce((sum, col) => sum + col.width + 3, 1);

  // Build header
  let output = BOX.TOP_LEFT;
  columns.forEach((col, i) => {
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.T_DOWN : '';
  });
  output += BOX.TOP_RIGHT + '\n';

  // Header row
  output += BOX.VERTICAL;
  columns.forEach(col => {
    output += ` ${pad(col.header, col.width)} ${BOX.VERTICAL}`;
  });
  output += '\n';

  // Separator
  output += BOX.T_RIGHT;
  columns.forEach((col, i) => {
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.CROSS : '';
  });
  output += BOX.T_LEFT + '\n';

  // Data rows
  rows.forEach(row => {
    output += BOX.VERTICAL;
    row.forEach((cell, i) => {
      const col = columns[i];
      output += ` ${padHtml(String(cell), col.width, col.align)} ${BOX.VERTICAL}`;
    });
    output += '\n';
  });

  // Bottom border
  output += BOX.BOTTOM_LEFT;
  columns.forEach((col, i) => {
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.T_UP : '';
  });
  output += BOX.BOTTOM_RIGHT + '\n';

  return output;
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

  const columns: TableColumn[] = [
    { header: 'Provider', width: 30 },
    { header: 'Count', width: 5, align: 'right' },
    { header: 'Distribution', width: 28 }
  ];

  const rows = sorted.map(([provider, count]) => [
    `<a href="/api/providers/${provider}" aria-label="View ${provider} models">${provider}</a>`,
    count.toString(),
    progressBar(count, maxCount, 28)
  ]);

  return table(columns, rows);
}

function buildTypeStats(stats: Record<string, number>): string {
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(stats));

  const columns: TableColumn[] = [
    { header: 'Model Type', width: 30 },
    { header: 'Count', width: 5, align: 'right' },
    { header: 'Distribution', width: 28 }
  ];

  const rows = sorted.map(([type, count]) => [
    `<a href="/api/models?model_types=${type}" aria-label="View ${type} models">${type}</a>`,
    count.toString(),
    progressBar(count, maxCount, 28)
  ]);

  return table(columns, rows);
}

function buildCapabilitiesMatrix(capabilities: any, total: number): string {
  const caps = [
    { name: 'function_calling', key: 'function_calling' },
    { name: 'vision', key: 'vision' },
    { name: 'json_mode', key: 'json_mode' },
    { name: 'parallel_functions', key: 'parallel_functions' },
  ];

  const columns: TableColumn[] = [
    { header: 'Capability', width: 30 },
    { header: 'Count', width: 5, align: 'right' },
    { header: 'Distribution', width: 28 }
  ];

  const rows = caps.map(cap => [
    `<a href="/api/models?supports_${cap.key}=true" aria-label="View models with ${cap.name.replace(/_/g, ' ')} support">${cap.name}</a>`,
    capabilities[cap.key].toString(),
    progressBar(capabilities[cap.key], total, 28)
  ]);

  return table(columns, rows);
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

<b>API for AI model information { provider, cost, context, features, ... }</b>

▸ Built from <b>LiteLLM's</b> <a href="https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json">models, cost & pricing</a> (synced hourly)
▸ Optimized for apps & data workloads like for loading for lookups
▸ Filtering and field projection
▸ <b>JSON</b> and <b>CSV</b> support
▸ OpenAPI 3.1 specification
▸ CORS-enabled for browser usage
▸ Stable API (breaking changes versioned)
▸ <b>Completely free to use</b>
▸ <b>No authentication required</b>

</pre>
<section aria-label="Database Statistics">
<h2 style="position: absolute; left: -9999px;">Database Statistics</h2>
<pre>
${sectionHeader('DATABASE STATISTICS')}

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
${sectionHeader('QUICK EXAMPLES')}

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
${sectionHeader('API ROUTES')}

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
${sectionHeader('OPENAPI')}

  <a href="/openapi.json" aria-label="Download OpenAPI specification">/openapi.json</a>  Download OpenAPI v3.1 specification
  <a href="/ui" aria-label="Interactive API documentation">/ui</a>            API documentation and interactive testing

</pre>
</section>
<section aria-label="OpenAPI Documentation">
<h2 style="position: absolute; left: -9999px;">OpenAPI Documentation</h2>
<pre>
${sectionHeader('SUPPORT')}

- If you have issues or feature requests for the API service, please
  create an issue on the <a href="https://github.com/axiomhq/modeldb/issues"><b>ModelDB project</b></a>.

- If you have issues with model details, please support the LiteLLM
  community by contributing a pull request to the
  <a href="https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json"  >model_prices_and_context_window.json</a> on the <a href="https://github.com/BerriAI/litellm"><b>LiteLLM project</b></a>.

</pre>
</section>
<section aria-label="OpenAPI Documentation">
<h2 style="position: absolute; left: -9999px;">OpenAPI Documentation</h2>
<pre>
${'═'.repeat(72)}

(C) Axiom, Inc 2025                               axiomhq/modeldb@v1.0.0
</pre>
</section>
</main>
</body>
</html>`;
}
