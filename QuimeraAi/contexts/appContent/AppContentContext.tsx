/**
 * AppContentContext
 * Maneja el contenido global de la App Quimera:
 * - Artículos del blog/contenido público
 * - Navegación del landing page principal
 * - Configuración de secciones del landing
 * 
 * A diferencia del CMSContext, este contenido es GLOBAL (no por proyecto)
 * y se muestra en la landing page pública de Quimera.
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
    AppArticle,
    AppNavigation,
    AppLandingConfig,
    AppContentContextType,
    DEFAULT_APP_NAVIGATION,
    DEFAULT_APP_LANDING_CONFIG,
    LegalPage,
    LegalPageType,
    DEFAULT_PRIVACY_POLICY,
    DEFAULT_DATA_DELETION,
    DEFAULT_TERMS_OF_SERVICE,
    DEFAULT_COOKIE_POLICY,
    DEFAULT_PRIVACY_POLICY_EN,
    DEFAULT_DATA_DELETION_EN,
    DEFAULT_TERMS_OF_SERVICE_EN,
    DEFAULT_COOKIE_POLICY_EN,
} from '../../types/appContent';
import { supabase } from '../../supabase';

// =============================================================================
// UTILITY: Strip undefined values (Firestore rejects them)
// =============================================================================

function stripUndefined<T extends Record<string, any>>(obj: T): T {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            result[key] = stripUndefined(value);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}

const TABLES = {
    ARTICLES: 'app_articles',
    NAVIGATION: 'app_navigation',
    LANDING_CONFIG: 'app_landing_config',
    LEGAL_PAGES: 'app_legal_pages',
};

// =============================================================================
// CONTEXT
// =============================================================================

const AppContentContext = createContext<AppContentContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export const AppContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Articles State
    const [articles, setArticles] = useState<AppArticle[]>([]);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);

    // Navigation State
    const [navigation, setNavigation] = useState<AppNavigation | null>(null);
    const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);

    // Landing Config State
    const [landingConfig, setLandingConfig] = useState<AppLandingConfig | null>(null);
    const [isLoadingLandingConfig, setIsLoadingLandingConfig] = useState(false);

    // Legal Pages State
    const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
    const [isLoadingLegalPages, setIsLoadingLegalPages] = useState(false);

    // ==========================================================================
    // ARTICLES
    // ==========================================================================

    // Load articles with real-time updates
    useEffect(() => {
        setIsLoadingArticles(true);

        // Fetch initial data
        const fetchInitialArticles = async () => {
            const { data, error } = await supabase
                .from(TABLES.ARTICLES)
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Convert snake_case to camelCase mapping
                const articlesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    publishedAt: item.published_at,
                    imageUrl: item.image_url,
                    readTime: item.read_time,
                    translationGroup: item.translation_group,
                })) as AppArticle[];
                setArticles(articlesData);
            }
            setIsLoadingArticles(false);
        };

        fetchInitialArticles();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('public:app_articles')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.ARTICLES }, (payload) => {
                fetchInitialArticles(); // Simple refresh strategy for now
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Featured articles (published + featured flag)
    const featuredArticles = useMemo(() => {
        return articles
            .filter(a => a.status === 'published' && a.featured)
            .slice(0, 6);
    }, [articles]);

    // Manual load articles
    const loadArticles = useCallback(async () => {
        setIsLoadingArticles(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.ARTICLES)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data) {
                const articlesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    publishedAt: item.published_at,
                    imageUrl: item.image_url,
                    readTime: item.read_time,
                    translationGroup: item.translation_group,
                })) as AppArticle[];
                setArticles(articlesData);
            }
        } catch (error) {
            console.error("Error loading app articles:", error);
        } finally {
            setIsLoadingArticles(false);
        }
    }, []);

    // Get article by slug
    const getArticleBySlug = useCallback((slug: string): AppArticle | undefined => {
        return articles.find(a => a.slug === slug && a.status === 'published');
    }, [articles]);

    // Save article
    const saveArticle = useCallback(async (article: AppArticle): Promise<AppArticle> => {
        try {
            const { id, createdAt, updatedAt, publishedAt, imageUrl, readTime, translationGroup, ...data } = article;
            const now = new Date().toISOString();

            // Calculate read time (approx 200 words per minute)
            const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const newReadTime = Math.max(1, Math.ceil(wordCount / 200));

            const payload = stripUndefined({
                ...data,
                image_url: imageUrl,
                translation_group: translationGroup,
                read_time: newReadTime,
                published_at: article.status === 'published' && !publishedAt ? now : publishedAt,
            });

            let savedArticle: AppArticle;

            if (id && id.length > 0) {
                // Update existing
                const { error } = await supabase
                    .from(TABLES.ARTICLES)
                    .update(payload)
                    .eq('id', id);

                if (error) throw error;
                
                savedArticle = {
                    ...article,
                    readTime: newReadTime,
                    updatedAt: now,
                    publishedAt: payload.published_at
                } as AppArticle;
            } else {
                // Create new
                const newId = `article_${Date.now()}`;
                const insertPayload = {
                    ...payload,
                    id: newId,
                    views: 0,
                };
                
                const { error } = await supabase
                    .from(TABLES.ARTICLES)
                    .insert([insertPayload]);

                if (error) throw error;

                savedArticle = {
                    ...article,
                    id: newId,
                    readTime: newReadTime,
                    views: 0,
                    createdAt: now,
                    updatedAt: now,
                    publishedAt: payload.published_at
                } as AppArticle;
            }
            
            return savedArticle;
        } catch (error) {
            console.error("Error saving app article:", error);
            throw error;
        }
    }, []);

    // Get translations for an article by translationGroup
    const getArticleTranslations = useCallback((translationGroup: string): AppArticle[] => {
        if (!translationGroup) return [];
        return articles.filter(a => a.translationGroup === translationGroup);
    }, [articles]);

    // Delete article
    const deleteArticle = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from(TABLES.ARTICLES)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting app article:", error);
            throw error;
        }
    }, []);

    // ==========================================================================
    // NAVIGATION
    // ==========================================================================

    // Load navigation with real-time updates
    useEffect(() => {
        setIsLoadingNavigation(true);

        const fetchInitialNavigation = async () => {
            const { data, error } = await supabase
                .from(TABLES.NAVIGATION)
                .select('*')
                .eq('id', 'main')
                .maybeSingle();

            if (!error && data) {
                setNavigation(data as AppNavigation);
            } else {
                setNavigation(DEFAULT_APP_NAVIGATION);
            }
            setIsLoadingNavigation(false);
        };

        fetchInitialNavigation();

        const channel = supabase
            .channel('public:app_navigation')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.NAVIGATION, filter: 'id=eq.main' }, (payload) => {
                fetchInitialNavigation();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Manual load navigation
    const loadNavigation = useCallback(async () => {
        setIsLoadingNavigation(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.NAVIGATION)
                .select('*')
                .eq('id', 'main')
                .maybeSingle();

            if (!error && data) {
                setNavigation(data as AppNavigation);
            } else {
                setNavigation(DEFAULT_APP_NAVIGATION);
            }
        } catch (error) {
            console.error("Error loading app navigation:", error);
            setNavigation(DEFAULT_APP_NAVIGATION);
        } finally {
            setIsLoadingNavigation(false);
        }
    }, []);

    // Save navigation
    const saveNavigation = useCallback(async (nav: AppNavigation) => {
        try {
            const { error } = await supabase
                .from(TABLES.NAVIGATION)
                .upsert({
                    id: 'main',
                    links: nav.links,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error("Error saving app navigation:", error);
            throw error;
        }
    }, []);

    // ==========================================================================
    // LANDING CONFIG
    // ==========================================================================

    // Load landing config with real-time updates
    useEffect(() => {
        setIsLoadingLandingConfig(true);

        const fetchInitialConfig = async () => {
            const { data, error } = await supabase
                .from(TABLES.LANDING_CONFIG)
                .select('*')
                .eq('id', 'landing')
                .maybeSingle();

            if (!error && data) {
                setLandingConfig({
                    ...data,
                    heroTitle: data.hero_title,
                    heroSubtitle: data.hero_subtitle,
                    heroImage: data.hero_image,
                    ctaText: data.cta_text,
                    ctaLink: data.cta_link
                } as AppLandingConfig);
            } else {
                setLandingConfig(DEFAULT_APP_LANDING_CONFIG);
            }
            setIsLoadingLandingConfig(false);
        };

        fetchInitialConfig();

        const channel = supabase
            .channel('public:app_landing_config')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.LANDING_CONFIG, filter: 'id=eq.landing' }, (payload) => {
                fetchInitialConfig();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Manual load landing config
    const loadLandingConfig = useCallback(async () => {
        setIsLoadingLandingConfig(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.LANDING_CONFIG)
                .select('*')
                .eq('id', 'landing')
                .maybeSingle();

            if (!error && data) {
                setLandingConfig({
                    ...data,
                    heroTitle: data.hero_title,
                    heroSubtitle: data.hero_subtitle,
                    heroImage: data.hero_image,
                    ctaText: data.cta_text,
                    ctaLink: data.cta_link
                } as AppLandingConfig);
            } else {
                setLandingConfig(DEFAULT_APP_LANDING_CONFIG);
            }
        } catch (error) {
            console.error("Error loading landing config:", error);
            setLandingConfig(DEFAULT_APP_LANDING_CONFIG);
        } finally {
            setIsLoadingLandingConfig(false);
        }
    }, []);

    // Save landing config
    const saveLandingConfig = useCallback(async (config: AppLandingConfig) => {
        try {
            const payload = {
                id: 'landing',
                hero_title: config.heroTitle,
                hero_subtitle: config.heroSubtitle,
                hero_image: config.heroImage,
                features: config.features,
                cta_text: config.ctaText,
                cta_link: config.ctaLink,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from(TABLES.LANDING_CONFIG)
                .upsert(stripUndefined(payload));

            if (error) throw error;
        } catch (error) {
            console.error("Error saving landing config:", error);
            throw error;
        }
    }, []);

    // ==========================================================================
    // LEGAL PAGES
    // ==========================================================================

    // Load legal pages with real-time updates
    useEffect(() => {
        setIsLoadingLegalPages(true);

        const fetchInitialPages = async () => {
            const { data, error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .select('*')
                .order('type', { ascending: true });

            if (!error && data && data.length > 0) {
                const pagesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    lastUpdated: item.last_updated
                })) as LegalPage[];
                setLegalPages(pagesData);
            } else {
                setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
            }
            setIsLoadingLegalPages(false);
        };

        fetchInitialPages();

        const channel = supabase
            .channel('public:app_legal_pages')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.LEGAL_PAGES }, (payload) => {
                fetchInitialPages();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Manual load legal pages
    const loadLegalPages = useCallback(async () => {
        setIsLoadingLegalPages(true);
        try {
            const { data, error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .select('*')
                .order('type', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                const pagesData = data.map(item => ({
                    ...item,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at,
                    lastUpdated: item.last_updated
                })) as LegalPage[];
                setLegalPages(pagesData);
            } else {
                setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
            }
        } catch (error) {
            console.error("Error loading legal pages:", error);
            setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
        } finally {
            setIsLoadingLegalPages(false);
        }
    }, []);

    // Get legal page by type
    const getLegalPageByType = useCallback((type: LegalPageType, language?: string): LegalPage | undefined => {
        const targetLang = language || 'es'; // Default to 'es' as per existing content
        const page = legalPages.find(p => p.type === type && p.language === targetLang && p.status === 'published');

        // Return defaults if not found
        if (!page) {
            if (targetLang === 'en') {
                if (type === 'privacy-policy') return DEFAULT_PRIVACY_POLICY_EN;
                if (type === 'data-deletion') return DEFAULT_DATA_DELETION_EN;
                if (type === 'terms-of-service') return DEFAULT_TERMS_OF_SERVICE_EN;
                if (type === 'cookie-policy') return DEFAULT_COOKIE_POLICY_EN;
            } else {
                if (type === 'privacy-policy') return DEFAULT_PRIVACY_POLICY;
                if (type === 'data-deletion') return DEFAULT_DATA_DELETION;
                if (type === 'terms-of-service') return DEFAULT_TERMS_OF_SERVICE;
                if (type === 'cookie-policy') return DEFAULT_COOKIE_POLICY;
            }
        }

        return page;
    }, [legalPages]);

    // Save legal page
    const saveLegalPage = useCallback(async (page: LegalPage) => {
        try {
            const { id, createdAt, updatedAt, lastUpdated, ...data } = page;
            const now = new Date().toISOString();

            // Use type-lang as document ID for easy retrieval and multi-language support
            const docId = `${page.type}_${page.language || 'es'}`;
            
            const payload = stripUndefined({
                ...data,
                id: docId,
                last_updated: now,
                updated_at: now,
                created_at: createdAt || now
            });
            
            const { error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .upsert(payload);

            if (error) throw error;
        } catch (error) {
            console.error("Error saving legal page:", error);
            throw error;
        }
    }, []);

    // Delete legal page
    const deleteLegalPage = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from(TABLES.LEGAL_PAGES)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting legal page:", error);
            throw error;
        }
    }, []);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const value: AppContentContextType = {
        // Articles
        articles,
        featuredArticles,
        isLoadingArticles,
        loadArticles,
        getArticleBySlug,
        saveArticle,
        deleteArticle,
        getArticleTranslations,

        // Navigation
        navigation,
        isLoadingNavigation,
        loadNavigation,
        saveNavigation,

        // Landing Config
        landingConfig,
        isLoadingLandingConfig,
        loadLandingConfig,
        saveLandingConfig,

        // Legal Pages
        legalPages,
        isLoadingLegalPages,
        loadLegalPages,
        getLegalPageByType,
        saveLegalPage,
        deleteLegalPage,
    };

    return (
        <AppContentContext.Provider value={value}>
            {children}
        </AppContentContext.Provider>
    );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useAppContent = (): AppContentContextType => {
    const context = useContext(AppContentContext);
    if (context === undefined) {
        throw new Error('useAppContent must be used within an AppContentProvider');
    }
    return context;
};

// Safe version that returns undefined instead of throwing
export const useSafeAppContent = (): AppContentContextType | undefined => {
    return useContext(AppContentContext);
};

export default AppContentContext;

