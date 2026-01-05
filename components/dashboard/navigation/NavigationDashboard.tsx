
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardSidebar from '../DashboardSidebar';
import { useUI } from '../../../contexts/core/UIContext';
import { useCMS } from '../../../contexts/cms';
import { useProject } from '../../../contexts/project';
import { Menu as MenuIcon, Plus, ChevronRight, Trash2, LayoutGrid, Edit2, Copy, AlertCircle, Lightbulb, ArrowRight, Search, Layout, Info, Store, ChevronDown, Check, Layers, X } from 'lucide-react';
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
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors ${
                                                                    project.id === effectiveProjectId ? 'bg-primary/10' : ''
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

                <main className="flex-1 p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-5xl mx-auto">

                        {/* Info Banner */}
                        {effectiveProject && hasUnassignedMenus && (
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                                <Info className="text-blue-500 flex-shrink-0" size={20} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        {t('navigationDashboard.connectMenus')}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {t('navigationDashboard.connectMenusDesc')}
                                        <button
                                            onClick={() => loadProject(effectiveProjectId!, false, true)}
                                            className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            {t('navigationDashboard.goToEditor')}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Search and Filters */}
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-foreground">{t('navigationDashboard.menus')}</h2>
                                {menus.length > 0 && (
                                    <span className="px-2 py-1 text-xs font-medium bg-secondary rounded-full text-muted-foreground">
                                        {filteredMenus.length} {t('common.of')} {menus.length}
                                    </span>
                                )}
                            </div>

                                {effectiveProject && menus.length > 0 && (
                                <div className="flex items-center gap-3">
                                    {/* Búsqueda */}
                                    <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-1.5 w-48">
                                        <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder={t('navigationDashboard.searchMenus')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filtro */}
                                    <select
                                        value={filterUsage}
                                        onChange={(e) => setFilterUsage(e.target.value as any)}
                                        className="px-3 py-1.5 text-sm bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                    >
                                        <option value="all">{t('navigationDashboard.allMenus')}</option>
                                        <option value="used">{t('navigationDashboard.inUse')}</option>
                                        <option value="unused">{t('navigationDashboard.notInUse')}</option>
                                        <option value="empty">{t('navigationDashboard.empty')}</option>
                                    </select>
                                </div>
                            )}

                            {effectiveProject && (
                                <button
                                    onClick={handleCreateNew}
                                    className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                                >
                                    <Plus className="w-4 h-4" /> {t('navigationDashboard.addMenu')}
                                </button>
                            )}
                        </div>

                        {/* Empty Menu Warning */}
                                {menus.some(m => m.items.length === 0) && (
                                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="text-yellow-500 flex-shrink-0" size={20} />
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-foreground mb-1">
                                                    {t('navigationDashboard.emptyMenuDetected')}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    "{menus.find(m => m.items.length === 0)?.title}" {t('navigationDashboard.emptyMenuDesc')}
                                                </p>
                                                <button
                                                    onClick={() => handleEdit(menus.find(m => m.items.length === 0)!)}
                                                    className="text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                                                >
                                                    {t('navigationDashboard.addItemsNow')}
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white dark:bg-card black:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-border bg-secondary/20">
                                                    <th className="p-4 font-medium text-sm text-muted-foreground">{t('editor.title')}</th>
                                                    <th className="p-4 font-medium text-sm text-muted-foreground">{t('navigationDashboard.items')}</th>
                                                    <th className="p-4 font-medium text-sm text-muted-foreground">{t('dashboard.usage')}</th>
                                                    <th className="p-4 font-medium text-sm text-muted-foreground w-32">{t('common.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {filteredMenus.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                            {searchQuery || filterUsage !== 'all'
                                                                ? t('navigationDashboard.noMenusMatch')
                                                                : t('navigationDashboard.noMenusFound')}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredMenus.map((menu) => {
                                                        const usedInHeader = data?.header?.menuId === menu.id;
                                                        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
                                                        const isEmpty = menu.items.length === 0;

                                                        return (
                                                            <tr
                                                                key={menu.id}
                                                                onClick={() => handleEdit(menu)}
                                                                className={`hover:bg-secondary/30 cursor-pointer transition-colors group ${isEmpty ? 'opacity-70' : ''}`}
                                                            >
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="font-semibold text-foreground">{menu.title}</div>
                                                                        {isEmpty && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-orange-500 bg-orange-500/10 rounded-full">
                                                                                {t('navigationDashboard.empty')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {menu.handle && <div className="text-xs text-muted-foreground mt-0.5">{t('navigationDashboard.handle')}: {menu.handle}</div>}
                                                                </td>
                                                                <td className="p-4 text-sm">
                                                                    {isEmpty ? (
                                                                        <span className="text-orange-500 flex items-center gap-1">
                                                                            <AlertCircle size={14} />
                                                                            {t('navigationDashboard.empty')}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">
                                                                            {menu.items.length} {menu.items.length === 1 ? t('navigationDashboard.item') : t('navigationDashboard.items')}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {usedInHeader && (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                                                                <Layout size={12} />
                                                                                {t('sections.header')}
                                                                            </span>
                                                                        )}
                                                                        {usedInFooter && (
                                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                                                                <LayoutGrid size={12} />
                                                                                {t('sections.footer')}
                                                                            </span>
                                                                        )}
                                                                        {!usedInHeader && !usedInFooter && (
                                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                <AlertCircle size={12} />
                                                                                <span>{t('navigationDashboard.notAssigned')}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleEdit(menu); }}
                                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                                                            title="Edit menu"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(menu); }}
                                                                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-all"
                                                                            title="Duplicate"
                                                                        >
                                                                            <Copy size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => handleDelete(e, menu.id)}
                                                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                        {effectiveProject && (
                            <div className="mt-6 flex justify-between items-center">
                                <div className="text-sm text-muted-foreground">
                                    <p>{t('navigationDashboard.menusHelp')}</p>
                                </div>
                                <button
                                    onClick={() => loadProject(effectiveProject.id, false, false)}
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                >
                                    {t('navigationDashboard.refreshData')}
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default NavigationDashboard;
