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
    Filter,
} from 'lucide-react';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { FulfillmentStatus, Order, OrderStatus, PaymentStatus } from '../../../../types/ecommerce';
import type { StoredTimestamp } from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import { canFulfillOrder, normalizeOrderForAdmin } from '../../../../utils/ecommerce/ecommerceOrderAdminService';
import OrderDetailDrawer from '../components/OrderDetailDrawer';
import { useEcommerceContext } from '../EcommerceContext';
import { FilterChipRow } from '../../filters';
import type { FilterChipOption } from '../../filters';
import { MotionCard } from '../../../ui/primitives/Card';

type OrderStatusFilter = OrderStatus | 'all';
type PaymentStatusFilter = PaymentStatus | 'all';
type FulfillmentStatusFilter = FulfillmentStatus | 'all';
type OrderStatusConfig = { icon: React.ElementType; color: string; bg: string; label: string };

const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
    pending: { icon: Clock, color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Pendiente' },
    paid: { icon: DollarSign, color: 'text-q-success', bg: 'bg-q-success/20', label: 'Pagado' },
    processing: { icon: Package, color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Procesando' },
    shipped: { icon: Truck, color: 'text-q-accent', bg: 'bg-q-accent/20', label: 'Enviado' },
    delivered: { icon: CheckCircle, color: 'text-q-success', bg: 'bg-q-success/20', label: 'Entregado' },
    cancelled: { icon: XCircle, color: 'text-q-error', bg: 'bg-q-error/20', label: 'Cancelado' },
    refunded: { icon: DollarSign, color: 'text-q-warning', bg: 'bg-q-warning/20', label: 'Reembolsado' },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Pago pendiente',
    paid: 'Pagado',
    failed: 'Pago fallido',
    refunded: 'Reembolsado',
    partially_refunded: 'Reembolso parcial',
    cancelled: 'Pago cancelado',
};

const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
    unfulfilled: 'Sin preparar',
    processing: 'Procesando',
    partial: 'Parcial',
    partially_fulfilled: 'Parcial',
    fulfilled: 'Completado',
    cancelled: 'Cancelado',
};

const getBadgeClassName = (tone: 'neutral' | 'success' | 'warning' | 'danger' | 'accent') => {
    const classes = {
        neutral: 'border-q-border bg-muted/30 text-q-text-muted',
        success: 'border-q-success/20 bg-q-success/10 text-q-success',
        warning: 'border-q-warning/20 bg-q-warning/10 text-q-warning',
        danger: 'border-q-error/20 bg-q-error/10 text-q-error',
        accent: 'border-primary/20 bg-primary/10 text-primary',
    };

    return classes[tone];
};

const getReadinessBadge = (order: Order) => {
    if (order.status === 'cancelled' || order.fulfillmentStatus === 'cancelled') {
        return { label: 'Bloqueado', tone: 'danger' as const };
    }
    if (canFulfillOrder(order)) {
        return { label: 'Listo para fulfillment', tone: 'success' as const };
    }
    if (order.paymentStatus !== 'paid') {
        return { label: 'Esperando pago', tone: 'warning' as const };
    }
    if (order.fulfillmentStatus === 'fulfilled') {
        return { label: 'Fulfilled', tone: 'neutral' as const };
    }
    return { label: 'Revisar', tone: 'accent' as const };
};

