/**
 * useEcommerceAnalytics Hook
 * Hook para analytics y métricas de ecommerce
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    where,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Order, OrderStatus, EcommerceStats, Product, Customer } from '../../../../types/ecommerce';

interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface UseEcommerceAnalyticsOptions {
    dateRange?: DateRange;
}

export const useEcommerceAnalytics = (
    userId: string,
    storeId?: string,
    options?: UseEcommerceAnalyticsOptions
) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const effectiveStoreId = storeId || '';
    const basePath = `users/${userId}/stores/${effectiveStoreId}`;

    // Fetch orders
    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const ordersRef = collection(db, `${basePath}/orders`);
        let q = query(ordersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Order[];

                // Filter by date range
                if (options?.dateRange) {
                    const startTs = options.dateRange.startDate.getTime() / 1000;
                    const endTs = options.dateRange.endDate.getTime() / 1000;
                    data = data.filter(
                        (o) => o.createdAt.seconds >= startTs && o.createdAt.seconds <= endTs
                    );
                }

                setOrders(data);
            },
            (err) => {
                console.error('Error fetching orders for analytics:', err);
                setError(err.message);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, basePath, options?.dateRange]);

    // Fetch products
    useEffect(() => {
        if (!userId || !effectiveStoreId) return;

        const productsRef = collection(db, `${basePath}/products`);
        const q = query(productsRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];
                setProducts(data);
            },
            (err) => {
                console.error('Error fetching products for analytics:', err);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, basePath]);

    // Fetch customers
    useEffect(() => {
        if (!userId || !effectiveStoreId) return;

        const customersRef = collection(db, `${basePath}/customers`);
        const q = query(customersRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Customer[];
                setCustomers(data);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error fetching customers for analytics:', err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, basePath]);

    // Calculate total revenue (only paid orders)
    const totalRevenue = useMemo(() => {
        return orders
            .filter((o) => o.paymentStatus === 'paid')
            .reduce((sum, o) => sum + o.total, 0);
    }, [orders]);

    // Total orders count
    const totalOrders = useMemo(() => orders.length, [orders]);

    // Total customers count
    const totalCustomers = useMemo(() => customers.length, [customers]);

    // Average order value
    const averageOrderValue = useMemo(() => {
        const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
        return paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    }, [orders, totalRevenue]);

    // Orders by status
    const ordersByStatus = useMemo(() => {
        const statuses: OrderStatus[] = [
            'pending',
            'paid',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'refunded',
        ];

        return statuses.reduce((acc, status) => {
            acc[status] = orders.filter((o) => o.status === status).length;
            return acc;
        }, {} as Record<OrderStatus, number>);
    }, [orders]);

    // Revenue by month
    const revenueByMonth = useMemo(() => {
        const monthlyData: Record<string, { revenue: number; orders: number }> = {};

        orders
            .filter((o) => o.paymentStatus === 'paid')
            .forEach((order) => {
                const date = new Date(order.createdAt.seconds * 1000);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { revenue: 0, orders: 0 };
                }

                monthlyData[monthKey].revenue += order.total;
                monthlyData[monthKey].orders += 1;
            });

        return Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                revenue: data.revenue,
                orders: data.orders,
            }));
    }, [orders]);

    // Top selling products
    const topProducts = useMemo(() => {
        const productSales: Record<string, { name: string; totalSold: number; revenue: number }> = {};

        orders
            .filter((o) => o.paymentStatus === 'paid')
            .forEach((order) => {
                order.items.forEach((item) => {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = {
                            name: item.name,
                            totalSold: 0,
                            revenue: 0,
                        };
                    }

                    productSales[item.productId].totalSold += item.quantity;
                    productSales[item.productId].revenue += item.totalPrice;
                });
            });

        return Object.entries(productSales)
            .map(([productId, data]) => ({
                productId,
                productName: data.name,
                totalSold: data.totalSold,
                revenue: data.revenue,
            }))
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 10);
    }, [orders]);

    // Top customers
    const topCustomers = useMemo(() => {
        return [...customers]
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)
            .map((c) => ({
                customerId: c.id,
                name: `${c.firstName} ${c.lastName}`,
                email: c.email,
                totalOrders: c.totalOrders,
                totalSpent: c.totalSpent,
            }));
    }, [customers]);

    // Revenue by day (last 30 days)
    const revenueByDay = useMemo(() => {
        const dailyData: Record<string, { revenue: number; orders: number }> = {};
        const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 60 * 60;

        orders
            .filter((o) => o.paymentStatus === 'paid' && o.createdAt.seconds >= thirtyDaysAgo)
            .forEach((order) => {
                const date = new Date(order.createdAt.seconds * 1000);
                const dayKey = date.toISOString().split('T')[0];

                if (!dailyData[dayKey]) {
                    dailyData[dayKey] = { revenue: 0, orders: 0 };
                }

                dailyData[dayKey].revenue += order.total;
                dailyData[dayKey].orders += 1;
            });

        return Object.entries(dailyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([day, data]) => ({
                day,
                revenue: data.revenue,
                orders: data.orders,
            }));
    }, [orders]);

    // Conversion metrics
    const conversionMetrics = useMemo(() => {
        const paidOrders = orders.filter((o) => o.paymentStatus === 'paid').length;
        const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending').length;
        const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
        
        const conversionRate = orders.length > 0 ? (paidOrders / orders.length) * 100 : 0;
        const cancellationRate = orders.length > 0 ? (cancelledOrders / orders.length) * 100 : 0;

        return {
            paidOrders,
            pendingOrders,
            cancelledOrders,
            conversionRate,
            cancellationRate,
        };
    }, [orders]);

    // Low stock products
    const lowStockProducts = useMemo(() => {
        return products.filter(
            (p) => p.trackInventory && p.quantity <= (p.lowStockThreshold || 5)
        );
    }, [products]);

    // Get full stats object
    const getStats = useCallback((): EcommerceStats => {
        return {
            totalRevenue,
            totalOrders,
            totalCustomers,
            averageOrderValue,
            topProducts,
            revenueByMonth,
            ordersByStatus,
        };
    }, [totalRevenue, totalOrders, totalCustomers, averageOrderValue, topProducts, revenueByMonth, ordersByStatus]);

    // Compare with previous period
    const compareWithPreviousPeriod = useCallback(
        (currentStart: Date, currentEnd: Date) => {
            const periodLength = currentEnd.getTime() - currentStart.getTime();
            const previousStart = new Date(currentStart.getTime() - periodLength);
            const previousEnd = new Date(currentEnd.getTime() - periodLength);

            const currentStartTs = currentStart.getTime() / 1000;
            const currentEndTs = currentEnd.getTime() / 1000;
            const previousStartTs = previousStart.getTime() / 1000;
            const previousEndTs = previousEnd.getTime() / 1000;

            const currentPeriodOrders = orders.filter(
                (o) =>
                    o.paymentStatus === 'paid' &&
                    o.createdAt.seconds >= currentStartTs &&
                    o.createdAt.seconds <= currentEndTs
            );

            const previousPeriodOrders = orders.filter(
                (o) =>
                    o.paymentStatus === 'paid' &&
                    o.createdAt.seconds >= previousStartTs &&
                    o.createdAt.seconds <= previousEndTs
            );

            const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + o.total, 0);
            const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + o.total, 0);

            const revenueChange = previousRevenue > 0
                ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
                : currentRevenue > 0 ? 100 : 0;

            const ordersChange = previousPeriodOrders.length > 0
                ? ((currentPeriodOrders.length - previousPeriodOrders.length) / previousPeriodOrders.length) * 100
                : currentPeriodOrders.length > 0 ? 100 : 0;

            return {
                currentRevenue,
                previousRevenue,
                revenueChange,
                currentOrders: currentPeriodOrders.length,
                previousOrders: previousPeriodOrders.length,
                ordersChange,
            };
        },
        [orders]
    );

    return {
        // Loading state
        isLoading,
        error,

        // Raw data
        orders,
        products,
        customers,

        // Key metrics
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue,

        // Breakdowns
        ordersByStatus,
        revenueByMonth,
        revenueByDay,
        topProducts,
        topCustomers,
        lowStockProducts,

        // Conversion
        conversionMetrics,

        // Functions
        getStats,
        compareWithPreviousPeriod,
    };
};

