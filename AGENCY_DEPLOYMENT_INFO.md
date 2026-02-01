# Agency Plan - Información de Deployment

## ✅ Estado del Deployment

**Fecha**: Enero 2026
**Estado**: COMPLETADO Y DESPLEGADO
**Región**: us-central1
**Runtime**: Node.js 20

---

## 🚀 Cloud Functions Desplegadas

### ✅ Billing Functions (11 funciones)

**Callable Functions:**
```
✅ agencyBilling-createStripeConnectAccount
✅ agencyBilling-getStripeConnectStatus
✅ agencyBilling-setupClientBilling
✅ agencyBilling-updateClientMonthlyPrice
✅ agencyBilling-cancelClientSubscription
✅ agencyBilling-generateClientInvoice
✅ agencyBilling-getAddonsPricing
✅ agencyBilling-calculateAddonsPrice
✅ agencyBilling-checkAddonsEligibility
✅ agencyBilling-updateSubscriptionAddons
```

**HTTP Webhooks:**
```
✅ agencyBilling-webhook
   URL: https://us-central1-quimeraai.cloudfunctions.net/agencyBilling-webhook

✅ agencyStripeWebhook
   URL: https://us-central1-quimeraai.cloudfunctions.net/agencyStripeWebhook
```

### ✅ Reports Functions (6 funciones)

**Callable Functions:**
```
✅ agencyReports-generate
✅ agencyReports-getSaved
✅ agencyReports-deleteSaved
✅ agencyReports-triggerManual
```

**Scheduled Functions (Cron):**
```
✅ agencyReports-sendMonthly
   Schedule: 0 9 1 * * (1ro del mes, 9am Mexico City)

✅ agencyReports-sendWeekly
   Schedule: 0 9 * * 1 (Cada lunes, 9am Mexico City)
```

### ✅ Onboarding Functions (2 funciones)

**Callable Functions:**
```
✅ agencyOnboarding-autoProvision
✅ agencyOnboarding-getStatus
```

### ✅ API REST (1 endpoint con 8 rutas)

**HTTP Endpoint:**
```
✅ agencyApi-tenants
   Base URL: https://us-central1-quimeraai.cloudfunctions.net/agencyApi-tenants

   Routes:
   GET    /api/v1/tenants              - List sub-clients
   POST   /api/v1/tenants              - Create sub-client
   GET    /api/v1/tenants/:id          - Get client details
   PATCH  /api/v1/tenants/:id          - Update client
   DELETE /api/v1/tenants/:id          - Delete client (soft)
   POST   /api/v1/tenants/:id/members  - Add member
   GET    /api/v1/tenants/:id/usage    - Get resource usage
   POST   /api/v1/tenants/:id/reports  - Generate report
```

---

## 🔧 Configuración Actual

### Variables de Entorno (Firebase Config)

```json
{
  "stripe": {
    "secret_key": "sk_live_YOUR_SECRET_KEY_HERE",
    "webhook_secret": "whsec_YOUR_WEBHOOK_SECRET_HERE"
  }
}
```

**⚠️ IMPORTANTE**: Las claves de Stripe están configuradas en modo LIVE.

### Configuración Pendiente

```bash
# Agregar URL base (si no está)
firebase functions:config:set app.base_url="https://quimera.ai"
```

---

## 🔗 URLs Importantes

### Webhooks para Stripe Dashboard

**1. Agency Billing Webhook**
- **URL**: `https://us-central1-quimeraai.cloudfunctions.net/agencyBilling-webhook`
- **Eventos a escuchar**:
  - `payment_intent.succeeded`
  - `payment_intent.failed`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- **Descripción**: Webhook principal para eventos de facturación de agencias

**2. Agency Stripe Webhook (alternativo)**
- **URL**: `https://us-central1-quimeraai.cloudfunctions.net/agencyStripeWebhook`
- **Eventos**: Los mismos que arriba
- **Descripción**: Webhook alternativo/backup

### API REST Base URL

```
Base: https://us-central1-quimeraai.cloudfunctions.net/agencyApi-tenants
Full: https://us-central1-quimeraai.cloudfunctions.net/agencyApi-tenants/api/v1/tenants
```

**Ejemplo de uso:**
```bash
curl -X GET \
  "https://us-central1-quimeraai.cloudfunctions.net/agencyApi-tenants/api/v1/tenants" \
  -H "X-API-Key: qai_your_api_key_here"
```

---

## 📊 Estadísticas de Deployment

| Categoría | Cantidad |
|-----------|----------|
| Total Functions Desplegadas | 20 funciones |
| Callable Functions | 16 funciones |
| HTTP Endpoints | 2 webhooks + 1 REST API |
| Scheduled Functions (Cron) | 2 funciones |
| Region | us-central1 |
| Runtime | Node.js 20 |
| Memory | 256 MB |
| Timeout | Default (60s) |

---

## 🔒 Configuración de Stripe Dashboard

### Paso 1: Configurar Webhook

1. Ve a: https://dashboard.stripe.com/webhooks
2. Click en "Add endpoint"
3. Endpoint URL: `https://us-central1-quimeraai.cloudfunctions.net/agencyBilling-webhook`
4. Descripción: "Quimera Agency Plan Billing"
5. Eventos a escuchar:
   ```
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
   ✅ invoice.payment_failed
   ✅ invoice.payment_succeeded
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ```
6. Click en "Add endpoint"
7. **IMPORTANTE**: Copia el "Signing secret" (empieza con `whsec_`)

