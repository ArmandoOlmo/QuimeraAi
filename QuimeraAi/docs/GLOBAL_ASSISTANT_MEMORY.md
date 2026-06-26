# Global Assistant Memory

## Purpose

Global Assistant memory is operational state, not raw chat history. It should help the assistant understand user preferences, tenant/workspace configuration, project state, module readiness, session context, task progress, audit history, and admin context.

GA1 defines the contract and an in-memory service. GA2 should persist the same contract in Supabase with strict RLS.

## Scopes

| Scope | Stores | Required boundaries |
| --- | --- | --- |
| `user` | Language, tone, preferred formats, frequent actions, model preferences, design likes/dislikes. | Requires `userId`. Not visible to other users. |
| `tenant` | Workspace identity, users, roles, plan, services, feature flags, branding, limits. | Requires `tenantId`. Tenant-isolated. |
| `project` | Business profile, brand profile, website/storefront/ecommerce/email/chatbot/bio/analytics state, decisions, blockers. | Requires `projectId`. Project-isolated. |
| `module` | Module-specific facts such as website edits, product readiness, email review state, ChatCore knowledge, finance summaries. | Requires `projectId` and `module`. |
| `session` | Active project, open module, selected section/entity, draft changes, pending confirmations, last command. | Requires `expiresAt`. |
| `task` | Request, intent, current step, plan, draft changes, confirmations, result, errors. | Requires a task source entity. |
| `admin` | Tenants, plans, feature flags, service availability, global prompts, errors, AI usage, health reports. | Requires admin mode and `tenantId` when tenant scoped. |
| `system` | System-level operational facts. | Requires system or admin mode. |

## GA1 service rules

`GlobalAssistantMemoryService` enforces:

- `scope` is required.
- `source`, `sourceEntityType`, and `sourceEntityId` are required.
- `tenant` and `admin` memory require `tenantId`.
- `project` and `module` memory require `projectId`.
- `module` memory requires `module`.
- `user` memory requires `userId`.
- `session` memory requires `expiresAt`.
- `importance` must be between `0` and `1`.
- Queries filter expired memory unless `includeExpired` is true.
- Queries run through `checkMemoryAccess`.

## Supabase target tables

GA2 should add:

- `assistant_memories`
- `assistant_memory_items`
- `assistant_conversations`
- `assistant_messages`
- `assistant_tasks`
- `assistant_actions`
- `assistant_context_snapshots`
- `assistant_project_summaries`
- `assistant_module_summaries`
- `assistant_user_preferences`
- `assistant_admin_events`

## RLS expectations

- Users can read/write their own `user` memory.
- Tenant members can read tenant memory only for their tenant, according to role.
- Project members can read project/module/task/action memory only for projects they can access.
- Admin memory is only available in Owner/Super Admin/system mode.
- Cross-tenant reads must return no rows.
- Cross-project reads must return no rows unless an explicit all-project mode exists and the user has permission.
- Users should later be able to view and delete personal memory, subject to retention rules for audit logs.

## Sensitive data

Memory must not store:

- Provider API keys.
- Stripe secrets.
- Supabase service role keys.
- OAuth refresh tokens.
- Raw credentials.
- Full raw customer conversations unless explicitly summarized and scoped.

Use summaries and source references for sensitive modules. Store enough to explain context and continue tasks, not enough to leak private data across models or tenants.
