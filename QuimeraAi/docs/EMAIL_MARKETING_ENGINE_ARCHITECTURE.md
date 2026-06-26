# Email Marketing Engine Architecture

## Canonical source of truth

Email Marketing is project scoped. The canonical runtime state lives in Supabase:

- `email_settings`: sender identity, provider readiness, domain state, compliance, tracking, and branding.
- `email_campaigns`: campaign drafts, send metadata, source metadata, AI review flags, and stats.
- `email_audiences`: project audiences, static members, source maps, and AI review flags.
- `email_automations`: automation definitions, trigger metadata, reviewed workflow steps, and runtime stats.
- `email_logs`: canonical delivery log for marketing, transactional, test, and cross-module email intents.
- `email_suppressions`: unsubscribe, bounce, complaint, manual, and invalid-address suppression state.
- `email_outbox`: idempotent queued sends.
- `email_events`: provider and Quimera event ingestion.

No provider secret is stored in client tables. `email_settings.api_key_configured` is a readiness flag only. Actual provider keys stay in server runtime variables such as `RESEND_API_KEY` and `SENDGRID_API_KEY`. Provider, domain, and webhook readiness are synced through authenticated `email-api` actions, not by client-side toggles.

## Runtime entry points

- Dashboard settings use `useEmailSettings` and the new Email Hub settings tab.
- Campaign listing, draft creation, visual-editor saves, audience assignment, status changes, duplication, deletion, test sends, and final sends use `services/email/emailMarketingEngineService.ts` through private `email-api` actions. The User Email Hub and User AI Studio no longer write campaign drafts to legacy per-project collections.
- Automation listing, draft creation, updates, duplication, deletion, activation toggles, and AI-generated automation drafts use canonical `email_automations` through `email-api`. AI-generated automations keep `needsReview` and `sendMode = draft_only` until reviewed.
- Audience mutations use `services/email/emailAudienceService.ts` through `emailMarketingEngineService` and private `email-api` actions. User Email Hub audience listing, manual create/delete, CSV import, manual member add/remove, cross-module add-to-audience, and AI Studio audience drafts all use this canonical path. The service forces `project_id/store_id` from the authenticated project, normalizes static members, dedupes by email/source IDs, and never trusts client-supplied project scope.
- Provider sends are executed through the canonical `email_outbox` processor. The worker resolves the project configured provider from a server-side registry and blocks provider mismatches instead of falling back to the wrong provider.
- `supabase/functions/email-api/index.ts` can enqueue, test, send immediate batches, process scoped outbox rows, ingest events, return analytics, dispatch reviewed transactional emails, and unsubscribe.
- `email-api` owns settings writes that affect sensitive readiness. The client can edit sender, branding, compliance, tracking, marketing toggles, transactional toggles, and outbox rate-limit policy, while provider secret/domain/webhook readiness is verified server-side. Provider domain creation and DNS validation also run through `email-api` so provider keys never leave server runtime.
- `api/email/jobs/run.ts` is a `CRON_SECRET` protected Vercel Function that processes due outbox rows.
- Public unsubscribe links render `/email/unsubscribe` and validate `projectId + email + emailLogId` before suppressing.
- Provider events enter through `email-api` action `ingestEmailEvent` or native provider webhook payloads and require server-side verification. Resend/Svix headers are verified natively when the secret uses the `whsec_` format, SendGrid Event Webhook requests are verified with `SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY`/`SENDGRID_WEBHOOK_PUBLIC_KEY`, and Quimera/internal webhooks can use the existing bearer/header/HMAC path.
- `BusinessBlueprint.emailMarketingBlueprint` declares draft campaigns, draft automations, sender/readiness, consent rules, analytics events, and cross-module mappings.
- Cross-module server paths use `services/email/emailCrossModuleDispatcher.ts` so modules submit transactional intent without owning provider secrets, readiness checks, or duplicate-send rules.
- Browser/client modules use `services/email/emailModuleIntentService.ts` to persist draft/review-only email intent metadata, and `services/email/emailIntentClient.ts` only for reviewed transactional dispatch through `email-api`.
- The Email Hub Review Queue reads project-scoped canonical `email_logs` blocked by `needs_review` and local draft campaigns marked `needsReview`/`draft_only`. It supports deep links filtered by `projectId`, `sourceModule`, `sourceEntityType`, and `sourceEntityId` so entity surfaces can open the exact review scope. It can only approve transactional logs after a user provides reviewed content; approval calls `emailIntentClient` and therefore still passes through `email-api`, module opt-in, readiness, suppression, and idempotency gates.
- Automation events use `services/email/emailAutomationRuntime.ts` to ingest the event, match active reviewed automations, evaluate supported reviewed conditions, apply safe audience tag actions, queue reviewed email steps, and leave final delivery to the canonical outbox processor.
- User Email Hub campaign, audience, automation, and analytics counters read canonical Supabase tables; local legacy per-project collections are no longer the source of truth for the user Email Hub.

