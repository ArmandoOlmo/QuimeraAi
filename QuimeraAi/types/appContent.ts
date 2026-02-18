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
  getLegalPageByType: (type: LegalPageType) => LegalPage | undefined;
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
      { id: '1', label: 'Features', href: '#features', type: 'anchor' },
      { id: '2', label: 'Pricing', href: '#pricing', type: 'anchor' },
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
          { id: '1', label: 'Features', href: '#features', type: 'anchor' },
          { id: '2', label: 'Pricing', href: '#pricing', type: 'anchor' },
          { id: '3', label: 'Templates', href: '/templates', type: 'link' },
        ]
      },
      {
        id: 'resources',
        title: 'Resources',
        items: [
          { id: '1', label: 'Blog', href: '/blog', type: 'link' },
          { id: '2', label: 'Documentation', href: '/docs', type: 'link' },
          { id: '3', label: 'Help Center', href: '/help-center', type: 'link' },
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
    bottomText: '© 2024 Quimera.ai. All rights reserved.',
    showNewsletter: true,
    newsletterTitle: 'Stay updated',
    newsletterDescription: 'Get the latest news and updates from Quimera.'
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
  sections: [
    {
      id: 'intro',
      title: 'Introducción',
      icon: 'Globe',
      content: 'En Quimera AI, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información personal cuando utiliza nuestra plataforma de inteligencia artificial para la creación de sitios web y asistentes virtuales.'
    },
    {
      id: 'info-collected',
      title: 'Información que Recopilamos',
      icon: 'Database',
      content: '**Información de la Cuenta:**\n- Nombre y apellidos\n- Dirección de correo electrónico\n- Contraseña (encriptada)\n- Información de perfil opcional (foto, empresa)\n\n**Información de Uso:**\n- Proyectos y sitios web creados\n- Configuraciones de asistentes de IA\n- Historial de conversaciones con chatbots\n- Datos de leads capturados\n\n**Información Técnica:**\n- Dirección IP\n- Tipo de navegador y dispositivo\n- Páginas visitadas y acciones realizadas\n- Cookies y tecnologías similares'
    },
    {
      id: 'how-we-use',
      title: 'Cómo Usamos su Información',
      icon: 'Eye',
      content: '- Proporcionar, mantener y mejorar nuestros servicios\n- Procesar transacciones y enviar notificaciones relacionadas\n- Personalizar su experiencia y proporcionar contenido relevante\n- Entrenar y mejorar nuestros modelos de inteligencia artificial\n- Cumplir con obligaciones legales y resolver disputas'
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
      content: 'No vendemos su información personal. Podemos compartir información con:\n\n- **Proveedores de servicios:** Google Cloud, Firebase, Stripe para procesamiento de pagos\n- **Socios de IA:** Google (Gemini) para procesamiento de lenguaje natural\n- **Autoridades legales:** Cuando sea requerido por ley'
    },
    {
      id: 'security',
      title: 'Seguridad de Datos',
      icon: 'Lock',
      content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger su información:\n\n- Encriptación SSL/TLS para todas las comunicaciones\n- Almacenamiento seguro con Firebase/Google Cloud\n- Autenticación de dos factores disponible\n- Auditorías de seguridad regulares\n- Acceso restringido a datos personales'
    },
    {
      id: 'your-rights',
      title: 'Sus Derechos',
      icon: 'Users',
      content: 'Usted tiene derecho a:\n\n- **Acceso:** Solicitar una copia de sus datos personales\n- **Rectificación:** Corregir datos inexactos o incompletos\n- **Eliminación:** Solicitar la eliminación de sus datos\n- **Portabilidad:** Recibir sus datos en formato legible\n- **Oposición:** Oponerse al procesamiento de sus datos\n\nPara ejercer estos derechos, visite nuestra página de Eliminación de Datos o contáctenos directamente.'
    },
    {
      id: 'cookies',
      title: 'Cookies y Tecnologías Similares',
      icon: 'Cookie',
      content: 'Utilizamos cookies para:\n\n- Mantener su sesión iniciada\n- Recordar sus preferencias\n- Analizar el uso de la plataforma\n- Mejorar nuestros servicios\n\nPuede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad.'
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
      content: 'Quimera AI es una plataforma de inteligencia artificial que proporciona:\n\n- Creación y edición de sitios web con asistencia de IA\n- Chatbots y asistentes virtuales personalizables\n- Gestión de leads y CRM integrado\n- Integración con redes sociales (Facebook, Instagram, WhatsApp)\n- Herramientas de e-commerce\n- Servicios de email marketing'
    },
    {
      id: 'accounts',
      title: 'Cuentas de Usuario',
      icon: 'Users',
      content: '**Registro:**\n- Debe proporcionar información precisa y completa\n- Es responsable de mantener la confidencialidad de su cuenta\n- Debe notificarnos inmediatamente cualquier uso no autorizado\n\n**Requisitos:**\n- Debe ser mayor de 18 años\n- Una persona solo puede tener una cuenta\n- Las cuentas son intransferibles'
    },
    {
      id: 'acceptable-use',
      title: 'Uso Aceptable',
      icon: 'Shield',
      content: 'Usted acepta NO utilizar el servicio para:\n\n- Violar leyes o regulaciones aplicables\n- Infringir derechos de propiedad intelectual\n- Transmitir material ilegal, ofensivo o dañino\n- Enviar spam o comunicaciones no solicitadas\n- Intentar acceder a sistemas sin autorización\n- Interferir con el funcionamiento del servicio\n- Crear contenido engañoso o fraudulento'
    },
    {
      id: 'intellectual-property',
      title: 'Propiedad Intelectual',
      icon: 'Lock',
      content: '**Nuestra propiedad:**\n- La Plataforma y su contenido original son propiedad de Quimera AI\n- Nuestras marcas y logos no pueden usarse sin autorización\n\n**Su contenido:**\n- Usted retiene los derechos sobre el contenido que crea\n- Nos otorga licencia para mostrar y procesar su contenido\n- Es responsable de tener los derechos necesarios sobre su contenido'
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
      content: 'Podemos suspender o terminar su cuenta si:\n\n- Viola estos términos de servicio\n- Incurre en actividades fraudulentas\n- No paga las tarifas correspondientes\n- Abusa del servicio o de otros usuarios\n\nUsted puede terminar su cuenta en cualquier momento siguiendo las instrucciones en la configuración de su cuenta.'
    },
    {
      id: 'liability',
      title: 'Limitación de Responsabilidad',
      icon: 'Shield',
      content: 'El servicio se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables por:\n\n- Pérdidas indirectas o consecuentes\n- Pérdida de datos o interrupción del negocio\n- Daños resultantes del uso de servicios de terceros\n\nNuestra responsabilidad máxima está limitada al monto pagado por usted en los últimos 12 meses.'
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
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

