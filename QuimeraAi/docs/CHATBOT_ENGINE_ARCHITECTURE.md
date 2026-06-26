# Chatbot Engine Architecture

## ES

CC1 establece la base canónica del Chatbot Engine sin cambiar todavía el runtime público de `ChatCore` ni `ChatbotWidget`. El objetivo de este corte es que BusinessBlueprint, AI Studio y ModuleRegistry entiendan a ChatCore como AI Business Agent auditable, project-scoped y listo para evolucionar por servicios.

### Auditoría inicial

- `components/chat/ChatCore.tsx`: ya maneja lead scoring, intent analysis, pre-chat, appointment form, voice, visual context, CMS articles, property context, ecommerce hook y conversación web. Voice resuelve proveedor y `agentId` desde `BusinessBlueprint.chatbotBlueprint.deployment.voiceSettings`, con fallback legacy de `aiAssistantConfig` y sin agente hardcodeado.
- `components/ChatbotWidget.tsx`: carga citas canónicas con `getAppointmentsByProject`, crea citas con `createAppointmentFromChat` para owners autenticados y usa API pública para leads/conversations/appointments en modo público.
- `components/chat/hooks/useEcommerceChat.ts`: usa Widget API, Action Registry y servicios runtime del Chatbot Engine para productos, ordenes verificadas, politicas y back-in-stock; no lee rutas legacy `users/{userId}/stores/{projectId}`.
- `components/chat/hooks/useWebChatConversation.ts`: persiste conversaciones en `socialConversations/socialMessages` o vía API pública.
- `api/widget/[project]/...`: es la API pública real del widget en este checkout. Tiene rate limiting, sanitización, checks de proyecto publicado/draft owner, leads, conversaciones, mensajes, appointments y availability.
- `services/appointments/appointmentEngineService.ts`: ya usa `project_appointments`, idempotency key y chequeo de conflictos.
- `services/email/emailModuleIntentService.ts`: ya crea metadata de email draft-only con idempotency, consent y `noEmailSent`.
- `services/chatbotEngine/chatbotEngineRuntimeActionService.ts`: gobierna acciones runtime canónicas como handoff humano, reservas, realty leads, ecommerce, Email Marketing y Finance. Finance crea solo facturas/cotizaciones en borrador para revisión; no crea Payment Links, Checkout Sessions, PaymentIntents, cargos Stripe, asientos contables ni reglas fiscales desde ChatCore.
- `contexts/crm/CRMContext.tsx` y `components/Leads.tsx`: CRM y leads son project-scoped en Supabase.
- `registry/moduleRegistry.ts`: ahora registra `chatbot-engine` como integración AI Business Agent completa.
- `docs/design-system/*`, `src/design-system/*`, `src/styles/tokens.css`: nuevas superficies deben usar Design System, `q-*` tokens y copy bilingüe.

### Límite de CC1

- No se cambia el comportamiento visible del widget.
- No se ejecutan acciones nuevas.
- No se crean migraciones destructivas.
- Voice sólo se activa cuando el proyecto tiene proveedor y `agentId` configurados.
- No se expone data privada.
- El hook de ecommerce ya no usa rutas legacy; las acciones publicas siguen gobernadas por readiness del Action Registry.
- Las solicitudes financieras públicas quedan limitadas a drafts idempotentes en `accounting_invoices`, con Event Log y `paymentCreated: false`.

### Deploy Settings runtime guard

- `utils/chatbotEngine/deploymentGuard.ts` centraliza la decisión de superficie para Website, Storefront, Checkout, Bio Page, Booking Page, Restaurant Menu, Realty Property Page, Admin Preview y Voice.
- `ChatbotWidget` respeta superficies `paused` y `disabled` antes de mostrar el botón o mantener abierto el widget.
- La API pública `api/widget/[project]/...` bloquea acciones de superficies pausadas/deshabilitadas y registra `chatbot_surface_blocked` en el Event Log.
- Para compatibilidad, superficies generadas en `test` o `draft` siguen funcionando bajo política legacy, salvo que `deployment.safetySettings.requireSurfaceDeployment` o `requireExplicitSurfaceDeployment` esté activo. En modo estricto, sólo `deployed` ejecuta runtime público; `admin_preview` puede seguir usando `test`.

