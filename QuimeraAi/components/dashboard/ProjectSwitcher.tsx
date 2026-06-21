/**
 * ProjectSwitcher
 * Component for switching between projects globally in the sidebar
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FolderKanban,
    ChevronDown,
    Check,
    Plus,
    Globe,
    FileEdit,
    Search,
    X,
    Layers,
} from 'lucide-react';
import { useProject } from '../../contexts/project';
import { Project } from '../../types/components';
import { getDynamicThumbnailUrl } from '../../utils/thumbnailHelper';
import { resolveProjectName as _resolveProjectName } from '../../utils/resolveProjectName';
import ProjectThumbnailFallback from './ProjectThumbnailFallback';

interface ProjectSwitcherProps {
    collapsed?: boolean;
    className?: string;
    onCreateProject?: () => void;
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
    collapsed = false,
    className = '',
    onCreateProject,
}) => {
    const { t, i18n } = useTranslation();
    const {
        projects,
        activeProject,
        activeProjectId,
        isLoadingProjects,
        loadProject,
    } = useProject();

    const resolveProjectName = (name: unknown) => _resolveProjectName(name, i18n.language);

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter out templates - only show user projects
    const userProjects = useMemo(() => {
        return projects.filter(p => p.status !== 'Template');
    }, [projects]);

    // Filter by search query
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return userProjects;
        const query = searchQuery.toLowerCase();
        return userProjects.filter(p =>
            resolveProjectName(p.name).toLowerCase().includes(query)
        );
    }, [userProjects, searchQuery, resolveProjectName]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSwitchProject = async (projectId: string) => {
        if (projectId === activeProjectId) {
            setIsOpen(false);
            setSearchQuery('');
            return;
        }

        setIsLoading(true);
        try {
            // Load project without navigating to editor
            await loadProject(projectId, false, false);
            setIsOpen(false);
            setSearchQuery('');
        } catch (error) {
            console.error('Error switching project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = () => {
        setIsOpen(false);
        setSearchQuery('');
        onCreateProject?.();
    };

    const activeProjectThumbnailUrl = getDynamicThumbnailUrl(activeProject);
    const emptyCreateButtonClasses = [
        'flex items-center rounded-lg',
        'bg-q-accent/10 border border-q-accent/30 border-dashed',
        'text-q-accent hover:bg-q-accent/20 transition-colors',
        collapsed ? 'w-10 h-10 justify-center mx-auto' : 'gap-2 w-full p-2',
        className,
    ].filter(Boolean).join(' ');
    const loadingClasses = ['flex items-center gap-2 p-2', className].filter(Boolean).join(' ');
    const loadingIconClasses = 'w-8 h-8 rounded-lg bg-q-surface-overlay animate-pulse';
    const loadingTextWrapClasses = 'flex-1 space-y-1';
    const triggerClasses = [
        'flex items-center gap-2 transition-all duration-200',
        collapsed
            ? 'w-10 h-10 justify-center mx-auto rounded-[var(--q-radius-md)] hover:bg-sidebar-control-hover hover:shadow-[inset_0_0_0_1px_hsl(var(--sidebar-control-border))]'
            : 'w-full p-2 rounded-[var(--q-radius-md)] bg-q-surface hover:bg-sidebar-control-hover border border-border-subtle hover:border-sidebar-control-border',
        isOpen && !collapsed ? 'ring-2 ring-q-accent/25 border-q-accent/45' : '',
        isLoading ? 'opacity-50 cursor-wait' : '',
    ].filter(Boolean).join(' ');
    const triggerIconWrapClasses = 'w-8 h-8 rounded-[var(--q-radius-md)] border border-border-subtle bg-q-surface-overlay flex items-center justify-center text-q-text-muted text-xs font-bold flex-shrink-0 overflow-hidden';
    const triggerTextWrapClasses = 'flex-1 min-w-0 text-left';
    const triggerTitleClasses = 'text-sm font-semibold text-q-text truncate';
    const chevronClasses = [
        'text-q-text-muted transition-transform duration-200 flex-shrink-0',
        isOpen ? 'rotate-180' : '',
    ].filter(Boolean).join(' ');
    const dropdownClasses = [
        'absolute z-50 mt-2 py-1',
        'bg-q-surface-elevated border border-border-subtle rounded-[var(--radius-card-compact)] shadow-[var(--shadow-elevated)]',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        collapsed ? 'left-full ml-2 top-0' : 'left-0 right-0',
        collapsed ? 'w-72' : 'w-full min-w-[280px]',
    ].join(' ');
    const dropdownHeaderClasses = 'px-3 py-2 border-b border-divider';
    const dropdownHeaderTitleClasses = 'text-xs font-semibold text-q-text-muted uppercase tracking-wider';
    const searchSectionClasses = 'px-3 py-2 border-b border-divider';
    const searchInputWrapClasses = 'flex items-center gap-2 bg-q-surface-overlay rounded-[var(--q-radius-md)] px-2 py-1.5';
    const searchIconClasses = 'text-q-text-muted flex-shrink-0';
    const searchInputClasses = 'flex-1 bg-transparent outline-none text-sm min-w-0';
    const searchClearButtonClasses = 'text-q-text-muted hover:text-q-text';
    const listClasses = 'max-h-64 overflow-y-auto py-1';
    const emptyStateClasses = 'px-3 py-4 text-center text-sm text-q-text-muted';
    const itemClasses = (isActive: boolean) => [
        'flex items-center gap-3 w-full px-3 py-2.5',
        'hover:bg-sidebar-control-hover transition-colors',
        isActive ? 'bg-q-accent/12 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--q-accent)_30%,transparent)]' : '',
    ].filter(Boolean).join(' ');
    const itemIconClasses = (isActive: boolean) => [
        'w-9 h-9 rounded-[var(--q-radius-md)] border flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden',
        isActive
            ? 'border-q-accent/35 bg-q-accent/12 text-q-accent'
            : 'border-border-subtle bg-q-surface-overlay text-q-text-muted',
    ].join(' ');
    const itemTextClasses = 'flex-1 min-w-0 text-left';
    const itemTitleClasses = (isActive: boolean) => [
        'text-sm font-medium truncate',
        isActive ? 'text-q-accent' : 'text-q-text',
    ].join(' ');
    const activeIndicatorClasses = 'text-q-accent flex-shrink-0';
    const dividerClasses = 'border-t border-divider my-1';
    const actionButtonClasses = 'flex items-center gap-2 w-full px-3 py-2.5 text-q-accent hover:bg-q-accent/10 transition-colors';
    const actionLabelClasses = 'text-sm font-medium';

    const getStatusBadge = (status: string) => {
        if (status === 'Published') {
            return (
                <span className="flex items-center gap-1 text-[10px] text-q-success">
                    <Globe size={10} />
                    <span className="hidden sm:inline">{t('dashboard.published', 'Publicado')}</span>
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[10px] text-q-text-muted">
                <FileEdit size={10} />
                <span className="hidden sm:inline">{t('dashboard.draft', 'Borrador')}</span>
            </span>
        );
    };

    // If no projects at all, show a create project button
    if (!isLoadingProjects && userProjects.length === 0) {
        return (
            <button
                onClick={handleCreateProject}
                className={emptyCreateButtonClasses}
            >
                <Plus size={18} />
                {!collapsed && (
                    <span className={actionLabelClasses}>
                        {t('project.createNew', 'Crear nuevo proyecto')}
                    </span>
                )}
            </button>
        );
    }

    // Loading state
    if (isLoadingProjects) {
        return (
            <div className={loadingClasses}>
                <div className={loadingIconClasses} />
                {!collapsed && (
                    <div className={loadingTextWrapClasses}>
                        <div className="h-4 w-20 bg-q-surface-overlay rounded animate-pulse" />
                        <div className="h-3 w-12 bg-q-surface-overlay rounded animate-pulse" />
                    </div>
                )}
            </div>
        );
    }

    // Main switcher UI
    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className={triggerClasses}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={collapsed ? (resolveProjectName(activeProject?.name) || t('project.noProject', 'Sin proyecto')) : undefined}
            >
                {/* Project avatar */}
                <div className={triggerIconWrapClasses}>
                    {activeProjectThumbnailUrl ? (
                        <img
                            src={activeProjectThumbnailUrl}
                            alt={resolveProjectName(activeProject.name)}
                            className="w-full h-full object-cover"
                        />
                    ) : activeProject ? (
                        <ProjectThumbnailFallback logoClassName="h-5 w-5" />
                    ) : (
                        <FolderKanban size={16} />
                    )}
                </div>

                {!collapsed && (
                    <>
                        <div className={triggerTextWrapClasses}>
                            <p className={triggerTitleClasses}>
                                {resolveProjectName(activeProject?.name) || t('project.noProject', 'Sin proyecto')}
                            </p>
                            {activeProject && getStatusBadge(activeProject.status)}
                        </div>
                        <ChevronDown
                            size={16}
                            className={chevronClasses}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={dropdownClasses}
                    role="listbox"
                >
                    {/* Header */}
                    <div className={dropdownHeaderClasses}>
                        <p className={dropdownHeaderTitleClasses}>
                            {t('project.selectProject', 'Seleccionar Proyecto')}
                        </p>
                    </div>

                    {/* Search */}
                    {userProjects.length > 5 && (
                        <div className={searchSectionClasses}>
                            <div className={searchInputWrapClasses}>
                                <Search size={14} className={searchIconClasses} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={t('project.search', 'Buscar proyectos...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={searchInputClasses}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className={searchClearButtonClasses}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Project List */}
                    <div className={listClasses}>
                        {filteredProjects.length === 0 ? (
                            <div className={emptyStateClasses}>
                                {searchQuery
                                    ? t('cms.noProjectsFound', 'No se encontraron proyectos')
                                    : t('project.noProject', 'Sin proyecto')}
                            </div>
                        ) : (
                            filteredProjects.map((project) => {
                                const isActive = project.id === activeProjectId;
                                const thumbnailUrl = getDynamicThumbnailUrl(project);

                                return (
                                    <button
                                        key={project.id}
                                        onClick={() => handleSwitchProject(project.id)}
                                        className={itemClasses(isActive)}
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        {/* Project avatar */}
                                        <div className={itemIconClasses(isActive)}>
                                            {thumbnailUrl ? (
                                                <img
                                                    src={thumbnailUrl}
                                                    alt={resolveProjectName(project.name)}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <ProjectThumbnailFallback logoClassName="h-5 w-5" />
                                            )}
                                        </div>

                                        {/* Project info */}
                                        <div className={itemTextClasses}>
                                            <p className={itemTitleClasses(isActive)}>
                                                {resolveProjectName(project.name)}
                                            </p>
                                            {getStatusBadge(project.status)}
                                        </div>

                                        {/* Active indicator */}
                                        {isActive && (
                                            <Check size={16} className={activeIndicatorClasses} />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Create new project */}
                    {onCreateProject && (
                        <>
                            <div className={dividerClasses} />
                            <button
                                onClick={handleCreateProject}
                                className={actionButtonClasses}
                            >
                                <Plus size={18} />
                                <span className={actionLabelClasses}>
                                    {t('project.createNew', 'Crear nuevo proyecto')}
                                </span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectSwitcher;
