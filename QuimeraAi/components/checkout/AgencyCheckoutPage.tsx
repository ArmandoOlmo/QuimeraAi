/**
 * AgencyCheckoutPage
 * Public-facing branded checkout page for agency client payment links.
 * Renders with the agency's branding (logo, colors, name) and uses Stripe Elements
 * for card collection. No authentication required.
 */

import React, { useState, useEffect, useMemo } from 'react';
import './AgencyCheckoutPage.css';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    CheckCircle,
    Shield,
    Lock,
    CreditCard,
    Loader2,
    AlertCircle,
    Clock,
    Star,
    Sparkles,
    XCircle,
} from 'lucide-react';

const functions = getFunctions();

// ============================================================================
// STRIPE INIT
// ============================================================================

const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

// ============================================================================
// TYPES
// ============================================================================

interface PaymentLinkInfo {
    status: 'pending' | 'completed' | 'expired' | 'cancelled';
    clientName: string;
    planName: string;
    monthlyPrice: number;
    planFeatures: string[];
    expiresAt: string;
    agencyName: string;
    agencyLogoUrl: string;
    agencyPrimaryColor: string;
    agencySecondaryColor: string;
    agencySupportEmail: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '79, 70, 229';
}

function formatTimeRemaining(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
}

// ============================================================================
// CARD FORM (inner component with Stripe hooks)
// ============================================================================

interface CardFormProps {
    token: string;
    info: PaymentLinkInfo;
    onSuccess: () => void;
}

