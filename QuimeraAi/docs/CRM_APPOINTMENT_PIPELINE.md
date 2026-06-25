# CRM Appointment Pipeline

Appointments link into CRM through `services/appointments/appointmentLeadPipelineService.ts`.

## Responsibilities

The pipeline should:

- create or link a lead for public bookings, ChatCore bookings and lead-driven appointments
- record appointment activities on the linked lead
- create follow-up tasks after completed appointments
- attach conversation transcript metadata when available
- keep appointment creation resilient when CRM side effects fail

## Idempotency

Appointment creation may be retried by public widgets, ChatCore or API clients. The pipeline must use appointment IDs, source metadata, correlation IDs and idempotency keys to avoid duplicate leads, activities and tasks.

## Event contract

Canonical appointment lifecycle events are recorded through `appointmentEventService` and stored in appointment metadata:

- `appointment_requested`
- `appointment_confirmed`
- `appointment_cancelled`
- `appointment_completed`
- `appointment_no_show`
- `appointment_email_queued`
- `appointment_email_sent`
- Google Calendar sync/import events

The same metadata stream feeds:

- CRM activity context
- Email Marketing logs
- dashboard analytics
- source mix reporting
- Ecommerce payment status reporting

## Failure behavior

CRM, Email Marketing and Analytics side effects must not make the appointment write fail. Failures are stored as warnings or delivery metadata so operators can review and rerun follow-up jobs.

## AI Prep contract

`AppointmentDetailDrawer` and `AIPreparationPanel` should receive linked lead data when available. AI preparation may use:

- participant details
- linked lead profile
- lead activities
- lead tasks
- appointment notes
- conversation transcript
- previous appointment history

The panel must degrade safely when no lead exists.
