/**
 * NewsContext
 * Contexto para gestión de Noticias y Novedades
 * Incluye operaciones para Super Admin y feed de usuario en Dashboard
 */

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import {
  db,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
  setDoc,
} from '../../firebase';
import { useAuth } from '../core/AuthContext';
import {
  NewsItem,
  NewsUserState,
  NewsFilters,
  NewsContextType,
  NewsStats,
  DEFAULT_NEWS_TARGETING,
} from '../../types/news';

const NewsContext = createContext<NewsContextType | undefined>(undefined);

// =============================================================================
// FIRESTORE COLLECTIONS
// =============================================================================
const NEWS_COLLECTION = 'news';
const NEWS_USER_STATES_COLLECTION = 'newsUserStates';

// =============================================================================
// PROVIDER
// =============================================================================
export const NewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userDocument } = useAuth();

  // Super Admin State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Dashboard State
  const [userNews, setUserNews] = useState<NewsItem[]>([]);
  const [userNewsStates, setUserNewsStates] = useState<Record<string, NewsUserState>>({});
  const [isLoadingUserNews, setIsLoadingUserNews] = useState(false);

  // =============================================================================
  // SUPER ADMIN OPERATIONS
  // =============================================================================

  const fetchNews = useCallback(async (filters?: NewsFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      let q = query(collection(db, NEWS_COLLECTION), orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as NewsItem[];

      // Apply filters client-side (Firestore limitations)
      if (filters) {
        if (filters.status) {
          items = items.filter(item => item.status === filters.status);
        }
        if (filters.category) {
          items = items.filter(item => item.category === filters.category);
        }
        if (filters.featured !== undefined) {
          items = items.filter(item => item.featured === filters.featured);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          items = items.filter(
            item =>
              item.title.toLowerCase().includes(searchLower) ||
              item.excerpt.toLowerCase().includes(searchLower)
          );
        }
      }

      setNewsItems(items);
    } catch (err: any) {
      console.error('[NewsContext] Error fetching news:', err);
      setError(err.message || 'Error al cargar noticias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper to remove undefined fields recursively (Firestore doesn't accept undefined values)
  const removeUndefinedFields = (obj: Record<string, unknown>): Record<string, unknown> => {
    const cleaned: Record<string, unknown> = { ...obj };
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      if (value === undefined) {
        delete cleaned[key];
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively clean nested objects
        cleaned[key] = removeUndefinedFields(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        // Filter out undefined from arrays and clean nested objects
        cleaned[key] = value
          .filter(item => item !== undefined)
          .map(item =>
            item !== null && typeof item === 'object'
              ? removeUndefinedFields(item as Record<string, unknown>)
              : item
          );
      }
    });
    return cleaned;
  };

  const createNews = useCallback(
    async (newsData: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'>): Promise<string> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const now = new Date().toISOString();
        const newItem: Omit<NewsItem, 'id'> = {
          ...newsData,
          views: 0,
          clicks: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
        };

        // Remove undefined fields before saving to Firestore
        const cleanedItem = removeUndefinedFields(newItem as Record<string, unknown>);

        const docRef = await addDoc(collection(db, NEWS_COLLECTION), cleanedItem);
        const createdItem = { ...newItem, id: docRef.id } as NewsItem;

        setNewsItems(prev => [createdItem, ...prev]);
        return docRef.id;
      } catch (err: any) {
        console.error('[NewsContext] Error creating news:', err);
        throw new Error(err.message || 'Error al crear noticia');
      }
    },
    [user]
  );

  const updateNews = useCallback(
    async (id: string, updates: Partial<NewsItem>): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const docRef = doc(db, NEWS_COLLECTION, id);
        const updateData = {
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        };

        // Remove undefined fields before saving to Firestore
        const cleanedData = removeUndefinedFields(updateData as Record<string, unknown>);

        await updateDoc(docRef, cleanedData);

        setNewsItems(prev =>
          prev.map(item => (item.id === id ? { ...item, ...updateData } : item))
        );
      } catch (err: any) {
        console.error('[NewsContext] Error updating news:', err);
        throw new Error(err.message || 'Error al actualizar noticia');
      }
    },
    [user]
  );

  const deleteNews = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, NEWS_COLLECTION, id));
      setNewsItems(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error('[NewsContext] Error deleting news:', err);
      throw new Error(err.message || 'Error al eliminar noticia');
    }
  }, []);

  const duplicateNews = useCallback(
    async (id: string): Promise<string> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const original = newsItems.find(item => item.id === id);
        if (!original) throw new Error('Noticia no encontrada');

        const now = new Date().toISOString();
        const duplicate: Omit<NewsItem, 'id'> = {
          ...original,
          title: `${original.title} (copia)`,
          status: 'draft',
          views: 0,
          clicks: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: user.uid,
        };

        // Remove undefined fields before saving to Firestore
        const cleanedDuplicate = removeUndefinedFields(duplicate as Record<string, unknown>);

        const docRef = await addDoc(collection(db, NEWS_COLLECTION), cleanedDuplicate);
        const createdItem = { ...duplicate, id: docRef.id } as NewsItem;

        setNewsItems(prev => [createdItem, ...prev]);
        return docRef.id;
      } catch (err: any) {
        console.error('[NewsContext] Error duplicating news:', err);
        throw new Error(err.message || 'Error al duplicar noticia');
      }
    },
    [user, newsItems]
  );

  // =============================================================================
  // USER DASHBOARD OPERATIONS
  // =============================================================================

  const fetchUserNews = useCallback(async () => {
    if (!user) return;

    setIsLoadingUserNews(true);

    try {
      // Fetch all published news
      const now = new Date().toISOString();
      const q = query(
        collection(db, NEWS_COLLECTION),
        where('status', '==', 'published'),
        orderBy('priority', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as NewsItem[];

      // Filter by publish date and expiry
      items = items.filter(item => {
        const publishOk = !item.publishAt || item.publishAt <= now;
        const expireOk = !item.expireAt || item.expireAt > now;
        return publishOk && expireOk;
      });

      // Filter by targeting
      const userRole = userDocument?.role || 'user';
      const userPlan = userDocument?.plan || 'free';
      const userTenantId = userDocument?.tenantId;

      items = items.filter(item => {
        const { targeting } = item;
        if (targeting.type === 'all') return true;
        if (targeting.type === 'roles' && targeting.roles?.includes(userRole)) return true;
        if (targeting.type === 'plans' && targeting.plans?.includes(userPlan)) return true;
        if (targeting.type === 'tenants' && userTenantId && targeting.tenantIds?.includes(userTenantId)) return true;
        return false;
      });

      // Fetch user states
      const statesQ = query(
        collection(db, NEWS_USER_STATES_COLLECTION),
        where('userId', '==', user.uid)
      );
      const statesSnapshot = await getDocs(statesQ);
      const states: Record<string, NewsUserState> = {};
      statesSnapshot.docs.forEach(docSnapshot => {
        const state = { id: docSnapshot.id, ...docSnapshot.data() } as NewsUserState;
        states[state.newsId] = state;
      });

      // Filter out dismissed news
      items = items.filter(item => !states[item.id]?.dismissed);

      setUserNews(items);
      setUserNewsStates(states);
    } catch (err: any) {
      console.error('[NewsContext] Error fetching user news:', err);
    } finally {
      setIsLoadingUserNews(false);
    }
  }, [user, userDocument]);

  const markAsRead = useCallback(
    async (newsId: string): Promise<void> => {
      if (!user) return;

      try {
        const stateId = `${user.uid}_${newsId}`;
        const stateRef = doc(db, NEWS_USER_STATES_COLLECTION, stateId);
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];
        const newState: NewsUserState = {
          id: stateId,
          userId: user.uid,
          newsId,
          read: true,
          readAt: now,
          dismissed: existingState?.dismissed || false,
          dismissedAt: existingState?.dismissedAt,
          clicked: existingState?.clicked || false,
          clickedAt: existingState?.clickedAt,
          createdAt: existingState?.createdAt || now,
          updatedAt: now,
        };

        await setDoc(stateRef, newState);

        // Increment view count if first read
        if (!existingState?.read) {
          const newsRef = doc(db, NEWS_COLLECTION, newsId);
          await updateDoc(newsRef, { views: increment(1) });
        }

        setUserNewsStates(prev => ({ ...prev, [newsId]: newState }));
      } catch (err: any) {
        console.error('[NewsContext] Error marking as read:', err);
      }
    },
    [user, userNewsStates]
  );

  const dismissNews = useCallback(
    async (newsId: string): Promise<void> => {
      if (!user) return;

      try {
        const stateId = `${user.uid}_${newsId}`;
        const stateRef = doc(db, NEWS_USER_STATES_COLLECTION, stateId);
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];
        const newState: NewsUserState = {
          id: stateId,
          userId: user.uid,
          newsId,
          read: existingState?.read || true,
          readAt: existingState?.readAt || now,
          dismissed: true,
          dismissedAt: now,
          clicked: existingState?.clicked || false,
          clickedAt: existingState?.clickedAt,
          createdAt: existingState?.createdAt || now,
          updatedAt: now,
        };

        await setDoc(stateRef, newState);

        setUserNewsStates(prev => ({ ...prev, [newsId]: newState }));
        setUserNews(prev => prev.filter(item => item.id !== newsId));
      } catch (err: any) {
        console.error('[NewsContext] Error dismissing news:', err);
      }
    },
    [user, userNewsStates]
  );

  const trackClick = useCallback(
    async (newsId: string): Promise<void> => {
      if (!user) return;

      try {
        const stateId = `${user.uid}_${newsId}`;
        const stateRef = doc(db, NEWS_USER_STATES_COLLECTION, stateId);
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];

        // Only track first click
        if (!existingState?.clicked) {
          const newState: NewsUserState = {
            id: stateId,
            userId: user.uid,
            newsId,
            read: existingState?.read || true,
            readAt: existingState?.readAt || now,
            dismissed: existingState?.dismissed || false,
            dismissedAt: existingState?.dismissedAt,
            clicked: true,
            clickedAt: now,
            createdAt: existingState?.createdAt || now,
            updatedAt: now,
          };

          await setDoc(stateRef, newState);

          // Increment click count
          const newsRef = doc(db, NEWS_COLLECTION, newsId);
          await updateDoc(newsRef, { clicks: increment(1) });

          setUserNewsStates(prev => ({ ...prev, [newsId]: newState }));
        }
      } catch (err: any) {
        console.error('[NewsContext] Error tracking click:', err);
      }
    },
    [user, userNewsStates]
  );

  // =============================================================================
  // STATS
  // =============================================================================

  const getNewsStats = useCallback((): NewsStats => {
    return {
      total: newsItems.length,
      published: newsItems.filter(item => item.status === 'published').length,
      draft: newsItems.filter(item => item.status === 'draft').length,
      scheduled: newsItems.filter(item => item.status === 'scheduled').length,
      archived: newsItems.filter(item => item.status === 'archived').length,
      featured: newsItems.filter(item => item.featured).length,
    };
  }, [newsItems]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value: NewsContextType = {
    // Super Admin
    newsItems,
    isLoading,
    error,
    fetchNews,
    createNews,
    updateNews,
    deleteNews,
    duplicateNews,

    // User Dashboard
    userNews,
    userNewsStates,
    isLoadingUserNews,
    fetchUserNews,
    markAsRead,
    dismissNews,
    trackClick,

    // Stats
    getNewsStats,
  };

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

// =============================================================================
// HOOK
// =============================================================================

export const useNews = (): NewsContextType => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
};

export default NewsContext;