function CardForm({ token, info, onSuccess }: CardFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cardComplete, setCardComplete] = useState(false);

    const primaryColor = info.agencyPrimaryColor || '#4f46e5';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        setProcessing(true);
        setError(null);

        try {
            // Create payment method from card element
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    name: info.clientName,
                },
            });

            if (pmError) {
                setError(pmError.message || 'Error al procesar tu tarjeta');
                setProcessing(false);
                return;
            }

            // Call Cloud Function to confirm payment
            const confirmPayment = httpsCallable(functions, 'agencyBilling-confirmClientPayment');
            const result = await confirmPayment({
                token,
                paymentMethodId: paymentMethod.id,
            });

            const data = result.data as any;

            if (data.requiresAction && data.clientSecret) {
                // Handle 3D Secure / SCA
                const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
                if (confirmError) {
                    setError(confirmError.message || 'Error de autenticación');
                    setProcessing(false);
                    return;
                }
            }

            onSuccess();
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(
                err?.message ||
                err?.details?.message ||
                'Error al procesar el pago. Inténtalo de nuevo.'
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="aco-card-form">
            <div className="aco-card-element-wrapper">
                <div className="aco-card-element-label">
                    <CreditCard size={16} />
                    <span>Datos de tarjeta</span>
                </div>
                <div className="aco-card-element">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#1a1a2e',
                                    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
                                    fontSmoothing: 'antialiased',
                                    '::placeholder': { color: '#9ca3af' },
                                    iconColor: primaryColor,
                                },
                                invalid: {
                                    color: '#ef4444',
                                    iconColor: '#ef4444',
                                },
                            },
                            hidePostalCode: true,
                        }}
                        onChange={(e) => setCardComplete(e.complete)}
                    />
                </div>
            </div>

            {error && (
                <div className="aco-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || processing || !cardComplete}
                className="aco-pay-button"
                style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${info.agencySecondaryColor || primaryColor})`,
                }}
            >
                {processing ? (
                    <>
                        <Loader2 size={20} className="aco-spin" />
                        Procesando pago...
                    </>
                ) : (
                    <>
                        <Lock size={16} />
                        Suscribirse por ${info.monthlyPrice.toFixed(2)}/mes
                    </>
                )}
            </button>

            <div className="aco-security-badge">
                <Shield size={14} />
                <span>Pago seguro procesado por Stripe. Tu información está protegida.</span>
            </div>
        </form>
    );
}

// ============================================================================
// SUCCESS STATE
// ============================================================================

function SuccessScreen({ info }: { info: PaymentLinkInfo }) {
    const primaryColor = info.agencyPrimaryColor || '#4f46e5';

    return (
        <div className="aco-success">
            <div
                className="aco-success-icon"
                style={{ background: `${primaryColor}15`, color: primaryColor }}
            >
                <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="aco-success-title">¡Pago Confirmado!</h2>
            <p className="aco-success-text">
                Tu suscripción al plan <strong>{info.planName}</strong> ha sido activada exitosamente.
            </p>
            <div className="aco-success-details">
                <div className="aco-success-row">
                    <span>Plan</span>
                    <strong>{info.planName}</strong>
                </div>
                <div className="aco-success-row">
                    <span>Monto mensual</span>
                    <strong>${info.monthlyPrice.toFixed(2)} USD</strong>
                </div>
                <div className="aco-success-row">
                    <span>Estado</span>
                    <span className="aco-badge-active">Activo</span>
                </div>
            </div>
            <p className="aco-success-footer">
                Si tienes alguna pregunta, contacta a{' '}
                <a href={`mailto:${info.agencySupportEmail}`} style={{ color: primaryColor }}>
                    {info.agencyName}
                </a>
            </p>
        </div>
    );
}

// ============================================================================
// MAIN CHECKOUT PAGE
// ============================================================================

interface AgencyCheckoutPageProps {
    token: string;
}

export default function AgencyCheckoutPage({ token }: AgencyCheckoutPageProps) {
    const [info, setInfo] = useState<PaymentLinkInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        loadPaymentLink();
    }, [token]);

    const loadPaymentLink = async () => {
        try {
            setLoading(true);
            const getInfo = httpsCallable(functions, 'agencyBilling-getPaymentLinkInfo');
            const result = await getInfo({ token });
            setInfo(result.data as PaymentLinkInfo);
        } catch (err: any) {
            console.error('Error loading payment link:', err);
            setError('Este link de pago no es válido o ha expirado.');
        } finally {
            setLoading(false);
        }
    };

    // Dynamic CSS variables based on agency branding
    const brandStyles = useMemo(() => {
        if (!info) return {};
        return {
            '--aco-primary': info.agencyPrimaryColor || '#4f46e5',
            '--aco-primary-rgb': hexToRgb(info.agencyPrimaryColor || '#4f46e5'),
            '--aco-secondary': info.agencySecondaryColor || '#10b981',
        } as React.CSSProperties;
    }, [info]);

    // ======== LOADING ========
    if (loading) {
        return (
            <div className="aco-page" style={brandStyles}>
                <div className="aco-loading">
                    <Loader2 size={32} className="aco-spin" />
                    <p>Cargando información de pago...</p>
                </div>
            </div>
        );
    }

    // ======== ERROR ========
    if (error || !info) {
        return (
            <div className="aco-page">
                <div className="aco-container">
                    <div className="aco-error-page">
                        <XCircle size={48} />
                        <h2>Link no válido</h2>
                        <p>{error || 'No se pudo cargar la información de pago.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ======== EXPIRED / CANCELLED / COMPLETED ========
    if (info.status !== 'pending' && !isComplete) {
        return (
            <div className="aco-page" style={brandStyles}>
                <div className="aco-container">
                    <div className="aco-header">
                        {info.agencyLogoUrl ? (
                            <img src={info.agencyLogoUrl} alt={info.agencyName} className="aco-logo" />
                        ) : (
                            <div className="aco-logo-placeholder" style={{ background: info.agencyPrimaryColor }}>
                                {info.agencyName.charAt(0)}
                            </div>
                        )}
                        <h1 className="aco-agency-name">{info.agencyName}</h1>
                    </div>
                    <div className="aco-error-page">
                        {info.status === 'completed' ? (
                            <>
                                <CheckCircle size={48} style={{ color: '#22c55e' }} />
                                <h2>Pago ya completado</h2>
                                <p>Este link de pago ya fue utilizado. Tu suscripción está activa.</p>
                            </>
                        ) : (
                            <>
                                <Clock size={48} />
                                <h2>Link {info.status === 'expired' ? 'expirado' : 'cancelado'}</h2>
                                <p>
                                    Este link de pago ya no es válido. Contacta a{' '}
                                    <a href={`mailto:${info.agencySupportEmail}`} style={{ color: info.agencyPrimaryColor }}>
                                        {info.agencyName}
                                    </a>{' '}
                                    para obtener un nuevo link.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ======== ACTIVE CHECKOUT ========
    return (
        <div className="aco-page" style={brandStyles}>
            {/* Background decoration */}
            <div className="aco-bg-pattern" />

            <div className="aco-container">
                {/* Agency Header */}
                <div className="aco-header">
                    {info.agencyLogoUrl ? (
                        <img src={info.agencyLogoUrl} alt={info.agencyName} className="aco-logo" />
                    ) : (
                        <div className="aco-logo-placeholder" style={{ background: info.agencyPrimaryColor }}>
                            {info.agencyName.charAt(0)}
                        </div>
                    )}
                    <h1 className="aco-agency-name">{info.agencyName}</h1>
                </div>

                {isComplete ? (
                    <SuccessScreen info={info} />
                ) : (
                    <div className="aco-main">
                        {/* Plan Card */}
                        <div className="aco-plan-card">
                            <div className="aco-plan-header">
                                <div className="aco-plan-badge">
                                    <Sparkles size={14} />
                                    Plan Seleccionado
                                </div>
                                <h2 className="aco-plan-name">{info.planName}</h2>
                                <div className="aco-plan-price">
                                    <span className="aco-plan-currency">$</span>
                                    <span className="aco-plan-amount">{info.monthlyPrice.toFixed(0)}</span>
                                    <span className="aco-plan-period">/mes</span>
                                </div>
                            </div>

                            <div className="aco-plan-features">
                                {info.planFeatures.map((feature, i) => (
                                    <div key={i} className="aco-feature-item">
                                        <Star
                                            size={14}
                                            style={{ color: info.agencyPrimaryColor }}
                                        />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="aco-expiry">
                                <Clock size={14} />
                                <span>{formatTimeRemaining(info.expiresAt)}</span>
                            </div>
                        </div>

                        {/* Payment Form */}
                        <div className="aco-payment-section">
                            <h3 className="aco-payment-title">
                                Información de Pago
                            </h3>
                            <p className="aco-payment-subtitle">
                                Hola <strong>{info.clientName}</strong>, completa tu suscripción ingresando los datos de tu tarjeta.
                            </p>
                            <Elements stripe={stripePromise}>
                                <CardForm
                                    token={token}
                                    info={info}
                                    onSuccess={() => setIsComplete(true)}
                                />
                            </Elements>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="aco-footer">
                    <span>Powered by <strong>{info.agencyName}</strong></span>
                    <span className="aco-footer-dot">·</span>
                    <span>Pagos procesados por <strong>Stripe</strong></span>
                </div>
            </div>
        </div>
    );
}
