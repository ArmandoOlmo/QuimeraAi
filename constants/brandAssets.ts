/**
 * Brand Assets - Pre-seeded images for the Super Admin Image Library
 * These assets are read-only and cannot be deleted
 */

export interface BrandAsset {
    id: string;
    name: string;
    folder: string;
    downloadURL: string;
    type: string;
    size: number;
    isSystemAsset: boolean;
}

export interface AssetFolder {
    id: string;
    name: string;
    icon: string;
    description?: string;
    isSystemFolder?: boolean;
}

// Default folders for the image library
export const DEFAULT_FOLDERS: AssetFolder[] = [
    { id: 'all', name: 'Todas las Imágenes', icon: 'grid', description: 'Ver todas las imágenes' },
    { id: 'brand', name: 'Marca', icon: 'star', description: 'Logos e iconos de la marca', isSystemFolder: true },
    { id: 'icons', name: 'Iconos', icon: 'shapes', description: 'Iconos y símbolos' },
    { id: 'backgrounds', name: 'Fondos', icon: 'image', description: 'Fondos y patrones' },
    { id: 'previews', name: 'Previews', icon: 'layout', description: 'Imágenes de preview', isSystemFolder: true },
    { id: 'uploads', name: 'Subidas', icon: 'upload', description: 'Imágenes subidas por usuarios' },
    { id: 'generated', name: 'Generadas con IA', icon: 'sparkles', description: 'Imágenes generadas con IA' },
];

// Firebase Storage base URL
const FIREBASE_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o';

// Quimera app brand assets
export const BRAND_ASSETS: BrandAsset[] = [
    // Main Logo
    {
        id: 'brand-quimera-logo',
        name: 'Quimera Logo',
        folder: 'brand',
        downloadURL: `${FIREBASE_STORAGE_BASE}/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032`,
        type: 'image/png',
        size: 50000,
        isSystemAsset: true,
    },
    // Preview Images
    {
        id: 'preview-changelog',
        name: 'Changelog Preview',
        folder: 'previews',
        downloadURL: `${FIREBASE_STORAGE_BASE}/quimera%2Fchangelog-preview.png?alt=media`,
        type: 'image/png',
        size: 120000,
        isSystemAsset: true,
    },
    {
        id: 'preview-ecommerce',
        name: 'E-commerce Preview',
        folder: 'previews',
        downloadURL: `${FIREBASE_STORAGE_BASE}/quimera%2Fecommerce-preview.png?alt=media`,
        type: 'image/png',
        size: 150000,
        isSystemAsset: true,
    },
];

// Helper to get assets by folder
export const getAssetsByFolder = (folderId: string): BrandAsset[] => {
    if (folderId === 'all') return BRAND_ASSETS;
    return BRAND_ASSETS.filter(asset => asset.folder === folderId);
};

// Export main logo URL for convenience
export const QUIMERA_LOGO_URL = BRAND_ASSETS.find(a => a.id === 'brand-quimera-logo')?.downloadURL || '';
