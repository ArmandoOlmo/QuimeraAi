# Global Assistant Security And RLS

## Security posture

The Global Assistant can eventually operate most of Quimera. That makes permission, preview, audit, and tenant isolation non-negotiable.

GA1 centralizes checks in `globalAssistantPermissionService.ts` and keeps storage in memory. GA2 must add Supabase tables and RLS before assistant state is persisted.

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

## Required Supabase RLS for GA2

Assistant tables must include scoped columns and policies:

- `tenant_id`
- `user_id`
- `project_id`
- `scope`
- `module`
- `mode` where action/admin state needs it

Minimum policy expectations:

- `assistant_memories`: read/write own user memory; tenant/project memory only for authorized tenant/project members; admin memory only for Owner/Super Admin.
- `assistant_memory_items`: inherit parent memory access.
- `assistant_conversations`: user can access own conversations; tenant admins can access tenant project conversations when allowed.
- `assistant_messages`: inherit conversation access.
- `assistant_tasks`: user can access own tasks and project tasks they are authorized for.
- `assistant_actions`: read by authorized project/tenant/admin users; insert through trusted server paths when actions are applied.
- `assistant_context_snapshots`: scoped to the same user/tenant/project boundaries as the task/conversation.
- `assistant_admin_events`: admin mode only.

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
