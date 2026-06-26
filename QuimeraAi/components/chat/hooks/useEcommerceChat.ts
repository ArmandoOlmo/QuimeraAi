/**
 * useEcommerceChat Hook
 * Canonical Ecommerce Engine bridge for ChatCore.
 */

import { useCallback, useState } from 'react';
import type { ChatbotEngineSurfaceContext } from '../../../utils/chatbotEngine/surfaceContext';

const DEFAULT_WIDGET_API_BASE_URL = (import.meta.env.VITE_WIDGET_API_BASE_URL || '/api/widget').replace(/\/$/, '');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface OrderStatus {
    orderId: string;
    orderNumber?: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | string;
    statusLabel: string;
    createdAt?: Date;
    updatedAt?: Date;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
    itemCount?: number;
    total: number;
    currency: string;
}

export interface ProductInfo {
    id: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    currency: string;
    inStock: boolean;
    stockQuantity: number;
    images: string[];
    imageUrl?: string;
    category?: string;
    slug?: string;
    productUrl?: string;
    variants?: Array<{
        id: string;
        name: string;
        price: number;
        inStock: boolean;
    }>;
}

export interface ProductRecommendationRequest {
    query?: string;
    activeProductId?: string;
    activeProductSlug?: string;
    categoryId?: string;
    categorySlug?: string;
    tags?: string[];
    inStockOnly?: boolean;
    limit?: number;
}

export interface ProductRecommendationResult {
    products: ProductInfo[];
    activeProductId?: string | null;
    source?: string;
}

export interface ProductInquiryRequest {
    productId?: string;
    productSlug?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    quantity?: number;
    consent?: boolean;
    idempotencyKey?: string;
}

export interface ProductInquiryResult {
    leadId?: string;
    product: ProductInfo;
    duplicate: boolean;
}

export interface CheckoutIntentItem {
    productId?: string;
    productSlug?: string;
    variantId?: string;
    quantity?: number;
}

export interface CheckoutIntentRequest {
    items: CheckoutIntentItem[];
    idempotencyKey?: string;
}

