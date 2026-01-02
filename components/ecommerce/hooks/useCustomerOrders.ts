/**
 * useCustomerOrders Hook
 * Hook para obtener el historial de pedidos de un cliente
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Order, OrderStatus } from '../../../types/ecommerce';

export interface UseCustomerOrdersReturn {
    orders: Order[];
    isLoading: boolean;
    error: string | null;
    getOrderById: (orderId: string) => Promise<Order | null>;
    refetch: () => Promise<void>;
}

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
            // Query public orders by customer email
            const ordersRef = collection(db, 'publicStores', storeId, 'customerOrders');
            const q = query(
                ordersRef,
                where('customerEmail', '==', customerEmail.toLowerCase()),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            const ordersData = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Order[];

            setOrders(ordersData);
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
            if (!storeId || !orderId) return null;

            try {
                const orderRef = doc(db, 'publicStores', storeId, 'customerOrders', orderId);
                const orderDoc = await getDoc(orderRef);

                if (orderDoc.exists()) {
                    return { ...orderDoc.data(), id: orderDoc.id } as Order;
                }
                return null;
            } catch (err) {
                console.error('Error fetching order:', err);
                return null;
            }
        },
        [storeId]
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











