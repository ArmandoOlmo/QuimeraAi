/**
 * Ecommerce Module Exports
 */

export { default as EcommerceDashboard, EcommerceContext, useEcommerceContext } from './EcommerceDashboard';

// Views
export { default as ProductsView } from './views/ProductsView';
export { default as CategoriesView } from './views/CategoriesView';
export { default as OrdersView } from './views/OrdersView';
export { default as CustomersView } from './views/CustomersView';
export { default as DiscountsView } from './views/DiscountsView';
export { default as ReviewsView } from './views/ReviewsView';
export { default as StockAlertsView } from './views/StockAlertsView';
export { default as ReportsView } from './views/ReportsView';
export { default as AnalyticsView } from './views/AnalyticsView';
export { default as SettingsView } from './views/SettingsView';

// Hooks
export { useProducts } from './hooks/useProducts';
export { useCategories } from './hooks/useCategories';
export { useOrders } from './hooks/useOrders';
export { useCustomers } from './hooks/useCustomers';
export { useDiscounts } from './hooks/useDiscounts';
export { useReviews } from './hooks/useReviews';
export { useStoreSettings } from './hooks/useStoreSettings';
export { useEcommerceAnalytics } from './hooks/useEcommerceAnalytics';
export { useStripe } from './hooks/useStripe';
export { useCart } from './hooks/useCart';
export { useEcommerceTheme, withOpacity, getThemedStyles } from './hooks/useEcommerceTheme';
export { useEcommerceStore } from './hooks/useEcommerceStore';
export { useProjectEcommerce, useProjectsWithEcommerce } from './hooks/useProjectEcommerce';
export type { EcommerceStoreData } from './hooks/useEcommerceStore';
export type { UseReviewsOptions, UseReviewsReturn } from './hooks/useReviews';
export type { ProjectEcommerceConfig } from './hooks/useProjectEcommerce';

// Components
export { default as ProductCard } from './components/ProductCard';
export { default as ProductForm } from './components/ProductForm';
export { default as OrderDetailDrawer } from './components/OrderDetailDrawer';

// Utils
export {
    exportOrdersToCSV,
    exportOrdersSummary,
    exportSingleOrder,
} from './utils/exportOrders';
export type { ExportFormat, ExportOrdersOptions } from './utils/exportOrders';