export interface CheckoutIntent {
    checkoutUrl: string;
    storefrontCheckoutUrl?: string;
    idempotencyKey?: string;
    items: Array<{
        productId: string;
        productSlug?: string | null;
        variantId?: string | null;
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
    subtotal: number;
    currency: string;
    paymentCreated: boolean;
    requiresCheckoutPage: boolean;
    source?: string;
}

export interface ShippingInfo {
    configured: boolean;
    message: string;
    methods: Array<{
        id: string;
        name: string;
        description?: string | null;
        price: number;
        estimatedDays?: string | null;
        zoneName?: string | null;
        countries?: string[];
        minOrder?: number | null;
    }>;
    freeShippingThreshold?: number | null;
    currency: string;
    termsUrl?: string | null;
}

export interface ReturnPolicy {
    configured: boolean;
    message: string;
    acceptsReturns?: boolean | null;
    returnWindow?: number | null;
    conditions: string[];
    process: string[];
    refundMethod?: string | null;
    shippingCost?: string | null;
    termsUrl?: string | null;
    privacyPolicyUrl?: string | null;
}

export interface EcommerceChatContext {
    isEcommerceEnabled: boolean;
    storeName: string;
    currency: string;
    hasOrderLookup: boolean;
    hasProductSearch: boolean;
    hasProductRecommendations: boolean;
    hasProductInquiry: boolean;
    hasCheckoutIntent: boolean;
}

export interface EcommerceChatOptions {
    apiBaseUrl?: string;
    sourceSurface?: string;
    sourceModule?: string;
    chatbotEngineContext?: ChatbotEngineSurfaceContext;
    conversationId?: string | null;
    consent?: boolean;
    marketingConsent?: boolean;
}

export interface OrderVerification {
    email?: string;
    orderAccessToken?: string;
}

export interface BackInStockRequest {
    productId?: string;
    productSlug?: string;
    email: string;
    name?: string;
    consent?: boolean;
}

const ORDER_STATUS_LABELS: Record<string, { es: string; en: string }> = {
    pending: { es: 'Pendiente', en: 'Pending' },
    processing: { es: 'En preparacion', en: 'Processing' },
    shipped: { es: 'Enviado', en: 'Shipped' },
    delivered: { es: 'Entregado', en: 'Delivered' },
    cancelled: { es: 'Cancelado', en: 'Cancelled' },
    refunded: { es: 'Reembolsado', en: 'Refunded' },
};

const POLICY_NOT_CONFIGURED = {
    es: 'Esta politica de ecommerce no esta configurada o revisada para responder publicamente.',
    en: 'This ecommerce policy is not configured or reviewed for public answers.',
};

const asString = (value: unknown): string | undefined => (
    typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const asNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const statusLabel = (status: string, isSpanish: boolean): string => {
    const labels = ORDER_STATUS_LABELS[status] || ORDER_STATUS_LABELS.pending;
    return isSpanish ? labels.es : labels.en;
};

const mapProduct = (product: Record<string, any>): ProductInfo => ({
    id: String(product.id || ''),
    name: String(product.name || ''),
    description: String(product.description || ''),
    price: asNumber(product.price) ?? 0,
    compareAtPrice: asNumber(product.compareAtPrice),
    currency: asString(product.currency) || 'USD',
    inStock: product.inStock !== false,
    stockQuantity: asNumber(product.quantity) ?? (product.inStock === false ? 0 : 1),
    images: [asString(product.imageUrl)].filter(Boolean) as string[],
    imageUrl: asString(product.imageUrl),
    category: asString(product.categoryName),
    slug: asString(product.slug),
    productUrl: asString(product.productUrl),
    variants: Array.isArray(product.variants) ? product.variants : undefined,
});

const mapOrder = (order: Record<string, any>, isSpanish: boolean): OrderStatus => {
    const status = asString(order.status) || 'pending';
    const createdAt = asString(order.createdAt);
    const updatedAt = asString(order.updatedAt);

    return {
        orderId: String(order.orderId || order.id || ''),
        orderNumber: asString(order.orderNumber),
        status,
        statusLabel: statusLabel(status, isSpanish),
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
        paymentStatus: asString(order.paymentStatus),
        fulfillmentStatus: asString(order.fulfillmentStatus),
        trackingNumber: asString(order.trackingNumber),
        trackingUrl: asString(order.trackingUrl),
        carrier: asString(order.carrier),
        itemCount: asNumber(order.itemCount),
        total: asNumber(order.total) ?? 0,
        currency: asString(order.currency) || 'USD',
    };
};

export const useEcommerceChat = (
    projectId: string,
    _userId?: string,
    language: string = 'es',
    options: EcommerceChatOptions = {},
) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSpanish = language === 'es';
    const apiBaseUrl = (options.apiBaseUrl || DEFAULT_WIDGET_API_BASE_URL).replace(/\/$/, '');
    const sourceSurface = options.sourceSurface || options.chatbotEngineContext?.sourceSurface || 'website';
    const sourceModule = options.sourceModule || options.chatbotEngineContext?.sourceModule || 'chatcore';

    const buildPayload = useCallback((payload: Record<string, unknown> = {}) => ({
        ...payload,
        sourceSurface,
        sourceModule,
        conversationId: options.conversationId || undefined,
        consent: options.consent,
        marketingConsent: options.marketingConsent,
        chatbotEngineContext: options.chatbotEngineContext,
        metadata: {
            sourceSurface,
            sourceModule,
            chatbotEngineContext: options.chatbotEngineContext,
            ...(isRecord(payload.metadata) ? payload.metadata : {}),
        },
    }), [sourceSurface, sourceModule, options.conversationId, options.consent, options.marketingConsent, options.chatbotEngineContext]);

    const callWidgetApi = useCallback(async <T,>(path: string, payload: Record<string, unknown> = {}): Promise<T> => {
        if (!projectId) throw new Error(isSpanish ? 'No se pudo conectar a la tienda' : 'Could not connect to store');

        const response = await fetch(`${apiBaseUrl}/${encodeURIComponent(projectId)}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(payload)),
        });

        if (!response.ok) {
            let message = `Widget API request failed (${response.status})`;
            try {
                const body = await response.json();
                message = body?.error || message;
            } catch {
                // Ignore malformed error bodies.
            }
            throw new Error(message);
        }

        return response.json();
    }, [apiBaseUrl, buildPayload, isSpanish, projectId]);

    const checkOrderStatus = useCallback(async (
        identifier: string,
        identifierType: 'orderId' | 'email' = 'orderId',
        verification: OrderVerification = {},
    ): Promise<OrderStatus | null> => {
        setIsLoading(true);
        setError(null);

        try {
            if (identifierType === 'email') {
                const message = isSpanish
                    ? 'Para proteger la privacidad, necesito numero de orden y email o token de acceso.'
                    : 'To protect privacy, I need an order number and email or access token.';
                setError(message);
                return null;
            }

            const payload = UUID_RE.test(identifier)
                ? { orderId: identifier }
                : { orderNumber: identifier };
            const order = await callWidgetApi<Record<string, any>>('/orders/status', {
                ...payload,
                email: verification.email,
                orderAccessToken: verification.orderAccessToken,
            });

            return mapOrder(order, isSpanish);
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al buscar la orden.' : 'Error searching for order.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const getProductInfo = useCallback(async (
        searchTerm: string,
        searchType: 'id' | 'name' = 'name',
    ): Promise<ProductInfo | ProductInfo[] | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await callWidgetApi<{ products?: Record<string, any>[] }>('/products/search', {
                query: searchTerm,
                limit: searchType === 'id' ? 8 : 5,
            });
            const products = (result.products || []).map(mapProduct);
            if (searchType === 'id') {
                return products.find(product => (
                    product.id === searchTerm ||
                    product.slug === searchTerm
                )) || null;
            }
            return products.length === 1 ? products[0] : products;
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al buscar productos.' : 'Error searching products.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const recommendProducts = useCallback(async (
        input: ProductRecommendationRequest = {},
    ): Promise<ProductRecommendationResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await callWidgetApi<{ products?: Record<string, any>[]; activeProductId?: string | null; source?: string }>('/products/recommendations', {
                query: input.query,
                activeProductId: input.activeProductId,
                activeProductSlug: input.activeProductSlug,
                categoryId: input.categoryId,
                categorySlug: input.categorySlug,
                tags: input.tags,
                inStockOnly: input.inStockOnly,
                limit: input.limit,
            });
            return {
                products: (result.products || []).map(mapProduct),
                activeProductId: result.activeProductId ?? null,
                source: result.source,
            };
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al cargar recomendaciones.' : 'Error loading recommendations.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const createProductInquiry = useCallback(async (
        input: ProductInquiryRequest,
    ): Promise<ProductInquiryResult | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await callWidgetApi<{ leadId?: string; product?: Record<string, any>; duplicate?: boolean }>('/products/inquiries', {
                productId: input.productId,
                productSlug: input.productSlug,
                name: input.name,
                email: input.email,
                phone: input.phone,
                message: input.message,
                quantity: input.quantity,
                consent: input.consent ?? options.consent,
                idempotencyKey: input.idempotencyKey,
            });

            if (!result.product) {
                throw new Error(isSpanish ? 'No se pudo confirmar el producto.' : 'Could not confirm the product.');
            }

            return {
                leadId: result.leadId,
                product: mapProduct(result.product),
                duplicate: result.duplicate === true,
            };
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al crear la consulta de producto.' : 'Error creating product inquiry.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish, options.consent]);

    const startCheckoutIntent = useCallback(async (
        input: CheckoutIntentRequest,
    ): Promise<CheckoutIntent | null> => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi<CheckoutIntent>('/checkout/intent', {
                items: input.items,
                idempotencyKey: input.idempotencyKey,
            });
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al preparar el checkout.' : 'Error preparing checkout.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const getShippingInfo = useCallback(async (): Promise<ShippingInfo | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await callWidgetApi<ShippingInfo>('/policies/shipping');
            if (!result.configured) {
                setError(isSpanish ? POLICY_NOT_CONFIGURED.es : POLICY_NOT_CONFIGURED.en);
                return null;
            }
            return result;
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al cargar la politica de envio.' : 'Error loading shipping policy.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const getReturnPolicy = useCallback(async (): Promise<ReturnPolicy | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await callWidgetApi<ReturnPolicy & { returnWindowDays?: number }>('/policies/returns');
            if (!result.configured) {
                setError(isSpanish ? POLICY_NOT_CONFIGURED.es : POLICY_NOT_CONFIGURED.en);
                return null;
            }
            return {
                ...result,
                returnWindow: result.returnWindow ?? asNumber(result.returnWindowDays),
            };
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al cargar la politica de devoluciones.' : 'Error loading returns policy.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish]);

    const requestBackInStock = useCallback(async (input: BackInStockRequest) => {
        setIsLoading(true);
        setError(null);

        try {
            return await callWidgetApi('/products/back-in-stock', {
                productId: input.productId,
                productSlug: input.productSlug,
                email: input.email,
                name: input.name,
                consent: input.consent ?? options.consent,
                marketingConsent: input.consent ?? options.marketingConsent,
            });
        } catch (err: any) {
            setError(err.message || (isSpanish ? 'Error al registrar el aviso de inventario.' : 'Error registering stock notification.'));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [callWidgetApi, isSpanish, options.consent, options.marketingConsent]);

    const getEcommerceContext = useCallback(async (): Promise<EcommerceChatContext | null> => {
        const shipping = await getShippingInfo();
        return {
            isEcommerceEnabled: true,
            storeName: 'Store',
            currency: shipping?.currency || 'USD',
            hasOrderLookup: true,
            hasProductSearch: true,
            hasProductRecommendations: true,
            hasProductInquiry: true,
            hasCheckoutIntent: true,
        };
    }, [getShippingInfo]);

    const formatOrderResponse = useCallback((order: OrderStatus | null): string => {
        if (!order) {
            return isSpanish
                ? 'No encontre una orden verificada con esa informacion.'
                : 'I could not find a verified order with that information.';
        }

        const label = order.orderNumber || order.orderId.slice(-6).toUpperCase();
        const lines = [
            isSpanish ? `Pedido #${label}` : `Order #${label}`,
            `${isSpanish ? 'Estado' : 'Status'}: ${order.statusLabel}`,
        ];
        if (order.paymentStatus) lines.push(`${isSpanish ? 'Pago' : 'Payment'}: ${order.paymentStatus}`);
        if (order.fulfillmentStatus) lines.push(`${isSpanish ? 'Fulfillment' : 'Fulfillment'}: ${order.fulfillmentStatus}`);
        if (order.trackingNumber) lines.push(`${isSpanish ? 'Seguimiento' : 'Tracking'}: ${order.trackingNumber}`);
        lines.push(`${isSpanish ? 'Total' : 'Total'}: ${order.currency} ${order.total.toFixed(2)}`);
        return lines.join('\n');
    }, [isSpanish]);

    const formatProductResponse = useCallback((product: ProductInfo | ProductInfo[] | null): string => {
        if (!product) {
            return isSpanish
                ? 'No encontre ese producto en el catalogo activo.'
                : 'I could not find that product in the active catalog.';
        }

        if (Array.isArray(product)) {
            if (product.length === 0) {
                return isSpanish
                    ? 'No encontre productos publicados con ese criterio.'
                    : 'I could not find published products with that search.';
            }

            return product.map((item, index) => [
                `${index + 1}. ${item.name} - ${item.currency} ${item.price.toFixed(2)}`,
                item.inStock ? (isSpanish ? 'Disponible' : 'In stock') : (isSpanish ? 'Agotado' : 'Out of stock'),
            ].join(' - ')).join('\n');
        }

        return [
            product.name,
            product.description,
            `${isSpanish ? 'Precio' : 'Price'}: ${product.currency} ${product.price.toFixed(2)}`,
            product.inStock ? (isSpanish ? 'Disponible' : 'Available') : (isSpanish ? 'Agotado' : 'Out of stock'),
            product.productUrl ? `${isSpanish ? 'Link' : 'Link'}: ${product.productUrl}` : '',
        ].filter(Boolean).join('\n');
    }, [isSpanish]);

    const formatRecommendationsResponse = useCallback((result: ProductRecommendationResult | null): string => {
        if (!result || result.products.length === 0) {
            return isSpanish
                ? 'No encontre recomendaciones publicadas con el catalogo activo.'
                : 'I could not find published recommendations in the active catalog.';
        }

        const title = isSpanish ? 'Recomendaciones:' : 'Recommendations:';
        return [
            title,
            formatProductResponse(result.products),
        ].filter(Boolean).join('\n');
    }, [formatProductResponse, isSpanish]);

    const formatProductInquiryResponse = useCallback((result: ProductInquiryResult | null): string => {
        if (!result) {
            return isSpanish
                ? 'No pude registrar la consulta de producto. Puedo recopilar tus datos para seguimiento humano.'
                : 'I could not register the product inquiry. I can collect your details for human follow-up.';
        }

        const duplicateNotice = result.duplicate
            ? (isSpanish ? 'Ya habia una consulta registrada para este producto.' : 'There was already an inquiry registered for this product.')
            : (isSpanish ? 'Consulta de producto registrada para seguimiento.' : 'Product inquiry registered for follow-up.');

        return [
            duplicateNotice,
            `${isSpanish ? 'Producto' : 'Product'}: ${result.product.name}`,
            result.leadId ? `${isSpanish ? 'Lead' : 'Lead'}: ${result.leadId}` : '',
        ].filter(Boolean).join('\n');
    }, [isSpanish]);

    const formatCheckoutIntentResponse = useCallback((intent: CheckoutIntent | null): string => {
        if (!intent) {
            return isSpanish
                ? 'No pude preparar el checkout con esos productos.'
                : 'I could not prepare checkout with those products.';
        }

        const checkoutUrl = intent.storefrontCheckoutUrl || intent.checkoutUrl;
        return [
            isSpanish ? 'Checkout preparado sin crear pagos desde ChatCore.' : 'Checkout prepared without creating payments from ChatCore.',
            `${isSpanish ? 'Subtotal' : 'Subtotal'}: ${intent.currency} ${intent.subtotal.toFixed(2)}`,
            checkoutUrl ? `${isSpanish ? 'Checkout' : 'Checkout'}: ${checkoutUrl}` : '',
        ].filter(Boolean).join('\n');
    }, [isSpanish]);

    return {
        checkOrderStatus,
        getProductInfo,
        recommendProducts,
        getShippingInfo,
        getReturnPolicy,
        getEcommerceContext,
        createProductInquiry,
        requestBackInStock,
        startCheckoutIntent,
        formatOrderResponse,
        formatProductResponse,
        formatRecommendationsResponse,
        formatProductInquiryResponse,
        formatCheckoutIntentResponse,
        isLoading,
        error,
    };
};

export default useEcommerceChat;
