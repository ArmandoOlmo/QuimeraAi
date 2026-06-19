import { describe, expect, it } from 'vitest';
import {
    createProductCardViewModel,
    getProductCardImageQuality,
    getProductCardVisualVariant,
    normalizeProductCardVariant,
    selectProductCardImage,
    validateProductCardInput,
} from '../../utils/productCard';

describe('productCard utilities', () => {
    it('normalizes editable card variants and maps industry variants to visual variants', () => {
        expect(normalizeProductCardVariant('image-first')).toBe('imageFirst');
        expect(normalizeProductCardVariant('quick buy')).toBe('quickBuy');
        expect(normalizeProductCardVariant('unknown')).toBe('modern');

        expect(getProductCardVisualVariant('fitness')).toBe('quickBuy');
        expect(getProductCardVisualVariant('food')).toBe('imageFirst');
        expect(getProductCardVisualVariant('fashion')).toBe('editorial');
        expect(getProductCardVisualVariant('classic')).toBe('modern');
    });

    it('creates a storefront-ready view model with discount, badges, rating, and prices', () => {
        const card = createProductCardViewModel({
            id: 'prod_1',
            name: 'Training Kit',
            slug: 'training-kit',
            price: 80,
            compareAtPrice: 100,
            image: 'https://cdn.example.com/products/training-kit.jpg',
            isFeatured: true,
            averageRating: 4.4,
            reviewCount: 12,
            trackInventory: true,
            quantity: 3,
            lowStockThreshold: 5,
        }, {
            variant: 'fitness',
            currencySymbol: '$',
            showAvailabilityBadge: true,
        });

        expect(card.variant).toBe('fitness');
        expect(card.visualVariant).toBe('quickBuy');
        expect(card.displayPrice).toBe('$80.00');
        expect(card.displayCompareAtPrice).toBe('$100.00');
        expect(card.discountPercent).toBe(20);
        expect(card.rating).toMatchObject({ value: 4.4, reviewCount: 12 });
        expect(card.badges.map(badge => badge.kind)).toEqual([
            'available',
            'sale',
            'featured',
            'low_stock',
        ]);
        expect(card.readiness.isReady).toBe(true);
    });

    it('keeps invalid price and archived products out of ready/renderable state', () => {
        const card = createProductCardViewModel({
            id: 'prod_2',
            name: 'Archived Item',
            price: -4,
            status: 'archived',
        });

        expect(card.readiness.isReady).toBe(false);
        expect(card.isRenderable).toBe(false);
        expect(card.issues.map(issue => issue.code)).toContain('invalid_price');
        expect(card.issues.map(issue => issue.code)).toContain('archived_product');
    });

    it('warns for zero prices unless explicitly allowed', () => {
        const issues = validateProductCardInput({
            id: 'prod_3',
            name: 'Needs Price',
            price: 0,
            image: 'https://cdn.example.com/products/needs-price.jpg',
        });
        const allowedIssues = validateProductCardInput({
            id: 'prod_3',
            name: 'Needs Price',
            price: 0,
            image: 'https://cdn.example.com/products/needs-price.jpg',
        }, {
            allowZeroPrice: true,
        });

        expect(issues.map(issue => issue.code)).toContain('zero_price');
        expect(allowedIssues.map(issue => issue.code)).not.toContain('zero_price');
    });

    it('chooses the best product image and reports fallback quality', () => {
        const image = selectProductCardImage({
            id: 'prod_4',
            name: 'Image Product',
            price: 40,
            images: [
                { url: 'https://cdn.example.com/placeholder-product.jpg', position: 0 },
                { url: 'https://cdn.example.com/products/tiny-thumb.jpg', position: 1 },
                { url: 'https://cdn.example.com/products/full-size.jpg', altText: 'Full product image', position: 2 },
            ],
        });

        expect(image).toMatchObject({
            url: 'https://cdn.example.com/products/full-size.jpg',
            altText: 'Full product image',
            quality: 'usable',
        });
        expect(getProductCardImageQuality('https://cdn.example.com/products/card.jpg?w=120')).toBe('low_quality');
        expect(getProductCardImageQuality('https://cdn.example.com/placeholder-product.jpg')).toBe('placeholder');
    });

    it('adds review warnings without trusting invalid ratings', () => {
        const card = createProductCardViewModel({
            id: 'prod_5',
            name: 'Review Product',
            price: 25,
            image: 'https://cdn.example.com/products/review-product.jpg',
            rating: 8,
            reviewCount: -2,
        });

        expect(card.rating).toBeUndefined();
        expect(card.issues.map(issue => issue.code)).toEqual(
            expect.arrayContaining(['invalid_rating', 'invalid_review_count']),
        );
    });
});
