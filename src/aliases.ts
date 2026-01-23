/**
 * Model ID alias resolution.
 * Maps variant IDs (vercel/openrouter formats, version variations) to canonical LiteLLM IDs.
 */

import type { Model } from './schema';

export type AliasesArtifact = {
  aliases: Record<string, string>;
  base_latest: Record<string, string>;
};

const GATEWAY_PREFIXES = [
  'openrouter/',
  'vercel/',
  'vercel_ai_gateway/',
] as const;

const PROVIDER_PREFIXES = [
  'openai/',
  'anthropic/',
  'bedrock/',
  'vertex_ai/',
  'vertex/',
  'cohere/',
  'groq/',
  'mistral/',
  'perplexity/',
  'together_ai/',
  'together/',
  'deepinfra/',
  'huggingface/',
  'replicate/',
  'voyage/',
  'databricks/',
  'ai21/',
  'fireworks/',
  'anyscale/',
  'cloudflare/',
  'deepseek/',
  'xai/',
] as const;

const DOT_VERSION_PATTERN = /(\d+)\.(\d+)/g;
const DATE_SUFFIX_PATTERN = /-\d{8}$/;
const CLAUDE_REORDER_PATTERN = /^claude-(\d+(?:[.-]\d+)*)-(opus|sonnet|haiku)$/;
const DATE_EXTRACT_PATTERN = /^(.+)-(\d{8})$/;

export function generateCandidates(raw: string): string[] {
  const s0 = raw.trim().toLowerCase();
  const out: string[] = [s0];

  let stripped = s0;

  for (const prefix of GATEWAY_PREFIXES) {
    if (stripped.startsWith(prefix)) {
      stripped = stripped.slice(prefix.length);
      break;
    }
  }

  for (const prefix of PROVIDER_PREFIXES) {
    if (stripped.startsWith(prefix)) {
      stripped = stripped.slice(prefix.length);
      break;
    }
  }

  if (stripped !== s0) {
    out.push(stripped);
  }

  const dottedToDashed = stripped.replace(DOT_VERSION_PATTERN, '$1-$2');
  if (dottedToDashed !== stripped) {
    out.push(dottedToDashed);
  }

  const withoutDate = dottedToDashed.replace(DATE_SUFFIX_PATTERN, '');
  if (withoutDate !== dottedToDashed) {
    out.push(withoutDate);
  }

  const reorderMatch = stripped.match(CLAUDE_REORDER_PATTERN);
  if (reorderMatch) {
    const reordered = `claude-${reorderMatch[2]}-${reorderMatch[1]}`;
    out.push(reordered);
    out.push(reordered.replace(DOT_VERSION_PATTERN, '$1-$2'));
  }

  return [...new Set(out)];
}

export function resolveModelId(
  raw: string,
  map: Record<string, Model>,
  aliases: AliasesArtifact
): string | null {
  if (map[raw]) {
    return raw;
  }

  for (const id of generateCandidates(raw)) {
    if (map[id]) {
      return id;
    }

    const viaAlias = aliases.aliases[id];
    if (viaAlias && map[viaAlias]) {
      return viaAlias;
    }

    const viaBase = aliases.base_latest[id];
    if (viaBase && map[viaBase]) {
      return viaBase;
    }
  }

  return null;
}

function extractDateSuffix(
  modelId: string
): { base: string; date: string } | null {
  const match = modelId.match(DATE_EXTRACT_PATTERN);
  return match ? { base: match[1], date: match[2] } : null;
}

function buildBaseLatest(
  modelsMap: Record<string, Model>
): Record<string, string> {
  const baseLatest: Record<string, string> = {};

  for (const modelId of Object.keys(modelsMap)) {
    const extracted = extractDateSuffix(modelId);
    if (!extracted) {
      continue;
    }

    const { base, date } = extracted;
    const existing = baseLatest[base];

    if (!existing) {
      baseLatest[base] = modelId;
      continue;
    }

    const existingExtracted = extractDateSuffix(existing);
    if (existingExtracted && date > existingExtracted.date) {
      baseLatest[base] = modelId;
    }
  }

  return baseLatest;
}

export function buildAliasesArtifact(
  modelsMap: Record<string, Model>,
  customAliases?: Record<string, string>
): AliasesArtifact {
  const baseLatest = buildBaseLatest(modelsMap);

  const aliases: Record<string, string> = {};
  if (customAliases) {
    for (const [variant, canonical] of Object.entries(customAliases)) {
      let resolved = canonical;
      for (let i = 0; i < 3; i++) {
        const next = customAliases[resolved];
        if (!next || next === resolved) {
          break;
        }
        resolved = next;
      }
      aliases[variant] = resolved;
    }
  }

  return { aliases, base_latest: baseLatest };
}

export const EMPTY_ALIASES: AliasesArtifact = {
  aliases: {},
  base_latest: {},
};
