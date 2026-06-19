/**
 * OrdersView
 * Vista de gestión de pedidos
 * Usa clases de Tailwind del tema (bg-primary, text-primary, etc.)
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    ShoppingCart,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Eye,
    Loader2,
    X,
} from 'lucide-react';
import { useEditor } from '../../../../contexts/EditorContext';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { Order, OrderStatus } from '../../../../types/ecommerce';
import type { StoredTimestamp } from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import { useEcommerceContext } from '../EcommerceDashboard';
import { CatalogFilterBar, FilterChipRow } from '../../filters';

type OrderStatusFilter = OrderStatus | 'all';
type OrderStatusConfig = { icon: React.ElementType; color: string; bg: string; label: string };

const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pendiente' },
    paid: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Pagado' },
    processing: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Procesando' },
    shipped: { icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Enviado' },
    delivered: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Entregado' },
    cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelado' },
    refunded: { icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Reembolsado' },
};

const getStatusConfig = (status: unknown): OrderStatusConfig => {
    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ORDER_STATUS_CONFIGS, status)) {
        return ORDER_STATUS_CONFIGS[status as OrderStatus];
    }
    return ORDER_STATUS_CONFIGS.pending;
};

const OrdersView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { orders, isLoading, updateOrderStatus, addTrackingInfo } = useOrders(user?.id || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);

    // Filter orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const matchesSearch =
                !searchTerm ||
                order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, selectedStatus]);

    // Order stats
    const stats = useMemo(() => {
        return {
            pending: orders.filter((o) => o.status === 'pending').length,
            paid: orders.filter((o) => o.status === 'paid').length,
            shipped: orders.filter((o) => o.status === 'shipped').length,
            delivered: orders.filter((o) => o.status === 'delivered').length,
        };
    }, [orders]);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setShowDrawer(true);
    };

    const handleCloseDrawer = () => {
        setShowDrawer(false);
        setSelectedOrder(null);
    };

    const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
        const updatedOrder = await updateOrderStatus(orderId, status);
        setSelectedOrder((currentOrder) =>
            currentOrder?.id === orderId ? updatedOrder : currentOrder
        );
    };

    const handleAddTrackingInfo = async (
        orderId: string,
        carrier: string,
        trackingNumber: string,
        trackingUrl?: string
    ) => {
        const updatedOrder = await addTrackingInfo(orderId, carrier, trackingNumber, trackingUrl);
        setSelectedOrder((currentOrder) =>
            currentOrder?.id === orderId ? updatedOrder : currentOrder
        );
    };

    const formatDate = (timestamp: StoredTimestamp) => {
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">
                    {t('ecommerce.orders', 'Pedidos')}
                </h2>
                <p className="text-q-text-muted">
                    {orders.length} {t('ecommerce.ordersTotal', 'pedidos en total')}
                </p>
            </div>

            {/* Status Filter Chips */}
            <CatalogFilterBar
                filters={
                    <FilterChipRow
                        value={selectedStatus}
                        onChange={(value) => setSelectedStatus(value as OrderStatusFilter)}
                        options={[
                            { id: 'all', label: t('ecommerce.all', 'Todos'), count: orders.length },
                            {
                                id: 'pending',
                                label: t('ecommerce.pending', 'Pendientes'),
                                count: stats.pending,
                                color: 'gray',
                            },
                            {
                                id: 'paid',
                                label: t('ecommerce.paid', 'Pagados'),
                                count: stats.paid,
                                color: 'green',
                            },
                            {
                                id: 'shipped',
                                label: t('ecommerce.shipped', 'Enviados'),
                                count: stats.shipped,
                            },
                            {
                                id: 'delivered',
                                label: t('ecommerce.delivered', 'Entregados'),
                                count: stats.delivered,
                                color: 'green',
                            },
                        ]}
                    />
                }
            />

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 bg-q-surface-overlay/40 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-q-text-secondary flex-shrink-0" />
                <input
                    type="text"
                    placeholder={t('ecommerce.searchOrders', 'Buscar por número, cliente o email...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm min-w-0"
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="text-q-text-secondary hover:text-q-text flex-shrink-0">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-q-surface/50 rounded-xl border border-q-border">
                    <ShoppingCart className="mx-auto text-q-text-muted mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noOrders', 'No hay pedidos')}
                    </h3>
                    <p className="text-q-text-muted">
                        {searchTerm || selectedStatus !== 'all'
                            ? t('ecommerce.noOrdersFilter', 'No se encontraron pedidos con los filtros aplicados')
                            : t('ecommerce.noOrdersYet', 'Aún no has recibido ningún pedido')}
                    </p>
                </div>
            ) : (
                <>
                <div className="space-y-3 sm:hidden">
                    {filteredOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <div key={order.id} className="rounded-xl border border-q-border bg-q-surface/50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground">{order.orderNumber}</p>
                                        <p className="truncate text-sm text-q-text-muted">{order.customerName}</p>
                                        <p className="truncate text-xs text-q-text-muted">{order.customerEmail}</p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="font-semibold text-foreground">${order.total.toFixed(2)}</p>
                                        <p className="text-xs text-q-text-muted">
                                            {order.items.length} {t('ecommerce.items', 'items')}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span
                                        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                    >
                                        <StatusIcon size={14} className="flex-shrink-0" />
                                        <span className="truncate">{statusConfig.label}</span>
                                    </span>
                                    <button
                                        onClick={() => handleViewOrder(order)}
                                        className="flex-shrink-0 p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-q-border bg-q-surface/50 sm:block">
                    <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.order', 'Pedido')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden md:table-cell">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted hidden sm:table-cell">
                                    {t('ecommerce.date', 'Fecha')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.status', 'Estado')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.total', 'Total')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-q-text-muted">
                                    {t('ecommerce.actions', 'Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredOrders.map((order) => {
                                const statusConfig = getStatusConfig(order.status);
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <tr key={order.id} className="hover:bg-muted/20">
                                        <td className="px-4 py-3">
                                            <p className="text-foreground font-medium">{order.orderNumber}</p>
                                            <p className="text-q-text-muted text-sm md:hidden">{order.customerName}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <p className="text-foreground">{order.customerName}</p>
                                            <p className="text-q-text-muted text-sm">{order.customerEmail}</p>
                                        </td>
                                        <td className="px-4 py-3 text-q-text-muted hidden sm:table-cell">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                            >
                                                <StatusIcon size={14} />
                                                {statusConfig.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-foreground font-medium">
                                                ${order.total.toFixed(2)}
                                            </p>
                                            <p className="text-q-text-muted text-sm">
                                                {order.items.length} {t('ecommerce.items', 'items')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleViewOrder(order)}
                                                className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </>
            )}

            {/* Order Detail Drawer */}
            {showDrawer && selectedOrder && (
                <OrderDetailDrawer
                    order={selectedOrder}
                    onClose={handleCloseDrawer}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onAddTracking={handleAddTrackingInfo}
                />
            )}
        </div>
    );
};

export default OrdersView;
