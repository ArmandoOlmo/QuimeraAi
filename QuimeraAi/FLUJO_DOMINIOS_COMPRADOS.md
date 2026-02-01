# 🛒 Flujo Completo: Compra y Configuración de Dominios

**Fecha:** 22 de Diciembre 2025  
**Estado:** ⚠️ PARCIALMENTE FUNCIONAL (necesita API Token de Cloudflare)

---

## 🎯 Diferencia Clave

### 1. DOMINIO EXTERNO (Conectar)
- Usuario **ya tiene** el dominio
- Solo configuramos DNS con Cloudflare
- Requiere cambio manual de nameservers
- ❌ **Este falla actualmente** (sin API token correcto)

### 2. DOMINIO COMPRADO (Comprar)
- Usuario **compra** dominio nuevo en la app
- Registramos con Name.com
- Configuramos TODO automáticamente
- ⚠️ **Este también necesita el fix**

---

## 📊 Flujo Completo de Compra (7 Pasos)

### FASE 1: BÚSQUEDA Y PAGO

#### Paso 1: Usuario busca dominio
```
Frontend: DomainSearch component
    ↓
Llama: domains-searchSuggestions
    ↓
Backend: Query Name.com API
    ↓
Retorna: disponibilidad + precios
```

#### Paso 2: Usuario hace clic en "Comprar"
```
Frontend: handleBuy()
    ↓
Llama: domains-createDomainCheckoutSession
    ↓
Backend: Crea Stripe Checkout
    ↓
Guarda: domainOrders/{orderId} (status: pending_payment)
    ↓
Redirige: Stripe Checkout
```

#### Paso 3: Usuario paga con Stripe
```
Stripe procesa el pago
    ↓
Stripe envía webhook: checkout.session.completed
    ↓
Backend recibe: stripeWebhook
```

---

### FASE 2: REGISTRO Y CONFIGURACIÓN AUTOMÁTICA

#### Paso 4: Webhook detecta pago exitoso
```typescript
// stripeApi.ts: handleCheckoutSessionCompleted()
if (metadata.type === 'domain_purchase') {
    await registerDomainAfterPayment(orderId, domainName, years, userId);
}
```

#### Paso 5: `registerDomainAfterPayment()` ejecuta 6 sub-pasos:

##### 🔹 SUB-PASO 1: REGISTRAR CON NAME.COM
```typescript
// nameComApi.ts línea 603-643
await nameComRequest('/domains', 'POST', {
    domain: { domainName },
    years,
    purchasePrice: wholesalePrice
});
```
- ✅ **SIEMPRE FUNCIONA** (Name.com API configurado)
- Status → `'registering'`
- Dominio se registra por X años

##### 🔹 SUB-PASO 2: CONFIGURAR DNS CON CLOUDFLARE ⚠️
```typescript
// nameComApi.ts línea 645-674
const { configureQuimeraDNS, enableStrictSSL } = await import('./cloudflareApi');
cloudflareResult = await configureQuimeraDNS(domainName, userId);
nameservers = cloudflareResult.nameservers;
await enableStrictSSL(cloudflareResult.zoneId);
```
- ⚠️ **PUEDE FALLAR** si workers_token no tiene permisos DNS
- Crea zona DNS en Cloudflare
- Configura records A/CNAME → Cloud Run
- Habilita SSL strict
- Retorna: nameservers de Cloudflare
- Status → `'configuring_dns'`

**Si falla:**
- try-catch captura error
- Log: `"Cloudflare setup failed (non-critical)"`
- `nameservers = []` (vacío)
- ⚠️ Continúa al siguiente paso

##### 🔹 SUB-PASO 3: ACTUALIZAR NAMESERVERS EN NAME.COM
```typescript
// nameComApi.ts línea 679-701
if (nameservers.length > 0) {
    await nameComRequest(
        `/domains/${domainName}:setNameservers`,
        'POST',
        { nameservers }
    );
}
```
- Solo se ejecuta si `nameservers.length > 0`
- Apunta dominio a Cloudflare
- Status → `'updating_nameservers'`

**Si PASO 2 falló:**
- Este paso SE OMITE (nameservers vacío)
- Dominio queda con nameservers default de Name.com
- ❌ Sitio NO funcionará en el dominio

##### 🔹 SUB-PASO 4: COMPLETAR ORDEN
```typescript
// nameComApi.ts línea 706-732
await orderRef.update({ status: 'completed' });

await userDomainRef.set({
    id: domainName,
    name: domainName,
    status: 'active',
    provider: 'Quimera',
    purchasedVia: 'Name.com',
    cloudflareZoneId: zoneId | null,
    nameservers: [...] | null,
    dnsConfigured: true | false,
    // ...
});
```

