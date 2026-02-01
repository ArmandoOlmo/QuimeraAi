/**
 * useEcommerceChat Hook
 * Provides ecommerce functions for the chatbot to query orders, products, and shipping
 */

import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface OrderStatus {
    orderId: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    statusLabel: string;
    createdAt: Date;
    updatedAt: Date;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
    shippingAddress?: {
        name: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
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
    category?: string;
    variants?: Array<{
        id: string;
        name: string;
        price: number;
        inStock: boolean;
    }>;
}

export interface ShippingInfo {
    methods: Array<{
        id: string;
        name: string;
        description: string;
        price: number;
        estimatedDays: string;
    }>;
    freeShippingThreshold?: number;
}

export interface ReturnPolicy {
    acceptsReturns: boolean;
    returnWindow: number; // days
    conditions: string[];
    process: string[];
    refundMethod: string;
    shippingCost: string;
}

export interface EcommerceChatContext {
    isEcommerceEnabled: boolean;
    storeName: string;
    currency: string;
    hasOrderLookup: boolean;
    hasProductSearch: boolean;
}

// =============================================================================
// STATUS LABELS
// =============================================================================

const ORDER_STATUS_LABELS: Record<string, { es: string; en: string }> = {
    pending: { es: 'Pendiente de pago', en: 'Pending payment' },
    processing: { es: 'En preparación', en: 'Processing' },
    shipped: { es: 'Enviado', en: 'Shipped' },
    delivered: { es: 'Entregado', en: 'Delivered' },
    cancelled: { es: 'Cancelado', en: 'Cancelled' },
    refunded: { es: 'Reembolsado', en: 'Refunded' },
};

// =============================================================================
// HOOK
// =============================================================================

export const useEcommerceChat = (
    projectId: string,
    userId?: string,
    language: string = 'es'
) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSpanish = language === 'es';

    /**
     * Check order status by order ID or customer email
     */
    const checkOrderStatus = useCallback(async (
        identifier: string,
        identifierType: 'orderId' | 'email' = 'orderId'
    ): Promise<OrderStatus | null> => {
        if (!userId || !projectId) {
            setError(isSpanish 
                ? 'No se pudo conectar a la tienda' 
                : 'Could not connect to store');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const ordersRef = collection(db, 'users', userId, 'stores', projectId, 'orders');
            
            let orderQuery;
            if (identifierType === 'orderId') {
                // Search by order ID (could be full ID or last 4-6 chars)
                if (identifier.length <= 6) {
                    // Partial order ID - search orders and filter
                    orderQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(50));
                } else {
                    // Full order ID - direct lookup
                    const orderDoc = await getDoc(doc(ordersRef, identifier));
                    if (orderDoc.exists()) {
                        const data = orderDoc.data();
                        return formatOrderStatus(orderDoc.id, data, isSpanish);
                    }
                    return null;
                }
            } else {
                // Search by email
                orderQuery = query(
                    ordersRef,
                    where('customerEmail', '==', identifier.toLowerCase()),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );
            }

            const snapshot = await getDocs(orderQuery);
            
            if (snapshot.empty) {
                return null;
            }

            // If searching by partial ID, filter results
            if (identifierType === 'orderId' && identifier.length <= 6) {
                const matchingOrder = snapshot.docs.find(doc => 
                    doc.id.endsWith(identifier) || doc.id.includes(identifier)
                );
                if (matchingOrder) {
                    return formatOrderStatus(matchingOrder.id, matchingOrder.data(), isSpanish);
                }
                return null;
            }

            const orderDoc = snapshot.docs[0];
            return formatOrderStatus(orderDoc.id, orderDoc.data(), isSpanish);

        } catch (err) {
            console.error('Error checking order status:', err);
            setError(isSpanish 
                ? 'Error al buscar el pedido. Por favor intenta de nuevo.' 
                : 'Error searching for order. Please try again.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, isSpanish]);

    /**
     * Get product information by ID or search by name
     */
    const getProductInfo = useCallback(async (
        searchTerm: string,
        searchType: 'id' | 'name' = 'name'
    ): Promise<ProductInfo | ProductInfo[] | null> => {
        if (!userId || !projectId) {
            setError(isSpanish 
                ? 'No se pudo conectar a la tienda' 
                : 'Could not connect to store');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const productsRef = collection(db, 'users', userId, 'stores', projectId, 'products');
            
            if (searchType === 'id') {
                const productDoc = await getDoc(doc(productsRef, searchTerm));
                if (productDoc.exists()) {
                    return formatProductInfo(productDoc.id, productDoc.data());
                }
                return null;
            }

            // Search by name (case-insensitive search would require additional setup)
            // For now, we'll fetch recent products and filter client-side
            const productQuery = query(
                productsRef,
                where('status', '==', 'active'),
                limit(50)
            );

            const snapshot = await getDocs(productQuery);
            
            if (snapshot.empty) {
                return null;
            }

            const searchLower = searchTerm.toLowerCase();
            const matchingProducts = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    const name = (data.name || '').toLowerCase();
                    const description = (data.description || '').toLowerCase();
                    return name.includes(searchLower) || description.includes(searchLower);
                })
                .map(doc => formatProductInfo(doc.id, doc.data()))
                .slice(0, 5); // Return max 5 results

            return matchingProducts.length === 1 ? matchingProducts[0] : matchingProducts;

        } catch (err) {
            console.error('Error getting product info:', err);
            setError(isSpanish 
                ? 'Error al buscar el producto.' 
                : 'Error searching for product.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, isSpanish]);

    /**
     * Get shipping information for the store
     */
    const getShippingInfo = useCallback(async (): Promise<ShippingInfo | null> => {
        if (!userId || !projectId) {
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const storeRef = doc(db, 'users', userId, 'stores', projectId);
            const storeDoc = await getDoc(storeRef);
            
            if (!storeDoc.exists()) {
                return getDefaultShippingInfo(isSpanish);
            }

            const data = storeDoc.data();
            const shippingSettings = data.shippingSettings;

            if (!shippingSettings) {
                return getDefaultShippingInfo(isSpanish);
            }

            return {
                methods: shippingSettings.methods || getDefaultShippingInfo(isSpanish).methods,
                freeShippingThreshold: shippingSettings.freeShippingThreshold,
            };

        } catch (err) {
            console.error('Error getting shipping info:', err);
            return getDefaultShippingInfo(isSpanish);
        } finally {
            setIsLoading(false);
        }
    }, [userId, projectId, isSpanish]);

    /**
     * Get return policy for the store
     */
    const getReturnPolicy = useCallback(async (): Promise<ReturnPolicy> => {
        if (!userId || !projectId) {
            return getDefaultReturnPolicy(isSpanish);
        }

        try {
            const storeRef = doc(db, 'users', userId, 'stores', projectId);
            const storeDoc = await getDoc(storeRef);
            
            if (!storeDoc.exists()) {
                return getDefaultReturnPolicy(isSpanish);
            }

            const data = storeDoc.data();
            const returnPolicy = data.returnPolicy;

            if (!returnPolicy) {
                return getDefaultReturnPolicy(isSpanish);
            }

            return {
                acceptsReturns: returnPolicy.acceptsReturns ?? true,
                returnWindow: returnPolicy.returnWindow ?? 30,
                conditions: returnPolicy.conditions || getDefaultReturnPolicy(isSpanish).conditions,
                process: returnPolicy.process || getDefaultReturnPolicy(isSpanish).process,
                refundMethod: returnPolicy.refundMethod || getDefaultReturnPolicy(isSpanish).refundMethod,
                shippingCost: returnPolicy.shippingCost || getDefaultReturnPolicy(isSpanish).shippingCost,
            };

        } catch (err) {
            console.error('Error getting return policy:', err);
            return getDefaultReturnPolicy(isSpanish);
        }
    }, [userId, projectId, isSpanish]);

    /**
     * Get ecommerce context for the chatbot
     */
    const getEcommerceContext = useCallback(async (): Promise<EcommerceChatContext | null> => {
        if (!userId || !projectId) {
            return null;
        }

        try {
            const storeRef = doc(db, 'users', userId, 'stores', projectId);
            const storeDoc = await getDoc(storeRef);
            
            if (!storeDoc.exists()) {
                return null;
            }

            const data = storeDoc.data();

            return {
                isEcommerceEnabled: data.isActive ?? true,
                storeName: data.name || 'Tienda',
                currency: data.currency || 'USD',
                hasOrderLookup: true,
                hasProductSearch: true,
            };

        } catch (err) {
            console.error('Error getting ecommerce context:', err);
            return null;
        }
    }, [userId, projectId]);

    /**
     * Format order status response for chatbot
     */
    const formatOrderResponse = useCallback((order: OrderStatus | null): string => {
        if (!order) {
            return isSpanish
                ? 'No encontré ningún pedido con esa información. ¿Podrías verificar el número de orden o el email?'
                : 'I couldn\'t find any order with that information. Could you verify the order number or email?';
        }

        const statusLabel = order.statusLabel;
        let response = isSpanish
            ? `📦 **Pedido #${order.orderId.slice(-6).toUpperCase()}**\n\n`
            : `📦 **Order #${order.orderId.slice(-6).toUpperCase()}**\n\n`;

        response += isSpanish
            ? `**Estado:** ${statusLabel}\n`
            : `**Status:** ${statusLabel}\n`;

        if (order.trackingNumber) {
            response += isSpanish
                ? `**Número de seguimiento:** ${order.trackingNumber}\n`
                : `**Tracking number:** ${order.trackingNumber}\n`;
        }

        if (order.estimatedDelivery) {
            const dateStr = order.estimatedDelivery.toLocaleDateString(
                isSpanish ? 'es-ES' : 'en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            );
            response += isSpanish
                ? `**Entrega estimada:** ${dateStr}\n`
                : `**Estimated delivery:** ${dateStr}\n`;
        }

        response += isSpanish
            ? `\n**Total:** ${order.currency} ${order.total.toFixed(2)}`
            : `\n**Total:** ${order.currency} ${order.total.toFixed(2)}`;

        return response;
    }, [isSpanish]);

    /**
     * Format product response for chatbot
     */
    const formatProductResponse = useCallback((product: ProductInfo | ProductInfo[] | null): string => {
        if (!product) {
            return isSpanish
                ? 'No encontré ese producto. ¿Podrías darme más detalles?'
                : 'I couldn\'t find that product. Could you give me more details?';
        }

        if (Array.isArray(product)) {
            if (product.length === 0) {
                return isSpanish
                    ? 'No encontré productos con ese nombre.'
                    : 'I couldn\'t find products with that name.';
            }

            let response = isSpanish
                ? `Encontré ${product.length} productos:\n\n`
                : `I found ${product.length} products:\n\n`;

            product.forEach((p, idx) => {
                response += `${idx + 1}. **${p.name}** - ${p.currency} ${p.price.toFixed(2)}`;
                response += p.inStock 
                    ? (isSpanish ? ' ✅ En stock' : ' ✅ In stock')
                    : (isSpanish ? ' ❌ Agotado' : ' ❌ Out of stock');
                response += '\n';
            });

            return response;
        }

        let response = `🛍️ **${product.name}**\n\n`;
        response += `${product.description}\n\n`;
        response += `**${isSpanish ? 'Precio' : 'Price'}:** ${product.currency} ${product.price.toFixed(2)}`;
        
        if (product.compareAtPrice && product.compareAtPrice > product.price) {
            response += ` ~~${product.currency} ${product.compareAtPrice.toFixed(2)}~~`;
        }
        
        response += '\n';
        response += product.inStock
            ? (isSpanish ? '✅ **Disponible**' : '✅ **Available**')
            : (isSpanish ? '❌ **Agotado**' : '❌ **Out of stock**');

        return response;
    }, [isSpanish]);

    return {
        // Functions
        checkOrderStatus,
        getProductInfo,
        getShippingInfo,
        getReturnPolicy,
        getEcommerceContext,
        formatOrderResponse,
        formatProductResponse,
        // State
        isLoading,
        error,
    };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatOrderStatus(orderId: string, data: any, isSpanish: boolean): OrderStatus {
    const status = data.status || 'pending';
    const statusLabels = ORDER_STATUS_LABELS[status] || ORDER_STATUS_LABELS.pending;

    return {
        orderId,
        status,
        statusLabel: isSpanish ? statusLabels.es : statusLabels.en,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        estimatedDelivery: data.estimatedDelivery?.toDate?.() 
            ? data.estimatedDelivery.toDate() 
            : (data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined),
        shippingAddress: data.shippingAddress,
        items: data.items || [],
        total: data.total || 0,
        currency: data.currency || 'USD',
    };
}

function formatProductInfo(productId: string, data: any): ProductInfo {
    return {
        id: productId,
        name: data.name || 'Unknown Product',
        description: data.description || '',
        price: data.price || 0,
        compareAtPrice: data.compareAtPrice,
        currency: data.currency || 'USD',
        inStock: data.inStock ?? (data.stockQuantity > 0),
        stockQuantity: data.stockQuantity || 0,
        images: data.images || [],
        category: data.category,
        variants: data.variants,
    };
}

function getDefaultShippingInfo(isSpanish: boolean): ShippingInfo {
    return {
        methods: [
            {
                id: 'standard',
                name: isSpanish ? 'Envío Estándar' : 'Standard Shipping',
                description: isSpanish ? 'Entrega en 5-7 días hábiles' : 'Delivery in 5-7 business days',
                price: 5.99,
                estimatedDays: '5-7',
            },
            {
                id: 'express',
                name: isSpanish ? 'Envío Express' : 'Express Shipping',
                description: isSpanish ? 'Entrega en 2-3 días hábiles' : 'Delivery in 2-3 business days',
                price: 12.99,
                estimatedDays: '2-3',
            },
        ],
        freeShippingThreshold: 50,
    };
}

function getDefaultReturnPolicy(isSpanish: boolean): ReturnPolicy {
    return {
        acceptsReturns: true,
        returnWindow: 30,
        conditions: isSpanish ? [
            'El producto debe estar sin usar y en su empaque original',
            'Incluir recibo o comprobante de compra',
            'El producto no debe tener daños causados por el cliente',
        ] : [
            'Product must be unused and in original packaging',
            'Include receipt or proof of purchase',
            'Product must not have customer-caused damage',
        ],
        process: isSpanish ? [
            'Contacta a nuestro equipo de soporte para iniciar la devolución',
            'Recibirás un correo con las instrucciones y etiqueta de envío',
            'Empaca el producto y envíalo',
            'Una vez recibido, procesaremos tu reembolso en 5-7 días hábiles',
        ] : [
            'Contact our support team to initiate the return',
            'You will receive an email with instructions and shipping label',
            'Pack the product and ship it',
            'Once received, we will process your refund in 5-7 business days',
        ],
        refundMethod: isSpanish 
            ? 'Reembolso al método de pago original' 
            : 'Refund to original payment method',
        shippingCost: isSpanish 
            ? 'Envío de devolución gratuito para productos defectuosos' 
            : 'Free return shipping for defective products',
    };
}

export default useEcommerceChat;








