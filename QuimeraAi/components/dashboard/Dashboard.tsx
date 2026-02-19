
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
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
import DashboardHelpGuide from './DashboardHelpGuide';
import DashboardStatusCards from './DashboardStatusCards';
import { Plus, Menu, Search, LayoutGrid, Globe, Images, List, ArrowUpDown, CheckCircle, FileEdit, X, Loader2, Sparkles, MousePointerClick, Palette, Rocket, LayoutTemplate, BookOpen, ArrowLeft, Crown, ChevronUp, ChevronDown } from 'lucide-react';
import { trackSearchPerformed, trackFilterApplied, trackSortChanged, trackViewModeChanged, trackDashboardView } from '../../utils/analytics';
import { useInfiniteScroll, paginateArray, hasMoreItems } from '../../hooks/useInfiniteScroll';
import { usePlans } from '../../contexts/PlansContext';
import { useSafeUpgrade } from '../../contexts/UpgradeContext';
import { useCreditsUsage } from '../../hooks/useCreditsUsage';
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
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">{headerTitle}</h1>
                        </div>
                    </div>

                    {/* Center Section - Search Bar */}
                    <div className="flex-1 flex justify-center px-2 sm:px-4">
                        {(isDashboard || isWebsites) && (
                            <div className="hidden md:flex items-center gap-2 w-full max-w-xl bg-editor-border/40 rounded-lg px-3 py-2" role="search">
                                <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder={t('dashboard.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                    aria-label={t('dashboard.searchProjects')}
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Mobile Search Button */}
                        {(isDashboard || isWebsites) && (
                            <button
                                onClick={() => setShowMobileSearch(true)}
                                className="md:hidden p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors"
                                aria-label="Open search"
                                aria-expanded={showMobileSearch}
                            >
                                <Search size={20} />
                            </button>
                        )}
                    </div>

                    {/* Right Section - Back Button Only */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Help/Instructions Button - Only on Dashboard when instructions are hidden */}
                        {isDashboard && !showInstructions && (
                            <button
                                onClick={() => {
                                    setShowInstructions(true);
                                    localStorage.setItem('quimera_show_instructions', 'true');
                                }}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title={t('dashboard.showHelp')}
                            >
                                <BookOpen className="w-4 h-4" />
                                <span className="hidden lg:inline">{t('dashboard.help')}</span>
                            </button>
                        )}

                        {/* Back Button - Only when not on main dashboard (websites/assets) */}
                        {!isDashboard && (
                            <button
                                onClick={() => navigate(ROUTES.DASHBOARD)}
                                className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                                aria-label={t('common.goBack', 'Volver')}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                            </button>
                        )}

                    </div>
                </header>

                {/* Mobile Search Overlay */}
                {showMobileSearch && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden flex items-start justify-center pt-20"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Search projects"
                    >
                        <div className="bg-card border border-border rounded-2xl shadow-2xl w-[90%] max-w-md p-4 animate-fade-in-up">
                            <div className="flex items-center gap-2 mb-2" role="search">
                                <Search className="text-muted-foreground" size={20} aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder={t('dashboard.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                    autoFocus
                                    aria-label={t('dashboard.searchProjects')}
                                />
                                <button
                                    onClick={() => setShowMobileSearch(false)}
                                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Close search"
                                >
                                    <X size={20} aria-hidden="true" />
                                </button>
                            </div>
                            {searchQuery && (
                                <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
                                    {t('dashboard.resultsFound', { count: userProjects.length })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                                            <img
                                                src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
                                                alt="Quimera Logo"
                                                className="w-12 h-12 md:w-16 md:h-16 object-contain mr-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                                                width={64}
                                                height={64}
                                                loading="eager"
                                                decoding="async"
                                            />
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
                                <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
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

                        {/* Projects Section */}
                        {
                            (isDashboard || isWebsites) && (
                                <section>
                                    {/* Only show section header on Dashboard view, since Websites view has it in main header */}
                                    {isDashboard && (
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                                <LayoutGrid className="text-primary" size={24} />
                                                {t('dashboard.recentProjects')}
                                            </h2>
                                            {allUserProjects.length > 0 && (
                                                <button onClick={() => navigate(ROUTES.WEBSITES)} className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center">
                                                    {t('dashboard.viewAll')} <Globe size={14} className="ml-1" />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Filter Chips - Only on Websites view */}
                                    {isWebsites && (
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
                                    )}

                                    {isLoadingProjects ? (
                                        <>
                                            {/* Grid View Skeleton */}
                                            {viewMode === 'grid' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                                        <ProjectCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            )}

                                            {/* List View Skeleton */}
                                            {viewMode === 'list' && isWebsites && (
                                                <div className="space-y-4">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <ProjectCardSkeleton key={i} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : userProjects.length > 0 ? (
                                        <>
                                            {/* Grid View */}
                                            {viewMode === 'grid' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {(isWebsites ? userProjects : userProjects.slice(0, 4)).map(project => (
                                                        <ProjectCard key={project.id} project={project} />
                                                    ))}
                                                </div>
                                            )}

                                            {/* List View */}
                                            {viewMode === 'list' && isWebsites && (
                                                <div className="space-y-4">
                                                    {userProjects.map(project => (
                                                        <ProjectListItem key={project.id} project={project} />
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

                        {/* Templates Section (Only on Dashboard) */}
                        {
                            isDashboard && (
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                            <LayoutTemplate className="text-primary" size={24} />
                                            {t('dashboard.startFromTemplate')}
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {templates.slice(0, 4).map(template => (
                                            <ProjectCard key={template.id} project={template} />
                                        ))}
                                    </div>
                                </section>
                            )
                        }

                        {/* News & Updates Section - Show on Dashboard (after templates) */}
                        {
                            isDashboard && (
                                <section className="w-full">
                                    <NewsUpdates maxItems={4} />
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
