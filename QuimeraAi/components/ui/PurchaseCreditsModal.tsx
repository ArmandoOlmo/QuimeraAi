/**
 * PurchaseCreditsModal
 * Modal para comprar paquetes de créditos de IA via Stripe Checkout.
 * Funciona para usuarios regulares y agencias.
 */

import React, { useState } from 'react';
import { X, Zap, Check, Loader2, Crown, Sparkles, AlertTriangle } from 'lucide-react';
import { AI_CREDIT_PACKAGES, AiCreditPackage } from '../../types/subscription';
import { getFunctionsInstance } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeTenant } from '../../contexts/tenant/TenantContext';

interface PurchaseCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PurchaseCreditsModal: React.FC<PurchaseCreditsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const tenantContext = useSafeTenant();
    const [loading, setLoading] = useState<string | null>(null); // packageId being purchased
    const [error, setError] = useState<string | null>(null);

    const tenantId = tenantContext?.currentTenant?.id || `tenant_${user?.uid}`;
    const isAgency = !!tenantContext?.currentTenant?.subscriptionPlan?.includes('agency');

    if (!isOpen) return null;

    const handlePurchase = async (pkg: AiCreditPackage) => {
        if (!user) {
            setError('Debes estar autenticado para comprar créditos.');
            return;
        }

        setLoading(pkg.id);
        setError(null);

        try {
            const functions = await getFunctionsInstance();
            const createCheckout = httpsCallable<
                { packageId: string; tenantId: string; successUrl: string; cancelUrl: string },
                { sessionId: string; url: string }
            >(functions, 'stripe-createCreditPackageCheckout');

            const result = await createCheckout({
                packageId: pkg.id,
                tenantId,
                successUrl: window.location.href,
                cancelUrl: window.location.href,
            });

            // Redirect to Stripe Checkout
            if (result.data.url) {
                window.location.href = result.data.url;
            }
        } catch (err: any) {
            console.error('[PurchaseCreditsModal] Error:', err);
            setError(err.message || 'Error al crear la sesión de pago. Inténtalo de nuevo.');
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Comprar Créditos de IA</h2>
                                <p className="text-xs text-muted-foreground">
                                    {isAgency
                                        ? 'Los créditos se agregan al pool compartido de tu agencia'
                                        : 'Créditos adicionales para tu cuenta'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Agency indicator */}
                {isAgency && (
                    <div className="mx-6 mt-4 px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2">
                        <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-purple-300">
                            <strong>Pool Compartido</strong> — los créditos comprados se distribuyen entre todos tus clientes
                        </span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-300">{error}</span>
                    </div>
                )}

                {/* Packages Grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {AI_CREDIT_PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`relative rounded-xl border p-4 transition-all cursor-pointer hover:shadow-lg ${
                                pkg.isPopular
                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                    : 'border-border bg-card hover:border-primary/40'
                            }`}
                            onClick={() => !loading && handlePurchase(pkg)}
                        >
                            {/* Popular badge */}
                            {pkg.isPopular && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-md uppercase tracking-wider">
                                    Popular
                                </div>
                            )}

                            {/* Credits amount */}
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className={`w-4 h-4 ${pkg.isPopular ? 'text-yellow-400' : 'text-primary'}`} />
                                <span className="font-bold text-foreground text-lg">
                                    {pkg.credits.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">créditos</span>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-2xl font-extrabold text-foreground">${pkg.price}</span>
                                <span className="text-xs text-muted-foreground">USD</span>
                            </div>

                            {/* Price per credit */}
                            <div className="text-xs text-muted-foreground mb-3">
                                ${pkg.pricePerCredit.toFixed(3)} por crédito
                                {pkg.discount > 0 && (
                                    <span className="ml-1.5 text-green-400 font-semibold">
                                        -{pkg.discount}%
                                    </span>
                                )}
                            </div>

                            {/* Buy button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePurchase(pkg);
                                }}
                                disabled={!!loading}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    pkg.isPopular
                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-lg hover:shadow-yellow-500/20'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                } ${loading === pkg.id ? 'opacity-75' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading === pkg.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Redirigiendo...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Comprar
                                    </>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-secondary/30 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground">
                        Pago seguro con Stripe · Los créditos se agregan inmediatamente después del pago
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PurchaseCreditsModal;
