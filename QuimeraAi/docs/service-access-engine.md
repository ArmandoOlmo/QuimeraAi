# Service Access Engine

## Regla Central

Quimera no vende acceso ilimitado por plan. Los planes comerciales, incluidos agencia y enterprise, siempre tienen límites numéricos finitos. El único bypass total de límites, servicios y AI Credits existe por rol interno de plataforma:

- `owner`
- `superadmin`

Ese bypass se resuelve con `isPlatformUnlimitedUser(role)` y debe quedar registrado como `owner_override` o `superadmin_override`.

## Autoridad De Acceso

La autoridad de runtime es `services/access/serviceAccessEngine.ts`. Todo acceso nuevo debe pasar por `resolveServiceAccess` o uno de sus wrappers:

- `canAccessModule`
- `canAccessService`
- `canUseFeature`
- `canPerformAction`
- `canConsumeCredits`
- `assertPlanLimit`

El engine combina usuario, rol, tenant, proyecto, plan, estado de suscripción, Service Availability, Module Registry, permisos, límites y créditos.

## Plan Catalog

`services/billing/planCatalog.ts` es el catálogo canónico. Expone límites y features para:

- `free`
- `individual`
- `agency_starter`
- `agency_pro`
- `agency_scale`
- `enterprise`

Planes legacy como `starter`, `pro`, `agency` y `agency_plus` se mapean a planes canónicos. `agency_client` no es un plan: es un tipo de tenant.

Los límites inválidos (`-1`, `Infinity`, `null`, `undefined`, strings como `unlimited`) se normalizan con fallback finito mediante `normalizePlanLimits` / `sanitizePlanLimits`.

## Agency Client

`agency_client` debe modelarse como tenant:

- `type = 'agency_client'`
- `ownerTenantId` apunta a la agencia
- `billing.mode = 'included_in_parent'` o `direct`
- `billing.effectivePlanId` siempre es un plan canónico válido

Use `resolveTenantEffectivePlan` y `resolveTenantEffectiveLimits` para calcular acceso efectivo. Nunca devuelva `agency_client` como `planId`.

## Module Registry

`registry/moduleRegistry.ts` declara `requiredService`, `requiredFeature`, `requiredPermission`, `view`, `route`, `planGate`, `upgradeTrigger` y `usageResource`. ViewRouter y Sidebar usan `useServiceAccess`, que consulta el registry y llama al engine.

Para añadir un módulo:

1. Registrar el módulo en `quimeraModuleRegistry`.
2. Definir `requiredService` y `requiredFeature` si aplica.
3. Definir `requiredPermission` si requiere permisos del tenant.
4. Mapear su view en `ViewRouter`.
5. Usar `useServiceAccess().canAccessModule(moduleId)` en UI.
6. Añadir guard server-side si tiene Edge Function.

## AI Credits

La UI no es enforcement. Antes de ejecutar una operación AI se debe llamar a `canConsumeCredits` o `assertCreditsAvailable`. Edge usa `supabase/functions/_shared/access.ts` para validar JWT, tenant, plan, servicio, módulo y créditos con datos server-side.

Owner/Super Admin pueden ejecutar con `adminOverride`; el consumo no debe debitar créditos, pero debe auditarse.

## Edge Functions

Funciones sensibles deben usar `requireServiceAccess` o una validación equivalente contra el tenant merchant en flujos públicos. Ya hay guards para:

- `ai-proxy`
- `email-api`
- `onboarding-api` para dominios
- `send-invite-email`
- `storefront-api` cash orders
- `create-store-checkout-intent`

Nunca confíe en `userRole` enviado por el cliente. El guard lee `users.role` o `app_metadata`, no `user_metadata`.

## Migración Y Base De Datos

La migración `20260627071120_service_access_engine_plan_limits.sql`:

- agrega columnas de billing a `subscription_plans`
- sanitiza `limits` JSONB
- elimina `agency_client` como plan
- normaliza tenants y subscriptions a planes canónicos
- crea constraints contra límites negativos/no numéricos
- crea `service_access_audit_logs` con RLS y grants explícitos

## Verificación

Comandos útiles:

```bash
rg -n "max[A-Za-z]+:\s*-1|agency_client|Ilimitad|Unlimited|∞|Infinity|allowUnlimited" QuimeraAi
npm run test:run -- tests/services/serviceAccessEngine.test.ts
npm run build
```

La presencia de `-1` como índice de array o repetición de animación no implica límite comercial. Cualquier aparición en planes, tenants, créditos o módulos debe eliminarse o justificarse.
