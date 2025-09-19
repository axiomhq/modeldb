// i started this and went too far, so we have to deal with it - njpatel
import { ALL_CAPABILITIES } from './data/capabilities';
import type { Model } from './schema';

// Helper functions
function pad(
  str: string,
  len: number,
  align: 'left' | 'right' = 'left'
): string {
  if (str.length >= len) {
    return str.substring(0, len);
  }
  if (align === 'left') {
    return str + ' '.repeat(len - str.length);
  }
  return ' '.repeat(len - str.length) + str;
}

// Strip HTML tags to get visible text length
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Pad string considering HTML content
function padHtml(
  str: string,
  len: number,
  align: 'left' | 'right' = 'left'
): string {
  const visibleLength = stripHtml(str).length;
  if (visibleLength >= len) {
    // If visible content is too long, we need to truncate the actual content
    return str;
  }
  const paddingNeeded = len - visibleLength;
  if (align === 'left') {
    return str + ' '.repeat(paddingNeeded);
  }
  return ' '.repeat(paddingNeeded) + str;
}

function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function progressBar(value: number, max: number, width = 20): string {
  const percentage = Math.min(value / max, 1);
  const filled = Math.max(1, Math.floor(percentage * width));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
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

// Section header builder
function sectionHeader(title: string, width = 62): string {
  const padding = Math.max(0, width - title.length - 2);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return `\n█ <b>${title}</b> ${'░'.repeat(leftPad + rightPad - 1)}`;
}

// ASCII table builder
interface TableData {
  [key: string]: unknown;
  count?: number;
  name?: string;
}

interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right';
  key?: string;
  render?: (value: unknown, row: TableData) => string;
}

// biome-ignore lint: disable
function asciiTable(
  title: string,
  columns: TableColumn[],
  data: TableData[]
): string {
  // Build header
  let output = BOX.TOP_LEFT;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.T_DOWN : '';
  }
  output += `${BOX.TOP_RIGHT}\n`;

  // Header row
  output += BOX.VERTICAL;
  for (const col of columns) {
    output += ` ${pad(col.header, col.width)} ${BOX.VERTICAL}`;
  }
  output += '\n';

  // Separator
  output += BOX.T_RIGHT;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.CROSS : '';
  }
  output += `${BOX.T_LEFT}\n`;

  // Data rows
  for (const row of data) {
    output += BOX.VERTICAL;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const value = col.key ? row[col.key] : row[i];
      const rendered = col.render ? col.render(value, row) : String(value);
      output += ` ${padHtml(rendered, col.width, col.align)} ${BOX.VERTICAL}`;
    }
    output += '\n';
  }

  // Bottom border
  output += BOX.BOTTOM_LEFT;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    output += BOX.HORIZONTAL.repeat(col.width + 2);
    output += i < columns.length - 1 ? BOX.T_UP : '';
  }
  output += BOX.BOTTOM_RIGHT;

  return ` <b>${title}</b>\n${output}`;
}

// Calculate statistics
function calculateStats(modelsList: Model[]) {
  const totalModels = modelsList.length;
  const providers = new Set(modelsList.map((m) => m.provider_id));
  const types = new Set(modelsList.map((m) => m.model_type));

  const providerCounts = Array.from(providers)
    .map((provider) => ({
      name: provider,
      count: modelsList.filter((m) => m.provider_id === provider).length,
    }))
    .sort((a, b) => b.count - a.count);

  const typeCounts = Array.from(types)
    .map((type) => ({
      name: type,
      count: modelsList.filter((m) => m.model_type === type).length,
    }))
    .sort((a, b) => b.count - a.count);

  // Dynamically calculate capabilities from ALL_CAPABILITIES
  const capabilities: Record<string, number> = {};
  for (const capability of ALL_CAPABILITIES) {
    capabilities[capability] = modelsList.filter(
      (m) => m[capability as keyof typeof m] === true
    ).length;
  }

  const deprecatedCount = modelsList.filter((m) => m.deprecation_date).length;
  const activeCount = totalModels - deprecatedCount;

  return {
    totalModels,
    activeCount,
    deprecatedCount,
    totalProviders: providers.size,
    totalTypes: types.size,
    providerCounts,
    typeCounts,
    capabilities,
  };
}

