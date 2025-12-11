
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/core/AuthContext';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
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
import LanguageSelector from '../ui/LanguageSelector';
import { Plus, Menu, Search, LayoutGrid, Globe, Images, List, ArrowUpDown, CheckCircle, FileEdit, X, Upload, Download, Loader2, Sparkles, MousePointerClick, Palette, Rocket, LayoutTemplate, BookOpen } from 'lucide-react';
import { trackSearchPerformed, trackFilterApplied, trackSortChanged, trackViewModeChanged, trackDashboardView } from '../../utils/analytics';
import { importProjectFromFile } from '../../utils/projectImporter';
import { downloadMultipleProjectsAsJSON } from '../../utils/projectExporter';
import { useInfiniteScroll, paginateArray, hasMoreItems } from '../../hooks/useInfiniteScroll';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    
    // Using modular contexts
    const { user, userDocument } = useAuth();
    const { view, setIsOnboardingOpen } = useUI();
    const { projects, isLoadingProjects, addNewProject } = useProject();
    
    const { navigate } = useRouter();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Handle project import
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsImporting(true);
        try {
            const { projects: importedProjects, warnings } = await importProjectFromFile(file, user.uid);

            // Add all imported projects
            for (const project of importedProjects) {
                await addNewProject(project);
            }

            // Show success message
            alert(t('messages.importSuccess', { count: importedProjects.length }) + (warnings.length > 0 ? '\n\n' + t('common.warnings') + ':\n' + warnings.join('\n') : ''));

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Import error:', error);
            alert(t('messages.importError'));
        } finally {
            setIsImporting(false);
        }
    };

    // Handle export all projects
    const handleExportAll = () => {
        if (!user) return;
        downloadMultipleProjectsAsJSON(userProjects, user.email || 'unknown');
    };

    // Header Config
    let HeaderIcon = LayoutGrid;
    let headerTitle = t('dashboard.title');

    if (isWebsites) {
        HeaderIcon = Globe;
        headerTitle = t('dashboard.myWebsites');
    } else if (isAssets) {
        HeaderIcon = Images;
        headerTitle = t('dashboard.assets');
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
                {/* Standardized Header */}
                <header className="h-14 px-6 border-b border-border flex items-center bg-background z-20 sticky top-0" role="banner">
                    {/* Left Section - Logo & Title */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-xl transition-colors touch-manipulation"
                            aria-label="Open navigation menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <HeaderIcon className="text-primary" size={24} aria-hidden="true" />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">{headerTitle}</h1>
                        </div>
                    </div>

                    {/* Center Section - Search Bar */}
                    <div className="flex-1 flex justify-center px-4">
                        {(isDashboard || isWebsites) && (
                            <div className="relative group w-full max-w-xl hidden md:block" role="search">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder={t('dashboard.searchProjects')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-secondary/50 border border-border/40 focus:border-primary/60 focus:bg-secondary/80 rounded-xl py-2.5 pl-11 pr-4 outline-none transition-all placeholder:text-muted-foreground/60 text-sm shadow-sm focus:shadow-md"
                                    aria-label={t('dashboard.searchProjects')}
                                />
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

                    {/* Right Section - Actions & Language */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* View Mode Toggle - Only on Websites view */}
                        {isWebsites && (
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
                        )}

                        {/* Sort Button - Only on Websites view */}
                        {isWebsites && (
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
                                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                aria-label={`Sort by ${sortBy} (${sortOrder}ending)`}
                            >
                                <ArrowUpDown size={14} aria-hidden="true" />
                                <span className="hidden lg:inline">
                                    {sortBy === 'name' ? t('common.name') : t('common.updated')}
                                </span>
                            </button>
                        )}

                        {/* Import/Export buttons - Only on Websites view */}
                        {isWebsites && userProjects.length > 0 && (
                            <>
                                <button
                                    onClick={handleExportAll}
                                    className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                    title={t('common.export')}
                                    aria-label={t('dashboard.exportAllProjects')}
                                >
                                    <Download className="w-4 h-4" aria-hidden="true" />
                                    <span className="hidden lg:inline">{t('common.export')}</span>
                                </button>

                                <button
                                    onClick={handleImportClick}
                                    disabled={isImporting}
                                    className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-50"
                                    title={t('common.import')}
                                    aria-label={t('dashboard.importProjects')}
                                >
                                    <Upload className="w-4 h-4" aria-hidden="true" />
                                    <span className="hidden lg:inline">{isImporting ? t('common.importing') : t('common.import')}</span>
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    aria-label="File input for importing projects"
                                />
                            </>
                        )}

                        {/* Help/Instructions Button - Only on Dashboard when instructions are hidden */}
                        {isDashboard && !showInstructions && (
                            <button
                                onClick={() => {
                                    setShowInstructions(true);
                                    localStorage.setItem('quimera_show_instructions', 'true');
                                }}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title={t('dashboard.showHelp', 'Mostrar guía')}
                            >
                                <BookOpen className="w-4 h-4" />
                                <span className="hidden lg:inline">{t('dashboard.help', 'Ayuda')}</span>
                            </button>
                        )}

                        {/* Separator */}
                        <div className="hidden sm:block h-6 w-px bg-border/50 mx-1"></div>

                        {/* Language Selector */}
                        <LanguageSelector />
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
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                    autoFocus
                                    aria-label="Search projects"
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
                                    {userProjects.length} results found
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
                    <div className="max-w-7xl mx-auto space-y-10 h-full">

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

                                        {/* New Project CTA - Opens Onboarding */}
                                        <button
                                            onClick={() => setIsOnboardingOpen(true)}
                                            className="group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 bg-[length:200%_100%] text-slate-900 font-bold rounded-2xl shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-500 hover:scale-105 hover:bg-right"
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
                                    </div>

                                    <p className="text-lg text-muted-foreground max-w-3xl mb-8 leading-relaxed">
                                        {t('dashboard.heroSubtitlePart1')} <span className="text-foreground font-semibold">{allUserProjects.length} {t('dashboard.heroSubtitlePart2')}</span> {t('dashboard.heroSubtitlePart3')}
                                    </p>

                                    {/* Inline Stats */}
                                    <div className="flex items-center gap-8 mt-2">
                                        <div className="flex items-center gap-3 group cursor-default">
                                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                                <LayoutGrid size={22} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-extrabold text-foreground leading-none">{allUserProjects.length}</span>
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{t('dashboard.totalProjects')}</span>
                                            </div>
                                        </div>

                                        <div className="h-10 w-px bg-border mx-2"></div>

                                        <div className="flex items-center gap-3 group cursor-default">
                                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                                                <Globe size={22} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-extrabold text-foreground leading-none">{publishedCount}</span>
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{t('dashboard.published')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Instructions Banner - Dismissible */}
                        {isDashboard && showInstructions && (
                            <section className="w-full animate-fade-in">
                                <div className="relative flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0">
                                    {/* Floating Image - Outside the box, full height */}
                                    <div className="hidden lg:flex relative z-10 flex-shrink-0 -mr-6 items-end">
                                        <img
                                            src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2FALeTxAC97FPhl7ymtEhAn.jpg?alt=media&token=e1ed6666-f72c-41bc-ad51-165161f361c2"
                                            alt="Quimera AI Guide"
                                            className="w-auto h-full max-h-[400px] object-contain"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>

                                    {/* Content Box */}
                                    <div className="relative flex-1 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl overflow-hidden lg:pl-10">
                                        {/* Background decoration */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                                        {/* Close button */}
                                        <button
                                            onClick={dismissInstructions}
                                            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors z-20"
                                            aria-label={t('common.close')}
                                        >
                                            <X size={18} />
                                        </button>

                                        {/* Content Section */}
                                        <div className="relative z-10 p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-3 bg-primary/20 rounded-xl">
                                                    <BookOpen className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-foreground">
                                                        {t('dashboard.instructionsTitle', '¿Cómo usar Quimera.ai?')}
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t('dashboard.instructionsSubtitle', 'Sigue estos pasos para crear tu sitio web')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Step 1 */}
                                                <div className="flex items-start gap-3 p-4 bg-card/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                                                        1
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Sparkles className="w-4 h-4 text-primary" />
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {t('dashboard.step1Title', 'Crea tu proyecto')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('dashboard.step1Desc', 'Haz clic en "Nuevo Proyecto" y describe tu negocio para generar tu sitio con IA')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Step 2 */}
                                                <div className="flex items-start gap-3 p-4 bg-card/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                                                        2
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Palette className="w-4 h-4 text-purple-500" />
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {t('dashboard.step2Title', 'Personaliza el diseño')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('dashboard.step2Desc', 'Edita colores, textos, imágenes y secciones desde el editor visual')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Step 3 */}
                                                <div className="flex items-start gap-3 p-4 bg-card/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                                                        3
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <LayoutTemplate className="w-4 h-4 text-blue-500" />
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {t('dashboard.step3Title', 'O usa una plantilla')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('dashboard.step3Desc', 'Explora plantillas profesionales en la sección "Plantillas" del menú')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Step 4 */}
                                                <div className="flex items-start gap-3 p-4 bg-card/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
                                                        4
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Rocket className="w-4 h-4 text-green-500" />
                                                            <span className="font-semibold text-foreground text-sm">
                                                                {t('dashboard.step4Title', 'Publica tu sitio')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('dashboard.step4Desc', 'Conecta tu dominio o usa nuestro hosting gratuito para publicar')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                                                <p className="text-xs text-muted-foreground">
                                                    {t('dashboard.instructionsTip', '💡 Puedes cerrar esta guía y siempre verla de nuevo desde la configuración')}
                                                </p>
                                                <button
                                                    onClick={dismissInstructions}
                                                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                                >
                                                    {t('dashboard.gotIt', 'Entendido, ocultar')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Statistics Section - Only on Websites view */}
                        {isWebsites && (
                            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-blue-500/20">
                                            <Globe className="text-blue-500" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-foreground">{allUserProjects.length}</div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Total Websites</div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-green-500/20">
                                            <CheckCircle className="text-green-500" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-foreground">{publishedCount}</div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Published</div>
                                </div>

                                <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-500/20 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-slate-500/20">
                                            <FileEdit className="text-slate-400" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-foreground">{draftCount}</div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Drafts</div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-4 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-lg bg-purple-500/20">
                                            <LayoutGrid className="text-purple-500" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-foreground">{userProjects.length}</div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Filtered</div>
                                </div>
                            </section>
                        )}

                        {/* Projects Section */}
                        {(isDashboard || isWebsites) && (
                            <section>
                                {/* Only show section header on Dashboard view, since Websites view has it in main header */}
                                {isDashboard && (
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-foreground flex items-center">
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
                                    <div className="mb-6 space-y-4">
                                        <div className="flex flex-wrap gap-3">
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
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Showing {userProjects.length} of {allUserProjects.length} projects
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
                                        title={searchQuery ? 'No projects found' : 'No websites yet'}
                                        description={
                                            searchQuery
                                                ? `No projects match "${searchQuery}". Try adjusting your search or clear filters.`
                                                : 'Start building your online presence. Create your first website in minutes with our AI-powered builder.'
                                        }
                                        illustration={searchQuery ? 'search' : 'website'}
                                        action={searchQuery ? undefined : {
                                            label: 'Create Your First Website',
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
                        )}

                        {/* Templates Section (Only on Dashboard) */}
                        {isDashboard && (
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-foreground flex items-center">
                                        {t('dashboard.startFromTemplate')}
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {templates.slice(0, 4).map(template => (
                                        <ProjectCard key={template.id} project={template} />
                                    ))}
                                </div>
                            </section>
                        )}



                        {/* File History (Full Assets View) */}
                        {isAssets && (
                            <section className="h-full flex flex-col">
                                {/* Header title moved to top bar, just rendering content now */}
                                <div className="flex-1">
                                    <FileHistory variant="full" />
                                </div>
                            </section>
                        )}

                    </div>
                </main>

            </div>
        </div>
    );
};

export default Dashboard;
