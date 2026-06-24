# Quimera Restaurants

Premium dashboard module for restaurant operations.

See `docs/RESTAURANT_ENGINE_ARCHITECTURE.md` for the Restaurant Engine V2 contract, AI Studio generation flow, public menu target architecture, reservation sync target, ecommerce offer ownership, cross-module drafts, and Design System guardrails.

## Data model

Authenticated data follows the existing tenant-aware pattern:

- Agency/client tenants: `tenants/{tenantId}/restaurants/{restaurantId}`
- Personal workspaces: `users/{uid}/restaurants/{restaurantId}`

Subcollections:

- `menuItems`
- `reservations`
- `marketingOutputs`
- `reviewTemplates`
- `analyticsEvents`

Public digital menus are mirrored to `publicRestaurantMenus/{restaurantId}` with available menu items only.

BusinessBlueprint now stores the V2 Restaurant Engine contract under `restaurantBlueprint`, including `profile`, `menuDraft`, `reservations`, `publicMenu`, `ecommerceOffers`, and `integrations`. Legacy `menuSignals`, `reservationRules`, and `legacyEcommerceOffers` remain for compatibility.

`services/restaurants/restaurantBlueprintService.ts` can preview or apply a RestaurantBlueprint as draft Restaurant Engine data. It creates a restaurant draft, creates review-safe menu item drafts, updates reservation/public menu settings, mirrors the public menu through the existing sync path, and skips user-modified or locked menu items.

Public reservation forms call `services/restaurants/publicRestaurantService.ts`, which targets the `create-public-restaurant-reservation` Supabase Edge Function and falls back to the canonical Restaurant Engine reservation repository during local development. New public reservations are not written to `publicRestaurantMenus/{restaurantId}/publicReservations`; they land in the same reservation store used by the dashboard.

## AI

Restaurant AI uses the existing Gemini proxy client. API keys remain server-side behind the configured proxy.

## Premium access

The dashboard shows an upgrade gate unless the current plan is one of the paid/agency/enterprise plans. Owners and superadmins keep the broader platform bypass through existing plan access behavior.
