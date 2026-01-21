# QUIMERA.AI - DOCUMENTO BASE OFICIAL

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Estado:** Documento oficial de referencia

---

## 1. INFORMACION GENERAL

**Nombre del Producto:** Quimera.ai

**Tipo:** Plataforma SaaS Multi-Tenant

**Proposito Principal:**  
Quimera.ai es una plataforma todo-en-uno diseñada para crear, administrar y escalar negocios digitales. Integra automatización inteligente, generación de contenido mediante IA, diseño web visual, comercio electrónico, gestión de clientes y asistentes conversacionales en un sistema unificado.

**Audiencia:**
- Emprendedores y pequeños negocios que buscan presencia digital
- Agencias de marketing y desarrollo que gestionan múltiples clientes
- Profesionales no técnicos que necesitan herramientas accesibles
- Equipos técnicos que requieren personalización avanzada

---

## 2. DESCRIPCION GLOBAL

### 2.1 Que es Quimera.ai

Quimera.ai es una plataforma de construcción de negocios digitales potenciada por inteligencia artificial. Permite a usuarios crear sitios web profesionales, gestionar leads, automatizar comunicaciones, vender productos y administrar citas, todo desde una interfaz unificada.

### 2.2 Problema que Resuelve

Los negocios digitales enfrentan fragmentación de herramientas: necesitan un constructor web, un CRM, una plataforma de e-commerce, herramientas de email marketing, chatbots y más. Cada herramienta tiene su propia curva de aprendizaje, costo y ecosistema.

Quimera.ai elimina esta fragmentación ofreciendo:
- Un punto único de acceso para todas las necesidades digitales
- Integración nativa entre módulos (leads capturados automáticamente se sincronizan con CRM)
- IA que reduce la barrera técnica para crear contenido profesional
- Modelo multi-tenant que permite a agencias gestionar clientes desde una sola cuenta

### 2.3 Diferenciadores Clave

| Aspecto | Constructores Tradicionales | CRMs | Plataformas IA | Quimera.ai |
|---------|---------------------------|------|----------------|------------|
| Website Builder | Si | No | No | Si |
| CRM Integrado | No | Si | No | Si |
| Generación IA | No | No | Si | Si |
| E-commerce | Limitado | No | No | Si |
| Chatbots | No | Limitado | Limitado | Si |
| Multi-Tenant | No | Parcial | No | Si |

### 2.4 Vision de Producto

Convertirse en la infraestructura digital completa para negocios de cualquier tamaño, donde la inteligencia artificial actúe como copiloto invisible que simplifica cada tarea, desde la creación hasta la escalabilidad.

---

## 3. ARQUITECTURA GENERAL

### 3.1 Diagrama de Modulos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        QUIMERA.AI PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   WEBSITE   │  │  AI CONTENT │  │  AI IMAGE   │  │   GLOBAL    │    │
│  │   BUILDER   │  │   ENGINE    │  │  GENERATOR  │  │  ASSISTANT  │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐    │
│  │                    CORE INTEGRATION LAYER                       │    │
│  └──────┬────────────────┬────────────────┬────────────────┬──────┘    │
│         │                │                │                │            │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐    │
│  │  CHATBOTS   │  │  LEADS &    │  │APPOINTMENTS │  │  E-COMMERCE │    │
│  │  (Business) │  │    CRM      │  │  /BOOKINGS  │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  DOMAINS &  │  │ USER ROLES  │  │ BILLING &   │  │ ANALYTICS & │    │
│  │  HOSTING    │  │ PERMISSIONS │  │SUBSCRIPTIONS│  │  INSIGHTS   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                     MULTI-TENANT SYSTEM                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Tenant A      │      Tenant B      │      Tenant C (Agency)   │    │
│  │  ┌─────────┐   │   ┌─────────┐      │   ┌─────────┐            │    │
│  │  │ Project │   │   │ Project │      │   │ Sub-    │            │    │
│  │  └─────────┘   │   └─────────┘      │   │ Clients │            │    │
│  │                │                    │   └─────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Descripcion de Modulos

