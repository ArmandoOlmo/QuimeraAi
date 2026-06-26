# Bio Page Engine Acceptance Checklist

This checklist maps the original Bio Page Engine brief to current Quimera artifacts and verification evidence. It is intentionally stricter than feature presence: an item is only marked verified when current code, tests, or runtime behavior prove it.

Status legend:

- `Verified`: implemented and covered by focused tests, build, or browser/runtime evidence.
- `Implemented`: code/docs exist, but the item still needs broader runtime or production verification.
- `Needs production verification`: local evidence exists, but live Vercel/Supabase state has not been verified in this run.
- `Future`: explicitly outside the current implementation, not a blocker unless the scope expands.

## Definition Of Done

| # | Requirement | Current status | Evidence |
| --- | --- | --- | --- |
| 1 | `BioPageBlueprint` exists | Verified | `types/businessBlueprint.ts`, `utils/businessBlueprint/adapters.ts`, `docs/BIO_PAGE_BLUEPRINT.md`, `tests/utils/businessBlueprint.test.ts` |
| 2 | Module/component registry includes Bio Page Engine | Verified | `registry/moduleRegistry.ts`, `registry/componentRegistry.ts`, `registry/componentAnatomyRegistry.ts`, `tests/utils/moduleRegistry.test.ts`, `tests/utils/aiStudioComponentSelection.test.ts` |
| 3 | Canonical data model exists | Verified in production | `supabase/migrations/20260625203527_canonical_bio_page_engine.sql` plus hardening migrations; remote project `elfcrnhffuvntlfuvumd` has Bio Page/Chatbot versions through `20260626044108` applied |
| 4 | Service layer exists | Verified | `services/bioPage/*`, `tests/services/bioPageEngineService.test.ts`, `tests/services/bioPageIntegrationService.test.ts` |
| 5 | Public Bio Page renders published content | Verified in production | `components/PublicBioPage.tsx`, `tests/e2e/public-bio-page.public.spec.ts`, Playwright smoke on `/bio/demo` desktop/mobile and `https://www.quimera.ai/bio/demo` |
| 6 | Editor has live mobile preview | Implemented | `components/dashboard/BioPageBuilder.tsx`, `docs/BIO_PAGE_EDITOR.md`; needs manual editor QA on a real project |
| 7 | User can add/edit/reorder/toggle links | Verified | `BioPageBuilder`, `bioPageEngineService`, focused service tests for link CRUD/reorder/toggle |
| 8 | User can add/edit/reorder blocks | Verified | `BioPageBuilder`, block CRUD/reorder/toggle tests |
| 9 | User can customize appearance | Implemented | `BioPageBuilder` appearance controls and theme persistence; needs visual QA across representative themes |
| 10 | User can publish/unpublish | Verified in production | `publishBioPage`, `unpublishBioPage`, public URL gating tests; temporary production editor QA published `bio-pub-mqup6qxy-84cd79`, then a second QA published/unpublished `bio-unpub-mqupatnx-d6f4a9`, verified `bio_pages.status` transitions, modals, and cleanup |
| 11 | User can copy URL/share | Implemented | `buildBioPageTrackedUrl`, public share button, editor share panel; browser share behavior depends on platform APIs |
| 12 | QR code exists | Verified | `bioPageQrService`, QR metadata/logo fallback tests |
| 13 | AI Studio can generate Bio Page draft | Verified | `deriveCrossModuleBlueprints`, `businessBlueprint/adapters`, AI Studio apply tests |
| 14 | Ecommerce product blocks work | Verified | Product guardrails, public product hydration, shop tab/product click tests |
| 15 | Appointments booking block works | Verified in production for non-payment booking creation | Public inline booking widget created a live `project_appointments` row from a temporary Bio Page, linked a CRM lead, recorded booking analytics, and cleaned up all temporary rows; Stripe payment-return attribution still needs a payment-enabled QA flow |
| 16 | CRM lead block works | Verified in production | `submitBioPageLead`, CRM lead dedupe/source tests, remote RLS migrations and CRM activity trigger applied; temporary production slug QA created one CRM lead and one `bio_page_lead_captured` activity |
| 17 | Email subscribe block works | Verified in production | Email API routing/fallback tests; remote `email-api` deployed as version 11 with `verify_jwt=false`; temporary production slug QA created one consented `bio_page_subscribers` row; configured Email Marketing audience QA synced `email_audiences.static_members` with `audienceSync = synced` |
| 18 | ChatCore works on Bio Page | Verified in production for context prompt/response | `buildBioPageChatContext`, `ChatCore` integration, context safety tests; temporary production slug QA `bio-chat-qa-mquodoi5-e89ce9` intercepted `ai-proxy`, verified Bio Page context in the prompt, rendered the assistant response, persisted conversation/messages/events with `source_module = bio-page-engine`, and cleaned up all temporary rows |
| 19 | Analytics tracks views/clicks/conversions | Verified | `bioPageAnalyticsService`, source/link/block/event breakdown tests |
| 20 | Security/RLS is safe | Verified in production | RLS migrations and migration text tests; remote project `elfcrnhffuvntlfuvumd` has hardening migrations `20260626022549`, `20260626031900`, and `20260626044108` applied |
| 21 | Design System is respected | Verified by audit | Editor docs require shared Quimera controls/tokens; `npm run ds:audit -- --visual-locked` exits 0 with only baseline-allowed findings and no Bio Page file hits |
| 22 | Mobile render is polished | Verified in production for demo | `tests/e2e/public-bio-page.public.spec.ts` checks mobile render and horizontal overflow; production Playwright smoke confirms no mobile overflow on `www.quimera.ai`; broader visual pass still needed for generated pages |
| 23 | Build passes | Verified | `npm run build` passed locally and Vercel production build completed |
| 24 | Type-check of touched files passes | Verified by filter | Full `npm run type-check` has baseline errors outside Bio Page scope; filtered touched Bio Page/ChatCore/Chatbot Engine output is clean |
| 25 | Tests cover critical flows | Verified | Focused Bio Page/Chatbot Engine suite passed locally |
| 26 | Documentation is updated | Implemented | `docs/BIO_PAGE_ENGINE_ARCHITECTURE.md`, `BIO_PAGE_BLUEPRINT.md`, `BIO_PAGE_PUBLIC_RENDERER.md`, `BIO_PAGE_EDITOR.md`, `BIO_PAGE_ANALYTICS.md`, `BIO_PAGE_CROSS_MODULE_INTEGRATIONS.md`, `AI_STUDIO_BIO_PAGE.md`, this checklist |

