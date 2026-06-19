/**
 * useOrders Hook
 * Hook para gestión de pedidos en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus, OrderItem, Address } from '../../../../types/ecommerce';
import { mapOrderFromDB, mapOrderToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannel';

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

    const fetchOrders = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        let query = supabase
            .from('store_orders')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false });

        if (options?.limitCount) {
            query = query.limit(options.limitCount);
        }

        if (options?.status) {
            query = query.eq('status', options.status);
        }

        if (options?.customerId) {
            query = query.eq('customer_id', options.customerId);
        }

        if (options?.startDate) {
            query = query.gte('created_at', options.startDate.toISOString());
        }

        if (options?.endDate) {
            query = query.lte('created_at', options.endDate.toISOString());
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching orders:', fetchError);
            setError(fetchError.message);
        } else {
            setOrders((data || []).map(mapOrderFromDB));
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId, options?.limitCount, options?.status, options?.customerId, options?.startDate, options?.endDate]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchOrders();

        const channel = supabase.channel(createRealtimeChannelName('store_orders_changes', effectiveStoreId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_orders',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchOrders();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchOrders]);

    // Generate order number
    const generateOrderNumber = useCallback(async (): Promise<string> => {
        const { data } = await supabase
            .from('store_orders')
            .select('order_number')
            .eq('project_id', effectiveStoreId)
            .order('created_at', { ascending: false })
            .limit(1);
        
        let nextNumber = 1;
        if (data && data.length > 0 && data[0].order_number) {
            const lastNumber = parseInt(data[0].order_number.replace('ORD-', ''), 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        return `ORD-${nextNumber.toString().padStart(6, '0')}`;
    }, [effectiveStoreId]);

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
            const orderNumber = await generateOrderNumber();

            const dbData = mapOrderToDB({
                ...orderData,
                orderNumber,
                discount: orderData.discount || 0,
                status: 'pending' as OrderStatus,
                paymentStatus: 'pending' as PaymentStatus,
                fulfillmentStatus: 'unfulfilled' as FulfillmentStatus,
            });

            dbData.project_id = effectiveStoreId;

            const { data: insertedOrder, error } = await supabase
                .from('store_orders')
                .insert(dbData)
                .select()
                .single();

            if (error) throw error;
            return insertedOrder.id;
        },
        [effectiveStoreId, generateOrderNumber]
    );

    // Update order status
    const updateOrderStatus = useCallback(
        async (orderId: string, status: OrderStatus) => {
            const updateData: any = {
                status,
            };

            const now = new Date().toISOString();

            // Set timestamps based on status
            if (status === 'cancelled') {
                updateData.cancelled_at = now;
            } else if (status === 'refunded') {
                updateData.refunded_at = now;
            } else if (status === 'shipped') {
                updateData.shipped_at = now;
                updateData.fulfillment_status = 'fulfilled';
            } else if (status === 'delivered') {
                updateData.delivered_at = now;
            }

            const { data, error } = await supabase
                .from('store_orders')
                .update(updateData)
                .eq('id', orderId)
                .select('*')
                .single();

            if (error) throw error;
            const updatedOrder = mapOrderFromDB(data);
            setOrders((currentOrders) =>
                currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
            );
            return updatedOrder;
        },
        []
    );

    // Update payment status
    const updatePaymentStatus = useCallback(
        async (orderId: string, paymentStatus: PaymentStatus, paymentIntentId?: string) => {
            const updateData: any = {
                payment_status: paymentStatus,
            };

            if (paymentIntentId) {
                updateData.payment_intent_id = paymentIntentId;
            }

            if (paymentStatus === 'paid') {
                updateData.paid_at = new Date().toISOString();
                updateData.status = 'paid';
            }

            const { error } = await supabase
                .from('store_orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) throw error;
        },
        []
    );

    // Update fulfillment status
    const updateFulfillmentStatus = useCallback(
        async (orderId: string, fulfillmentStatus: FulfillmentStatus) => {
            const { error } = await supabase
                .from('store_orders')
                .update({ fulfillment_status: fulfillmentStatus })
                .eq('id', orderId);

            if (error) throw error;
        },
        []
    );

    // Add tracking info
    const addTrackingInfo = useCallback(
        async (orderId: string, carrier: string, trackingNumber: string, trackingUrl?: string) => {
            const { data, error } = await supabase
                .from('store_orders')
                .update({
                    carrier,
                    tracking_number: trackingNumber,
                    tracking_url: trackingUrl,
                    status: 'shipped',
                    fulfillment_status: 'fulfilled',
                    shipped_at: new Date().toISOString(),
                })
                .eq('id', orderId)
                .select('*')
                .single();

            if (error) throw error;
            const updatedOrder = mapOrderFromDB(data);
            setOrders((currentOrders) =>
                currentOrders.map((order) => (order.id === orderId ? updatedOrder : order))
            );
            return updatedOrder;
        },
        []
    );

    // Add internal notes
    const addInternalNotes = useCallback(
        async (orderId: string, notes: string) => {
            const { error } = await supabase
                .from('store_orders')
                .update({ internal_notes: notes })
                .eq('id', orderId);

            if (error) throw error;
        },
        []
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
