/**
 * Billing Articles - Artículos de Facturación y Planes
 * Guías completas sobre suscripciones, pagos y facturación
 */

export const BILLING_ARTICLES = [
    {
        title: 'Planes y precios: Guía completa',
        slug: 'planes-precios-guia-completa',
        excerpt: 'Conoce todos los planes de Quimera AI, qué incluye cada uno y cuál es el mejor para tu negocio.',
        featuredImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['billing', 'pricing', 'planes', 'precios', 'suscripción'],
        author: 'Equipo Quimera',
        content: `# Planes y precios: Guía completa

## Resumen de planes

Quimera AI ofrece planes diseñados para diferentes necesidades, desde emprendedores hasta agencias.

---

## 🆓 Plan Free (Gratuito)

**Precio:** $0 USD / mes

**Ideal para:** Probar la plataforma, proyectos personales, estudiantes.

**Incluye:**
- ✅ 1 sitio web
- ✅ 50 créditos de IA por mes
- ✅ Subdominio gratis (tusitio.quimera.site)
- ✅ Certificado SSL incluido
- ✅ Chatbot básico
- ✅ Soporte por email
- ✅ Plantillas básicas

**Limitaciones:**
- ❌ Marca de agua de Quimera
- ❌ Sin dominio personalizado
- ❌ Sin e-commerce
- ❌ Sin equipo de trabajo
- ❌ Analíticas limitadas

---

## ⭐ Plan Starter

**Precio:** $19 USD / mes (o $190 USD / año - ahorra 2 meses)

**Ideal para:** Emprendedores, freelancers, pequeños negocios.

**Todo lo del plan Free, más:**
- ✅ 3 sitios web
- ✅ 500 créditos de IA por mes
- ✅ 1 dominio personalizado
- ✅ **Sin marca de agua**
- ✅ Chatbot avanzado
- ✅ CRM básico (hasta 500 contactos)
- ✅ Formularios ilimitados
- ✅ Soporte prioritario por email
- ✅ Analíticas básicas
- ✅ Integraciones básicas (Google Analytics, Facebook Pixel)

---

## 🚀 Plan Pro

**Precio:** $49 USD / mes (o $490 USD / año - ahorra 2 meses)

**Ideal para:** Negocios en crecimiento, profesionales, pymes.

**Todo lo del plan Starter, más:**
- ✅ 10 sitios web
- ✅ 2,000 créditos de IA por mes
- ✅ 5 dominios personalizados
- ✅ **E-commerce incluido** (hasta 100 productos)
- ✅ **Sistema de citas**
- ✅ CRM completo (contactos ilimitados)
- ✅ Soporte por chat en vivo
- ✅ Analíticas avanzadas
- ✅ Integraciones avanzadas (Zapier, WhatsApp)
- ✅ 5 usuarios del equipo
- ✅ Backup automático

---

## 🏢 Plan Agency

**Precio:** $149 USD / mes (o $1,490 USD / año - ahorra 2 meses)

**Ideal para:** Agencias digitales, consultoras, equipos grandes.

**Todo lo del plan Pro, más:**
- ✅ 50 sitios web
- ✅ 5,000 créditos de IA por mes
- ✅ Dominios ilimitados
- ✅ **White-label completo** (tu marca, no la nuestra)
- ✅ E-commerce avanzado (productos ilimitados)
- ✅ Acceso API
- ✅ 25 usuarios del equipo
- ✅ Soporte prioritario
- ✅ Onboarding personalizado
- ✅ Reportes personalizados

---

## 🎯 Plan Enterprise

**Precio:** Personalizado (contactar ventas)

**Ideal para:** Grandes empresas, necesidades especiales.

**Todo lo del plan Agency, más:**
- ✅ Sitios ilimitados
- ✅ Créditos de IA personalizados
- ✅ SLA garantizado
- ✅ Account manager dedicado
- ✅ Desarrollo de funciones a medida
- ✅ Servidores dedicados (opcional)
- ✅ Cumplimiento regulatorio especial
- ✅ Integración con sistemas existentes
- ✅ Capacitación para tu equipo

---

## Comparativa detallada

| Característica | Free | Starter | Pro | Agency |
|----------------|------|---------|-----|--------|
| Sitios web | 1 | 3 | 10 | 50 |
| Créditos IA/mes | 50 | 500 | 2,000 | 5,000 |
| Dominios propios | ❌ | 1 | 5 | ∞ |
| E-commerce | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| Usuarios equipo | 1 | 1 | 5 | 25 |
| Soporte | Email | Email prioritario | Chat | Prioritario |

---

## Preguntas frecuentes sobre planes

### ¿Puedo cambiar de plan en cualquier momento?
Sí. Puedes subir o bajar de plan cuando quieras desde Configuración > Suscripción.

### ¿Qué pasa si subo de plan?
Se cobra la diferencia prorrateada y obtienes las nuevas funciones inmediatamente.

### ¿Qué pasa si bajo de plan?
El cambio aplica al final del período actual. Mantén acceso a todo hasta entonces.

### ¿Hay descuento por pago anual?
Sí, el equivalente a 2 meses gratis (aproximadamente 17% de descuento).

### ¿Puedo probar un plan de pago antes de comprar?
Contáctanos para solicitar una prueba extendida de cualquier plan.

### ¿Hay descuento para organizaciones sin fines de lucro?
Sí, ofrecemos 50% de descuento. Contáctanos con documentación de tu organización.

### ¿Hay descuento para estudiantes?
Sí, ofrecemos planes especiales para estudiantes. Verifica tu status en edu@quimera.ai.

---

## Cómo elegir el plan correcto

**Elige Free si:**
- Quieres probar la plataforma
- Es un proyecto personal o de prueba
- No necesitas dominio propio

**Elige Starter si:**
- Tienes un negocio pequeño
- Necesitas un sitio profesional con dominio propio
- No necesitas vender productos online

**Elige Pro si:**
- Quieres vender productos/servicios online
- Necesitas múltiples sitios
- Tienes un equipo pequeño

**Elige Agency si:**
- Gestionas sitios para clientes
- Necesitas white-label
- Tienes un equipo grande

**Contacta para Enterprise si:**
- Eres una empresa grande
- Necesitas funciones personalizadas
- Requieres SLA garantizado`
    },
    {
        title: 'Cómo gestionar tu suscripción',
        slug: 'gestionar-suscripcion-guia',
        excerpt: 'Aprende a cambiar de plan, actualizar método de pago, cancelar suscripción y más.',
        featuredImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['billing', 'subscription', 'suscripción', 'pago', 'facturación'],
        author: 'Equipo Quimera',
        content: `# Cómo gestionar tu suscripción

## Ver información de tu suscripción

### Acceder al panel de suscripción

1. Inicia sesión en Quimera AI
2. Haz clic en tu avatar o nombre (esquina superior derecha)
3. Selecciona **"Configuración"**
4. Ve a la sección **"Suscripción"**

### Información disponible

En esta sección verás:
- **Plan actual:** Nombre y precio de tu plan
- **Estado:** Activo, Cancelado, Pausado
- **Fecha de renovación:** Cuándo se cobra el próximo período
- **Método de pago:** Tarjeta o método actual
- **Créditos:** Usados y disponibles
- **Historial:** Pagos anteriores

---

## Cambiar de plan

### Subir de plan (Upgrade)

**Cuándo considerar upgrade:**
- Necesitas más sitios web
- Te quedas sin créditos de IA
- Necesitas funciones no incluidas

**Cómo hacer upgrade:**

1. Ve a **Configuración > Suscripción**
2. Haz clic en **"Cambiar plan"** o **"Mejorar"**
3. Selecciona el nuevo plan
4. Revisa el resumen:
   - Nuevo precio mensual
   - Diferencia a pagar (prorrateada)
5. Confirma el cambio
6. El cargo se realiza inmediatamente
7. Las nuevas funciones se activan al instante

**Sobre el prorrateo:**
Si te quedan 15 días del mes actual y subes de Starter ($19) a Pro ($49):
- Ya pagaste: $19 (Starter por el mes)
- Te quedan: 15 días
- Se descuenta: $9.50 (mitad de Starter no usado)
- Nuevo cargo: $49 - $9.50 = $39.50 (primer cobro prorrateado)

### Bajar de plan (Downgrade)

**Consideraciones antes de bajar:**
- Perderás funciones del plan actual
- Si tienes más sitios de los permitidos, deberás elegir cuáles conservar
- Los datos no se eliminan, solo se limita el acceso

**Cómo hacer downgrade:**

1. Ve a **Configuración > Suscripción**
2. Haz clic en **"Cambiar plan"**
3. Selecciona el plan inferior
4. Revisa lo que perderás
5. Confirma el cambio

**¿Cuándo aplica el cambio?**
El downgrade aplica al **final de tu período actual**. Hasta entonces, mantienes acceso completo.

---

## Métodos de pago

### Ver método de pago actual

1. Ve a **Configuración > Facturación > Métodos de pago**
2. Verás la tarjeta o método configurado
3. Solo se muestran los últimos 4 dígitos por seguridad

### Agregar nuevo método de pago

1. En **Métodos de pago**, haz clic en **"+ Agregar método"**
2. Opciones disponibles:
   - **Tarjeta de crédito/débito:** Visa, Mastercard, Amex
   - **PayPal:** Conecta tu cuenta de PayPal
3. Ingresa los datos requeridos
4. Haz clic en **"Guardar"**

### Cambiar método de pago predeterminado

1. Agrega el nuevo método (si aún no lo tienes)
2. Haz clic en los tres puntos (⋯) junto al método
3. Selecciona **"Usar como predeterminado"**
4. Los próximos cobros usarán este método

### Eliminar método de pago

1. Asegúrate de tener otro método configurado como predeterminado
2. Haz clic en los tres puntos (⋯) junto al método a eliminar
3. Selecciona **"Eliminar"**
4. Confirma la eliminación

**Nota:** No puedes eliminar el único método de pago si tienes una suscripción activa.

---

## Facturación

### Descargar facturas

1. Ve a **Configuración > Facturación > Historial**
2. Verás una lista de todos los pagos
3. Haz clic en el ícono de descarga (📥) junto a cada factura
4. Se descargará un PDF

### Datos fiscales

Para agregar o modificar datos de facturación:

1. Ve a **Configuración > Facturación > Datos fiscales**
2. Completa:
   - Nombre o razón social
   - RFC / NIF / Tax ID (según tu país)
   - Dirección fiscal
   - Código postal
   - País
3. Guarda los cambios
4. Las próximas facturas incluirán estos datos

### Cambiar email de facturación

1. Ve a **Configuración > Facturación**
2. En **"Email de facturación"**, ingresa el nuevo email
3. Las facturas se enviarán a este correo

---

## Cancelar suscripción

### Antes de cancelar

Considera:
- ¿Puedes resolver el problema con un plan diferente?
- ¿Hay alguna función que no entiendes cómo usar?
- ¿Necesitas ayuda que no has recibido?

Contacta a soporte, quizás podemos ayudarte.

### Cómo cancelar

1. Ve a **Configuración > Suscripción**
2. Desplázate hasta el final
3. Haz clic en **"Cancelar suscripción"**
4. Selecciona el motivo (nos ayuda a mejorar)
5. Confirma la cancelación

### ¿Qué pasa después de cancelar?

**Acceso hasta fin del período:**
- Mantienes acceso completo hasta la fecha de renovación
- No se te cobrará de nuevo
- Puedes reactivar en cualquier momento

**Después de que termine el período:**
- Tu cuenta pasa a plan Free
- Los sitios pasan a estado "borrador" (no publicados)
- Los datos se mantienen por 30 días
- Después de 30 días, los datos pueden ser eliminados

### Reactivar suscripción

Si cancelaste pero cambias de opinión:

1. Ve a **Configuración > Suscripción**
2. Haz clic en **"Reactivar suscripción"**
3. Selecciona tu plan
4. Completa el pago
5. Todo se restaura inmediatamente

---

## Pausar suscripción

Si necesitas un descanso temporal (disponible en algunos planes):

1. Ve a **Configuración > Suscripción**
2. Haz clic en **"Pausar suscripción"**
3. Selecciona duración: 1, 2 o 3 meses
4. Confirma

**Durante la pausa:**
- No se te cobra
- Tu sitio queda en modo "mantenimiento"
- Los datos se conservan
- No puedes hacer cambios

**Después de la pausa:**
- La suscripción se reactiva automáticamente
- Se reanuda el cobro normal

---

## Solución de problemas de pago

### Pago rechazado

**Causas comunes:**
1. Fondos insuficientes
2. Tarjeta vencida
3. Límite de compras online
4. Bloqueo por seguridad del banco

**Solución:**
1. Verifica que tengas fondos
2. Actualiza la tarjeta si está vencida
3. Contacta a tu banco para autorizar
4. Intenta con otro método de pago

### Cargo duplicado

Si ves dos cargos por el mismo monto:

1. Espera 24-48 horas (puede ser una autorización temporal)
2. Si persiste, contacta soporte con:
   - Fecha de los cargos
   - Monto exacto
   - Últimos 4 dígitos de la tarjeta

### Solicitar reembolso

**Política de reembolso:**
- Garantía de 14 días en planes nuevos
- Reembolso completo si no estás satisfecho

**Cómo solicitar:**
1. Contacta a soporte@quimera.ai
2. Indica:
   - Email de tu cuenta
   - Fecha del cargo
   - Motivo del reembolso
3. Procesamos en 5-10 días hábiles

---

## Contacto para facturación

- 📧 Email: billing@quimera.ai
- 💬 Chat en vivo (usuarios Pro y superior)
- 📞 Teléfono (usuarios Agency y Enterprise)`
    }
];




