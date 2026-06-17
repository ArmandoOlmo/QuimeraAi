/**
 * Image URL Helper
 * 
 * Handles legacy media URLs while Supabase Storage becomes the canonical source.
 * This helper:
 * 1. Detects old remote storage URLs and flags them as broken
 * 2. Returns a themed placeholder SVG for broken images
 * 3. Provides utilities for migrating to Supabase Storage
 */

import { isLegacyStorageUrl as isLegacyRemoteStorageUrl } from './imageUrl';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://auth.quimera.ai';

/**
 * Check if a URL points to old remote storage that should no longer be rendered directly.
 */
export function isLegacyStorageUrl(url: string | null | undefined): boolean {
    return isLegacyRemoteStorageUrl(url);
}

/**
 * Check if a URL points to Supabase Storage
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('supabase.co/storage');
}

/**
 * Generate an inline SVG placeholder as a data URI.
 * Returns a subtle, themed placeholder with an icon.
 */
export function getPlaceholderImage(
    width: number = 400,
    height: number = 300,
    label?: string
): string {
    const text = label || 'Imagen no disponible';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="100%" style="stop-color:#16213e"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)" rx="8"/>
    <g transform="translate(${width / 2}, ${height / 2 - 20})">
      <circle cx="0" cy="-10" r="28" fill="none" stroke="#4a4a6a" stroke-width="1.5"/>
      <path d="M-12 -4 L-4 -14 L4 -6 L8 -10 L16 0 L-16 0 Z" fill="#4a4a6a" opacity="0.6"/>
      <circle cx="-6" cy="-18" r="4" fill="#4a4a6a" opacity="0.6"/>
    </g>
    <text x="${width / 2}" y="${height / 2 + 36}" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#6a6a8a" text-anchor="middle">${text}</text>
  </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get a safe image URL that replaces broken legacy URLs with a placeholder.
 * Use this throughout the app when rendering user-uploaded images.
 */
export function getSafeImageUrl(
    url: string | null | undefined,
    options?: { width?: number; height?: number; label?: string }
): string {
    // No URL provided
    if (!url || url.trim() === '') {
        return getPlaceholderImage(options?.width, options?.height, options?.label);
    }

    // Old remote storage URL, known to be unavailable in some projects.
    if (isLegacyStorageUrl(url)) {
        return getPlaceholderImage(
            options?.width,
            options?.height,
            options?.label || 'Migrando imagen...'
        );
    }

    // Valid URL — return as-is
    return url;
}

/**
 * Get public URL from Supabase Storage
 */
export function getSupabasePublicUrl(bucket: string, path: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * CSS class helper — adds a broken-image class for styling
 */
export function getImageClassName(url: string | null | undefined, baseClass?: string): string {
    const classes = [baseClass || ''].filter(Boolean);
    if (isLegacyStorageUrl(url)) {
        classes.push('legacy-storage-image');
    }
    return classes.join(' ');
}
