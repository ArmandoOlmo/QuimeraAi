/**
 * OrderHistoryPage Component
 * Página de historial de pedidos para clientes
 */

import React, { useState } from 'react';
import {
    Package,
    Truck,
    Check,
    Clock,
    XCircle,
    ChevronRight,
    Search,
    ArrowLeft,
    Loader2,
    ShoppingBag,
    MapPin,
    Calendar,
    CreditCard,
    Eye,
    X,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types/ecommerce';
import { useCustomerOrders } from './hooks/useCustomerOrders';

interface OrderHistoryPageProps {
    storeId: string;
    customerEmail: string;
    onBack?: () => void;
    onViewProduct?: (productSlug: string) => void;
    currencySymbol?: string;
    primaryColor?: string;
}

const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({
    storeId,
    customerEmail,
    onBack,
    onViewProduct,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    const { orders, isLoading, error, getOrderById } = useCustomerOrders(storeId, customerEmail);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    // Filter orders
    const filteredOrders = orders.filter((order) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            order.orderNumber.toLowerCase().includes(term) ||
            order.items.some((item) => item.name.toLowerCase().includes(term))
        );
    });

    // Status config
    const statusConfig: Record<
        OrderStatus,
        { label: string; color: string; bgColor: string; icon: React.ElementType }
    > = {
        pending: { label: 'Pendiente', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-500/20', icon: Clock },
        paid: { label: 'Pagado', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-500/20', icon: CreditCard },
        processing: { label: 'En preparación', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-500/20', icon: Package },
        shipped: { label: 'Enviado', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-500/20', icon: Truck },
        delivered: { label: 'Entregado', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-500/20', icon: Check },
        cancelled: { label: 'Cancelado', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-500/20', icon: XCircle },
        refunded: { label: 'Reembolsado', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-500/20', icon: XCircle },
    };

    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateTime = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleViewOrder = async (orderId: string) => {
        setLoadingOrder(true);
        const order = await getOrderById(orderId);
        if (order) {
            setSelectedOrder(order);
        }
        setLoadingOrder(false);
    };

    // Order timeline steps
    const getOrderTimeline = (order: Order) => {
        const steps = [
            { status: 'pending', label: 'Pedido recibido', completed: true },
            { status: 'paid', label: 'Pago confirmado', completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) },
            { status: 'processing', label: 'En preparación', completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
            { status: 'shipped', label: 'Enviado', completed: ['shipped', 'delivered'].includes(order.status) },
            { status: 'delivered', label: 'Entregado', completed: order.status === 'delivered' },
        ];
        return steps;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin" size={48} style={{ color: primaryColor }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <ShoppingBag style={{ color: primaryColor }} />
                                Mis Pedidos
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    {orders.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                            <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por número de pedido o producto..."
                                className="flex-1 bg-transparent outline-none text-sm min-w-0"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error ? (
                    <div className="text-center py-12">
                        <XCircle className="mx-auto text-red-500 mb-4" size={48} />
                        <p className="text-gray-500 dark:text-gray-400">{error}</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16">
                        <ShoppingBag className="mx-auto text-gray-300 dark:text-gray-600 mb-6" size={80} />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {searchTerm ? 'No se encontraron pedidos' : 'Sin pedidos aún'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            {searchTerm
                                ? 'Intenta con otro término de búsqueda'
                                : 'Cuando realices una compra, podrás ver el estado de tus pedidos aquí'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order) => {
                            const config = statusConfig[order.status];
                            const StatusIcon = config.icon;

                            return (
                                <div
                                    key={order.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                    {/* Order Header */}
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {order.orderNumber}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                                    <StatusIcon size={12} className="inline mr-1" />
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleViewOrder(order.id)}
                                            disabled={loadingOrder}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                            style={{ color: primaryColor }}
                                        >
                                            <Eye size={16} />
                                            Ver detalles
                                        </button>
                                    </div>

                                    {/* Order Items */}
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                            {order.items.slice(0, 4).map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                                                >
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <Package size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {order.items.length > 4 && (
                                                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                                                    +{order.items.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {currencySymbol}{order.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Pedido {selectedOrder.orderNumber}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDateTime(selectedOrder.createdAt)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            {/* Timeline */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                                    Estado del pedido
                                </h3>
                                <div className="flex items-center justify-between">
                                    {getOrderTimeline(selectedOrder).map((step, index, arr) => (
                                        <React.Fragment key={step.status}>
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        step.completed
                                                            ? 'text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                    }`}
                                                    style={step.completed ? { backgroundColor: primaryColor } : {}}
                                                >
                                                    <Check size={16} />
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center max-w-[80px]">
                                                    {step.label}
                                                </span>
                                            </div>
                                            {index < arr.length - 1 && (
                                                <div
                                                    className={`flex-1 h-1 mx-2 rounded ${
                                                        step.completed && arr[index + 1].completed
                                                            ? ''
                                                            : 'bg-gray-200 dark:bg-gray-700'
                                                    }`}
                                                    style={
                                                        step.completed && arr[index + 1].completed
                                                            ? { backgroundColor: primaryColor }
                                                            : {}
                                                    }
                                                />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                                    Productos ({selectedOrder.items.length})
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                        >
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Package size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                                    {item.name}
                                                </h4>
                                                {item.variantName && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {item.variantName}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Cantidad: {item.quantity}
                                                </p>
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {currencySymbol}{item.totalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Address & Totals */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Shipping Address */}
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <MapPin size={18} />
                                        Dirección de envío
                                    </h3>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}
                                        </p>
                                        <p>{selectedOrder.shippingAddress.address1}</p>
                                        {selectedOrder.shippingAddress.address2 && (
                                            <p>{selectedOrder.shippingAddress.address2}</p>
                                        )}
                                        <p>
                                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                                            {selectedOrder.shippingAddress.zipCode}
                                        </p>
                                        <p>{selectedOrder.shippingAddress.country}</p>
                                    </div>
                                </div>

                                {/* Order Totals */}
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <CreditCard size={18} />
                                        Resumen
                                    </h3>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                            <span className="text-gray-900 dark:text-white">
                                                {currencySymbol}{selectedOrder.subtotal.toFixed(2)}
                                            </span>
                                        </div>
                                        {selectedOrder.discount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Descuento</span>
                                                <span className="text-green-600">
                                                    -{currencySymbol}{selectedOrder.discount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Envío</span>
                                            <span className="text-gray-900 dark:text-white">
                                                {selectedOrder.shippingCost > 0
                                                    ? `${currencySymbol}${selectedOrder.shippingCost.toFixed(2)}`
                                                    : 'Gratis'}
                                            </span>
                                        </div>
                                        {selectedOrder.taxAmount > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Impuestos</span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {currencySymbol}{selectedOrder.taxAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span className="font-bold text-gray-900 dark:text-white">Total</span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {currencySymbol}{selectedOrder.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tracking */}
                            {selectedOrder.trackingNumber && (
                                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <Truck className="text-blue-500" size={24} />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                Número de rastreo
                                            </p>
                                            <p className="text-blue-600 dark:text-blue-400">
                                                {selectedOrder.trackingNumber}
                                            </p>
                                        </div>
                                        {selectedOrder.trackingUrl && (
                                            <a
                                                href={selectedOrder.trackingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                            >
                                                Rastrear envío
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OrderHistoryPage;




