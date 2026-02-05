/**
 * Routes Configuration
 * Configuración centralizada de todas las rutas de la aplicación
 */

import { View, AdminView } from '../types/ui';

// =============================================================================
// ROUTE TYPES
// =============================================================================

export type RouteType = 'public' | 'private' | 'admin' | 'preview';

export interface RouteConfig {
  path: string;
  view?: View;
  adminView?: AdminView;
  type: RouteType;
  title: string;
  requiresAuth: boolean;
  requiresEmailVerified?: boolean;
  roles?: string[]; // Roles permitidos (vacío = todos los autenticados)
  icon?: string;
  showInNav?: boolean;
  parent?: string; // Para rutas anidadas
}

export interface RouteParams {
  projectId?: string;
  [key: string]: string | undefined;
}

// =============================================================================
// ROUTE PATHS (Constants)
// =============================================================================

export const ROUTES = {
  // Public Routes
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  BLOG: '/blog',
  BLOG_ARTICLE: '/blog/:slug',

  // Legal Pages (Public)
  PRIVACY_POLICY: '/privacy-policy',
  DATA_DELETION: '/data-deletion',
  TERMS_OF_SERVICE: '/terms-of-service',
  COOKIE_POLICY: '/cookie-policy',
  HELP_CENTER: '/help-center',
  CHANGELOG: '/changelog',

  // OAuth Callback Routes
  META_OAUTH_ERROR: '/auth/meta/error',

  // Preview Routes
  PREVIEW: '/preview/:projectId',

  // Storefront Routes (Public ecommerce)
  STORE: '/store/:storeId',
  STORE_PRODUCT: '/store/:storeId/product/:slug',
  STORE_CATEGORY: '/store/:storeId/category/:categorySlug',
  STORE_CHECKOUT: '/store/:storeId/checkout',
  STORE_ORDER_CONFIRMATION: '/store/:storeId/order/:orderId',

  // Public Bio Page Route
  PUBLIC_BIO: '/bio/:username',

  // Dashboard Routes
  DASHBOARD: '/dashboard',
  WEBSITES: '/websites',
  ASSETS: '/assets',
  TEMPLATES: '/templates',

  // Editor Routes
  EDITOR: '/editor/:projectId',

  // Feature Routes
  CMS: '/cms',
  NAVIGATION: '/navigation',
  AI_ASSISTANT: '/ai-assistant',
  LEADS: '/leads',
  APPOINTMENTS: '/appointments',
  DOMAINS: '/domains',
  SEO: '/seo',
  FINANCE: '/finance',
  ECOMMERCE: '/ecommerce',
  EMAIL: '/email',
  BIOPAGE: '/biopage',

  // Settings Routes (Workspace/Team)
  SETTINGS: '/settings',
  SETTINGS_TEAM: '/settings/team',
  SETTINGS_BRANDING: '/settings/branding',
  SETTINGS_SUBSCRIPTION: '/settings/subscription',

  // Invite Route (Public)
  INVITE: '/invite/:token',

  // Agency Routes (Private - Agency Owners/Admins only)
  AGENCY: '/agency',
  AGENCY_OVERVIEW: '/agency/overview',
  AGENCY_ANALYTICS: '/agency/analytics',
  AGENCY_BILLING: '/agency/billing',
  AGENCY_REPORTS: '/agency/reports',
  AGENCY_NEW_CLIENT: '/agency/new-client',
  AGENCY_ADDONS: '/agency/addons',
  AGENCY_LANDING: '/agency/landing',
  AGENCY_PLANS: '/agency/plans',
  AGENCY_CMS: '/agency/cms',
  AGENCY_NAVIGATION: '/agency/navigation',

  // Agency Signup (Public)
  AGENCY_SIGNUP: '/agency-signup',

  // Admin Routes
  SUPERADMIN: '/admin',
  ADMIN_ADMINS: '/admin/admins',
  ADMIN_TENANTS: '/admin/tenants',
  ADMIN_LANGUAGES: '/admin/languages',
  ADMIN_PROMPTS: '/admin/prompts',
  ADMIN_STATS: '/admin/stats',
  ADMIN_TEMPLATES: '/admin/templates',
  ADMIN_COMPONENTS: '/admin/components',
  ADMIN_IMAGES: '/admin/images',
  ADMIN_ASSETS: '/admin/assets',
  ADMIN_GLOBAL_ASSISTANT: '/admin/global-assistant',
  ADMIN_DESIGN_TOKENS: '/admin/design-tokens',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_GLOBAL_SEO: '/admin/global-seo',
  ADMIN_APP_INFO: '/admin/app-info',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_LANDING_NAVIGATION: '/admin/landing-navigation',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_LANDING_CHATBOT: '/admin/landing-chatbot',
  ADMIN_CHANGELOG: '/admin/changelog',
  ADMIN_GLOBAL_TRACKING_PIXELS: '/admin/global-tracking-pixels',
  ADMIN_CHATBOT_PROMPTS: '/admin/chatbot-prompts',
  ADMIN_EXECUTION_MODE: '/admin/execution-mode',
  ADMIN_NEWS: '/admin/news',
  ADMIN_LANDING_EDITOR: '/admin/landing-editor',
  ADMIN_SERVICE_AVAILABILITY: '/admin/service-availability',
} as const;

