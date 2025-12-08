/**
 * useOrders Hook
 * Hook para gestión de pedidos en Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    where,
    getDocs,
    limit,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus, OrderItem, Address } from '../../../../types/ecommerce';

interface UseOrdersOptions {
    status?: OrderStatus;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    limitCount?: number;
}

export const useOrders = (userId: string, storeId?: string, options?: UseOrdersOptions) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';
    const ordersPath = `users/${userId}/stores/${effectiveStoreId}/orders`;

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const ordersRef = collection(db, ordersPath);
        let q = query(ordersRef, orderBy('createdAt', 'desc'));

        if (options?.limitCount) {
            q = query(ordersRef, orderBy('createdAt', 'desc'), limit(options.limitCount));
        }

        if (options?.status) {
            q = query(ordersRef, where('status', '==', options.status), orderBy('createdAt', 'desc'));
        }

        if (options?.customerId) {
            q = query(ordersRef, where('customerId', '==', options.customerId), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Order[];

                // Filter by date range in memory
                if (options?.startDate) {
                    const startTs = options.startDate.getTime() / 1000;
                    data = data.filter((o) => o.createdAt.seconds >= startTs);
                }
                if (options?.endDate) {
                    const endTs = options.endDate.getTime() / 1000;
                    data = data.filter((o) => o.createdAt.seconds <= endTs);
                }

                setOrders(data);
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching orders:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, options?.status, options?.customerId, options?.limitCount, ordersPath]);

    // Generate order number
    const generateOrderNumber = useCallback(async (): Promise<string> => {
        const ordersRef = collection(db, ordersPath);
        const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        let nextNumber = 1;
        if (!snapshot.empty) {
            const lastOrder = snapshot.docs[0].data() as Order;
            const lastNumber = parseInt(lastOrder.orderNumber.replace('ORD-', ''), 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        return `ORD-${nextNumber.toString().padStart(6, '0')}`;
    }, [ordersPath]);

    // Create order
    const createOrder = useCallback(
        async (orderData: {
            customerEmail: string;
            customerName: string;
            customerPhone?: string;
            customerId?: string;
            items: OrderItem[];
            subtotal: number;
            discount?: number;
            discountCode?: string;
            shippingCost: number;
            taxAmount: number;
            total: number;
            currency: string;
            shippingAddress: Address;
            billingAddress?: Address;
            paymentMethod: string;
            shippingMethod?: string;
            customerNotes?: string;
        }): Promise<string> => {
            const ordersRef = collection(db, ordersPath);
            const orderNumber = await generateOrderNumber();

            const docRef = await addDoc(ordersRef, {
                ...orderData,
                orderNumber,
                discount: orderData.discount || 0,
                status: 'pending' as OrderStatus,
                paymentStatus: 'pending' as PaymentStatus,
                fulfillmentStatus: 'unfulfilled' as FulfillmentStatus,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            return docRef.id;
        },
        [ordersPath, generateOrderNumber]
    );

    // Update order status
    const updateOrderStatus = useCallback(
        async (orderId: string, status: OrderStatus) => {
            const orderRef = doc(db, ordersPath, orderId);
            const updateData: any = {
                status,
                updatedAt: serverTimestamp(),
            };

            // Set timestamps based on status
            if (status === 'cancelled') {
                updateData.cancelledAt = serverTimestamp();
            } else if (status === 'refunded') {
                updateData.refundedAt = serverTimestamp();
            } else if (status === 'shipped') {
                updateData.shippedAt = serverTimestamp();
                updateData.fulfillmentStatus = 'fulfilled';
            } else if (status === 'delivered') {
                updateData.deliveredAt = serverTimestamp();
            }

            await updateDoc(orderRef, updateData);
        },
        [ordersPath]
    );

    // Update payment status
    const updatePaymentStatus = useCallback(
        async (orderId: string, paymentStatus: PaymentStatus, paymentIntentId?: string) => {
            const orderRef = doc(db, ordersPath, orderId);
            const updateData: any = {
                paymentStatus,
                updatedAt: serverTimestamp(),
            };

            if (paymentIntentId) {
                updateData.paymentIntentId = paymentIntentId;
            }

            if (paymentStatus === 'paid') {
                updateData.paidAt = serverTimestamp();
                updateData.status = 'paid';
            }

            await updateDoc(orderRef, updateData);
        },
        [ordersPath]
    );

    // Update fulfillment status
    const updateFulfillmentStatus = useCallback(
        async (orderId: string, fulfillmentStatus: FulfillmentStatus) => {
            const orderRef = doc(db, ordersPath, orderId);
            await updateDoc(orderRef, {
                fulfillmentStatus,
                updatedAt: serverTimestamp(),
            });
        },
        [ordersPath]
    );

    // Add tracking info
    const addTrackingInfo = useCallback(
        async (orderId: string, trackingNumber: string, trackingUrl?: string) => {
            const orderRef = doc(db, ordersPath, orderId);
            await updateDoc(orderRef, {
                trackingNumber,
                trackingUrl,
                status: 'shipped',
                fulfillmentStatus: 'fulfilled',
                shippedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        },
        [ordersPath]
    );

    // Add internal notes
    const addInternalNotes = useCallback(
        async (orderId: string, notes: string) => {
            const orderRef = doc(db, ordersPath, orderId);
            await updateDoc(orderRef, {
                internalNotes: notes,
                updatedAt: serverTimestamp(),
            });
        },
        [ordersPath]
    );

    // Get order by ID
    const getOrderById = useCallback(
        (orderId: string): Order | undefined => {
            return orders.find((o) => o.id === orderId);
        },
        [orders]
    );

    // Get orders by status
    const getOrdersByStatus = useCallback(
        (status: OrderStatus): Order[] => {
            return orders.filter((o) => o.status === status);
        },
        [orders]
    );

    // Get pending orders count
    const getPendingOrdersCount = useCallback((): number => {
        return orders.filter((o) => o.status === 'pending' || o.status === 'paid').length;
    }, [orders]);

    // Calculate totals
    const calculateTotals = useCallback(() => {
        const totalRevenue = orders
            .filter((o) => o.paymentStatus === 'paid')
            .reduce((sum, o) => sum + o.total, 0);
        
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
        };
    }, [orders]);

    return {
        orders,
        isLoading,
        error,
        createOrder,
        updateOrderStatus,
        updatePaymentStatus,
        updateFulfillmentStatus,
        addTrackingInfo,
        addInternalNotes,
        getOrderById,
        getOrdersByStatus,
        getPendingOrdersCount,
        calculateTotals,
        generateOrderNumber,
    };
};

