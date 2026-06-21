import { describe, expect, it } from 'vitest';
import { mapProductFromDB, mapProductToDB } from '../../utils/ecommerceMappers';

describe('ecommerceMappers products', () => {
    it('maps editable product fields to the store_products schema', () => {
        expect(mapProductToDB({
            categoryId: '',
            cost: 12.5,
            quantity: 4,
            metaTitle: 'SEO title',
            metaDescription: 'SEO description',
        })).toMatchObject({
            category_id: null,
            cost_price: 12.5,
            quantity: 4,
            data: {
                metaTitle: 'SEO title',
                metaDescription: 'SEO description',
            },
        });
        expect(mapProductToDB({ quantity: 4 })).not.toHaveProperty('inventory_quantity');
    });

    it('hydrates cost and SEO fields from flat columns and JSON data', () => {
        const product = mapProductFromDB({
            id: 'product-1',
            name: 'Sample',
            slug: 'sample',
            description: 'Description',
            price: 25,
            quantity: 3,
            track_inventory: true,
            status: 'active',
            cost_price: 8,
            data: {
                metaTitle: 'Sample SEO',
                metaDescription: 'Search snippet',
            },
        });

        expect(product.costPrice).toBe(8);
        expect(product.cost).toBe(8);
        expect(product.metaTitle).toBe('Sample SEO');
        expect(product.metaDescription).toBe('Search snippet');
    });
});
