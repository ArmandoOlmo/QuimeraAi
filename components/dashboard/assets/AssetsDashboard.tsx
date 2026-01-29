/**
 * AssetsDashboard
 * Dashboard principal para generación y gestión de imágenes con selector de proyecto
 * Layout: Fixed ImageGeneratorPanel (left) + Scrollable Gallery (right)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import { useEditor } from '../../../contexts/EditorContext';
import DashboardSidebar from '../DashboardSidebar';
import ProjectSelectorPage from './ProjectSelectorPage';
import FileHistory from '../FileHistory';
import ImageGeneratorPanel from '../../ui/ImageGeneratorPanel';
import {
    Zap,
    Menu,
    ArrowLeft,
    Store,
    ChevronDown,
    Check,
    Layers,
    Sparkles
} from 'lucide-react';

const AssetsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const {
        activeProject,
        projects,
        activeProjectId,
        isLoadingProjects
    } = useProject();
    const { loadProject } = useEditor();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);

    const selectableProjects = projects.filter(p => p.status !== 'Template');

    // Determinar qué proyecto usar
    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(p => p.id === effectiveProjectId) || activeProject;

    // Sync when activeProjectId changes
    useEffect(() => {
        if (activeProjectId) {
            setSelectedProjectId(activeProjectId);
        }
    }, [activeProjectId]);

    // Track last synced project to avoid infinite loops
    const lastSyncedProjectRef = useRef<string | null>(null);

    // Load project when selected - sync with EditorContext once per project
    useEffect(() => {
        if (effectiveProjectId && !isLoadingProjects && lastSyncedProjectRef.current !== effectiveProjectId) {
            // Call loadProject once to sync EditorContext.activeProjectId
            // This is needed because ProjectContext may restore activeProject from localStorage
            // but EditorContext.activeProjectId stays null
            loadProject(effectiveProjectId, false, false);
            lastSyncedProjectRef.current = effectiveProjectId;
        }
    }, [effectiveProjectId, isLoadingProjects, loadProject]);

    const handleProjectSelect = async (projectId: string) => {
        setSelectedProjectId(projectId);
        await loadProject(projectId, false, false);
    };

    // Show project selector if no project selected
    if (!effectiveProjectId || selectableProjects.length === 0) {
        return (
            <ProjectSelectorPage
                onProjectSelect={handleProjectSelect}
            />
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title={t('common.openMenu', { defaultValue: 'Open menu' })}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Zap className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t('editor.imageGenerator', 'Generador de Imágenes')}
                            </h1>
                        </div>

                        {/* Project Selector */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Store size={14} />
                                <span className="max-w-[200px] truncate">
                                    {effectiveProject?.name || t('assets.selectProject', 'Seleccionar proyecto')}
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
                                        <div className="px-4 py-2 border-b border-border/50 mb-2">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                {t('assets.quickSwitch', 'Cambio rápido')}
                                            </p>
                                        </div>

                                        {selectableProjects.slice(0, 5).map((project) => (
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
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => setView('dashboard')}
                        className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                        aria-label={t('common.back', 'Volver')}
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                    </button>
                </header>

                {/* Main Content - Vertical Layout (Generator on top, Gallery below) */}
                <main className="flex-1 overflow-auto">
                    {/* Image Generator Section */}
                    {!isGeneratorCollapsed ? (
                        <div className="bg-editor-bg border-b border-border">
                            <ImageGeneratorPanel
                                destination="user"
                                className=""
                                onCollapse={() => setIsGeneratorCollapsed(true)}
                            />
                        </div>
                    ) : (
                        <div className="h-14 bg-editor-bg border-b border-border flex items-center px-4 gap-3 sticky top-0 z-10">
                            <button
                                onClick={() => setIsGeneratorCollapsed(false)}
                                className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-2"
                                title={t('common.expand', { defaultValue: 'Expandir generador' })}
                            >
                                <Sparkles size={18} />
                                <span className="text-sm font-medium">{t('editor.imageGenerator', 'Generador de Imágenes')}</span>
                            </button>
                        </div>
                    )}

                    {/* Gallery Section */}
                    <div className="p-4 md:p-6 lg:p-8">
                        <div className="max-w-7xl mx-auto">
                            <FileHistory variant="gallery-only" />
                        </div>
                    </div>
                </main>


            </div>
        </div>
    );
};

export default AssetsDashboard;
