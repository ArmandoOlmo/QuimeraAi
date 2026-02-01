/**
 * Changelog Types
 * Sistema de changelog automatizado para Quimera AI
 */

// Tipos de etiquetas para las entradas del changelog
export type ChangelogTag = 
  | 'new' 
  | 'improvement' 
  | 'fix' 
  | 'breaking' 
  | 'security' 
  | 'performance' 
  | 'deprecated'
  | 'beta';

// Colores asociados a cada tipo de etiqueta
export const CHANGELOG_TAG_COLORS: Record<ChangelogTag, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  improvement: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  fix: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  breaking: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  security: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  performance: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  deprecated: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  beta: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

// Nombres en español de las etiquetas
export const CHANGELOG_TAG_LABELS: Record<ChangelogTag, { en: string; es: string }> = {
  new: { en: 'New', es: 'Nuevo' },
  improvement: { en: 'Improvement', es: 'Mejora' },
  fix: { en: 'Fix', es: 'Corrección' },
  breaking: { en: 'Breaking', es: 'Cambio Mayor' },
  security: { en: 'Security', es: 'Seguridad' },
  performance: { en: 'Performance', es: 'Rendimiento' },
  deprecated: { en: 'Deprecated', es: 'Obsoleto' },
  beta: { en: 'Beta', es: 'Beta' },
};

// Feature item dentro de una entrada del changelog
export interface ChangelogFeature {
  id: string;
  title: string;
  description: string;
}

// Entrada individual del changelog
export interface ChangelogEntry {
  id: string;
  date: string; // ISO date string
  tag: ChangelogTag;
  title: string;
  description: string;
  features: ChangelogFeature[];
  imageUrl?: string;
  imageAlt?: string;
  version?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string; // URL-friendly identifier
}

// Estado del hook de changelog
export interface ChangelogState {
  entries: ChangelogEntry[];
  filteredEntries: ChangelogEntry[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  selectedTags: ChangelogTag[];
  currentPage: number;
  totalPages: number;
  entriesPerPage: number;
}

// Filtros disponibles para el changelog
export interface ChangelogFilters {
  search: string;
  tags: ChangelogTag[];
  year?: number;
  month?: number;
}

// Props para el componente de entrada del changelog
export interface ChangelogEntryProps {
  entry: ChangelogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyLink: () => void;
  onShare: (platform: 'twitter' | 'reddit' | 'linkedin') => void;
}

// Configuración del changelog para el admin
export interface ChangelogConfig {
  entriesPerPage: number;
  showVersions: boolean;
  enableSharing: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
  defaultExpanded: boolean;
}

// Default config
export const DEFAULT_CHANGELOG_CONFIG: ChangelogConfig = {
  entriesPerPage: 10,
  showVersions: true,
  enableSharing: true,
  enableSearch: true,
  enableFilters: true,
  defaultExpanded: true,
};

