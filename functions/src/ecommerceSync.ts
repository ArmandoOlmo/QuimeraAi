/**
 * Ecommerce Sync Functions
 * Cloud Functions para sincronizar datos entre tiendas privadas y públicas
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail, formatDate } from './email/emailService';
import { getOrderConfirmationTemplate } from './email/templates/orderConfirmation';
import { getOrderShippedTemplate } from './email/templates/orderShipped';
import { getOrderDeliveredTemplate } from './email/templates/orderDelivered';
import { getNewOrderAdminTemplate } from './email/templates/newOrderAdmin';
import { getLowStockAlertTemplate } from './email/templates/lowStockAlert';

const db = admin.firestore();

// ============================================
// Email Helper Functions
// ============================================

interface EmailSettingsData {
    fromEmail?: string;
    fromName?: string;
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
}

interface StoreSettingsData {
    storeName?: string;
    storeEmail?: string;
    currency?: string;
    currencySymbol?: string;
    sendOrderConfirmation?: boolean;
    sendShippingNotification?: boolean;
    notifyOnNewOrder?: boolean;
    notifyOnLowStock?: boolean;
    orderNotificationEmail?: string;
    lowStockThreshold?: number;
}

/**
 * Get email settings for a store
 */
async function getEmailSettings(userId: string, storeId: string): Promise<EmailSettingsData | null> {
    try {
        const emailSettingsDoc = await db.doc(`users/${userId}/stores/${storeId}/settings/email`).get();
        return emailSettingsDoc.exists ? emailSettingsDoc.data() as EmailSettingsData : null;
    } catch (error) {
        console.error('Error getting email settings:', error);
        return null;
    }
}

/**
 * Get store settings
 */
async function getStoreSettings(userId: string, storeId: string): Promise<StoreSettingsData | null> {
    try {
        const storeSettingsDoc = await db.doc(`users/${userId}/stores/${storeId}/settings/general`).get();
        return storeSettingsDoc.exists ? storeSettingsDoc.data() as StoreSettingsData : null;
    } catch (error) {
        console.error('Error getting store settings:', error);
        return null;
    }
}

/**
 * Log email sent
 */
async function logEmailSent(
    userId: string,
    storeId: string,
    data: {
        type: 'transactional' | 'marketing';
        templateId: string;
        recipientEmail: string;
        recipientName?: string;
        subject: string;
        status: 'sent' | 'failed';
        providerMessageId?: string;
        errorMessage?: string;
        orderId?: string;
    }
) {
    try {
        await db.collection(`users/${userId}/stores/${storeId}/emailLogs`).add({
            ...data,
            provider: 'resend',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging email:', error);
    }
}

// ============================================
// Product Sync - Sync published products to public store
// ============================================

/**
 * Trigger: When a product is created/updated in private store
 * Action: Sync to publicStores if product is active
 */
export const onProductWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/products/{productId}')
    .onWrite(async (change, context) => {
        const { userId, storeId, productId } = context.params;
        const publicProductRef = db.doc(`publicStores/${storeId}/products/${productId}`);

        // Product was deleted
        if (!change.after.exists) {
            await publicProductRef.delete();
            console.log(`Product ${productId} deleted from public store`);
            return;
        }

        const product = change.after.data();

        // Only sync active/published products
        if (product?.status !== 'active') {
            // Remove from public if not active
            await publicProductRef.delete();
            console.log(`Product ${productId} removed from public (not active)`);
            return;
        }

        // Prepare public product data (exclude sensitive fields)
        const publicProduct = {
            id: productId,
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            images: product.images,
            categoryId: product.categoryId,
            tags: product.tags,
            variants: product.variants?.map((v: any) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                price: v.price,
                options: v.options,
                // Only show if in stock, not exact quantity
                inStock: v.quantity > 0,
            })),
            trackInventory: product.trackInventory,
            // Don't expose exact quantity, just availability
            inStock: product.trackInventory ? product.quantity > 0 : true,
            lowStock: product.trackInventory && product.quantity > 0 && product.quantity <= (product.lowStockThreshold || 5),
            // SEO
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            // Timestamps
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            storeId,
            userId,
        };

        await publicProductRef.set(publicProduct, { merge: true });
        console.log(`Product ${productId} synced to public store`);
    });

