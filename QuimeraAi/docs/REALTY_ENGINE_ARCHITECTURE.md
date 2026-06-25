# Quimera Real Estate Engine Architecture

## Scope / Alcance

EN: This document covers the RE1 foundation for evolving Quimera Realty Suite into a draft-safe Real Estate Engine. It defines the BusinessBlueprint V2 contract, AI Studio generation guardrails, cross-module ownership, and the future sync path. It does not publish listings, send emails, create payments, or change public routing.

ES: Este documento cubre la fundacion RE1 para evolucionar Quimera Realty Suite a un Real Estate Engine seguro por defecto. Define el contrato BusinessBlueprint V2, guardrails de AI Studio, ownership entre modulos y el camino de sync futuro. No publica listings, no envia emails, no crea pagos y no cambia rutas publicas.

## Audit Summary / Resumen De Auditoria

EN:
- `types/realty.ts` already models properties, leads, agents, campaigns, open houses, media, AI generations, scores, and public listing section data.
- `hooks/realty/useRealtySuite.ts` owns private CRUD for properties, leads, campaigns, open houses, media uploads, AI generation persistence, and project module flags.
- `hooks/usePublicRealtyListings.ts` reads only active/public listings and respects `projects.data.realtyModule` flags.
- `utils/realty.ts` maps Supabase rows, calculates listing scores, normalizes Realty CRM leads, and preserves public/draft separation.
- `utils/realtyAiClient.ts` generates listing and campaign copy through `ai-proxy` and applies AI output only through explicit save/apply flows.
- Public routes `/listados` and `/listados/:slug` are already backed by `PublicRealtyDirectoryPage`, `PublicRealtyDirectory`, and `PublicRealtyPropertyDetail`.
- `registry/moduleRegistry.ts` already defines `real-estate-engine` as canonical owner for listings, property leads, campaigns, open houses, and real estate digital products.
- `registry/componentRegistry.ts` exposes `realEstateListings` as rendered. `propertySearch` and `neighborhoods` must be selected only according to their implementation/readiness status.
- `registry/componentAnatomyRegistry.ts` has real estate anatomy for listings/search/neighborhoods and supports Design Star-aligned selection.
- Supabase migrations already enable Realty tables, storage hardening, public open house reads for public properties, and CRM lead sync hardening.

ES:
- `types/realty.ts` ya modela propiedades, leads, agentes, campanas, open houses, media, generaciones AI, scores y data de secciones publicas.
- `hooks/realty/useRealtySuite.ts` controla CRUD privado para propiedades, leads, campanas, open houses, media uploads, persistencia AI y flags del modulo.
- `hooks/usePublicRealtyListings.ts` lee solo listings activos/publicos y respeta `projects.data.realtyModule`.
- `utils/realty.ts` mapea filas Supabase, calcula listing score, normaliza leads Realty en CRM y preserva separacion draft/public.
- `utils/realtyAiClient.ts` genera copy de listings/campanas por `ai-proxy` y aplica contenido AI solo con acciones explicitas.
- Las rutas publicas `/listados` y `/listados/:slug` ya usan `PublicRealtyDirectoryPage`, `PublicRealtyDirectory` y `PublicRealtyPropertyDetail`.
- `registry/moduleRegistry.ts` ya define `real-estate-engine` como owner canonico de listings, property leads, campanas, open houses y productos digitales inmobiliarios.
- `registry/componentRegistry.ts` expone `realEstateListings` como rendered. `propertySearch` y `neighborhoods` deben seleccionarse solo segun implementation/readiness.
- `registry/componentAnatomyRegistry.ts` ya tiene anatomia real estate para listings/search/neighborhoods y soporta seleccion alineada al Design Star.
- Las migraciones Supabase ya cubren tablas Realty, storage hardening, lectura publica de open houses para propiedades publicas y sync endurecido hacia CRM.

## Ownership / Ownership

