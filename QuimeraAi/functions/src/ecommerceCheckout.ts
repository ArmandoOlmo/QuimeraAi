import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { STRIPE_CONFIG } from './config';

const db = admin.firestore();

const getStripe = () => {
    const secretKey = STRIPE_CONFIG.secretKey;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY not configured in .env');
    }
    return new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia' as any,
    });
};

function isValidEmail(email: string): boolean {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function sanitizeString(str: unknown, maxLength: number = 500): string {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

function isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

function hashAccessToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CreateStoreCheckoutIntentRequest {
    storeId: string;
    items: { productId: string; variantId?: string; quantity: number }[];
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    shippingAddress: any;
    billingAddress?: any;
    shippingMethodId?: string;
    idempotencyKey: string;
    notes?: string;
}

export const createStoreCheckoutIntent = functions.https.onCall(
    async (data: CreateStoreCheckoutIntentRequest, context) => {
        const {
            storeId,
            items,
            customerEmail,
            customerName,
            customerPhone,
            shippingAddress,
            billingAddress,
            shippingMethodId,
            idempotencyKey,
            notes
        } = data;

        // 1. Validate inputs
        if (!storeId || !isValidId(storeId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid storeId');
        }
        if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid items array');
        }
        if (!idempotencyKey || !isValidId(idempotencyKey)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid idempotencyKey');
        }
        if (!customerEmail || !isValidEmail(customerEmail)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
        }
        if (!shippingAddress) {
            throw new functions.https.HttpsError('invalid-argument', 'Shipping address is required');
        }

        try {
            // 2. Fetch Store info and verify Readiness
            const publicStoreRef = db.doc(`publicStores/${storeId}`);
            const publicStoreDoc = await publicStoreRef.get();
            if (!publicStoreDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Store not found');
            }
            
            const ownerId = publicStoreDoc.data()?.userId;
            if (!ownerId) {
                throw new functions.https.HttpsError('internal', 'Store owner not found');
            }

            // Get store private settings (for Stripe Connect details and currency)
            const storeSettingsRef = db.doc(`users/${ownerId}/stores/${storeId}/settings/store`);
            const storeSettingsDoc = await storeSettingsRef.get();
            const storeSettings = storeSettingsDoc.data() || {};
            const currency = (storeSettings.currency || 'usd').toLowerCase();

            // Validate Stripe Connect
            const connectedAccountId = storeSettings.stripeConnectAccountId;
            if (!storeSettings.stripeEnabled || !connectedAccountId || !storeSettings.stripeConnectChargesEnabled) {
                throw new functions.https.HttpsError('failed-precondition', 'Store is not ready to accept payments');
            }

            // 3. Fetch canonical products and validate stock/prices
            let subtotal = 0;
            const canonicalItems = [];

            for (const item of items) {
                if (item.quantity <= 0 || item.quantity > 100) {
                    throw new functions.https.HttpsError('invalid-argument', `Invalid quantity for product ${item.productId}`);
                }

                const productRef = db.doc(`users/${ownerId}/stores/${storeId}/products/${item.productId}`);
                const productDoc = await productRef.get();

                if (!productDoc.exists) {
                    throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
                }

                const productData = productDoc.data()!;
                if (productData.status !== 'active') {
                    throw new functions.https.HttpsError('failed-precondition', `Product ${productData.name} is not available`);
                }

                // Check stock
                if (productData.trackInventory !== false) {
                    let availableQuantity = productData.quantity || 0;
                    
                    // Note: If using variants, we should check variant stock here, but for MVP we simplify or assume total stock.
                    if (item.variantId && productData.hasVariants && productData.variants) {
                        const variant = productData.variants.find((v: any) => v.id === item.variantId);
                        if (!variant) {
                            throw new functions.https.HttpsError('not-found', `Variant not found`);
                        }
                        availableQuantity = variant.quantity || 0;
                        productData.price = variant.price;
                        productData.name = `${productData.name} - ${variant.name}`;
                    }

                    if (availableQuantity < item.quantity) {
                        throw new functions.https.HttpsError('failed-precondition', `Insufficient stock for ${productData.name}`);
                    }
                }

                const itemTotal = productData.price * item.quantity;
                subtotal += itemTotal;

                canonicalItems.push({
                    id: `${item.productId}-${item.variantId || 'default'}`,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    name: productData.name,
                    productName: productData.name,
                    variantName: item.variantId ? productData.name.split(' - ')[1] : null,
                    imageUrl: productData.images?.[0]?.url || null,
                    quantity: item.quantity,
                    unitPrice: productData.price,
                    totalPrice: itemTotal,
                });
            }

            // 4. Calculate Shipping
            let shippingTotal = 0;
            let shippingMethodName = 'Standard';
            
            if (storeSettings.shippingZones && storeSettings.shippingZones.length > 0) {
                // Simplified shipping calculation based on the first zone/rate matching the method ID
                // In a full implementation, match address country -> zone -> rate
                const allRates = storeSettings.shippingZones.flatMap((z: any) => z.rates || []);
                const selectedRate = allRates.find((r: any) => r.id === shippingMethodId) || allRates[0];
                
                if (selectedRate) {
                    shippingTotal = selectedRate.price || 0;
                    shippingMethodName = selectedRate.name || 'Standard';
                    
                    // Check free shipping threshold
                    if (storeSettings.freeShippingThreshold && subtotal >= storeSettings.freeShippingThreshold) {
                        shippingTotal = 0;
                        shippingMethodName = 'Free Shipping';
                    }
                }
            }

            // 5. Calculate Taxes
            let taxTotal = 0;
            if (storeSettings.taxEnabled && storeSettings.taxRate > 0) {
                taxTotal = subtotal * (storeSettings.taxRate / 100);
            }

            // 6. Final totals
            const discountTotal = 0; // Removing hardcoded discounts per instructions
            const total = Math.max(0, subtotal - discountTotal + shippingTotal + taxTotal);
            
            // Quimera Platform Fee calculation (e.g. 1% or flat fee)
            // For MVP, set to 0 or 1% if you have a platform fee model
            const applicationFeeAmount = Math.round(total * 0.01 * 100); // Example 1% in cents

            // 7. Initialize Stripe and create PaymentIntent via Stripe Connect
            const stripe = getStripe();

            // Hash the cart so we know if it changed
            const cartString = JSON.stringify({ items, shippingMethodId, total });
            const cartHash = crypto.createHash('sha256').update(cartString).digest('hex');
            const orderId = `ORD-${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 32).toUpperCase()}`;
            const ordersRef = db.collection(`users/${ownerId}/stores/${storeId}/orders`);
            const orderRef = ordersRef.doc(orderId);
            const existingOrderDoc = await orderRef.get();

            if (existingOrderDoc.exists) {
                const existingOrder = existingOrderDoc.data()!;
                if (existingOrder.cartHash !== cartHash) {
                    throw new functions.https.HttpsError(
                        'already-exists',
                        'Checkout already exists for a different cart. Refresh checkout and try again.'
                    );
                }

                return {
                    clientSecret: existingOrder.stripe?.clientSecret,
                    orderId,
                    orderAccessToken: existingOrder.orderAccessToken,
                    total: existingOrder.total,
                    cartHash
                };
            }

            const orderAccessToken = crypto.randomBytes(32).toString('base64url');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(total * 100),
                currency: currency,
                automatic_payment_methods: { enabled: true },
                application_fee_amount: applicationFeeAmount > 0 ? applicationFeeAmount : undefined,
                transfer_data: {
                    destination: connectedAccountId,
                },
                metadata: {
                    storeId,
                    ownerId,
                    orderId,
                    idempotencyKey,
                    cartHash
                },
            }, {
                idempotencyKey: `pi_${idempotencyKey}` // Ensure stripe side idempotency
            });

            // 8. Create Order Document in Private Canonical Collection
            const orderData = {
                orderNumber: orderId,
                customerEmail: sanitizeString(customerEmail),
                customerName: sanitizeString(customerName),
                customerPhone: sanitizeString(customerPhone) || null,
                items: canonicalItems,
                subtotal,
                discount: discountTotal,
                discountAmount: discountTotal,
                shippingCost: shippingTotal,
                taxAmount: taxTotal,
                total,
                currency,
                pricing: {
                    subtotal,
                    discountTotal,
                    shippingTotal,
                    taxTotal,
                    platformFeeTotal: applicationFeeAmount / 100,
                    total
                },
                shippingAddress,
                billingAddress: billingAddress || shippingAddress,
                status: 'pending',
                paymentStatus: 'pending',
                fulfillmentStatus: 'unfulfilled',
                paymentMethod: 'stripe',
                shippingMethod: shippingMethodName,
                notes: sanitizeString(notes) || null,
                checkoutIdempotencyKey: idempotencyKey,
                orderAccessToken,
                orderAccessTokenHash: hashAccessToken(orderAccessToken),
                cartHash,
                stripe: {
                    paymentIntentId: paymentIntent.id,
                    connectedAccountId: connectedAccountId,
                    clientSecret: paymentIntent.client_secret,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Save using orderId as document ID for easy lookup
            await orderRef.set(orderData);

            return {
                clientSecret: paymentIntent.client_secret,
                orderId: orderId,
                orderAccessToken,
                total: total,
                cartHash: cartHash
            };

        } catch (error: any) {
            console.error('Error in createStoreCheckoutIntent:', error);
            if (error instanceof functions.https.HttpsError) {
                throw error;
            }
            throw new functions.https.HttpsError('internal', error.message || 'Failed to process checkout');
        }
    }
);

export interface GetStoreOrderStatusRequest {
    storeId: string;
    orderId: string;
    orderAccessToken?: string;
}

export const getStoreOrderStatus = functions.https.onCall(
    async (data: GetStoreOrderStatusRequest, context) => {
        const { storeId, orderId, orderAccessToken } = data;
        if (!storeId || !orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');

        const publicStoreRef = db.doc(`publicStores/${storeId}`);
        const publicStoreDoc = await publicStoreRef.get();
        if (!publicStoreDoc.exists) throw new functions.https.HttpsError('not-found', 'Store not found');
        const ownerId = publicStoreDoc.data()?.userId;

        const orderRef = db.doc(`users/${ownerId}/stores/${storeId}/orders/${orderId}`);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found');
        }

        const orderData = orderDoc.data()!;
        const isOwner = context.auth?.uid === ownerId;
        const hasValidAccessToken = !!orderAccessToken &&
            !!orderData.orderAccessTokenHash &&
            hashAccessToken(orderAccessToken) === orderData.orderAccessTokenHash;

        if (!isOwner && !hasValidAccessToken) {
            throw new functions.https.HttpsError('permission-denied', 'Order access token is required');
        }
        
        // Return only safe data for confirmation page
        return {
            id: orderDoc.id,
            orderNumber: orderData.orderNumber,
            status: orderData.status,
            paymentStatus: orderData.paymentStatus,
            paymentMethod: orderData.paymentMethod,
            fulfillmentStatus: orderData.fulfillmentStatus,
            subtotal: orderData.subtotal || 0,
            discountAmount: orderData.discountAmount || 0,
            discountCode: orderData.discountCode || null,
            shippingCost: orderData.shippingCost || 0,
            taxAmount: orderData.taxAmount || 0,
            total: orderData.total,
            currency: orderData.currency,
            items: orderData.items,
            shippingAddress: orderData.shippingAddress,
            customerEmail: orderData.customerEmail,
            createdAt: orderData.createdAt?.toDate?.()?.toISOString() || null
        };
    }
);

export interface RefundStoreOrderRequest {
    storeId: string;
    orderId: string;
    reason?: string;
}

export const refundStoreOrder = functions.https.onCall(
    async (data: RefundStoreOrderRequest, context) => {
        const { storeId, orderId, reason } = data;
        const uid = context.auth?.uid;
        
        if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
        if (!storeId || !orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');

        // Verify ownership
        const orderRef = db.doc(`users/${uid}/stores/${storeId}/orders/${orderId}`);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
             throw new functions.https.HttpsError('not-found', 'Order not found');
        }

        const orderData = orderDoc.data()!;
        if (orderData.paymentStatus === 'refunded') {
             throw new functions.https.HttpsError('failed-precondition', 'Order is already refunded');
        }

        if (!orderData.stripe?.paymentIntentId) {
             throw new functions.https.HttpsError('failed-precondition', 'Order has no Stripe payment intent');
        }

        try {
            const stripe = getStripe();
            
            // Standard refund for destination charges created on the platform
            await stripe.refunds.create({
                payment_intent: orderData.stripe.paymentIntentId,
                reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
                reverse_transfer: true,
            });
            
            await orderRef.update({
                 paymentStatus: 'refunded',
                 status: 'refunded',
                 refundReason: reason || null,
                 refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error: any) {
             console.error('Error refunding order:', error);
             throw new functions.https.HttpsError('internal', error.message || 'Failed to refund order');
        }
    }
);
