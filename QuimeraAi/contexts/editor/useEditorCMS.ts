/**
 * useEditorCMS.ts
 * Extracted from EditorContext.tsx — CMS Posts and Navigation Menus
 */
import { useState, useEffect } from 'react';
import { CMSPost, Menu } from '../../types';
import {
    db, doc, collection, addDoc, updateDoc, deleteDoc,
    query, orderBy, onSnapshot
} from '../../firebase';
import type { User } from '../../firebase';

interface UseEditorCMSParams {
    user: User | null;
    activeProjectId: string | null;
}

export const useEditorCMS = ({ user, activeProjectId }: UseEditorCMSParams) => {
    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);

    // Navigation Menus
    const [menus, setMenus] = useState<Menu[]>([
        { id: 'main', title: 'Main Menu', handle: 'main-menu', items: [] }
    ]);

    // CMS Real-time Subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        if (user) {
            setIsLoadingCMS(true);
            try {
                const postsCol = collection(db, 'users', user.uid, 'posts');
                const q = query(postsCol, orderBy('updatedAt', 'desc'));

                unsubscribe = onSnapshot(q,
                    (snapshot) => {
                        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSPost));
                        setCmsPosts(posts);
                        setIsLoadingCMS(false);
                    },
                    (error) => {
                        console.error("CMS Snapshot Error:", error);
                        setIsLoadingCMS(false);
                    }
                );
            } catch (e) {
                console.error("Error setting up CMS subscription:", e);
                setIsLoadingCMS(false);
            }
        } else {
            setCmsPosts([]);
            setIsLoadingCMS(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    // CMS Logic - Stub, as real logic moved to subscription
    const loadCMSPosts = async () => {
        // No-op to satisfy interface. Subscription handles loading.
    };

    const saveCMSPost = async (post: CMSPost) => {
        if (!user) return;
        try {
            const { id, ...data } = post;

            // --- START FIX: Propagate Slug Changes to Menus ---
            if (id) {
                const oldPost = cmsPosts.find(p => p.id === id);

                if (oldPost && oldPost.slug !== post.slug) {
                    const oldLink = `#article:${oldPost.slug}`;
                    const newLink = `#article:${post.slug}`;

                    let hasMenuUpdates = false;
                    const updatedMenus = menus.map(menu => {
                        let menuChanged = false;
                        const newItems = menu.items.map(item => {
                            if (item.href === oldLink) {
                                menuChanged = true;
                                hasMenuUpdates = true;
                                return { ...item, href: newLink };
                            }
                            return item;
                        });

                        if (menuChanged) {
                            return { ...menu, items: newItems };
                        }
                        return menu;
                    });

                    if (hasMenuUpdates) {
                        setMenus(updatedMenus);

                        if (activeProjectId) {
                            try {
                                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                                await updateDoc(projectDocRef, { menus: updatedMenus });
                                console.log(`[Ref Integrity] Updated menus linking to ${oldLink} -> ${newLink}`);
                            } catch (err) {
                                console.error("Failed to update menu references for slug change:", err);
                            }
                        }
                    }
                }
            }
            // --- END FIX ---

            if (id && id.length > 0) {
                const postRef = doc(db, 'users', user.uid, 'posts', id);
                await updateDoc(postRef, { ...data, updatedAt: new Date().toISOString() });
            } else {
                const postsCol = collection(db, 'users', user.uid, 'posts');
                const now = new Date().toISOString();
                await addDoc(postsCol, { ...data, authorId: user.uid, createdAt: now, updatedAt: now });
            }
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    const deleteCMSPost = async (postId: string) => {
        if (!user) return;
        try {
            const postRef = doc(db, 'users', user.uid, 'posts', postId);
            await deleteDoc(postRef);
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };

    // Menu functions use setProjects externally, so we provide save/delete
    // that the orchestrator will wire up
    const saveMenu = async (menu: Menu, setProjects: (fn: (prev: any[]) => any[]) => void) => {
        if (!activeProjectId) {
            console.error("Cannot save menu: No active project ID");
            return;
        }

        const currentMenus = [...menus];
        let updatedMenusList: Menu[] = [];

        if (currentMenus.some(m => m.id === menu.id)) {
            updatedMenusList = currentMenus.map(m => m.id === menu.id ? menu : m);
        } else {
            updatedMenusList = [...currentMenus, menu];
        }

        setMenus(updatedMenusList);

        setProjects((prev: any[]) => prev.map((p: any) => {
            if (p.id === activeProjectId) {
                return { ...p, menus: updatedMenusList };
            }
            return p;
        }));

        if (user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { menus: updatedMenusList });
                console.log("Menu saved successfully.");
            } catch (e) {
                console.error("Error saving menu to Firestore:", e);
            }
        }
    };

    const deleteMenu = async (menuId: string, setProjects: (fn: (prev: any[]) => any[]) => void) => {
        if (!activeProjectId) return;

        const updatedMenusList = menus.filter(m => m.id !== menuId);

        setMenus(updatedMenusList);

        setProjects((prev: any[]) => prev.map((p: any) => {
            if (p.id === activeProjectId) {
                return { ...p, menus: updatedMenusList };
            }
            return p;
        }));

        if (user) {
            try {
                const projectDocRef = doc(db, 'users', user.uid, 'projects', activeProjectId);
                await updateDoc(projectDocRef, { menus: updatedMenusList });
            } catch (e) {
                console.error("Error deleting menu from project", e);
            }
        }
    };

    return {
        cmsPosts, isLoadingCMS, loadCMSPosts, saveCMSPost, deleteCMSPost,
        menus, setMenus, saveMenu, deleteMenu,
    };
};