EN:
- AI Studio owns generation of `BusinessBlueprint.realEstateBlueprint`.
- Realty Engine owns canonical listings, property leads, campaigns, open houses, media, and AI generation history.
- Website Builder owns presentation of real estate blocks and public routes; it must read Realty data, not duplicate it.
- CRM/Leads owns canonical follow-up pipeline once Realty lead sync runs.
- Email Marketing, Chatbot, Appointments, Ecommerce, Finance, and Analytics receive draft/needsReview instructions from the blueprint.

ES:
- AI Studio genera `BusinessBlueprint.realEstateBlueprint`.
- Realty Engine es owner canonico de listings, property leads, campanas, open houses, media e historial de generaciones AI.
- Website Builder controla presentacion de bloques inmobiliarios y rutas publicas; debe leer Realty data, no duplicarla.
- CRM/Leads controla el pipeline canonico de seguimiento cuando corre el sync de leads Realty.
- Email Marketing, Chatbot, Appointments, Ecommerce, Finance y Analytics reciben instrucciones draft/needsReview desde el blueprint.

## Website Builder Realty Blocks / Bloques Realty Del Website Builder

EN:
- `realEstateListings` is a presentation block only. It can configure title, subtitle, listing count, featured-only mode, visible card fields, CTA labels, empty-state copy, `directoryRoute`, and `detailRoutePattern`.
- Public listing cards, the directory page, and property detail pages resolve routes through `utils/realtyWebsiteRoutes.ts`. Defaults remain `/listados` and `/listados/:slug`, while safe custom routes such as `/propiedades` and `/propiedades/:slug` are supported.
- The block never stores property rows inside Website Builder data. It reads active/public listings through `usePublicRealtyListings`, which keeps draft, private, and needs-review listings out of public pages.
- Empty states are draft-safe: they explain that reviewed listings must be published from Realty Engine and may route to a lead CTA, but they do not render fake properties.
- Property detail lead and showing-request CTA labels are configurable from the same section data, while submissions still flow through Realty lead pipeline services.

ES:
- `realEstateListings` es solo un bloque de presentacion. Puede configurar titulo, subtitulo, cantidad de listings, modo destacadas, campos visibles de tarjeta, textos de CTA, copy del empty state, `directoryRoute` y `detailRoutePattern`.
- Las tarjetas publicas, el directorio y las paginas de detalle resuelven rutas por `utils/realtyWebsiteRoutes.ts`. Los defaults siguen siendo `/listados` y `/listados/:slug`, y se soportan rutas seguras como `/propiedades` y `/propiedades/:slug`.
- El bloque nunca guarda filas de propiedades dentro del Website Builder. Lee listings activos/publicos con `usePublicRealtyListings`, manteniendo drafts, privados y needs-review fuera de paginas publicas.
- Los empty states son seguros para drafts: explican que los listings revisados deben publicarse desde Realty Engine y pueden llevar a un CTA de lead, pero no muestran propiedades ficticias.
- Los textos de CTA para lead y solicitud de showing en el detalle son configurables desde la misma data de seccion, mientras los envios siguen pasando por los servicios del pipeline Realty.

## AI Studio Component Readiness / Readiness De Componentes En AI Studio

EN:
- `registry/componentRegistry.ts` marks `realEstateListings` as the only rendered real estate homepage block currently selectable by AI Studio.
- `propertySearch` remains `planned` and `neighborhoods` remains `metadata_only`; both are blocked with `aiSelection.canSelect: false` and fall back to `realEstateListings`.
- `selectComponentsForPage` records blocked preferred components under `rejectedComponents` with registry-readiness reasons instead of putting them in `selectedComponents`.
- The real estate design pattern now recommends `hero`, `realEstateListings`, and `leadForm`; it does not recommend a planned search block.
- `realEstateListings` declares Realty Engine as the canonical data system and Website Builder as the presentation owner, with no write access from presentation components.

