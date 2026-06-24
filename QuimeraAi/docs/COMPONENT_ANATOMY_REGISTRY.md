# Component Anatomy Registry

`registry/componentAnatomyRegistry.ts` documents what each AI-selectable component can do internally.

Each anatomy entry includes:

- component ID
- family
- available slots
- required and optional slots
- layout variants
- style variants
- background options
- media options
- density options
- mobile behavior options
- compatible design patterns
- editor controls map
- default and fallback variants
- AI guidance and anti-patterns

## Adding A Component

1. Add a typed entry to `registry/componentRegistry.ts`.
2. Add matching anatomy to `registry/componentAnatomyRegistry.ts`.
3. Add relevant design pattern recommendations in `registry/designPatternLibrary.ts`.
4. Add selection and validation tests if the component affects scoring or guardrails.

The component should not be AI-selectable until both registry and anatomy entries exist.

## Adding A Variant

1. Add the variant to the component's `layoutVariants`.
2. Define recommended slots and mobile behavior.
3. Add `avoidWhen` guidance for unsafe or weak matches.
4. Update pattern recommendations only if the variant is a good fit for a known pattern.
5. Add tests if the variant is expected for an industry or page intent.

The variant selector rejects layout variants that do not exist in this registry.

## Slots

Slots are explicit contracts for generated content and editor controls. The selector activates required slots plus the slots recommended by the chosen layout variant.

Examples:

- `hero`: `headline`, `subheadline`, `primaryCta`, `media`, `proof`
- `featuredProducts`: `headline`, `products`, `cta`
- `leadForm`: `headline`, `fields`, `trust`
- `restaurantMenu`: `headline`, `menuItems`, `cta`
- `realEstateListings`: `headline`, `listings`, `cta`

The validation layer rejects active slots that are not declared by anatomy.

## Mobile Behavior

Every selected variant must define mobile behavior:

- `stackedMobile`
- `carouselMobile`
- `accordionMobile`
- `priorityContent`
- `compactStrip`
- `hiddenMobile`

AI Studio should treat missing mobile behavior as a blocking validation issue.
