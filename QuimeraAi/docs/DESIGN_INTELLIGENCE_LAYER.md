# Design Intelligence Layer

The Design Intelligence Layer gives AI Studio a typed design decision system instead of free-form component guessing.

Architecture:

```text
AI Studio
-> Business Analyzer
-> Business Capability Classifier
-> Page Intent Classifier
-> Component Registry
-> Component Anatomy Registry
-> Design Pattern Library
-> Component Selection Engine
-> Component Variant Selector
-> Design Critic
-> Validation Layer
-> BusinessBlueprint Merge
-> Renderer / Editor
```

## Design Patterns

`registry/designPatternLibrary.ts` stores abstract design patterns such as:

- `clean_saas_editor`
- `premium_retail_product`
- `restaurant_warm_editorial`
- `gallery_portfolio_editorial`
- `marketplace_catalog`
- `real_estate_lead_generation`

Patterns can be inspired by references such as Mobbin, Framer, Squarespace, Shopify, Webflow, Linear, Stripe, Notion, and Claude, but they must stay abstract.

Do not copy:

- exact screens
- proprietary layouts
- brand assets
- copy
- imagery
- interaction details

Use references only to extract principles: hierarchy, composition, rhythm, density, navigation, image/text balance, CTA structure, spacing, and UX patterns.

## Design Critic

`utils/aiStudio/designCritic.ts` scores each generated variant plan from 0-100:

- visual hierarchy: 0-20
- component variety: 0-15
- brand fit: 0-15
- conversion clarity: 0-15
- mobile-first behavior: 0-15
- spacing rhythm: 0-10
- originality without chaos: 0-10

Scores below 80 return issues and suggestions. The critic detects generic heroes, repetitive centered layouts, too many grids, weak CTA flow, missing trust cues, mobile hierarchy gaps, and flat spacing rhythm.

## BusinessBlueprint Metadata

Generated section blueprints can now store:

- `componentId`
- `layoutVariant`
- `styleVariant`
- `activeSlots`
- `backgroundChoice`
- `mediaTreatment`
- `density`
- `mobileBehavior`
- `designPatternIds`
- `designScore`
- `designRationale`
- `selectionConfidence`

All fields are optional for compatibility with legacy projects.