#### Multi-Tenant System
Sistema base que garantiza aislamiento completo de datos entre clientes. Cada tenant (cliente) opera en su propio espacio con:
- Datos completamente separados
- Configuración independiente
- Límites de recursos según plan
- Posibilidad de sub-clientes (para agencias)

#### Website Builder
Motor de construcción visual de sitios web con:
- Editor drag-and-drop
- Sistema de componentes reutilizables
- Templates por industria
- Preview en tiempo real
- Publicación automática

#### AI Content Engine
Motor de generación de contenido textual:
- Textos comerciales
- Artículos de blog
- Copys publicitarios
- Emails de marketing
- Descripciones de productos
- Contenido SEO-optimizado

#### AI Image Generator
Generación de imágenes mediante IA:
- Imágenes para web
- Banners promocionales
- Assets de redes sociales
- Elementos de branding

#### Global Assistant
Asistente central del sistema:
- Guía contextual al usuario
- Respuestas sobre funcionalidades
- Acceso rápido a módulos
- Soporte en tiempo real

#### Chatbots por Negocio
Chatbots personalizables por tenant:
- Widget embebible en sitios
- Entrenamiento con información del negocio
- Captura automática de leads
- Soporte y ventas automatizadas
- Integración con canales sociales (WhatsApp, Instagram, Facebook)

#### Leads & CRM
Sistema de gestión de prospectos:
- Captura desde múltiples fuentes
- Pipeline visual (Kanban)
- Seguimiento de interacciones
- Automatización de seguimientos
- Historial de conversaciones

#### Appointments / Bookings
Sistema de citas y reservas:
- Calendarios configurables
- Disponibilidad por servicio
- Recordatorios automáticos
- Integración con Google Calendar

#### E-commerce
Plataforma de comercio electrónico:
- Catálogo de productos
- Carrito de compras
- Pasarela de pagos (Stripe)
- Gestión de órdenes
- Inventario básico
- Clientes y cuentas

#### Domains & Hosting
Gestión de dominios:
- Conexión de dominios propios
- Subdominios automáticos
- Certificados SSL
- DNS management

#### User Roles & Permissions
Sistema de control de acceso:
- Roles predefinidos (Owner, Admin, Editor, Viewer)
- Permisos granulares por módulo
- Invitación de miembros
- Auditoría de accesos

#### Billing & Subscriptions
Sistema de facturación:
- Planes de suscripción
- Créditos de IA
- Pagos recurrentes (Stripe)
- Histórico de facturas
- Add-ons y upgrades

#### Analytics & Insights
Panel de métricas:
- Visitas al sitio
- Conversiones de leads
- Uso de IA
- Rendimiento de chatbots
- Métricas de e-commerce

### 3.3 Comunicacion entre Modulos

Los módulos se comunican a través de:

1. **Event System:** Eventos propagados cuando ocurren acciones (nuevo lead, nueva orden, cita creada)
2. **Shared Context:** Estado global accesible desde cualquier módulo
3. **Firebase Firestore:** Persistencia en tiempo real con listeners reactivos
4. **Cloud Functions:** Procesamiento serverless para operaciones complejas

---

## 4. FICHA TECNICA

### 4.1 Tipo de Aplicacion

| Característica | Especificación |
|----------------|----------------|
| Tipo | Web Application SaaS |
| Arquitectura | Multi-Tenant |
| Renderizado | Client-Side con SSR para sitios públicos |
| API | REST + Cloud Functions |
| Base de Datos | Firebase Firestore (NoSQL) |
| Storage | Firebase Storage |
| Autenticación | Firebase Authentication |

### 4.2 Arquitectura Multi-Tenant

