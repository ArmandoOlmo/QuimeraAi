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
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus } from '../../../../types/ecommerce';
import { useEcommerceTheme, withOpacity } from '../hooks/useEcommerceTheme';

interface OrderDetailDrawerProps {
    order: Order;
    onClose: () => void;
    onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    onAddTracking: (orderId: string, carrier: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
}

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

    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusConfig = (status: OrderStatus) => {
        const configs: Record<OrderStatus, { color: string; bg: string; label: string }> = {
            pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Pendiente' },
            paid: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Pagado' },
            processing: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Procesando' },
            shipped: { color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Enviado' },
            delivered: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Entregado' },
            cancelled: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelado' },
            refunded: { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Reembolsado' },
        };
        return configs[status];
    };

    const statusConfig = getStatusConfig(order.status);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-lg bg-card h-full overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {t('ecommerce.order', 'Pedido')} #{order.orderNumber}
                            </h2>
                            <p className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
                            className="px-3 py-1.5 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <User size={16} />
                            {t('ecommerce.customer', 'Cliente')}
                        </h3>
                        <div className="space-y-2">
                            <p className="text-foreground font-medium">{order.customerName}</p>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail size={14} className="text-muted-foreground" />
                                <span>{order.customerEmail}</span>
                                <button
                                    onClick={() => copyToClipboard(order.customerEmail)}
                                    className="p-1 hover:bg-muted rounded"
                                >
                                    <Copy size={12} className="text-muted-foreground" />
                                </button>
                            </div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone size={14} className="text-muted-foreground" />
                                    <span>{order.customerPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <MapPin size={16} />
                            {t('ecommerce.shippingAddress', 'Dirección de Envío')}
                        </h3>
                        <div className="text-muted-foreground space-y-1">
                            <p>{order.shippingAddress.address1}</p>
                            {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                            <p>
                                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                                {order.shippingAddress.zipCode}
                            </p>
                            <p>{order.shippingAddress.country}</p>
                        </div>
                    </div>

                    {/* Tracking Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Truck size={16} />
                            {t('ecommerce.tracking', 'Seguimiento')}
                        </h3>

                        {order.trackingNumber ? (
                            <div className="space-y-2">
                                <p className="text-muted-foreground">
                                    <span className="text-muted-foreground">Carrier:</span> {order.carrier}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Tracking:</span>
                                    <code className="text-foreground bg-muted px-2 py-0.5 rounded">
                                        {order.trackingNumber}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(order.trackingNumber!)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <Copy size={12} className="text-muted-foreground" />
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
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                    type="text"
                                    placeholder="Número de rastreo"
                                    value={trackingData.trackingNumber}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingNumber: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                    type="url"
                                    placeholder="URL de rastreo (opcional)"
                                    value={trackingData.trackingUrl}
                                    onChange={(e) =>
                                        setTrackingData({ ...trackingData, trackingUrl: e.target.value })
                                    }
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Package size={16} />
                            {t('ecommerce.items', 'Productos')} ({order.items.length})
                        </h3>

                        <div className="space-y-3">
                            {order.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.productName}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                            <Package className="text-muted-foreground" size={20} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground font-medium truncate">{item.productName}</p>
                                        {item.variantName && (
                                            <p className="text-muted-foreground text-sm">{item.variantName}</p>
                                        )}
                                        <p className="text-muted-foreground text-sm">
                                            ${item.price.toFixed(2)} × {item.quantity}
                                        </p>
                                    </div>
                                    <p className="text-foreground font-medium">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <DollarSign size={16} />
                            {t('ecommerce.summary', 'Resumen')}
                        </h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>${order.subtotal.toFixed(2)}</span>
                            </div>
                            {order.discountAmount && order.discountAmount > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>
                                        Descuento
                                        {order.discountCode && ` (${order.discountCode})`}
                                    </span>
                                    <span>-${order.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <span>Envío</span>
                                <span>
                                    {order.shippingCost === 0 ? 'Gratis' : `$${order.shippingCost.toFixed(2)}`}
                                </span>
                            </div>
                            {order.taxAmount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Impuestos</span>
                                    <span>${order.taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-foreground font-bold pt-2 border-t border-border">
                                <span>Total</span>
                                <span>${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <CreditCard size={16} />
                            {t('ecommerce.payment', 'Pago')}
                        </h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Método</span>
                                <span className="text-foreground capitalize">{order.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado</span>
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
                                <div className="flex items-center gap-2 text-muted-foreground">
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
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                {t('ecommerce.notes', 'Notas')}
                            </h3>
                            <p className="text-muted-foreground">{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetailDrawer;
