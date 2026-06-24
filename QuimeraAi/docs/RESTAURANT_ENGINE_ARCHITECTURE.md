# Restaurant Engine Architecture

## Scope

Restaurant Engine is the canonical Quimera module for restaurant profile data, menu drafts, public QR menus, reservations, restaurant ecommerce offer drafts, and restaurant-specific integration drafts.

Website Builder owns presentation. Ecommerce Engine owns products, prices, checkout, orders, taxes, inventory, and discounts. CRM, Email Marketing, Chatbot, Analytics, and Finance own their runtime systems. Restaurant Engine can suggest draft data for those modules, but it must not publish or activate anything without merchant review.

## Phase 0 Audit Summary

- `types/restaurants.ts` had operational restaurant settings, menu items, reservations, marketing outputs, review templates, and analytics events. Menu item metadata for AI review, idempotency, and regeneration protection was not present.
- `types/businessBlueprint.ts` had only a minimal `RestaurantBlueprint` with `menuSignals`, `reservationRules`, and `ecommerceOffers`.
- `utils/businessBlueprint/adapters.ts` generated a legacy restaurant blueprint when the industry normalized to restaurant, but did not produce a full restaurant contract.
- `registry/moduleRegistry.ts` already defined `restaurant-engine`, but compatible industries were narrow.
- `registry/componentRegistry.ts` and `registry/componentAnatomyRegistry.ts` already had rendered `restaurantMenu`, `restaurantReservation`, and `restaurantLocation` blocks.
- `Menu.tsx` already supports `dataSource: 'restaurant'` and `restaurantId`.
- `RestaurantReservation.tsx` submits public reservations through `publicRestaurantService`.
- `docs/design-system` requires canonical components, `--q-*` tokens, registry-driven AI selection, and no duplicate UI primitive families.

## RestaurantBlueprint V2

`RestaurantBlueprint` now includes these V2 modules:

- `profile`: name, cuisine, address, phone, hours, public slug, languages, currency, source map, and readiness.
- `menuDraft`: categories, review-safe menu item drafts, dietary tags, allergens, modifiers, upsells, price source, draft status, and publish status.
- `reservations`: reservation enablement, capacity, interval, average duration, table preferences, deposit flag, cancellation policy, confirmation mode, source, review state, and readiness.
- `publicMenu`: QR menu settings, route strategy `/menu/:restaurantId`, sticky CTA, call/map/reserve buttons, theme preset, menu variant, and mobile behavior.
- `ecommerceOffers`: gift cards, catering packages, event tickets, reservation deposits, meal kits, and merch as draft/needsReview offer slots.
- `integrations`: chatbot knowledge sources, CRM lead sources/tags, email flow drafts, analytics events, finance revenue sources, and automation flow drafts.

Legacy fields remain:

- `menuSignals`
- `reservationRules`
- `legacyEcommerceOffers`

Old persisted blueprints that stored `restaurantBlueprint.ecommerceOffers` as a string array are normalized through `normalizeRestaurantBlueprint`.

## AI Studio Flow

AI Studio derives a restaurant blueprint from the same business brief used by the website, ecommerce, storefront, and cross-module systems.

Restaurant detection includes:

- restaurant, restaurante
- cafe, cafe with accent, cafeteria
- food, comida
- steakhouse
- bakery, panaderia
- catering
- bar
- sushi
- pizza
- brunch
- fine dining
- casual dining
- food truck

AI-generated restaurant data is draft-only:

- Menu items are `needsReview: true`.
- Generated items are `generatedByAI: true`.
- Publish status stays `not_published`.
- Reservation confirmation defaults to `manual`.
- Ecommerce offers remain draft or disabled.
- No fake reviews, ratings, sales volume, discounts, or active checkout are generated.

## Blueprint Draft Sync

`services/restaurants/restaurantBlueprintService.ts` converts `RestaurantBlueprint` V2 into Restaurant Engine draft data.

Main entry points:

- `previewRestaurantBlueprintSync(scope, blueprint, options)`
- `applyRestaurantBlueprintDraft(scope, blueprint, options)`
- `createRestaurantFromBlueprint(scope, blueprint)`
- `createMenuDraftsFromBlueprint(scope, restaurantId, blueprint, options)`
- `createReservationSettingsFromBlueprint(scope, restaurantId, blueprint)`
- `createPublicMenuFromBlueprint(scope, restaurantId, blueprint)`

The sync service is split into:

- A pure planning layer, `planRestaurantBlueprintSync`, used by tests and previews.
- A repository-backed apply layer that uses the existing restaurant services and `compatData`.

Draft sync rules:

- Match restaurants by explicit id, sync key, blueprint id, public slug, or normalized name.
- Match menu items by sync key, blueprint item id, or normalized name/category.
- Create missing menu items as AI-generated drafts.
- Menu items start with `isAvailable: false`, `publishStatus: not_published`, `availabilityStatus: draft`, and `needsReview: true`.
- Public menu sync mirrors the existing restaurant/public menu path, but draft items are not available publicly until reviewed.
- Existing menu items with `userModified` or `lockedFromRegeneration` are skipped, even when overwrite is requested.
- Ecommerce offers and cross-module integrations are previewed as draft intent only. Runtime product creation, CRM writes, email sends, chatbot writes, finance writes, and analytics instrumentation remain separate phases.

