# Global Assistant Architecture

## Current scope

GA1 creates the platform contract for the Quimera Global Assistant as an AI Operating Layer. GA2 adds the Supabase persistence layer for memory, conversations, tasks, actions, runtime events, summaries, preferences, and admin events. GA4 starts moving the dashboard request input from AI-Studio-only routing to the Global Assistant entry path.

This work does not replace existing chats, does not add heavy UI, and does not apply real module mutations yet.

The current PR-level scope adds:

- `types/globalAssistant.ts` as the shared TypeScript contract.
- `services/globalAssistant/*` for context resolution, memory, intent routing, action registry, permission checks, execution planning, audit events, task tracking, project resolution, and OpenRouter model metadata.
- `services/globalAssistant/globalAssistantEntryBridge.ts` for dashboard-to-assistant entry routing and lazy-load-safe request handoff.
- `services/globalAssistant/globalAssistantSupabaseStore.ts` for injectable Supabase persistence repositories.
- `supabase/migrations/20260626120743_global_assistant_memory_store.sql` for `assistant_*` tables, RLS, grants, triggers, and helper functions.
- Preview-first execution plans with confirmation requirements for high and critical actions.
- Documentation for memory, actions, model routing, security/RLS, and QA.

## Existing chat surfaces

Quimera currently has several chat or assistant surfaces. They must remain conceptually separate so Global Assistant memory does not leak into visitor, module, or admin contexts.

| Surface | Current role | Global Assistant relationship |
| --- | --- | --- |
| `components/ui/GlobalAiAssistant.tsx` | Authenticated app assistant with app/project/admin context and tool execution. | Closest existing surface; GA1 formalizes the platform contract underneath it. |
| `components/dashboard/DashboardWelcome.tsx` | Dashboard command input. Submit/Enter now routes non-empty requests to the Global Assistant entry event; the explicit Web Design Studio button still opens AI Studio. | GA4 entry point for global operating requests while preserving the AI Studio creation surface. |
| `components/onboarding/AIWebsiteStudio.tsx` and `components/onboarding/hooks/useAIWebsiteStudio.ts` | AI Studio for initial business, website, and BusinessBlueprint generation. | Connector/source for project creation, not the daily operating assistant. |
| `components/chat/ChatCore.tsx` | Visitor/customer chatbot runtime with lead capture, ecommerce, appointments, voice, and knowledge. | Operated by Global Assistant only through ChatCore connector actions; raw visitor memory stays separate. |
| `components/ChatbotWidget.tsx` and `components/chat/EmbedWidget.tsx` | Public/project website wrappers for ChatCore. | Public widget context must not inherit owner/admin assistant memory. |
| `components/dashboard/ai/ChatSimulator.tsx` | Dashboard test harness for ChatCore behavior. | Test surface for ChatCore, not a global operating assistant. |
| `components/dashboard/ai/SocialChatInbox.tsx` and `components/chat/hooks/useWebChatConversation.ts` | Customer conversation inbox and web conversation persistence. | Conversation summaries may become project memory later, but raw inbox data is not global assistant chat history. |
| `components/LandingChatbotWidget.tsx` and `components/dashboard/admin/LandingChatSimulator.tsx` | Public Quimera.ai landing chatbot and admin simulator. | Platform marketing chatbot; separate from tenant/project assistant. |
| `components/dashboard/email/email-hub/views/AIStudioTab.tsx` and `hooks/useUserAIEmailStudio.ts` | User Email Hub AI Studio for draft campaigns, audiences, and automations. | Email module connector; it keeps review-gated email invariants. |
| `components/dashboard/seo/SEOAiAssistant.tsx` | SEO-specific assistant with preview/apply. | Module-specific generator; Global Assistant can route into it later. |
| `components/cms/ContentCreatorAssistant.tsx`, `components/ui/AIContentAssistant.tsx`, `components/dashboard/admin/AppContentCreatorAssistant.tsx`, `components/dashboard/agency/AgencyContentCreatorAssistant.tsx` | CMS/editor/admin/agency content assistants. | Module or role-specific content tools, not shared global chat memory. |
| `components/dashboard/admin/AIContentStudio.tsx` and `components/dashboard/admin/AINewsStudio.tsx` | Super Admin content/news studios. | Admin-mode connectors only. |
| `hooks/useSupportChat.ts` | Human agency/client support chat backed by support tables. | Not an AI operating assistant. |

