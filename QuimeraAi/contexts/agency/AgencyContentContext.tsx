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
    onSnapshot,
    getDoc,
} from '../../firebase';
import { useTenant } from '../tenant/TenantContext';

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

    // ==========================================================================
    // FIRESTORE PATHS (Tenant-scoped)
    // ==========================================================================

    const getCollectionPath = useCallback((collectionName: string) => {
        if (!tenantId) return null;
        return `tenants/${tenantId}/agencyContent/${collectionName}`;
    }, [tenantId]);

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

        const articlesPath = `tenants/${tenantId}/agencyContent/data/articles`;
        const q = query(
            collection(db, articlesPath),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const articlesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AgencyArticle[];
            setArticles(articlesData);
            setIsLoadingArticles(false);
        }, (error) => {
            console.error("Error fetching agency articles:", error);
            setIsLoadingArticles(false);
        });

        return () => unsubscribe();
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
            const articlesPath = `tenants/${tenantId}/agencyContent/data/articles`;
            const q = query(
                collection(db, articlesPath),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const articlesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AgencyArticle[];
            setArticles(articlesData);
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
            const { id, ...data } = article;
            const now = new Date().toISOString();
            const articlesPath = `tenants/${tenantId}/agencyContent/data/articles`;

            // Calculate read time
            const wordCount = article.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const readTime = Math.max(1, Math.ceil(wordCount / 200));

            // Sanitize data to remove undefined values
            const cleanData = (obj: any): any => {
                const cleaned: any = {};
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                });
                return cleaned;
            };

            const commonData = {
                ...data,
                readTime,
                updatedAt: now,
                // Ensure optional fields are null if undefined/missing to avoid Firestore errors
                authorImage: data.authorImage || null,
                publishedAt: article.status === 'published' ? (article.publishedAt || now) : (article.publishedAt || null)
            };

            const sanitizedData = cleanData(commonData);

            if (id && id.length > 0) {
                // Update existing (using setDoc with merge to also handle pre-generated IDs)
                const articleRef = doc(db, articlesPath, id);
                await setDoc(articleRef, sanitizedData, { merge: true });
            } else {
                const newId = `article_${Date.now()}`;
                const articleRef = doc(db, articlesPath, newId);
                await setDoc(articleRef, {
                    ...sanitizedData,
                    id: newId,
                    views: 0,
                    createdAt: now,
                });
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
            const articlesPath = `tenants/${tenantId}/agencyContent/data/articles`;
            const articleRef = doc(db, articlesPath, id);
            await deleteDoc(articleRef);
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
        if (!tenantId) {
            setNavigation(DEFAULT_AGENCY_NAVIGATION);
            return;
        }

        setIsLoadingNavigation(true);

        const navPath = `tenants/${tenantId}/agencyContent`;
        const navRef = doc(db, navPath, 'navigation');

        const unsubscribe = onSnapshot(navRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                setNavigation(docSnapshot.data() as AgencyNavigation);
            } else {
                setNavigation(DEFAULT_AGENCY_NAVIGATION);
            }
            setIsLoadingNavigation(false);
        }, (error) => {
            console.error("Error fetching agency navigation:", error);
            setNavigation(DEFAULT_AGENCY_NAVIGATION);
            setIsLoadingNavigation(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    // Manual load navigation
    const loadNavigation = useCallback(async () => {
        if (!tenantId) return;

        setIsLoadingNavigation(true);
        try {
            const navPath = `tenants/${tenantId}/agencyContent`;
            const navRef = doc(db, navPath, 'navigation');
            const docSnapshot = await getDoc(navRef);

            if (docSnapshot.exists()) {
                setNavigation(docSnapshot.data() as AgencyNavigation);
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
            const navPath = `tenants/${tenantId}/agencyContent`;
            const navRef = doc(db, navPath, 'navigation');
            await setDoc(navRef, {
                ...nav,
                updatedAt: new Date().toISOString()
            });
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
        if (!tenantId) {
            setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            return;
        }

        setIsLoadingLegalPages(true);

        const legalPath = `tenants/${tenantId}/agencyContent/data/legalPages`;
        const q = query(
            collection(db, legalPath),
            orderBy('type', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pagesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AgencyLegalPage[];

            if (pagesData.length === 0) {
                setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            } else {
                setLegalPages(pagesData);
            }
            setIsLoadingLegalPages(false);
        }, (error) => {
            console.error("Error fetching agency legal pages:", error);
            setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            setIsLoadingLegalPages(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    // Manual load legal pages
    const loadLegalPages = useCallback(async () => {
        if (!tenantId) return;

        setIsLoadingLegalPages(true);
        try {
            const legalPath = `tenants/${tenantId}/agencyContent/data/legalPages`;
            const q = query(
                collection(db, legalPath),
                orderBy('type', 'asc')
            );
            const snapshot = await getDocs(q);
            const pagesData = snapshot.docs.map(docSnapshot => ({
                id: docSnapshot.id,
                ...docSnapshot.data()
            })) as AgencyLegalPage[];

            if (pagesData.length === 0) {
                setLegalPages([DEFAULT_AGENCY_PRIVACY_POLICY, DEFAULT_AGENCY_DATA_DELETION, DEFAULT_AGENCY_TERMS, DEFAULT_AGENCY_COOKIE_POLICY]);
            } else {
                setLegalPages(pagesData);
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
            const now = new Date().toISOString();
            const legalPath = `tenants/${tenantId}/agencyContent/data/legalPages`;
            const pageRef = doc(db, legalPath, page.type);
            await setDoc(pageRef, {
                ...page,
                id: page.type,
                lastUpdated: now,
                updatedAt: now,
                createdAt: page.createdAt || now
            });
        } catch (error) {
            console.error("Error saving agency legal page:", error);
            throw error;
        }
    }, [tenantId]);

    // Delete legal page
    const deleteLegalPage = useCallback(async (id: string) => {
        if (!tenantId) return;

        try {
            const legalPath = `tenants/${tenantId}/agencyContent/data/legalPages`;
            const pageRef = doc(db, legalPath, id);
            await deleteDoc(pageRef);
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
