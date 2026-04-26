# Quimera Restaurants

Premium dashboard module for restaurant operations.

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

## AI

Restaurant AI uses the existing Gemini proxy client. API keys remain server-side behind the configured proxy.

## Premium access

The dashboard shows an upgrade gate unless the current plan is one of the paid/agency/enterprise plans. Owners and superadmins keep the broader platform bypass through existing plan access behavior.
