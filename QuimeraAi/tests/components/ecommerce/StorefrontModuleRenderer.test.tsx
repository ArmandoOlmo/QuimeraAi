import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StorefrontModuleRenderer from '../../../components/ecommerce/StorefrontModuleRenderer';
import type { StorefrontSectionRenderDecision } from '../../../types/storefrontRenderer';

vi.mock('../../../components/ecommerce/sections', () => ({
    AnnouncementBar: () => null,
    ProductHero: () => null,
    FeaturedProducts: () => null,
    CategoryGrid: () => null,
    TrustBadges: () => null,
    SaleCountdown: () => null,
    CollectionBanner: () => null,
    RecentlyViewed: () => null,
    ProductReviews: () => null,
    ProductBundle: () => null,
}));

const makeDecision = (
    kind: StorefrontSectionRenderDecision['kind'],
    index: number,
): StorefrontSectionRenderDecision => ({
    id: `storefront-${kind}`,
    kind,
    index,
    status: 'unsupported',
    data: {},
    reasons: ['Placeholder for editor interaction'],
    warnings: [],
    source: 'componentOrder',
});

describe('StorefrontModuleRenderer editor preview interactions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('marks the clicked canvas section as selected before notifying the editor', () => {
        const postMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
        const { container } = render(
            <StorefrontModuleRenderer
                storeId="store-1"
                decisions={[makeDecision('productHero', 0), makeDecision('featuredProducts', 1)]}
                isEditorPreview
                previewSessionKey="preview-session-1"
                onNavigateToProduct={() => {}}
                onNavigateToCategory={() => {}}
            />,
        );

        const firstSection = container.querySelector<HTMLElement>('[data-storefront-editor-section="productHero"]');
        const secondSection = container.querySelector<HTMLElement>('[data-storefront-editor-section="featuredProducts"]');

        expect(firstSection).not.toBeNull();
        expect(secondSection).not.toBeNull();

        fireEvent.click(firstSection!);
        expect(firstSection).toHaveAttribute('data-storefront-editor-selected', 'true');
        expect(firstSection?.style.outline).toContain('solid');
        expect(postMessageSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'quimera:storefront-editor:section-click',
                sessionKey: 'preview-session-1',
                storeId: 'store-1',
                section: 'productHero',
            }),
            window.location.origin,
        );

        fireEvent.click(secondSection!);
        expect(firstSection).not.toHaveAttribute('data-storefront-editor-selected');
        expect(secondSection).toHaveAttribute('data-storefront-editor-selected', 'true');
    });
});
