/**
 * App Content Types
 * Tipos para el contenido y navegación de la landing page principal de Quimera
 */

// =============================================================================
// APP ARTICLES (Artículos del blog/contenido de la App)
// =============================================================================

export interface AppArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  status: 'published' | 'draft';
  featured: boolean; // Para destacar en front page
  category: AppArticleCategory;
  tags: string[];
  author: string;
  showAuthor?: boolean;    // Toggle author visibility on public page (default: true)
  showDate?: boolean;      // Toggle date visibility on public page (default: true)
  authorImage?: string;
  readTime?: number; // minutos estimados de lectura
  views?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  language: 'es' | 'en';
  seo?: AppArticleSEO;
}

export type AppArticleCategory =
  | 'blog'
  | 'news'
  | 'tutorial'
  | 'case-study'
  | 'announcement'
  | 'guide'
  | 'update'
  | 'help';

export interface AppArticleSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string;
}

// =============================================================================
// APP NAVIGATION (Navegación del Landing de Quimera)
// =============================================================================

export interface AppNavigation {
  id: string;
  header: AppNavSection;
  footer: AppFooterConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface AppNavSection {
  logo?: AppLogoConfig;
  items: AppNavItem[];
  cta?: AppNavCTA;
}

export interface AppLogoConfig {
  imageUrl: string;
  text: string;
  href: string;
}

export interface AppNavItem {
  id: string;
  label: string;
  href: string;
  type: 'link' | 'anchor' | 'dropdown' | 'article';
  target?: '_blank' | '_self';
  children?: AppNavItem[];
  articleSlug?: string; // Si type es 'article', enlaza a un artículo
  icon?: string;
  isNew?: boolean;
}

export interface AppNavCTA {
  loginText: string;
  loginHref: string;
  registerText: string;
  registerHref: string;
}

export interface AppFooterConfig {
  columns: AppFooterColumn[];
  bottomText?: string;
  socialLinks?: AppSocialLink[];
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
}

export interface AppFooterColumn {
  id: string;
  title: string;
  items: AppNavItem[];
}

export interface AppSocialLink {
  id: string;
  platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'github' | 'discord';
  url: string;
}

// =============================================================================
// APP LANDING PAGE SECTIONS (Secciones editables del Landing)
// =============================================================================

export interface AppLandingConfig {
  id: string;
  hero: AppHeroConfig;
  features: AppFeaturesConfig;
  pricing: AppPricingConfig;
  testimonials?: AppTestimonialsConfig;
  blog: AppBlogSectionConfig;
  cta?: AppCTASectionConfig;
  updatedAt: string;
}

export interface AppHeroConfig {
  enabled: boolean;
  badge?: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  image?: string;
  video?: string;
}

export interface AppFeaturesConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  features: AppFeatureItem[];
}

export interface AppFeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AppPricingConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  // Los planes se obtienen de la configuración de suscripciones existente
}

export interface AppTestimonialsConfig {
  enabled: boolean;
  title: string;
  testimonials: AppTestimonialItem[];
}

export interface AppTestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  image?: string;
  content: string;
  rating?: number;
}

export interface AppBlogSectionConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  showFeatured: boolean;
  maxArticles: number;
  ctaText?: string;
  ctaHref?: string;
}

export interface AppCTASectionConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  primaryCTA: {
    text: string;
    href: string;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  backgroundImage?: string;
}

// =============================================================================
// LEGAL PAGES (Privacy Policy, Data Deletion, Terms)
// =============================================================================

export type LegalPageType = 'privacy-policy' | 'data-deletion' | 'terms-of-service' | 'cookie-policy';

export interface LegalPageSection {
  id: string;
  title: string;
  icon?: string;
  content: string;
}

export interface LegalPage {
  id: string;
  type: LegalPageType;
  title: string;
  subtitle?: string;
  lastUpdated: string;
  sections: LegalPageSection[];
  contactEmail?: string;
  contactInfo?: string;
  status: 'published' | 'draft';
  language: 'es' | 'en';
  createdAt: string;
  updatedAt: string;
}

export const LEGAL_PAGE_LABELS: Record<LegalPageType, string> = {
  'privacy-policy': 'Política de Privacidad',
  'data-deletion': 'Eliminación de Datos',
  'terms-of-service': 'Términos de Servicio',
  'cookie-policy': 'Política de Cookies',
};

// =============================================================================
// APP CONTENT CONTEXT TYPES
// =============================================================================

export interface AppContentContextType {
  // Articles
  articles: AppArticle[];
  featuredArticles: AppArticle[];
  isLoadingArticles: boolean;
  loadArticles: () => Promise<void>;
  getArticleBySlug: (slug: string) => AppArticle | undefined;
  saveArticle: (article: AppArticle) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;

  // Navigation
  navigation: AppNavigation | null;
  isLoadingNavigation: boolean;
  loadNavigation: () => Promise<void>;
  saveNavigation: (navigation: AppNavigation) => Promise<void>;

  // Landing Config
  landingConfig: AppLandingConfig | null;
  isLoadingLandingConfig: boolean;
  loadLandingConfig: () => Promise<void>;
  saveLandingConfig: (config: AppLandingConfig) => Promise<void>;

