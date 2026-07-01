
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useAdmin } from '../../contexts/admin';
import { useProject } from '../../contexts/project';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { LogOut, LayoutDashboard, Globe, Settings, ChevronLeft, ChevronRight, ChevronDown, Zap, User as UserIcon, PenTool, Menu as MenuIcon, Sun, Moon, Circle, MessageSquare, Users, Link2, Search, DollarSign, GripVertical, LayoutTemplate, Calendar, X, Wrench, ShoppingBag, Package, FolderTree, ShoppingCart, Tag, TrendingUp, BarChart3, Mail, UserCheck, Lock, Building2, Sparkles, Newspaper, Home, Utensils, AlertTriangle, History, FileText, FolderOpen, Monitor, Shield, type LucideIcon } from 'lucide-react';
import LanguageSelector from '../ui/LanguageSelector';
import { AppButton, AppIcon } from '../ui/system';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import ProjectSwitcher from './ProjectSwitcher';
import ProgressBar3D from '../ui/ProgressBar3D';
import { useSafeTenant } from '../../contexts/tenant';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { useAppLogo, QUIMERA_FULL_LOGO, QUIMERA_FULL_LOGO_LIGHT, QUIMERA_DEFAULT_LOGO } from '../../hooks/useAppLogo';
import { useServiceAccess } from '../../hooks/useServiceAccess';
import { PlatformServiceId } from '../../types/serviceAvailability';
import { PlanFeatures } from '../../types/subscription';
import { UpgradeTrigger } from '../ui/UpgradeModal';
import { isPlatformUnlimitedUser } from '../../services/billing/planCatalog';
import { getAgencyEngineOperatingSystemManifest, type AgencyEngineDashboardTabId } from '../../registry/moduleRegistry';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface DashboardSidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
  hiddenOnDesktop?: boolean;
  defaultCollapsed?: boolean;
}

interface NavItemData {
  id: string;
  icon: LucideIcon;
  label: string;
  view: string;
  route: string;
  disabled?: boolean;
  isFixed?: boolean;
  subView?: string; // Para sub-vistas dentro de un módulo (ej: ecommerce)
  requiredFeature?: keyof PlanFeatures; // Feature del plan requerida para acceder
  upgradeTrigger?: UpgradeTrigger; // Trigger para el modal de upgrade
  serviceId?: PlatformServiceId; // ID del servicio global para control de disponibilidad
  moduleId?: string;
  requiredPermission?: string;
}

const agencyDashboardTabs = getAgencyEngineOperatingSystemManifest().dashboardTabs;

