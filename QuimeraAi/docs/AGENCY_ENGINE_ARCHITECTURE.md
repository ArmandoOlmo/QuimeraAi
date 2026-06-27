# Agency Engine Architecture

## Canonical Scope

Agency Engine is the canonical Quimera AI Agency Operating System. It owns agency client lifecycle, service-plan packaging, client provisioning, client billing, reporting, white-label/client portal contracts, and cross-module operation from Client 360 and Agency Command Center.

It is registered in `registry/moduleRegistry.ts` as `agency-engine` with canonical system `agency`. Agency submodules are explicit registry items:

- `agency-client-360`
- `agency-client-provisioning`
- `agency-project-transfer`
- `agency-service-plans`
- `agency-billing`
- `agency-reports`
- `agency-white-label`
- `agency-client-portal`
- `agency-command-center`

Client 360 module coverage is part of the canonical manifest: `getAgencyEngineOperatingSystemManifest().client360Modules` maps BusinessBlueprint, Website Builder, Storefront Builder, Ecommerce, CRM/Leads, Email Marketing, Appointments, Restaurants, Realty, Bio Page, ChatCore, Media AI, Finance, and Analytics to their owner registry modules, activation signals, labels, descriptions, and Agency routes.

Agency Engine reads and writes `storefrontBuilder` as the canonical presentation system for public stores. `storefrontBuilder` owns storefront theme, sections, product-card presentation, collection layout, cart/checkout visuals, and draft/published template state. Ecommerce Engine remains the canonical owner for products, variants, prices, inventory, carts, checkout, orders, discounts, refunds, and customers.

## Access Contract

Agency Engine access must pass through Service Access Engine.

- Required service: `agency`
- Required plan feature: `agencyModule`
- Agency plans: `agency_starter`, `agency_pro`, `agency_scale`
- Enterprise is not an agency plan by default
- `agency_client` is a tenant type, not a subscription plan
- Owner and superadmin are the only platform-unlimited roles
- Commercial limits must be finite numbers; `-1`, `Infinity`, and null are invalid for plan limits

## Canonical Data Model

The canonical Supabase tables are created in `supabase/migrations/20260627071535_canonical_agency_engine.sql`.

- `agency_service_plans`: agency-created packages sold to clients
- `agency_clients`: relationship layer between agency tenants and client tenants
- `agency_project_transfers`: audited project copies from agency workspaces into client workspaces
- `agency_client_approvals`: client-facing approval requests for transferred projects, publishing, billing, domains, content, and reports
- `agency_client_payment_links`: public branded payment links for agency client service subscriptions
- `agency_activity`: lifecycle/audit activity stream
- `agency_reports`: report artifacts and AI summaries
- `agency_client_notes`: internal and client-visible notes

Legacy `agencyPlans` compatibility remains only as fallback while workspaces migrate. New reads/writes should prefer `agency_service_plans`.

## Provisioning Contract

`onboarding-api` action `autoProvision` is the server-side entry point for agency client creation. It requires `agencyTenantId` and accepts `selectedPlanId`, `selectedPlanName`, billing options, selected modules, and AI generation flags.

Provisioning creates:

- Client tenant with `type = agency_client`
- Canonical effective plan on `subscription_plan`
- Agency plan reference in `tenant.billing.agencyPlanId`
- Initial project draft with `businessBlueprint`
- Module activation rows when tables exist
- Agency/client relationship in `agency_clients`
- Client invites
- Agency activity entry

Generated projects are drafts and require review. No runtime is auto-published.

For agency client tenants, `type = agency_client` is never a subscription plan. Direct-billed clients use their requested effective Quimera plan; included or agency-managed clients inherit the agency operating plan as `billing.effectivePlanId`. `selectedPlanId` is never written as `subscription_plan`; it is only the agency service-package identity in `agency_service_plans`, `agency_clients.agency_plan_id`, and `tenant.billing.agencyPlanId`.

## Project Transfer Contract

`onboarding-api` action `transferProject` is the server-side entry point for copying an agency-owned project into an agency client workspace. It requires `projectId`, `sourceTenantId`, and `targetClientTenantId`.

