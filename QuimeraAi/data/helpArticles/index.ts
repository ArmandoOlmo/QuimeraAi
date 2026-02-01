/**
 * Help Center Articles Index
 * Exporta todos los artículos organizados por categoría
 */

import { GETTING_STARTED_ARTICLES } from './gettingStarted';
import { EDITOR_ARTICLES } from './editor';
import { AI_ARTICLES } from './ai';
import { BILLING_ARTICLES } from './billing';

// Artículos adicionales que se definen aquí directamente
const DOMAINS_ARTICLES = [
    {
        title: 'Cómo conectar tu dominio personalizado',
        slug: 'conectar-dominio-personalizado-guia',
        excerpt: 'Guía paso a paso para conectar tu propio dominio a tu sitio web de Quimera. Incluye instrucciones para los proveedores más populares.',
        featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['domains', 'dominios', 'dns', 'custom-domain', 'dominio'],
        author: 'Equipo Quimera',
        content: `# Cómo conectar tu dominio personalizado

## ¿Por qué usar un dominio propio?

Un dominio personalizado (tuempresa.com) en lugar del subdominio gratuito (tusitio.quimera.site) ofrece:

- **Profesionalismo:** Los clientes confían más en dominios propios
- **Branding:** Refuerza tu marca
- **SEO:** Mejor para posicionamiento en Google
- **Credibilidad:** Esencial para negocios serios
- **Memorabilidad:** Más fácil de recordar

---

## Requisitos previos

Antes de comenzar, necesitas:

1. **Plan de pago activo** (Starter o superior)
2. **Dominio registrado** en un proveedor (GoDaddy, Namecheap, Google Domains, etc.)
3. **Acceso al panel DNS** de tu dominio

**¿No tienes dominio?** Puedes comprarlo en:
- [Namecheap](https://namecheap.com) (económico)
- [Google Domains](https://domains.google) (simple)
- [GoDaddy](https://godaddy.com) (popular)
- Cualquier otro registrador de dominios

---

## Paso 1: Agregar dominio en Quimera

### 1.1 Acceder a configuración de dominios

1. Inicia sesión en Quimera AI
2. Ve a **Dominios** en el menú lateral
3. Haz clic en **"+ Agregar dominio"**

### 1.2 Ingresar tu dominio

1. Escribe tu dominio completo: \`tuempresa.com\`
2. **No incluyas** www ni https, solo el dominio base
3. Haz clic en **"Agregar"**

### 1.3 Obtener registros DNS

Después de agregar, Quimera te mostrará los registros DNS que necesitas configurar:

**Registro A (para dominio raíz):**
\`\`\`
Tipo: A
Host/Nombre: @
Valor: 76.76.21.21
TTL: 3600 (o "Automático")
\`\`\`

**Registro CNAME (para www):**
\`\`\`
Tipo: CNAME
Host/Nombre: www
Valor: cname.quimera.ai
TTL: 3600 (o "Automático")
\`\`\`

**Guarda esta información** o deja la pestaña abierta mientras configuras DNS.

---

## Paso 2: Configurar DNS en tu proveedor

Selecciona tu proveedor y sigue las instrucciones:

### GoDaddy

1. Ve a [godaddy.com](https://godaddy.com) e inicia sesión
2. Ve a **"Mis productos"** > **"Dominios"**
3. Haz clic en tu dominio
4. Selecciona **"DNS"** o **"Administrar DNS"**
5. Agrega los registros:

**Para registro A:**
- Haz clic en **"Agregar"**
- Tipo: **A**
- Host: **@**
- Apunta a: **76.76.21.21**
- TTL: **1 hora**
- Guardar

**Para registro CNAME:**
- Haz clic en **"Agregar"**
- Tipo: **CNAME**
- Host: **www**
- Apunta a: **cname.quimera.ai**
- TTL: **1 hora**
- Guardar

### Namecheap

1. Ve a [namecheap.com](https://namecheap.com) e inicia sesión
2. Ve a **"Domain List"**
3. Haz clic en **"Manage"** junto a tu dominio
4. Ve a la pestaña **"Advanced DNS"**
5. Agrega los registros:

**Para registro A:**
- Haz clic en **"Add New Record"**
- Tipo: **A Record**
- Host: **@**
- Value: **76.76.21.21**
- TTL: **Automatic**

**Para registro CNAME:**
- Haz clic en **"Add New Record"**
- Tipo: **CNAME Record**
- Host: **www**
- Value: **cname.quimera.ai**
- TTL: **Automatic**

### Google Domains

1. Ve a [domains.google](https://domains.google) e inicia sesión
2. Selecciona tu dominio
3. Ve a **"DNS"** en el menú lateral
4. En **"Registros de recursos"**, haz clic en **"Administrar registros personalizados"**
5. Agrega los registros siguiendo el mismo patrón

### Cloudflare

**Importante:** Si usas Cloudflare, desactiva el proxy (nube naranja → nube gris).

1. Ve a [cloudflare.com](https://cloudflare.com) e inicia sesión
2. Selecciona tu dominio
3. Ve a **"DNS"**
4. Agrega los registros con **proxy desactivado** (nube gris)

---

## Paso 3: Verificar la conexión

### 3.1 Esperar propagación DNS

Los cambios de DNS pueden tardar:
- **Mínimo:** 5-15 minutos
- **Promedio:** 1-4 horas
- **Máximo:** Hasta 48 horas

### 3.2 Verificar en Quimera

1. Regresa a **Dominios** en Quimera
2. Junto a tu dominio, haz clic en **"Verificar"**
3. Posibles estados:
   - 🟡 **Pendiente:** Aún propagando
   - 🟢 **Conectado:** ¡Listo!
   - 🔴 **Error:** Revisa la configuración DNS

### 3.3 Verificar manualmente

Usa estas herramientas para verificar si los DNS propagaron:
- [whatsmydns.net](https://whatsmydns.net)
- [dnschecker.org](https://dnschecker.org)

Busca tu dominio y verifica que los registros A y CNAME apunten correctamente.

---

## Paso 4: Asignar dominio a un sitio

Una vez verificado:

1. Ve a **Dominios** en Quimera
2. Junto a tu dominio, haz clic en **"Asignar a sitio"**
3. Selecciona el proyecto de tu lista
4. Confirma la asignación

**Tu sitio ahora está disponible en tu dominio personalizado.**

---

## SSL (HTTPS) automático

Quimera configura automáticamente un certificado SSL gratuito:

- El certificado se genera en minutos después de la verificación
- Tu sitio será accesible via **https://tudominio.com**
- Se renueva automáticamente
- No necesitas hacer nada adicional

---

## Configurar redirecciones

### www a dominio raíz (recomendado)

Para que www.tudominio.com redirija a tudominio.com:

1. Ve a **Dominios > tu dominio > Configuración**
2. Activa **"Redirigir www al dominio raíz"**

### Dominio raíz a www

Si prefieres que tudominio.com redirija a www.tudominio.com:

1. Ve a la misma configuración
2. Selecciona **"Redirigir dominio raíz a www"**

---

## Solución de problemas

### "DNS no propagado"

**Causa:** Los registros DNS aún no se actualizaron globalmente.

**Solución:**
1. Espera hasta 48 horas
2. Verifica que los registros estén correctamente configurados
3. Usa whatsmydns.net para verificar propagación
4. Limpia el caché de tu navegador

### "Certificado SSL no válido"

**Causa:** El SSL aún no se generó o hay un problema.

**Solución:**
1. Espera 1-2 horas después de la conexión
2. Si persiste, contacta soporte

### "Dominio ya en uso"

**Causa:** El dominio está configurado en otra cuenta de Quimera.

**Solución:**
1. Si eres dueño del dominio, contacta soporte
2. Proporciona prueba de propiedad
3. El equipo liberará el dominio

### "Error de conexión"

**Causa:** Los registros DNS son incorrectos.

**Solución:**
1. Verifica que usaste los valores exactos
2. Elimina registros DNS antiguos que conflictúen
3. Asegúrate de no tener proxy activo (Cloudflare)

---

## Preguntas frecuentes

### ¿Puedo usar subdominios?
Sí, puedes configurar subdominios como blog.tudominio.com para diferentes sitios.

### ¿Puedo conectar múltiples dominios al mismo sitio?
Sí, pero solo uno será el principal. Los otros redirigirán a él.

### ¿Qué pasa si cambio de proveedor de dominio?
Necesitarás reconfigurar los DNS en el nuevo proveedor.

### ¿Puedo desconectar un dominio?
Sí, ve a Dominios > tu dominio > "Desconectar".

---

## Contacto para ayuda

Si tienes problemas configurando tu dominio:
- 💬 Chat de soporte
- 📧 soporte@quimera.ai`
    }
];