```
Tenant (Individual/Agency)
├── Projects (Websites)
│   ├── Pages
│   ├── Components
│   ├── Blog Posts
│   └── SEO Settings
├── Leads
├── Products
├── Orders
├── Appointments
├── Files
├── Chatbot Config
└── Settings
    ├── Branding
    ├── Users
    └── Billing
```

**Tipos de Tenant:**
- `individual`: Usuario único con un negocio
- `agency`: Agencia que gestiona múltiples sub-clientes

### 4.3 Sistema de Autenticacion

- **Proveedores:** Email/Password, Google OAuth
- **Verificación:** Email verification requerido
- **Sesiones:** Tokens JWT con refresh automático
- **Multi-factor:** Opcional para cuentas business

### 4.4 Roles de Usuario

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| Owner | Propietario del tenant | Acceso total, billing, eliminar tenant |
| Admin | Administrador delegado | Gestión completa excepto billing |
| Editor | Creador de contenido | Crear/editar proyectos, leads, CMS |
| Viewer | Solo lectura | Ver dashboards y reportes |

Para agencias existen roles adicionales:
- `agency_owner`: Propietario de la agencia
- `agency_admin`: Administrador de agencia
- `agency_member`: Miembro del equipo
- `client`: Cliente de la agencia

### 4.5 Sistema de Creditos de IA

Las operaciones de IA consumen créditos según complejidad:

| Operación | Créditos |
|-----------|----------|
| Onboarding completo (generación de sitio) | 60 |
| Plan de diseño | 6 |
| Generación de texto (blog, copy) | 3 |
| Generación de imagen | 5 |
| Chat con asistente | 1 |
| Optimización SEO | 2 |
| Email marketing | 1 |

Los créditos se asignan mensualmente según el plan y pueden comprarse paquetes adicionales.

### 4.6 Limites por Plan

| Recurso | Free | Starter | Pro | Agency |
|---------|------|---------|-----|--------|
| Proyectos | 1 | 3 | 10 | Ilimitados |
| Usuarios | 1 | 3 | 10 | 25 |
| Storage (GB) | 1 | 5 | 20 | 100 |
| AI Credits/mes | 100 | 500 | 2000 | 10000 |
| Dominios | 0 | 1 | 5 | 20 |
| Sub-clientes | - | - | - | 50 |

### 4.7 Integracion de Pagos

- **Proveedor:** Stripe
- **Tipos de pago:** Suscripciones recurrentes, pagos únicos (paquetes IA)
- **Para agencias:** Stripe Connect para facturación a sub-clientes
- **Moneda base:** USD (configurable por tenant)

### 4.8 Escalabilidad

- **Horizontal:** Cloud Functions escalan automáticamente
- **Storage:** Firebase Storage con CDN global
- **Base de datos:** Firestore con sharding automático
- **Límites soft:** Configurables por plan sin cambios de infraestructura

### 4.9 Seguridad

| Capa | Implementación |
|------|----------------|
| Autenticación | Firebase Auth con tokens JWT |
| Autorización | Firestore Security Rules + Cloud Functions |
| Datos en tránsito | HTTPS obligatorio |
| Datos en reposo | Encriptación GCP por defecto |
| Validación | Client-side + Server-side |
| Sanitización | Todas las entradas de usuario |
| Rate Limiting | Firebase App Check |

---

## 5. FUNCIONALIDADES PRINCIPALES

### 5.1 Website Builder

**Descripción:**  
Editor visual para crear sitios web profesionales sin conocimientos de código.

**Capacidades:**
- **Creación de páginas:** Páginas ilimitadas por proyecto con URLs customizables
- **Templates por industria:** Restaurantes, servicios profesionales, e-commerce, portfolio, fitness, salud
- **Edición visual:** Modificación en tiempo real de textos, colores, imágenes, espaciados
- **Sistema de componentes:** Hero, Features, Pricing, Testimonials, FAQ, Team, Gallery, Contact
- **SEO básico:** Meta titles, descriptions, Open Graph, sitemap automático
- **Responsive:** Adaptación automática a móvil, tablet y desktop
- **Preview:** Vista previa en diferentes dispositivos antes de publicar
- **Historial de versiones:** Rollback a versiones anteriores

