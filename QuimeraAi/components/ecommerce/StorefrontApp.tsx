/**
 * StorefrontApp Component
 * 
 * Root component for the storefront that can be rendered both on
 * server (SSR) and client (hydration). Used for custom domains.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import StorefrontLayout from './StorefrontLayout';
import ProductDetailPageWithCart from './ProductDetailPageWithCart';
import CheckoutPageEnhanced from './CheckoutPageEnhanced';
import OrderConfirmation from './OrderConfirmation';
import MyAccountPage from './account/MyAccountPage';
import ChatbotWidget from '../ChatbotWidget';
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
import { mapSupabaseRowToProject } from '../../utils/mapSupabaseProject';
import { parseStorefrontUrl, type StorefrontRouteState } from '../../utils/storefrontRouter';
import { buildChatbotEngineSurfaceContext } from '../../utils/chatbotEngine/surfaceContext';
import { supabase } from '../../supabase';
import type { ProductCardVariant } from '../../types/productCard';

interface StorefrontAppProps {
    projectId: string;
    initialData?: any;
    hostname?: string;
    serverUrl?: string; // For SSR routing
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

const normalizeStorefrontAnchorName = (value: string): string => (
    value
        .replace(/^#/, '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
);

const getStorefrontAnchorCandidates = (anchor: string): string[] => {
    const rawAnchor = anchor.replace(/^#/, '').trim();
    const normalizedAnchor = normalizeStorefrontAnchorName(rawAnchor);
    const aliases: Record<string, string> = {
        products: 'featuredProducts',
        productos: 'featuredProducts',
        featuredproducts: 'featuredProducts',
        categories: 'categoryGrid',
        categorias: 'categoryGrid',
        categorygrid: 'categoryGrid',
        reviews: 'productReviews',
        resenas: 'productReviews',
        productreviews: 'productReviews',
        contact: 'footer',
        contacto: 'footer',
        footer: 'footer',
    };
    const aliased = aliases[normalizedAnchor];

    return Array.from(new Set([rawAnchor, aliased].filter(Boolean)));
};

const escapeCssValue = (value: string): string => (
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(value)
        : value.replace(/["\\]/g, '\\$&')
);

const scrollToStorefrontAnchor = (anchor: string) => {
    if (typeof window === 'undefined') return;

    const candidates = getStorefrontAnchorCandidates(anchor);
    if (!candidates.length) return;

    const findTarget = (): HTMLElement | null => {
        for (const candidate of candidates) {
            const escaped = escapeCssValue(candidate);
            const target = document.querySelector<HTMLElement>(
                `[data-storefront-section="${escaped}"], [data-storefront-editor-section="${escaped}"], #${escaped}`
            );
            if (target) return target;
        }

        return null;
    };

    const attemptScroll = (attempt = 0) => {
        window.requestAnimationFrame(() => {
            const target = findTarget();
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            const delay = [80, 180, 320, 520, 800][attempt];
            if (delay !== undefined) {
                window.setTimeout(() => attemptScroll(attempt + 1), delay);
            }
        });
    };

    attemptScroll();
};

const loadPublishedStorefrontProjectData = async (projectId: string): Promise<any | null> => {
    const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

    if (projectError) throw projectError;
    if (projectRow) return mapSupabaseRowToProject(projectRow);

    const { data: publicStoreRow, error: publicStoreError } = await supabase
        .from('public_stores')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

    if (publicStoreError) throw publicStoreError;

    if (publicStoreRow?.data) {
        return {
            ...publicStoreRow.data,
            id: publicStoreRow.data.id || publicStoreRow.id,
            userId: publicStoreRow.data.userId || publicStoreRow.user_id,
        };
    }

    return null;
};

const StorefrontProductSearch: React.FC<StorefrontProductSearchProps> = ({
    projectId,
    projectData,
    onProductClick,
    title = 'Todos los productos',
}) => {
    const cart = useStorefrontCart();
    const storeSettings = (projectData?.storeSettings || projectData?.data?.storeSettings || {}) as any;
    const storeSettingsColors = storeSettings?.colors || {};
    const globalColors = projectData?.theme?.globalColors || {};
    const primaryColor = storeSettingsColors.accent ||
        globalColors.primary ||
        projectData?.header?.colors?.accent ||
        projectData?.data?.header?.colors?.accent ||
        '#2563eb';
    const gridColumns = [2, 3, 4, 5].includes(storeSettings?.gridColumns)
        ? storeSettings.gridColumns as 2 | 3 | 4 | 5
        : 4;
    const defaultViewMode = storeSettings?.defaultViewMode === 'list' ? 'list' : 'grid';
    const borderRadius = ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'].includes(storeSettings?.borderRadius)
        ? storeSettings.borderRadius
        : 'xl';
    const cardGap = ['sm', 'md', 'lg'].includes(storeSettings?.cardGap)
        ? storeSettings.cardGap
        : 'md';

    return (
        <ProductSearchPage
            storeId={projectId}
            onProductClick={onProductClick}
            onAddToCart={(product) => cart.addItem(product, 1)}
            primaryColor={primaryColor}
            embedded={true}
            showFilterSidebar={storeSettings?.showFilterSidebar !== false}
            filterPresentation="drawer"
            showSearchBar={storeSettings?.showSearchBar !== false}
            showSortOptions={storeSettings?.showSortOptions !== false}
            showViewModeToggle={storeSettings?.showViewModeToggle !== false}
            defaultViewMode={defaultViewMode}
            productsPerPage={storeSettings?.productsPerPage || 12}
            gridColumns={gridColumns}
            cardStyle={(storeSettings?.cardStyle || 'modern') as ProductCardVariant}
            borderRadius={borderRadius}
            cardGap={cardGap}
            paddingY={storeSettings?.paddingY || 'md'}
            paddingX={storeSettings?.paddingX || 'md'}
            currencySymbol={storeSettings?.currencySymbol || '$'}
            title={title}
            themeColors={{
                background: storeSettingsColors.background || projectData?.theme?.pageBackground || '#f8fafc',
                text: storeSettingsColors.text || globalColors.text || projectData?.header?.colors?.text || projectData?.data?.header?.colors?.text || '#334155',
                heading: storeSettingsColors.heading || globalColors.heading || globalColors.text || projectData?.header?.colors?.text || projectData?.data?.header?.colors?.text || '#0f172a',
                cardBackground: storeSettingsColors.cardBackground || globalColors.surface || '#ffffff',
                cardText: storeSettingsColors.cardText || globalColors.text || '#334155',
                border: storeSettingsColors.borderColor || globalColors.border || '#e2e8f0',
                mutedText: storeSettingsColors.text || globalColors.textMuted || globalColors.text || '#64748b',
                priceColor: storeSettingsColors.priceColor || primaryColor,
                salePriceColor: storeSettingsColors.salePriceColor || '#ef4444',
            }}
        />
    );
};

const StorefrontApp: React.FC<StorefrontAppProps> = ({
    projectId,
    initialData,
    hostname,
    serverUrl
}) => {
    const initialPreviewData = initialData ? null : getStorefrontEditorPreviewData(projectId);
    const initialConfigMode: StorefrontEditorConfigMode = initialPreviewData ? 'draft' : 'published';

    // Route state
    const [route, setRoute] = useState<StorefrontRouteState>(() => {
        // Use server URL for SSR, or window.location for client
        const url = serverUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
        return parseStorefrontUrl(url);
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
            setRoute(parseStorefrontUrl(window.location.pathname));
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

                const loadedProjectData = await loadPublishedStorefrontProjectData(projectId);
                if (loadedProjectData) {
                    setProjectData(loadedProjectData);
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
            setRoute(parseStorefrontUrl(path));
        }
    };

    const navigateHome = () => navigate('/');
    const navigateToProduct = (slug: string) => navigate(`/product/${slug}`);
    const navigateToCategory = (slug: string) => navigate(`/category/${slug}`);
    const navigateToProducts = () => navigate('/tienda/productos');
    const navigateToCheckout = () => navigate('/checkout');
    const navigateToAccount = () => navigate('/account');
    const navigateToOrder = (orderId: string, orderAccessToken?: string) => {
        navigate(`/order/${orderId}${orderAccessToken ? `?token=${encodeURIComponent(orderAccessToken)}` : ''}`);
    };
    const navigateStorefrontHref = (href: string) => {
        const rawHref = href.trim();
        if (!rawHref) return;

        let pathname = rawHref.startsWith('#') ? '/' : rawHref.split(/[?#]/)[0] || '/';
        let anchor = rawHref.includes('#')
            ? rawHref.slice(rawHref.indexOf('#') + 1).split(/[?&]/)[0]
            : '';

        if (/^https?:\/\//i.test(rawHref)) {
            try {
                const url = new URL(rawHref);
                if (url.origin !== window.location.origin) {
                    window.open(rawHref, '_blank', 'noopener,noreferrer');
                    return;
                }
                pathname = url.pathname;
                anchor = url.hash.replace(/^#/, '');
            } catch {
                window.location.href = rawHref;
                return;
            }
        }

        const storeRoute = pathname.match(/^\/store\/[^/]+(?:\/(.*))?$/)?.[1]?.replace(/^\/+|\/+$/g, '') || '';
        const route = storeRoute || pathname.replace(/^\/+|\/+$/g, '');

        if (!route || route === 'tienda') {
            navigateHome();
            if (anchor) scrollToStorefrontAnchor(anchor);
            return;
        }
        if (/^(products|catalog|shop|tienda\/productos|tienda\/catalogo)$/.test(route)) {
            navigateToProducts();
            return;
        }
        if (route.startsWith('product/')) {
            navigateToProduct(route.replace('product/', ''));
            return;
        }
        if (route.startsWith('category/')) {
            navigateToCategory(route.replace('category/', ''));
            return;
        }
        if (route.startsWith('collection/')) {
            navigateToCategory(route.replace('collection/', ''));
            return;
        }
        if (route.startsWith('tienda/producto/')) {
            navigateToProduct(route.replace('tienda/producto/', ''));
            return;
        }
        if (route.startsWith('tienda/categoria/')) {
            navigateToCategory(route.replace('tienda/categoria/', ''));
            return;
        }

        window.location.href = rawHref;
    };

    const resolvedProjectData = projectData
        ? applyResolvedStorefrontEditorConfig(projectData, { mode: storefrontConfigMode })
        : projectData;
    const storefrontAiAssistantConfig = resolvedProjectData?.aiAssistantConfig
        || resolvedProjectData?.data?.aiAssistantConfig
        || resolvedProjectData?.data?.chatbot
        || null;
    const storefrontChatbotContext = useMemo(() => {
        const routePath = serverUrl || (typeof window !== 'undefined' ? window.location.pathname : undefined);
        const isCheckout = route.view === 'checkout';
        const entityType = route.view === 'product'
            ? 'product'
            : route.view === 'category'
                ? 'category'
                : route.view === 'order-confirmation'
                    ? 'order'
                    : isCheckout
                        ? 'checkout'
                        : 'storefront';

        return buildChatbotEngineSurfaceContext({
            sourceSurface: isCheckout ? 'checkout' : 'storefront',
            sourceModule: isCheckout ? 'ecommerce' : 'storefront-builder',
            route: routePath,
            entityType,
            entityId: route.params.orderId,
            entitySlug: route.params.productSlug || route.params.categorySlug,
            contextKeys: [
                'storefront',
                `storefront:${route.view}`,
                isCheckout ? 'checkout' : '',
                route.params.productSlug ? 'product' : '',
                route.params.categorySlug ? 'category' : '',
            ].filter(Boolean),
            metadata: {
                routeView: route.view,
                projectId,
                hostname,
                productSlug: route.params.productSlug,
                categorySlug: route.params.categorySlug,
                orderId: route.params.orderId,
                storefrontConfigMode,
            },
        });
    }, [hostname, projectId, route, serverUrl, storefrontConfigMode]);
    const globalColors = resolvedProjectData?.theme?.globalColors || {};
    const productDetailColors = {
        background: resolvedProjectData?.theme?.pageBackground || globalColors.background,
        heading: globalColors.heading || globalColors.text,
        text: globalColors.text,
        accent: globalColors.primary || globalColors.accent,
        cardBackground: globalColors.surface,
        cardText: globalColors.text,
        buttonBackground: globalColors.primary,
        buttonText: globalColors.buttonText,
        borderColor: globalColors.border,
        priceColor: globalColors.primary,
        salePriceColor: globalColors.error,
    };

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
                        colors={productDetailColors}
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
                        onViewAllProducts={navigateToProducts}
                        onNavigate={navigateStorefrontHref}
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
            onNavigateStorefront={navigateStorefrontHref}
            projectData={resolvedProjectData}
        >
            {renderContent()}
            {storefrontAiAssistantConfig && (
                <ChatbotWidget
                    standaloneConfig={storefrontAiAssistantConfig}
                    standaloneProject={{
                        ...(resolvedProjectData || {}),
                        id: resolvedProjectData?.id || projectId,
                        name: resolvedProjectData?.name || resolvedProjectData?.data?.businessName || 'Storefront',
                        data: resolvedProjectData?.data || resolvedProjectData || {},
                        theme: resolvedProjectData?.theme,
                        componentOrder: resolvedProjectData?.componentOrder || resolvedProjectData?.component_order || [],
                        sectionVisibility: resolvedProjectData?.sectionVisibility || resolvedProjectData?.section_visibility || {},
                    }}
                    chatbotEngineContext={storefrontChatbotContext}
                />
            )}
        </StorefrontLayout>
    );
};

export default StorefrontApp;
