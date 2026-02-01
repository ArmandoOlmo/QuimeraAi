/**
 * StorefrontApp Component
 * 
 * Root component for the storefront that can be rendered both on
 * server (SSR) and client (hydration). Used for custom domains.
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import StorefrontLayout from './StorefrontLayout';
import ProductDetailPageWithCart from './ProductDetailPageWithCart';
import CheckoutPageEnhanced from './CheckoutPageEnhanced';
import OrderConfirmation from './OrderConfirmation';
import { Loader2 } from 'lucide-react';

// Import storefront pages
import StorefrontHome from './pages/StorefrontHome';
import StorefrontCategory from './pages/StorefrontCategory';
import ProductSearchPage from './search/ProductSearchPage';

// List of recognized ecommerce sections to check against componentOrder
const ECOMMERCE_SECTIONS = [
    'featuredProducts', 'categoryGrid', 'productHero', 'saleCountdown',
    'trustBadges', 'recentlyViewed', 'productReviews', 'collectionBanner',
    'productBundle', 'announcementBar'
];

interface StorefrontAppProps {
    projectId: string;
    initialData?: any;
    hostname?: string;
    serverUrl?: string; // For SSR routing
}

type StorefrontView = 'home' | 'product' | 'category' | 'checkout' | 'order-confirmation';

interface RouteState {
    view: StorefrontView;
    params: {
        productSlug?: string;
        categorySlug?: string;
        orderId?: string;
    };
}

/**
 * Parse URL to determine view and params
 */
function parseUrl(url: string): RouteState {
    const path = url.replace(/^\/store\/[^\/]+/, '').replace(/^\//, '') || '/';

    // Product page: /product/:slug
    const productMatch = path.match(/^product\/([^\/]+)/);
    if (productMatch) {
        return { view: 'product', params: { productSlug: productMatch[1] } };
    }

    // Category page: /category/:slug
    const categoryMatch = path.match(/^category\/([^\/]+)/);
    if (categoryMatch) {
        return { view: 'category', params: { categorySlug: categoryMatch[1] } };
    }

    // Checkout
    if (path.startsWith('checkout')) {
        return { view: 'checkout', params: {} };
    }

    // Order confirmation: /order/:orderId
    const orderMatch = path.match(/^order\/([^\/]+)/);
    if (orderMatch) {
        return { view: 'order-confirmation', params: { orderId: orderMatch[1] } };
    }

    // Default: home
    return { view: 'home', params: {} };
}

const StorefrontApp: React.FC<StorefrontAppProps> = ({
    projectId,
    initialData,
    hostname,
    serverUrl
}) => {
    // Route state
    const [route, setRoute] = useState<RouteState>(() => {
        // Use server URL for SSR, or window.location for client
        const url = serverUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
        return parseUrl(url);
    });

    // Project data
    const [projectData, setProjectData] = useState<any>(initialData || null);
    const [isLoading, setIsLoading] = useState(!initialData);

    // Handle browser navigation (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handlePopState = () => {
            setRoute(parseUrl(window.location.pathname));
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Fetch project data if not provided (client-side hydration without initial data)
    useEffect(() => {
        if (projectData || typeof window === 'undefined') return;

        const fetchData = async () => {
            try {
                const storeDoc = await getDoc(doc(db, 'publicStores', projectId));
                if (storeDoc.exists()) {
                    setProjectData(storeDoc.data());
                }
            } catch (error) {
                console.error('Error fetching store data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, projectData]);

    // Navigation functions
    const navigate = (path: string) => {
        if (typeof window !== 'undefined') {
            // For custom domain, use root paths
            const fullPath = hostname ? path : `/store/${projectId}${path}`;
            window.history.pushState({}, '', fullPath);
            setRoute(parseUrl(path));
        }
    };

    const navigateHome = () => navigate('/');
    const navigateToProduct = (slug: string) => navigate(`/product/${slug}`);
    const navigateToCategory = (slug: string) => navigate(`/category/${slug}`);
    const navigateToCheckout = () => navigate('/checkout');
    const navigateToOrder = (orderId: string) => navigate(`/order/${orderId}`);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Cargando tienda...</p>
                </div>
            </div>
        );
    }

    // Render based on route
    const renderContent = () => {
        switch (route.view) {
            case 'product':
                return (
                    <ProductDetailPageWithCart
                        storeId={projectId}
                        productSlug={route.params.productSlug!}
                        onNavigateToStore={navigateHome}
                    />
                );

            case 'category':
                return (
                    <StorefrontCategory
                        storeId={projectId}
                        categorySlug={route.params.categorySlug!}
                        onNavigateHome={navigateHome}
                        onNavigateToProduct={navigateToProduct}
                    />
                );

            case 'checkout':
                return (
                    <CheckoutPageEnhanced
                        storeId={projectId}
                        onSuccess={navigateToOrder}
                        onBack={navigateHome}
                        onNavigateToStore={navigateHome}
                    />
                );

            case 'order-confirmation':
                return (
                    <OrderConfirmation
                        storeId={projectId}
                        orderId={route.params.orderId!}
                        onContinueShopping={navigateHome}
                    />
                );

            case 'home':
            default:
                // Check if user has configured specific storefront sections
                const hasConfiguredHome = projectData?.componentOrder?.some((key: string) =>
                    ECOMMERCE_SECTIONS.includes(key)
                );

                if (hasConfiguredHome) {
                    return (
                        <StorefrontHome
                            storeId={projectId}
                            projectData={projectData}
                            onNavigateToProduct={navigateToProduct}
                            onNavigateToCategory={navigateToCategory}
                            themeColors={{
                                background: projectData?.theme?.pageBackground || '#ffffff',
                                text: projectData?.theme?.globalColors?.text || '#334155',
                                heading: projectData?.theme?.globalColors?.heading || '#0f172a',
                                cardBackground: projectData?.theme?.globalColors?.surface || '#ffffff',
                                cardText: projectData?.theme?.globalColors?.text || '#334155',
                                border: projectData?.theme?.globalColors?.border || '#e2e8f0',
                                priceColor: projectData?.theme?.globalColors?.primary || '#4f46e5',
                                salePriceColor: '#ef4444',
                                mutedText: '#64748b'
                            }}
                        />
                    );
                }

                // Use ProductSearchPage for full store experience with filters, search, etc.
                const primaryColor = projectData?.theme?.globalColors?.primary ||
                    projectData?.data?.header?.colors?.background ||
                    '#6366f1';
                return (
                    <ProductSearchPage
                        storeId={projectId}
                        onProductClick={navigateToProduct}
                        primaryColor={primaryColor}
                        showFilterSidebar={true}
                        showSearchBar={true}
                        showSortOptions={true}
                        showViewModeToggle={true}
                        defaultViewMode="grid"
                        gridColumns={4}
                        cardStyle="modern"
                        title="Tienda"
                        themeColors={{
                            background: projectData?.theme?.pageBackground || '#ffffff',
                            text: projectData?.data?.header?.colors?.text || '#374151',
                            heading: projectData?.data?.header?.colors?.text || '#1f2937',
                        }}
                    />
                );
        }
    };

    return (
        <StorefrontLayout
            storeId={projectId}
            onNavigateHome={navigateHome}
            onNavigateToCheckout={navigateToCheckout}
            projectData={projectData}
        >
            {renderContent()}
        </StorefrontLayout>
    );
};

export default StorefrontApp;
