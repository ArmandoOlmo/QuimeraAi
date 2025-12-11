
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useAdmin } from '../../contexts/admin';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { auth, signOut } from '../../firebase';
import { LogOut, LayoutDashboard, Globe, Settings, ChevronLeft, ChevronRight, ChevronDown, Zap, User as UserIcon, PenTool, Menu as MenuIcon, Sun, Moon, Circle, MessageSquare, Users, Link2, Search, DollarSign, GripVertical, LayoutTemplate, Calendar, X, Wrench, ShoppingBag, Package, FolderTree, ShoppingCart, Tag, TrendingUp, BarChart3, Mail, UserCheck } from 'lucide-react';
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
import UserProfileModal from './UserProfileModal';

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
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isMobileOpen, onClose, hiddenOnDesktop = false, defaultCollapsed = false }) => {
  const { t } = useTranslation();
  const { user, userDocument } = useAuth();
  const { view, setView, setAdminView, themeMode, setThemeMode, sidebarOrder, setSidebarOrder } = useUI();
  const { usage, isLoadingUsage } = useAdmin();
  const { navigate, path } = useRouter();
  // Default to expanded on desktop, unless defaultCollapsed is true
  // Default to expanded on desktop, unless defaultCollapsed is true
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    websites: false,
    ecommerce: false,
    tools: false,
  });

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
    { id: 'templates', icon: LayoutTemplate, label: t('dashboard.templates'), view: 'templates', route: ROUTES.TEMPLATES },
    { id: 'navigation', icon: MenuIcon, label: t('dashboard.navigation'), view: 'navigation', route: ROUTES.NAVIGATION },
    { id: 'cms', icon: PenTool, label: t('dashboard.contentManager'), view: 'cms', route: ROUTES.CMS },
    { id: 'domains', icon: Link2, label: t('domains.title'), view: 'domains', route: ROUTES.DOMAINS },
    { id: 'seo', icon: Search, label: t('dashboard.seoAndMeta'), view: 'seo', route: ROUTES.SEO },
  ];

  // Ecommerce section items (sección independiente con árbol de componentes)
  const ecommerceItems: NavItemData[] = [
    { id: 'ecommerce-overview', icon: BarChart3, label: t('ecommerce.overview', 'Vista General'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'overview' },
    { id: 'ecommerce-products', icon: Package, label: t('ecommerce.products', 'Productos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'products' },
    { id: 'ecommerce-categories', icon: FolderTree, label: t('ecommerce.categories', 'Categorías'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'categories' },
    { id: 'ecommerce-orders', icon: ShoppingCart, label: t('ecommerce.orders', 'Pedidos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'orders' },
    { id: 'ecommerce-customers', icon: Users, label: t('ecommerce.customers', 'Clientes'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'customers' },
    { id: 'ecommerce-store-users', icon: UserCheck, label: t('storeUsers.title', 'Usuarios Registrados'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'store-users' },
    { id: 'ecommerce-discounts', icon: Tag, label: t('ecommerce.discounts', 'Descuentos'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'discounts' },
    { id: 'ecommerce-analytics', icon: TrendingUp, label: t('ecommerce.analyticsTitle', 'Analytics'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'analytics' },
    { id: 'ecommerce-settings', icon: Settings, label: t('ecommerce.settings', 'Configuración'), view: 'ecommerce', route: ROUTES.ECOMMERCE, subView: 'settings' },
  ];

  // Tools section items
  const toolsItems: NavItemData[] = [
    { id: 'ai-assistant', icon: MessageSquare, label: t('dashboard.quimeraChat'), view: 'ai-assistant', route: ROUTES.AI_ASSISTANT },
    { id: 'leads', icon: Users, label: t('leads.title'), view: 'leads', route: ROUTES.LEADS },
    { id: 'email', icon: Mail, label: t('email.title', 'Email Marketing'), view: 'email', route: ROUTES.EMAIL },
    { id: 'assets', icon: Zap, label: t('editor.imageGenerator'), view: 'assets', route: ROUTES.ASSETS },
    { id: 'finance', icon: DollarSign, label: t('editor.finance'), view: 'finance', route: ROUTES.FINANCE },
    { id: 'appointments', icon: Calendar, label: t('appointments.title'), view: 'appointments', route: ROUTES.APPOINTMENTS },
  ];

  // All items combined for backwards compatibility with drag-and-drop
  const defaultNavItems: NavItemData[] = [dashboardItem, ...websiteItems, ...ecommerceItems, ...toolsItems];

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

    const handleNavClick = () => {
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
            ${isActive
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
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          title={!showExpanded ? item.label : undefined}
        >
          {/* Drag handle - Hidden on mobile for cleaner experience */}
          {showExpanded && !item.isFixed && (
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
            `}
            aria-hidden="true"
          />

          {showExpanded && (
            <span className="text-[15px] lg:text-sm font-medium whitespace-nowrap overflow-hidden transition-all">
              {item.label}
            </span>
          )}

          {/* Active indicator for mobile */}
          {isActive && showExpanded && (
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
        relative flex-shrink-0
        ${hiddenOnDesktop ? 'lg:hidden' : ''}
        ${isDragging ? '' : 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'}
        ${!isMobileOpen && isCollapsed ? 'lg:w-[80px]' : ''}
        ${!isMobileOpen && !isCollapsed ? 'lg:w-72' : ''}
      `}>
        {/* Desktop Toggle Button - Aligned with editor header icons (h-14 = 56px, center = 28px) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute top-[16px] -right-3 z-[60] w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-md"
          aria-label={isCollapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>

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
              fixed lg:relative z-50 h-[100dvh] lg:h-screen bg-background border-r border-border 
              shadow-2xl lg:shadow-xl flex flex-col overflow-y-auto
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
            <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'lg:px-0 lg:justify-center lg:gap-0' : 'lg:px-6'}`}>
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

          {/* Navigation - Optimized for mobile with momentum scroll */}
          <nav
            className="flex-1 px-3 lg:px-4 py-4 lg:py-6 space-y-1 lg:space-y-2 overflow-y-auto overscroll-contain
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
                    {/* Show all items directly with drag and drop */}
                    {[...websiteItems, ...ecommerceItems, ...toolsItems].map((item, index) => (
                      <SortableNavItem key={item.id} item={item} index={index + 1} />
                    ))}
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
                          <span className="text-xs font-bold uppercase tracking-wider">Websites</span>
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
                          {websiteItems.map((item, index) => (
                            <SortableNavItem key={item.id} item={item} index={index + 1} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ecommerce Section - Collapsible Drawer */}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleSection('ecommerce')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200"
                        aria-expanded={!collapsedSections.ecommerce}
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={18} className="flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider">Ecommerce</span>
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
                          {ecommerceItems.map((item, index) => (
                            <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + 1} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tools Section - Collapsible Drawer */}
                    <div className="mt-3">
                      <button
                        onClick={() => toggleSection('tools')}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all duration-200"
                        aria-expanded={!collapsedSections.tools}
                      >
                        <div className="flex items-center gap-2">
                          <Wrench size={18} className="flex-shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider">Tools</span>
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
                          {toolsItems.map((item, index) => (
                            <SortableNavItem key={item.id} item={item} index={index + websiteItems.length + ecommerceItems.length + 1} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Panel de administración disponible para todos los usuarios */}
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
              </SortableContext>
            </DndContext>
          </nav>

          {/* Footer / User Profile / Theme - Optimized for mobile */}
          <div className="p-3 pb-6 lg:p-4 lg:pb-4 border-t border-border bg-card/50 backdrop-blur-sm safe-area-inset-bottom">

            {/* Theme Selector Section - Hidden on mobile, only visible on desktop */}
            <div className={`${isCollapsed && !isMobileOpen ? 'hidden' : 'hidden lg:block mb-4'}`}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('common.themeColor')}</p>
              <div className="flex gap-2 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`
                          flex-1 flex items-center justify-center py-1.5 rounded-md transition-all
                          ${themeMode === 'light' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}
                        `}
                  title={t('common.lightMode')}
                  aria-label={t('common.lightMode')}
                  aria-pressed={themeMode === 'light'}
                >
                  <Sun size={16} />
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`
                          flex-1 flex items-center justify-center py-1.5 rounded-md transition-all
                          ${themeMode === 'dark' ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}
                        `}
                  title={t('common.darkMode')}
                  aria-label={t('common.darkMode')}
                  aria-pressed={themeMode === 'dark'}
                >
                  <Moon size={16} />
                </button>
                <button
                  onClick={() => setThemeMode('black')}
                  className={`
                          flex-1 flex items-center justify-center py-1.5 rounded-md transition-all
                          ${themeMode === 'black' ? 'bg-card text-primary border border-primary/30 shadow-sm shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}
                        `}
                  title={t('common.blackMode')}
                  aria-label={t('common.blackMode')}
                  aria-pressed={themeMode === 'black'}
                >
                  <Circle size={16} fill="currentColor" />
                </button>
              </div>
            </div>

            {/* REFINED PRO PLAN WIDGET - Hidden when collapsed on desktop */}
            <div className={`px-1 ${isCollapsed && !isMobileOpen ? 'hidden' : 'block mb-4 lg:mb-6'}`}>
              <div className="flex justify-between items-end mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-yellow-600 dark:text-yellow-400 black:text-yellow-400 fill-yellow-600 dark:fill-yellow-400 black:fill-yellow-400" />
                  <span className="text-xs font-bold text-gray-700 dark:text-white tracking-wide">
                    {isLoadingUsage ? t('common.loading') : usage?.plan || t('common.proPlan')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-500 dark:text-white/60">
                  {isLoadingUsage ? '...' : `${usage?.used || 0}/${usage?.limit || 1000}`}
                </span>
              </div>

              <div className="h-2 lg:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(251,185,43,0.5)] transition-all duration-500"
                  style={{ width: `${usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0}%` }}
                />
              </div>

              <div className="mt-2 flex justify-between items-center px-1">
                <span className="text-[10px] text-muted-foreground font-medium">{t('common.monthlyCredits')}</span>
                <button className="text-[11px] lg:text-[10px] font-bold text-gray-700 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors py-1 px-2 -mr-2 touch-manipulation">
                  {t('common.upgrade')}
                </button>
              </div>
            </div>

            {/* User Profile Section - Touch optimized */}
            <div className={`flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center flex-col gap-4' : 'gap-3'}`}>
              <div
                className="relative group cursor-pointer touch-manipulation"
                onClick={() => setIsProfileModalOpen(true)}
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
        </aside>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default DashboardSidebar;
