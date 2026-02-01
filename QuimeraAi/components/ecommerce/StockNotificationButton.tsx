/**
 * StockNotificationButton Component
 * Botón y modal para suscribirse a notificaciones de stock
 */

import React, { useState } from 'react';
import { Bell, BellOff, X, Loader2, Check, AlertCircle, Mail } from 'lucide-react';

interface StockNotificationButtonProps {
    productId: string;
    productName: string;
    productSlug: string;
    productImage?: string;
    isSubscribed: boolean;
    onSubscribe: (email: string) => Promise<{ success: boolean; error?: string }>;
    onUnsubscribe: () => Promise<void>;
    primaryColor?: string;
}

const StockNotificationButton: React.FC<StockNotificationButtonProps> = ({
    productId,
    productName,
    productSlug,
    productImage,
    isSubscribed,
    onSubscribe,
    onUnsubscribe,
    primaryColor = '#6366f1',
}) => {
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !email.includes('@')) {
            setError('Por favor ingresa un email válido');
            return;
        }

        setIsLoading(true);
        const result = await onSubscribe(email.trim());
        setIsLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                setShowModal(false);
                setSuccess(false);
                setEmail('');
            }, 2000);
        } else {
            setError(result.error || 'Error al suscribirse');
        }
    };

    const handleUnsubscribe = async () => {
        setIsLoading(true);
        await onUnsubscribe();
        setIsLoading(false);
    };

    if (isSubscribed) {
        return (
            <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-500/30 transition-colors hover:bg-green-100 dark:hover:bg-green-500/20 disabled:opacity-50"
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : (
                    <BellOff size={18} />
                )}
                <span className="text-sm font-medium">Notificación activa</span>
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            >
                <Bell size={18} />
                <span className="text-sm font-medium">Avisarme cuando esté disponible</span>
            </button>

            {/* Modal */}
            {showModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={() => setShowModal(false)}
                    />
                    <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Notificación de stock
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {success ? (
                                <div className="text-center py-4">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                        style={{ backgroundColor: `${primaryColor}20` }}
                                    >
                                        <Check size={32} style={{ color: primaryColor }} />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        ¡Listo!
                                    </h4>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Te avisaremos cuando el producto esté disponible
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Product Info */}
                                    <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        {productImage ? (
                                            <img
                                                src={productImage}
                                                alt={productName}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                <Bell className="text-gray-400" size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {productName}
                                            </h4>
                                            <p className="text-sm text-red-500">Agotado</p>
                                        </div>
                                    </div>

                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        Ingresa tu email y te notificaremos cuando el producto vuelva a estar
                                        disponible.
                                    </p>

                                    {error && (
                                        <div className="p-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                                            <AlertCircle size={18} />
                                            <span className="text-sm">{error}</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubscribe}>
                                        <div className="relative mb-4">
                                            <Mail
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                size={20}
                                            />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="tu@email.com"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Suscribiendo...
                                                </>
                                            ) : (
                                                <>
                                                    <Bell size={18} />
                                                    Notificarme
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <p className="text-xs text-gray-400 mt-4 text-center">
                                        Solo te enviaremos un email cuando el producto esté disponible
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default StockNotificationButton;











