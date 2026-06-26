# AI Studio Bio Page

## Generation Input

AI Studio can derive a Bio Page from the existing website/business generation context:

- Business profile, industry, audience, brand, and offers
- Contact and social handles
- Website plan sections
- Ecommerce intent and product readiness
- Appointments intent and services
- CRM/lead goals
- Email marketing goals
- Chatbot readiness
- Media and portfolio assets
- Explicit testimonials and FAQ items when present in the WebsitePlan content map

## Generation Output

`utils/businessBlueprint/adapters.ts` builds `bioPageBlueprint` with:

- Profile and handle suggestion
- Public slug draft
- Links and social links
- Recommended blocks, including featured banner and contact blocks from provided project data
- Testimonials/proof and FAQ blocks only when explicit source content exists
- Theme and style defaults
- Shop, booking, lead capture, email subscribe, ChatCore link/CTA, analytics, SEO, QR, and integration readiness metadata

## Preview and Apply

`components/onboarding/GeneratedWebsitePreview.tsx` shows a Bio Page draft summary before apply. After save, `components/onboarding/hooks/useAIWebsiteStudio.ts` calls `applyProjectBioPageBlueprintDraft`.

The apply step creates or updates a canonical draft Bio Page for the project and does not publish it.

AI Studio registry support maps the rendered Bio Page block surface through `registry/componentRegistry.ts` and `registry/componentAnatomyRegistry.ts`: profile, links, social icons, featured banner, featured media, shop, product collection, booking, lead capture, email subscribe, media grid, portfolio, testimonials/proof, FAQ, contact, and ChatCore CTA. Blocks with external proof, products, appointments, media, or contact claims still stay `needs_review` until the user confirms them.

AI Studio provenance is kept through apply: page, block, and link `sourceMap` entries are copied into canonical JSON fields so editors and future regeneration can explain where generated content came from without overwriting user-modified or locked rows.

For proof and FAQ content, the adapter is intentionally conservative: `testimonials` blocks are created only from `websitePlan.contentMap.testimonials`, and FAQ blocks are created only from `websitePlan.contentMap.faqs`. Missing quotes, missing answers, and malformed items are ignored instead of being filled with AI guesses.

## Guardrails

AI Studio must not:

- Publish automatically
- Invent social proof, followers, testimonials, analytics, products, prices, inventory, appointments, reviews, or availability
- Expose draft products or private appointment details
- Add subscribers without consent
- Overwrite `userModified` or `lockedFromRegeneration` blocks and links
- Mark unsafe or placeholder URLs as reviewed

## Verification

Focused tests should cover blueprint generation, preview/apply, draft status, review flags, lock preservation, product guardrails, and publish review gates.
