# Public Booking Widget

The public booking widget is the Website Builder entry point for canonical appointment requests.

## Runtime path

- Website section component: `components/AppointmentBooking.tsx`
- Renderer integration:
  - `components/PageRenderer.tsx`
  - `components/PublicWebsitePreview.tsx`
  - component registry and storefront renderer paths
- Public API:
  - `GET /api/widget/:projectId/availability`
  - `POST /api/widget/:projectId/appointments`
- Canonical service:
  - `createAppointmentFromPublicBooking`

## Booking flow

1. Load public availability from the widget API.
2. Select service/date/slot.
3. Collect required contact fields.
4. Submit to the public API.
5. API validates project, time range and conflicts server-side.
6. API creates a canonical `project_appointments` row.
7. Lead pipeline creates or links a CRM lead.
8. Email and analytics events are queued when configured.
9. Paid/deposit bookings receive an Ecommerce draft order and redirect to Stripe Checkout when payment readiness exists.

## Public API guardrails

- Public clients never write directly to `project_appointments`.
- Availability responses expose slots, not private appointment details.
- Conflict checks run on the server.
- Public booking records use `source = public_booking` and `source_module = website-builder`.
- Public bookings are reviewable by default unless business rules explicitly allow auto-confirmation.

## Payment guardrails

- Appointments create Ecommerce draft orders only when payment metadata is valid.
- Stripe Checkout Sessions are created server-side only.
- No appointment should be considered paid until the webhook reconciles the order and appointment.
