# Índices de Firestore Requeridos

Este documento lista todos los índices compuestos de Firestore necesarios para el correcto funcionamiento de la aplicación, especialmente para las funcionalidades del Plan Agency.

## Índices Críticos

### Collection: `tenants`

#### 1. Filtrar sub-clientes por agencia y estado
```
Collection: tenants
Fields indexed:
  - ownerTenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- AgencyDashboard para listar sub-clientes activos
- ReportsGenerator para filtrar clientes incluidos en reportes
- API /v1/tenants para listar sub-clientes
```

#### 2. Búsqueda de agencias por plan
```
Collection: tenants
Fields indexed:
  - subscriptionPlan (Ascending)
  - type (Ascending)
  - status (Ascending)

Query scope: Collection

Usado por:
- Scheduled reports (Cloud Functions)
- Admin dashboard para análisis de planes
```

#### 3. Búsqueda por propietario y tipo
```
Collection: tenants
Fields indexed:
  - ownerTenantId (Ascending)
  - type (Ascending)
  - updatedAt (Descending)

Query scope: Collection

Usado por:
- Dashboard de agencia para actividad reciente
```

### Collection: `tenantMembers`

#### 4. Obtener miembros por tenant y rol
```
Collection: tenantMembers
Fields indexed:
  - tenantId (Ascending)
  - role (Ascending)
  - status (Ascending)

Query scope: Collection

Usado por:
- InviteMemberModal para validar roles
- TeamManagement para filtrar por tipo de usuario
```

#### 5. Buscar membresías de un usuario
```
Collection: tenantMembers
Fields indexed:
  - userId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- TenantContext para listar tenants del usuario
- Dashboard principal para cambiar entre tenants
```

### Collection: `agencyActivity`

#### 6. Feed de actividad de agencia
```
Collection: agencyActivity
Fields indexed:
  - agencyTenantId (Ascending)
  - timestamp (Descending)

Query scope: Collection

Usado por:
- ClientActivityFeed en AgencyDashboard
- Activity timeline en overview
```

#### 7. Actividad por tipo
```
Collection: agencyActivity
Fields indexed:
  - agencyTenantId (Ascending)
  - type (Ascending)
  - timestamp (Descending)

Query scope: Collection

Usado por:
- Filtros de actividad por tipo (client_created, report_generated, etc.)
```

### Collection: `savedReports`

#### 8. Reportes de una agencia
```
Collection: savedReports
Fields indexed:
  - agencyTenantId (Ascending)
  - generatedAt (Descending)

Query scope: Collection

Usado por:
- ReportsGenerator para listar reportes guardados
```

#### 9. Buscar reportes por cliente incluido
```
Collection: savedReports
Fields indexed:
  - includedClients (Array contains)
  - generatedAt (Descending)

Query scope: Collection

Usado por:
- Ver reportes que incluyen un cliente específico
```

### Collection: `apiKeys`

#### 10. API Keys por tenant
```
Collection: apiKeys
Fields indexed:
  - tenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- ApiKeysManager para listar keys activas
```

#### 11. Buscar API Key por hash
```
Collection: apiKeys
Fields indexed:
  - keyHash (Ascending)
  - status (Ascending)

Query scope: Collection

Usado por:
- Middleware de autenticación de API
```

### Collection: `apiUsage`

#### 12. Rate limiting check
```
Collection: apiUsage
Fields indexed:
  - keyId (Ascending)
  - timestamp (Descending)

Query scope: Collection

Usado por:
- checkRateLimit() en middleware de API
```

#### 13. Usage analytics por tenant
```
Collection: apiUsage
Fields indexed:
  - tenantId (Ascending)
  - timestamp (Descending)

Query scope: Collection

Usado por:
- Dashboard de API para ver uso por tenant
```

### Collection: `webhooks`

#### 14. Webhooks activos de un tenant
```
Collection: webhooks
Fields indexed:
  - tenantId (Ascending)
  - status (Ascending)

Query scope: Collection

Usado por:
- WebhooksManager para listar webhooks configurados
```

#### 15. Buscar webhooks por evento
```
Collection: webhooks
Fields indexed:
  - tenantId (Ascending)
  - events (Array contains)
  - status (Ascending)

Query scope: Collection

Usado por:
- triggerWebhook() para encontrar webhooks suscritos a un evento
```

### Collection: `invoices`

#### 16. Invoices de una agencia
```
Collection: invoices
Fields indexed:
  - agencyTenantId (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- InvoiceHistory para listar facturas
```

#### 17. Invoices por cliente
```
Collection: invoices
Fields indexed:
  - clientTenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- ClientBillingManager para ver historial de pagos
```

#### 18. Buscar invoices por mes/año
```
Collection: invoices
Fields indexed:
  - agencyTenantId (Ascending)
  - year (Ascending)
  - month (Ascending)

Query scope: Collection

Usado por:
- Revenue analytics por período
```

### Collection: `permissionTemplates`

#### 19. Templates de un tenant
```
Collection: permissionTemplates
Fields indexed:
  - tenantId (Ascending)
  - isSystem (Ascending)

Query scope: Collection

Usado por:
- PermissionTemplates para separar system vs custom
```

### Collection: `leads`

#### 20. Leads de un tenant por fuente y fecha
```
Collection: leads
Fields indexed:
  - tenantId (Ascending)
  - source (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- Reportes consolidados para agrupar leads por fuente
```

#### 21. Leads por estado
```
Collection: leads
Fields indexed:
  - tenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- Dashboard de leads y reportes
```

