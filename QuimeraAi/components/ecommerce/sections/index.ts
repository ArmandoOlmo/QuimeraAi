/**
 * Section Components Index
 * 
 * Exports all section components for the ecommerce storefront.
 * These are used both in Landing Page and multi-page architecture.
 */

// =============================================================================
// VISUAL SECTION COMPONENTS (Usables en Landing Page y Store views)
// =============================================================================
export { default as FeaturedProducts } from './FeaturedProducts';
export { default as CategoryGrid } from './CategoryGrid';
export { default as ProductHero } from './ProductHero';
export { default as SaleCountdown } from './SaleCountdown';
export { default as TrustBadges } from './TrustBadges';
export { default as RecentlyViewed, addToRecentlyViewed } from './RecentlyViewed';
export { default as ProductReviews } from './ProductReviews';
export { default as CollectionBanner } from './CollectionBanner';
export { default as ProductBundle } from './ProductBundle';
export { default as AnnouncementBar } from './AnnouncementBar';

// =============================================================================
// PAGE SECTION COMPONENTS (For multi-page architecture / SSR)
// =============================================================================

// E-commerce page sections
export { default as ProductDetailSection } from './ProductDetailSection';
export { default as CategoryProductsSection } from './CategoryProductsSection';
export { default as CartSection } from './CartSection';
export { default as CheckoutSection } from './CheckoutSection';
export { default as ProductGridSection } from './ProductGridSection';

// Content page sections  
export { default as ArticleContentSection } from './ArticleContentSection';
