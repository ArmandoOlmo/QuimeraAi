/**
 * Performance Optimizations
 * Utilities for lazy loading, caching, and performance improvements
 */

/**
 * Simple in-memory cache with TTL (Time To Live)
 */
class MemoryCache<T> {
    private cache: Map<string, { data: T; expiry: number }> = new Map();
    
    set(key: string, data: T, ttlMs: number = 300000) {
        // Default 5 minutes
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlMs
        });
    }
    
    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    has(key: string): boolean {
        return this.get(key) !== null;
    }
    
    delete(key: string): void {
        this.cache.delete(key);
    }
    
    clear(): void {
        this.cache.clear();
    }
    
    size(): number {
        // Clean expired entries first
        this.cache.forEach((value, key) => {
            if (Date.now() > value.expiry) {
                this.cache.delete(key);
            }
        });
        return this.cache.size;
    }
}

// Global caches
export const componentCache = new MemoryCache<any>();
export const imageCache = new MemoryCache<string>();
export const apiCache = new MemoryCache<any>();

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    waitMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return function(...args: Parameters<T>) {
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            func(...args);
        }, waitMs);
    };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limitMs: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return function(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limitMs);
        }
    };
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(
    imgElement: HTMLImageElement,
    src: string,
    placeholder?: string
): void {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    imgElement.src = src;
                    observer.unobserve(imgElement);
                }
            });
        });
        
        if (placeholder) {
            imgElement.src = placeholder;
        }
        
        observer.observe(imgElement);
    } else {
        // Fallback for browsers without IntersectionObserver
        imgElement.src = src;
    }
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
    const promises = urls.map(url => {
        return new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    });
    
    return Promise.all(promises);
}

/**
 * Optimize image URL (add resize/compression parameters)
 */
export function optimizeImageUrl(
    url: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'webp' | 'jpeg' | 'png';
    } = {}
): string {
    // Check if it's a supported image service
    if (url.includes('cloudinary.com')) {
        // Cloudinary transformations
        const parts = url.split('/upload/');
        if (parts.length === 2) {
            const transforms: string[] = [];
            
            if (options.width) transforms.push(`w_${options.width}`);
            if (options.height) transforms.push(`h_${options.height}`);
            if (options.quality) transforms.push(`q_${options.quality}`);
            if (options.format) transforms.push(`f_${options.format}`);
            
            if (transforms.length > 0) {
                return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
            }
        }
    }
    
    // Return original URL if no optimization available
    return url;
}

/**
 * Batch multiple function calls
 */
export function batchCalls<T>(
    func: (items: T[]) => Promise<any>,
    delay: number = 100
): (item: T) => Promise<void> {
    let batch: T[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return async (item: T) => {
        batch.push(item);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        return new Promise((resolve) => {
            timeoutId = setTimeout(async () => {
                const itemsToProcess = [...batch];
                batch = [];
                await func(itemsToProcess);
                resolve();
            }, delay);
        });
    };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>) => {
        const key = keyGenerator 
            ? keyGenerator(...args)
            : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const result = func(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }): number {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, options);
    }
    
    // Fallback
    return (window as any).setTimeout(callback, options?.timeout || 1) as number;
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(id: number): void {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id);
    } else {
        (window as any).clearTimeout(id);
    }
}

/**
 * Load script dynamically
 */
export function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        
        document.head.appendChild(script);
    });
}

/**
 * Lazy load component (code splitting helper)
 */
export async function lazyLoadComponent<T>(
    loader: () => Promise<{ default: T }>
): Promise<T> {
    try {
        const module = await loader();
        return module.default;
    } catch (error) {
        console.error('Failed to lazy load component:', error);
        throw error;
    }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get optimal image format for browser
 */
export function getSupportedImageFormat(): 'webp' | 'jpeg' {
    // Check WebP support
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 
            ? 'webp' 
            : 'jpeg';
    }
    return 'jpeg';
}

/**
 * Virtual scrolling helper
 */
export class VirtualScroller {
    private itemHeight: number;
    private containerHeight: number;
    private totalItems: number;
    
    constructor(itemHeight: number, containerHeight: number, totalItems: number) {
        this.itemHeight = itemHeight;
        this.containerHeight = containerHeight;
        this.totalItems = totalItems;
    }
    
    getVisibleRange(scrollTop: number): { start: number; end: number } {
        const start = Math.floor(scrollTop / this.itemHeight);
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const end = Math.min(start + visibleCount + 1, this.totalItems);
        
        return { start, end };
    }
    
    getTotalHeight(): number {
        return this.totalItems * this.itemHeight;
    }
    
    getOffsetY(index: number): number {
        return index * this.itemHeight;
    }
}

/**
 * Local storage with compression (for large data)
 */
export const compressedStorage = {
    set: async (key: string, data: any): Promise<void> => {
        try {
            const json = JSON.stringify(data);
            // For production, use actual compression library like pako
            localStorage.setItem(key, json);
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    },
    
    get: async (key: string): Promise<any | null> => {
        try {
            const json = localStorage.getItem(key);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return null;
        }
    },
    
    remove: (key: string): void => {
        localStorage.removeItem(key);
    }
};

/**
 * Network connection quality detection
 */
export function getConnectionQuality(): 'fast' | 'medium' | 'slow' {
    if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn) {
            const effectiveType = conn.effectiveType;
            if (effectiveType === '4g') return 'fast';
            if (effectiveType === '3g') return 'medium';
            return 'slow';
        }
    }
    return 'medium'; // Default assumption
}

/**
 * Adaptive loading: load resources based on connection
 */
export function shouldLoadHighQuality(): boolean {
    const quality = getConnectionQuality();
    return quality === 'fast';
}

