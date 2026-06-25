# Appointments Engine Architecture

## Canonical source of truth

Appointments are project-scoped runtime records stored in `public.project_appointments`.
Blocked availability is stored in `public.project_appointment_blocks`.

Legacy Firestore paths are read-only compatibility sources:

- `users/{userId}/projects/{projectId}/appointments`
- `users/{userId}/projects/{projectId}/blockedDates`

New dashboard, public widget, Website Builder lead forms, and ChatCore flows must not write appointment runtime state to those legacy paths.

## Runtime entry points

- Dashboard creates and updates appointments through `services/appointments/appointmentEngineService.ts`.
- Public booking uses `api/widget/[...path].ts`, which calls the same canonical engine.
- ChatCore uses the `onCreateAppointment` callback from `ChatbotWidget` and `ChatSimulator`; both callback implementations call `createAppointmentFromChat`.
- Website Builder lead forms submit public leads through the widget API when no editor CRM context exists.

## Cross-module contract

The engine stores source metadata on the appointment row:

- `source`
- `source_component`
- `source_module`
- `source_conversation_id`
- `source_lead_id`
- `public_submission_id`
- `idempotency_key`
- `correlation_id`
- ecommerce/payment fields
- JSON `metadata`

The appointment lead pipeline creates or links CRM leads, records appointment timeline activity, and creates follow-up tasks after completed appointments.
Failures in CRM side effects are warnings, not appointment-write failures.

Appointment runtime events are appended to `project_appointments.metadata.integrationEvents` and mirrored into
`metadata.analytics.events`. Email Marketing handoff records are queued in `email_logs` with `triggeredBy =
appointments-engine`, project scope, correlation IDs, source module metadata, and localized subject keys.
ChatCore, public booking, and dashboard state transitions use the same event service.

## BusinessBlueprint contract

`AppointmentsBlueprint` is V2 and keeps legacy fields for compatibility:

- `serviceTypes`
- `paidBookingTypes`
- `availabilityStatus`

It also declares the canonical engine:

- source of truth: `project_appointments`
- blocked time source: `project_appointment_blocks`
- public booking
- ChatCore intents
- CRM lead linking
- Email Marketing flows
- Analytics events
- Google Calendar sync state
- Ecommerce deposit/payment draft state
- AI Preparation context using linked leads and ChatCore transcript
- Website Builder booking blocks

Generated values are draft/reviewable by default. Availability, payment products, reminders, policies, and Google Calendar sync require merchant review before publishing.

## AP1 implemented scope

- Additive Supabase migration for canonical appointment metadata and canonical blocked times.
- Canonical appointment service with conflict checks, idempotency, source metadata, and lead-link side effects.
- Dashboard appointment hook reads/writes `project_appointments`.
- Dashboard blocked-time hook writes `project_appointment_blocks` and only reads legacy Firestore blocks as compatibility data.
- Public widget list/create appointment routes use the canonical engine.
- Public widget availability route exposes only free slots computed from canonical appointments and blocked times.
- ChatCore dashboard/public appointment creation is routed through `createAppointmentFromChat`.
- AI Preparation receives linked CRM leads from appointments.
- Website Builder lead form can submit to the widget API outside editor context.
- Website Builder appointment CTA/public booking form renders through `appointmentBooking` and creates canonical public booking requests.
- BusinessBlueprint emits an Appointments Engine V2 contract with ChatCore included.

## AP2 implemented scope

- `GET /api/widget/:project/availability` returns public availability slots from `project_appointments` and `project_appointment_blocks`.
- `appointmentCTA` and `publicBookingForm` map to the rendered `appointmentBooking` website section.
- `AppointmentBooking` loads public availability, collects contact details, and posts appointment requests through the widget API.

## AP3 implemented scope

- ChatCore and public booking pass locale and source metadata into the canonical engine.
- Appointment creation records `appointment_requested` events and queues Email Marketing request logs.
- Appointment confirmation records `appointment_confirmed`, queues confirmation logs, and schedules email reminder logs.
- Cancellation, completion, and no-show transitions append canonical runtime events; completion also queues follow-up email logs.
- Public widget appointment creation preserves booking service, ecommerce product/order, payment status, and metadata links.
- Supabase RLS/grants allow project members to insert only Appointments Engine email logs with scoped metadata.
- English and Spanish translation keys exist for appointment request, confirmation, cancellation, follow-up, and reminder subjects.

## AP4 implemented scope