const AGENCY_SIDEBAR_ICONS: Record<AgencyEngineDashboardTabId, LucideIcon> = {
  overview: BarChart3,
  analytics: TrendingUp,
  landing: Globe,
  billing: DollarSign,
  reports: FileText,
  'new-client': UserCheck,
  addons: Package,
  plans: LayoutTemplate,
  cms: PenTool,
  navigation: MenuIcon,
  projects: FolderOpen,
  'white-label': Shield,
  'client-portal': Monitor,
};

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isMobileOpen, onClose, hiddenOnDesktop = false, defaultCollapsed = false }) => {
  const { t } = useTranslation();
  const { user, userDocument, openProfileModal, canAccessSuperAdmin, isUserOwner, loadingAuth, logout } = useAuth();
  const { view, setView, setAdminView, themeMode, setThemeMode, sidebarOrder, setSidebarOrder, setIsOnboardingOpen } = useUI();
  const { activeProjectId } = useProject();
  const { usage: creditsUsage, isLoading: isLoadingCredits } = useCreditsUsage();

  // Check role first (most reliable), then email-based owner check as fallback
  const userRole = isUserOwner ? 'owner' : userDocument?.role;
  const isOwner = isPlatformUnlimitedUser(userRole);
  const hasUnlimitedCredits = creditsUsage?.isUnlimited || isOwner;

  const { navigate, path } = useRouter();
  const tenantContext = useSafeTenant();
  const upgradeContext = useSafeUpgrade();

  // Check if multi-tenant is available (user has tenants)
  const showWorkspaceSwitcher = tenantContext && tenantContext.userTenants.length > 0;

  // Handler for upgrade button
  const handleUpgradeClick = () => {
    if (upgradeContext) {
      upgradeContext.openUpgradeModal('generic');
    }
  };

  const planNeedsAttention = !isLoadingCredits && !isOwner && (
    creditsUsage?.requiresPayment ||
    ['expired', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'cancelled', 'canceled'].includes(creditsUsage?.status || '')
  );
  const creditsUsed = creditsUsage?.used ?? 0;
  const creditsLimit = creditsUsage?.limit ?? 0;
  const creditsRemaining = creditsUsage?.remaining ?? 0;
  const formattedCreditsUsed = creditsUsed.toLocaleString();
  const formattedCreditsLimit = creditsLimit.toLocaleString();
  const formattedCreditsRemaining = creditsRemaining.toLocaleString();
  const unlimitedCreditsLabel = t('common.unlimited', 'Ilimitado');
  const displayCreditsUsed = hasUnlimitedCredits ? '∞' : formattedCreditsUsed;
  const displayCreditsLimit = hasUnlimitedCredits ? '∞' : formattedCreditsLimit;
  const displayCreditsRemaining = hasUnlimitedCredits ? unlimitedCreditsLabel : formattedCreditsRemaining;
  const creditsRemainingLabel = hasUnlimitedCredits
    ? unlimitedCreditsLabel
    : `${displayCreditsRemaining} ${t('dashboard.creditsRemaining', 'restantes')}`;
  const creditsAvailablePercentage = hasUnlimitedCredits
    ? 100
    : creditsLimit > 0
      ? Math.max(0, Math.min(Math.round((creditsRemaining / creditsLimit) * 100), 100))
      : 0;
  const compactCreditsRemaining = hasUnlimitedCredits ? '∞' : new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: creditsRemaining >= 1000 ? 1 : 0,
  }).format(creditsRemaining);
  const creditsTitle = isLoadingCredits
    ? t('common.loading')
    : hasUnlimitedCredits
      ? `${unlimitedCreditsLabel} (${displayCreditsUsed}/${displayCreditsLimit})`
      : `${formattedCreditsRemaining} ${t('dashboard.creditsRemaining', 'créditos restantes')} (${formattedCreditsUsed}/${formattedCreditsLimit})`;

  const handlePlanAttentionClick = () => {
    navigate(ROUTES.SETTINGS_SUBSCRIPTION);
    onClose();
  };

  const serviceAccess = useServiceAccess();

  // Get global app logo
  const { logoUrl: appLogoUrl } = useAppLogo();

  // Default to expanded on desktop, unless defaultCollapsed is true
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // State for collapsible sections (true = collapsed/closed by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    websites: true,
    ecommerce: true,
    tools: true,
    agency: true,
  });

  // State for footer collapse (true = collapsed, only user visible)
  const [isFooterCollapsed, setIsFooterCollapsed] = useState(false);

  const getEcommerceSubViewFromPath = (currentPath: string): string | null => {
    if (currentPath === ROUTES.ECOMMERCE) return 'overview';
    if (!currentPath.startsWith(`${ROUTES.ECOMMERCE}/`)) return null;
    return currentPath.slice(ROUTES.ECOMMERCE.length + 1).split('/')[0] || null;
  };

  // Estado para trackear la sub-vista activa de ecommerce
  const [activeEcommerceSubView, setActiveEcommerceSubView] = useState<string>(() => {
    return getEcommerceSubViewFromPath(window.location.pathname) || localStorage.getItem('ecommerceActiveView') || 'overview';
  });

  // Escuchar cambios de la sub-vista de ecommerce
  useEffect(() => {
    const handleEcommerceViewChange = (event: CustomEvent<string>) => {
      setActiveEcommerceSubView(event.detail);
    };

    window.addEventListener('ecommerceViewChange', handleEcommerceViewChange as EventListener);
    return () => {
      window.removeEventListener('ecommerceViewChange', handleEcommerceViewChange as EventListener);
    };
  }, []);

  const currentEcommerceSubView = getEcommerceSubViewFromPath(path) || activeEcommerceSubView;

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Touch gesture state for swipe-to-close
  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle touch start for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't start drag if touching interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [role="button"]')) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  // Handle touch move for swipe gesture
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.touches[0].clientX;
    // Only start dragging after moving at least 10px (threshold to allow taps)
    if (Math.abs(diff) > 10 && !isDragging) {
      setIsDragging(true);
    }
    if (!isDragging) return;
    touchCurrentX.current = e.touches[0].clientX;
    // Only allow dragging left (to close)
    if (diff > 0) {
      setDragOffset(Math.min(diff, 300));
    }
  }, [isDragging]);

  // Handle touch end for swipe gesture
  const handleTouchEnd = useCallback(() => {
    // If dragged more than 100px, close the sidebar
    if (isDragging && dragOffset > 100) {
      onClose();
    }
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, onClose]);

  // Fixed dashboard item (always visible at top)
  const dashboardItem: NavItemData = { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard.title'), view: 'dashboard', route: ROUTES.DASHBOARD, isFixed: true };

  // Websites section items
  const versionHistoryRoute = activeProjectId
    ? ROUTES.PROJECT_VERSION_HISTORY.replace(':projectId', activeProjectId)
    : ROUTES.VERSION_HISTORY;
  const websiteItems: NavItemData[] = [
    { id: 'websites', icon: Globe, label: t('dashboard.myWebsites'), view: 'websites', route: ROUTES.WEBSITES },
    { id: 'version-history', icon: History, label: t('versionHistory.nav', 'Version History'), view: 'version-history', route: versionHistoryRoute },
    { id: 'templates', icon: LayoutTemplate, label: t('dashboard.templates'), view: 'templates', route: ROUTES.TEMPLATES, serviceId: 'templates', moduleId: 'templates-library' },
    { id: 'navigation', icon: MenuIcon, label: t('dashboard.navigation'), view: 'navigation', route: ROUTES.NAVIGATION },
    { id: 'cms', icon: PenTool, label: t('dashboard.contentManager'), view: 'cms', route: ROUTES.CMS, requiredFeature: 'cmsEnabled', upgradeTrigger: 'generic', serviceId: 'cms', moduleId: 'cms-engine' },
    { id: 'domains', icon: Link2, label: t('domains.title'), view: 'domains', route: ROUTES.DOMAINS, requiredFeature: 'customDomains', upgradeTrigger: 'domains', serviceId: 'domains', moduleId: 'domains-management' },
    { id: 'seo', icon: Search, label: t('dashboard.seoAndMeta'), view: 'seo', route: ROUTES.SEO },
    { id: 'biopage', icon: Link2, label: t('bioPage.title', 'Bio Page'), view: 'biopage', route: ROUTES.BIOPAGE, serviceId: 'bioPage', moduleId: 'bio-page-engine' },
  ];

  // Ecommerce section items (sección independiente con árbol de componentes)
  const ecommerceItems: NavItemData[] = [
    { id: 'ecommerce-overview', icon: BarChart3, label: t('ecommerce.overview', 'Vista General'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'overview', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-storefront', icon: LayoutTemplate, label: t('ecommerce.storefrontLabel', 'Tienda online'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/storefront`, subView: 'storefront', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-products', icon: Package, label: t('ecommerce.products', 'Productos'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/products`, subView: 'products', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-categories', icon: FolderTree, label: t('ecommerce.categories', 'Categorías'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/categories`, subView: 'categories', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-orders', icon: ShoppingCart, label: t('ecommerce.orders', 'Pedidos'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/orders`, subView: 'orders', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-customers', icon: Users, label: t('ecommerce.customers', 'Clientes'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/customers`, subView: 'customers', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-store-users', icon: UserCheck, label: t('storeUsers.title', 'Usuarios Registrados'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/store-users`, subView: 'store-users', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-discounts', icon: Tag, label: t('ecommerce.discounts', 'Descuentos'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/discounts`, subView: 'discounts', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-analytics', icon: TrendingUp, label: t('ecommerce.analyticsTitle', 'Analytics'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/analytics`, subView: 'analytics', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
    { id: 'ecommerce-settings', icon: Settings, label: t('ecommerce.settings', 'Configuración'), view: 'ecommerce', route: `${ROUTES.ECOMMERCE}/settings`, subView: 'settings', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce', moduleId: 'ecommerce-engine' },
  ];

  // Tools section items (settings removed - placed outside section)
  const toolsItems: NavItemData[] = [
    { id: 'ai-assistant', icon: MessageSquare, label: t('dashboard.quimeraChat'), view: 'ai-assistant', route: ROUTES.AI_ASSISTANT, requiredFeature: 'chatbotEnabled', upgradeTrigger: 'chatbot', serviceId: 'chatbot', moduleId: 'chatbot-engine' },
    { id: 'leads', icon: Users, label: t('leads.title'), view: 'leads', route: ROUTES.LEADS, requiredFeature: 'crmEnabled', upgradeTrigger: 'generic', serviceId: 'crm', moduleId: 'crm-leads' },
    { id: 'email', icon: Mail, label: t('email.title', 'Email'), view: 'email', route: ROUTES.EMAIL, requiredFeature: 'emailMarketing', upgradeTrigger: 'generic', serviceId: 'emailMarketing', moduleId: 'email-marketing' },
    { id: 'assets', icon: Zap, label: t('sidebar.images', 'Imágenes'), view: 'assets', route: ROUTES.ASSETS, serviceId: 'aiFeatures', moduleId: 'media-assets' }, // AI Features
    { id: 'content-studio', icon: Sparkles, label: t('contentStudio.title', 'Content Studio'), view: 'content-studio', route: ROUTES.CONTENT_STUDIO, requiredFeature: 'aiImageGeneration', upgradeTrigger: 'generic', serviceId: 'aiFeatures', moduleId: 'contentStudio' },
    { id: 'finance', icon: DollarSign, label: t('editor.finance'), view: 'finance', route: ROUTES.FINANCE, serviceId: 'finance', moduleId: 'finance' },
    { id: 'appointments', icon: Calendar, label: t('appointments.title'), view: 'appointments', route: ROUTES.APPOINTMENTS, serviceId: 'appointments', moduleId: 'appointments-engine' },
    { id: 'restaurants', icon: Utensils, label: t('restaurants.title', 'Restaurants'), view: 'restaurants', route: ROUTES.RESTAURANTS, upgradeTrigger: 'generic', serviceId: 'restaurants', moduleId: 'restaurant-engine' },
    { id: 'real-estate', icon: Home, label: t('realty.title'), view: 'real-estate', route: ROUTES.REAL_ESTATE, requiredFeature: 'realEstateModule', upgradeTrigger: 'generic', serviceId: 'realEstate', moduleId: 'real-estate-engine' },
  ];

  // Blog - standalone outside tools section, above agency
  const blogItem: NavItemData = { id: 'blog-hub', icon: Newspaper, label: t('dashboard.blogHub', 'Blog'), view: 'blog-hub', route: ROUTES.BLOG_HUB, serviceId: 'cms', moduleId: 'cms-engine' };

  // Workspace Settings - standalone outside tools section, before Super Admin
  const settingsItem: NavItemData = { id: 'settings', icon: Settings, label: t('sidebar.workspace', 'Workspace'), view: 'settings', route: ROUTES.SETTINGS };

  const agencyItems: NavItemData[] = agencyDashboardTabs.map(tab => ({
    id: `agency-${tab.id}`,
    icon: AGENCY_SIDEBAR_ICONS[tab.id],
    label: t(tab.labelKey, tab.label),
    view: 'agency',
    route: tab.route,
    serviceId: 'agency',
    moduleId: tab.moduleId,
    requiredFeature: 'agencyModule',
    requiredPermission: tab.requiredPermission,
    upgradeTrigger: 'generic',
  }));

  // All items combined for backwards compatibility with drag-and-drop
  const defaultNavItems: NavItemData[] = [dashboardItem, ...websiteItems, ...ecommerceItems, ...toolsItems, blogItem, ...agencyItems];

  // Helper function to reorder items based on saved order
  const getOrderedItems = (orderIds: string[]): NavItemData[] => {
    if (orderIds.length === 0) return defaultNavItems;

    const ordered = orderIds
      .map((id: string) => defaultNavItems.find(item => item.id === id))
      .filter((item: NavItemData | undefined): item is NavItemData => item !== undefined);

    // Add any new items that weren't in the saved order
    const newItems = defaultNavItems.filter(
      item => !orderIds.includes(item.id)
    );

    return [...ordered, ...newItems];
  };

  // Load order from context (synced from Supabase) or use default
  const [navItems, setNavItems] = useState<NavItemData[]>(() => {
    return getOrderedItems(sidebarOrder);
  });

  // Sync navItems when sidebarOrder changes (e.g., loaded from Supabase)
  useEffect(() => {
    if (sidebarOrder.length > 0) {
      setNavItems(getOrderedItems(sidebarOrder));
    }
  }, [sidebarOrder]);

  // Update labels when language changes
  useEffect(() => {
    setNavItems(prev => prev.map(item => {
      const defaultItem = defaultNavItems.find(d => d.id === item.id);
      return defaultItem ? { ...item, label: defaultItem.label } : item;
    }));
  }, [t]);

  // Save order to context (which syncs to localStorage and Supabase)
  const saveOrder = (items: NavItemData[]) => {
    const orderIds = items.map(item => item.id);
    setSidebarOrder(orderIds);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build the complete list of sortable IDs — must include every ID rendered as a SortableNavItem
  const allSortableIds = useMemo(() => {
    const ids = navItems.map(item => item.id);
    // Add standalone items that are rendered as SortableNavItem but aren't in navItems
    if (!ids.includes(blogItem.id)) ids.push(blogItem.id);
    if (!ids.includes(settingsItem.id)) ids.push(settingsItem.id);
    if (canAccessSuperAdmin && !ids.includes('superadmin')) ids.push('superadmin');
    return ids;
  }, [navItems, canAccessSuperAdmin]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Don't allow moving items before the fixed item (dashboard)
        if (newIndex === 0 && items[0].isFixed) {
          return items;
        }

        // Don't allow moving the fixed item
        if (oldIndex === 0 && items[0].isFixed) {
          return items;
        }

        const newItems = arrayMove(items, oldIndex, newIndex);
        saveOrder(newItems);
        return newItems;
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const getItemAccessDecision = (item: NavItemData) => {
    if (item.moduleId) {
      return serviceAccess.canAccessModule(item.moduleId, {
        serviceId: item.serviceId,
        featureKey: item.requiredFeature,
        requiredPermission: item.requiredPermission,
      });
    }
    if (item.serviceId || item.requiredFeature || item.requiredPermission) {
      return serviceAccess.resolveAccess({
        serviceId: item.serviceId,
        featureKey: item.requiredFeature,
        requiredPermission: item.requiredPermission,
      });
    }
    return { allowed: true, reasonCode: 'allowed' as const, message: '' };
  };

  const hiddenAccessReasonCodes = new Set([
    'service_not_public',
    'service_in_development',
    'module_disabled',
  ]);

  const isItemVisible = (item: NavItemData): boolean => {
    const requiresServiceAvailability = Boolean(item.serviceId || item.moduleId);
    if (serviceAccess.isLoading && requiresServiceAvailability) return false;

    const accessDecision = getItemAccessDecision(item);
    return !hiddenAccessReasonCodes.has(accessDecision.reasonCode);
  };

  // Helper: Check if any items in a section are accessible
  const hasAccessibleItems = (items: NavItemData[]): boolean => {
    return items.some(isItemVisible);
  };

  // Check if a route is active
  const isRouteActive = (route: string): boolean => {
    return path === route || path.startsWith(route + '/');
  };

  // Sortable Nav Item Component - Optimized for mobile touch targets
  const SortableNavItem = ({ item, index = 0 }: { item: NavItemData; index?: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isDraggingItem,
    } = useSortable({
      id: item.id,
      disabled: item.isFixed,
    });

    // Note: Service availability filtering is done at the parent level (before mapping)
    // to avoid violating React hooks rules with conditional early returns

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDraggingItem ? 0.5 : 1,
    };

    // Para items de ecommerce, verificar también el subView
    const isActive = item.subView
      ? isRouteActive(ROUTES.ECOMMERCE) && currentEcommerceSubView === item.subView
      : isRouteActive(item.route);
    const Icon = item.icon;

    // En móvil siempre mostrar expandido cuando el sidebar está abierto
    const showExpanded = !isCollapsed || isMobileOpen;

    const accessDecision = getItemAccessDecision(item);
    const isLocked = !serviceAccess.isLoading && !accessDecision.allowed;
    const minPlanRequired = isLocked ? (accessDecision.minimumPlan || accessDecision.currentPlan || '') : '';
    const navItemButtonClasses = [
      'group relative mb-1 flex !h-auto items-center rounded-[var(--q-radius-md)] border border-transparent !px-3 !py-2 transition-[background-color,border-color,color,box-shadow] duration-150 ease-out touch-manipulation active:scale-100',
      'min-h-[40px] md:min-h-[36px] md:px-3 md:py-2',
      showExpanded ? 'w-full justify-start' : 'mx-auto w-12 justify-center',
      isLocked
        ? 'text-q-text-muted/60 hover:border-sidebar-control-border hover:bg-sidebar-control-hover'
        : isActive
          ? showExpanded
            ? '!bg-q-accent text-q-text-on-accent font-semibold shadow-[var(--q-shadow-card)]'
            : 'border-q-accent/35 !bg-q-accent/18 text-q-text'
          : showExpanded
            ? 'text-q-text-muted hover:border-sidebar-control-border hover:bg-sidebar-control-hover hover:text-q-text active:bg-sidebar-control-active'
            : 'text-q-text-muted hover:border-sidebar-control-border hover:bg-sidebar-control-hover hover:text-q-text',
      item.disabled ? 'opacity-50 cursor-not-allowed' : '',
      item.isFixed ? '' : 'cursor-pointer',
    ].filter(Boolean).join(' ');
    const dragHandleClasses = [
      'hidden md:block absolute left-0 top-1/2 -translate-y-1/2 p-1',
      'cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-opacity duration-150',
    ].join(' ');
    const iconClasses = [
      showExpanded ? (item.isFixed ? 'mr-3' : 'md:ml-5 mr-3') : '',
      'flex-shrink-0 transition-colors duration-150',
      isLocked ? 'opacity-50' : '',
    ].filter(Boolean).join(' ');
    const labelClasses = [
      'text-[15px] md:text-sm font-medium whitespace-nowrap overflow-hidden transition-colors duration-150 flex-1 text-left',
      isLocked ? 'opacity-60' : '',
    ].filter(Boolean).join(' ');

    const handleNavClick = () => {
      // If locked, show upgrade modal instead of navigating
      if (isLocked) {
        if (upgradeContext && accessDecision.upgradeRequired !== false) {
          upgradeContext.openUpgradeModal(item.upgradeTrigger || 'generic');
        }
        onClose(); // Close mobile menu
        return;
      }

      if (item.view === 'superadmin') {
        setAdminView('main');
      }
      // Si tiene subView (ej: ecommerce), guardarlo en localStorage y actualizar estado local
      if (item.subView) {
        localStorage.setItem('ecommerceActiveView', item.subView);
        setActiveEcommerceSubView(item.subView);
      }
      // Navigate using router
      navigate(item.route);
      // Also update EditorContext for backwards compatibility
      setView(item.view as any);
      // Close mobile menu
      onClose();
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative group/drag"
      >
        <AppButton
          variant="ghost"
          size="md"
          onClick={handleNavClick}
          disabled={item.disabled}
          className={navItemButtonClasses}
          aria-label={isLocked ? `${item.label} (${accessDecision.message || t('common.upgrade')})` : item.label}
          aria-current={isActive ? 'page' : undefined}
          title={isLocked ? `${item.label} - ${accessDecision.message}` : (!showExpanded ? item.label : undefined)}
        >
          {/* Drag handle - Hidden on mobile for cleaner experience */}
          {showExpanded && !item.isFixed && !isLocked && (
            <div
              {...attributes}
              {...listeners}
              className={dragHandleClasses}
            >
              <AppIcon icon={GripVertical} size="sm" tone="muted" />
            </div>
          )}

          <AppIcon
            icon={Icon}
            size="md"
            strokeWidth={isActive ? 2.25 : 2}
            className={iconClasses}
          />

          {showExpanded && (
            <span className={labelClasses}>
              {item.label}
            </span>
          )}

          {/* Lock icon for locked features */}
          {isLocked && showExpanded && (
            <div className="flex items-center gap-1 ml-auto">
              <AppIcon icon={Lock} size="xs" tone="muted" />
              <span className="text-[10px] font-semibold text-q-accent uppercase tracking-wider">
                {minPlanRequired}
              </span>
            </div>
          )}

          {/* Lock icon for collapsed sidebar */}
          {isLocked && !showExpanded && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-q-accent rounded-full flex items-center justify-center">
              <AppIcon icon={Lock} size="xs" className="text-primary-foreground" />
            </div>
          )}

          {/* Active indicator for mobile */}
          {isActive && showExpanded && !isLocked && (
            <div className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-q-text-on-accent/80" />
          )}
        </AppButton>
      </div>
    );
  };

  const sidebarSectionButtonClasses = 'w-full !h-auto justify-between !px-3 !py-2.5 rounded-[var(--q-radius-md)] border border-transparent text-q-text-muted hover:border-sidebar-control-border hover:bg-sidebar-control-hover hover:text-q-text active:bg-sidebar-control-active transition-[background-color,border-color,color] duration-150 ease-out active:scale-100';
  const sidebarSectionIconLabelClasses = 'flex items-center gap-2';
  const sidebarSectionLabelClasses = 'text-xs font-bold uppercase tracking-wider';
  const sidebarSectionChevronClasses = (isSectionCollapsed: boolean) =>
    `transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : 'rotate-0'}`;
  const sidebarNestedListClasses = (isSectionCollapsed: boolean) =>
    `overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${isSectionCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`;
  const sidebarNestedListInnerClasses = 'pl-2 border-l border-divider ml-4 mt-1';

  return (
    <>
      {/* Mobile Overlay - Enhanced with blur and tap feedback */}
      <div
        className={`
          fixed inset-0 bg-q-text/60 backdrop-blur-sm z-40 md:hidden
          transition-opacity duration-200 ease-out
          ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar wrapper for proper positioning of toggle button */}
      <div className={`
        relative flex-shrink-0 h-screen z-50
        ${hiddenOnDesktop ? 'md:hidden' : ''}
        ${isDragging ? '' : 'transition-[width] duration-200 ease-out'}
        ${!isMobileOpen && isCollapsed ? 'md:w-[var(--q-layout-sidebar-collapsed-width)]' : ''}
        ${!isMobileOpen && !isCollapsed ? 'md:w-[var(--q-layout-sidebar-width)]' : ''}
      `}>
        <aside
          ref={sidebarRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            setIsDragging(false);
            setDragOffset(0);
          }}
          className={`
              quimera-dashboard-sidebar-shell fixed md:relative z-50 h-[100dvh] md:h-full bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl border-r border-sidebar-border
              shadow-[var(--shadow-elevated)] md:shadow-none flex flex-col
              ${isDragging ? '' : 'transition-transform duration-200 ease-out'}
              ${isMobileOpen ? 'translate-x-0 w-[85vw] max-w-[320px]' : '-translate-x-full md:translate-x-0'}
              md:w-full
          `}
          style={isMobileOpen && isDragging && dragOffset > 0 ? {
            transform: `translateX(-${dragOffset}px)`,
          } : undefined}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Header / Logo - Enhanced for mobile */}
          <div className="relative h-[72px] md:h-[80px] flex items-center justify-between px-4 md:px-0 md:justify-center border-b border-divider md:border-none flex-shrink-0">
            <div
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className={`flex items-center gap-3 transition-[padding,gap] duration-200 cursor-pointer ${isCollapsed ? 'md:px-0 md:justify-center md:gap-0' : 'md:px-6'}`}
            >
              {/* Logo - Always show Quimera.ai branding in dashboard sidebar.
                  White Label branding (tenant.branding) is only for client-facing views
                  (checkout page, agency landing, client portal).
                  Collapsed: QUIMERA_DEFAULT_LOGO (icon only).
                  Expanded: QUIMERA_FULL_LOGO (image with integrated text). */}
              <img
                src={isCollapsed && !isMobileOpen ? QUIMERA_DEFAULT_LOGO : (themeMode === 'light' ? QUIMERA_FULL_LOGO_LIGHT : QUIMERA_FULL_LOGO)}
                alt="Quimera.ai"
                className={`object-contain flex-shrink-0 transition-[width,height,max-width] duration-200 ${isCollapsed && !isMobileOpen ? 'w-10 h-10' : 'h-10 w-auto max-w-[180px]'}`}
                height={40}
                loading="eager"
                decoding="async"
              />
            </div>

            {/* Mobile Close Button - Touch optimized (min 44px) */}
            <AppButton
              variant="icon"
              size="icon-md"
              onClick={onClose}
              className="md:hidden !h-11 !w-11 !rounded-full
                          text-q-text-muted hover:text-q-text hover:bg-sidebar-control-hover
                          transition-colors duration-150 active:scale-100 touch-manipulation flex-shrink-0"
              aria-label={t('common.close')}
            >
              <AppIcon icon={X} size="lg" />
            </AppButton>
          </div>

          {/* Workspace Switcher - Multi-tenant support */}
          {showWorkspaceSwitcher && (
            <div className={`px-3 md:px-4 py-2 border-b border-divider ${isCollapsed && !isMobileOpen ? 'hidden md:block' : ''}`}>
              <WorkspaceSwitcher
                collapsed={isCollapsed && !isMobileOpen}
                onCreateWorkspace={() => {
                  // Navigate to workspace creation or open modal
                  navigate('/dashboard/settings/workspaces');
                  onClose();
                }}
              />
            </div>
          )}

          {/* Project Switcher - Global project selection */}
          <div className={`px-3 md:px-4 py-2 border-b border-divider ${isCollapsed && !isMobileOpen ? 'hidden md:block' : ''}`}>
            <ProjectSwitcher
              collapsed={isCollapsed && !isMobileOpen}
              onCreateProject={() => {
                // Open onboarding wizard for new project
                setIsOnboardingOpen(true);
                onClose();
              }}
            />
          </div>

          {/* Navigation - Optimized for mobile with momentum scroll */}
          <nav
            className="flex-1 min-h-0 px-3 md:px-4 py-4 md:py-6 space-y-1 md:space-y-2 overflow-y-auto overscroll-contain
                     scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
                     [-webkit-overflow-scrolling:touch]"
            role="navigation"
            aria-label="Main navigation"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={allSortableIds}
                strategy={verticalListSortingStrategy}
              >
                {/* Dashboard - Fixed at top */}
                <SortableNavItem item={dashboardItem} index={0} />

                {/* When sidebar is collapsed (and not mobile open), show all items as flat list like before */}
                {isCollapsed && !isMobileOpen ? (
                  <>
                    {/* Separator */}
                    <div className="my-2 border-t border-divider mx-2" />
                    {/* Show all items directly with drag and drop - filtered by service availability */}
                    {[...websiteItems, ...ecommerceItems, ...toolsItems]
                      .filter(isItemVisible)
                      .map((item, index) => (
                        <SortableNavItem key={item.id} item={item} index={index + 1} />
                      ))}
                    {/* Blog - standalone */}
                    <div className="my-2 border-t border-divider mx-2" />
                    {isItemVisible(blogItem) && (
                      <SortableNavItem item={blogItem} index={websiteItems.length + ecommerceItems.length + toolsItems.length + 1} />
                    )}
                    {/* Agency surfaces from canonical manifest */}
                    {agencyItems.filter(isItemVisible).map((item, index) => (
                      <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + ecommerceItems.length + toolsItems.length + 2} />
                    ))}
                    {/* Workspace Settings - standalone before Super Admin */}
                    <SortableNavItem item={settingsItem} index={websiteItems.length + ecommerceItems.length + toolsItems.length + agencyItems.length + 3} />
                  </>
                ) : (
                  <>
                    {/* Websites Section - Collapsible Drawer */}
                    <div className="mt-3">
                      <AppButton
                        variant="ghost"
                        size="md"
                        onClick={() => toggleSection('websites')}
                        className={sidebarSectionButtonClasses}
                        aria-expanded={!collapsedSections.websites}
                      >
                        <div className={sidebarSectionIconLabelClasses}>
                          <AppIcon icon={Globe} size="md" />
                          <span className={sidebarSectionLabelClasses}>{t('dashboard.websitesSection')}</span>
                        </div>
                        <AppIcon
                          icon={ChevronDown}
                          size="sm"
                          className={sidebarSectionChevronClasses(collapsedSections.websites)}
                        />
                      </AppButton>
                      <div
                        className={sidebarNestedListClasses(collapsedSections.websites)}
                      >
                        <div className={sidebarNestedListInnerClasses}>
                          {websiteItems.filter(isItemVisible).map((item, index) => (
                            <SortableNavItem key={item.id} item={item} index={index + 1} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Ecommerce Section - Collapsible Drawer (only show if any items accessible) */}
                    {hasAccessibleItems(ecommerceItems) && (
                      <div className="mt-3">
                        <AppButton
                          variant="ghost"
                          size="md"
                          onClick={() => toggleSection('ecommerce')}
                          className={sidebarSectionButtonClasses}
                          aria-expanded={!collapsedSections.ecommerce}
                        >
                          <div className={sidebarSectionIconLabelClasses}>
                            <AppIcon icon={ShoppingBag} size="md" />
                            <span className={sidebarSectionLabelClasses}>{t('dashboard.ecommerceSection')}</span>
                          </div>
                          <AppIcon
                            icon={ChevronDown}
                            size="sm"
                            className={sidebarSectionChevronClasses(collapsedSections.ecommerce)}
                          />
                        </AppButton>
                        <div
                          className={sidebarNestedListClasses(collapsedSections.ecommerce)}
                        >
                          <div className={sidebarNestedListInnerClasses}>
                            {ecommerceItems.filter(isItemVisible).map((item, index) => (
                              <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + 1} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tools Section - Collapsible Drawer (only show if any items accessible) */}
                    {hasAccessibleItems(toolsItems) && (
                      <div className="mt-3">
                        <AppButton
                          variant="ghost"
                          size="md"
                          onClick={() => toggleSection('tools')}
                          className={sidebarSectionButtonClasses}
                          aria-expanded={!collapsedSections.tools}
                        >
                          <div className={sidebarSectionIconLabelClasses}>
                            <AppIcon icon={Wrench} size="md" />
                            <span className={sidebarSectionLabelClasses}>{t('dashboard.toolsSection')}</span>
                          </div>
                          <AppIcon
                            icon={ChevronDown}
                            size="sm"
                            className={sidebarSectionChevronClasses(collapsedSections.tools)}
                          />
                        </AppButton>
                        <div
                          className={sidebarNestedListClasses(collapsedSections.tools)}
                        >
                          <div className={sidebarNestedListInnerClasses}>
                            {toolsItems.filter(isItemVisible).map((item, index) => (
                              <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + ecommerceItems.length + 1} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Blog - Standalone above Agency */}
                    <div className={`my-3 md:my-4 border-t border-divider ${isCollapsed && !isMobileOpen ? 'mx-2' : 'mx-0'}`} />
                    {isItemVisible(blogItem) && (
                      <SortableNavItem
                        item={blogItem}
                        index={websiteItems.length + ecommerceItems.length + toolsItems.length + 1}
                      />
                    )}

                    {/* Agency Section - canonical Agency Engine surfaces */}
                    {hasAccessibleItems(agencyItems) && (
                      <div className="mt-3">
                        <AppButton
                          variant="ghost"
                          size="md"
                          onClick={() => toggleSection('agency')}
                          className={sidebarSectionButtonClasses}
                          aria-expanded={!collapsedSections.agency}
                        >
                          <div className={sidebarSectionIconLabelClasses}>
                            <AppIcon icon={Building2} size="md" />
                            <span className={sidebarSectionLabelClasses}>{t('dashboard.agencySection', 'Agencia')}</span>
                          </div>
                          <AppIcon
                            icon={ChevronDown}
                            size="sm"
                            className={sidebarSectionChevronClasses(collapsedSections.agency)}
                          />
                        </AppButton>
                        <div
                          className={sidebarNestedListClasses(collapsedSections.agency)}
                        >
                          <div className={sidebarNestedListInnerClasses}>
                            {agencyItems.filter(isItemVisible).map((item, index) => (
                              <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + ecommerceItems.length + toolsItems.length + 2} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Workspace Settings - Standalone outside tools section */}
                    <SortableNavItem
                      item={settingsItem}
                      index={websiteItems.length + ecommerceItems.length + toolsItems.length + 3}
                    />
                  </>
                )}

                {/* Panel de administración solo para roles autorizados (owner, superadmin, admin, manager) */}
                {canAccessSuperAdmin && (
                  <>
                    <div className={`my-3 md:my-4 border-t border-divider ${isCollapsed && !isMobileOpen ? 'mx-2' : 'mx-0'}`} />
                    <SortableNavItem
                      item={{
                        id: 'superadmin',
                        icon: Settings,
                        label: t('sidebar.admin', 'Admin'),
                        view: 'superadmin',
                        route: ROUTES.SUPERADMIN,
                      }}
                      index={navItems.length}
                    />
                  </>
                )}
              </SortableContext>
            </DndContext>
          </nav>

          {/* Footer / User Profile / Theme - Optimized for mobile */}
          <div className="quimera-dashboard-sidebar-footer flex-shrink-0 border-t border-divider bg-q-surface/70 backdrop-blur-md relative">

            {/* Footer Toggle Button - Small circle at top center */}
            {(!isCollapsed || isMobileOpen) && (
              <AppButton
                variant="icon"
                size="icon-sm"
                onClick={() => setIsFooterCollapsed(!isFooterCollapsed)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 !size-6 !h-6 !w-6 !rounded-full !p-0 !bg-q-surface border border-border-subtle flex items-center justify-center !text-q-text-muted hover:!bg-sidebar-control-hover hover:!text-q-text hover:border-sidebar-control-border transition-colors duration-150 active:scale-100 shadow-[var(--shadow-card)]"
                aria-label={isFooterCollapsed ? t('common.expandFooter', 'Expandir') : t('common.collapseFooter', 'Colapsar')}
                aria-expanded={!isFooterCollapsed}
              >
                <AppIcon
                  icon={ChevronDown}
                  size="xs"
                  className={`transition-transform duration-200 ${isFooterCollapsed ? 'rotate-180' : 'rotate-0'}`}
                />
              </AppButton>
            )}

            {/* Collapsible content wrapper */}
            <div className={`p-3 pb-4 md:p-4 md:pb-4 transition-[padding] duration-200 ease-out ${isFooterCollapsed && !isCollapsed && (!isMobileOpen || isMobileOpen) ? 'pt-4' : ''}`}>

              {isCollapsed && !isMobileOpen && (
                <div className="mb-3 flex justify-center">
                  <AppButton
                    variant="secondary"
                    size="icon-md"
                    onClick={() => setIsCollapsed(false)}
                    className="flex !h-11 !w-11 flex-col items-center justify-center rounded-[var(--q-radius-md)] border border-sidebar-control-border !bg-sidebar-control !p-0 !text-q-accent transition-colors duration-150 hover:border-sidebar-control-border hover:!bg-sidebar-control-hover active:scale-100"
                    title={creditsTitle}
                    aria-label={creditsTitle}
                    data-testid="sidebar-credits-compact"
                  >
                    <AppIcon icon={Zap} size="sm" className="fill-current" />
                    <span className="mt-0.5 max-w-full px-0.5 text-[9px] font-bold leading-none">
                      {isLoadingCredits ? '...' : compactCreditsRemaining}
                    </span>
                  </AppButton>
                </div>
              )}

              {/* Theme + Language (single compact bar) - Collapsible */}
              <div className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out ${isFooterCollapsed || (isCollapsed && !isMobileOpen)
                ? 'max-h-0 opacity-0 mb-0'
                : 'max-h-20 opacity-100 mb-3'
                }`}>
                <div className="flex items-center justify-between gap-2 rounded-[var(--q-radius-md)] border border-sidebar-control-border bg-sidebar-control p-1.5">
                  {/* Theme */}
                  <div className="flex items-center gap-1">
                    <AppButton
                      variant="icon"
                      size="icon-md"
                      onClick={() => setThemeMode('light')}
                      className={`!size-9 !h-9 !w-9 !rounded-lg !p-0 flex items-center justify-center transition-colors duration-150 active:scale-100 ${themeMode === 'light'
                        ? '!bg-q-surface !text-q-accent shadow-[var(--shadow-card)]'
                        : '!text-q-text-muted hover:!text-q-text hover:!bg-sidebar-control-hover'
                        }`}
                      title={t('common.lightMode')}
                      aria-label={t('common.lightMode')}
                      aria-pressed={themeMode === 'light'}
                    >
                      <AppIcon icon={Sun} size="sm" />
                    </AppButton>
                    <AppButton
                      variant="icon"
                      size="icon-md"
                      onClick={() => setThemeMode('dark')}
                      className={`!size-9 !h-9 !w-9 !rounded-lg !p-0 flex items-center justify-center transition-colors duration-150 active:scale-100 ${themeMode === 'dark'
                        ? '!bg-q-surface !text-q-accent shadow-sm border border-border-subtle'
                        : '!text-q-text-muted hover:!text-q-text hover:!bg-sidebar-control-hover'
                        }`}
                      title={t('common.darkMode')}
                      aria-label={t('common.darkMode')}
                      aria-pressed={themeMode === 'dark'}
                    >
                      <AppIcon icon={Moon} size="sm" />
                    </AppButton>
                    <AppButton
                      variant="icon"
                      size="icon-md"
                      onClick={() => setThemeMode('black')}
                      className={`!size-9 !h-9 !w-9 !rounded-lg !p-0 flex items-center justify-center transition-colors duration-150 active:scale-100 ${themeMode === 'black'
                        ? '!bg-q-surface !text-q-accent border border-q-accent/30 shadow-sm shadow-q-accent/20'
                        : '!text-q-text-muted hover:!text-q-text hover:!bg-sidebar-control-hover'
                        }`}
                      title={t('common.blackMode')}
                      aria-label={t('common.blackMode')}
                      aria-pressed={themeMode === 'black'}
                    >
                      <AppIcon icon={Circle} size="sm" className="fill-current" />
                    </AppButton>
                  </div>

                  {/* Language */}
                  <LanguageSelector className="w-[110px]" variant="sidebar" />
                </div>
              </div>

              {/* REFINED PRO PLAN WIDGET - Collapsible */}
              <div className={`overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out ${isFooterCollapsed || (isCollapsed && !isMobileOpen)
                ? 'max-h-0 opacity-0 mb-0'
                : planNeedsAttention
                  ? 'max-h-52 opacity-100 mb-3 md:mb-4'
                  : 'max-h-36 opacity-100 mb-3 md:mb-4'
                }`}>
                <div className="px-1" data-testid="sidebar-credits-widget">
                  <div className="flex justify-between items-end mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <AppIcon icon={Zap} size="xs" className="text-q-accent fill-q-accent" />
                      <span className="text-xs font-bold text-foreground tracking-wide">
                        {isLoadingCredits ? t('common.loading') : creditsUsage?.plan || t('common.proPlan')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-q-text-muted">
                      {isLoadingCredits ? '...' : `${displayCreditsUsed}/${displayCreditsLimit}`}
                    </span>
                  </div>

                  <ProgressBar3D
                    percentage={isLoadingCredits ? 0 : creditsAvailablePercentage}
                    color="var(--q-accent)"
                    size="md"
                  />

                  <div className="mt-2 flex justify-between items-center px-1">
                    <span className="text-[10px] text-q-text-muted font-medium">{t('common.monthlyCredits')}</span>
                    <span className="text-[10px] font-bold text-q-accent px-2 text-right">
                      {isLoadingCredits ? '...' : creditsRemainingLabel}
                    </span>
                  </div>

                  {!isOwner && (
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={handleUpgradeClick}
                      className="mt-1 w-full !h-auto justify-end !bg-transparent !p-1 text-right text-[11px] md:text-[10px] font-bold text-q-accent hover:!bg-transparent hover:text-q-text transition-colors duration-150 touch-manipulation active:scale-100"
                    >
                      {t('common.upgrade')} →
                    </AppButton>
                  )}

                  {planNeedsAttention && (
                    <AppButton
                      variant="danger"
                      size="md"
                      onClick={handlePlanAttentionClick}
                      className="group mt-2 w-full !h-auto justify-start !whitespace-normal rounded-[var(--q-radius-md)] border border-q-error/35 !bg-q-error !px-2.5 !py-2 text-left !text-white shadow-sm transition-opacity duration-150 hover:!opacity-90 active:scale-100"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="icon-sm flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold leading-tight">
                            {t('dashboard.planExpiredTitle', 'Tu plan está expirado')}
                          </span>
                          <span className="block text-[10px] font-semibold leading-tight text-white/85">
                            {t('dashboard.planExpiredAction', 'Actualizar plan')} →
                          </span>
                        </span>
                      </span>
                    </AppButton>
                  )}
                </div>
              </div>

              {/* User Profile Section - Always visible */}
              <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
                <AppButton
                  variant="icon"
                  size="icon-md"
                  className="relative group !h-11 !w-11 md:!h-10 md:!w-10 !rounded-full !p-0 touch-manipulation active:scale-100"
                  onClick={openProfileModal}
                  aria-label={t('common.profile', 'Perfil')}
                >
                  {userDocument?.photoURL ? (
                    <img src={userDocument.photoURL} alt="User" className="w-11 h-11 md:w-10 md:h-10 rounded-full object-cover border border-border-subtle group-hover:border-q-border transition-colors" />
                  ) : (
                    <div className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-q-surface-overlay flex items-center justify-center border border-border-subtle group-hover:border-q-border transition-colors">
                      <AppIcon icon={UserIcon} size="lg" tone="muted" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 md:w-3 md:h-3 bg-q-success border-2 border-background rounded-full"></div>
                </AppButton>

                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="truncate text-sm font-bold leading-tight">
                      <span className="quimera-user-name-highlight block truncate">{userDocument?.name || t('common.creator')}</span>
                    </p>
                    <p className="text-xs text-q-text-muted truncate">{user?.email}</p>
                  </div>
                )}

                <div className={`${isCollapsed && !isMobileOpen ? '' : 'flex flex-col gap-1'}`}>
                  {(!isCollapsed || isMobileOpen) && (
                    <AppButton
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="!h-auto !w-auto !bg-transparent !p-2.5 md:!p-1.5 -mr-1 text-q-text-muted hover:!bg-transparent hover:text-destructive active:text-destructive transition-colors duration-150 touch-manipulation active:scale-100"
                      aria-label={t('auth.logout')}
                    >
                      <AppIcon icon={LogOut} size="md" />
                    </AppButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop Toggle Button - Outside aside for proper z-index */}
        <AppButton
          variant="icon"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-4 -right-3 z-[100] !size-6 !rounded-full !bg-q-surface border border-border-subtle text-q-text-muted hover:!bg-sidebar-control-hover hover:text-q-text hover:border-sidebar-control-border transition-colors duration-150 active:scale-100 shadow-[var(--q-shadow-card)]"
          aria-label={isCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
          aria-expanded={!isCollapsed}
        >
          <AppIcon icon={isCollapsed ? ChevronRight : ChevronLeft} size="xs" />
        </AppButton>
      </div>
    </>
  );
};

export default DashboardSidebar;
