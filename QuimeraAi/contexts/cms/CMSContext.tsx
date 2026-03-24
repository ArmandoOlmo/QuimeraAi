/**
 * CMSContext
 * Maneja posts del blog y menús de navegación
 * Los posts están organizados por proyecto (cada cliente/proyecto tiene su propio contenido)
 * Los menús se guardan dentro del documento del proyecto (project.menus)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CMSPost, CMSCategory, Menu } from '../../types';
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
    setDoc,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';

interface CMSContextType {
    // CMS Posts (scoped to active project)
    cmsPosts: CMSPost[];
    isLoadingCMS: boolean;
    loadCMSPosts: () => Promise<void>;
    saveCMSPost: (post: CMSPost) => Promise<string>;
    deleteCMSPost: (postId: string) => Promise<void>;

    // Project info for CMS
    hasActiveProject: boolean;
    activeProjectName: string | null;

    // Navigation Menus
    menus: Menu[];
    saveMenu: (menu: Menu) => Promise<void>;
    deleteMenu: (menuId: string) => Promise<void>;

    // Categories
    categories: CMSCategory[];
    saveCategory: (category: CMSCategory) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
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

// Helper to strip undefined values from an object before Firestore write
const stripUndefined = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
};

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

    // Categories State
    const [categories, setCategories] = useState<CMSCategory[]>([]);

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
                    // Load categories
                    if (projectData.categories && Array.isArray(projectData.categories)) {
                        console.log('[CMSContext] ✅ Loaded categories from project:', projectData.categories.length);
                        setCategories(projectData.categories);
                    } else {
                        setCategories([]);
                    }
                }
            } catch (error) {
                console.error('[CMSContext] Error loading menus/categories:', error);
                setMenus(defaultMenus);
                setCategories([]);
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

    // Save CMS post (to current project) — returns the saved post ID
    const saveCMSPost = async (post: CMSPost): Promise<string> => {
        if (!user || !activeProject) {
            console.error("Cannot save post: No user or active project");
            return '';
        }

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) return '';

        try {
            const { id, ...data } = post;
            const now = new Date().toISOString();
            let savedPostId = id;

            if (id && id.length > 0) {
                const postRef = doc(db, collectionPath, id);
                console.log('[CMSContext] Updating post, categoryId:', data.categoryId, 'postId:', id);
                await updateDoc(postRef, stripUndefined({ ...data, updatedAt: now }));
            } else {
                const postsCol = collection(db, collectionPath);
                const docRef = await addDoc(postsCol, stripUndefined({
                    ...data,
                    authorId: user.uid,
                    projectId: activeProject.id,
                    createdAt: now,
                    updatedAt: now
                }));
                savedPostId = docRef.id;
            }

            // --- INSTANT PUBLISH LOGIC ---
            // Sync with publicStores immediately if status is 'published'
            if (activeProject.id && savedPostId) {
                // If the post is published, sync it to publicStores
                if (data.status === 'published') {
                    console.log('[CMSContext] Attempting to sync published post to public store:', {
                        projectId: activeProject.id,
                        postId: savedPostId,
                        slug: data.slug,
                        status: data.status
                    });

                    const publicPostRef = doc(db, 'publicStores', activeProject.id, 'posts', savedPostId);
                    await setDoc(publicPostRef, stripUndefined({
                        ...data,
                        id: savedPostId,
                        authorId: post.authorId || user.uid,
                        projectId: activeProject.id,
                        updatedAt: now,
                        publishedAt: data.publishedAt || now // Preserve original publishedAt, only set for first publish
                    }), { merge: true });
                    console.log('[CMSContext] ✅ Synced published post to public store');

                    // --- AUTO-ENROLL IN CHATBOT KNOWLEDGE ---
                    // When a new published post is created, auto-add it to aiAssistantConfig.cmsArticleIds
                    if (!id || id.length === 0) {
                        try {
                            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
                            const projectRef = doc(db, ...pathSegments, activeProject.id);
                            const projectSnap = await getDoc(projectRef);
                            if (projectSnap.exists()) {
                                const projectData = projectSnap.data();
                                const existingIds: string[] = projectData?.aiAssistantConfig?.cmsArticleIds || [];
                                if (!existingIds.includes(savedPostId)) {
                                    const updatedIds = [...existingIds, savedPostId];
                                    await updateDoc(projectRef, {
                                        'aiAssistantConfig.cmsArticleIds': updatedIds
                                    });
                                    console.log('[CMSContext] ✅ Auto-enrolled new published article in chatbot knowledge:', savedPostId);
                                }
                            }
                        } catch (enrollError) {
                            console.warn('[CMSContext] Failed to auto-enroll article in chatbot knowledge:', enrollError);
                        }
                    }
                } else {
                    // If it's a draft, ensure it's removed from publicStores (unpublish)
                    console.log('[CMSContext] Removing draft post from public store:', savedPostId);
                    const publicPostRef = doc(db, 'publicStores', activeProject.id, 'posts', savedPostId);
                    try {
                        await deleteDoc(publicPostRef);
                        console.log('[CMSContext] ℹ️ Removed draft post from public store');
                    } catch (e) {
                        console.warn('[CMSContext] Failed to remove draft post (may not exist):', e);
                    }
                }
            } else {
                console.warn('[CMSContext] Skipping public sync: Missing activeProject.id or savedPostId');
            }

            return savedPostId;
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    // Delete CMS post (from current project)
    const deleteCMSPost = async (postId: string) => {
        console.log('[CMSContext] deleteCMSPost called with postId:', postId);

        if (!user || !activeProject) {
            console.error('[CMSContext] Cannot delete: No user or active project');
            throw new Error('No user logged in or active project selected');
        }

        const collectionPath = getPostsCollectionPath();
        if (!collectionPath) {
            throw new Error('Cannot determine posts collection path');
        }

        try {
            // 1. Delete from private project collection
            const postRef = doc(db, collectionPath, postId);
            await deleteDoc(postRef);
            console.log('[CMSContext] ✅ Private post deleted successfully');

            // 2. Delete from public store (if it exists there)
            if (activeProject.id) {
                const publicPostRef = doc(db, 'publicStores', activeProject.id, 'posts', postId);
                // We use a try-catch for the public delete just in case it doesn't exist or permissions issue
                // but we don't want to fail the whole operation if this fails (though it should succeed for owner)
                try {
                    await deleteDoc(publicPostRef);
                    console.log('[CMSContext] ✅ Public post deleted successfully');
                } catch (publicError) {
                    console.warn('[CMSContext] Warning: Could not delete from public store (might not exist):', publicError);
                }
            }

        } catch (error) {
            console.error('[CMSContext] ❌ Error deleting post:', error);
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

    // Save category - persists to Firebase project document & publicStores
    // Helper: strip undefined values from a category (Firestore rejects undefined)
    const cleanCategoryForFirestore = (c: CMSCategory) => ({
        id: c.id,
        name: c.name || '',
        slug: c.slug || '',
        description: c.description ?? '',
        featuredImage: c.featuredImage ?? '',
        layoutType: c.layoutType || 'blog',
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
    });

    const saveCategory = async (category: CMSCategory) => {
        if (!user || !activeProjectId) {
            console.error('[CMSContext] Cannot save category: No user or active project');
            return;
        }

        try {
            const cleanCategory = cleanCategoryForFirestore(category);
            let updatedCategoriesList: CMSCategory[];
            const currentCategories = [...categories];

            if (currentCategories.some(c => c.id === cleanCategory.id)) {
                updatedCategoriesList = currentCategories.map(c => c.id === cleanCategory.id ? cleanCategory : c);
            } else {
                updatedCategoriesList = [...currentCategories, cleanCategory];
            }

            // Clean ALL categories for Firestore (existing ones might also have undefined)
            const firestoreCategories = updatedCategoriesList.map(cleanCategoryForFirestore);

            // 1. Update local state immediately
            setCategories(firestoreCategories);

            // 2. Persist to Firestore (project document)
            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
            const projectDocRef = doc(db, ...pathSegments, activeProjectId);
            await updateDoc(projectDocRef, { categories: firestoreCategories });

            // 3. Sync to publicStores for public access
            const publicStoreRef = doc(db, 'publicStores', activeProjectId);
            try {
                await updateDoc(publicStoreRef, { categories: firestoreCategories });
            } catch (e) {
                console.warn('[CMSContext] Could not sync categories to publicStores (may not exist yet):', e);
            }

            console.log('[CMSContext] ✅ Category saved successfully');
        } catch (error) {
            console.error('[CMSContext] Error saving category:', error);
            throw error;
        }
    };

    // Delete category - persists to Firebase
    const deleteCategory = async (categoryId: string) => {
        if (!user || !activeProjectId) {
            console.error('[CMSContext] Cannot delete category: No user or active project');
            return;
        }

        try {
            const updatedCategoriesList = categories.filter(c => c.id !== categoryId);

            // 1. Update local state immediately
            setCategories(updatedCategoriesList);

            // 2. Persist to Firestore
            const pathSegments = getProjectsCollectionPath(user.uid, currentTenantId);
            const projectDocRef = doc(db, ...pathSegments, activeProjectId);
            await updateDoc(projectDocRef, { categories: updatedCategoriesList });

            // 3. Sync to publicStores
            const publicStoreRef = doc(db, 'publicStores', activeProjectId);
            try {
                await updateDoc(publicStoreRef, { categories: updatedCategoriesList });
            } catch (e) {
                console.warn('[CMSContext] Could not sync category deletion to publicStores:', e);
            }

            console.log('[CMSContext] ✅ Category deleted successfully');
        } catch (error) {
            console.error('[CMSContext] Error deleting category:', error);
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
        categories,
        saveCategory,
        deleteCategory,
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



