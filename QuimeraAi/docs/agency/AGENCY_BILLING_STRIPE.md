# Agency Billing And Stripe

## Canonical Flow

1. Agency creates a service plan in `agency_service_plans`.
2. Agency creates or selects a client tenant through the Agency onboarding flow.
3. Agency generates a payment link with `stripe-api` action `agencyBilling-createClientPaymentLink`.
4. `/pay/:token` loads link details and calls `agencyBilling-confirmClientPayment`.
5. `stripe-api` creates a Stripe Checkout Session in subscription mode.
6. `stripe-webhook` verifies the Stripe signature, registers the event in `store_payment_events`, registers Agency events in `agency_billing_events`, and reconciles client billing state.
7. Successful Agency subscription activation writes `agency_usage_ledger` with revenue, base cost, markup, and margin.

## Canonical Services

- `services/agency/agencyWebhookService.ts` owns pure Agency webhook decisions: metadata extraction, Agency event insert payloads, duplicate status classification, uniqueness error detection, status update payloads, and ledger rows.
- `supabase/functions/_shared/agency-stripe-billing.ts` re-exports the service for Supabase Edge compatibility.
- `supabase/functions/stripe-webhook/index.ts` stays responsible for Stripe signature verification, database writes, and side effects.

## Idempotency

- Stripe webhook idempotency is keyed by `event.id`.
- Shared ecommerce/platform webhook idempotency remains in `store_payment_events`.
- Agency-specific billing idempotency is in `agency_billing_events(provider,event_id)`.
- Ledger idempotency uses `stripe:agency-client-subscription:{subscription-or-session}:{period}`.

## Separation Rules

- Do not write Agency service plan IDs into `tenant.subscription_plan`.
- Do not sell `subscription_plans` as Agency service plans.
- Do not store raw card data or fake payment methods in the browser.
- Do not expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to Vite/browser code.
- Stripe Connect is not required for Agency Billing V1. The existing ecommerce Connect path remains separate.

## Required Secrets

- Supabase Edge: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Vercel: `STRIPE_SECRET_KEY` is needed for server routes that call Stripe; Agency Billing currently uses Supabase Edge for runtime writes.
