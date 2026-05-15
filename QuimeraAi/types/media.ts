/**
 * Media Asset Types
 * Unified types replacing AdminAssetCategory/AdminAssetRecord from FilesContext.
 */

export type MediaCategory =
    | 'brand'
    | 'template'
    | 'article'
    | 'hero'
    | 'background'
    | 'icon'
    | 'component'
    | 'people'
    | 'product'
    | 'ai_generated'
    | 'other';

export interface MediaAssetRecord {
    id: string;
    name: string;
    url: string;
    downloadURL: string;
    size: number;
    type: string;
    category: MediaCategory;
    folderPath?: string;
    tags?: string[];
    description?: string;
    isAiGenerated?: boolean;
    aiPrompt?: string;
    isSystemAsset?: boolean;
    usedIn?: string[];
    usageCount?: number;
    storagePath?: string;
    createdAt: string;
    updatedAt?: string;
    uploadedBy?: string;
    metadata?: Record<string, any>;
}

export interface MediaCategoryConfig {
    id: MediaCategory;
    label: string;
    icon: string;
    color: string;
    storageFolder: string;
    isSystem?: boolean;
}

export const MEDIA_CATEGORIES: MediaCategoryConfig[] = [
    { id: 'brand',       label: 'Marca',            icon: 'Star',       color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',           storageFolder: 'media/brand',       isSystem: true },
    { id: 'template',    label: 'Templates',         icon: 'Grid',       color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',        storageFolder: 'media/templates' },
    { id: 'article',     label: 'Articulos',         icon: 'FileText',   color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',                 storageFolder: 'media/articles' },
    { id: 'hero',        label: 'Hero / Banner',     icon: 'ImageIcon',  color: 'bg-orange-500/10 text-orange-500 border-orange-500/30',           storageFolder: 'media/heroes' },
    { id: 'background',  label: 'Fondos',            icon: 'Palette',    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',           storageFolder: 'media/backgrounds' },
    { id: 'icon',        label: 'Iconos',            icon: 'Sparkles',   color: 'bg-pink-500/10 text-pink-500 border-pink-500/30',                storageFolder: 'media/icons' },
    { id: 'component',   label: 'Componentes',       icon: 'Layout',     color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',          storageFolder: 'media/components' },
    { id: 'people',      label: 'Personas',           icon: 'User',       color: 'bg-teal-500/10 text-teal-500 border-teal-500/30',                storageFolder: 'media/people' },
    { id: 'product',     label: 'Productos',          icon: 'ShoppingBag', color: 'bg-rose-500/10 text-rose-500 border-rose-500/30',              storageFolder: 'media/products' },
    { id: 'ai_generated', label: 'IA Generadas',     icon: 'Wand2',      color: 'bg-violet-500/10 text-violet-500 border-violet-500/30',          storageFolder: 'media/ai-generated' },
    { id: 'other',       label: 'Otros',             icon: 'FolderOpen',  color: 'bg-gray-500/10 text-gray-500 border-gray-500/30',                storageFolder: 'media/other' },
];

export const MEDIA_CATEGORY_MAP: Record<MediaCategory, MediaCategoryConfig> = Object.fromEntries(
    MEDIA_CATEGORIES.map(c => [c.id, c])
) as Record<MediaCategory, MediaCategoryConfig>;

export const LEGACY_CATEGORY_MAP: Record<string, MediaCategory> = {
    'article': 'article',
    'component': 'component',
    'template': 'template',
    'hero': 'hero',
    'icon': 'icon',
    'background': 'background',
    'logo': 'brand',
    'testimonial': 'people',
    'team': 'people',
    'product': 'product',
    'ai_generated': 'ai_generated',
    'other': 'other',
};