**Flujo típico:**
1. Seleccionar template o empezar en blanco
2. Agregar/remover secciones
3. Editar contenido de cada sección
4. Ajustar colores y tipografía global
5. Configurar SEO
6. Publicar

### 5.2 AI Content Generator

**Descripción:**  
Motor de generación de texto comercial y creativo usando modelos de lenguaje avanzados.

**Tipos de contenido:**
- **Textos comerciales:** Headlines, taglines, descripciones de productos
- **Blogs:** Artículos completos con estructura, headings, y CTAs
- **Copys publicitarios:** Anuncios para redes sociales, Google Ads
- **Emails:** Newsletters, secuencias de bienvenida, promocionales
- **Contenido SEO:** Textos optimizados para keywords específicos

**Características:**
- Generación contextual basada en información del negocio
- Tonos configurables (profesional, casual, persuasivo)
- Múltiples variantes para elegir
- Edición post-generación
- Historial de generaciones

### 5.3 AI Image Generator

**Descripción:**  
Creación de imágenes personalizadas mediante IA para uso en web y marketing.

**Casos de uso:**
- **Imágenes para web:** Heroes, backgrounds, ilustraciones
- **Banners:** Promocionales, headers de blog
- **Redes sociales:** Posts, stories, covers
- **Branding visual:** Logos (asistido), iconografía, patrones

**Características:**
- Prompts en lenguaje natural
- Estilos predefinidos (fotográfico, ilustración, minimalista)
- Ajuste de dimensiones para diferentes plataformas
- Galería de generaciones
- Integración directa con el editor

### 5.4 Global Assistant

**Descripción:**  
Asistente conversacional central que guía al usuario a través de la plataforma.

**Funciones:**
- **Guía de uso:** Explicaciones de funcionalidades y cómo usarlas
- **Respuestas contextuales:** Entender en qué módulo está el usuario y ofrecer ayuda relevante
- **Acceso rápido:** Comandos para navegar a secciones específicas
- **Onboarding:** Guía paso a paso para nuevos usuarios
- **Troubleshooting:** Ayuda con problemas comunes

**Características:**
- Disponible en todo momento
- Memoria de conversación por sesión
- Sugerencias proactivas
- Enlaces directos a documentación

### 5.5 Chatbots por Negocio

**Descripción:**  
Chatbots personalizables que se embeben en los sitios web de los clientes.

**Capacidades:**
- **Widget embebible:** Código para insertar en cualquier sitio
- **Entrenamiento personalizado:** Base de conocimiento del negocio (FAQs, productos, servicios)
- **Personalidad configurable:** Nombre, avatar, tono, idioma
- **Captura de leads:** Formularios conversacionales
- **Handoff humano:** Transferencia a agente cuando sea necesario
- **Integración social:** WhatsApp, Instagram DM, Facebook Messenger

**Casos de uso:**
- Soporte al cliente 24/7
- Pre-calificación de leads
- Reserva de citas
- Respuestas a preguntas frecuentes
- Guía de productos

### 5.6 Leads & CRM

**Descripción:**  
Sistema completo de gestión de prospectos y clientes.

**Funciones de captura:**
- Formularios en sitio web
- Chatbot conversacional
- Importación CSV
- API de integración
- Canales sociales

**Gestión:**
- **Pipeline visual:** Tablero Kanban con etapas customizables
- **Tarjetas de lead:** Información detallada, historial de interacciones
- **Etiquetas y filtros:** Segmentación por categorías
- **Asignación:** Distribución entre miembros del equipo
- **Automatización:** Acciones automáticas por etapa

**CRM:**
- Historial de conversaciones
- Notas y seguimientos
- Integración con email
- Recordatorios

### 5.7 Appointments / Bookings

**Descripción:**  
Sistema de reservas y gestión de citas.

