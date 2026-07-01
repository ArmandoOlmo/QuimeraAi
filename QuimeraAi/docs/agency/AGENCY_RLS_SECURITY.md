# Agency RLS Security

## Hardened Platform Billing

`subscription_plans` is platform billing. The broad authenticated `FOR ALL` policy is removed by `20260701153400_agency_production_ready_hardening.sql`.

Public users can read only non-archived plans with `show_in_landing = true`. Platform owners can read and manage all platform plans through `quimera_is_platform_owner()`.

## Agency Tables

Agency write paths use `quimera_can_manage_agency(agency_tenant_id)`, which allows platform owners, agency tenant owners, `agency_owner`, and `agency_admin`.

Clients can read approval/report/activity surfaces through client portal policies, but they do not receive raw ledger or billing event access.

## Sensitive Data

These tables are agency/admin-only:

- `agency_usage_ledger`
- `agency_billing_events`
- raw snapshot payloads in `agency_snapshot_versions`

Do not create client-facing policies on those tables. If client-visible usage summaries are needed, add a sanitized view that excludes `unit_cost`, `platform_cost`, `markup_amount`, `margin_amount`, Stripe payloads, and internal metadata.

## Negative Test Expectations

- Authenticated non-platform users cannot insert, update, or delete `subscription_plans`.
- Client tenant users cannot select raw `agency_usage_ledger`.
- Client tenant users cannot select raw `agency_billing_events`.
- Client tenant users cannot select `agency_service_plans`, which contain agency-only `base_cost`, `markup`, and `markup_percentage`.
- Client tenant users can select only their own `agency_clients` relationship and cannot read other clients for the same agency.
- Client tenant users can select only `agency_client_notes.visibility = 'client_visible'` for their own client tenant.
- Client tenant users can select only their own `agency_reports` with `status in ('sent', 'published')`.
- Client tenant users can select only their own `agency_client_payment_links`.
- Client tenant users respond to approvals only through `onboarding-api`.
- Webhook processing is idempotent on repeated Stripe `event.id`.

`npm run readiness:agency-rls-negative` verifies these client-facing boundaries with temporary rows inside one rollback-only transaction.
