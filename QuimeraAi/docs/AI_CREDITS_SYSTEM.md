# Sistema de Créditos de IA — Quimera.ai

## Resumen

El sistema de créditos de IA controla el acceso a funciones de inteligencia artificial (generación de texto, streaming, imágenes). Cuando un usuario agota sus créditos, el sistema:

1. **Bloquea** las peticiones AI en el backend (HTTP 402)
2. **Muestra** un banner rojo global en el dashboard
3. **Permite** comprar paquetes de créditos adicionales via Stripe

---

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │ NoCreditsGlobalBanner│  │  PurchaseCreditsModal │ │
│  │  (ViewRouter.tsx)    │──│  (Stripe Checkout)    │ │
│  └──────────────────────┘  └──────────────────────┘ │
│           │                         │                │
│  useCreditsUsage()        stripe-createCreditPackage │
│  (Firestore listener)         Checkout()             │
└────────────┬────────────────────────┬───────────────┘
             │                        │
┌────────────▼────────────────────────▼───────────────┐
│                    BACKEND                           │
│                                                      │
│  ┌─────────────────────┐  ┌───────────────────────┐ │
│  │ checkCreditsBeforeRe│  │ createCreditPackage   │ │
│  │ quest() — CREDIT GATE│  │ Checkout()            │ │
│  │ (geminiProxy.ts)    │  │ (stripeApi.ts)        │ │
│  └─────────────────────┘  └───────────────────────┘ │
│           │                         │                │
│  Bloquea con HTTP 402      Stripe Checkout Session   │
│  si creditsRemaining ≤ 0            │                │
│                            ┌────────▼──────────┐    │
│                            │ Stripe Webhook     │    │
│                            │ credit_package     │    │
│                            │ handler            │    │
│                            └────────┬──────────┘    │
│                                     │                │
│                            Agrega créditos a         │
│                            aiCreditsUsage/{tenant}   │
└──────────────────────────────────────────────────────┘
```

---

## Componentes

### 1. Backend — Credit Gate (`geminiProxy.ts`)

**Función**: `checkCreditsBeforeRequest(userId, tenantId?)`

Se ejecuta **antes** de cada petición AI. Está integrada en:
- `generateContent` — generación de texto
- `streamContent` — streaming de texto
- `generateImage` — generación de imágenes

**Lógica**:
```
1. Resolver tenantId (del parámetro o buscando en users/{userId})
2. Si no hay tenant → PERMITIR (chatbot público o sistema)
3. Si es owner/superadmin → PERMITIR (bypass)
4. Leer aiCreditsUsage/{tenantId}
5. Si no existe el doc → PERMITIR (usuario nuevo)
6. Si creditsRemaining ≤ 0 → BLOQUEAR (HTTP 402)
7. Si hay error → PERMITIR (fail-open, evitar bloqueo por errores transitorios)
```

**Respuesta de bloqueo** (HTTP 402):
```json
{
  "error": "CREDITS_EXHAUSTED",
  "message": "No tienes créditos de IA disponibles...",
  "creditsRemaining": 0
}
```

### 2. Backend — Compra de Créditos (`stripeApi.ts`)

**Función**: `createCreditPackageCheckout(data, context)`

Cloud Function (`functions.https.onCall`) que crea una Stripe Checkout Session.

**Paquetes disponibles**:

| ID | Créditos | Precio | Por Crédito | Descuento |
|:---|:---------|:-------|:------------|:----------|
| `pack_100` | 100 | $5 | $0.050 | 0% |
| `pack_500` | 500 | $20 | $0.040 | 20% |
| `pack_2000` | 2,000 | $60 | $0.030 | 40% |
| `pack_5000` | 5,000 | $125 | $0.025 | 50% |
| `pack_10000` | 10,000 | $200 | $0.020 | 60% |

**Metadata de la sesión Stripe**:
```json
{
  "type": "credit_package",
  "userId": "...",
  "tenantId": "...",
  "packageId": "pack_500",
  "credits": "500"
}
```

### 3. Backend — Webhook Handler (`stripeApi.ts`)

Cuando Stripe envía `checkout.session.completed` con `type === 'credit_package'`:

1. Lee `packageId` y `credits` del metadata
2. Agrega créditos a `aiCreditsUsage/{tenantId}`:
   - Incrementa `creditsRemaining` y `creditsIncluded`
   - Si no existe el doc, lo crea con los créditos comprados
3. Registra la compra en `subscriptions/{tenantId}.creditPackagesPurchased[]`
4. Crea un registro en `aiCreditsTransactions` con `operation: 'credit_purchase'`

### 4. Frontend — Banner Global (`NoCreditsGlobalBanner.tsx`)

**Ubicación**: Inyectado en `ViewRouter.tsx` — aparece en **todas** las vistas del dashboard.

**Condiciones para mostrarse**:
- `usage?.hasExceededLimit === true` (de `useCreditsUsage()`)
- NO es owner ni superadmin
- NO está cargando

**Acciones**:
- **"Comprar Créditos"** → abre `PurchaseCreditsModal`
- **"Actualizar Plan"** → abre `UpgradeModal` (via `useSafeUpgrade`)

**No se puede cerrar** — persiste hasta que el usuario compre créditos.

### 5. Frontend — Modal de Compra (`PurchaseCreditsModal.tsx`)

**Se abre desde**:
- Banner rojo global (botón "Comprar Créditos")
- `AiCreditsUsage.tsx` (botón "Comprar Credits")
- `AgencyAnalytics.tsx` (botón "Comprar Créditos para Pool")

**Flujo**:
1. Usuario selecciona un paquete
2. Llama a `stripe-createCreditPackageCheckout` via `httpsCallable`
3. Redirige a Stripe Checkout
4. Al completar el pago, Stripe envía webhook → créditos se agregan automáticamente

**Modo Agencia**: Si `subscriptionPlan` incluye "agency", muestra indicador de pool compartido.

---

## Colecciones de Firestore

### `aiCreditsUsage/{tenantId}`

```typescript
{
  tenantId: string;
  creditsIncluded: number;  // total de créditos disponibles
  creditsUsed: number;       // créditos consumidos
  creditsRemaining: number;  // créditos restantes
  creditsOverage: number;
  usageByOperation: Record<string, { count: number; credits: number }>;
  dailyUsage: Array<{ date: string; credits: number }>;
  usageByProject: Record<string, number>;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  lastResetAt: Timestamp;
}
```

### `aiCreditsTransactions/{autoId}`

```typescript
{
  tenantId: string;
  userId: string;
  operation: 'credit_purchase' | 'text_generation' | 'image_generation' | ...;
  creditsUsed: number;       // negativo = créditos agregados
  description: string;
  metadata: { packageId, stripeSessionId };
  timestamp: Timestamp;
}
```

### `subscriptions/{tenantId}`

```typescript
{
  // ... campos existentes
  creditPackagesPurchased: Array<{
    packageId: string;
    credits: number;
    purchasedAt: string;
    stripeSessionId: string;
  }>;
}
```

---

## Flujo Completo: Usuario se queda sin créditos

```
1. Usuario usa AI → creditsRemaining llega a 0
2. Siguiente petición AI:
   a. Backend: checkCreditsBeforeRequest() → HTTP 402
   b. Frontend: useCreditsUsage() → hasExceededLimit = true