### Collection: `analytics`

#### 22. Analytics por tenant y fecha
```
Collection: analytics
Fields indexed:
  - tenantId (Ascending)
  - date (Ascending)

Query scope: Collection

Usado por:
- Reportes consolidados para métricas de visitas
```

### Collection: `orders`

#### 23. Órdenes por tenant y estado
```
Collection: orders
Fields indexed:
  - tenantId (Ascending)
  - status (Ascending)
  - createdAt (Descending)

Query scope: Collection

Usado por:
- Reportes consolidados para calcular revenue
```

#### 24. Órdenes pagadas por período
```
Collection: orders
Fields indexed:
  - tenantId (Ascending)
  - status (Ascending)
  - paidAt (Descending)

Query scope: Collection

Usado por:
- Revenue analytics en reportes
```

### Collection: `emailCampaigns`

#### 25. Campañas por tenant y fecha
```
Collection: emailCampaigns
Fields indexed:
  - tenantId (Ascending)
  - sentAt (Descending)

Query scope: Collection

Usado por:
- Reportes consolidados para métricas de email marketing
```

---

## Cómo Crear Estos Índices

### Opción 1: Firebase Console (Recomendado para producción)

1. Ve a Firebase Console → Firestore Database → Indexes
2. Click en "Create Index"
3. Selecciona la colección
4. Agrega los campos con sus direcciones (Ascending/Descending/Array-contains)
5. Click en "Create"

### Opción 2: firestore.indexes.json

Agrega los índices al archivo `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "tenants",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "ownerTenantId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "agencyActivity",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "agencyTenantId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    }
    // ... más índices ...
  ]
}
```

Luego ejecuta:
```bash
firebase deploy --only firestore:indexes
```

### Opción 3: Automático vía Error

Cuando ejecutas una query que requiere un índice, Firestore arroja un error con un link directo para crear el índice. Simplemente:

1. Ejecuta la query
2. Copia el link del error
3. Abre el link en el navegador
4. Click en "Create Index"

---

## Índices Automáticos

Firestore crea automáticamente índices de campo único para:
- Todos los campos individuales (igualdad)
- Array-contains

**No necesitas** crear índices manuales para queries simples como:
```javascript
// Estos NO requieren índice compuesto
.where('tenantId', '==', 'xyz')
.where('status', 'in', ['active', 'trial'])
.orderBy('createdAt', 'desc')  // solo si no hay otros where
```

---

## Verificación de Índices

Para verificar que todos los índices están creados:

```bash
# Listar índices actuales
firebase firestore:indexes:list

# Ver estado de construcción
# Ve a Firebase Console → Firestore → Indexes
```

Los índices pueden tardar varios minutos en construirse, especialmente si ya tienes datos.

---

## Monitoreo de Performance

### Queries Lentas

1. Ve a Firebase Console → Firestore → Usage
2. Revisa "Read Operations" y busca picos
3. Usa Cloud Logging para ver queries lentas:

```
resource.type="cloud_firestore_database"
protoPayload.methodName="google.firestore.v1.Firestore.RunQuery"
protoPayload.metadata.duration>"1s"
```

### Índices Faltantes

Si ves errores como:
```
FAILED_PRECONDITION: The query requires an index
```

Significa que falta crear el índice. El error incluirá un link directo para crearlo.

---

## Costos de Índices

- **Almacenamiento**: Cada entrada de índice cuenta para el storage
- **Escrituras**: Cada write a un documento actualiza todos sus índices (cuenta como write adicional)

**Ejemplo:**
- Documento con 3 índices compuestos
- 1 write al documento = 1 + 3 = **4 writes total**

**Tip:** Revisa los índices periódicamente y elimina los que no se usan.

---

## Mantenimiento

### Eliminar Índices No Usados

1. Identifica índices sin uso en los últimos 30 días (Firebase Console → Firestore → Indexes → Usage)
2. Elimínalos para reducir costos:

```bash
firebase firestore:indexes:delete [INDEX_ID]
```

### Actualizar Índices

Si necesitas cambiar un índice:
1. Crea el nuevo índice
2. Espera a que termine de construirse
3. Elimina el índice antiguo

---

## Índices para Development vs Production

### Development
Usa Firestore Emulator que **no requiere índices**:

```bash
firebase emulators:start --only firestore
```

Útil para desarrollo rápido sin preocuparte por índices.

### Production
**Todos los índices deben existir** antes de lanzar features que los usen.

**Checklist de Deploy:**
- [ ] Identificar queries nuevas en el código
- [ ] Crear índices necesarios en Firestore
- [ ] Esperar a que se construyan (status: "Enabled")
- [ ] Deploy de código

---

## Troubleshooting

### Error: "Index already exists"
El índice ya existe. Verifica en Firebase Console → Firestore → Indexes.

### Error: "Cannot add index: Too many indexes"
Límite: 200 índices compuestos por proyecto. Revisa y elimina índices no usados.

### Error: "Index creation failed"
Verifica:
- Nombres de campos correctos
- Tipos de datos compatibles
- No hay índices duplicados

### Query lenta incluso con índice
- Revisa el tamaño de los documentos (debe ser < 1MB)
- Considera paginar resultados (usa `limit()`)
- Revisa si necesitas denormalización de datos

---

## Referencias

- [Firestore Indexes Official Docs](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Best Practices for Indexes](https://firebase.google.com/docs/firestore/best-practices)
- [Understanding Index Costs](https://firebase.google.com/docs/firestore/pricing)

---

**Última actualización:** Enero 2026
