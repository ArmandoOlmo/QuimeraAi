# Global Assistant Memory

## Purpose

Global Assistant memory is operational state, not raw chat history. It should help the assistant understand user preferences, tenant/workspace configuration, project state, module readiness, session context, task progress, audit history, and admin context.

GA1 defines the contract and an in-memory service. GA2 adds the Supabase persistence layer for the same contract with strict RLS, without switching the live runtime away from the in-memory adapter yet.

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

## Supabase persistence added in GA2

Migration:

- `supabase/migrations/20260626120743_global_assistant_memory_store.sql`

Runtime adapter:

- `services/globalAssistant/globalAssistantSupabaseStore.ts`

GA2 adds these tables:

- `assistant_memories`
- `assistant_memory_items`
- `assistant_conversations`
- `assistant_messages`
- `assistant_tasks`
- `assistant_actions`
- `assistant_runtime_events`
- `assistant_context_snapshots`
- `assistant_project_summaries`
- `assistant_module_summaries`
- `assistant_user_preferences`
- `assistant_admin_events`

Assistant-owned IDs are stored as prefixed `TEXT` IDs (`asst_mem_*`, `asst_task_*`, `asst_action_*`) to match the TypeScript runtime contract. User, tenant, and project references remain UUID foreign keys.

`utils/compatData.ts` includes assistant collection aliases and JSON fallback columns so the generic compatibility layer can safely handle the new tables.

## RLS behavior

- Users can read/write their own `user` memory.
- Tenant members can read tenant memory only for their tenant, according to role.
- Project members can read project/module/task/action memory only for projects they can access.
- Admin memory is only available in Owner/Super Admin/system mode.
- Cross-tenant reads must return no rows.
- Cross-project reads must return no rows unless an explicit all-project mode exists and the user has permission.
- Users should later be able to view and delete personal memory, subject to retention rules for audit logs.

GA2 implements these rules through `SECURITY INVOKER` helper functions with explicit `search_path`, per-table RLS, scoped `TO authenticated` policies, and no anon table grants.

## Sensitive data

Memory must not store:

- Provider API keys.
- Stripe secrets.
- Supabase service role keys.
- OAuth refresh tokens.
- Raw credentials.
- Full raw customer conversations unless explicitly summarized and scoped.

Use summaries and source references for sensitive modules. Store enough to explain context and continue tasks, not enough to leak private data across models or tenants.
