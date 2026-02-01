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
    const { t } = useTranslation();
    const {
        projects,
        activeProject,
        activeProjectId,
        isLoadingProjects,
        loadProject,
    } = useProject();

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
            p.name.toLowerCase().includes(query)
        );
    }, [userProjects, searchQuery]);

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

    const getProjectInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Published') {
            return (
                <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <Globe size={10} />
                    <span className="hidden sm:inline">{t('dashboard.published', 'Publicado')}</span>
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                className={`
                    flex items-center gap-2 w-full p-2 rounded-lg
                    bg-primary/10 border border-primary/30 border-dashed
                    text-primary hover:bg-primary/20 transition-colors
                    ${className}
                `}
            >
                <Plus size={18} />
                {!collapsed && (
                    <span className="text-sm font-medium">
                        {t('project.createNew', 'Crear nuevo proyecto')}
                    </span>
                )}
            </button>
        );
    }

    // Loading state
    if (isLoadingProjects) {
        return (
            <div className={`flex items-center gap-2 p-2 ${className}`}>
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                {!collapsed && (
                    <div className="flex-1 space-y-1">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
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
                className={`
                    flex items-center gap-2 transition-all duration-200
                    ${collapsed
                        ? 'w-10 h-10 justify-center mx-auto rounded-lg hover:bg-secondary/50'
                        : 'w-full p-2 rounded-lg bg-card hover:bg-secondary/50 border border-border'
                    }
                    ${isOpen && !collapsed ? 'ring-2 ring-primary/50' : ''}
                    ${isLoading ? 'opacity-50 cursor-wait' : ''}
                `}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={collapsed ? (activeProject?.name || t('project.noProject', 'Sin proyecto')) : undefined}
            >
                {/* Project avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/80 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0 overflow-hidden">
                    {activeProject?.thumbnailUrl ? (
                        <img
                            src={activeProject.thumbnailUrl}
                            alt={activeProject.name}
                            className="w-full h-full object-cover"
                        />
                    ) : activeProject ? (
                        getProjectInitials(activeProject.name)
                    ) : (
                        <FolderKanban size={16} />
                    )}
                </div>

                {!collapsed && (
                    <>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-foreground truncate">
                                {activeProject?.name || t('project.noProject', 'Sin proyecto')}
                            </p>
                            {activeProject && getStatusBadge(activeProject.status)}
                        </div>
                        <ChevronDown
                            size={16}
                            className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''
                                }`}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        absolute z-50 mt-2 py-1
                        bg-popover border border-border rounded-xl shadow-xl
                        animate-in fade-in-0 zoom-in-95 duration-200
                        ${collapsed ? 'left-full ml-2 top-0' : 'left-0 right-0'}
                        ${collapsed ? 'w-72' : 'w-full min-w-[280px]'}
                    `}
                    role="listbox"
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('project.selectProject', 'Seleccionar Proyecto')}
                        </p>
                    </div>

                    {/* Search */}
                    {userProjects.length > 5 && (
                        <div className="px-3 py-2 border-b border-border">
                            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={t('project.search', 'Buscar proyectos...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Project List */}
                    <div className="max-h-64 overflow-y-auto py-1">
                        {filteredProjects.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                {searchQuery
                                    ? t('cms.noProjectsFound', 'No se encontraron proyectos')
                                    : t('project.noProject', 'Sin proyecto')}
                            </div>
                        ) : (
                            filteredProjects.map((project) => {
                                const isActive = project.id === activeProjectId;

                                return (
                                    <button
                                        key={project.id}
                                        onClick={() => handleSwitchProject(project.id)}
                                        className={`
                                            flex items-center gap-3 w-full px-3 py-2.5
                                            hover:bg-secondary/50 transition-colors
                                            ${isActive ? 'bg-primary/10' : ''}
                                        `}
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        {/* Project avatar */}
                                        <div className={`
                                            w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden
                                            ${isActive
                                                ? 'bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/30'
                                                : 'bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/40'
                                            }
                                        `}>
                                            {project.thumbnailUrl ? (
                                                <img
                                                    src={project.thumbnailUrl}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                getProjectInitials(project.name)
                                            )}
                                        </div>

                                        {/* Project info */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'
                                                }`}>
                                                {project.name}
                                            </p>
                                            {getStatusBadge(project.status)}
                                        </div>

                                        {/* Active indicator */}
                                        {isActive && (
                                            <Check size={16} className="text-primary flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Create new project */}
                    {onCreateProject && (
                        <>
                            <div className="border-t border-border my-1" />
                            <button
                                onClick={handleCreateProject}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-primary hover:bg-primary/10 transition-colors"
                            >
                                <Plus size={18} />
                                <span className="text-sm font-medium">
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