ES:
- `registry/componentRegistry.ts` marca `realEstateListings` como el unico bloque inmobiliario rendered de homepage que AI Studio puede seleccionar por ahora.
- `propertySearch` sigue `planned` y `neighborhoods` sigue `metadata_only`; ambos quedan bloqueados con `aiSelection.canSelect: false` y usan fallback a `realEstateListings`.
- `selectComponentsForPage` registra componentes preferidos bloqueados en `rejectedComponents` con razones de registry/readiness en lugar de ponerlos en `selectedComponents`.
- El patron de diseno inmobiliario ahora recomienda `hero`, `realEstateListings` y `leadForm`; no recomienda un bloque de busqueda planeado.
- `realEstateListings` declara Realty Engine como sistema canonico de data y Website Builder como owner de presentacion, sin permisos de escritura desde componentes de presentacion.

## RealEstateBlueprint V2

EN: V2 expands the legacy fields while keeping backwards compatibility.

ES: V2 expande los campos legacy manteniendo compatibilidad.

Legacy fields kept:
- `listingTypes`
- `leadTypes`
- `digitalProducts`

New V2 areas:
- `agentProfile`
- `brokerageProfile`
- `listingDrafts`
- `leadFunnels`
- `showingRequests`
- `openHouses`
- `campaigns`
- `publicDirectory`
- `propertyPages`
- `neighborhoods`
- `chatbot`
- `emailMarketing`
- `analytics`
- `ecommerceOffers`
- `integrations`
- `engineArtifacts`
- `importArchitecture`

## Guardrails / Guardrails

EN:
- AI-generated listing drafts stay `needsReview: true`.
- AI-generated listing drafts stay `publicEnabled: false`.
- AI prices are `ai-suggested` or `unset`; only numeric user-provided prices become `user-provided`.
- License numbers, brokerage claims, sold volume, reviews, market data, mortgage numbers, and legal/financial claims are never invented.
- User-modified or `lockedFromRegeneration` modules must be preserved.
- Planned or metadata-only components must not be mounted as rendered UI.

ES:
- Los listing drafts generados por AI quedan `needsReview: true`.
- Los listing drafts generados por AI quedan `publicEnabled: false`.
- Los precios AI son `ai-suggested` o `unset`; solo precios numericos provistos por el usuario son `user-provided`.
- No se inventan licencias, claims de brokerage, volumen vendido, reviews, data de mercado, numeros hipotecarios ni claims legales/financieros.
- Modulos modificados por usuario o con `lockedFromRegeneration` deben preservarse.
- Componentes planned o metadata-only no deben montarse como UI rendered.

## Migration / Migracion

EN: `migrateBusinessBlueprint` now hydrates legacy `realEstateBlueprint` data into V2 defaults in memory. It preserves legacy `listingTypes`, `leadTypes`, `digitalProducts`, `metadata.userModified`, and `metadata.lockedFromRegeneration`.

ES: `migrateBusinessBlueprint` ahora hidrata data legacy de `realEstateBlueprint` a defaults V2 en memoria. Preserva `listingTypes`, `leadTypes`, `digitalProducts`, `metadata.userModified` y `metadata.lockedFromRegeneration`.

## Import, IDX, And MLS Architecture / Arquitectura De Importacion, IDX Y MLS

