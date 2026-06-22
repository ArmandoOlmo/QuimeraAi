/**
 * useOrders Hook
 * Hook para gestión de pedidos en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus, OrderItem, Address } from '../../../../types/ecommerce';
import { mapOrderFromDB, mapOrderToDB } from '../../../../utils/ecommerceMappers';
import {
    appendOrderTimelineEvent,
    canCancelOrder,
    updateFulfillmentStatus as buildFulfillmentStatusUpdate,
    updateMerchantNotes as buildMerchantNotesUpdate,
    updateOrderTracking as buildOrderTrackingUpdate,
} from '../../../../utils/ecommerce/ecommerceOrderAdminService';
import { createRealtimeChannelName } from './realtimeChannel';

interface UseOrdersOptions {
    status?: OrderStatus;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    limitCount?: number;
}

type OrderColumnUpdates = Record<string, unknown>;
type OrderDataUpdates = Record<string, unknown>;
type OrderAdminMutationBuilder = (
    order: Order,
    data: Record<string, unknown>,
    now: string
) => {
    columnUpdates: OrderColumnUpdates;
    data: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const withoutUndefined = (record: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

const mapOrderDetailsToDB = (order: Partial<Order>): OrderColumnUpdates => {
    const data: OrderColumnUpdates = {};

    if (order.orderNumber !== undefined) data.order_number = order.orderNumber;
    if (order.customerEmail !== undefined) data.customer_email = order.customerEmail;
    if (order.customerName !== undefined) data.customer_name = order.customerName;
    if (order.customerPhone !== undefined) data.customer_phone = order.customerPhone;
    if (order.items !== undefined) data.items = order.items;
    if (order.subtotal !== undefined) data.subtotal = order.subtotal;
    if (order.discount !== undefined) data.discount = order.discount;
    if (order.discountCode !== undefined) data.discount_code = order.discountCode;
    if (order.discountAmount !== undefined) data.discount_amount = order.discountAmount;
    if (order.shippingCost !== undefined) data.shipping_cost = order.shippingCost;
    if (order.taxAmount !== undefined) data.tax_amount = order.taxAmount;
    if (order.total !== undefined) data.total = order.total;
    if (order.currency !== undefined) data.currency = order.currency;
    if (order.pricing !== undefined) data.pricing = order.pricing;
    if (order.shippingAddress !== undefined) data.shipping_address = order.shippingAddress;
    if (order.billingAddress !== undefined) data.billing_address = order.billingAddress;
    if (order.status !== undefined) data.status = order.status;
    if (order.paymentStatus !== undefined) data.payment_status = order.paymentStatus;
    if (order.fulfillmentStatus !== undefined) data.fulfillment_status = order.fulfillmentStatus;
    if (order.paymentMethod !== undefined) data.payment_method = order.paymentMethod;
    if (order.paymentIntentId !== undefined) data.payment_intent_id = order.paymentIntentId;
    if (order.shippingMethod !== undefined) data.shipping_method = order.shippingMethod;
    if (order.trackingNumber !== undefined) data.tracking_number = order.trackingNumber;
    if (order.trackingUrl !== undefined) data.tracking_url = order.trackingUrl;
    if (order.carrier !== undefined) data.carrier = order.carrier;
    if (order.notes !== undefined) data.notes = order.notes;
    if (order.customerNotes !== undefined) data.customer_notes = order.customerNotes;
    if (order.internalNotes !== undefined) data.internal_notes = order.internalNotes;

    return data;
};

export const useOrders = (userId: string, storeId?: string, options?: UseOrdersOptions) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';

    const applyOrderUpdate = useCallback(
        async (
            orderId: string,
            columnUpdates: OrderColumnUpdates,
            dataUpdates: OrderDataUpdates = {}
        ): Promise<Order> => {
            const now = new Date().toISOString();
            const { data: existingOrder, error: readError } = await supabase
                .from('store_orders')
                .select('data')
                .eq('id', orderId)
                .single();

            if (readError) throw readError;

            const existingData = isRecord(existingOrder?.data) ? existingOrder.data : {};
            const nextData = withoutUndefined({
                ...existingData,
                ...dataUpdates,
                updatedAt: now,
            });

            const updatePayload = withoutUndefined({
                ...columnUpdates,
                data: nextData,
                updated_at: now,
            });

            const { data, error } = await supabase
                .from('store_orders')
                .update(updatePayload)
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

    const applyOrderAdminMutation = useCallback(
        async (orderId: string, buildMutation: OrderAdminMutationBuilder): Promise<Order> => {
            const now = new Date().toISOString();
            const { data: existingRow, error: readError } = await supabase
                .from('store_orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (readError) throw readError;

            const existingOrder = mapOrderFromDB(existingRow);
            const existingData = isRecord(existingRow?.data) ? existingRow.data : {};
            const mutation = buildMutation(existingOrder, existingData, now);
            const nextData = withoutUndefined({
                ...mutation.data,
                updatedAt: now,
            });
            const updatePayload = withoutUndefined({
                ...mutation.columnUpdates,
                data: nextData,
                updated_at: now,
            });

            const { data, error } = await supabase
                .from('store_orders')
                .update(updatePayload)
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
            if (status === 'cancelled') {
                return applyOrderAdminMutation(orderId, (order, data, now) => {
                    if (!canCancelOrder({ ...order, data })) {
                        throw new Error('Paid orders require manual refund handling before cancellation.');
                    }

                    const timeline = appendOrderTimelineEvent({
                        data,
                        event: {
                            id: `order-cancelled-${now}`,
                            type: 'system',
                            message: 'Order cancelled by merchant admin',
                            createdAt: now,
                        },
                    });

                    return {
                        data: timeline.data,
                        columnUpdates: {
                            status: 'cancelled',
                            payment_status: 'cancelled',
                            fulfillment_status: 'cancelled',
                            cancelled_at: now,
                        },
                    };
                });
            }

            const updateData: any = {
                status,
            };
            const dataUpdates: OrderDataUpdates = {
                status,
            };

            const now = new Date().toISOString();

            // Set timestamps based on status
            if (status === 'refunded') {
                updateData.refunded_at = now;
                updateData.payment_status = 'refunded';
                dataUpdates.refundedAt = now;
                dataUpdates.paymentStatus = 'refunded';
            } else if (status === 'paid') {
                updateData.paid_at = now;
                updateData.payment_status = 'paid';
                dataUpdates.paidAt = now;
                dataUpdates.paymentStatus = 'paid';
            } else if (status === 'shipped') {
                updateData.shipped_at = now;
                updateData.fulfillment_status = 'fulfilled';
                dataUpdates.shippedAt = now;
                dataUpdates.fulfillmentStatus = 'fulfilled';
            } else if (status === 'delivered') {
                updateData.delivered_at = now;
                updateData.fulfillment_status = 'fulfilled';
                dataUpdates.deliveredAt = now;
                dataUpdates.fulfillmentStatus = 'fulfilled';
            }

            return applyOrderUpdate(orderId, updateData, dataUpdates);
        },
        [applyOrderAdminMutation, applyOrderUpdate]
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
            const dataUpdates: OrderDataUpdates = {
                paymentStatus,
                paymentIntentId,
            };

            if (paymentStatus === 'paid') {
                updateData.paid_at = new Date().toISOString();
                updateData.status = 'paid';
                dataUpdates.paidAt = updateData.paid_at;
                dataUpdates.status = 'paid';
            } else if (paymentStatus === 'refunded') {
                updateData.refunded_at = new Date().toISOString();
                updateData.status = 'refunded';
                dataUpdates.refundedAt = updateData.refunded_at;
                dataUpdates.status = 'refunded';
            }

            return applyOrderUpdate(orderId, updateData, dataUpdates);
        },
        [applyOrderUpdate]
    );

    // Update fulfillment status
    const updateFulfillmentStatus = useCallback(
        async (orderId: string, fulfillmentStatus: FulfillmentStatus) => {
            return applyOrderAdminMutation(orderId, (order, data, now) =>
                buildFulfillmentStatusUpdate({
                    order,
                    data,
                    status: fulfillmentStatus === 'partial' ? 'partially_fulfilled' : fulfillmentStatus,
                    now,
                })
            );
        },
        [applyOrderAdminMutation]
    );

    // Add tracking info
    const addTrackingInfo = useCallback(
        async (orderId: string, carrier: string, trackingNumber: string, trackingUrl?: string) => {
            return applyOrderAdminMutation(orderId, (order, data, now) =>
                buildOrderTrackingUpdate({
                    order,
                    data,
                    carrier,
                    trackingNumber,
                    trackingUrl,
                    now,
                })
            );
        },
        [applyOrderAdminMutation]
    );

    // Add internal notes
    const addInternalNotes = useCallback(
        async (orderId: string, notes: string) => {
            return applyOrderAdminMutation(orderId, (_order, data, now) =>
                buildMerchantNotesUpdate({
                    data,
                    merchantNotes: notes,
                    now,
                })
            );
        },
        [applyOrderAdminMutation]
    );

    const updateOrderDetails = useCallback(
        async (orderId: string, updates: Partial<Order>) => {
            return applyOrderUpdate(
                orderId,
                mapOrderDetailsToDB(updates),
                withoutUndefined(updates as Record<string, unknown>)
            );
        },
        [applyOrderUpdate]
    );

    const createRefund = useCallback(
        async () => {
            throw new Error('Refund execution is not available in D4. Handle paid-order refunds manually until V2.');
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
        updateOrderDetails,
        createRefund,
        getOrderById,
        getOrdersByStatus,
        getPendingOrdersCount,
        calculateTotals,
        generateOrderNumber,
    };
};