##### 🔹 SUB-PASO 5: REGISTRAR EN CUSTOMDOMAINS
```typescript
// nameComApi.ts línea 737-755
await db.collection('customDomains').doc(domainName).set({
    domain: domainName,
    userId,
    status: 'active',
    sslStatus: 'active',
    dnsVerified: true,
    cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
    // ...
});
```
- Para que Cloud Run sepa routear el tráfico
- ✅ **SIEMPRE FUNCIONA** (Firestore)

##### 🔹 SUB-PASO 6: AGREGAR A CLOUDFLARE WORKER
```typescript
// nameComApi.ts línea 760-773
const { addDomainToWorker } = await import('./cloudflareWorkerApi');
await addDomainToWorker(domainName);
```
- Configura routing automático en Worker
- ✅ **PUEDE FUNCIONAR** (usa workers_token)
- Si falla: try-catch, no detiene proceso

---

### FASE 3: USUARIO VE RESULTADO

#### Paso 6: Frontend polling
```typescript
// DomainsDashboard.tsx
const pollOrderStatus = useCallback(async (orderId: string) => {
    const { checkDomainOrderStatus } = await import('../../../services/nameComService');
    const status = await checkDomainOrderStatus(orderId);
    // Cada 3 segundos hasta completar o fallar
}, []);
```

#### Paso 7: Resultado final

**RESULTADO A: ✅ TODO BIEN** (con API Token correcto)
- Status: `'completed'`
- Nameservers: configurados con Cloudflare
- DNS: apuntando a Cloud Run
- SSL: activo via Cloudflare
- **Sitio: ✅ FUNCIONA** en el dominio (5-30 min propagación)

**RESULTADO B: ⚠️ PARCIAL** (sin API Token)
- Status: `'completed'`
- Nameservers: default de Name.com
- DNS: NO configurado
- SSL: NO activo
- **Sitio: ❌ NO FUNCIONA** en el dominio

---

## 🔍 Impacto del Problema Actual

### SIN API TOKEN CORRECTO:

#### ✅ Lo que SÍ funciona:
- ✅ Búsqueda de dominios (Name.com API)
- ✅ Checkout y pago (Stripe)
- ✅ Registro con Name.com (dominio se compra)
- ✅ Guardado en Firestore
- ✅ Orden marcada como "completada"

#### ❌ Lo que NO funciona:
- ❌ Creación de zona DNS en Cloudflare (PASO 2)
- ❌ Configuración de records DNS
- ❌ Actualización de nameservers (PASO 3)
- ❌ SSL automático
- ❌ Sitio NO carga en el dominio comprado

#### ⚠️ Experiencia del usuario:
1. Usuario paga $15 por `ejemplo.com`
2. Ve "completado" en el dashboard
3. Intenta visitar `https://ejemplo.com`
4. ❌ No carga (DNS no configurado)
5. Usuario confundido/frustrado
6. Requiere configuración manual (complicado)

---

## 🎯 Solución

### Para que dominios COMPRADOS funcionen automáticamente:

1. **Crear API Token de Cloudflare** con permisos DNS
   - 🔗 https://dash.cloudflare.com/profile/api-tokens
   - Usar plantilla: "Edit zone DNS"
   - Permisos: `Zone:DNS:Edit`, `Zone:Zone:Edit`

2. **Configurar en Firebase:**
   ```bash
   firebase functions:config:set cloudflare.api_token="TU_TOKEN_AQUI"
   ```

3. **Desplegar funciones:**
   ```bash
   firebase deploy --only functions:domains
   ```

### Después del fix:

✅ Usuario compra dominio  
✅ Name.com registra el dominio  
✅ Cloudflare crea zona DNS (PASO 2 funciona)  
✅ Records apuntan a Cloud Run  
✅ Nameservers actualizados (PASO 3 funciona)  
✅ SSL activo automáticamente  
✅ Sitio carga en 5-30 minutos (propagación DNS)  
✅ Usuario feliz 🎉

---

## 📋 Resumen

### Funcionalidades afectadas por falta de API Token:

❌ **Conectar dominio externo** (configuración automática)  
❌ **Comprar dominio** (configuración DNS automática)

### Ambas requieren el mismo fix:
- Crear API Token con permisos: `Zone:DNS:Edit`, `Zone:Zone:Edit`

### Prioridad: 🔴 ALTA
- Afecta flujo principal de monetización (compra de dominios)
- Usuarios pagan pero dominios no funcionan
- Impacto directo en satisfacción del cliente

### Tiempo de fix: 6-9 minutos
- Crear token (2-3 min)
- Ejecutar script (3-5 min)
- Verificar (1 min)

---

## 🔧 Script de Configuración Automática

Ya está disponible en el proyecto:

```bash
./CONFIGURAR_CLOUDFLARE_TOKEN.sh TU_TOKEN_AQUI
```

Este script:
- ✅ Actualiza Firebase Config
- ✅ Actualiza functions/.env (opcional)
- ✅ Compila las funciones
- ✅ Despliega a producción
- ✅ Verifica la configuración

---

**Última actualización:** 22 Diciembre 2025

