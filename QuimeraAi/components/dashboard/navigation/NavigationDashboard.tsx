
import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import { useUI } from '../../../contexts/core/UIContext';
import { useCMS } from '../../../contexts/cms';
import { useProject } from '../../../contexts/project';
import { Menu as MenuIcon, Plus, ChevronRight, Trash2, LayoutGrid, Edit2, Copy, AlertCircle, Lightbulb, ArrowRight, Search, Layout, Info, Store, ChevronDown, Check, Layers, X, LayoutList, Link as LinkIcon, Globe, MousePointerClick, Compass } from 'lucide-react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import MenuEditor from './MenuEditor';
import { Menu } from '../../../types';
import ProjectSelectorPage from './ProjectSelectorPage';
import MobileSearchModal from '../../ui/MobileSearchModal';

const NavigationDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const { menus, deleteMenu, saveMenu } = useCMS();
    const { activeProject, activeProjectId, projects, loadProject, data } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [filterUsage, setFilterUsage] = useState<'all' | 'used' | 'unused' | 'empty'>('all');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; message: string; isUsed: boolean } | null>(null);

    // Determinar qué proyecto usar
    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

    // Filtrar menús
    const filteredMenus = useMemo(() => {
        return menus.filter(menu => {
            // Búsqueda
            const matchesSearch = menu.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                menu.handle.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Filtro de uso
            const usedInHeader = data?.header?.menuId === menu.id;
            const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
            const isUsed = usedInHeader || usedInFooter;
            const isEmpty = menu.items.length === 0;

            switch (filterUsage) {
                case 'used': return isUsed;
                case 'unused': return !isUsed;
                case 'empty': return isEmpty;
                default: return true;
            }
        });
    }, [menus, searchQuery, filterUsage, data]);

    // Estadísticas
    const stats = useMemo(() => {
        const total = menus.length;
        const active = menus.filter(m => {
            const usedInHeader = data?.header?.menuId === m.id;
            const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === m.id);
            return usedInHeader || usedInFooter;
        }).length;
        return {
            total,
            active,
            orphans: total - active
        };
    }, [menus, data]);

    const handleCreateNew = () => {
        const newMenu: Menu = {
            id: `menu_${Date.now()}`,
            title: t('navigationDashboard.untitledMenu'),
            handle: '',
            items: []
        };
        setEditingMenu(newMenu);
        setIsCreating(true);
    };

    const handleEdit = (menu: Menu) => {
        setEditingMenu(menu);
        setIsCreating(false);
    };

    const handleDuplicate = async (menu: Menu) => {
        const duplicatedMenu: Menu = {
            ...menu,
            id: `menu_${Date.now()}`,
            title: `${menu.title} (${t('cms.copyLabel')})`,
            handle: `${menu.handle}-copy`,
        };
        await saveMenu(duplicatedMenu);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Check if menu is in use
        const usedInHeader = data?.header?.menuId === id;
        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === id);
        const isUsed = !!(usedInHeader || usedInFooter);

        let confirmMessage = t('navigationDashboard.deleteConfirm');

        if (isUsed) {
            const locations = [];
            if (usedInHeader) locations.push(t('sections.header'));
            if (usedInFooter) locations.push(t('sections.footer'));
            confirmMessage = t('navigationDashboard.deleteUsedConfirm', { locations: locations.join(", ") }) + ' ' + t('navigationDashboard.deleteUsedWarning') + ' ' + t('navigationDashboard.deleteUsedQuestion');
        }

        setDeleteConfirm({ id, message: confirmMessage, isUsed });
    };

    const handleConfirmDelete = useCallback(async () => {
        if (deleteConfirm) {
            await deleteMenu(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    }, [deleteConfirm, deleteMenu]);

    const handleProjectSelect = (projectId: string) => {
        setSelectedProjectId(projectId);
        setShowProjectSelector(false);
        // Load the project but DO NOT switch view to editor
        loadProject(projectId, false, false);
    };

    // Mostrar página de selección de proyecto si no hay proyecto o si el usuario quiere ver todos
    if (showProjectSelector || !effectiveProjectId || projects.filter(p => p.status !== 'Template').length === 0) {
        return (
            <ProjectSelectorPage
                onProjectSelect={handleProjectSelect}
                onBack={showProjectSelector ? () => setShowProjectSelector(false) : () => setView('dashboard')}
            />
        );
    }

    if (editingMenu) {
        return (
            <MenuEditor
                menu={editingMenu}
                onClose={() => setEditingMenu(null)}
                isNew={isCreating}
                projectId={effectiveProjectId}
            />
        );
    }

    const hasUnassignedMenus = menus.some(m => {
        const usedInHeader = data?.header?.menuId === m.id;
        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === m.id);
        return !usedInHeader && !usedInFooter;
    });

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />

                {/* Standardized Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0" role="banner">
                    {/* Left Section - Menu & Title */}
                    <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary rounded-lg transition-colors touch-manipulation"
                            aria-label="Open navigation menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <MenuIcon className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Compass className="text-primary" size={24} aria-hidden="true" />
                            <h1 className="text-xl font-bold text-foreground hidden sm:block">
                                {t('navigationDashboard.title')}
                            </h1>
                        </div>
                    </div>

                    {/* Center Section - Search Bar */}
                    <div className="flex-1 flex justify-center px-2 sm:px-4">
                        <div className="hidden md:flex items-center gap-2 w-full max-w-xl bg-editor-border/40 rounded-lg px-3 py-2" role="search">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" aria-hidden="true" />
                            <input
                                type="search"
                                placeholder={t('navigationDashboard.searchMenus')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                aria-label={t('navigationDashboard.searchMenus')}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Mobile Search Button */}
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="md:hidden p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors"
                            aria-label="Toggle search"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    <MobileSearchModal
                        isOpen={isMobileSearchOpen}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onClose={() => setIsMobileSearchOpen(false)}
                        placeholder={t('navigationDashboard.searchMenus')}
                    />

                    {/* Right Section - Buttons */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Create Button */}
                        {effectiveProject && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title={t('navigationDashboard.addMenu')}
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden lg:inline">{t('navigationDashboard.addMenu')}</span>
                            </button>
                        )}

                        {/* View Toggle */}
                        <div className="hidden sm:flex items-center gap-1 bg-secondary/40 rounded-lg p-1" role="group" aria-label="View mode">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                aria-label="Grid view"
                                aria-pressed={viewMode === 'grid'}
                            >
                                <LayoutGrid size={15} aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'text-primary bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                aria-label="List view"
                                aria-pressed={viewMode === 'list'}
                            >
                                <LayoutList size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-background/50">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* Stats Overview */}
                        {effectiveProject && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl p-5 min-h-[130px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 dark:opacity-20 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-50 dark:group-hover:opacity-35 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                                    <div className="absolute right-4 bottom-3 select-none pointer-events-none">
                                        <span className="leading-[0.85] text-foreground/[0.08] dark:text-white/[0.10] group-hover:text-foreground/[0.14] dark:group-hover:text-white/[0.16] transition-colors duration-500" style={{ fontFamily: "'Fira Sans Extra Condensed', sans-serif", fontWeight: 100, fontSize: 'clamp(4rem, 6vw, 7rem)' }}>
                                            {stats.total}
                                        </span>
                                    </div>
                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-black/10">
                                            <Globe className="w-5 h-5 text-white" strokeWidth={2} />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium mt-auto">{t('navigationDashboard.totalMenus', 'Total de Menús')}</p>
                                    </div>
                                </div>
                                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl p-5 min-h-[130px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:scale-[1.03] hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 ease-out">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 dark:opacity-20 blur-2xl bg-gradient-to-br from-green-500 to-emerald-400 group-hover:opacity-50 dark:group-hover:opacity-35 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                                    <div className="absolute right-4 bottom-3 select-none pointer-events-none">
                                        <span className="leading-[0.85] text-foreground/[0.08] dark:text-white/[0.10] group-hover:text-foreground/[0.14] dark:group-hover:text-white/[0.16] transition-colors duration-500" style={{ fontFamily: "'Fira Sans Extra Condensed', sans-serif", fontWeight: 100, fontSize: 'clamp(4rem, 6vw, 7rem)' }}>
                                            {stats.active}
                                        </span>
                                    </div>
                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 shadow-lg shadow-black/10">
                                            <Check className="w-5 h-5 text-white" strokeWidth={2} />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium mt-auto">{t('navigationDashboard.activeMenus', 'Menús Activos')}</p>
                                    </div>
                                </div>
                                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl p-5 min-h-[130px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:scale-[1.03] hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 ease-out">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 dark:opacity-20 blur-2xl bg-gradient-to-br from-orange-500 to-amber-400 group-hover:opacity-50 dark:group-hover:opacity-35 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                                    <div className="absolute right-4 bottom-3 select-none pointer-events-none">
                                        <span className="leading-[0.85] text-foreground/[0.08] dark:text-white/[0.10] group-hover:text-foreground/[0.14] dark:group-hover:text-white/[0.16] transition-colors duration-500" style={{ fontFamily: "'Fira Sans Extra Condensed', sans-serif", fontWeight: 100, fontSize: 'clamp(4rem, 6vw, 7rem)' }}>
                                            {stats.orphans}
                                        </span>
                                    </div>
                                    <div className="relative z-10 flex flex-col justify-between h-full">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg shadow-black/10">
                                            <LinkIcon className="w-5 h-5 text-white" strokeWidth={2} />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium mt-auto">{t('navigationDashboard.orphanMenus', 'Sin Asignar')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Banner for Unassigned */}
                        {effectiveProject && hasUnassignedMenus && (
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-4 shadow-sm">
                                <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        {t('navigationDashboard.connectMenus')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('navigationDashboard.connectMenusDesc')}
                                        <button
                                            onClick={() => loadProject(effectiveProjectId!, false, true)}
                                            className="ml-1.5 text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors group"
                                        >
                                            {t('navigationDashboard.goToEditor')}
                                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Filter Bar */}
                        <div className="flex items-center gap-3">
                            <select
                                value={filterUsage}
                                onChange={(e) => setFilterUsage(e.target.value as any)}
                                className="px-3 py-2 text-sm bg-secondary/50 hover:bg-secondary border border-transparent focus:border-primary/30 rounded-lg outline-none cursor-pointer transition-all appearance-none"
                            >
                                <option value="all">{t('navigationDashboard.allMenus')}</option>
                                <option value="used">{t('navigationDashboard.inUse')}</option>
                                <option value="unused">{t('navigationDashboard.notInUse')}</option>
                                <option value="empty">{t('navigationDashboard.empty')}</option>
                            </select>
                            <span className="text-xs text-muted-foreground">
                                {filteredMenus.length} {filteredMenus.length === 1 ? 'menú' : 'menús'}
                            </span>
                        </div>

                        {/* Content Area */}
                        {filteredMenus.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-card/50 border border-border border-dashed rounded-xl">
                                <div className="p-4 bg-muted/50 rounded-full mb-4">
                                    <Search className="text-muted-foreground opacity-50" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-1">
                                    {searchQuery || filterUsage !== 'all'
                                        ? t('navigationDashboard.noMenusMatch')
                                        : t('navigationDashboard.noMenusFound')}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                                    {t('navigationDashboard.tryAdjustingFilters', 'Intenta ajustar tu búsqueda o crea un nuevo menú.')}
                                </p>
                                {effectiveProject && (
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors"
                                    >
                                        <Plus size={16} />
                                        {t('navigationDashboard.createNewMenu', 'Crear nuevo menú')}
                                    </button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* GRID VIEW */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredMenus.map((menu) => {
                                    const usedInHeader = data?.header?.menuId === menu.id;
                                    const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
                                    const isEmpty = menu.items.length === 0;

                                    return (
                                        <div
                                            key={menu.id}
                                            onClick={() => handleEdit(menu)}
                                            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out cursor-pointer"
                                        >
                                            {/* Gradient blob decoration */}
                                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 dark:opacity-15 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-40 dark:group-hover:opacity-30 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                                        {menu.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mt-1 font-mono bg-secondary/50 inline-block px-1.5 py-0.5 rounded">
                                                        {menu.handle}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {usedInHeader && (
                                                        <span className="p-1.5 rounded-full bg-primary/10 text-primary" title={t('sections.header')}>
                                                            <Layout size={14} />
                                                        </span>
                                                    )}
                                                    {usedInFooter && (
                                                        <span className="p-1.5 rounded-full bg-primary/10 text-primary" title={t('sections.footer')}>
                                                            <LayoutGrid size={14} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Preview of Items */}
                                            <div className="space-y-2 mb-6 min-h-[80px]">
                                                {isEmpty ? (
                                                    <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/5 p-3 rounded-lg border border-orange-500/10">
                                                        <AlertCircle size={16} />
                                                        <span>{t('navigationDashboard.emptyMenuDescShort', 'Este menú está vacío')}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {menu.items.slice(0, 3).map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-border md:group-hover:bg-primary/50 transition-colors"></div>
                                                                <span className="truncate">{item.text}</span>
                                                            </div>
                                                        ))}
                                                        {menu.items.length > 3 && (
                                                            <div className="text-xs text-muted-foreground pl-3.5 italic">
                                                                + {menu.items.length - 3} {t('common.more')}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Footer / Actions */}
                                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                                <span className="text-xs text-muted-foreground">
                                                    {menu.items.length} {t('navigationDashboard.items')}
                                                </span>

                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(menu); }}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title={t('common.edit')}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(menu); }}
                                                        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title={t('common.duplicate')}
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(e, menu.id)}
                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* LIST VIEW (Enhanced Table) */
                            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="p-4 font-medium text-sm text-muted-foreground">{t('editor.title')}</th>
                                                <th className="p-4 font-medium text-sm text-muted-foreground">{t('navigationDashboard.items')}</th>
                                                <th className="p-4 font-medium text-sm text-muted-foreground">{t('dashboard.usage')}</th>
                                                <th className="p-4 font-medium text-sm text-muted-foreground w-40 text-right pr-6">{t('common.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredMenus.map((menu) => {
                                                const usedInHeader = data?.header?.menuId === menu.id;
                                                const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
                                                const isEmpty = menu.items.length === 0;

                                                return (
                                                    <tr
                                                        key={menu.id}
                                                        onClick={() => handleEdit(menu)}
                                                        className="hover:bg-secondary/30 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${isEmpty ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'}`}>
                                                                    <MenuIcon size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-foreground">{menu.title}</div>
                                                                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{menu.handle}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-sm">
                                                            {isEmpty ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium text-orange-600 bg-orange-500/10 rounded-full">
                                                                    <AlertCircle size={12} />
                                                                    {t('navigationDashboard.empty')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                                                                    <MousePointerClick size={14} />
                                                                    {menu.items.length} {menu.items.length === 1 ? t('navigationDashboard.item') : t('navigationDashboard.items')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2 flex-wrap">
                                                                {usedInHeader && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-500/10 rounded-full border border-blue-200 dark:border-blue-900/30">
                                                                        <Layout size={12} />
                                                                        {t('sections.header')}
                                                                    </span>
                                                                )}
                                                                {usedInFooter && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-500/10 rounded-full border border-purple-200 dark:border-purple-900/30">
                                                                        <LayoutGrid size={12} />
                                                                        {t('sections.footer')}
                                                                    </span>
                                                                )}
                                                                {!usedInHeader && !usedInFooter && (
                                                                    <span className="text-xs text-muted-foreground/60 italic px-2">
                                                                        — {t('navigationDashboard.notAssigned')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEdit(menu); }}
                                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                    title={t('common.edit')}
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(menu); }}
                                                                    className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                                                    title={t('common.duplicate')}
                                                                >
                                                                    <Copy size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDelete(e, menu.id)}
                                                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                    title={t('common.delete')}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {effectiveProject && (
                            <div className="flex justify-center mt-8">
                                <p className="text-xs text-muted-foreground opacity-60">
                                    {t('navigationDashboard.menusHelp', 'Los menús te permiten organizar la navegación de tu sitio web.')}
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirm}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirm(null)}
                title={t('navigationDashboard.deleteMenuTitle', '¿Eliminar menú?')}
                message={deleteConfirm?.message || t('navigationDashboard.deleteConfirm')}
                variant={deleteConfirm?.isUsed ? 'warning' : 'danger'}
            />
        </div>
    );

};

export default NavigationDashboard;