- Google Calendar imports now map new events to canonical appointments with `source = google_calendar`.
- Imported Google events include `sync_key`, `idempotency_key`, `google_sync.googleCalendarId`, and Google event metadata.
- Google pull updates preserve the original appointment source when the appointment was created in Quimera.
- Dashboard status actions for confirm and no-show use canonical engine functions, so reminders/events are not bypassed by generic updates.

## AP5 implemented scope

- Website Builder availability exposes appointment service payment metadata: deposit/prepaid amounts, currency, and ecommerce product IDs.
- `AppointmentBooking` forwards payment mode, amount, currency, and ecommerce product ID to the canonical widget API.
- The canonical appointment engine creates a linked `store_orders` draft for deposit/prepaid appointment bookings with a positive amount.
- Deposit draft orders use `checkout_idempotency_key`, appointment metadata, project scope, and `triggeredBy = appointments-engine`.
- The appointment row is updated with `ecommerce_order_id` and payment status before runtime events are recorded.
- Supabase RLS/grants allow project members to insert only Appointments Engine deposit orders with scoped metadata.

## AP6 implemented scope

- `services/appointments/appointmentEmailDeliveryService.ts` processes due Appointments Engine `email_logs` records.
- The worker filters by `triggeredBy = appointments-engine`, `sourceModule = appointments`, `provider = resend`, and queued/scheduled status so Ecommerce transactional emails are not processed by appointment jobs.
- Project `email_settings` control provider readiness, sender identity, reply-to, colors, footer copy, and appointment-flow disable switches.
- Scheduled reminder logs remain deferred until `metadata.sendAt` is due.
- Successful sends update `email_logs` with `sent`, `sent_at`, `provider_message_id`, and delivery metadata; disabled/misconfigured flows are marked skipped or failed with explicit error codes.
- `api/appointments/jobs/run.ts` exposes a `CRON_SECRET` protected Vercel Function for the appointment email job.
- `vercel.json` schedules `/api/appointments/jobs/run` every 15 minutes.
- English and Spanish translation keys exist for appointment email subjects and body copy.

## AP7 implemented scope

- `services/appointments/appointmentAnalyticsService.ts` derives canonical funnel metrics from `project_appointments` records and their `metadata.integrationEvents` stream.
- The analytics contract tracks requested, confirmed, completed, cancelled, no-show, source mix, linked CRM leads, AI preparation, paid/deposit bookings, and payment status breakdowns.
- ChatCore is a first-class analytics source, separate from public booking, dashboard, and Google Calendar imports.
- `useAppointments` exposes the canonical analytics payload alongside the existing dashboard metrics.
- `AppointmentAnalyticsPanel` renders booking analytics, canonical funnel, and source mix directly in the Appointments Dashboard.
- English and Spanish translation keys exist for the analytics panel labels, descriptions, funnel steps, and source names.

## AP8 implemented scope

- `services/appointments/appointmentCheckoutService.ts` creates Stripe Checkout Sessions only for `store_orders` owned by Appointments Engine.
- The checkout handoff validates project scope, appointment ID, linked order ID, customer email, payable amount, and Appointments Engine ownership metadata before calling Stripe.
- `api/appointments/payments/checkout.ts` exposes a public-safe Vercel Function that uses service-role Supabase access server-side and never exposes Stripe secret keys.
- Checkout Sessions include `orderId`, `appointmentId`, `projectId`, `tenantId`, `bookingServiceId`, `paymentMode`, and correlation metadata on both the session and PaymentIntent.
- Public `AppointmentBooking` shows required deposit/prepaid amount, creates the canonical appointment, receives the real project/order IDs, and redirects to secure Stripe Checkout when payment is required.
- `stripe-webhook` reconciles paid and failed appointment orders back into `project_appointments.payment_status` and appointment metadata.
- English and Spanish translation keys exist for booking payment notice, redirecting state, and checkout error state.

## AP9 implemented scope

- ChatCore booking paths now pass canonical booking metadata: `source = chatbot`, `source_module = chatcore`, `source_component = ChatCore`, `source_conversation_id`, locale, transcript, generated-by-AI state, and `bookingChannel`.
- ChatCore distinguishes manual form, AI-confirmed, structured block, and voice-call booking channels in appointment metadata.
- `ChatbotWidget`, `ChatSimulator`, and `EmbedWidget` propagate the same ChatCore contract into `createAppointmentFromChat` or the public widget API.
- The external embed no longer creates a duplicate lead after booking; the Appointments Engine create-or-link lead pipeline owns lead linkage.
- Appointment analytics and runtime event metadata classify new ChatCore events as `chatcore` while preserving compatibility for legacy `chatbot` source records.
- English and Spanish translation keys exist for ChatCore booking confirmations, errors, voice transcript markers, and appointment form labels.

