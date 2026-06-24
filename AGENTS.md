# AGENTS.md

## Cursor Cloud specific instructions

The product is **Quimera AI**, an AI website builder. All application code lives in the
`QuimeraAi/` subdirectory (a Vite + React 19 + TypeScript SPA). Run every `npm` command
from inside `QuimeraAi/`, not the repo root. (`functions/` holds separate Firebase Cloud
Functions used only for Stripe/deploy — not needed for local app dev.)

### Services & commands (run inside `QuimeraAi/`)
- Dev server: `npm run dev` → http://localhost:3000 (the port is **3000** per `vite.config.ts`; ignore the `5173` mentioned in some docs).
- Build: `npm run build` (Vite/esbuild) — works.
- Type-check: `npm run type-check` (tsc) — reports many **pre-existing** errors (see `QuimeraAi/.tsc-errors.txt`); it does NOT gate the build.
- Lint: `npm run lint` is a no-op stub (just `echo`).
- Unit/integration tests: `npm run test:run` (vitest). Caveat: vitest also picks up the
  Playwright specs in `tests/e2e/*.spec.ts` and reports them as failed — those are meant for
  `npm run test:e2e` (Playwright, needs a running dev server + browsers). One
  `projectWorkflows` timestamp assertion is a timing flake (timestamps equal within the same ms).

### Environment / backend (non-obvious)
- A `.env` is **required** before the app will render: `supabase.ts` calls `createClient` at import
  time and an empty `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` throws. Copy `QuimeraAi/.env.example`
  to `QuimeraAi/.env`. `.env` is gitignored.
- The app depends on a Supabase backend for all real functionality (auth, tenants, projects).
  With hosted-project secrets, set the `VITE_SUPABASE_*` values. For a fully local end-to-end run
  (signup → dashboard) use the Supabase CLI + Docker (`supabase start`) and point `.env` at
  `http://127.0.0.1:54321` with the printed anon key.
- Migration caveat for a **fresh local DB**: the full `QuimeraAi/supabase/migrations` set does not
  apply cleanly — 4 migrations fail (`20260507000002_ecommerce_extensions`,
  `20260515150000_mcp_ai_gateway`, `20260515173000_complete_mcp_operations`,
  `20260616132315_harden_realty_crm_lead_sync`). The core auth/`users`/`tenants`/`projects` schema
  from the earlier migrations applies fine, which is enough for the signup→dashboard flow. Apply
  migrations tolerantly (e.g. per-file via psql, skipping the failing ones).
- Local Supabase has email confirmation disabled, so registering a user logs you straight into the
  dashboard. AI website generation additionally needs a server-side AI proxy (OpenRouter key); the
  dashboard loads without it, but generation will not work.
