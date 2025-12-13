/**
 * CMSContext
 * Maneja posts del blog y menús de navegación
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

interface CMSContextType {
    // CMS Posts
    cmsPosts: CMSPost[];
    isLoadingCMS: boolean;
    loadCMSPosts: () => Promise<void>;
    saveCMSPost: (post: CMSPost) => Promise<void>;
    deleteCMSPost: (postId: string) => Promise<void>;
    
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
    
    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);
    
    // Menus State
    const [menus, setMenus] = useState<Menu[]>(defaultMenus);

    // Load CMS posts with real-time updates
    useEffect(() => {
        if (!user) {
            setCmsPosts([]);
            return;
        }

        // #region agent log
        const listenerId = `cms-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CMSContext.tsx:72',message:'Creating CMS posts listener',data:{listenerId,userId:user.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion

        const q = query(
            collection(db, 'users', user.uid, 'posts'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CMSContext.tsx:83',message:'CMS posts snapshot',data:{listenerId,docCount:snapshot.docs.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            const postsData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as CMSPost[];
            setCmsPosts(postsData);
        }, (error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CMSContext.tsx:92',message:'CMS posts error',data:{listenerId,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            console.error("Error fetching CMS posts:", error);
        });

        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3746d5d4-0d14-4e6f-a56e-45539de64e9d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CMSContext.tsx:99',message:'Cleaning up CMS posts listener',data:{listenerId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            unsubscribe();
        };
    }, [user]);

    // Load CMS posts manually
    const loadCMSPosts = async () => {
        if (!user) return;

        setIsLoadingCMS(true);
        try {
            const postsCol = collection(db, 'users', user.uid, 'posts');
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

    // Save CMS post
    const saveCMSPost = async (post: CMSPost) => {
        if (!user) return;

        try {
            const { id, ...data } = post;
            const now = new Date().toISOString();

            if (id && id.length > 0) {
                const postRef = doc(db, 'users', user.uid, 'posts', id);
                await updateDoc(postRef, { ...data, updatedAt: now });
            } else {
                const postsCol = collection(db, 'users', user.uid, 'posts');
                await addDoc(postsCol, { 
                    ...data, 
                    authorId: user.uid, 
                    createdAt: now, 
                    updatedAt: now 
                });
            }
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    // Delete CMS post
    const deleteCMSPost = async (postId: string) => {
        if (!user) return;

        try {
            const postRef = doc(db, 'users', user.uid, 'posts', postId);
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



