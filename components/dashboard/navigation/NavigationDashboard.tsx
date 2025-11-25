
import React, { useState, useMemo } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { useEditor } from '../../../contexts/EditorContext';
import { Menu as MenuIcon, Plus, ChevronRight, Trash2, LayoutGrid, Edit2, Copy, AlertCircle, Lightbulb, ArrowRight, Search, Layout, Info } from 'lucide-react';
import MenuEditor from './MenuEditor';
import { Menu } from '../../../types';

const NavigationDashboard: React.FC = () => {
    const { menus, deleteMenu, saveMenu, activeProject, projects, loadProject, data, setView } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUsage, setFilterUsage] = useState<'all' | 'used' | 'unused' | 'empty'>('all');

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
            title: 'Untitled Menu',
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
            title: `${menu.title} (Copy)`,
            handle: `${menu.handle}-copy`,
        };
        await saveMenu(duplicatedMenu);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        
        // Check if menu is in use
        const usedInHeader = data?.header?.menuId === id;
        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === id);
        
        let confirmMessage = "Delete this menu? This action cannot be undone.";
        
        if (usedInHeader || usedInFooter) {
            const locations = [];
            if (usedInHeader) locations.push("Header");
            if (usedInFooter) locations.push("Footer");
            confirmMessage = `⚠️ This menu is currently being used in: ${locations.join(", ")}.\n\nDeleting it will remove these navigation links from your website.\n\nAre you sure you want to continue?`;
        }
        
        if(window.confirm(confirmMessage)) {
            await deleteMenu(id);
        }
    };
    
    const handleActivateProject = (projectId: string) => {
        // Load the project but DO NOT switch view to editor
        loadProject(projectId, false, false);
    };

    const menuStats = useMemo(() => {
        const used = menus.filter(menu => {
            const usedInHeader = data?.header?.menuId === menu.id;
            const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
            return usedInHeader || usedInFooter;
        }).length;

        const empty = menus.filter(menu => menu.items.length === 0).length;

        return {
            total: menus.length,
            used,
            unused: Math.max(menus.length - used, 0),
            empty
        };
    }, [menus, data]);

    if (editingMenu) {
        return (
            <MenuEditor
                menu={editingMenu}
                onClose={() => setEditingMenu(null)}
                isNew={isCreating}
            />
        );
    }

    const userProjects = projects.filter(p => p.status !== 'Template');
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
                <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="h-9 w-9 flex items-center justify-center text-muted-foreground lg:hidden hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <MenuIcon className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <MenuIcon className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">Navigation</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeProject && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <span className="mr-1.5">Project:</span>
                                <span className="font-semibold text-foreground">{activeProject.name}</span>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-5xl mx-auto">
                        
                        {/* Info Banner */}
                        {activeProject && hasUnassignedMenus && (
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                                <Info className="text-blue-500 flex-shrink-0" size={20} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        Connect your menus
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Menus won't appear on your website until you assign them to your Header or Footer. 
                                        <button 
                                            onClick={() => setView('editor')}
                                            className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            Go to Editor →
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeProject && (
                            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 mb-8 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Navigation Hub</p>
                                        <h2 className="text-2xl font-bold text-foreground mb-1">Diseña y organiza la navegación</h2>
                                        <p className="text-sm text-muted-foreground max-w-2xl">Gestiona los menús que alimentan el header y el footer de tu sitio. Duplica, asigna y edita enlaces con un flujo más moderno y visual.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-start md:justify-end">
                                        <button
                                            onClick={() => setView('editor')}
                                            className="h-10 px-4 rounded-lg border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-all text-sm font-semibold flex items-center gap-2"
                                        >
                                            <Layout className="w-4 h-4" /> Ir al editor
                                        </button>
                                        <button
                                            onClick={handleCreateNew}
                                            className="h-10 px-4 rounded-lg bg-primary text-white hover:shadow-lg transition-all text-sm font-semibold flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Nuevo menú
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeProject && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {[{ label: 'Menús totales', value: menuStats.total, accent: 'text-primary', bg: 'bg-primary/10' },
                                  { label: 'Asignados', value: menuStats.used, accent: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                  { label: 'Sin asignar', value: menuStats.unused, accent: 'text-amber-500', bg: 'bg-amber-500/10' },
                                  { label: 'Vacíos', value: menuStats.empty, accent: 'text-orange-500', bg: 'bg-orange-500/10' }].map((card, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border border-border bg-card/80 backdrop-blur shadow-sm flex items-center justify-between ${card.bg}`}>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                                            <p className={`text-2xl font-bold mt-1 ${card.accent}`}>{card.value}</p>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-background/60 border border-border flex items-center justify-center text-muted-foreground">
                                            <LayoutGrid className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search and Filters */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Menús disponibles</p>
                                    <h3 className="text-lg font-semibold text-foreground">{filteredMenus.length} resultados</h3>
                                </div>
                                {menus.length > 0 && (
                                    <span className="px-2 py-1 text-xs font-medium bg-secondary rounded-full text-muted-foreground">
                                        {filteredMenus.length} de {menus.length}
                                    </span>
                                )}
                            </div>

                            {activeProject && menus.length > 0 && (
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Buscar menús..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none w-52 shadow-sm"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1.5 shadow-sm">
                                        {[{ id: 'all', label: 'Todos' }, { id: 'used', label: 'En uso' }, { id: 'unused', label: 'Sin asignar' }, { id: 'empty', label: 'Vacíos' }].map(filter => (
                                            <button
                                                key={filter.id}
                                                onClick={() => setFilterUsage(filter.id as any)}
                                                className={`text-xs px-3 py-1 rounded-md transition-all ${filterUsage === filter.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!activeProject ? (
                            <div className="p-8 bg-card border border-border rounded-xl shadow-sm">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <LayoutGrid className="text-muted-foreground opacity-50" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Select a Project</h3>
                                    <p className="text-muted-foreground">Choose a project to manage its navigation menus.</p>
                                </div>
                                
                                {userProjects.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {userProjects.map(project => (
                                            <button 
                                                key={project.id}
                                                onClick={() => handleActivateProject(project.id)}
                                                className="flex items-center p-4 bg-secondary/20 border border-border rounded-lg hover:border-primary/50 hover:bg-secondary/40 transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 rounded bg-secondary mr-3 overflow-hidden shrink-0">
                                                     <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{project.name}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(project.lastUpdated).toLocaleDateString()}</p>
                                                </div>
                                                <ChevronRight size={16} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground">You don't have any projects yet.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Empty Menu Warning */}
                                {menus.some(m => m.items.length === 0) && (
                                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="text-yellow-500 flex-shrink-0" size={20} />
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-foreground mb-1">
                                                    Empty menu detected
                                                </h4>
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    "{menus.find(m => m.items.length === 0)?.title}" doesn't have any items. Add navigation links to make it functional.
                                                </p>
                                                <button 
                                                    onClick={() => handleEdit(menus.find(m => m.items.length === 0)!)}
                                                    className="text-xs font-medium text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
                                                >
                                                    Add items now
                                                    <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {filteredMenus.length === 0 ? (
                                    <div className="p-10 border border-dashed border-border rounded-2xl text-center bg-card">
                                        <div className="w-14 h-14 rounded-full bg-secondary/60 mx-auto mb-3 flex items-center justify-center">
                                            <LayoutGrid className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-1">No hay menús aún</h3>
                                        <p className="text-sm text-muted-foreground mb-4">Crea tu primer menú o ajusta los filtros para ver resultados.</p>
                                        <button
                                            onClick={handleCreateNew}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:shadow-lg transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Crear menú
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredMenus.map((menu) => {
                                            const usedInHeader = data?.header?.menuId === menu.id;
                                            const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === menu.id);
                                            const isEmpty = menu.items.length === 0;

                                            return (
                                                <div
                                                    key={menu.id}
                                                    onClick={() => handleEdit(menu)}
                                                    className={`group relative p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer ${isEmpty ? 'opacity-90' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-base font-semibold text-foreground">{menu.title}</h4>
                                                                {isEmpty && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-orange-500 bg-orange-500/10 rounded-full">Vacío</span>
                                                                )}
                                                            </div>
                                                            {menu.handle && (
                                                                <p className="text-xs text-muted-foreground">Handle: {menu.handle}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(menu); }}
                                                                className="p-2 rounded-lg border border-border hover:border-primary/50 hover:text-primary"
                                                                title="Editar menú"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDuplicate(menu); }}
                                                                className="p-2 rounded-lg border border-border hover:border-blue-400/70 hover:text-blue-500"
                                                                title="Duplicar"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDelete(e, menu.id)}
                                                                className="p-2 rounded-lg border border-border hover:border-red-400/70 hover:text-red-500"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${isEmpty ? 'bg-orange-500/10 text-orange-500' : 'bg-secondary text-foreground'}`}>
                                                            <LayoutGrid size={14} />
                                                            {isEmpty ? 'Sin items' : `${menu.items.length} ${menu.items.length === 1 ? 'item' : 'items'}`}
                                                        </div>

                                                        {usedInHeader && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                                <Layout size={14} /> Header
                                                            </span>
                                                        )}
                                                        {usedInFooter && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                                <LayoutGrid size={14} /> Footer
                                                            </span>
                                                        )}
                                                        {!usedInHeader && !usedInFooter && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary/60 text-muted-foreground">
                                                                <AlertCircle size={14} /> Sin asignar
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>Última edición: {new Date(menu.updatedAt || menu.createdAt || Date.now()).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1">Abrir <ChevronRight size={12} /></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                        
                        {activeProject && (
                             <div className="mt-6 flex justify-between items-center">
                                <div className="text-sm text-muted-foreground">
                                    <p>Menus determine the links that appear in your website's header and footer.</p>
                                </div>
                                <button 
                                    onClick={() => loadProject(activeProject.id, false, false)} 
                                    className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                                >
                                    Refresh Project Data
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
