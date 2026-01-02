/**
 * useTenantData Hook
 * Provides access to tenant-scoped data (projects, leads, posts, files, etc.)
 * All data is automatically scoped to the current active tenant
 */

import { useState, useEffect, useCallback } from 'react';
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
} from '../firebase';
import { useTenant } from '../contexts/tenant';
import { Project, PageData, ThemeData, PageSection, BrandIdentity } from '../types';
import { Lead, CMSPost } from '../types/business';

// =============================================================================
// TENANT PROJECTS HOOK
// =============================================================================

export interface UseTenantProjectsReturn {
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    createProject: (project: Omit<Project, 'id'>) => Promise<string>;
    updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    refreshProjects: () => Promise<void>;
}

export function useTenantProjects(): UseTenantProjectsReturn {
    const { currentTenant, canPerformInTenant } = useTenant();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load projects when tenant changes
    useEffect(() => {
        if (!currentTenant) {
            setProjects([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const projectsQuery = query(
            collection(db, 'tenants', currentTenant.id, 'projects'),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(
            projectsQuery,
            (snapshot) => {
                const projectList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Project));
                setProjects(projectList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant projects:', err);
                setError('Error cargando proyectos');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant]);

    const createProject = useCallback(async (project: Omit<Project, 'id'>): Promise<string> => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageProjects')) {
            throw new Error('No tienes permiso para crear proyectos');
        }

        const projectRef = await addDoc(
            collection(db, 'tenants', currentTenant.id, 'projects'),
            {
                ...project,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
            }
        );

        // Update tenant usage
        await updateDoc(doc(db, 'tenants', currentTenant.id), {
            'usage.projectCount': (currentTenant.usage.projectCount || 0) + 1,
            updatedAt: serverTimestamp(),
        });

        return projectRef.id;
    }, [currentTenant, canPerformInTenant]);

    const updateProject = useCallback(async (projectId: string, data: Partial<Project>) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageProjects')) {
            throw new Error('No tienes permiso para editar proyectos');
        }

        await updateDoc(
            doc(db, 'tenants', currentTenant.id, 'projects', projectId),
            {
                ...data,
                lastUpdated: serverTimestamp(),
            }
        );
    }, [currentTenant, canPerformInTenant]);

    const deleteProject = useCallback(async (projectId: string) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageProjects')) {
            throw new Error('No tienes permiso para eliminar proyectos');
        }

        await deleteDoc(doc(db, 'tenants', currentTenant.id, 'projects', projectId));

        // Update tenant usage
        await updateDoc(doc(db, 'tenants', currentTenant.id), {
            'usage.projectCount': Math.max(0, (currentTenant.usage.projectCount || 1) - 1),
            updatedAt: serverTimestamp(),
        });
    }, [currentTenant, canPerformInTenant]);

    const refreshProjects = useCallback(async () => {
        if (!currentTenant) return;
        setIsLoading(true);
        // The onSnapshot will automatically refresh
        setIsLoading(false);
    }, [currentTenant]);

    return {
        projects,
        isLoading,
        error,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
    };
}

// =============================================================================
// TENANT LEADS HOOK
// =============================================================================

export interface UseTenantLeadsReturn {
    leads: Lead[];
    isLoading: boolean;
    error: string | null;
    createLead: (lead: Omit<Lead, 'id'>) => Promise<string>;
    updateLead: (leadId: string, data: Partial<Lead>) => Promise<void>;
    deleteLead: (leadId: string) => Promise<void>;
    refreshLeads: () => Promise<void>;
}

export function useTenantLeads(): UseTenantLeadsReturn {
    const { currentTenant, canPerformInTenant } = useTenant();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentTenant) {
            setLeads([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const leadsQuery = query(
            collection(db, 'tenants', currentTenant.id, 'leads'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            leadsQuery,
            (snapshot) => {
                const leadList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Lead));
                setLeads(leadList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant leads:', err);
                setError('Error cargando leads');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant]);

    const createLead = useCallback(async (lead: Omit<Lead, 'id'>): Promise<string> => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageLeads')) {
            throw new Error('No tienes permiso para crear leads');
        }

        const leadRef = await addDoc(
            collection(db, 'tenants', currentTenant.id, 'leads'),
            {
                ...lead,
                createdAt: serverTimestamp(),
            }
        );

        return leadRef.id;
    }, [currentTenant, canPerformInTenant]);

    const updateLead = useCallback(async (leadId: string, data: Partial<Lead>) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageLeads')) {
            throw new Error('No tienes permiso para editar leads');
        }

        await updateDoc(
            doc(db, 'tenants', currentTenant.id, 'leads', leadId),
            data
        );
    }, [currentTenant, canPerformInTenant]);

    const deleteLead = useCallback(async (leadId: string) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageLeads')) {
            throw new Error('No tienes permiso para eliminar leads');
        }

        await deleteDoc(doc(db, 'tenants', currentTenant.id, 'leads', leadId));
    }, [currentTenant, canPerformInTenant]);

    const refreshLeads = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        leads,
        isLoading,
        error,
        createLead,
        updateLead,
        deleteLead,
        refreshLeads,
    };
}

// =============================================================================
// TENANT POSTS HOOK (CMS)
// =============================================================================

