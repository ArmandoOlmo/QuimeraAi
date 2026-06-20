/**
 * StorefrontApp Component
 * 
 * Root component for the storefront that can be rendered both on
 * server (SSR) and client (hydration). Used for custom domains.
 */

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from '@/utils/compatData';
import { db } from '@/utils/compatData';
import StorefrontLayout from './StorefrontLayout';
import ProductDetailPageWithCart from './ProductDetailPageWithCart';
import CheckoutPageEnhanced from './CheckoutPageEnhanced';
import OrderConfirmation from './OrderConfirmation';
import MyAccountPage from './account/MyAccountPage';
import { Loader2 } from 'lucide-react';
import { useStorefrontCart } from './context';

// Import storefront pages
import StorefrontHome from './pages/StorefrontHome';
import StorefrontCategory from './pages/StorefrontCategory';
import ProductSearchPage from './search/ProductSearchPage';
import {
    applyResolvedStorefrontEditorConfig,
    type StorefrontEditorConfigMode,
} from '../../utils/storefrontRenderer';

interface StorefrontAppProps {
    projectId: string;
    initialData?: any;
    hostname?: string;
    serverUrl?: string; // For SSR routing
}

type StorefrontView = 'home' | 'products' | 'product' | 'category' | 'checkout' | 'order-confirmation' | 'account';

interface RouteState {
    view: StorefrontView;
    params: {
        productSlug?: string;
        categorySlug?: string;
        orderId?: string;
    };
}

interface StorefrontProductSearchProps {
    projectId: string;
    projectData: any;
    onProductClick: (slug: string) => void;
    title?: string;
}

const STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX = 'quimera:storefront-editor-preview:';
const STOREFRONT_EDITOR_PREVIEW_UPDATE = 'quimera:storefront-editor-preview:update';
const STOREFRONT_EDITOR_SELECT_SECTION = 'quimera:storefront-editor:select-section';
const STOREFRONT_EDITOR_SECTION_SCROLL_RETRY_DELAYS = [0, 80, 180, 320, 520];

const getStorefrontEditorSectionSelector = (section: string): string =>
    `[data-storefront-editor-section="${section}"]`;

const clearStorefrontEditorSectionHighlights = () => {
    document
        .querySelectorAll<HTMLElement>('[data-storefront-editor-selected="true"]')
        .forEach(element => {
            element.removeAttribute('data-storefront-editor-selected');
            element.style.outline = '';
            element.style.boxShadow = '';
        });
};

const scrollStorefrontEditorSectionIntoView = (section: string) => {
    if (typeof window === 'undefined') return;

    const scrollToSection = (): boolean => {
        const target = document.querySelector<HTMLElement>(getStorefrontEditorSectionSelector(section));
        if (!target) return false;

        clearStorefrontEditorSectionHighlights();
        target.setAttribute('data-storefront-editor-selected', 'true');
        target.style.outline = '2px solid #fbbf24';
        target.style.boxShadow = '0 0 0 5px rgba(251, 191, 36, 0.18)';
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
        return true;
    };

    const attemptScroll = (attempt = 0) => {
        window.requestAnimationFrame(() => {
            if (scrollToSection()) return;

            const nextDelay = STOREFRONT_EDITOR_SECTION_SCROLL_RETRY_DELAYS[attempt + 1];
            if (nextDelay !== undefined) {
                window.setTimeout(() => attemptScroll(attempt + 1), nextDelay);
            }
        });
    };

    attemptScroll();
};

const getStorefrontEditorPreviewData = (projectId: string): any | null => {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== 'storefront-editor') return null;

    const sessionKey = params.get('editorSession') || `${STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX}${projectId}`;
    if (!sessionKey.startsWith(STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX)) return null;

    try {
        const raw = window.sessionStorage.getItem(sessionKey);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('Unable to load storefront editor preview data:', error);
        return null;
    }
};

