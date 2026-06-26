# Bio Page Analytics

## Event Store

Bio Page analytics are stored in `bio_page_events`, created by `supabase/migrations/20260625203527_canonical_bio_page_engine.sql`.

Allowed event types:

- `bio_page_viewed`
- `bio_profile_shared`
- `bio_qr_scanned`
- `bio_link_clicked`
- `bio_social_clicked`
- `bio_product_clicked`
- `bio_collection_clicked`
- `bio_booking_started`
- `bio_booking_completed`
- `bio_lead_submitted`
- `bio_email_subscribed`
- `bio_chat_opened`
- `bio_tab_changed`

## Runtime API

`services/bioPage/bioPageAnalyticsService.ts` owns:

- `recordBioPageEvent`
- `recordBioPageView`
- `recordBioPageClick`
- `getBioPageAnalytics`

The public renderer and editor use these APIs instead of writing analytics ad hoc.

## Privacy Rules

Analytics metadata must not expose PII. Lead and subscribe workflows keep emails, names, canonical email metadata, subscriber ids, lead ids, and form payloads out of `bio_page_events.metadata`.
Public attribution is sanitized before insert: only supported UTM keys are kept, UTM/source tokens are length-limited, values containing email addresses are dropped, and referrers are stored without query strings or hashes.
Public analytics and subscriber inserts are also constrained by RLS in `20260626031900_harden_bio_page_event_policy.sql`: the event/subscriber `project_id` and `tenant_id` must match the published Bio Page, supplied `block_id` values must point to visible blocks on that page, supplied `link_id` values must point to visible links on that page, and link/social/collection click events require a real link id. This prevents anonymous clients from spoofing cross-project analytics/subscribers or attributing traffic to hidden/draft blocks.

The summary includes totals, unique views, returning views, CTR, conversions, QR scans, shares, chat opens, top links, link-by-source attribution, source, UTM, referrer, device, block, and event breakdowns.

For public link clicks, `source` represents the visitor acquisition source (`utm_source`, legacy `source`, referrer fallback, or direct), while the clicked destination platform remains in metadata. This lets link/source analytics answer which campaign, QR code, or share channel drove clicks on each link.

## Editor

The Analytics tab in `BioPageBuilder` reads `getBioPageAnalytics`, supports date ranges, shows per-link source attribution, and exports CSV summaries including link/source rows.
