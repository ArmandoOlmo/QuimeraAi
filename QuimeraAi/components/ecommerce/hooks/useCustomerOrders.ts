/**
 * useCustomerOrders Hook
 * Hook para obtener el historial de pedidos de un cliente
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabase';
import { Order } from '../../../types/ecommerce';
import { mapOrderFromDB } from '../../../utils/ecommerceMappers';

export interface UseCustomerOrdersReturn {
    orders: Order[];
    isLoading: boolean;
    error: string | null;
    getOrderById: (orderId: string) => Promise<Order | null>;
    refetch: () => Promise<void>;
}

const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const buildStoreScopeFilter = (value: string) => {
    const filters = [`store_id.eq.${value}`, `public_store_id.eq.${value}`];
    if (isUuidLike(value)) filters.push(`project_id.eq.${value}`);
    return filters.join(',');
};

export const useCustomerOrders = (
    storeId: string,
    customerEmail: string
): UseCustomerOrdersReturn => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!storeId || !customerEmail) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: ordersError } = await supabase
                .from('store_orders')
                .select('*')
                .or(buildStoreScopeFilter(storeId))
                .eq('customer_email', customerEmail.toLowerCase())
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            setOrders((data || []).map(mapOrderFromDB));
        } catch (err: any) {
            console.error('Error fetching customer orders:', err);
            setError(err.message || 'Error al cargar los pedidos');
        } finally {
            setIsLoading(false);
        }
    }, [storeId, customerEmail]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const getOrderById = useCallback(
        async (orderId: string): Promise<Order | null> => {
            if (!storeId || !orderId || !customerEmail) return null;

            try {
                const { data, error: orderError } = await supabase
                    .from('store_orders')
                    .select('*')
                    .eq('id', orderId)
                    .eq('customer_email', customerEmail.toLowerCase())
                    .maybeSingle();

                if (orderError) throw orderError;
                if (!data) return null;

                const order = mapOrderFromDB(data);
                const belongsToStore = [order.storeId, order.publicStoreId, order.projectId]
                    .filter(Boolean)
                    .includes(storeId);

                return belongsToStore ? order : null;
            } catch (err) {
                console.error('Error fetching order:', err);
                return null;
            }
        },
        [storeId, customerEmail]
    );

    return {
        orders,
        isLoading,
        error,
        getOrderById,
        refetch: fetchOrders,
    };
};

export default useCustomerOrders;