## Phase Coverage

| Phase | Current status | Notes |
| --- | --- | --- |
| 0. Initial audit | Implemented | Architecture doc lists runtime surfaces, registries, services, migrations, and integrations. |
| 1. BusinessBlueprint integration | Verified | Blueprint contract, adapter output, source maps, draft/review guardrails. |
| 2. Data model | Verified in production | Canonical migrations exist and are non-destructive. Remote Supabase migration history includes `20260625203527`, `20260625234103`, `20260626022549`, `20260626031900`, `20260626040910`, and `20260626044108`. |
| 3. Service layer | Verified | CRUD, publish, public fetch, analytics, QR, blueprint apply, product guards. |
| 4. Public renderer | Verified in production | `/bio/demo` renders a full public funnel in desktop/mobile locally and on `https://www.quimera.ai`; temporary production slug QA verified the DB-backed public path. |
| 5. Editor/builder | Implemented | Live preview, panels, drag/drop, publish, QR/share, analytics and settings exist; publish/unpublish are verified in production, while content/visual control QA still needs a full manual pass. |
| 6. Blocks system | Verified | Typed block set includes profile, links, social, banner, media, shop, booking, lead, email, portfolio, testimonials, FAQ, contact, chatbot, divider, spacer, placeholder. |
| 7. AI Studio generator | Verified | Generates draft Bio Page state and applies it without auto-publish. |
| 8. Ecommerce | Verified | Public product blocks render only eligible real products and track clicks. |
| 9. Appointments | Verified in production for non-payment booking creation | Booking CTA/inline widget, live availability, appointment creation, CRM lead linking, and booking analytics are verified on `www.quimera.ai`; Stripe return attribution still needs a payment-enabled QA flow. |
| 10. CRM/Leads | Verified in production | Lead source/tags/dedupe/analytics covered; live RLS/timeline trigger is deployed; temporary production public submit created CRM lead plus lead activity. |
| 11. Email Marketing | Verified in production | Audience selection, consent, Email API route, fallback, analytics covered; live Edge Function deployed; temporary production public submit created a subscriber and synced a configured audience member. |
| 12. ChatCore | Verified in production for context prompt/response | CTA/open behavior, safe Bio Page context, prompt injection, response render, conversation persistence, message persistence, and Chatbot Engine event metadata are verified on `www.quimera.ai`. |
| 13. Analytics | Verified | Events, summaries, source/UTM/referrer/device/block/link breakdowns and CSV export are implemented. |
| 14. QR/share | Verified | Tracked URLs, QR PNG generation, logo fallback, and share tracking exist. |
| 15. Appearance/Design System | Implemented | Appearance controls are present; release should include design audit and visual pass. |
| 16. Website Builder/registry | Verified | Module/component/anatomy registry support exists. |
| 17. Routing/publishing | Verified in production | `/bio/:slug`, slug validation/conflicts, publish/unpublish and demo fallback are covered; production editor QA verified publish and unpublish status transitions. |
| 18. Security/RLS/public API | Verified in production | RLS SQL and sanitizers exist; live Supabase policies and hardening migrations are applied in the linked project. |
| 19. Tests | Verified | Focused suite covers critical service and integration flows. |
| 20. Documentation | Implemented | Topic docs plus this acceptance checklist exist. |

