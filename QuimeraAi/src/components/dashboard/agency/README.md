# Agency Dashboard Components

Componentes React para administrar las Cloud Functions del Agency Plan.

## Componentes Disponibles

### 1. BillingSettings

Gestión de facturación con Stripe Connect para sub-clientes.

**Uso:**
```tsx
import { BillingSettings } from '@/components/dashboard/agency';

function AgencyBillingPage() {
  return <BillingSettings />;
}
```

**Funcionalidades:**
- ✅ Conectar cuenta de Stripe Connect
- ✅ Ver estado de la cuenta (activo, pendiente)
- ✅ Configurar precio mensual por sub-cliente
- ✅ Actualizar precios existentes
- ✅ Cancelar facturación de clientes
- ✅ Generar invoices manuales
- ✅ Abrir dashboard de Stripe

**Cloud Functions utilizadas:**
- `agencyBilling-createStripeConnectAccount`
- `agencyBilling-getStripeConnectStatus`
- `agencyBilling-setupClientBilling`
- `agencyBilling-updateClientMonthlyPrice`
- `agencyBilling-cancelClientSubscription`
- `agencyBilling-generateClientInvoice`

---

### 2. ReportsGenerator

Generador de reportes consolidados con múltiples métricas y templates.

**Uso:**
```tsx
import { ReportsGenerator } from '@/components/dashboard/agency';

function AgencyReportsPage() {
  return <ReportsGenerator />;
}
```

**Funcionalidades:**
- ✅ Seleccionar clientes (todos o específicos)
- ✅ Configurar rango de fechas
- ✅ Seleccionar métricas a incluir (leads, visitas, ventas, emails, AI usage)
- ✅ Elegir template de reporte (Ejecutivo, Detallado, Comparativa)
- ✅ Generar reporte con análisis y recomendaciones
- ✅ Exportar a CSV
- ✅ Descargar PDF (próximamente)

**Métricas disponibles:**
- **Leads**: Capturados, convertidos, por fuente
- **Visitas Web**: Tráfico, páginas vistas, bounce rate
- **Ventas**: Órdenes, ingresos, ticket promedio
- **Email Marketing**: Campañas, aperturas, clicks
- **Uso de AI**: Créditos consumidos, storage utilizado

**Cloud Functions utilizadas:**
- `agencyReports-generate`
- `agencyReports-getSaved`
- `agencyReports-deleteSaved`

---

### 3. ClientIntakeForm

Formulario de onboarding automatizado para nuevos sub-clientes.

**Uso:**
```tsx
import { ClientIntakeForm } from '@/components/dashboard/agency';

function NewClientPage() {
  return (
    <ClientIntakeForm
      onSuccess={() => {
        // Redirect or show success message
        navigate('/dashboard/agency/clients');
      }}
    />
  );
}
```

**Funcionalidades:**
- ✅ Wizard de 4 pasos
- ✅ Información del negocio (nombre, industria, contacto)
- ✅ Selección de funcionalidades (CMS, Leads, E-commerce, etc.)
- ✅ Configuración de branding (colores, logo)
- ✅ Agregar usuarios iniciales con roles
- ✅ Envío automático de invitaciones por email
- ✅ Creación de proyecto desde template (opcional)

**Flujo del wizard:**
1. **Información del Cliente**: Nombre, industria, email, teléfono
2. **Funcionalidades**: CMS, Leads, E-commerce, Chatbot, Email
3. **Branding**: Colores primario y secundario, logo (opcional)
4. **Usuarios**: Agregar usuarios con nombre, email y rol

**Cloud Functions utilizadas:**
- `agencyOnboarding-autoProvision`
- `agencyOnboarding-getStatus`

---

### 4. AddonsManager

Gestión de add-ons de subscription (sub-clientes extra, storage, AI credits).

**Uso:**
```tsx
import { AddonsManager } from '@/components/dashboard/agency';

function AgencyAddonsPage() {
  return <AddonsManager />;
}
```

**Funcionalidades:**
- ✅ Ver precios de add-ons
- ✅ Aumentar/reducir cantidad de cada add-on
- ✅ Cálculo automático de costo mensual
- ✅ Vista previa de cambios antes de aplicar
- ✅ Actualización de subscription con proration
- ✅ Información sobre facturación y proration

**Add-ons disponibles:**
- **Sub-clientes Adicionales**: $15 por cliente
- **Almacenamiento Extra**: $10 por 100GB
- **AI Credits Extra**: $20 por 1000 créditos

**Cloud Functions utilizadas:**
- `agencyBilling-getAddonsPricing`
- `agencyBilling-calculateAddonsPrice`
- `agencyBilling-checkAddonsEligibility`
- `agencyBilling-updateSubscriptionAddons`

---

## Configuración Inicial

### 1. Instalar dependencias

```bash
cd QuimeraAi
npm install
```

### 2. Configurar Firebase Functions

```bash
cd functions

# Configurar Stripe
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# Configurar URL base
firebase functions:config:set app.base_url="https://quimera.ai"
```

### 3. Desplegar Cloud Functions