## EN

CC1 establishes the canonical Chatbot Engine foundation without changing the public runtime of `ChatCore` or `ChatbotWidget` yet. This cut makes BusinessBlueprint, AI Studio, and ModuleRegistry understand ChatCore as a project-scoped, auditable AI Business Agent ready to evolve through services.

### Initial Audit

- `components/chat/ChatCore.tsx`: already handles lead scoring, intent analysis, pre-chat, appointment form, voice, visual context, CMS articles, property context, ecommerce hook, and web conversation persistence. Voice resolves provider and `agentId` from `BusinessBlueprint.chatbotBlueprint.deployment.voiceSettings`, with legacy `aiAssistantConfig` fallback and no hardcoded agent.
- `components/ChatbotWidget.tsx`: loads canonical appointments with `getAppointmentsByProject`, creates appointments with `createAppointmentFromChat` for authenticated owners, and uses the public API for leads/conversations/appointments in public mode.
- `components/chat/hooks/useEcommerceChat.ts`: uses the Widget API, Action Registry, and Chatbot Engine runtime services for products, verified orders, policies, and back-in-stock; it no longer reads legacy `users/{userId}/stores/{projectId}` paths.
- `components/chat/hooks/useWebChatConversation.ts`: persists conversations in `socialConversations/socialMessages` or through the public API.
- `api/widget/[project]/...`: this is the real public widget API in this checkout. It includes rate limiting, sanitization, published-project/draft-owner checks, leads, conversations, messages, appointments, and availability.
- `services/appointments/appointmentEngineService.ts`: already uses `project_appointments`, idempotency keys, and conflict checks.
- `services/email/emailModuleIntentService.ts`: already creates draft-only email metadata with idempotency, consent, and `noEmailSent`.
- `services/chatbotEngine/chatbotEngineRuntimeActionService.ts`: governs canonical runtime actions such as human handoff, reservations, realty leads, ecommerce, Email Marketing, and Finance. Finance only creates draft invoices/quotes for review; it does not create Payment Links, Checkout Sessions, PaymentIntents, Stripe charges, ledger entries, or tax rules from ChatCore.
- `contexts/crm/CRMContext.tsx` and `components/Leads.tsx`: CRM and leads are project-scoped in Supabase.
- `registry/moduleRegistry.ts`: now registers `chatbot-engine` as the complete AI Business Agent integration.
- `docs/design-system/*`, `src/design-system/*`, `src/styles/tokens.css`: new surfaces must use the Design System, `q-*` tokens, and bilingual copy.

### CC1 Boundary

- No visible widget behavior changes.
- No new actions execute.
- No destructive migrations.
- Voice only activates when the project has a configured provider and `agentId`.
- Private data is not exposed.
- The ecommerce hook no longer uses legacy paths; public actions remain governed by Action Registry readiness.
- Public finance requests are limited to idempotent `accounting_invoices` drafts, with Event Log records and `paymentCreated: false`.

### Deploy Settings Runtime Guard

- `utils/chatbotEngine/deploymentGuard.ts` centralizes surface decisions for Website, Storefront, Checkout, Bio Page, Booking Page, Restaurant Menu, Realty Property Page, Admin Preview, and Voice.
- `ChatbotWidget` respects `paused` and `disabled` surfaces before showing the launcher or keeping the widget open.
- The public `api/widget/[project]/...` API blocks actions from paused/disabled surfaces and records `chatbot_surface_blocked` in the Event Log.
- For compatibility, generated `test` or `draft` surfaces keep working under legacy policy unless `deployment.safetySettings.requireSurfaceDeployment` or `requireExplicitSurfaceDeployment` is enabled. In strict mode, only `deployed` surfaces execute public runtime; `admin_preview` may still use `test`.