**Funciones:**
- **Tipos de cita:** Servicios configurables con duración y precio
- **Disponibilidad:** Horarios por día, excepciones, días festivos
- **Reserva online:** Widget para clientes
- **Confirmaciones:** Email automático al reservar
- **Recordatorios:** Notificaciones antes de la cita
- **Cancelación:** Políticas configurables
- **Calendario:** Vista de agenda integrada
- **Sincronización:** Google Calendar bidireccional

### 5.8 E-commerce

**Descripción:**  
Plataforma de comercio electrónico integrada.

**Catálogo:**
- Productos con variantes (tallas, colores)
- Categorías y colecciones
- Imágenes múltiples
- Descripciones y especificaciones
- Precios y descuentos
- Inventario

**Checkout:**
- Carrito de compras
- Checkout optimizado
- Pasarela Stripe
- Cupones de descuento
- Cálculo de envío
- Impuestos configurables

**Gestión:**
- Panel de órdenes
- Estados de orden (pendiente, pagado, enviado, entregado)
- Notificaciones por email
- Historial de cliente
- Reportes de ventas

---

## 6. USER FLOW

### 6.1 Registro e Inicio

```
1. REGISTRO
   Usuario ingresa a quimera.ai
   ├── Opción 1: Sign up con Google
   └── Opción 2: Sign up con Email
       └── Verificación de email requerida

2. CREACION DEL TENANT
   └── Automático al verificar cuenta
       ├── Nombre del negocio
       └── Tipo (individual/agency)

3. ONBOARDING ASISTIDO POR IA
   ├── Nombre del negocio
   ├── Industria
   ├── Descripción breve
   ├── Estilo visual preferido
   └── Objetivos principales
```

### 6.2 Configuracion Inicial

```
4. SELECCION DE TEMPLATE
   ├── Templates por industria
   └── Empezar en blanco

5. GENERACION AUTOMATICA
   └── IA genera sitio completo basado en inputs
       ├── Páginas (Home, About, Services, Contact)
       ├── Contenido textual
       ├── Paleta de colores
       └── Estructura de navegación

6. PERSONALIZACION
   ├── Editar textos
   ├── Cambiar imágenes
   ├── Ajustar colores
   ├── Agregar/quitar secciones
   └── Configurar SEO
```

### 6.3 Publicacion

```
7. PREVIEW Y REVISION
   ├── Vista desktop
   ├── Vista móvil
   └── Verificación de contenido

8. PUBLICACION
   ├── Subdominio automático (negocio.quimera.ai)
   └── Opcional: Dominio propio

9. DOMINIO PROPIO (opcional)
   ├── Agregar dominio en configuración
   ├── Configurar DNS en proveedor
   └── Verificación automática + SSL
```

### 6.4 Uso Diario

```
10. DASHBOARD PRINCIPAL
    ├── Métricas clave (visitas, leads, ventas)
    ├── Accesos rápidos a módulos
    └── Notificaciones y tareas

11. FLUJOS COMUNES
    ├── Responder leads → CRM → Seguimiento
    ├── Crear blog post → Editor → Publicar
    ├── Nueva orden → Gestionar → Enviar
    ├── Cita reservada → Confirmar → Atender
    └── Generar contenido → IA → Editar → Usar
```

### 6.5 Escalado

```
12. CRECIMIENTO
    ├── Upgrade de plan
    ├── Agregar miembros al equipo
    ├── Conectar múltiples dominios
    └── Activar módulos adicionales

13. PARA AGENCIAS
    ├── Crear sub-clientes
    ├── Portal white-label
    ├── Reportes automatizados
    └── Facturación a clientes
```

---

## 7. SISTEMA DE DISENO

### 7.1 Filosofia Visual

Quimera.ai adopta un diseño moderno, limpio y profesional que transmite confianza y sofisticación tecnológica. La interfaz debe sentirse premium sin ser intimidante, accesible para usuarios no técnicos mientras ofrece profundidad para usuarios avanzados.