EN:
- `types/realty.ts` defines draft-safe import contracts for `RealtyImportSourceConfig`, `RealtyImportJob`, `RealtyImportMapping`, `RealtyExternalListingDraft`, and `RealtyDuplicateMatch`.
- Supported source categories are `manual`, `csv`, `imported-url`, `mls`, `idx`, `api`, and `external-feed`.
- `utils/realtyImport.ts` normalizes external listing rows into review records with `status: draft`, `importReviewStatus: needs_review`, `publicEnabled: false`, `needsReview: true`, and `noAutoPublish: true`.
- Imported rows use stable `syncKey` values in the `realty-import:{sourceType}:{projectId}:{identity}` format, where identity prefers external ID, then slug, then generated listing identity.
- Duplicate matching is project-scoped and uses external ID, slug, normalized address, title/city, and close price signals. Possible matches are flagged with `duplicateReviewStatus: possible_duplicate` and `possible_duplicate` review warnings.
- Imported listing drafts are not treated as AI output: `generatedByAI: false`, `userModified: false`, and `lockedFromRegeneration: false`. Review and publish actions remain explicit user actions.
- `components/dashboard/realty/RealtyDashboard.tsx` exposes Import/IDX staging inside the Engine tab. Users can paste JSON or CSV rows, preview review drafts, inspect duplicate/warning signals, and create private draft listings through the existing Realty Supabase/RLS save path.
- `supabase/migrations/20260624234330_realty_import_sources_jobs.sql` adds authenticated-only `realty_import_sources` and `realty_import_jobs` tables with explicit Data API grants, RLS via `private.can_manage_realty_record`, and no public/anon read access.
- Import sources persist provider/feed metadata, sync mode, enabled flag, and review status. They intentionally do not store provider secrets. Import jobs persist row counts, draft counts, duplicate counts, warning metadata, created draft references, and `no_auto_publish`.
- The Properties tab now includes an imported listing review queue. Imported drafts can be approved, reopened for review, or rejected/archived. Publishing is blocked until `importReviewStatus: approved`, `needsReview: false`, `noAutoPublish: false`, and duplicate status is cleared.
- Created import batches persist a review summary under `projects.data.realtyModule.importStaging`, including source type, source name, created draft IDs, duplicate count, warning count, and warning codes.
- MLS/IDX connectors are not active in this phase. The current work establishes the adapter contract and review gate for future provider integrations without making public listings or feed sync live.

ES:
- `types/realty.ts` define contratos de importacion seguros como draft para `RealtyImportSourceConfig`, `RealtyImportJob`, `RealtyImportMapping`, `RealtyExternalListingDraft` y `RealtyDuplicateMatch`.
- Las categorias soportadas son `manual`, `csv`, `imported-url`, `mls`, `idx`, `api` y `external-feed`.
- `utils/realtyImport.ts` normaliza filas externas de listings en records revisables con `status: draft`, `importReviewStatus: needs_review`, `publicEnabled: false`, `needsReview: true` y `noAutoPublish: true`.
- Las filas importadas usan `syncKey` estable con formato `realty-import:{sourceType}:{projectId}:{identity}`, donde identity prefiere external ID, luego slug y luego identidad generada del listing.
- La deteccion de duplicados esta limitada por proyecto y usa external ID, slug, direccion normalizada, titulo/ciudad y precio cercano. Los posibles matches quedan marcados con `duplicateReviewStatus: possible_duplicate` y warnings `possible_duplicate`.
- Los listing drafts importados no se tratan como salida AI: `generatedByAI: false`, `userModified: false` y `lockedFromRegeneration: false`. Las acciones de revisar y publicar siguen siendo acciones explicitas del usuario.
- `components/dashboard/realty/RealtyDashboard.tsx` expone staging de Import/IDX dentro del tab Engine. El usuario puede pegar filas JSON o CSV, previsualizar drafts revisables, inspeccionar duplicados/warnings y crear listings privados en draft usando el save path existente de Realty con Supabase/RLS.
- `supabase/migrations/20260624234330_realty_import_sources_jobs.sql` agrega tablas `realty_import_sources` y `realty_import_jobs` solo para usuarios autenticados, con grants explicitos para Data API, RLS via `private.can_manage_realty_record` y sin lectura publica/anon.
- Las fuentes de import persisten metadata de proveedor/feed, modo de sync, flag enabled y estado de revision. Intencionalmente no guardan secrets de proveedores. Los jobs de import persisten conteos de filas, drafts, duplicados, metadata de warnings, referencias a drafts creados y `no_auto_publish`.
- El tab Properties ahora incluye una cola de revision de listings importados. Los drafts importados se pueden aprobar, reabrir para revision o rechazar/archivar. La publicacion queda bloqueada hasta `importReviewStatus: approved`, `needsReview: false`, `noAutoPublish: false` y estado de duplicado resuelto.
- Los batches importados persisten un resumen de revision en `projects.data.realtyModule.importStaging`, incluyendo tipo de fuente, nombre de fuente, IDs de drafts creados, conteo de duplicados, conteo de warnings y codigos de warning.
- Los conectores MLS/IDX no estan activos en esta fase. Este trabajo establece el contrato de adaptadores y el review gate para futuras integraciones de proveedores sin activar listings publicos ni sync de feeds en vivo.