## AP10 implemented scope

- Google Calendar sync is now project-scoped and server-side through `project_google_calendar_integrations`.
- OAuth state is signed, OAuth tokens are encrypted server-side, and the dashboard no longer stores Google access tokens in `localStorage` or browser memory as the canonical sync source.
- `api/appointments/google/oauth/start.ts` and `oauth/callback.ts` connect a project calendar through OAuth and immediately register/renew a Calendar webhook channel.
- `api/appointments/google/webhook.ts` validates Google channel tokens and marks the integration for pending sync without exposing project data publicly.
- `api/appointments/google/jobs/run.ts` is scheduled by Vercel Cron to renew watch channels, process pending webhooks, and run incremental sync.
- `api/appointments/google/sync.ts` lets the dashboard trigger a manual bidirectional sync through the canonical service.
- Quimera-owned appointments push to Google with Quimera extended properties; Google-owned events import directly into `project_appointments` without lead/email/payment side effects.
- External Google edits to Quimera-owned appointments are queued for review instead of overwriting canonical appointment fields.
- Expired Google incremental sync tokens are cleared on 410 responses and retried as a full sync before storing a fresh `nextSyncToken`.
- English and Spanish Google Calendar UI/legal copy now reflects encrypted server-side project sync.

## AP11 implemented scope

- Project Email Marketing settings now include appointment-flow template overrides for request received, confirmation, cancellation, follow-up, and reminder emails.
- `appointmentEmailDeliveryService` resolves per-project appointment template overrides before default copy and supports variables for appointment title, attendee, start/end time, timezone, payment status, ecommerce order ID, flow type, and project name.
- Appointment email flows can be disabled globally or per-template without affecting Ecommerce transactional email delivery.
- Ecommerce Email Settings exposes visual controls for appointment template enablement, subject, preheader, intro, next step, footer, and custom HTML.
- English and Spanish translation keys exist for Appointment Email Template management labels, descriptions, placeholders, save action, and flow names.

## AP12 implemented scope

- `services/appointments/appointmentBlockedDateMigrationService.ts` migrates legacy `users/{userId}/projects/{projectId}/blockedDates` records into canonical `project_appointment_blocks`.
- Migration handles Firestore timestamp shapes, ISO strings, date-only all-day blocks, metadata preservation, audit metadata, created/updated ownership, and invalid-range skips.
- `project_appointment_blocks` has a unique index on `project_id + metadata.legacy_source` so repeated migration attempts are idempotent.
- `useBlockedDates` still reads unmigrated legacy blocks for compatibility, but hides legacy records after a matching canonical row exists.
- The Appointments Dashboard shows a migration banner only when unmigrated legacy blocks exist and runs the migration without leaving the calendar context.
- English and Spanish translation keys exist for the legacy migration banner, action, loading state, success, error, and fallback migrated title.

## AP13 implemented scope

- The Appointments Dashboard now renders an Engine Health checklist covering canonical source, availability, public booking, ChatCore, CRM, Email Marketing, Google Calendar, Ecommerce paid bookings, and legacy blocked-date migration.
- The readiness panel uses current runtime signals and `AppointmentsBlueprint` state instead of static marketing copy.
- English and Spanish translation keys exist for all readiness states and checklist items.
- `docs/APPOINTMENTS_ENGINE_PRODUCTION_READINESS.md` documents Supabase migration gates, Vercel runtime variables, cron protection, and known deployment blockers.

## AP14 implemented scope

- The linked Supabase project has the canonical Appointments Engine migrations applied as `20260625075444_canonical_appointments_engine` and `20260625075716_harden_canonical_appointments_engine`.
- `project_google_calendar_integrations` is service-role only for runtime access; authenticated clients have explicit deny RLS policies and no table grants.
- `is_project_appointments_member` remains `SECURITY INVOKER` and now has a fixed `search_path`.
- Supabase security advisors no longer report Appointments Engine-specific lints after the hardening migration; remaining advisor warnings belong to pre-existing non-appointments surfaces.
- Supabase Edge Function `stripe-webhook` is deployed with appointment payment reconciliation for paid/deposit bookings.
- Vercel production has the Appointments Engine base URL, Google OAuth redirect URL, Google webhook URL, and token encryption key configured.

## Remaining phases

- No Appointments Engine code integration phase remains open in this plan. Production completion still requires configuring the remaining external secrets for Google Calendar, Stripe, and email delivery, then deploying and smoke-testing the Vercel runtime.
