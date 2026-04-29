/**
 * Seed Help Center Articles Script
 * Script para poblar el Help Center con artículos de ayuda detallados
 * 
 * Ejecutar: npx ts-node scripts/seedHelpCenterArticles.ts
 * O importar y llamar seedHelpCenterArticles() desde la consola del navegador
 */

import {
    collection,
    doc,
    setDoc,
    writeBatch,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../firebase';

// =============================================================================
// TYPES
// =============================================================================

interface HelpArticle {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featuredImage: string;
    status: 'published' | 'draft';
    featured: boolean;
    category: 'help' | 'guide' | 'tutorial';
    tags: string[];
    author: string;
    authorImage?: string;
    readTime?: number;
    views?: number;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

// =============================================================================
// HELP CENTER ARTICLES DATA
// =============================================================================

const HELP_ARTICLES: Omit<HelpArticle, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'readTime' | 'views'>[] = [
    // =========================================================================
    // GETTING STARTED (Primeros Pasos)
    // =========================================================================
    {
        title: 'Cómo crear tu primer sitio web con Quimera AI',
        slug: 'como-crear-primer-sitio-web',
        excerpt: 'Guía paso a paso para crear tu primer sitio web profesional usando el poder de la inteligencia artificial de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['getting-started', 'primeros-pasos', 'inicio', 'crear', 'website'],
        author: 'Equipo Quimera',
        content: `
# Cómo crear tu primer sitio web con Quimera AI

Bienvenido a Quimera AI. En esta guía te mostraremos cómo crear tu primer sitio web profesional en cuestión de minutos.

## Paso 1: Registrarse en Quimera AI

1. Ve a [quimera.ai](https://quimera.ai) y haz clic en "Comenzar Gratis"
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

¿Tienes preguntas? Nuestro equipo de soporte está disponible para ayudarte.
        `
    },
    {
        title: 'Guía de inicio rápido: Tu primer sitio en 5 minutos',
        slug: 'guia-inicio-rapido',
        excerpt: 'Aprende a crear un sitio web completo en solo 5 minutos con nuestra guía de inicio rápido.',
        featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        status: 'published',
        featured: true,
        category: 'guide',
        tags: ['getting-started', 'inicio', 'rapido', 'onboarding', 'start'],
        author: 'Equipo Quimera',
        content: `
# Guía de inicio rápido

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
4. Agrega formularios de contacto
        `
    },
    {
        title: 'Entendiendo el dashboard de Quimera AI',
        slug: 'entendiendo-dashboard',
        excerpt: 'Conoce todas las funciones disponibles en tu panel de control y cómo aprovecharlas al máximo.',
        featuredImage: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['getting-started', 'dashboard', 'panel', 'inicio'],
        author: 'Equipo Quimera',
        content: `
# Entendiendo el Dashboard de Quimera AI

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
- Suscripción y facturación
        `
    },

    // =========================================================================
    // WEBSITE BUILDER (Constructor de Sitios)
    // =========================================================================
    {
        title: 'Cómo usar el editor visual de Quimera',
        slug: 'como-usar-editor-visual',
        excerpt: 'Domina el editor visual drag-and-drop para crear diseños profesionales sin código.',
        featuredImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['editor', 'builder', 'diseño', 'design', 'visual', 'website'],
        author: 'Equipo Quimera',
        content: `
# Cómo usar el editor visual de Quimera

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
- Usa el **Asistente IA** para generar contenido
        `
    },
    {
        title: 'Componentes disponibles y cómo usarlos',
        slug: 'componentes-disponibles',
        excerpt: 'Guía completa de todos los componentes del editor y sus mejores usos.',
        featuredImage: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['editor', 'components', 'builder', 'diseño', 'componentes'],
        author: 'Equipo Quimera',
        content: `
# Componentes disponibles

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
- Scoring de leads
        `
    },
    {
        title: 'Personalizar colores y tipografía',
        slug: 'personalizar-colores-tipografia',
        excerpt: 'Aprende a crear una identidad visual consistente con colores y fuentes personalizadas.',
        featuredImage: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
        status: 'published',
        featured: false,
        category: 'tutorial',
        tags: ['editor', 'design', 'colores', 'tipografia', 'branding', 'diseño'],
        author: 'Equipo Quimera',
        content: `
# Personalizar colores y tipografía

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
- El espacio en blanco es tu amigo
        `
    },

    // =========================================================================
    // AI ASSISTANT (Asistente de IA)
    // =========================================================================
    {
        title: 'Configurar tu chatbot de IA paso a paso',
        slug: 'configurar-chatbot-ia',
        excerpt: 'Guía completa para configurar y entrenar tu asistente virtual inteligente.',
        featuredImage: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['ai', 'chatbot', 'assistant', 'ia', 'bot', 'asistente'],
        author: 'Equipo Quimera',
        content: `
# Configurar tu chatbot de IA

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
- Leads capturados
        `
    },
    {
        title: 'Entrenar tu chatbot con información personalizada',
        slug: 'entrenar-chatbot',
        excerpt: 'Aprende a mejorar las respuestas de tu chatbot con información específica de tu negocio.',
        featuredImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['ai', 'chatbot', 'entrenar', 'training', 'ia', 'inteligencia'],
        author: 'Equipo Quimera',
        content: `
# Entrenar tu chatbot

## ¿Por qué entrenar?

Un chatbot bien entrenado:
- Responde con precisión
- Usa el tono de tu marca
- Conoce tus productos/servicios
- Genera más conversiones

## Métodos de entrenamiento

### 1. Texto directo
Escribe información directamente:

\`\`\`
Somos una agencia de marketing digital con 10 años de experiencia.
Ofrecemos servicios de:
- Diseño web
- SEO y SEM
- Redes sociales
- Email marketing

Nuestros horarios son de lunes a viernes, 9am a 6pm.
\`\`\`

### 2. Preguntas y respuestas
Formato Q&A:

\`\`\`
P: ¿Cuánto cuesta el servicio de diseño web?
R: Nuestros precios de diseño web comienzan desde $999 USD. 
   El costo final depende de las funcionalidades requeridas.
   ¿Te gustaría agendar una llamada para cotizar tu proyecto?
\`\`\`

### 3. Documentos
Sube archivos:
- Catálogos de productos (PDF)
- Manuales de servicio
- Políticas de la empresa
- FAQs existentes

### 4. URLs
Importa contenido de:
- Tu sitio web actual
- Blog posts
- Páginas de productos

## Mejores prácticas

1. **Sé específico**: Incluye detalles importantes
2. **Usa ejemplos**: Muestra cómo responder
3. **Actualiza regularmente**: Mantén info al día
4. **Revisa conversaciones**: Identifica gaps

## Verificar entrenamiento

1. Ve a **Probar chatbot**
2. Haz preguntas de prueba
3. Verifica respuestas
4. Ajusta según sea necesario
        `
    },
    {
        title: 'Créditos de IA: Qué son y cómo funcionan',
        slug: 'creditos-ia-como-funcionan',
        excerpt: 'Entiende el sistema de créditos de IA y cómo optimizar su uso.',
        featuredImage: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['ai', 'creditos', 'ia', 'billing', 'uso'],
        author: 'Equipo Quimera',
        content: `
# Créditos de IA

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
4. **Batch de traducciones**: Traduce todo junto

## ¿Qué pasa si me quedo sin créditos?

- Las funciones de IA se pausan
- Tu sitio sigue funcionando normal
- El chatbot responde con limitaciones
- Puedes comprar créditos adicionales o esperar al siguiente mes
        `
    },

    // =========================================================================
    // DOMAINS (Dominios)
    // =========================================================================
    {
        title: 'Cómo conectar tu dominio personalizado',
        slug: 'conectar-dominio-personalizado',
        excerpt: 'Guía paso a paso para conectar tu propio dominio a tu sitio de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['domains', 'dominios', 'dns', 'custom-domain', 'dominio'],
        author: 'Equipo Quimera',
        content: `
# Conectar tu dominio personalizado

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

## Paso 3: Configurar en tu proveedor

### GoDaddy
1. Ve a DNS Management
2. Agrega registro CNAME
3. Guarda cambios

### Namecheap
1. Domain List > Manage
2. Advanced DNS
3. Add New Record

### Google Domains
1. DNS > Custom records
2. Manage custom records
3. Create new record

### Cloudflare
1. DNS > Records
2. Add record
3. **Importante**: Desactiva el proxy (nube gris)

## Paso 4: Verificar conexión

1. Regresa a Quimera
2. Haz clic en **Verificar DNS**
3. Espera la propagación (hasta 48 horas)
4. El estado cambiará a "Conectado"

## SSL automático

- Quimera genera certificado SSL gratis
- Se activa automáticamente
- Tu sitio será https://tudominio.com

## Solución de problemas

### "DNS no propagado"
- Espera hasta 48 horas
- Verifica los registros DNS
- Limpia caché del navegador

### "Dominio ya en uso"
- Contacta soporte
- Verifica que no esté en otro proyecto
        `
    },
    {
        title: 'Configurar DNS correctamente',
        slug: 'configurar-dns-correctamente',
        excerpt: 'Aprende los conceptos básicos de DNS y cómo configurarlo para tu dominio.',
        featuredImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['domains', 'dns', 'dominios', 'configuracion'],
        author: 'Equipo Quimera',
        content: `
# Configurar DNS correctamente

## ¿Qué es DNS?

DNS (Domain Name System) traduce nombres de dominio a direcciones IP.

\`\`\`
tudominio.com → 123.45.67.89
\`\`\`

## Tipos de registros

### Registro A
- Apunta dominio a IP
- Usado para dominio raíz (@)
\`\`\`
@ → 123.45.67.89
\`\`\`

### Registro CNAME
- Apunta subdominio a otro dominio
- Usado para www
\`\`\`
www → sites.quimera.ai
\`\`\`

### Registro TXT
- Texto para verificación
- Usado para email, SSL, etc.

## Configuración recomendada

Para conectar \`tudominio.com\`:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | [IP de Quimera] |
| CNAME | www | sites.quimera.ai |

## Redirección www

Para que www.tudominio.com funcione:
1. Agrega registro CNAME para www
2. Quimera redirige automáticamente

## Tiempo de propagación

- Cambios toman 1-48 horas
- Depende del TTL configurado
- Algunos proveedores son más rápidos

## Verificar propagación

Usa herramientas como:
- whatsmydns.net
- dnschecker.org
- dig comando en terminal

## Errores comunes

### Proxy de Cloudflare
- Desactiva el proxy (nube naranja → gris)
- O usa configuración específica

### TTL muy alto
- Baja el TTL a 300-3600
- Permite cambios más rápidos
        `
    },

    // =========================================================================
    // BILLING (Facturación)
    // =========================================================================
    {
        title: 'Planes y precios de Quimera AI',
        slug: 'planes-precios',
        excerpt: 'Conoce todos los planes disponibles y elige el mejor para tu negocio.',
        featuredImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
        status: 'published',
        featured: true,
        category: 'help',
        tags: ['billing', 'pricing', 'planes', 'precios', 'suscripción', 'plan'],
        author: 'Equipo Quimera',
        content: `
# Planes y precios

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
Garantía de 14 días en planes de pago.
        `
    },
    {
        title: 'Cómo gestionar tu suscripción',
        slug: 'gestionar-suscripcion',
        excerpt: 'Aprende a cambiar de plan, actualizar método de pago y cancelar suscripción.',
        featuredImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['billing', 'subscription', 'suscripción', 'pago', 'facturación'],
        author: 'Equipo Quimera',
        content: `
# Gestionar tu suscripción

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

## Descargar facturas

1. Ve a **Historial de pagos**
2. Haz clic en el ícono de descarga
3. PDF listo para contabilidad

## Cancelar suscripción

1. Ve a **Suscripción**
2. Haz clic en **Cancelar suscripción**
3. Indica el motivo (opcional)
4. Confirma cancelación

### Después de cancelar:
- Acceso hasta fin del período pagado
- Sitios pasan a borrador
- Datos se mantienen 30 días
- Puedes reactivar en cualquier momento
        `
    },
    {
        title: 'Solucionar problemas de pago',
        slug: 'problemas-pago',
        excerpt: 'Soluciones a los problemas más comunes con pagos y facturación.',
        featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['billing', 'payment', 'pago', 'error', 'facturación'],
        author: 'Equipo Quimera',
        content: `
# Solucionar problemas de pago

## Pago rechazado

### Causas comunes:
1. **Fondos insuficientes**
   - Verifica saldo disponible
   - Intenta con otra tarjeta

2. **Tarjeta vencida**
   - Actualiza datos de tarjeta
   - Verifica fecha de expiración

3. **Límite de compras online**
   - Contacta a tu banco
   - Autoriza compras internacionales

4. **Código de seguridad incorrecto**
   - Verifica CVV (3-4 dígitos)
   - Reingresa los datos

### Solución:
1. Ve a **Métodos de pago**
2. Actualiza o agrega nueva tarjeta
3. Intenta el pago nuevamente

## Cargo duplicado

Si ves un cargo duplicado:
1. Espera 24-48 horas (puede ser autorización)
2. Si persiste, contacta soporte
3. Proporciona: fecha, monto, últimos 4 dígitos

## Factura incorrecta

Para correcciones:
1. Ve a **Historial de pagos**
2. Selecciona la factura
3. Haz clic en **Solicitar corrección**
4. Indica los datos correctos

## Reembolsos

### Política:
- 14 días de garantía
- Reembolso completo si no estás satisfecho
- Proceso en 5-10 días hábiles

### Solicitar reembolso:
1. Contacta soporte
2. Indica número de orden
3. Motivo del reembolso
        `
    },

    // =========================================================================
    // E-COMMERCE (Tienda Online)
    // =========================================================================
    {
        title: 'Crear tu tienda online desde cero',
        slug: 'crear-tienda-online',
        excerpt: 'Guía completa para configurar tu tienda de e-commerce en Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['ecommerce', 'tienda', 'store', 'productos', 'ventas'],
        author: 'Equipo Quimera',
        content: `
# Crear tu tienda online

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

## Paso 5: Personalizar storefront

1. Diseña la página de tienda
2. Configura filtros
3. Personaliza página de producto
4. Configura checkout

## Lanzar tu tienda

1. Revisa toda la configuración
2. Haz pedido de prueba
3. Activa métodos de pago
4. ¡Publica!
        `
    },
    {
        title: 'Gestionar productos e inventario',
        slug: 'gestionar-productos-inventario',
        excerpt: 'Aprende a administrar tu catálogo de productos y controlar el inventario.',
        featuredImage: 'https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['ecommerce', 'products', 'inventario', 'productos', 'stock'],
        author: 'Equipo Quimera',
        content: `
# Gestionar productos e inventario

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

### Actualizar inventario
- Manual: Edita cantidad
- Automático: Se descuenta con ventas
- Importación masiva: CSV

## Importar/Exportar

### Importar productos
1. Descarga plantilla CSV
2. Completa con tus productos
3. Sube el archivo
4. Revisa y confirma

### Exportar catálogo
1. Ve a Productos
2. Haz clic en Exportar
3. Selecciona formato (CSV, Excel)

## Organización

### Categorías
- Estructura jerárquica
- Facilita navegación
- SEO friendly

### Tags
- Búsqueda interna
- Filtros avanzados
- Colecciones automáticas

### Colecciones
- "Nuevos Ingresos"
- "En Oferta"
- "Los Más Vendidos"
- Manuales o automáticas
        `
    },
    {
        title: 'Configurar pagos con Stripe',
        slug: 'configurar-pagos-stripe',
        excerpt: 'Conecta Stripe para recibir pagos de forma segura en tu tienda.',
        featuredImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
        status: 'published',
        featured: false,
        category: 'tutorial',
        tags: ['ecommerce', 'stripe', 'pagos', 'checkout', 'payment'],
        author: 'Equipo Quimera',
        content: `
# Configurar pagos con Stripe

## ¿Por qué Stripe?

- Aceptado mundialmente
- Seguro y confiable
- Sin cuotas mensuales
- Comisión por transacción

## Paso 1: Crear cuenta Stripe

1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta
3. Verifica tu identidad
4. Agrega cuenta bancaria

## Paso 2: Conectar con Quimera

1. Ve a **E-commerce > Pagos**
2. Haz clic en **Conectar Stripe**
3. Autoriza la conexión
4. ¡Listo!

## Paso 3: Configurar métodos

### Tarjetas aceptadas
- Visa
- Mastercard
- American Express
- Discover

### Otros métodos
- Apple Pay
- Google Pay
- OXXO (México)
- Transferencia bancaria

## Comisiones

| Método | Comisión |
|--------|----------|
| Tarjeta nacional | 2.9% + $3 MXN |
| Tarjeta internacional | 4.5% + $3 MXN |
| OXXO | 3% + $10 MXN |

## Pagos de prueba

Antes de lanzar:
1. Activa modo de prueba
2. Usa tarjetas de prueba:
   - 4242 4242 4242 4242 (éxito)
   - 4000 0000 0000 9995 (rechazada)
3. Haz pedido de prueba
4. Verifica flujo completo

## Recibir fondos

- Pagos se depositan automáticamente
- Tiempo: 2-7 días hábiles
- Ver detalles en dashboard Stripe
        `
    },

    // =========================================================================
    // LEADS & CRM
    // =========================================================================
    {
        title: 'Capturar leads con formularios inteligentes',
        slug: 'capturar-leads-formularios',
        excerpt: 'Aprende a crear formularios efectivos que conviertan visitantes en leads.',
        featuredImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['leads', 'crm', 'forms', 'formularios', 'contactos'],
        author: 'Equipo Quimera',
        content: `
# Capturar leads con formularios

## Tipos de formularios

### Contacto simple
- Nombre
- Email
- Mensaje
- Ideal para consultas generales

### Lead magnet
- Email
- Nombre
- A cambio de: ebook, descuento, etc.
- Alta conversión

### Cotización
- Datos de contacto
- Detalles del proyecto
- Presupuesto estimado
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

- Texto corto
- Texto largo
- Email
- Teléfono
- Selector
- Checkbox
- Fecha
- Archivo

## Configurar notificaciones

### Email al equipo
- Recibe email por cada lead
- Personaliza asunto y contenido
- Múltiples destinatarios

### Email al lead
- Confirmación automática
- Mensaje de bienvenida
- Siguiente paso

## Integraciones

Conecta con:
- Mailchimp
- HubSpot
- Zapier
- Google Sheets

## Mejores prácticas

1. **Menos campos = más conversiones**
2. **CTA claro**: "Obtener cotización gratis"
3. **Prueba social**: "500+ clientes confían"
4. **Urgencia**: "Oferta válida hoy"
        `
    },
    {
        title: 'Usar el CRM de Quimera',
        slug: 'usar-crm-quimera',
        excerpt: 'Gestiona tus contactos y oportunidades de venta con el CRM integrado.',
        featuredImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['leads', 'crm', 'contacts', 'ventas', 'contactos'],
        author: 'Equipo Quimera',
        content: `
# Usar el CRM de Quimera

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

### Asignar a equipo
- Distribuye entre vendedores
- Notificación automática

## Filtros y búsqueda

Encuentra leads por:
- Estado
- Fecha de creación
- Fuente
- Etiquetas
- Búsqueda de texto

## Exportar datos

1. Aplica filtros deseados
2. Haz clic en **Exportar**
3. Selecciona formato (CSV, Excel)
4. Descarga archivo

## Automatizaciones

- Email automático al nuevo lead
- Recordatorio de seguimiento
- Notificación si no hay acción
        `
    },

    // =========================================================================
    // INTEGRATIONS (Integraciones)
    // =========================================================================
    {
        title: 'Conectar WhatsApp Business a tu chatbot',
        slug: 'conectar-whatsapp-chatbot',
        excerpt: 'Integra WhatsApp para atender clientes directamente desde la app de mensajería.',
        featuredImage: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['integrations', 'whatsapp', 'meta', 'chatbot', 'conectar'],
        author: 'Equipo Quimera',
        content: `
# Conectar WhatsApp Business

## Requisitos

- Cuenta de WhatsApp Business
- Número de teléfono verificado
- Cuenta de Meta Business
- Plan Pro o superior

## Paso 1: Configurar Meta Business

1. Ve a [business.facebook.com](https://business.facebook.com)
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
\`\`\`
¡Hola! 👋 Gracias por contactarnos.
Soy el asistente virtual de [Tu empresa].
¿En qué puedo ayudarte?

1. Información de productos
2. Hacer un pedido
3. Seguimiento de pedido
4. Hablar con un humano
\`\`\`

### Respuestas automáticas
- Horarios de atención
- Catálogo de productos
- Preguntas frecuentes
- Redirección a agente

## Paso 4: Probar integración

1. Envía mensaje de prueba
2. Verifica respuesta del bot
3. Prueba diferentes escenarios
4. Ajusta según necesario

## Funciones disponibles

- Respuestas automáticas 24/7
- Catálogo de productos
- Botones interactivos
- Plantillas de mensajes
- Transferencia a humano
- Historial de conversaciones

## Métricas

- Mensajes recibidos/enviados
- Tiempo de respuesta
- Conversaciones resueltas
- Leads generados
        `
    },
    {
        title: 'Integrar Facebook Messenger',
        slug: 'integrar-facebook-messenger',
        excerpt: 'Conecta tu página de Facebook para atender clientes por Messenger.',
        featuredImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
        status: 'published',
        featured: false,
        category: 'tutorial',
        tags: ['integrations', 'facebook', 'messenger', 'meta', 'conectar'],
        author: 'Equipo Quimera',
        content: `
# Integrar Facebook Messenger

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
Se muestra antes del primer mensaje:
\`\`\`
Hola {{user_name}}! 👋
Bienvenido a [Tu empresa].
Escríbenos y te responderemos pronto.
\`\`\`

### Respuesta automática
Cuando el equipo no está disponible:
\`\`\`
Gracias por tu mensaje.
Nuestro horario es L-V 9am-6pm.
Te responderemos lo antes posible.
\`\`\`

## Chatbot en Messenger

El mismo chatbot de tu sitio puede:
- Responder preguntas frecuentes
- Mostrar productos
- Capturar datos de contacto
- Agendar citas
- Transferir a humano

## Funciones de Messenger

- Respuestas rápidas (botones)
- Carruseles de productos
- Plantillas de mensajes
- Etiquetas de mensajes
- Bandeja unificada

## Sincronización

- Conversaciones se guardan en CRM
- Leads automáticos
- Historial completo
- Continuidad web ↔ Messenger
        `
    },
    {
        title: 'Conectar con Zapier para automatizaciones',
        slug: 'conectar-zapier-automatizaciones',
        excerpt: 'Automatiza tareas conectando Quimera con miles de aplicaciones.',
        featuredImage: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['integrations', 'zapier', 'automation', 'api', 'integraciones'],
        author: 'Equipo Quimera',
        content: `
# Conectar con Zapier

## ¿Qué es Zapier?

Zapier conecta aplicaciones para automatizar tareas sin código.

Ejemplo:
**Nuevo lead en Quimera** → **Agregar a Google Sheets** + **Enviar email** + **Crear tarea en Trello**

## Configurar conexión

1. Crea cuenta en [zapier.com](https://zapier.com)
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

## Acciones disponibles

Lo que Quimera puede hacer:
- Crear lead
- Actualizar lead
- Agregar nota
- Enviar email
- Actualizar estado

## Zaps populares

### Lead → Google Sheets
1. Trigger: Nuevo lead
2. Action: Agregar fila a spreadsheet

### Lead → Slack
1. Trigger: Nuevo lead
2. Action: Enviar mensaje al canal

### Orden → Email
1. Trigger: Nueva orden
2. Action: Enviar email personalizado

### Cita → Calendar
1. Trigger: Cita agendada
2. Action: Crear evento en Google Calendar

## Filtros y condiciones

- Solo leads de cierta fuente
- Solo órdenes mayores a X
- Según estado del lead
- Por horario/día

## Solución de problemas

### Zap no funciona
1. Verifica conexión
2. Revisa logs de Zapier
3. Prueba trigger manualmente
4. Contacta soporte
        `
    },

    // =========================================================================
    // APPOINTMENTS (Citas y Reservaciones)
    // =========================================================================
    {
        title: 'Configurar sistema de citas y reservaciones',
        slug: 'configurar-sistema-citas',
        excerpt: 'Aprende a configurar el calendario de citas para que tus clientes agenden automáticamente.',
        featuredImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['appointments', 'citas', 'calendario', 'reservaciones', 'agendar'],
        author: 'Equipo Quimera',
        content: `
# Configurar sistema de citas

El sistema de citas de Quimera permite que tus clientes agenden automáticamente sin necesidad de llamar o escribir.

## Paso 1: Activar módulo de citas

1. Ve a **Citas** en el menú principal
2. Haz clic en **Activar sistema de citas**
3. Selecciona el proyecto donde usarlo

## Paso 2: Configurar disponibilidad

### Horario de atención
1. Define días laborables (ej: Lunes a Viernes)
2. Establece horas de inicio y fin
3. Configura descansos (almuerzo, etc.)

### Ejemplo de configuración:
\`\`\`
Lunes - Viernes: 9:00 AM - 6:00 PM
Descanso: 1:00 PM - 2:00 PM
Sábado: 10:00 AM - 2:00 PM
Domingo: Cerrado
\`\`\`

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
- Recordatorio 1h antes
- Instrucciones de acceso

## Integrar en tu sitio

1. Agrega el componente **Booking** al editor
2. Personaliza colores y estilo
3. Enlaza a una página dedicada
4. Agrega botón en chatbot

## Gestionar citas

### Ver calendario
- Vista diaria, semanal, mensual
- Citas confirmadas, pendientes, canceladas
- Filtros por tipo de servicio

### Acciones
- Confirmar/rechazar citas
- Reagendar
- Cancelar con motivo
- Agregar notas internas
        `
    },
    {
        title: 'Sincronizar citas con Google Calendar',
        slug: 'sincronizar-google-calendar',
        excerpt: 'Mantén tu calendario de Google actualizado automáticamente con las citas de Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['appointments', 'google', 'calendar', 'sincronizar', 'integrar'],
        author: 'Equipo Quimera',
        content: `
# Sincronizar con Google Calendar

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
- Link a videollamada (si aplica)

## Bloquear horarios

Los eventos existentes en Google Calendar:
- Aparecen como "No disponible" en Quimera
- Evitan dobles reservaciones
- Incluye eventos recurrentes

## Múltiples calendarios

Puedes:
- Conectar varios calendarios
- Asignar calendarios a diferentes servicios
- Un calendario por profesional

## Desconectar

1. Ve a **Integraciones**
2. Haz clic en **Desconectar**
3. Los eventos se mantienen en Google
4. Puedes reconectar en cualquier momento
        `
    },
    {
        title: 'Gestionar cancelaciones y reprogramaciones',
        slug: 'gestionar-cancelaciones-citas',
        excerpt: 'Políticas y procedimientos para manejar cancelaciones y cambios de citas.',
        featuredImage: 'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['appointments', 'cancel', 'reschedule', 'cancelar', 'reprogramar'],
        author: 'Equipo Quimera',
        content: `
# Gestionar cancelaciones y reprogramaciones

## Configurar políticas

### Cancelación
- Tiempo mínimo de aviso (ej: 24 horas)
- Penalización por cancelación tardía
- Mensaje automático

### Reprogramación
- Permitir o no cambios
- Límite de reprogramaciones
- Tiempo mínimo de aviso

## Acciones del cliente

### Desde email de confirmación
1. Haz clic en "Modificar cita"
2. Elige nueva fecha/hora
3. Confirma cambio

### Desde el sitio
1. Ingresa email y código
2. Ve detalles de la cita
3. Cancela o reprograma

## Acciones del administrador

### Cancelar cita
1. Ve al calendario
2. Selecciona la cita
3. Haz clic en "Cancelar"
4. Indica motivo (opcional)
5. Notifica al cliente automáticamente

### Reprogramar
1. Arrastra la cita a nuevo horario
2. O usa "Reprogramar" del menú
3. El cliente recibe notificación

## Notificaciones automáticas

### Al cancelar:
\`\`\`
Hola [Nombre],

Tu cita del [fecha] ha sido cancelada.
Motivo: [motivo]

Puedes agendar una nueva cita aquí: [link]

Disculpa los inconvenientes.
\`\`\`

### Al reprogramar:
\`\`\`
Hola [Nombre],

Tu cita ha sido reprogramada:
📅 Nueva fecha: [fecha]
🕐 Nueva hora: [hora]

Si tienes problemas, contáctanos.
\`\`\`

## Reportes

- Tasa de cancelación
- Motivos más comunes
- Horarios con más cancelaciones
- Clientes frecuentes
        `
    },

    // =========================================================================
    // SEO (Optimización para buscadores)
    // =========================================================================
    {
        title: 'Optimizar tu sitio para Google (SEO básico)',
        slug: 'optimizar-seo-basico',
        excerpt: 'Guía esencial para mejorar el posicionamiento de tu sitio en buscadores.',
        featuredImage: 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['seo', 'google', 'search', 'posicionamiento', 'optimización'],
        author: 'Equipo Quimera',
        content: `
# Optimizar tu sitio para Google

## ¿Qué es SEO?

SEO (Search Engine Optimization) es el proceso de mejorar tu sitio para aparecer en los primeros resultados de Google.

## Configuración básica en Quimera

### Título y descripción
1. Ve a **Configuración > SEO**
2. Completa:
   - **Título**: 50-60 caracteres
   - **Descripción**: 150-160 caracteres
   - **Palabras clave**: términos relevantes

### Ejemplo:
\`\`\`
Título: Diseño Web Profesional en México | Mi Empresa
Descripción: Creamos sitios web modernos y funcionales para tu negocio. 10+ años de experiencia. Cotización gratis.
\`\`\`

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
- Ejemplo: "Equipo de diseñadores trabajando en proyecto web"

### Tamaño de archivo
- Comprime imágenes
- Usa formato WebP cuando sea posible
- Quimera optimiza automáticamente

## Contenido de calidad

### Estructura con encabezados
- H1: Solo uno por página (título principal)
- H2: Secciones principales
- H3: Subsecciones

### Textos
- Contenido original
- Mínimo 300 palabras por página
- Responde preguntas de tu audiencia

## Velocidad del sitio

Quimera optimiza automáticamente:
- Compresión de código
- Cache de navegador
- CDN global
- Carga lazy de imágenes

## Móvil primero

- Sitios 100% responsivos
- Google prioriza versión móvil
- Prueba en diferentes dispositivos

## Verificar en Google

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Agrega tu dominio
3. Verifica propiedad
4. Envía sitemap: tudominio.com/sitemap.xml
        `
    },
    {
        title: 'Configurar Google Analytics en tu sitio',
        slug: 'configurar-google-analytics',
        excerpt: 'Aprende a instalar y usar Google Analytics para medir el tráfico de tu sitio.',
        featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        status: 'published',
        featured: false,
        category: 'tutorial',
        tags: ['seo', 'analytics', 'google', 'metricas', 'trafico'],
        author: 'Equipo Quimera',
        content: `
# Configurar Google Analytics

## Crear cuenta de Analytics

1. Ve a [analytics.google.com](https://analytics.google.com)
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
- **Redes sociales**: Facebook, Instagram
- **Directo**: Escriben la URL

## Reportes útiles

### Páginas más visitadas
Descubre qué contenido funciona mejor.

### Dispositivos
Móvil vs Desktop vs Tablet.

### Ubicación
De qué países/ciudades visitan.

### Conversiones
Configura objetivos:
- Envío de formulario
- Clic en botón de WhatsApp
- Compra completada

## Consejos

1. **Revisa semanalmente**: No te obsesiones diariamente
2. **Compara períodos**: Este mes vs anterior
3. **Filtra tu tráfico**: Excluye tu propia IP
4. **Configura alertas**: Notificaciones de anomalías
        `
    },

    // =========================================================================
    // SECURITY (Seguridad)
    // =========================================================================
    {
        title: 'Seguridad de tu cuenta: Mejores prácticas',
        slug: 'seguridad-cuenta-mejores-practicas',
        excerpt: 'Protege tu cuenta de Quimera con estas recomendaciones de seguridad.',
        featuredImage: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800',
        status: 'published',
        featured: true,
        category: 'help',
        tags: ['security', 'seguridad', 'cuenta', 'password', 'proteger'],
        author: 'Equipo Quimera',
        content: `
# Seguridad de tu cuenta

## Contraseña segura

### Requisitos mínimos:
- 8+ caracteres
- Mayúsculas y minúsculas
- Números
- Caracteres especiales (!@#$%^&*)

### Ejemplo seguro:
\`\`\`
MiEmpresa2024!Segura
\`\`\`

### Ejemplo débil:
\`\`\`
password123 ❌
miempresa ❌
\`\`\`

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

## Alertas de seguridad

Recibirás email cuando:
- Nuevo inicio de sesión
- Cambio de contraseña
- Dispositivo nuevo
- Ubicación inusual

## Qué hacer si te hackean

1. Cambia contraseña inmediatamente
2. Activa 2FA si no lo tenías
3. Revisa sesiones activas
4. Verifica cambios en tu cuenta
5. Contacta soporte si es necesario

## Proteger tu equipo

- Mantén tu computadora actualizada
- Usa antivirus
- No uses WiFi público sin VPN
- No guardes contraseñas en navegadores públicos
        `
    },
    {
        title: 'Política de privacidad y GDPR',
        slug: 'politica-privacidad-gdpr',
        excerpt: 'Información sobre cómo Quimera protege tus datos y cumple con regulaciones.',
        featuredImage: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['security', 'privacy', 'gdpr', 'privacidad', 'datos'],
        author: 'Equipo Quimera',
        content: `
# Política de privacidad y GDPR

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

### Acceso limitado
- Solo personal autorizado
- Autenticación obligatoria
- Logs de acceso
- Revisiones periódicas

## GDPR y cumplimiento

### Derechos de tus usuarios:
- **Acceso**: Ver sus datos
- **Rectificación**: Corregir errores
- **Eliminación**: Borrar datos
- **Portabilidad**: Exportar datos

### Herramientas disponibles:
1. **Exportar datos**: CRM > Exportar
2. **Eliminar lead**: CRM > Seleccionar > Eliminar
3. **Aviso de cookies**: Configuración > Legal

## Banner de cookies

Activa el banner de cookies:
1. Ve a **Configuración > Legal**
2. Activa **Banner de cookies**
3. Personaliza mensaje
4. Configura categorías

## Política para tu sitio

Quimera genera automáticamente:
- Política de privacidad
- Términos de servicio
- Política de cookies

Personalízalas en **Configuración > Legal**.
        `
    },

    // =========================================================================
    // TROUBLESHOOTING (Solución de problemas)
    // =========================================================================
    {
        title: 'Mi sitio no carga: Soluciones comunes',
        slug: 'sitio-no-carga-soluciones',
        excerpt: 'Pasos para diagnosticar y solucionar problemas cuando tu sitio no funciona.',
        featuredImage: 'https://images.unsplash.com/photo-1525785967371-87ba44b3e6cf?w=800',
        status: 'published',
        featured: true,
        category: 'help',
        tags: ['troubleshooting', 'error', 'problema', 'no-carga', 'ayuda'],
        author: 'Equipo Quimera',
        content: `
# Mi sitio no carga

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

**Solución**: Verifica la URL y que la página exista.

### Error 500 (Error del servidor)
- Problema temporal
- Bug en la configuración

**Solución**: Espera unos minutos y recarga. Si persiste, contacta soporte.

### Página en blanco
- JavaScript no cargó
- Error de código personalizado

**Solución**: Revisa consola del navegador (F12 > Console).

### Certificado SSL inválido
- Dominio recién conectado
- Configuración DNS incorrecta

**Solución**: Espera 24-48h después de conectar dominio.

## Verificar estado del servicio

1. Ve a [status.quimera.ai](https://status.quimera.ai)
2. Revisa si hay incidentes activos
3. Suscríbete a notificaciones

## Contactar soporte

Si nada funciona:
1. Anota el error exacto
2. Captura pantalla
3. Indica URL afectada
4. Contacta vía chat o email
        `
    },
    {
        title: 'Problemas con el editor: Guía de soluciones',
        slug: 'problemas-editor-soluciones',
        excerpt: 'Soluciona los problemas más comunes al usar el editor visual.',
        featuredImage: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['troubleshooting', 'editor', 'bug', 'problema', 'error'],
        author: 'Equipo Quimera',
        content: `
# Problemas con el editor

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

## Componentes no aparecen

### Posibles causas:
- Carga incompleta
- Error de JavaScript

### Solución:
1. Recarga la página
2. Espera a que cargue completamente
3. Si persiste, limpia cache

## Cambios no se reflejan en el sitio

### Después de guardar:
- Espera 1-2 minutos
- Recarga con Ctrl+F5
- Limpia cache del navegador

### En dominio personalizado:
- Cache de CDN tarda más
- Usa ?v=123 al final de la URL para forzar

## Imágenes no suben

### Verifica:
- Formato: JPG, PNG, WebP, GIF
- Tamaño: Máximo 10MB
- Conexión estable

### Solución:
1. Comprime la imagen
2. Cambia el formato
3. Prueba con otra imagen

## Editor muy lento

### Optimizar:
1. Cierra otras pestañas
2. Usa Chrome o Edge
3. Desactiva extensiones innecesarias
4. Reinicia el navegador

### Requisitos mínimos:
- 4GB RAM
- Procesador moderno
- Conexión estable
        `
    },
    {
        title: 'Recuperar contenido eliminado',
        slug: 'recuperar-contenido-eliminado',
        excerpt: 'Cómo restaurar páginas, artículos o configuraciones eliminadas por error.',
        featuredImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
        status: 'published',
        featured: false,
        category: 'help',
        tags: ['troubleshooting', 'recover', 'backup', 'recuperar', 'eliminar'],
        author: 'Equipo Quimera',
        content: `
# Recuperar contenido eliminado

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

### Restaurar backup:
1. Selecciona el backup
2. Elige qué restaurar:
   - Todo el sitio
   - Solo páginas
   - Solo configuración
3. Confirma

## Contenido irrecuperable

Después de 30 días:
- Se elimina permanentemente
- No hay forma de recuperar
- Contacta soporte en casos especiales

## Prevenir pérdidas

1. **Guarda frecuentemente**: Ctrl+S
2. **No elimines sin verificar**
3. **Crea backups antes de cambios grandes**
4. **Usa el historial** antes de cambios drásticos
        `
    },

    // =========================================================================
    // TEAM & COLLABORATION (Equipo)
    // =========================================================================
    {
        title: 'Agregar miembros a tu equipo',
        slug: 'agregar-miembros-equipo',
        excerpt: 'Aprende a invitar colaboradores y gestionar permisos de tu equipo.',
        featuredImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
        status: 'published',
        featured: true,
        category: 'tutorial',
        tags: ['team', 'equipo', 'colaboradores', 'permisos', 'invitar'],
        author: 'Equipo Quimera',
        content: `
# Agregar miembros a tu equipo

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

## Gestionar permisos

### Por proyecto:
1. Ve al proyecto
2. Configuración > Equipo
3. Asigna miembros específicos
4. Define permisos por proyecto

### Permisos específicos:
- Editar páginas
- Publicar cambios
- Gestionar leads
- Ver analytics
- Configuración

## Eliminar miembro

1. Ve a **Configuración > Equipo**
2. Busca al miembro
3. Haz clic en el ícono de eliminar
4. Confirma

El miembro pierde acceso inmediatamente.

## Límites por plan

| Plan | Miembros |
|------|----------|
| Free | 1 |
| Starter | 2 |
| Pro | 5 |
| Business | Ilimitados |
        `
    },
    {
        title: 'Roles y permisos explicados',
        slug: 'roles-permisos-explicados',
        excerpt: 'Guía detallada de cada rol y sus permisos en Quimera.',
        featuredImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',
        status: 'published',
        featured: false,
        category: 'guide',
        tags: ['team', 'roles', 'permisos', 'acceso', 'equipo'],
        author: 'Equipo Quimera',
        content: `
# Roles y permisos

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
| Eliminar cuenta | ✅ | ❌ | ❌ | ❌ |

*Editor puede publicar solo en proyectos asignados

## Propietario

El propietario es quien creó la cuenta.

### Responsabilidades:
- Facturación y pagos
- Decisiones finales
- Transferir propiedad

### Transferir propiedad:
1. Ve a **Configuración > General**
2. **Transferir cuenta**
3. Selecciona nuevo propietario
4. Confirma con contraseña

## Administrador

Ideal para gerentes o socios.

### Puede:
- Gestionar todo excepto facturación
- Invitar/eliminar miembros
- Crear/eliminar proyectos
- Configurar integraciones

### No puede:
- Ver información de pago
- Cambiar plan
- Eliminar la cuenta

## Editor

Para diseñadores y creadores de contenido.

### Puede:
- Editar páginas asignadas
- Crear contenido
- Gestionar leads (si permitido)
- Ver analytics

### No puede:
- Crear nuevos proyectos
- Invitar miembros
- Configuración global

## Visualizador

Para clientes o stakeholders.

### Puede:
- Ver contenido
- Ver reportes
- Dejar comentarios

### No puede:
- Editar nada
- Configurar nada
        `
    },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

export async function seedHelpCenterArticles(): Promise<void> {
    console.log('🚀 Iniciando seed de artículos del Help Center...');
    
    const collectionPath = 'appContent/data/articles';
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    
    let count = 0;
    
    for (const article of HELP_ARTICLES) {
        const articleId = `help_${article.slug.replace(/-/g, '_')}_${Date.now() + count}`;
        const docRef = doc(db, collectionPath, articleId);
        
        // Calculate read time (approx 200 words per minute)
        const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));
        
        const fullArticle: HelpArticle = {
            ...article,
            id: articleId,
            readTime,
            views: Math.floor(Math.random() * 100) + 10, // Random initial views
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
}

// =============================================================================
// CHECK IF ARTICLES EXIST
// =============================================================================

export async function checkExistingHelpArticles(): Promise<number> {
    const collectionPath = 'appContent/data/articles';
    const q = query(
        collection(db, collectionPath),
        where('category', 'in', ['help', 'guide', 'tutorial'])
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
}

// =============================================================================
// DELETE ALL HELP ARTICLES (for re-seeding)
// =============================================================================

export async function deleteAllHelpArticles(): Promise<void> {
    console.log('🗑️ Eliminando artículos existentes del Help Center...');
    
    const collectionPath = 'appContent/data/articles';
    const q = query(
        collection(db, collectionPath),
        where('category', 'in', ['help', 'guide', 'tutorial'])
    );
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
    console.log(`  ✅ ${snapshot.size} artículos eliminados.`);
}

// =============================================================================
// MAIN (for direct execution)
// =============================================================================

// Para ejecutar desde consola del navegador:
// import { seedHelpCenterArticles } from './scripts/seedHelpCenterArticles';
// await seedHelpCenterArticles();

// Para ejecutar con ts-node:
// npx ts-node scripts/seedHelpCenterArticles.ts

if (typeof window === 'undefined') {
    // Running in Node.js
    seedHelpCenterArticles()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}

