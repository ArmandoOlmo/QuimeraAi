# Bio Page Engine Architecture

## Objective

Bio Page Engine upgrades Quimera's link-in-bio module from a simple link list into a project-scoped mini funnel: profile, links, social icons, shop, booking, lead capture, email subscribe, media/portfolio blocks, ChatCore, analytics, QR code, SEO, custom slug, and AI-generated draft state.

The engine is designed to be mobile-first, modular, reusable, and safe by default. AI Studio can generate a complete draft, but publishing remains explicit and review-gated.

## Runtime Surfaces

- Editor: `components/dashboard/BioPageBuilder.tsx`
- Context: `contexts/bioPage/BioPageContext.tsx`
- Public renderer: `components/PublicBioPage.tsx`
- Services: `services/bioPage/*`
- Canonical database migration: `supabase/migrations/20260625203527_canonical_bio_page_engine.sql`
- Lead policy hardening migration: `supabase/migrations/20260626022549_harden_bio_page_lead_policy_null_tenant.sql`
- AI blueprint schema: `types/businessBlueprint.ts`
- AI generation adapter: `utils/businessBlueprint/adapters.ts`
- AI merge guardrails: `utils/businessBlueprint/mergeAiStudioBlueprint.ts`
- Component registry: `registry/componentRegistry.ts`
- Component anatomy registry: `registry/componentAnatomyRegistry.ts`
- Module registry: `registry/moduleRegistry.ts`, where Bio Page Engine declares BusinessBlueprint, Website Builder, Design System, Ecommerce, Appointments, CRM/Leads, Email Marketing, ChatCore, Media AI, and Analytics dependencies.

## Canonical Data Model

Canonical tables:

- `bio_pages`: project, tenant, user, slug, profile, theme, SEO, settings, draft/published status.
- `bio_page_blocks`: ordered modular blocks with source module, AI flags, user-modified flags, and regeneration locks.
- `bio_page_links`: ordered link records with link type, platform, image, tracking flag, and sanitized URL writes.
- `bio_page_events`: append-only public analytics events for views, clicks, QR scans, booking starts/completions, lead submits, email subscribes, and ChatCore opens.
- `bio_page_qr_codes`: QR metadata for generated public URLs.
- `bio_page_subscribers`: consented public email subscriptions tied to the page/project.

All records are project-scoped. `tenant_id` is optional for migration compatibility, but policies use it when available.

Public CRM lead policy compares tenant ids with `IS NOT DISTINCT FROM`, so tenant-bearing pages only accept matching tenant leads while project-scoped pages without a tenant can still capture leads safely.

The migration grants Data API access explicitly for the new Bio Page tables (`anon`, `authenticated`, and `service_role` as appropriate) before relying on RLS policies. This keeps the engine compatible with Supabase projects where new public tables are no longer exposed automatically.

Bio Page CRM leads use a partial unique index on `public.leads(project_id, source, custom_data->>'bioPageDedupeKey')` for `bio_page` and `bio_page_chat` sources. New Bio Page submissions write a normalized email dedupe key, so repeated public submits are treated as idempotent duplicates and still emit a `bio_lead_submitted` analytics event with `duplicate = true` instead of creating another CRM row. Historical CRM rows without the dedupe key are left untouched.

Tenant-scoped Bio Page leads also create CRM timeline activity through `private.record_bio_page_lead_activity_after_insert()`, installed by `20260626044108_bio_page_crm_lead_activity_trigger.sql`. The trigger runs after the `leads` insert, validates the matching published Bio Page, writes non-PII source metadata to `lead_activities`, and keeps `lead_activities` closed to anonymous public inserts. Tenantless project-scoped Bio Pages skip the timeline insert because the shared CRM activity table requires `tenant_id`.

Public Email Marketing sync is routed through `supabase/functions/email-api` action `subscribeBioPageEmail`. The action runs with service role, but it is constrained to published Bio Pages, visible `email_subscribe` blocks, valid consent, and audiences already configured on the page/block. This avoids relying on public RLS to update `email_audiences` while keeping arbitrary audience writes closed.

