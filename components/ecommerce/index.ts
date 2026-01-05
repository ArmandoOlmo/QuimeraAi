/**
 * Ecommerce Storefront Components
 * Componentes públicos para el storefront de ecommerce
 * 
 * Estos componentes pueden ser usados tanto en el Landing Page como en el Ecommerce
 */

// Cart
export { default as CartDrawer } from './CartDrawer';
export { default as CartButton } from './CartButton';

// Checkout
export { default as CheckoutPage } from './CheckoutPage';
export { default as CheckoutPageEnhanced } from './CheckoutPageEnhanced';
export type { CheckoutOrderData } from './CheckoutPage';

// Product Detail with Cart
export { default as ProductDetailPageWithCart } from './ProductDetailPageWithCart';

// Cart Context
export { StorefrontCartProvider, useStorefrontCart } from './context';

// Auth Context & Components
export { StoreAuthProvider, useStoreAuth, useStoreAuthOptional } from './context';
export { StoreAuthModal, UserAccountButton } from './auth';
export { MyAccountPage } from './account';

// Order
export { default as OrderConfirmation } from './OrderConfirmation';
export { default as OrderTracker } from './OrderTracker';
export { default as OrderHistoryPage } from './OrderHistoryPage';

// Product Views
export { default as ProductQuickView } from './ProductQuickView';
export { default as ProductDetailPage } from './ProductDetailPage';
export { default as RelatedProducts } from './RelatedProducts';
export { default as ProductComparePage } from './ProductComparePage';
export { default as CompareButton } from './CompareButton';
export { default as StockNotificationButton } from './StockNotificationButton';

// Layout
export { default as StorefrontLayout } from './StorefrontLayout';

// =============================================================================
// SECTION COMPONENTS (Usables en Landing Page y Ecommerce)
// =============================================================================
export {
    FeaturedProducts,
    CategoryGrid,
    ProductHero,
    SaleCountdown,
    TrustBadges,
    RecentlyViewed,
    addToRecentlyViewed,
    ProductReviews,
    CollectionBanner,
    ProductBundle,
    AnnouncementBar,
} from './sections';

// =============================================================================
// PAGE SECTION COMPONENTS (For multi-page architecture)
// =============================================================================
export {
    ProductDetailSection,
    CategoryProductsSection,
    CartSection,
    CheckoutSection,
    ProductGridSection,
    ArticleContentSection,
} from './sections';

// Reviews
export { 
    RatingStars, 
    ReviewCard, 
    ReviewForm, 
    ReviewList, 
    ReviewSummary 
} from './reviews';

// Wishlist
export {
    WishlistButton,
    WishlistDrawer,
    WishlistPage,
} from './wishlist';

// Search
export {
    SearchBar,
    FilterSidebar,
    ProductSearchPage,
} from './search';

// Hooks - Theme
export { useStorefrontTheme, useDesignTokensAsStorefront } from './hooks/useStorefrontTheme';
export type { StorefrontTheme } from './hooks/useStorefrontTheme';

// Hooks - Unified Colors (Sistema unificado de colores)
export { 
    useUnifiedStorefrontColors, 
    useGlobalStorefrontColors,
    getColorsCSSVariables,
} from './hooks/useUnifiedStorefrontColors';
export type { 
    ComponentColors, 
    UnifiedColors,
} from './hooks/useUnifiedStorefrontColors';

// Hooks - Products
export { 
    usePublicProduct, 
    usePublicCategory 
} from './hooks/usePublicProduct';
export type { 
    PublicProduct, 
    PublicProductImage, 
    PublicProductVariant, 
    UsePublicProductReturn 
} from './hooks/usePublicProduct';

// Hooks - Reviews
export {
    useProductReviews,
    useSubmitReview,
    useMarkReviewHelpful,
} from './hooks/useProductReviews';
export type {
    ReviewSortBy,
    UseProductReviewsOptions,
    UseProductReviewsReturn,
    SubmitReviewData,
    UseSubmitReviewReturn,
} from './hooks/useProductReviews';

// Hooks - Wishlist
export { useWishlist } from './hooks/useWishlist';
export type { WishlistItem, UseWishlistReturn } from './hooks/useWishlist';

// Hooks - Search
export { useProductSearch } from './hooks/useProductSearch';
export type {
    SortOption,
    PriceRange,
    ProductFilters,
    UseProductSearchOptions,
    UseProductSearchReturn,
} from './hooks/useProductSearch';

// Hooks - Stock Notification
export { useStockNotification } from './hooks/useStockNotification';
export type {
    StockNotificationRequest,
    UseStockNotificationReturn,
} from './hooks/useStockNotification';

// Hooks - Product Compare
export { useProductCompare } from './hooks/useProductCompare';
export type { UseProductCompareReturn } from './hooks/useProductCompare';

// Hooks - Customer Orders
export { useCustomerOrders } from './hooks/useCustomerOrders';
export type { UseCustomerOrdersReturn } from './hooks/useCustomerOrders';

// Hooks - Discount Validation
export { useDiscountValidation } from './hooks/useDiscountValidation';
export type {
    DiscountValidationResult,
    CartContext,
    UseDiscountValidationReturn,
} from './hooks/useDiscountValidation';

// Re-export Products component from parent
export { default as Products } from '../Products';



