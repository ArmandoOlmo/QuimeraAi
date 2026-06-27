# Quimera.ai Client Beta Production Readiness Checklist

Use this checklist before enabling controlled pilot/beta customers on production.
Do not accept real customer traffic unless every required gate is checked with
current production evidence.

## 1. Code And CI Gates

- [ ] Required: PR has passed GitHub Actions workflow `Production Readiness Gate`.
- [ ] Required: `npm run type-check:serverless-api` passes.
- [ ] Required: `npm run test:serverless-api` passes.
- [ ] Required: `npm run test:critical:production` passes.
- [ ] Required: `npm run build` passes.
- [ ] Required: `deno check` passes for the critical Supabase Edge Functions:
  `ai-proxy`, `email-api`, `stripe-api`, `stripe-webhook`,
  `create-public-restaurant-reservation`, `storefront-api`, `onboarding-api`.
- [ ] Required: any global `npm run type-check` failures are reviewed and
  classified as baseline noise or fixed before merge.

## 2. Vercel Cron Runtime Gates

The following routes must import and boot in Vercel Serverless without runtime
`.ts` module resolution failures:

- [ ] `GET /api/email/jobs/run`
- [ ] `GET /api/appointments/jobs/run`
- [ ] `GET /api/appointments/google/jobs/run`
- [ ] `POST /api/mcp/jobs/run`

Smoke tests for each preview/prod deployment:

- [ ] Required: unauthenticated request returns `401 Unauthorized`, not `500`.
- [ ] Required: missing `CRON_SECRET` is impossible in the target environment;
  local tests cover the explicit `500 CRON_SECRET is not configured` failure.
- [ ] Required: Vercel runtime logs for the deployment contain no
  `Cannot find module`, `ERR_MODULE_NOT_FOUND`, or cron route `500` burst.
- [ ] Required before running an authenticated job in production: confirm queue
  volume and rate limits. Use a controlled window and low limits for beta.
- [ ] Required before accepting beta customers: run the protected readiness
  probe against the target deployment runtime with a valid `CRON_SECRET`; this
  validates env shape and read-only provider connectivity without sending email,
  syncing calendars, creating payments, or mutating Supabase data.

Recommended unauthenticated smoke commands:

```bash
curl -i https://<preview-url>/api/email/jobs/run
curl -i https://<preview-url>/api/appointments/jobs/run
curl -i https://<preview-url>/api/appointments/google/jobs/run
curl -i -X POST https://<preview-url>/api/mcp/jobs/run
curl -i https://<preview-url>/api/ops/readiness
```

Protected runtime readiness probe:

```bash
curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<target-url>/api/ops/readiness?live=1&strict=1" | jq
```

For local/operator checks with Vercel env injection:

```bash
npm run readiness:probe:production -- --json
```

This npm command runs `vercel env run` from a temporary linked directory so
local `.env` files cannot create false positives. If it reports every sensitive
value as missing while Vercel env names are present, treat that as a CLI
redaction/injection limitation and use the protected runtime endpoint for final
evidence.

Latest controlled-readiness evidence, 2026-06-27:

- Production unauthenticated cron smokes returned handler-level `401` for email,
  appointment email, Google Calendar sync, and MCP job routes. Because these
  handlers return `500` when `CRON_SECRET` is missing, `401` proves the secret is
  present in production without running the jobs.
- Read-only Supabase preflight used the production custom domain
  `auth.quimera.ai`, whose CNAME resolves to the linked project
  `elfcrnhffuvntlfuvumd.supabase.co`; no customer payloads or secret values were
  printed.
- Queue preflight at `2026-06-27T21:23:57.712Z`:
  `email_outbox` due/runnable `0`, active queued/sending `0`,
  appointments `email_logs` queued/scheduled `0`, Google Calendar connected sync
  integrations `0`, pending Google webhook syncs `0`, and pending MCP jobs `0`.
- Do not run authenticated cron routes until the owner confirms a controlled
  production window, current queue volume, rate limits, and provider secret
  correctness.
- Preview deployment for PR #42 head `dccb2a6` is `READY`:
  `dpl_5b5VBo9G2b1mvbn35tUAYHUVzFKd` /
  `https://quimera-8afec8u46-quimeraapp.vercel.app`.
- `vercel inspect` confirms lambda outputs exist for `api/email/jobs/run`,
  `api/appointments/jobs/run`, `api/appointments/google/jobs/run`,
  `api/mcp/jobs/run`, and `api/ops/readiness`; direct preview HTTP requests are
  intercepted by Vercel SSO with `302` before handlers run.
- Production unauthenticated smokes on `https://www.quimera.ai` returned `401`
  for email, appointment email, Google Calendar sync, and `POST` MCP job routes.
  `GET /api/mcp/jobs/run` returns `405`, as expected for a POST-only job route.
