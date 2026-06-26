import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEcommerceChat } from '../../../components/chat/hooks/useEcommerceChat';

const chatbotEngineContext = {
    sourceSurface: 'storefront' as const,
    sourceModule: 'ecommerce',
    entityType: 'product',
    entitySlug: 'ribeye-prime',
    contextKeys: ['storefront', 'product'],
    metadata: {
        routeView: 'product',
        productSlug: 'ribeye-prime',
    },
};

const okJson = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
});

describe('useEcommerceChat canonical actions', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('calls the canonical product recommendations endpoint with surface context', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            activeProductId: 'product-active',
            source: 'store_products',
            products: [{
                id: 'product-2',
                name: 'Ribeye Prime',
                description: 'Corte premium',
                price: 44,
                currency: 'USD',
                quantity: 3,
                inStock: true,
                slug: 'ribeye-prime',
                imageUrl: 'https://example.com/ribeye.jpg',
            }],
        }) as Response);

        const { result } = renderHook(() => useEcommerceChat('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            conversationId: 'conversation-1',
            consent: true,
            marketingConsent: false,
            chatbotEngineContext,
        }));

        let recommendations: Awaited<ReturnType<typeof result.current.recommendProducts>> = null;
        await act(async () => {
            recommendations = await result.current.recommendProducts({
                query: 'recomiendame algo similar',
                activeProductSlug: 'ribeye-prime',
                limit: 4,
                inStockOnly: true,
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/products/recommendations', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }));
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body).toMatchObject({
            query: 'recomiendame algo similar',
            activeProductSlug: 'ribeye-prime',
            limit: 4,
            inStockOnly: true,
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            conversationId: 'conversation-1',
            consent: true,
            marketingConsent: false,
        });
        expect(body.chatbotEngineContext).toMatchObject({ sourceSurface: 'storefront', entitySlug: 'ribeye-prime' });
        expect(recommendations?.products[0]).toMatchObject({
            id: 'product-2',
            name: 'Ribeye Prime',
            stockQuantity: 3,
            imageUrl: 'https://example.com/ribeye.jpg',
        });
        expect(result.current.formatRecommendationsResponse(recommendations)).toContain('Recomendaciones:');
    });

    it('creates product inquiries through the canonical widget endpoint', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            leadId: 'lead-1',
            duplicate: false,
            product: {
                id: 'product-1',
                name: 'Tomahawk',
                description: 'Corte para compartir',
                price: 68,
                currency: 'USD',
                inStock: true,
                quantity: 2,
                slug: 'tomahawk',
            },
        }) as Response);

        const { result } = renderHook(() => useEcommerceChat('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            conversationId: 'conversation-1',
            consent: true,
            chatbotEngineContext,
        }));

        let inquiry: Awaited<ReturnType<typeof result.current.createProductInquiry>> = null;
        await act(async () => {
            inquiry = await result.current.createProductInquiry({
                productSlug: 'tomahawk',
                name: 'Ana',
                email: 'ana@example.com',
                message: 'Quiero mas informacion',
                quantity: 1,
                consent: false,
                conversationId: 'conversation-action',
                idempotencyKey: 'inquiry-key',
                metadata: {
                    sourceIntent: 'product_question',
                },
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/products/inquiries', expect.any(Object));
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body).toMatchObject({
            productSlug: 'tomahawk',
            name: 'Ana',
            email: 'ana@example.com',
            message: 'Quiero mas informacion',
            quantity: 1,
            consent: false,
            conversationId: 'conversation-action',
            idempotencyKey: 'inquiry-key',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });
        expect(body.metadata).toMatchObject({
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            sourceIntent: 'product_question',
        });
        expect(inquiry).toMatchObject({
            leadId: 'lead-1',
            duplicate: false,
            product: { id: 'product-1', name: 'Tomahawk' },
        });
        expect(result.current.formatProductInquiryResponse(inquiry)).toContain('Consulta de producto registrada');
    });

    it('prepares checkout intents without creating payments from ChatCore', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            checkoutUrl: '/checkout',
            storefrontCheckoutUrl: '/store/project-1/checkout',
            idempotencyKey: 'checkout-key',
            items: [{
                productId: 'product-1',
                productSlug: 'ribeye-prime',
                name: 'Ribeye Prime',
                quantity: 1,
                unitPrice: 44,
                totalPrice: 44,
            }],
            subtotal: 44,
            currency: 'USD',
            paymentCreated: false,
            requiresCheckoutPage: true,
            source: 'chatbot-engine-checkout-intent',
        }) as Response);

        const { result } = renderHook(() => useEcommerceChat('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            chatbotEngineContext,
        }));

        let checkoutIntent: Awaited<ReturnType<typeof result.current.startCheckoutIntent>> = null;
        await act(async () => {
            checkoutIntent = await result.current.startCheckoutIntent({
                items: [{ productSlug: 'ribeye-prime', quantity: 1 }],
                conversationId: 'conversation-checkout',
                idempotencyKey: 'checkout-key',
                metadata: {
                    sourceIntent: 'checkout_request',
                },
            });
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/checkout/intent', expect.any(Object));
        const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
        expect(body).toMatchObject({
            items: [{ productSlug: 'ribeye-prime', quantity: 1 }],
            conversationId: 'conversation-checkout',
            idempotencyKey: 'checkout-key',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });
        expect(body.metadata).toMatchObject({
            sourceIntent: 'checkout_request',
        });
        expect(checkoutIntent).toMatchObject({
            paymentCreated: false,
            requiresCheckoutPage: true,
            storefrontCheckoutUrl: '/store/project-1/checkout',
        });
        expect(result.current.formatCheckoutIntentResponse(checkoutIntent)).toContain('sin crear pagos desde ChatCore');
    });

    it('normalizes returns policy response fields from the widget API', async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(okJson({
            configured: true,
            message: 'Politica cargada',
            acceptsReturns: true,
            returnWindowDays: 14,
            conditions: ['Producto sin usar'],
            process: ['Enviar solicitud'],
        }) as Response);

        const { result } = renderHook(() => useEcommerceChat('project-1', 'owner-1', 'es', {
            apiBaseUrl: '/widget',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        }));

        let policy: Awaited<ReturnType<typeof result.current.getReturnPolicy>> = null;
        await act(async () => {
            policy = await result.current.getReturnPolicy();
        });

        expect(fetchMock).toHaveBeenCalledWith('/widget/project-1/policies/returns', expect.any(Object));
        expect(policy?.returnWindow).toBe(14);
    });
});
