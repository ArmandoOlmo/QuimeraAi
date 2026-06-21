# Quimera AI Business Infrastructure Blueprint

## Purpose

Quimera is organized around this contract:

```txt
AI Studio -> BusinessBlueprint -> connected modules
```

The A1 foundation is intentionally low risk. It adds TypeScript contracts, a module registry, WebsitePlan adapters, tests, and docs. It does not create Supabase migrations, new runtime tables, checkout changes, or editor UI.

For A1, the blueprint is stored as JSON inside `projects.data.businessBlueprint`. Normalized persistence can come later when a phase needs it.

## A1 Contracts

`BusinessBlueprint` is versioned from day one:

```txt
blueprintVersion
schemaVersion
generatedAt
lastSyncedAt
source
tenantId
projectId
workspaceId
createdBy
status
readiness
sourceMap
metadata
```

Every sub-blueprint uses the same module state shape:

```txt
enabled
status
needsReview
readiness
metadata.generatedBy
metadata.userModified
metadata.lockedFromRegeneration
```

The first A1 sub-blueprints are:

```txt
businessProfile
brandProfile
websiteBlueprint
storefrontBlueprint
ecommerceBlueprint
chatbotBlueprint
leadBlueprint
emailMarketingBlueprint
mediaBlueprint
appointmentsBlueprint
restaurantBlueprint
realEstateBlueprint
financeBlueprint
analyticsBlueprint
automationBlueprint
```

`IntegrationEvent` is also defined in TypeScript during A1, but it is not persisted yet. Modules can design against event contracts before the production event pipeline exists.

## Canonical Systems

| Domain | Canonical system |
| --- | --- |
| Products, variants, prices, inventory, carts, checkout, orders, discounts, shipping, taxes, customers | Ecommerce Engine |
| Leads, tags, activity timelines | CRM / Leads |
| Campaigns, audiences, automations, transactional email drafts, logs | Email Marketing |
| Chatbot configuration, FAQs, documents, product and policy knowledge | Chatbot Engine |
| Appointments, deposits, classes, paid consultations | Appointments Engine |
| Menus, reservations, hours, locations | Restaurant Engine |
| Listings, property leads, open houses | Real Estate Engine |
| Revenue, refunds, fees, payouts, tax reporting | Finance |
| Analytics events and dashboards | Analytics |

## Builder Ownership

Website Builder edits presentation:

```txt
sections
ecommerce block selection
source selection
layout
style variant
visibility
CTA routes to storefront/product pages
```

Website Builder does not edit inventory, orders, checkout, product prices, variants, or discounts.

Storefront Builder edits storefront presentation:

```txt
theme
sections
section order
product card style
collection layout
product page template
cart visual
checkout visual
draft/published template state
```

Storefront Builder does not edit products, variants, prices, inventory, discounts, orders, refunds, or customers.

Ecommerce Admin and Ecommerce Engine own commerce data and behavior:

```txt
products
variants
prices
inventory
discounts
shipping
taxes
carts
checkout
orders
refunds
customers
```

## Sync Rules

AI Studio may create initial data and suggest updates.

AI Studio must not overwrite modules marked `metadata.userModified` or `metadata.lockedFromRegeneration` without explicit confirmation.

Website ecommerce blocks and Storefront sections read products, categories, and prices from Ecommerce Engine.

Email flows read ecommerce events. CRM receives normalized activity events. Chatbot receives business, policy, and product knowledge sources.

The A1 registry records ownership, compatible industries, module dependencies, required services, required plan features, and gating reasons so later UI and sync work can reuse the same contract.

## Generated Content Guardrails

Starter ecommerce content is review-first:

```txt
starter products -> needs_review
AI prices -> suggested only unless user provided them
stock -> unset unless user provided it
discounts -> draft
gift cards -> draft
checkout -> not publish-ready until payment, shipping, tax, and inventory settings are complete
```

Each module includes readiness gates:

```txt
readiness.isReady
readiness.blockers
readiness.warnings
```

