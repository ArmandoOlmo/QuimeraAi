# FAQ and Showcase Mobile Responsiveness Follow-Up

Date: 2026-06-28
Preview URL: http://127.0.0.1:5175

## Scope

This follow-up focused only on the surfaces requested after the broader editor mobile audit:

- FAQ editor controls and FAQ preview/runtime variants.
- Showcase editor controls and Showcase preview/runtime variants.
- FAQ Manager cards used by the AI Assistant dashboard.
- Admin component controls for FAQ and Showcase.

## Surfaces Audited

- `components/controls/sections/FAQControls.tsx`
- `components/controls/sections/FaqLuminaControls.tsx`
- `components/controls/sections/renderFaqNeonControls.tsx`
- `components/controls/sections/ShowcaseControls.tsx`
- `components/dashboard/admin/ComponentControls.tsx`
- `components/dashboard/ai/FAQManager.tsx`
- `components/Faq.tsx`
- `components/FaqLumina.tsx`
- `components/FaqNeon.tsx`
- `components/Showcase.tsx`

## Changes Applied

- Converted dense FAQ and Showcase control grids to one column on mobile, with two columns starting at `sm`.
- Added `min-w-0`, `truncate`, `break-words`, and fixed shrink behavior where user-generated titles, questions, answers, categories, links, and CTA text can be long.
- Made mobile destructive/action buttons visible where hover-only actions were unreliable on touch devices.
- Normalized Showcase image heights with responsive `clamp()` values instead of fixed pixel heights on mobile.
- Removed the invalid Showcase grid inline style and replaced desktop column handling with Tailwind responsive classes.
- Adjusted Showcase vertical-strip, case-grid, carousel, CTA, and index layouts so they do not force cramped two-column or fixed-height mobile layouts.

## Verification

- `git diff --check`: passed.
- `npm run build`: passed.
- Playwright mobile checks:
  - Viewports: 375x812 and 390x844.
  - Routes checked: `/login`, `/dashboard`, `/admin/landing-editor`, `/biopage`, `/email`, `/ecommerce/storefront`.
  - Result: 12/12 checks with no horizontal overflow.

## Evidence

- Results JSON: `audit/editor-faq-showcase-mobile/browser-results.json`
- Screenshots:
  - `iphone-se-ish-login.png`
  - `iphone-se-ish-dashboard-redirect.png`
  - `iphone-se-ish-admin-landing-editor-redirect.png`
  - `iphone-se-ish-bio-page-builder-redirect.png`
  - `iphone-se-ish-email-editor-redirect.png`
  - `iphone-se-ish-storefront-editor-redirect.png`
  - `large-mobile-login.png`
  - `large-mobile-dashboard-redirect.png`
  - `large-mobile-admin-landing-editor-redirect.png`
  - `large-mobile-bio-page-builder-redirect.png`
  - `large-mobile-email-editor-redirect.png`
  - `large-mobile-storefront-editor-redirect.png`

## Verification Limits

The editor routes are auth-protected in the local preview and redirect to `/login` without a signed-in session. Because of that, visual browser verification proves the routed mobile shell/redirect state has no horizontal overflow, while the internal FAQ and Showcase editor panels were verified through direct code audit, targeted responsive fixes, `git diff --check`, and the production build.
