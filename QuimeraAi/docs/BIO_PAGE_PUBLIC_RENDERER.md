# Bio Page Public Renderer

## Route

The public route is `/bio/:slug`, registered in `App.tsx` and rendered by `components/PublicBioPage.tsx`.
Both entry points use `utils/bioPageRouting.ts` to extract only the first canonical slug segment, safely decode it, and ignore trailing paths, query strings, hashes, or malformed encoded input before loading public data.

## Data Loading

Public data comes from `getPublicBioPageBySlug` in `services/bioPage/bioPagePublicService.ts`.

Runtime safeguards:

- Only `status = published` pages are loaded.
- Hidden links and hidden blocks are filtered again in the public service.
- Product blocks hydrate only real eligible Ecommerce products.
- Unsafe URLs are sanitized before rendering or opening.
- ChatCore context excludes private draft data and audience internals.

`/bio/demo` has a deterministic public fallback when Supabase does not contain a published `demo` record. The fallback is a published, no-index smoke/marketing Bio Page with stable UUID ids, demo products, media, booking, lead, email and ChatCore blocks, so local and preview environments can verify the full public funnel. The fallback does not persist analytics because it has no backing database row. A real published database record with slug `demo` always takes priority, keeps normal analytics behavior, and every other slug still requires a published row.

## Public Blocks

The renderer supports the mobile-first funnel surface:

- Profile and social icons
- Link cards
- Featured banner and media
- Product grid and product collections
- Booking CTA or inline booking
- Lead form
- Email subscribe
- Portfolio grid
- Testimonials, FAQ, contact, chatbot CTA, divider, spacer

## Tracking

The public renderer records safe events through `services/bioPage/bioPageAnalyticsService.ts`, including views, shares, QR opens, tab changes, clicks, lead submits, subscribes, booking events, and chat opens.

## SEO

The renderer applies document title, description, canonical URL, robots, Open Graph, and Twitter metadata from the Bio Page SEO payload.

## Localization

Static public UI copy uses the `publicBioPage` i18n namespace in `locales/en` and `locales/es`. The focused i18n coverage test scans the public renderer for `tp(...)` keys so loading states, public errors, tabs, search, share, booking, lead, subscribe, contact, media, portfolio, testimonials, FAQ, footer, and ChatCore fallback copy stay translated across active locales.
