import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FeaturedProducts from '../../components/ecommerce/sections/FeaturedProducts';
import type { FeaturedProductsData } from '../../types/components';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ i18n: { language: 'es' } }),
}));

vi.mock('../../contexts/project', () => ({
    useSafeProject: () => ({ activeProjectId: 'fallback-store' }),
}));

vi.mock('../../hooks/usePublicProducts', () => ({
    usePublicProducts: () => ({
        products: [
            {
                id: 'product-1',
                name: 'Producto destacado',
                price: 24,
                slug: 'producto-destacado',
                inStock: true,
            },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        categories: [],
    }),
}));

const featuredProductsData = {
    variant: 'grid',
    title: 'Destacados',
    description: 'Productos seleccionados',
    sourceType: 'newest',
    columns: 4,
    productsToShow: 4,
    showBadge: true,
    showPrice: true,
    showRating: false,
    showAddToCart: false,
    showViewAll: true,
    viewAllUrl: '/products',
    cardStyle: 'modern',
    paddingY: 'md',
    paddingX: 'md',
    colors: {
        background: '#ffffff',
        heading: '#111827',
        text: '#374151',
        accent: '#2563eb',
        cardBackground: '#ffffff',
        cardText: '#111827',
        buttonBackground: '#2563eb',
        buttonText: '#ffffff',
    },
} as FeaturedProductsData;

describe('FeaturedProducts catalog navigation', () => {
    it('uses the internal handler instead of a hard href when onViewAllProducts exists', () => {
        const onViewAllProducts = vi.fn();

        render(
            <FeaturedProducts
                data={featuredProductsData}
                storeId="store_123"
                onViewAllProducts={onViewAllProducts}
            />,
        );

        expect(screen.getByText('Ver todos los productos')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /ver todos los productos/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /ver todos los productos/i }));

        expect(onViewAllProducts).toHaveBeenCalledTimes(1);
    });

    it('keeps the storefront catalog href fallback when no internal handler is provided', () => {
        render(
            <FeaturedProducts
                data={featuredProductsData}
                storeId="store_123"
            />,
        );

        const link = screen.getByRole('link', { name: /ver todos los productos/i });

        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/store/store_123/tienda/productos');
    });
});
