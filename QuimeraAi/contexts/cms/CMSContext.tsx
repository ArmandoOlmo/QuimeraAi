/**
 * CMSContext
 * Maneja posts del blog y menús de navegación
 * Los posts están organizados por proyecto (cada cliente/proyecto tiene su propio contenido)
 * Los menús se guardan dentro del documento del proyecto (project.menus)
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { CMSPost, CMSCategory, Menu } from '../../types';
import { supabase } from '../../supabase';
import { useAuth } from '../core/AuthContext';
import { useSafeProject } from '../project';
import { useSafeTenant } from '../tenant';
import { resolveProjectName } from '../../utils/resolveProjectName';
import { getUsableImageUrl } from '../../utils/imageUrl';
import { resolveProjectMenus } from '../../utils/mapSupabaseProject';

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

const getProjectTag = (projectId: string) => `project:${projectId}`;

const withProjectTag = (tags: string[] | undefined, projectId: string): string[] => {
    const projectTag = getProjectTag(projectId);
    return Array.from(new Set([...(tags || []).filter(tag => !tag.startsWith('project:')), projectTag]));
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

    // Load menus and categories from active project
    useEffect(() => {
        if (!user || !activeProject || !activeProjectId) {
            setMenus([]);
            return;
        }

        // Helper to normalize i18n objects
        const normalizeMenu = (menu: any): Menu => ({
            ...menu,
            title: resolveProjectName(menu.title),
            items: menu.items?.map((item: any) => ({
                ...item,
                text: resolveProjectName(item.text)
            })) || []
        });

        const normalizeCategory = (category: any): CMSCategory => ({
            ...category,
            name: resolveProjectName(category.name),
            description: resolveProjectName(category.description)
        });

        const loadProjectData = async () => {
            try {
                const { data: projectData, error } = await supabase
                    .from('projects')
                    .select('menus, categories, data')
                    .eq('id', activeProjectId)
                    .single();

                if (error) throw error;

                if (projectData) {
                    const resolvedMenus = resolveProjectMenus(projectData);
                    if (resolvedMenus.length > 0) {
                        console.log('[CMSContext] ✅ Loaded menus from project:', resolvedMenus.length);
                        setMenus(resolvedMenus.map(normalizeMenu));
                    } else {
                        console.log('[CMSContext] No menus found in project, using defaults');
                        setMenus(defaultMenus);
                    }
                    if (projectData.categories && Array.isArray(projectData.categories)) {
                        console.log('[CMSContext] ✅ Loaded categories from project:', projectData.categories.length);
                        setCategories(projectData.categories.map(normalizeCategory));
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

        loadProjectData();
    }, [user, activeProject, activeProjectId]);

    // Load CMS posts with real-time updates
    useEffect(() => {
        if (!user || !currentTenantId || !activeProjectId) {
            setCmsPosts([]);
            return;
        }

        const fetchInitialPosts = async () => {
            setIsLoadingCMS(true);
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('tenant_id', currentTenantId)
                    .contains('tags', [getProjectTag(activeProjectId)])
                    .order('created_at', { ascending: false });

                if (error) throw error;

                setCmsPosts((data || []).map(p => ({
                    id: p.id,
                    projectId: activeProjectId,
                    title: p.title,
                    slug: p.slug || '',
                    content: p.content || '',
                    excerpt: p.excerpt || '',
                    featuredImage: getUsableImageUrl(p.featured_image),
                    categoryId: p.category || '',
                    status: p.status as any,
                    tags: p.tags || [],
                    authorId: p.user_id,
                    seoTitle: p.seo_title || '',
                    seoDescription: p.seo_description || '',
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    publishedAt: p.published_at,
                    authorName: p.author_name || '',
                    isFeatured: p.is_featured || false
                })));
            } catch (error) {
                console.error("Error fetching CMS posts:", error);
            } finally {
                setIsLoadingCMS(false);
            }
        };

        fetchInitialPosts();

        const channel = supabase.channel(`public:posts:tenant_id=eq.${currentTenantId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `tenant_id=eq.${currentTenantId}`
            }, () => {
                fetchInitialPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, currentTenantId, activeProjectId]);

    const loadCMSPosts = async () => {
        // Now handled by useEffect real-time channel
    };

    const saveCMSPost = async (post: CMSPost): Promise<string> => {
        if (!user || !currentTenantId || !activeProjectId) return '';

        try {
            const userId = user?.id || (user as any)?.uid;
            const tags = withProjectTag(post.tags, activeProjectId);
            
            const postData = {
                tenant_id: currentTenantId,
                user_id: userId,
                title: post.title,
                slug: post.slug,
                content: post.content,
                excerpt: post.excerpt,
                featured_image: getUsableImageUrl(post.featuredImage) || null,
                category: post.categoryId,
                status: post.status,
                tags,
                author_name: post.authorName,
                is_featured: post.isFeatured,
                published_at: post.status === 'published' ? (post.publishedAt || new Date().toISOString()) : null,
                updated_at: new Date().toISOString()
            };

            let savedPostId = post.id;

            if (post.id && post.id.length > 0) {
                const { error } = await supabase
                    .from('posts')
                    .update(postData)
                    .eq('id', post.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('posts')
                    .insert([{ ...postData, created_at: new Date().toISOString() }])
                    .select('id')
                    .single();
                if (error) throw error;
                savedPostId = data.id;
            }
            
            return savedPostId || '';
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    const deleteCMSPost = async (postId: string) => {
        if (!user || !currentTenantId) return;

        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);
            if (error) throw error;
        } catch (error) {
            console.error('[CMSContext] Error deleting post:', error);
            throw error;
        }
    };

    const saveMenu = async (menu: Menu) => {
        if (!user || !activeProjectId) return;

        try {
            let updatedMenusList: Menu[];
            const currentMenus = [...menus];

            if (currentMenus.some(m => m.id === menu.id)) {
                updatedMenusList = currentMenus.map(m => m.id === menu.id ? menu : m);
            } else {
                updatedMenusList = [...currentMenus, menu];
            }

            setMenus(updatedMenusList);

            const { data: existingRow } = await supabase
                .from('projects')
                .select('data')
                .eq('id', activeProjectId)
                .single();

            const existingData =
                existingRow?.data && typeof existingRow.data === 'object' ? existingRow.data : {};

            const { error } = await supabase
                .from('projects')
                .update({
                    menus: updatedMenusList,
                    data: { ...existingData, menus: updatedMenusList },
                })
                .eq('id', activeProjectId);

            if (error) throw error;
            console.log('[CMSContext] ✅ Menu saved successfully');
        } catch (error) {
            console.error('[CMSContext] Error saving menu:', error);
            throw error;
        }
    };

    const deleteMenu = async (menuId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const updatedMenusList = menus.filter(m => m.id !== menuId);
            setMenus(updatedMenusList);

            const { data: existingRow } = await supabase
                .from('projects')
                .select('data')
                .eq('id', activeProjectId)
                .single();

            const existingData =
                existingRow?.data && typeof existingRow.data === 'object' ? existingRow.data : {};

            const { error } = await supabase
                .from('projects')
                .update({
                    menus: updatedMenusList,
                    data: { ...existingData, menus: updatedMenusList },
                })
                .eq('id', activeProjectId);

            if (error) throw error;
            console.log('[CMSContext] ✅ Menu deleted successfully');
        } catch (error) {
            console.error('[CMSContext] Error deleting menu:', error);
            throw error;
        }
    };

    const cleanCategoryForSupabase = (c: CMSCategory) => ({
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
        if (!user || !activeProjectId) return;

        try {
            const cleanCategory = cleanCategoryForSupabase(category);
            let updatedCategoriesList: CMSCategory[];
            const currentCategories = [...categories];

            if (currentCategories.some(c => c.id === cleanCategory.id)) {
                updatedCategoriesList = currentCategories.map(c => c.id === cleanCategory.id ? cleanCategory : c);
            } else {
                updatedCategoriesList = [...currentCategories, cleanCategory];
            }

            const cleanCategories = updatedCategoriesList.map(cleanCategoryForSupabase);
            setCategories(cleanCategories);

            const { error } = await supabase
                .from('projects')
                .update({ categories: cleanCategories })
                .eq('id', activeProjectId);

            if (error) throw error;
            console.log('[CMSContext] ✅ Category saved successfully');
        } catch (error) {
            console.error('[CMSContext] Error saving category:', error);
            throw error;
        }
    };

    const deleteCategory = async (categoryId: string) => {
        if (!user || !activeProjectId) return;

        try {
            const updatedCategoriesList = categories.filter(c => c.id !== categoryId);
            setCategories(updatedCategoriesList);

            const { error } = await supabase
                .from('projects')
                .update({ categories: updatedCategoriesList })
                .eq('id', activeProjectId);

            if (error) throw error;
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
