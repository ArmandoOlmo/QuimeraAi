# Global Assistant QA

## Automated coverage added in GA1

Run:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts
```

Coverage:

- Memory scope validation.
- User/project/admin memory isolation.
- Admin memory inaccessible in user mode.
- Critical actions require confirmation.
- Admin actions blocked for normal users.
- Mutating actions require preview.
- Service and feature gates block unavailable modules.
- Runtime creates task, loads memory, selects model, builds preview plan, and writes audit events.
- Runtime can confirm previewed plans, apply actions with registered handlers, fail safely without connectors, create task memory after apply, and roll back supported actions with snapshots.
- Project-scoped actions are blocked without active project context.
- OpenRouter model role metadata supports tool-loop checks.

## Automated coverage added in GA2

Run:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts tests/utils/globalAssistantMemoryMigration.test.ts
```

Coverage:

- Supabase memory row mappers preserve prefixed assistant IDs and snake/camel fields.
- Supabase memory adapter can upsert, list, and delete scoped memories.
- Supabase task, action, runtime event, and context repositories map runtime contracts into assistant tables.
- Migration creates all 12 `assistant_*` tables and enables RLS.
- Migration uses operation-specific authenticated policies, no `FOR ALL`, no `auth.role()`, and no `user_metadata`.
- Migration revokes anon/authenticated defaults before granting scoped authenticated access.
- Helper functions use `SECURITY INVOKER` and explicit `search_path`.

Last focused run on 2026-06-26:

- 6 files passed.
- 21 tests passed.

## Automated coverage added in GA4 entry bridge

Run:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts tests/utils/globalAssistantMemoryMigration.test.ts
```

Coverage:

- Dashboard prompts route to the Global Assistant by default, including website creation, image generation, and CRM/lead requests.
- Explicit AI Studio open/create requests stay on the AI Studio surface.
- Dashboard entry payloads are typed, trimmed, source-tagged, and auto-submit by default.
- Command palette search returns project, module, admin, action, and freeform assistant-request commands with service/admin/project filters.
- The Global Assistant no longer fast-paths website creation with empty arguments.
- Command Center context includes the active project, dashboard surface, enabled services, feature flags, and a bounded project list.
- Mutating or confirmation-required dashboard requests produce an Operating Layer preview and do not continue into legacy execution.
- Blocked plans surface blockers in the assistant drawer.

## GA1 manual checks

- Confirm no dashboard UI behavior changed.
- Confirm existing AI Studio still receives dashboard initial prompts.
- Confirm ChatCore, ChatbotWidget, SocialChatInbox, LandingChatbotWidget, and Email AI Studio are not replaced or merged.
- Confirm `docs/GLOBAL_ASSISTANT_ARCHITECTURE.md` describes each existing chat surface.
- Confirm `docs/CHAT_SURFACES_INVENTORY.md` is updated when a new chat, assistant, simulator, inbox, or module AI surface is added.
- Confirm no Supabase migration was added in GA1.
- Confirm no module connector applies changes yet.

## GA2 local Supabase checks

Run:

```bash
supabase db reset --local --no-seed
supabase db query --local --output json "select c.relname as table_name, c.relrowsecurity as rls_enabled, count(p.polname)::int as policies from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_policy p on p.polrelid = c.oid where n.nspname = 'public' and c.relname like 'assistant_%' and c.relkind = 'r' group by c.relname, c.relrowsecurity order by c.relname;"
supabase db advisors --local --output json
```

Verified on 2026-06-26:

- `supabase db reset --local --no-seed` completed and applied `20260626120743_global_assistant_memory_store.sql`.
- All 12 `assistant_*` tables returned `rls_enabled: true`.
- Policy counts were nonzero for every `assistant_*` table.
- Filtered advisors returned no findings containing `assistant_*` or `global_assistant_*`.
- Supabase CLI reported a newer version is available (`v2.108.0`; installed `v2.106.0`).

Non-GA security advisory to track separately:

- `public.public_stores` has RLS disabled while policies exist. Do not auto-enable without reviewing public storefront access policies.

## Future manual QA

When GA4-GA10 land, manually verify:

- Dashboard request: "crea un website para X".
- Dashboard request: "genera una imagen para el hero".
- Dashboard request opens the Global Assistant drawer instead of only opening AI Studio.
- Cmd/Ctrl+K opens the global command palette from dashboard, editor, and module pages.
- Command palette can open modules, open a project, and send freeform/action requests to the Global Assistant drawer.
- Mutating dashboard request displays an Operating Layer plan and does not apply changes without confirmation.
- Explicit "Abre AI Studio" still opens AI Studio.
- Requests that mention "chat" resolve the correct owner surface before planning: Global Assistant, ChatCore public runtime, Chatbot Engine config/test, landing chatbot, module assistant, or human support chat.
- Switch project by chat.
- Edit website section by chat.
- Create product by chat.
- Create email campaign draft by chat.
- Create appointment by chat.
- Review leads by chat.
- Create Bio Page by chat.
- Train ChatCore by chat.
- Run analytics report by chat.
- Open Super Admin mode as owner.
- Attempt admin action as normal user.
- Review memory panel.
- Delete user memory.
- Continue an unfinished task.
- Confirm action preview.
- Roll back a supported action.

## Build and audit commands

Recommended for GA1-GA2:

```bash
npm run test:run -- tests/services/globalAssistant*.test.ts tests/utils/globalAssistantMemoryMigration.test.ts
npm run build
```

For UI PRs later:

```bash
npm run ds:audit
npm run type-check
```

If repo-wide `type-check` has pre-existing noise, run touched-file type checks and document the baseline.