```bash
# Desplegar todas las funciones
firebase deploy --only functions

# O solo las del Agency Plan
firebase deploy --only functions:agencyBilling,functions:agencyReports,functions:agencyOnboarding,functions:agencyApi
```

### 4. Configurar Webhooks de Stripe

1. Ve a Stripe Dashboard → Webhooks
2. Agrega endpoint: `https://us-central1-quimeraai.cloudfunctions.net/agencyBilling-webhook`
3. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copia el webhook secret y configúralo en Firebase

---

## Ejemplo de Integración Completa

```tsx
// pages/dashboard/agency/index.tsx
import React, { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import {
  BillingSettings,
  ReportsGenerator,
  ClientIntakeForm,
  AddonsManager,
} from '@/components/dashboard/agency';

export default function AgencyDashboard() {
  const [activeTab, setActiveTab] = useState('billing');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Agency Dashboard</h1>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'billing', label: 'Facturación' },
          { id: 'reports', label: 'Reportes' },
          { id: 'new-client', label: 'Nuevo Cliente' },
          { id: 'addons', label: 'Add-ons' },
        ]}
      />

      <div className="mt-6">
        {activeTab === 'billing' && <BillingSettings />}
        {activeTab === 'reports' && <ReportsGenerator />}
        {activeTab === 'new-client' && (
          <ClientIntakeForm onSuccess={() => setActiveTab('billing')} />
        )}
        {activeTab === 'addons' && <AddonsManager />}
      </div>
    </div>
  );
}
```

---

## Rutas Recomendadas

```tsx
// routes.tsx
{
  path: '/dashboard/agency',
  element: <AgencyDashboard />,
  children: [
    { path: 'overview', element: <AgencyOverview /> },
    { path: 'billing', element: <BillingSettings /> },
    { path: 'reports', element: <ReportsGenerator /> },
    { path: 'new-client', element: <ClientIntakeForm /> },
    { path: 'addons', element: <AddonsManager /> },
  ]
}
```

---

## Permisos Requeridos

Todos los componentes verifican automáticamente que el usuario tenga el rol `agency_owner` o `agency_admin` antes de permitir operaciones.

**Validación en Cloud Functions:**
```typescript
async function verifyAgencyOwner(userId: string): Promise<string> {
  const memberSnapshot = await db.collection('tenantMembers')
    .where('userId', '==', userId)
    .where('role', '==', 'agency_owner')
    .limit(1)
    .get();

  if (memberSnapshot.empty) {
    throw new functions.https.HttpsError('permission-denied', 'User is not an agency owner');
  }

  return memberSnapshot.docs[0].data().tenantId;
}
```

---

## Manejo de Errores

Todos los componentes implementan manejo de errores con toast notifications:

```tsx
try {
  const result = await someCloudFunction();
  toast.success('Operación exitosa');
} catch (error: any) {
  console.error('Error:', error);
  toast.error('Error: ' + error.message);
}
```

---

## Testing

### Testing Local con Emulators

```bash
# Iniciar emulators
firebase emulators:start

# Las funciones estarán disponibles en:
# http://localhost:5001/quimeraai/us-central1/agencyBilling-createStripeConnectAccount
```

### Testing de Componentes

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingSettings } from './BillingSettings';

describe('BillingSettings', () => {
  it('should connect Stripe account', async () => {
    render(<BillingSettings />);

    const connectButton = screen.getByText('Conectar Stripe');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument();
    });
  });
});
```

---

## Monitoreo

### Ver logs en tiempo real

```bash
# Ver todos los logs
firebase functions:log --follow

# Ver logs específicos
firebase functions:log --only agencyBilling
```

### Métricas en Firebase Console

- **URL**: https://console.firebase.google.com/project/quimeraai/functions
- Métricas disponibles:
  - Invocaciones
  - Errores
  - Tiempo de ejecución
  - Memoria utilizada

---

## Solución de Problemas

### Error: "API key required"

**Problema**: Las Cloud Functions requieren autenticación pero no se está enviando el token.

**Solución**: Asegúrate de que el usuario esté autenticado:
```tsx
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const functions = getFunctions();

// Automáticamente incluye el token de autenticación
const myFunction = httpsCallable(functions, 'myFunction');
```

### Error: "Permission denied"

**Problema**: El usuario no tiene el rol correcto.

**Solución**: Verifica que el usuario sea `agency_owner` en la colección `tenantMembers`.

### Error: "Rate limit exceeded"

**Problema**: Se superó el límite de requests/minuto.

**Solución**:
- Plan Agency: 100 req/min
- Plan Agency Plus: 500 req/min
- Plan Enterprise: 2000 req/min

Considera actualizar el plan o esperar 1 minuto.

---

## Recursos Adicionales

- [Documentación de Stripe Connect](https://stripe.com/docs/connect)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Agency Plan Features Guide](../../../docs/AGENCY_PLAN_FEATURES.md)
- [API Documentation](../../../docs/API_DOCUMENTATION.md)

---

## Soporte

Para reportar bugs o solicitar features:
- GitHub Issues: https://github.com/your-repo/issues
- Email: support@quimera.ai
- Discord: https://discord.gg/quimera