Compatibility note:

- Restaurant settings can preserve extra metadata through the current compatibility layer.
- Menu item metadata is included in service payloads for repositories that support it; current Supabase compatibility only has fixed restaurant menu item columns, so idempotency also uses normalized name/category as a safe fallback.

## Website Builder Ownership

AI Studio selects only registered restaurant components:

- `restaurantMenu` renders as website section `menu`.
- `restaurantReservation` renders as website section `restaurantReservation`.
- `restaurantLocation` renders as website section `map`.

Registry data ownership now points these blocks at Restaurant Engine data:

- `restaurantBlueprint.menuDraft`
- `restaurantBlueprint.reservations`
- `restaurantBlueprint.profile`

Website Builder may control presentation, variants, CTA copy, and layout. Restaurant Dashboard owns menu and reservation data.

## Public Menu Architecture

Current public menu data is mirrored to `publicRestaurantMenus/{restaurantId}` with available menu items. The V2 target is:

- QR menu route: `/menu/:restaurantId`
- Sticky category navigation
- Sticky mobile CTAs for reserve, call, and map
- Dish detail drawer
- Reservation block when enabled
- Analytics events for menu views, QR views, dish clicks, category clicks, call clicks, map clicks, and reservation starts

No ordering CTA should be shown unless Ecommerce Engine has reviewed and enabled the relevant product or checkout flow.

## Reservation Sync Target

Previous known issue:

- Public reservations are written under `publicRestaurantMenus/{restaurantId}/publicReservations`.
- Dashboard reservations read canonical private tenant/user restaurant paths.

The canonical flow now uses `supabase/functions/create-public-restaurant-reservation` from `services/restaurants/publicRestaurantService.ts`. The client service invokes the Edge Function first, then falls back to the same canonical repository path if the function is not deployed locally. It never writes new reservations to the orphaned public subcollection.

- Validates public restaurant settings.
- Resolves the canonical restaurant by public `restaurantId` or `publicSlug`.
- Validates email, future date/time, party size, reservation enablement, max party size, and reservation interval.
- Writes the reservation to `restaurant_reservations`, the dashboard canonical collection/table.
- Records source as `website`, `qrMenu`, or `aiAssistant`.
- Emits the `reservation_created` restaurant analytics event with draft-safe CRM, email, and chatbot integration metadata.
- Dedupes retries by matching non-cancelled reservations for the same restaurant, email, date, time, source, and party size.

CRM lead creation, transactional email sending, chatbot timeline writes, and Finance events remain R9 integrations. They are represented as draft-safe metadata today so reservation creation does not hard-depend on modules that may be disabled.

## Ecommerce Offers

Restaurant Engine can suggest these offer drafts:

- Gift cards
- Catering packages
- Event tickets
- Reservation deposits
- Meal kits
- Merch

Ecommerce Engine remains canonical for product creation, pricing, checkout, taxes, discounts, fulfillment, and orders. Restaurant Engine must create only draft products and readiness blockers until merchant review is complete.

## Cross-Module Integration Drafts

Restaurant integrations are represented as reviewable blueprint data first:

- CRM tags: restaurant, reservation, high-intent, catering, gift-card, qr-menu
- Email flows: reservation received, confirmation, reminder, cancellation, review request, catering follow-up
- Chatbot knowledge: menu items, ingredients, allergens, dietary tags, hours, location, reservation policy, catering, gift cards
- Analytics events: menu viewed, QR menu viewed, dish clicked, category clicked, call clicked, map clicked, reservation started, reservation created
- Finance sources: reservation deposits, gift cards, catering packages, event tickets, meal kits, merch

Runtime writes should be idempotent and skipped when a target module is disabled.

## Design System Rules

Restaurant Dashboard and public restaurant surfaces must follow Quimera Design System:

- Use canonical DS components where practical.
- Use `--q-*` tokens for dashboard/admin surfaces.
- Do not introduce duplicate button, card, input, modal, or color picker families.
- Keep Website Builder presentation separate from Restaurant Engine data ownership.
- Keep generated AI content in draft/needsReview states.

## QA Checklist

- Generate a restaurant blueprint from an AI brief.
- Confirm V2 profile, menuDraft, reservations, publicMenu, ecommerceOffers, and integrations exist.
- Confirm all generated menu items are review-safe.
- Confirm Website Blueprint includes registered restaurant sections only.
- Confirm locked/user-modified restaurant blueprints are not overwritten.
- Run Restaurant Engine unit tests.
- Run BusinessBlueprint, AI Studio, registry, and cross-module sync tests.
- Before later backend work, verify Supabase/Data API exposure, RLS, and any server-side public reservation endpoint.
