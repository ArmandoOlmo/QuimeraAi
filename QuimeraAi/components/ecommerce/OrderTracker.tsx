/**
 * OrderTracker
 * Componente público para rastrear pedidos
 */

import React, { useState } from 'react';
import {
    Search,
    Package,
    Truck,
    CheckCircle,
    Clock,
    AlertCircle,
    MapPin,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface OrderTrackerProps {
    storeId?: string;
    primaryColor?: string;
    storeName?: string;
}

interface TrackingResult {
    orderId: string;
    storeId: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    trackingNumber?: string;
    trackingUrl?: string;
    createdAt: { seconds: number };
    updatedAt: { seconds: number };
}

const OrderTracker: React.FC<OrderTrackerProps> = ({
    storeId,
    primaryColor = '#6366f1',
    storeName = 'Tu Tienda',
}) => {
    const [orderNumber, setOrderNumber] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TrackingResult | null>(null);

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!orderNumber.trim() || !email.trim()) {
            setError('Por favor ingresa el número de pedido y tu email');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const functions = getFunctions();
            const trackOrderFn = httpsCallable<
                { orderNumber: string; email: string },
                { found: boolean; order?: TrackingResult; error?: string }
            >(functions, 'trackOrder');

            const response = await trackOrderFn({
                orderNumber: orderNumber.trim(),
                email: email.trim().toLowerCase(),
            });

            if (response.data.found && response.data.order) {
                setResult(response.data.order);
            } else {
                setError(response.data.error || 'Pedido no encontrado');
            }
        } catch (err: any) {
            setError('Error al buscar el pedido. Intenta de nuevo.');
            console.error('Track order error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
            pending: { label: 'Pendiente', icon: <Clock size={20} />, color: '#f59e0b' },
            confirmed: { label: 'Confirmado', icon: <CheckCircle size={20} />, color: '#10b981' },
            processing: { label: 'Procesando', icon: <Package size={20} />, color: '#3b82f6' },
            shipped: { label: 'Enviado', icon: <Truck size={20} />, color: '#8b5cf6' },
            delivered: { label: 'Entregado', icon: <CheckCircle size={20} />, color: '#10b981' },
            cancelled: { label: 'Cancelado', icon: <AlertCircle size={20} />, color: '#ef4444' },
            refunded: { label: 'Reembolsado', icon: <AlertCircle size={20} />, color: '#6b7280' },
        };
        return statusMap[status] || { label: status, icon: <Package size={20} />, color: '#6b7280' };
    };

    const getFulfillmentInfo = (status: string) => {
        const statusMap: Record<string, { label: string; step: number }> = {
            unfulfilled: { label: 'Sin preparar', step: 0 },
            partial: { label: 'Parcialmente preparado', step: 1 },
            fulfilled: { label: 'Preparado', step: 2 },
            shipped: { label: 'Enviado', step: 3 },
            delivered: { label: 'Entregado', step: 4 },
        };
        return statusMap[status] || { label: status, step: 0 };
    };

    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                        style={{ backgroundColor: `${primaryColor}20` }}
                    >
                        <Truck size={32} style={{ color: primaryColor }} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Rastrear Pedido
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Ingresa tu número de pedido y email para ver el estado
                    </p>
                </div>

                {/* Search Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Número de Pedido
                            </label>
                            <input
                                type="text"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                placeholder="Ej: ORD-001234"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle size={18} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Buscando...
                                </>
                            ) : (
                                <>
                                    <Search size={20} />
                                    Rastrear Pedido
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Result */}
                {result && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        {/* Order Header */}
                        <div
                            className="p-6 text-white"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-sm">Pedido</p>
                                    <p className="text-2xl font-bold">{result.orderNumber}</p>
                                </div>
                                {(() => {
                                    const info = getStatusInfo(result.status);
                                    return (
                                        <div
                                            className="px-4 py-2 rounded-full flex items-center gap-2 bg-white/20"
                                        >
                                            {info.icon}
                                            <span className="font-medium">{info.label}</span>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between">
                                {['Confirmado', 'Preparando', 'Enviado', 'Entregado'].map((step, index) => {
                                    const fulfillment = getFulfillmentInfo(result.fulfillmentStatus);
                                    const isActive = index <= fulfillment.step;
                                    const isCurrent = index === fulfillment.step;

                                    return (
                                        <div key={step} className="flex flex-col items-center flex-1">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                                                    isActive
                                                        ? 'text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                } ${isCurrent ? 'ring-4 ring-offset-2' : ''}`}
                                                style={
                                                    isActive
                                                        ? { backgroundColor: primaryColor }
                                                        : isCurrent
                                                        ? { '--tw-ring-color': `${primaryColor}40` } as React.CSSProperties
                                                        : {}
                                                }
                                            >
                                                {isActive ? <CheckCircle size={20} /> : <div className="w-3 h-3 rounded-full bg-current" />}
                                            </div>
                                            <span className={`text-xs text-center ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
                                                {step}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            {/* Tracking Info */}
                            {result.trackingNumber && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="text-blue-500" size={20} />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Número de rastreo</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {result.trackingNumber}
                                            </p>
                                        </div>
                                        {result.trackingUrl && (
                                            <a
                                                href={result.trackingUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                                            >
                                                <ExternalLink size={20} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">Fecha del pedido</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatDate(result.createdAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 dark:text-gray-400">Última actualización</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {formatDate(result.updatedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    ¿No encuentras tu pedido? Contacta a{' '}
                    <a
                        href="mailto:soporte@tienda.com"
                        className="underline"
                        style={{ color: primaryColor }}
                    >
                        soporte
                    </a>
                </p>
            </div>
        </div>
    );
};

export default OrderTracker;














