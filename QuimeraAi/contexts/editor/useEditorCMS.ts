/**
 * useEditorCMS.ts
 * Extracted from EditorContext.tsx — CMS Posts and Navigation Menus
 */
import { useState, useEffect } from 'react';
import { CMSPost, Menu } from '../../types';
import { supabase } from '../../supabase';
import type { User } from '../../firebase'; // keep using User interface
import { getUsableImageUrl } from '../../utils/imageUrl';

interface UseEditorCMSParams {
    user: User | null;
    activeProjectId: string | null;
}

const getProjectTag = (projectId: string) => `project:${projectId}`;

const withProjectTag = (tags: string[] | undefined, projectId: string): string[] => {
    const projectTag = getProjectTag(projectId);
    return Array.from(new Set([...(tags || []).filter(tag => !tag.startsWith('project:')), projectTag]));
};

const getUserId = (user: User): string => (user as any).id || (user as any).uid;

export const useEditorCMS = ({ user, activeProjectId }: UseEditorCMSParams) => {
    // CMS State
    const [cmsPosts, setCmsPosts] = useState<CMSPost[]>([]);
    const [isLoadingCMS, setIsLoadingCMS] = useState(false);

    // Navigation Menus
    const [menus, setMenus] = useState<Menu[]>([
        { id: 'main', title: 'Main Menu', handle: 'main-menu', items: [] }
    ]);

    // We no longer strictly need currentTenantId here for simple operations if we just query by user/project,
    // but in Supabase `posts` requires tenant_id. Since we are inside the Editor, activeProjectId is known.
    // However, the `posts` table doesn't have project_id, so we must just get all posts for the user and filter.
    // Actually, in the Editor, users just need access to their posts. Let's just fetch by user_id for simplicity,
    // assuming Editor user can see their own posts.

    // CMS Real-time Subscription
    useEffect(() => {
        if (!user || !activeProjectId) {
            setCmsPosts([]);
            setIsLoadingCMS(false);
            return;
        }

        const fetchPosts = async () => {
            setIsLoadingCMS(true);
            try {
                // Determine user ID (fallback to uid for legacy compat)
                const userId = getUserId(user);

                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('user_id', userId)
                    .contains('tags', [getProjectTag(activeProjectId)])
                    .order('updated_at', { ascending: false });

                if (error) throw error;

                const postsData = (data || []).map(p => ({
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
                })) as CMSPost[];
                setCmsPosts(postsData);
            } catch (e) {
                console.error("Error setting up CMS subscription:", e);
            } finally {
                setIsLoadingCMS(false);
            }
        };

        fetchPosts();

        const userId = getUserId(user);
        const channel = supabase.channel(`public:posts:user_id=eq.${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchPosts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeProjectId]);

    const loadCMSPosts = async () => {
        // No-op. Subscription handles it.
    };

    const saveCMSPost = async (post: CMSPost) => {
        if (!user || !activeProjectId) return;
        const userId = getUserId(user);

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
                                const { error } = await supabase
                                    .from('projects')
                                    .update({ menus: updatedMenus })
                                    .eq('id', activeProjectId);

                                if (error) throw error;
                                console.log(`[Ref Integrity] Updated menus linking to ${oldLink} -> ${newLink}`);
                            } catch (err) {
                                console.error("Failed to update menu references for slug change:", err);
                            }
                        }
                    }
                }
            }
            // --- END FIX ---

            // Save to Supabase
            const tags = withProjectTag(data.tags, activeProjectId);
            const postData = {
                title: data.title,
                slug: data.slug,
                content: data.content,
                excerpt: data.excerpt,
                featured_image: getUsableImageUrl(data.featuredImage) || null,
                category: data.categoryId,
                status: data.status,
                tags,
                author_name: data.authorName,
                is_featured: data.isFeatured,
                published_at: data.status === 'published' ? (data.publishedAt || new Date().toISOString()) : null,
                updated_at: new Date().toISOString()
            };

            if (id && id.length > 0) {
                const { error } = await supabase
                    .from('posts')
                    .update(postData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                // For inserts, tenant_id is required. Since we don't strictly pass it here, we will fetch tenant_id from projects.
                // Or just query the current user's default tenant for now.
                // Wait, useEditorCMS is only used in Editor where the project's tenant is the user's tenant.
                // We'll fetch the tenant_id of the active project.
                const { data: project } = await supabase.from('projects').select('tenant_id').eq('id', activeProjectId).single();
                
                const { error } = await supabase
                    .from('posts')
                    .insert([{
                        ...postData,
                        user_id: userId,
                        tenant_id: project?.tenant_id || userId, // Fallback to user ID for personal workspace
                        created_at: new Date().toISOString()
                    }]);
                if (error) throw error;
            }
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    };

    const deleteCMSPost = async (postId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);
            if (error) throw error;
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
                const { error } = await supabase
                    .from('projects')
                    .update({ menus: updatedMenusList })
                    .eq('id', activeProjectId);
                if (error) throw error;
                console.log("Menu saved successfully.");
            } catch (e) {
                console.error("Error saving menu to Supabase:", e);
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
                const { error } = await supabase
                    .from('projects')
                    .update({ menus: updatedMenusList })
                    .eq('id', activeProjectId);
                if (error) throw error;
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