## Draft Sync And Lead Pipeline / Sync Draft Y Pipeline De Leads

EN:
- `services/realty/realtyBlueprintService.ts` converts `RealEstateBlueprint` into reviewable Realty drafts for agent/brokerage profile data, listings, campaigns, open house settings, and website metadata.
- Draft sync uses `source: ai-studio-realty`, stable `syncKey`, `blueprintItemId`, `needsReview: true`, `generatedByAI: true`, `safeToEdit: true`, and `lockedFromRegeneration: false`.
- `components/dashboard/realty/RealtyDashboard.tsx` exposes preview/apply actions from the Engine tab and persists sync metadata into `projects.data.realtyModule`.
- `services/realty/realtyLeadPipelineService.ts` is the canonical frontend builder for public property inquiries, open house registrations, and showing requests.
- Public lead writes go only into `property_leads`; Supabase triggers/RLS handle CRM sync without frontend service-role credentials.
- `supabase/migrations/20260624220231_realty_lead_pipeline_events.sql` promotes pipeline metadata into canonical columns: `pipeline_idempotency_key`, `pipeline_event_type`, `pipeline_source`, `lead_tags`, and `needs_review`.
- The same migration records draft-safe `property_lead_events` with a unique `(property_lead_id, pipeline_idempotency_key)` key, so repeated public submissions update the event instead of duplicating it.
- `supabase/migrations/20260624222840_realty_pipeline_event_idempotency_scope.sql` scopes `property_leads` dedupe to `pipeline_idempotency_key` when the canonical pipeline is used. A property inquiry, showing request, and open house registration from the same email remain separate Realty events, while the CRM trigger still updates the same CRM lead for the person/property.
- CRM sync now forwards Realty event tags into `leads.tags` and keeps the same review/idempotency metadata in `leads.custom_data`.
- Cross-module sync now creates inactive Realty CRM tags, lead sources, pipeline stages, and activity event definitions from `RealEstateBlueprint` and `leadFunnels`.
- Analytics drafts include Realty events such as property views, lead submissions, showing requests, open house registrations, and monetization offer previews. No runtime analytics event is emitted by the sync.
- Lead pipeline metadata carries timeline, email, chatbot, appointment, and analytics draft events, but does not send emails, create calendar slots, publish chatbot knowledge, or record runtime analytics automatically.
- The public property detail now includes a showing request form with preferred date/time, client type, budget, financing status, and consent metadata.
- The Realty leads tab shows source badges, showing requests, CRM sync state, draft event counts, and safe status actions.
- `utils/realtyChatbotKnowledge.ts` now derives structured Chatbot knowledge drafts from `RealEstateBlueprint` profile, brokerage, listing, showing, open house, lead qualification, and compliance data.
- Cross-module Chatbot sync stores those knowledge sources in `businessBlueprint.crossModuleSync.chatbot` with `status: draft`, `needsReview: true`, `chatbotPublished: false`, `noRuntimeActivated: true`, and `noAutoPublish: true`.
- The Realty Engine tab shows a Chatbot knowledge review queue after preview/apply, including draft type, review status, listing review counts, readiness blockers, and the no-runtime guardrail.
- Listing knowledge separates reviewed public listings from unreviewed listing drafts. Draft listings may be previewed as review material, but the chatbot must not answer as if they are current public inventory.
- Realty chatbot guardrails explicitly block legal, financial, tax, mortgage, valuation, fair-housing, market-stat, license, review, sold-volume, and availability claims unless reviewed by the agent/brokerage owner.
- Stripe/payment monetization remains draft-only at this stage; Real Estate may propose paid guides, reports, premium listing packages, or consultations, but Ecommerce/Finance own actual checkout, taxes, refunds, payouts, and payment provider readiness.
- Ecommerce/Finance drafts cover buyer guides, seller guides, market reports, consultation packages, valuation packages, premium listing packages, courses, digital downloads, and open house tickets when applicable. Each Ecommerce draft includes a nested `productDraft` payload with `status: draft`, `needsReview: true`, `publishStatus: not_published`, `checkoutEnabled: false`, and readiness blockers for payment, tax, merchant review, missing price, or disabled offers.
- Realty offer drafts store `recommendedStripeSurface: checkout_sessions` for future Ecommerce ownership, but keep `stripeProductCreated`, `stripePriceCreated`, `stripeCheckoutSessionCreated`, `stripePaymentLinkCreated`, `checkoutEnabled`, and finance ledger flags false.
- `components/dashboard/realty/RealtyDashboard.tsx` now exposes a Realty Offers section in Engine with preview/apply actions scoped to Ecommerce and Finance only. The action persists draft-safe handoffs in `businessBlueprint.crossModuleSync` and does not create product rows, Stripe objects, payment links, checkout sessions, ledger entries, or public storefront content.