- Production error log scan for `https://www.quimera.ai` over the latest checked
  hour returned no Vercel error logs.

## 3. Required Secrets And Environment Contract

Server-only in Vercel/Supabase. Never expose with a `VITE_` prefix:

- [ ] `CRON_SECRET`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY` if Resend is enabled, or `SENDGRID_API_KEY` if SendGrid
  is the active/fallback email provider. At least one provider key is required.
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `GOOGLE_CALENDAR_CLIENT_SECRET`
- [ ] `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`
- [ ] `GOOGLE_CALENDAR_OAUTH_STATE_SECRET`
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `CLOUDFLARE_ACCOUNT_ID`

Public/client-safe values:

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY` or publishable Supabase key
- [ ] `VITE_AI_PROXY_URL`
- [ ] `VITE_PUBLIC_APP_URL`
- [ ] `VITE_WIDGET_API_BASE_URL`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `VITE_GOOGLE_CLIENT_ID`

URL contract:

- [ ] `APP_BASE_URL=https://www.quimera.ai`
- [ ] `VITE_PUBLIC_APP_URL=https://www.quimera.ai`
- [ ] Google Calendar redirect URI is exactly on `https://www.quimera.ai` and
  matches `/api/appointments/google/oauth/callback`.
- [ ] Google Calendar webhook URL is exactly on `https://www.quimera.ai` and
  matches `/api/appointments/google/webhook`.

Hard blockers:

- [ ] No `VITE_CLOUDFLARE_TOKEN` in env files, code, Vercel env vars, or bundles.
- [ ] No Supabase service role key in frontend code, browser env, logs, or tests.
- [ ] No real secret values committed to Git.

Verification notes:

- Vercel env names can be checked safely by CLI, but production value validation
  may not be provable from `vercel env pull` because sensitive values can be
  returned as empty/redacted in the local pull file. `vercel env run` can also
  be weak evidence if local `.env` files are loaded or if the CLI does not expose
  sensitive values to the child process. Treat CLI-only output as names-present
  evidence unless provider read-only checks pass.
- Stronger evidence comes from `/api/ops/readiness?live=1&strict=1`, because it
  runs inside the Vercel deployment runtime where the actual target environment
  variables are loaded.
- Before the first authorized production email/calendar/Stripe smoke, confirm
  the actual values in the Vercel/Supabase dashboards or through the protected
  runtime readiness probe. The probe validates shape/connectivity without
  printing secrets.

## 4. Supabase Security Gate

Required before beta:

- [ ] Compare `supabase_migrations.schema_migrations` with local
  `supabase/migrations` before applying new migrations. Do not run `db push`
  blindly if timestamps drift between remote and local history.
- [ ] Apply and review Supabase hardening migrations:
  `20260627201856_harden_function_search_paths.sql` and
  `20260627202043_revoke_anon_agency_security_definer_execute.sql`.
- [ ] Apply and review public insert policy hardening migration:
  `20260627204427_harden_public_insert_policies.sql`.
- [ ] Apply and review tenant helper policy hardening migration:
  `20260627205954_restrict_tenant_helper_policies_to_authenticated.sql`.
- [ ] Apply and review final restaurant public insert and tenant helper grant
  hardening migration:
  `20260627215753_harden_restaurant_public_insert_and_tenant_helper_grants.sql`.
- [ ] Re-run Supabase security advisors after migration.
- [ ] Confirm no `Function Search Path Mutable` findings remain for:
  `set_realty_updated_at`, `normalize_realty_crm_status`,
  `set_social_chat_updated_at`, `is_project_chat_member`,
  `default_realty_lead_tags`, `is_project_chatbot_engine_member`,
  `quimera_normalize_plan_id`, `quimera_canonical_plan_limits`,
  `quimera_sanitize_plan_limits`, `quimera_plan_limits_are_finite`.
- [ ] Confirm Edge Functions expected to be public implement custom validation:
  `stripe-webhook`, `email-api`, `create-public-restaurant-reservation`.
- [ ] Confirm leaked password protection remains enabled in Supabase Auth before
  open beta.
- [ ] Confirm public `insert` policies for `platform_leads`,
  `restaurant_analytics_events`, and `restaurant_reservations` keep schema-level
  validation predicates, verify restaurant/tenant/project scope against
  `public.restaurants`, and do not regress to `WITH CHECK (true)`.
- [ ] Confirm product-approved anti-abuse controls/rate limits for public lead,
  analytics, and reservation routes before expanding beyond controlled pilots.
- [ ] Review SECURITY DEFINER execute grants before expanding beyond controlled
  pilot accounts.
