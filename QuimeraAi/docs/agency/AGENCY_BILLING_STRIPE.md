# Agency Billing And Stripe

## Canonical Flow

1. Agency creates a service plan through `POST /api/agency/plans/save`, which validates `canManageBilling` and writes canonical `agency_service_plans`.
2. Agency creates or selects a client tenant through the Agency onboarding flow.
3. Agency generates a payment link through `POST /api/agency/payment-links/create`, which forwards to canonical `stripe-api` action `agencyBilling-createClientPaymentLink` with the user bearer token.
4. `/pay/:token` loads link details through `GET /api/agency/payment-links/info` and starts checkout with `POST /api/agency/payment-links/start-checkout`.
5. The Vercel API wrapper forwards `agencyBilling-confirmClientPayment` to `stripe-api`; `stripe-api` creates a Stripe Checkout Session in subscription mode.
6. Stripe sends webhooks to `POST /api/agency/stripe/webhook`, which preserves the raw body/signature and forwards to Supabase Edge `stripe-webhook`.
7. `stripe-webhook` verifies the Stripe signature, registers the event in `store_payment_events`, registers Agency events in `agency_billing_events`, and reconciles client billing state.
8. Successful Agency subscription activation writes `agency_usage_ledger` with revenue, base cost, markup, and margin.

## Canonical Services

- `services/agency/agencyWebhookService.ts` owns pure Agency webhook decisions: metadata extraction, Agency event insert payloads, duplicate status classification, uniqueness error detection, status update payloads, and ledger rows.
- `api/agency/payment-links/*.ts` owns the Vercel Agency billing boundary: method/body validation, bearer-token forwarding, public anon-key forwarding, and safe return URL normalization.
- `api/agency/plans/*.ts` owns the Vercel Agency service-plan mutation boundary: bearer-token validation, `agency-service-plans` access checks, finite price/base-cost/limit validation, archive/delete protection for assigned clients, and canonical `agency_service_plans` writes.
- `api/agency/stripe/webhook.ts` owns the Vercel webhook boundary and must forward the raw request body plus `stripe-signature`.
- `supabase/functions/_shared/agency-stripe-billing.ts` re-exports the service for Supabase Edge compatibility.
- `supabase/functions/stripe-webhook/index.ts` stays responsible for Stripe signature verification, database writes, and side effects.

## Idempotency

- Stripe webhook idempotency is keyed by `event.id`.
- Shared ecommerce/platform webhook idempotency remains in `store_payment_events`.
- Agency-specific billing idempotency is in `agency_billing_events(provider,event_id)` plus the explicit `provider_event_id` and `idempotency_key = stripe:{event.id}` compatibility fields.
- Ledger idempotency uses `stripe:agency-client-subscription:{subscription-or-session}:{period}`.
- Usage ledger rows write both compatibility and contract fields: legacy `source`/`unit_price` plus canonical `source_module`/`client_price`, `agency_markup_type`, `agency_markup_value`, `source_entity_type`, and `source_entity_id`.

## Separation Rules

- Do not write Agency service plan IDs into `tenant.subscription_plan`.
- Do not sell `subscription_plans` as Agency service plans.
- Do not store Agency payment links in `tenants.billing.paymentLinks`; `agency_client_payment_links` is mandatory for link lookup, checkout state, and webhook reconciliation.
- Owner and Super Admin are platform-unlimited roles for public services, including aliases such as `superadmin`, `super_admin`, `super-admin`, and `super admin`.
- Do not store raw card data or fake payment methods in the browser.
- Do not expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to Vite/browser code.
- Do not create a second Stripe implementation in Vercel API routes. Vercel routes are a narrow proxy/validation layer; Supabase Edge remains the Stripe write path.
- Stripe Connect is not required for Agency Billing V1. The existing ecommerce Connect path remains separate.

## Required Secrets

- Supabase Edge: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Vercel: `VITE_SUPABASE_URL` or `SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`, and app URL variables are required for the Agency API wrappers.