## Last Local Verification

Commands run successfully in the current workspace:

```bash
npm run test:run -- tests/services/bioPageIntegrationService.test.ts tests/services/bioPageEngineService.test.ts tests/utils/bioPageI18nCoverage.test.ts tests/utils/bioPageRlsMigration.test.ts tests/utils/businessBlueprint.test.ts tests/utils/moduleRegistry.test.ts tests/utils/aiStudioComponentSelection.test.ts tests/services/chatbotEngineRuntimeActionService.test.ts tests/services/chatbotEngineDashboardService.test.ts tests/utils/chatbotEngineBlueprint.test.ts
PLAYWRIGHT_SKIP_WEB_SERVER=1 PUBLIC_BIO_PAGE_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/public-bio-page.public.spec.ts --project=public-chromium
PLAYWRIGHT_SKIP_WEB_SERVER=1 PUBLIC_BIO_PAGE_BASE_URL=https://www.quimera.ai npx playwright test tests/e2e/public-bio-page.public.spec.ts --project=public-chromium
npx playwright test tests/e2e/public-bio-page.public.spec.ts --project=public-chromium
npm run build
npm run ds:audit -- --visual-locked
git diff --check
```

Browser smoke:

- `http://127.0.0.1:3000/bio/demo?utm_source=qr&utm_medium=bio_page&utm_campaign=poster_launch`
- Desktop and mobile render `Quimera Creator Studio`
- 14 interactive controls detected
- No not-found state
- No non-Sentry console warnings/errors after disabling persistence for the fallback demo
- The automated Playwright public project also verifies desktop/mobile render, no auth dependency, and no mobile horizontal overflow.

## Production Verification