// =============================================================================
// ROUTE CONFIGURATIONS
// =============================================================================

export const routeConfigs: RouteConfig[] = [
  // =========================================================================
  // PUBLIC ROUTES
  // =========================================================================
  {
    path: ROUTES.LANDING,
    type: 'public',
    title: 'Quimera AI',
    requiresAuth: false,
  },
  {
    path: ROUTES.LOGIN,
    type: 'public',
    title: 'Login',
    requiresAuth: false,
  },
  {
    path: ROUTES.REGISTER,
    type: 'public',
    title: 'Register',
    requiresAuth: false,
  },
  {
    path: ROUTES.META_OAUTH_ERROR,
    type: 'public',
    title: 'Connection Error',
    requiresAuth: false,
  },
  {
    path: ROUTES.PRIVACY_POLICY,
    type: 'public',
    title: 'Privacy Policy',
    requiresAuth: false,
  },
  {
    path: ROUTES.DATA_DELETION,
    type: 'public',
    title: 'Data Deletion',
    requiresAuth: false,
  },
  {
    path: ROUTES.TERMS_OF_SERVICE,
    type: 'public',
    title: 'Terms of Service',
    requiresAuth: false,
  },
  {
    path: ROUTES.COOKIE_POLICY,
    type: 'public',
    title: 'Cookie Policy',
    requiresAuth: false,
  },
  {
    path: ROUTES.HELP_CENTER,
    type: 'public',
    title: 'Help Center',
    requiresAuth: false,
  },
  {
    path: ROUTES.CHANGELOG,
    type: 'public',
    title: 'Changelog',
    requiresAuth: false,
  },
  {
    path: ROUTES.BLOG,
    type: 'public',
    title: 'Blog',
    requiresAuth: false,
  },
  {
    path: ROUTES.BLOG_ARTICLE,
    type: 'public',
    title: 'Article',
    requiresAuth: false,
  },

  // =========================================================================
  // PREVIEW ROUTES (Public but require project ID)
  // =========================================================================
  {
    path: ROUTES.PREVIEW,
    type: 'preview',
    title: 'Preview',
    requiresAuth: false,
  },

  // =========================================================================
  // STOREFRONT ROUTES (Public ecommerce pages)
  // =========================================================================
  {
    path: ROUTES.STORE,
    type: 'preview',
    title: 'Store',
    requiresAuth: false,
  },
  {
    path: ROUTES.STORE_PRODUCT,
    type: 'preview',
    title: 'Product',
    requiresAuth: false,
  },
  {
    path: ROUTES.STORE_CATEGORY,
    type: 'preview',
    title: 'Category',
    requiresAuth: false,
  },
  {
    path: ROUTES.STORE_CHECKOUT,
    type: 'preview',
    title: 'Checkout',
    requiresAuth: false,
  },
  {
    path: ROUTES.STORE_ORDER_CONFIRMATION,
    type: 'preview',
    title: 'Order Confirmation',
    requiresAuth: false,
  },

  // =========================================================================
  // PUBLIC BIO PAGE ROUTE
  // =========================================================================
  {
    path: ROUTES.PUBLIC_BIO,
    type: 'public',
    title: 'Bio Page',
    requiresAuth: false,
  },

  // =========================================================================
  // DASHBOARD ROUTES (Private - Authenticated Users)
  // =========================================================================
  {
    path: ROUTES.DASHBOARD,
    view: 'dashboard',
    type: 'private',
    title: 'Dashboard',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'LayoutDashboard',
  },
  {
    path: ROUTES.WEBSITES,
    view: 'websites',
    type: 'private',
    title: 'Websites',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Globe',
  },
  {
    path: ROUTES.ASSETS,
    view: 'assets',
    type: 'private',
    title: 'Assets',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Image',
  },
  {
    path: ROUTES.TEMPLATES,
    view: 'templates',
    type: 'private',
    title: 'Templates',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'FileCode',
  },

  // =========================================================================
  // EDITOR ROUTES (Private - Requires Project)
  // =========================================================================
  {
    path: ROUTES.EDITOR,
    view: 'editor',
    type: 'private',
    title: 'Editor',
    requiresAuth: true,
    requiresEmailVerified: true,
  },

  // =========================================================================
  // FEATURE ROUTES (Private - Authenticated Users)
  // =========================================================================
  {
    path: ROUTES.CMS,
    view: 'cms',
    type: 'private',
    title: 'CMS',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'FileText',
  },
  {
    path: ROUTES.NAVIGATION,
    view: 'navigation',
    type: 'private',
    title: 'Navigation',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Menu',
  },
  {
    path: ROUTES.AI_ASSISTANT,
    view: 'ai-assistant',
    type: 'private',
    title: 'AI Assistant',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Bot',
  },
  {
    path: ROUTES.LEADS,
    view: 'leads',
    type: 'private',
    title: 'Leads',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Users',
  },
  {
    path: ROUTES.APPOINTMENTS,
    view: 'appointments',
    type: 'private',
    title: 'Appointments',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Calendar',
  },
  {
    path: ROUTES.DOMAINS,
    view: 'domains',
    type: 'private',
    title: 'Domains',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Link',
  },
  {
    path: ROUTES.SEO,
    view: 'seo',
    type: 'private',
    title: 'SEO',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Search',
  },
  {
    path: ROUTES.FINANCE,
    view: 'finance',
    type: 'private',
    title: 'Finance',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'DollarSign',
  },
  {
    path: ROUTES.ECOMMERCE,
    view: 'ecommerce',
    type: 'private',
    title: 'Ecommerce',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'ShoppingBag',
  },
  {
    path: ROUTES.EMAIL,
    view: 'email',
    type: 'private',
    title: 'Email Marketing',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Mail',
  },
  {
    path: ROUTES.BIOPAGE,
    view: 'biopage',
    type: 'private',
    title: 'Bio Page',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Link2',
  },

  // =========================================================================
  // SETTINGS ROUTES (Private - Workspace/Team Management)
  // =========================================================================
  {
    path: ROUTES.SETTINGS,
    view: 'settings',
    type: 'private',
    title: 'Settings',
    requiresAuth: true,
    requiresEmailVerified: true,
    showInNav: true,
    icon: 'Settings',
  },
  {
    path: ROUTES.SETTINGS_TEAM,
    view: 'settings',
    type: 'private',
    title: 'Team Settings',
    requiresAuth: true,
    requiresEmailVerified: true,
    parent: ROUTES.SETTINGS,
  },
  {
    path: ROUTES.SETTINGS_BRANDING,
    view: 'settings',
    type: 'private',
    title: 'Branding Settings',
    requiresAuth: true,
    requiresEmailVerified: true,
    parent: ROUTES.SETTINGS,
  },
  {
    path: ROUTES.SETTINGS_SUBSCRIPTION,
    view: 'settings',
    type: 'private',
    title: 'Subscription Settings',
    requiresAuth: true,
    requiresEmailVerified: true,
    parent: ROUTES.SETTINGS,
  },

  // =========================================================================
  // INVITE ROUTE (Public - Accept Team Invitations)
  // =========================================================================
  {
    path: ROUTES.INVITE,
    type: 'public',
    title: 'Accept Invitation',
    requiresAuth: false,
  },

  // =========================================================================
  // AGENCY SIGNUP ROUTE (Public)
  // =========================================================================
  {
    path: ROUTES.AGENCY_SIGNUP,
    type: 'public',
    title: 'Agency Plans',
    requiresAuth: false,
  },

  // =========================================================================
  // AGENCY ROUTES (Private - Requires Agency Owner/Admin Role)
  // =========================================================================
  {
    path: ROUTES.AGENCY,
    view: 'agency',
    type: 'private',
    title: 'Agency Dashboard',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    showInNav: true,
    icon: 'Building2',
  },
  {
    path: ROUTES.AGENCY_OVERVIEW,
    view: 'agency',
    type: 'private',
    title: 'Agency Overview',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_ANALYTICS,
    view: 'agency',
    type: 'private',
    title: 'Agency Analytics',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_BILLING,
    view: 'agency',
    type: 'private',
    title: 'Agency Billing',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_REPORTS,
    view: 'agency',
    type: 'private',
    title: 'Agency Reports',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_NEW_CLIENT,
    view: 'agency',
    type: 'private',
    title: 'New Client',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_ADDONS,
    view: 'agency',
    type: 'private',
    title: 'Agency Add-ons',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_LANDING,
    view: 'agency',
    type: 'private',
    title: 'Agency Landing Editor',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_PLANS,
    view: 'agency',
    type: 'private',
    title: 'Agency Plans',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_CMS,
    view: 'agency',
    type: 'private',
    title: 'Agency CMS',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  {
    path: ROUTES.AGENCY_NAVIGATION,
    view: 'agency',
    type: 'private',
    title: 'Agency Navigation',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'agency_owner', 'agency_admin'],
    parent: ROUTES.AGENCY,
  },
  // =========================================================================
  // ADMIN ROUTES (Private - Requires Admin Role)
  // =========================================================================
  {
    path: ROUTES.SUPERADMIN,
    view: 'superadmin',
    adminView: 'main',
    type: 'admin',
    title: 'Admin Dashboard',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin', 'manager'],
    showInNav: true,
    icon: 'Shield',
  },
  {
    path: ROUTES.ADMIN_ADMINS,
    view: 'superadmin',
    adminView: 'admins',
    type: 'admin',
    title: 'Manage Admins',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_TENANTS,
    view: 'superadmin',
    adminView: 'tenants',
    type: 'admin',
    title: 'Manage Tenants',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_LANGUAGES,
    view: 'superadmin',
    adminView: 'languages',
    type: 'admin',
    title: 'Languages',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_PROMPTS,
    view: 'superadmin',
    adminView: 'prompts',
    type: 'admin',
    title: 'AI Prompts',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_STATS,
    view: 'superadmin',
    adminView: 'stats',
    type: 'admin',
    title: 'Statistics',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin', 'manager'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_SUBSCRIPTIONS,
    view: 'superadmin',
    adminView: 'subscriptions',
    type: 'admin',
    title: 'Subscriptions & AI Credits',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_TEMPLATES,
    view: 'superadmin',
    adminView: 'templates',
    type: 'admin',
    title: 'Templates',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_COMPONENTS,
    view: 'superadmin',
    adminView: 'components',
    type: 'admin',
    title: 'Components',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_IMAGES,
    view: 'superadmin',
    adminView: 'images',
    type: 'admin',
    title: 'Images',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_ASSETS,
    view: 'superadmin',
    adminView: 'admin-assets',
    type: 'admin',
    title: 'Admin Asset Library',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_GLOBAL_ASSISTANT,
    view: 'superadmin',
    adminView: 'global-assistant',
    type: 'admin',
    title: 'Global Assistant',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_DESIGN_TOKENS,
    view: 'superadmin',
    adminView: 'design-tokens',
    type: 'admin',
    title: 'Design Tokens',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_ANALYTICS,
    view: 'superadmin',
    adminView: 'analytics',
    type: 'admin',
    title: 'Analytics',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin', 'manager'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_GLOBAL_SEO,
    view: 'superadmin',
    adminView: 'global-seo',
    type: 'admin',
    title: 'Global SEO',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_APP_INFO,
    view: 'superadmin',
    adminView: 'app-info',
    type: 'admin',
    title: 'App Info',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_CONTENT,
    view: 'superadmin',
    adminView: 'content',
    type: 'admin',
    title: 'Content',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_LANDING_NAVIGATION,
    view: 'superadmin',
    adminView: 'landing-navigation',
    type: 'admin',
    title: 'Landing Navigation',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_LANDING_CHATBOT,
    view: 'superadmin',
    adminView: 'landing-chatbot',
    type: 'admin',
    title: 'Landing Chatbot',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_CHANGELOG,
    view: 'superadmin',
    adminView: 'changelog',
    type: 'admin',
    title: 'Changelog Management',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_GLOBAL_TRACKING_PIXELS,
    view: 'superadmin',
    adminView: 'global-tracking-pixels',
    type: 'admin',
    title: 'Global Tracking Pixels',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_CHATBOT_PROMPTS,
    view: 'superadmin',
    adminView: 'chatbot-prompts',
    type: 'admin',
    title: 'Global Chatbot Prompts',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_EXECUTION_MODE,
    view: 'superadmin',
    adminView: 'execution-mode',
    type: 'admin',
    title: 'Execution Mode',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_NEWS,
    view: 'superadmin',
    adminView: 'news',
    type: 'admin',
    title: 'News & Updates',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_LANDING_EDITOR,
    view: 'superadmin',
    adminView: 'landing-editor',
    type: 'admin',
    title: 'Landing Page Editor',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin', 'admin'],
    parent: ROUTES.SUPERADMIN,
  },
  {
    path: ROUTES.ADMIN_SERVICE_AVAILABILITY,
    view: 'superadmin',
    adminView: 'service-availability',
    type: 'admin',
    title: 'Service Availability',
    requiresAuth: true,
    requiresEmailVerified: true,
    roles: ['owner', 'superadmin'],
    parent: ROUTES.SUPERADMIN,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find route config by path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  // First try exact match
  const exactMatch = routeConfigs.find(r => r.path === path);
  if (exactMatch) return exactMatch;

  // Then try pattern match (for routes with params)
  return routeConfigs.find(route => {
    const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

/**
 * Find route config by view
 */
export function getRouteByView(view: View, adminView?: AdminView): RouteConfig | undefined {
  if (adminView) {
    return routeConfigs.find(r => r.view === view && r.adminView === adminView);
  }
  return routeConfigs.find(r => r.view === view && !r.adminView);
}

/**
 * Build path with params
 */
export function buildPath(path: string, params?: RouteParams): string {
  if (!params) return path;

  let result = path;
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      result = result.replace(`:${key}`, value);
    }
  });
  return result;
}

/**
 * Parse path params
 */
export function parseParams(pattern: string, path: string): RouteParams {
  const params: RouteParams = {};
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const key = part.slice(1);
      params[key] = pathParts[index];
    }
  });

  return params;
}

/**
 * Check if user has access to route
 */
export function hasRouteAccess(
  route: RouteConfig,
  userRole?: string,
  isAuthenticated: boolean = false,
  isEmailVerified: boolean = false
): boolean {
  // Public routes
  if (!route.requiresAuth) return true;

  // Must be authenticated
  if (!isAuthenticated) return false;

  // Check email verification
  if (route.requiresEmailVerified && !isEmailVerified) return false;

  // Check role permissions
  if (route.roles && route.roles.length > 0) {
    return route.roles.includes(userRole || '');
  }

  return true;
}

/**
 * Get nav items for sidebar
 */
export function getNavItems(userRole?: string): RouteConfig[] {
  return routeConfigs.filter(route => {
    if (!route.showInNav) return false;
    if (route.roles && route.roles.length > 0) {
      return route.roles.includes(userRole || '');
    }
    return route.requiresAuth;
  });
}

/**
 * Get admin sub-routes
 */
export function getAdminSubRoutes(userRole?: string): RouteConfig[] {
  return routeConfigs.filter(route => {
    if (route.parent !== ROUTES.SUPERADMIN) return false;
    if (route.roles && route.roles.length > 0) {
      return route.roles.includes(userRole || '');
    }
    return true;
  });
}