3. Banner rojo aparece en todo el dashboard
4. Usuario hace clic en "Comprar Créditos"
5. PurchaseCreditsModal se abre con 5 paquetes
6. Usuario selecciona pack_500 ($20)
7. Frontend llama stripe-createCreditPackageCheckout
8. Redirect a Stripe Checkout
9. Usuario paga con tarjeta
10. Stripe envía webhook checkout.session.completed
11. Backend: +500 créditos en aiCreditsUsage/{tenantId}
12. Frontend: useCreditsUsage() detecta cambio → hasExceededLimit = false
13. Banner rojo desaparece
14. Usuario puede usar AI de nuevo
```

---

## Archivos Clave

| Archivo | Función |
|:--------|:--------|
| `functions/src/geminiProxy.ts` | Credit gate (`checkCreditsBeforeRequest`) |
| `functions/src/stripeApi.ts` | `createCreditPackageCheckout` + webhook handler |
| `functions/src/index.ts` | Exporta la Cloud Function |
| `components/ui/NoCreditsGlobalBanner.tsx` | Banner rojo global |
| `components/ui/PurchaseCreditsModal.tsx` | Modal de compra de créditos |
| `components/ViewRouter.tsx` | Inyección del banner en todas las vistas |
| `components/dashboard/agency/AgencyAnalytics.tsx` | Botón de compra para pool de agencia |
| `components/ui/AiCreditsUsage.tsx` | Widget de uso con botón de compra |
| `hooks/useCreditsUsage.ts` | Hook que lee `aiCreditsUsage` en tiempo real |
| `types/subscription.ts` | `AI_CREDIT_PACKAGES`, `AiCreditPackage` |

---

## Roles y Permisos

| Rol | ¿Se bloquea? | ¿Ve el banner? | ¿Puede comprar? |
|:----|:-------------|:---------------|:----------------|
| **Owner** | ❌ Nunca | ❌ No | N/A |
| **Superadmin** | ❌ Nunca | ❌ No | N/A |
| **Usuario regular** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Agencia** | ✅ Sí | ✅ Sí | ✅ Sí (pool) |
| **Sub-cliente agencia** | ✅ Sí | ✅ Sí | Depende de permisos |

---

## Deploy

```bash
# Solo funciones afectadas
firebase deploy --only functions

# O funciones específicas
firebase deploy --only \
  functions:gemini-generate,\
  functions:gemini-stream,\
  functions:gemini-image,\
  functions:stripe-createCreditPackageCheckout,\
  functions:stripe-webhook
```