Production checks completed against the linked Supabase project and Vercel project:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase db push --linked
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase db query --linked --output json "select version from supabase_migrations.schema_migrations where version in ('20260625203527','20260625234103','20260626022549','20260626031900','20260626040910','20260626044108') order by version;"
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy email-api --project-ref elfcrnhffuvntlfuvumd --use-api --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions list --project-ref elfcrnhffuvntlfuvumd --output json
vercel deploy --prod --yes
vercel inspect quimera-g5ez06y9q-quimeraapp.vercel.app
```

Release evidence:

- Supabase project `elfcrnhffuvntlfuvumd` has all Bio Page/Chatbot migration versions through `20260626044108` applied.
- `email-api` is active as version 11 with `verify_jwt=false`.
- Vercel production deployments `dpl_Cz2enXYiSm33dFuT2S6gvUJFFCPK`, `dpl_4RQSQTLRMpMhnGtL99untL2nsUSY`, `dpl_GinqE5AKTAGrJtmiYM5g6jX8HFZk`, `dpl_9YSs5BpAnSgWYNdjzQqUVtgopqBN`, `dpl_C7X92LNy8fGDLtekxnQHeewxJjyE`, `dpl_7Qv7zpdUjkwQQDBodYss4uqgXgAR`, and `dpl_BsoLQts9aF17yyBCn75jzuFUftdQ` completed `Ready`; the latest includes Bio Page ChatCore `sourceModule = bio-page-engine` alignment, ChatCore partial-appearance hardening, public CRM lead insert without anonymous CRM SELECT, explicit Vercel widget routes, same-origin widget defaults, AppointmentBooking i18n fallbacks, and Bio Page Appointments source-module precedence.
- `https://www.quimera.ai` is aliased to the new deployment.
- `https://www.quimera.ai/bio/demo?utm_source=qr&utm_medium=bio_page&utm_campaign=poster_launch` returns status 200, title `Quimera Creator Studio Bio Page`, h1 `Quimera Creator Studio`, 14 interactive controls, no not-found state, no console/page errors, and no mobile horizontal overflow.
- Production API probes confirm widget routing and Appointments checkout function loading: `https://www.quimera.ai/api/widget/test/availability` returns JSON from the widget handler with CORS headers, and `GET https://www.quimera.ai/api/appointments/payments/checkout` returns JSON `405 Method not allowed`.
- Temporary real-slug QA created `codex-bio-qa-20260626` in production, rendered it through `https://www.quimera.ai/bio/codex-bio-qa-20260626`, submitted email consent, submitted a lead form, opened ChatCore, clicked the booking CTA, verified persisted rows/events, and cleaned up the temporary page/project rows.
- Temporary real-slug QA evidence before cleanup: 1 page, 1 subscriber, 1 CRM lead, 1 lead activity, 8 analytics events.
- Temporary real-slug QA event breakdown: `bio_page_viewed = 2`, `bio_tab_changed = 2`, `bio_email_subscribed = 1`, `bio_lead_submitted = 1`, `bio_chat_opened = 1`, `bio_booking_started = 1`.
- CRM QA lead evidence: source `bio_page`, bio slug `codex-bio-qa-20260626`, matching lead activity type `bio_page_lead_captured`.
- Cleanup evidence after QA: 0 temporary pages, subscribers, leads, lead activities, and events for project `10000000-0000-4000-8000-00000000c0de`.
- Configured Email Marketing audience QA created temporary production slug `codex-email-audience-20260626071251`, temporary audience `20000000-0000-4000-8000-000000000030`, and temporary QA auth user, then submitted the public email form with consent through `https://www.quimera.ai/bio/codex-email-audience-20260626071251`.
- Audience QA evidence before cleanup: HTTP 200, no page/console errors, 1 consented `bio_page_subscribers` row, `email_audiences.static_member_count = 1`, `estimated_count = 1`, `static_members.emails` containing the submitted address, and `bio_email_subscribed` metadata with `audienceSync = synced`.
- Audience QA cleanup evidence: 0 temporary pages, subscribers, audiences, events, projects, and the temporary auth user no longer exists.
- Temporary Appointments QA created temporary production slug `bio-appt-qa-mqunu9fq-5dnjp`, opened it through `https://www.quimera.ai/bio/bio-appt-qa-mqunu9fq-5dnjp`, loaded live availability from `/api/widget/{ownerId}_{projectId}/availability`, submitted the inline booking form, and verified one canonical appointment plus one linked CRM lead.
- Appointments QA evidence before cleanup: appointment `source = public_booking`, `source_module = bio-page-engine`, `source_component = BioPageBookingBlock`, `booking_service_id = qa-session`, non-null `source_lead_id`, one `linked_lead_ids` entry, `payment_status = null`, `ecommerce_order_id = null`, lead source `contact-form`, and lead custom data `sourceModule = bio-page-engine`.
- Appointments QA event breakdown: `bio_page_viewed = 1`, `bio_booking_started = 1`, `bio_booking_completed = 1`.
- Appointments QA cleanup evidence: 0 temporary appointments, events, pages, leads, projects, and tenants for the QA project.
- Temporary ChatCore Bio Page context QA created temporary production slug `bio-chat-qa-mquodoi5-e89ce9`, opened it through `https://www.quimera.ai/bio/bio-chat-qa-mquodoi5-e89ce9`, selected the Contact tab, opened the `chatbot_cta`, intercepted one `ai-proxy` request, and returned a controlled model response.
- ChatCore QA prompt evidence: `projectId` matched the temporary project, the prompt contained `=== CHATBOT ENGINE SURFACE CONTEXT ===`, `Surface: bio_page`, `Module: bio-page-engine`, the Bio Page slug, the unique phrase `Quantum Orchid Pipeline qa-mquodoi5-e89ce9`, and current page data with `"sourceModule":"bio-page-engine"`.
- ChatCore QA persistence evidence: UI rendered `Bio context QA response qa-mquodoi5-e89ce9`; Supabase stored one `social_conversations` row, 3 `social_messages` rows, Chatbot Engine events `chatbot_conversation_created`, `chatbot_message_saved`, `chatbot_intent_analyzed`, and Bio Page events `bio_page_viewed`, `bio_tab_changed`, `bio_chat_opened`, all with `source_module = bio-page-engine` / `sourceSurface = bio_page` where applicable.
- ChatCore QA cleanup evidence: 0 temporary projects, Bio Pages, conversations, messages, Chatbot Engine events, and Bio Page events for project `54a1e603-0d3d-4091-bc54-223753424fe1`.
- Temporary editor publish QA created temporary production slug `bio-pub-mqup6qxy-84cd79`, opened `https://www.quimera.ai/biopage` with a real temporary auth user/project, clicked `Publicar`, verified the success modal copied `https://www.quimera.ai/bio/bio-pub-mqup6qxy-84cd79`, verified `bio_pages.status = published`, and cleaned up all temporary rows/user.
- Temporary editor publish/unpublish QA created temporary production slug `bio-unpub-mqupatnx-d6f4a9`, clicked `Publicar`, dismissed the success modal, clicked `Despublicar`, verified `bio_pages.status` moved `draft -> published -> draft` with `published_at` cleared, verified the unpublish modal, saw no HTTP/console errors, and cleaned up all temporary rows/user.