export interface UseTenantPostsReturn {
    posts: CMSPost[];
    isLoading: boolean;
    error: string | null;
    createPost: (post: Omit<CMSPost, 'id'>) => Promise<string>;
    updatePost: (postId: string, data: Partial<CMSPost>) => Promise<void>;
    deletePost: (postId: string) => Promise<void>;
    refreshPosts: () => Promise<void>;
}

export function useTenantPosts(): UseTenantPostsReturn {
    const { currentTenant, canPerformInTenant } = useTenant();
    const [posts, setPosts] = useState<CMSPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentTenant) {
            setPosts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const postsQuery = query(
            collection(db, 'tenants', currentTenant.id, 'posts'),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            postsQuery,
            (snapshot) => {
                const postList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as CMSPost));
                setPosts(postList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant posts:', err);
                setError('Error cargando posts');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant]);

    const createPost = useCallback(async (post: Omit<CMSPost, 'id'>): Promise<string> => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageCMS')) {
            throw new Error('No tienes permiso para crear posts');
        }

        const postRef = await addDoc(
            collection(db, 'tenants', currentTenant.id, 'posts'),
            {
                ...post,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
        );

        return postRef.id;
    }, [currentTenant, canPerformInTenant]);

    const updatePost = useCallback(async (postId: string, data: Partial<CMSPost>) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageCMS')) {
            throw new Error('No tienes permiso para editar posts');
        }

        await updateDoc(
            doc(db, 'tenants', currentTenant.id, 'posts', postId),
            {
                ...data,
                updatedAt: new Date().toISOString(),
            }
        );
    }, [currentTenant, canPerformInTenant]);

    const deletePost = useCallback(async (postId: string) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageCMS')) {
            throw new Error('No tienes permiso para eliminar posts');
        }

        await deleteDoc(doc(db, 'tenants', currentTenant.id, 'posts', postId));
    }, [currentTenant, canPerformInTenant]);

    const refreshPosts = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        posts,
        isLoading,
        error,
        createPost,
        updatePost,
        deletePost,
        refreshPosts,
    };
}

// =============================================================================
// TENANT FILES HOOK
// =============================================================================

export interface TenantFile {
    id: string;
    name: string;
    storagePath: string;
    downloadURL: string;
    size: number;
    type: string;
    createdAt: { seconds: number; nanoseconds: number };
    notes?: string;
    aiSummary?: string;
    projectId?: string;
    projectName?: string;
}

export interface UseTenantFilesReturn {
    files: TenantFile[];
    isLoading: boolean;
    error: string | null;
    addFile: (file: Omit<TenantFile, 'id'>) => Promise<string>;
    updateFile: (fileId: string, data: Partial<TenantFile>) => Promise<void>;
    deleteFile: (fileId: string) => Promise<void>;
    refreshFiles: () => Promise<void>;
}

export function useTenantFiles(): UseTenantFilesReturn {
    const { currentTenant, canPerformInTenant } = useTenant();
    const [files, setFiles] = useState<TenantFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentTenant) {
            setFiles([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const filesQuery = query(
            collection(db, 'tenants', currentTenant.id, 'files'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            filesQuery,
            (snapshot) => {
                const fileList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as TenantFile));
                setFiles(fileList);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error loading tenant files:', err);
                setError('Error cargando archivos');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentTenant]);

    const addFile = useCallback(async (file: Omit<TenantFile, 'id'>): Promise<string> => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageFiles')) {
            throw new Error('No tienes permiso para subir archivos');
        }

        const fileRef = await addDoc(
            collection(db, 'tenants', currentTenant.id, 'files'),
            {
                ...file,
                createdAt: serverTimestamp(),
            }
        );

        return fileRef.id;
    }, [currentTenant, canPerformInTenant]);

    const updateFile = useCallback(async (fileId: string, data: Partial<TenantFile>) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageFiles')) {
            throw new Error('No tienes permiso para editar archivos');
        }

        await updateDoc(
            doc(db, 'tenants', currentTenant.id, 'files', fileId),
            data
        );
    }, [currentTenant, canPerformInTenant]);

    const deleteFile = useCallback(async (fileId: string) => {
        if (!currentTenant) throw new Error('No hay workspace activo');
        if (!canPerformInTenant('canManageFiles')) {
            throw new Error('No tienes permiso para eliminar archivos');
        }

        await deleteDoc(doc(db, 'tenants', currentTenant.id, 'files', fileId));
    }, [currentTenant, canPerformInTenant]);

    const refreshFiles = useCallback(async () => {
        // The onSnapshot handles real-time updates
    }, []);

    return {
        files,
        isLoading,
        error,
        addFile,
        updateFile,
        deleteFile,
        refreshFiles,
    };
}

// =============================================================================
// COMBINED HOOK FOR CONVENIENCE
// =============================================================================

export interface UseTenantDataReturn {
    projects: UseTenantProjectsReturn;
    leads: UseTenantLeadsReturn;
    posts: UseTenantPostsReturn;
    files: UseTenantFilesReturn;
}

export function useTenantData(): UseTenantDataReturn {
    const projects = useTenantProjects();
    const leads = useTenantLeads();
    const posts = useTenantPosts();
    const files = useTenantFiles();

    return {
        projects,
        leads,
        posts,
        files,
    };
}