**Principios:**
- Claridad sobre decoración
- Función sobre ornamento
- Consistencia total entre módulos
- Jerarquía visual clara
- Espaciado generoso
- Feedback inmediato en interacciones

### 7.2 Paleta de Colores

**Sistema de Tokens:**

| Token | Light Mode | Dark Mode | Uso |
|-------|------------|-----------|-----|
| `--primary` | #3B82F6 | #60A5FA | Acciones principales, CTAs, enlaces |
| `--secondary` | #6366F1 | #818CF8 | Acentos secundarios, badges |
| `--accent` | #F59E0B | #FBBF24 | Highlights, notificaciones |
| `--success` | #10B981 | #34D399 | Estados exitosos, confirmaciones |
| `--warning` | #F59E0B | #FBBF24 | Alertas, precauciones |
| `--error` | #EF4444 | #F87171 | Errores, acciones destructivas |
| `--background` | #FFFFFF | #0F172A | Fondo principal |
| `--surface` | #F8FAFC | #1E293B | Cards, modales, sidebars |
| `--border` | #E2E8F0 | #334155 | Bordes y divisores |
| `--text-primary` | #1E293B | #F1F5F9 | Texto principal |
| `--text-secondary` | #64748B | #94A3B8 | Texto secundario |
| `--text-muted` | #94A3B8 | #64748B | Texto terciario, placeholders |

**Uso de color:**
- Primary para todas las acciones interactivas principales
- Evitar más de 3 colores por pantalla (excluyendo neutrales)
- Mantener contraste WCAG AA mínimo

### 7.3 Tipografia

**Font Stack:**
- **Headings:** Inter, system-ui, sans-serif
- **Body:** Inter, system-ui, sans-serif
- **Code/Mono:** JetBrains Mono, monospace

**Escala Tipográfica:**

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| h1 | 2.25rem (36px) | 700 | 1.2 |
| h2 | 1.875rem (30px) | 600 | 1.25 |
| h3 | 1.5rem (24px) | 600 | 1.3 |
| h4 | 1.25rem (20px) | 600 | 1.4 |
| body | 1rem (16px) | 400 | 1.5 |
| small | 0.875rem (14px) | 400 | 1.5 |
| caption | 0.75rem (12px) | 400 | 1.4 |

### 7.4 Espaciado

**Sistema de 4px:**
- Base unit: 4px
- Escala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

**Aplicación:**
- Padding interno de componentes: 16px (mínimo 12px)
- Gap entre elementos relacionados: 8-16px
- Gap entre secciones: 24-48px
- Márgenes de página: 24px (móvil), 48px (desktop)

### 7.5 Componentes UI

#### Botones

| Variante | Uso | Estilo |
|----------|-----|--------|
| Primary | Acción principal | Background primary, texto blanco |
| Secondary | Acción secundaria | Border primary, texto primary |
| Ghost | Acción terciaria | Sin border, texto primary |
| Destructive | Eliminar, cancelar | Background error |

**Estados:** Default, Hover, Active, Disabled, Loading

#### Cards

- Border radius: 8px (12px para cards destacadas)
- Shadow: Sutil en light mode, ninguna en dark mode
- Padding: 16-24px
- Border: 1px solid border-color

#### Modales

- Overlay: Background con 50% opacidad
- Border radius: 12px
- Width: Max 560px (configurable por contexto)
- Animación: Fade + Scale al abrir

#### Sidebars

- Width: 280px (colapsable a 64px)
- Background: surface
- Navegación jerárquica con iconos
- Indicador de sección activa

#### Dashboards

- Grid de 12 columnas
- Cards de métricas con iconos
- Gráficos con colores del tema
- Tablas con zebra striping sutil

#### Formularios

- Labels encima de inputs
- Border radius: 6px
- Focus ring: 2px offset con primary
- Validación inline con mensajes de error
- Placeholders descriptivos

### 7.6 Iconografia

