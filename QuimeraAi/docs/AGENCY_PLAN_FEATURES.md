# Guía Completa del Plan Agency

## Índice

1. [Introducción](#introducción)
2. [Dashboard de Agencia](#dashboard-de-agencia)
3. [Reportes Consolidados](#reportes-consolidados)
4. [Facturación a Clientes](#facturación-a-clientes)
5. [Onboarding Automatizado](#onboarding-automatizado)
6. [Plantillas de Permisos](#plantillas-de-permisos)
7. [Add-ons y Expansión](#add-ons-y-expansión)
8. [API de Gestión](#api-de-gestión)
9. [Multi-idioma](#multi-idioma)
10. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El **Plan Agency** de Quimera.ai está diseñado para agencias que gestionan múltiples clientes. Incluye herramientas avanzadas para gestión, facturación, reportes y automatización.

### Planes Disponibles

| Característica | Agency | Agency Plus | Enterprise |
|---|---|---|---|
| **Precio** | $99/mes | $199/mes | Personalizado |
| **Sub-clientes** | 10 | 25 | Hasta 500 |
| **AI Credits** | 5,000 | 10,000 | Custom |
| **Almacenamiento** | 100 GB | 250 GB | Custom |
| **Reportes Consolidados** | ✅ | ✅ | ✅ |
| **Stripe Connect** | ✅ | ✅ | ✅ |
| **API REST** | 100 req/min | 500 req/min | 2000 req/min |
| **Onboarding Automatizado** | ❌ | ✅ | ✅ |
| **SLA Soporte** | 24h | 4h | 1h |

---

## Dashboard de Agencia

### Cómo Acceder

1. Inicia sesión como **agency_owner**
2. Navega a **Dashboard** → **Agency Overview**
3. Verás métricas consolidadas de todos tus sub-clientes

### Funcionalidades

#### 📊 Vista General (Overview)

Muestra KPIs agregados en tiempo real:

- **MRR Total** - Ingresos mensuales recurrentes de todos los clientes
- **Total de Sub-clientes** - Activos vs. límite del plan
- **Uso de Recursos** - Storage, AI credits, proyectos
- **Tasa de Conversión** - Promedio de leads a clientes

#### 👥 Lista de Clientes

Vista detallada de cada sub-cliente:

```
┌─────────────────────────────────────────────────────┐
│ Cliente ABC                              ⚠️ 85% uso │
│ café-del-centro                                     │
│ ─────────────────────────────────────────────────── │
│ 📊 3 proyectos  👥 5 usuarios  💾 12.5 GB          │
│ 🎯 45 leads     💰 $2,450 MRR                      │
│                                                     │
│ [Ver Dashboard] [Generar Reporte] [Facturación]    │
└─────────────────────────────────────────────────────┘
```

**Alertas automáticas:**
- ⚠️ **Amarillo** - Uso >80% de algún recurso
- 🔴 **Rojo** - Uso >95% de algún recurso

#### 📈 Feed de Actividad

Últimas 50 actividades cross-client en tiempo real:

```
🆕 Cliente XYZ creado - hace 5 min
📄 Reporte generado para Cliente ABC - hace 1h
💳 Pago recibido de Cliente DEF ($150) - hace 2h
👤 Nuevo usuario agregado a Cliente GHI - hace 3h
```

#### 📅 Calendario de Renovaciones

Próximas renovaciones en los siguientes 30 días:

```
┌────────────────────────────────┐
│ 15 Ene - Cliente ABC ($150)   │
│ 18 Ene - Cliente DEF ($200)   │
│ 22 Ene - Cliente GHI ($99)    │
└────────────────────────────────┘
```

### Tips de Uso

- 💡 Configura alertas por email para recursos críticos (>90%)
- 💡 Revisa el dashboard diariamente para detectar problemas temprano
- 💡 Usa los filtros para ver solo clientes activos, en trial, etc.

---

## Reportes Consolidados

### Tipos de Reportes

#### 1. Resumen Ejecutivo (Recomendado)

Ideal para presentar a la gerencia o clientes:

- 📊 KPIs principales en cards visuales
- 📈 Gráficos de tendencias (último mes vs anterior)
- 🎯 Top 3 clientes por rendimiento
- 💡 Insights automáticos

**Duración de generación:** 30-60 segundos

#### 2. Reporte Detallado

Análisis profundo con todas las métricas:

- 📊 Métricas por cliente (tabla completa)
- 📈 Gráficos individuales por métrica
- 🎯 Desglose por fuente de leads
- 💰 Análisis de ingresos detallado
- 📧 Performance de email marketing

**Duración de generación:** 1-2 minutos

#### 3. Comparativa de Clientes

Benchmarking entre sub-clientes:

- 📊 Ranking por métrica (leads, ventas, conversión)
- 📈 Gráficos comparativos
- 🎯 Identificación de mejores prácticas
- 💡 Recomendaciones por cliente

**Duración de generación:** 1-2 minutos

### Cómo Generar un Reporte

#### Paso 1: Configurar

```
Dashboard → Reports → Generate Report
```

1. **Seleccionar clientes:**
   - Todos los sub-clientes
   - Clientes específicos (multi-select)

2. **Rango de fechas:**
   - Último mes
   - Últimos 3 meses
   - Último año
   - Personalizado

3. **Métricas a incluir:**
   - ✅ Leads (nuevos, convertidos, fuentes)
   - ✅ Visitas web (analytics)
   - ✅ Ventas (ingresos, tickets, productos)
   - ✅ Email marketing (enviados, abiertos, clicks)
   - ✅ AI usage (créditos consumidos)
   - ✅ Storage (archivos, tamaño)

4. **Template:**
   - Resumen Ejecutivo (1-2 páginas)
   - Detallado (5-10 páginas)
   - Comparativa (3-5 páginas)

#### Paso 2: Vista Previa

El sistema muestra una preview del reporte con:

- Métricas principales
- Gráficos de ejemplo
- Cantidad estimada de páginas

#### Paso 3: Generar

Opciones de exportación:

- **📄 PDF** - Documento profesional con branding
- **📊 CSV** - Datos crudos para Excel/Sheets
- **📧 Email** - Enviar directamente a destinatarios

### Branding Personalizado

Los reportes PDF incluyen automáticamente:

- 🎨 Logo de tu agencia
- 🌈 Colores corporativos (primary/secondary)
- 📝 Pie de página con información de contacto
- ✉️ Email "from" personalizado

Configuración en: **Settings → Branding**

### Reportes Programados

Automatiza el envío de reportes mensuales/semanales:

```
Settings → Reports → Scheduled Reports

┌─────────────────────────────────────────┐
│ ✅ Habilitar reportes automáticos       │
│                                         │
│ Frecuencia: ⦿ Mensual  ○ Semanal      │
│ Día del mes: [1] (primero de cada mes) │
│                                         │
│ Destinatarios:                          │
│ • manager@miagencia.com                 │
│ • director@miagencia.com                │
│ [+ Agregar]                             │
│                                         │
│ Incluir clientes: ⦿ Todos  ○ Activos  │
│                                         │
│ [Guardar Configuración]                 │
└─────────────────────────────────────────┘
```

Los reportes se envían automáticamente vía email con el PDF adjunto.

### Guardar y Compartir

Reportes guardados disponibles en:

```
Reports → Saved Reports

┌─────────────────────────────────────────────────┐
│ Reporte Enero 2026                    15 Ene   │
│ Clientes: Todos (12)  |  Tipo: Ejecutivo       │
│ [Descargar PDF] [Descargar CSV] [Eliminar]     │
├─────────────────────────────────────────────────┤
│ Reporte Diciembre 2025                 1 Ene   │
│ Clientes: Top 5       |  Tipo: Comparativa     │
│ [Descargar PDF] [Descargar CSV] [Eliminar]     │
└─────────────────────────────────────────────────┘
```

---

## Facturación a Clientes

### Stripe Connect Setup

#### Paso 1: Conectar Cuenta de Stripe

```
Billing → Stripe Settings → [Conectar Stripe]
```

1. Serás redirigido a Stripe
2. Completa el onboarding (información fiscal, bancaria)
3. Verifica tu identidad
4. Una vez aprobado, podrás facturar a clientes

**Tiempo estimado:** 5-10 minutos (verificación puede tardar 1-2 días)

#### Paso 2: Configurar Precios por Cliente

```
Billing → Client Management

┌───────────────────────────────────────────────────┐
│ Cliente          Precio/mes    Pago      Status  │
├───────────────────────────────────────────────────┤
│ Café del Centro  $150         💳 •••• 4242  ✅    │
│ [Editar Precio] [Ver Invoices]                   │
├───────────────────────────────────────────────────┤
│ Restaurante XYZ  $200         ⚠️ No config.      │
│ [Configurar Billing]                             │
└───────────────────────────────────────────────────┘
```

**Editar precio:**
1. Click en "Editar Precio"
2. Ingresa nuevo monto (ej: $175)
3. Guardar → Se actualiza en Stripe
4. El cambio se prorratea automáticamente

#### Paso 3: Agregar Método de Pago

Para clientes sin método de pago:

```
[Configurar Billing]

┌─────────────────────────────────────┐
│ Configurar Facturación              │
│                                     │
│ Precio mensual: $ [150] USD        │
│                                     │
│ Método de pago:                     │
│ ⦿ Tarjeta de crédito               │
│ ○ Débito bancario (ACH)            │
│                                     │
│ [Usar tarjeta de prueba]            │
│                                     │
│ [Guardar y Activar]                 │
└─────────────────────────────────────┘
```

**Tarjetas de prueba (modo sandbox):**
- `4242 4242 4242 4242` - Visa exitosa
- `4000 0000 0000 9995` - Visa declinada

### Cargos Automáticos

Una vez configurado, Stripe cobra automáticamente:

- 📅 **Frecuencia:** Mensual
- 💰 **Monto:** Precio base + overages
- 📧 **Notificación:** Email al cliente y a ti
- 🧾 **Invoice:** Generado automáticamente

**Cálculo de Overages:**

```
Cliente usa:
- Storage: 120 GB (límite: 100 GB) = +20 GB
- AI Credits: 5,500 (límite: 5,000) = +500 credits

Overage charge:
- 20 GB × $0.10 = $2.00
- 500 credits × $0.02 = $10.00
- Total overage: $12.00

Cargo total del mes: $150 (base) + $12 (overage) = $162
```

### Gestión de Pagos Fallidos

Si un pago falla:

1. **Webhook notifica automáticamente**
2. **Cliente es suspendido** (status → 'suspended')
3. **Email automático** al cliente
4. **Alerta en tu dashboard**

**Acciones:**

```
Cliente con pago fallido:

┌─────────────────────────────────────────┐
│ ⚠️ Pago fallido - Restaurante XYZ       │
│ Razón: Tarjeta expirada                 │
│                                         │
│ [Reintentar Cargo]                      │
│ [Actualizar Método de Pago]             │
│ [Suspender Temporalmente]               │
│ [Cancelar Subscription]                 │
└─────────────────────────────────────────┘
```

### Ver Historial de Ingresos

```
Billing → Revenue History

┌─────────────────────────────────────────────────┐
│ 📊 Estadísticas                                 │
│ Total (30d): $4,850  |  Promedio: $161.67      │
│ Exitosos: 28/30      |  Tasa éxito: 93.3%      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Fecha      Cliente             Monto   Invoice  │
├─────────────────────────────────────────────────┤
│ 15 Ene    Café del Centro      $152    [PDF]   │
│ 15 Ene    Restaurante XYZ      $200    [PDF]   │
│ 14 Ene    Tienda ABC           $99     [PDF]   │
└─────────────────────────────────────────────────┘
```

**Filtros disponibles:**
- Rango de fechas
- Por cliente
- Status (exitoso, fallido, reembolsado)
- Exportar a CSV

### Generar Invoices Manuales

Para cargos one-time o ajustes:

```
Cliente → Billing → [Generar Invoice Manual]

┌─────────────────────────────────────┐
│ Generar Invoice Manual              │
│                                     │
│ Descripción:                        │
│ [Setup inicial del proyecto]        │
│                                     │
│ Monto: $ [500] USD                 │
│                                     │
│ ☐ Cobrar inmediatamente            │
│ ☑ Enviar por email                 │
│                                     │
│ [Generar Invoice]                   │
└─────────────────────────────────────┘
```

---

## Onboarding Automatizado

### Flujo Completo

El sistema automatiza la creación de nuevos sub-clientes en 4 pasos:

```
[Formulario] → [Provisión] → [Invitaciones] → [Completado]
```

### Paso 1: Información del Cliente

```
Dashboard → Clients → [Add New Client]

┌─────────────────────────────────────────────┐
│ Paso 1/4: Información del Cliente          │
│                                             │
│ Nombre del negocio: *                       │
│ [Café del Centro                        ]  │
│                                             │
│ Industria: *                                │
│ [Restaurante                            ▼]  │
│                                             │
│ Email de contacto: *                        │
│ [contacto@cafedelcentro.com             ]  │
│                                             │
│ Teléfono (opcional):                        │
│ [+52 55 1234 5678                       ]  │
│                                             │
│ [Cancelar]              [Siguiente →]      │
└─────────────────────────────────────────────┘
```

**Industrias disponibles:**
- Restaurante
- Retail / Tienda
- Servicios Profesionales
- Salud y Bienestar
- Bienes Raíces
- Educación
- Tecnología
- Hospitalidad / Hoteles
- Fitness y Deportes
- Otro

### Paso 2: Funcionalidades

```
┌─────────────────────────────────────────────┐
│ Paso 2/4: Funcionalidades Iniciales        │
│                                             │
│ Selecciona las herramientas que necesita:  │
│                                             │
│ ☑ CMS / Blog                                │
│   Editor de contenido y blog               │
│                                             │
│ ☑ Leads y CRM                               │
│   Gestión de leads y contactos             │
│                                             │
│ ☐ E-commerce                                │
│   Tienda online y productos                │
│                                             │
│ ☑ Chatbot con IA                            │
│   Asistente virtual inteligente            │
│                                             │
│ ☑ Email Marketing                           │
│   Campañas de email automatizadas          │
│                                             │
│ ☐ Analytics                                 │
│   Métricas y análisis web                  │
│                                             │
│ [← Atrás]                [Siguiente →]     │
└─────────────────────────────────────────────┘
```

### Paso 3: Branding (Opcional)

```
┌─────────────────────────────────────────────┐
│ Paso 3/4: Branding                          │
│                                             │
│ Logo del Cliente:                           │
│ [📁 Subir archivo...]      ✅ logo.png     │
│                                             │
│ Color Primario:          Color Secundario: │
│ [🎨] #3B82F6            [🎨] #10B981      │
│                                             │
│ Vista Previa:                               │
│ ┌─────────────────────────────────────┐    │
│ │  Café del Centro                    │    │
│ │  [Gradient azul → verde]            │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [← Atrás]                [Siguiente →]     │
└─────────────────────────────────────────────┘
```

### Paso 4: Usuarios y Facturación

```
┌─────────────────────────────────────────────┐
│ Paso 4/4: Usuarios Iniciales               │
│                                             │
│ Usuario 1                        [Eliminar] │
│ Nombre: [Juan Pérez              ]         │
│ Email:  [juan@cafedelcentro.com  ]         │
│ Rol:    [Administrador           ▼]        │
│ ─────────────────────────────────────────── │
│                                             │
│ Usuario 2                        [Eliminar] │
│ Nombre: [María García            ]         │
│ Email:  [maria@cafedelcentro.com ]         │
│ Rol:    [Usuario                 ▼]        │
│ ─────────────────────────────────────────── │
│                                             │
│ [+ Agregar Usuario]                         │
│                                             │
│ ☐ Configurar facturación ahora              │
│   Precio mensual: $ [___] USD               │
│                                             │
│ [← Atrás]         [✅ Crear Cliente]       │
└─────────────────────────────────────────────┘
```

### Provisión Automática

Una vez que haces click en "Crear Cliente", el sistema:

```
┌─────────────────────────────────────────────┐
│ ⏳ Configurando Cliente...                  │
│                                             │
│ ✅ Subiendo logo del cliente                │
│ ⏳ Creando workspace del cliente...         │
│ ⏹️ Proyecto inicial creado desde template   │
│ ⏹️ 2 invitaciones enviadas por email        │
│ ⏹️ Configuración de facturación guardada    │
└─────────────────────────────────────────────┘
```

**Tiempo estimado:** 15-30 segundos

### Completado

```
┌─────────────────────────────────────────────┐
│ 🎉 ¡Cliente Creado Exitosamente!            │
│                                             │
│ El workspace ha sido configurado            │
│                                             │
│ 📊 Resumen:                                 │
│ ┌─────────────────────────────────────┐    │
│ │ 👥 2 Usuarios Invitados             │    │
│ │ 📄 1 Proyecto Creado                │    │
│ │ ✉️ 2 Emails Enviados                │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ 📋 Próximos Pasos:                          │
│ ✅ Los usuarios recibirán un email          │
│ ✅ El proyecto está listo para editar       │
│ ✅ Puedes configurar billing ahora          │
│                                             │
│ [Ver Dashboard del Cliente]                 │
│ [Agregar Otro Cliente]                      │
└─────────────────────────────────────────────┘
```

### Email de Bienvenida

Los usuarios reciben un email automático:

```
De: Tu Agencia <noreply@tuagencia.com>
Para: juan@cafedelcentro.com
Asunto: ¡Bienvenido a Café del Centro!

┌─────────────────────────────────────────────┐
│ [Logo de Tu Agencia]                        │
│ ¡Bienvenido a Café del Centro!              │
└─────────────────────────────────────────────┘

Hola Juan,

Tu Agencia ha creado un workspace personalizado
para Café del Centro. Tu plataforma ya está lista
con todas las herramientas que necesitas.

🚀 Primeros Pasos:
1. Completa tu perfil personal
2. Explora tu dashboard personalizado
3. Revisa las herramientas disponibles
4. Contacta a tu agencia para soporte

[Acceder a Mi Dashboard →]

💡 Consejo: Este enlace expira en 7 días.

¿Qué puedes hacer en tu dashboard?
• 📊 Panel de análisis en tiempo real
• 🎨 Editor visual de sitios web
• 👥 Gestión de leads y CRM
• 🛍️ Herramientas de e-commerce
• 📧 Marketing por email
• 🤖 Chatbots con IA

Si tienes preguntas, contacta a Tu Agencia.

Powered by Tu Agencia
© 2026 Tu Agencia. Todos los derechos reservados.
```

---

## Plantillas de Permisos

### Templates del Sistema

8 plantillas predefinidas listas para usar:

#### 1. **Editor de Blog Únicamente**
```
Permisos:
✅ Gestionar CMS
✅ Gestionar archivos
❌ Todo lo demás

Riesgo: 🟢 Bajo
Ideal para: Redactores de contenido
```

#### 2. **Especialista en CRM**
```
Permisos:
✅ Gestionar leads
✅ Ver analytics
✅ Exportar datos
❌ Modificar proyectos, facturación, etc.

Riesgo: 🟡 Medio
Ideal para: Vendedores, marketing
```

#### 3. **Gerente de E-commerce**
```
Permisos:
✅ Gestionar productos
✅ Gestionar pedidos
✅ E-commerce completo
✅ Ver analytics
❌ Gestionar usuarios, facturación

Riesgo: 🟡 Medio
Ideal para: Gerente de tienda online
```

#### 4. **Diseñador Web**
```
Permisos:
✅ Gestionar proyectos
✅ Gestionar archivos
✅ Gestionar CMS
❌ Ver datos sensibles, billing

Riesgo: 🟢 Bajo
Ideal para: Diseñadores, freelancers
```

#### 5. **Analista de Datos**
```
Permisos:
✅ Ver analytics
✅ Exportar datos
✅ Ver leads (solo lectura)
❌ Modificar nada

Riesgo: 🟢 Bajo
Ideal para: Analistas, consultores
```

#### 6. **Soporte al Cliente**
```
Permisos:
✅ Ver leads
✅ Ver pedidos
✅ Gestionar chat
❌ Modificar, borrar

Riesgo: 🟢 Bajo
Ideal para: Equipo de soporte
```

#### 7. **Gestor de Contenido Completo**
```
Permisos:
✅ Gestionar proyectos
✅ Gestionar CMS
✅ Gestionar archivos
✅ Gestionar leads
✅ Gestionar email
❌ Facturación, usuarios

Riesgo: 🟡 Medio
Ideal para: Content managers
```

#### 8. **Gerente de Proyecto**
```
Permisos:
✅ Casi todo excepto:
❌ Invitar/remover miembros
❌ Gestionar facturación
❌ Cambiar plan

Riesgo: 🟡 Medio
Ideal para: Project managers
```

### Crear Template Personalizado

```
Team → Permission Templates → [Crear Plantilla]

┌─────────────────────────────────────────────┐
│ Nueva Plantilla de Permisos                 │
│                                             │
│ Nombre: *                                   │
│ [Social Media Manager               ]      │
│                                             │
│ Descripción:                                │
│ [Gestión de redes sociales y content]      │
│                                             │
│ 📝 Contenido:                               │
│ ☑ Gestionar proyectos                      │
│ ☑ Gestionar CMS                             │
│ ☑ Gestionar archivos                        │
│                                             │
│ 💼 Ventas y Marketing:                      │
│ ☐ Gestionar leads                           │
│ ☐ Gestionar e-commerce                      │
│ ☑ Exportar datos                            │
│                                             │
│ 🔧 Administración:                          │
│ ☐ Invitar miembros                          │
│ ☐ Remover miembros                          │
│ ☐ Gestionar facturación                     │
│ ☐ Ver facturación                           │
│                                             │
│ 🌐 Técnico:                                 │
│ ☐ Gestionar dominios                        │
│ ☑ Ver analytics                             │
│                                             │
│ ───────────────────────────────────────     │
│ Nivel de riesgo: 🟢 Bajo                   │
│ Permisos otorgados: 5 de 12                │
│                                             │
│ [Cancelar]            [💾 Guardar]         │
└─────────────────────────────────────────────┘
```

### Aplicar Template al Invitar

```
Team → [Invite Member]

┌─────────────────────────────────────────────┐
│ Invitar Nuevo Miembro                       │
│                                             │
│ Email: *                                    │
│ [usuario@ejemplo.com                ]      │
│                                             │
│ Rol:                                        │
│ [Client                              ▼]    │
│                                             │
│ Plantilla de Permisos:                      │
│ [Social Media Manager            ▼]        │
│   ├─ Sistema                                │
│   │   ├─ Editor de Blog Únicamente          │
│   │   ├─ Especialista en CRM                │
│   │   └─ ...                                │
│   └─ Personalizados                         │
│       └─ Social Media Manager ✓             │
│                                             │
│ 👁️ Vista previa de permisos:               │
│ ┌─────────────────────────────────────┐    │
│ │ ✅ Gestionar proyectos              │    │
│ │ ✅ Gestionar CMS                    │    │
│ │ ✅ Gestionar archivos               │    │
│ │ ✅ Exportar datos                   │    │
│ │ ✅ Ver analytics                    │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [Cancelar]          [📧 Enviar Invitación] │
└─────────────────────────────────────────────┘
```

El template se aplica automáticamente cuando el usuario acepta la invitación.

### Duplicar y Modificar

Para crear variaciones de templates existentes:

```
Templates → [Template del Sistema] → [Duplicar]

Esto crea una copia editable en "Personalizados"
que puedes modificar según necesites.
```

---

## Add-ons y Expansión

### Add-ons Disponibles

```
Billing → Add-ons

┌─────────────────────────────────────────────┐
│ 👥 Sub-clientes Adicionales      RECOMENDADO│
│ Aumenta el límite de sub-clientes           │
│                                             │
│ $15 / cliente                               │
│                                             │
│ [−]  5  [+]  clientes                      │
│                                             │
│ Costo mensual: $75.00                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 💾 Almacenamiento Extra                     │
│ Espacio adicional (bloques de 100GB)        │
│                                             │
│ $10 / 100GB                                 │
│                                             │
│ [−]  2  [+]  bloques                       │
│                                             │
│ Costo mensual: $20.00                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ⚡ AI Credits Extra                         │
│ Créditos adicionales (bloques de 1000)      │
│                                             │
│ $20 / 1000 credits                          │
│                                             │
│ [−]  3  [+]  bloques                       │
│                                             │
│ Costo mensual: $60.00                       │
└─────────────────────────────────────────────┘

───────────────────────────────────────────────
📊 Resumen de Costos

Costo Actual de Add-ons:       $0.00/mes
Nuevo Costo de Add-ons:      $155.00/mes
──────────────────────────────────────────
Diferencia:                 +$155.00/mes

💡 Los add-ons se suman a tu plan base.
   La facturación se actualiza inmediatamente.

[Cancelar]              [💾 Guardar Cambios]
```

### Límites Efectivos

Con add-ons, tus límites se calculan como:

```
Plan Agency Base:
• Sub-clientes: 10
• Storage: 100 GB
• AI Credits: 5,000

Add-ons Agregados:
• + 5 sub-clientes adicionales
• + 200 GB storage (2 bloques)
• + 3,000 AI credits (3 bloques)

Límites Efectivos Totales:
• Sub-clientes: 15 ✅
• Storage: 300 GB ✅
• AI Credits: 8,000 ✅
```

### Upgrade de Plan

Si necesitas más recursos, considera upgrade:

```
Agency → Agency Plus

Beneficios:
• Sub-clientes: 10 → 25 (+15)
• Storage: 100 GB → 250 GB (+150 GB)
• AI Credits: 5,000 → 10,000 (+5,000)
• API rate limit: 100/min → 500/min
• SLA soporte: 24h → 4h
• Onboarding automatizado ✅

Costo: +$100/mes ($99 → $199)

[Mantener Plan Actual] [Upgrade a Agency Plus]
```

---

## API de Gestión

### Crear API Key

```
Developer → API Keys → [Crear API Key]

┌─────────────────────────────────────────────┐
│ Crear Nueva API Key                         │
│                                             │
│ Nombre: *                                   │
│ [Production API                     ]      │
│                                             │
│ Permisos: *                                 │
│ ☑ Leer Tenants                              │
│   Ver información de sub-clientes           │
│                                             │
│ ☑ Crear Tenants                             │
│   Crear nuevos sub-clientes                 │
│                                             │
│ ☐ Actualizar Tenants                        │
│   Modificar información de sub-clientes     │
│                                             │
│ ☐ Eliminar Tenants                          │
│   Eliminar sub-clientes (soft delete)       │
│                                             │
│ ☐ Gestionar Miembros                        │
│   Agregar/remover miembros                  │
│                                             │
│ ☐ Generar Reportes                          │
│   Crear reportes consolidados               │
│                                             │
│ Expiración: (opcional)                      │
│ [Sin expiración                      ▼]    │
│                                             │
│ [Cancelar]            [✅ Crear API Key]   │
└─────────────────────────────────────────────┘
```

### API Key Creada

```
┌─────────────────────────────────────────────┐
│ ✅ ¡API Key Creada!                         │
│                                             │
│ ⚠️ Guarda esta key en un lugar seguro.     │
│ No podrás verla nuevamente.                 │
│                                             │
│ Tu API Key:                    [Copiar] ✅  │
│ ┌─────────────────────────────────────┐    │
│ │ qai_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5  │    │
│ │ p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2  │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ Ejemplo de uso:                             │
│ curl -X GET https://api.quimera.ai/v1/tenants \
│   -H "X-API-Key: qai_a1b2c3..."            │
│                                             │
│ [Entendido, Cerrar]                         │
└─────────────────────────────────────────────┘
```

### Endpoints Disponibles

Documentación completa en: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**Quick Reference:**

```bash
# Listar sub-clientes
GET /api/v1/tenants
Headers: X-API-Key: qai_your_key_here

# Crear sub-cliente
POST /api/v1/tenants
Headers: X-API-Key: qai_your_key_here
Body: {
  "name": "Nuevo Cliente",
  "email": "contacto@cliente.com",
  "industry": "restaurant",
  "features": ["cms", "leads"]
}

# Obtener detalles
GET /api/v1/tenants/{tenantId}

# Actualizar
PATCH /api/v1/tenants/{tenantId}
Body: { "name": "Nombre Actualizado" }

# Ver uso de recursos
GET /api/v1/tenants/{tenantId}/usage
```

### Rate Limits

```
Plan Agency:      100 requests/minuto
Plan Agency Plus: 500 requests/minuto
Plan Enterprise:  2000 requests/minuto
```

Si excedes el límite:
```
HTTP 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "Rate limit of 100 requests/minute exceeded",
  "retryAfter": 60
}
```

---

## Multi-idioma

### Configurar Idioma del Portal

```
Settings → Portal → Language

┌─────────────────────────────────────────────┐
│ 🌍 Idioma del Portal                        │
│                                             │
│ Idioma Predeterminado:                      │
│                                             │
│ ⦿ 🇪🇸 Español (Spanish)                    │
│ ○ 🇺🇸 English (Inglés)                     │
│ ○ 🇧🇷 Português (Portugués)                │
│ ○ 🇫🇷 Français (Francés)                   │
│                                             │
│ ───────────────────────────────────────     │
│                                             │
│ ☐ Traducción Automática de Contenido  BETA │
│   Traduce automáticamente el contenido      │
│   usando Google Translate API               │
│                                             │
│   ✨ Traduce páginas y componentes          │
│   ✨ Soporte para 4 idiomas                 │
│   ✨ Los usuarios eligen su idioma          │
│                                             │
│ 📊 Vista Previa:                            │
│ ┌─────────────────────────────────────┐    │
│ │ Café del Centro                     │    │
│ │ Español 🇪🇸                         │    │
│ │                                     │    │
│ │ El portal se mostrará en Español   │    │
│ │ por defecto.                        │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ [💾 Guardar Cambios]                       │
└─────────────────────────────────────────────┘
```

### Selector de Idioma en Portal

Los usuarios ven un selector en la esquina superior:

```
┌─────────────────────────────────────┐
│ Café del Centro           🌍 ES ▼   │
│ ──────────────────────────────────  │
│ Dashboard │ Proyectos │ Leads │...  │
└─────────────────────────────────────┘

Al hacer click en 🌍 ES:

┌───────────────────────┐
│ 🌍 Idioma             │
├───────────────────────┤
│ 🇪🇸 Español    ✓      │
│    Spanish            │
├───────────────────────┤
│ 🇺🇸 English           │
│    Inglés             │
├───────────────────────┤
│ 🇧🇷 Português         │
│    Portugués          │
├───────────────────────┤
│ 🇫🇷 Français          │
│    Francés            │
└───────────────────────┘
```

La interfaz cambia inmediatamente sin recargar.

### Contenido Traducido

Con **Traducción Automática** activada:

```
Original (Español):
"Bienvenido a tu dashboard"

Usuario selecciona English:
"Welcome to your dashboard"

Usuario selecciona Português:
"Bem-vindo ao seu painel"

Usuario selecciona Français:
"Bienvenue sur votre tableau de bord"
```

---

## Preguntas Frecuentes

### Facturación

**P: ¿Qué pasa si un cliente no paga?**

R: El cliente se suspende automáticamente (status → 'suspended'). Recibirás una notificación y podrás:
- Reintentar el cargo
- Actualizar método de pago
- Cancelar la subscription

**P: ¿Puedo ofrecer descuentos?**

R: Sí, modifica el precio mensual del cliente. El cambio se prorratea automáticamente.

**P: ¿Cuánto cobra Quimera por cada pago?**

R: 10% del monto total (precio base + overages). Por ejemplo:
- Cliente paga $150
- Quimera retiene $15
- Recibes $135

### Reportes

**P: ¿Con qué frecuencia puedo generar reportes?**

R: Agency Plus y Enterprise tienen límites altos configurables. Agency tiene límite de 50/mes.

**P: ¿Puedo personalizar el diseño del PDF?**

R: El branding (logo, colores) se aplica automáticamente desde tus configuraciones. El layout es estándar.

**P: ¿Los datos son en tiempo real?**

R: Sí, los reportes usan datos actualizados al momento de la generación.

### API

**P: ¿Puedo usar la API para crear clientes en masa?**

R: Sí, pero respeta el rate limit. Para cargas masivas, considera:
- Espaciar las peticiones
- Upgrade a Agency Plus (500 req/min)
- Contactar soporte para aumentos temporales

**P: ¿La API key expira?**

R: Solo si configuras una fecha de expiración. Por defecto, no expiran.

**P: ¿Qué pasa si mi API key se compromete?**

R: Revócala inmediatamente en Developer → API Keys. Genera una nueva.

### Límites

**P: ¿Qué pasa si excedo un límite?**

R:
- **Storage/AI Credits**: Se cobra overage automáticamente
- **Sub-clientes**: No puedes crear más hasta que agregues add-ons o hagas upgrade
- **Proyectos/Usuarios**: Similar a sub-clientes

**P: ¿Los add-ons se prorratean?**

R: Sí, si agregas add-ons a mitad de mes, solo pagas la porción correspondiente.

---

## Soporte

¿Necesitas ayuda?

- 📧 Email: support@quimera.ai
- 💬 Chat en vivo (dentro del dashboard)
- 📚 Documentación completa: docs.quimera.ai
- 🎥 Video tutoriales: youtube.com/quimeraai

**SLA de Soporte:**
- Agency: 24 horas
- Agency Plus: 4 horas
- Enterprise: 1 hora