AI Studio provenance is preserved in canonical JSON: page-level source maps live in `bio_pages.settings.sourceMap`, block source maps in `bio_page_blocks.settings.sourceMap`, and link source maps in `bio_page_links.metadata.sourceMap`.

## Service Layer

`bioPageEngineService` owns the canonical editor mutations for draft profile/theme updates, create/update/delete/toggle/duplicate/prioritize of blocks and links, reorder operations, publish/unpublish/archive, slug checks, URL sanitization, and blueprint-to-runtime mapping. The block/link CRUD helpers intentionally persist through the same draft save path as the editor so child records keep project scope, tenant scope, AI review flags, and regenerated database ids consistent. Duplicate helpers clear AI review flags, reset link clicks, preserve useful source metadata, and keep system blocks protected from accidental cloning.

`bioPageIntegrationService` owns runtime ecosystem readiness for the editor. It checks real module state across Ecommerce, Appointments, CRM/Leads, Email Marketing, ChatCore, Media AI, Analytics, Website Builder, BusinessBlueprint provenance, Design System tokens, SEO, QR, and publication gates, then returns compact statuses plus counts. This keeps the builder honest: it can surface missing setup without fabricating products, availability, audiences, testimonials, analytics, or leads.

## Security Model

- Public reads are allowed only for published bio pages and visible published children.
- Public service fetches apply a second defensive filter after loading a page: non-published pages return `null`, hidden links are removed, and hidden blocks are removed even if the caller has broader authenticated/service-role permissions.
- Public inserts are limited to safe analytics events and consented subscriber/lead actions.
- Editor writes require authenticated ownership or tenant membership.
- Public CRM lead creation is allowed only when the submitted lead points to a published Bio Page project and uses a Bio Page source.
- Slugs are normalized and checked against reserved platform routes.
- Slug conflicts are preflighted in the service layer before create, update, and publish; the database also enforces a global unique `lower(slug)` index as the race-condition backstop.
- URLs are sanitized before storage/opening; unsafe `javascript:`, `data:`, and `vbscript:` URLs are rejected.
- Public rendering sanitizes block CTA URLs again at click/render time for booking, contact, banner, media, and portfolio exits, so stale or manually inserted unsafe block URLs are not opened even if they bypass an older draft.
- Media blocks use a stricter media URL sanitizer than CTA links: `mailto:`, `tel:`, `sms:`, hash-only anchors, and unsafe protocols are allowed nowhere as `<img>`/`<video>` sources, even though contact protocols can still be valid link destinations.
- AI-generated links, products, bookings, and SEO are draft/needs-review by default.
- Publish is review-gated: visible generated links/blocks with `needsReview`, unsafe URLs, or placeholder URLs are rejected until the editor marks them reviewed and saves safe runtime values.
- Visible media blocks are also publish-gated: `featured_media` needs a safe media URL, while `media_grid` and `portfolio_grid` need at least one safe renderable item.
- Funnel blocks are publish-gated too: lead forms need labeled fields, an email field, consent copy when required, and success copy; email subscribe blocks must require marketing consent and include placeholder, button, consent, and success copy; booking CTA URLs must be safe and non-placeholder.

## AI Studio Contract

`bioPageBlueprint` is now part of `BusinessBlueprint`. The adapter creates:

- profile and slug draft
- link stack
- block stack
- theme
- social links
- social icon block from real contact/social handles
- shop intent
- booking intent
- lead capture
- email subscribe
- featured banner and direct contact blocks from provided project links/contact info
- featured media, media grid, and portfolio intent from Media AI/assets
- testimonials/proof only from explicit `contentMap.testimonials`
- FAQ only from explicit `contentMap.faqs`
- chatbot CTA
- analytics event definitions
- SEO draft
- QR defaults
- integration readiness metadata, including explicit BusinessBlueprint provenance and Design System styling contract flags

Guardrails:

- no fake followers, ratings, product inventory, booking availability, or testimonials
- no public indexing by default for generated drafts (`seo.noIndex = true`)
- no protected user edits overwritten by merge or sync
- blocks and links include `generatedByAI`, `needsReview`, `userModified`, and `lockedFromRegeneration`

