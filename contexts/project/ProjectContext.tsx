/**
 * ProjectContext
 * Maneja proyectos, templates y exportación
 * Soporta multi-tenant: usa /tenants/{tenantId}/projects cuando hay tenant activo
 */

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Project, PageData, ThemeData, PageSection, BrandIdentity } from '../../types';
import { initialData } from '../../data/initialData';
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

    // Active Project Data
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

    // Project Operations
    loadProject: (projectId: string, fromAdmin?: boolean, navigateToEditor?: boolean) => void;
    saveProject: () => Promise<void>;
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

    // Get current tenant ID (null if not using multi-tenant or no tenant selected)
    const currentTenantId = tenantContext?.currentTenant?.id || null;

    // Get project limits from tenant
    const maxProjects = tenantContext?.currentTenant?.limits?.maxProjects || 1;

    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const activeProject = projects.find(p => p.id === activeProjectId) || null;

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

    // Load project by ID
    const loadProject = useCallback((projectId: string, fromAdmin = false, navigateToEditor = true) => {
        const project = projectsRef.current.find(p => p.id === projectId);
        if (!project) {
            console.error("Project not found:", projectId);
            return;
        }

        setActiveProjectId(projectId);
        setData(project.data);
        setTheme(project.theme);
        setBrandIdentity(project.brandIdentity || initialData.brandIdentity);
        setComponentOrder(project.componentOrder || initialData.componentOrder as PageSection[]);
        setSectionVisibility(project.sectionVisibility || initialData.sectionVisibility as Record<PageSection, boolean>);

        const isTemplate = project.status === 'Template';
        setIsEditingTemplate(isTemplate && fromAdmin);

        isInitialLoadRef.current = true;
        setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 1000);

        if (navigateToEditor) {
            router.navigate(`/editor/${projectId}`);
        }
    }, []);

    // Save current project
    const saveProject = useCallback(async () => {
        if (!user || !activeProjectId || !data) return;

        const project = projectsRef.current.find(p => p.id === activeProjectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';
        const now = new Date().toISOString();

        const updatedProject: Partial<Project> = {
            data,
            theme,
            brandIdentity,
            componentOrder,
            sectionVisibility,
            lastUpdated: now,
        };

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
    }, [user, activeProjectId, data, theme, brandIdentity, componentOrder, sectionVisibility, currentTenantId]);

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
    }, [data, theme, brandIdentity, componentOrder, sectionVisibility, activeProjectId, saveProject]);

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
        if (!user) return;

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const isTemplate = project.status === 'Template';
        const storagePath = isTemplate
            ? `templates/${projectId}/thumbnail.png`
            : `${getProjectStoragePath(user.uid, projectId, currentTenantId)}/thumbnail.png`;

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
        const docRef = isTemplate
            ? doc(db, 'templates', projectId)
            : doc(db, ...pathSegments, projectId);

        await updateDoc(docRef, { thumbnail: downloadURL });
        setProjects(prev => prev.map(p =>
            p.id === projectId ? { ...p, thumbnail: downloadURL } : p
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

    const value: ProjectContextType = {
        projects,
        isLoadingProjects,
        activeProjectId,
        activeProject,
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
        loadProject,
        saveProject,
        renameActiveProject,
        addNewProject,
        deleteProject,
        createProjectFromTemplate,
        exportProjectAsHtml,
        updateProjectThumbnail,
        updateProjectFavicon,
        isEditingTemplate,
        exitTemplateEditor,
        createNewTemplate,
        archiveTemplate,
        duplicateTemplate,
        updateTemplateInState,
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