Type-check note:

- Full `npm run type-check` still fails with baseline errors outside the Bio Page/ChatCore/Chatbot Engine files.
- The filtered output for `components/PublicBioPage.tsx`, `components/dashboard/BioPageBuilder.tsx`, `components/chat/ChatCore.tsx`, `components/ChatbotWidget.tsx`, `services/bioPage/*`, `services/chatbotEngine/*`, and `utils/chatbotEngine/*` is clean.

Design audit note:

- `npm run ds:audit -- --visual-locked` exits 0.
- The audit reports 1323 baseline-allowed findings and 0 needs-review findings.
- No `BioPage`, `PublicBioPage`, or `bioPage` entries appear in the audit output.

## Release Gates Still Needed

Do not mark the full goal complete until these gates have current evidence:

- Run a manual AI Studio flow: generate project, preview Bio Page, apply draft, open editor.
- Run a manual editor content/visual flow on a real project: edit profile, add link, add block, reorder, hide, change theme, and generate QR. Publish/unpublish already has current production evidence.
- Verify Stripe return attribution on a payment-enabled Appointments booking when a test-mode payment flow can be exercised.

## PR Summary Template

Use this structure for the release PR:

```markdown
## What changed
- 

## Why
- 

## Files touched
- 

## Data model / migrations
- 

## Security notes
- 

## AI guardrails
- 

## Cross-module integrations
- 

## Verification
- 

## Remaining work
- 
```
