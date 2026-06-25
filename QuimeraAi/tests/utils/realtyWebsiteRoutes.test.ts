import { describe, expect, it } from 'vitest';
import {
    matchRealtyDetailRoute,
    matchRealtyDirectoryRoute,
    resolveRealtyDetailPath,
    resolveRealtyDetailRoutePattern,
    resolveRealtyDirectoryRoute,
    sanitizeRealtyDetailRoutePattern,
    sanitizeRealtyDirectoryRoute,
} from '../../utils/realtyWebsiteRoutes';

describe('realtyWebsiteRoutes', () => {
    it('keeps default Spanish listing routes', () => {
        expect(resolveRealtyDirectoryRoute()).toBe('/listados');
        expect(resolveRealtyDetailRoutePattern()).toBe('/listados/:slug');
        expect(resolveRealtyDetailPath(undefined, 'dorado-villa')).toBe('/listados/dorado-villa');
        expect(matchRealtyDirectoryRoute('/listados')).toBe(true);
        expect(matchRealtyDetailRoute('/listados/dorado-villa')).toBe('dorado-villa');
    });

    it('supports custom directory and property detail routes', () => {
        const data = {
            directoryRoute: '/propiedades',
            detailRoutePattern: '/propiedades/:slug',
        };

        expect(resolveRealtyDirectoryRoute(data)).toBe('/propiedades');
        expect(resolveRealtyDetailPath(data, 'condado-loft')).toBe('/propiedades/condado-loft');
        expect(matchRealtyDirectoryRoute('/propiedades/', data)).toBe(true);
        expect(matchRealtyDetailRoute('/propiedades/condado-loft', data)).toBe('condado-loft');
    });

    it('adds the slug token when a detail route is missing it', () => {
        expect(sanitizeRealtyDetailRoutePattern('/properties')).toBe('/properties/:slug');
        expect(resolveRealtyDetailPath({ detailRoutePattern: '/properties' }, 'beach-house')).toBe('/properties/beach-house');
    });

    it('rejects external or unsafe route values', () => {
        expect(sanitizeRealtyDirectoryRoute('https://example.com/listings')).toBe('/listados');
        expect(sanitizeRealtyDetailRoutePattern('javascript:alert(1)')).toBe('/listados/:slug');
        expect(sanitizeRealtyDirectoryRoute('/../admin')).toBe('/listados');
        expect(sanitizeRealtyDetailRoutePattern('//evil.test/:slug')).toBe('/listados/:slug');
    });

    it('keeps default route matches as a compatibility fallback', () => {
        const data = {
            directoryRoute: '/properties',
            detailRoutePattern: '/properties/:slug',
        };

        expect(matchRealtyDirectoryRoute('/listados', data)).toBe(true);
        expect(matchRealtyDetailRoute('/listados/legacy-listing', data)).toBe('legacy-listing');
    });
});
