/**
 * ProjectContext
 * Maneja proyectos, templates y exportación
 * Soporta multi-tenant: usa /tenants/{tenantId}/projects cuando hay tenant activo
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Project, PageData, ThemeData, PageSection, BrandIdentity, SitePage, SEOConfig } from '../../types';
import type { MediaBlueprint } from '../../types/businessBlueprint';
import { initialData } from '../../data/initialData';
import { createDefaultPages, createPageFromTemplate } from '../../data/defaultPages';
import { PageTemplateId } from '../../types/onboarding';
import { supabase } from '../../supabase';
import { uploadAsset, deleteAsset } from '../../services/StorageService';
import { StorageError } from '@supabase/storage-js';
import { useAuth } from '../core/AuthContext';
import { router } from '../../hooks/useRouter';
import { useSafeTenant } from '../tenant';
import { useSafeUpgrade } from '../UpgradeContext';
import { useSafeAdmin } from '../admin';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useSafeUndo } from '../undo/UndoContext';
import { resolveProjectName } from '../../utils/resolveProjectName';
import { extractActiveHeroImage } from '../../utils/thumbnailHelper';
import { mapSupabaseRowToProject, normalizeProjectComponentOrder, resolveProjectMenus } from '../../utils/mapSupabaseProject';
import { isLegacyStorageUrl, normalizeImageUrl } from '../../utils/imageUrl';
import { downloadProjectAsHtml } from '../../utils/projectExporter';
import { uploadPlatformAsset } from '../../utils/platformAssetUpload';
import {
    createSnapshotBeforeManualSave,
    syncWebsiteBlueprintFromEditor,
    type WebsiteEditorSyncInput,
} from '../../utils/businessBlueprint';
import { isFinitePlanLimit, isPlatformUnlimitedUser } from '../../services/billing/planCatalog';

export interface ProjectUndoState {
    data: PageData | null;
    theme: ThemeData;
    componentOrder: PageSection[];
    sectionVisibility: Record<PageSection, boolean>;
    pages: SitePage[];
}

// Normalize legacy project payloads before they enter editor state.
// This prevents crashes from i18n names and restores fixed editor shell sections.
const normalizeProject = (project: Project): Project => {
    const normalizedOrder = normalizeProjectComponentOrder(project.componentOrder) || project.componentOrder;
    const normalizedVisibility = normalizedOrder && project.sectionVisibility
        ? normalizedOrder.reduce((acc, section) => {
            acc[section] = project.sectionVisibility?.[section] ?? true;
            return acc;
        }, { ...project.sectionVisibility } as Record<PageSection, boolean>)
        : project.sectionVisibility;

    return {
        ...project,
        name: project.name && typeof project.name === 'object'
            ? resolveProjectName(project.name)
            : project.name,
        componentOrder: normalizedOrder,
        sectionVisibility: normalizedVisibility,
    };
};

const SUMMARY_PROJECT_FLAG = '__quimeraSummaryProject';

// Keep dashboard lists off the large data/published_data JSONB columns. Full
// project payloads are fetched only when the user opens a project.
const PROJECT_LIST_COLUMNS = [
    'id',
    'tenant_id',
    'user_id',
    'name',
    'thumbnail_url',
    'favicon_url',
    'status',
    'theme',
    'brand_identity',
    'component_order',
    'section_visibility',
    'menus',
    'ai_assistant_config',
    'seo_config',
    'crm_config',
    'is_archived',
    'created_at',
    'last_updated',
    'categories',
    'published_at',
    'description',
    'category',
    'tags',
    'industries',
    'deleted_at',
    'deleted_by',
    'is_deleted',
].join(',');

// Helper to get the correct projects collection path
// Returns tenant path if tenantId provided (and not a personal tenant), otherwise user path

// Note: In Supabase, projects are in a single 'projects' table
// We query by user_id and/or tenant_id


// Helper to get storage path for project assets
const getProjectStoragePath = (userId: string, projectId: string, tenantId?: string | null): string => {
    if (tenantId) {
        return `tenants/${tenantId}/projects/${projectId}`;
    }
    return `users/${userId}/projects/${projectId}`;
};

export const sanitizeForStorage = <T extends unknown>(obj: T): T => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // Quick check to avoid unnecessary cloning if we know it's a simple type
    if (Array.isArray(obj) && obj.length === 0) return obj;
    
    try {
        const cache = new Set();
        const safeStringify = JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                // Strip DOM nodes, React Fiber nodes, and Synthetic Events
                if (
                    (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
                    value.nodeType ||
                    value.nativeEvent ||
                    key.startsWith('__reactFiber') ||
                    key.startsWith('__reactProps')
                ) {
                    return undefined;
                }
                if (cache.has(value)) {
                    return undefined; // Circular reference found, discard key
                }
                cache.add(value);
            }
            return value;
        });
        return JSON.parse(safeStringify);
    } catch (e) {
        console.warn('Sanitization fallback failed', e);
        return {} as T; // Safe fallback
    }
};

const hasItems = <T,>(value: T[] | undefined | null): value is T[] => Array.isArray(value) && value.length > 0;

const isSummaryProject = (project: Project | null | undefined): boolean =>
    Boolean(project && (project as any)[SUMMARY_PROJECT_FLAG]);

const isPlainRecord = (value: unknown): value is Record<string, any> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveProjectBusinessBlueprint = (project: Project | null | undefined) => (
    project?.businessBlueprint || (isPlainRecord(project?.data) ? project.data.businessBlueprint : undefined)
);

const isHeroSectionName = (section: string): boolean =>
    section === 'hero' || /^hero[A-Z]/.test(section);

const getSummaryHeroSection = (componentOrder?: PageSection[] | null): PageSection =>
    componentOrder?.find(section => isHeroSectionName(section)) || 'hero';

const getLightweightProjectImageUrl = (value: unknown): string | null => {
    const url = normalizeImageUrl(value);
    if (!url || url === '#' || url.startsWith('data:') || url.length > 4096) return null;
    return url;
};

const SUMMARY_THUMBNAIL_FIELDS = [
    'heroImageUrl',
    'heroBackgroundImage',
    'heroBackgroundImageUrl',
    'heroSplitImageUrl',
    'heroSplitBackgroundImage',
    'heroSplitBackgroundImageUrl',
    'heroGalleryImageUrl',
    'heroGalleryBackgroundImage',
    'heroGalleryBackgroundImageUrl',
    'heroWaveImageUrl',
    'heroWaveBackgroundImage',
    'heroWaveBackgroundImageUrl',
    'heroNovaImageUrl',
    'heroNovaBackgroundImage',
    'heroNovaBackgroundImageUrl',
    'heroLeadImageUrl',
    'heroLeadBackgroundImage',
    'heroLeadBackgroundImageUrl',
    'heroLuminaImageUrl',
    'heroLuminaBackgroundImage',
    'heroLuminaBackgroundImageUrl',
    'heroNeonImageUrl',
    'heroNeonBackgroundImage',
    'heroNeonBackgroundImageUrl',
    'heroQuimeraImageUrl',
    'heroQuimeraBackgroundImage',
    'heroQuimeraBackgroundImageUrl',
    'homeHeroImageUrl',
    'homeHeroBackgroundImage',
    'homeHeroBackgroundImageUrl',
    'homeHeroSplitImageUrl',
    'homeHeroSplitBackgroundImage',
    'homeHeroSplitBackgroundImageUrl',
    'homeHeroGalleryImageUrl',
    'homeHeroGalleryBackgroundImage',
    'homeHeroGalleryBackgroundImageUrl',
    'homeHeroWaveImageUrl',
    'homeHeroWaveBackgroundImage',
    'homeHeroWaveBackgroundImageUrl',
    'homeHeroNovaImageUrl',
    'homeHeroNovaBackgroundImage',
    'homeHeroNovaBackgroundImageUrl',
    'homeHeroLeadImageUrl',
    'homeHeroLeadBackgroundImage',
    'homeHeroLeadBackgroundImageUrl',
    'homeHeroLuminaImageUrl',
    'homeHeroLuminaBackgroundImage',
    'homeHeroLuminaBackgroundImageUrl',
    'homeHeroNeonImageUrl',
    'homeHeroNeonBackgroundImage',
    'homeHeroNeonBackgroundImageUrl',
    'homeHeroQuimeraImageUrl',
    'homeHeroQuimeraBackgroundImage',
    'homeHeroQuimeraBackgroundImageUrl',
] as const;

const resolveSummaryThumbnailUrl = (row: Record<string, any>, project: Project): string | null => {
    for (const field of SUMMARY_THUMBNAIL_FIELDS) {
        const url = getLightweightProjectImageUrl(row[field]);
        if (url) return url;
    }

    return getLightweightProjectImageUrl(project.thumbnailUrl);
};

const buildSummaryProjectData = (thumbnailUrl: string | null, heroSection: PageSection): PageData =>
    (thumbnailUrl ? { [heroSection]: { imageUrl: thumbnailUrl } } : {}) as PageData;

const mapSupabaseRowToProjectSummary = (row: Record<string, any>): Project => {
    const project = normalizeProject(mapSupabaseRowToProject(row));
    const deletedAt = typeof row.deleted_at === 'string'
        ? row.deleted_at
        : typeof row.deletedAt === 'string' ? row.deletedAt : undefined;
    const deletedBy = typeof row.deleted_by === 'string'
        ? row.deleted_by
        : typeof row.deletedBy === 'string' ? row.deletedBy : undefined;
    const isDeleted = row.is_deleted === true || row.isDeleted === true;
    const summaryThumbnailUrl = resolveSummaryThumbnailUrl(row, project);
    const summaryHeroSection = getSummaryHeroSection(project.componentOrder);
    const summaryComponentOrder = summaryThumbnailUrl ? [summaryHeroSection] as PageSection[] : [] as PageSection[];
    const summarySectionVisibility = summaryThumbnailUrl
        ? { [summaryHeroSection]: true } as Record<PageSection, boolean>
        : {} as Record<PageSection, boolean>;

    return {
        ...project,
        thumbnailUrl: summaryThumbnailUrl || project.thumbnailUrl,
        data: buildSummaryProjectData(summaryThumbnailUrl, summaryHeroSection),
        componentOrder: summaryComponentOrder,
        sectionVisibility: summarySectionVisibility,
        [SUMMARY_PROJECT_FLAG]: true,
        ...(deletedAt ? { deletedAt } : {}),
        ...(deletedBy ? { deletedBy } : {}),
        ...(isDeleted ? { isDeleted } : {}),
    } as Project;
};

const isInitialCatalogOrder = (order: PageSection[]): boolean =>
    order.length === initialData.componentOrder.length &&
    initialData.componentOrder.every((section, index) => order[index] === section);

const isSparseFallbackPageSet = (projectPages: SitePage[]): boolean =>
    projectPages.length === 1 &&
    Array.isArray(projectPages[0]?.sections) &&
    projectPages[0].sections.length <= 2 &&
    projectPages[0].sections.every(section => section === 'header' || section === 'footer');

const cloneProjectValue = <T,>(value: T): T => {
    try {
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch (cloneErr) {
                console.warn('[ProjectContext] structuredClone failed, falling back to sanitization', cloneErr);
                return sanitizeForStorage(value);
            }
        }
        return sanitizeForStorage(value);
    } catch (e) {
        console.warn('[ProjectContext] All clone methods failed', e);
        return {} as T;
    }
};

const isLikelyImageUrl = (value: string): boolean => {
    if (!value || value.startsWith('data:')) return false;
    if (!/^https?:\/\//i.test(value)) return false;

    const lower = value.toLowerCase();
    return (
        /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|#|$)/i.test(lower) ||
        isLegacyStorageUrl(lower) ||
        lower.includes('images.unsplash.com') ||
        lower.includes('lh3.googleusercontent.com')
    );
};

const inferImageType = (url: string): string => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
    if (cleanUrl.endsWith('.webp')) return 'image/webp';
    if (cleanUrl.endsWith('.gif')) return 'image/gif';
    if (cleanUrl.endsWith('.avif')) return 'image/avif';
    if (cleanUrl.endsWith('.ico')) return 'image/x-icon';
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
    return 'image/png';
};

const getImageNameFromUrl = (url: string, index: number): string => {
    try {
        const parsed = new URL(url);
        const storageName = decodeURIComponent(parsed.pathname.split('/').pop() || '');
        const name = storageName.split('/').pop()?.split('?')[0];
        if (name && name.includes('.')) return name.replace(/[^a-zA-Z0-9._-]/g, '_');
    } catch {
        // Fall through to deterministic name.
    }
    const extension = inferImageType(url).split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png';
    return `template-image-${index + 1}.${extension}`;
};

const extractProjectImageUrls = (project: Partial<Project>): string[] => {
    const urls = new Set<string>();
    const visit = (value: unknown) => {
        if (!value) return;
        if (typeof value === 'string') {
            if (isLikelyImageUrl(value)) urls.add(value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (typeof value === 'object') {
            Object.values(value as Record<string, unknown>).forEach(visit);
        }
    };

    visit({
        data: project.data,
        pages: project.pages,
        theme: project.theme,
        brandIdentity: project.brandIdentity,
        thumbnailUrl: project.thumbnailUrl,
        faviconUrl: project.faviconUrl,
        previewImages: project.previewImages,
    });

    return [...urls];
};

// Helper to extract the hero image URL based on whatever Hero component is being used
export const extractHeroImage = (data: Partial<PageData> | null, componentOrder: PageSection[] | undefined): string | null => {
    return extractActiveHeroImage(data as Record<string, any> | null, componentOrder);
};

interface ProjectContextType {
    // Project State
    projects: Project[];
    isLoadingProjects: boolean;
    activeProjectId: string | null;
    activeProject: Project | null;

    // Active Project Data (legacy single-page)
    data: PageData | null;
    setData: React.Dispatch<React.SetStateAction<PageData | null>>;
    theme: ThemeData;
    setTheme: React.Dispatch<React.SetStateAction<ThemeData>>;
    brandIdentity: BrandIdentity;
    setBrandIdentity: React.Dispatch<React.SetStateAction<BrandIdentity>>;
    componentOrder: PageSection[];
    setComponentOrder: React.Dispatch<React.SetStateAction<PageSection[]>>;
    sectionVisibility: Record<PageSection, boolean>;
    setSectionVisibility: React.Dispatch<React.SetStateAction<Record<PageSection, boolean>>>;

    // ==========================================================================
    // MULTI-PAGE ARCHITECTURE
    // ==========================================================================
    /** All pages in the active project */
    pages: SitePage[];
    setPages: React.Dispatch<React.SetStateAction<SitePage[]>>;
    /** Currently active/editing page */
    activePage: SitePage | null;
    /** Set the active page by ID */
    setActivePage: (pageId: string | null) => void;
    /** Add a new page to the project */
    addPage: (page: Partial<SitePage> | PageTemplateId) => Promise<string>;
    /** Update an existing page */
    updatePage: (pageId: string, updates: Partial<SitePage>) => Promise<void>;
    /** Delete a page */
    deletePage: (pageId: string) => Promise<void>;
    /** Reorder pages */
    reorderPages: (pageIds: string[]) => Promise<void>;
    /** Duplicate a page */
    duplicatePage: (pageId: string) => Promise<string>;
    /** Get page by slug (for routing) */
    getPageBySlug: (slug: string) => SitePage | null;
    /** Check if project uses multi-page architecture */
    isMultiPage: boolean;
    /** Migrate legacy project to multi-page */
    migrateToMultiPage: () => Promise<void>;

    // Project Operations
    loadProject: (projectId: string, fromAdmin?: boolean, navigateToEditor?: boolean, projectOverride?: Project) => Promise<void>;
    syncWebsiteBlueprint: (overrides?: Partial<WebsiteEditorSyncInput>) => void;
    saveProject: () => Promise<void>;
    publishProject: () => Promise<boolean>;
    /** Get complete snapshot of current editor state (for publishing) */
    getProjectSnapshot: () => Partial<Project> | null;
    renameActiveProject: (newName: string) => Promise<void>;
    addNewProject: (project: Project) => Promise<string | void>;
    deleteProject: (projectId: string) => Promise<void>;
    createProjectFromTemplate: (templateId: string, newName?: string) => Promise<void>;
    exportProjectAsHtml: () => void;
    updateProjectThumbnail: (projectId: string, file: File) => Promise<void>;
    updateProjectFavicon: (projectId: string, file: File) => Promise<void>;
    /** Update aiAssistantConfig in‑memory only (prevents auto‑save overwrite) */
    updateProjectAiConfig: (projectId: string, config: any) => void;
    /** Persist mediaBlueprint into projects.data without touching canonical business data. */
    updateProjectMediaBlueprint: (projectId: string, mediaBlueprint: MediaBlueprint) => Promise<void>;
    /** Persist SEO config to Supabase and sync local project state */
    updateProjectSeoConfig: (projectId: string, config: SEOConfig) => Promise<void>;

    // Trash & Backup Recovery
    deletedProjects: Project[];
    restoreFromTrash: (projectId: string) => Promise<void>;
    permanentlyDelete: (projectId: string) => Promise<void>;
    restoreFromBackup: (backupId: string) => Promise<void>;

    // Template Management
    isEditingTemplate: boolean;
    exitTemplateEditor: () => void;
    createNewTemplate: () => Promise<void>;
    archiveTemplate: (templateId: string, isArchived: boolean) => Promise<void>;
    duplicateTemplate: (templateId: string) => Promise<void>;
    updateTemplateInState: (templateId: string, updates: Partial<Project>) => void;

    // Refresh
    refreshProjects: () => Promise<void>;

    // Undo support
    pushProjectUndoAction: (description: string, newState: ProjectUndoState, prevState?: ProjectUndoState) => void;
    getCurrentProjectState: () => ProjectUndoState;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, userDocument, loadingAuth, isUserOwner } = useAuth();
    const tenantContext = useSafeTenant();
    const upgradeContext = useSafeUpgrade();
    const adminContext = useSafeAdmin();

    // Get current tenant ID (null if not using multi-tenant or no tenant selected)
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // Get project limits from tenant
    const maxProjects = tenantContext?.currentTenant?.limits?.maxProjects || 1;
    const hasPlatformUnlimitedLimits = isUserOwner || isPlatformUnlimitedUser(userDocument?.role);

    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    // Initialize activeProjectId from localStorage if available
    const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
        try {
            const stored = localStorage.getItem('quimera_activeProjectId');
            return stored || null;
        } catch {
            return null;
        }
    });
    const activeProject = projects.find(p => p.id === activeProjectId) || null;

    // Persist activeProjectId to localStorage when it changes
    useEffect(() => {
        try {
            if (activeProjectId) {
                localStorage.setItem('quimera_activeProjectId', activeProjectId);
            } else {
                localStorage.removeItem('quimera_activeProjectId');
            }
        } catch (e) {
            console.warn('[ProjectContext] Could not persist activeProjectId:', e);
        }
    }, [activeProjectId]);

    // Active Project Data
    const [data, setData] = useState<PageData | null>(null);
    const [theme, setTheme] = useState<ThemeData>(initialData.theme);
    const [brandIdentity, setBrandIdentity] = useState<BrandIdentity>(initialData.brandIdentity);
    const [componentOrder, setComponentOrder] = useState<PageSection[]>(initialData.componentOrder as PageSection[]);
    const [sectionVisibility, setSectionVisibility] = useState<Record<PageSection, boolean>>(
        initialData.sectionVisibility as Record<PageSection, boolean>
    );

    // Template State
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);

    // ==========================================================================
    // MULTI-PAGE STATE
    // ==========================================================================
    const [pages, setPages] = useState<SitePage[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const activePage = pages.find(p => p.id === activePageId) || null;

    // Check if project uses multi-page architecture
    const isMultiPage = pages.length > 0;

    // Auto-save refs
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoadRef = useRef(true);
    const projectsRef = useRef<Project[]>([]);
    const hydratingSummaryProjectIdRef = useRef<string | null>(null);
    const hydratedSummaryProjectIdsRef = useRef<Set<string>>(new Set());
    // CRITICAL: Ref to track the active project ID synchronously for auto-save validation.
    // Unlike state, refs are updated immediately and avoid React batching issues.
    const activeProjectIdRef = useRef<string | null>(activeProjectId);

    // ==========================================================================
    // UNDO / REDO INTEGRATION
    // ==========================================================================
    const { registerModule, unregisterModule } = useSafeUndo() || {};

    const restoreProjectState = useCallback((state: ProjectUndoState) => {
        setData(state.data);
        setTheme(state.theme);
        setComponentOrder(state.componentOrder);
        setSectionVisibility(state.sectionVisibility);
        setPages(state.pages);
    }, []);

    const { pushAction, undo, redo, canUndo, canRedo, lastActionDescription } = useUndoRedo<ProjectUndoState>({
        moduleId: 'project',
        maxHistory: 50,
        onUndo: (action) => restoreProjectState(action.previousState),
        onRedo: (action) => restoreProjectState(action.newState),
    });

    // We need refs for the undo handlers so we don't re-register the module on every state change
    const undoStateRef = useRef({ canUndo, canRedo, lastActionDescription });
    useEffect(() => {
        undoStateRef.current = { canUndo, canRedo, lastActionDescription };
    }, [canUndo, canRedo, lastActionDescription]);

    useEffect(() => {
        if (registerModule) {
            registerModule('project', {
                undo,
                redo,
                canUndo: () => undoStateRef.current.canUndo,
                canRedo: () => undoStateRef.current.canRedo,
                getLastActionDescription: () => undoStateRef.current.lastActionDescription
            });
            return () => {
                if (unregisterModule) unregisterModule('project');
            };
        }
    }, [registerModule, unregisterModule, undo, redo]);

    const getCurrentProjectState = useCallback((): ProjectUndoState => {
        return sanitizeForStorage({ data, theme, componentOrder, sectionVisibility, pages });
    }, [data, theme, componentOrder, sectionVisibility, pages]);

    const pushProjectUndoAction = useCallback((description: string, newState: ProjectUndoState, prevState?: ProjectUndoState) => {
        pushAction({
            type: 'PROJECT_CHANGE',
            description,
            previousState: prevState || getCurrentProjectState(),
            newState
        });
    }, [pushAction, getCurrentProjectState]);

    // Track deleted template IDs
    const getDeletedTemplateIds = (): Set<string> => {
        try {
            const stored = localStorage.getItem('deletedTemplateIds');
            if (stored) {
                return new Set(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Error reading deletedTemplateIds:', e);
        }
        return new Set();
    };
    const deletedTemplateIdsRef = useRef<Set<string>>(getDeletedTemplateIds());

    // Update projectsRef when projects change
    useEffect(() => {
        projectsRef.current = projects;
    }, [projects]);

    // Load templates from Supabase
    
    const loadGlobalTemplates = async (): Promise<{ templates: Project[], deletedIds: Set<string> }> => {
        try {
            const { data: templateSnapshot } = await supabase
                .from('projects')
                .select(PROJECT_LIST_COLUMNS)
                .eq('status', 'Template')
                .eq('is_deleted', false)
                .order('last_updated', { ascending: false });

            const { data: deletedTemplateSnapshot } = await supabase
                .from('projects')
                .select('id')
                .eq('status', 'Template')
                .eq('is_deleted', true);

            const deletedIds = new Set<string>();
            const activeTemplates: Project[] = [];

            (deletedTemplateSnapshot || []).forEach(row => {
                if (row.id) deletedIds.add(row.id);
            });

            (templateSnapshot || []).forEach(row => {
                const docData = mapSupabaseRowToProjectSummary(row);
                
                if (docData.isDeleted === true || deletedTemplateIdsRef.current.has(row.id)) {
                    deletedIds.add(row.id);
                } else {
                    activeTemplates.push(normalizeProject(docData as Project));
                }
            });

            if (deletedIds.size > 0) {
                deletedIds.forEach(id => deletedTemplateIdsRef.current.add(id));
                localStorage.setItem('deletedTemplateIds', JSON.stringify(Array.from(deletedTemplateIdsRef.current)));
            }

            return { templates: activeTemplates, deletedIds };
        } catch (error) {
            console.error("Error loading templates:", error);
            return { templates: [], deletedIds: deletedTemplateIdsRef.current };
        }
    };

    const loadFullProjectFromSupabase = async (projectId: string): Promise<Project> => {
        const { data: projectSnap, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) throw error;
        return normalizeProject(mapSupabaseRowToProject(projectSnap));
    };


    // Load user/tenant projects
    const loadUserProjects = useCallback(async (userId: string, tenantId?: string | null) => {
        setIsLoadingProjects(true);
        try {
            let allUserProjects: Project[] = [];
            let allDeletedProjects: Project[] = [];

            // Always load from user's personal path first (Legacy support for null tenant_id)
            try {
                
                const { data: userSnapshot } = await supabase
                    .from('projects')
                    .select(PROJECT_LIST_COLUMNS)
                    .eq('user_id', userId)
                    .is('tenant_id', null)
                    .eq('is_deleted', false)
                    .order('last_updated', { ascending: false });

                const { data: userDeletedSnapshot } = await supabase
                    .from('projects')
                    .select(PROJECT_LIST_COLUMNS)
                    .eq('user_id', userId)
                    .is('tenant_id', null)
                    .eq('is_deleted', true)
                    .order('deleted_at', { ascending: false });
                
                const personalProjects = (userSnapshot || []).map(row => mapSupabaseRowToProjectSummary(row));
                const personalDeletedProjects = (userDeletedSnapshot || []).map(row => mapSupabaseRowToProjectSummary(row));
                allUserProjects = [...personalProjects];
                allDeletedProjects = [...personalDeletedProjects];

            } catch (err) {
                console.warn("Could not load personal projects:", err);
            }

            // If there's a tenant, also load from tenant path
            if (tenantId) {
                try {
                    
                    const { data: tenantSnapshot } = await supabase
                        .from('projects')
                        .select(PROJECT_LIST_COLUMNS)
                        .eq('tenant_id', tenantId)
                        .eq('is_deleted', false)
                        .order('last_updated', { ascending: false });

                    const { data: tenantDeletedSnapshot } = await supabase
                        .from('projects')
                        .select(PROJECT_LIST_COLUMNS)
                        .eq('tenant_id', tenantId)
                        .eq('is_deleted', true)
                        .order('deleted_at', { ascending: false });
                    
                    const tenantProjects = (tenantSnapshot || []).map(row => mapSupabaseRowToProjectSummary(row));
                    const tenantDeletedProjects = (tenantDeletedSnapshot || []).map(row => mapSupabaseRowToProjectSummary(row));
                    allUserProjects = [...allUserProjects, ...tenantProjects];
                    allDeletedProjects = [...allDeletedProjects, ...tenantDeletedProjects];

                } catch (err) {
                    console.warn("Could not load tenant projects:", err);
                }
            }

            // Remove duplicates by ID (in case same project exists in both)
            const uniqueProjects = allUserProjects.filter((project, index, self) =>
                index === self.findIndex(p => p.id === project.id)
            );
            const uniqueDeletedProjects = allDeletedProjects.filter((project, index, self) =>
                index === self.findIndex(p => p.id === project.id)
            );

            // Separate active projects from soft-deleted (trash) projects
            const activeProjects = uniqueProjects.filter(p => !(p as any).isDeleted && !(p as any).deletedAt);
            const trashedProjects = uniqueDeletedProjects;

            // Sort by lastUpdated
            activeProjects.sort((a, b) => {
                const dateA = new Date(a.lastUpdated || 0).getTime();
                const dateB = new Date(b.lastUpdated || 0).getTime();
                return dateB - dateA;
            });

            // Sort trashed by deletedAt (most recent first)
            trashedProjects.sort((a, b) => {
                const dateA = new Date((a as any).deletedAt || 0).getTime();
                const dateB = new Date((b as any).deletedAt || 0).getTime();
                return dateB - dateA;
            });

            const { templates: globalTemplates } = await loadGlobalTemplates();
            
            // Filter out any trashed templates that we manually marked as deleted 
            // but might still be returned via cached/duplicate status 
            const finalActiveProjects = activeProjects.filter(p => !deletedTemplateIdsRef.current.has(p.id));
            
            // Merge templates and user projects, deduplicating by ID (prioritize templates for Template status)
            const mergedProjectsMap = new Map<string, Project>();
            
            // First add user projects
            finalActiveProjects.forEach(p => {
                mergedProjectsMap.set(p.id, p);
            });
            
            // Then add templates (overwriting any ghost templates in user projects)
            globalTemplates.forEach(t => {
                mergedProjectsMap.set(t.id, t);
            });
            
            setProjects(Array.from(mergedProjectsMap.values()));
            setDeletedProjects(trashedProjects);
        } catch (error) {
            console.error("Error loading projects:", error);
            try {
                const { templates } = await loadGlobalTemplates();
                setProjects(templates);
            } catch {
                setProjects([]);
            }
        } finally {
            setIsLoadingProjects(false);
        }
    }, []);

    // Load projects when user or tenant changes
    useEffect(() => {
        if (user) {
            loadUserProjects(user.id, currentTenantId);
        } else {
            setProjects([]);
            setIsLoadingProjects(false);
        }
    }, [user, currentTenantId, loadUserProjects]);

    // Restore active project from localStorage after projects load
    useEffect(() => {
        const restoreProject = async () => {
            if (!isLoadingProjects && projects.length > 0 && activeProjectId && !activeProject) {
                // We have a stored activeProjectId but the project isn't loaded yet
                const storedProject = projects.find(p => p.id === activeProjectId);
                if (storedProject && !data && !isSummaryProject(storedProject)) {
                    // Project exists and we don't have data loaded - restore it
                    console.log('[ProjectContext] Restoring project from localStorage:', storedProject.name);

                    // Guard against auto-save during restoration
                    isInitialLoadRef.current = true;

                    // CRITICAL: Cancel any pending auto-save and sync ref
                    if (autoSaveTimerRef.current) {
                        clearTimeout(autoSaveTimerRef.current);
                        autoSaveTimerRef.current = null;
                    }
                    activeProjectIdRef.current = activeProjectId;

                    setData(storedProject.data);
                    setTheme(storedProject.theme);
                    setBrandIdentity(storedProject.brandIdentity || initialData.brandIdentity);
                    setComponentOrder(hasItems(storedProject.componentOrder) ? storedProject.componentOrder : initialData.componentOrder as PageSection[]);
                    setSectionVisibility(storedProject.sectionVisibility || initialData.sectionVisibility as Record<PageSection, boolean>);

                    // CRITICAL FIX: Also restore pages for multi-page architecture
                    if (storedProject.pages && storedProject.pages.length > 0) {
                        console.log('[ProjectContext] Restoring pages:', storedProject.pages.length, 'pages');
                        setPages(storedProject.pages);
                        // Set home page as active by default
                        const homePage = storedProject.pages.find(p => p.isHomePage) || storedProject.pages[0];
                        setActivePageId(homePage?.id || null);
                    } else {
                        // Legacy project - migrate to multi-page architecture
                        console.log('[ProjectContext] Migrating legacy project to multi-page architecture during restore');
                        try {
                            const { generatePagesFromLegacyProject } = await import('../../utils/legacyMigration');
                            const migratedPages = generatePagesFromLegacyProject(
                                storedProject.componentOrder || [],
                                storedProject.sectionVisibility || {},
                                storedProject.data || {}
                            );
                            setPages(migratedPages);
                            // Set home page as active by default
                            const homePage = migratedPages.find(p => p.isHomePage) || migratedPages[0];
                            setActivePageId(homePage?.id || null);
                        } catch (error) {
                            console.error('[ProjectContext] Error migrating legacy project:', error);
                        }
                    }

                    // Allow auto-save after state has settled
                    setTimeout(() => {
                        isInitialLoadRef.current = false;
                    }, 1500);
                } else if (storedProject && isSummaryProject(storedProject)) {
                    console.log('[ProjectContext] Stored project is a summary; waiting for explicit full load:', storedProject.name);
                } else if (!storedProject) {
                    // Stored project no longer exists - clear it
                    console.log('[ProjectContext] Stored project no longer exists, clearing');
                    setActiveProjectId(null);
                }
            }
        };

        restoreProject();
    }, [isLoadingProjects, projects, activeProjectId, activeProject, data]);

    // Load project by ID
    const loadProject = useCallback(async (projectId: string, fromAdmin = false, navigateToEditor = true, projectOverride?: Project) => {
        console.log('[ProjectContext] loadProject called with:', { projectId, fromAdmin, navigateToEditor, hasOverride: !!projectOverride });
        console.log('[ProjectContext] Available projects:', projectsRef.current.map(p => ({ id: p.id, name: p.name })));

        // Use projectOverride if provided (useful for newly created projects not yet in state)
        let project = projectOverride || projectsRef.current.find(p => p.id === projectId);

        // If project is not local or only has list metadata, load the full row before editor handoff.
        if ((!project || isSummaryProject(project)) && user) {
            console.log('[ProjectContext] Project needs full Supabase load...');
            try {
                // Try loading from user's projects
                
                const { data: projectSnap } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();

                if (projectSnap) {
                    project = normalizeProject(mapSupabaseRowToProject(projectSnap));

                    console.log('[ProjectContext] Loaded project from Supabase:', project.name);
                    // Add or replace local summary state with the full project.
                    setProjects(prev => {
                        let replaced = false;
                        const next = prev.map(p => {
                            if (p.id !== projectId) return p;
                            replaced = true;
                            return project!;
                        });
                        return replaced ? next : [project!, ...prev];
                    });
                } else {
                    // Try loading from templates
                    
                    // If not found, templates are also in the projects table with status='Template'
                    // but we already fetched single() above, so this block might be redundant 
                    // unless RLS prevented us from seeing it. 
                    // To replicate exactly, we'll try fetching without RLS restrictions if possible, or just retry
                    const { data: templateSnap } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('id', projectId)
                        .eq('status', 'Template')
                        .single();
                    if (templateSnap) {
                        project = normalizeProject(mapSupabaseRowToProject(templateSnap));

                        console.log('[ProjectContext] Loaded template from Supabase:', project.name);
                        setProjects(prev => {
                            let replaced = false;
                            const next = prev.map(p => {
                                if (p.id !== projectId) return p;
                                replaced = true;
                                return project!;
                            });
                            return replaced ? next : [project!, ...prev];
                        });
                    }
                }
            } catch (error) {
                console.error('[ProjectContext] Error loading project from Supabase:', error);
            }
        }

        if (!project || isSummaryProject(project)) {
            console.error("[ProjectContext] Project not found:", projectId);
            console.error("[ProjectContext] Available project IDs:", projectsRef.current.map(p => p.id));
            // Always redirect to dashboard if a requested project is missing to prevent infinite loading screens
            router.navigate('/dashboard');
            return;
        }

        // If using projectOverride, replace the in-memory project immediately so
        // feature dashboards can repaint after their scoped mutations.
        if (projectOverride) {
            console.log('[ProjectContext] Applying projectOverride to projects list');
            setProjects(prev => {
                let replaced = false;
                const next = prev.map(p => {
                    if (p.id !== projectOverride.id) return p;
                    replaced = true;
                    return projectOverride;
                });
                return replaced ? next : [projectOverride, ...prev];
            });
        }

        console.log('[ProjectContext] Loading project:', project.name);

        // CRITICAL: Set initial load guard BEFORE any state updates to prevent
        // auto-save from firing during the project switch and overwriting the
        // wrong project's data. This prevents a race condition where React
        // processes state changes (setData, setActiveProjectId) during an async
        // gap (await import) and the auto-save effect fires before this guard
        // was previously set.
        isInitialLoadRef.current = true;

        // CRITICAL FIX: Cancel any pending auto-save from the PREVIOUS project
        // before updating any state. This prevents the timer callback from
        // executing with the old project's data but the new project's ID.
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
            console.log('[ProjectContext] Cancelled pending auto-save during project switch');
        }

        // Update the ref synchronously (used by auto-save callback for validation)
        activeProjectIdRef.current = projectId;

        setActiveProjectId(projectId);
        setData((project.data || {}) as PageData);
        setTheme(project.theme);
        setBrandIdentity(project.brandIdentity || initialData.brandIdentity);
        setComponentOrder(hasItems(project.componentOrder) ? project.componentOrder : initialData.componentOrder as PageSection[]);
        setSectionVisibility(project.sectionVisibility || initialData.sectionVisibility as Record<PageSection, boolean>);

        // Load pages if using multi-page architecture
        if (project.pages && project.pages.length > 0) {
            setPages(project.pages);
            // Set home page as active by default
            const homePage = project.pages.find(p => p.isHomePage) || project.pages[0];
            setActivePageId(homePage?.id || null);
        } else {
            // Legacy project - migrate to multi-page architecture
            console.log('[ProjectContext] Migrating legacy project to multi-page architecture');
            const { generatePagesFromLegacyProject } = await import('../../utils/legacyMigration');
            const migratedPages = generatePagesFromLegacyProject(
                project.componentOrder || [],
                project.sectionVisibility || {},
                project.data || {}
            );
            setPages(migratedPages);
            // Set home page as active by default
            const homePage = migratedPages.find(p => p.isHomePage) || migratedPages[0];
            setActivePageId(homePage?.id || null);
        }

        const isTemplate = project.status === 'Template';
        setIsEditingTemplate(isTemplate && fromAdmin);

        // Reset initial load guard after state has settled (give React time
        // to process the batched updates before allowing auto-save again)
        setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 1500);

        if (navigateToEditor) {
            router.navigate(`/editor/${projectId}`);
        }
    }, [user, currentTenantId]);

    useEffect(() => {
        if (activeProjectId && activeProject && !isSummaryProject(activeProject)) {
            hydratedSummaryProjectIdsRef.current.delete(activeProjectId);
            return;
        }

        if (
            isLoadingProjects ||
            !user ||
            !activeProjectId ||
            !activeProject ||
            !isSummaryProject(activeProject) ||
            hydratingSummaryProjectIdRef.current === activeProjectId ||
            hydratedSummaryProjectIdsRef.current.has(activeProjectId)
        ) {
            return;
        }

        hydratingSummaryProjectIdRef.current = activeProjectId;
        hydratedSummaryProjectIdsRef.current.add(activeProjectId);
        console.log('[ProjectContext] Hydrating active summary project:', activeProject.name);

        loadProject(activeProjectId, false, false)
            .catch(error => {
                console.error('[ProjectContext] Error hydrating active summary project:', error);
                hydratedSummaryProjectIdsRef.current.delete(activeProjectId);
            })
            .finally(() => {
                if (hydratingSummaryProjectIdRef.current === activeProjectId) {
                    hydratingSummaryProjectIdRef.current = null;
                }
            });
    }, [isLoadingProjects, user, activeProjectId, activeProject, loadProject]);

    // Helper to deeply remove undefined values (Supabase doesn't accept undefined at any level)
    const removeUndefinedValues = (obj: any): any => {
        if (obj === undefined) return undefined;
        if (obj === null) return null;
        if (typeof obj !== 'object') return obj;

        // Supabase specific types (Date, Timestamp, GeoPoint, etc) shouldn't be stripped of their prototypes
        if (obj instanceof Date) return obj;
        if (obj.toDate && typeof obj.toDate === 'function') return obj; // Supabase Timestamp
        if (obj.isEqual && typeof obj.isEqual === 'function') return obj; // Supabase GeoPoint/Reference

        if (Array.isArray(obj)) {
            // Supabase arrays cannot contain undefined, so we map and filter
            return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
        }

        const result: any = {};
        for (const key of Object.keys(obj)) {
            const val = removeUndefinedValues(obj[key]);
            if (val !== undefined) {
                result[key] = val;
            }
        }
        return result;
    };

    const syncWebsiteBlueprint = useCallback((overrides: Partial<WebsiteEditorSyncInput> = {}) => {
        if (!activeProjectId) return;

        const nextData = overrides.data !== undefined ? overrides.data : data;
        if (!nextData) return;

        const now = overrides.now || new Date().toISOString();
        setProjects(prev => prev.map(project => {
            if (project.id !== activeProjectId || isSummaryProject(project)) return project;

            const nextBlueprint = syncWebsiteBlueprintFromEditor({
                businessBlueprint: overrides.businessBlueprint || resolveProjectBusinessBlueprint(project),
                projectId: activeProjectId,
                projectName: project.name,
                userId: user?.id,
                data: nextData,
                theme: overrides.theme || theme,
                brandIdentity: overrides.brandIdentity || brandIdentity,
                componentOrder: overrides.componentOrder || componentOrder,
                sectionVisibility: overrides.sectionVisibility || sectionVisibility,
                pages: overrides.pages || pages,
                touchedSection: overrides.touchedSection,
                action: overrides.action || 'save_project',
                now,
            });

            return {
                ...project,
                businessBlueprint: nextBlueprint,
                lastUpdated: now,
            };
        }));
    }, [activeProjectId, data, theme, brandIdentity, componentOrder, sectionVisibility, pages, user?.id]);

    // Save current project - saves ALL fields to ensure consistency
    const saveProject = useCallback(async () => {
        if (!user || !activeProjectId || !data) return;

        // Never let an empty editor state overwrite a populated project.
        // This protects against stale tabs/autosave after failed loads or schema mismatches.
        if (Object.keys(data).length === 0) {
            console.warn('[ProjectContext] saveProject skipped: refusing to overwrite project with empty PageData', {
                activeProjectId,
            });
            return;
        }

        // CRITICAL: Validate synchronous ref matches the state-based activeProjectId.
        // During rapid project switches, React may batch state updates, causing
        // `activeProjectId` (state) to lag behind `activeProjectIdRef` (synchronous).
        // If they don't match, we're in a transitional state — skip the save.
        if (activeProjectIdRef.current !== activeProjectId) {
            console.log(`[ProjectContext] saveProject skipped: ref (${activeProjectIdRef.current}) !== state (${activeProjectId})`);
            return;
        }

        const project = projectsRef.current.find(p => p.id === activeProjectId);
        if (!project) return;
        if (isSummaryProject(project)) {
            console.warn('[ProjectContext] saveProject skipped: active project is only a dashboard summary', {
                activeProjectId,
            });
            return;
        }

        const isTemplate = project.status === 'Template';
        const now = new Date().toISOString();

        // Menus are owned by CMSContext (projects.menus column). Fetch the latest
        // version so autosave keeps data.menus in sync and never drops navigation.
        let latestMenus = project.menus || [];
        let menuRow: {
            menus?: unknown;
            data?: any;
            status?: string;
            published_at?: string | null;
            component_order?: PageSection[];
            pages?: SitePage[];
        } | null = null;
        try {
            const { data: fetchedRow } = await supabase
                .from('projects')
                .select('menus, data, status, published_at, component_order, pages')
                .eq('id', activeProjectId)
                .single();
            menuRow = fetchedRow;
            if (menuRow) {
                latestMenus = resolveProjectMenus(menuRow);
            }
        } catch (menuFetchError) {
            console.warn('[ProjectContext] Could not fetch latest menus for save:', menuFetchError);
        }
        const persistedStatus =
            menuRow?.published_at || menuRow?.status === 'Published' || project.status === 'Published'
                ? 'Published'
                : (project.status || 'Draft');

        const persistedOrder = hasItems(menuRow?.component_order)
            ? menuRow?.component_order
            : hasItems(menuRow?.data?.componentOrder)
                ? menuRow?.data?.componentOrder as PageSection[]
                : undefined;
        const persistedPages = hasItems(menuRow?.pages)
            ? menuRow?.pages
            : hasItems(menuRow?.data?.pages)
                ? menuRow?.data?.pages as SitePage[]
                : undefined;
        if (
            isInitialCatalogOrder(componentOrder) &&
            isSparseFallbackPageSet(pages) &&
            hasItems(persistedOrder) &&
            persistedOrder.length < componentOrder.length &&
            hasItems(persistedPages) &&
            persistedPages.length > pages.length
        ) {
            console.warn('[ProjectContext] saveProject skipped: refusing to overwrite curated project structure with global fallback component catalog', {
                activeProjectId,
                currentOrderCount: componentOrder.length,
                persistedOrderCount: persistedOrder.length,
                currentPagesCount: pages.length,
                persistedPagesCount: persistedPages.length,
            });
            return;
        }

        const businessBlueprint = syncWebsiteBlueprintFromEditor({
            businessBlueprint: resolveProjectBusinessBlueprint(project),
            projectId: activeProjectId,
            projectName: project.name,
            userId: user.id,
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            pages,
            action: 'save_project',
            now,
        });

        // Save ALL project fields to ensure Supabase stays in sync with editor
        // Use removeUndefinedValues to filter out undefined (Supabase doesn't accept undefined)
        let updatedProject = removeUndefinedValues(sanitizeForStorage({
            // Core page data (from React state)
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            lastUpdated: now,

            // Multi-page architecture
            ...(pages.length > 0 && { pages }),

            // Keep menus in the data snapshot aligned with the CMS column
            ...(latestMenus.length > 0 && { menus: latestMenus }),

            // SEO configuration (only include if exists)
            ...(project.seoConfig && { seoConfig: project.seoConfig }),

            // Design system (only include if exists)
            ...(project.designTokens && { designTokens: project.designTokens }),
            ...(project.responsiveStyles && { responsiveStyles: project.responsiveStyles }),
            ...(project.componentStyles && { componentStyles: project.componentStyles }),
            ...(project.componentStatus && { componentStatus: project.componentStatus }),

            // AI Assistant configuration (only include if exists)
            ...(project.aiAssistantConfig && { aiAssistantConfig: project.aiAssistantConfig }),

            // Assets (only include if exists)
            ...(project.faviconUrl && { faviconUrl: project.faviconUrl }),
            // Auto-sync only the active Hero image; do not keep stale thumbnails.
            thumbnailUrl: extractActiveHeroImage(data as Record<string, any>, componentOrder, sectionVisibility) || null,

            // A/B Testing (only include if exists)
            ...(project.abTests && { abTests: project.abTests }),

            // CRM Configuration (only include if exists)
            ...(project.crmConfig && { crmConfig: project.crmConfig }),

            // Business Blueprint (A1 stores it in projects.data; no dedicated column yet)
            businessBlueprint,
        }));
        const persistedProjectData = isPlainRecord(menuRow?.data) ? menuRow.data as Record<string, unknown> : null;
        const manualCheckpoint = persistedProjectData
            ? createSnapshotBeforeManualSave(persistedProjectData, {
                projectId: activeProjectId,
                now,
                metadata: {
                    tenantId: currentTenantId || null,
                    userId: user.id,
                    createdBy: user.id,
                    actionType: 'editor_manual_save',
                    module: 'websiteEditor',
                    source: 'project-context',
                    projectName: project.name,
                    summary: 'Captured the project before a manual editor save.',
                },
                nextProjectData: updatedProject as Record<string, unknown>,
            })
            : null;
        const latestVersionHistory = manualCheckpoint?.nextProjectData.versionHistory
            || persistedProjectData?.versionHistory
            || (project as any).versionHistory;
        if (latestVersionHistory) {
            updatedProject = {
                ...updatedProject,
                versionHistory: latestVersionHistory,
            };
        }

        try {
            
            // In Supabase, we just update the projects table
            const supabaseUpdate: Record<string, any> = {
                name: updatedProject.name || project.name,
                status: isTemplate ? 'Template' : persistedStatus,
                data: updatedProject,
                theme: updatedProject.theme || theme,
                brand_identity: updatedProject.brandIdentity || brandIdentity,
                component_order: componentOrder,
                section_visibility: sectionVisibility,
                pages: pages.length > 0 ? pages : null,
                thumbnail_url: updatedProject.thumbnailUrl ?? null,
                last_updated: now,
            };
            if (latestMenus.length > 0) {
                supabaseUpdate.menus = latestMenus;
            }
            if (updatedProject.aiAssistantConfig) {
                supabaseUpdate.ai_assistant_config = updatedProject.aiAssistantConfig;
            }
            if (updatedProject.seoConfig) {
                supabaseUpdate.seo_config = updatedProject.seoConfig;
            }
            if (updatedProject.crmConfig) {
                supabaseUpdate.crm_config = updatedProject.crmConfig;
            }

            const { error: updateErr } = await supabase.from('projects').update(supabaseUpdate).eq('id', activeProjectId);
            
            if (updateErr) throw updateErr;


            setProjects(prev => prev.map(p =>
                p.id === activeProjectId
                    ? { ...p, ...updatedProject, businessBlueprint, status: isTemplate ? 'Template' : persistedStatus, menus: latestMenus } as Project
                    : p
            ));
        } catch (error) {
            console.error("Error saving project:", error);
            throw error;
        }
    }, [user, activeProjectId, data, theme, brandIdentity, componentOrder, sectionVisibility, currentTenantId, pages]);

    // Get complete snapshot of current editor state
    // This is the SINGLE SOURCE OF TRUTH for publishing
    const getProjectSnapshot = useCallback((): Partial<Project> | null => {
        if (!user || !activeProjectId || !data) return null;

        const project = projectsRef.current.find(p => p.id === activeProjectId);
        if (!project) return null;
        const now = new Date().toISOString();
        const businessBlueprint = syncWebsiteBlueprintFromEditor({
            businessBlueprint: resolveProjectBusinessBlueprint(project),
            projectId: activeProjectId,
            projectName: project.name,
            userId: user.id,
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            pages: pages.length > 0 ? pages : project.pages || [],
            action: 'save_project',
            now,
        });

        // Return complete snapshot of current editor state
        // This includes ALL fields that should be published
        // All values must be defined (not undefined) for Supabase compatibility
        const snapshot: Partial<Project> = {
            id: activeProjectId,
            name: project.name,
            userId: project.userId || user.id, // Fallback to current user

            // Core page data (from React state - most up to date)
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,

            // Multi-page architecture
            pages: pages.length > 0 ? pages : (project.pages || []),

            // Navigation
            menus: project.menus || [],

            // Status
            status: project.status,
            lastUpdated: now,
            businessBlueprint,
        };

        // Only include optional fields if they have values (avoid undefined)
        if (project.seoConfig) snapshot.seoConfig = project.seoConfig;
        if (project.designTokens) snapshot.designTokens = project.designTokens;
        if (project.responsiveStyles) snapshot.responsiveStyles = project.responsiveStyles;

        // CRITICAL FIX: Use componentStyles from AdminContext if project doesn't have them
        // The editor uses AdminContext's componentStyles, so we need to include them in the snapshot
        const effectiveComponentStyles = project.componentStyles || adminContext?.componentStyles;
        if (effectiveComponentStyles) snapshot.componentStyles = effectiveComponentStyles;

        if (project.componentStatus) snapshot.componentStatus = project.componentStatus;
        if (project.aiAssistantConfig) snapshot.aiAssistantConfig = project.aiAssistantConfig;
        if (project.faviconUrl) snapshot.faviconUrl = project.faviconUrl;
        if (project.thumbnailUrl) snapshot.thumbnailUrl = project.thumbnailUrl;
        if (project.abTests) snapshot.abTests = project.abTests;
        if (project.crmConfig) snapshot.crmConfig = project.crmConfig;
        return snapshot;
    }, [user, activeProjectId, data, theme, brandIdentity, componentOrder, sectionVisibility, pages, adminContext]);

    // Publish project to publicStores (makes it accessible via custom domains)
    // Uses centralized publishService with editor snapshot (single source of truth)
    const publishProject = useCallback(async (): Promise<boolean> => {
        console.log('[ProjectContext] publishProject called');

        if (!user || !activeProjectId || !data) {
            console.error('[ProjectContext] Cannot publish: missing user, project, or data');
            return false;
        }

        try {
            // Get snapshot from editor (single source of truth)
            const snapshot = getProjectSnapshot();
            if (!snapshot) {
                console.error('[ProjectContext] Cannot publish: failed to get project snapshot');
                return false;
            }

            // CRITICAL: Fetch latest menus from the dedicated column (CMSContext source of truth)
            try {
                const { data: projectSnap } = await supabase.from('projects').select('menus, data').eq('id', activeProjectId).single();
                if (projectSnap) {
                    const latestMenus = resolveProjectMenus(projectSnap);
                    if (latestMenus.length > 0) {
                        snapshot.menus = latestMenus;
                        console.log(`🔄 [ProjectContext] Fetched latest menus from Supabase: ${latestMenus.length} menus`);
                    }
                }
            } catch (menuFetchError) {
                console.warn('[ProjectContext] Could not fetch latest menus, using snapshot data:', menuFetchError);
            }

            console.log(`📸 [ProjectContext] Using editor snapshot for project: ${snapshot.name}`);

            // Debug: Log hero data to verify it's correct
            const heroHeadline = resolveProjectName(snapshot.data?.hero?.headline);
            const heroImageUrl = snapshot.data?.hero?.imageUrl;
            console.log(`🔍 [ProjectContext] Hero data in snapshot:`, {
                heroVariant: snapshot.data?.hero?.heroVariant,
                headline: heroHeadline.substring(0, 30),
                hasBackgroundImage: !!snapshot.data?.hero?.backgroundImage,
                imageUrl: typeof heroImageUrl === 'string' ? heroImageUrl.substring(0, 50) : '',
                primaryCtaLink: snapshot.data?.hero?.primaryCtaLink,
                primaryCtaLinkType: snapshot.data?.hero?.primaryCtaLinkType,
            });
            console.log(`🔍 [ProjectContext] Theme in snapshot:`, {
                primaryColor: snapshot.theme?.globalColors?.primary,
                fontHeader: snapshot.theme?.fontFamilyHeader,
            });
            console.log(`🔍 [ProjectContext] ComponentOrder:`, snapshot.componentOrder?.slice(0, 5));

            // Import and use the centralized publish service
            const { publishProject: publishToService } = await import('../../services/publishService');

            // CRITICAL FIX: Handle personal tenant mapping
            // Personal tenants (tenant_{userId}) should be treated as null tenantId 
            // so publishService writes to users/{uid}/projects instead of tenants/{id}/projects
            let targetTenantId = currentTenantId;
            if (currentTenantId && currentTenantId.startsWith(`tenant_${user.id}`)) {
                console.log('[ProjectContext] Detected personal tenant, setting targetTenantId to null for publishing');
                targetTenantId = null;
            }

            // Publish using the centralized service with the editor snapshot
            const result = await publishToService({
                userId: user.id,
                projectId: activeProjectId,
                tenantId: targetTenantId || null,
                projectSnapshot: snapshot,
                saveDraftFirst: true, // Save draft and publish snapshot to Supabase
                includeEcommerce: true,
                includeCMS: true,
            });

            if (!result.success) {
                console.error('[ProjectContext] Publish failed:', result.error);
                return false;
            }

            setProjects(prev => prev.map(p =>
                p.id === activeProjectId ? { ...p, status: 'Published' } : p
            ));

            console.log(`✅ [ProjectContext] Project published successfully at ${result.publishedAt}`);
            if (result.stats) {
                console.log(`   📦 Products: ${result.stats.productsPublished}`);
                console.log(`   📂 Categories: ${result.stats.categoriesPublished}`);
                console.log(`   📝 Posts: ${result.stats.postsPublished}`);
            }

            // AUTOMATIC DOMAIN SYNC (keep this for domain mapping updates)
            try {
                const { data: projectDomains } = await supabase
                    .from('custom_domains')
                    .select('*')
                    .eq('user_id', user.id);

                const domainsForProject = (projectDomains || []).filter((domain: any) => {
                    const domainData = domain.data || {};
                    return domainData.projectId === activeProjectId || domainData.project_id === activeProjectId;
                });

                if (domainsForProject.length > 0) {
                    console.log(`📡 [ProjectContext] Syncing ${domainsForProject.length} domains...`);

                    for (const domain of domainsForProject) {
                        const normalizedDomain = (domain.domain_name || domain.data?.domain || '').toLowerCase().trim().replace(/^www\./, '');
                        if (!normalizedDomain) continue;
                        const domainData = domain.data || {};

                        await supabase.from('custom_domains').upsert({
                            domain_name: normalizedDomain,
                            user_id: user.id,
                            data: {
                                ...domainData,
                                domain: normalizedDomain,
                                projectId: activeProjectId,
                                status: 'active',
                                sslStatus: 'active',
                                dnsVerified: true,
                                cloudRunTarget: 'cname.vercel-dns.com',
                                provider: 'Vercel',
                                updatedAt: new Date().toISOString(),
                            },
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'domain_name' });
                    }
                }
            } catch (syncError) {
                console.warn('[ProjectContext] Domain sync warning (non-critical):', syncError);
            }

            return true;
        } catch (error) {
            console.error('[ProjectContext] Error publishing project:', error);
            return false;
        }
    }, [user, activeProjectId, data, currentTenantId, getProjectSnapshot]);

    // Auto-save effect
    useEffect(() => {
        if (!activeProjectId || !data || isInitialLoadRef.current) return;

        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // Capture the projectId at the time of scheduling
        const scheduledProjectId = activeProjectId;

        autoSaveTimerRef.current = setTimeout(() => {
            // SAFETY NET: Double-check isInitialLoadRef inside the callback.
            // This prevents saving during a project switch if the effect body
            // check passed but loadProject set the guard before the timer fired.
            if (isInitialLoadRef.current) {
                console.log('[ProjectContext] Auto-save skipped: project is loading');
                return;
            }
            // CRITICAL FIX: Validate the project hasn't changed during the debounce.
            // activeProjectIdRef is updated synchronously in loadProject(), so this
            // catches transitions the state-based scheduledProjectId can't detect.
            if (activeProjectIdRef.current !== scheduledProjectId) {
                console.log(`[ProjectContext] Auto-save skipped: project changed during debounce (scheduled: ${scheduledProjectId}, current: ${activeProjectIdRef.current})`);
                return;
            }
            // CRITICAL FIX: Verify the project still exists in local state before saving.
            // This prevents writing stale data to projects that were deleted or never existed.
            const projectToSave = projectsRef.current.find(p => p.id === scheduledProjectId);
            if (!projectToSave) {
                console.log(`[ProjectContext] Auto-save skipped: project ${scheduledProjectId} not found in local state`);
                return;
            }
            saveProject().catch(console.error);
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [data, theme, brandIdentity, componentOrder, sectionVisibility, activeProjectId, saveProject, pages]);

    // Rename project
    const renameActiveProject = async (newName: string) => {
        if (!user || !activeProjectId) return;

        const project = projects.find(p => p.id === activeProjectId);
        if (!project) return;

        const projectData = project.data || {};
        
        await supabase.from('projects').update({
            name: newName,
            data: { ...projectData, name: newName }
        }).eq('id', activeProjectId);

        setProjects(prev => prev.map(p =>
            p.id === activeProjectId ? { ...p, name: newName } : p
        ));
    };

    // Add new project (with limit check)
    const addNewProject = async (project: Project): Promise<string | void> => {
        if (!user) return;

        // Count current user projects (excluding templates)
        const userProjects = projects.filter(p => p.status !== 'Template');
        const currentProjectCount = userProjects.length;

        // Owner and Super Admin are the only roles that bypass resource limits.
        const isOwner = hasPlatformUnlimitedLimits;
        if (loadingAuth) return; // Wait for auth to be sure
        const projectLimit = isFinitePlanLimit(maxProjects) ? maxProjects : 0;
        if (!isOwner && currentProjectCount >= projectLimit) {
            // Show upgrade modal if available
            if (upgradeContext) {
                upgradeContext.showProjectsUpgrade(currentProjectCount, projectLimit);
            }
            throw new Error(`Has alcanzado el límite de ${projectLimit} proyectos. Actualiza tu plan para crear más.`);
        }

        const { id: providedId, ...projectData } = project;
        const projectMenus = Array.isArray((projectData as any).menus) ? (projectData as any).menus : [];
        const normalizedComponentOrder =
            normalizeProjectComponentOrder(projectData.componentOrder || initialData.componentOrder as PageSection[]) ||
            (initialData.componentOrder as PageSection[]);
        const normalizedSectionVisibility = normalizedComponentOrder.reduce((acc, section) => {
            acc[section] = projectData.sectionVisibility?.[section] ?? true;
            return acc;
        }, { ...(projectData.sectionVisibility || {}) } as Record<PageSection, boolean>);
        const normalizedProjectData = {
            ...projectData,
            componentOrder: normalizedComponentOrder,
            sectionVisibility: normalizedSectionVisibility,
        };
        
        const deploymentData = (normalizedProjectData as any).deployment || {};
        const dataToSave: Record<string, any> = {
            ...normalizedProjectData,
            deployment: { ...deploymentData },
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
        };
        const aiAssistantConfigToSave = (normalizedProjectData as any).aiAssistantConfig;

        if ((normalizedProjectData as any).vercelProjectId) {
            dataToSave.vercelProjectId = (normalizedProjectData as any).vercelProjectId;
        }
        if ((normalizedProjectData as any).vercel_project_id) {
            dataToSave.vercel_project_id = (normalizedProjectData as any).vercel_project_id;
        }
        if (deploymentData.vercelProjectId) {
            dataToSave.deployment.vercelProjectId = deploymentData.vercelProjectId;
        }

        let finalId: string;

        if (providedId) {
            const { error: insertErr } = await supabase.from('projects').insert({
                id: providedId,
                name: project.name,
                status: project.status || 'Draft',
                user_id: user.id,
                tenant_id: currentTenantId,
                data: dataToSave,
                theme: project.theme,
                brand_identity: project.brandIdentity || initialData.brandIdentity,
                component_order: normalizedComponentOrder,
                section_visibility: normalizedSectionVisibility,
                pages: project.pages || null,
                thumbnail_url: project.thumbnailUrl || null,
                last_updated: dataToSave.lastUpdated,
                ...(projectMenus.length > 0 && { menus: projectMenus }),
                ...(aiAssistantConfigToSave && { ai_assistant_config: aiAssistantConfigToSave }),
            });
            if (insertErr) throw insertErr;
            finalId = providedId;
        } else {
            const { data: docRef, error: insertErr } = await supabase.from('projects').insert({
                name: project.name,
                status: project.status || 'Draft',
                user_id: user.id,
                tenant_id: currentTenantId,
                data: dataToSave,
                theme: project.theme,
                brand_identity: project.brandIdentity || initialData.brandIdentity,
                component_order: normalizedComponentOrder,
                section_visibility: normalizedSectionVisibility,
                pages: project.pages || null,
                thumbnail_url: project.thumbnailUrl || null,
                last_updated: dataToSave.lastUpdated,
                ...(projectMenus.length > 0 && { menus: projectMenus }),
                ...(aiAssistantConfigToSave && { ai_assistant_config: aiAssistantConfigToSave }),
            }).select().single();
            if (insertErr) throw insertErr;
            finalId = docRef.id;
        }

        const newProject = normalizeProject({
            ...project,
            componentOrder: normalizedComponentOrder,
            sectionVisibility: normalizedSectionVisibility,
            id: finalId,
        });
        setProjects(prev => {
            if (prev.some(p => p.id === newProject.id)) return prev;
            return [newProject, ...prev];
        });
        
        return finalId;
    };

    // Delete project (soft-delete: marks with deletedAt instead of removing)
    const deleteProject = async (projectId: string) => {
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';
        const { data: projectRow, error: projectDataError } = await supabase
            .from('projects')
            .select('data')
            .eq('id', projectId)
            .single();

        if (projectDataError) {
            console.error('[ProjectContext] Could not load project payload before delete:', projectDataError);
            throw projectDataError;
        }

        const projectData = isPlainRecord(projectRow?.data) ? projectRow.data : {};

        if (isTemplate) {
            await supabase.from('projects').update({
                data: { ...projectData, isDeleted: true },
                is_deleted: true,
            }).eq('id', projectId);

            deletedTemplateIdsRef.current.add(projectId);
            localStorage.setItem('deletedTemplateIds', JSON.stringify(Array.from(deletedTemplateIdsRef.current)));
        } else {
            const deletedAt = new Date().toISOString();
            // Soft-delete: set deletedAt timestamp instead of deleting
            await supabase.from('projects').update({
                data: { ...projectData, deletedAt, deletedBy: user.id },
                deleted_at: deletedAt,
                deleted_by: user.id,
                is_deleted: true,
            }).eq('id', projectId);
            
            // Move to deleted projects list
            setDeletedProjects(prev => [{ ...project, deletedAt, deletedBy: user.id, isDeleted: true } as any, ...prev]);
        }

        setProjects(prev => prev.filter(p => p.id !== projectId));

        if (activeProjectId === projectId) {
            setActiveProjectId(null);
            setData(null);
        }
    };

    // Restore project from trash (removes deletedAt/deletedBy)
    const restoreFromTrash = async (projectId: string) => {
        if (!user) return;

        const project = deletedProjects.find(p => p.id === projectId);
        if (!project) return;

        const { data: projectRow, error: projectDataError } = await supabase
            .from('projects')
            .select('data')
            .eq('id', projectId)
            .single();

        if (projectDataError) {
            console.error('[ProjectContext] Could not load project payload before restore:', projectDataError);
            throw projectDataError;
        }

        const updatedData = { ...(isPlainRecord(projectRow?.data) ? projectRow.data : {}) };
        if ('deletedAt' in updatedData) delete (updatedData as any).deletedAt;
        if ('deletedBy' in updatedData) delete (updatedData as any).deletedBy;

        await supabase.from('projects').update({
            data: updatedData,
            deleted_at: null,
            deleted_by: null,
            is_deleted: false,
        }).eq('id', projectId);

        // Move back to active projects
        setDeletedProjects(prev => prev.filter(p => p.id !== projectId));
        setProjects(prev => [{ ...project, data: updatedData, deletedAt: undefined, deletedBy: undefined, isDeleted: false } as Project, ...prev]);
    };

    // Permanently delete a project (hard delete from Supabase)
    const permanentlyDelete = async (projectId: string) => {
        if (!user) return;

        const project = deletedProjects.find(p => p.id === projectId);
        if (!project) return;

        await supabase.from('projects').delete().eq('id', projectId);

        setDeletedProjects(prev => prev.filter(p => p.id !== projectId));
    };

    // Restore project from an automatic backup (calls Supabase Edge Function)
    const restoreFromBackup = async (backupId: string) => {
        try {
            const { supabase } = await import('../../supabase');
            const result = await supabase.functions.invoke('onboarding-api', {
                body: { action: 'restoreProjectFromBackup', backupId }
            });

            if (result.error) throw result.error;
            const response = result.data?.data || result.data;

            if (response?.success) {
                // Refresh projects to pick up the restored project
                await refreshProjects();
            } else {
                throw new Error(response?.message || 'Restore failed');
            }
        } catch (error) {
            console.error('[ProjectContext] Error restoring from backup:', error);
            throw error;
        }
    };

    // Create project from template (with limit check)
    const createProjectFromTemplate = async (templateId: string, newName?: string) => {
        if (!user) {
            throw new Error("User not authenticated");
        }

        // Count current user projects (excluding templates)
        const userProjects = projects.filter(p => p.status !== 'Template');
        const currentProjectCount = userProjects.length;

        // Owner and Super Admin are the only roles that bypass resource limits.
        const isOwner = hasPlatformUnlimitedLimits;
        // Note: loadingAuth guard removed - by the time a user is on the dashboard, auth is loaded
        const projectLimit = isFinitePlanLimit(maxProjects) ? maxProjects : 0;
        if (!isOwner && currentProjectCount >= projectLimit) {
            // Show upgrade modal if available
            if (upgradeContext) {
                upgradeContext.showProjectsUpgrade(currentProjectCount, projectLimit);
            }
            throw new Error(`Has alcanzado el límite de ${projectLimit} proyectos. Actualiza tu plan para crear más.`);
        }

        const templateSummary = projects.find(p => p.id === templateId);
        if (!templateSummary) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const template = await loadFullProjectFromSupabase(templateId);

        const now = new Date().toISOString();
        const templateMenus = template.menus ? cloneProjectValue(template.menus) : [];
        const templateComponentOrder =
            normalizeProjectComponentOrder(template.componentOrder || initialData.componentOrder as PageSection[]) ||
            (initialData.componentOrder as PageSection[]);
        const templateSectionVisibility = templateComponentOrder.reduce((acc, section) => {
            acc[section] = template.sectionVisibility?.[section] ?? true;
            return acc;
        }, { ...(template.sectionVisibility || {}) } as Record<PageSection, boolean>);
        const newProject: Omit<Project, 'id'> = {
            name: newName || `${template.name} Copy`,
            data: cloneProjectValue(template.data),
            theme: cloneProjectValue(template.theme),
            brandIdentity: template.brandIdentity ? cloneProjectValue(template.brandIdentity) : initialData.brandIdentity,
            componentOrder: cloneProjectValue(templateComponentOrder),
            sectionVisibility: cloneProjectValue(templateSectionVisibility),
            pages: template.pages ? cloneProjectValue(template.pages) : undefined,
            menus: templateMenus.length > 0 ? templateMenus : undefined,
            sourceTemplateId: templateId,
            thumbnailUrl: template.thumbnailUrl,
            faviconUrl: template.faviconUrl,
            status: 'Draft',
            createdAt: now,
            lastUpdated: now,
        };

        try {
            // Resolve the user's primary tenant so the new project is correctly scoped.
            // Falls back to null for legacy "personal" workspace if no membership exists.
            let resolvedTenantId: string | null = currentTenantId || null;
            if (!resolvedTenantId && user?.id) {
                const { data: memberRow } = await supabase
                    .from('tenant_members')
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .limit(1)
                    .maybeSingle();
                if (memberRow?.tenant_id) {
                    resolvedTenantId = memberRow.tenant_id;
                }
            }

            const { data: docRef, error: insertErr } = await supabase.from('projects').insert({
                name: newProject.name,
                status: 'Draft',
                user_id: user.id,
                tenant_id: resolvedTenantId,
                data: newProject,
                ...(templateMenus.length > 0 && { menus: templateMenus }),
            }).select().single();
            
            if (insertErr) throw insertErr;

            const templateImageUrls = extractProjectImageUrls(template);

            if (templateImageUrls.length > 0) {
                const libraryTenantId = resolvedTenantId || user.id;
                const fileRecords = templateImageUrls.map((downloadURL, index) => ({
                    tenant_id: libraryTenantId,
                    project_id: docRef.id,
                    name: getImageNameFromUrl(downloadURL, index),
                    type: inferImageType(downloadURL),
                    size: 0,
                    url: downloadURL,
                    metadata: {
                        storagePath: '',
                        sourceTemplateId: templateId,
                        importedFromTemplate: true,
                        notes: 'Imported from template',
                    },
                    created_at: now,
                }));

                const { error: filesInsertErr } = await supabase.from('files').insert(fileRecords);
                if (filesInsertErr) throw filesInsertErr;
            }

            const createdProject = { ...newProject, id: docRef.id } as Project;
            setProjects(prev => {
                if (prev.some(p => p.id === createdProject.id)) return prev;
                return [createdProject, ...prev];
            });
            loadProject(docRef.id, false, true, createdProject);
        } catch (error: any) {
            console.error("Error creating project from template:", error);
            if (error.code === 'permission-denied') {
                throw new Error("No tienes permiso para crear proyectos. Verifica tus permisos.");
            }
            throw error;
        }
    };

    // Export as HTML
    const exportProjectAsHtml = () => {
        if (!activeProject) return;
        downloadProjectAsHtml(activeProject);
    };

    // Update project thumbnail
    const updateProjectThumbnail = async (projectId: string, file: File) => {
        console.log('[ProjectContext] updateProjectThumbnail called for projectId:', projectId);

        if (!user) {
            console.error('[ProjectContext] No user, cannot update thumbnail');
            return;
        }

        const project = projects.find(p => p.id === projectId);
        console.log('[ProjectContext] Found project in state:', project?.name, 'status:', project?.status);

        // Check if it's a template by looking in templates collection directly if not found in projects
        const isTemplate = project?.status === 'Template' || !project;
        console.log('[ProjectContext] isTemplate:', isTemplate);

        const storagePath = isTemplate
            ? `templates/${projectId}/thumbnail.png`
            : `${getProjectStoragePath(user.id, projectId, currentTenantId)}/thumbnail.png`;

        console.log('[ProjectContext] Uploading to storage path:', storagePath);
        
        const { publicUrl } = await uploadPlatformAsset(storagePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
        });

        const downloadURL = publicUrl;
        console.log('[ProjectContext] Got download URL:', downloadURL);

        // Templates use 'thumbnailUrl', regular projects use 'thumbnailUrl'
        const updateField = 'thumbnailUrl';
        const updateData = {
            [updateField]: downloadURL,
            lastUpdated: new Date().toISOString()
        };

        const projectData = project?.data || {};

        await supabase.from('projects').update({
            data: { ...projectData, ...updateData }
        }).eq('id', projectId);

        console.log('[ProjectContext] Supabase updated successfully with field:', updateField);

        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, thumbnailUrl: downloadURL, lastUpdated: updateData.lastUpdated } : p
        ));
    };

    // Update project favicon
    const updateProjectFavicon = async (projectId: string, file: File) => {
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';
        const storagePath = isTemplate
            ? `templates/${projectId}/favicon.ico`
            : `${getProjectStoragePath(user.id, projectId, currentTenantId)}/favicon.ico`;

        const { publicUrl } = await uploadPlatformAsset(storagePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
        });

        const downloadURL = publicUrl;

        const projectData = project.data || {};

        await supabase.from('projects').update({
            data: { ...projectData, faviconUrl: downloadURL }
        }).eq('id', projectId);

        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, faviconUrl: downloadURL } : p
        ));
    };

    // Template Management
    const exitTemplateEditor = () => {
        setIsEditingTemplate(false);
        setActiveProjectId(null);
        setData(null);
    };

    const createNewTemplate = async () => {
        if (!user) return;

        const now = new Date().toISOString();
        const newTemplate: Omit<Project, 'id'> = {
            name: 'New Template',
            data: initialData.data,
            theme: initialData.theme,
            brandIdentity: initialData.brandIdentity,
            componentOrder: initialData.componentOrder as PageSection[],
            sectionVisibility: initialData.sectionVisibility as Record<PageSection, boolean>,
            status: 'Template',
            thumbnailUrl: undefined,
            faviconUrl: undefined,
            createdAt: now,
            lastUpdated: now,
        };

        const { data: docRef, error: insertErr } = await supabase.from('projects').insert({
            name: newTemplate.name,
            status: 'Template',
            user_id: user?.id,
            tenant_id: currentTenantId,
            data: newTemplate
        }).select().single();

        if (insertErr) throw insertErr;

        const createdTemplate = { ...newTemplate, id: docRef.id } as Project;
        setProjects(prev => [createdTemplate, ...prev]);
        loadProject(docRef.id, true, true);
    };

    const archiveTemplate = async (templateId: string, isArchived: boolean) => {
        const { data: templateRow, error: templateError } = await supabase
            .from('projects')
            .select('data')
            .eq('id', templateId)
            .single();

        if (templateError) throw templateError;

        const updatedData = { ...(isPlainRecord(templateRow?.data) ? templateRow.data : {}), isArchived };
        await supabase.from('projects').update({
            data: updatedData,
            is_archived: isArchived,
        }).eq('id', templateId);

        setProjects(prev => prev.map(p =>
            p.id === templateId ? { ...p, isArchived } : p
        ));
    };

    const duplicateTemplate = async (templateId: string) => {
        const templateSummary = projects.find(p => p.id === templateId);
        if (!templateSummary) return;
        const template = await loadFullProjectFromSupabase(templateId);

        const now = new Date().toISOString();
        const { id, ...templateData } = template;
        const newTemplate: Omit<Project, 'id'> = {
            ...templateData,
            name: `${template.name} (Copy)`,
            createdAt: now,
            lastUpdated: now,
        };

        const { data: docRef, error: insertErr } = await supabase.from('projects').insert({
            name: newTemplate.name,
            status: 'Template',
            user_id: user?.id,
            tenant_id: currentTenantId,
            data: newTemplate
        }).select().single();

        if (insertErr) throw insertErr;

        const createdTemplate = { ...newTemplate, id: docRef.id } as Project;
        setProjects(prev => [createdTemplate, ...prev]);
    };

    const updateTemplateInState = (templateId: string, updates: Partial<Project>) => {
        setProjects(prev => prev.map(p =>
            p.id === templateId ? { ...p, ...updates } : p
        ));
    };

    const refreshProjects = async () => {
        if (user) {
            await loadUserProjects(user.id, currentTenantId);
        }
    };

    // ==========================================================================
    // MULTI-PAGE FUNCTIONS
    // ==========================================================================

    /**
     * Set the active page by ID
     */
    const setActivePage = useCallback((pageId: string | null) => {
        // Simply set the active page ID. The derived `activePage` (line 258:
        // pages.find(p => p.id === activePageId)) will resolve on the next
        // render after any pending setPages() updates have been applied.
        //
        // IMPORTANT: Do NOT look up the page in `pages` here — that causes
        // a stale-closure race when addPage() and setActivePage() are called
        // back-to-back, because setPages() hasn't re-rendered yet and `pages`
        // still holds the old array.
        //
        // We also do NOT merge page.sectionData into the global `data` state.
        // The global data already contains all section data from the project.
        // Merging page-specific defaults would overwrite user customizations.
        setActivePageId(pageId);
    }, []);

    /**
     * Add a new page to the project
     */
    const addPage = useCallback(async (pageInput: Partial<SitePage> | PageTemplateId): Promise<string> => {
        let newPage: SitePage;

        if (typeof pageInput === 'string') {
            // It's a PageTemplateId, create from template
            newPage = createPageFromTemplate(pageInput as PageTemplateId, activeProject?.name);
        } else {
            // It's a partial page object
            const now = new Date().toISOString();
            newPage = {
                id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: pageInput.title || 'Nueva Página',
                slug: pageInput.slug || `/pagina-${Date.now()}`,
                type: pageInput.type || 'static',
                sections: pageInput.sections || ['header', 'hero', 'footer'],
                sectionData: pageInput.sectionData || {},
                seo: pageInput.seo || { title: pageInput.title || 'Nueva Página' },
                showInNavigation: pageInput.showInNavigation ?? true,
                navigationOrder: pageInput.navigationOrder ?? (pages.length * 10),
                createdAt: now,
                updatedAt: now,
                ...pageInput,
            } as SitePage;
        }

        const nextPages = [...pages, newPage];
        setPages(nextPages);
        syncWebsiteBlueprint({
            action: 'page_change',
            pages: nextPages,
        });
        return newPage.id;
    }, [pages, activeProject, syncWebsiteBlueprint]);

    /**
     * Update an existing page
     */
    const updatePage = useCallback(async (pageId: string, updates: Partial<SitePage>): Promise<void> => {
        const nextPages = pages.map(p =>
            p.id === pageId
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p
        );
        setPages(nextPages);

        // If this is the active page, also update the legacy state
        let nextData = data;
        let nextComponentOrder = componentOrder;
        if (pageId === activePageId) {
            if (updates.sectionData) {
                nextData = data ? { ...data, ...updates.sectionData } : updates.sectionData as PageData;
                setData(nextData);
            }
            if (updates.sections) {
                nextComponentOrder = updates.sections;
                setComponentOrder(updates.sections);
            }
        }

        syncWebsiteBlueprint({
            action: 'page_change',
            data: nextData,
            componentOrder: nextComponentOrder,
            pages: nextPages,
            touchedSection: updates.sections?.[0],
        });
    }, [pages, activePageId, data, componentOrder, syncWebsiteBlueprint]);

    /**
     * Delete a page
     */
    const deletePage = useCallback(async (pageId: string): Promise<void> => {
        const page = pages.find(p => p.id === pageId);
        if (!page) return;

        // Don't allow deleting the home page
        if (page.isHomePage) {
            throw new Error('No se puede eliminar la página de inicio');
        }

        const nextPages = pages.filter(p => p.id !== pageId);
        setPages(nextPages);
        syncWebsiteBlueprint({
            action: 'page_change',
            pages: nextPages,
        });

        // If this was the active page, switch to home page
        if (pageId === activePageId) {
            const homePage = pages.find(p => p.isHomePage);
            setActivePageId(homePage?.id || null);
        }
    }, [pages, activePageId, syncWebsiteBlueprint]);

    /**
     * Reorder pages
     */
    const reorderPages = useCallback(async (pageIds: string[]): Promise<void> => {
        const reordered = pageIds
            .map((id, index) => {
                const page = pages.find(p => p.id === id);
                if (page) {
                    return { ...page, navigationOrder: index * 10 };
                }
                return null;
            })
            .filter(Boolean) as SitePage[];

        // Add any pages that weren't in the pageIds array
        const remaining = pages.filter(p => !pageIds.includes(p.id));
        const nextPages = [...reordered, ...remaining];
        setPages(nextPages);
        syncWebsiteBlueprint({
            action: 'page_change',
            pages: nextPages,
        });
    }, [pages, syncWebsiteBlueprint]);

    /**
     * Duplicate a page
     */
    const duplicatePage = useCallback(async (pageId: string): Promise<string> => {
        const page = pages.find(p => p.id === pageId);
        if (!page) {
            throw new Error('Página no encontrada');
        }

        const now = new Date().toISOString();
        const newPage: SitePage = {
            ...page,
            id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `${page.title} (Copia)`,
            slug: `${page.slug}-copia`,
            isHomePage: false, // Can't duplicate as home page
            createdAt: now,
            updatedAt: now,
        };

        const nextPages = [...pages, newPage];
        setPages(nextPages);
        syncWebsiteBlueprint({
            action: 'page_change',
            pages: nextPages,
        });
        return newPage.id;
    }, [pages, syncWebsiteBlueprint]);

    /**
     * Get page by slug (for routing)
     */
    const getPageBySlug = useCallback((slug: string): SitePage | null => {
        // First try exact match
        const exactMatch = pages.find(p => p.slug === slug);
        if (exactMatch) return exactMatch;

        // Try matching dynamic routes (e.g., /producto/:slug -> /producto/shoes)
        for (const page of pages) {
            if (page.slug.includes(':')) {
                const pattern = page.slug.replace(/:[^/]+/g, '[^/]+');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(slug)) {
                    return page;
                }
            }
        }

        return null;
    }, [pages]);

    /**
     * Migrate legacy project to multi-page architecture
     */
    const migrateToMultiPage = useCallback(async (): Promise<void> => {
        if (!activeProject || !data) return;

        // Create default pages with current project data
        const defaultPages = createDefaultPages({
            businessName: activeProject.name,
            hasEcommerce: componentOrder.some(s =>
                ['products', 'featuredProducts', 'categoryGrid', 'storeSettings'].includes(s)
            ),
        });

        // Update the home page with current data
        const homePage = defaultPages.find(p => p.isHomePage);
        if (homePage) {
            homePage.sections = componentOrder.filter(s =>
                !['colors', 'typography'].includes(s) && sectionVisibility[s]
            );
            homePage.sectionData = data;
        }

        setPages(defaultPages);

        // Set home page as active
        if (homePage) {
            setActivePageId(homePage.id);
        }
    }, [activeProject, data, componentOrder, sectionVisibility]);

    // Update AI config in-memory only (prevents auto-save from overwriting fresh Supabase data)
    const updateProjectAiConfig = useCallback((projectId: string, config: any) => {
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, aiAssistantConfig: config } : p
        ));
    }, []);

    const updateProjectMediaBlueprint = useCallback(async (projectId: string, mediaBlueprint: MediaBlueprint) => {
        if (!user) throw new Error('User not authenticated');

        const now = new Date().toISOString();
        const project = projectsRef.current.find(p => p.id === projectId);

        const { data: row, error: fetchError } = await supabase
            .from('projects')
            .select('data')
            .eq('id', projectId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentProjectData = isPlainRecord(row?.data)
            ? row.data as Record<string, unknown>
            : isPlainRecord(project?.data)
                ? project?.data as unknown as Record<string, unknown>
                : {};
        const nestedPageData = isPlainRecord((currentProjectData as any).data)
            ? (currentProjectData as any).data as Record<string, unknown>
            : null;
        const currentBlueprint = (
            isPlainRecord((currentProjectData as any).businessBlueprint)
                ? (currentProjectData as any).businessBlueprint
                : nestedPageData && isPlainRecord((nestedPageData as any).businessBlueprint)
                    ? (nestedPageData as any).businessBlueprint
                    : resolveProjectBusinessBlueprint(project)
        ) as Project['businessBlueprint'] | undefined;
        const nextBusinessBlueprint = currentBlueprint
            ? {
                ...currentBlueprint,
                mediaBlueprint,
                updatedAt: now,
                lastSyncedAt: now,
            }
            : undefined;
        const nextNestedPageData = nestedPageData
            ? {
                ...nestedPageData,
                mediaBlueprint,
                ...(nextBusinessBlueprint && (nestedPageData as any).businessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
            }
            : null;
        const nextProjectData = removeUndefinedValues(sanitizeForStorage({
            ...currentProjectData,
            mediaBlueprint,
            ...(nextBusinessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
            ...(nextNestedPageData ? { data: nextNestedPageData } : {}),
        })) as Record<string, unknown>;
        const manualCheckpoint = createSnapshotBeforeManualSave(currentProjectData, {
            projectId,
            scope: 'module',
            moduleKey: 'mediaBlueprint',
            now,
            metadata: {
                tenantId: currentTenantId || null,
                userId: user.id,
                createdBy: user.id,
                actionType: 'content_studio_media_blueprint_save',
                module: 'media',
                source: 'content-studio',
                projectName: project?.name,
                summary: 'Captured mediaBlueprint before Content Studio updated it.',
            },
            nextProjectData,
        });
        const dataToPersist = manualCheckpoint.skipped ? nextProjectData : manualCheckpoint.nextProjectData;

        const { error } = await supabase
            .from('projects')
            .update({
                data: dataToPersist,
                last_updated: now,
            })
            .eq('id', projectId);

        if (error) throw error;

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                data: dataToPersist as unknown as PageData,
                businessBlueprint: (nextBusinessBlueprint || p.businessBlueprint) as Project['businessBlueprint'],
                lastUpdated: now,
            } as Project;
        }));
    }, [currentTenantId, user]);

    const updateProjectSeoConfig = useCallback(async (projectId: string, config: SEOConfig) => {
        const { error } = await supabase
            .from('projects')
            .update({ seo_config: config, last_updated: new Date().toISOString() })
            .eq('id', projectId);

        if (error) throw error;

        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, seoConfig: config, lastUpdated: new Date().toISOString() } : p
        ));
    }, []);

    const value: ProjectContextType = {
        // Project State
        projects,
        isLoadingProjects,
        activeProjectId,
        activeProject,

        // Legacy single-page data
        data,
        setData,
        theme,
        setTheme,
        brandIdentity,
        setBrandIdentity,
        componentOrder,
        setComponentOrder,
        sectionVisibility,
        setSectionVisibility,

        // Multi-page architecture
        pages,
        setPages,
        activePage,
        setActivePage,
        addPage,
        updatePage,
        deletePage,
        reorderPages,
        duplicatePage,
        getPageBySlug,
        isMultiPage,
        migrateToMultiPage,

        // Project Operations
        loadProject,
        syncWebsiteBlueprint,
        saveProject,
        publishProject,
        getProjectSnapshot,
        renameActiveProject,
        addNewProject,
        deleteProject,
        createProjectFromTemplate,
        exportProjectAsHtml,

        // Trash & Backup Recovery
        deletedProjects,
        restoreFromTrash,
        permanentlyDelete,
        restoreFromBackup,
        updateProjectThumbnail,
        updateProjectFavicon,

        // Template Management
        isEditingTemplate,
        exitTemplateEditor,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
        updateTemplateInState,

        // In-memory AI config update (prevents auto-save overwrite)
        updateProjectAiConfig,
        updateProjectMediaBlueprint,
        updateProjectSeoConfig,

        // Refresh
        refreshProjects,

        // Undo support
        pushProjectUndoAction,
        getCurrentProjectState,
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

export const useSafeProject = (): ProjectContextType | null => {
    return useContext(ProjectContext) || null;
};