const ECOMMERCE_ARTICLES = [
    {
        title: 'Crear tu tienda online: Guía completa',
        slug: 'crear-tienda-online-guia-completa',
        excerpt: 'Aprende a configurar tu tienda de e-commerce desde cero. Productos, pagos, envíos y más.',
        featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['ecommerce', 'tienda', 'store', 'productos', 'ventas'],
        author: 'Equipo Quimera',
        content: `# Crear tu tienda online: Guía completa

## Introducción

Quimera AI te permite crear una tienda online completa sin necesidad de conocimientos técnicos. Esta guía te llevará paso a paso desde la activación hasta tu primera venta.

**Requisitos:**
- Plan Pro o superior
- Cuenta de Stripe para pagos
- Productos o servicios para vender

**Tiempo estimado:** 1-2 horas para configuración básica

---

## Paso 1: Activar el módulo de E-commerce

### 1.1 Verificar tu plan

El e-commerce está disponible en:
- ✅ Plan Pro
- ✅ Plan Agency
- ✅ Plan Enterprise

### 1.2 Activar e-commerce

1. Ve a **E-commerce** en el menú lateral
2. Si es tu primera vez, verás el asistente de configuración
3. Haz clic en **"Activar E-commerce"**
4. Selecciona el proyecto donde quieres la tienda
5. Confirma la activación

---

## Paso 2: Configuración básica de la tienda

### 2.1 Información de la tienda

1. Ve a **E-commerce > Configuración > General**
2. Completa:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Nombre de la tienda | Nombre comercial | "Mi Tienda Online" |
| Descripción | Breve descripción | "Los mejores productos..." |
| Logo | Imagen de tu marca | Sube tu logo |
| Email de la tienda | Para notificaciones | tienda@tuempresa.com |

### 2.2 Moneda y ubicación

1. En **Configuración > Regional**
2. Configura:
   - **Moneda:** MXN, USD, EUR, etc.
   - **País de la tienda:** México, España, etc.
   - **Formato de precio:** $1,000.00 MXN

### 2.3 Impuestos

1. En **Configuración > Impuestos**
2. Opciones:
   - **Sin impuestos:** Precios finales
   - **IVA incluido:** El precio mostrado incluye IVA
   - **IVA no incluido:** Se agrega al checkout
3. Configura la tasa: 16% (México), 21% (España), etc.

---

## Paso 3: Conectar métodos de pago

### 3.1 Configurar Stripe

Stripe es nuestro procesador de pagos principal.

**Crear cuenta de Stripe:**
1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta
3. Completa la verificación de identidad
4. Agrega tu cuenta bancaria

**Conectar con Quimera:**
1. Ve a **E-commerce > Configuración > Pagos**
2. Haz clic en **"Conectar Stripe"**
3. Serás redirigido a Stripe
4. Autoriza la conexión
5. ¡Listo! Stripe está conectado

### 3.2 Métodos de pago disponibles

Una vez conectado Stripe, tus clientes pueden pagar con:
- 💳 Tarjetas de crédito y débito (Visa, Mastercard, Amex)
- 📱 Apple Pay y Google Pay
- 🏪 OXXO (solo México)
- 🏦 Transferencia bancaria (algunos países)

### 3.3 Modo de prueba

Antes de lanzar, activa el modo de prueba:

1. En **Configuración > Pagos**
2. Activa **"Modo de prueba"**
3. Usa tarjetas de prueba de Stripe:
   - Éxito: 4242 4242 4242 4242
   - Rechazada: 4000 0000 0000 0002
4. Haz pedidos de prueba
5. Desactiva el modo de prueba cuando estés listo

---

## Paso 4: Agregar productos

### 4.1 Crear un producto

1. Ve a **E-commerce > Productos**
2. Haz clic en **"+ Nuevo producto"**
3. Completa la información:

**Información básica:**
- **Nombre:** Nombre descriptivo del producto
- **Descripción:** Descripción detallada (usa formato rico)
- **Precio:** Precio de venta
- **Precio comparativo:** Precio anterior (para mostrar descuento)

**Imágenes:**
- Sube al menos 3 imágenes
- Primera imagen = imagen principal
- Resolución recomendada: 1000x1000px
- Formatos: JPG, PNG, WebP

**Inventario:**
- **SKU:** Código único del producto
- **Cantidad:** Stock disponible
- **Seguimiento de inventario:** Activar para control de stock

### 4.2 Variantes de producto

Si tu producto tiene opciones (talla, color, etc.):

1. En la edición del producto, ve a **"Variantes"**
2. Haz clic en **"+ Agregar opción"**
3. Nombre de la opción: "Talla"
4. Valores: "S, M, L, XL"
5. Repite para otras opciones (color, etc.)
6. El sistema creará combinaciones automáticamente
7. Configura precio y stock por variante si difieren

### 4.3 Organizar productos

**Categorías:**
1. Ve a **E-commerce > Categorías**
2. Crea categorías: "Camisetas", "Pantalones", etc.
3. Asigna productos a categorías

**Colecciones:**
- Agrupa productos temáticamente
- Ejemplos: "Novedades", "Ofertas", "Más vendidos"

---

## Paso 5: Configurar envíos

### 5.1 Zonas de envío

1. Ve a **E-commerce > Configuración > Envíos**
2. Crea zonas de envío:
   - Local (misma ciudad)
   - Nacional (todo el país)
   - Internacional

### 5.2 Tarifas de envío

Para cada zona, configura tarifas:

**Por peso:**
- 0-1 kg: $100 MXN
- 1-5 kg: $150 MXN
- 5+ kg: $200 MXN

**Por precio del pedido:**
- $0-500: $99 MXN
- $500-1000: $49 MXN
- $1000+: Gratis

**Tarifa fija:**
- Cualquier pedido: $99 MXN

### 5.3 Envío gratis

Para ofrecer envío gratis sobre cierto monto:

1. Activa **"Envío gratis"**
2. Configura el umbral: $500 MXN
3. Los clientes verán: "¡Envío gratis en compras mayores a $500!"

---

## Paso 6: Diseñar tu tienda

### 6.1 Página de tienda

1. Ve al editor de tu sitio web
2. Agrega el componente **"Store Grid"** o **"Product List"**
3. Personaliza:
   - Productos por fila
   - Mostrar/ocultar precio
   - Estilo de tarjetas

### 6.2 Página de producto

Personaliza cómo se ven las páginas de producto:
- Galería de imágenes
- Descripción
- Variantes
- Botón de compra
- Productos relacionados

### 6.3 Carrito y checkout

El carrito y checkout vienen prediseñados, pero puedes:
- Cambiar colores
- Agregar campos personalizados
- Configurar página de confirmación

---

## Paso 7: Gestionar pedidos

### 7.1 Ver pedidos

1. Ve a **E-commerce > Pedidos**
2. Verás todos los pedidos con:
   - Número de orden
   - Cliente
   - Productos
   - Total
   - Estado

### 7.2 Estados de pedido

| Estado | Descripción |
|--------|-------------|
| Pendiente | Pago en proceso |
| Pagado | Pago confirmado |
| En preparación | Preparando envío |
| Enviado | En camino |
| Entregado | Recibido por cliente |
| Cancelado | Pedido cancelado |

### 7.3 Procesar un pedido

1. Abre el pedido
2. Revisa los detalles
3. Prepara los productos
4. Marca como **"Enviado"**
5. Ingresa número de rastreo (opcional)
6. El cliente recibirá notificación

---

## Lanzar tu tienda

### Checklist antes de lanzar

- [ ] Información de tienda completa
- [ ] Stripe conectado y verificado
- [ ] Al menos 5-10 productos con fotos
- [ ] Precios correctos
- [ ] Inventario actualizado
- [ ] Envíos configurados
- [ ] Impuestos configurados
- [ ] Pedido de prueba realizado
- [ ] Modo de prueba desactivado

### Publicar

1. Guarda todos los cambios
2. Ve a la configuración del sitio
3. Haz clic en **"Publicar"**
4. ¡Tu tienda está en línea!

---

## Consejos para vender más

1. **Fotos de calidad:** Invierte en buenas fotografías
2. **Descripciones completas:** Resuelve dudas antes de que surjan
3. **Precios competitivos:** Investiga a tu competencia
4. **Envío gratis:** Es un gran incentivo de compra
5. **Reseñas:** Pide a clientes que dejen opiniones
6. **Ofertas:** Crea promociones periódicas

---

## Soporte

¿Problemas con tu tienda?
- 📧 ecommerce@quimera.ai
- 💬 Chat en vivo`
    }
];

