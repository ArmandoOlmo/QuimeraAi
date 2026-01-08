/**
 * Utility to seed Help Center articles from browser console
 * 
 * Usage in browser console:
 * 1. Import: import { seedHelpArticles } from '/src/utils/seedHelpArticles'
 * 2. Execute: await seedHelpArticles()
 * 
 * Or use the window global:
 * await window.seedHelpArticles()
 */

import {
    collection,
    doc,
    writeBatch,
    getDocs,
    query,
    where,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

// =============================================================================
// ARTICLE DATA
// =============================================================================

const HELP_ARTICLES = [
    // GETTING STARTED
    {
        title: 'Cómo crear tu primer sitio web con Quimera AI',
        slug: 'como-crear-primer-sitio-web',
        excerpt: 'Guía paso a paso para crear tu primer sitio web profesional usando el poder de la inteligencia artificial de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['getting-started', 'primeros-pasos', 'inicio', 'crear', 'website'],
        author: 'Equipo Quimera',
        content: `# Cómo crear tu primer sitio web con Quimera AI

Bienvenido a Quimera AI. En esta guía te mostraremos cómo crear tu primer sitio web profesional en cuestión de minutos.

## Paso 1: Registrarse en Quimera AI

1. Ve a quimera.ai y haz clic en "Comenzar Gratis"
2. Completa el formulario de registro con tu email
3. Verifica tu correo electrónico
4. ¡Listo! Ya puedes acceder a tu dashboard

## Paso 2: Crear un nuevo proyecto

Una vez en tu dashboard:

1. Haz clic en el botón **"+ Nuevo Sitio Web"**
2. Elige una de las siguientes opciones:
   - **Usar plantilla**: Selecciona entre nuestras plantillas profesionales
   - **Crear con IA**: Describe tu negocio y la IA creará un sitio personalizado

## Paso 3: Personalizar tu sitio

El editor visual te permite:
- **Arrastrar y soltar** componentes
- **Editar textos** haciendo clic directamente
- **Cambiar colores** desde el panel de diseño
- **Subir imágenes** desde tu computadora o usar nuestro banco de imágenes
- **Agregar secciones** como testimonios, precios, FAQ, etc.

## Paso 4: Configurar la navegación

1. Ve a la sección de **Navegación** en el menú lateral
2. Agrega las páginas que necesites
3. Organiza el menú arrastrando los elementos
4. Configura enlaces internos y externos

## Paso 5: Publicar tu sitio

Cuando estés satisfecho con el resultado:

1. Haz clic en **"Vista Previa"** para ver cómo se verá
2. Revisa en diferentes dispositivos (móvil, tablet, desktop)
3. Haz clic en **"Publicar"** para que tu sitio esté en línea

## Consejos adicionales

- **Usa el asistente de IA** para generar contenido automáticamente
- **Optimiza para SEO** completando los metadatos de cada página
- **Conecta tu dominio** personalizado para una imagen más profesional
- **Activa el chatbot** para atender a tus visitantes 24/7

¿Tienes preguntas? Nuestro equipo de soporte está disponible para ayudarte.`
    },
    {
        title: 'Guía de inicio rápido: Tu primer sitio en 5 minutos',
        slug: 'guia-inicio-rapido',
        excerpt: 'Aprende a crear un sitio web completo en solo 5 minutos con nuestra guía de inicio rápido.',
        featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        status: 'published' as const,
        featured: true,
        category: 'guide' as const,
        tags: ['getting-started', 'inicio', 'rapido', 'onboarding', 'start'],
        author: 'Equipo Quimera',
        content: `# Guía de inicio rápido

## Crea tu sitio web en 5 minutos

### Minuto 1-2: Configuración inicial
- Regístrate con tu email o Google
- Accede a tu dashboard

### Minuto 2-3: Describe tu negocio
- Usa el asistente de IA
- Escribe: "Quiero un sitio web para [tu negocio]"
- La IA generará una estructura completa

### Minuto 3-4: Personaliza
- Cambia el logo y colores
- Ajusta los textos principales
- Sube tus imágenes

### Minuto 4-5: Publica
- Revisa la vista previa
- Haz clic en Publicar
- ¡Tu sitio está en línea!

## Próximos pasos recomendados

1. Conecta tu dominio personalizado
2. Configura el chatbot de IA
3. Optimiza el SEO
4. Agrega formularios de contacto`
    },
    {
        title: 'Entendiendo el dashboard de Quimera AI',
        slug: 'entendiendo-dashboard',
        excerpt: 'Conoce todas las funciones disponibles en tu panel de control y cómo aprovecharlas al máximo.',
        featuredImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['getting-started', 'dashboard', 'panel', 'inicio'],
        author: 'Equipo Quimera',
        content: `# Entendiendo el Dashboard de Quimera AI

Tu dashboard es el centro de control de todos tus proyectos. Aquí te explicamos cada sección.

## Secciones principales

### 🏠 Dashboard
Vista general con:
- Estadísticas de tus sitios
- Actividad reciente
- Accesos rápidos

### 🌐 Mis Sitios Web
- Lista de todos tus proyectos
- Estado de publicación
- Acciones rápidas (editar, duplicar, eliminar)

### 📝 CMS (Gestor de Contenido)
- Administra el contenido de tus sitios
- Crea y edita artículos
- Gestiona páginas

### 🤖 Asistente IA
- Configura tu chatbot
- Entrena con información de tu negocio
- Personaliza respuestas

### 👥 Leads
- Contactos capturados
- Formularios recibidos
- Exportación de datos

### 📅 Citas
- Agenda de reservaciones
- Configuración de horarios
- Notificaciones

### 🌍 Dominios
- Conecta dominios propios
- Gestiona DNS
- Certificados SSL

### ⚙️ Configuración
- Perfil de usuario
- Equipo de trabajo
- Suscripción y facturación`
    },
    // EDITOR
    {
        title: 'Cómo usar el editor visual de Quimera',
        slug: 'como-usar-editor-visual',
        excerpt: 'Domina el editor visual drag-and-drop para crear diseños profesionales sin código.',
        featuredImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['editor', 'builder', 'diseño', 'design', 'visual', 'website'],
        author: 'Equipo Quimera',
        content: `# Cómo usar el editor visual de Quimera

El editor visual de Quimera AI te permite crear sitios web profesionales sin escribir código.

## Interfaz del editor

### Panel izquierdo - Componentes
Aquí encontrarás todos los bloques disponibles:
- **Hero**: Secciones principales con llamadas a la acción
- **Features**: Características y beneficios
- **Testimonials**: Reseñas de clientes
- **Pricing**: Tablas de precios
- **FAQ**: Preguntas frecuentes
- **Contact**: Formularios y mapas
- **Footer**: Pie de página

### Panel derecho - Propiedades
Cuando seleccionas un componente:
- **Contenido**: Edita textos e imágenes
- **Estilo**: Colores, fuentes, espaciados
- **Configuración**: Opciones avanzadas

### Barra superior
- **Vista previa**: Ver cómo se ve tu sitio
- **Dispositivos**: Cambiar entre móvil/tablet/desktop
- **Deshacer/Rehacer**: Control de cambios
- **Guardar/Publicar**: Acciones principales

## Cómo agregar componentes

1. Haz clic en un componente del panel izquierdo
2. Arrástralo a la posición deseada
3. Suéltalo para agregarlo
4. Haz clic para editarlo

## Editar contenido

- **Textos**: Haz doble clic para editar
- **Imágenes**: Clic en la imagen > Cambiar
- **Links**: Selecciona > Panel derecho > Enlace

## Cambiar estilos

1. Selecciona el componente
2. Ve al panel "Estilo"
3. Ajusta colores, fuentes y espaciados
4. Los cambios se aplican en tiempo real

## Consejos pro

- Usa **Ctrl+Z** para deshacer
- Mantén **Shift** al arrastrar para alinear
- **Duplica** componentes para mantener consistencia
- Usa el **Asistente IA** para generar contenido`
    },
    {
        title: 'Componentes disponibles y cómo usarlos',
        slug: 'componentes-disponibles',
        excerpt: 'Guía completa de todos los componentes del editor y sus mejores usos.',
        featuredImage: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['editor', 'components', 'builder', 'diseño', 'componentes'],
        author: 'Equipo Quimera',
        content: `# Componentes disponibles

## Secciones Hero

### Hero Clásico
- Título grande + subtítulo
- Botones de acción
- Imagen de fondo o lateral

### Hero Moderno
- Diseño asimétrico
- Efectos de gradiente
- Animaciones sutiles

### Hero con Video
- Video de fondo
- Overlay de color
- Texto superpuesto

## Secciones de Contenido

### Features (Características)
- Grid de iconos
- Descripción de servicios
- Variantes: cards, lista, iconos

### Testimonios
- Carrusel de reseñas
- Cards individuales
- Con foto y rating

### Precios
- Tablas comparativas
- Destacar plan recomendado
- Toggle mensual/anual

### FAQ
- Acordeón expandible
- Categorías
- Búsqueda integrada

### Equipo
- Grid de miembros
- Foto + bio
- Redes sociales

### Portfolio
- Galería de proyectos
- Filtros por categoría
- Lightbox de imágenes

## Formularios

### Contacto
- Campos personalizables
- Validación automática
- Notificaciones por email

### Newsletter
- Suscripción simple
- Integración con email marketing
- Popup opcional

### Leads avanzado
- Múltiples pasos
- Campos condicionales
- Scoring de leads`
    },
    {
        title: 'Personalizar colores y tipografía',
        slug: 'personalizar-colores-tipografia',
        excerpt: 'Aprende a crear una identidad visual consistente con colores y fuentes personalizadas.',
        featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
        status: 'published' as const,
        featured: false,
        category: 'tutorial' as const,
        tags: ['editor', 'design', 'colores', 'tipografia', 'branding', 'diseño'],
        author: 'Equipo Quimera',
        content: `# Personalizar colores y tipografía

## Sistema de colores

### Colores principales
- **Primario**: Color principal de tu marca
- **Secundario**: Color de acento
- **Neutral**: Grises y fondos

### Cómo cambiar colores

1. Ve a **Configuración > Diseño**
2. Selecciona **Paleta de colores**
3. Usa el selector de color o ingresa código hex
4. Los cambios se aplican globalmente

### Paletas prediseñadas
- Profesional (azules y grises)
- Creativo (vibrantes)
- Elegante (tonos neutros)
- Tecnología (modernos)

## Tipografía

### Fuentes disponibles
- **Sans-serif**: Inter, Poppins, Open Sans
- **Serif**: Playfair Display, Merriweather
- **Display**: Montserrat, Oswald

### Jerarquía de textos
- **H1**: Títulos principales (48-64px)
- **H2**: Subtítulos de sección (32-40px)
- **H3**: Títulos de componentes (24-28px)
- **Cuerpo**: Texto general (16-18px)

### Configurar tipografía

1. Ve a **Configuración > Tipografía**
2. Selecciona fuente para encabezados
3. Selecciona fuente para cuerpo
4. Ajusta tamaños si es necesario

## Consejos de diseño

- Usa máximo 2-3 colores principales
- Mantén contraste para legibilidad
- Usa la misma familia de fuentes consistentemente
- El espacio en blanco es tu amigo`
    },
    // AI
    {
        title: 'Configurar tu chatbot de IA paso a paso',
        slug: 'configurar-chatbot-ia',
        excerpt: 'Guía completa para configurar y entrenar tu asistente virtual inteligente.',
        featuredImage: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['ai', 'chatbot', 'assistant', 'ia', 'bot', 'asistente'],
        author: 'Equipo Quimera',
        content: `# Configurar tu chatbot de IA

El chatbot de Quimera AI puede atender a tus visitantes 24/7, responder preguntas y capturar leads.

## Paso 1: Activar el chatbot

1. Ve a **Asistente IA** en el menú
2. Haz clic en **Activar chatbot**
3. Elige un proyecto donde instalarlo

## Paso 2: Configuración básica

### Personalidad del bot
- **Nombre**: Cómo se presentará el bot
- **Avatar**: Imagen o icono
- **Tono**: Formal, casual, amigable

### Mensaje de bienvenida
Configura el saludo inicial:
\`\`\`
¡Hola! 👋 Soy [Nombre], el asistente virtual de [Tu empresa].
¿En qué puedo ayudarte hoy?
\`\`\`

## Paso 3: Entrenar al chatbot

### Base de conocimiento
1. Ve a **Entrenamiento**
2. Agrega información sobre tu negocio:
   - Descripción de servicios/productos
   - Preguntas frecuentes
   - Políticas (envío, devoluciones, etc.)
   - Información de contacto

### Subir documentos
- PDFs con información
- Páginas de tu sitio web
- Catálogos de productos

## Paso 4: Configurar respuestas

### Respuestas predeterminadas
- Horarios de atención
- Formas de pago
- Ubicación
- Contacto

### Flujos de conversación
Crea rutas de conversación para:
- Consultas de ventas
- Soporte técnico
- Reservación de citas
- Captura de leads

## Paso 5: Integrar en tu sitio

1. El chatbot se activa automáticamente
2. Personaliza la posición (esquina inferior)
3. Configura en qué páginas aparece
4. Ajusta colores para que coincidan con tu marca

## Métricas disponibles

- Conversaciones totales
- Preguntas más frecuentes
- Tasa de resolución
- Leads capturados`
    },
    {
        title: 'Entrenar tu chatbot con información personalizada',
        slug: 'entrenar-chatbot',
        excerpt: 'Aprende a mejorar las respuestas de tu chatbot con información específica de tu negocio.',
        featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['ai', 'chatbot', 'entrenar', 'training', 'ia', 'inteligencia'],
        author: 'Equipo Quimera',
        content: `# Entrenar tu chatbot

## ¿Por qué entrenar?

Un chatbot bien entrenado:
- Responde con precisión
- Usa el tono de tu marca
- Conoce tus productos/servicios
- Genera más conversiones

## Métodos de entrenamiento

### 1. Texto directo
Escribe información directamente sobre tu negocio, servicios, horarios, etc.

### 2. Preguntas y respuestas
Formato Q&A para preguntas frecuentes específicas.

### 3. Documentos
Sube archivos PDF con catálogos, manuales y políticas.

### 4. URLs
Importa contenido de tu sitio web actual.

## Mejores prácticas

1. **Sé específico**: Incluye detalles importantes
2. **Usa ejemplos**: Muestra cómo responder
3. **Actualiza regularmente**: Mantén info al día
4. **Revisa conversaciones**: Identifica gaps

## Verificar entrenamiento

1. Ve a **Probar chatbot**
2. Haz preguntas de prueba
3. Verifica respuestas
4. Ajusta según sea necesario`
    },
    {
        title: 'Créditos de IA: Qué son y cómo funcionan',
        slug: 'creditos-ia-como-funcionan',
        excerpt: 'Entiende el sistema de créditos de IA y cómo optimizar su uso.',
        featuredImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['ai', 'creditos', 'ia', 'billing', 'uso'],
        author: 'Equipo Quimera',
        content: `# Créditos de IA

## ¿Qué son los créditos?

Los créditos de IA son unidades que se consumen al usar funciones de inteligencia artificial en Quimera.

## ¿Qué consume créditos?

| Acción | Créditos |
|--------|----------|
| Generar textos con IA | 1-5 |
| Crear sección completa | 5-10 |
| Entrenar chatbot | 10-20 |
| Traducir página | 5-15 |
| Generar imágenes | 5-10 |
| Conversación de chatbot | 0.1-0.5 |

## Créditos por plan

- **Free**: 50 créditos/mes
- **Starter**: 500 créditos/mes
- **Pro**: 2,000 créditos/mes
- **Business**: 10,000 créditos/mes

## Cómo ver mis créditos

1. Ve a **Configuración > Suscripción**
2. Verás el contador de créditos
3. Historial de uso

## Consejos para optimizar

1. **Revisa antes de regenerar**: Edita manualmente pequeños cambios
2. **Usa plantillas**: Menos generación = menos créditos
3. **Entrena bien el chatbot**: Evita reentrenamientos
4. **Batch de traducciones**: Traduce todo junto`
    },
    // DOMAINS
    {
        title: 'Cómo conectar tu dominio personalizado',
        slug: 'conectar-dominio-personalizado',
        excerpt: 'Guía paso a paso para conectar tu propio dominio a tu sitio de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['domains', 'dominios', 'dns', 'custom-domain', 'dominio'],
        author: 'Equipo Quimera',
        content: `# Conectar tu dominio personalizado

## Requisitos previos

- Plan de pago activo (Starter o superior)
- Acceso al panel DNS de tu dominio
- Dominio registrado (GoDaddy, Namecheap, Google Domains, etc.)

## Paso 1: Agregar dominio en Quimera

1. Ve a **Dominios** en el menú
2. Haz clic en **+ Agregar dominio**
3. Ingresa tu dominio: \`tudominio.com\`
4. Haz clic en **Verificar**

## Paso 2: Configurar DNS

Quimera te mostrará los registros a configurar:

### Opción A: Registro CNAME (recomendado)
\`\`\`
Tipo: CNAME
Nombre: www
Valor: sites.quimera.ai
TTL: 3600
\`\`\`

### Opción B: Registro A (para dominio raíz)
\`\`\`
Tipo: A
Nombre: @
Valor: [IP proporcionada]
TTL: 3600
\`\`\`

## Paso 3: Verificar conexión

1. Regresa a Quimera
2. Haz clic en **Verificar DNS**
3. Espera la propagación (hasta 48 horas)
4. El estado cambiará a "Conectado"

## SSL automático

- Quimera genera certificado SSL gratis
- Se activa automáticamente
- Tu sitio será https://tudominio.com`
    },
    {
        title: 'Configurar DNS correctamente',
        slug: 'configurar-dns-correctamente',
        excerpt: 'Aprende los conceptos básicos de DNS y cómo configurarlo para tu dominio.',
        featuredImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['domains', 'dns', 'dominios', 'configuracion'],
        author: 'Equipo Quimera',
        content: `# Configurar DNS correctamente

## ¿Qué es DNS?

DNS (Domain Name System) traduce nombres de dominio a direcciones IP.

## Tipos de registros

### Registro A
- Apunta dominio a IP
- Usado para dominio raíz (@)

### Registro CNAME
- Apunta subdominio a otro dominio
- Usado para www

### Registro TXT
- Texto para verificación
- Usado para email, SSL, etc.

## Configuración recomendada

Para conectar tudominio.com:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | [IP de Quimera] |
| CNAME | www | sites.quimera.ai |

## Tiempo de propagación

- Cambios toman 1-48 horas
- Depende del TTL configurado
- Algunos proveedores son más rápidos

## Verificar propagación

Usa herramientas como:
- whatsmydns.net
- dnschecker.org`
    },
    // BILLING
    {
        title: 'Planes y precios de Quimera AI',
        slug: 'planes-precios',
        excerpt: 'Conoce todos los planes disponibles y elige el mejor para tu negocio.',
        featuredImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['billing', 'pricing', 'planes', 'precios', 'suscripción', 'plan'],
        author: 'Equipo Quimera',
        content: `# Planes y precios

## Comparativa de planes

### 🆓 Free
**$0/mes**
- 1 sitio web
- 50 créditos IA/mes
- Subdominio quimera.ai
- Chatbot básico
- Soporte por email

### ⭐ Starter
**$19/mes**
- 3 sitios web
- 500 créditos IA/mes
- 1 dominio personalizado
- Chatbot avanzado
- Sin marca de agua
- Soporte prioritario

### 🚀 Pro
**$49/mes**
- 10 sitios web
- 2,000 créditos IA/mes
- 5 dominios personalizados
- E-commerce básico
- CRM integrado
- Soporte 24/7

### 🏢 Business
**$149/mes**
- Sitios ilimitados
- 10,000 créditos IA/mes
- Dominios ilimitados
- E-commerce avanzado
- White-label
- Equipo de trabajo
- Account manager

## Preguntas frecuentes

### ¿Puedo cambiar de plan?
Sí, puedes subir o bajar de plan en cualquier momento.

### ¿Hay descuento anual?
Sí, 2 meses gratis al pagar anualmente.

### ¿Qué métodos de pago aceptan?
- Tarjeta de crédito/débito
- PayPal
- Transferencia bancaria (Business)

### ¿Hay reembolsos?
Garantía de 14 días en planes de pago.`
    },
    {
        title: 'Cómo gestionar tu suscripción',
        slug: 'gestionar-suscripcion',
        excerpt: 'Aprende a cambiar de plan, actualizar método de pago y cancelar suscripción.',
        featuredImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['billing', 'subscription', 'suscripción', 'pago', 'facturación'],
        author: 'Equipo Quimera',
        content: `# Gestionar tu suscripción

## Ver suscripción actual

1. Ve a **Configuración > Suscripción**
2. Verás:
   - Plan actual
   - Fecha de renovación
   - Créditos disponibles
   - Historial de pagos

## Cambiar de plan

### Upgrade (subir de plan)
1. Haz clic en **Mejorar plan**
2. Selecciona el nuevo plan
3. Se cobra la diferencia prorrateada
4. Cambio inmediato

### Downgrade (bajar de plan)
1. Haz clic en **Cambiar plan**
2. Selecciona el plan menor
3. Cambio efectivo al final del período
4. Mantén acceso hasta entonces

## Actualizar método de pago

1. Ve a **Métodos de pago**
2. Haz clic en **+ Agregar método**
3. Ingresa nueva tarjeta
4. Marca como predeterminada

## Cancelar suscripción

1. Ve a **Suscripción**
2. Haz clic en **Cancelar suscripción**
3. Indica el motivo (opcional)
4. Confirma cancelación`
    },
    {
        title: 'Solucionar problemas de pago',
        slug: 'problemas-pago',
        excerpt: 'Soluciones a los problemas más comunes con pagos y facturación.',
        featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['billing', 'payment', 'pago', 'error', 'facturación'],
        author: 'Equipo Quimera',
        content: `# Solucionar problemas de pago

## Pago rechazado

### Causas comunes:
1. **Fondos insuficientes** - Verifica saldo disponible
2. **Tarjeta vencida** - Actualiza datos de tarjeta
3. **Límite de compras online** - Contacta a tu banco
4. **Código de seguridad incorrecto** - Verifica CVV

### Solución:
1. Ve a **Métodos de pago**
2. Actualiza o agrega nueva tarjeta
3. Intenta el pago nuevamente

## Cargo duplicado

Si ves un cargo duplicado:
1. Espera 24-48 horas (puede ser autorización)
2. Si persiste, contacta soporte
3. Proporciona: fecha, monto, últimos 4 dígitos

## Reembolsos

### Política:
- 14 días de garantía
- Reembolso completo si no estás satisfecho
- Proceso en 5-10 días hábiles`
    },
    // ECOMMERCE
    {
        title: 'Crear tu tienda online desde cero',
        slug: 'crear-tienda-online',
        excerpt: 'Guía completa para configurar tu tienda de e-commerce en Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['ecommerce', 'tienda', 'store', 'productos', 'ventas'],
        author: 'Equipo Quimera',
        content: `# Crear tu tienda online

## Requisitos
- Plan Pro o superior
- Cuenta de Stripe (pagos)
- Productos para vender

## Paso 1: Activar e-commerce

1. Ve a **E-commerce** en el menú
2. Haz clic en **Activar tienda**
3. Selecciona el proyecto

## Paso 2: Configurar tienda

### Información básica
- Nombre de la tienda
- Descripción
- Logo
- Moneda (MXN, USD, EUR)

### Configuración de pagos
1. Conecta Stripe
2. Configura métodos de pago
3. Define impuestos

### Configuración de envíos
- Zonas de envío
- Tarifas por peso/ubicación
- Envío gratis (umbral)

## Paso 3: Agregar productos

1. Ve a **Productos > + Nuevo**
2. Completa:
   - Nombre y descripción
   - Precio y comparación
   - Imágenes (mínimo 3)
   - SKU e inventario
   - Categoría
   - Variantes (talla, color)

## Paso 4: Organizar catálogo

### Categorías
- Crea categorías principales
- Agrega subcategorías
- Asigna imágenes

### Colecciones
- Agrupa productos temáticos
- "Nuevos", "Ofertas", "Más vendidos"

## Paso 5: Lanzar tu tienda

1. Revisa toda la configuración
2. Haz pedido de prueba
3. Activa métodos de pago
4. ¡Publica!`
    },
    {
        title: 'Gestionar productos e inventario',
        slug: 'gestionar-productos-inventario',
        excerpt: 'Aprende a administrar tu catálogo de productos y controlar el inventario.',
        featuredImage: 'https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['ecommerce', 'products', 'inventario', 'productos', 'stock'],
        author: 'Equipo Quimera',
        content: `# Gestionar productos e inventario

## Agregar productos

### Información básica
- **Nombre**: Descriptivo y claro
- **Descripción**: Detallada con beneficios
- **Precio**: Regular y de oferta

### Imágenes
- Mínimo 3 imágenes
- Fondo blanco o lifestyle
- Alta resolución (1000x1000px)
- Múltiples ángulos

### Variantes
Para productos con opciones:
- Tallas: S, M, L, XL
- Colores: Rojo, Azul, Negro
- Cada variante tiene su SKU y stock

## Control de inventario

### Configurar stock
1. Activa **Seguimiento de inventario**
2. Ingresa cantidad disponible
3. Configura alertas de bajo stock

### Alertas
- Recibe email cuando stock bajo
- Define umbral (ej: 5 unidades)
- Evita sobreventa

## Importar/Exportar

### Importar productos
1. Descarga plantilla CSV
2. Completa con tus productos
3. Sube el archivo
4. Revisa y confirma`
    },
    {
        title: 'Configurar pagos con Stripe',
        slug: 'configurar-pagos-stripe',
        excerpt: 'Conecta Stripe para recibir pagos de forma segura en tu tienda.',
        featuredImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        status: 'published' as const,
        featured: false,
        category: 'tutorial' as const,
        tags: ['ecommerce', 'stripe', 'pagos', 'checkout', 'payment'],
        author: 'Equipo Quimera',
        content: `# Configurar pagos con Stripe

## ¿Por qué Stripe?

- Aceptado mundialmente
- Seguro y confiable
- Sin cuotas mensuales
- Comisión por transacción

## Paso 1: Crear cuenta Stripe

1. Ve a stripe.com
2. Crea una cuenta
3. Verifica tu identidad
4. Agrega cuenta bancaria

## Paso 2: Conectar con Quimera

1. Ve a **E-commerce > Pagos**
2. Haz clic en **Conectar Stripe**
3. Autoriza la conexión
4. ¡Listo!

## Métodos aceptados

- Visa, Mastercard, American Express
- Apple Pay, Google Pay
- OXXO (México)
- Transferencia bancaria

## Pagos de prueba

Antes de lanzar:
1. Activa modo de prueba
2. Usa tarjetas de prueba:
   - 4242 4242 4242 4242 (éxito)
   - 4000 0000 0000 9995 (rechazada)
3. Haz pedido de prueba`
    },
    // LEADS
    {
        title: 'Capturar leads con formularios inteligentes',
        slug: 'capturar-leads-formularios',
        excerpt: 'Aprende a crear formularios efectivos que conviertan visitantes en leads.',
        featuredImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['leads', 'crm', 'forms', 'formularios', 'contactos'],
        author: 'Equipo Quimera',
        content: `# Capturar leads con formularios

## Tipos de formularios

### Contacto simple
- Nombre, Email, Mensaje
- Ideal para consultas generales

### Lead magnet
- Email, Nombre
- A cambio de: ebook, descuento, etc.
- Alta conversión

### Cotización
- Datos de contacto
- Detalles del proyecto
- Para servicios

### Multi-paso
- Divide en pasos
- Menos abandono
- Mejor experiencia

## Crear formulario

1. Agrega componente **Leads** o **Contact**
2. Personaliza campos
3. Configura acciones post-envío
4. Activa notificaciones

## Campos disponibles

- Texto corto/largo
- Email, Teléfono
- Selector, Checkbox
- Fecha, Archivo

## Mejores prácticas

1. **Menos campos = más conversiones**
2. **CTA claro**: "Obtener cotización gratis"
3. **Prueba social**: "500+ clientes confían"
4. **Urgencia**: "Oferta válida hoy"`
    },
    {
        title: 'Usar el CRM de Quimera',
        slug: 'usar-crm-quimera',
        excerpt: 'Gestiona tus contactos y oportunidades de venta con el CRM integrado.',
        featuredImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['leads', 'crm', 'contacts', 'ventas', 'contactos'],
        author: 'Equipo Quimera',
        content: `# Usar el CRM de Quimera

## Vista de leads

### Panel principal
- Lista de todos los leads
- Filtros y búsqueda
- Ordenar por fecha, estado, etc.

### Información del lead
- Datos de contacto
- Fuente (formulario, chatbot)
- Historial de interacciones
- Notas

## Estados de lead

Personaliza tu pipeline:
1. **Nuevo**: Recién llegado
2. **Contactado**: Primera comunicación
3. **Calificado**: Interés confirmado
4. **Propuesta**: Cotización enviada
5. **Negociación**: En proceso
6. **Ganado/Perdido**: Resultado final

## Acciones sobre leads

### Cambiar estado
- Arrastra entre columnas
- O selecciona del menú

### Agregar nota
- Registra llamadas
- Seguimientos
- Información relevante

## Exportar datos

1. Aplica filtros deseados
2. Haz clic en **Exportar**
3. Selecciona formato (CSV, Excel)
4. Descarga archivo`
    },
    // INTEGRATIONS
    {
        title: 'Conectar WhatsApp Business a tu chatbot',
        slug: 'conectar-whatsapp-chatbot',
        excerpt: 'Integra WhatsApp para atender clientes directamente desde la app de mensajería.',
        featuredImage: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['integrations', 'whatsapp', 'meta', 'chatbot', 'conectar'],
        author: 'Equipo Quimera',
        content: `# Conectar WhatsApp Business

## Requisitos

- Cuenta de WhatsApp Business
- Número de teléfono verificado
- Cuenta de Meta Business
- Plan Pro o superior

## Paso 1: Configurar Meta Business

1. Ve a business.facebook.com
2. Crea o accede a tu cuenta
3. Verifica tu negocio
4. Agrega WhatsApp Business

## Paso 2: Conectar en Quimera

1. Ve a **Integraciones > WhatsApp**
2. Haz clic en **Conectar**
3. Inicia sesión en Meta
4. Autoriza permisos
5. Selecciona número de WhatsApp

## Paso 3: Configurar chatbot

### Mensaje de bienvenida
Configura el saludo inicial para WhatsApp.

### Respuestas automáticas
- Horarios de atención
- Catálogo de productos
- Preguntas frecuentes
- Redirección a agente

## Funciones disponibles

- Respuestas automáticas 24/7
- Catálogo de productos
- Botones interactivos
- Plantillas de mensajes
- Transferencia a humano
- Historial de conversaciones`
    },
    {
        title: 'Integrar Facebook Messenger',
        slug: 'integrar-facebook-messenger',
        excerpt: 'Conecta tu página de Facebook para atender clientes por Messenger.',
        featuredImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
        status: 'published' as const,
        featured: false,
        category: 'tutorial' as const,
        tags: ['integrations', 'facebook', 'messenger', 'meta', 'conectar'],
        author: 'Equipo Quimera',
        content: `# Integrar Facebook Messenger

## Requisitos

- Página de Facebook
- Rol de administrador
- Cuenta de Meta Business
- Plan Starter o superior

## Conectar Messenger

1. Ve a **Integraciones > Facebook**
2. Haz clic en **Conectar**
3. Inicia sesión en Facebook
4. Selecciona tu página
5. Autoriza permisos

## Configurar respuestas

### Saludo inicial
Se muestra antes del primer mensaje.

### Respuesta automática
Cuando el equipo no está disponible.

## Chatbot en Messenger

El mismo chatbot de tu sitio puede:
- Responder preguntas frecuentes
- Mostrar productos
- Capturar datos de contacto
- Agendar citas
- Transferir a humano

## Sincronización

- Conversaciones se guardan en CRM
- Leads automáticos
- Historial completo
- Continuidad web ↔ Messenger`
    },
    {
        title: 'Conectar con Zapier para automatizaciones',
        slug: 'conectar-zapier-automatizaciones',
        excerpt: 'Automatiza tareas conectando Quimera con miles de aplicaciones.',
        featuredImage: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['integrations', 'zapier', 'automation', 'api', 'integraciones'],
        author: 'Equipo Quimera',
        content: `# Conectar con Zapier

## ¿Qué es Zapier?

Zapier conecta aplicaciones para automatizar tareas sin código.

Ejemplo:
**Nuevo lead en Quimera** → **Agregar a Google Sheets** + **Enviar email** + **Crear tarea en Trello**

## Configurar conexión

1. Crea cuenta en zapier.com
2. En Quimera: **Integraciones > Zapier**
3. Copia tu **API Key**
4. En Zapier: Busca "Quimera"
5. Pega la API Key

## Triggers disponibles

Eventos que inician automatizaciones:
- Nuevo lead capturado
- Nueva orden creada
- Cita agendada
- Formulario enviado
- Conversación de chatbot

## Zaps populares

### Lead → Google Sheets
1. Trigger: Nuevo lead
2. Action: Agregar fila a spreadsheet

### Lead → Slack
1. Trigger: Nuevo lead
2. Action: Enviar mensaje al canal

### Cita → Google Calendar
1. Trigger: Cita agendada
2. Action: Crear evento`
    },
    // APPOINTMENTS
    {
        title: 'Configurar sistema de citas y reservaciones',
        slug: 'configurar-sistema-citas',
        excerpt: 'Aprende a configurar el calendario de citas para que tus clientes agenden automáticamente.',
        featuredImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['appointments', 'citas', 'calendario', 'reservaciones', 'agendar'],
        author: 'Equipo Quimera',
        content: `# Configurar sistema de citas

El sistema de citas de Quimera permite que tus clientes agenden automáticamente.

## Paso 1: Activar módulo de citas

1. Ve a **Citas** en el menú principal
2. Haz clic en **Activar sistema de citas**
3. Selecciona el proyecto donde usarlo

## Paso 2: Configurar disponibilidad

### Horario de atención
1. Define días laborables (ej: Lunes a Viernes)
2. Establece horas de inicio y fin
3. Configura descansos (almuerzo, etc.)

## Paso 3: Crear tipos de citas

### Ejemplos:
- **Consulta inicial** (30 min) - Gratis
- **Asesoría completa** (1 hora) - $500 MXN
- **Seguimiento** (15 min) - $200 MXN

### Configurar cada tipo:
- Nombre del servicio
- Duración
- Precio (opcional)
- Descripción
- Preguntas previas

## Paso 4: Personalizar formulario

Campos que puedes pedir:
- Nombre completo
- Email
- Teléfono
- Motivo de la cita
- Preguntas personalizadas

## Paso 5: Configurar notificaciones

### Para ti:
- Email cuando hay nueva cita
- Resumen diario de citas
- Recordatorio 1 hora antes

### Para el cliente:
- Confirmación de cita
- Recordatorio 24h antes
- Recordatorio 1h antes`
    },
    {
        title: 'Sincronizar citas con Google Calendar',
        slug: 'sincronizar-google-calendar',
        excerpt: 'Mantén tu calendario de Google actualizado automáticamente con las citas de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['appointments', 'google', 'calendar', 'sincronizar', 'integrar'],
        author: 'Equipo Quimera',
        content: `# Sincronizar con Google Calendar

## Beneficios

- Ver citas de Quimera en Google Calendar
- Evitar conflictos de horarios
- Recibir notificaciones de Google
- Disponibilidad sincronizada

## Conectar Google Calendar

1. Ve a **Citas > Integraciones**
2. Haz clic en **Conectar Google Calendar**
3. Selecciona tu cuenta de Google
4. Autoriza permisos
5. Elige el calendario a sincronizar

## Opciones de sincronización

### Bidireccional
- Citas de Quimera → Google Calendar
- Eventos de Google → Bloquean disponibilidad

### Solo lectura
- Citas de Quimera → Google Calendar
- Sin afectar tu calendario personal

## Qué se sincroniza

Cada cita aparece con:
- Título: "Cita con [Nombre del cliente]"
- Hora y duración
- Descripción del servicio
- Datos de contacto
- Link a videollamada (si aplica)`
    },
    // SEO
    {
        title: 'Optimizar tu sitio para Google (SEO básico)',
        slug: 'optimizar-seo-basico',
        excerpt: 'Guía esencial para mejorar el posicionamiento de tu sitio en buscadores.',
        featuredImage: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['seo', 'google', 'search', 'posicionamiento', 'optimización'],
        author: 'Equipo Quimera',
        content: `# Optimizar tu sitio para Google

## ¿Qué es SEO?

SEO (Search Engine Optimization) es el proceso de mejorar tu sitio para aparecer en los primeros resultados de Google.

## Configuración básica en Quimera

### Título y descripción
1. Ve a **Configuración > SEO**
2. Completa:
   - **Título**: 50-60 caracteres
   - **Descripción**: 150-160 caracteres
   - **Palabras clave**: términos relevantes

## SEO por página

Cada página debe tener:
- Título único
- Descripción única
- URL amigable

### URLs amigables
✅ Bueno: /servicios/diseno-web
❌ Malo: /page?id=123

## Imágenes optimizadas

### Texto alternativo (alt)
- Describe la imagen
- Incluye palabras clave naturalmente

### Tamaño de archivo
- Comprime imágenes
- Usa formato WebP cuando sea posible

## Contenido de calidad

### Estructura con encabezados
- H1: Solo uno por página
- H2: Secciones principales
- H3: Subsecciones

## Verificar en Google

1. Ve a Google Search Console
2. Agrega tu dominio
3. Verifica propiedad
4. Envía sitemap: tudominio.com/sitemap.xml`
    },
    {
        title: 'Configurar Google Analytics en tu sitio',
        slug: 'configurar-google-analytics',
        excerpt: 'Aprende a instalar y usar Google Analytics para medir el tráfico de tu sitio.',
        featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        status: 'published' as const,
        featured: false,
        category: 'tutorial' as const,
        tags: ['seo', 'analytics', 'google', 'metricas', 'trafico'],
        author: 'Equipo Quimera',
        content: `# Configurar Google Analytics

## Crear cuenta de Analytics

1. Ve a analytics.google.com
2. Crea una cuenta (si no tienes)
3. Crea una propiedad para tu sitio
4. Selecciona **GA4** (la versión más reciente)
5. Copia el **ID de medición** (G-XXXXXXX)

## Conectar con Quimera

1. Ve a **Configuración > Integraciones**
2. Busca **Google Analytics**
3. Pega tu ID de medición
4. Haz clic en **Guardar**

¡Listo! Los datos empezarán a recopilarse.

## Métricas importantes

### Usuarios
- **Usuarios**: Visitantes únicos
- **Sesiones**: Total de visitas
- **Usuarios nuevos vs recurrentes**

### Comportamiento
- **Páginas por sesión**: Engagement
- **Duración promedio**: Tiempo en sitio
- **Tasa de rebote**: % que sale rápido

### Adquisición
- **Fuentes de tráfico**: De dónde vienen
- **Búsqueda orgánica**: Google
- **Redes sociales**: Facebook, Instagram`
    },
    // SECURITY
    {
        title: 'Seguridad de tu cuenta: Mejores prácticas',
        slug: 'seguridad-cuenta-mejores-practicas',
        excerpt: 'Protege tu cuenta de Quimera con estas recomendaciones de seguridad.',
        featuredImage: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['security', 'seguridad', 'cuenta', 'password', 'proteger'],
        author: 'Equipo Quimera',
        content: `# Seguridad de tu cuenta

## Contraseña segura

### Requisitos mínimos:
- 8+ caracteres
- Mayúsculas y minúsculas
- Números
- Caracteres especiales (!@#$%^&*)

## Cambiar contraseña

1. Ve a **Configuración > Seguridad**
2. Haz clic en **Cambiar contraseña**
3. Ingresa contraseña actual
4. Crea nueva contraseña
5. Confirma

## Autenticación de dos factores (2FA)

### Activar 2FA:
1. Ve a **Seguridad > 2FA**
2. Escanea código QR con Google Authenticator
3. Ingresa código de verificación
4. Guarda códigos de respaldo

### Apps recomendadas:
- Google Authenticator
- Authy
- Microsoft Authenticator

## Sesiones activas

### Ver dispositivos conectados:
1. Ve a **Seguridad > Sesiones**
2. Revisa lista de dispositivos
3. Cierra sesiones sospechosas

## Qué hacer si te hackean

1. Cambia contraseña inmediatamente
2. Activa 2FA si no lo tenías
3. Revisa sesiones activas
4. Verifica cambios en tu cuenta
5. Contacta soporte si es necesario`
    },
    {
        title: 'Política de privacidad y GDPR',
        slug: 'politica-privacidad-gdpr',
        excerpt: 'Información sobre cómo Quimera protege tus datos y cumple con regulaciones.',
        featuredImage: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['security', 'privacy', 'gdpr', 'privacidad', 'datos'],
        author: 'Equipo Quimera',
        content: `# Política de privacidad y GDPR

## Nuestro compromiso

Quimera se compromete a proteger la privacidad de tus datos y los de tus usuarios.

## Datos que recopilamos

### De ti (usuario de Quimera):
- Información de cuenta (nombre, email)
- Datos de facturación
- Contenido que creas
- Registros de uso

### De visitantes de tus sitios:
- Datos de formularios
- Conversaciones de chatbot
- Información de compras
- Analytics (agregados)

## Cómo protegemos los datos

### Seguridad técnica
- Encriptación SSL/TLS
- Servidores seguros (AWS/GCP)
- Backups automáticos
- Monitoreo 24/7

## GDPR y cumplimiento

### Derechos de tus usuarios:
- **Acceso**: Ver sus datos
- **Rectificación**: Corregir errores
- **Eliminación**: Borrar datos
- **Portabilidad**: Exportar datos

### Herramientas disponibles:
1. **Exportar datos**: CRM > Exportar
2. **Eliminar lead**: CRM > Seleccionar > Eliminar
3. **Aviso de cookies**: Configuración > Legal`
    },
    // TROUBLESHOOTING
    {
        title: 'Mi sitio no carga: Soluciones comunes',
        slug: 'sitio-no-carga-soluciones',
        excerpt: 'Pasos para diagnosticar y solucionar problemas cuando tu sitio no funciona.',
        featuredImage: 'https://images.unsplash.com/photo-1525785967371-87ba44b3e6cf?w=800',
        status: 'published' as const,
        featured: true,
        category: 'help' as const,
        tags: ['troubleshooting', 'error', 'problema', 'no-carga', 'ayuda'],
        author: 'Equipo Quimera',
        content: `# Mi sitio no carga

## Diagnóstico rápido

### 1. ¿Es tu conexión?
- Prueba otros sitios
- Reinicia tu router
- Prueba desde móvil

### 2. ¿Es tu navegador?
- Limpia cache (Ctrl+Shift+Delete)
- Prueba en modo incógnito
- Prueba otro navegador

### 3. ¿Es tu dominio?
- Prueba con subdominio de Quimera
- Verifica DNS en whatsmydns.net
- Revisa configuración de dominio

## Problemas comunes

### Error 404 (Página no encontrada)
- La página fue eliminada
- URL incorrecta
- Problema de rutas

### Error 500 (Error del servidor)
- Problema temporal
- Bug en la configuración
- Solución: Espera unos minutos y recarga

### Página en blanco
- JavaScript no cargó
- Error de código personalizado
- Solución: Revisa consola del navegador (F12)

### Certificado SSL inválido
- Dominio recién conectado
- Solución: Espera 24-48h después de conectar dominio

## Verificar estado del servicio

1. Ve a status.quimera.ai
2. Revisa si hay incidentes activos
3. Suscríbete a notificaciones`
    },
    {
        title: 'Problemas con el editor: Guía de soluciones',
        slug: 'problemas-editor-soluciones',
        excerpt: 'Soluciona los problemas más comunes al usar el editor visual.',
        featuredImage: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['troubleshooting', 'editor', 'bug', 'problema', 'error'],
        author: 'Equipo Quimera',
        content: `# Problemas con el editor

## El editor no carga

### Causas comunes:
1. Navegador desactualizado
2. Extensiones que interfieren
3. Cache corrupto

### Soluciones:
1. Actualiza tu navegador (Chrome recomendado)
2. Desactiva extensiones (ad-blockers)
3. Limpia cache completamente
4. Prueba en modo incógnito

## No puedo guardar cambios

### Verifica:
- ¿Tienes conexión a internet?
- ¿Sesión activa? (recarga la página)
- ¿Permisos de proyecto?

### Solución:
1. Recarga la página
2. Inicia sesión nuevamente
3. Intenta guardar de nuevo

## Cambios no se reflejan en el sitio

### Después de guardar:
- Espera 1-2 minutos
- Recarga con Ctrl+F5
- Limpia cache del navegador

## Imágenes no suben

### Verifica:
- Formato: JPG, PNG, WebP, GIF
- Tamaño: Máximo 10MB
- Conexión estable

### Solución:
1. Comprime la imagen
2. Cambia el formato
3. Prueba con otra imagen`
    },
    {
        title: 'Recuperar contenido eliminado',
        slug: 'recuperar-contenido-eliminado',
        excerpt: 'Cómo restaurar páginas, artículos o configuraciones eliminadas por error.',
        featuredImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
        status: 'published' as const,
        featured: false,
        category: 'help' as const,
        tags: ['troubleshooting', 'recover', 'backup', 'recuperar', 'eliminar'],
        author: 'Equipo Quimera',
        content: `# Recuperar contenido eliminado

## Papelera de reciclaje

Contenido eliminado va a la papelera por 30 días.

### Acceder:
1. Ve a **Configuración > Papelera**
2. Busca el elemento eliminado
3. Haz clic en **Restaurar**

### Elementos recuperables:
- Páginas
- Artículos
- Productos
- Leads (solo admin)

## Historial de versiones

### Para páginas:
1. Abre la página en el editor
2. Haz clic en **Historial**
3. Selecciona versión anterior
4. Haz clic en **Restaurar**

### Versiones guardadas:
- Últimas 10 versiones
- Guardado automático cada 5 minutos
- Guardado manual al publicar

## Backups completos

### Backup manual:
1. Ve a **Configuración > Backups**
2. Haz clic en **Crear backup**
3. Espera a que se genere
4. Descarga si lo deseas

## Prevenir pérdidas

1. **Guarda frecuentemente**: Ctrl+S
2. **No elimines sin verificar**
3. **Crea backups antes de cambios grandes**`
    },
    // TEAM
    {
        title: 'Agregar miembros a tu equipo',
        slug: 'agregar-miembros-equipo',
        excerpt: 'Aprende a invitar colaboradores y gestionar permisos de tu equipo.',
        featuredImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
        status: 'published' as const,
        featured: true,
        category: 'tutorial' as const,
        tags: ['team', 'equipo', 'colaboradores', 'permisos', 'invitar'],
        author: 'Equipo Quimera',
        content: `# Agregar miembros a tu equipo

## Requisitos
- Plan Pro o superior
- Ser propietario o admin de la cuenta

## Invitar colaboradores

1. Ve a **Configuración > Equipo**
2. Haz clic en **+ Invitar miembro**
3. Ingresa email del colaborador
4. Selecciona rol
5. Haz clic en **Enviar invitación**

El colaborador recibirá un email para unirse.

## Roles disponibles

### 👑 Propietario
- Control total
- Facturación
- Eliminar cuenta
- Solo puede haber uno

### 🛡️ Administrador
- Gestionar equipo
- Todos los proyectos
- Configuración general
- Sin acceso a facturación

### ✏️ Editor
- Crear y editar contenido
- Proyectos asignados
- Sin configuración global

### 👀 Visualizador
- Solo ver contenido
- Sin capacidad de edición
- Ideal para clientes

## Límites por plan

| Plan | Miembros |
|------|----------|
| Free | 1 |
| Starter | 2 |
| Pro | 5 |
| Business | Ilimitados |`
    },
    {
        title: 'Roles y permisos explicados',
        slug: 'roles-permisos-explicados',
        excerpt: 'Guía detallada de cada rol y sus permisos en Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',
        status: 'published' as const,
        featured: false,
        category: 'guide' as const,
        tags: ['team', 'roles', 'permisos', 'acceso', 'equipo'],
        author: 'Equipo Quimera',
        content: `# Roles y permisos

## Matriz de permisos

| Acción | Propietario | Admin | Editor | Viewer |
|--------|:-----------:|:-----:|:------:|:------:|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Editar páginas | ✅ | ✅ | ✅ | ❌ |
| Publicar | ✅ | ✅ | ✅* | ❌ |
| Crear proyectos | ✅ | ✅ | ❌ | ❌ |
| Eliminar proyectos | ✅ | ✅ | ❌ | ❌ |
| Gestionar equipo | ✅ | ✅ | ❌ | ❌ |
| Configuración global | ✅ | ✅ | ❌ | ❌ |
| Ver facturación | ✅ | ❌ | ❌ | ❌ |
| Cambiar plan | ✅ | ❌ | ❌ | ❌ |

*Editor puede publicar solo en proyectos asignados

## Propietario

El propietario es quien creó la cuenta.

### Responsabilidades:
- Facturación y pagos
- Decisiones finales
- Transferir propiedad

## Administrador

Ideal para gerentes o socios.

### Puede:
- Gestionar todo excepto facturación
- Invitar/eliminar miembros
- Crear/eliminar proyectos
- Configurar integraciones

## Editor

Para diseñadores y creadores de contenido.

### Puede:
- Editar páginas asignadas
- Crear contenido
- Gestionar leads (si permitido)
- Ver analytics

## Visualizador

Para clientes o stakeholders.

### Puede:
- Ver contenido
- Ver reportes
- Dejar comentarios`
    },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

export async function seedHelpArticles(): Promise<{ success: boolean; count: number; message: string }> {
    console.log('🚀 Iniciando seed de artículos del Help Center...');
    
    try {
        const collectionPath = 'appContent/data/articles';
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        
        let count = 0;
        
        for (const article of HELP_ARTICLES) {
            const articleId = `help_${article.slug.replace(/-/g, '_')}_${Date.now() + count}`;
            const docRef = doc(db, collectionPath, articleId);
            
            // Calculate read time
            const wordCount = article.content.split(/\s+/).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));
            
            const fullArticle = {
                ...article,
                id: articleId,
                readTime,
                views: Math.floor(Math.random() * 100) + 10,
                createdAt: now,
                updatedAt: now,
                publishedAt: now,
            };
            
            batch.set(docRef, fullArticle);
            count++;
            console.log(`  ✅ Preparado: ${article.title}`);
        }
        
        await batch.commit();
        console.log(`\n✨ ¡Seed completado! ${count} artículos creados.`);
        
        return { success: true, count, message: `✅ ${count} artículos creados exitosamente` };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, count: 0, message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

// =============================================================================
// DELETE FUNCTION
// =============================================================================

export async function deleteHelpArticles(): Promise<{ success: boolean; count: number; message: string }> {
    console.log('🗑️ Eliminando artículos del Help Center...');
    
    try {
        const collectionPath = 'appContent/data/articles';
        const q = query(
            collection(db, collectionPath),
            where('category', 'in', ['help', 'guide', 'tutorial'])
        );
        const snapshot = await getDocs(q);
        
        for (const docSnapshot of snapshot.docs) {
            await deleteDoc(docSnapshot.ref);
        }
        
        console.log(`  ✅ ${snapshot.size} artículos eliminados.`);
        return { success: true, count: snapshot.size, message: `🗑️ ${snapshot.size} artículos eliminados` };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, count: 0, message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}

// =============================================================================
// CHECK FUNCTION
// =============================================================================

export async function checkHelpArticles(): Promise<number> {
    const collectionPath = 'appContent/data/articles';
    const q = query(
        collection(db, collectionPath),
        where('category', 'in', ['help', 'guide', 'tutorial'])
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

// =============================================================================
// EXPOSE TO WINDOW FOR CONSOLE ACCESS
// =============================================================================

if (typeof window !== 'undefined') {
    // @ts-expect-error - Adding to window for console access
    window.seedHelpArticles = seedHelpArticles;
    // @ts-expect-error - Adding to window for console access
    window.deleteHelpArticles = deleteHelpArticles;
    // @ts-expect-error - Adding to window for console access
    window.checkHelpArticles = checkHelpArticles;
    
    console.log('📚 Help Center Articles utilities loaded!');
    console.log('   Available commands:');
    console.log('   - await window.seedHelpArticles()  // Create articles');
    console.log('   - await window.deleteHelpArticles() // Delete all');
    console.log('   - await window.checkHelpArticles()  // Count existing');
}

export default seedHelpArticles;




