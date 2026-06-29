# Editor Mobile Responsiveness Audit

Date: 2026-06-28
Viewport used for browser probes: 375 x 812
Preview URL: http://127.0.0.1:5175

## Scope

Audited the routed editor surfaces and shared editor controls used by Quimera:

- Website editor controls: `Controls`, section controls, `TabbedControls`, `MobileBottomSheet`, shared editor primitives.
- Storefront editor: structure tree, section variants, template controls, active section controls.
- Email editor: block tree, preview, properties panel, block control variants.
- Bio Page builder: internal sections, controls panel, add-link modal, content areas.
- Admin landing editor: structure panel, component library, section controls, template controls.
- CMS/article editors: `ModernCMSEditor`, `ModernAppArticleEditor`, `AgencyArticleEditor`, `NewsEditor`.
- Admin support editors: `LegalPageEditor`, `MenuEditor`, plan editors.

Inactive legacy editors found but not changed: `components/cms/CMSEditor.tsx` and `components/dashboard/admin/AppArticleEditor.tsx`; current routed imports use `ModernCMSEditor` and `ModernAppArticleEditor`.

## Fixes Applied

- Replaced mobile-hostile fixed sidebars with mobile sheets or fixed bottom panels in Email, Storefront, Admin Landing, App Article, Agency Article, and News editors.
- Changed editor shells that used `h-screen` to `100dvh` where mobile browser chrome can otherwise clip content.
- Made shared editor tabs, i18n field headers, toggles, bottom sheet titles, and local email/admin toggles shrink safely with `min-w-0`, truncation, and non-shrinking switches.
- Compacted mobile editor headers by hiding nonessential text below `sm`/`md`, preserving icon actions for save, settings, publish, and back.
- Made article/link/image modals mobile-safe with full-width `max-w-*`, stacked actions, responsive padding, and non-rigid upload layouts.
- Reduced TipTap editor canvas padding/min-height on mobile while preserving desktop spacing.
- Improved Bio Page add-link modal so categories/content stack on mobile instead of competing for horizontal width.
- Added mobile controls entry points for Storefront and Admin Landing so selected sections open editable controls instead of relying on desktop sidebars.

## Evidence

- `git diff --check`: passed.
- `npm run build`: passed. Only existing chunk-size warnings were emitted.
- Playwright probes against the rebuilt preview saved screenshots and metrics in this folder.
- `browser-results-after-fixes.json`: every accessible/redirected route measured `horizontalOverflow: false` at 375px.

Screenshots captured after fixes:

- `after-fixes-login-mobile.png`
- `after-fixes-dashboard-redirect-mobile.png`
- `after-fixes-biopage-mobile.png`
- `after-fixes-email-route-mobile.png`
- `after-fixes-storefront-route-mobile.png`
- `after-fixes-admin-landing-route-mobile.png`

## Limits

Protected editor routes redirected to `/login` without a persisted test session during the final browser pass, so internal authenticated editor states were verified by code audit plus build, not by live in-browser interaction in this run.

The worktree had unrelated pre-existing dirty files before this audit: `ControlsShared.tsx`, `TemplateEditorModal.tsx`, `ImagePicker.tsx`, and `ThumbnailEditor.tsx`. Those changes were preserved.