## Readiness gates

Marketing sends are blocked unless all of these are true:

- Provider is explicitly configured in project email settings.
- Server-side provider secret exists.
- Sender name and sender email are configured.
- Unsubscribe footer is enabled.
- Suppression checks are enabled.
- Campaign does not have `generated_by_ai && needs_review`.
- Campaign status is not already final.

Test and transactional sends still require provider and sender readiness. Transactional sends do not require marketing unsubscribe.

Transactional dispatch also requires a module-level opt-in in `email_settings.transactional`. The dispatcher records a skipped canonical log when a caller has provider readiness but lacks its explicit module switch. Current switches include Ecommerce order flows, Appointments, Restaurants, CRM/Leads, ChatCore, Realty, Website Builder, and AI Studio reviewed emails.

## Audience and consent rules

Audience resolution is deduped by normalized email and remains project scoped. EM1 reads candidates from:

- campaign custom recipients,
- `email_audiences.static_members`,
- consented CRM/leads records,
- consented ecommerce customers,
- consented appointment participants.

Suppressed recipients are removed before queueing. Invalid recipients are counted and excluded.

## AI guardrails

AI-created campaigns, audiences, and automations are persisted as drafts with:

- `generated_by_ai = true`,
- `needs_review = true`,
- `safe_to_edit = true`,
- source metadata pointing to AI Studio,
- draft/send blockers in readiness metadata.

AI Studio must not activate automations or send campaigns without explicit human review.

The cross-module dispatcher also blocks any payload metadata marked `generatedByAI`, `needsReview`, `safeToEdit = false`, or `sendMode = draft_only`, even if the caller imports the service directly instead of using `email-api`.

If an existing skipped log was created only by the review gate, the dispatcher may resume that same idempotency key only when the next payload is explicitly reviewed (`generatedByAI = false`, `needsReview = false`, `sendMode = reviewed`). Other terminal skipped reasons remain terminal.

`GlobalAiAssistant` can create or update email campaigns only as AI Studio drafts. It does not write provider secrets, readiness verification flags, or domain/webhook verification state.

## Delivery and idempotency

Campaign sends first resolve the audience, create one `email_logs` row per recipient, then upsert one `email_outbox` row per recipient using:

```txt
campaign:<campaignId>:recipient:<normalizedEmail>
```

Retries reuse the same idempotency key. Already sent logs are skipped, not resent.

Transactional emails use caller-provided idempotency keys and the same canonical log and outbox services. `emailCrossModuleDispatcher` records explicit skipped logs for invalid recipients, disabled flows, readiness blockers, or draft/AI-review gates.

The outbox processor claims queued rows with a conditional `status = queued` update before sending. It rechecks project readiness, rechecks suppression for marketing rows, skips already-sent idempotency keys, updates `email_logs`, and records provider message IDs on the outbox row. Per-run and per-minute rate policies can be supplied by server runtime or project settings metadata (`email_settings.metadata.emailRateLimits`); provider 429/retry-after responses defer rows by updating `scheduled_at` instead of burning retries or duplicate-sending.

## Analytics

`services/email/emailAnalyticsService.ts` aggregates canonical runtime state from `email_logs`, `email_outbox`, and `email_events`.

The user Email Hub analytics tab still preserves campaign-level charts, but now also shows:

- outbox queued, due, locked, skipped, failed, and sent counts,
- provider event counts by event type,
- cross-module source summaries for Ecommerce, Appointments, ChatCore, Website Builder, AI Studio, Realty, and other sources that write `source_module`,
- journey attribution for automations, automation step metrics, attributed revenue from order metadata, and per-recipient timelines merged from canonical logs and provider events,
- recent canonical logs and provider events for debugging.

## Edge function security

`email-api` is configured with `verify_jwt = false` because it owns both public and private actions:

- private actions require a valid Supabase user bearer token and project ownership or tenant membership,
- unsubscribe is public but validates the target email log before inserting suppression,
- webhook ingestion requires `EMAIL_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`, or a valid SendGrid Event Webhook ECDSA signature.

## EM1 implemented scope

