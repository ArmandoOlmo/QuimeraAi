import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import MenuEditor from '../navigation/MenuEditor';
import { Menu as MenuIcon, Plus, Search, ArrowLeft, Edit2, Copy, Trash2, AlertCircle, Info, Layout, LayoutGrid, ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';
import { Menu } from '../../../types';

interface LandingNavigationManagementProps {
    onBack: () => void;
}

const LandingNavigationManagement: React.FC<LandingNavigationManagementProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { menus, deleteMenu, saveMenu, data, activeProject, projects, loadProject, setView } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUsage, setFilterUsage] = useState<'all' | 'used' | 'unused' | 'empty'>('all');

    // Filtered menus
    const filteredMenus = useMemo(() => {
        return menus.filter(menu => {
            // Search
            const matchesSearch = menu.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                menu.handle.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return false;

            // Usage filter
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

    if (editingMenu) {
        return (
            <MenuEditor 
                menu={editingMenu} 
                onClose={() => {
                    setEditingMenu(null);
                    setIsCreating(false);
                }} 
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

    const usedMenusCount = menus.filter(m => {
        const usedInHeader = data?.header?.menuId === m.id;
        const usedInFooter = data?.footer?.linkColumns?.some(col => col.menuId === m.id);
        return usedInHeader || usedInFooter;
    }).length;

    const emptyMenusCount = menus.filter(m => m.items.length === 0).length;

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-full lg:hidden transition-colors"
                        >
                            <MenuIcon className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2">
                            <MenuIcon className="text-editor-accent w-5 h-5" />
                            <h1 className="text-lg font-semibold text-editor-text-primary">Landing Page Navigation</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeProject && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <span className="mr-1.5">Project:</span>
                                <span className="font-semibold text-foreground">{activeProject.name}</span>
                            </div>
                        )}
                        <button 
                            onClick={onBack}
                            className="flex items-center text-sm font-medium h-9 px-4 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Back
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-6xl mx-auto">
                        
                        {/* Info Banner */}
                        {activeProject && hasUnassignedMenus && (
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                                <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-foreground mb-1">
                                        Connect your menus
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Some menus are not assigned to any location. Connect them to your Header or Footer in the editor to make them visible on your landing page.
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

                        {/* Stats Cards - Only show if project is active */}
                        {activeProject && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Menus</p>
                                            <p className="text-2xl font-bold text-foreground">{menus.length}</p>
                                        </div>
                                        <MenuIcon className="w-8 h-8 text-primary opacity-20" />
                                    </div>
                                </div>
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">In Use</p>
                                            <p className="text-2xl font-bold text-green-600">{usedMenusCount}</p>
                                        </div>
                                        <Layout className="w-8 h-8 text-green-600 opacity-20" />
                                    </div>
                                </div>
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Empty</p>
                                            <p className="text-2xl font-bold text-orange-600">{emptyMenusCount}</p>
                                        </div>
                                        <AlertCircle className="w-8 h-8 text-orange-600 opacity-20" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Toolbar */}
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-foreground">Navigation Menus</h2>
                                {menus.length > 0 && (
                                    <span className="px-2 py-1 text-xs font-medium bg-secondary rounded-full text-muted-foreground">
                                        {filteredMenus.length} of {menus.length}
                                    </span>
                                )}
                            </div>
                            
                            {activeProject && menus.length > 0 && (
                                <div className="flex items-center gap-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input 
                                            type="text"
                                            placeholder="Search menus..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none w-48"
                                        />
                                    </div>
                                    
                                    {/* Filter */}
                                    <select 
                                        value={filterUsage}
                                        onChange={(e) => setFilterUsage(e.target.value as any)}
                                        className="px-3 py-2 text-sm bg-secondary/30 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                    >
                                        <option value="all">All menus</option>
                                        <option value="used">In use</option>
                                        <option value="unused">Not in use</option>
                                        <option value="empty">Empty</option>
                                    </select>
                                </div>
                            )}

                            {activeProject && (
                                <button 
                                    onClick={handleCreateNew}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                                >
                                    <Plus size={16} />
                                    Add Menu
                                </button>
                            )}
                        </div>

                        {/* Project Selector or Menus Table */}
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

                                {/* Menus Table */}
                                {menus.length === 0 ? (
                                    <div className="bg-card border border-border rounded-lg p-12 text-center">
                                        <MenuIcon className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No navigation menus</h3>
                                        <p className="text-muted-foreground mb-6">
                                            Create your first navigation menu to organize your landing page links.
                                        </p>
                                        <button 
                                            onClick={handleCreateNew}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                            <Plus size={16} />
                                            Create Menu
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-border bg-secondary/20">
                                                        <th className="p-4 font-medium text-sm text-muted-foreground">Title</th>
                                                        <th className="p-4 font-medium text-sm text-muted-foreground">Items</th>
                                                        <th className="p-4 font-medium text-sm text-muted-foreground">Usage</th>
                                                        <th className="p-4 font-medium text-sm text-muted-foreground w-32">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {filteredMenus.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                                                {searchQuery || filterUsage !== 'all' 
                                                                    ? 'No menus match your filters.' 
                                                                    : 'No menus found. Create one to get started.'}
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
                                                                                    Empty
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {menu.handle && <div className="text-xs text-muted-foreground mt-0.5">Handle: {menu.handle}</div>}
                                                                    </td>
                                                                    <td className="p-4 text-sm">
                                                                        {isEmpty ? (
                                                                            <span className="text-orange-500 flex items-center gap-1">
                                                                                <AlertCircle size={14} />
                                                                                No items yet
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">
                                                                                {menu.items.length} {menu.items.length === 1 ? 'item' : 'items'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="flex gap-2 flex-wrap">
                                                                            {usedInHeader && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                                                                    <Layout size={12} />
                                                                                    Header
                                                                                </span>
                                                                            )}
                                                                            {usedInFooter && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                                                                                    <LayoutGrid size={12} />
                                                                                    Footer
                                                                                </span>
                                                                            )}
                                                                            {!usedInHeader && !usedInFooter && (
                                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                    <AlertCircle size={12} />
                                                                                    <span>Not assigned</span>
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
                                )}
                                
                                {/* Footer Info */}
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
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LandingNavigationManagement;

