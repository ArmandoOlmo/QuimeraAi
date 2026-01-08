/**
 * CMSContext
 * Maneja posts del blog y menús de navegación
 * Los posts están organizados por proyecto (cada cliente/proyecto tiene su propio contenido)
 * Los menús se guardan dentro del documento del proyecto (project.menus)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CMSPost, Menu } from '../../types';
import {
    db,
    doc,
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';

interface CMSContextType {
    // CMS Posts (scoped to active project)
    cmsPosts: CMSPost[];
    isLoadingCMS: boolean;
    loadCMSPosts: () => Promise<void>;
    saveCMSPost: (post: CMSPost) => Promise<void>;
    deleteCMSPost: (postId: string) => Promise<void>;
    
    // Project info for CMS
    hasActiveProject: boolean;
    activeProjectName: string | null;
    
    // Navigation Menus
    menus: Menu[];
    saveMenu: (menu: Menu) => Promise<void>;
    deleteMenu: (menuId: string) => Promise<void>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

const defaultMenus: Menu[] = [
    { 
        id: 'main', 
        title: 'Main Menu', 
        handle: 'main-menu', 
        items: [{ id: '1', text: 'Home', href: '/', type: 'section' }] 
    },
    { 
        id: 'footer', 
        title: 'Footer Menu', 
        handle: 'footer-menu', 
        items: [{ id: '1', text: 'Contact', href: '/#contact', type: 'section' }] 
    }
];

// Helper to get the correct projects collection path
const getProjectsCollectionPath = (userId: string, tenantId?: string | null): string[] => {
    const isPersonalTenant = tenantId && tenantId.startsWith(`tenant_${userId}`);
    if (tenantId && !isPersonalTenant) {
        return ['tenants', tenantId, 'projects'];
    }
    return ['users', userId, 'projects'];
};

export const CMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const projectContext = useSafeProject();
    const activeProject = projectContext?.activeProject || null;
    const activeProjectId = projectContext?.activeProjectId || null;
    const tenantContext = useSafeTenant();
    const currentTenantId = tenantContext?.currentTenant?.id || null;
    
    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);
    
    // Menus State - Load from active project
    const [menus, setMenus] = useState<Menu[]>([]);

    // Helper to get the posts collection path for the current project
    const getPostsCollectionPath = useCallback(() => {
        if (!user || !activeProject) return null;
        return `users/${user.uid}/projects/${activeProject.id}/posts`;
    }, [user, activeProject]);

    // Load menus from active project
    useEffect(() => {
        if (!user || !activeProject) {
            setMenus([]);
            return;
        }

        // Load menus from project document
        const loadMenus = async () => {
            try {
                const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                const projectRef = doc(db, ...pathSegments, activeProject.id);
                const projectSnap = await getDoc(projectRef);
                
                if (projectSnap.exists()) {
                    const projectData = projectSnap.data();
                    if (projectData.menus && Array.isArray(projectData.menus)) {
                        console.log('[CMSContext] ✅ Loaded menus from project:', projectData.menus.length);
                        setMenus(projectData.menus);
                    } else {
                        console.log('[CMSContext] No menus found in project, using defaults');
                        setMenus(defaultMenus);
                    }
                }
            } catch (error) {
                console.error('[CMSContext] Error loading menus:', error);
                setMenus(defaultMenus);
            }
        };

        loadMenus();
    }, [user, activeProject, currentTenantId]);

    // Load CMS posts with real-time updates (filtered by active project)
    useEffect(() => {
        if (!user || !activeProject) {
            setCmsPosts([]);
            return;
        }

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) return;

        const q = query(
            collection(db, collectionPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as CMSPost[];
            setCmsPosts(postsData);
        }, (error) => {
            console.error("Error fetching CMS posts:", error);
        });

        return () => {
            unsubscribe();
        };
    }, [user, activeProject, getPostsCollectionPath]);

    // Load CMS posts manually (for current project)
    const loadCMSPosts = async () => {
        if (!user || !activeProject) return;

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) return;

        setIsLoadingCMS(true);
        try {
            const postsCol = collection(db, collectionPath);
            const q = query(postsCol, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const posts = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as CMSPost[];
            setCmsPosts(posts);
        } catch (error) {
            console.error("Error loading CMS posts:", error);
        } finally {
            setIsLoadingCMS(false);
        }
    };

    // Save CMS post (to current project)
    const saveCMSPost = async (post: CMSPost) => {
        if (!user || !activeProject) {
            console.error("Cannot save post: No user or active project");
            return;
        }

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) return;

        try {
            const { id, ...data } = post;
            const now = new Date().toISOString();

            if (id && id.length > 0) {
                const postRef = doc(db, collectionPath, id);
                await updateDoc(postRef, { ...data, updatedAt: now });
            } else {
                const postsCol = collection(db, collectionPath);
                await addDoc(postsCol, { 
                    ...data, 
                    authorId: user.uid,
                    projectId: activeProject.id,
                    createdAt: now, 
                    updatedAt: now 
                });
            }
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    // Delete CMS post (from current project)
    const deleteCMSPost = async (postId: string) => {
        if (!user || !activeProject) return;

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) return;

        try {
            const postRef = doc(db, collectionPath, postId);
            await deleteDoc(postRef);
        } catch (error) {
            console.error("Error deleting post:", error);
            throw error;
        }
    };

    // Save menu - persists to Firebase
    const saveMenu = async (menu: Menu) => {
        if (!user || !activeProjectId) {
            console.error('[CMSContext] Cannot save menu: No user or active project');
            return;
        }

        try {
            // Calculate updated menus list
            let updatedMenusList: Menu[];
            const currentMenus = [...menus];
            
            if (currentMenus.some(m => m.id === menu.id)) {
                updatedMenusList = currentMenus.map(m => m.id === menu.id ? menu : m);
            } else {
                updatedMenusList = [...currentMenus, menu];
            }

            // 1. Update local state immediately for UI responsiveness
            setMenus(updatedMenusList);

            // 2. Persist to Firestore
            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
            const projectDocRef = doc(db, ...pathSegments, activeProjectId);
            await updateDoc(projectDocRef, { menus: updatedMenusList });
            
            console.log('[CMSContext] ✅ Menu saved successfully to Firebase');
        } catch (error) {
            console.error('[CMSContext] Error saving menu:', error);
            throw error;
        }
    };

    // Delete menu - persists to Firebase
    const deleteMenu = async (menuId: string) => {
        if (!user || !activeProjectId) {
            console.error('[CMSContext] Cannot delete menu: No user or active project');
            return;
        }

        try {
            // Calculate updated menus list
            const updatedMenusList = menus.filter(m => m.id !== menuId);

            // 1. Update local state immediately
            setMenus(updatedMenusList);

            // 2. Persist to Firestore
            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
            const projectDocRef = doc(db, ...pathSegments, activeProjectId);
            await updateDoc(projectDocRef, { menus: updatedMenusList });
            
            console.log('[CMSContext] ✅ Menu deleted successfully from Firebase');
        } catch (error) {
            console.error('[CMSContext] Error deleting menu:', error);
            throw error;
        }
    };

    const value: CMSContextType = {
        cmsPosts,
        isLoadingCMS,
        loadCMSPosts,
        saveCMSPost,
        deleteCMSPost,
        hasActiveProject: !!activeProject,
        activeProjectName: activeProject?.name || null,
        menus,
        saveMenu,
        deleteMenu,
    };

    return <CMSContext.Provider value={value}>{children}</CMSContext.Provider>;
};

export const useCMS = (): CMSContextType => {
    const context = useContext(CMSContext);
    if (!context) {
        throw new Error('useCMS must be used within a CMSProvider');
    }
    return context;
};



