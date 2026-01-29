
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import { useUI } from '../../../contexts/core/UIContext';
import { useCMS } from '../../../contexts/cms';
import { useProject } from '../../../contexts/project';
import { Menu as MenuIcon, Plus, ChevronRight, Trash2, LayoutGrid, Edit2, Copy, AlertCircle, Lightbulb, ArrowRight, Search, Layout, Info, Store, ChevronDown, Check, Layers, X, LayoutList, Link as LinkIcon, Globe, MousePointerClick } from 'lucide-react';
import MenuEditor from './MenuEditor';
import { Menu } from '../../../types';
import ProjectSelectorPage from './ProjectSelectorPage';

const NavigationDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const { menus, deleteMenu, saveMenu } = useCMS();
    const { activeProject, activeProjectId, projects, loadProject, data } = useProject();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUsage, setFilterUsage] = useState<'all' | 'used' | 'unused' | 'empty'>('all');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Check if menu is in use
        const usedInHeader = data?.header?.menuId === id;
        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === id);

        let confirmMessage = t('navigationDashboard.deleteConfirm');

        if (usedInHeader || usedInFooter) {
            const locations = [];
            if (usedInHeader) locations.push(t('sections.header'));
            if (usedInFooter) locations.push(t('sections.footer'));
            confirmMessage = t('navigationDashboard.deleteUsedConfirm', { locations: locations.join(", ") }) + `\n\n` + t('navigationDashboard.deleteUsedWarning') + `\n\n` + t('navigationDashboard.deleteUsedQuestion');
        }

        if (window.confirm(confirmMessage)) {
            await deleteMenu(id);
        }
    };

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
                {/* Standardized Header */}
                <header className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-40">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <MenuIcon size={20} />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                        <MenuIcon className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-foreground">
                                            {t('navigationDashboard.title')}
                                        </h1>
                                        {/* Project Selector */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Store size={14} />
                                                <span className="max-w-[200px] truncate">
                                                    {effectiveProject?.name || t('navigationDashboard.selectProject', 'Seleccionar proyecto')}
                                                </span>
                                                <ChevronDown size={14} className={`transition-transform ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Dropdown */}
                                            {isProjectSelectorOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsProjectSelectorOpen(false)}
                                                    />
                                                    <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 py-2 max-h-96 overflow-auto">
                                                        {/* Header */}
                                                        <div className="px-4 py-2 border-b border-border/50 mb-2">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                                {t('navigationDashboard.quickSwitch', 'Cambio rápido')}
                                                            </p>
                                                        </div>

                                                        {/* Recent Projects */}
                                                        {projects.filter(p => p.status !== 'Template').slice(0, 5).map((project) => (
                                                            <button
                                                                key={project.id}
                                                                onClick={() => {
                                                                    handleProjectSelect(project.id);
                                                                    setIsProjectSelectorOpen(false);
                                                                }}
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${project.id === effectiveProjectId ? 'bg-primary/10' : ''
                                                                    }`}
                                                            >
                                                                {project.thumbnailUrl ? (
                                                                    <img
                                                                        src={project.thumbnailUrl}
                                                                        alt={project.name}
                                                                        className="w-10 h-10 rounded-lg object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                                        <Layers size={16} className="text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 text-left min-w-0">
                                                                    <span className="text-sm font-medium text-foreground truncate block">
                                                                        {project.name}
                                                                    </span>
                                                                    <span className={`text-xs ${project.status === 'Published' ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                                        {project.status === 'Published' ? t('dashboard.published', 'Publicado') : t('dashboard.draft', 'Borrador')}
                                                                    </span>
                                                                </div>
                                                                {project.id === effectiveProjectId && (
                                                                    <Check size={16} className="text-primary flex-shrink-0" />
                                                                )}
                                                            </button>
                                                        ))}

                                                        {/* View All Button */}
                                                        <div className="border-t border-border/50 mt-2 pt-2 px-2">
                                                            <button
                                                                onClick={() => {
                                                                    setShowProjectSelector(true);
                                                                    setIsProjectSelectorOpen(false);
                                                                }}
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            >
                                                                <Store size={16} />
                                                                {t('navigationDashboard.viewAllProjects', 'Ver todos los proyectos')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-background/50">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* Stats Overview */}
                        {effectiveProject && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('navigationDashboard.totalMenus', 'Total de Menús')}</p>
                                            <h3 className="text-2xl font-bold text-foreground">{stats.total}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                                            <Check size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('navigationDashboard.activeMenus', 'Menús Activos')}</p>
                                            <h3 className="text-2xl font-bold text-foreground">{stats.active}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                                            <LinkIcon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('navigationDashboard.orphanMenus', 'Sin Asignar')}</p>
                                            <h3 className="text-2xl font-bold text-foreground">{stats.orphans}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Banner for Unassigned */}
                        {effectiveProject && hasUnassignedMenus && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-4 shadow-sm">
                                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        {t('navigationDashboard.connectMenus')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('navigationDashboard.connectMenusDesc')}
                                        <button
                                            onClick={() => loadProject(effectiveProjectId!, false, true)}
                                            className="ml-1.5 text-blue-500 hover:text-blue-400 font-medium inline-flex items-center gap-1 transition-colors group"
                                        >
                                            {t('navigationDashboard.goToEditor')}
                                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Controls Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-2 rounded-xl border border-border shadow-sm">
                            <div className="flex items-center gap-2 w-full sm:w-auto p-1">
                                <div className="relative flex-1 sm:flex-initial">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder={t('navigationDashboard.searchMenus')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-secondary/50 hover:bg-secondary border border-transparent focus:border-primary/30 rounded-lg text-sm outline-none transition-all w-full sm:w-64"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="h-4 w-px bg-border mx-1 hidden sm:block"></div>

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
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto px-1">
                                {/* Create Button */}
                                {effectiveProject && (
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{t('navigationDashboard.addMenu')}</span>
                                    </button>
                                )}

                                <div className="h-4 w-px bg-border mx-1 hidden sm:block"></div>

                                {/* View Toggle */}
                                <div className="flex bg-secondary/50 rounded-lg p-1 border border-border/50">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                        title={t('navigationDashboard.gridView', 'Vista de cuadrícula')}
                                    >
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                        title={t('navigationDashboard.listView', 'Vista de lista')}
                                    >
                                        <LayoutList size={16} />
                                    </button>
                                </div>
                            </div>
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
                                            className="group bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden"
                                        >
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
        </div>
    );

};

export default NavigationDashboard;
