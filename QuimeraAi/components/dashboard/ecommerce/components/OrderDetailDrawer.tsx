/**
 * OrderDetailDrawer
 * Panel lateral para ver y gestionar detalles de un pedido
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Package,
    Truck,
    CheckCircle,
    Clock,
    DollarSign,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    FileText,
    ChevronDown,
    Loader2,
    Copy,
    ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus, StoredTimestamp } from '../../../../types/ecommerce';
import { timestampToDate } from '../../../../utils/timestampUtils';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';

interface OrderDetailDrawerProps {
    order: Order;
    onClose: () => void;
    onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    onAddTracking: (orderId: string, carrier: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
}

type OrderStatusConfig = { color: string; bg: string; label: string };

const ORDER_STATUS_CONFIGS: Record<OrderStatus, OrderStatusConfig> = {
    pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pendiente' },
    paid: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Pagado' },
    processing: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Procesando' },
    shipped: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Enviado' },
    delivered: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Entregado' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelado' },
    refunded: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Reembolsado' },
};

const getStatusConfig = (status: unknown): OrderStatusConfig => {
    if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ORDER_STATUS_CONFIGS, status)) {
        return ORDER_STATUS_CONFIGS[status as OrderStatus];
    }
    return ORDER_STATUS_CONFIGS.pending;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};

const formatMoney = (value: unknown): string => `$${toFiniteNumber(value).toFixed(2)}`;

const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
    order,
    onClose,
    onUpdateStatus,
    onAddTracking,
}) => {
    const { t } = useTranslation();
    const theme = useEcommerceTheme();
    const [isUpdating, setIsUpdating] = useState(false);
    const [showTrackingForm, setShowTrackingForm] = useState(false);
    const [trackingData, setTrackingData] = useState({
        carrier: '',
        trackingNumber: '',
        trackingUrl: '',
    });

    const handleStatusChange = async (newStatus: OrderStatus) => {
        setIsUpdating(true);
        try {
            await onUpdateStatus(order.id, newStatus);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddTracking = async () => {
        if (!trackingData.carrier || !trackingData.trackingNumber) return;

        setIsUpdating(true);
        try {
            await onAddTracking(
                order.id,
                trackingData.carrier,
                trackingData.trackingNumber,
                trackingData.trackingUrl || undefined
            );
            setShowTrackingForm(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatDate = (timestamp: StoredTimestamp) => {
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const statusConfig = getStatusConfig(order.status);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const shippingAddress = (order.shippingAddress ?? {}) as Partial<Order['shippingAddress']>;
    const subtotal = order.pricing?.subtotal ?? order.subtotal;
    const discountAmount = order.discountAmount ?? order.pricing?.discountTotal ?? order.discount;
    const shippingCost = order.pricing?.shippingTotal ?? order.shippingCost;
    const taxAmount = order.pricing?.taxTotal ?? order.taxAmount;
    const total = order.pricing?.total ?? order.total;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-lg bg-q-surface h-full overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-q-surface border-b border-q-border p-4 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {t('ecommerce.order', 'Pedido')} #{order.orderNumber}
                            </h2>
                            <p className="text-q-text-muted text-sm">{formatDate(order.createdAt)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-4 flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>

                        {/* Status Dropdown */}
                        <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 bg-muted border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                            <option value="processing">Procesando</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="refunded">Reembolsado</option>
                        </select>

                        {isUpdating && <Loader2 size={18} className="animate-spin text-primary" />}
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    {/* Customer Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <User size={16} />
                            {t('ecommerce.customer', 'Cliente')}
                        </h3>
                        <div className="space-y-2">
                            <p className="text-foreground font-medium">{order.customerName}</p>
                            <div className="flex items-center gap-2 text-q-text-muted">
                                <Mail size={14} className="text-q-text-muted" />
                                <span>{order.customerEmail}</span>
                                <button
                                    onClick={() => copyToClipboard(order.customerEmail)}
                                    className="p-1 hover:bg-muted rounded"
                                >
                                    <Copy size={12} className="text-q-text-muted" />
                                </button>
                            </div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2 text-q-text-muted">
                                    <Phone size={14} className="text-q-text-muted" />
                                    <span>{order.customerPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            {t('ecommerce.shippingAddress', 'Dirección de Envío')}
                        </h3>
                        <div className="text-q-text-muted space-y-1">
                            <p>{shippingAddress.address1 || '-'}</p>
                            {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                            <p>
                                {[shippingAddress.city, shippingAddress.state, shippingAddress.zipCode]
                                    .filter(Boolean)
                                    .join(', ') || '-'}
                            </p>
                            <p>{shippingAddress.country || '-'}</p>
                        </div>
                    </div>

                    {/* Tracking Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <Truck size={16} />
                            {t('ecommerce.tracking', 'Seguimiento')}
                        </h3>

                        {order.trackingNumber ? (
                            <div className="space-y-2">
                                <p className="text-q-text-muted">
                                    <span className="text-q-text-muted">Carrier:</span> {order.carrier}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-q-text-muted">Tracking:</span>
                                    <code className="text-foreground bg-muted px-2 py-0.5 rounded">
                                        {order.trackingNumber}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(order.trackingNumber!)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <Copy size={12} className="text-q-text-muted" />
                                    </button>
                                </div>
                                {order.trackingUrl && (
                                    <a
                                        href={order.trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:opacity-80"
                                    >
                                        Ver seguimiento <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        ) : showTrackingForm ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Carrier (DHL, FedEx, etc.)"
                                    value={trackingData.carrier}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, carrier: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                    type="text"
                                    placeholder="Número de rastreo"
                                    value={trackingData.trackingNumber}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingNumber: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                    type="url"
                                    placeholder="URL de rastreo (opcional)"
                                    value={trackingData.trackingUrl}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingUrl: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-muted/50 border border-q-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowTrackingForm(false)}
                                        className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddTracking}
                                        disabled={isUpdating}
                                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTrackingForm(true)}
                                className="text-sm text-primary hover:opacity-80"
                            >
                                + Agregar información de rastreo
                            </button>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <Package size={16} />
                            {t('ecommerce.items', 'Productos')} ({orderItems.length})
                        </h3>

                        <div className="space-y-3">
                            {orderItems.map((item, index) => {
                                const itemName = item.productName || item.name || 'Producto';
                                const itemImage = item.image || item.imageUrl;
                                const itemPrice = item.price ?? item.unitPrice;
                                const itemQuantity = toFiniteNumber(item.quantity, 1);
                                const itemTotal = item.totalPrice ?? toFiniteNumber(itemPrice) * itemQuantity;

                                return (
                                    <div key={item.id || index} className="flex items-center gap-3">
                                        {itemImage ? (
                                            <img
                                                src={itemImage}
                                                alt={itemName}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                                <Package className="text-q-text-muted" size={20} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-foreground font-medium truncate">{itemName}</p>
                                            {item.variantName && (
                                                <p className="text-q-text-muted text-sm">{item.variantName}</p>
                                            )}
                                            <p className="text-q-text-muted text-sm">
                                                {formatMoney(itemPrice)} × {itemQuantity}
                                            </p>
                                        </div>
                                        <p className="text-foreground font-medium">
                                            {formatMoney(itemTotal)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <DollarSign size={16} />
                            {t('ecommerce.summary', 'Resumen')}
                        </h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-q-text-muted">
                                <span>Subtotal</span>
                                <span>{formatMoney(subtotal)}</span>
                            </div>
                            {toFiniteNumber(discountAmount) > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>
                                        Descuento
                                        {order.discountCode && ` (${order.discountCode})`}
                                    </span>
                                    <span>-{formatMoney(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-q-text-muted">
                                <span>Envío</span>
                                <span>
                                    {toFiniteNumber(shippingCost) === 0 ? 'Gratis' : formatMoney(shippingCost)}
                                </span>
                            </div>
                            {toFiniteNumber(taxAmount) > 0 && (
                                <div className="flex justify-between text-q-text-muted">
                                    <span>Impuestos</span>
                                    <span>{formatMoney(taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-foreground font-bold pt-2 border-t border-q-border">
                                <span>Total</span>
                                <span>{formatMoney(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                            <CreditCard size={16} />
                            {t('ecommerce.payment', 'Pago')}
                        </h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-q-text-muted">Método</span>
                                <span className="text-foreground capitalize">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-q-text-muted">Estado</span>
                                <span
                                    className={`${
                                        order.paymentStatus === 'paid'
                                            ? 'text-green-400'
                                            : order.paymentStatus === 'pending'
                                            ? 'text-yellow-400'
                                            : 'text-red-400'
                                    }`}
                                >
                                    {order.paymentStatus}
                                </span>
                            </div>
                            {order.paymentIntentId && (
                                <div className="flex items-center gap-2 text-q-text-muted">
                                    <span>Payment Intent:</span>
                                    <code className="text-xs bg-muted px-1 rounded">
                                        {order.paymentIntentId.slice(0, 20)}...
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-q-text-muted mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                {t('ecommerce.notes', 'Notas')}
                            </h3>
                            <p className="text-q-text-muted">{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetailDrawer;
