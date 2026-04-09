
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';
import { useUI } from '../../contexts/core/UIContext';
import DashboardWaveRibbons from './DashboardWaveRibbons';
import { useProject } from '../../contexts/project';
import { useDomains } from '../../contexts/domains/DomainsContext';
import { useCMS } from '../../contexts/cms';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import DashboardSidebar from './DashboardSidebar';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import ProjectListItem from './ProjectListItem';
import StatCard from './StatCard';
import FileHistory from './FileHistory';
import FilterChip from './FilterChip';
import EmptyState from './EmptyState';
import NewsUpdates from './NewsUpdates';
import RecentLeads from './RecentLeads';
import DashboardHelpGuide from './DashboardHelpGuide';
import DashboardStatusCards from './DashboardStatusCards';
import { Plus, Menu, Search, LayoutGrid, Globe, Images, List, ArrowUpDown, CheckCircle, FileEdit, X, Loader2, Sparkles, MousePointerClick, Palette, Rocket, LayoutTemplate, BookOpen, ArrowLeft, Crown, ChevronUp, ChevronDown, Maximize2, Minimize2, Newspaper, Users, GripVertical } from 'lucide-react';
import MobileSearchModal from '../ui/MobileSearchModal';
import { trackSearchPerformed, trackFilterApplied, trackSortChanged, trackViewModeChanged, trackDashboardView } from '../../utils/analytics';
import { useInfiniteScroll, paginateArray, hasMoreItems } from '../../hooks/useInfiniteScroll';
import { usePlans } from '../../contexts/PlansContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
import { useProjectTokenUsage } from '../../hooks/useProjectTokenUsage';
import { SUBSCRIPTION_PLANS } from '../../types/subscription';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { user, userDocument, canAccessSuperAdmin } = useAuth();
    const { view, setIsOnboardingOpen } = useUI();
    const { projects, isLoadingProjects, addNewProject } = useProject();
    const { domains } = useDomains();
    const { cmsPosts } = useCMS();
    const { navigate } = useRouter();
    const { plansArray, getPlan } = usePlans();
    const upgradeContext = useSafeUpgrade();
    const { usage } = useCreditsUsage();
    const { projectUsage } = useProjectTokenUsage();
    const tenantContext = useSafeTenant();

    // Compute max credits across all projects for relative bar scaling
    const maxTokens = useMemo(() => {
        const values = Object.values(projectUsage).map(u => u.creditsUsed);
        return values.length > 0 ? Math.max(...values) : 1;
    }, [projectUsage]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    // Upgrade button minimized state (persisted in localStorage)
    const [upgradeMinimized, setUpgradeMinimized] = useState(() => {
        const saved = localStorage.getItem('quimera_upgrade_minimized');
        return saved === 'true';
    });

    const toggleUpgradeMinimized = () => {
        setUpgradeMinimized(prev => {
            const next = !prev;
            localStorage.setItem('quimera_upgrade_minimized', String(next));
            return next;
        });
    };

    // Template card size preference (persisted in localStorage)
    const [compactTemplates, setCompactTemplates] = useState(() => {
        const saved = localStorage.getItem('quimera_compact_templates');
        return saved !== 'false';
    });

    const toggleCompactTemplates = (compact: boolean) => {
        setCompactTemplates(compact);
        localStorage.setItem('quimera_compact_templates', String(compact));
    };

    // Templates section collapsed state (persisted in localStorage)
    const [templatesCollapsed, setTemplatesCollapsed] = useState(() => {
        const saved = localStorage.getItem('quimera_templates_collapsed');
        return saved === 'true';
    });

    const toggleTemplatesCollapsed = () => {
        setTemplatesCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('quimera_templates_collapsed', String(next));
            return next;
        });
    };

    // Recent Projects section collapsed state (persisted in localStorage)
    const [projectsCollapsed, setProjectsCollapsed] = useState(() => {
        const saved = localStorage.getItem('quimera_projects_collapsed');
        return saved === 'true';
    });

    const toggleProjectsCollapsed = () => {
        setProjectsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('quimera_projects_collapsed', String(next));
            return next;
        });
    };

    // News section collapsed state (persisted in localStorage)
    const [newsCollapsed, setNewsCollapsed] = useState(() => {
        const saved = localStorage.getItem('quimera_news_collapsed');
        return saved === 'true';
    });

    const toggleNewsCollapsed = () => {
        setNewsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('quimera_news_collapsed', String(next));
            return next;
        });
    };

    // Leads section collapsed state (persisted in localStorage)
    const [leadsCollapsed, setLeadsCollapsed] = useState(() => {
        const saved = localStorage.getItem('quimera_leads_collapsed');
        return saved === 'true';
    });

    const toggleLeadsCollapsed = () => {
        setLeadsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('quimera_leads_collapsed', String(next));
            return next;
        });
    };

    // ─── Drag & Drop Section Reordering ─────────────────────────────────────
    type DashboardSectionId = 'projects' | 'templates' | 'leads' | 'news';
    const DEFAULT_SECTION_ORDER: DashboardSectionId[] = ['projects', 'templates', 'leads', 'news'];

    const [sectionOrder, setSectionOrder] = useState<DashboardSectionId[]>(() => {
        try {
            const saved = localStorage.getItem('quimera_dashboard_section_order');
            if (saved) {
                const parsed = JSON.parse(saved) as DashboardSectionId[];
                // Validate: must contain all sections exactly
                if (
                    Array.isArray(parsed) &&
                    parsed.length === DEFAULT_SECTION_ORDER.length &&
                    DEFAULT_SECTION_ORDER.every(s => parsed.includes(s))
                ) {
                    return parsed;
                }
            }
        } catch { /* ignore */ }
        return DEFAULT_SECTION_ORDER;
    });

    const dragItem = useRef<DashboardSectionId | null>(null);
    const dragOverItem = useRef<DashboardSectionId | null>(null);
    const [draggedSection, setDraggedSection] = useState<DashboardSectionId | null>(null);
    const [dragOverSection, setDragOverSection] = useState<DashboardSectionId | null>(null);

    const handleDragStart = useCallback((sectionId: DashboardSectionId) => {
        dragItem.current = sectionId;
        setDraggedSection(sectionId);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, sectionId: DashboardSectionId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dragOverItem.current = sectionId;
        setDragOverSection(sectionId);
    }, []);

    const handleDragEnd = useCallback(() => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            setSectionOrder(prev => {
                const newOrder = [...prev];
                const dragIdx = newOrder.indexOf(dragItem.current!);
                const overIdx = newOrder.indexOf(dragOverItem.current!);
                if (dragIdx === -1 || overIdx === -1) return prev;
                newOrder.splice(dragIdx, 1);
                newOrder.splice(overIdx, 0, dragItem.current!);
                localStorage.setItem('quimera_dashboard_section_order', JSON.stringify(newOrder));
                return newOrder;
            });
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedSection(null);
        setDragOverSection(null);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if leaving the section element entirely
        const relatedTarget = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(relatedTarget)) {
            setDragOverSection(null);
        }
    }, []);

    // Determine next plan for upgrade button
    const currentPlanId = usage?.planId || 'free';
    const currentPlan = getPlan(currentPlanId) || SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.free;
    const nextPlan = useMemo(() => {
        const currentIndex = plansArray.findIndex(p => p.id === currentPlanId);
        if (currentIndex !== -1 && currentIndex < plansArray.length - 1) {
            return plansArray[currentIndex + 1];
        } else if (currentIndex === -1) {
            return plansArray.find(p => p.price.monthly > currentPlan.price.monthly) || null;
        }
        return null;
    }, [plansArray, currentPlanId, currentPlan]);

    const handleUpgradeClick = () => {
        if (upgradeContext) {
            upgradeContext.openUpgradeModal('generic');
        }
    };

    const showUpgradeButton = !canAccessSuperAdmin && nextPlan && currentPlanId !== 'enterprise';

    // Instructions banner visibility (persisted in localStorage)
    const [showInstructions, setShowInstructions] = useState(() => {
        const saved = localStorage.getItem('quimera_show_instructions');
        return saved !== 'false'; // Show by default
    });

    const dismissInstructions = () => {
        setShowInstructions(false);
        localStorage.setItem('quimera_show_instructions', 'false');
    };

    // Filters & Sorting
    const [filterStatus, setFilterStatus] = useState<'all' | 'Published' | 'Draft'>('all');
    const [sortBy, setSortBy] = useState<'lastUpdated' | 'name'>('lastUpdated');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Infinite Scroll
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Track dashboard view changes
    useEffect(() => {
        if (view === 'dashboard' || view === 'websites' || view === 'assets') {
            trackDashboardView(view);
        }
    }, [view]);

    // View States
    const isDashboard = view === 'dashboard';
    const isWebsites = view === 'websites';
    const isAssets = view === 'assets';

    // Filter and sort projects
    const userProjects = useMemo(() => {
        let filtered = projects.filter(p =>
            p.status !== 'Template' &&
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(p => p.status === filterStatus);
        }

        // Sort
        filtered.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else {
                comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [projects, searchQuery, filterStatus, sortBy, sortOrder]);

    const templates = projects.filter(p => p.status === 'Template');
    const allUserProjects = projects.filter(p => p.status !== 'Template');
    const publishedCount = allUserProjects.filter(p => p.status === 'Published').length;
    const draftCount = allUserProjects.filter(p => p.status === 'Draft').length;

    // Track search queries with debounce
    useEffect(() => {
        if (searchQuery.length > 2) {
            const timeoutId = setTimeout(() => {
                trackSearchPerformed(searchQuery, userProjects.length);
            }, 1000); // Debounce for 1 second

            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery, userProjects.length]);

    // Track filter changes
    useEffect(() => {
        if (filterStatus !== 'all') {
            trackFilterApplied('status', filterStatus, userProjects.length);
        }
    }, [filterStatus]);

    // Track sort changes
    useEffect(() => {
        trackSortChanged(sortBy, sortOrder);
    }, [sortBy, sortOrder]);

    // Track view mode changes
    useEffect(() => {
        trackViewModeChanged(viewMode);
    }, [viewMode]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, sortBy, sortOrder]);

    // Paginated projects for infinite scroll
    const paginatedProjects = useMemo(() => {
        return paginateArray(userProjects, currentPage, ITEMS_PER_PAGE);
    }, [userProjects, currentPage]);

    // Check if there are more projects to load
    const hasMore = hasMoreItems(userProjects.length, currentPage, ITEMS_PER_PAGE);

    // Load more projects
    const loadMore = () => {
        if (hasMore && !isLoadingProjects) {
            setCurrentPage(prev => prev + 1);
        }
    };

    // Infinite scroll hook
    const observerTarget = useInfiniteScroll({
        onLoadMore: loadMore,
        hasMore,
        isLoading: isLoadingProjects,
        threshold: 200,
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning');
        if (hour < 18) return t('dashboard.goodAfternoon');
        return t('dashboard.goodEvening');
    };


    // Header Config
    let HeaderIcon = LayoutGrid;
    let headerTitle = t('dashboard.title');

    if (isWebsites) {
        HeaderIcon = Globe;
        headerTitle = t('dashboard.myWebsites');
    } else if (isAssets) {
        HeaderIcon = Images;
        headerTitle = t('dashboard.assets.title');
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Skip to content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
            >
                {t('common.skipToContent')}
            </a>

            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />

                {/* Standardized Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0" role="banner">
                    {/* Left Section - Logo & Title */}
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-lg transition-colors touch-manipulation"
                            aria-label="Open navigation menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <HeaderIcon className="text-primary" size={24} aria-hidden="true" />
                            <h1 className="text-sm sm:text-xl font-semibold sm:font-bold text-foreground">{headerTitle}</h1>
                        </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Right Section - Search + Back */}
                    <div className="flex items-center gap-3 flex-shrink-0 mr-2.5">
                        {/* Search Icon */}
                        {(isDashboard || isWebsites) && (
                            <button
                                onClick={() => setShowMobileSearch(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Open search"
                            >
                                <Search size={20} />
                            </button>
                        )}

                        {/* Back Button - Only when not on main dashboard (websites/assets) */}
                        {!isDashboard && (
                            <button
                                onClick={() => navigate(ROUTES.DASHBOARD)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={t('common.goBack', 'Volver')}
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Search Modal */}
                <MobileSearchModal
                    isOpen={showMobileSearch}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClose={() => setShowMobileSearch(false)}
                    placeholder={t('dashboard.searchPlaceholder')}
                />

                {/* Skip to content link for accessibility */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-yellow-400 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
                >
                    Skip to main content
                </a>

                <main id="main-content" className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth" role="main">
                    <div className="max-w-7xl mx-auto space-y-10">

                        {/* Hero / Welcome Section - Only on Dashboard */}
                        {isDashboard && (
                            <section className="w-full">
                                <div className="flex flex-col justify-center py-6">
                                    {/* Greeting Header with CTA */}
                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
                                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground flex items-center flex-wrap">
                                            {/* Logo - conditional: tenant logo > generic agency icon > Quimera logo */}
                                            {tenantContext?.currentTenant?.branding?.logoUrl ? (
                                                <img
                                                    src={tenantContext.currentTenant.branding.logoUrl}
                                                    alt={tenantContext.currentTenant.branding.companyName || "Logo"}
                                                    className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                                    width={64}
                                                    height={64}
                                                    loading="eager"
                                                    decoding="async"
                                                />
                                            ) : tenantContext?.currentTenant?.branding?.companyName ? (
                                                <div
                                                    className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center rounded-2xl mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                                    style={{ backgroundColor: (tenantContext.currentTenant.branding as any)?.primaryColor || 'hsl(var(--primary))' }}
                                                >
                                                    <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                                                </div>
                                            ) : (
                                                <img
                                                    src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
                                                    alt="Quimera Logo"
                                                    className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                                    width={64}
                                                    height={64}
                                                    loading="eager"
                                                    decoding="async"
                                                />
                                            )}
                                            <span>
                                                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{userDocument?.name?.split(' ')[0] || 'Creator'}</span>.
                                            </span>
                                        </h1>

                                        {/* Right-side CTA buttons */}
                                        <div className="flex flex-col gap-3 flex-shrink-0">
                                            {/* New Project CTA - Opens Onboarding */}
                                            <button
                                                onClick={() => setIsOnboardingOpen(true)}
                                                className="group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_100%] text-white font-bold rounded-2xl shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-500 hover:scale-105 hover:bg-right"
                                                aria-label={t('dashboard.newProject')}
                                            >
                                                <div className="flex items-center justify-center w-10 h-10 bg-white/30 rounded-xl backdrop-blur-sm group-hover:bg-white/40 transition-colors">
                                                    <Plus className="w-6 h-6" aria-hidden="true" />
                                                </div>
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-lg leading-tight">{t('dashboard.newProject')}</span>
                                                    <span className="text-xs opacity-80 font-medium text-left">{t('dashboard.startBuilding')}</span>
                                                </div>
                                            </button>

                                            {/* Upgrade Plan CTA - Minimizable */}
                                            {showUpgradeButton && (
                                                upgradeMinimized ? (
                                                    /* Minimized pill */
                                                    <button
                                                        onClick={toggleUpgradeMinimized}
                                                        className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 via-primary/60 to-purple-600/80 bg-[length:200%_100%] text-white/90 font-semibold rounded-2xl border border-purple-400/20 hover:border-purple-400/40 shadow-md shadow-purple-500/15 hover:shadow-purple-500/30 transition-all duration-500 hover:scale-105 hover:bg-right"
                                                        aria-label={t('dashboard.upgradeNow')}
                                                    >
                                                        <Crown className="w-4 h-4" aria-hidden="true" />
                                                        <span className="text-sm">{t('dashboard.upgradeNow')}</span>
                                                        <ChevronDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                                                    </button>
                                                ) : (
                                                    /* Expanded upgrade button */
                                                    <div className="relative">
                                                        <button
                                                            onClick={handleUpgradeClick}
                                                            className="group relative flex items-center gap-3 px-6 py-4 w-full bg-gradient-to-r from-purple-600 via-primary to-purple-600 bg-[length:200%_100%] text-white font-bold rounded-2xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-500 hover:scale-105 hover:bg-right"
                                                            aria-label={t('dashboard.upgradeNow')}
                                                        >
                                                            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                                                <Crown className="w-6 h-6" aria-hidden="true" />
                                                            </div>
                                                            <div className="flex flex-col items-start text-left">
                                                                <span className="text-lg leading-tight">{nextPlan.name}</span>
                                                                <span className="text-xs opacity-80 font-medium text-left">
                                                                    ${nextPlan.price.monthly}/{t('dashboard.perMonth')} · {t('dashboard.upgradeNow')}
                                                                </span>
                                                            </div>
                                                        </button>
                                                        {/* Minimize toggle */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleUpgradeMinimized(); }}
                                                            className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center bg-secondary/90 border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm z-10"
                                                            aria-label="Minimize"
                                                        >
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-lg text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                                        {t('dashboard.heroSubtitlePart1')} <span className="text-foreground font-semibold">{allUserProjects.length} {t('dashboard.heroSubtitlePart2')}</span> {t('dashboard.heroSubtitlePart3')}
                                    </p>

                                    {/* Status Cards */}
                                    <DashboardStatusCards />
                                </div>
                            </section>
                        )}


                        {isDashboard && showInstructions && (
                            <div className="w-full animate-fade-in-up">
                                <DashboardHelpGuide
                                    onClose={dismissInstructions}
                                    hasProjects={allUserProjects.length > 0}
                                    hasPublished={domains.some(d => d.status === 'active' || d.status === 'deployed')}
                                    hasDomain={domains.length > 0}
                                    hasCMSContent={cmsPosts.length > 0}
                                    onCreateProject={() => setIsOnboardingOpen(true)}
                                />
                            </div>
                        )}



                        {/* Statistics Section - Only on Websites view */}
                        {
                            isWebsites && (
                                <section className="relative z-[1] grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                    <div className="bg-card/50 border border-border hover:border-primary/30 rounded-xl md:rounded-2xl p-2.5 md:p-4 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                                            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-primary/20">
                                                <Globe className="text-primary w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                        <div className="text-xl md:text-3xl font-extrabold text-foreground">{allUserProjects.length}</div>
                                        <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">{t('dashboard.totalWebsites')}</div>
                                    </div>

                                    <div className="bg-card/50 border border-border hover:border-green-500/30 rounded-xl md:rounded-2xl p-2.5 md:p-4 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                                            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-green-500/20">
                                                <CheckCircle className="text-green-500 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                        <div className="text-xl md:text-3xl font-extrabold text-foreground">{publishedCount}</div>
                                        <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">{t('dashboard.published')}</div>
                                    </div>

                                    <div className="bg-card/50 border border-border hover:border-muted-foreground/30 rounded-xl md:rounded-2xl p-2.5 md:p-4 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                                            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-muted">
                                                <FileEdit className="text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                        <div className="text-xl md:text-3xl font-extrabold text-foreground">{draftCount}</div>
                                        <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">{t('dashboard.draft')}</div>
                                    </div>

                                    <div className="bg-card/50 border border-border hover:border-primary/30 rounded-xl md:rounded-2xl p-2.5 md:p-4 hover:shadow-lg transition-all">
                                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                                            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-primary/20">
                                                <LayoutGrid className="text-primary w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                        <div className="text-xl md:text-3xl font-extrabold text-foreground">{userProjects.length}</div>
                                        <div className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">{t('dashboard.filtered')}</div>
                                    </div>
                                </section>
                            )
                        }

                        {/* ─── Draggable Dashboard Sections (only on Dashboard view) ─── */}
                        {isDashboard && sectionOrder.map((sectionId) => {
                            const isDragging = draggedSection === sectionId;
                            const isOver = dragOverSection === sectionId && draggedSection !== sectionId;

                            const wrapperClasses = [
                                'group/drag relative rounded-2xl transition-all duration-300',
                                isDragging ? 'opacity-40 scale-[0.98]' : '',
                                isOver ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background' : '',
                            ].filter(Boolean).join(' ');

                            const dragHandle = (
                                <div
                                    draggable
                                    onDragStart={() => handleDragStart(sectionId)}
                                    onDragEnd={handleDragEnd}
                                    className="opacity-0 group-hover/drag:opacity-100 focus-within:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing flex-shrink-0 absolute right-0 top-1/2 -translate-y-1/2 mr-2"
                                    title={t('dashboard.dragToReorder', 'Arrastra para reordenar')}
                                    aria-label={t('dashboard.dragToReorder', 'Arrastra para reordenar')}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-secondary/80 transition-colors">
                                        <GripVertical size={14} className="text-muted-foreground/60" />
                                    </div>
                                </div>
                            );

                            // ── Projects Section ──
                            if (sectionId === 'projects') {
                                return (
                                    <div
                                        key="projects"
                                        className={wrapperClasses}
                                        onDragOver={(e) => handleDragOver(e, 'projects')}
                                        onDragLeave={handleDragLeave}
                                    >
                                        <section className="relative z-[1]">
                                            <div className={`flex items-center justify-between relative ${projectsCollapsed ? 'mb-0' : 'mb-6'}`}>
                                                <div className="flex items-center gap-0">
                                                    <button
                                                        onClick={toggleProjectsCollapsed}
                                                        className="text-2xl font-bold text-foreground flex items-center gap-3 hover:text-primary/90 transition-colors"
                                                        aria-expanded={!projectsCollapsed}
                                                    >
                                                        <LayoutGrid className="text-primary" size={24} />
                                                        {t('dashboard.recentProjects')}
                                                        <ChevronDown size={20} className={`text-muted-foreground transition-transform duration-300 ${projectsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                                                    </button>
                                                </div>
                                                {dragHandle}
                                                {!projectsCollapsed && allUserProjects.length > 0 && (
                                                    <button onClick={() => navigate(ROUTES.WEBSITES)} className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center">
                                                        {t('dashboard.viewAll')} <Globe size={14} className="ml-1" />
                                                    </button>
                                                )}
                                            </div>

                                            {!projectsCollapsed && (
                                            <>
                                            {isLoadingProjects ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                        <ProjectCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            ) : userProjects.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                                                    {userProjects.slice(0, 4).map(project => (
                                                        <ProjectCard
                                                            key={project.id}
                                                            project={project}
                                                            tokenUsage={projectUsage[project.id]}
                                                            maxTokens={maxTokens}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState
                                                    icon={searchQuery ? Search : Globe}
                                                    title={searchQuery ? t('dashboard.emptyState.titleNoProjects') : t('dashboard.emptyState.titleNoWebsites')}
                                                    description={
                                                        searchQuery
                                                            ? t('dashboard.emptyState.descNoProjects', { query: searchQuery })
                                                            : t('dashboard.emptyState.descNoWebsites')
                                                    }
                                                    illustration={searchQuery ? 'search' : 'website'}
                                                    action={searchQuery ? undefined : {
                                                        label: t('dashboard.emptyState.createFirst'),
                                                        onClick: () => setIsOnboardingOpen(true),
                                                        icon: Plus
                                                    }}
                                                    secondaryAction={searchQuery ? {
                                                        label: 'Clear Search',
                                                        onClick: () => setSearchQuery('')
                                                    } : undefined}
                                                />
                                            )}
                                            </>
                                            )}
                                        </section>
                                    </div>
                                );
                            }

                            // ── Templates Section ──
                            if (sectionId === 'templates') {
                                return (
                                    <div
                                        key="templates"
                                        className={wrapperClasses}
                                        onDragOver={(e) => handleDragOver(e, 'templates')}
                                        onDragLeave={handleDragLeave}
                                    >
                                        <section>
                                            <div className={`flex items-center justify-between relative ${templatesCollapsed ? 'mb-0' : 'mb-6'}`}>
                                                <div className="flex items-center gap-0">
                                                    <button
                                                        onClick={toggleTemplatesCollapsed}
                                                        className="text-2xl font-bold text-foreground flex items-center gap-3 hover:text-primary/90 transition-colors"
                                                        aria-expanded={!templatesCollapsed}
                                                    >
                                                        <LayoutTemplate className="text-primary" size={24} />
                                                        {t('dashboard.startFromTemplate')}
                                                        <ChevronDown size={20} className={`text-muted-foreground transition-transform duration-300 ${templatesCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                                                    </button>
                                                </div>
                                                {dragHandle}
                                                {!templatesCollapsed && (
                                                    <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1" role="group" aria-label={t('dashboard.templateSize', 'Tamaño de plantillas')}>
                                                        <button
                                                            onClick={() => toggleCompactTemplates(false)}
                                                            className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${!compactTemplates ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                            aria-label={t('dashboard.templateSizeLarge', 'Grande')}
                                                            aria-pressed={!compactTemplates}
                                                            title={t('dashboard.templateSizeLarge', 'Grande')}
                                                        >
                                                            <Maximize2 size={15} aria-hidden="true" />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleCompactTemplates(true)}
                                                            className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${compactTemplates ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                            aria-label={t('dashboard.templateSizeCompact', 'Compacto')}
                                                            aria-pressed={compactTemplates}
                                                            title={t('dashboard.templateSizeCompact', 'Compacto')}
                                                        >
                                                            <Minimize2 size={15} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {!templatesCollapsed && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                                                    {templates.slice(0, 4).map(template => (
                                                        <ProjectCard key={template.id} project={template} compact={compactTemplates} />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                );
                            }

                            // ── Leads Section ──
                            if (sectionId === 'leads') {
                                return (
                                    <div
                                        key="leads"
                                        className={wrapperClasses}
                                        onDragOver={(e) => handleDragOver(e, 'leads')}
                                        onDragLeave={handleDragLeave}
                                    >
                                        <section className="w-full">
                                            <div className={`flex items-center justify-between relative ${leadsCollapsed ? 'mb-0' : 'mb-6'}`}>
                                                <div className="flex items-center gap-0">
                                                    <button
                                                        onClick={toggleLeadsCollapsed}
                                                        className="text-2xl font-bold text-foreground flex items-center gap-3 hover:text-primary/90 transition-colors"
                                                        aria-expanded={!leadsCollapsed}
                                                    >
                                                        <Users className="text-primary" size={24} />
                                                        {t('dashboard.leads.title', 'Últimos Leads')}
                                                        <ChevronDown size={20} className={`text-muted-foreground transition-transform duration-300 ${leadsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                                                    </button>
                                                </div>
                                                {dragHandle}
                                                {!leadsCollapsed && (
                                                    <button
                                                        onClick={() => navigate(ROUTES.LEADS)}
                                                        className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center"
                                                    >
                                                        {t('dashboard.viewAll', 'Ver todos')} <Users size={14} className="ml-1" />
                                                    </button>
                                                )}
                                            </div>
                                            {!leadsCollapsed && (
                                                <div className="animate-fade-in-up">
                                                    <RecentLeads maxItems={6} />
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                );
                            }

                            // ── News Section ──
                            if (sectionId === 'news') {
                                return (
                                    <div
                                        key="news"
                                        className={wrapperClasses}
                                        onDragOver={(e) => handleDragOver(e, 'news')}
                                        onDragLeave={handleDragLeave}
                                    >
                                        <section className="w-full">
                                            <div className={`flex items-center justify-between relative ${newsCollapsed ? 'mb-0' : 'mb-0'}`}>
                                                <div className="flex items-center gap-0">
                                                    <button
                                                        onClick={toggleNewsCollapsed}
                                                        className="text-2xl font-bold text-foreground flex items-center gap-3 hover:text-primary/90 transition-colors mb-6"
                                                        aria-expanded={!newsCollapsed}
                                                    >
                                                        <Newspaper className="text-primary" size={24} />
                                                        {t('dashboard.news.title', 'Noticias y Novedades')}
                                                        <ChevronDown size={20} className={`text-muted-foreground transition-transform duration-300 ${newsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                                                    </button>
                                                </div>
                                                {dragHandle}
                                            </div>
                                            {!newsCollapsed && (
                                                <div className="animate-fade-in-up">
                                                    <NewsUpdates maxItems={4} hideHeader />
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                );
                            }

                            return null;
                        })}

                        {/* Projects Section - Full view for Websites page (non-draggable) */}
                        {
                            isWebsites && (
                                <section className="relative z-[1]">
                                    {/* Filter Chips - Only on Websites view */}
                                    <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                            <FilterChip
                                                label={t('dashboard.allStatus')}
                                                active={filterStatus === 'all'}
                                                count={allUserProjects.length}
                                                onClick={() => setFilterStatus('all')}
                                            />
                                            <FilterChip
                                                label={t('dashboard.published')}
                                                active={filterStatus === 'Published'}
                                                count={publishedCount}
                                                onClick={() => setFilterStatus('Published')}
                                                color="green"
                                            />
                                            <FilterChip
                                                label={t('dashboard.draft')}
                                                active={filterStatus === 'Draft'}
                                                count={draftCount}
                                                onClick={() => setFilterStatus('Draft')}
                                                color="gray"
                                            />

                                            {/* Spacer */}
                                            <div className="flex-1" />

                                            {/* Sort Button */}
                                            <button
                                                onClick={() => {
                                                    if (sortBy === 'lastUpdated') {
                                                        setSortBy('name');
                                                        setSortOrder('asc');
                                                    } else if (sortBy === 'name' && sortOrder === 'asc') {
                                                        setSortOrder('desc');
                                                    } else {
                                                        setSortBy('lastUpdated');
                                                        setSortOrder('desc');
                                                    }
                                                }}
                                                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                                aria-label={`Sort by ${sortBy} (${sortOrder}ending)`}
                                            >
                                                <ArrowUpDown size={14} aria-hidden="true" />
                                                <span className="hidden md:inline">
                                                    {sortBy === 'name' ? t('common.name') : t('common.updated')}
                                                </span>
                                            </button>

                                            {/* View Mode Toggle */}
                                            <div className="hidden sm:flex items-center gap-1 bg-secondary/40 rounded-lg p-1" role="group" aria-label="View mode">
                                                <button
                                                    onClick={() => setViewMode('grid')}
                                                    className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                    aria-label={t('dashboard.gridView')}
                                                    aria-pressed={viewMode === 'grid'}
                                                >
                                                    <LayoutGrid size={15} aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('list')}
                                                    className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                                    aria-label={t('dashboard.listView')}
                                                    aria-pressed={viewMode === 'list'}
                                                >
                                                    <List size={15} aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs md:text-sm text-muted-foreground">
                                                {t('dashboard.showingProjects', { count: userProjects.length, total: allUserProjects.length })}
                                            </span>
                                            {/* Mobile controls */}
                                            <div className="flex items-center gap-2 sm:hidden">
                                                <button
                                                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                                    className="p-2 bg-secondary/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {isLoadingProjects ? (
                                        <>
                                            {viewMode === 'grid' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                        <ProjectCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            )}
                                            {viewMode === 'list' && (
                                                <div className="space-y-4">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <ProjectCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : userProjects.length > 0 ? (
                                        <>
                                            {viewMode === 'grid' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                                                    {userProjects.map(project => (
                                                        <ProjectCard
                                                            key={project.id}
                                                            project={project}
                                                            tokenUsage={projectUsage[project.id]}
                                                            maxTokens={maxTokens}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {viewMode === 'list' && (
                                                <div className="space-y-4">
                                                    {userProjects.map(project => (
                                                        <ProjectListItem
                                                            key={project.id}
                                                            project={project}
                                                            tokenUsage={projectUsage[project.id]}
                                                            maxTokens={maxTokens}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <EmptyState
                                            icon={searchQuery ? Search : Globe}
                                            title={searchQuery ? t('dashboard.emptyState.titleNoProjects') : t('dashboard.emptyState.titleNoWebsites')}
                                            description={
                                                searchQuery
                                                    ? t('dashboard.emptyState.descNoProjects', { query: searchQuery })
                                                    : t('dashboard.emptyState.descNoWebsites')
                                            }
                                            illustration={searchQuery ? 'search' : 'website'}
                                            action={searchQuery ? undefined : {
                                                label: t('dashboard.emptyState.createFirst'),
                                                onClick: () => setIsOnboardingOpen(true),
                                                icon: Plus
                                            }}
                                            secondaryAction={searchQuery ? {
                                                label: 'Clear Search',
                                                onClick: () => setSearchQuery('')
                                            } : undefined}
                                        />
                                    )}
                                </section>
                            )
                        }



                        {/* File History (Full Assets View) */}
                        {
                            isAssets && (
                                <section className="h-full flex flex-col">
                                    {/* Header title moved to top bar, just rendering content now */}
                                    <div className="flex-1">
                                        <FileHistory variant="full" />
                                    </div>
                                </section>
                            )
                        }

                    </div >
                </main >

            </div >
        </div >
    );
};

export default Dashboard;
