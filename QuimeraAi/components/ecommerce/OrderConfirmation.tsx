/**
 * OrderConfirmation
 * Página de confirmación de pedido
 */

import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    Package,
    Mail,
    MapPin,
    CreditCard,
    Calendar,
    ArrowRight,
    Printer,
    Share2,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { supabase } from '../../supabase';
import { Order, StoreSettings, StoredTimestamp } from '../../types/ecommerce';
import { mapStoreSettingsFromDB } from '../../utils/ecommerceMappers';
import { resolveProjectBackedStoreIdentity } from '../../utils/ecommerce/storeIdentity';
import { timestampToDate } from '../../utils/timestampUtils';

// Props for direct order display
interface OrderConfirmationDirectProps {
    order: Order;
    onContinueShopping: () => void;
    onViewOrders?: () => void;
    currencySymbol?: string;
    primaryColor?: string;
    storeName?: string;
}

// Props for fetching order by ID
interface OrderConfirmationFetchProps {
    storeId: string;
    orderId: string;
    orderAccessToken?: string;
    onContinueShopping: () => void;
    onViewOrders?: () => void;
}

type OrderConfirmationProps = OrderConfirmationDirectProps | OrderConfirmationFetchProps;

// Type guard
function isDirectProps(props: OrderConfirmationProps): props is OrderConfirmationDirectProps {
    return 'order' in props;
}

type ConfirmationDbRecord = Record<string, any>;

const isConfirmationUuid = (value: string | null | undefined): boolean => (
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
);

const loadConfirmationStoreSettings = async (storeId: string): Promise<StoreSettings | null> => {
    let projectRow: ConfirmationDbRecord | null = null;
    if (isConfirmationUuid(storeId)) {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', storeId)
            .maybeSingle();

        if (error) throw error;
        projectRow = data;
    }

    let publicStoreRow: ConfirmationDbRecord | null = null;
    if (!projectRow) {
        const { data, error } = await supabase
            .from('public_stores')
            .select('*')
            .eq('id', storeId)
            .maybeSingle();

        if (error) throw error;
        publicStoreRow = data;
    }

    const identity = resolveProjectBackedStoreIdentity({
        storeId,
        projectId: projectRow?.id,
        publicStoreId: publicStoreRow?.id,
        project: projectRow,
        publicStore: publicStoreRow,
    });
    const settingsProjectId = identity.projectId || identity.engineStoreId || storeId;
    if (!isConfirmationUuid(settingsProjectId)) return null;

    const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('project_id', settingsProjectId)
        .maybeSingle();

    if (error) throw error;
    return data ? mapStoreSettingsFromDB(data) : null;
};