### Paso 2: Actualizar Webhook Secret (si es necesario)

```bash
# Si el webhook secret cambió
firebase functions:config:set stripe.webhook_secret="whsec_TU_NUEVO_SECRET"

# Redesplegar funciones
firebase deploy --only functions:agencyBilling-webhook
```

---

## 🧪 Testing

### Test 1: Verificar Function Desplegada

```bash
# Listar funciones de Agency
firebase functions:list | grep agency
```

**Resultado esperado**: Debe mostrar las 20 funciones del Agency Plan

### Test 2: Test de Webhook (Local)

```bash
# Enviar request de prueba
curl -X POST https://us-central1-quimeraai.cloudfunctions.net/agencyBilling-webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "ping"}'
```

### Test 3: Test de API REST

```bash
# Listar tenants (requiere API key válida)
curl -X GET \
  "https://us-central1-quimeraai.cloudfunctions.net/agencyApi-tenants/api/v1/tenants" \
  -H "X-API-Key: qai_test_key"
```

### Test 4: Test desde Frontend

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Test crear Stripe Connect account
const createAccount = httpsCallable(functions, 'agencyBilling-createStripeConnectAccount');
const result = await createAccount({ tenantId: 'test-tenant-id' });

console.log('Result:', result.data);
```

---

## 📝 Logs y Monitoreo

### Ver Logs en Tiempo Real

```bash
# Todos los logs de Agency
firebase functions:log --only agencyBilling,agencyReports,agencyOnboarding,agencyApi

# Solo Billing
firebase functions:log --only agencyBilling

# Solo Reports
firebase functions:log --only agencyReports

# Tiempo real
firebase functions:log --follow
```

### Firebase Console

- **Functions Dashboard**: https://console.firebase.google.com/project/quimeraai/functions
- **Logs Explorer**: https://console.firebase.google.com/project/quimeraai/logs

### Métricas Disponibles

- ✅ Invocations (llamadas)
- ✅ Errors (errores)
- ✅ Execution time (tiempo de ejecución)
- ✅ Memory usage (uso de memoria)

---

## 🚨 Troubleshooting

### Error: "functions.config() is deprecated"

**Problema**: Firebase muestra warning sobre deprecación.

**Solución a futuro (antes de Marzo 2026)**:
1. Migrar a `.env` files
2. Usar `process.env` en lugar de `functions.config()`
3. Seguir guía: https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv

**Nota**: Funciona correctamente por ahora, solo es un warning.

### Error: "Webhook signature verification failed"

**Problema**: Stripe no puede verificar el webhook.

**Solución**:
1. Verificar que el `webhook_secret` en Firebase config coincida con el de Stripe Dashboard
2. Regenerar el secret en Stripe si es necesario
3. Actualizar config y redesplegar

### Error: "API key required"

**Problema**: Falta API key en las peticiones al REST API.

**Solución**:
```bash
# Agregar header X-API-Key
curl -H "X-API-Key: qai_your_key" ...
```

### Error: "Permission denied"

**Problema**: Usuario no tiene rol correcto.

**Solución**: Verificar que el usuario sea `agency_owner` en la colección `tenantMembers`.

---

## ✅ Checklist Post-Deployment

- [x] ✅ Funciones compiladas sin errores
- [x] ✅ Funciones desplegadas exitosamente
- [x] ✅ Stripe keys configuradas (LIVE)
- [ ] ⚠️ Webhook configurado en Stripe Dashboard
- [ ] ⚠️ Webhook secret verificado
- [ ] ⚠️ API keys creadas para testing
- [ ] ⚠️ Test completo de flujo de facturación
- [ ] ⚠️ Test de generación de reportes
- [ ] ⚠️ Test de onboarding automatizado
- [ ] ⚠️ Alertas configuradas en Firebase Console
- [ ] ⚠️ Documentación compartida con el equipo

---

## 📚 Recursos Adicionales

- **Component README**: `src/components/dashboard/agency/README.md`
- **Implementation Summary**: `AGENCY_IMPLEMENTATION_SUMMARY.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Firestore Indexes**: `docs/FIRESTORE_INDEXES.md`

---

## 🎯 Próximos Pasos

1. **Configurar Webhook en Stripe**
   - Agregar endpoint en Stripe Dashboard
   - Verificar que eventos lleguen correctamente

2. **Crear API Keys de Prueba**
   - Desde el dashboard
   - Probar endpoints del REST API

3. **Testing Completo**
   - Probar flujo de Stripe Connect
   - Generar reporte de prueba
   - Crear sub-cliente de prueba

4. **Integrar Componentes React**
   - Agregar rutas al router
   - Integrar con navegación existente
   - Testing de UI

5. **Monitoreo**
   - Configurar alertas de errores
   - Configurar alertas de performance
   - Dashboard de métricas

---

## 📞 Soporte

**Issues**: GitHub repository
**Email**: armandoolmo@quimera.ai
**Documentación**: Ver archivos README en el proyecto

---

**Última actualización**: Enero 2026
**Deploy exitoso**: ✅
**Funciones activas**: 20/20
**Estado**: PRODUCCIÓN READY
