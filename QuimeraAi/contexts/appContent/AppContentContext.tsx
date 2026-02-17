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
} from '../../types/appContent';
import {
    db,
    doc,
    collection,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    getDoc,
} from '../../firebase';

// =============================================================================
// FIREBASE PATHS (Global, not per-user)
// =============================================================================

const COLLECTIONS = {
    ARTICLES: 'appContent/data/articles',
    NAVIGATION: 'appContent/data/navigation',
    LANDING_CONFIG: 'appContent/data/config',
    LEGAL_PAGES: 'appContent/data/legalPages',
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

        const q = query(
            collection(db, COLLECTIONS.ARTICLES),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AppArticle[];
            setArticles(articlesData);
            setIsLoadingArticles(false);
        }, (error) => {
            console.error("Error fetching app articles:", error);
            setIsLoadingArticles(false);
        });

        return () => unsubscribe();
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
            const q = query(
                collection(db, COLLECTIONS.ARTICLES),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const articlesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AppArticle[];
            setArticles(articlesData);
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
    const saveArticle = useCallback(async (article: AppArticle) => {
        try {
            const { id, ...data } = article;
            const now = new Date().toISOString();

            // Calculate read time (approx 200 words per minute)
            const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));

            if (id && id.length > 0) {
                // Update existing (using setDoc with merge to also handle pre-generated IDs)
                const articleRef = doc(db, COLLECTIONS.ARTICLES, id);
                await setDoc(articleRef, {
                    ...data,
                    id,
                    readTime,
                    updatedAt: now,
                    publishedAt: article.status === 'published' && !article.publishedAt ? now : article.publishedAt
                }, { merge: true });
            } else {
                // Create new
                const newId = `article_${Date.now()}`;
                const articleRef = doc(db, COLLECTIONS.ARTICLES, newId);
                await setDoc(articleRef, {
                    ...data,
                    id: newId,
                    readTime,
                    views: 0,
                    createdAt: now,
                    updatedAt: now,
                    publishedAt: article.status === 'published' ? now : null
                });
            }
        } catch (error) {
            console.error("Error saving app article:", error);
            throw error;
        }
    }, []);

    // Delete article
    const deleteArticle = useCallback(async (id: string) => {
        try {
            const articleRef = doc(db, COLLECTIONS.ARTICLES, id);
            await deleteDoc(articleRef);
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

        const navRef = doc(db, COLLECTIONS.NAVIGATION, 'main');

        const unsubscribe = onSnapshot(navRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setNavigation(docSnapshot.data() as AppNavigation);
            } else {
                // Initialize with defaults if not exists
                setNavigation(DEFAULT_APP_NAVIGATION);
            }
            setIsLoadingNavigation(false);
        }, (error) => {
            console.error("Error fetching app navigation:", error);
            setNavigation(DEFAULT_APP_NAVIGATION);
            setIsLoadingNavigation(false);
        });

        return () => unsubscribe();
    }, []);

    // Manual load navigation
    const loadNavigation = useCallback(async () => {
        setIsLoadingNavigation(true);
        try {
            const navRef = doc(db, COLLECTIONS.NAVIGATION, 'main');
            const docSnapshot = await getDoc(navRef);

            if (docSnapshot.exists()) {
                setNavigation(docSnapshot.data() as AppNavigation);
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
            const navRef = doc(db, COLLECTIONS.NAVIGATION, 'main');
            await setDoc(navRef, {
                ...nav,
                updatedAt: new Date().toISOString()
            });
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

        const configRef = doc(db, COLLECTIONS.LANDING_CONFIG, 'landing');

        const unsubscribe = onSnapshot(configRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setLandingConfig(docSnapshot.data() as AppLandingConfig);
            } else {
                setLandingConfig(DEFAULT_APP_LANDING_CONFIG);
            }
            setIsLoadingLandingConfig(false);
        }, (error) => {
            console.error("Error fetching landing config:", error);
            setLandingConfig(DEFAULT_APP_LANDING_CONFIG);
            setIsLoadingLandingConfig(false);
        });

        return () => unsubscribe();
    }, []);

    // Manual load landing config
    const loadLandingConfig = useCallback(async () => {
        setIsLoadingLandingConfig(true);
        try {
            const configRef = doc(db, COLLECTIONS.LANDING_CONFIG, 'landing');
            const docSnapshot = await getDoc(configRef);

            if (docSnapshot.exists()) {
                setLandingConfig(docSnapshot.data() as AppLandingConfig);
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
            const configRef = doc(db, COLLECTIONS.LANDING_CONFIG, 'landing');
            await setDoc(configRef, {
                ...config,
                updatedAt: new Date().toISOString()
            });
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

        const q = query(
            collection(db, COLLECTIONS.LEGAL_PAGES),
            orderBy('type', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pagesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LegalPage[];

            // If no pages exist, use defaults
            if (pagesData.length === 0) {
                setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
            } else {
                setLegalPages(pagesData);
            }
            setIsLoadingLegalPages(false);
        }, (error) => {
            console.error("Error fetching legal pages:", error);
            // Use defaults on error
            setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
            setIsLoadingLegalPages(false);
        });

        return () => unsubscribe();
    }, []);

    // Manual load legal pages
    const loadLegalPages = useCallback(async () => {
        setIsLoadingLegalPages(true);
        try {
            const q = query(
                collection(db, COLLECTIONS.LEGAL_PAGES),
                orderBy('type', 'asc')
            );
            const snapshot = await getDocs(q);
            const pagesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as LegalPage[];

            if (pagesData.length === 0) {
                setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
            } else {
                setLegalPages(pagesData);
            }
        } catch (error) {
            console.error("Error loading legal pages:", error);
            setLegalPages([DEFAULT_PRIVACY_POLICY, DEFAULT_DATA_DELETION, DEFAULT_TERMS_OF_SERVICE, DEFAULT_COOKIE_POLICY]);
        } finally {
            setIsLoadingLegalPages(false);
        }
    }, []);

    // Get legal page by type
    const getLegalPageByType = useCallback((type: LegalPageType): LegalPage | undefined => {
        const page = legalPages.find(p => p.type === type && p.status === 'published');

        // Return defaults if not found
        if (!page) {
            if (type === 'privacy-policy') return DEFAULT_PRIVACY_POLICY;
            if (type === 'data-deletion') return DEFAULT_DATA_DELETION;
            if (type === 'terms-of-service') return DEFAULT_TERMS_OF_SERVICE;
            if (type === 'cookie-policy') return DEFAULT_COOKIE_POLICY;
        }

        return page;
    }, [legalPages]);

    // Save legal page
    const saveLegalPage = useCallback(async (page: LegalPage) => {
        try {
            const { id, ...data } = page;
            const now = new Date().toISOString();

            // Use type as document ID for easy retrieval
            const pageRef = doc(db, COLLECTIONS.LEGAL_PAGES, page.type);
            await setDoc(pageRef, {
                ...data,
                id: page.type,
                lastUpdated: now,
                updatedAt: now,
                createdAt: page.createdAt || now
            });
        } catch (error) {
            console.error("Error saving legal page:", error);
            throw error;
        }
    }, []);

    // Delete legal page
    const deleteLegalPage = useCallback(async (id: string) => {
        try {
            const pageRef = doc(db, COLLECTIONS.LEGAL_PAGES, id);
            await deleteDoc(pageRef);
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

