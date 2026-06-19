import React from 'react';
import {
    AnnouncementBar,
    CategoryGrid,
    CollectionBanner,
    FeaturedProducts,
    ProductBundle,
    ProductHero,
    ProductReviews,
    RecentlyViewed,
    SaleCountdown,
    TrustBadges,
} from './sections';
import type { StorefrontSectionKind, StorefrontSectionRenderDecision } from '../../types/storefrontRenderer';
import type { StorefrontGlobalColors } from './hooks/useUnifiedStorefrontColors';

interface StorefrontModuleRendererProps {
    storeId: string;
    decisions: StorefrontSectionRenderDecision[];
    globalColors?: StorefrontGlobalColors;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
}

const storefrontComponentMap: Record<StorefrontSectionKind, React.FC<any>> = {
    announcementBar: AnnouncementBar,
    productHero: ProductHero,
    featuredProducts: FeaturedProducts,
    categoryGrid: CategoryGrid,
    trustBadges: TrustBadges,
    saleCountdown: SaleCountdown,
    collectionBanner: CollectionBanner,
    recentlyViewed: RecentlyViewed,
    productReviews: ProductReviews,
    productBundle: ProductBundle,
};

const StorefrontModuleRenderer: React.FC<StorefrontModuleRendererProps> = ({
    storeId,
    decisions,
    globalColors,
    onNavigateToProduct,
    onNavigateToCategory,
}) => {
    return (
        <>
            {decisions.map((decision) => {
                if (decision.status !== 'render') return null;

                const Component = storefrontComponentMap[decision.kind as StorefrontSectionKind];
                if (!Component) return null;

                return (
                    <Component
                        key={decision.id}
                        storeId={storeId}
                        data={decision.data}
                        globalColors={globalColors}
                        onProductClick={onNavigateToProduct}
                        onCategoryClick={onNavigateToCategory}
                        onCollectionClick={onNavigateToCategory}
                    />
                );
            })}
        </>
    );
};

export default StorefrontModuleRenderer;
