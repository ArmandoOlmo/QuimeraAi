# Agency Architecture

Agency Engine is the agency operating layer for Quimera.ai. It uses the existing multi-tenant Supabase model and keeps three billing domains separate.

## Billing Domains

- Platform Billing: `subscription_plans` and `subscriptions`.
- Agency Billing: `agency_service_plans`, owned by each agency tenant.
- Client Billing: `agency_client_payment_links`, Stripe Checkout Sessions, and reconciled client tenant billing metadata.

`agency_client` is a tenant type, not a subscription plan. Agency service-plan assignment belongs in `agency_clients.agency_plan_id` and `tenant.billing.agencyPlanId`.

## Core Tables

- `agency_service_plans`: agency packages with price, base cost, markup, limits, and features.
- `agency_clients`: relationship between an agency tenant and a client tenant.
- `agency_project_transfers`: audited project copies.
- `agency_client_approvals`: client-facing approval requests.
- `agency_client_payment_links`: public branded checkout links.
- `agency_reports`: AI summaries and report snapshots.
- `agency_activity`: activity feed.
- `agency_client_notes`: internal or client-visible notes.
- `agency_usage_ledger`: usage entries with `source_module`, `usage_type`, `client_price`, `unit_cost`, generated revenue/cost/margin fields, markup metadata, and idempotency keys.
- `agency_billing_events`: idempotent Stripe event records for Agency billing using both `event_id` and `provider_event_id`/`idempotency_key`.
- `agency_snapshots`, `agency_snapshot_versions`, `agency_snapshot_applications`: agency templates, explicit version payload/readiness fields, preview data, applied changes, and application audit trail.

## Runtime Boundaries

- Browser UI reads and writes only through RLS-protected tables and Supabase Edge functions.
- Stripe secret operations run only in Supabase Edge functions.
- Agency client provisioning uses `POST /api/agency/clients/create` as the app boundary and delegates to Supabase Edge `onboarding-api` action `autoProvision`.
- Agency project transfer uses `POST /api/agency/projects/transfer` and delegates to `onboarding-api` action `transferProject`, which creates draft projects and approval requests.
- Client approval responses use `POST /api/agency/approvals/respond` and delegate to `onboarding-api` action `respondClientApproval`; portals never update approval rows directly.
- Agency service-plan create/update/archive/restore/delete uses Vercel routes under `/api/agency/plans/*`; those routes require a Supabase user bearer token, validate `agency-service-plans` access with `canManageBilling`, and write only the canonical `agency_service_plans` table.
- Agency client billing UI uses Vercel routes under `/api/agency/payment-links/*` as the app boundary, and those routes forward to the canonical Supabase Edge `stripe-api`.
- Agency snapshot create/preview/apply uses Vercel routes under `/api/agency/snapshots/*`; those routes require a Supabase user bearer token, validate `agency-project-transfer` Service Access with `canManageProjects`, and execute `agencySnapshotService` with the server-side Supabase admin client.
- `POST /api/agency/stripe/webhook` preserves Stripe raw body/signature and forwards to Supabase Edge `stripe-webhook`; signature verification and database reconciliation stay in Edge.
- `GET /api/agency/readiness` is a Vercel serverless readiness surface protected by `CRON_SECRET`; it reports env/table/column readiness without returning secret values.
- Client approval reads are centralized in `services/agency/agencyApprovalService.ts` with an explicit safe column list.
- Reports are generated from real tenant, project, store order, usage, and Agency relationship data.

## Canonical Services

- `services/agency/agencyApprovalService.ts`: Client Portal approval mapping, safe list queries, and response payloads routed through `/api/agency/approvals/respond` with a test fallback to `onboarding-api`.
- `services/agency/agencyActivityService.ts`: canonical Agency activity insert payloads for reports, payments, snapshots, access changes, notes, and lifecycle events.
- `services/agency/agencySnapshotService.ts`: snapshot payload creation, preview, application audit rows, and draft-only project updates.
- `services/agency/agencyUsageLedgerService.ts`: Agency finance summaries from raw usage ledger rows, service-plan fallback estimates, operational billing counts, and past-due client detection.
- `services/agency/agencyWebhookService.ts`: shared Stripe webhook mapping, Agency billing event rows, idempotency helpers, and usage ledger insert payloads.
- `services/agency/agencyReadinessService.ts`: Agency-specific readiness checks for required environment groups, canonical tables, and production contract columns.
- `api/agency/_lib/stripeEdgeProxy.ts`: shared Vercel API helper for Agency billing/provisioning proxies, anon-key forwarding, bearer-token forwarding, and safe checkout return URLs.
- `api/agency/_lib/agencyAccess.ts`: shared Vercel API helper for Supabase user-token validation and Node-side Service Access checks before using `service_role`.
- `services/agency/agencyPlanMutationApiClient.ts`: browser adapter for protected Agency service-plan mutations through `/api/agency/plans/*`.

## Roles

Platform owners are `owner` and `superadmin`.

Agency operators are `agency_owner` and `agency_admin`. Agency members may receive UI permissions through Service Access, but raw cost/margin tables remain agency-admin scoped unless a future permissioned view is introduced.

Client portal users use client tenant membership or client tenant ownership. They can see approval queues and shared reports, not internal ledger, cost, markup, or margin rows.