const getStorefrontEditorPreviewSessionKey = (projectId: string): string | null => {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== 'storefront-editor') return null;

    const sessionKey = params.get('editorSession') || `${STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX}${projectId}`;
    return sessionKey.startsWith(STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX) ? sessionKey : null;
};

const parsePreviewPayload = (payload: unknown): any | null => {
    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch (error) {
            console.warn('Unable to parse storefront editor preview update:', error);
            return null;
        }
    }

    return payload && typeof payload === 'object' ? payload : null;
};

const getPreviewPayloadSignature = (payload: unknown): string => {
    if (typeof payload === 'string') return payload;

    try {
        return JSON.stringify(payload ?? null);
    } catch {
        return String(payload ?? '');
    }
};

const StorefrontProductSearch: React.FC<StorefrontProductSearchProps> = ({
    projectId,
    projectData,
    onProductClick,
    title = 'Todos los productos',
}) => {
    const cart = useStorefrontCart();
    const primaryColor = projectData?.theme?.globalColors?.primary ||
        projectData?.header?.colors?.accent ||
        projectData?.data?.header?.colors?.accent ||
        '#2563eb';

    return (
        <ProductSearchPage
            storeId={projectId}
            onProductClick={onProductClick}
            onAddToCart={(product) => cart.addItem(product, 1)}
            primaryColor={primaryColor}
            showFilterSidebar={true}
            showSearchBar={true}
            showSortOptions={true}
            showViewModeToggle={true}
            defaultViewMode="grid"
            gridColumns={4}
            cardStyle="modern"
            title={title}
            themeColors={{
                background: projectData?.theme?.pageBackground || '#f8fafc',
                text: projectData?.header?.colors?.text || projectData?.data?.header?.colors?.text || '#334155',
                heading: projectData?.header?.colors?.text || projectData?.data?.header?.colors?.text || '#0f172a',
                cardBackground: '#ffffff',
                border: '#e2e8f0',
                mutedText: '#64748b',
                priceColor: primaryColor,
            }}
        />
    );
};

/**
 * Parse URL to determine view and params
 */
