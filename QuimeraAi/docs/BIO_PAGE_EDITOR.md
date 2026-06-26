# Bio Page Editor

## Surface

The editor is `components/dashboard/BioPageBuilder.tsx`, backed by `contexts/bioPage/BioPageContext.tsx` and `services/bioPage/bioPageEngineService.ts`.

## Core Workflow

The editor supports:

- Project-scoped Bio Page draft creation
- Live mobile preview
- Profile editing
- Link create, edit, delete, duplicate, prioritize, toggle, and reorder
- Block create, edit, delete, duplicate, prioritize, toggle, and reorder
- Appearance controls for background, image/video/pattern, typography, colors, button style, radius, and footer visibility
- SEO, slug, QR, share, analytics, audience, shop, booking, lead, email, media, portfolio, and ChatCore settings
- Integration readiness panel for Ecommerce, Appointments, CRM/Leads, Email Marketing, ChatCore, Media AI, Analytics, Website Builder, BusinessBlueprint provenance, Design System tokens, SEO, QR, and publication blockers
- QR generation uses the tracked QR campaign URL, persists QR metadata, applies foreground/background branding, and embeds the configured logo when canvas/CORS allows it. If the logo cannot be loaded quickly, the editor still returns a valid clean QR.
- Publish and unpublish controls

## Review Gates

Publishing runs through `publishBioPage` and `getBioPagePublishIssues`.

Publish is blocked when visible content is unsafe or incomplete, including:

- Invalid or reserved slug
- Unsafe link or media URLs
- AI-generated items still marked `needsReview`
- Placeholder URLs
- Lead forms without required labels, email field, consent copy, or success copy
- Email subscribe blocks without required marketing consent
- Empty featured media, media grid, or portfolio blocks that would render broken public content

## Design System

Editor UI should use Quimera shared controls, tokens, and existing color/media pickers. Public Bio Page styles can be brand-specific, but the editor itself should remain aligned with the Quimera Design Star.

## Localization

Visible builder copy must stay in the `bioPage` namespace for active locales. The Block Library declares `labelKey` and `descriptionKey` for every modular block, and `tests/utils/bioPageI18nCoverage.test.ts` verifies those keys across `en` and `es` so new Bio Page blocks cannot ship with hardcoded editor labels.
