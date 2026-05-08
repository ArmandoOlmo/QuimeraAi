/**
 * useChangelog Hook
 * Hook para gestionar el changelog desde Supabase
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  ChangelogEntry, 
  ChangelogTag, 
  ChangelogFilters,
  ChangelogConfig,
  DEFAULT_CHANGELOG_CONFIG
} from '../types/changelog';

const CHANGELOG_TABLE = 'changelogs';
const CONFIG_SETTINGS_ID = 'changelog_config';

// Hook público para leer changelog
export function useChangelog(filters?: ChangelogFilters) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChangelogConfig>(DEFAULT_CHANGELOG_CONFIG);

  // Subscribe to changelog entries
  useEffect(() => {
    setIsLoading(true);
    let isMounted = true;
    
    const fetchChangelogs = async () => {
      try {
        const { data, error } = await supabase
          .from(CHANGELOG_TABLE)
          .select('*')
          .eq('isPublished', true)
          .order('date', { ascending: false });

        if (!isMounted) return;

        if (error) throw error;

        if (data) {
          const changelogEntries: ChangelogEntry[] = data.map((doc: any) => ({
            id: doc.id,
            date: doc.date,
            tag: doc.tag,
            title: doc.title,
            title_en: doc.title_en,
            description: doc.description,
            description_en: doc.description_en,
            features: (doc.features || []).map((f: any) => ({
              ...f,
              title_en: f.title_en,
              description_en: f.description_en,
            })),
            imageUrl: doc.imageUrl || doc.image_url,
            imageAlt: doc.imageAlt || doc.image_alt,
            version: doc.version,
            isPublished: doc.isPublished || doc.is_published,
            createdAt: doc.createdAt || doc.created_at,
            updatedAt: doc.updatedAt || doc.updated_at,
            slug: doc.slug,
          }));
          setEntries(changelogEntries);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching changelog:', err);
        setError('Error loading changelog');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChangelogs();

    const channelId = `changelog_public_${Math.random().toString(36).substring(2, 9)}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: CHANGELOG_TABLE, filter: 'isPublished=eq.true' },
        () => {
          if (isMounted) fetchChangelogs();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  // Load config
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', CONFIG_SETTINGS_ID)
          .single();

        if (!isMounted) return;
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data && data.config) {
          setConfig({ ...DEFAULT_CHANGELOG_CONFIG, ...(data.config as ChangelogConfig) });
        }
      } catch (err) {
        if (isMounted) console.error('Error loading changelog config:', err);
      }
    };

    fetchConfig();

    const channelId = `changelog_config_${Math.random().toString(36).substring(2, 9)}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: `id=eq.${CONFIG_SETTINGS_ID}` },
        (payload) => {
          if (isMounted && payload.new && (payload.new as any).config) {
            setConfig({ ...DEFAULT_CHANGELOG_CONFIG, ...((payload.new as any).config as ChangelogConfig) });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  // Filter entries based on filters
  const filteredEntries = useMemo(() => {
    if (!filters) return entries;

    return entries.filter((entry) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(searchLower);
        const matchesDesc = entry.description.toLowerCase().includes(searchLower);
        const matchesFeatures = entry.features.some(
          (f) => 
            f.title.toLowerCase().includes(searchLower) || 
            f.description.toLowerCase().includes(searchLower)
        );
        if (!matchesTitle && !matchesDesc && !matchesFeatures) return false;
      }

      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        if (!filters.tags.includes(entry.tag)) return false;
      }

      // Year filter
      if (filters.year) {
        const entryYear = new Date(entry.date).getFullYear();
        if (entryYear !== filters.year) return false;
      }

      // Month filter
      if (filters.month !== undefined) {
        const entryMonth = new Date(entry.date).getMonth();
        if (entryMonth !== filters.month) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // Get entry by slug
  const getEntryBySlug = useCallback((slug: string): ChangelogEntry | undefined => {
    return entries.find((e) => e.slug === slug);
  }, [entries]);

  // Get available years for filtering
  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // Get tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<ChangelogTag, number> = {
      new: 0,
      improvement: 0,
      fix: 0,
      breaking: 0,
      security: 0,
      performance: 0,
      deprecated: 0,
      beta: 0,
    };
    entries.forEach((e) => {
      if (counts[e.tag] !== undefined) {
        counts[e.tag]++;
      }
    });
    return counts;
  }, [entries]);

  return {
    entries,
    filteredEntries,
    isLoading,
    error,
    config,
    getEntryBySlug,
    availableYears,
    tagCounts,
  };
}

// Hook para admin - gestionar changelog
export function useChangelogAdmin() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to ALL changelog entries (including unpublished)
  useEffect(() => {
    setIsLoading(true);
    let isMounted = true;
    
    const fetchChangelogs = async () => {
      try {
        const { data, error } = await supabase
          .from(CHANGELOG_TABLE)
          .select('*')
          .order('date', { ascending: false });

        if (!isMounted) return;

        if (error) throw error;

        if (data) {
          const changelogEntries: ChangelogEntry[] = data.map((doc: any) => ({
            id: doc.id,
            date: doc.date,
            tag: doc.tag,
            title: doc.title,
            title_en: doc.title_en,
            description: doc.description,
            description_en: doc.description_en,
            features: (doc.features || []).map((f: any) => ({
              ...f,
              title_en: f.title_en,
              description_en: f.description_en,
            })),
            imageUrl: doc.imageUrl || doc.image_url,
            imageAlt: doc.imageAlt || doc.image_alt,
            version: doc.version,
            isPublished: doc.isPublished ?? doc.is_published ?? true,
            createdAt: doc.createdAt || doc.created_at,
            updatedAt: doc.updatedAt || doc.updated_at,
            slug: doc.slug,
          }));
          setEntries(changelogEntries);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching changelog:', err);
        setError('Error loading changelog');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChangelogs();

    const channelId = `changelog_admin_${Math.random().toString(36).substring(2, 9)}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: CHANGELOG_TABLE },
        () => {
          if (isMounted) fetchChangelogs();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, []);

  // Generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Create new entry
  const createEntry = async (entry: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const now = new Date().toISOString();
      const slug = generateSlug(entry.title) + '-' + Date.now();
      
      // Remove any undefined values
      const sanitizedEntry: any = {};
      Object.keys(entry).forEach(key => {
        if ((entry as any)[key] !== undefined) {
          sanitizedEntry[key] = (entry as any)[key];
        }
      });
      
      const { data, error } = await supabase
        .from(CHANGELOG_TABLE)
        .insert({
          ...sanitizedEntry,
          slug,
          createdAt: now,
          updatedAt: now,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setIsSaving(false);
      return { id: data.id, slug };
    } catch (err) {
      console.error('Error creating changelog entry:', err);
      setError('Error creating entry');
      setIsSaving(false);
      throw err;
    }
  };

  // Update entry
  const updateEntry = async (id: string, updates: Partial<ChangelogEntry>) => {
    setIsSaving(true);
    setError(null);
    
    try {
      // If title changed, update slug
      let slug = updates.slug;
      if (updates.title && !updates.slug) {
        slug = generateSlug(updates.title) + '-' + Date.now();
      }
      
      const sanitizedUpdates: any = {};
      Object.keys(updates).forEach(key => {
        if ((updates as any)[key] !== undefined) {
          sanitizedUpdates[key] = (updates as any)[key];
        }
      });
      
      const { error } = await supabase
        .from(CHANGELOG_TABLE)
        .update({
          ...sanitizedUpdates,
          ...(slug && { slug }),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id);
        
      if (error) throw error;
      
      setIsSaving(false);
    } catch (err) {
      console.error('Error updating changelog entry:', err);
      setError('Error updating entry');
      setIsSaving(false);
      throw err;
    }
  };

  // Delete entry
  const deleteEntry = async (id: string) => {
    setIsSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from(CHANGELOG_TABLE)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      setIsSaving(false);
    } catch (err) {
      console.error('Error deleting changelog entry:', err);
      setError('Error deleting entry');
      setIsSaving(false);
      throw err;
    }
  };

  // Toggle publish status
  const togglePublish = async (id: string, isPublished: boolean) => {
    await updateEntry(id, { isPublished });
  };

  // Update config
  const updateConfig = async (configData: Partial<ChangelogConfig>) => {
    setIsSaving(true);
    try {
      const { data: existingData } = await supabase
        .from('settings')
        .select('config')
        .eq('id', CONFIG_SETTINGS_ID)
        .single();
        
      const mergedConfig = {
        ...DEFAULT_CHANGELOG_CONFIG,
        ...(existingData?.config as ChangelogConfig || {}),
        ...configData
      };
      
      const { error } = await supabase
        .from('settings')
        .upsert({
          id: CONFIG_SETTINGS_ID,
          config: mergedConfig,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      setIsSaving(false);
    } catch (err) {
      console.error('Error updating changelog config:', err);
      setIsSaving(false);
      throw err;
    }
  };

  return {
    entries,
    isLoading,
    isSaving,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    togglePublish,
    updateConfig,
  };
}

// Seed initial changelog data
export async function seedChangelog(): Promise<void> {
  const initialEntries: Omit<ChangelogEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      date: '2026-01-02',
      tag: 'new',
      title: 'Sistema de Changelog',
      description: 'Ahora puedes seguir todas las actualizaciones y mejoras de Quimera AI en tiempo real. Te mantenemos informado sobre nuevas funcionalidades, mejoras de rendimiento y correcciones.',
      features: [
        {
          id: '1',
          title: 'Búsqueda y Filtros',
          description: 'Encuentra rápidamente las actualizaciones que te interesan con nuestra búsqueda inteligente y filtros por categoría.',
        },
        {
          id: '2',
          title: 'Compartir en Redes',
          description: 'Comparte las novedades que más te gusten directamente en Twitter, LinkedIn o Reddit.',
        },
        {
          id: '3',
          title: 'Vista Expandible',
          description: 'Expande o colapsa cada entrada para ver más o menos detalles según tu preferencia.',
        },
      ],
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fchangelog-preview.png?alt=media',
      imageAlt: 'Vista previa del sistema de changelog',
      version: '2.0.0',
      isPublished: true,
      slug: 'sistema-de-changelog-2026',
    },
    {
      date: '2025-12-28',
      tag: 'improvement',
      title: 'Mejoras en el Editor Visual',
      description: 'Hemos optimizado significativamente el editor visual con nuevas herramientas de diseño y mejor rendimiento.',
      features: [
        {
          id: '1',
          title: 'Arrastrar y Soltar Mejorado',
          description: 'Reordena secciones de tu sitio web con fluidez y precisión mejoradas.',
        },
        {
          id: '2',
          title: 'Preview en Tiempo Real',
          description: 'Visualiza los cambios instantáneamente mientras editas cualquier elemento.',
        },
        {
          id: '3',
          title: 'Atajos de Teclado',
          description: 'Nuevos atajos para una edición más rápida: Ctrl+S para guardar, Ctrl+Z para deshacer.',
        },
      ],
      version: '1.9.5',
      isPublished: true,
      slug: 'mejoras-editor-visual-2025',
    },
    {
      date: '2025-12-20',
      tag: 'new',
      title: 'Integración con Ecommerce',
      description: 'Lanzamos nuestra nueva plataforma de ecommerce integrada. Ahora puedes crear tu tienda online directamente desde Quimera AI.',
      features: [
        {
          id: '1',
          title: 'Catálogo de Productos',
          description: 'Gestiona tu inventario con facilidad: añade productos, categorías, variantes y precios.',
        },
        {
          id: '2',
          title: 'Carrito de Compras',
          description: 'Carrito intuitivo con persistencia, descuentos y cálculo automático de envío.',
        },
        {
          id: '3',
          title: 'Checkout Seguro',
          description: 'Proceso de pago optimizado con múltiples métodos de pago integrados.',
        },
        {
          id: '4',
          title: 'Gestión de Pedidos',
          description: 'Panel completo para gestionar pedidos, envíos y devoluciones.',
        },
      ],
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fecommerce-preview.png?alt=media',
      imageAlt: 'Vista previa de la plataforma de ecommerce',
      version: '1.9.0',
      isPublished: true,
      slug: 'integracion-ecommerce-2025',
    },
    {
      date: '2025-12-15',
      tag: 'performance',
      title: 'Optimización de Velocidad',
      description: 'Mejoras significativas en el rendimiento de carga y la velocidad de respuesta de la aplicación.',
      features: [
        {
          id: '1',
          title: 'Carga 40% más Rápida',
          description: 'Optimización del bundle y lazy loading inteligente para tiempos de carga reducidos.',
        },
        {
          id: '2',
          title: 'Cache Inteligente',
          description: 'Sistema de caché mejorado para respuestas más rápidas en operaciones frecuentes.',
        },
      ],
      version: '1.8.5',
      isPublished: true,
      slug: 'optimizacion-velocidad-2025',
    },
    {
      date: '2025-12-10',
      tag: 'fix',
      title: 'Correcciones de Estabilidad',
      description: 'Corregimos varios errores reportados por la comunidad para mejorar la experiencia de usuario.',
      features: [
        {
          id: '1',
          title: 'Fix en Mobile',
          description: 'Corregido problema de scroll en dispositivos iOS Safari.',
        },
        {
          id: '2',
          title: 'Fix en Imágenes',
          description: 'Solucionado error al subir imágenes de gran tamaño.',
        },
        {
          id: '3',
          title: 'Fix en Autenticación',
          description: 'Corregido problema ocasional de cierre de sesión inesperado.',
        },
      ],
      version: '1.8.4',
      isPublished: true,
      slug: 'correcciones-estabilidad-2025',
    },
    {
      date: '2025-12-01',
      tag: 'security',
      title: 'Mejoras de Seguridad',
      description: 'Actualizaciones importantes de seguridad para proteger mejor tus datos y tu cuenta.',
      features: [
        {
          id: '1',
          title: 'Autenticación 2FA',
          description: 'Ahora puedes activar la autenticación de dos factores para mayor seguridad.',
        },
        {
          id: '2',
          title: 'Encriptación Mejorada',
          description: 'Implementación de encriptación AES-256 para datos sensibles.',
        },
      ],
      version: '1.8.3',
      isPublished: true,
      slug: 'mejoras-seguridad-2025',
    },
  ];

  try {
    // Check if changelog already has entries
    const { count, error: countError } = await supabase
      .from(CHANGELOG_TABLE)
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;
    
    if (count && count > 0) {
      console.log('Changelog already has entries, skipping seed');
      return;
    }

    // Seed entries
    const now = new Date().toISOString();
    for (const entry of initialEntries) {
      const sanitizedEntry: any = {};
      Object.keys(entry).forEach(key => {
        if ((entry as any)[key] !== undefined) {
          sanitizedEntry[key] = (entry as any)[key];
        }
      });
      
      await supabase.from(CHANGELOG_TABLE).insert({
        ...sanitizedEntry,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Save default config
    await supabase.from('settings').upsert({
      id: CONFIG_SETTINGS_ID,
      config: DEFAULT_CHANGELOG_CONFIG,
      updated_at: now
    });

    console.log('Changelog seeded successfully');
  } catch (err) {
    console.error('Error seeding changelog:', err);
  }
}