`GeneratedWebsitePreview` surfaces the generated Bio Page before apply: profile, handle, public route, draft status, link count, block count, layout, SEO/noindex state, block chips, and enabled integration chips. This gives the user a review step before `Save and open`.

When AI Website Studio saves a generated project, `useAIWebsiteStudio` applies the project's `businessBlueprint.bioPageBlueprint` through `applyProjectBioPageBlueprintDraft`. This creates or updates the canonical `bio_pages`, `bio_page_blocks`, and `bio_page_links` draft for the same project/tenant/user scope, then hands the user to the editor. The handoff is intentionally non-blocking for website creation, but Bio Page generation failures are logged for follow-up.

Generated Bio Pages are never published by AI Studio. They remain `status = draft`, `isPublished = false`, and `seo.noIndex = true` until the merchant reviews and publishes from the Bio Page editor. Regeneration preserves blocks and links marked `userModified` or `lockedFromRegeneration`.

The AI Studio adapter now separates featured links from social links. Real social/contact handles become `social` links plus a `social_links` icon block, while placeholder social root URLs are ignored. Media-ready projects get draft `featured_media`, `media_grid`, and `portfolio_grid` blocks tied to Media AI asset targets; when imported or existing media URLs are available, the adapter writes renderable `url` and `items` payloads immediately. These remain review-required until the merchant confirms them.

## Editor Behavior

The builder keeps the existing Quimera Bio Page workflow and adds canonical backing:

- live mobile preview remains first-class
- editor state saves to `bio_pages`, `bio_page_blocks`, and `bio_page_links`
- publish flips canonical status and exposes `/bio/:slug`; unpublish returns the page to draft, clears `published_at`, and disables the public URL
- publish surfaces review-gate errors in the editor, and links/blocks include a compact `Mark reviewed` action for AI-generated or regenerated content
- audience tab reads `bio_page_subscribers`
- analytics tab reads `bio_page_events`, supports 7/30/90/all-time ranges, shows link/source/block/event breakdowns, and exports CSV summaries
- share tab can generate a trackable QR code, embed the configured logo when the browser can safely load it, fall back to a clean QR if the logo is blocked, and download the PNG
- public pages expose a mobile-first share button using Web Share API when available, clipboard fallback otherwise, and record share analytics
- public pages expose optional Links/Shop/Media/Book/Contact tabs only when those tabs have real renderable content; tab changes record analytics
- settings tab edits the custom `/bio/:slug`, runtime SEO title/description/canonical/Open Graph/noindex/schema fields, and QR foreground/background/logo branding
- settings tab shows an integration readiness grid for Ecommerce, Appointments, CRM/Leads, Email Marketing, ChatCore, Media AI, Analytics, Website Builder, BusinessBlueprint, Design System, SEO, QR, and publication status
- settings tab also edits channel-specific UTM attribution: share URLs use `shareUtmSource`, `shareUtmMedium`, and `shareUtmCampaign`; QR URLs use `qrUtmSource`, `qrUtmMedium`, and `qrUtmCampaign`, with sanitized defaults when fields are empty
- block ordering is editable in the Bio Page builder with drag and drop and persisted through canonical block order
- link and block cards expose duplicate and prioritize actions, so creators can quickly clone funnel steps or pin important CTAs without manual drag work
- the block editor exposes funnel blocks for Ecommerce, Appointments, CRM, Email Marketing, Media AI, ChatCore, testimonials, FAQ, contact, featured banners, media grids, and portfolio grids
- social links can be promoted from regular link cards into a dedicated `social_links` icon row; selected IDs are stored on the block and hidden links are filtered before public/ChatCore rendering
- product blocks can select explicit active Ecommerce products; product collection blocks can select real Ecommerce categories via `collectionIds`; an empty selection means all eligible products/categories
- public shop tabs include an in-profile product search that filters by product name, slug, category id, category slug, and category name without exposing draft products
- lead capture blocks carry reviewed form fields, consent copy, tags, and success messaging from AI Studio/BusinessBlueprint into the public runtime, and submitted custom field values are stored with CRM lead metadata plus block attribution
- the Bio Page builder exposes lead form field editing, field types, required flags, CRM tags, consent copy, and success messaging with the live mobile preview reflecting the configured funnel
- email subscribe blocks can route subscribers to a selected Email Marketing audience through `audienceId`, and the builder exposes placeholder, button copy, marketing-consent copy, and success messaging with matching public/runtime block attribution
- shop tab shows the real eligible product inventory and creates product-grid blocks directly
- featured media blocks use the shared Quimera `ImagePicker` against project assets and AI generation
- media grid and portfolio grid blocks can select multiple project media assets and persist them as block items
- booking blocks support CTA mode or compact inline `AppointmentBooking` mode backed by the Appointments widget API
- public funnel actions carry block attribution where available so analytics can break down conversion by source and block
- testimonials are manual/reviewable blocks only; AI Studio guardrails forbid fabricating customer quotes, and ChatCore receives only sanitized quote/author/role/rating fields