// Build home page
export function buildHome(
  modelsList: Model[],
  modelsMetadata: { generated_at: string }
): string {
  const stats = calculateStats(modelsList);
  const lastUpdated = new Date(modelsMetadata.generated_at).toISOString();
  const lastChecked = new Date().toISOString();
  const maxProviderCount = Math.max(
    ...stats.providerCounts.map((p) => p.count)
  );
  const maxTypeCount = Math.max(...stats.typeCounts.map((t) => t.count));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ModelDB - Free API for AI model information including provider details, costs, context windows, and capabilities">
  <title>ModelDB - AI Model Information API</title>
  <link rel="icon" href="/favicon.ico">
  <style>
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

    body {
      margin: 0;
      padding: 0;
      background-color: #fff;
      color: #000;
      font-family: "Berkeley Mono", "SF Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      margin: 20px;
      font-size: 14px;
    }

    pre {
      font-family: inherit;
      margin: 0;
      padding: 0;
      line-height: 1.4;
      overflow-x: auto;
    }

    a {
      color: #000;
      text-decoration: underline;
    }

    b {
      font-weight: 700;
    }

    .skip-link:focus {
      position: static !important;
      left: auto !important;
    }

    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0a0a0a;
        color: #fafafa;
      }
      a {
        color: #fafafa;
      }
    }

    @media (max-width: 768px) {
      body {
        margin: 0;
        font-size: 12px;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
      }
      pre {
        max-width: 100%;
        margin: 0 auto;
      }
      .hide-mobile {
        display: none;
      }
    }

    @media (max-width: 480px) {
      body {
        margin: 0;
        font-size: 10px;
        padding: 5px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 100vh;
      }
      pre {
        max-width: 100%;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
<a href="#main-content" class="skip-link" style="position: absolute; left: -9999px; z-index: 999; background: inherit; color: inherit; padding: 8px; text-decoration: underline;">Skip to main content</a>
<header role="banner">
<pre>
<a href="https://axiom.co" aria-label="Axiom homepage">Axiom, Inc.</a>                                             <a href="https://github.com/axiomhq/modeldb" aria-label="ModelDB GitHub repository">GitHub</a>
</pre>
</header>
<main id="main-content" role="main">
<pre aria-label="ModelDB ASCII logo">
══════════════════════════════════════════════════════════════


 ███╗   ███╗ ██████╗ ██████╗ ███████╗██╗     ██████╗ ██████╗
 ████╗ ████║██╔═══██╗██╔══██╗██╔════╝██║     ██╔══██╗██╔══██╗
 ██╔████╔██║██║   ██║██║  ██║█████╗  ██║     ██║  ██║██████╔╝
 ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║     ██║  ██║██╔══██╗
 ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗███████╗██████╔╝██████╔╝
 ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚═════╝ ╚═════╝


══════════════════════════════════════════════════════════════
        Models: <b>${formatNumber(stats.totalModels)}</b> | Active: <b>${formatNumber(stats.activeCount)}</b> | Deprecated: <b>${formatNumber(stats.deprecatedCount)}</b>
══════════════════════════════════════════════════════════════

<b>NAME</b>
     <b>modeldb</b> - REST API service for AI model metadata and costs

<b>DESCRIPTION</b>
     The modeldb API provides a comprehensive database of AI
     language models with their associated metadata including
     costs, context windows, capabilities, and provider
     information. Designed for programmatic access by
     applications or data workloads requiring model selection,
     cost estimation, or capability comparison.

<b>FEATURES</b>
     ▸ Built from <b><a href="https://github.com/BerriAI/litellm" aria-label="LiteLLM GitHub">LiteLLM's</a></b> <a href="https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json">models, cost & pricing</a>
     ▸ Optimized for apps & data workloads like lookups
     ▸ Filtering and field projection
     ▸ <b>JSON</b> and <b>CSV</b> support
     ▸ OpenAPI 3.1 specification
     ▸ CORS-enabled for browser usage
     ▸ <b>Completely free to use</b>
     ▸ <b>No authentication required</b>
     ▸ Synced hourly
     ▸ Last Updated: <b>${lastUpdated}</b>
     ▸ Last Checked: <b>${lastChecked}</b>

</pre>
<section aria-label="Database Statistics">
<h2 style="position: absolute; left: -9999px;">Database Statistics</h2>
<pre>
${sectionHeader('DATABASE STATISTICS')}
<div role="region" aria-label="Provider statistics table">
${asciiTable(
  `All providers (${stats.totalProviders} total)`,
  [
    {
      header: 'Provider',
      width: 24,
      key: 'name',
      render: (v: unknown) =>
        `<a href="/api/v1/providers/${v}?pretty" aria-label="View ${v} models">${v}</a>`,
    },
    {
      header: 'Count',
      width: 5,
      align: 'right',
      key: 'count',
      render: (v: unknown) => (v as number).toString(),
    },
    {
      header: 'Distribution',
      width: 23,
      render: (_: unknown, row: TableData) =>
        progressBar(row.count || 0, maxProviderCount, 23),
    },
  ],
  stats.providerCounts.map((p) => ({ ...p, _: null }))
)}
</div>
<div role="region" aria-label="Model type distribution table">
${asciiTable(
  'Model types',
  [
    {
      header: 'Model Type',
      width: 24,
      key: 'name',
      render: (v: unknown) =>
        `<a href="/api/v1/models?type=${v}&pretty" aria-label="View ${v} models">${v}</a>`,
    },
    {
      header: 'Count',
      width: 5,
      align: 'right',
      key: 'count',
      render: (v: unknown) => (v as number).toString(),
    },
    {
      header: 'Distribution',
      width: 23,
      render: (_: unknown, row: TableData) =>
        progressBar(row.count || 0, maxTypeCount, 23),
    },
  ],
  stats.typeCounts.map((t) => ({ ...t, _: null }))
)}
</div>
<div role="region" aria-label="Capability support matrix table">
${asciiTable(
  'Capability support',
  [
    {
      header: 'Capability',
      width: 24,
      key: 'name',
      render: (v: unknown) =>
        `<a href="/api/v1/models?capability=${v}&pretty" aria-label="View models with ${(v as string).replace(/_/g, ' ')} capability">${(v as string).slice(0, 22)}</a>`,
    },
    {
      header: 'Count',
      width: 5,
      align: 'right',
      key: 'count',
      render: (v: unknown) => (v as number).toString(),
    },
    {
      header: 'Coverage',
      width: 23,
      render: (_: unknown, row: TableData) =>
        progressBar(row.count || 0, stats.totalModels, 23),
    },
  ],
  // Sort capabilities by count (descending) and show all
  Object.entries(stats.capabilities)
    .map(([name, count]) => ({ name: name.replace('supports_', ''), count }))
    .sort((a, b) => b.count - a.count)
)}
</div>
${sectionHeader('QUICK EXAMPLES')}

 <b>List all models</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?pretty" aria-label="API endpoint to list all models">/api/v1/models</a>                                         │
└────────────────────────────────────────────────────────────┘

 <b>Filter by provider</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?providers=openai,anthropic&pretty" aria-label="API endpoint to filter models by OpenAI and Anthropic providers">/api/v1/models?providers=openai,anthropic</a>              │
└────────────────────────────────────────────────────────────┘

 <b>Get specific fields</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?project=model_id,model_name,provider_id&pretty" aria-label="API endpoint to get specific model fields">/api/v1/models?project=model_id,model_name,provider_id</a> │
└────────────────────────────────────────────────────────────┘

 <b>Get a specific model</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models/o3?pretty" aria-label="API endpoint to get o3 model details">/api/v1/models/o3</a>                                      │
└────────────────────────────────────────────────────────────┘

</pre>
</section>

<section aria-label="Output Options">
<h2 style="position: absolute; left: -9999px;">Output Options</h2>
<pre>
${sectionHeader('OUTPUT OPTIONS')}

 <b>Pretty JSON</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?pretty" aria-label="Pretty print JSON output">/api/v1/models?pretty</a>                                  │
└────────────────────────────────────────────────────────────┘

 <b>CSV output</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?format=csv" aria-label="Return CSV output">/api/v1/models?format=csv</a>                              │
└────────────────────────────────────────────────────────────┘

 <b>CSV with headers</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?format=csv&headers=true" aria-label="Return CSV with headers">/api/v1/models?format=csv&headers=true</a>                 │
└────────────────────────────────────────────────────────────┘

 <b>JSON Lines (JSONL)</b>
┌────────────────────────────────────────────────────────────┐
│ GET <a href="/api/v1/models?format=jsonl" aria-label="Return JSON Lines output">/api/v1/models?format=jsonl</a>                            │
└────────────────────────────────────────────────────────────┘

</pre>
</section>

<section aria-label="API Routes">
<h2 style="position: absolute; left: -9999px;">API Routes</h2>
<pre>
${sectionHeader('API ROUTES')}

  <a href="/api/v1/models?pretty" aria-label="API models endpoint">/api/v1/models</a>         List all models with filtering
  <a href="/api/v1/models/gpt-4?pretty" aria-label="API model by ID endpoint example">/api/v1/models/:id</a>     Get a specific model by ID
  <a href="/api/v1/providers?pretty" aria-label="API providers endpoint">/api/v1/providers</a>      List all providers
  <a href="/api/v1/providers/openai?pretty" aria-label="API provider models endpoint example">/api/v1/providers/:id</a>  Get models for a provider
  <a href="/api/v1/metadata?pretty" aria-label="API metadata endpoint">/api/v1/metadata</a>       Get database metadata & stats

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

<section aria-label="Support Information">
<h2 style="position: absolute; left: -9999px;">Support Information</h2>
<pre>
${sectionHeader('SUPPORT')}

- If you have issues or feature requests for the API service,
  please create an issue on the <a href="https://github.com/axiomhq/modeldb/issues" aria-label="ModelDB GitHub issues page"><b>ModelDB project</b></a>.

- If you have issues with model details, <b>please support the
  LiteLLM</b> community by contributing a pull request to the
  <a href="https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json" aria-label="LiteLLM model prices JSON file">model_prices_and_context_window.json</a> on the <a href="https://github.com/BerriAI/litellm" aria-label="LiteLLM GitHub repository"><b>LiteLLM project</b></a>.

</pre>
</section>

<section aria-label="Acknowledgements">
<h2 style="position: absolute; left: -9999px;">ACKNOWLEDGEMENTS</h2>
<pre>
${sectionHeader('ACKNOWLEDGEMENTS')}

Huge thank you to the LiteLLM community for their ongoing
contributions to keep the model details up-to-date &hearts;.


</pre>
</section>

<section aria-label="Footer">
<h2 style="position: absolute; left: -9999px;">Footer</h2>
<pre>
${'═'.repeat(62)}
(C) Axiom, Inc. 2025                    axiomhq/modeldb@v1.0.0
</pre>
</section>
</main>
</body>
</html>`;
}
