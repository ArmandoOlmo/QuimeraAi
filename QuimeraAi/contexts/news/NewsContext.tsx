/**
 * NewsContext
 * Contexto para gestión de Noticias y Novedades
 * Incluye operaciones para Super Admin y feed de usuario en Dashboard
 */

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { supabase } from '../../supabase';
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

const TABLES = {
  NEWS: 'news_items',
  USER_STATES: 'news_user_states',
};

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
      const { data, error } = await supabase
        .from(TABLES.NEWS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let items = (data || []).map(item => ({
        ...item,
        body: item.content, // Map content to body for the UI
        cta: item.link_url || item.link_text ? { label: item.link_text || '', url: item.link_url || '' } : undefined,
        tags: item.tags || [],
        videoUrl: item.video_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        publishAt: item.publish_at,
        expireAt: item.expire_at,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        linkText: item.link_text,
        createdBy: item.created_by,
        updatedBy: item.updated_by,
        translationGroup: item.translation_group,
      })) as NewsItem[];

      // Apply filters client-side
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
        const newId = `news_${Date.now()}`;
        
        const payload = {
          id: newId,
          ...newsData,
          views: 0,
          clicks: 0,
          created_at: now,
          updated_at: now,
          created_by: user.id,
          content: newsData.body, // Reverse map body to content
          link_url: newsData.cta?.url,
          link_text: newsData.cta?.label,
          tags: newsData.tags || [],
          video_url: newsData.videoUrl,
          image_url: newsData.imageUrl,
          publish_at: newsData.publishAt,
          expire_at: newsData.expireAt,
          translation_group: newsData.translationGroup,
        };

        const cleanedPayload = removeUndefinedFields(payload as Record<string, unknown>);
        // Need to explicitly delete camelCase versions from cleanedPayload
        delete cleanedPayload.imageUrl;
        delete cleanedPayload.linkUrl;
        delete cleanedPayload.linkText;
        delete cleanedPayload.publishAt;
        delete cleanedPayload.expireAt;
        delete cleanedPayload.translationGroup;
        delete cleanedPayload.createdBy;
        delete cleanedPayload.body; // Remove UI fields before sending to Supabase
        delete cleanedPayload.cta;
        delete cleanedPayload.videoUrl;

        const { error } = await supabase
          .from(TABLES.NEWS)
          .insert([cleanedPayload]);

        if (error) throw error;

        const createdItem = { 
          ...newsData, 
          id: newId, 
          views: 0, 
          clicks: 0, 
          createdAt: now, 
          updatedAt: now, 
          createdBy: user.id 
        } as NewsItem;

        setNewsItems(prev => [createdItem, ...prev]);
        return newId;
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
        const now = new Date().toISOString();
        const payload: Record<string, unknown> = {
          ...updates,
          updated_at: now,
          updated_by: user.id,
        };
        
        if (updates.body !== undefined) payload.content = updates.body;
        if (updates.cta !== undefined) {
          payload.link_url = updates.cta.url;
          payload.link_text = updates.cta.label;
        }
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl;
        if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
        if (updates.publishAt !== undefined) payload.publish_at = updates.publishAt;
        if (updates.expireAt !== undefined) payload.expire_at = updates.expireAt;
        if (updates.translationGroup !== undefined) payload.translation_group = updates.translationGroup;

        const cleanedData = removeUndefinedFields(payload as Record<string, unknown>);
        delete cleanedData.imageUrl;
        delete cleanedData.linkUrl;
        delete cleanedData.linkText;
        delete cleanedData.publishAt;
        delete cleanedData.expireAt;
        delete cleanedData.translationGroup;
        delete cleanedData.updatedBy;
        delete cleanedData.createdBy;
        delete cleanedData.body;
        delete cleanedData.cta;
        delete cleanedData.videoUrl;

        const { error } = await supabase
          .from(TABLES.NEWS)
          .update(cleanedData)
          .eq('id', id);

        if (error) throw error;

        setNewsItems(prev =>
          prev.map(item => (item.id === id ? { ...item, ...updates, updatedAt: now, updatedBy: user.id } : item))
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
      const { error } = await supabase
        .from(TABLES.NEWS)
        .delete()
        .eq('id', id);

      if (error) throw error;
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
        const newId = `news_${Date.now()}`;
        
        const duplicatePayload = {
          id: newId,
          title: `${original.title} (copia)`,
          excerpt: original.excerpt,
          content: original.body || '',
          category: original.category,
          status: 'draft',
          priority: original.priority,
          featured: original.featured,
          targeting: original.targeting,
          language: original.language,
          tags: original.tags || [],
          views: 0,
          clicks: 0,
          created_at: now,
          updated_at: now,
          created_by: user.id,
          image_url: original.imageUrl,
          link_url: original.cta?.url,
          link_text: original.cta?.label,
          video_url: original.videoUrl,
          publish_at: original.publishAt,
          expire_at: original.expireAt,
          translation_group: original.translationGroup,
        };

        const cleanedDuplicate = removeUndefinedFields(duplicatePayload as Record<string, unknown>);

        const { error } = await supabase
          .from(TABLES.NEWS)
          .insert([cleanedDuplicate]);

        if (error) throw error;

        const createdItem = { 
          ...original, 
          id: newId, 
          title: `${original.title} (copia)`,
          status: 'draft',
          views: 0, 
          clicks: 0, 
          createdAt: now, 
          updatedAt: now, 
          createdBy: user.id 
        } as NewsItem;

        setNewsItems(prev => [createdItem, ...prev]);
        return newId;
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
      // 1. Fetch published news
      const { data: newsData, error: newsError } = await supabase
        .from(TABLES.NEWS)
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (newsError) throw newsError;

      const items = (newsData || []).map(item => ({
        ...item,
        body: item.content,
        cta: item.link_url || item.link_text ? { label: item.link_text || '', url: item.link_url || '' } : undefined,
        tags: item.tags || [],
        videoUrl: item.video_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        publishAt: item.publish_at,
        expireAt: item.expire_at,
        imageUrl: item.image_url,
        linkUrl: item.link_url,
        linkText: item.link_text,
        createdBy: item.created_by,
        updatedBy: item.updated_by,
        translationGroup: item.translation_group,
      })) as NewsItem[];

      // 2. Fetch user states
      const { data: statesData, error: statesError } = await supabase
        .from(TABLES.USER_STATES)
        .select('*')
        .eq('user_id', user.id);

      if (statesError) throw statesError;

      const statesMap: Record<string, NewsUserState> = {};
      (statesData || []).forEach(state => {
        statesMap[state.news_id] = {
          ...state,
          userId: state.user_id,
          newsId: state.news_id,
          readAt: state.read_at,
          dismissedAt: state.dismissed_at,
          clickedAt: state.clicked_at,
          createdAt: state.created_at,
          updatedAt: state.updated_at,
        } as NewsUserState;
      });

      setUserNews(items);
      setUserNewsStates(statesMap);
    } catch (err) {
      console.error('[NewsContext] Error fetching user news:', err);
    } finally {
      setIsLoadingUserNews(false);
    }
  }, [user]);

  const markAsRead = useCallback(
    async (newsId: string): Promise<void> => {
      if (!user) return;

      try {
        const stateId = `${user.id}_${newsId}`;
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];
        
        const payload = {
          id: stateId,
          user_id: user.id,
          news_id: newsId,
          read: true,
          read_at: now,
          updated_at: now,
        };

        const { error } = await supabase
          .from(TABLES.USER_STATES)
          .upsert(payload);
          
        if (error) throw error;

        // Increment view count if first read (rpc function would be better, but we can update directly for now or skip if complex)
        if (!existingState?.read) {
          // Simplistic counter update, in a real prod app use an RPC to avoid race conditions
          const newsItem = userNews.find(n => n.id === newsId);
          if (newsItem) {
             await supabase
              .from(TABLES.NEWS)
              .update({ views: (newsItem.views || 0) + 1 })
              .eq('id', newsId);
          }
        }

        const newState: NewsUserState = {
          id: stateId,
          userId: user.id,
          newsId,
          read: true,
          readAt: now,
          dismissed: existingState?.dismissed || false,
          dismissedAt: existingState?.dismissedAt || null,
          clicked: existingState?.clicked || false,
          clickedAt: existingState?.clickedAt || null,
          createdAt: existingState?.createdAt || now,
          updatedAt: now,
        };

        setUserNewsStates(prev => ({ ...prev, [newsId]: newState }));
      } catch (err: any) {
        console.error('[NewsContext] Error marking as read:', err);
      }
    },
    [user, userNewsStates, userNews]
  );

  const dismissNews = useCallback(
    async (newsId: string): Promise<void> => {
      if (!user) return;

      try {
        const stateId = `${user.id}_${newsId}`;
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];
        
        const payload = {
          id: stateId,
          user_id: user.id,
          news_id: newsId,
          dismissed: true,
          dismissed_at: now,
          updated_at: now,
        };

        const { error } = await supabase
          .from(TABLES.USER_STATES)
          .upsert(payload);
          
        if (error) throw error;

        const newState: NewsUserState = {
          id: stateId,
          userId: user.id,
          newsId,
          read: existingState?.read || true,
          readAt: existingState?.readAt || now,
          dismissed: true,
          dismissedAt: now,
          clicked: existingState?.clicked || false,
          clickedAt: existingState?.clickedAt || null,
          createdAt: existingState?.createdAt || now,
          updatedAt: now,
        };

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
        const stateId = `${user.id}_${newsId}`;
        const now = new Date().toISOString();

        const existingState = userNewsStates[newsId];

        // Only track first click
        if (!existingState?.clicked) {
          const payload = {
            id: stateId,
            user_id: user.id,
            news_id: newsId,
            clicked: true,
            clicked_at: now,
            updated_at: now,
          };

          const { error } = await supabase
            .from(TABLES.USER_STATES)
            .upsert(payload);
            
          if (error) throw error;

          // Increment click count
          const newsItem = userNews.find(n => n.id === newsId);
          if (newsItem) {
             await supabase
              .from(TABLES.NEWS)
              .update({ clicks: (newsItem.clicks || 0) + 1 })
              .eq('id', newsId);
          }

          const newState: NewsUserState = {
            id: stateId,
            userId: user.id,
            newsId,
            read: existingState?.read || true,
            readAt: existingState?.readAt || now,
            dismissed: existingState?.dismissed || false,
            dismissedAt: existingState?.dismissedAt || null,
            clicked: true,
            clickedAt: now,
            createdAt: existingState?.createdAt || now,
            updatedAt: now,
          };

          setUserNewsStates(prev => ({ ...prev, [newsId]: newState }));
        }
      } catch (err: any) {
        console.error('[NewsContext] Error tracking click:', err);
      }
    },
    [user, userNewsStates, userNews]
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
  // TRANSLATIONS
  // =============================================================================

  const getNewsTranslations = useCallback((translationGroup: string): NewsItem[] => {
    return newsItems.filter(item => item.translationGroup === translationGroup);
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

    // Translations
    getNewsTranslations,
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
