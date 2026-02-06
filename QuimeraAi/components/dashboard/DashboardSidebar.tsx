
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useAdmin } from '../../contexts/admin';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { auth, signOut } from '../../firebase';
import { LogOut, LayoutDashboard, Globe, Settings, ChevronLeft, ChevronRight, ChevronDown, Zap, User as UserIcon, PenTool, Menu as MenuIcon, Sun, Moon, Circle, MessageSquare, Users, Link2, Search, DollarSign, GripVertical, LayoutTemplate, Calendar, X, Wrench, ShoppingBag, Package, FolderTree, ShoppingCart, Tag, TrendingUp, BarChart3, Mail, UserCheck, Lock, Building2 } from 'lucide-react';
import LanguageSelector from '../ui/LanguageSelector';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import ProjectSwitcher from './ProjectSwitcher';
import { useSafeTenant } from '../../contexts/tenant';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { usePlanAccess } from '../../hooks/usePlanFeatures';
import { useServiceAvailability } from '../../hooks/useServiceAvailability';
import { PlatformServiceId } from '../../types/serviceAvailability';
import { PlanFeatures } from '../../types/subscription';
import { UpgradeTrigger } from '../ui/UpgradeModal';
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
  icon: React.ElementType;
  label: string;
  view: string;
  route: string;
  disabled?: boolean;
  isFixed?: boolean;
  subView?: string; // Para sub-vistas dentro de un módulo (ej: ecommerce)
  requiredFeature?: keyof PlanFeatures; // Feature del plan requerida para acceder
  upgradeTrigger?: UpgradeTrigger; // Trigger para el modal de upgrade
  serviceId?: PlatformServiceId; // ID del servicio global para control de disponibilidad
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isMobileOpen, onClose, hiddenOnDesktop = false, defaultCollapsed = false }) => {
  const { t } = useTranslation();
  const { user, userDocument, openProfileModal, canAccessSuperAdmin, isUserOwner, loadingAuth } = useAuth();
  const { view, setView, setAdminView, themeMode, setThemeMode, sidebarOrder, setSidebarOrder, setIsOnboardingOpen } = useUI();
  const { usage: creditsUsage, isLoading: isLoadingCredits } = useCreditsUsage();

  // Check role first (most reliable), then email-based owner check as fallback
  const userRole = userDocument?.role;
  const isOwner = userRole === 'owner' || userRole === 'superadmin' || isUserOwner;

  // Debug log to verify role detection
  console.log('[DashboardSidebar] User role check:', { userRole, isOwner, isUserOwner, userEmail: user?.email });
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

  // Get plan access functions from the dynamic hook (reads from Firestore)
  const { hasAccess: hasFeatureAccess, getMinPlan: getMinPlanForFeature, isLoading: isLoadingPlan } = usePlanAccess();

  // Get global service availability control
  const { canAccessService: canAccessGlobalService, isLoading: isLoadingServiceAvailability } = useServiceAvailability();

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

  // Estado para trackear la sub-vista activa de ecommerce
  const [activeEcommerceSubView, setActiveEcommerceSubView] = useState<string>(() => {
    return localStorage.getItem('ecommerceActiveView') || 'overview';
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
  const websiteItems: NavItemData[] = [
    { id: 'websites', icon: Globe, label: t('dashboard.myWebsites'), view: 'websites', route: ROUTES.WEBSITES },
    { id: 'templates', icon: LayoutTemplate, label: t('dashboard.templates'), view: 'templates', route: ROUTES.TEMPLATES, serviceId: 'templates' },
    { id: 'navigation', icon: MenuIcon, label: t('dashboard.navigation'), view: 'navigation', route: ROUTES.NAVIGATION },
    { id: 'cms', icon: PenTool, label: t('dashboard.contentManager'), view: 'cms', route: ROUTES.CMS, requiredFeature: 'cmsEnabled', upgradeTrigger: 'generic', serviceId: 'cms' },
    { id: 'domains', icon: Link2, label: t('domains.title'), view: 'domains', route: ROUTES.DOMAINS, requiredFeature: 'customDomains', upgradeTrigger: 'domains', serviceId: 'domains' },
    { id: 'seo', icon: Search, label: t('dashboard.seoAndMeta'), view: 'seo', route: ROUTES.SEO },
    { id: 'biopage', icon: Link2, label: t('bioPage.title', 'Bio Page'), view: 'biopage', route: ROUTES.BIOPAGE },
  ];

  // Ecommerce section items (sección independiente con árbol de componentes)
  const ecommerceItems: NavItemData[] = [
    { id: 'ecommerce-overview', icon: BarChart3, label: t('ecommerce.overview', 'Vista General'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'overview', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-products', icon: Package, label: t('ecommerce.products', 'Productos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'products', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-categories', icon: FolderTree, label: t('ecommerce.categories', 'Categorías'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'categories', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-orders', icon: ShoppingCart, label: t('ecommerce.orders', 'Pedidos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'orders', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-customers', icon: Users, label: t('ecommerce.customers', 'Clientes'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'customers', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-store-users', icon: UserCheck, label: t('storeUsers.title', 'Usuarios Registrados'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'store-users', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-discounts', icon: Tag, label: t('ecommerce.discounts', 'Descuentos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'discounts', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-analytics', icon: TrendingUp, label: t('ecommerce.analyticsTitle', 'Analytics'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'analytics', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
    { id: 'ecommerce-settings', icon: Settings, label: t('ecommerce.settings', 'Configuración'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'settings', requiredFeature: 'ecommerceEnabled', upgradeTrigger: 'ecommerce', serviceId: 'ecommerce' },
  ];

  // Tools section items (settings removed - placed outside section)
  const toolsItems: NavItemData[] = [
    { id: 'ai-assistant', icon: MessageSquare, label: t('dashboard.quimeraChat'), view: 'ai-assistant', route: ROUTES.AI_ASSISTANT, requiredFeature: 'chatbotEnabled', upgradeTrigger: 'chatbot', serviceId: 'chatbot' },
    { id: 'leads', icon: Users, label: t('leads.title'), view: 'leads', route: ROUTES.LEADS, requiredFeature: 'crmEnabled', upgradeTrigger: 'generic', serviceId: 'crm' },
    { id: 'email', icon: Mail, label: t('email.title', 'Email Marketing'), view: 'email', route: ROUTES.EMAIL, requiredFeature: 'emailMarketing', upgradeTrigger: 'generic', serviceId: 'emailMarketing' },
    { id: 'assets', icon: Zap, label: t('editor.imageGenerator'), view: 'assets', route: ROUTES.ASSETS, serviceId: 'aiFeatures' }, // AI Features
    { id: 'finance', icon: DollarSign, label: t('editor.finance'), view: 'finance', route: ROUTES.FINANCE, serviceId: 'finance' },
    { id: 'appointments', icon: Calendar, label: t('appointments.title'), view: 'appointments', route: ROUTES.APPOINTMENTS, serviceId: 'appointments' },
  ];

  // Agency button - standalone outside control panel area
  const agencyItem: NavItemData = { id: 'agency', icon: Building2, label: t('dashboard.agencySection', 'Agencia'), view: 'agency', route: ROUTES.AGENCY };

  // Workspace Settings - standalone outside tools section, before Super Admin
  const settingsItem: NavItemData = { id: 'settings', icon: Settings, label: t('settings.title', 'Configuración del Workspace'), view: 'settings', route: ROUTES.SETTINGS };

  // Agency section items (for collapsible drawer - kept for backwards compatibility)
  const agencyItems: NavItemData[] = [
    { id: 'agency-overview', icon: BarChart3, label: t('agency.overview', 'Vista General'), view: 'agency', route: ROUTES.AGENCY },
    { id: 'agency-billing', icon: DollarSign, label: t('agency.billing', 'Facturación'), view: 'agency', route: ROUTES.AGENCY_BILLING },
    { id: 'agency-reports', icon: TrendingUp, label: t('agency.reports', 'Reportes'), view: 'agency', route: ROUTES.AGENCY_REPORTS },
    { id: 'agency-new-client', icon: UserCheck, label: t('agency.newClient', 'Nuevo Cliente'), view: 'agency', route: ROUTES.AGENCY_NEW_CLIENT },
    { id: 'agency-addons', icon: Package, label: t('agency.addons', 'Add-ons'), view: 'agency', route: ROUTES.AGENCY_ADDONS },
  ];

  // All items combined for backwards compatibility with drag-and-drop
  const defaultNavItems: NavItemData[] = [dashboardItem, ...websiteItems, ...ecommerceItems, ...toolsItems, ...agencyItems];

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

  // Load order from context (synced from Firebase) or use default
  const [navItems, setNavItems] = useState<NavItemData[]>(() => {
    return getOrderedItems(sidebarOrder);
  });

  // Sync navItems when sidebarOrder changes (e.g., loaded from Firebase)
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

  // Save order to context (which syncs to localStorage and Firebase)
  const saveOrder = (items: NavItemData[]) => {
    const orderIds = items.map(item => item.id);
    setSidebarOrder(orderIds);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleSignOut = () => {
    signOut(auth).then(() => {
      navigate(ROUTES.LOGIN);
    }).catch((error) => console.error("Sign out error", error));
  };

  // Helper: Check if an item is accessible based on global service availability
  const isItemAccessible = (item: NavItemData): boolean => {
    if (!item.serviceId) return true; // No service restriction
    if (isLoadingServiceAvailability) return true; // Show while loading
    return canAccessGlobalService(item.serviceId);
  };

  // Helper: Check if any items in a section are accessible
  const hasAccessibleItems = (items: NavItemData[]): boolean => {
    return items.some(isItemAccessible);
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
      // Staggered animation on mobile menu open
      animationDelay: isMobileOpen ? `${index * 30}ms` : '0ms',
    };

    // Para items de ecommerce, verificar también el subView
    const isActive = item.subView
      ? isRouteActive(item.route) && activeEcommerceSubView === item.subView
      : isRouteActive(item.route);
    const Icon = item.icon;

    // En móvil siempre mostrar expandido cuando el sidebar está abierto
    const showExpanded = !isCollapsed || isMobileOpen;

    // Check if user has access to this feature (plan-based access)
    const hasAccess = hasFeatureAccess(item.requiredFeature);
    const isLocked = !isLoadingPlan && !hasAccess && item.requiredFeature;
    const minPlanRequired = isLocked ? getMinPlanForFeature(item.requiredFeature) : '';

    const handleNavClick = () => {
      // If locked, show upgrade modal instead of navigating
      if (isLocked && upgradeContext) {
        upgradeContext.openUpgradeModal(item.upgradeTrigger || 'generic');
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
        // Disparar un evento para notificar al dashboard
        window.dispatchEvent(new CustomEvent('ecommerceViewChange', { detail: item.subView }));
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
        className={`
          relative group/drag
          ${isMobileOpen ? 'animate-[slideInFromLeft_0.3s_ease-out_forwards]' : ''}
        `}
      >
        <button
          onClick={handleNavClick}
          disabled={item.disabled}
          className={`
            group flex items-center transition-all duration-200 relative touch-manipulation
            min-h-[48px] lg:min-h-[44px]
            p-3 lg:p-3 mb-1 lg:mb-2
            active:scale-[0.98] lg:active:scale-100
            ${showExpanded
              ? 'w-full rounded-xl'
              : 'justify-center w-12 mx-auto rounded-lg'
            }
            ${isLocked
              ? 'text-muted-foreground/60 hover:bg-secondary/50'
              : isActive
                ? (showExpanded
                  ? 'bg-primary text-white font-bold shadow-[0_0_15px_rgba(251,185,43,0.4)]'
                  : 'text-primary dark:text-primary'
                )
                : (showExpanded
                  ? 'text-muted-foreground hover:bg-secondary/80 lg:hover:bg-secondary hover:text-foreground active:bg-secondary'
                  : 'text-muted-foreground hover:text-foreground'
                )
            }
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${item.isFixed ? '' : 'cursor-pointer'}
          `}
          aria-label={isLocked ? `${item.label} (${t('common.upgrade')})` : item.label}
          aria-current={isActive ? 'page' : undefined}
          title={!showExpanded ? (isLocked ? `${item.label} - ${t('common.upgrade')}` : item.label) : undefined}
        >
          {/* Drag handle - Hidden on mobile for cleaner experience */}
          {showExpanded && !item.isFixed && !isLocked && (
            <div
              {...attributes}
              {...listeners}
              className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-opacity"
            >
              <GripVertical size={16} className="text-muted-foreground" />
            </div>
          )}

          <Icon
            size={22}
            strokeWidth={isActive ? 2.5 : 2}
            className={`
              ${showExpanded ? (item.isFixed ? 'mr-3' : 'lg:ml-5 mr-3') : ''} 
              flex-shrink-0 transition-all
              ${isLocked ? 'opacity-50' : ''}
            `}
            aria-hidden="true"
          />

          {showExpanded && (
            <span className={`text-[15px] lg:text-sm font-medium whitespace-nowrap overflow-hidden transition-all flex-1 text-left ${isLocked ? 'opacity-60' : ''}`}>
              {item.label}
            </span>
          )}

          {/* Lock icon for locked features */}
          {isLocked && showExpanded && (
            <div className="flex items-center gap-1 ml-auto">
              <Lock size={14} className="text-muted-foreground" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                {minPlanRequired}
              </span>
            </div>
          )}

          {/* Lock icon for collapsed sidebar */}
          {isLocked && !showExpanded && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <Lock size={10} className="text-primary-foreground" />
            </div>
          )}

          {/* Active indicator for mobile */}
          {isActive && showExpanded && !isLocked && (
            <div className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80" />
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay - Enhanced with blur and tap feedback */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden 
          transition-all duration-300 ease-out
          ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar wrapper for proper positioning of toggle button */}
      <div className={`
        relative flex-shrink-0 h-screen z-50
        ${hiddenOnDesktop ? 'lg:hidden' : ''}
        ${isDragging ? '' : 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'}
        ${!isMobileOpen && isCollapsed ? 'lg:w-[80px]' : ''}
        ${!isMobileOpen && !isCollapsed ? 'lg:w-72' : ''}
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
              fixed lg:relative z-50 h-[100dvh] lg:h-full bg-background border-r border-border 
              shadow-2xl lg:shadow-xl flex flex-col
              ${isDragging ? '' : 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'}
              ${isMobileOpen ? 'translate-x-0 w-[85vw] max-w-[320px]' : '-translate-x-full lg:translate-x-0'}
              lg:w-full
          `}
          style={isMobileOpen && isDragging && dragOffset > 0 ? {
            transform: `translateX(-${dragOffset}px)`,
          } : undefined}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Header / Logo - Enhanced for mobile */}
          <div className="relative h-[72px] lg:h-[80px] flex items-center justify-between px-4 lg:px-0 lg:justify-center border-b border-border/50 lg:border-none flex-shrink-0">
            <div
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className={`flex items-center gap-3 transition-all duration-300 cursor-pointer ${isCollapsed ? 'lg:px-0 lg:justify-center lg:gap-0' : 'lg:px-6'}`}
            >
              {/* Logo Image */}
              <img
                src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
                alt="Quimera Logo"
                className="w-10 h-10 object-contain flex-shrink-0"
                width={40}
                height={40}
                loading="eager"
                decoding="async"
              />
              {/* Text Logo (Hidden when collapsed on desktop) */}
              <span className={`text-xl lg:text-2xl font-extrabold tracking-tight text-foreground whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                Quimera<span className="text-primary">.ai</span>
              </span>
            </div>

            {/* Mobile Close Button - Touch optimized (min 44px) */}
            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full 
                          text-muted-foreground hover:text-foreground hover:bg-secondary/80 
                          active:scale-95 transition-all touch-manipulation flex-shrink-0"
              aria-label={t('common.close')}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          {/* Workspace Switcher - Multi-tenant support */}
          {showWorkspaceSwitcher && (
            <div className={`px-3 lg:px-4 py-2 border-b border-border/50 ${isCollapsed && !isMobileOpen ? 'hidden lg:block' : ''}`}>
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
          <div className={`px-3 lg:px-4 py-2 border-b border-border/50 ${isCollapsed && !isMobileOpen ? 'hidden lg:block' : ''}`}>
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
            className="flex-1 min-h-0 px-3 lg:px-4 py-4 lg:py-6 space-y-1 lg:space-y-2 overflow-y-auto overscroll-contain
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
                items={navItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {/* Dashboard - Fixed at top */}
                <SortableNavItem item={dashboardItem} index={0} />

                {/* When sidebar is collapsed (and not mobile open), show all items as flat list like before */}
                {isCollapsed && !isMobileOpen ? (
                  <>
                    {/* Separator */}
                    <div className="my-2 border-t border-border mx-2" />
                    {/* Show all items directly with drag and drop - filtered by service availability */}
                    {[...websiteItems, ...ecommerceItems, ...toolsItems]
                      .filter(isItemAccessible)
                      .map((item, index) => (
                        <SortableNavItem key={item.id} item={item} index={index + 1} />
                      ))}
                    {/* Agency button - standalone */}
                    <div className="my-2 border-t border-border mx-2" />
                    <SortableNavItem item={agencyItem} index={websiteItems.length + ecommerceItems.length + toolsItems.length + 1} />
                    {/* Workspace Settings - standalone before Super Admin */}
                    <SortableNavItem item={settingsItem} index={websiteItems.length + ecommerceItems.length + toolsItems.length + 2} />
                  </>
                ) : (
                  <>
                    {/* Websites Section - Collapsible Drawer */}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleSection('websites')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200"
                        aria-expanded={!collapsedSections.websites}
                      >
                        <div className="flex items-center gap-2">
                          <Globe size={18} className="flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.websitesSection')}</span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${collapsedSections.websites ? '-rotate-90' : 'rotate-0'}`}
                        />
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedSections.websites ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                          }`}
                      >
                        <div className="pl-2 border-l-2 border-border/50 ml-4 mt-1">
                          {websiteItems.filter(isItemAccessible).map((item, index) => (
                            <SortableNavItem key={item.id} item={item} index={index + 1} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Ecommerce Section - Collapsible Drawer (only show if any items accessible) */}
                    {hasAccessibleItems(ecommerceItems) && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSection('ecommerce')}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200"
                          aria-expanded={!collapsedSections.ecommerce}
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingBag size={18} className="flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.ecommerceSection')}</span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${collapsedSections.ecommerce ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedSections.ecommerce ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                            }`}
                        >
                          <div className="pl-2 border-l-2 border-border/50 ml-4 mt-1">
                            {ecommerceItems.filter(isItemAccessible).map((item, index) => (
                              <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + 1} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tools Section - Collapsible Drawer (only show if any items accessible) */}
                    {hasAccessibleItems(toolsItems) && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSection('tools')}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200"
                          aria-expanded={!collapsedSections.tools}
                        >
                          <div className="flex items-center gap-2">
                            <Wrench size={18} className="flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.toolsSection')}</span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${collapsedSections.tools ? '-rotate-90' : 'rotate-0'}`}
                          />
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsedSections.tools ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                            }`}
                        >
                          <div className="pl-2 border-l-2 border-border/50 ml-4 mt-1">
                            {toolsItems.filter(isItemAccessible).map((item, index) => (
                              <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + ecommerceItems.length + 1} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agency Button - Standalone outside control panel area */}
                    <div className={`my-3 lg:my-4 border-t border-border ${isCollapsed && !isMobileOpen ? 'mx-2' : 'mx-0'}`} />
                    <SortableNavItem
                      item={agencyItem}
                      index={websiteItems.length + ecommerceItems.length + toolsItems.length + 1}
                    />

                    {/* Workspace Settings - Standalone outside tools section */}
                    <SortableNavItem
                      item={settingsItem}
                      index={websiteItems.length + ecommerceItems.length + toolsItems.length + 2}
                    />
                  </>
                )}

                {/* Panel de administración solo para roles autorizados (owner, superadmin, admin, manager) */}
                {canAccessSuperAdmin && (
                  <>
                    <div className={`my-3 lg:my-4 border-t border-border ${isCollapsed && !isMobileOpen ? 'mx-2' : 'mx-0'}`} />
                    <SortableNavItem
                      item={{
                        id: 'superadmin',
                        icon: Settings,
                        label: t('dashboard.superAdmin'),
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
          <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm relative">

            {/* Footer Toggle Button - Small circle at top center */}
            {(!isCollapsed || isMobileOpen) && (
              <button
                onClick={() => setIsFooterCollapsed(!isFooterCollapsed)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-md"
                aria-label={isFooterCollapsed ? t('common.expandFooter', 'Expandir') : t('common.collapseFooter', 'Colapsar')}
                aria-expanded={!isFooterCollapsed}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isFooterCollapsed ? 'rotate-180' : 'rotate-0'}`}
                  aria-hidden="true"
                />
              </button>
            )}

            {/* Collapsible content wrapper */}
            <div className={`p-3 pb-4 lg:p-4 lg:pb-4 transition-all duration-300 ease-in-out ${isFooterCollapsed && !isCollapsed && (!isMobileOpen || isMobileOpen) ? 'pt-4' : ''}`}>

              {/* Theme + Language (single compact bar) - Collapsible */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFooterCollapsed || (isCollapsed && !isMobileOpen)
                ? 'max-h-0 opacity-0 mb-0'
                : 'max-h-20 opacity-100 mb-3'
                }`}>
                <div className="flex items-center justify-between gap-2 bg-muted p-1.5 rounded-xl border border-border/60">
                  {/* Theme */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setThemeMode('light')}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${themeMode === 'light'
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                      title={t('common.lightMode')}
                      aria-label={t('common.lightMode')}
                      aria-pressed={themeMode === 'light'}
                    >
                      <Sun size={16} />
                    </button>
                    <button
                      onClick={() => setThemeMode('dark')}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${themeMode === 'dark'
                        ? 'bg-card text-primary shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                      title={t('common.darkMode')}
                      aria-label={t('common.darkMode')}
                      aria-pressed={themeMode === 'dark'}
                    >
                      <Moon size={16} />
                    </button>
                    <button
                      onClick={() => setThemeMode('black')}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${themeMode === 'black'
                        ? 'bg-card text-primary border border-primary/30 shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                      title={t('common.blackMode')}
                      aria-label={t('common.blackMode')}
                      aria-pressed={themeMode === 'black'}
                    >
                      <Circle size={16} fill="currentColor" />
                    </button>
                  </div>

                  {/* Language */}
                  <LanguageSelector className="w-[110px]" variant="sidebar" />
                </div>
              </div>

              {/* REFINED PRO PLAN WIDGET - Collapsible */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFooterCollapsed || (isCollapsed && !isMobileOpen)
                ? 'max-h-0 opacity-0 mb-0'
                : 'max-h-28 opacity-100 mb-3 lg:mb-4'
                }`}>
                <div className="px-1">
                  <div className="flex justify-between items-end mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-yellow-600 dark:text-yellow-400 black:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 black:fill-yellow-400" />
                      <span className="text-xs font-bold text-foreground tracking-wide">
                        {isLoadingCredits ? t('common.loading') : creditsUsage?.plan || t('common.proPlan')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 dark:text-white/60">
                      {isLoadingCredits ? '...' : isOwner ? '∞/∞' : `${creditsUsage?.used || 0}/${creditsUsage?.limit || 30}`}
                    </span>
                  </div>

                  <div className="h-2 lg:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full shadow-[0_0_8px_rgba(251,185,43,0.5)] transition-all duration-500"
                      style={{
                        width: `${isOwner ? 100 : (creditsUsage?.percentage || 0)}%`,
                        backgroundColor: isOwner ? '#a855f7' : (creditsUsage?.color || 'hsl(var(--primary))')
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between items-center px-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{t('common.monthlyCredits')}</span>
                    {!isOwner && (
                      <button
                        onClick={handleUpgradeClick}
                        className="text-[11px] lg:text-[10px] font-bold text-primary hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors py-1 px-2 -mr-2 touch-manipulation"
                      >
                        {t('common.upgrade')} →
                      </button>
                    )}
                    {isOwner && (
                      <span className="text-[10px] font-bold text-primary px-2">
                        {t('common.unlimited', 'Ilimitado')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Profile Section - Always visible */}
              <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
                <div
                  className="relative group cursor-pointer touch-manipulation"
                  onClick={openProfileModal}
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-11 h-11 lg:w-10 lg:h-10 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                  ) : (
                    <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                      <UserIcon size={22} className="lg:w-5 lg:h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 lg:w-3 lg:h-3 bg-green-500 border-2 border-background rounded-full"></div>
                </div>

                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{userDocument?.name || t('common.creator')}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                )}

                <div className={`${isCollapsed && !isMobileOpen ? '' : 'flex flex-col gap-1'}`}>
                  {(!isCollapsed || isMobileOpen) && (
                    <button
                      onClick={handleSignOut}
                      className="p-2.5 lg:p-1.5 -mr-1 text-muted-foreground hover:text-destructive active:text-destructive transition-colors touch-manipulation active:scale-95"
                      aria-label={t('auth.logout')}
                    >
                      <LogOut size={18} className="lg:w-4 lg:h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop Toggle Button - Outside aside for proper z-index */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute top-[16px] -right-3 z-[100] w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-md"
          aria-label={isCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
};

export default DashboardSidebar;
