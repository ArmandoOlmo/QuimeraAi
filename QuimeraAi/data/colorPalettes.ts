/**
 * Color Palettes - Paletas de colores predefinidas para facilitar la creación de websites
 */

import { GlobalColors } from '../types';

export interface ColorPalette {
    id: string;
    name: string;
    nameEs: string;
    description: string;
    descriptionEs: string;
    preview: string[]; // Array of 3-4 main colors for preview
    colors: GlobalColors;
}

export const colorPalettes: ColorPalette[] = [
    {
        id: 'modern-dark',
        name: 'Modern Dark',
        nameEs: 'Moderno Oscuro',
        description: 'Sleek dark theme with vibrant accents',
        descriptionEs: 'Tema oscuro elegante con acentos vibrantes',
        preview: ['#0f172a', '#4f46e5', '#10b981', '#f8fafc'],
        colors: {
            primary: '#4f46e5',
            secondary: '#10b981',
            accent: '#f59e0b',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#e2e8f0',
            textMuted: '#94a3b8',
            heading: '#f8fafc',
            border: '#334155',
            success: '#10b981',
            error: '#ef4444'
        }
    },
    {
        id: 'clean-light',
        name: 'Clean Light',
        nameEs: 'Claro Limpio',
        description: 'Minimal white theme with subtle colors',
        descriptionEs: 'Tema blanco minimalista con colores sutiles',
        preview: ['#ffffff', '#3b82f6', '#8b5cf6', '#1e293b'],
        colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            accent: '#06b6d4',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#475569',
            textMuted: '#94a3b8',
            heading: '#1e293b',
            border: '#e2e8f0',
            success: '#22c55e',
            error: '#ef4444'
        }
    },
    {
        id: 'sunset-warm',
        name: 'Sunset Warm',
        nameEs: 'Atardecer Cálido',
        description: 'Warm orange and red tones',
        descriptionEs: 'Tonos cálidos naranja y rojo',
        preview: ['#1c1917', '#f97316', '#ef4444', '#fef3c7'],
        colors: {
            primary: '#f97316',
            secondary: '#ef4444',
            accent: '#fbbf24',
            background: '#1c1917',
            surface: '#292524',
            text: '#e7e5e4',
            textMuted: '#a8a29e',
            heading: '#fef3c7',
            border: '#44403c',
            success: '#84cc16',
            error: '#dc2626'
        }
    },
    {
        id: 'ocean-blue',
        name: 'Ocean Blue',
        nameEs: 'Océano Azul',
        description: 'Deep blues with teal accents',
        descriptionEs: 'Azules profundos con acentos turquesa',
        preview: ['#0c4a6e', '#0ea5e9', '#14b8a6', '#f0f9ff'],
        colors: {
            primary: '#0ea5e9',
            secondary: '#14b8a6',
            accent: '#6366f1',
            background: '#0c4a6e',
            surface: '#075985',
            text: '#e0f2fe',
            textMuted: '#7dd3fc',
            heading: '#f0f9ff',
            border: '#0369a1',
            success: '#10b981',
            error: '#f87171'
        }
    },
    {
        id: 'forest-green',
        name: 'Forest Green',
        nameEs: 'Bosque Verde',
        description: 'Natural greens with earth tones',
        descriptionEs: 'Verdes naturales con tonos tierra',
        preview: ['#14532d', '#22c55e', '#84cc16', '#f0fdf4'],
        colors: {
            primary: '#22c55e',
            secondary: '#84cc16',
            accent: '#eab308',
            background: '#14532d',
            surface: '#166534',
            text: '#dcfce7',
            textMuted: '#86efac',
            heading: '#f0fdf4',
            border: '#15803d',
            success: '#4ade80',
            error: '#f87171'
        }
    },
    {
        id: 'purple-reign',
        name: 'Purple Reign',
        nameEs: 'Reino Púrpura',
        description: 'Royal purples with pink accents',
        descriptionEs: 'Púrpuras reales con acentos rosados',
        preview: ['#2e1065', '#a855f7', '#ec4899', '#faf5ff'],
        colors: {
            primary: '#a855f7',
            secondary: '#ec4899',
            accent: '#f472b6',
            background: '#2e1065',
            surface: '#4c1d95',
            text: '#e9d5ff',
            textMuted: '#c084fc',
            heading: '#faf5ff',
            border: '#6b21a8',
            success: '#34d399',
            error: '#fb7185'
        }
    },
    {
        id: 'corporate-blue',
        name: 'Corporate Blue',
        nameEs: 'Corporativo Azul',
        description: 'Professional light theme',
        descriptionEs: 'Tema claro profesional',
        preview: ['#f8fafc', '#1e40af', '#3b82f6', '#1e293b'],
        colors: {
            primary: '#1e40af',
            secondary: '#3b82f6',
            accent: '#0ea5e9',
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#475569',
            textMuted: '#94a3b8',
            heading: '#1e293b',
            border: '#cbd5e1',
            success: '#16a34a',
            error: '#dc2626'
        }
    },
    {
        id: 'midnight-gold',
        name: 'Midnight Gold',
        nameEs: 'Medianoche Dorada',
        description: 'Elegant dark with gold accents',
        descriptionEs: 'Oscuro elegante con acentos dorados',
        preview: ['#0a0a0a', '#fbbf24', '#d97706', '#fef3c7'],
        colors: {
            primary: '#fbbf24',
            secondary: '#d97706',
            accent: '#f59e0b',
            background: '#0a0a0a',
            surface: '#171717',
            text: '#e5e5e5',
            textMuted: '#a3a3a3',
            heading: '#fef3c7',
            border: '#262626',
            success: '#22c55e',
            error: '#ef4444'
        }
    },
    {
        id: 'rose-blush',
        name: 'Rose Blush',
        nameEs: 'Rosa Rubor',
        description: 'Soft pinks and warm neutrals',
        descriptionEs: 'Rosas suaves y neutros cálidos',
        preview: ['#fdf2f8', '#ec4899', '#f472b6', '#831843'],
        colors: {
            primary: '#ec4899',
            secondary: '#f472b6',
            accent: '#a855f7',
            background: '#fdf2f8',
            surface: '#ffffff',
            text: '#6b7280',
            textMuted: '#9ca3af',
            heading: '#831843',
            border: '#fce7f3',
            success: '#10b981',
            error: '#ef4444'
        }
    },
    {
        id: 'cyber-neon',
        name: 'Cyber Neon',
        nameEs: 'Neón Cyber',
        description: 'Bold neon colors on dark background',
        descriptionEs: 'Colores neón audaces sobre fondo oscuro',
        preview: ['#020617', '#22d3ee', '#a855f7', '#f0abfc'],
        colors: {
            primary: '#22d3ee',
            secondary: '#a855f7',
            accent: '#f0abfc',
            background: '#020617',
            surface: '#0f172a',
            text: '#e2e8f0',
            textMuted: '#94a3b8',
            heading: '#f0abfc',
            border: '#1e293b',
            success: '#4ade80',
            error: '#f87171'
        }
    },
    {
        id: 'earth-natural',
        name: 'Earth Natural',
        nameEs: 'Tierra Natural',
        description: 'Warm browns and natural tones',
        descriptionEs: 'Marrones cálidos y tonos naturales',
        preview: ['#faf5f0', '#92400e', '#d97706', '#451a03'],
        colors: {
            primary: '#92400e',
            secondary: '#d97706',
            accent: '#059669',
            background: '#faf5f0',
            surface: '#ffffff',
            text: '#57534e',
            textMuted: '#78716c',
            heading: '#451a03',
            border: '#e7e5e4',
            success: '#16a34a',
            error: '#dc2626'
        }
    },
    {
        id: 'minimal-mono',
        name: 'Minimal Mono',
        nameEs: 'Mínimo Monocromático',
        description: 'Clean black and white with subtle grays',
        descriptionEs: 'Blanco y negro limpio con grises sutiles',
        preview: ['#ffffff', '#18181b', '#71717a', '#a1a1aa'],
        colors: {
            primary: '#18181b',
            secondary: '#3f3f46',
            accent: '#71717a',
            background: '#ffffff',
            surface: '#fafafa',
            text: '#52525b',
            textMuted: '#a1a1aa',
            heading: '#09090b',
            border: '#e4e4e7',
            success: '#22c55e',
            error: '#ef4444'
        }
    }
];

// Get a palette by ID
export const getPaletteById = (id: string): ColorPalette | undefined => {
    return colorPalettes.find(p => p.id === id);
};

// Get default palette
export const getDefaultPalette = (): ColorPalette => {
    return colorPalettes[0];
};

// Get default global colors
export const getDefaultGlobalColors = (): GlobalColors => {
    return colorPalettes[0].colors;
};













