# Global Assistant Security And RLS

## Security posture

The Global Assistant can eventually operate most of Quimera. That makes permission, preview, audit, and tenant isolation non-negotiable.

GA1 centralizes checks in `globalAssistantPermissionService.ts` and keeps storage in memory. GA2 adds Supabase tables, RLS, grants, and repository adapters before assistant state is wired into the live runtime.

## Runtime checks in GA1

- Admin actions are blocked outside Owner/Super Admin/system mode.
- User mode cannot execute admin actions.
- Required services are checked against tenant active services.
- Required features are checked against tenant feature flags.
- Mutating actions must support preview.
- High and critical actions require confirmation.
- Admin memory is blocked in user mode.
- System memory requires system or admin mode.
- Tenant mismatch blocks memory access outside admin mode.
- User mismatch blocks memory access outside admin mode.
- Project mismatch blocks memory access outside admin mode.
- Project-scoped actions require `projectId`.

## Supabase RLS implemented in GA2

Assistant tables include scoped columns and policies:

- `tenant_id`
- `user_id`
- `project_id`
- `scope`
- `module`
- `mode` where action/admin state needs it

Implemented policy expectations:

- `assistant_memories`: read/write own user memory; tenant/project memory only for authorized tenant/project members; admin memory only for Owner/Super Admin.
- `assistant_memory_items`: inherit parent memory access.
- `assistant_conversations`: user can access own conversations; tenant admins can access tenant project conversations when allowed.
- `assistant_messages`: inherit conversation access.
- `assistant_tasks`: user can access own tasks and project tasks they are authorized for.
- `assistant_actions`: read by authorized project/tenant/admin users; insert through trusted server paths when actions are applied.
- `assistant_context_snapshots`: scoped to the same user/tenant/project boundaries as the task/conversation.
- `assistant_admin_events`: admin mode only.

Implementation details:

- Migration: `supabase/migrations/20260626120743_global_assistant_memory_store.sql`
- Helper functions are `SECURITY INVOKER` and pin `search_path`.
- Policies are operation-specific; no `FOR ALL` assistant policies.
- Policies target `TO authenticated`; there are no anon grants on `assistant_*` tables.
- `assistant_runtime_events` records runtime/audit events under the same scoped access model.

Local verification on 2026-06-26:

- `supabase db reset --local --no-seed` applied all migrations including GA2.
- Catalog query confirmed all 12 `assistant_*` tables have RLS enabled.
- `supabase db advisors --local --output json` returned no findings containing `assistant_*` or `global_assistant_*`.

Known non-GA advisory surfaced during verification:

- Supabase reports `public.public_stores` has policies but RLS is disabled (`policy_exists_rls_disabled` / critical RLS advisory).
- Suggested SQL from the advisor is `ALTER TABLE public.public_stores ENABLE ROW LEVEL SECURITY;`.
- This was not applied in GA2 because enabling RLS without reviewing/adding the intended public storefront policies could block or change storefront access.

## Negative tests required for GA2

- User A cannot read User B memory.
- Tenant A cannot read Tenant B memory.
- Project A cannot read Project B memory.
- Normal user cannot read admin memory.
- Normal user cannot plan admin mutation.
- Project mutation without `projectId` is blocked.
- Critical action without confirmation is blocked.
- Email send without readiness is blocked once the email connector exists.

## Secrets and PII

Never store or send these through model prompts:

- `SUPABASE_SERVICE_ROLE_KEY`
- Stripe secret keys or webhook secrets
- Provider API keys
- OAuth refresh tokens
- SMTP credentials
- Raw payment data

Use data minimization:

- Summarize raw customer conversations before memory ingestion.
- Store source references instead of duplicating large PII payloads.
- Redact secrets in audit metadata.
- Keep admin memory separate from user/project memory.

## Audit requirements

Every planned action should have an action log. Every applied action should add:

- `beforeSnapshot`
- `afterSnapshot`
- `diff`
- `confirmedAt` when required
- `modelUsed`
- `toolUsed`
- status
- error if failed

Rollback-supported actions must store enough before-state to undo safely.
