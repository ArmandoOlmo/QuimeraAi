# AI Component Selection Engine

AI Studio now has a deterministic selection layer between the business analysis step and the BusinessBlueprint merge.

Flow:

1. `createComponentSelectionContext` extracts industry, available data, builder, and business capabilities.
2. `classifyPageIntent` classifies the target page intent from combined signals.
3. `selectComponentsForPage` scores registered components only.
4. `selectComponentVariants` chooses registered anatomy variants, slots, density, media treatment, and mobile behavior.
5. `critiqueComponentDesign` scores visual quality from 0-100.
6. `validateComponentPlan` rejects invalid IDs, invalid variants, unsafe ecommerce data usage, and incompatible builders.
7. `mergeAiStudioBlueprint` stores design metadata on `websiteBlueprint.sectionBlueprints` without overwriting protected user edits.

The LLM should receive allowed components, allowed variants, relevant design patterns, anti-patterns, available data, and readiness constraints. It should not invent component IDs, layout variants, slots, product data, prices, inventory, discounts, reviews, or checkout readiness.

## Implementation Status

Every registry entry declares an `implementationStatus`:

- `rendered`: the component maps to a real Website Builder or Storefront Builder section and can be mounted.
- `metadata_only`: AI Studio can use it for selection, rationale, scoring, and future renderer metadata, but the current renderer does not consume its anatomy variants directly.
- `planned`: the component is part of the selection contract, but must not be mounted into `websiteBlueprint.sections` yet.

`mergeAiStudioBlueprint` only adds `rendered` components to `websiteBlueprint.sections`. Metadata-only and planned components stay advisory so AI Studio cannot claim visual support the renderer does not have.

## Scoring

The scoring model is deterministic:

- industry match: 25%
- page intent match: 20%
- data availability: 20%
- conversion goal match: 15%
- visual fit: 10%
- mobile fit: 10%

Selected components must meet their registry threshold. Components scoring from 0.50 to 0.74 are optional. Components below 0.50 are rejected.

Penalties are applied for missing product/category data, repeated or unsafe commerce assumptions, missing required modules, builder incompatibility, unapproved promotions, and storefront sections mounted inside Website Builder.

## Ecommerce Guardrails

Website ecommerce blocks are presentation-only consumers of Ecommerce Engine data:

- They can read products, categories, prices, gift card state, promotions, and storefront routes.
- They cannot write products, inventory, prices, discounts, checkout, carts, orders, refunds, or customers.
- `featuredProducts` requires real products or reviewable starter product drafts.
- `categoryShowcase` requires categories or collections.
- `productCarousel` requires enough products to justify a carousel.
- `promoBanner` and `saleCountdown` require merchant-approved promotion data.
- `bestSellersStrip` stays disabled until real sales data exists.
- `shopCTA` is the fallback when catalog data is incomplete.

## Regeneration Protection

When `metadata.userModified` or `metadata.lockedFromRegeneration` is set on an existing section, AI Studio keeps that section intact. Design Intelligence can enrich generated sections, but protected sections remain protected.
