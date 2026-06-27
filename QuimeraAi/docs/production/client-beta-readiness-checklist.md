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

Recommended unauthenticated smoke commands:

```bash
curl -i https://<preview-url>/api/email/jobs/run
curl -i https://<preview-url>/api/appointments/jobs/run
curl -i https://<preview-url>/api/appointments/google/jobs/run
curl -i -X POST https://<preview-url>/api/mcp/jobs/run
```

## 3. Required Secrets And Environment Contract

Server-only in Vercel/Supabase. Never expose with a `VITE_` prefix:

- [ ] `CRON_SECRET`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `SENDGRID_API_KEY` if SendGrid fallback is enabled
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
- [ ] Google Calendar redirect URI matches the deployed callback route.
- [ ] Webhook URLs use the canonical production domain.

Hard blockers:

- [ ] No `VITE_CLOUDFLARE_TOKEN` in env files, code, Vercel env vars, or bundles.
- [ ] No Supabase service role key in frontend code, browser env, logs, or tests.
- [ ] No real secret values committed to Git.

## 4. Supabase Security Gate

Required before beta:

- [ ] Compare `supabase_migrations.schema_migrations` with local
  `supabase/migrations` before applying new migrations. Do not run `db push`
  blindly if timestamps drift between remote and local history.
- [ ] Apply and review Supabase hardening migrations:
  `20260627201856_harden_function_search_paths.sql` and
  `20260627202043_revoke_anon_agency_security_definer_execute.sql`.
- [ ] Re-run Supabase security advisors after migration.
- [ ] Confirm no `Function Search Path Mutable` findings remain for:
  `set_realty_updated_at`, `normalize_realty_crm_status`,
  `set_social_chat_updated_at`, `is_project_chat_member`,
  `default_realty_lead_tags`, `is_project_chatbot_engine_member`,
  `quimera_normalize_plan_id`, `quimera_canonical_plan_limits`,
  `quimera_sanitize_plan_limits`, `quimera_plan_limits_are_finite`.
- [ ] Confirm Edge Functions expected to be public implement custom validation:
  `stripe-webhook`, `email-api`, `create-public-restaurant-reservation`.
- [ ] Enable leaked password protection in Supabase Auth before open beta.
- [ ] Review public `insert` policies for `platform_leads`,
  `restaurant_analytics_events`, and `restaurant_reservations`; keep them only
  if each route has product-approved anti-abuse controls.
- [ ] Review SECURITY DEFINER execute grants before expanding beyond controlled
  pilot accounts.
- [ ] Confirm Agency Engine `SECURITY DEFINER` helpers are executable by
  `authenticated`/`service_role`, not `anon`. Keep
  `get_auth_user_tenants()` as the documented exception required by public
  project reads.

Do not apply broad RLS/grant changes during the beta gate without an owner
approved migration plan. Public forms and reservation flows depend on some open
insert paths.

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