function parseUrl(url: string): RouteState {
    const path = url.replace(/^\/store\/[^\/]+/, '').replace(/^\//, '') || '/';

    // Product listing page. The storefront home stays a landing page; catalog is a separate route.
    if (/^(products|catalog|shop|tienda)\/?$/.test(path)) {
        return { view: 'products', params: {} };
    }

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

    // Customer account
    if (path.startsWith('account')) {
        return { view: 'account', params: {} };
    }

    // Order confirmation: /order/:orderId
    const orderMatch = path.match(/^order\/([^\/]+)/);
    if (orderMatch) {
        return { view: 'order-confirmation', params: { orderId: orderMatch[1].split('?')[0] } };
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
    const initialPreviewData = initialData ? null : getStorefrontEditorPreviewData(projectId);
    const initialConfigMode: StorefrontEditorConfigMode = initialPreviewData ? 'draft' : 'published';

    // Route state
    const [route, setRoute] = useState<RouteState>(() => {
        // Use server URL for SSR, or window.location for client
        const url = serverUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
        return parseUrl(url);
    });

    // Project data
    const [projectData, setProjectData] = useState<any>(initialData || initialPreviewData || null);
    const [isLoading, setIsLoading] = useState(!initialData && !initialPreviewData);
    const [storefrontConfigMode, setStorefrontConfigMode] = useState<StorefrontEditorConfigMode>(initialConfigMode);
    const previewPayloadSignatureRef = useRef(initialPreviewData ? getPreviewPayloadSignature(initialPreviewData) : '');
    const previewSessionKey = getStorefrontEditorPreviewSessionKey(projectId);

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
                const previewData = getStorefrontEditorPreviewData(projectId);
                if (previewData) {
                    previewPayloadSignatureRef.current = getPreviewPayloadSignature(previewData);
                    setProjectData(previewData);
                    setStorefrontConfigMode('draft');
                    setIsLoading(false);
                    return;
                }

                const storeDoc = await getDoc(doc(db, 'public_stores', projectId));
                if (storeDoc.exists()) {
                    setProjectData(storeDoc.data());
                    setStorefrontConfigMode('published');
                }
            } catch (error) {
                console.error('Error fetching store data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, projectData]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!previewSessionKey) return;

        const handlePreviewUpdate = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            const message = event.data;
            if (!message) return;
            if (message.sessionKey !== previewSessionKey) return;

            if (message.type === STOREFRONT_EDITOR_SELECT_SECTION) {
                if (typeof message.section === 'string') {
                    scrollStorefrontEditorSectionIntoView(message.section);
                }
                return;
            }

            if (message.type !== STOREFRONT_EDITOR_PREVIEW_UPDATE) return;

            const nextProjectData = parsePreviewPayload(message.payload);
            if (!nextProjectData) return;

            const nextSignature = getPreviewPayloadSignature(message.payload);
            if (nextSignature === previewPayloadSignatureRef.current) return;

            previewPayloadSignatureRef.current = nextSignature;
            setProjectData(nextProjectData);
            setStorefrontConfigMode('draft');
            setIsLoading(false);
        };

        window.addEventListener('message', handlePreviewUpdate);
        return () => window.removeEventListener('message', handlePreviewUpdate);
    }, [previewSessionKey]);

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
    const navigateToAccount = () => navigate('/account');
    const navigateToOrder = (orderId: string, orderAccessToken?: string) => {
        navigate(`/order/${orderId}${orderAccessToken ? `?token=${encodeURIComponent(orderAccessToken)}` : ''}`);
    };

    const resolvedProjectData = projectData
        ? applyResolvedStorefrontEditorConfig(projectData, { mode: storefrontConfigMode })
        : projectData;

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
            case 'products':
                return (
                    <StorefrontProductSearch
                        projectId={projectId}
                        projectData={resolvedProjectData}
                        onProductClick={navigateToProduct}
                    />
                );

            case 'product':
                return (
                    <ProductDetailPageWithCart
                        storeId={projectId}
                        productSlug={route.params.productSlug!}
                        onNavigateToStore={navigateHome}
                        onNavigateToCategory={navigateToCategory}
                        onNavigateToProduct={navigateToProduct}
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

            case 'account':
                return (
                    <MyAccountPage
                        storeId={projectId}
                        onBack={navigateHome}
                        onNavigateToProduct={navigateToProduct}
                        primaryColor={
                            resolvedProjectData?.theme?.globalColors?.primary ||
                            resolvedProjectData?.header?.colors?.accent ||
                            resolvedProjectData?.data?.header?.colors?.accent ||
                            '#6366f1'
                        }
                    />
                );

            case 'home':
            default:
                return (
                    <StorefrontHome
                        storeId={projectId}
                        projectData={resolvedProjectData}
                        onNavigateToProduct={navigateToProduct}
                        onNavigateToCategory={navigateToCategory}
                        previewSessionKey={previewSessionKey}
                        themeColors={{
                            background: resolvedProjectData?.theme?.pageBackground || '#ffffff',
                            text: resolvedProjectData?.theme?.globalColors?.text || '#334155',
                            heading: resolvedProjectData?.theme?.globalColors?.heading || '#0f172a',
                            cardBackground: resolvedProjectData?.theme?.globalColors?.surface || '#ffffff',
                            cardText: resolvedProjectData?.theme?.globalColors?.text || '#334155',
                            border: resolvedProjectData?.theme?.globalColors?.border || '#e2e8f0',
                            priceColor: resolvedProjectData?.theme?.globalColors?.primary || '#4f46e5',
                            salePriceColor: '#ef4444',
                            mutedText: '#64748b'
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
            onNavigateToAccount={navigateToAccount}
            projectData={resolvedProjectData}
        >
            {renderContent()}
        </StorefrontLayout>
    );
};

export default StorefrontApp;