// ============================================
// Category Sync - Sync categories to public store
// ============================================

export const onCategoryWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/categories/{categoryId}')
    .onWrite(async (change, context) => {
        const { storeId, categoryId } = context.params;
        const publicCategoryRef = db.doc(`publicStores/${storeId}/categories/${categoryId}`);

        // Category was deleted
        if (!change.after.exists) {
            await publicCategoryRef.delete();
            return;
        }

        const category = change.after.data();

        // Prepare public category data
        const publicCategory = {
            id: categoryId,
            name: category?.name,
            slug: category?.slug,
            description: category?.description,
            image: category?.image,
            parentId: category?.parentId,
            order: category?.order,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await publicCategoryRef.set(publicCategory, { merge: true });
    });

// ============================================
// Discount Sync - Sync active discounts to public store
// ============================================

export const onDiscountWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/discounts/{discountId}')
    .onWrite(async (change, context) => {
        const { storeId, discountId } = context.params;
        const publicDiscountRef = db.doc(`publicStores/${storeId}/discounts/${discountId}`);

        // Discount was deleted
        if (!change.after.exists) {
            await publicDiscountRef.delete();
            return;
        }

        const discount = change.after.data();

        // Only sync active, non-expired discounts
        const now = new Date();
        const isActive = discount?.isActive === true;
        const notExpired = !discount?.endDate || new Date(discount.endDate.seconds * 1000) > now;
        const notStarted = discount?.startDate && new Date(discount.startDate.seconds * 1000) > now;
        const hasUsesLeft = !discount?.usageLimit || (discount?.usageCount || 0) < discount.usageLimit;

        if (!isActive || !notExpired || notStarted || !hasUsesLeft) {
            await publicDiscountRef.delete();
            return;
        }

        // Only expose code and type for validation (not the actual discount value for security)
        const publicDiscount = {
            id: discountId,
            code: discount.code,
            type: discount.type,
            value: discount.value,
            minimumOrderAmount: discount.minimumOrderAmount,
            endDate: discount.endDate,
            // Don't expose usage count or limit details
        };

        await publicDiscountRef.set(publicDiscount, { merge: true });
    });

// ============================================
// Order Processing - Update inventory and stats
// ============================================

export const onOrderCreate = functions.firestore
    .document('users/{userId}/stores/{storeId}/orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const { userId, storeId, orderId } = context.params;
        const order = snapshot.data();

        console.log(`Processing new order ${orderId} for store ${storeId}`);

        // 1. Update product inventory
        if (order.items && order.items.length > 0) {
            const batch = db.batch();

            for (const item of order.items) {
                const productRef = db.doc(`users/${userId}/stores/${storeId}/products/${item.productId}`);
                const productDoc = await productRef.get();

                if (productDoc.exists) {
                    const product = productDoc.data();

                    if (product?.trackInventory) {
                        const newQuantity = Math.max(0, (product.quantity || 0) - item.quantity);
                        batch.update(productRef, { quantity: newQuantity });

                        // Log inventory change
                        const logRef = db.collection(`users/${userId}/stores/${storeId}/inventoryLogs`).doc();
                        batch.set(logRef, {
                            productId: item.productId,
                            productName: item.productName,
                            type: 'sale',
                            quantity: -item.quantity,
                            previousQuantity: product.quantity,
                            newQuantity,
                            orderId,
                            orderNumber: order.orderNumber,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }
            }

            await batch.commit();
        }

        // 2. Update or create customer record
        if (order.customerEmail) {
            const customersRef = db.collection(`users/${userId}/stores/${storeId}/customers`);
            const customerQuery = await customersRef.where('email', '==', order.customerEmail).limit(1).get();

            if (customerQuery.empty) {
                // Create new customer
                await customersRef.add({
                    email: order.customerEmail,
                    firstName: order.shippingAddress?.firstName || '',
                    lastName: order.shippingAddress?.lastName || '',
                    phone: order.shippingAddress?.phone || '',
                    totalOrders: 1,
                    totalSpent: order.total || 0,
                    lastOrderDate: admin.firestore.FieldValue.serverTimestamp(),
                    addresses: order.shippingAddress ? [order.shippingAddress] : [],
                    tags: ['new'],
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else {
                // Update existing customer
                const customerDoc = customerQuery.docs[0];
                await customerDoc.ref.update({
                    totalOrders: admin.firestore.FieldValue.increment(1),
                    totalSpent: admin.firestore.FieldValue.increment(order.total || 0),
                    lastOrderDate: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }

        // 3. Update discount usage if applied
        if (order.discountCode) {
            const discountsRef = db.collection(`users/${userId}/stores/${storeId}/discounts`);
            const discountQuery = await discountsRef.where('code', '==', order.discountCode).limit(1).get();

            if (!discountQuery.empty) {
                await discountQuery.docs[0].ref.update({
                    usageCount: admin.firestore.FieldValue.increment(1),
                });
            }
        }

        // 4. Create order tracking record (public)
        const trackingCode = `${order.orderNumber}-${order.customerEmail?.split('@')[0] || 'guest'}`.toLowerCase();
        await db.doc(`orderTracking/${trackingCode}`).set({
            orderId,
            storeId,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            trackingNumber: order.trackingNumber || null,
            trackingUrl: order.trackingUrl || null,
            createdAt: order.createdAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 5. Send order confirmation email to customer
        const storeSettings = await getStoreSettings(userId, storeId);
        const emailSettings = await getEmailSettings(userId, storeId);

        if (storeSettings?.sendOrderConfirmation !== false && order.customerEmail) {
            try {
                const currencySymbol = storeSettings?.currencySymbol || '$';
                const orderDate = formatDate(order.createdAt || new Date());

                const emailHtml = getOrderConfirmationTemplate({
                    storeName: storeSettings?.storeName || 'Tu Tienda',
                    logoUrl: emailSettings?.logoUrl,
                    primaryColor: emailSettings?.primaryColor || '#4f46e5',
                    customerName: order.customerName || order.shippingAddress?.firstName || 'Cliente',
                    orderNumber: order.orderNumber,
                    orderDate,
                    items: order.items.map((item: any) => ({
                        name: item.name,
                        variantName: item.variantName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice?.toFixed(2) || '0.00',
                        totalPrice: item.totalPrice?.toFixed(2) || '0.00',
                        imageUrl: item.imageUrl,
                    })),
                    subtotal: (order.subtotal || 0).toFixed(2),
                    shipping: (order.shippingCost || 0).toFixed(2),
                    discount: order.discount ? order.discount.toFixed(2) : undefined,
                    tax: (order.taxAmount || 0).toFixed(2),
                    total: (order.total || 0).toFixed(2),
                    currencySymbol,
                    shippingAddress: order.shippingAddress,
                    footerText: emailSettings?.footerText,
                    socialLinks: emailSettings?.socialLinks,
                });

                const fromEmail = emailSettings?.fromEmail || storeSettings?.storeEmail || 'orders@quimera.ai';
                const fromName = emailSettings?.fromName || storeSettings?.storeName || 'Tu Tienda';

                const result = await sendEmail({
                    to: order.customerEmail,
                    subject: `Confirmacion de Pedido #${order.orderNumber}`,
                    html: emailHtml,
                    from: `${fromName} <${fromEmail}>`,
                    tags: [
                        { name: 'type', value: 'order-confirmation' },
                        { name: 'store', value: storeId },
                        { name: 'order', value: orderId },
                    ],
                });

                await logEmailSent(userId, storeId, {
                    type: 'transactional',
                    templateId: 'order-confirmation',
                    recipientEmail: order.customerEmail,
                    recipientName: order.customerName,
                    subject: `Confirmacion de Pedido #${order.orderNumber}`,
                    status: result.success ? 'sent' : 'failed',
                    providerMessageId: result.messageId,
                    errorMessage: result.error,
                    orderId,
                });

                console.log(`Order confirmation email ${result.success ? 'sent' : 'failed'} for order ${orderId}`);
            } catch (emailError) {
                console.error('Error sending order confirmation email:', emailError);
            }
        }

        // 6. Send new order notification to admin
        if (storeSettings?.notifyOnNewOrder !== false) {
            const adminEmail = storeSettings?.orderNotificationEmail || storeSettings?.storeEmail;
            
            if (adminEmail) {
                try {
                    const currencySymbol = storeSettings?.currencySymbol || '$';
                    const orderDate = formatDate(order.createdAt || new Date());
                    const dashboardUrl = `https://quimera.ai/dashboard/ecommerce/orders/${orderId}`;

                    const emailHtml = getNewOrderAdminTemplate({
                        storeName: storeSettings?.storeName || 'Tu Tienda',
                        logoUrl: emailSettings?.logoUrl,
                        primaryColor: emailSettings?.primaryColor || '#4f46e5',
                        orderNumber: order.orderNumber,
                        orderDate,
                        customerName: order.customerName || `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
                        customerEmail: order.customerEmail,
                        customerPhone: order.shippingAddress?.phone,
                        items: order.items.map((item: any) => ({
                            name: item.name,
                            variantName: item.variantName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice?.toFixed(2) || '0.00',
                            totalPrice: item.totalPrice?.toFixed(2) || '0.00',
                            sku: item.sku,
                        })),
                        subtotal: (order.subtotal || 0).toFixed(2),
                        shipping: (order.shippingCost || 0).toFixed(2),
                        discount: order.discount ? order.discount.toFixed(2) : undefined,
                        tax: (order.taxAmount || 0).toFixed(2),
                        total: (order.total || 0).toFixed(2),
                        currencySymbol,
                        paymentMethod: order.paymentMethod || 'Tarjeta',
                        shippingAddress: order.shippingAddress,
                        customerNotes: order.customerNotes,
                        dashboardUrl,
                    });

                    const result = await sendEmail({
                        to: adminEmail,
                        subject: `Nueva Orden #${order.orderNumber} - ${currencySymbol}${(order.total || 0).toFixed(2)}`,
                        html: emailHtml,
                        from: `${storeSettings?.storeName || 'Quimera'} <noreply@quimera.ai>`,
                        tags: [
                            { name: 'type', value: 'new-order-admin' },
                            { name: 'store', value: storeId },
                            { name: 'order', value: orderId },
                        ],
                    });

                    console.log(`Admin notification email ${result.success ? 'sent' : 'failed'} for order ${orderId}`);
                } catch (emailError) {
                    console.error('Error sending admin notification email:', emailError);
                }
            }
        }

        console.log(`Order ${orderId} processed successfully`);
    });

// ============================================
// Order Status Update - Sync tracking info & send emails
// ============================================

export const onOrderUpdate = functions.firestore
    .document('users/{userId}/stores/{storeId}/orders/{orderId}')
    .onUpdate(async (change, context) => {
        const { userId, storeId, orderId } = context.params;
        const before = change.before.data();
        const after = change.after.data();

        // Check if status or tracking changed
        const statusChanged = before.status !== after.status ||
            before.fulfillmentStatus !== after.fulfillmentStatus ||
            before.trackingNumber !== after.trackingNumber;

        if (statusChanged && after.orderNumber && after.customerEmail) {
            const trackingCode = `${after.orderNumber}-${after.customerEmail.split('@')[0]}`.toLowerCase();
            await db.doc(`orderTracking/${trackingCode}`).update({
                status: after.status,
                paymentStatus: after.paymentStatus,
                fulfillmentStatus: after.fulfillmentStatus,
                trackingNumber: after.trackingNumber || null,
                trackingUrl: after.trackingUrl || null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Get settings for email notifications
        const storeSettings = await getStoreSettings(userId, storeId);
        const emailSettings = await getEmailSettings(userId, storeId);

        // Send shipping notification email
        if (before.status !== 'shipped' && after.status === 'shipped') {
            if (storeSettings?.sendShippingNotification !== false && after.customerEmail) {
                try {
                    const emailHtml = getOrderShippedTemplate({
                        storeName: storeSettings?.storeName || 'Tu Tienda',
                        logoUrl: emailSettings?.logoUrl,
                        primaryColor: emailSettings?.primaryColor || '#4f46e5',
                        customerName: after.customerName || after.shippingAddress?.firstName || 'Cliente',
                        orderNumber: after.orderNumber,
                        shippingCarrier: after.shippingMethod,
                        trackingNumber: after.trackingNumber,
                        trackingUrl: after.trackingUrl,
                        estimatedDelivery: after.estimatedDelivery,
                        items: after.items.map((item: any) => ({
                            name: item.name,
                            quantity: item.quantity,
                            imageUrl: item.imageUrl,
                        })),
                        shippingAddress: after.shippingAddress,
                        footerText: emailSettings?.footerText,
                        socialLinks: emailSettings?.socialLinks,
                    });

                    const fromEmail = emailSettings?.fromEmail || storeSettings?.storeEmail || 'orders@quimera.ai';
                    const fromName = emailSettings?.fromName || storeSettings?.storeName || 'Tu Tienda';

                    const result = await sendEmail({
                        to: after.customerEmail,
                        subject: `Tu pedido #${after.orderNumber} ha sido enviado`,
                        html: emailHtml,
                        from: `${fromName} <${fromEmail}>`,
                        tags: [
                            { name: 'type', value: 'order-shipped' },
                            { name: 'store', value: storeId },
                            { name: 'order', value: orderId },
                        ],
                    });

                    await logEmailSent(userId, storeId, {
                        type: 'transactional',
                        templateId: 'order-shipped',
                        recipientEmail: after.customerEmail,
                        recipientName: after.customerName,
                        subject: `Tu pedido #${after.orderNumber} ha sido enviado`,
                        status: result.success ? 'sent' : 'failed',
                        providerMessageId: result.messageId,
                        errorMessage: result.error,
                        orderId,
                    });

                    console.log(`Shipping notification email ${result.success ? 'sent' : 'failed'} for order ${orderId}`);
                } catch (emailError) {
                    console.error('Error sending shipping notification email:', emailError);
                }
            }
        }

        // Send delivery notification email
        if (before.status !== 'delivered' && after.status === 'delivered') {
            if (after.customerEmail) {
                try {
                    const deliveryDate = formatDate(new Date());
                    const reviewUrl = `https://quimera.ai/review/${storeId}/${orderId}`;
                    const shopUrl = `https://quimera.ai/store/${storeId}`;

                    const emailHtml = getOrderDeliveredTemplate({
                        storeName: storeSettings?.storeName || 'Tu Tienda',
                        logoUrl: emailSettings?.logoUrl,
                        primaryColor: emailSettings?.primaryColor || '#4f46e5',
                        customerName: after.customerName || after.shippingAddress?.firstName || 'Cliente',
                        orderNumber: after.orderNumber,
                        deliveryDate,
                        reviewUrl,
                        shopUrl,
                        items: after.items.map((item: any) => ({
                            name: item.name,
                            quantity: item.quantity,
                            imageUrl: item.imageUrl,
                        })),
                        footerText: emailSettings?.footerText,
                        socialLinks: emailSettings?.socialLinks,
                    });

                    const fromEmail = emailSettings?.fromEmail || storeSettings?.storeEmail || 'orders@quimera.ai';
                    const fromName = emailSettings?.fromName || storeSettings?.storeName || 'Tu Tienda';

                    const result = await sendEmail({
                        to: after.customerEmail,
                        subject: `Tu pedido #${after.orderNumber} ha sido entregado`,
                        html: emailHtml,
                        from: `${fromName} <${fromEmail}>`,
                        tags: [
                            { name: 'type', value: 'order-delivered' },
                            { name: 'store', value: storeId },
                            { name: 'order', value: orderId },
                        ],
                    });

                    await logEmailSent(userId, storeId, {
                        type: 'transactional',
                        templateId: 'order-delivered',
                        recipientEmail: after.customerEmail,
                        recipientName: after.customerName,
                        subject: `Tu pedido #${after.orderNumber} ha sido entregado`,
                        status: result.success ? 'sent' : 'failed',
                        providerMessageId: result.messageId,
                        errorMessage: result.error,
                        orderId,
                    });

                    console.log(`Delivery notification email ${result.success ? 'sent' : 'failed'} for order ${orderId}`);
                } catch (emailError) {
                    console.error('Error sending delivery notification email:', emailError);
                }
            }
        }
    });

// ============================================
// Low Stock Alert - Check and notify on product updates
// ============================================

export const onProductUpdateCheckStock = functions.firestore
    .document('users/{userId}/stores/{storeId}/products/{productId}')
    .onUpdate(async (change, context) => {
        const { userId, storeId, productId } = context.params;
        const before = change.before.data();
        const after = change.after.data();

        // Only check if inventory tracking is enabled and quantity changed
        if (!after.trackInventory) return;
        if (before.quantity === after.quantity) return;

        const threshold = after.lowStockThreshold || 5;
        const wasAboveThreshold = before.quantity > threshold;
        const isBelowThreshold = after.quantity <= threshold;

        // Only notify when crossing the threshold (from above to below)
        if (wasAboveThreshold && isBelowThreshold) {
            const storeSettings = await getStoreSettings(userId, storeId);
            
            if (storeSettings?.notifyOnLowStock !== false) {
                const adminEmail = storeSettings?.orderNotificationEmail || storeSettings?.storeEmail;
                
                if (adminEmail) {
                    try {
                        const emailSettings = await getEmailSettings(userId, storeId);
                        const dashboardUrl = `https://quimera.ai/dashboard/ecommerce/products/${productId}`;

                        const emailHtml = getLowStockAlertTemplate({
                            storeName: storeSettings?.storeName || 'Tu Tienda',
                            logoUrl: emailSettings?.logoUrl,
                            primaryColor: emailSettings?.primaryColor || '#4f46e5',
                            products: [{
                                name: after.name,
                                sku: after.sku,
                                currentStock: after.quantity,
                                threshold,
                                imageUrl: after.images?.[0]?.url,
                                productUrl: dashboardUrl,
                            }],
                            dashboardUrl: `https://quimera.ai/dashboard/ecommerce/stock-alerts`,
                        });

                        const result = await sendEmail({
                            to: adminEmail,
                            subject: `Alerta de Stock: ${after.name} tiene stock bajo`,
                            html: emailHtml,
                            from: `${storeSettings?.storeName || 'Quimera'} <noreply@quimera.ai>`,
                            tags: [
                                { name: 'type', value: 'low-stock-alert' },
                                { name: 'store', value: storeId },
                                { name: 'product', value: productId },
                            ],
                        });

                        console.log(`Low stock alert email ${result.success ? 'sent' : 'failed'} for product ${productId}`);
                    } catch (emailError) {
                        console.error('Error sending low stock alert email:', emailError);
                    }
                }
            }
        }
    });

// ============================================
// Store Settings Sync - Sync public store info
// ============================================

export const onStoreSettingsWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/settings/general')
    .onWrite(async (change, context) => {
        const { storeId } = context.params;
        const publicStoreRef = db.doc(`publicStores/${storeId}`);

        if (!change.after.exists) {
            await publicStoreRef.delete();
            return;
        }

        const settings = change.after.data();

        // Public store info
        const publicStore = {
            id: storeId,
            name: settings?.storeName,
            description: settings?.storeDescription,
            logo: settings?.logo,
            currency: settings?.currency,
            currencySymbol: settings?.currencySymbol,
            // Don't expose sensitive settings
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await publicStoreRef.set(publicStore, { merge: true });
    });

// ============================================
// Store Settings (Main) Sync - Sync storefront theme
// ============================================

export const onStoreMainSettingsWrite = functions.firestore
    .document('users/{userId}/stores/{storeId}/settings/store')
    .onWrite(async (change, context) => {
        const { storeId, userId } = context.params;
        const publicStoreRef = db.doc(`publicStores/${storeId}`);

        if (!change.after.exists) {
            return;
        }

        const settings = change.after.data();

        // Sync storefront theme and public store info
        const publicStoreData: Record<string, any> = {
            id: storeId,
            userId,
            name: settings?.storeName,
            currency: settings?.currency,
            currencySymbol: settings?.currencySymbol,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Sync storefront theme if present
        if (settings?.storefrontTheme) {
            publicStoreData.storefrontTheme = settings.storefrontTheme;
            
            // Also sync as flat theme object for backwards compatibility
            publicStoreData.theme = {
                primaryColor: settings.storefrontTheme.primaryColor,
                secondaryColor: settings.storefrontTheme.secondaryColor,
                accentColor: settings.storefrontTheme.accentColor,
                backgroundColor: settings.storefrontTheme.backgroundColor,
                textColor: settings.storefrontTheme.textColor,
                headingColor: settings.storefrontTheme.headingColor,
                fontFamily: settings.storefrontTheme.fontFamily,
            };
        }

        await publicStoreRef.set(publicStoreData, { merge: true });
        console.log(`Store settings and theme synced for store ${storeId}`);
    });

// ============================================
// Validate Discount Code (Callable)
// ============================================

interface ValidateDiscountRequest {
    storeId: string;
    code: string;
    cartTotal: number;
}

export const validateDiscount = functions.https.onCall(async (data: ValidateDiscountRequest) => {
    const { storeId, code, cartTotal } = data;

    if (!storeId || !code) {
        return { valid: false, error: 'Missing store ID or code' };
    }

    const discountDoc = await db
        .collection(`publicStores/${storeId}/discounts`)
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

    if (discountDoc.empty) {
        return { valid: false, error: 'Código no válido' };
    }

    const discount = discountDoc.docs[0].data();

    // Check minimum order amount
    if (discount.minimumOrderAmount && cartTotal < discount.minimumOrderAmount) {
        return {
            valid: false,
            error: `Mínimo de compra: $${discount.minimumOrderAmount.toFixed(2)}`,
        };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percentage') {
        discountAmount = (cartTotal * discount.value) / 100;
    } else if (discount.type === 'fixed_amount') {
        discountAmount = Math.min(discount.value, cartTotal);
    } else if (discount.type === 'free_shipping') {
        discountAmount = 0; // Handled separately
    }

    return {
        valid: true,
        discount: {
            code: discount.code,
            type: discount.type,
            value: discount.value,
            discountAmount,
            freeShipping: discount.type === 'free_shipping',
        },
    };
});

// ============================================
// Track Order (Callable)
// ============================================

interface TrackOrderRequest {
    orderNumber: string;
    email: string;
}

export const trackOrder = functions.https.onCall(async (data: TrackOrderRequest) => {
    const { orderNumber, email } = data;

    if (!orderNumber || !email) {
        return { found: false, error: 'Missing order number or email' };
    }

    const trackingCode = `${orderNumber}-${email.split('@')[0]}`.toLowerCase();
    const trackingDoc = await db.doc(`orderTracking/${trackingCode}`).get();

    if (!trackingDoc.exists) {
        return { found: false, error: 'Pedido no encontrado' };
    }

    return {
        found: true,
        order: trackingDoc.data(),
    };
});