Rule: Global Assistant can orchestrate these surfaces, open them, or create drafts through their canonical services. It must not merge their raw conversation state into global memory without an explicit scoped summary.

## Runtime layers

GA1 introduces these layers:

- `globalAssistantContextResolver`: creates an `AssistantContextSnapshot` from user, tenant, active route, active project, admin mode, selected entity, and surface metadata.
- `globalAssistantEntryBridge`: classifies dashboard requests, keeps explicit AI Studio opens on the AI Studio surface, and dispatches typed Global Assistant entry payloads through `quimera:global-assistant-entry` with a `localStorage` fallback.
- `globalAssistantMemoryService`: validates and queries segmented memory through an adapter. GA1 uses an in-memory adapter; GA2 adds an injectable Supabase adapter and RLS-backed tables.
- `globalAssistantIntentRouter`: returns structured GA1 intent output. It is intentionally rule-based until the OpenRouter structured tool loop is added.
- `globalAssistantActionRegistry`: declares module actions, schemas, service gates, feature gates, safety level, preview support, rollback support, and required permissions.
- `globalAssistantPermissionService`: centralizes user/admin mode checks, service availability checks, feature flag checks, memory access checks, and project-context checks.
- `globalAssistantExecutionEngine`: converts intent and action definitions into a preview-first `AssistantExecutionPlan`.
- `globalAssistantAuditService`: records action logs and runtime events in memory for GA1; GA2 adds Supabase repositories for durable action/event logs.
- `globalAssistantTaskService`: creates resumable task records in memory for GA1; GA2 adds a Supabase task repository.
- `globalAssistantRuntime`: coordinates memory loading, intent routing, model selection, execution planning, task creation, and audit events.

## Execution flow

GA4 dashboard entry handoff:

1. Dashboard request submit dispatches a Global Assistant entry payload unless the user explicitly asks to open/use AI Studio.
2. The authenticated app assistant consumes the entry event, opens the drawer, and processes the request in the same chat/tool pipeline as manual assistant input.
3. Website creation no longer uses the old empty-argument fast path; model/tool execution must provide `businessName`, `industry`, and `description` before headless generation.

GA1-GA2 planning flow:

1. Build context snapshot.
2. Load relevant memory for that context.
3. Route request into structured intent.
4. Select model role metadata.
5. Resolve action candidates from registry.
6. Check permissions, service availability, feature flags, and project context.
7. Build previews and approvals for mutating or high-risk actions.
8. Create an assistant task.
9. Record audit events and planned action logs.

GA1 does not run module connectors or apply changes. Future connector PRs must implement `previewAction` and `applyAction` against canonical module services.

## OpenRouter notes

Model metadata was verified against OpenRouter model availability on 2026-06-26 before hardcoding IDs in `globalAssistantModelRouter.ts`.

- Orchestrator: `anthropic/claude-opus-4.7`
- Fallback: `google/gemini-2.5-pro`
- Fast: `google/gemini-2.5-flash`
- Image pro: `google/gemini-3-pro-image`
- Image fast: `google/gemini-3.1-flash-image`

`google/gemini-3.1-flash-image` is marked as not supporting tool loops because current metadata did not expose `tools` or `tool_choice`.

## Guardrails

- No action applies changes in GA1.
- Mutating actions must support preview.
- High and critical actions require confirmation.
- Admin actions require Owner/Super Admin/system mode.
- Project-scoped actions require a project context.
- Memory has required source metadata.
- Session memory requires expiration.
- Admin memory is not visible in user mode.
- Provider secrets and API keys must not be stored in assistant memory or sent to models.

## Next PRs

- GA2: Supabase assistant tables, adapters, RLS, and persistence tests. Done as an additive persistence layer; live runtime switchover remains separate.
- GA3: project switcher and richer context snapshots.
- GA4: dashboard request bar routes to Global Assistant runtime. Started with the dashboard entry bridge and GlobalAiAssistant event handoff; durable runtime persistence and full structured tool-loop handoff still remain.
- GA5: global command palette.
- GA6: OpenRouter structured outputs and tool loop.
- GA7-GA10: module connectors, preview/apply, rollback, and admin mode.
