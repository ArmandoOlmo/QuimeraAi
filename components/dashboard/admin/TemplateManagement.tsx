import React, { useState } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import { ArrowLeft, Menu, LayoutTemplate, Plus, Edit, Trash2, EyeOff, Eye } from 'lucide-react';

interface TemplateManagementProps {
    onBack: () => void;
}

const TemplateManagement: React.FC<TemplateManagementProps> = ({ onBack }) => {
    const { projects, loadProject, createNewTemplate, deleteProject, archiveTemplate } = useEditor();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const templates = projects.filter(p => p.status === 'Template');
    const userProjects = projects.filter(p => p.status !== 'Template');

    const getTemplateUsage = (templateId: string) => {
        return userProjects.filter(p => p.sourceTemplateId === templateId).length;
    };

    return (
        <div className="flex h-screen bg-editor-bg text-editor-text-primary">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-[65px] bg-editor-bg border-b border-editor-border flex-shrink-0 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
                    <div className="flex items-center">
                        <button onClick={onBack} className="p-2 text-editor-text-secondary hover:text-editor-text-primary md:hidden mr-2" title="Back to Admin">
                            <ArrowLeft />
                        </button>
                        <div className="flex items-center space-x-2">
                            <LayoutTemplate className="text-editor-accent" />
                            <h1 className="text-xl font-bold text-editor-text-primary">Website Templates</h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={createNewTemplate} className="flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-accent text-editor-bg hover:bg-editor-accent-hover transition-colors">
                            <Plus size={16} className="mr-1.5" />
                            Create New Template
                        </button>
                        <button onClick={onBack} className="hidden sm:flex items-center text-sm font-semibold py-2 px-4 rounded-lg bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg transition-colors">
                            <ArrowLeft size={16} className="mr-1.5" />
                            Back to Admin
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {templates.map(template => (
                            <div key={template.id} className={`bg-editor-panel-bg rounded-lg border border-editor-border overflow-hidden group transition-all hover:shadow-xl ${template.isArchived ? 'opacity-60' : ''}`}>
                                <div className="aspect-video bg-editor-border overflow-hidden relative">
                                    <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                     <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                        {getTemplateUsage(template.id)} sites
                                    </div>
                                    {template.isArchived && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="font-bold text-white tracking-widest uppercase">Archived</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="font-bold text-editor-text-primary truncate">{template.name}</h3>
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => loadProject(template.id, true)} className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border hover:text-editor-accent" title="Edit Template">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => archiveTemplate(template.id, !template.isArchived)} className="p-2 text-editor-text-secondary rounded-full hover:bg-editor-border" title={template.isArchived ? 'Activate Template' : 'Archive Template'}>
                                                {template.isArchived ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>
                                        <button onClick={() => deleteProject(template.id)} className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400" title="Delete Template">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TemplateManagement;