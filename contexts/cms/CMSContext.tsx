/**
 * CMSContext
 * Maneja posts del blog y menús de navegación
 * Los posts están organizados por proyecto (cada cliente/proyecto tiene su propio contenido)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CMSPost, Menu } from '../../types';
import {
    db,
    doc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';

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
        items: [{ id: '1', text: 'Home', href: '#hero', type: 'section' }] 
    },
    { 
        id: 'footer', 
        title: 'Footer Menu', 
        handle: 'footer-menu', 
        items: [{ id: '1', text: 'Contact', href: '#contact', type: 'section' }] 
    }
];

export const CMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { activeProject } = useSafeProject();
    
    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);
    
    // Menus State
    const [menus, setMenus] = useState<Menu[]>(defaultMenus);

    // Helper to get the posts collection path for the current project
    const getPostsCollectionPath = useCallback(() => {
        if (!user || !activeProject) return null;
        return `users/${user.uid}/projects/${activeProject.id}/posts`;
    }, [user, activeProject]);

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

    // Save menu
    const saveMenu = async (menu: Menu) => {
        if (!user) return;

        try {
            // Update local state
            setMenus(prev => {
                const exists = prev.find(m => m.id === menu.id);
                if (exists) {
                    return prev.map(m => m.id === menu.id ? menu : m);
                }
                return [...prev, menu];
            });

            // Note: Menus are typically saved as part of the project
            // This could be extended to save to a separate collection if needed
        } catch (error) {
            console.error("Error saving menu:", error);
            throw error;
        }
    };

    // Delete menu
    const deleteMenu = async (menuId: string) => {
        if (!user) return;

        try {
            setMenus(prev => prev.filter(m => m.id !== menuId));
        } catch (error) {
            console.error("Error deleting menu:", error);
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