Ecommerce examples:

```txt
missing payment provider
missing shipping rules
missing tax settings
inventory not confirmed
draft discounts require approval
```

## Roadmap

```txt
PR22 Visual/theme foundation
A1 Unified Business Blueprint + Module Registry
A2 Storefront Theme System
A3 Storefront Module Renderer
A4 Product Card System
B1 Website Ecommerce Blocks
B2 Website Builder Controls
C1 AI Studio Blueprint Generation
C2 Ecommerce Starter Content
C3 Cross-Module Sync
D1 Inventory
D2 Email Marketing Integration
D3 Discounts / Shipping / Taxes
D4 Orders Admin
D5 Refunds / Cancellations
D6 Customer Accounts
E1 Storefront Editor Shell
E2 Storefront Section Settings
E3 Storefront Theme Settings
F1-F4 E2E / Production QA
```

Supabase migrations are deferred until a later phase introduces new persistence. When that happens, the phase must include RLS, grants, negative tests, replay/idempotency tests, and migration rollback notes.

## A2 Storefront Theme System

A2 adds a theme contract layer on top of the existing `StorefrontThemeSettings` shape. It does not change storefront rendering by itself.

The theme system includes:

```txt
StorefrontThemePresetDefinition
StorefrontTemplateCompatibility
StorefrontCatalogSizeRule
StorefrontThemeResolution
```

Preset compatibility declares:

```txt
compatibleIndustries
catalogSizes
requiredModules
optionalModules
unsupportedModules
```

Catalog-size rules are explicit:

```txt
empty: 0 products
single: 1 product
small: 2-12 products
medium: 13-100 products
large: 101-1000 products
enterprise: 1001+ products
```

The fallback chain for a resolved storefront theme is:

```txt
DEFAULT_STOREFRONT_THEME
-> preset theme
-> brandColors
-> projectGlobalColors
-> explicit storefrontTheme settings
```

AI Studio can now choose a storefront preset during blueprint generation, record the catalog size, record template compatibility, and keep the final theme output aligned with `StorefrontThemeSettings`.

## A3 Storefront Module Renderer

A3 adds a section registry and renderer decision layer for storefront modules. It keeps rendering low risk by preserving the existing `componentOrder` fallback when a blueprint has no supported sections.

The renderer validates:

```txt
supported section kind
section enabled/disabled state
hidden section visibility
visibleIn landing/store context
required section settings
empty section behavior
manual source warnings
```

Blueprint sections take precedence when valid. Unsupported or empty blueprint section lists fall back to the existing storefront `componentOrder`.

## A4 Product Card System

A4 centralizes product-card presentation rules without moving product ownership out of Ecommerce Engine.

The product card system includes:

```txt
ProductCardVariant
ProductCardVisualVariant
ProductCardViewModel
ProductCardReadiness
ProductCardValidationIssue
```

It validates and normalizes:

```txt
editable card variants
price readiness
compare-at price and discount percent
badge state
rating and review count
image fallback quality
stock display state
draft/archived product readiness
```

Storefront and website product cards may use this view model for presentation. They must not edit products, variants, prices, inventory, discounts, orders, checkout, refunds, or customer records.

## B1 Website Ecommerce Blocks

B1 defines website ecommerce blocks as presentation-only consumers of Ecommerce Engine data.

The B1 block registry includes:

```txt
FeaturedProducts
ProductCarousel
CategoryShowcase
PromoBanner
GiftCardBlock
ShopCTA
```

Each block declares:

```txt
canonicalSystem: ecommerce-engine
presentationOwner: website-builder
requiredService: ecommerce
requiredFeature: ecommerceEnabled
writes: []
allowedSources
defaultTargetRoute
defaultSettings
```

Website Builder may configure:

```txt
source
layout
style variant
visibility
responsive behavior
CTA route
```

Website Builder must not create or mutate products, variants, prices, inventory, discounts, gift card records, carts, checkout, orders, refunds, or customer accounts.
