# Guía de Migración a Agency Plus

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Comparativa de Planes](#comparativa-de-planes)
3. [Nuevas Funcionalidades](#nuevas-funcionalidades)
4. [Proceso de Upgrade](#proceso-de-upgrade)
5. [Migración de Datos](#migración-de-datos)
6. [Configuración Post-Upgrade](#configuración-post-upgrade)
7. [Checklist de Verificación](#checklist-de-verificación)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Resumen Ejecutivo

**Agency Plus** es el tier premium del Plan Agency que ofrece:

- ✅ **2.5x más sub-clientes** (10 → 25)
- ✅ **2.5x más storage** (100 GB → 250 GB)
- ✅ **2x más AI credits** (5,000 → 10,000)
- ✅ **5x mejor rate limit de API** (100/min → 500/min)
- ✅ **Onboarding automatizado** incluido
- ✅ **SLA de soporte mejorado** (24h → 4h)
- ✅ **Analytics avanzados**

**Costo:** $199/mes (vs $99/mes del plan Agency)
**Ahorro anual:** $360/año si pagas anualmente

---

## Comparativa de Planes

### Tabla Detallada

| Característica | Agency | Agency Plus | Diferencia |
|---|---|---|---|
| **Precio Mensual** | $99 | $199 | +$100 |
| **Precio Anual** | $79/mes ($948/año) | $149/mes ($1,788/año) | +$70/mes |
| | | | |
| **📊 Límites** | | | |
| Sub-clientes | 10 | 25 | +15 (150%) |
| Proyectos | 50 | 100 | +50 (100%) |
| Usuarios | 20 | 50 | +30 (150%) |
| Almacenamiento | 100 GB | 250 GB | +150 GB (150%) |
| AI Credits/mes | 5,000 | 10,000 | +5,000 (100%) |
| Leads | 10,000 | 25,000 | +15,000 (150%) |
| Productos | 1,000 | 2,500 | +1,500 (150%) |
| Emails/mes | 20,000 | 50,000 | +30,000 (150%) |
| | | | |
| **🚀 Features** | | | |
| Dashboard de Agencia | ✅ | ✅ | - |
| Reportes Consolidados | ✅ | ✅ | - |
| Exportar PDF/CSV | ✅ | ✅ | - |
| Stripe Connect | ✅ | ✅ | - |
| Plantillas de Permisos | ✅ | ✅ | - |
| Multi-idioma | ✅ | ✅ | - |
| **Onboarding Automatizado** | ❌ | ✅ | **NEW** |
| **Analytics Avanzados** | ❌ | ✅ | **NEW** |
| **Custom Integrations** | ❌ | ✅ | **NEW** |
| | | | |
| **🔌 API** | | | |
| API REST | ✅ | ✅ | - |
| Rate Limit | 100/min | 500/min | +400/min (400%) |
| Webhooks | ✅ | ✅ | - |
| | | | |
| **💼 Soporte** | | | |
| Email Support | ✅ | ✅ | - |
| SLA Response Time | 24 horas | 4 horas | **6x más rápido** |
| Priority Support | ❌ | ✅ | **NEW** |
| Onboarding Call | ❌ | ✅ | **NEW** |
| | | | |
| **💰 E-commerce** | | | |
| Transaction Fee | 1.5% | 0.5% | -1% (ahorro) |

### ROI Estimado

Si gestionas **15+ clientes** cobrando $150/mes promedio:

```
Ingresos mensuales:
15 clientes × $150 = $2,250/mes

Costos:
Plan Agency Plus: $199/mes
Stripe fees (10%): $225/mes
Total costos: $424/mes

Ingresos netos: $1,826/mes ($21,912/año)

ROI vs Agency:
Con Agency (máx 10 clientes): $1,500 - $99 - $150 = $1,251/mes
Con Agency Plus: $2,250 - $424 = $1,826/mes

Diferencia: +$575/mes (+$6,900/año)
```

El upgrade se paga solo si tienes **más de 11 clientes**.

---

## Nuevas Funcionalidades

### 1. Onboarding Automatizado

**Solo disponible en Agency Plus**

Crea nuevos clientes en minutos con un flujo automatizado de 4 pasos:

```
1. Información básica → 2. Funcionalidades → 3. Branding → 4. Usuarios
                              ↓
                    Provisión automática:
                    • Workspace creado
                    • Proyecto inicial
                    • Usuarios invitados
                    • Emails enviados
```

**Tiempo ahorrado:** ~30 minutos por cliente

**Beneficios:**
- ✅ Reduce errores manuales
- ✅ Experiencia profesional desde día 1
- ✅ Emails de bienvenida con branding
- ✅ Templates de proyectos pre-configurados

**Documentación:** [Onboarding Automatizado](./AGENCY_PLAN_FEATURES.md#onboarding-automatizado)

### 2. Analytics Avanzados

Dashboard con insights profundos:

- 📊 **Funnel de Conversión** - Visualiza el journey completo de leads
- 🎯 **Attribution Models** - Identifica las mejores fuentes de conversión
- 📈 **Predictive Analytics** - Proyecciones de crecimiento con IA
- 🔥 **Heatmaps** - Mapas de calor de interacciones
- 🚀 **A/B Testing** - Pruebas automáticas de variantes

**Acceso:** Dashboard → Analytics → Advanced

### 3. Custom Integrations

Conecta con herramientas externas:

- 📧 **Email Providers** - Mailchimp, SendGrid, ConvertKit
- 💬 **CRM** - HubSpot, Salesforce, Pipedrive
- 💳 **Payment Gateways** - Adyen, Mercado Pago (además de Stripe)
- 📊 **Analytics** - Google Analytics 4, Mixpanel, Amplitude
- 🔔 **Notifications** - Slack, Discord, Microsoft Teams

**Acceso:** Settings → Integrations

### 4. Priority Support

- ⚡ **SLA 4 horas** - Respuesta garantizada en 4h (vs 24h)
- 📞 **Línea directa** - Teléfono de soporte prioritario
- 👨‍💼 **Account Manager** - Manager dedicado para +20 clientes
- 🎓 **Onboarding Call** - Sesión de 1 hora para configuración inicial

---

## Proceso de Upgrade

### Opción 1: Desde el Dashboard

```
Billing → Current Plan → [Upgrade to Agency Plus]

┌─────────────────────────────────────────────┐
│ Upgrade a Agency Plus                       │
│                                             │
│ Tu plan actual:                             │
│ • Agency - $99/mes                          │
│ • 10 sub-clientes                           │
│ • 100 GB storage                            │
│                                             │
│ Nuevo plan:                                 │
│ • Agency Plus - $199/mes                    │
│ • 25 sub-clientes (+15)                     │
│ • 250 GB storage (+150 GB)                  │
│ • 10,000 AI credits (+5,000)                │
│ • Onboarding automatizado ✅                │
│ • SLA 4 horas ✅                            │
│                                             │
│ ───────────────────────────────────────     │
│                                             │
│ Cargo hoy: $83.33                           │
│ (Prorrateo por 25 días restantes)           │
│                                             │
│ Próxima factura: $199 (15 Feb)             │
│                                             │
│ [Cancelar]            [✅ Confirmar Upgrade]│
└─────────────────────────────────────────────┘
```

### Opción 2: Contactar Soporte

Si prefieres asistencia:

1. **Email:** sales@quimera.ai
2. **Asunto:** "Upgrade a Agency Plus - [Tu Nombre de Agencia]"
3. **Incluye:**
   - Nombre de la agencia
   - Tenant ID (encontrar en Settings → General)
   - Preguntas específicas

Tiempo de respuesta: **4 horas** (prioridad para upgrades)

### Prorrateo Automático

El sistema calcula el prorrateo automáticamente:

```
Ejemplo: Upgrade el día 15 del mes

Días restantes: 15 días
Proporción: 15/30 = 0.5

Crédito del plan anterior:
$99 × 0.5 = $49.50

Cargo del nuevo plan:
$199 × 0.5 = $99.50

Cargo neto hoy: $99.50 - $49.50 = $50.00
```

---

## Migración de Datos

### Datos que se Migran Automáticamente

✅ **Todos tus datos existentes se mantienen intactos:**

- ✅ Sub-clientes (todos)
- ✅ Proyectos y páginas
- ✅ Leads y contactos
- ✅ Productos y pedidos
- ✅ Configuración de Stripe Connect
- ✅ API keys y webhooks
- ✅ Plantillas de permisos personalizadas
- ✅ Reportes guardados
- ✅ Branding y configuraciones

### Nuevos Límites Aplicados

Inmediatamente después del upgrade:

| Recurso | Antes | Después | Beneficio |
|---|---|---|---|
| Sub-clientes | 10/10 | 10/25 | **Puedes agregar 15 más** |
| Storage | 85/100 GB | 85/250 GB | **+150 GB disponibles** |
| AI Credits | 4,200/5,000 | 4,200/10,000 | **Se resetea mensual** |
| API calls/min | 100 | 500 | **5x más rápido** |

### Verificación Post-Migración

El sistema ejecuta automáticamente:

```
✅ Verificando datos de sub-clientes... OK (10 found)
✅ Verificando proyectos... OK (25 found)
✅ Verificando configuración de Stripe... OK
✅ Aplicando nuevos límites... OK
✅ Habilitando nuevas features... OK
  • Onboarding Automatizado ✅
  • Analytics Avanzados ✅
  • Custom Integrations ✅
✅ Enviando email de confirmación... OK

🎉 ¡Upgrade completado exitosamente!
```

---

## Configuración Post-Upgrade

### 1. Explorar Nuevas Features

Primeros pasos después del upgrade:

#### a) Configurar Onboarding Automatizado

```
Dashboard → Clients → [Add New Client]

Ya no necesitas crear manualmente:
• Usar el nuevo flujo de 4 pasos
• Seleccionar template de proyecto
• Configurar branding del cliente
• Invitar usuarios automáticamente
```

#### b) Activar Analytics Avanzados

```
Dashboard → Analytics → [Enable Advanced Analytics]

Configuración de 5 minutos:
1. Conectar Google Analytics 4 (opcional)
2. Definir eventos de conversión
3. Configurar funnels principales
4. Activar heatmaps
```

#### c) Explorar Integraciones

```
Settings → Integrations → [Browse Marketplace]

Integraciones populares:
• Mailchimp - Email marketing
• HubSpot - CRM avanzado
• Slack - Notificaciones en tiempo real
• Google Analytics 4 - Tracking mejorado
```

### 2. Actualizar Documentación

Si compartiste documentación con tu equipo:

- 📝 Actualizar límites en presentaciones
- 📝 Agregar nuevas features a propuestas comerciales
- 📝 Informar al equipo sobre onboarding automatizado

### 3. Notificar a Clientes (Opcional)

Email sugerido para clientes existentes:

```
Asunto: Mejoras en Nuestro Servicio - Agency Plus

Hola [Cliente],

Nos complace informarte que hemos actualizado a Agency Plus,
lo que nos permite ofrecerte:

✨ Onboarding más rápido para nuevos proyectos
✨ Analytics avanzados con insights de IA
✨ Soporte prioritario con SLA de 4 horas
✨ Integraciones con más herramientas

No hay cambios en tu servicio actual, pero tendrás acceso
a estas mejoras sin costo adicional.

¿Preguntas? Contáctanos en cualquier momento.

Saludos,
[Tu Agencia]
```

---

## Checklist de Verificación

Usa este checklist para confirmar que todo funciona correctamente:

### Pre-Upgrade

- [ ] Revisar uso actual de recursos
- [ ] Confirmar que Stripe Connect está configurado
- [ ] Backup de reportes importantes (descargar PDFs)
- [ ] Informar al equipo sobre el upgrade
- [ ] Revisar próximos pagos en calendario

### Durante Upgrade

- [ ] Confirmar cargo prorrateado
- [ ] Verificar email de confirmación
- [ ] Esperar 2-3 minutos para propagación

### Post-Upgrade

**Verificación Básica:**
- [ ] Login al dashboard funciona
- [ ] Ver nuevos límites en Billing → Current Plan
- [ ] Acceso a Onboarding Automatizado habilitado
- [ ] API rate limit aumentado (verificar con test)

**Verificación de Datos:**
- [ ] Todos los sub-clientes visibles
- [ ] Proyectos intactos
- [ ] Leads y contactos presentes
- [ ] Stripe Connect activo
- [ ] API keys funcionando

**Nuevas Features:**
- [ ] Probar crear cliente con Onboarding Automatizado
- [ ] Acceder a Analytics Avanzados
- [ ] Explorar Integrations Marketplace
- [ ] Verificar SLA de soporte (4h)

**Facturación:**
- [ ] Verificar cargo en Stripe
- [ ] Confirmar próxima fecha de factura
- [ ] Revisar invoice del upgrade

---

## Preguntas Frecuentes

### Upgrade y Facturación

**P: ¿Se prorratea el upgrade?**

R: Sí, automáticamente. Solo pagas la porción proporcional por los días restantes del mes.

**P: ¿Puedo downgrade después?**

R: Sí, pero solo al final del período de facturación actual. Los downgrades no se prorratean.

**P: ¿Qué pasa si tengo add-ons?**

R: Los add-ons se mantienen y se suman a los nuevos límites de Agency Plus. Por ejemplo:
- Agency Plus: 25 sub-clientes
- Add-ons: +5 sub-clientes
- **Total: 30 sub-clientes**

**P: ¿Hay descuento anual?**

R: Sí, $149/mes (vs $199/mes) = **$600/año de ahorro**

### Features y Límites

**P: ¿Puedo usar Onboarding Automatizado para clientes existentes?**

R: Onboarding Automatizado es solo para nuevos clientes. Para actualizar existentes, usa el dashboard normal.

**P: ¿Los reportes generados antes del upgrade se mantienen?**

R: Sí, todos los reportes guardados se conservan y puedes descargarlos normalmente.

**P: ¿El aumento de API rate limit es inmediato?**

R: Sí, toma efecto inmediatamente después del upgrade. Puedes verificar con:
```bash
curl -I https://api.quimera.ai/v1/tenants \
  -H "X-API-Key: your_key"

# Verifica header: X-RateLimit-Limit: 500
```

**P: ¿Analytics Avanzados tiene costo adicional?**

R: No, está incluido en Agency Plus sin costos extra.

### Soporte y SLA

**P: ¿Cómo funciona el SLA de 4 horas?**

R: Garantizamos primera respuesta en ≤4 horas laborales (lun-vie, 9am-6pm hora local). Urgencias críticas tienen prioridad absoluta.

**P: ¿Qué es el "Onboarding Call"?**

R: Una sesión de 1 hora con un especialista para:
- Configuración óptima de tu agencia
- Best practices para gestionar clientes
- Configuración de integraciones
- Q&A sobre features avanzados

Agenda en: Settings → Support → [Schedule Onboarding Call]

**P: ¿Tengo Account Manager dedicado?**

R: Sí, si tienes 20+ sub-clientes activos. El manager se asigna automáticamente y te contacta por email.

### Migración y Datos

**P: ¿Hay downtime durante el upgrade?**

R: No, el upgrade es instantáneo. No hay interrupción del servicio.

**P: ¿Pierdo algo al hacer upgrade?**

R: No, solo ganas features y límites. Todo se mantiene.

**P: ¿Qué pasa si uso más de 10 sub-clientes actualmente con add-ons?**

R: Al hacer upgrade a Agency Plus, puedes remover los add-ons de sub-clientes si ya no los necesitas (ya tienes 25 incluidos). Esto reduce tu costo mensual.

Ejemplo:
- **Antes:** Agency ($99) + 5 sub-clientes extra ($75) = $174/mes
- **Después:** Agency Plus ($199) = $199/mes (25 incluidos)
- **Ahorro:** Simplicidad y +20 sub-clientes disponibles

### Casos Especiales

**P: ¿Puedo hacer upgrade solo por un mes?**

R: No, los planes son por subscripción mensual o anual. Puedes downgrade al final del período.

**P: ¿Hay trial de Agency Plus?**

R: Contacta a sales@quimera.ai para casos especiales. Generalmente ofrecemos 14 días de trial para agencias >50 empleados.

**P: ¿Qué pasa si alcanzo el límite de 25 sub-clientes?**

R: Puedes:
1. Agregar add-ons (+$15/cliente adicional)
2. Upgrade a Enterprise (ilimitado)
3. Contactar sales para plan custom

---

## Soporte del Upgrade

### Antes de Hacer Upgrade

- 📧 Email: sales@quimera.ai
- 💬 Chat: Dashboard → Help → "Interested in Agency Plus"
- 📚 Docs: https://docs.quimera.ai/plans/agency-plus

### Durante/Después del Upgrade

- 📧 Email: support@quimera.ai
- 💬 Chat prioritario (Agency Plus badge)
- 📞 Teléfono: +1 (555) 123-4567 (solo Agency Plus)

### Recursos Adicionales

- 🎥 Video tutorial del upgrade: [YouTube](https://youtube.com/quimeraai/upgrade-agency-plus)
- 📖 Documentación completa: [Agency Plan Features](./AGENCY_PLAN_FEATURES.md)
- 🔌 API docs: [API Documentation](./API_DOCUMENTATION.md)
- 💬 Community: [Discord](https://discord.gg/quimera)

---

## Conclusión

El upgrade a **Agency Plus** es ideal si:

- ✅ Gestionas >10 clientes (o planeas crecer)
- ✅ Necesitas onboarding rápido y profesional
- ✅ Quieres analytics profundos
- ✅ Requieres soporte prioritario
- ✅ Usas intensivamente la API

**Next Steps:**

1. **Revisar comparativa** de planes arriba
2. **Calcular ROI** para tu caso específico
3. **Hacer upgrade** desde Billing → Current Plan
4. **Explorar nuevas features** post-upgrade
5. **Contactar soporte** si tienes dudas

¡Bienvenido a Agency Plus! 🚀

---

**Última actualización:** 12 de Enero, 2026
**Versión del documento:** 1.0
**Soporte:** support@quimera.ai
