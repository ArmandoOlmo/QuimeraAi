/**
 * SeedHelpArticlesButton Component
 * 
 * Botón de administración para cargar los artículos del Help Center a Firebase.
 * Solo visible para administradores.
 * 
 * Uso: Importar y colocar en cualquier página de admin.
 */

import React, { useState } from 'react';
import {
    collection,
    doc,
    writeBatch,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { db } from '../../firebase';

// Tipos
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

// Artículos del Help Center (versión condensada para el componente)
// La versión completa está en scripts/seedHelpCenterArticles.ts
const HELP_ARTICLES: Omit<HelpArticle, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'readTime' | 'views'>[] = [
    // GETTING STARTED
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
- **Subir imágenes** desde tu computadora

## Paso 4: Publicar tu sitio

Cuando estés satisfecho con el resultado:
1. Haz clic en **"Vista Previa"** para ver cómo se verá
2. Revisa en diferentes dispositivos
3. Haz clic en **"Publicar"** para que tu sitio esté en línea`
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
        content: `# Guía de inicio rápido

## Crea tu sitio web en 5 minutos

### Minuto 1-2: Configuración inicial
- Regístrate con tu email o Google
- Accede a tu dashboard

### Minuto 2-3: Describe tu negocio
- Usa el asistente de IA
- La IA generará una estructura completa

### Minuto 3-4: Personaliza
- Cambia el logo y colores
- Ajusta los textos principales

### Minuto 4-5: Publica
- Revisa la vista previa
- ¡Tu sitio está en línea!`
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
        content: `# Entendiendo el Dashboard

Tu dashboard es el centro de control de todos tus proyectos.

## Secciones principales

- 🏠 **Dashboard**: Vista general con estadísticas
- 🌐 **Mis Sitios Web**: Lista de proyectos
- 📝 **CMS**: Gestor de contenido
- 🤖 **Asistente IA**: Configurar chatbot
- 👥 **Leads**: Contactos capturados
- 📅 **Citas**: Agenda de reservaciones
- 🌍 **Dominios**: Gestionar dominios
- ⚙️ **Configuración**: Perfil y facturación`
    },
    // EDITOR
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
        content: `# Cómo usar el editor visual

El editor visual te permite crear sitios web sin escribir código.

## Interfaz del editor

### Panel izquierdo - Componentes
- Hero, Features, Testimonials
- Pricing, FAQ, Contact, Footer

### Panel derecho - Propiedades
- Contenido: textos e imágenes
- Estilo: colores, fuentes
- Configuración: opciones avanzadas

## Agregar componentes
1. Arrastra desde el panel izquierdo
2. Suelta en la posición deseada
3. Haz clic para editar

## Consejos
- Ctrl+Z para deshacer
- Duplica componentes para consistencia
- Usa el Asistente IA para generar contenido`
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
        content: `# Personalizar colores y tipografía

## Sistema de colores
- **Primario**: Color principal
- **Secundario**: Color de acento
- **Neutral**: Grises y fondos

## Cambiar colores
1. Ve a Configuración > Diseño
2. Selecciona Paleta de colores
3. Usa el selector o código hex

## Tipografía
- Sans-serif: Inter, Poppins
- Serif: Playfair Display
- Display: Montserrat

## Consejos
- Máximo 2-3 colores principales
- Mantén contraste para legibilidad
- El espacio en blanco es tu amigo`
    },
    // AI
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
        content: `# Configurar tu chatbot de IA

El chatbot puede atender visitantes 24/7.

## Paso 1: Activar el chatbot
1. Ve a Asistente IA
2. Haz clic en Activar chatbot
3. Elige un proyecto

## Paso 2: Configuración básica
- Nombre del bot
- Avatar
- Tono (formal, casual)

## Paso 3: Entrenar
- Agrega información de tu negocio
- Preguntas frecuentes
- Políticas

## Paso 4: Integrar
El chatbot aparece automáticamente en tu sitio.`
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
        content: `# Créditos de IA

## ¿Qué son?
Unidades que se consumen al usar funciones de IA.

## Consumo típico
- Generar textos: 1-5 créditos
- Crear sección: 5-10 créditos
- Entrenar chatbot: 10-20 créditos

## Créditos por plan
- Free: 50/mes
- Starter: 500/mes
- Pro: 2,000/mes
- Business: 10,000/mes`
    },
    // DOMAINS
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
        content: `# Conectar tu dominio

## Requisitos
- Plan de pago activo
- Acceso al panel DNS de tu dominio

## Pasos
1. Ve a Dominios en Quimera
2. Agrega tu dominio
3. Configura DNS:
   - CNAME: www → sites.quimera.ai
   - A: @ → [IP proporcionada]
4. Espera propagación (1-48h)

## SSL automático
Quimera genera certificado SSL gratis.`
    },
    // BILLING
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
        content: `# Planes y precios

## Free - $0/mes
- 1 sitio web
- 50 créditos IA/mes
- Subdominio quimera.ai

## Starter - $19/mes
- 3 sitios web
- 500 créditos IA/mes
- 1 dominio personalizado

## Pro - $49/mes
- 10 sitios web
- 2,000 créditos IA/mes
- E-commerce básico

## Business - $149/mes
- Sitios ilimitados
- 10,000 créditos IA/mes
- White-label`
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
        content: `# Gestionar tu suscripción

## Ver suscripción
Ve a Configuración > Suscripción

## Cambiar de plan
- Upgrade: cambio inmediato
- Downgrade: al final del período

## Actualizar pago
1. Métodos de pago
2. Agregar nueva tarjeta
3. Marcar como predeterminada

## Cancelar
1. Suscripción > Cancelar
2. Acceso hasta fin del período`
    },
    // ECOMMERCE
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
        content: `# Crear tu tienda online

## Requisitos
- Plan Pro o superior
- Cuenta de Stripe

## Pasos
1. Activa e-commerce
2. Configura tienda (nombre, moneda)
3. Conecta Stripe
4. Agrega productos
5. Personaliza storefront
6. ¡Publica!

## Productos
- Nombre, descripción, precio
- Imágenes (mínimo 3)
- Variantes (talla, color)
- Inventario`
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
        content: `# Configurar pagos con Stripe

## Crear cuenta Stripe
1. Ve a stripe.com
2. Crea cuenta
3. Verifica identidad
4. Agrega cuenta bancaria

## Conectar con Quimera
1. E-commerce > Pagos
2. Conectar Stripe
3. Autorizar

## Métodos aceptados
- Visa, Mastercard, Amex
- Apple Pay, Google Pay
- OXXO (México)`
    },
    // LEADS
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
        content: `# Capturar leads con formularios

## Tipos de formularios
- Contacto simple
- Lead magnet
- Cotización
- Multi-paso

## Crear formulario
1. Agrega componente Leads
2. Personaliza campos
3. Configura notificaciones

## Campos disponibles
- Texto, Email, Teléfono
- Selector, Checkbox
- Fecha, Archivo

## Mejores prácticas
- Menos campos = más conversiones
- CTA claro
- Prueba social`
    },
    // INTEGRATIONS
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
        content: `# Conectar WhatsApp Business

## Requisitos
- Cuenta de WhatsApp Business
- Cuenta de Meta Business
- Plan Pro o superior

## Pasos
1. Configura Meta Business
2. Ve a Integraciones > WhatsApp
3. Conecta y autoriza
4. Configura chatbot
5. ¡Listo!

## Funciones
- Respuestas automáticas 24/7
- Catálogo de productos
- Transferencia a humano`
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
        content: `# Conectar con Zapier

## ¿Qué es Zapier?
Conecta aplicaciones para automatizar tareas sin código.

## Configurar
1. Crea cuenta en zapier.com
2. En Quimera: copia API Key
3. En Zapier: busca Quimera
4. Pega API Key

## Zaps populares
- Lead → Google Sheets
- Lead → Slack
- Orden → Email
- Cita → Google Calendar`
    },
    // APPOINTMENTS
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
        content: `# Configurar sistema de citas

## Pasos
1. Activa módulo de citas
2. Configura disponibilidad
3. Crea tipos de citas
4. Personaliza formulario
5. Configura notificaciones

## Tipos de citas
- Consulta inicial (30 min) - Gratis
- Asesoría completa (1 hora) - $500
- Seguimiento (15 min) - $200

## Notificaciones
- Confirmación de cita
- Recordatorio 24h antes
- Recordatorio 1h antes`
    },
    // SEO
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
        content: `# Optimizar tu sitio para Google

## Configuración básica
1. Ve a Configuración > SEO
2. Completa:
   - Título (50-60 caracteres)
   - Descripción (150-160 caracteres)
   - Palabras clave

## SEO por página
- Título único
- Descripción única
- URL amigable

## Imágenes
- Texto alternativo (alt)
- Comprime imágenes
- Usa formato WebP

## Verificar en Google
1. Google Search Console
2. Agrega dominio
3. Envía sitemap`
    },
    // SECURITY
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
        content: `# Seguridad de tu cuenta

## Contraseña segura
- 8+ caracteres
- Mayúsculas y minúsculas
- Números y símbolos

## Autenticación 2FA
1. Ve a Seguridad > 2FA
2. Escanea código QR
3. Guarda códigos de respaldo

## Sesiones activas
Revisa dispositivos conectados en Seguridad > Sesiones

## Si te hackean
1. Cambia contraseña
2. Activa 2FA
3. Revisa sesiones
4. Contacta soporte`
    },
    // TROUBLESHOOTING
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
        content: `# Mi sitio no carga

## Diagnóstico rápido
1. ¿Es tu conexión? Prueba otros sitios
2. ¿Es tu navegador? Limpia cache
3. ¿Es tu dominio? Verifica DNS

## Errores comunes
- **404**: Página no existe
- **500**: Error del servidor (espera y recarga)
- **Página en blanco**: Revisa consola (F12)
- **SSL inválido**: Espera 24-48h después de conectar dominio

## Contactar soporte
1. Anota el error exacto
2. Captura pantalla
3. Indica URL afectada`
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
        content: `# Problemas con el editor

## Editor no carga
- Actualiza navegador (Chrome recomendado)
- Desactiva extensiones
- Limpia cache
- Prueba modo incógnito

## No puedo guardar
- Verifica conexión
- Recarga página
- Inicia sesión nuevamente

## Cambios no se reflejan
- Espera 1-2 minutos
- Recarga con Ctrl+F5
- Limpia cache`
    },
    // TEAM
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
        content: `# Agregar miembros a tu equipo

## Requisitos
- Plan Pro o superior
- Ser propietario o admin

## Invitar
1. Configuración > Equipo
2. + Invitar miembro
3. Ingresa email
4. Selecciona rol
5. Enviar invitación

## Roles
- 👑 Propietario: Control total
- 🛡️ Administrador: Todo menos facturación
- ✏️ Editor: Crear y editar contenido
- 👀 Visualizador: Solo ver

## Límites por plan
- Free: 1
- Starter: 2
- Pro: 5
- Business: Ilimitados`
    },
];

export function SeedHelpArticlesButton(): React.ReactElement {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [existingCount, setExistingCount] = useState<number | null>(null);

    const checkExisting = async () => {
        const collectionPath = 'appContent/data/articles';
        const q = query(
            collection(db, collectionPath),
            where('category', 'in', ['help', 'guide', 'tutorial'])
        );
        const snapshot = await getDocs(q);
        setExistingCount(snapshot.size);
        return snapshot.size;
    };

    const seedArticles = async () => {
        setLoading(true);
        setResult(null);

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
            }

            await batch.commit();
            setResult({
                success: true,
                message: `✅ ¡${count} artículos del Help Center creados exitosamente!`
            });
            await checkExisting();
        } catch (error) {
            console.error('Error seeding articles:', error);
            setResult({
                success: false,
                message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteExisting = async () => {
        setLoading(true);
        setResult(null);

        try {
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
            setResult({
                success: true,
                message: `🗑️ ${snapshot.size} artículos eliminados.`
            });
            setExistingCount(0);
        } catch (error) {
            console.error('Error deleting articles:', error);
            setResult({
                success: false,
                message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        checkExisting();
    }, []);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">
                📚 Seed Help Center Articles
            </h3>
            <p className="text-zinc-400 text-sm mb-4">
                Carga los artículos del Help Center a Firebase.
            </p>

            {existingCount !== null && (
                <p className="text-zinc-500 text-sm mb-4">
                    Artículos existentes: <span className="text-yellow-400">{existingCount}</span>
                </p>
            )}

            <div className="flex gap-3">
                <button
                    onClick={seedArticles}
                    disabled={loading}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:bg-zinc-700 text-black font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    {loading ? 'Cargando...' : `Crear ${HELP_ARTICLES.length} Artículos`}
                </button>
                
                {existingCount !== null && existingCount > 0 && (
                    <button
                        onClick={deleteExisting}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        🗑️
                    </button>
                )}
            </div>

            {result && (
                <div className={`mt-4 p-3 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {result.message}
                </div>
            )}
        </div>
    );
}

export default SeedHelpArticlesButton;




