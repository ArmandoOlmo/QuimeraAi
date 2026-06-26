# ChatCore Appointments Integration

ChatCore creates appointments through the canonical Appointments Engine contract. New booking flows must not write to `users/{userId}/projects/{projectId}/appointments`.

## Canonical path

- UI entry points:
  - `components/chat/ChatCore.tsx`
  - `components/ChatbotWidget.tsx`
  - `components/chat/EmbedWidget.tsx`
  - `components/dashboard/ai/ChatSimulator.tsx`
- Service/API contract:
  - `createAppointmentFromChat` in `services/appointments/appointmentEngineService.ts`
  - public widget appointment endpoints in `api/widget/[project]/...`

## Required metadata

ChatCore booking writes must include:

- `source = chatbot`
- `source_module = chatcore`
- `source_component = ChatCore`
- `source_conversation_id` when available
- `generated_by_ai` when the appointment came from an AI-confirmed flow
- `bookingChannel` in metadata
- locale and transcript metadata when available

## Lead behavior

The Appointments Engine owns create-or-link lead behavior. ChatCore and embeds should not create a second lead after booking succeeds.

## Guardrails

- Check availability server-side before creating a booking.
- Preserve the conversation transcript in appointment/lead metadata when available.
- If booking is unavailable or missing required fields, ChatCore should capture a lead or ask for the missing information.
- Manual confirmation rules must be respected by leaving public or AI-created bookings in review when configured that way.