ES:
- `services/realty/realtyBlueprintService.ts` convierte `RealEstateBlueprint` en drafts revisables para perfil agente/brokerage, listings, campanas, open house settings y metadata de website.
- El draft sync usa `source: ai-studio-realty`, `syncKey` estable, `blueprintItemId`, `needsReview: true`, `generatedByAI: true`, `safeToEdit: true` y `lockedFromRegeneration: false`.
- `components/dashboard/realty/RealtyDashboard.tsx` expone preview/apply desde Engine y persiste metadata de sync en `projects.data.realtyModule`.
- `services/realty/realtyLeadPipelineService.ts` es el builder frontend canonico para inquiries publicos, registros de open house y showing requests.
- Los leads publicos escriben solo en `property_leads`; triggers/RLS de Supabase manejan el sync a CRM sin credenciales service-role en frontend.
- `supabase/migrations/20260624220231_realty_lead_pipeline_events.sql` promueve metadata del pipeline a columnas canonicas: `pipeline_idempotency_key`, `pipeline_event_type`, `pipeline_source`, `lead_tags` y `needs_review`.
- La misma migracion registra `property_lead_events` seguros como draft con llave unica `(property_lead_id, pipeline_idempotency_key)`, para que submissions publicos repetidos actualicen el evento en vez de duplicarlo.
- `supabase/migrations/20260624222840_realty_pipeline_event_idempotency_scope.sql` limita el dedupe de `property_leads` a `pipeline_idempotency_key` cuando se usa el pipeline canonico. Un inquiry, showing request y registro de open house del mismo email quedan como eventos Realty separados, mientras el trigger CRM sigue actualizando el mismo lead CRM para la persona/propiedad.
- El sync CRM ahora envia tags de eventos Realty a `leads.tags` y mantiene la misma metadata de review/idempotencia en `leads.custom_data`.
- El sync cross-module ahora crea tags CRM, fuentes de lead, etapas de pipeline y definiciones de actividad inmobiliaria inactivas desde `RealEstateBlueprint` y `leadFunnels`.
- Los drafts de Analytics incluyen eventos Realty como vistas de propiedad, submissions de leads, showing requests, registros de open house y previews de ofertas de monetizacion. El sync no emite eventos analytics runtime.
- La metadata del pipeline lleva drafts de timeline, email, chatbot, appointment y analytics, pero no envia emails, no crea espacios de calendario, no publica knowledge de chatbot ni registra analytics runtime automaticamente.
- El detalle publico de propiedad ahora incluye formulario de showing request con fecha/hora preferida, tipo de cliente, presupuesto, estado de financiamiento y consentimiento.
- La pestana de leads de Realty muestra badges de source, showing requests, sync CRM, conteo de draft events y acciones seguras de estado.
- `utils/realtyChatbotKnowledge.ts` ahora deriva drafts estructurados de knowledge para Chatbot desde data de perfil, brokerage, listings, showings, open houses, cualificacion de leads y compliance en `RealEstateBlueprint`.
- El sync cross-module de Chatbot guarda esas fuentes de knowledge en `businessBlueprint.crossModuleSync.chatbot` con `status: draft`, `needsReview: true`, `chatbotPublished: false`, `noRuntimeActivated: true` y `noAutoPublish: true`.
- El tab Realty Engine muestra una cola de revision de knowledge del Chatbot despues de preview/apply, incluyendo tipo de draft, estado de revision, conteos de listings revisados, blockers de readiness y el guardrail no-runtime.
- El knowledge de listings separa listings publicos revisados de drafts sin revisar. Los draft listings se pueden previsualizar como material de revision, pero el chatbot no debe responder como si fueran inventario publico vigente.
- Los guardrails del chatbot Realty bloquean explicitamente claims legales, financieros, fiscales, hipotecarios, de valuacion, fair-housing, estadisticas de mercado, licencias, reviews, volumen vendido y disponibilidad salvo revision del owner agente/brokerage.
- La monetizacion Stripe/payment sigue solo como draft en esta etapa; Real Estate puede proponer guias pagas, reportes, premium listing packages o consultas, pero Ecommerce/Finance son owners del checkout real, taxes, refunds, payouts y readiness del proveedor de pago.
- Los drafts de Ecommerce/Finance cubren buyer guides, seller guides, market reports, consultation packages, valuation packages, premium listing packages, courses, digital downloads y open house tickets cuando aplique. Cada draft Ecommerce incluye un payload `productDraft` con `status: draft`, `needsReview: true`, `publishStatus: not_published`, `checkoutEnabled: false` y blockers de readiness para pagos, taxes, revision merchant, precio faltante u ofertas deshabilitadas.
- Los drafts de ofertas Realty guardan `recommendedStripeSurface: checkout_sessions` para ownership futuro de Ecommerce, pero mantienen `stripeProductCreated`, `stripePriceCreated`, `stripeCheckoutSessionCreated`, `stripePaymentLinkCreated`, `checkoutEnabled` y flags de ledger/finance en false.
- `components/dashboard/realty/RealtyDashboard.tsx` ahora expone una seccion Realty Offers en Engine con acciones preview/apply limitadas a Ecommerce y Finance. La accion persiste handoffs seguros en draft dentro de `businessBlueprint.crossModuleSync` y no crea product rows, objetos Stripe, payment links, checkout sessions, ledger entries ni contenido publico en storefront.

## Next PRs / Proximos PRs

EN:
- RE2: harden AI Studio real estate generator and component readiness gates with more fixtures.
- RE3: persist additional Realty profile/settings drafts into first-class tables when schema ownership is finalized.
- RE4: deepen canonical lead pipeline with server-side event audit views and email/analytics dashboards.
- RE5: convert showing requests into reviewed Appointments drafts once availability rules are configured.
- RE6+: public premium UX, dashboard operating center, cross-module sync, ecommerce offers, import/IDX architecture, and production QA.

ES:
- RE2: endurecer generador inmobiliario de AI Studio y readiness gates con mas fixtures.
- RE3: persistir drafts adicionales de perfiles/settings Realty en tablas first-class cuando se finalice ownership de schema.
- RE4: profundizar pipeline canonico con vistas server-side de eventos y dashboards email/analytics.
- RE5: convertir showing requests en drafts revisados de Appointments cuando disponibilidad este configurada.
- RE6+: UX publica premium, dashboard operating center, sync cross-module, ecommerce offers, arquitectura import/IDX y QA de produccion.
