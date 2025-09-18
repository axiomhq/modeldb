# Repository Guidelines

## Project Structure & Module Organization
- `src/`: TypeScript source. Entry is `src/index.ts`; route/handlers live in files like `home.ts`, `models.ts`, `providers.ts`. Generated data is committed in `src/data/`.
- `test/`: Vitest specs (Cloudflare Workers pool). Naming: `*.spec.ts` (e.g., `models.spec.ts`).
- `scripts/`: Maintenance utilities, e.g., `scripts/sync.ts` to refresh model data.
- Config: `wrangler.jsonc` (Workers), `vitest.config.mts`, `tsconfig.json`, `biome.jsonc`, `.editorconfig`.

## Build, Test, and Development Commands
- `npm run dev` / `npm start`: Run locally with Cloudflare Wrangler.
- `npm test` / `npm run test:watch`: Execute Vitest suite (watch mode optional).
- `npm run lint`: Format/check code using Biome (Ultracite preset).
- `npm run sync`: Regenerate `src/data/*` from LiteLLM. Commit changes.
- `npm run gen:types`: Generate Wrangler types.
- `npm run deploy` / `npm run deploy:prod`: Deploy to Cloudflare Workers (prod uses `env.production`).

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Prefer `const`, explicit types, and small pure functions.
- Indentation: Tabs per `.editorconfig`; LF line endings; UTF‑8.
- Files: kebab‑case for modules (`model-utils.ts`), tests as `*.spec.ts` under `test/`.
- Formatting: Use `npm run lint` before committing. Avoid `any`; keep exports minimal.

## Testing Guidelines
- Framework: Vitest with `@cloudflare/vitest-pool-workers`.
- Location: `test/*.spec.ts` with focused unit tests for routes, schema transforms, and CSV.
- Running: `npm test` (CI) or `npm run test:watch` locally.
- Conventions: One logical concern per spec; use descriptive `describe/it` names; add fixtures under `test/fixtures/`.

## Commit & Pull Request Guidelines
- Commits: Conventional style, e.g., `feat: add provider filter`, `fix: correct model id mapping`, `docs: update API examples`, `test: cover CSV headers`.
- PRs: Link issues, summarize changes, note data or API impacts, include tests/docs, and paste local run output for `npm test` and `npm run lint`.
- Scope: Keep PRs small and atomic. If `scripts/sync.ts` changes, run `npm run sync` and commit regenerated `src/data/*`.

## Security & Configuration Tips
- No runtime secrets required. Use `wrangler.jsonc` `vars` for environment flags (`ENV`).
- Do not add network calls at request time; all data should be served from memory.
- Verify OpenAPI updates in `src/openapi.ts` when changing response shapes.
