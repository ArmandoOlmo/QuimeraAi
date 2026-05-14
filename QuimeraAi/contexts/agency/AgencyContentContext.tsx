/**
 * AgencyContentContext
 * Manages content for the Agency's public landing page:
 * - Articles (blog/content)
 * - Navigation (header, footer)
 * - Legal pages
 * 
 * Unlike AppContentContext, this content is TENANT-SCOPED.
 * Each agency has its own content stored in tenants/{tenantId}/agencyContent/*
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
    AgencyArticle,
    AgencyNavigation,
    AgencyContentContextType,
    DEFAULT_AGENCY_NAVIGATION,
    AgencyLegalPage,
    AgencyLegalPageType,
    DEFAULT_AGENCY_PRIVACY_POLICY,
    DEFAULT_AGENCY_DATA_DELETION,
    DEFAULT_AGENCY_TERMS,
    DEFAULT_AGENCY_COOKIE_POLICY,
} from '../../types/agencyContent';
import { supabase } from '../../supabase';
import { useTenant } from '../tenant/TenantContext';
import { resolveProjectName } from '../../utils/resolveProjectName';
import { getUsableImageUrl } from '../../utils/imageUrl';

// =============================================================================
// CONTEXT
// =============================================================================

const AgencyContentContext = createContext<AgencyContentContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export const AgencyContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentTenant } = useTenant();
    const tenantId = currentTenant?.id;

    // Articles State
    const [articles, setArticles] = useState<AgencyArticle[]>([]);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);

    // Navigation State
    const [navigation, setNavigation] = useState<AgencyNavigation | null>(null);
    const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);

    // Legal Pages State
    const [legalPages, setLegalPages] = useState<AgencyLegalPage[]>([]);
    const [isLoadingLegalPages, setIsLoadingLegalPages] = useState(false);

    const TABLES = {
        ARTICLES: 'agency_articles',
        NAVIGATION: 'agency_navigation',
        LEGAL_PAGES: 'agency_legal_pages',
    };

    // ==========================================================================
    // ARTICLES
    // ==========================================================================

    // Load articles with real-time updates
    useEffect(() => {
        if (!tenantId) {
            setArticles([]);
            return;
        }

        setIsLoadingArticles(true);

        const fetchInitialArticles = async () => {
            const { data, error } = await supabase
                .from(TABLES.ARTICLES)
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const articlesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    publishedAt: item.published_at,
                    imageUrl: getUsableImageUrl(item.image_url),
                    readTime: item.read_time,
                    translationGroup: item.translation_group,
                    title: resolveProjectName(item.title),
                    excerpt: item.excerpt ? resolveProjectName(item.excerpt) : undefined
                })) as AgencyArticle[];
                setArticles(articlesData);
            }
            setIsLoadingArticles(false);
        };

        fetchInitialArticles();

        const channel = supabase
            .channel(`public:agency_articles:${tenantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ARTICLES, filter: `tenant_id=eq.${tenantId}` }, (payload) => {
                fetchInitialArticles();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    // Featured articles
    const featuredArticles = useMemo(() => {
        return articles
            .filter(a => a.status === 'published' && a.featured)
            .slice(0, 6);
    }, [articles]);

    // Manual load articles
    const loadArticles = useCallback(async () => {
        if (!tenantId) return;

        setIsLoadingArticles(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.ARTICLES)
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data) {
                const articlesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    publishedAt: item.published_at,
                    imageUrl: getUsableImageUrl(item.image_url),
                    readTime: item.read_time,
                    translationGroup: item.translation_group,
                    title: resolveProjectName(item.title),
                    excerpt: item.excerpt ? resolveProjectName(item.excerpt) : undefined
                })) as AgencyArticle[];
                setArticles(articlesData);
            }
        } catch (error) {
            console.error("Error loading agency articles:", error);
        } finally {
            setIsLoadingArticles(false);
        }
    }, [tenantId]);

    // Get article by slug
    const getArticleBySlug = useCallback((slug: string): AgencyArticle | undefined => {
        return articles.find(a => a.slug === slug && a.status === 'published');
    }, [articles]);

    // Save article
    const saveArticle = useCallback(async (article: AgencyArticle) => {
        if (!tenantId) throw new Error('No tenant selected');

        try {
            const { id, createdAt, updatedAt, publishedAt, imageUrl, readTime, translationGroup, ...data } = article;
            const now = new Date().toISOString();

            // Calculate read time
            const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const newReadTime = Math.max(1, Math.ceil(wordCount / 200));

            const payload = {
                ...data,
                tenant_id: tenantId,
                image_url: getUsableImageUrl(imageUrl) || null,
                translation_group: translationGroup,
                read_time: newReadTime,
                published_at: article.status === 'published' && !publishedAt ? now : publishedAt,
            };

            // Remove undefined values
            const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

            if (id && id.length > 0) {
                // Update existing
                const { error } = await supabase
                    .from(TABLES.ARTICLES)
                    .update(cleanPayload)
                    .eq('id', id)
                    .eq('tenant_id', tenantId);
                    
                if (error) throw error;
            } else {
                // Create new
                const newId = `article_${Date.now()}`;
                const insertPayload = {
                    ...cleanPayload,
                    id: newId,
                    views: 0,
                };
                
                const { error } = await supabase
                    .from(TABLES.ARTICLES)
                    .insert([insertPayload]);
                    
                if (error) throw error;
            }
        } catch (error) {
            console.error("Error saving agency article:", error);
            throw error;
        }
    }, [tenantId]);

    // Delete article
    const deleteArticle = useCallback(async (id: string) => {
        if (!tenantId) return;

        try {
            const { error } = await supabase
                .from(TABLES.ARTICLES)
                .delete()
                .eq('id', id)
                .eq('tenant_id', tenantId);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting agency article:", error);
            throw error;
        }
    }, [tenantId]);

    // ==========================================================================
    // NAVIGATION
    // ==========================================================================

    // Load navigation with real-time updates
    useEffect(() => {
        if (!tenantId) return;
        
        setIsLoadingNavigation(true);

        const fetchInitialNavigation = async () => {
            const { data, error } = await supabase
                .from(TABLES.NAVIGATION)
                .select('*')
                .eq('id', 'main')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (!error && data) {
                setNavigation(data as AgencyNavigation);
            } else {
                setNavigation(DEFAULT_AGENCY_NAVIGATION);
            }
            setIsLoadingNavigation(false);
        };

        fetchInitialNavigation();

        const channel = supabase
            .channel(`public:agency_navigation:${tenantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.NAVIGATION, filter: `tenant_id=eq.${tenantId}` }, (payload) => {
                fetchInitialNavigation();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    // Manual load navigation
    const loadNavigation = useCallback(async () => {
        if (!tenantId) return;

        setIsLoadingNavigation(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.NAVIGATION)
                .select('*')
                .eq('id', 'main')
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (!error && data) {
                setNavigation(data as AgencyNavigation);
            } else {
                setNavigation(DEFAULT_AGENCY_NAVIGATION);
            }
        } catch (error) {
            console.error("Error loading agency navigation:", error);
            setNavigation(DEFAULT_AGENCY_NAVIGATION);
        } finally {
            setIsLoadingNavigation(false);
        }
    }, [tenantId]);

    // Save navigation
    const saveNavigation = useCallback(async (nav: AgencyNavigation) => {
        if (!tenantId) throw new Error('No tenant selected');

        try {
            const { error } = await supabase
                .from(TABLES.NAVIGATION)
                .upsert({
                    id: 'main',
                    tenant_id: tenantId,
                    links: nav.links,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error("Error saving agency navigation:", error);
            throw error;
        }
    }, [tenantId]);

    // ==========================================================================
    // LEGAL PAGES
    // ==========================================================================

    // Load legal pages with real-time updates
    useEffect(() => {
        if (!tenantId) return;

        setIsLoadingLegalPages(true);

        const fetchInitialPages = async () => {
            const { data, error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .select('*')
                .eq('tenant_id', tenantId)
                .order('type', { ascending: true });

            if (!error && data && data.length > 0) {
                const pagesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    lastUpdated: item.last_updated
                })) as AgencyLegalPage[];
                setLegalPages(pagesData);
            } else {
                setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            }
            setIsLoadingLegalPages(false);
        };

        fetchInitialPages();

        const channel = supabase
            .channel(`public:agency_legal_pages:${tenantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.LEGAL_PAGES, filter: `tenant_id=eq.${tenantId}` }, (payload) => {
                fetchInitialPages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    // Manual load legal pages
    const loadLegalPages = useCallback(async () => {
        if (!tenantId) return;

        setIsLoadingLegalPages(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .select('*')
                .eq('tenant_id', tenantId)
                .order('type', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                const pagesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    lastUpdated: item.last_updated
                })) as AgencyLegalPage[];
                setLegalPages(pagesData);
            } else {
                setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            }
        } catch (error) {
            console.error("Error loading agency legal pages:", error);
            setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
        } finally {
            setIsLoadingLegalPages(false);
        }
    }, [tenantId]);

    // Get legal page by type
    const getLegalPageByType = useCallback((type: AgencyLegalPageType): AgencyLegalPage | undefined => {
        const page = legalPages.find(p => p.type === type && p.status === 'published');

        if (!page) {
            if (type === 'privacy-policy') return DEFAULT_AGENCY_PRIVACY_POLICY;
            if (type === 'data-deletion') return DEFAULT_AGENCY_DATA_DELETION;
            if (type === 'terms-of-service') return DEFAULT_AGENCY_TERMS;
            if (type === 'cookie-policy') return DEFAULT_AGENCY_COOKIE_POLICY;
        }

        return page;
    }, [legalPages]);

    // Save legal page
    const saveLegalPage = useCallback(async (page: AgencyLegalPage) => {
        if (!tenantId) throw new Error('No tenant selected');

        try {
            const { id, createdAt, updatedAt, lastUpdated, ...data } = page;
            const now = new Date().toISOString();

            // Using type_language as document ID to match global content approach
            const docId = `${page.type}_${page.language || 'es'}`;
            
            const payload = {
                ...data,
                id: docId,
                tenant_id: tenantId,
                last_updated: now,
                updated_at: now,
                created_at: createdAt || now
            };

            const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));
            
            const { error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .upsert(cleanPayload);

            if (error) throw error;
        } catch (error) {
            console.error("Error saving agency legal page:", error);
            throw error;
        }
    }, [tenantId]);

    // Delete legal page
    const deleteLegalPage = useCallback(async (id: string) => {
        if (!tenantId) return;

        try {
            const { error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .delete()
                .eq('id', id)
                .eq('tenant_id', tenantId);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting agency legal page:", error);
            throw error;
        }
    }, [tenantId]);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const value: AgencyContentContextType = {
        // Articles
        articles,
        featuredArticles,
        isLoadingArticles,
        loadArticles,
        getArticleBySlug,
        saveArticle,
        deleteArticle,

        // Navigation
        navigation,
        isLoadingNavigation,
        loadNavigation,
        saveNavigation,

        // Legal Pages
        legalPages,
        isLoadingLegalPages,
        loadLegalPages,
        getLegalPageByType,
        saveLegalPage,
        deleteLegalPage,
    };

    return (
        <AgencyContentContext.Provider value={value}>
            {children}
        </AgencyContentContext.Provider>
    );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useAgencyContent = (): AgencyContentContextType => {
    const context = useContext(AgencyContentContext);
    if (context === undefined) {
        throw new Error('useAgencyContent must be used within an AgencyContentProvider');
    }
    return context;
};

// Safe version that returns undefined instead of throwing
export const useSafeAgencyContent = (): AgencyContentContextType | undefined => {
    return useContext(AgencyContentContext);
};

export default AgencyContentContext;
