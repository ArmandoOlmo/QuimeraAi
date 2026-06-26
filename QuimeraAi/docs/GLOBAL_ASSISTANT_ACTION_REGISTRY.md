# Global Assistant Action Registry

## Purpose

The action registry is the list of operations the Global Assistant may plan. It is not the execution layer. GA1 registers schemas, safety levels, permissions, service gates, feature gates, preview requirements, rollback support, and idempotency strategy.

Future connector PRs must attach real `preview`, `validate`, and `execute` implementations that call canonical module services.

## Modules covered in GA1

- Project
- Website Builder
- Media AI
- Ecommerce
- Storefront Builder
- CRM/Leads
- Email Marketing
- Appointments
- Restaurants
- Realty
- Bio Page
- ChatCore
- Analytics
- Finance
- Admin/Owner

## Safety levels

| Level | Meaning | Confirmation |
| --- | --- | --- |
| `low` | Navigation, search, summaries, tests, read-only analysis. | Usually no. |
| `medium` | Draft generation or export-like work. | Preview if a draft or artifact is created. |
| `high` | Mutates project/module/user/tenant data. | Always yes. |
| `critical` | Publishing, sending, pricing, inventory, admin, billing, deploy-like or public-state changes. | Always yes. |

## Required invariants

- Mutating actions must support preview.
- High and critical actions require confirmation.
- Admin actions require Owner/Super Admin/system mode.
- Project-scoped actions must include a project context.
- Required services must use `PlatformServiceId`.
- Required features must use the current tenant feature flag vocabulary.
- Every planned action must be audit logged.
- Future applied actions must write before/after snapshots where rollback is supported.

## Current registry examples

- `create_email_campaign`: high, emailMarketing service, emailMarketing feature, preview and confirmation required.
- `send_email_campaign`: critical, emailMarketing service, no rollback, confirmation required.
- `update_price`: critical, ecommerce service, ecommerce feature, confirmation required.
- `publish_website`: critical, rollback supported, confirmation required.
- `deploy_chatbot_to_surface`: critical, chatbot service, confirmation required.
- `update_service_availability`: critical, admin permission, confirmation required.

## Connector contract for future PRs

Each module connector should expose:

- `getContext(projectId)`
- `search(query)`
- `previewAction(action)`
- `applyAction(action)`
- `getReadiness(projectId)`
- `updateMemory(projectId)`

Connectors must call existing canonical services. The assistant must not mutate random client state directly.

## Module guardrails

- Website connector must respect `userModified` and `lockedFromRegeneration`.
- Email connector must create drafts with review gates and must not send without readiness and explicit confirmation.
- Ecommerce connector must require confirmation for prices, discounts, inventory, and public product state.
- Appointments connector must validate availability and participant data before apply.
- ChatCore connector must separate visitor conversations from owner/admin assistant memory.
- Admin connector must always use admin mode and audit every request.
