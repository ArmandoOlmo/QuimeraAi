/**
 * ProjectContext
 * Maneja proyectos, templates y exportación
 * Soporta multi-tenant: usa /tenants/{tenantId}/projects cuando hay tenant activo
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Project, PageData, ThemeData, PageSection, BrandIdentity, SitePage } from '../../types';
import { initialData } from '../../data/initialData';
import { createDefaultPages, createPageFromTemplate } from '../../data/defaultPages';
import { PageTemplateId } from '../../types/onboarding';
import {
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy,
    addDoc,
    serverTimestamp,
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { router } from '../../hooks/useRouter';
import { useSafeTenant } from '../tenant';
import { useSafeUpgrade } from '../UpgradeContext';
import { useSafeAdmin } from '../admin';

// Helper to get the correct projects collection path
// Returns tenant path if tenantId provided (and not a personal tenant), otherwise user path
const getProjectsCollectionPath = (userId: string, tenantId?: string | null): string[] => {
    // Personal tenants (format: tenant_{userId}) should use user path
    const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);

    if (tenantId && !isPersonalTenant) {
        return ['tenants', tenantId, 'projects'];
    }
    return ['users', userId, 'projects'];
};

// Helper to get storage path for project assets
const getProjectStoragePath = (userId: string, projectId: string, tenantId?: string | null): string => {
    if (tenantId) {
        return `tenants/${tenantId}/projects/${projectId}`;
    }
    return `users/${userId}/projects/${projectId}`;
};

// Helper to generate HTML export
const generateHtml = (project: Project) => {
    const googleFonts = [project.theme.fontFamilyHeader, project.theme.fontFamilyBody, project.theme.fontFamilyButton]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map(font => {
            const f = font.replace(/\s/g, '+');
            return `family=${f}`;
        })
        .join('&');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?${googleFonts}&display=swap" rel="stylesheet">
    <style>
        body { font-family: '${project.theme.fontFamilyBody}', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: '${project.theme.fontFamilyHeader}', sans-serif; }
        button, a, input[type="submit"] { font-family: '${project.theme.fontFamilyButton}', sans-serif; }
    </style>
</head>
<body>
    <div id="root">
        <h1>${project.data.hero.headline.replace(/<.*?>/g, '')}</h1>
        <p>This is a simplified HTML export. The full page content would be rendered here.</p>
    </div>
</body>
</html>`;
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

    // Template Management
    isEditingTemplate: boolean;
    exitTemplateEditor: () => void;
    createNewTemplate: () => Promise<void>;
    archiveTemplate: (templateId: string, isArchived: boolean) => Promise<void>;
    duplicateTemplate: (templateId: string) => Promise<void>;
    updateTemplateInState: (templateId: string, updates: Partial<Project>) => void;

    // Refresh
    refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, userDocument, loadingAuth } = useAuth();
    const tenantContext = useSafeTenant();
    const upgradeContext = useSafeUpgrade();
    const adminContext = useSafeAdmin();

    // Get current tenant ID (null if not using multi-tenant or no tenant selected)
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // Get project limits from tenant
    const maxProjects = tenantContext?.currentTenant?.limits?.maxProjects || 1;

    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
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

    // Load templates from Firestore
    const loadGlobalTemplates = async (): Promise<{ templates: Project[], deletedIds: Set<string> }> => {
        try {
            const templatesCol = collection(db, 'templates');
            const q = query(templatesCol, orderBy('lastUpdated', 'desc'));
            const templateSnapshot = await getDocs(q);

            const deletedIds = new Set<string>();
            const activeTemplates: Project[] = [];

            templateSnapshot.docs.forEach(docSnap => {
                const docData = docSnap.data();
                if (docData.isDeleted === true) {
                    deletedIds.add(docSnap.id);
                } else {
                    activeTemplates.push({
                        id: docSnap.id,
                        ...docData,
                        status: 'Template' as const
                    } as Project);
                }
            });

            if (deletedIds.size > 0) {
                deletedIds.forEach(id => deletedTemplateIdsRef.current.add(id));
                localStorage.setItem('deletedTemplateIds', JSON.stringify([...deletedTemplateIdsRef.current]));
            }

            return { templates: activeTemplates, deletedIds };
        } catch (error) {
            console.error("Error loading templates:", error);
            return { templates: [], deletedIds: deletedTemplateIdsRef.current };
        }
    };

    // Load user/tenant projects
    const loadUserProjects = useCallback(async (userId: string, tenantId?: string | null) => {
        setIsLoadingProjects(true);
        try {
            let allUserProjects: Project[] = [];

            // Check if this is a personal tenant (format: tenant_{userId})
            const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);

            // Always load from user's personal path first
            try {
                const userPathSegments = ['users', userId, 'projects'];
                const userProjectsCol = collection(db, ...userPathSegments);
                const userQuery = query(userProjectsCol, orderBy('lastUpdated', 'desc'));
                const userSnapshot = await getDocs(userQuery);
                const personalProjects = userSnapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                } as Project));
                allUserProjects = [...personalProjects];
            } catch (err) {
                console.warn("Could not load personal projects:", err);
            }

            // If there's a tenant (and it's not personal), also load from tenant path
            if (tenantId && !isPersonalTenant) {
                try {
                    const tenantPathSegments = ['tenants', tenantId, 'projects'];
                    const tenantProjectsCol = collection(db, ...tenantPathSegments);
                    const tenantQuery = query(tenantProjectsCol, orderBy('lastUpdated', 'desc'));
                    const tenantSnapshot = await getDocs(tenantQuery);
                    const tenantProjects = tenantSnapshot.docs.map(docSnap => ({
                        id: docSnap.id,
                        ...docSnap.data()
                    } as Project));
                    allUserProjects = [...allUserProjects, ...tenantProjects];
                } catch (err) {
                    console.warn("Could not load tenant projects:", err);
                }
            }

            // Remove duplicates by ID (in case same project exists in both)
            const uniqueProjects = allUserProjects.filter((project, index, self) =>
                index === self.findIndex(p => p.id === project.id)
            );

            // Sort by lastUpdated
            uniqueProjects.sort((a, b) => {
                const dateA = new Date(a.lastUpdated || 0).getTime();
                const dateB = new Date(b.lastUpdated || 0).getTime();
                return dateB - dateA;
            });

            const { templates: firestoreTemplates } = await loadGlobalTemplates();
            setProjects([...firestoreTemplates, ...uniqueProjects]);
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
            loadUserProjects(user.uid, currentTenantId);
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
                if (storedProject && !data) {
                    // Project exists and we don't have data loaded - restore it
                    console.log('[ProjectContext] Restoring project from localStorage:', storedProject.name);
                    setData(storedProject.data);
                    setTheme(storedProject.theme);
                    setBrandIdentity(storedProject.brandIdentity || initialData.brandIdentity);
                    setComponentOrder(storedProject.componentOrder || initialData.componentOrder as PageSection[]);
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

        // If project not found locally, try to load it from Firebase
        if (!project && user) {
            console.log('[ProjectContext] Project not in state, attempting to load from Firebase...');
            try {
                // Try loading from user's projects
                const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                const projectRef = doc(db, ...pathSegments, projectId);
                const projectSnap = await getDoc(projectRef);

                if (projectSnap.exists()) {
                    project = { id: projectSnap.id, ...projectSnap.data() } as Project;
                    console.log('[ProjectContext] Loaded project from Firebase:', project.name);
                    // Add to local state
                    setProjects(prev => {
                        if (prev.find(p => p.id === projectId)) return prev;
                        return [project!, ...prev];
                    });
                } else {
                    // Try loading from templates
                    const templateRef = doc(db, 'templates', projectId);
                    const templateSnap = await getDoc(templateRef);
                    if (templateSnap.exists()) {
                        project = { id: templateSnap.id, ...templateSnap.data() } as Project;
                        console.log('[ProjectContext] Loaded template from Firebase:', project.name);
                        setProjects(prev => {
                            if (prev.find(p => p.id === projectId)) return prev;
                            return [project!, ...prev];
                        });
                    }
                }
            } catch (error) {
                console.error('[ProjectContext] Error loading project from Firebase:', error);
            }
        }

        if (!project) {
            console.error("[ProjectContext] Project not found:", projectId);
            console.error("[ProjectContext] Available project IDs:", projectsRef.current.map(p => p.id));
            return;
        }

        // If using projectOverride, add it to projects list if not already there
        if (projectOverride && !projectsRef.current.find(p => p.id === projectId)) {
            console.log('[ProjectContext] Adding projectOverride to projects list');
            setProjects(prev => [projectOverride, ...prev]);
        }

        console.log('[ProjectContext] Loading project:', project.name);

        setActiveProjectId(projectId);
        setData(project.data);
        setTheme(project.theme);
        setBrandIdentity(project.brandIdentity || initialData.brandIdentity);
        setComponentOrder(project.componentOrder || initialData.componentOrder as PageSection[]);
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

        isInitialLoadRef.current = true;
        setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 1000);

        if (navigateToEditor) {
            router.navigate(`/editor/${projectId}`);
        }
    }, [user, currentTenantId]);

    // Helper to remove undefined values (Firestore doesn't accept undefined)
    const removeUndefinedValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
        const result: Partial<T> = {};
        for (const key of Object.keys(obj) as (keyof T)[]) {
            if (obj[key] !== undefined) {
                result[key] = obj[key];
            }
        }
        return result;
    };

    // Save current project - saves ALL fields to ensure consistency
    const saveProject = useCallback(async () => {
        if (!user || !activeProjectId || !data) return;

        const project = projectsRef.current.find(p => p.id === activeProjectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';
        const now = new Date().toISOString();

        // Save ALL project fields to ensure Firestore stays in sync with editor
        // Use removeUndefinedValues to filter out undefined (Firestore doesn't accept undefined)
        const updatedProject = removeUndefinedValues({
            // Core page data (from React state)
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            lastUpdated: now,

            // Multi-page architecture
            ...(pages.length > 0 && { pages }),

            // NOTE: Navigation menus are managed by CMSContext directly
            // DO NOT include them here to avoid overwriting CMSContext changes
            // The menus are saved/loaded via CMSContext.saveMenu/loadMenus

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
            ...(project.thumbnailUrl && { thumbnailUrl: project.thumbnailUrl }),

            // A/B Testing (only include if exists)
            ...(project.abTests && { abTests: project.abTests }),
        });

        try {
            if (isTemplate) {
                const templateRef = doc(db, 'templates', activeProjectId);
                await updateDoc(templateRef, updatedProject);
            } else {
                const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                const projectRef = doc(db, ...pathSegments, activeProjectId);
                await updateDoc(projectRef, updatedProject);
            }

            setProjects(prev => prev.map(p =>
                p.id === activeProjectId ? { ...p, ...updatedProject } as Project : p
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

        // Return complete snapshot of current editor state
        // This includes ALL fields that should be published
        // All values must be defined (not undefined) for Firestore compatibility
        const snapshot: Partial<Project> = {
            id: activeProjectId,
            name: project.name,
            userId: project.userId || user.uid, // Fallback to current user

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
            lastUpdated: new Date().toISOString(),
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

            // CRITICAL: Fetch latest menus from Firebase to ensure we publish the most recent version
            // This fixes the sync issue where CMSContext saves menus but ProjectContext has stale data
            try {
                const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                const projectRef = doc(db, ...pathSegments, activeProjectId);
                const projectSnap = await getDoc(projectRef);

                if (projectSnap.exists()) {
                    const projectData = projectSnap.data();
                    if (projectData.menus && Array.isArray(projectData.menus)) {
                        snapshot.menus = projectData.menus;
                        console.log(`🔄 [ProjectContext] Fetched latest menus from Firebase: ${projectData.menus.length} menus`);
                    }
                }
            } catch (menuFetchError) {
                console.warn('[ProjectContext] Could not fetch latest menus, using snapshot data:', menuFetchError);
            }

            console.log(`📸 [ProjectContext] Using editor snapshot for project: ${snapshot.name}`);

            // Debug: Log hero data to verify it's correct
            console.log(`🔍 [ProjectContext] Hero data in snapshot:`, {
                heroVariant: snapshot.data?.hero?.heroVariant,
                headline: snapshot.data?.hero?.headline?.substring(0, 30),
                hasBackgroundImage: !!snapshot.data?.hero?.backgroundImage,
                imageUrl: snapshot.data?.hero?.imageUrl?.substring(0, 50),
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
            if (currentTenantId && currentTenantId.startsWith(`tenant_${user.uid}`)) {
                console.log('[ProjectContext] Detected personal tenant, setting targetTenantId to null for publishing');
                targetTenantId = null;
            }

            // Publish using the centralized service with the editor snapshot
            const result = await publishToService({
                userId: user.uid,
                projectId: activeProjectId,
                tenantId: targetTenantId || null,
                projectSnapshot: snapshot,
                saveDraftFirst: true, // Save to Firestore first, then publish
                includeEcommerce: true,
                includeCMS: true,
            });

            if (!result.success) {
                console.error('[ProjectContext] Publish failed:', result.error);
                return false;
            }

            console.log(`✅ [ProjectContext] Project published successfully at ${result.publishedAt}`);
            if (result.stats) {
                console.log(`   📦 Products: ${result.stats.productsPublished}`);
                console.log(`   📂 Categories: ${result.stats.categoriesPublished}`);
                console.log(`   📝 Posts: ${result.stats.postsPublished}`);
            }

            // AUTOMATIC DOMAIN SYNC (keep this for domain mapping updates)
            try {
                const domainsCol = collection(db, 'users', user.uid, 'domains');
                const domainsSnap = await getDocs(domainsCol);
                const projectDomains = domainsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(d => d.projectId === activeProjectId);

                if (projectDomains.length > 0) {
                    console.log(`📡 [ProjectContext] Syncing ${projectDomains.length} domains...`);

                    for (const domain of projectDomains) {
                        const normalizedDomain = domain.name.toLowerCase().trim().replace(/^www\./, '');

                        await setDoc(doc(db, 'customDomains', normalizedDomain), {
                            domain: normalizedDomain,
                            projectId: activeProjectId,
                            userId: user.uid,
                            status: 'active',
                            sslStatus: 'active',
                            dnsVerified: true,
                            cloudRunTarget: 'quimera-ssr-575386543550.us-central1.run.app',
                            updatedAt: new Date().toISOString()
                        }, { merge: true });
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

        autoSaveTimerRef.current = setTimeout(() => {
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

        const isTemplate = project.status === 'Template';
        const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
        const docRef = isTemplate
            ? doc(db, 'templates', activeProjectId)
            : doc(db, ...pathSegments, activeProjectId);

        await updateDoc(docRef, { name: newName });
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

        // Check project limit (-1 means unlimited, owner has no limits)
        const isOwner = userDocument?.role === 'owner';
        if (loadingAuth) return; // Wait for auth to be sure
        if (!isOwner && maxProjects !== -1 && currentProjectCount >= maxProjects) {
            // Show upgrade modal if available
            if (upgradeContext) {
                upgradeContext.showProjectsUpgrade(currentProjectCount, maxProjects);
            }
            throw new Error(`Has alcanzado el límite de ${maxProjects} proyectos. Actualiza tu plan para crear más.`);
        }

        const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
        const projectsCol = collection(db, ...pathSegments);
        const docRef = await addDoc(projectsCol, {
            ...project,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        });

        const newProject = { ...project, id: docRef.id };
        setProjects(prev => [newProject, ...prev]);
        return docRef.id;
    };

    // Delete project
    const deleteProject = async (projectId: string) => {
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';

        if (isTemplate) {
            const templateRef = doc(db, 'templates', projectId);
            await updateDoc(templateRef, { isDeleted: true });
            deletedTemplateIdsRef.current.add(projectId);
            localStorage.setItem('deletedTemplateIds', JSON.stringify([...deletedTemplateIdsRef.current]));
        } else {
            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
            await deleteDoc(doc(db, ...pathSegments, projectId));
        }

        setProjects(prev => prev.filter(p => p.id !== projectId));

        if (activeProjectId === projectId) {
            setActiveProjectId(null);
            setData(null);
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

        // Check project limit (-1 means unlimited, owner has no limits)
        const isOwner = userDocument?.role === 'owner';
        if (loadingAuth) return; // Wait for auth to be sure
        if (!isOwner && maxProjects !== -1 && currentProjectCount >= maxProjects) {
            // Show upgrade modal if available
            if (upgradeContext) {
                upgradeContext.showProjectsUpgrade(currentProjectCount, maxProjects);
            }
            throw new Error(`Has alcanzado el límite de ${maxProjects} proyectos. Actualiza tu plan para crear más.`);
        }

        const template = projects.find(p => p.id === templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const now = new Date().toISOString();
        const newProject: Omit<Project, 'id'> = {
            name: newName || `${template.name} Copy`,
            data: { ...template.data },
            theme: { ...template.theme },
            brandIdentity: template.brandIdentity ? { ...template.brandIdentity } : initialData.brandIdentity,
            componentOrder: [...(template.componentOrder || initialData.componentOrder as PageSection[])],
            sectionVisibility: { ...(template.sectionVisibility || initialData.sectionVisibility as Record<PageSection, boolean>) },
            status: 'Draft',
            createdAt: now,
            lastUpdated: now,
        };

        try {
            // Always save to user's personal path to avoid workspace permission issues
            const pathSegments = ['users', user.uid, 'projects'];
            const projectsCol = collection(db, ...pathSegments);
            const docRef = await addDoc(projectsCol, newProject);

            const createdProject = { ...newProject, id: docRef.id } as Project;
            setProjects(prev => [createdProject, ...prev]);
            loadProject(docRef.id, false, true);
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

        const html = generateHtml(activeProject);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeProject.name.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
            : `${getProjectStoragePath(user.uid, projectId, currentTenantId)}/thumbnail.png`;

        console.log('[ProjectContext] Uploading to storage path:', storagePath);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[ProjectContext] Got download URL:', downloadURL);

        const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
        const docRef = isTemplate
            ? doc(db, 'templates', projectId)
            : doc(db, ...pathSegments, projectId);

        console.log('[ProjectContext] Updating Firestore doc:', isTemplate ? `templates/${projectId}` : pathSegments.join('/') + '/' + projectId);

        // Templates use 'thumbnailUrl', regular projects use 'thumbnail'
        const updateField = isTemplate ? 'thumbnailUrl' : 'thumbnailUrl'; // Using thumbnailUrl for consistency
        const updateData = {
            [updateField]: downloadURL,
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(docRef, updateData);
        console.log('[ProjectContext] Firestore updated successfully with field:', updateField);

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
            : `${getProjectStoragePath(user.uid, projectId, currentTenantId)}/favicon.ico`;

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
        const docRef = isTemplate
            ? doc(db, 'templates', projectId)
            : doc(db, ...pathSegments, projectId);

        await updateDoc(docRef, { favicon: downloadURL });
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, favicon: downloadURL } : p
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
            createdAt: now,
            lastUpdated: now,
        };

        const templatesCol = collection(db, 'templates');
        const docRef = await addDoc(templatesCol, newTemplate);

        const createdTemplate = { ...newTemplate, id: docRef.id } as Project;
        setProjects(prev => [createdTemplate, ...prev]);
        loadProject(docRef.id, true, true);
    };

    const archiveTemplate = async (templateId: string, isArchived: boolean) => {
        const templateRef = doc(db, 'templates', templateId);
        await updateDoc(templateRef, { isArchived });
        setProjects(prev => prev.map(p =>
            p.id === templateId ? { ...p, isArchived } : p
        ));
    };

    const duplicateTemplate = async (templateId: string) => {
        const template = projects.find(p => p.id === templateId);
        if (!template) return;

        const now = new Date().toISOString();
        const newTemplate: Omit<Project, 'id'> = {
            ...template,
            name: `${template.name} (Copy)`,
            createdAt: now,
            lastUpdated: now,
        };

        const templatesCol = collection(db, 'templates');
        const docRef = await addDoc(templatesCol, newTemplate);

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
            await loadUserProjects(user.uid, currentTenantId);
        }
    };

    // ==========================================================================
    // MULTI-PAGE FUNCTIONS
    // ==========================================================================

    /**
     * Set the active page by ID
     */
    const setActivePage = useCallback((pageId: string | null) => {
        if (!pageId) {
            setActivePageId(null);
            return;
        }
        const page = pages.find(p => p.id === pageId);
        if (page) {
            setActivePageId(pageId);
            // Update the legacy data/componentOrder/sectionVisibility to match the active page
            if (page.sectionData) {
                setData(prev => prev ? { ...prev, ...page.sectionData } : page.sectionData as PageData);
            }
            if (page.sections) {
                setComponentOrder(page.sections);
                const visibility = page.sections.reduce((acc, section) => {
                    acc[section] = true;
                    return acc;
                }, {} as Record<PageSection, boolean>);
                setSectionVisibility(prev => ({ ...prev, ...visibility }));
            }
        }
    }, [pages]);

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

        setPages(prev => [...prev, newPage]);
        return newPage.id;
    }, [pages, activeProject]);

    /**
     * Update an existing page
     */
    const updatePage = useCallback(async (pageId: string, updates: Partial<SitePage>): Promise<void> => {
        setPages(prev => prev.map(p =>
            p.id === pageId
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p
        ));

        // If this is the active page, also update the legacy state
        if (pageId === activePageId) {
            if (updates.sectionData) {
                setData(prev => prev ? { ...prev, ...updates.sectionData } : updates.sectionData as PageData);
            }
            if (updates.sections) {
                setComponentOrder(updates.sections);
            }
        }
    }, [activePageId]);

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

        setPages(prev => prev.filter(p => p.id !== pageId));

        // If this was the active page, switch to home page
        if (pageId === activePageId) {
            const homePage = pages.find(p => p.isHomePage);
            setActivePageId(homePage?.id || null);
        }
    }, [pages, activePageId]);

    /**
     * Reorder pages
     */
    const reorderPages = useCallback(async (pageIds: string[]): Promise<void> => {
        setPages(prev => {
            const reordered = pageIds
                .map((id, index) => {
                    const page = prev.find(p => p.id === id);
                    if (page) {
                        return { ...page, navigationOrder: index * 10 };
                    }
                    return null;
                })
                .filter(Boolean) as SitePage[];

            // Add any pages that weren't in the pageIds array
            const remaining = prev.filter(p => !pageIds.includes(p.id));
            return [...reordered, ...remaining];
        });
    }, []);

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

        setPages(prev => [...prev, newPage]);
        return newPage.id;
    }, [pages]);

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
        saveProject,
        publishProject,
        getProjectSnapshot,
        renameActiveProject,
        addNewProject,
        deleteProject,
        createProjectFromTemplate,
        exportProjectAsHtml,
        updateProjectThumbnail,
        updateProjectFavicon,

        // Template Management
        isEditingTemplate,
        exitTemplateEditor,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
        updateTemplateInState,

        // Refresh
        refreshProjects,
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
