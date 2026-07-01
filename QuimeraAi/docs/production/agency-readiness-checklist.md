# Agency Production Readiness Checklist

## Environment

- Vercel production must include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `APP_BASE_URL`, `VITE_PUBLIC_APP_URL`, `RESEND_API_KEY` or `SENDGRID_API_KEY`, and `CRON_SECRET`.
- Supabase Edge secrets must include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
- If Cloudflare DNS automation is required, production must also include server-side `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Browser-exposed Cloudflare tokens are not acceptable.
- When Cloudflare DNS automation is not in scope and no Cloudflare env pair is configured, Agency readiness reports those checks as skipped. A partial Cloudflare pair is still a warning, and `requireCloudflare=true` or `--require-cloudflare` makes both variables mandatory.

## Database

- Apply `20260701153400_agency_production_ready_hardening.sql`.
- Apply `20260701200825_agency_usage_ledger_contract_compat.sql`.
- Apply `20260701222000_platform_owner_role_normalization.sql`.
- Confirm `subscription_plans` no longer has an authenticated `FOR ALL` policy.
- Confirm `quimera_is_platform_owner()` normalizes `owner`, `superadmin`, `super_admin`, `super-admin`, and `super admin` as platform-owner roles.
- Confirm the Agency tables exist: `agency_usage_ledger`, `agency_billing_events`, `agency_snapshots`, `agency_snapshot_versions`, and `agency_snapshot_applications`.
- Confirm `agency_usage_ledger` exposes `source_module`, `client_price`, `agency_markup_type`, `agency_markup_value`, `source_entity_type`, `source_entity_id`, and supports the required usage types (`ai_tokens`, `email_send`, `automation_run`, etc.).
- Confirm `agency_snapshot_versions` stores `payload`, `included_modules`, and `readiness`; confirm `agency_snapshot_applications` stores `preview`, `applied_changes`, `error`, and `completed_at`.
- Confirm clients cannot read raw usage ledger, billing event rows, Agency service plan cost/markup data, internal notes, draft reports, or other client rows. Agency owner/admin and platform owner paths are the only authenticated read/write paths.

## Stripe

- Keep Supabase Edge `stripe-webhook` as the canonical Stripe webhook.
- Use Checkout Sessions in `mode = subscription` for Agency client billing.
- Keep platform billing in `subscription_plans` and `subscriptions`.
- Keep Agency service billing in `agency_service_plans`.
- Keep client checkout records in `agency_client_payment_links`.
- Do not use `tenants.billing.paymentLinks` as an Agency payment-link fallback.
- `agency_billing_events` must record Stripe events idempotently by `provider,event_id`, `provider_event_id`, and `idempotency_key`.
- `agency_usage_ledger` must record subscription revenue, base cost, markup, margin, `source_module`, `client_price`, and deterministic idempotency keys.

## UI And Access

- Agency Command Center must show MRR, base cost, margin, open payment links, pending approvals, limits, activity, reports, clients, projects, and module readiness from real data.
- Client approval responses must go through `onboarding-api` action `respondClientApproval`; the portal must not update approval status directly.
- Client Portal reads reports only from `agency_reports` rows with `status in ('sent', 'published')`.
- Internal notes, cost, markup, and margin stay agency-only.

## API Readiness

- `GET /api/agency/readiness` must require `CRON_SECRET` through `Authorization: Bearer ...` or `X-Cron-Secret`.
- The endpoint must check required Agency env groups, canonical Agency tables, usage ledger contract columns, billing event idempotency columns, and snapshot preview/apply columns.
- The endpoint must return only presence/status evidence, never raw secret values.
- `POST /api/agency/clients/create` must require a user bearer token and proxy only `onboarding-api` action `autoProvision`.
- `POST /api/agency/projects/transfer` must require a user bearer token and proxy only `onboarding-api` action `transferProject`.
- `POST /api/agency/approvals/respond` must require a user bearer token, validate `approved/rejected/change_requested`, and proxy only `respondClientApproval`.
- `POST /api/agency/plans/save`, `/archive`, `/restore`, and `/delete` must require a user bearer token, validate `agency-service-plans` with `canManageBilling`, reject non-finite limits and price below base cost, and prevent archive/delete when clients are assigned.
- `POST /api/agency/payment-links/create` must require a user bearer token and proxy only `agencyBilling-createClientPaymentLink`.
- `GET /api/agency/payment-links/info` and `POST /api/agency/payment-links/start-checkout` must use server-side anon-key forwarding to the public Stripe API actions.
- `POST /api/agency/snapshots/create`, `POST /api/agency/snapshots/apply-preview`, and `POST /api/agency/snapshots/apply` must require a user bearer token, validate `agency-project-transfer` Service Access with `canManageProjects`, and execute snapshot mutations with server-side Supabase admin access.
- `POST /api/agency/stripe/webhook` must require `stripe-signature`, preserve the raw request body, and proxy to Supabase Edge `stripe-webhook`.

## Verification

- Run the local Agency production gate:
  - `npm run test:agency:production`
- Run focused tests:
  - `npm run test:run -- tests/utils/agencyProductionReadinessContract.test.ts tests/utils/agencyBillingContract.test.ts tests/utils/agencyStripeWebhookHelpers.test.ts tests/scripts/productionReadinessProbe.test.ts`
- Run authenticated RLS negative probe against the linked Supabase project. The probe creates temporary Agency/client rows inside a transaction, switches to a synthetic authenticated client, verifies client-visible rows only, and rolls back:
  - `npm run readiness:agency-rls-negative`
- Run the linked Supabase schema contract probe. It does not require downloading service-role secrets; it checks Agency tables, contract columns, RLS enablement, anon grants, and idempotency indexes through the Supabase CLI:
  - `npm run readiness:agency-schema-contract`
- Run public Agency E2E coverage for signup, invalid checkout token, and valid payment-link handoff to Stripe Checkout through the Vercel API boundary:
  - `npx playwright test tests/e2e/agency-public.public.spec.ts --project=public-chromium`
- Run the Agency readiness API smoke/import tests:
  - `npm run test:run -- tests/api/agencyBillingApiRoutes.test.ts tests/api/agencyPlanApiRoutes.test.ts tests/api/agencySnapshotApiRoutes.test.ts tests/api/serverlessApiImportSmoke.test.ts tests/services/agencyReadinessService.test.ts`
- Run app build:
  - `npm run build`
- Run readiness probe with production env:
  - `npm run readiness:probe -- --strict`
  - Add `--live` only when production credentials are intentionally available.
  - Add `--require-cloudflare` only when DNS automation is in scope.
  - Current production requires a server-side `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` before `--require-cloudflare` or `GET /api/agency/readiness?requireCloudflare=true` can pass.
