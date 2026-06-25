# Appointments Engine Production Readiness

This checklist tracks what must be true before the canonical Appointments Engine can be considered live in production.

## Code gates

- `npm run build` must pass from `QuimeraAi/`.
- Relevant Appointments Engine tests must pass:
  - `tests/services/appointmentEngineService.test.ts`
  - `tests/services/appointmentAnalyticsService.test.ts`
  - `tests/services/appointmentCheckoutService.test.ts`
  - `tests/services/appointmentEmailDeliveryService.test.ts`
  - `tests/services/appointmentGoogleCalendarSyncService.test.ts`
  - `tests/services/appointmentBlockedDateMigrationService.test.ts`
  - `tests/utils/googleCalendarService.test.ts`
  - `tests/utils/businessBlueprint.test.ts`
- Touched-file TypeScript filtering must show no Appointments Engine regressions.

## Supabase gates

The canonical migrations are:

- `supabase/migrations/20260625075444_canonical_appointments_engine.sql`
- `supabase/migrations/20260625075716_harden_canonical_appointments_engine.sql`

They must be applied to the linked Supabase project before production traffic uses:

- `project_appointment_blocks`
- `project_google_calendar_integrations`
- canonical appointment metadata columns
- Appointments Engine RLS policies and grants

Current linked-project status:

- Applied through Supabase MCP as `20260625075444_canonical_appointments_engine`.
- Applied through Supabase MCP as `20260625075716_harden_canonical_appointments_engine`.
- Verified canonical tables, metadata columns, Google Calendar server-only grants, explicit deny RLS policies, and fixed `search_path` for `is_project_appointments_member`.
- Deployed Supabase Edge Function `stripe-webhook` version 11 so appointment payment reconciliation is active in the Ecommerce webhook path.
- Configured Supabase Edge Function secrets for Stripe payment reconciliation: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Configured Supabase Edge Function secret `RESEND_API_KEY` for transactional email delivery.

Current deployment guardrail:

- Do not run `supabase db push` blindly if unrelated local migrations are still pending.
- If applying only Appointments Engine migrations in another environment, use a deliberate database change process and align migration history intentionally.
- `SUPABASE_DB_PASSWORD` is required by Supabase CLI for `db query` and `db push` against the linked project.

## Vercel environment gates

Production currently needs these Appointments Engine runtime variables:

- Configured: `CRON_SECRET`
- Configured: `SUPABASE_URL` or `VITE_SUPABASE_URL`
- Configured: `SUPABASE_SERVICE_ROLE_KEY`
- Configured: `GOOGLE_CALENDAR_CLIENT_ID`
- Configured: `VITE_GOOGLE_CLIENT_ID`
- Configured: `GOOGLE_CALENDAR_REDIRECT_URI`
- Configured: `GOOGLE_CALENDAR_OAUTH_STATE_SECRET` through `CRON_SECRET` fallback
- Configured: `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`
- Configured: `GOOGLE_CALENDAR_WEBHOOK_URL`
- Configured: `APP_BASE_URL` and `VITE_PUBLIC_APP_URL`
- Configured: `GOOGLE_CALENDAR_CLIENT_SECRET`
- Configured: `STRIPE_SECRET_KEY`
- Configured: `RESEND_API_KEY`
- Configured: `APPOINTMENT_EMAIL_FROM`
- Configured: `RESEND_FROM_EMAIL`

Optional runtime tuning:

- `APPOINTMENT_EMAIL_JOB_LIMIT`
- `GOOGLE_CALENDAR_SYNC_JOB_LIMIT`
- `GOOGLE_CALENDAR_INITIAL_SYNC_LIMIT`
- `GOOGLE_CALENDAR_MANUAL_SYNC_LIMIT`

## Cross-module configuration audit

The Appointments Engine shares production dependencies with Ecommerce and Email Marketing. Current audit status:

- Appointments confirmations/reminders: Vercel `RESEND_API_KEY`, `APPOINTMENT_EMAIL_FROM`, and `RESEND_FROM_EMAIL` are configured.
- Email Marketing campaigns: Supabase `email-api` is active and Supabase `RESEND_API_KEY` plus `EMAIL_FROM` are configured.
- Ecommerce transactional emails: Supabase `stripe-webhook` is active and Supabase `RESEND_API_KEY` plus `EMAIL_FROM` are configured.
- Ecommerce payments: Supabase `stripe-api`, `stripe-webhook`, and `create-store-checkout-intent` are active. Vercel/Supabase `STRIPE_SECRET_KEY` and Supabase `STRIPE_WEBHOOK_SECRET` are configured.
- Ecommerce customer auth redirects: Supabase `APP_URL` and `STORE_AUTH_REDIRECT_URL` are configured.
- Stripe publishable key: `VITE_STRIPE_PUBLISHABLE_KEY` is not configured globally. Current production data has no Stripe-enabled store settings, so this is not blocking inactive stores. Before enabling card checkout or agency payment links, configure `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel or save `stripe_publishable_key` per store.

## Runtime gates

- `/api/appointments/jobs/run` must be protected by `CRON_SECRET`.
- `/api/appointments/google/jobs/run` must be protected by `CRON_SECRET`.
- Google Calendar status must return `configured: true` only when OAuth, encryption, and redirect settings are present.
- Appointment checkout must fail closed when `STRIPE_SECRET_KEY` is absent.
- Appointment email delivery must skip disabled/misconfigured project flows and defer retryable runtime gaps, such as a missing `RESEND_API_KEY`, without removing queued reminders from the job scope.
- Public widget routes must create bookings server-side and must not expose private appointment details.

## Dashboard readiness signals

The Appointments Dashboard shows an Engine Health checklist for:

- canonical source
- availability
- public booking
- ChatCore
- CRM pipeline
- Email Marketing
- Google Calendar
- Ecommerce paid bookings
- legacy blocked dates migration

The checklist is advisory UI. Production readiness still requires the Supabase and Vercel gates above.
