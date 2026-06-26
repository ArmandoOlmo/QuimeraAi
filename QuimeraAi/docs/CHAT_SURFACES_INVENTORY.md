# Chat Surfaces Inventory

This inventory keeps Quimera chat and assistant surfaces separated while the Global Assistant becomes the platform AI Operating Layer.

## Boundary Rules

- `GlobalAiAssistant` is the authenticated AI Operating Layer for owners, users, support, and admin modes.
- `ChatCore` is the visitor/customer runtime for a single project. Its raw conversations, leads, orders, appointments, and voice sessions are not Global Assistant memory.
- AI Website Studio is the project creation and BusinessBlueprint generation studio. It is not the daily operating assistant.
- Module assistants can generate drafts, previews, or module-specific content only inside their module boundaries.
- Human support chat is not AI chat.
- The Global Assistant can open, configure, preview, train, test, or create drafts through canonical module services. It must not merge raw conversations across surfaces unless a scoped summary is explicitly created.

## Operating Layer Surface

| Surface | Files | Current job | Memory/context | Action boundary |
| --- | --- | --- | --- | --- |
| Global Assistant | `components/ui/GlobalAiAssistant.tsx`, `services/globalAssistant/*`, `types/globalAssistant.ts` | Authenticated app-wide assistant with project, tenant, route, service, feature, and admin context. | Segmented by user, tenant/workspace, project, module, session, task, and admin mode. | Plans first. Mutating, blocked, high-risk, or confirmation-required dashboard requests stop at preview before real changes. |
| Dashboard command input | `components/dashboard/DashboardWelcome.tsx`, `services/globalAssistant/globalAssistantEntryBridge.ts` | Main entry point for global operating requests. Empty or explicit AI Studio requests still open AI Studio. | Adds dashboard surface metadata and request source to the Global Assistant entry payload. | Routes by intent only. It does not execute module work directly. |

## Project ChatCore Surfaces

| Surface | Files | Current job | Memory/context | Action boundary |
| --- | --- | --- | --- | --- |
| ChatCore runtime | `components/chat/ChatCore.tsx` | Visitor/customer project chatbot with text, voice, lead capture, ecommerce, appointments, knowledge, page context, CMS articles, and handoff. | Project-scoped public/customer context from `AiAssistantConfig`, project data, knowledge documents, page context, Bio Page context, products, CMS, and appointments. | Executes only ChatCore runtime flows such as lead capture, appointment requests, ecommerce answers, and handoff. Global Assistant can configure or test it, not inherit its raw visitor memory. |
| Website widget | `components/ChatbotWidget.tsx` | Floating public/project widget around ChatCore for generated websites, previews, restaurants pages, and public surfaces. | Public surface context, deployment guard state, editor/project config, CMS, appointments, and Bio Page source metadata when present. | Captures public leads/appointments through canonical project or API routes. It is not owner/admin chat. |
| External embed widget | `components/chat/EmbedWidget.tsx` | Third-party embeddable ChatCore wrapper loaded by project id. | Loads public widget config from `/api/widget/:projectId`. | Writes leads/appointments through widget APIs with public source metadata. |
| Chat simulator | `components/dashboard/ai/ChatSimulator.tsx` | Dashboard test harness for the project chatbot. | Uses the active project's `AiAssistantConfig` and project data. | Test surface for ChatCore behavior. It can create canonical test leads/appointments through existing handlers, but it is not the Global Assistant. |
| Chatbot Engine dashboard | `components/dashboard/ai/ChatbotEngineDashboard.tsx`, `services/chatbotEngine/*` | Operational admin surface for ChatCore readiness, knowledge review, deployment state, test lab, and handoffs. | Project ChatCore configuration, blueprint summary, runtime snapshot, review state, and deployment state. | Scoped to ChatCore configuration and runtime operations. Finance and email effects remain draft/review-gated. |
| Social inbox | `components/dashboard/ai/SocialChatInbox.tsx`, `components/chat/hooks/useWebChatConversation.ts` | Inbox for real customer conversations and social/web chat persistence. | Conversation records, status, unread state, lead links, channel/source metadata. | Can provide summaries to project memory later, but raw inbox history is not the Global Assistant transcript. |
| Bio Page ChatCore context | `services/bioPage/bioPageChatContextService.ts` | Sanitized public Bio Page context passed into ChatCore. | Visible links, visible blocks, public products, integration readiness, active chat block id. | Excludes private drafts and Email Marketing internals. Global Assistant can edit Bio Pages through Bio Page tools, not by mutating this public chat context directly. |

## Creation And Marketing Surfaces

