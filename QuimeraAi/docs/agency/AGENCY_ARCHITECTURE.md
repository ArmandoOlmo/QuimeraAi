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
- `agency_usage_ledger`: revenue, platform cost, markup, margin, and usage entries.
- `agency_billing_events`: idempotent Stripe event records for Agency billing.
- `agency_snapshots`, `agency_snapshot_versions`, `agency_snapshot_applications`: agency templates and application audit trail.

## Runtime Boundaries

- Browser UI reads and writes only through RLS-protected tables and Supabase Edge functions.
- Stripe secret operations run only in Supabase Edge functions.
- Client approval reads are centralized in `services/agency/agencyApprovalService.ts` with an explicit safe column list. Approval responses are handled by `onboarding-api`, not direct portal table updates.
- Reports are generated from real tenant, project, store order, usage, and Agency relationship data.

## Canonical Services

- `services/agency/agencyApprovalService.ts`: Client Portal approval mapping, safe list queries, and response payloads routed to `onboarding-api`.
- `services/agency/agencySnapshotService.ts`: snapshot payload creation, preview, application audit rows, and draft-only project updates.
- `services/agency/agencyWebhookService.ts`: shared Stripe webhook mapping, Agency billing event rows, idempotency helpers, and usage ledger insert payloads.

## Roles

Platform owners are `owner` and `superadmin`.

Agency operators are `agency_owner` and `agency_admin`. Agency members may receive UI permissions through Service Access, but raw cost/margin tables remain agency-admin scoped unless a future permissioned view is introduced.

Client portal users use client tenant membership or client tenant ownership. They can see approval queues and shared reports, not internal ledger, cost, markup, or margin rows.