const TROUBLESHOOTING_ARTICLES = [
    {
        title: 'Mi sitio no carga: Guía de solución',
        slug: 'sitio-no-carga-solucion',
        excerpt: 'Soluciones paso a paso para cuando tu sitio web no carga o muestra errores.',
        featuredImage: 'https://images.unsplash.com/photo-1525785967371-87ba44b3e6cf?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['troubleshooting', 'error', 'problema', 'no-carga', 'ayuda'],
        author: 'Equipo Quimera',
        content: `# Mi sitio no carga: Guía de solución

## Diagnóstico inicial

Antes de buscar soluciones, identifica el tipo de problema:

### ¿Qué ves exactamente?

1. **Página en blanco:** El navegador carga pero no muestra nada
2. **Error 404:** "Página no encontrada"
3. **Error 500:** "Error del servidor"
4. **Error de SSL:** "Conexión no segura"
5. **Carga infinita:** El sitio nunca termina de cargar
6. **Contenido desactualizado:** No muestra cambios recientes

---

## Soluciones por tipo de problema

### Página en blanco

**Posibles causas:**
- Problema de JavaScript
- Caché del navegador
- Extensiones interfiriendo

**Soluciones:**

**1. Limpia la caché del navegador:**
- Chrome: Ctrl+Shift+Delete > Selecciona "Imágenes y archivos en caché" > Borrar
- Firefox: Ctrl+Shift+Delete > Caché > Aceptar
- Safari: Cmd+Option+E

**2. Prueba en modo incógnito:**
- Chrome: Ctrl+Shift+N
- Firefox: Ctrl+Shift+P
- Si funciona en incógnito, el problema son extensiones o caché

**3. Desactiva extensiones:**
- Especialmente bloqueadores de anuncios
- Prueba desactivando una por una

**4. Revisa la consola del navegador:**
- Presiona F12
- Ve a la pestaña "Console"
- Busca errores en rojo
- Comparte el error con soporte si no lo entiendes

### Error 404 (Página no encontrada)

**Posibles causas:**
- La página fue eliminada
- URL incorrecta
- Problema con rutas

**Soluciones:**

**1. Verifica la URL:**
- ¿Está correctamente escrita?
- ¿Tiene caracteres especiales incorrectos?

**2. Revisa si la página existe:**
- Ve a tu Dashboard
- Busca la página en la lista de páginas
- Si no existe, créala o redirígela

**3. Verifica que el sitio esté publicado:**
- Un sitio en borrador no es accesible públicamente

### Error 500 (Error del servidor)

**Posibles causas:**
- Problema temporal del servidor
- Error en configuración

**Soluciones:**

**1. Espera y recarga:**
- A veces es un problema temporal
- Espera 2-3 minutos y recarga

**2. Verifica el estado del servicio:**
- Ve a status.quimera.ai
- Revisa si hay incidentes reportados

**3. Contacta soporte:**
- Si persiste más de 15 minutos
- Incluye la URL exacta y hora del error

### Error de SSL (Conexión no segura)

**Posibles causas:**
- Dominio recién conectado
- Certificado no generado
- Problema de DNS

**Soluciones:**

**1. Espera la propagación:**
- Los certificados SSL pueden tardar hasta 24 horas
- Especialmente con dominios nuevos

**2. Verifica la conexión del dominio:**
- Ve a Dominios en tu Dashboard
- Confirma que el estado sea "Conectado"

**3. Usa HTTP temporalmente:**
- Accede via http:// en lugar de https://
- Solo como prueba, no para producción

### Carga infinita

**Posibles causas:**
- Conexión lenta
- Recursos pesados
- Problema de DNS

**Soluciones:**

**1. Prueba tu conexión:**
- Ve a speedtest.net
- Verifica que tengas buena velocidad

**2. Prueba desde otra red:**
- Usa datos móviles
- O prueba desde otra ubicación

**3. Verifica DNS:**
- Usa Google DNS: 8.8.8.8
- Prueba si carga con el subdominio de Quimera

### Contenido desactualizado

**Posibles causas:**
- Caché del navegador
- Caché del CDN
- Cambios no publicados

**Soluciones:**

**1. Fuerza recarga:**
- Windows: Ctrl+F5
- Mac: Cmd+Shift+R

**2. Verifica que publicaste:**
- Ve al editor
- Confirma que los cambios se guardaron
- Haz clic en "Publicar" nuevamente

**3. Limpia caché del CDN:**
- En Configuración > Avanzado > "Purgar caché"
- Espera 2-3 minutos

---

## Verificaciones generales

### ¿Tu sitio está publicado?

1. Ve a tu Dashboard
2. Busca tu sitio en la lista
3. Verifica el estado:
   - 🟢 Publicado: Está en línea
   - 🟡 Borrador: No es público
   - 🔴 Error: Hay un problema

### ¿El dominio está correctamente configurado?

1. Ve a **Dominios**
2. Verifica el estado de tu dominio
3. Si hay error, revisa la configuración DNS

### ¿Hay problemas conocidos?

1. Ve a [status.quimera.ai](https://status.quimera.ai)
2. Revisa si hay incidentes activos
3. Suscríbete para recibir notificaciones

---

## Cuándo contactar soporte

Contacta soporte si:
- El problema persiste más de 1 hora
- Ves errores que no entiendes
- Tu sitio funcionaba y dejó de funcionar sin cambios
- Necesitas ayuda urgente

**Información a incluir:**
- URL exacta del problema
- Qué navegador usas
- Captura de pantalla del error
- Hora aproximada cuando empezó
- Pasos que ya intentaste

---

## Contacto

- 💬 Chat en vivo (en la plataforma)
- 📧 soporte@quimera.ai
- 📚 Más artículos en este Help Center`
    }
];

