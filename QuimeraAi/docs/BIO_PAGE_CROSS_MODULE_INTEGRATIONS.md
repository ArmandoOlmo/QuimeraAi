# Bio Page Cross-Module Integrations

## Ecommerce

Bio Page product and collection blocks read real Ecommerce catalog data through `utils/ecommerce/publicStorefrontCatalog.ts` and `services/bioPage/bioPageProductGuard.ts`.

Rules:

- Only real active/published products render publicly.
- Draft, archived, placeholder, or invalid products are filtered.
- Product and collection clicks create Bio Page analytics events.

## Appointments and Stripe

Booking blocks can route users to appointment flows or embed compact booking. Appointment payment return tracking records successful Stripe Checkout returns as `bio_booking_completed` once per session.

Bio Page does not own availability, double-booking, payments, or appointment records. Those remain under Appointments and Stripe-backed services.

## CRM and Leads

Lead form and ChatCore captures write CRM leads with:

- `source = bio_page` or `bio_page_chat`
- `sourceModule = bio-page-engine`
- Bio Page id, slug, block id, and tags
- A project/email/source dedupe key when email is present

Public leads are allowed only for published Bio Pages. Tenant-bearing pages require matching tenants; project-scoped pages without tenant use a null-safe RLS policy.

When a tenant-scoped Bio Page lead is created, a private database trigger records a CRM timeline row in `lead_activities` with the Bio Page id, slug, block id, source, and source event. The trigger runs after the lead insert and does not grant anonymous clients direct access to `lead_activities`. Project-scoped pages without a tenant still create the lead and analytics event, but skip the timeline row because `lead_activities.tenant_id` is required.

## Email Marketing

Email subscribe blocks require explicit consent and route through `email-api.subscribeBioPageEmail` when available. The fallback writes `bio_page_subscribers` and analytics events with deferred audience sync metadata.

Bio Page stores consent and block attribution but does not expose audience lists publicly.

## ChatCore

`services/bioPage/bioPageChatContextService.ts` builds safe public context for ChatCore: visible profile, blocks, links, products, booking/readiness hints, and active chat block id.

## Media AI

Featured media, media grid, and portfolio blocks use project media assets and shared Quimera image selection/generation paths. Public media URLs are sanitized separately from link URLs.

## Website Builder and Registries

Bio Page Engine is registered in:

- `registry/moduleRegistry.ts`
- `registry/componentRegistry.ts`
- `registry/componentAnatomyRegistry.ts`

The registry lets AI Studio and Website Builder understand Bio Page blocks without making Website Builder the canonical owner.

Rendered Bio Page component entries currently cover profile, links, social icons, featured banner, featured media, shop product grid, product collections, booking, lead capture, email subscribe, media grid, portfolio, testimonials/proof, FAQ, contact, and ChatCore CTA. Each entry points back to `bio-page-engine` as presentation owner, while Ecommerce-owned entries keep Ecommerce as canonical data owner.

The module registry also declares Bio Page Engine's upstream dependencies on `businessBlueprint`, `websiteBuilder`, and `designSystem`. This keeps AI-generated Bio Pages tied to the AI Studio source contract, website context, and Quimera visual tokens instead of treating Bio Page as a detached link list.

## Runtime Readiness

`services/bioPage/bioPageIntegrationService.ts` exposes a project-scoped readiness contract for the editor. It checks Ecommerce product availability, Appointments services, CRM lead capture blocks, Email Marketing audiences, ChatCore configuration, linked Media AI assets, analytics events, Website Builder section context, SEO copy, QR generation, and publish blockers.

The readiness panel in `components/dashboard/BioPageBuilder.tsx` shows status and counts only. It does not expose private CRM records, Email Marketing audience internals, hidden draft blocks, or raw publish issue copy on the public page.
