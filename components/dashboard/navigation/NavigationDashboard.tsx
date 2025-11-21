
import React, { useState } from 'react';
import DashboardSidebar from '../DashboardSidebar';
import { useEditor } from '../../../contexts/EditorContext';
import { Menu as MenuIcon, Plus, ChevronRight, MoreHorizontal, Trash2, LayoutGrid } from 'lucide-react';
import MenuEditor from './MenuEditor';
import { Menu } from '../../../types';

const NavigationDashboard: React.FC = () => {
    const { menus, deleteMenu, activeProject, projects, loadProject } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
    const [isCreating, setIsCreating] = useState(false);

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm("Delete this menu? This action cannot be undone.")) {
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
                onClose={() => setEditingMenu(null)} 
                isNew={isCreating} 
            />
        );
    }

    const userProjects = projects.filter(p => p.status !== 'Template');

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Standardized Header */}
                <header className="h-[65px] px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-muted-foreground lg:hidden hover:text-foreground transition-colors">
                            <MenuIcon />
                        </button>
                        <div className="flex items-center gap-2">
                            <MenuIcon className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-foreground">Navigation</h1>
                        </div>
                    </div>
                    {activeProject && (
                        <div className="text-sm font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                             Project: <span className="font-semibold text-foreground">{activeProject.name}</span>
                        </div>
                    )}
                </header>

                <main className="flex-1 p-8 overflow-y-auto bg-[#f6f6f7] dark:bg-background black:bg-background">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-foreground">Menus</h2>
                            {activeProject && (
                                <button 
                                    onClick={handleCreateNew}
                                    className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-sm hover:opacity-90 transition-all text-sm flex items-center"
                                >
                                    <Plus size={16} className="mr-2"/> Add menu
                                </button>
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
                            <div className="bg-white dark:bg-card black:bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-secondary/20">
                                                <th className="p-4 font-medium text-sm text-muted-foreground">Title</th>
                                                <th className="p-4 font-medium text-sm text-muted-foreground">Menu items</th>
                                                <th className="p-4 font-medium text-sm text-muted-foreground w-20"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {menus.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                                        No menus found. Create one to get started.
                                                    </td>
                                                </tr>
                                            ) : (
                                                menus.map((menu) => (
                                                    <tr 
                                                        key={menu.id} 
                                                        onClick={() => handleEdit(menu)}
                                                        className="hover:bg-secondary/30 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="p-4">
                                                            <div className="font-semibold text-foreground">{menu.title}</div>
                                                            {menu.handle && <div className="text-xs text-muted-foreground mt-0.5">Handle: {menu.handle}</div>}
                                                        </td>
                                                        <td className="p-4 text-sm text-muted-foreground">
                                                            {menu.items.length} items
                                                        </td>
                                                        <td className="p-4 text-right">
                                                             <button 
                                                                onClick={(e) => handleDelete(e, menu.id)}
                                                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                             >
                                                                <Trash2 size={16} />
                                                             </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {activeProject && (
                             <div className="mt-6 flex justify-end">
                                <button onClick={() => loadProject(activeProject.id, false, false /* Just reload to refresh */)} className="text-xs text-muted-foreground hover:underline">
                                    Refresh Project Data
                                </button>
                             </div>
                        )}

                        <div className="mt-8 text-sm text-muted-foreground">
                            <p>Menus determine the links that appear in your website's header and footer.</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default NavigationDashboard;