Project transfer requires Service Access Engine module `agency-project-transfer` with permission `canManageProjects`. The target tenant must be linked to the agency through `owner_tenant_id` or `agency_clients`.

Transferred projects are always copied as drafts. The transfer clears `published_data` and `published_at`, stamps `data.transferredFrom`, updates `businessBlueprint.projectId` and `businessBlueprint.tenantId` when present, copies project module activations when available, writes `agency_project_transfers`, and emits `agency_activity.type = project_transferred`.

Each transfer also creates a pending `agency_client_approvals` row when the approval table exists. Client responses use `onboarding-api` action `respondClientApproval`; the client portal never writes approval status directly from the browser.

## Client Portal Contract

`/portal` and `/portal/dashboard` are authenticated workspace routes. The portal uses the active tenant as the client workspace, applies tenant branding through `PortalProvider`, and renders `PortalApprovalsPanel` as the first client-facing operational queue.

Client Portal routes and approval responses require Service Access Engine module `agency-client-portal` with service `agency`; they do not require the client tenant itself to have the agency plan feature. The approval queue reads `agency_client_approvals` for the active client tenant and lets the client approve, reject, or request changes. Responses create `agency_activity.type = approval_responded` so Agency Command Center and Client 360 can show client decisions.

The portal dashboard also renders a client-facing operations feed backed by `agency_activity` plus summary metrics from the latest shared `agency_reports` row. Client reads use `quimera_can_view_agency_relationship`; clients do not write activity rows from the portal.

`PortalReportsPanel` is a read-only client-facing report inbox backed by `agency_reports`. It only reads rows for the active client tenant with `status in ('sent', 'published')`, relying on the `Clients can view sent reports` RLS policy. Agencies keep report creation and publishing control from Agency Reports; clients do not write report rows from the portal.

## Billing Contract

Agency client billing uses Stripe Checkout Sessions in `mode: subscription`. The frontend must never submit `pm_card_visa` or any temporary payment method.

`setupClientBilling` now returns `checkoutSessionId` and `url`; the client UI redirects to Stripe. Stripe metadata includes `tenantId`, `agencyTenantId`, `agencyPlanId`, and `source = agency-engine`.

Public branded links generated from Agency Billing are stored in `agency_client_payment_links`. `/pay/:token` loads the agency/client/plan summary, then `agencyBilling-confirmClientPayment` creates a Stripe Checkout Session and returns the hosted Checkout URL. The public page redirects to Stripe instead of collecting card data with Stripe Elements.

`stripe-webhook` treats metadata `source = agency-engine` and `billingFlow = agency_client_payment_link` as agency client billing. It updates `agency_client_payment_links`, `agency_clients`, and `tenant.billing` while preserving `subscription_plan` as the client's finite effective Quimera plan. The agency service plan remains in `tenant.billing.agencyPlanId`; it is not written as `subscription_plan`.

## Metrics And Reports

Agency revenue and reports use `store_orders`, not legacy `orders`. Client revenue is aggregated through client projects by `project_id`.

`ReportingService.generateAgencyReport` is the canonical browser-side report flow. It aggregates client relationships from `agency_clients`, service-plan names from `agency_service_plans`, paid revenue from `store_orders`, MRR from `tenant.billing`, usage from tenant limits, then persists a snapshot in `agency_reports` with an AI operational summary. A matching `agency_activity.type = report_generated` entry is emitted for Agency Command Center and Client 360 timelines.

Store order reads intentionally use `select('*')` and normalize totals from `total_amount`, `total`, `amount_total`, `pricing`, and `data` fallbacks. This avoids breaking live Supabase environments where newer numeric columns may not be exposed through the current PostgREST schema cache.

## Phase Roadmap

AG1 foundation is canonical registry, access, finite limits, canonical plans/clients, onboarding, billing hardening, and store-order metrics.

Next phases:

- AG2 Client 360 UX consolidation across projects, modules, billing, reports, and activity.
- AG3 AI Studio deep generation flows for websites, storefronts, email flows, chatbot knowledge, media assets, appointments, restaurants, realty, and bio page.
- AG4 white-label client portal, approvals, project transfer, domain transfer, and client-facing reports.
- AG5 billing webhooks, self-serve upgrades, usage overage invoices, and agency margin analytics.
