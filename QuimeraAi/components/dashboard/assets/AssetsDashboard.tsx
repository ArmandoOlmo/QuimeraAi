/**
 * AssetsDashboard
 * Dashboard principal para generación y gestión de imágenes con selector de proyecto
 * Layout: Fixed ImageGeneratorPanel (left) + Scrollable Gallery (right)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../../contexts/core/UIContext';
import { useProject } from '../../../contexts/project';
import DashboardSidebar from '../DashboardSidebar';
import ProjectSelectorPage from './ProjectSelectorPage';
import FileHistory from '../FileHistory';
import MediaGeneratorPanel from '../../media-generator/MediaGeneratorPanel';
import VisualIdentityKitManager from '../visual/VisualIdentityKitManager';
import HeaderBackButton from '../../ui/HeaderBackButton';
import {
    Zap,
    Menu,
    ArrowLeft,
    Store,
    ChevronDown,
    Check,
    Layers,
    Sparkles,
    Palette
} from 'lucide-react';

const AssetsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const {
        activeProject,
        projects,
        activeProjectId,
        isLoadingProjects,
        loadProject
    } = useProject();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProjectId);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);
    const [showKitManager, setShowKitManager] = useState(false);

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

    const handleCreateVideo = (imageUrl: string) => {
        window.dispatchEvent(new CustomEvent('assets:create-video-from-image', {
            detail: { imageUrl, mode: 'start' },
        }));
        setIsGeneratorCollapsed(false);
    };

    // Show project selector if no project selected
    if (!effectiveProjectId || selectableProjects.length === 0) {
        return (
            <ProjectSelectorPage
                onProjectSelect={handleProjectSelect}
                onBack={() => setView('dashboard')}
            />
        );
    }

    return (
        <div className="flex h-screen bg-q-bg text-foreground">
            <DashboardSidebar
                isMobileOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
 <header className="quimera-dashboard-header-bar h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title={t('common.openMenu', { defaultValue: 'Open menu' })}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t('editor.imageGenerator', 'Generador de Imágenes')}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Kit Visual Toggle */}
                        <button
                            onClick={() => setShowKitManager(!showKitManager)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                showKitManager
                                    ? 'border-[var(--quimera-status-accent-from)] bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                            }`}
                        >
                            <Palette size={14} />
                            <span>{t('visualKit.title', { defaultValue: 'Kit Visual' })}</span>
                        </button>
                        {/* Back Button */}
                        <HeaderBackButton onClick={() => setView('dashboard')} />
                    </div>
                </header>

                {/* Main Content - Single Card Container */}
                <main className="flex-1 overflow-auto relative z-[2] p-4 md:p-6 lg:p-8">
                    {showKitManager ? (
                        <div className="max-w-7xl mx-auto">
                            <div className="quimera-dashboard-panel-card group overflow-hidden h-[calc(100vh-12rem)]">
                                <VisualIdentityKitManager
                                    onBack={() => setShowKitManager(false)}
                                    projectId={effectiveProjectId || undefined}
                                />
                            </div>
                        </div>
                    ) : (
                    <div className="max-w-7xl mx-auto">
                        <div className="quimera-dashboard-panel-card group overflow-hidden">
                            {/* Generator Toggle Bar - same format open & closed */}
                            <div
                                className="border-b border-q-border/60 flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group/toggle"
                                onClick={() => setIsGeneratorCollapsed(prev => !prev)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--quimera-status-accent-from)_15%,transparent)] quimera-status-card-accent-text transition-colors">
                                        <Sparkles size={18} />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">
                                        {t('editor.mediaGenerator', { defaultValue: 'Generador de Medios' })}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`text-q-text-muted group-hover/toggle:text-foreground transition-transform duration-200 ${!isGeneratorCollapsed ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {/* Generator Panel Content (collapsible) */}
                            <div className={`border-b border-q-border ${isGeneratorCollapsed ? 'hidden' : 'block'}`}>
                                    <MediaGeneratorPanel
                                        destination="user"
                                        className=""
                                        hideHeader
                                        projectId={effectiveProjectId || undefined}
                                    />
                            </div>

                            {/* Gallery Section */}
                            <div className="p-4 md:p-6">
                                <FileHistory 
                                    variant="gallery-only" 
                                    onAddReferenceImage={async (base64) => {
                                        window.dispatchEvent(new CustomEvent('assets:add-reference-image', { detail: base64 }));
                                        setIsGeneratorCollapsed(false);
                                    }}
                                    onCreateVideo={handleCreateVideo}
                                />
                            </div>
                        </div>
                    </div>
                    )}
                </main>


            </div>
        </div>
    );
};

export default AssetsDashboard;