| Surface | Files | Current job | Memory/context | Action boundary |
| --- | --- | --- | --- | --- |
| AI Website Studio | `components/onboarding/AIWebsiteStudio.tsx`, `components/onboarding/hooks/useAIWebsiteStudio.ts` | Conversational onboarding, business brief extraction, website plan review, image/content generation, BusinessBlueprint creation, and project save. | Studio session, imported URL data, generated brief, plan, selected services, BusinessBlueprint, project skeleton. | Creates initial projects and websites. Dashboard prompts only go here for empty input or explicit AI Studio requests. |
| Landing chatbot | `components/LandingChatbotWidget.tsx`, `types/landingChatbot.ts` | Public Quimera.ai marketing/support chatbot for platform visitors. | Platform marketing knowledge, landing chatbot config, voice config, and platform lead capture metadata. | Captures platform leads; not tenant/project memory. |
| Landing chatbot simulator | `components/dashboard/admin/LandingChatSimulator.tsx`, `components/dashboard/admin/LandingChatbotAdmin.tsx` | Admin preview/configuration surface for landing chatbot. | Landing chatbot admin config only. | Simulator uses deterministic preview responses; it is not a model-backed operating assistant. |

## Module Assistants

| Surface | Files | Current job | Memory/context | Action boundary |
| --- | --- | --- | --- | --- |
| User Email AI Studio | `components/dashboard/email/email-hub/hooks/useUserAIEmailStudio.ts`, `components/dashboard/email/email-hub/views/AIStudioTab.tsx` | Project-scoped email strategy chat that creates campaign, audience, and automation drafts. | Project id/name, user id, Email Hub data, campaign/audience/automation readiness. | Must preserve `draft`, `needsReview`, `generatedByAI`, `safeToEdit`, and `sendMode: draft_only`. No automatic sends. |
| Admin Email AI Studio | `components/dashboard/admin/email-hub/hooks/useAIEmailStudio.ts`, `components/dashboard/admin/AdminEmailHub.tsx` | Admin/superadmin email marketing studio across platform data. | Admin Email Hub data and current admin tab. | Admin-only creation/configuration. Keep provider secrets and readiness state out of assistant memory. |
| SEO assistant | `components/dashboard/seo/SEOAiAssistant.tsx` | SEO configuration generation with preview/apply. | Current SEO config and user prompt. | Module-local apply via `onApply`; no global memory or cross-module actions. |
| CMS content assistants | `components/cms/ContentCreatorAssistant.tsx`, `components/cms/CMSContentStudio.tsx`, `components/ui/AIContentAssistant.tsx` | Project CMS articles, conversational content studio, and inline field rewriting. | Current project/content/editor context, CRM/leads/website data when provided, selected field content. | Generate preview or apply to current content field/article only. |
| Admin/agency content studios | `components/dashboard/admin/AppContentCreatorAssistant.tsx`, `components/dashboard/admin/AIContentStudio.tsx`, `components/dashboard/admin/AINewsStudio.tsx`, `components/dashboard/agency/AgencyContentCreatorAssistant.tsx` | Admin and agency article/news generation. | Admin or agency content context. | Save drafts through admin/agency content flows; Global Assistant should enter only through admin-mode connectors. |
| Restaurant AI helpers | `services/restaurants/restaurantAiService.ts` | Menu, dish, marketing copy, review template, and reservation message helpers. | Restaurant module inputs and project context. | Service helpers, not a chat surface. Operating Layer can call them later as restaurant tools. |

## Human Chat

| Surface | Files | Current job | Memory/context | Action boundary |
| --- | --- | --- | --- | --- |
| Agency/client support chat | `hooks/useSupportChat.ts` | Human conversation between agencies and clients backed by Supabase `support_chats` and `support_chat_messages`. | Tenant, agency/client roles, message records, unread counts, timestamps. | No AI model and no Global Assistant execution. It must not be treated as assistant memory without explicit summary and permission. |

## Global Assistant Integration Rules

1. Open or switch surfaces through typed actions instead of copying module state into global chat state.
2. Convert external chat history into assistant memory only as a scoped summary with source metadata, tenant/project/module ids, and permission checks.
3. Keep visitor/customer ChatCore data separate from owner/admin Global Assistant history.
4. Preserve review gates for Email Marketing, Finance, publishing, admin, and any customer-facing mutation.
5. Preview every mutating module action before apply; require confirmation for high and critical safety actions.
6. Prefer canonical services for real work: Email API for emails, Appointments Engine for bookings, Chatbot Engine services for ChatCore, Bio Page services for Bio Pages, ecommerce services for products/orders, and admin services for super-admin changes.
7. Store audit events for planned, previewed, applied, failed, and rolled-back actions with actor, mode, tenant, project, module, task, and source surface.
