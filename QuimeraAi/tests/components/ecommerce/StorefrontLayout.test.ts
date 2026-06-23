import { describe, expect, it } from 'vitest';
import {
    buildStorefrontHeaderLinks,
    calculateStorefrontHeaderClearance,
    isStorefrontHomeNavigationLink,
    normalizeProjectPublicData,
} from '../../../components/ecommerce/StorefrontLayout';

describe('StorefrontLayout data normalization', () => {
    it('calculates clearance for floating headers that visually overlap content', () => {
        expect(calculateStorefrontHeaderClearance({ bottom: 0 }, { bottom: 96 })).toBe(96);
        expect(calculateStorefrontHeaderClearance({ bottom: 48 }, { bottom: 124.2 })).toBe(77);
    });

    it('does not add duplicate clearance when the header already participates in layout flow', () => {
        expect(calculateStorefrontHeaderClearance({ bottom: 128 }, { bottom: 112 })).toBe(0);
        expect(calculateStorefrontHeaderClearance({ bottom: 128 }, { bottom: 128 })).toBe(0);
    });

    it('keeps root published header settings for floating storefront headers', () => {
        const normalized = normalizeProjectPublicData({
            name: 'Galeria Root',
            header: {
                style: 'floating-glass',
                layout: 'minimal',
                isSticky: true,
                glassEffect: true,
                height: 96,
                logoType: 'text',
                logoText: 'Root Header',
                colors: {
                    background: '#111827',
                    text: '#ffffff',
                    accent: '#fbbf24',
                },
            },
            theme: {
                pageBackground: '#f8fafc',
                globalColors: {
                    primary: '#fbbf24',
                    text: '#111827',
                },
            },
        });

        expect(normalized?.name).toBe('Galeria Root');
        expect(normalized?.header).toMatchObject({
            style: 'floating-glass',
            height: 96,
            logoText: 'Root Header',
            colors: {
                background: '#111827',
                text: '#ffffff',
                accent: '#fbbf24',
            },
        });
    });

    it('reads legacy nested header data from public store payloads', () => {
        const normalized = normalizeProjectPublicData({
            data: {
                name: 'Nested Store',
                data: {
                    header: {
                        style: 'floating-pill',
                        height: 88,
                        logoText: 'Nested Header',
                        colors: {
                            background: '#fafafa',
                            text: '#111111',
                            accent: '#2563eb',
                        },
                    },
                    pages: [{ id: 'home', title: 'Inicio', slug: '/', showInNavigation: true }],
                    menus: [{ id: 'main', handle: 'main-menu', items: [{ text: 'Tienda', href: '/tienda' }] }],
                },
            },
        });

        expect(normalized?.name).toBe('Nested Store');
        expect(normalized?.header).toMatchObject({
            style: 'floating-pill',
            height: 88,
            logoText: 'Nested Header',
        });
        expect(normalized?.pages).toHaveLength(1);
        expect(normalized?.menus).toHaveLength(1);
    });

    it('uses store name and theme colors when an older public store has no header', () => {
        const normalized = normalizeProjectPublicData({
            name: 'Fallback Store',
            theme: {
                globalColors: {
                    background: '#0f172a',
                    text: '#f8fafc',
                    primary: '#22c55e',
                },
            },
        });

        expect(normalized?.header.logoText).toBe('Fallback Store');
        expect(normalized?.header.colors).toMatchObject({
            background: '#0f172a',
            text: '#f8fafc',
            accent: '#22c55e',
        });
    });

    it('does not duplicate Inicio when the project navigation already includes home', () => {
        const links = buildStorefrontHeaderLinks('store-1', [
            { text: 'Inicio', href: '/' },
            { text: 'Tienda', href: '/tienda' },
            { text: 'Inicio', href: '#home' },
        ], true);

        expect(links).toEqual([
            { text: 'Inicio', href: '/' },
            { text: 'Tienda', href: '/tienda' },
        ]);
    });

    it('adds an Inicio link when the project navigation has no home target', () => {
        expect(buildStorefrontHeaderLinks('store-1', [
            { text: 'Tienda', href: '/tienda' },
        ], true)).toEqual([
            { text: 'Inicio', href: '#' },
            { text: 'Tienda', href: '/tienda' },
        ]);
    });

    it('normalizes accented home labels for storefront navigation', () => {
        expect(isStorefrontHomeNavigationLink({ text: 'Início', href: '/otra' })).toBe(true);
        expect(isStorefrontHomeNavigationLink({ text: 'Productos', href: '/' })).toBe(true);
        expect(isStorefrontHomeNavigationLink({ text: 'Tienda', href: '/tienda' })).toBe(false);
    });
});
