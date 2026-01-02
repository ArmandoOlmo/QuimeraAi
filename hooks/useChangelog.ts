/**
 * useChangelog Hook
 * Hook para gestionar el changelog desde Firestore
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ChangelogEntry, 
  ChangelogTag, 
  ChangelogFilters,
  ChangelogConfig,
  DEFAULT_CHANGELOG_CONFIG
} from '../types/changelog';

const CHANGELOG_COLLECTION = 'changelog';
const CONFIG_DOC = 'config';

// Hook público para leer changelog
export function useChangelog(filters?: ChangelogFilters) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ChangelogConfig>(DEFAULT_CHANGELOG_CONFIG);

  // Subscribe to changelog entries
  useEffect(() => {
    setIsLoading(true);
    
    const q = query(
      collection(db, CHANGELOG_COLLECTION),
      where('isPublished', '==', true),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const changelogEntries: ChangelogEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          changelogEntries.push({
            id: doc.id,
            date: data.date,
            tag: data.tag,
            title: data.title,
            description: data.description,
            features: data.features || [],
            imageUrl: data.imageUrl,
            imageAlt: data.imageAlt,
            version: data.version,
            isPublished: data.isPublished,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            slug: data.slug,
          });
        });
        setEntries(changelogEntries);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching changelog:', err);
        setError('Error loading changelog');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configRef = doc(db, CHANGELOG_COLLECTION, CONFIG_DOC);
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
          if (docSnap.exists()) {
            setConfig({ ...DEFAULT_CHANGELOG_CONFIG, ...docSnap.data() as ChangelogConfig });
          }
        });
        return unsubscribe;
      } catch (err) {
        console.error('Error loading changelog config:', err);
      }
    };
    loadConfig();
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
      counts[e.tag]++;
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
    
    const q = query(
      collection(db, CHANGELOG_COLLECTION),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const changelogEntries: ChangelogEntry[] = [];
        snapshot.forEach((docSnap) => {
          // Skip config document
          if (docSnap.id === CONFIG_DOC) return;
          
          const data = docSnap.data();
          changelogEntries.push({
            id: docSnap.id,
            date: data.date,
            tag: data.tag,
            title: data.title,
            description: data.description,
            features: data.features || [],
            imageUrl: data.imageUrl,
            imageAlt: data.imageAlt,
            version: data.version,
            isPublished: data.isPublished ?? true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            slug: data.slug,
          });
        });
        setEntries(changelogEntries);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching changelog:', err);
        setError('Error loading changelog');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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
      const docRef = doc(collection(db, CHANGELOG_COLLECTION));
      
      await setDoc(docRef, {
        ...entry,
        slug,
        createdAt: now,
        updatedAt: now,
      });
      
      setIsSaving(false);
      return { id: docRef.id, slug };
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
      const docRef = doc(db, CHANGELOG_COLLECTION, id);
      
      // If title changed, update slug
      let slug = updates.slug;
      if (updates.title && !updates.slug) {
        slug = generateSlug(updates.title) + '-' + Date.now();
      }
      
      await setDoc(docRef, {
        ...updates,
        ...(slug && { slug }),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
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
      await deleteDoc(doc(db, CHANGELOG_COLLECTION, id));
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
  const updateConfig = async (config: Partial<ChangelogConfig>) => {
    setIsSaving(true);
    try {
      const configRef = doc(db, CHANGELOG_COLLECTION, CONFIG_DOC);
      await setDoc(configRef, config, { merge: true });
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

  // Check if changelog already has entries
  const existingDocs = await getDocs(collection(db, CHANGELOG_COLLECTION));
  const hasEntries = existingDocs.docs.some(doc => doc.id !== CONFIG_DOC);
  
  if (hasEntries) {
    console.log('Changelog already has entries, skipping seed');
    return;
  }

  // Seed entries
  const now = new Date().toISOString();
  for (const entry of initialEntries) {
    const docRef = doc(collection(db, CHANGELOG_COLLECTION));
    await setDoc(docRef, {
      ...entry,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Save default config
  await setDoc(doc(db, CHANGELOG_COLLECTION, CONFIG_DOC), DEFAULT_CHANGELOG_CONFIG);

  console.log('Changelog seeded successfully');
}

