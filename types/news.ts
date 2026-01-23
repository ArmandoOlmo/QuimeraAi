/**
 * News & Updates Types
 * Tipos para el módulo de Noticias y Novedades del Dashboard
 * Similar a "Home cards" de Shopify - tarjetas dinámicas con updates, tips y anuncios
 */

// =============================================================================
// NEWS ITEM (Core Entity)
// =============================================================================

export type NewsStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type NewsCategory =
  | 'update'      // Product updates
  | 'feature'     // New features
  | 'tip'         // Tips & tricks
  | 'announcement'// Important announcements
  | 'tutorial'    // How-to guides
  | 'promotion'   // Promotions/offers
  | 'maintenance' // Maintenance notices
  | 'other';      // Other news

export type NewsTargetType = 'all' | 'roles' | 'plans' | 'tenants';

export interface NewsTargeting {
  type: NewsTargetType;
  roles?: string[];       // ['user', 'admin', 'superadmin']
  plans?: string[];       // ['free', 'pro', 'enterprise']
  tenantIds?: string[];   // Specific tenant IDs
}

export interface NewsCTA {
  label: string;
  url: string;
  isExternal?: boolean;   // Opens in new tab
}

export interface NewsItem {
  id: string;

  // Content
  title: string;
  excerpt: string;        // Short summary (max 200 chars)
  body: string;           // Rich text HTML content

  // Media
  imageUrl?: string;      // Featured image
  videoUrl?: string;      // Video URL (YouTube, Vimeo, or direct)

  // CTA
  cta?: NewsCTA;

  // Classification
  category: NewsCategory;
  tags: string[];

  // Status & Scheduling
  status: NewsStatus;
  publishAt?: string;     // ISO date for scheduled publish
  expireAt?: string;      // ISO date for auto-archive

  // Targeting
  targeting: NewsTargeting;

  // Priority & Display
  featured: boolean;      // Pinned/highlighted
  priority: number;       // Sort order (higher = first)

  // Tracking
  views: number;
  clicks: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;      // User ID
  updatedBy?: string;
}

// =============================================================================
// NEWS USER STATE (Per-user interaction tracking)
// =============================================================================

export interface NewsUserState {
  id: string;
  userId: string;
  newsId: string;

  // Interaction states
  read: boolean;
  readAt?: string;
  dismissed: boolean;
  dismissedAt?: string;
  clicked: boolean;
  clickedAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// NEWS CONTEXT TYPES
// =============================================================================

export interface NewsFilters {
  status?: NewsStatus;
  category?: NewsCategory;
  featured?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface NewsContextType {
  // Super Admin - All news management
  newsItems: NewsItem[];
  isLoading: boolean;
  error: string | null;

  // CRUD Operations
  fetchNews: (filters?: NewsFilters) => Promise<void>;
  createNews: (news: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'>) => Promise<string>;
  updateNews: (id: string, updates: Partial<NewsItem>) => Promise<void>;
  deleteNews: (id: string) => Promise<void>;
  duplicateNews: (id: string) => Promise<string>;

  // Dashboard - User-facing news
  userNews: NewsItem[];      // Filtered for current user
  userNewsStates: Record<string, NewsUserState>;
  isLoadingUserNews: boolean;

  fetchUserNews: () => Promise<void>;
  markAsRead: (newsId: string) => Promise<void>;
  dismissNews: (newsId: string) => Promise<void>;
  trackClick: (newsId: string) => Promise<void>;

  // Stats
  getNewsStats: () => NewsStats;
}

export interface NewsStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  archived: number;
  featured: number;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_NEWS_TARGETING: NewsTargeting = {
  type: 'all',
};

export const DEFAULT_NEWS_ITEM: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  title: '',
  excerpt: '',
  body: '',
  category: 'update',
  tags: [],
  status: 'draft',
  targeting: DEFAULT_NEWS_TARGETING,
  featured: false,
  priority: 0,
  views: 0,
  clicks: 0,
};

// =============================================================================
// CATEGORY LABELS & COLORS
// =============================================================================

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  update: 'Actualización',
  feature: 'Nueva Función',
  tip: 'Tip',
  announcement: 'Anuncio',
  tutorial: 'Tutorial',
  promotion: 'Promoción',
  maintenance: 'Mantenimiento',
  other: 'Otro',
};

export const NEWS_CATEGORY_COLORS: Record<NewsCategory, string> = {
  update: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  feature: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  tip: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  announcement: 'bg-red-500/10 text-red-500 border-red-500/30',
  tutorial: 'bg-green-500/10 text-green-500 border-green-500/30',
  promotion: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
};

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  scheduled: 'Programado',
  archived: 'Archivado',
};

export const NEWS_STATUS_COLORS: Record<NewsStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  published: 'bg-green-500/10 text-green-500 border-green-500/30',
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  archived: 'bg-red-500/10 text-red-500 border-red-500/30',
};