const getOrderChannel = (order: Order) => {
    const data = order.data || {};
    const value = data.channel || data.source || data.salesChannel || order.paymentMethod || 'storefront';
    return String(value);
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
    const {
        orders,
        isLoading,
        error,
        updateOrderStatus,
        updateFulfillmentStatus,
        addTrackingInfo,
        addInternalNotes,
        updateOrderDetails,
    } = useOrders(user?.id || '', storeId);
    const { products } = useProducts(user?.id || '', storeId);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatusFilter>('all');
    const [selectedFulfillmentStatus, setSelectedFulfillmentStatus] = useState<FulfillmentStatusFilter>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);

    // Filter orders
    const filteredOrders = useMemo(() => {
        const normalizedSearchTerm = searchTerm.trim().toLowerCase();

        return orders.filter((order) => {
            const adminOrder = normalizeOrderForAdmin(order);
            const matchesSearch =
                !normalizedSearchTerm ||
                order.orderNumber.toLowerCase().includes(normalizedSearchTerm) ||
                order.customerEmail.toLowerCase().includes(normalizedSearchTerm) ||
                order.customerName.toLowerCase().includes(normalizedSearchTerm) ||
                adminOrder.orderId.toLowerCase().includes(normalizedSearchTerm);

            const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
            const matchesPaymentStatus = selectedPaymentStatus === 'all' || order.paymentStatus === selectedPaymentStatus;
            const matchesFulfillmentStatus =
                selectedFulfillmentStatus === 'all' || order.fulfillmentStatus === selectedFulfillmentStatus;

            return matchesSearch && matchesStatus && matchesPaymentStatus && matchesFulfillmentStatus;
        }).sort((left, right) => timestampToDate(right.createdAt).getTime() - timestampToDate(left.createdAt).getTime());
    }, [orders, searchTerm, selectedStatus, selectedPaymentStatus, selectedFulfillmentStatus]);

    // Order stats
    const stats = useMemo(() => {
        return {
            total: orders.length,
            pending: orders.filter((o) => o.status === 'pending').length,
            paid: orders.filter((o) => o.status === 'paid').length,
            processing: orders.filter((o) => o.status === 'processing').length,
            shipped: orders.filter((o) => o.status === 'shipped').length,
            delivered: orders.filter((o) => o.status === 'delivered').length,
            cancelled: orders.filter((o) => o.status === 'cancelled').length,
            refunded: orders.filter((o) => o.status === 'refunded').length,
            paymentPending: orders.filter((o) => o.paymentStatus === 'pending').length,
            paymentPaid: orders.filter((o) => o.paymentStatus === 'paid').length,
            unfulfilled: orders.filter((o) => o.fulfillmentStatus === 'unfulfilled').length,
            fulfillmentProcessing: orders.filter((o) => o.fulfillmentStatus === 'processing').length,
            fulfilled: orders.filter((o) => o.fulfillmentStatus === 'fulfilled').length,
            revenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
            items: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
        };
    }, [orders]);

    const statusFilterOptions = useMemo<FilterChipOption<OrderStatusFilter>[]>(() => [
        { id: 'all', label: t('ecommerce.all', 'Todos'), count: orders.length },
        { id: 'pending', label: t('ecommerce.pending', 'Pendientes'), count: stats.pending, color: 'gray' },
        { id: 'paid', label: t('ecommerce.paid', 'Pagados'), count: stats.paid, color: 'green' },
        { id: 'processing', label: t('ecommerce.processing', 'Procesando'), count: stats.processing },
        { id: 'shipped', label: t('ecommerce.shipped', 'Enviados'), count: stats.shipped },
        { id: 'delivered', label: t('ecommerce.delivered', 'Entregados'), count: stats.delivered, color: 'green' },
    ], [orders.length, stats.delivered, stats.paid, stats.pending, stats.processing, stats.shipped, t]);

    const visibleOrdersLabel = `${filteredOrders.length} de ${orders.length} pedido${orders.length !== 1 ? 's' : ''}`;
    const hasActiveFilters = Boolean(searchTerm.trim())
        || selectedStatus !== 'all'
        || selectedPaymentStatus !== 'all'
        || selectedFulfillmentStatus !== 'all';

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedPaymentStatus('all');
        setSelectedFulfillmentStatus('all');
    };

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

    const handleUpdateFulfillmentStatus = async (orderId: string, status: FulfillmentStatus) => {
        const updatedOrder = await updateFulfillmentStatus(orderId, status);
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

    const handleUpdateInternalNotes = async (orderId: string, notes: string) => {
        const updatedOrder = await addInternalNotes(orderId, notes);
        setSelectedOrder((currentOrder) =>
            currentOrder?.id === orderId ? updatedOrder : currentOrder
        );
    };

    const handleUpdateOrderDetails = async (orderId: string, updates: Partial<Order>) => {
        const updatedOrder = await updateOrderDetails(orderId, updates);
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

    const formatCurrency = (amount: number, currency = orders[0]?.currency || 'USD') => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency,
        }).format(amount || 0);
    };

    const orderStats = [
        {
            label: t('ecommerce.ordersTotalLabel', 'Total'),
            value: stats.total,
            helper: `${stats.items} ${t('ecommerce.items', 'items')}`,
            icon: ShoppingCart,
            iconClassName: 'quimera-dashboard-header-icon',
        },
        {
            label: t('ecommerce.pending', 'Pendientes'),
            value: stats.pending,
            helper: `${stats.processing} ${t('ecommerce.processingLower', 'procesando')}`,
            icon: Clock,
            iconClassName: stats.pending > 0 ? 'text-q-warning' : 'text-q-success',
        },
        {
            label: t('ecommerce.fulfillment', 'Fulfillment'),
            value: stats.unfulfilled,
            helper: `${stats.fulfillmentProcessing} ${t('ecommerce.processingLower', 'procesando')}`,
            icon: Truck,
            iconClassName: 'text-primary',
        },
        {
            label: t('ecommerce.grossRevenue', 'Ingresos'),
            value: formatCurrency(stats.revenue),
            helper: `${stats.cancelled + stats.refunded} ${t('ecommerce.problemOrdersLower', 'con incidencia')}`,
            icon: DollarSign,
            iconClassName: 'text-q-success',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-28 md:pb-0">
            {/* Header */}
            <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-q-border bg-q-surface/50 px-3 py-1 text-xs font-medium text-q-text-muted">
                    <ShoppingCart size={14} />
                    {t('ecommerce.orderOps', 'Operación de pedidos')}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                    {t('ecommerce.orders', 'Pedidos')}
                </h2>
                <p className="max-w-2xl text-q-text-muted">
                    {t('ecommerce.manageOrdersPro', 'Revisa pagos, preparación, envíos e incidencias desde un panel compacto.')}
                </p>
            </div>

            {error && (
                <div className="rounded-xl border border-q-error/30 bg-q-error/10 px-4 py-3 text-sm text-q-error">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {orderStats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                        <MotionCard key={stat.label} staggerIndex={index} hoverMotion className="rounded-xl border border-q-border bg-q-surface/50 p-4">
                            <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 flex-shrink-0 ${stat.iconClassName}`} strokeWidth={2} />
                                <div className="min-w-0">
                                    <p className="truncate text-sm text-q-text-muted">{stat.label}</p>
                                    <p className="truncate text-2xl font-bold text-foreground">{stat.value}</p>
                                    <p className="truncate text-xs text-q-text-muted">{stat.helper}</p>
                                </div>
                            </div>
                        </MotionCard>
                    );
                })}
            </div>

            {/* Search and filters */}
            <div className="rounded-xl border border-q-border bg-q-surface/50 p-3 sm:p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_minmax(24rem,auto)] xl:items-end">
                    <label className="block min-w-0">
                        <span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase text-q-text-secondary">
                            <span>{t('ecommerce.searchOrdersLabel', 'Buscar pedidos')}</span>
                            <span className="shrink-0 normal-case text-q-text-muted">{visibleOrdersLabel}</span>
                        </span>
                        <div className="flex h-12 items-center gap-3 rounded-lg border border-q-border/70 bg-q-bg/60 px-3 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                            <Search className="h-4 w-4 flex-shrink-0 text-q-text-secondary" />
                            <input
                                type="text"
                                placeholder={t('ecommerce.searchOrders', 'Número, cliente o email')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-q-text-muted"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    aria-label={t('common.clearSearch', 'Limpiar búsqueda')}
                                    title={t('common.clearSearch', 'Limpiar búsqueda')}
                                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-q-text-secondary transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    </label>

                    <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-q-text-secondary">
                            <Filter className="h-3.5 w-3.5" />
                            <span>{t('ecommerce.orderStatusFilter', 'Estado')}</span>
                        </div>
                        <FilterChipRow
                            value={selectedStatus}
                            onChange={(value) => setSelectedStatus(value as OrderStatusFilter)}
                            options={statusFilterOptions}
                            className="min-w-0"
                        />
                    </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-q-border/60 pt-3 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase text-q-text-secondary">
                            Estado de pago
                        </span>
                        <select
                            value={selectedPaymentStatus}
                            onChange={(event) => setSelectedPaymentStatus(event.target.value as PaymentStatusFilter)}
                            className="h-11 w-full rounded-lg border border-q-border/70 bg-q-bg/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">Todos los pagos</option>
                            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase text-q-text-secondary">
                            Fulfillment
                        </span>
                        <select
                            value={selectedFulfillmentStatus}
                            onChange={(event) => setSelectedFulfillmentStatus(event.target.value as FulfillmentStatusFilter)}
                            className="h-11 w-full rounded-lg border border-q-border/70 bg-q-bg/60 px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">Todos los fulfillment</option>
                            {Object.entries(FULFILLMENT_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {hasActiveFilters && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-q-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-q-text-muted">
                            {t('ecommerce.activeOrderFilters', 'Mostrando pedidos filtrados')}
                        </p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:w-auto"
                        >
                            <X size={15} />
                            {t('ecommerce.clearFilters', 'Limpiar filtros')}
                        </button>
                    </div>
                )}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 px-6 py-12 text-center">
                    <ShoppingCart className="mx-auto mb-4 text-q-text-muted" size={48} />
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {t('ecommerce.noOrders', 'No hay pedidos')}
                    </h3>
                    <p className="mx-auto max-w-md text-q-text-muted">
                        {hasActiveFilters
                            ? t('ecommerce.noOrdersFilter', 'No se encontraron pedidos con los filtros aplicados')
                            : t('ecommerce.noOrdersYet', 'Aún no has recibido ningún pedido')}
                    </p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-q-border px-4 py-2 font-medium text-q-text-muted transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                            <X size={18} />
                            {t('ecommerce.clearFilters', 'Limpiar filtros')}
                        </button>
                    )}
                </div>
            ) : (
                <>
                <div className="space-y-3 sm:hidden">
                    {filteredOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const StatusIcon = statusConfig.icon;
                        const readiness = getReadinessBadge(order);
                        const adminOrder = normalizeOrderForAdmin(order);

                        return (
                            <div key={order.id} className="rounded-xl border border-q-border bg-q-surface/50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => handleViewOrder(order)}
                                            className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary"
                                        >
                                            {order.orderNumber}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleViewOrder(order)}
                                            className="block max-w-full truncate text-left text-sm text-q-text-muted hover:text-primary"
                                        >
                                            {order.customerName}
                                        </button>
                                        <p className="truncate text-xs text-q-text-muted">{order.customerEmail}</p>
                                        <p className="mt-1 truncate text-xs text-q-text-muted capitalize">
                                            {getOrderChannel(order)}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="font-semibold text-foreground">{formatCurrency(order.total, order.currency)}</p>
                                        <p className="text-xs text-q-text-muted">
                                            {adminOrder.items.reduce((sum, item) => sum + item.quantity, 0)} {t('ecommerce.items', 'items')}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                    >
                                        <StatusIcon size={14} className="flex-shrink-0" />
                                        <span className="truncate">{statusConfig.label}</span>
                                    </span>
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getBadgeClassName(order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning')}`}>
                                        {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                                    </span>
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getBadgeClassName(readiness.tone)}`}>
                                        {readiness.label}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="text-xs text-q-text-muted">
                                        {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleViewOrder(order)}
                                        title={t('ecommerce.viewOrder', 'Ver pedido')}
                                        aria-label={t('ecommerce.viewOrder', 'Ver pedido')}
                                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="hidden overflow-hidden rounded-xl border border-q-border bg-q-surface/50 sm:block">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.order', 'Pedido')}
                                </th>
                                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted md:table-cell">
                                    {t('ecommerce.customer', 'Cliente')}
                                </th>
                                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted sm:table-cell">
                                    {t('ecommerce.date', 'Fecha')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.status', 'Estado')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-q-text-muted">
                                    Pago/Fulfillment
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.total', 'Total')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-q-text-muted">
                                    {t('ecommerce.actions', 'Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredOrders.map((order) => {
                                const statusConfig = getStatusConfig(order.status);
                                const StatusIcon = statusConfig.icon;
                                const readiness = getReadinessBadge(order);
                                const adminOrder = normalizeOrderForAdmin(order);

                                return (
                                    <tr key={order.id} className="transition-colors hover:bg-muted/20">
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => handleViewOrder(order)}
                                                className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary"
                                            >
                                                {order.orderNumber}
                                            </button>
                                            <p className="mt-1 text-xs text-q-text-muted capitalize">{getOrderChannel(order)}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleViewOrder(order)}
                                                className="block max-w-full truncate text-left text-q-text-muted text-sm hover:text-primary md:hidden"
                                            >
                                                {order.customerName}
                                            </button>
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            <button
                                                type="button"
                                                onClick={() => handleViewOrder(order)}
                                                className="block max-w-full truncate text-left text-foreground hover:text-primary"
                                            >
                                                {order.customerName}
                                            </button>
                                            <p className="text-q-text-muted text-sm">{order.customerEmail}</p>
                                        </td>
                                        <td className="hidden px-4 py-3 text-q-text-muted sm:table-cell">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                            >
                                                <StatusIcon size={14} />
                                                {statusConfig.label}
                                            </span>
                                            <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getBadgeClassName(readiness.tone)}`}>
                                                {readiness.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getBadgeClassName(order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning')}`}>
                                                    {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                                                </span>
                                                <p className="text-xs text-q-text-muted">
                                                    {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-foreground font-medium">
                                                {formatCurrency(order.total, order.currency)}
                                            </p>
                                            <p className="text-q-text-muted text-sm">
                                                {adminOrder.items.reduce((sum, item) => sum + item.quantity, 0)} {t('ecommerce.items', 'items')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleViewOrder(order)}
                                                title={t('ecommerce.viewOrder', 'Ver pedido')}
                                                aria-label={t('ecommerce.viewOrder', 'Ver pedido')}
                                                className="grid h-9 w-9 place-items-center rounded-lg text-q-text-muted transition-colors hover:bg-muted hover:text-foreground"
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
                </div>
                </>
            )}

            {/* Order Detail Drawer */}
            {showDrawer && selectedOrder && (
                <OrderDetailDrawer
                    order={selectedOrder}
                    products={products}
                    onClose={handleCloseDrawer}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onUpdateFulfillmentStatus={handleUpdateFulfillmentStatus}
                    onAddTracking={handleAddTrackingInfo}
                    onUpdateInternalNotes={handleUpdateInternalNotes}
                    onUpdateOrder={handleUpdateOrderDetails}
                />
            )}
        </div>
    );
};

export default OrdersView;
