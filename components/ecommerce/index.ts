/**
 * Ecommerce Storefront Components
 * Componentes públicos para el storefront de ecommerce
 */

// Cart
export { default as CartDrawer } from './CartDrawer';
export { default as CartButton } from './CartButton';

// Checkout
export { default as CheckoutPage } from './CheckoutPage';
export type { CheckoutOrderData } from './CheckoutPage';

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