const LEADS_ARTICLES = [
    {
        title: 'Capturar leads: Guía completa de formularios',
        slug: 'capturar-leads-formularios-guia',
        excerpt: 'Aprende a crear formularios efectivos que conviertan visitantes en clientes potenciales.',
        featuredImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['leads', 'crm', 'forms', 'formularios', 'contactos'],
        author: 'Equipo Quimera',
        content: `# Capturar leads: Guía completa de formularios

## ¿Qué es un lead?

Un lead es un visitante que ha mostrado interés en tu negocio dejando sus datos de contacto. Capturar leads es esencial para:

- Construir tu base de clientes potenciales
- Seguir en contacto con interesados
- Convertir visitantes en ventas
- Medir el éxito de tu sitio web

---

## Tipos de formularios

### 1. Formulario de contacto simple

**Uso:** Consultas generales, soporte

**Campos típicos:**
- Nombre
- Email
- Mensaje

**Ventajas:**
- Fácil de completar
- Baja fricción
- Alto número de envíos

### 2. Formulario de cotización

**Uso:** Solicitar presupuestos, servicios personalizados

**Campos típicos:**
- Nombre
- Email
- Teléfono
- Tipo de servicio
- Descripción del proyecto
- Presupuesto aproximado

**Ventajas:**
- Leads más calificados
- Información útil para responder
- Filtras curiosos de interesados reales

### 3. Formulario de lead magnet

**Uso:** Ofrecer algo a cambio de datos

**Campos típicos:**
- Nombre
- Email

**Ejemplos de lead magnets:**
- Ebook o guía gratuita
- Código de descuento
- Acceso a webinar
- Plantilla descargable

**Ventajas:**
- Altísima conversión
- Construyes lista de email
- Inicias relación con valor

### 4. Formulario de registro/suscripción

**Uso:** Newsletter, alertas, membresías

**Campos típicos:**
- Email (mínimo)
- Nombre (opcional)

### 5. Formulario multi-paso

**Uso:** Procesos complejos, calificación de leads

**Estructura:**
- Paso 1: Información básica
- Paso 2: Detalles del proyecto
- Paso 3: Preferencias y presupuesto

**Ventajas:**
- Menos abrumador que un formulario largo
- Mejor tasa de completado
- Leads más calificados

---

## Crear un formulario

### Paso 1: Agregar componente

1. Abre el editor de tu sitio
2. En el panel de componentes, busca **"Contact"** o **"Leads"**
3. Arrastra el componente a tu página
4. Elige una variante (simple, completo, con imagen, etc.)

### Paso 2: Configurar campos

1. Selecciona el formulario
2. En el panel derecho, ve a **"Campos"**
3. Para cada campo, configura:
   - **Tipo:** Texto, email, teléfono, selector, etc.
   - **Etiqueta:** Lo que ve el usuario
   - **Placeholder:** Ejemplo dentro del campo
   - **Requerido:** Sí/No
   - **Validación:** Formato esperado

### Tipos de campos disponibles

| Tipo | Uso |
|------|-----|
| Texto corto | Nombre, asunto |
| Texto largo | Mensaje, descripción |
| Email | Correo electrónico |
| Teléfono | Número de contacto |
| Selector | Elegir de opciones |
| Radio | Una opción de varias |
| Checkbox | Múltiples opciones |
| Fecha | Seleccionar fecha |
| Archivo | Subir documento |
| Número | Cantidades, presupuesto |

### Paso 3: Configurar acción post-envío

¿Qué pasa cuando alguien envía el formulario?

1. Ve a **"Configuración"** del formulario
2. En **"Después de enviar"**, elige:
   - **Mensaje:** Muestra un mensaje de confirmación
   - **Redirigir:** Envía a una página de gracias
   - **Ambos:** Mensaje + redirección

### Paso 4: Configurar notificaciones

1. En **"Notificaciones"**
2. Activa **"Email de notificación"**
3. Configura:
   - **Destinatario:** Tu email
   - **Asunto:** "Nuevo contacto desde web"
   - **Incluir:** Todos los campos del formulario

---

## Mejores prácticas

### 1. Menos campos = más conversiones

**Regla general:** Solo pide lo que realmente necesitas.

| Campos | Tasa de conversión típica |
|--------|---------------------------|
| 3 campos | 25%+ |
| 5 campos | 15-20% |
| 7+ campos | <10% |

### 2. Usa CTAs claros

**❌ Malo:** "Enviar"
**✅ Bueno:** "Solicitar cotización gratis"
**✅ Bueno:** "Descargar guía ahora"
**✅ Bueno:** "Reservar mi lugar"

### 3. Agrega prueba social

Cerca del formulario, incluye:
- "Únete a más de 1,000 clientes"
- Testimonios breves
- Logos de clientes
- Calificación de estrellas

### 4. Elimina distracciones

En páginas de captura de leads:
- Elimina menú de navegación
- Remueve footer complejo
- Enfoca toda la atención en el formulario

### 5. Ofrece valor

Responde: "¿Por qué debería darte mis datos?"
- Acceso a contenido exclusivo
- Descuento especial
- Consulta gratuita
- Respuesta rápida

---

## Ver y gestionar leads

### Acceder a leads

1. Ve a **Leads** en el menú principal
2. Verás todos los contactos capturados

### Información por lead

- Nombre y datos de contacto
- Fuente (qué formulario usó)
- Fecha de captura
- Mensajes o respuestas
- Estado del lead

### Estados de lead

Organiza tus leads por estado:
1. **Nuevo:** Recién llegado, sin contactar
2. **Contactado:** Ya enviaste primer mensaje
3. **En negociación:** Hay interés activo
4. **Propuesta enviada:** Esperando respuesta
5. **Ganado:** Se convirtió en cliente
6. **Perdido:** No se concretó

### Exportar leads

1. Ve a **Leads**
2. Filtra si es necesario
3. Haz clic en **"Exportar"**
4. Elige formato: CSV o Excel
5. Descarga el archivo

---

## Integrar con otras herramientas

### Email marketing

Conecta formularios con:
- Mailchimp
- ActiveCampaign
- Mailerlite

Los leads se agregarán automáticamente a tu lista.

### CRM externos

Envía leads a:
- HubSpot
- Salesforce
- Pipedrive

### Automatización

Con Zapier puedes:
- Crear tarea en Trello
- Enviar notificación a Slack
- Agregar a Google Sheets
- Y cientos de opciones más

---

## Métricas importantes

### Tasa de conversión

**Fórmula:** (Formularios enviados / Visitantes) x 100

**Benchmarks:**
- Landing page: 15-25%
- Página de contacto: 5-10%
- Popup: 2-5%

### Calidad de leads

No todos los leads son iguales. Mide:
- ¿Cuántos responden a tu contacto?
- ¿Cuántos se convierten en clientes?
- ¿Cuál es el valor promedio?

---

## Contacto

¿Preguntas sobre captura de leads?
- 💬 Chat en vivo
- 📧 soporte@quimera.ai`
    }
];

// Combinar todos los artículos
export const ALL_HELP_ARTICLES = [
    ...GETTING_STARTED_ARTICLES,
    ...EDITOR_ARTICLES,
    ...AI_ARTICLES,
    ...BILLING_ARTICLES,
    ...DOMAINS_ARTICLES,
    ...ECOMMERCE_ARTICLES,
    ...TROUBLESHOOTING_ARTICLES,
    ...LEADS_ARTICLES,
];

// Exportaciones individuales
export {
    GETTING_STARTED_ARTICLES,
    EDITOR_ARTICLES,
    AI_ARTICLES,
    BILLING_ARTICLES,
    DOMAINS_ARTICLES,
    ECOMMERCE_ARTICLES,
    TROUBLESHOOTING_ARTICLES,
    LEADS_ARTICLES,
};