// Inner component for displaying order
const OrderConfirmationDisplay: React.FC<{
    order: Order;
    onContinueShopping: () => void;
    onViewOrders?: () => void;
    currencySymbol?: string;
    primaryColor?: string;
    storeName?: string;
}> = ({
    order,
    onContinueShopping,
    onViewOrders,
    currencySymbol = '$',
    primaryColor = '#6366f1',
    storeName = 'Tu Tienda',
	}) => {
	    const shippingAddress = order.shippingAddress;
	    const orderItems = order.items || [];
	    const itemLineTotal = (item: any) => {
	        const explicitTotal = Number(item.totalPrice ?? item.total ?? 0);
	        if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;

	        const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
	        const quantity = Number(item.quantity || 0);
	        return Number.isFinite(unitPrice) && Number.isFinite(quantity) ? unitPrice * quantity : 0;
	    };
	    const subtotal = Number(order.subtotal ?? orderItems.reduce((sum, item) => sum + itemLineTotal(item), 0));
	    const discountAmount = Number(order.discountAmount ?? 0);
	    const taxAmount = Number(order.taxAmount ?? 0);
	    const rawTotal = order.total === undefined || order.total === null ? undefined : Number(order.total);
	    const inferredShippingCost =
	        rawTotal !== undefined && order.shippingCost == null
	            ? Math.max(0, rawTotal - subtotal + discountAmount - taxAmount)
	            : 0;
	    const shippingCost = Number(order.shippingCost ?? inferredShippingCost);
	    const total = Number(order.total ?? Math.max(0, subtotal - discountAmount + shippingCost + taxAmount));
	    const paymentMethod = order.paymentMethod || (order.paymentStatus === 'pending' ? 'cod' : '');

    const formatDate = (timestamp: StoredTimestamp) => {
        return timestampToDate(timestamp).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Pedido #${order.orderNumber}`,
                    text: `Mi pedido de ${storeName}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    >
                        <CheckCircle size={48} style={{ color: primaryColor }} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        ¡Gracias por tu pedido!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Hemos recibido tu pedido y lo estamos procesando
                    </p>
                </div>

                {/* Order Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
                    {/* Order Header */}
                    <div
                        className="p-6 text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/80 text-sm">Número de pedido</p>
                                <p className="text-2xl font-bold">{order.orderNumber}</p>
                            </div>
                            <Package size={48} className="opacity-50" />
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-6 space-y-6">
                        {/* Email Confirmation */}
                        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                            <Mail className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    Confirmación enviada
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {order.customerEmail ? (
                                        <>
                                            Enviamos un email de confirmación a{' '}
                                            <span className="font-medium">{order.customerEmail}</span>
                                        </>
                                    ) : (
                                        'Tu pedido quedo registrado correctamente.'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Order Info Grid */}
                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Date */}
                            <div className="flex items-start gap-3">
                                <Calendar className="text-gray-400 flex-shrink-0" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha del pedido</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatDate(order.createdAt)}
                                    </p>
                                </div>
                            </div>

                            {/* Payment */}
                            <div className="flex items-start gap-3">
                                <CreditCard className="text-gray-400 flex-shrink-0" size={20} />
	                                <div>
	                                    <p className="text-sm text-gray-500 dark:text-gray-400">Método de pago</p>
	                                    <p className="font-medium text-gray-900 dark:text-white capitalize">
	                                        {paymentMethod === 'stripe'
	                                            ? 'Tarjeta'
	                                            : paymentMethod === 'cod'
	                                            ? 'Contra entrega'
	                                            : paymentMethod || 'No especificado'}
	                                    </p>
	                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="flex items-start gap-3 sm:col-span-2">
                                <MapPin className="text-gray-400 flex-shrink-0" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Dirección de envío</p>
                                    {shippingAddress ? (
                                        <>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {shippingAddress.firstName} {shippingAddress.lastName}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {shippingAddress.address1}
                                                {shippingAddress.address2 && `, ${shippingAddress.address2}`}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {shippingAddress.city}, {shippingAddress.state}{' '}
                                                {shippingAddress.zipCode}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {shippingAddress.country}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Disponible en el detalle interno del pedido.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                                Productos ({orderItems.length})
                            </h3>
                            <div className="space-y-4">
                                {orderItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        {item.image || item.imageUrl ? (
                                            <img
                                                src={item.image || item.imageUrl}
                                                alt={item.productName}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                <Package className="text-gray-400" size={24} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {item.productName}
                                            </p>
                                            {item.variantName && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {item.variantName}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Cantidad: {item.quantity}
                                            </p>
	                                        </div>
	                                        <p className="font-medium text-gray-900 dark:text-white">
	                                            {currencySymbol}{itemLineTotal(item).toFixed(2)}
	                                        </p>
	                                    </div>
	                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
	                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
	                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
	                                <span>Subtotal</span>
	                                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
	                            </div>
	                            {discountAmount > 0 && (
	                                <div className="flex justify-between text-green-600">
	                                    <span>Descuento ({order.discountCode})</span>
	                                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
	                                </div>
	                            )}
	                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
	                                <span>Envío</span>
	                                <span>
	                                    {shippingCost === 0
	                                        ? 'Gratis'
	                                        : `${currencySymbol}${shippingCost.toFixed(2)}`}
	                                </span>
	                            </div>
	                            {taxAmount > 0 && (
	                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
	                                    <span>Impuestos</span>
	                                    <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
	                                </div>
	                            )}
	                            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
	                                <span>Total</span>
	                                <span>{currencySymbol}{total.toFixed(2)}</span>
	                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={onContinueShopping}
                        className="flex-1 py-3 px-6 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Seguir comprando
                        <ArrowRight size={20} />
                    </button>
                    {onViewOrders && (
                        <button
                            onClick={onViewOrders}
                            className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Ver mis pedidos
                        </button>
                    )}
                </div>

                {/* Print & Share */}
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        <Printer size={18} />
                        Imprimir
                    </button>
                    {typeof navigator !== 'undefined' && navigator.share && (
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            <Share2 size={18} />
                            Compartir
                        </button>
                    )}
                </div>

                {/* Help Text */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    ¿Tienes preguntas? Contáctanos en{' '}
                    <a
                        href="mailto:soporte@tienda.com"
                        className="underline"
                        style={{ color: primaryColor }}
                    >
                        soporte@tienda.com
                    </a>
                </p>
            </div>
        </div>
    );
};

// Main component that handles both direct order and fetch by ID
const OrderConfirmation: React.FC<OrderConfirmationProps> = (props) => {
    const [order, setOrder] = useState<Order | null>(isDirectProps(props) ? props.order : null);
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
    const [isLoading, setIsLoading] = useState(!isDirectProps(props));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isDirectProps(props)) {
            return;
        }

        const fetchOrder = async () => {
            try {
                const { storeId, orderId } = props;
                const orderAccessToken = props.orderAccessToken ||
                    new URLSearchParams(window.location.search).get('token') ||
                    undefined;

                const settingsPromise = loadConfirmationStoreSettings(storeId).catch((settingsError) => {
                    console.warn('Could not load store settings for order confirmation:', settingsError);
                    return null;
                });

                // Get order securely from backend
                const result = await supabase.functions.invoke('stripe-api', {
                    body: { action: 'getStoreOrderStatus', storeId, orderId, orderAccessToken }
                });
                if (result.error) throw result.error;
                const orderData = result.data?.data || result.data;

                if (!orderData || !orderData.id) {
                    setError('Pedido no encontrado');
                    setIsLoading(false);
                    return;
                }

                // Convert ISO date back to a mock timestamp for the UI if necessary
                if (orderData.createdAt && typeof orderData.createdAt === 'string') {
                    orderData.createdAt = {
                        seconds: Math.floor(new Date(orderData.createdAt).getTime() / 1000)
                    };
                }

                const nextStoreSettings = await settingsPromise;
                if (nextStoreSettings) {
                    setStoreSettings(nextStoreSettings);
                }

                setOrder(orderData as Order);
                localStorage.removeItem(`cart_${storeId}`);
                setIsLoading(false);
            } catch (err: any) {
                console.error('Error fetching order:', err);
                setError(err.message || 'Error al cargar el pedido');
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [props]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Cargando pedido...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {error || 'Pedido no encontrado'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        No pudimos encontrar la informacion de tu pedido
                    </p>
                    <button
                        onClick={props.onContinueShopping}
                        className="px-6 py-3 rounded-xl text-white font-bold bg-indigo-500 hover:bg-indigo-600 transition-colors"
                    >
                        Volver a la tienda
                    </button>
                </div>
            </div>
        );
    }

    const directProps = isDirectProps(props) ? props : {
        order,
        onContinueShopping: props.onContinueShopping,
        onViewOrders: props.onViewOrders,
        currencySymbol: storeSettings?.currencySymbol || '$',
        primaryColor: storeSettings?.storefrontTheme?.primaryColor || '#6366f1',
        storeName: storeSettings?.storeName || 'Tu Tienda',
    };

    return <OrderConfirmationDisplay {...directProps} />;
};

export default OrderConfirmation;