  // Legal Pages
  legalPages: LegalPage[];
  isLoadingLegalPages: boolean;
  loadLegalPages: () => Promise<void>;
  getLegalPageByType: (type: LegalPageType, language?: string) => LegalPage | undefined;
  saveLegalPage: (page: LegalPage) => Promise<void>;
  deleteLegalPage: (id: string) => Promise<void>;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_APP_NAVIGATION: AppNavigation = {
  id: 'main',
  header: {
    logo: {
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032',
      text: 'Quimera.ai',
      href: '/'
    },
    items: [
      { id: '1', label: 'Features', href: '/features', type: 'link' },
      { id: '2', label: 'Pricing', href: '/pricing', type: 'link' },
      { id: '3', label: 'Blog', href: '/blog', type: 'link' },
      { id: '4', label: 'Help', href: '/help-center', type: 'link' },
    ],
    cta: {
      loginText: 'Login',
      loginHref: '/login',
      registerText: 'Get Started',
      registerHref: '/register'
    }
  },
  footer: {
    columns: [
      {
        id: 'product',
        title: 'Product',
        items: [
          { id: '1', label: 'Features', href: '/features', type: 'link' },
          { id: '2', label: 'Pricing', href: '/pricing', type: 'link' },
        ]
      },
      {
        id: 'resources',
        title: 'Resources',
        items: [
          { id: '1', label: 'Blog', href: '/blog', type: 'link' },
          { id: '2', label: 'Help Center', href: '/help-center', type: 'link' },
          { id: '3', label: 'Changelog', href: '/changelog', type: 'link' },
        ]
      },
      {
        id: 'company',
        title: 'Company',
        items: [
          { id: '1', label: 'About', href: '/about', type: 'link' },
          { id: '2', label: 'Contact', href: '/contact', type: 'link' },
        ]
      },
      {
        id: 'legal',
        title: 'Legal',
        items: [
          { id: '1', label: 'Política de Privacidad', href: '/privacy-policy', type: 'link' },
          { id: '2', label: 'Eliminación de Datos', href: '/data-deletion', type: 'link' },
          { id: '3', label: 'Términos de Servicio', href: '/terms-of-service', type: 'link' },
        ]
      }
    ],
    socialLinks: [
      { id: '1', platform: 'twitter', url: 'https://twitter.com/quimeraai' },
      { id: '2', platform: 'linkedin', url: 'https://linkedin.com/company/quimeraai' },
    ],
    bottomText: '',
    showNewsletter: true,
    newsletterTitle: '',
    newsletterDescription: ''
  },
  updatedAt: new Date().toISOString()
};

export const DEFAULT_APP_LANDING_CONFIG: AppLandingConfig = {
  id: 'main',
  hero: {
    enabled: true,
    badge: 'AI-Powered',
    title: 'Build Amazing Websites',
    titleHighlight: 'with AI',
    subtitle: 'Create, localize, and scale marketing websites faster than ever before.',
    primaryCTA: {
      text: 'Get Started Free',
      href: '/register'
    },
    secondaryCTA: {
      text: 'Watch Demo',
      href: '#demo'
    }
  },
  features: {
    enabled: true,
    title: 'Everything you need',
    subtitle: 'Powerful features to build and grow your online presence',
    features: []
  },
  pricing: {
    enabled: true,
    title: 'Simple, transparent pricing',
    subtitle: 'Choose the plan that fits your needs'
  },
  blog: {
    enabled: true,
    title: 'Latest from the blog',
    subtitle: 'Insights, tutorials, and updates',
    showFeatured: true,
    maxArticles: 3,
    ctaText: 'View all articles',
    ctaHref: '/blog'
  },
  updatedAt: new Date().toISOString()
};

export const DEFAULT_PRIVACY_POLICY: LegalPage = {
  id: 'privacy-policy',
  type: 'privacy-policy',
  title: 'Política de Privacidad',
  subtitle: 'Cómo recopilamos, usamos y protegemos su información',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'es',
  sections: [
    {
      id: 'intro',
      title: 'Introducción',
      icon: 'Globe',
      content: 'En Quimera AI ("nosotros", "nuestro" o "la Plataforma"), nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando utiliza nuestra plataforma de inteligencia artificial para la creación de sitios web, gestión de citas, asistentes virtuales e integraciones con servicios de terceros.\n\nEsta política cumple con la Google API Services User Data Policy, incluyendo los requisitos de Limited Use.'
    },
    {
      id: 'info-collected',
      title: 'Información que Recopilamos',
      icon: 'Database',
      content: '**Información de la Cuenta:**\n- Nombre y apellidos\n- Dirección de correo electrónico\n- Contraseña (encriptada)\n- Información de perfil opcional (foto, empresa)\n\n**Información de Uso:**\n- Proyectos y sitios web creados\n- Configuraciones de asistentes de IA\n- Historial de conversaciones con chatbots\n- Datos de leads capturados\n- Citas y eventos del calendario\n\n**Datos de Google Calendar (cuando autoriza la integración):**\n- Títulos, descripciones y fechas de eventos\n- Participantes y asistentes de eventos\n- Ubicación y enlaces de reunión (Google Meet)\n- Estado del evento (confirmado, tentativo, cancelado)\n- Recordatorios y color del evento\n- Metadatos de sincronización (etag, IDs de evento)\n\n**Información Técnica:**\n- Dirección IP\n- Tipo de navegador y dispositivo\n- Páginas visitadas y acciones realizadas\n- Cookies y tecnologías similares'
    },
    {
      id: 'how-we-use',
      title: 'Cómo Usamos su Información',
      icon: 'Eye',
      content: '- Proporcionar, mantener y mejorar nuestros servicios\n- Procesar transacciones y enviar notificaciones relacionadas\n- Personalizar su experiencia y proporcionar contenido relevante\n- Sincronizar sus citas bidireccional con Google Calendar\n- Crear y actualizar eventos en su calendario cuando programa citas\n- Importar eventos de Google Calendar para mostrarlos en su panel de Quimera\n- Cumplir con obligaciones legales y resolver disputas'
    },
    {
      id: 'google-calendar-integration',
      title: 'Integración con Google Calendar',
      icon: 'Settings',
      content: '**¿Qué hace esta integración?**\n\nQuimera AI ofrece sincronización bidireccional con Google Calendar para gestionar sus citas profesionales. Al activar esta integración:\n\n**Datos que accedemos:**\n- Leer sus eventos existentes de Google Calendar para mostrarlos en Quimera\n- Crear nuevos eventos cuando programa citas en Quimera\n- Actualizar eventos cuando modifica citas en Quimera\n- Leer participantes, ubicaciones y enlaces de Google Meet\n\n**Permisos solicitados (OAuth Scopes):**\n- `https://www.googleapis.com/auth/calendar` — Para leer y escribir calendarios\n- `https://www.googleapis.com/auth/calendar.events` — Para gestionar eventos\n\n**Cómo protegemos sus datos de Google:**\n- Los tokens de acceso OAuth se almacenan únicamente en la memoria del navegador durante su sesión\n- No almacenamos sus credenciales de Google en nuestros servidores\n- Los datos de calendario se sincronizan directamente entre su navegador y Google\n- Solo accedemos a los datos necesarios para la funcionalidad de sincronización\n\n**Cómo revocar el acceso:**\n- Puede desconectar Google Calendar en cualquier momento desde la configuración de Citas\n- También puede revocar el acceso desde su cuenta de Google en https://myaccount.google.com/permissions\n- Al revocar, eliminamos toda referencia a sus datos de Google Calendar de nuestra plataforma'
    },
    {
      id: 'google-api-limited-use',
      title: 'Cumplimiento de Google API Services User Data Policy',
      icon: 'Shield',
      content: 'El uso y la transferencia de información recibida de las APIs de Google por parte de Quimera AI cumple con la Google API Services User Data Policy, incluyendo los requisitos de Limited Use.\n\n**Requisitos de Limited Use que cumplimos:**\n\n1. **Uso limitado:** Solo usamos los datos de Google Calendar para proporcionar la funcionalidad de sincronización de citas solicitada por el usuario.\n\n2. **No transferencia a terceros:** No transferimos datos de Google Calendar a terceros, excepto cuando sea necesario para proporcionar o mejorar las funcionalidades que el usuario solicita, para cumplir con leyes aplicables, o como parte de una fusión/adquisición con protecciones de confidencialidad.\n\n3. **No uso para publicidad:** No usamos datos de Google Calendar para mostrar, vender o distribuir publicidad.\n\n4. **No lectura por humanos:** No permitimos que personas lean los datos de Google Calendar del usuario, excepto con consentimiento explícito del usuario, para fines de seguridad, para cumplir con leyes, o cuando los datos se agregan y anonimizan para operaciones internas.\n\n5. **Seguridad:** Mantenemos prácticas de seguridad apropiadas para proteger todos los datos obtenidos de las APIs de Google.'
    },
    {
      id: 'social-integration',
      title: 'Integración con Redes Sociales',
      icon: 'Users',
      content: 'Quimera AI permite la integración con plataformas de Meta (Facebook, Instagram, WhatsApp) para funcionalidades de mensajería. Cuando conecta sus cuentas:\n\n- Solicitamos solo los permisos necesarios para la funcionalidad\n- Sus tokens de acceso se almacenan de forma segura y encriptada\n- No publicamos contenido sin su consentimiento explícito\n- Puede desconectar sus cuentas en cualquier momento'
    },
    {
      id: 'data-sharing',
      title: 'Compartición de Datos',
      icon: 'Shield',
      content: 'No vendemos su información personal. Podemos compartir información con:\n\n- **Google Calendar API:** Para sincronizar sus citas (solo cuando usted autoriza la conexión)\n- **Proveedores de servicios:** Google Cloud, Firebase para infraestructura; Stripe para procesamiento de pagos\n- **Socios de IA:** Google (Gemini) para procesamiento de lenguaje natural\n- **Meta Platforms:** Facebook, Instagram, WhatsApp cuando usted conecta estas integraciones\n- **Autoridades legales:** Cuando sea requerido por ley\n\n**Importante:** Los datos obtenidos de Google Calendar no se comparten con ningún tercero ni se utilizan para fines publicitarios.'
    },
    {
      id: 'data-retention',
      title: 'Retención de Datos',
      icon: 'Clock',
      content: '**Datos de cuenta:** Se conservan mientras su cuenta esté activa. Al eliminar su cuenta, todos los datos se eliminan en un plazo de 30 días.\n\n**Datos de Google Calendar:** Los datos de sincronización (IDs de eventos, etags) se almacenan mientras la integración esté activa. Al desconectar Google Calendar, estos metadatos se eliminan inmediatamente.\n\n**Datos de uso y analítica:** Se conservan de forma anónima y agregada para mejorar el servicio.\n\n**Copias de seguridad:** Las copias de seguridad automatizadas se eliminan según un ciclo de 90 días.'
    },
    {
      id: 'security',
      title: 'Seguridad de Datos',
      icon: 'Lock',
      content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información:\n\n- Encriptación SSL/TLS para todas las comunicaciones\n- Almacenamiento seguro con Firebase/Google Cloud\n- Autenticación de dos factores disponible\n- Auditorías de seguridad regulares\n- Acceso restringido a datos personales\n- Tokens de Google OAuth almacenados únicamente en sesión del navegador\n- Comunicaciones con Google Calendar cifradas mediante HTTPS'
    },
    {
      id: 'your-rights',
      title: 'Sus Derechos',
      icon: 'Users',
      content: 'Usted tiene derecho a:\n\n- **Acceso:** Solicitar una copia de sus datos personales\n- **Rectificación:** Corregir datos inexactos o incompletos\n- **Eliminación:** Solicitar la eliminación de sus datos\n- **Portabilidad:** Recibir sus datos en formato legible\n- **Oposición:** Oponerse al procesamiento de sus datos\n- **Revocar acceso:** Desconectar cualquier integración de terceros (Google Calendar, Meta) en cualquier momento\n\nPara ejercer estos derechos, visite nuestra página de Eliminación de Datos o contáctenos en privacy@quimera.ai.'
    },
    {
      id: 'cookies',
      title: 'Cookies y Tecnologías Similares',
      icon: 'FileText',
      content: 'Utilizamos cookies para:\n\n- Mantener su sesión iniciada\n- Recordar sus preferencias\n- Analizar el uso de la plataforma\n- Mejorar nuestros servicios\n\nPuede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad.\n\nPara más información, consulte nuestra Política de Cookies.'
    },
    {
      id: 'changes',
      title: 'Cambios en esta Política',
      icon: 'AlertTriangle',
      content: 'Podemos actualizar esta Política de Privacidad periódicamente. Los cambios significativos serán notificados:\n\n- Por email a la dirección registrada\n- Mediante aviso en la plataforma\n- Con al menos 30 días de anticipación\n\nLe recomendamos revisar esta política regularmente. La fecha de última actualización se indica al inicio del documento.'
    },
    {
      id: 'contact',
      title: 'Contacto',
      icon: 'Globe',
      content: 'Si tiene preguntas sobre esta Política de Privacidad o sobre cómo manejamos sus datos, puede contactarnos:\n\n- **Email:** privacy@quimera.ai\n- **Sitio web:** https://quimera.ai\n- **Eliminación de datos:** https://quimera.ai/data-deletion'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_DATA_DELETION: LegalPage = {
  id: 'data-deletion',
  type: 'data-deletion',
  title: 'Eliminación de Datos',
  subtitle: 'Respetamos su derecho a controlar sus datos personales',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'es',
  sections: [
    {
      id: 'what-deleted',
      title: '¿Qué datos se eliminarán?',
      icon: 'FileText',
      content: 'Al solicitar la eliminación de datos, se eliminarán:\n\n- Información de cuenta (nombre, email, contraseña)\n- Proyectos y sitios web creados\n- Configuraciones de asistentes de IA\n- Historial de conversaciones\n- Leads y datos de clientes capturados\n- Conexiones con redes sociales (Facebook, Instagram, WhatsApp)\n- Archivos e imágenes subidos'
    },
    {
      id: 'important',
      title: 'Importante',
      icon: 'AlertTriangle',
      content: '**Advertencias:**\n\n- La eliminación es **permanente e irreversible**\n- No podrá recuperar ningún dato después del proceso\n- Sus sitios web publicados dejarán de funcionar\n- Las suscripciones activas serán canceladas\n- Algunos datos pueden retenerse por requisitos legales'
    },
    {
      id: 'self-service',
      title: 'Eliminación desde su cuenta',
      icon: 'Settings',
      content: 'Si aún tiene acceso a su cuenta, puede eliminar sus datos directamente:\n\n1. Inicie sesión en su cuenta\n2. Vaya a Configuración → Cuenta\n3. Seleccione "Eliminar cuenta"\n4. Confirme la eliminación'
    },
    {
      id: 'process-time',
      title: 'Tiempo de Proceso',
      icon: 'Clock',
      content: 'El proceso de eliminación puede tomar hasta **30 días hábiles**. Recibirá un email de confirmación cuando se complete.'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_COOKIE_POLICY: LegalPage = {
  id: 'cookie-policy',
  type: 'cookie-policy',
  title: 'Política de Cookies',
  subtitle: 'Información sobre el uso de cookies en nuestra plataforma',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'es',
  sections: [
    {
      id: 'what-are-cookies',
      title: '¿Qué son las Cookies?',
      icon: 'FileText',
      content: 'Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo (ordenador, tablet o móvil) cuando los visita. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio.'
    },
    {
      id: 'how-we-use',
      title: 'Cómo Usamos las Cookies',
      icon: 'Settings',
      content: 'En Quimera AI utilizamos cookies para:\n\n- **Cookies Esenciales:** Necesarias para el funcionamiento básico del sitio\n- **Cookies de Sesión:** Mantener su sesión iniciada mientras navega\n- **Cookies de Preferencias:** Recordar sus configuraciones y preferencias\n- **Cookies Analíticas:** Entender cómo los usuarios interactúan con nuestro sitio\n- **Cookies de Rendimiento:** Mejorar la velocidad y rendimiento del sitio'
    },
    {
      id: 'types-of-cookies',
      title: 'Tipos de Cookies que Utilizamos',
      icon: 'Database',
      content: '**Cookies Propias:**\n- Cookies de autenticación (Firebase Auth)\n- Cookies de preferencias de idioma\n- Cookies de configuración del editor\n\n**Cookies de Terceros:**\n- Google Analytics (análisis de uso)\n- Stripe (procesamiento de pagos)\n- Firebase (servicios de backend)'
    },
    {
      id: 'manage-cookies',
      title: 'Gestión de Cookies',
      icon: 'Shield',
      content: 'Puede controlar y/o eliminar las cookies según desee. Puede eliminar todas las cookies que ya están en su ordenador y configurar la mayoría de los navegadores para que no se almacenen.\n\n**En Chrome:** Configuración → Privacidad y seguridad → Cookies\n**En Firefox:** Opciones → Privacidad y seguridad\n**En Safari:** Preferencias → Privacidad\n**En Edge:** Configuración → Privacidad y servicios'
    },
    {
      id: 'consequences',
      title: 'Consecuencias de Desactivar Cookies',
      icon: 'AlertTriangle',
      content: 'Si desactiva las cookies, tenga en cuenta que:\n\n- No podrá iniciar sesión en su cuenta\n- Sus preferencias no se guardarán\n- Algunas funcionalidades pueden no estar disponibles\n- La experiencia de usuario puede verse afectada'
    },
    {
      id: 'updates',
      title: 'Actualizaciones de esta Política',
      icon: 'Clock',
      content: 'Podemos actualizar esta política de cookies periódicamente. Le recomendamos revisar esta página regularmente para estar informado sobre cómo usamos las cookies.'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_TERMS_OF_SERVICE: LegalPage = {
  id: 'terms-of-service',
  type: 'terms-of-service',
  title: 'Términos de Servicio',
  subtitle: 'Condiciones de uso de la plataforma Quimera AI',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'legal@quimera.ai',
  status: 'published',
  language: 'es',
  sections: [
    {
      id: 'acceptance',
      title: 'Aceptación de los Términos',
      icon: 'FileText',
      content: 'Al acceder y utilizar Quimera AI ("la Plataforma"), usted acepta estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.\n\nEstos términos se aplican a todos los visitantes, usuarios y otras personas que accedan o utilicen el servicio.'
    },
    {
      id: 'description',
      title: 'Descripción del Servicio',
      icon: 'Globe',
      content: 'Quimera AI es una plataforma de inteligencia artificial que proporciona:\n\n- Creación y edición de sitios web con asistencia de IA\n- Chatbots y asistentes virtuales personalizables\n- Gestión de citas con sincronización de Google Calendar\n- Gestión de leads y CRM integrado\n- Integración con redes sociales (Facebook, Instagram, WhatsApp)\n- Herramientas de e-commerce\n- Servicios de email marketing'
    },
    {
      id: 'accounts',
      title: 'Cuentas de Usuario',
      icon: 'Users',
      content: '**Registro:**\n- Debe proporcionar información precisa y completa\n- Es responsable de mantener la confidencialidad de su cuenta\n- Debe notificarnos inmediatamente cualquier uso no autorizado\n\n**Requisitos:**\n- Debe ser mayor de 18 años\n- Una persona solo puede tener una cuenta\n- Las cuentas son intransferibles'
    },
    {
      id: 'third-party-integrations',
      title: 'Integraciones con Servicios de Terceros',
      icon: 'Settings',
      content: '**Google Calendar:**\nAl conectar su cuenta de Google Calendar, usted:\n\n- Autoriza a Quimera AI a leer, crear, editar y sincronizar eventos en su calendario\n- Acepta que la sincronización es bidireccional (cambios en Quimera se reflejan en Google y viceversa)\n- Comprende que puede revocar este acceso en cualquier momento\n- Acepta que el uso de datos de Google Calendar cumple con la Google API Services User Data Policy\n\n**Meta Platforms (Facebook, Instagram, WhatsApp):**\nAl conectar sus cuentas de Meta:\n\n- Autoriza a Quimera AI a enviar y recibir mensajes en su nombre\n- Acepta que solo usamos los permisos necesarios para la funcionalidad\n- Comprende que puede desconectar estas integraciones en cualquier momento\n\n**Responsabilidad sobre integraciones:**\n- No garantizamos la disponibilidad continua de servicios de terceros\n- Los cambios en las APIs de Google o Meta pueden afectar la funcionalidad\n- Usted es responsable de cumplir con los términos de servicio de cada plataforma conectada'
    },
    {
      id: 'acceptable-use',
      title: 'Uso Aceptable',
      icon: 'Shield',
      content: 'Usted acepta NO utilizar el servicio para:\n\n- Violar leyes o regulaciones aplicables\n- Infringir derechos de propiedad intelectual\n- Transmitir material ilegal, ofensivo o dañino\n- Enviar spam o comunicaciones no solicitadas\n- Intentar acceder a sistemas sin autorización\n- Interferir con el funcionamiento del servicio\n- Crear contenido engañoso o fraudulento\n- Abusar de las integraciones con Google Calendar o Meta para propósitos no autorizados'
    },
    {
      id: 'intellectual-property',
      title: 'Propiedad Intelectual',
      icon: 'Lock',
      content: '**Nuestra propiedad:**\n- La Plataforma y su contenido original son propiedad de Quimera AI\n- Nuestras marcas y logos no pueden usarse sin autorización\n\n**Su contenido:**\n- Usted retiene los derechos sobre el contenido que crea\n- Nos otorga licencia para mostrar y procesar su contenido\n- Es responsable de tener los derechos necesarios sobre su contenido\n\n**Contenido de terceros:**\n- Los datos de Google Calendar y Meta pertenecen a usted y a las respectivas plataformas\n- No reclamamos propiedad sobre datos sincronizados desde servicios de terceros'
    },
    {
      id: 'payment',
      title: 'Pagos y Suscripciones',
      icon: 'Database',
      content: '**Facturación:**\n- Los precios están sujetos a cambios con previo aviso\n- Los pagos se procesan de forma segura a través de Stripe\n- Las suscripciones se renuevan automáticamente\n\n**Cancelación:**\n- Puede cancelar su suscripción en cualquier momento\n- No se realizan reembolsos por períodos parciales\n- Al cancelar, mantendrá acceso hasta el final del período pagado'
    },
    {
      id: 'termination',
      title: 'Terminación',
      icon: 'AlertTriangle',
      content: 'Podemos suspender o terminar su cuenta si:\n\n- Viola estos términos de servicio\n- Incurre en actividades fraudulentas\n- No paga las tarifas correspondientes\n- Abusa del servicio o de otros usuarios\n\nUsted puede terminar su cuenta en cualquier momento siguiendo las instrucciones en la configuración de su cuenta.\n\nAl terminar su cuenta:\n- Se revocarán automáticamente todas las integraciones (Google Calendar, Meta)\n- Sus datos se eliminarán conforme a nuestra Política de Privacidad\n- Sus sitios web publicados dejarán de funcionar'
    },
    {
      id: 'liability',
      title: 'Limitación de Responsabilidad',
      icon: 'Shield',
      content: 'El servicio se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables por:\n\n- Pérdidas indirectas o consecuentes\n- Pérdida de datos o interrupción del negocio\n- Daños resultantes del uso de servicios de terceros\n- Errores o interrupciones en la sincronización con Google Calendar o Meta\n- Cambios en las APIs de terceros que afecten la funcionalidad\n\nNuestra responsabilidad máxima está limitada al monto pagado por usted en los últimos 12 meses.'
    },
    {
      id: 'changes',
      title: 'Cambios en los Términos',
      icon: 'Settings',
      content: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios significativos serán notificados:\n\n- Por email a la dirección registrada\n- Mediante aviso en la plataforma\n- Con al menos 30 días de anticipación\n\nEl uso continuado del servicio después de los cambios constituye aceptación de los nuevos términos.'
    },
    {
      id: 'governing-law',
      title: 'Ley Aplicable',
      icon: 'Globe',
      content: 'Estos términos se regirán e interpretarán de acuerdo con las leyes aplicables, sin tener en cuenta sus disposiciones sobre conflictos de leyes.\n\nCualquier disputa será resuelta mediante arbitraje vinculante o en los tribunales competentes.'
    },
    {
      id: 'contact',
      title: 'Contacto',
      icon: 'Globe',
      content: 'Para preguntas sobre estos Términos de Servicio:\n\n- **Email:** legal@quimera.ai\n- **Sitio web:** https://quimera.ai\n- **Política de Privacidad:** https://quimera.ai/privacy-policy'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// =============================================================================
// ENGLISH DEFAULTS FOR LEGAL PAGES
// =============================================================================

export const DEFAULT_PRIVACY_POLICY_EN: LegalPage = {
  id: 'privacy-policy',
  type: 'privacy-policy',
  title: 'Privacy Policy',
  subtitle: 'How we collect, use and protect your information',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'en',
  sections: [
    {
      id: 'intro',
      title: 'Introduction',
      icon: 'Globe',
      content: 'At Quimera AI ("we", "our" or "the Platform"), we take our users\' privacy very seriously. This Privacy Policy describes how we collect, use, store and protect your personal information when you use our artificial intelligence platform for website creation, appointment management, virtual assistants and third-party service integrations.\\n\\nThis policy complies with the Google API Services User Data Policy, including Limited Use requirements.'
    },
    {
      id: 'info-collected',
      title: 'Information We Collect',
      icon: 'Database',
      content: '**Account Information:**\\n- First and last name\\n- Email address\\n- Password (encrypted)\\n- Optional profile information (photo, company)\\n\\n**Usage Information:**\\n- Projects and websites created\\n- AI assistant configurations\\n- Chatbot conversation history\\n- Captured lead data\\n- Calendar appointments and events\\n\\n**Google Calendar Data (when you authorize the integration):**\\n- Event titles, descriptions and dates\\n- Event participants and attendees\\n- Location and meeting links (Google Meet)\\n- Event status (confirmed, tentative, cancelled)\\n- Reminders and event color\\n- Sync metadata (etag, event IDs)\\n\\n**Technical Information:**\\n- IP address\\n- Browser and device type\\n- Pages visited and actions taken\\n- Cookies and similar technologies'
    },
    {
      id: 'how-we-use',
      title: 'How We Use Your Information',
      icon: 'Eye',
      content: '- Provide, maintain and improve our services\\n- Process transactions and send related notifications\\n- Personalize your experience and provide relevant content\\n- Bidirectionally sync your appointments with Google Calendar\\n- Create and update events in your calendar when you schedule appointments\\n- Import Google Calendar events to display in your Quimera dashboard\\n- Comply with legal obligations and resolve disputes'
    },
    {
      id: 'google-calendar-integration',
      title: 'Google Calendar Integration',
      icon: 'Settings',
      content: '**What does this integration do?**\\n\\nQuimera AI offers bidirectional synchronization with Google Calendar to manage your professional appointments. When you activate this integration:\\n\\n**Data we access:**\\n- Read your existing Google Calendar events to display them in Quimera\\n- Create new events when you schedule appointments in Quimera\\n- Update events when you modify appointments in Quimera\\n- Read participants, locations and Google Meet links\\n\\n**Requested permissions (OAuth Scopes):**\\n- `https://www.googleapis.com/auth/calendar` — To read and write calendars\\n- `https://www.googleapis.com/auth/calendar.events` — To manage events\\n\\n**How we protect your Google data:**\\n- OAuth access tokens are stored only in browser memory during your session\\n- We do not store your Google credentials on our servers\\n- Calendar data syncs directly between your browser and Google\\n- We only access the data necessary for sync functionality\\n\\n**How to revoke access:**\\n- You can disconnect Google Calendar at any time from Appointments settings\\n- You can also revoke access from your Google account at https://myaccount.google.com/permissions\\n- Upon revocation, we remove all references to your Google Calendar data from our platform'
    },
    {
      id: 'google-api-limited-use',
      title: 'Google API Services User Data Policy Compliance',
      icon: 'Shield',
      content: 'Quimera AI\'s use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including Limited Use requirements.\\n\\n**Limited Use requirements we comply with:**\\n\\n1. **Limited use:** We only use Google Calendar data to provide the appointment sync functionality requested by the user.\\n\\n2. **No third-party transfer:** We do not transfer Google Calendar data to third parties, except when necessary to provide or improve functionality requested by the user, to comply with applicable laws, or as part of a merger/acquisition with confidentiality protections.\\n\\n3. **No use for advertising:** We do not use Google Calendar data to display, sell or distribute advertising.\\n\\n4. **No human reading:** We do not allow people to read user\'s Google Calendar data, except with explicit user consent, for security purposes, to comply with laws, or when data is aggregated and anonymized for internal operations.\\n\\n5. **Security:** We maintain appropriate security practices to protect all data obtained from Google APIs.'
    },
    {
      id: 'social-integration',
      title: 'Social Media Integration',
      icon: 'Users',
      content: 'Quimera AI allows integration with Meta platforms (Facebook, Instagram, WhatsApp) for messaging functionality. When you connect your accounts:\\n\\n- We request only the permissions necessary for functionality\\n- Your access tokens are stored securely and encrypted\\n- We do not publish content without your explicit consent\\n- You can disconnect your accounts at any time'
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing',
      icon: 'Shield',
      content: 'We do not sell your personal information. We may share information with:\\n\\n- **Google Calendar API:** To sync your appointments (only when you authorize the connection)\\n- **Service providers:** Google Cloud, Firebase for infrastructure; Stripe for payment processing\\n- **AI partners:** Google (Gemini) for natural language processing\\n- **Meta Platforms:** Facebook, Instagram, WhatsApp when you connect these integrations\\n- **Legal authorities:** When required by law\\n\\n**Important:** Data obtained from Google Calendar is not shared with any third party and is not used for advertising purposes.'
    },
    {
      id: 'data-retention',
      title: 'Data Retention',
      icon: 'Clock',
      content: '**Account data:** Retained while your account is active. When you delete your account, all data is deleted within 30 days.\\n\\n**Google Calendar data:** Sync data (event IDs, etags) is stored while the integration is active. When you disconnect Google Calendar, this metadata is deleted immediately.\\n\\n**Usage and analytics data:** Retained anonymously and in aggregate to improve the service.\\n\\n**Backups:** Automated backups are deleted on a 90-day cycle.'
    },
    {
      id: 'security',
      title: 'Data Security',
      icon: 'Lock',
      content: 'We implement technical and organizational security measures to protect your information:\\n\\n- SSL/TLS encryption for all communications\\n- Secure storage with Firebase/Google Cloud\\n- Two-factor authentication available\\n- Regular security audits\\n- Restricted access to personal data\\n- Google OAuth tokens stored only in browser session\\n- Communications with Google Calendar encrypted via HTTPS'
    },
    {
      id: 'your-rights',
      title: 'Your Rights',
      icon: 'Users',
      content: 'You have the right to:\\n\\n- **Access:** Request a copy of your personal data\\n- **Rectification:** Correct inaccurate or incomplete data\\n- **Deletion:** Request the deletion of your data\\n- **Portability:** Receive your data in a readable format\\n- **Objection:** Object to the processing of your data\\n- **Revoke access:** Disconnect any third-party integration (Google Calendar, Meta) at any time\\n\\nTo exercise these rights, visit our Data Deletion page or contact us at privacy@quimera.ai.'
    },
    {
      id: 'cookies',
      title: 'Cookies and Similar Technologies',
      icon: 'FileText',
      content: 'We use cookies to:\\n\\n- Keep your session active\\n- Remember your preferences\\n- Analyze platform usage\\n- Improve our services\\n\\nYou can configure your browser to reject cookies, although this may affect functionality.\\n\\nFor more information, please refer to our Cookie Policy.'
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      icon: 'AlertTriangle',
      content: 'We may update this Privacy Policy periodically. Significant changes will be notified:\\n\\n- By email to the registered address\\n- Through a notice on the platform\\n- With at least 30 days advance notice\\n\\nWe recommend reviewing this policy regularly. The date of last update is indicated at the beginning of the document.'
    },
    {
      id: 'contact',
      title: 'Contact',
      icon: 'Globe',
      content: 'If you have questions about this Privacy Policy or how we handle your data, you can contact us:\\n\\n- **Email:** privacy@quimera.ai\\n- **Website:** https://quimera.ai\\n- **Data deletion:** https://quimera.ai/data-deletion'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_DATA_DELETION_EN: LegalPage = {
  id: 'data-deletion',
  type: 'data-deletion',
  title: 'Data Deletion',
  subtitle: 'We respect your right to control your personal data',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'en',
  sections: [
    {
      id: 'what-deleted',
      title: 'What data will be deleted?',
      icon: 'FileText',
      content: 'When you request data deletion, the following will be removed:\\n\\n- Account information (name, email, password)\\n- Projects and websites created\\n- AI assistant configurations\\n- Conversation history\\n- Captured leads and client data\\n- Social media connections (Facebook, Instagram, WhatsApp)\\n- Uploaded files and images'
    },
    {
      id: 'important',
      title: 'Important',
      icon: 'AlertTriangle',
      content: '**Warnings:**\\n\\n- Deletion is **permanent and irreversible**\\n- You will not be able to recover any data after the process\\n- Your published websites will stop working\\n- Active subscriptions will be cancelled\\n- Some data may be retained due to legal requirements'
    },
    {
      id: 'self-service',
      title: 'Deletion from your account',
      icon: 'Settings',
      content: 'If you still have access to your account, you can delete your data directly:\\n\\n1. Log in to your account\\n2. Go to Settings → Account\\n3. Select "Delete account"\\n4. Confirm the deletion'
    },
    {
      id: 'process-time',
      title: 'Process Time',
      icon: 'Clock',
      content: 'The deletion process may take up to **30 business days**. You will receive a confirmation email when it is complete.'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_COOKIE_POLICY_EN: LegalPage = {
  id: 'cookie-policy',
  type: 'cookie-policy',
  title: 'Cookie Policy',
  subtitle: 'Information about cookie usage on our platform',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'privacy@quimera.ai',
  status: 'published',
  language: 'en',
  sections: [
    {
      id: 'what-are-cookies',
      title: 'What are Cookies?',
      icon: 'FileText',
      content: 'Cookies are small text files that websites store on your device (computer, tablet or mobile) when you visit them. They are widely used to make websites work more efficiently, as well as to provide information to site owners.'
    },
    {
      id: 'how-we-use',
      title: 'How We Use Cookies',
      icon: 'Settings',
      content: 'At Quimera AI we use cookies for:\\n\\n- **Essential Cookies:** Necessary for the basic functioning of the site\\n- **Session Cookies:** Keep your session active while browsing\\n- **Preference Cookies:** Remember your settings and preferences\\n- **Analytics Cookies:** Understand how users interact with our site\\n- **Performance Cookies:** Improve site speed and performance'
    },
    {
      id: 'types-of-cookies',
      title: 'Types of Cookies We Use',
      icon: 'Database',
      content: '**First-Party Cookies:**\\n- Authentication cookies (Firebase Auth)\\n- Language preference cookies\\n- Editor configuration cookies\\n\\n**Third-Party Cookies:**\\n- Google Analytics (usage analysis)\\n- Stripe (payment processing)\\n- Firebase (backend services)'
    },
    {
      id: 'manage-cookies',
      title: 'Cookie Management',
      icon: 'Shield',
      content: 'You can control and/or delete cookies as you wish. You can delete all cookies already on your computer and set most browsers not to accept them.\\n\\n**In Chrome:** Settings → Privacy and security → Cookies\\n**In Firefox:** Options → Privacy and security\\n**In Safari:** Preferences → Privacy\\n**In Edge:** Settings → Privacy and services'
    },
    {
      id: 'consequences',
      title: 'Consequences of Disabling Cookies',
      icon: 'AlertTriangle',
      content: 'If you disable cookies, please note that:\\n\\n- You will not be able to log in to your account\\n- Your preferences will not be saved\\n- Some features may not be available\\n- The user experience may be affected'
    },
    {
      id: 'updates',
      title: 'Updates to This Policy',
      icon: 'Clock',
      content: 'We may update this cookie policy periodically. We recommend reviewing this page regularly to stay informed about how we use cookies.'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_TERMS_OF_SERVICE_EN: LegalPage = {
  id: 'terms-of-service',
  type: 'terms-of-service',
  title: 'Terms of Service',
  subtitle: 'Terms of use for the Quimera AI platform',
  lastUpdated: new Date().toISOString(),
  contactEmail: 'legal@quimera.ai',
  status: 'published',
  language: 'en',
  sections: [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: 'FileText',
      content: 'By accessing and using Quimera AI ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the service.\\n\\nThese terms apply to all visitors, users and other persons who access or use the service.'
    },
    {
      id: 'description',
      title: 'Service Description',
      icon: 'Globe',
      content: 'Quimera AI is an artificial intelligence platform that provides:\\n\\n- AI-assisted website creation and editing\\n- Customizable chatbots and virtual assistants\\n- Appointment management with Google Calendar synchronization\\n- Lead management and integrated CRM\\n- Social media integration (Facebook, Instagram, WhatsApp)\\n- E-commerce tools\\n- Email marketing services'
    },
    {
      id: 'accounts',
      title: 'User Accounts',
      icon: 'Users',
      content: '**Registration:**\\n- You must provide accurate and complete information\\n- You are responsible for maintaining the confidentiality of your account\\n- You must notify us immediately of any unauthorized use\\n\\n**Requirements:**\\n- You must be over 18 years old\\n- One person may only have one account\\n- Accounts are non-transferable'
    },
    {
      id: 'third-party-integrations',
      title: 'Third-Party Service Integrations',
      icon: 'Settings',
      content: '**Google Calendar:**\\nBy connecting your Google Calendar account, you:\\n\\n- Authorize Quimera AI to read, create, edit and sync events in your calendar\\n- Accept that synchronization is bidirectional (changes in Quimera are reflected in Google and vice versa)\\n- Understand that you can revoke this access at any time\\n- Accept that the use of Google Calendar data complies with the Google API Services User Data Policy\\n\\n**Meta Platforms (Facebook, Instagram, WhatsApp):**\\nBy connecting your Meta accounts:\\n\\n- You authorize Quimera AI to send and receive messages on your behalf\\n- You accept that we only use the permissions necessary for functionality\\n- You understand that you can disconnect these integrations at any time\\n\\n**Responsibility for integrations:**\\n- We do not guarantee the continuous availability of third-party services\\n- Changes in Google or Meta APIs may affect functionality\\n- You are responsible for complying with the terms of service of each connected platform'
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable Use',
      icon: 'Shield',
      content: 'You agree NOT to use the service to:\\n\\n- Violate applicable laws or regulations\\n- Infringe intellectual property rights\\n- Transmit illegal, offensive or harmful material\\n- Send spam or unsolicited communications\\n- Attempt to access systems without authorization\\n- Interfere with the operation of the service\\n- Create misleading or fraudulent content\\n- Abuse Google Calendar or Meta integrations for unauthorized purposes'
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      icon: 'Lock',
      content: '**Our property:**\\n- The Platform and its original content are owned by Quimera AI\\n- Our trademarks and logos may not be used without authorization\\n\\n**Your content:**\\n- You retain the rights to the content you create\\n- You grant us a license to display and process your content\\n- You are responsible for having the necessary rights to your content\\n\\n**Third-party content:**\\n- Google Calendar and Meta data belongs to you and the respective platforms\\n- We do not claim ownership of data synchronized from third-party services'
    },
    {
      id: 'payment',
      title: 'Payments and Subscriptions',
      icon: 'Database',
      content: '**Billing:**\\n- Prices are subject to change with prior notice\\n- Payments are processed securely through Stripe\\n- Subscriptions renew automatically\\n\\n**Cancellation:**\\n- You can cancel your subscription at any time\\n- No refunds are issued for partial periods\\n- Upon cancellation, you will maintain access until the end of the paid period'
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: 'AlertTriangle',
      content: 'We may suspend or terminate your account if:\\n\\n- You violate these terms of service\\n- You engage in fraudulent activities\\n- You fail to pay applicable fees\\n- You abuse the service or other users\\n\\nYou may terminate your account at any time by following the instructions in your account settings.\\n\\nUpon terminating your account:\\n- All integrations (Google Calendar, Meta) will be automatically revoked\\n- Your data will be deleted in accordance with our Privacy Policy\\n- Your published websites will stop working'
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      icon: 'Shield',
      content: 'The service is provided "as is" without warranties of any kind. We will not be liable for:\\n\\n- Indirect or consequential losses\\n- Loss of data or business interruption\\n- Damages resulting from the use of third-party services\\n- Errors or interruptions in synchronization with Google Calendar or Meta\\n- Changes in third-party APIs that affect functionality\\n\\nOur maximum liability is limited to the amount paid by you in the last 12 months.'
    },
    {
      id: 'changes',
      title: 'Changes to Terms',
      icon: 'Settings',
      content: 'We reserve the right to modify these terms at any time. Significant changes will be notified:\\n\\n- By email to the registered address\\n- Through a notice on the platform\\n- With at least 30 days advance notice\\n\\nContinued use of the service after changes constitutes acceptance of the new terms.'
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      icon: 'Globe',
      content: 'These terms will be governed and interpreted in accordance with applicable laws, without regard to their conflict of law provisions.\\n\\nAny dispute will be resolved through binding arbitration or in the competent courts.'
    },
    {
      id: 'contact',
      title: 'Contact',
      icon: 'Globe',
      content: 'For questions about these Terms of Service:\\n\\n- **Email:** legal@quimera.ai\\n- **Website:** https://quimera.ai\\n- **Privacy Policy:** https://quimera.ai/privacy-policy'
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// =============================================================================
// HELPER: Get default legal page by type and language
// =============================================================================

const DEFAULT_LEGAL_PAGES_ES: Record<LegalPageType, LegalPage> = {
  'privacy-policy': DEFAULT_PRIVACY_POLICY,
  'data-deletion': DEFAULT_DATA_DELETION,
  'cookie-policy': DEFAULT_COOKIE_POLICY,
  'terms-of-service': DEFAULT_TERMS_OF_SERVICE,
};

const DEFAULT_LEGAL_PAGES_EN: Record<LegalPageType, LegalPage> = {
  'privacy-policy': DEFAULT_PRIVACY_POLICY_EN,
  'data-deletion': DEFAULT_DATA_DELETION_EN,
  'cookie-policy': DEFAULT_COOKIE_POLICY_EN,
  'terms-of-service': DEFAULT_TERMS_OF_SERVICE_EN,
};

export function getDefaultLegalPage(type: LegalPageType, lang: string): LegalPage {
  const map = lang === 'en' ? DEFAULT_LEGAL_PAGES_EN : DEFAULT_LEGAL_PAGES_ES;
  return map[type];
}