- Additive Supabase migration for readiness metadata, source metadata, suppression, outbox, and provider events.
- Canonical service layer under `services/email`.
- Email API rewritten to delegate sends, readiness, unsubscribe, and events to the canonical engine.
- Shared outbox processor for marketing and transactional email delivery.
- Canonical audience service for project-scoped create/update/delete plus idempotent static member add/remove.
- Safe automation runtime for active reviewed automations. It requires marketing readiness, consent, suppression checks, reviewed email steps, deterministic idempotency, supported condition evaluation, and scoped audience tag actions before queueing automation email steps.
- Automation runtime supports reviewed multi-path journeys with `trueBranchStepId`, `falseBranchStepId`, terminal `end/stop/exit` targets, safe traversal limits to prevent loops, and `delayType = wait-until/until-time` scheduling for absolute timestamps or next time-of-day waits.
- Server-side provider registry for Resend and SendGrid, with runtime mismatch protection, provider readiness probes, provider-domain provisioning/validation for Resend and SendGrid, SendGrid/Resend domain status sync, and provider rate-limit deferral.
- Native Resend/Svix webhook signature verification, native SendGrid Event Webhook ECDSA verification, SendGrid batch event ingestion, and existing internal HMAC webhook verification.
- Vercel cron at `/api/email/jobs/run` for due outbox processing.
- Cross-module dispatcher for safe transactional intent from project modules.
- Stripe/Ecommerce paid-order, merchant notification, payment-failed, and low-stock emails now route through the canonical dispatcher and outbox.
- Ecommerce email helpers no longer call provider transports directly when canonical dispatcher context is missing; they can render and log a queued intent, but provider delivery requires `emailCrossModuleDispatcher` and the canonical outbox.
- Appointments email cron now renders appointment flows but sends through the canonical dispatcher/outbox, preserving existing logs and adding canonical source/idempotency metadata.
- Restaurants Supabase runtime now has nullable `project_id` scope on restaurants, reservations, and analytics events. Public reservation creation queues a canonical `restaurant_reservation_received` email intent only when a restaurant is linked to a project and Restaurant transactional emails are explicitly enabled in `email_settings.transactional`.
- CRM/Leads, ChatCore, Realty, Website Builder, and AI Studio now share canonical draft/review metadata for email intent. These integrations persist `needsReview`, `sendMode = draft_only`, source metadata, consent metadata, and idempotency data without sending.
- Reviewed cross-module sends are blocked unless the matching transactional module toggle is enabled. Missing toggles produce skipped canonical logs instead of provider calls.
- Email Hub Review Queue for project-scoped transactional intents blocked by review and campaign drafts that still need human review.
- Entity-level review deep links from CRM lead records, ChatCore/Social Inbox conversations, appointment details, Realty lead inquiries, and restaurant reservation cards into the filtered Email Hub Review Queue.
- Private `email-api` actions for canonical transactional dispatch and analytics.
- Canonical analytics service and Email Hub pipeline panel over logs, outbox, events, and source modules.
- Analytics attribution for automation journeys, automation steps, revenue-bearing order metadata, and per-recipient delivery/event timelines.
- Email Hub settings tab for provider, server-side readiness sync, provider domain provisioning/validation, copyable DNS verification records, sender, domain, compliance, tracking, marketing enablement, outbox rate-limit policy, branding, and transactional toggles for Ecommerce, Appointments, Restaurants, CRM/Leads, ChatCore, Realty, Website Builder, and AI Studio.
- Provider readiness sync preserves sanitized DNS verification records from Resend/SendGrid and the project Email Settings domain panel displays copyable DNS rows when the provider returns them.
- Public unsubscribe route and page.
- BusinessBlueprint Email Marketing V2 contract.
- AI Studio draft/needsReview safeguards for generated email assets.
- Audience static member persistence aligned to canonical `static_members`.
- User Email Hub audience CRUD, campaign CRUD, automation CRUD, campaign visual-editor saves, automation email-step linking, canonical email-log stats, and AI-generated campaign/audience/automation drafts migrated from legacy per-project collections to canonical `email-api` actions.
- Admin Email Hub legacy `adminEmail*` collections are explicitly split as a platform-level template library. Assets created there are marked `platformTemplate`, `templateScope = platform_template`, `sendMode = template_only`, `needsReview = true`, and provider delivery is blocked; project sends and tests must happen from a real project Email Hub through `email-api`.

## Remaining phases

No EM1 architecture gaps remain in this document. Future work should be tracked as enhancements rather than required Email Marketing Engine canonicalization.