- **Librería principal:** Lucide Icons
- **Tamaños:** 16px (inline), 20px (botones), 24px (navegación)
- **Color:** Heredar del texto (currentColor)
- **Stroke width:** 2px estándar

### 7.7 Animaciones

| Tipo | Duración | Easing |
|------|----------|--------|
| Micro (hovers, focus) | 150ms | ease-out |
| Transiciones UI | 200ms | ease-in-out |
| Modales/Overlays | 300ms | ease-out |
| Page transitions | 400ms | ease-in-out |

**Principios:**
- Animaciones funcionales, no decorativas
- Respetar preferencias de sistema (reduce-motion)
- Feedback visual inmediato

### 7.8 Soporte Dark/Light Mode

- Detección automática de preferencia del sistema
- Toggle manual en configuración
- Tokens CSS que cambian según modo
- Imágenes y gráficos optimizados para ambos modos

---

## 8. PRINCIPIOS FUNDAMENTALES

### 8.1 Simplicidad

Cada funcionalidad debe ser accesible en el menor número de pasos posible. La complejidad debe estar disponible para quien la busque, pero nunca ser requerida para tareas básicas.

### 8.2 Automatizacion Invisible

La IA y automatización deben trabajar en segundo plano. El usuario debe beneficiarse de la inteligencia del sistema sin necesidad de configurar reglas complejas.

### 8.3 Escalabilidad por Diseno

Todo módulo debe funcionar igual de bien para un usuario individual que para una agencia con 100 clientes. Los límites son de plan, no de arquitectura.

### 8.4 Modularidad

Cada módulo puede usarse independientemente o en conjunto con otros. La activación/desactivación de funcionalidades no rompe el sistema.

### 8.5 Claridad para el Usuario

Mensajes de error claros. Estados visuales evidentes. Confirmaciones antes de acciones destructivas. Nunca dejar al usuario preguntándose qué pasó.

### 8.6 Poder sin Complejidad

Ofrecer herramientas profesionales con interfaces accesibles. Un usuario no técnico debe poder lograr resultados que antes requerían un desarrollador.

### 8.7 Consistencia

Patrones de interacción idénticos en toda la plataforma. Si un usuario aprende a usar un módulo, puede usar cualquier otro intuitivamente.

### 8.8 Rendimiento

La interfaz debe sentirse instantánea. Operaciones largas deben mostrar progreso. Lazy loading para contenido no crítico.

---

## 9. USO DE ESTE DOCUMENTO

### 9.1 Autoridad

Este documento es la **fuente de verdad principal** para:
- Desarrollo de nuevas funcionalidades
- Diseño de interfaces y experiencias
- Documentación técnica y de usuario
- Prompts de IA y agentes internos
- Onboarding de nuevos desarrolladores
- Decisiones de producto

### 9.2 Conflictos

Si existe conflicto entre este documento y cualquier otro recurso (código, documentación anterior, instrucciones específicas), **este documento tiene prioridad** a menos que se indique explícitamente lo contrario.

### 9.3 Actualizaciones

Este documento debe actualizarse cuando:
- Se agreguen nuevos módulos
- Cambien principios fundamentales
- Se modifique el sistema de diseño
- Cambien arquitecturas clave

Toda actualización debe ser versionada y comunicada al equipo.

### 9.4 Uso en Prompts de IA

Cuando se configuren agentes o prompts de IA relacionados con Quimera.ai, deben incluir referencia a este documento para mantener consistencia en:
- Terminología
- Arquitectura descrita
- Principios de diseño
- Flujos de usuario

### 9.5 Referencia Rapida

Para consultas rápidas:
- **Arquitectura:** Sección 3
- **Especificaciones técnicas:** Sección 4
- **Funcionalidades:** Sección 5
- **Flujos de usuario:** Sección 6
- **Diseño y UI:** Sección 7
- **Principios:** Sección 8

---

**Fin del Documento Base Oficial**

*Quimera.ai - Plataforma Digital Unificada*
