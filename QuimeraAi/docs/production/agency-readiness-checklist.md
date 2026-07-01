# Agency Production Readiness Checklist

## Environment

- Vercel production must include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `APP_BASE_URL`, `VITE_PUBLIC_APP_URL`, `RESEND_API_KEY` or `SENDGRID_API_KEY`, and `CRON_SECRET`.
- Supabase Edge secrets must include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
- If Cloudflare DNS automation is required, production must also include server-side `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Browser-exposed Cloudflare tokens are not acceptable.

## Database

- Apply `20260701153400_agency_production_ready_hardening.sql`.
- Confirm `subscription_plans` no longer has an authenticated `FOR ALL` policy.
- Confirm the Agency tables exist: `agency_usage_ledger`, `agency_billing_events`, `agency_snapshots`, `agency_snapshot_versions`, and `agency_snapshot_applications`.
- Confirm clients cannot read raw usage ledger or billing event rows. Agency owner/admin and platform owner paths are the only authenticated read/write paths.

## Stripe

- Keep Supabase Edge `stripe-webhook` as the canonical Stripe webhook.
- Use Checkout Sessions in `mode = subscription` for Agency client billing.
- Keep platform billing in `subscription_plans` and `subscriptions`.
- Keep Agency service billing in `agency_service_plans`.
- Keep client checkout records in `agency_client_payment_links`.
- `agency_billing_events` must record Stripe events idempotently by `provider,event_id`.
- `agency_usage_ledger` must record subscription revenue, base cost, markup, and margin with a deterministic idempotency key.

## UI And Access

- Agency Command Center must show MRR, base cost, margin, open payment links, pending approvals, limits, activity, reports, clients, projects, and module readiness from real data.
- Client approval responses must go through `onboarding-api` action `respondClientApproval`; the portal must not update approval status directly.
- Client Portal reads reports only from `agency_reports` rows with `status in ('sent', 'published')`.
- Internal notes, cost, markup, and margin stay agency-only.

## Verification

- Run focused tests:
  - `npm run test:run -- tests/utils/agencyProductionReadinessContract.test.ts tests/utils/agencyBillingContract.test.ts tests/utils/agencyStripeWebhookHelpers.test.ts tests/scripts/productionReadinessProbe.test.ts`
- Run authenticated RLS negative probe against the linked Supabase project:
  - `npm run readiness:agency-rls-negative`
- Run app build:
  - `npm run build`
- Run readiness probe with production env:
  - `npm run readiness:probe -- --strict`
  - Add `--live` only when production credentials are intentionally available.
  - Add `--require-cloudflare` only when DNS automation is in scope.