## Public Funnel Behavior

`PublicBioPage` renders published pages only. `getPublicBioPageBySlug` first resolves only `status = published` slugs, then normalizes the runtime payload through `getPublicRenderableBioPage` so public rendering never depends on RLS alone for hiding draft or hidden child records. It records:

- `bio_page_viewed`
- `bio_profile_shared`
- `bio_qr_scanned` when the public URL is opened with QR source parameters
- `bio_tab_changed`
- `bio_link_clicked`
- `bio_booking_started`
- `bio_booking_completed`
- `bio_email_subscribed`
- `bio_lead_submitted`
- `bio_chat_opened`

Lead capture writes into canonical `leads` when the page is project-scoped and policy permits it. Lead form and ChatCore captures include `sourceModule = bio-page-engine`, Bio Page slug/id, block id, tags, and canonical email-intent metadata for review workflows.

Public ChatCore receives a structured, safe Bio Page context through `buildBioPageChatContext`: profile, handle, slug, visible links, visible blocks, public products, integration readiness, and active chat block id. The context intentionally excludes private draft data and Email Marketing audience internals while giving the assistant enough public funnel context to answer about products, booking CTAs, lead forms, and page content.

`social_links` blocks expose only links that are visible and enabled. If the block stores explicit `linkIds`, the public renderer and ChatCore context intersect those IDs with the visible link set so hidden or stale link references are not leaked.

Email subscribe requires explicit consent, calls `email-api.subscribeBioPageEmail` as the privileged primary path, records subscribers with the block-selected Email Marketing `audience_id`, and syncs the email into the selected static audience when the audience is valid. If the Edge Function is unavailable, the public runtime falls back to direct subscriber/event inserts and marks `audienceSync = deferred`.

Paid Appointments booking blocks append `appointmentId`, `orderId`, and `bioBlockId` to same-origin Stripe Checkout return URLs. On `appointmentPayment=success`, the public Bio Page records one session-deduped `bio_booking_completed` event with `checkoutProvider = stripe`; cancelled returns are ignored.

Analytics summaries include event totals, views, unique views, returning views, CTR, conversion totals/rate, QR scans, shares, chat opens, top links, `sourceBreakdown`, UTM source/campaign breakdowns, referrer/device breakdowns, and `blockBreakdown` so the Bio Page can report by link, click, source, campaign, device, and funnel block. Unique views use an anonymous local visitor id stored in event metadata, not email, IP, or CRM identifiers. Lead and subscribe conversion events redact contact/workflow PII from `bio_page_events.metadata`; emails, names, dedupe keys, canonical email intent, subscriber ids, lead ids, and form payloads stay in CRM/Email Marketing records only. Public link clicks resolve the visible `link`/`social_links` block that rendered the link before recording the event, and store the visitor acquisition source separately from the clicked destination platform, so top-link analytics and link-by-source funnel analytics stay aligned. Public share and QR URLs are built through the shared tracked-url helper, which sanitizes configured UTM values before they reach analytics. Event FK columns only receive valid UUID ids; public click events that require persisted link/block attribution are skipped when only legacy semantic ids are available, matching the hardened RLS policy instead of writing ambiguous analytics.

