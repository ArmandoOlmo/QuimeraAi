import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductHero from '../../components/ecommerce/sections/ProductHero';
import type { ProductHeroData } from '../../types/components';

const mocks = vi.hoisted(() => ({
    usePublicProducts: vi.fn(),
}));

vi.mock('../../contexts/project', () => ({
    useSafeProject: () => ({ activeProjectId: 'fallback-store' }),
}));

vi.mock('../../hooks/usePublicProducts', () => ({
    usePublicProducts: mocks.usePublicProducts,
}));

const productHeroData = {
    layout: 'split',
    headline: 'Coleccion urbana',
    subheadline: 'Bicicletas para la ciudad.',
    buttonText: 'Explorar productos',
    buttonUrl: '/tienda',
    showBadge: false,
    showPrice: false,
    showDescription: true,
    showFeatures: false,
    showAddToCartButton: false,
    paddingY: 'md',
    paddingX: 'md',
    colors: {
        background: '#ffffff',
        heading: '#111827',
        text: '#374151',
        accent: '#2563eb',
        buttonBackground: '#111827',
        buttonText: '#ffffff',
    },
} as ProductHeroData;

describe('ProductHero catalog navigation', () => {
    beforeEach(() => {
        mocks.usePublicProducts.mockReset();
        mocks.usePublicProducts.mockReturnValue({
            products: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            categories: [],
        });
    });

    it('routes generic storefront button URLs to the full product catalog', () => {
        const onNavigate = vi.fn();

        render(
            <ProductHero
                data={productHeroData}
                storeId="store_123"
                onNavigate={onNavigate}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /explorar productos/i }));

        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate).toHaveBeenCalledWith('/tienda/productos');
    });

    it('loads the selected manual product for product hero source', () => {
        render(
            <ProductHero
                data={{
                    ...productHeroData,
                    sourceType: 'product',
                    productId: 'prod_123',
                }}
                storeId="store_123"
            />,
        );

        expect(mocks.usePublicProducts).toHaveBeenCalledWith('store_123', {
            productIds: ['prod_123'],
            categoryId: undefined,
            limitCount: 1,
        });
    });

    it('loads products from the selected collection for collection hero source', () => {
        render(
            <ProductHero
                data={{
                    ...productHeroData,
                    sourceType: 'collection',
                    collectionId: 'cat_123',
                }}
                storeId="store_123"
            />,
        );

        expect(mocks.usePublicProducts).toHaveBeenCalledWith('store_123', {
            productIds: undefined,
            categoryId: 'cat_123',
            limitCount: 1,
        });
    });
});
