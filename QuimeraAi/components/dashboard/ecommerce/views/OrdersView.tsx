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
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import { useEcommerceContext } from '../EcommerceDashboard';

const OrdersView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId } = useEcommerceContext();
    const { orders, isLoading, updateOrderStatus, addTrackingInfo } = useOrders(user?.uid || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
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

            const matchesStatus = !selectedStatus || order.status === selectedStatus;

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

    const getStatusConfig = (status: OrderStatus) => {
        const configs: Record<OrderStatus, { icon: React.ElementType; color: string; bg: string; label: string }> = {
            pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pendiente' },
            paid: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Pagado' },
            processing: { icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Procesando' },
            shipped: { icon: Truck, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Enviado' },
            delivered: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Entregado' },
            cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelado' },
            refunded: { icon: DollarSign, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Reembolsado' },
        };
        return configs[status];
    };

    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
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
                <p className="text-muted-foreground">
                    {orders.length} {t('ecommerce.ordersTotal', 'pedidos en total')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <button
                    onClick={() => setSelectedStatus('pending')}
                    className={`p-4 rounded-xl border transition-colors ${selectedStatus === 'pending'
                            ? 'bg-yellow-500/20 border-yellow-500/50'
                            : 'bg-card/50 border-border hover:bg-card'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Clock className="text-yellow-400" size={24} />
                        <div className="text-left">
                            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.pending', 'Pendientes')}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setSelectedStatus('paid')}
                    className={`p-4 rounded-xl border transition-colors ${selectedStatus === 'paid'
                            ? 'bg-green-500/20 border-green-500/50'
                            : 'bg-card/50 border-border hover:bg-card'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <DollarSign className="text-green-400" size={24} />
                        <div className="text-left">
                            <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.paid', 'Pagados')}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setSelectedStatus('shipped')}
                    className={`p-4 rounded-xl border transition-colors ${selectedStatus === 'shipped'
                            ? 'bg-purple-500/20 border-purple-500/50'
                            : 'bg-card/50 border-border hover:bg-card'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Truck className="text-purple-400" size={24} />
                        <div className="text-left">
                            <p className="text-2xl font-bold text-foreground">{stats.shipped}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.shipped', 'Enviados')}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setSelectedStatus('delivered')}
                    className={`p-4 rounded-xl border transition-colors ${selectedStatus === 'delivered'
                            ? 'bg-green-500/20 border-green-500/50'
                            : 'bg-card/50 border-border hover:bg-card'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-400" size={24} />
                        <div className="text-left">
                            <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                            <p className="text-sm text-muted-foreground">{t('ecommerce.delivered', 'Entregados')}</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={t('ecommerce.searchOrders', 'Buscar por número, cliente o email...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {selectedStatus && (
                    <button
                        onClick={() => setSelectedStatus('')}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                        {t('ecommerce.clearFilter', 'Limpiar filtro')}
                    </button>
                )}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
                    <ShoppingCart className="mx-auto text-muted-foreground mb-4" size={48} />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('ecommerce.noOrders', 'No hay pedidos')}
                    </h3>
                    <p className="text-muted-foreground">
                        {searchTerm || selectedStatus
                            ? t('ecommerce.noOrdersFilter', 'No se encontraron pedidos con los filtros aplicados')
                            : t('ecommerce.noOrdersYet', 'Aún no has recibido ningún pedido')}
                    </p>
                </div>
            ) : (
                <div className="bg-card/50 rounded-xl border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.order', 'Pedido')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden sm:table-cell">
                                    {t('ecommerce.date', 'Fecha')}
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.status', 'Estado')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                    {t('ecommerce.total', 'Total')}
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
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
                                            <p className="text-muted-foreground text-sm md:hidden">{order.customerName}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <p className="text-foreground">{order.customerName}</p>
                                            <p className="text-muted-foreground text-sm">{order.customerEmail}</p>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
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
                                            <p className="text-muted-foreground text-sm">
                                                {order.items.length} {t('ecommerce.items', 'items')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleViewOrder(order)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
            )}

            {/* Order Detail Drawer */}
            {showDrawer && selectedOrder && (
                <OrderDetailDrawer
                    order={selectedOrder}
                    onClose={handleCloseDrawer}
                    onUpdateStatus={updateOrderStatus}
                    onAddTracking={addTrackingInfo}
                />
            )}
        </div>
    );
};

export default OrdersView;