Public analytics and subscriber RLS is hardened by `20260626031900_harden_bio_page_event_policy.sql`: anonymous inserts must target a published page with matching `project_id`/`tenant_id`, any referenced block/link must belong to that page and be visible, clicked link/social/collection events require a link id, product clicks require either a visible block or link id, subscriber inserts must use `source = bio_page` with consent and a bounded email payload, and UTM/metadata/source/referrer payloads are bounded before storage.

The public renderer applies page-level SEO tags at runtime: document title, description, robots, canonical URL, Open Graph, and Twitter card metadata from the Bio Page SEO/profile payload.

## Cross-Module Integrations

- Ecommerce: Bio shop/product/collection blocks hydrate only real active/published `store_products`; collection blocks filter by real Ecommerce category id/slug/name, while blueprint fallback products, draft products, archived products, and placeholders are not rendered.
- Appointments: booking blocks either route to appointment flows or embed the compact public booking form; inline booking records Bio Page booking-start intent, creates appointments with `sourceModule = bio-page-engine`, emits `bio_booking_completed` after successful no-payment booking creation with non-PII appointment metadata, and records a session-deduped completed event on successful Stripe Checkout return for paid bookings.
- CRM/Leads: public lead form and ChatCore capture can create project leads with Bio Page source tags, canonical metadata, block attribution, and duplicate suppression by project/email/source.
- Email Marketing: subscribers are stored with consent, block-level audience metadata, and service-role static audience sync through the validated Email API action.
- ChatCore: AI Studio can generate both a `chatbot` link and `chatbot_cta` block; the public page embeds ChatCore when the Bio Page settings include an assistant config and passes safe Bio Page context into the assistant prompt.
- Media AI: featured media uses the shared ImagePicker/generation flow, while media grids and portfolio grids render selected project image/video assets from block data.
- Website Builder: component registry and anatomy expose Bio Page blocks without making Website Builder canonical owner.
- BusinessBlueprint: AI Studio can generate Bio Page state along with website, ecommerce, appointments, CRM, email, media, and chatbot modules.
- Design System: generated themes carry brand colors, typography, radius, shadow, layout, and animation intent into the Bio Page draft instead of creating a parallel styling contract.

## Testing

Current focused coverage:

- `tests/services/bioPageEngineService.test.ts`
- `tests/utils/businessBlueprint.test.ts`
- `tests/utils/moduleRegistry.test.ts`
- `tests/utils/aiStudioComponentSelection.test.ts`
- `tests/e2e/public-bio-page.public.spec.ts`

Validation commands used:

```bash
npm run test:run -- tests/services/bioPageEngineService.test.ts tests/utils/businessBlueprint.test.ts tests/utils/moduleRegistry.test.ts tests/utils/aiStudioComponentSelection.test.ts
npx playwright test tests/e2e/public-bio-page.public.spec.ts --project=public-chromium
npm run build
```

The focused suite currently covers slug/URL safety, slug conflict preflight for create/update/publish, publish review-gating for generated links/blocks/media, custom slug/SEO/QR persistence, trackable QR metadata/logo fallback, social link block defaults/context filtering, AI blueprint mapping with renderable featured media/media grid/portfolio payloads, AI Studio Bio Page draft application, regeneration lock preservation, product guardrails, publish/unpublish public URL gating, public published-only/visible-only rendering, public ChatCore context safety, public lead attribution/dedupe, Email API subscription routing/fallback, analytics source/block summaries, conversion rate, UTM attribution, referrers, and device breakdowns.

## Follow-Up Work

- Add QR scan redirect handling if QR URLs need server-side counting before public page load.
- Add SSR/edge metadata emission if the Vite app moves to a server-rendered public metadata strategy.

## Detailed Docs

- `docs/BIO_PAGE_BLUEPRINT.md`
- `docs/BIO_PAGE_PUBLIC_RENDERER.md`
- `docs/BIO_PAGE_EDITOR.md`
- `docs/BIO_PAGE_ANALYTICS.md`
- `docs/BIO_PAGE_CROSS_MODULE_INTEGRATIONS.md`
- `docs/AI_STUDIO_BIO_PAGE.md`
- `docs/BIO_PAGE_ACCEPTANCE_CHECKLIST.md`