- [ ] Confirm `get_auth_user_tenants()` is not executable by `anon` and every
  tenant policy that calls it is scoped to `TO authenticated`.
- [ ] Confirm remaining `SECURITY DEFINER` advisor warnings are limited to
  authenticated RLS helper functions that require a broader helper refactor
  before open beta.

Do not apply broad RLS/grant changes during the beta gate without an owner
approved migration plan. Public forms and reservation flows depend on some open
insert paths.

Latest Supabase evidence, 2026-06-27:

- Project `elfcrnhffuvntlfuvumd` is `ACTIVE_HEALTHY` on Postgres 17.6.
- Critical Edge Functions are active: `ai-proxy`, `email-api`, `stripe-api`,
  `stripe-webhook`, `storefront-api`, `onboarding-api`, and
  `create-public-restaurant-reservation`.
- Migration history confirms the hardening migrations through
  `20260627215753_harden_restaurant_public_insert_and_tenant_helper_grants`.
- `anon` no longer has `EXECUTE` on `public.get_auth_user_tenants()`;
  `authenticated` and `service_role` retain execute.
- Public insert policies for `restaurant_reservations` and
  `restaurant_analytics_events` now verify restaurant, tenant, and project scope
  against `public.restaurants`.
- Supabase advisors currently report `422` warnings: `13` security warnings
  for authenticated-only `SECURITY DEFINER` helper callability and `409`
  performance warnings. Current advisor summary shows `0`
  `function_search_path_mutable`, `0` public RLS-disabled findings, `0`
  `security_definer_view`, and `0` anon-executable `SECURITY DEFINER` findings.

## 5. Production Smoke Tests

Run against the final Vercel preview and again after production promotion:

- [ ] Home and app shell load on `https://www.quimera.ai`.
- [ ] `https://quimera.ai` redirects to `https://www.quimera.ai`.
- [ ] Auth login/signup/logout works for staff and controlled beta test
  accounts.
- [ ] A new tenant can be created.
- [ ] A new project can be created under the tenant.
- [ ] Onboarding can be completed without Supabase/PostgREST schema errors.
- [ ] Project dashboard loads without Supabase/PostgREST schema errors.
- [ ] AI Studio can generate a website from a test brief.
- [ ] Generated website can be edited in the visual editor.
- [ ] Generated website can be published.
- [ ] Public website preview renders the published project.
- [ ] Public website form can create a lead.
- [ ] Created lead appears in CRM/Leads with the expected project/tenant scope.
- [ ] Email Marketing Engine can create a test draft and queue review safely.
- [ ] Email outbox cron returns authorized success in a controlled window.
- [ ] Email outbox records the expected send/review/suppression status.
- [ ] Unsubscribe link/action records suppression and prevents future sends.
- [ ] Protected readiness probe returns `200` with live provider connectivity
  checks passing, or every warning/failure is explicitly accepted for controlled
  beta scope.
- [ ] Appointments dashboard loads.
- [ ] Public appointment booking page renders.
- [ ] Public appointment booking creates a test appointment.
- [ ] Appointment email cron returns authorized success in a controlled window.
- [ ] Appointment confirmation email is queued/sent as expected.
- [ ] Google Calendar OAuth callback URL is registered and sync cron responds.
- [ ] Storefront can be created for a test project.
- [ ] A real test product can be created and published.
- [ ] Public storefront hides invalid placeholders and draft/demo-only products.
- [ ] Stripe checkout works in test mode.
- [ ] Stripe webhook endpoint rejects invalid signatures and accepts dashboard
  replay for a test-mode event.
- [ ] Storefront order/payment state maps back to the dashboard.
- [ ] Public Bio Page route renders a known test project.
- [ ] Bio Page public lead/subscriber flow records the expected CRM/email data.
- [ ] Vercel runtime logs for the last 24 hours contain no new unexplained
  `500` bursts.
- [ ] Supabase security/performance advisors have been reviewed after the final
  migration state.
- [ ] Supabase Edge Function logs for the last 24 hours contain no new error
  burst on `ai-proxy`, `email-api`, `stripe-api`, `stripe-webhook`,
  `create-public-restaurant-reservation`, `storefront-api`, or
  `onboarding-api`.
- [ ] No Vercel runtime log burst of `500` after smoke tests.
- [ ] No Supabase Edge Function error burst after smoke tests.

## 6. Beta Admission Rule

Controlled beta can start only when:

- [ ] PR is merged after CI passes.
- [ ] Vercel production deployment is inspected and aliases point to the new
  deployment.
- [ ] Required secrets exist in the correct environment.
- [ ] Supabase migration is applied and advisors are reviewed.
- [ ] Smoke test evidence is attached to the PR/release note.
- [ ] Known unresolved security advisors are explicitly accepted by the owner
  for controlled beta scope only.
