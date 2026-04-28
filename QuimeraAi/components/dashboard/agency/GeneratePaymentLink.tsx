/**
 * GeneratePaymentLink
 * Modal for agency admins to generate branded checkout links for sub-clients.
 * Allows selecting a plan and generates a copyable payment URL.
 */

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { AgencyPlanCardSelector } from './plans';
import { AgencyPlan } from '../../../types/agencyPlans';
import {
    Link2,
    Copy,
    CheckCircle,
    Loader2,
    AlertCircle,
    X,
    ExternalLink,
    Package,
    Mail,
    Clock,
    DollarSign,
} from 'lucide-react';

const functions = getFunctions();

// ============================================================================
// TYPES
// ============================================================================

interface GeneratePaymentLinkProps {
    isOpen: boolean;
    onClose: () => void;
    clientTenantId: string;
    clientName: string;
    currentPlanId?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GeneratePaymentLink({
    isOpen,
    onClose,
    clientTenantId,
    clientName,
    currentPlanId,
}: GeneratePaymentLinkProps) {
    const { currentTenant } = useTenant();
    const [selectedPlan, setSelectedPlan] = useState<AgencyPlan | null>(null);
    const [customPrice, setCustomPrice] = useState<string>('');
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handlePlanSelect = (plan: AgencyPlan | null) => {
        setSelectedPlan(plan);
        setGeneratedLink(null);
        setError(null);
        if (plan) {
            setCustomPrice(plan.price.toString());
        }
    };

    const handleGenerate = async () => {
        if (!selectedPlan) {
            setError('Selecciona un plan para continuar');
            return;
        }

        setGenerating(true);
        setError(null);

        try {
            const createLink = httpsCallable(functions, 'agencyBilling-createClientPaymentLink');
            const result = await createLink({
                clientTenantId,
                planId: selectedPlan.id,
                customPrice: useCustomPrice && customPrice
                    ? parseFloat(customPrice)
                    : undefined,
            });

            const data = result.data as any;
            setGeneratedLink(data.paymentUrl);
            setExpiresAt(data.expiresAt);
        } catch (err: any) {
            console.error('Error generating payment link:', err);
            setError(
                err?.message ||
                err?.details?.message ||
                'Error al generar el link de pago'
            );
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedLink) return;
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback copy
            const input = document.createElement('input');
            input.value = generatedLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setSelectedPlan(null);
        setCustomPrice('');
        setUseCustomPrice(false);
        setGeneratedLink(null);
        setExpiresAt(null);
        setError(null);
        onClose();
    };

    const effectivePrice = useCustomPrice && customPrice
        ? parseFloat(customPrice)
        : selectedPlan?.price || 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-q-surface rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-q-border flex items-center justify-between sticky top-0 bg-q-surface rounded-t-xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Link2 className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Generar Link de Pago
                            </h3>
                            <p className="text-xs text-q-text-muted">
                                Para: <span className="font-medium text-foreground">{clientName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-q-text-muted hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!generatedLink ? (
                        <>
                            {/* Plan Selection */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-semibold text-foreground">
                                        Seleccionar Plan
                                    </label>
                                </div>
                                {currentTenant?.id && (
                                    <AgencyPlanCardSelector
                                        tenantId={currentTenant.id}
                                        selectedPlanId={selectedPlan?.id || null}
                                        onChange={handlePlanSelect}
                                        showDetails={false}
                                    />
                                )}
                            </div>

                            {/* Custom Price Override */}
                            {selectedPlan && (
                                <div className="border border-q-border rounded-lg p-4 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={useCustomPrice}
                                            onChange={(e) => setUseCustomPrice(e.target.checked)}
                                            className="rounded border-q-border text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-foreground">
                                            Usar precio personalizado
                                        </span>
                                    </label>

                                    {useCustomPrice && (
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-q-text-muted" />
                                            <input
                                                type="number"
                                                value={customPrice}
                                                onChange={(e) => setCustomPrice(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-q-border rounded-lg bg-q-bg text-foreground text-sm focus:ring-2 focus:ring-primary"
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                            />
                                            <span className="text-sm text-q-text-muted">/mes</span>
                                        </div>
                                    )}

                                    <div className="text-xs text-q-text-muted">
                                        {useCustomPrice ? (
                                            <>
                                                Precio del plan: <span className="line-through">${selectedPlan.price.toFixed(2)}</span>
                                                {' → '}
                                                <span className="font-medium text-foreground">
                                                    ${parseFloat(customPrice || '0').toFixed(2)}
                                                </span>/mes
                                            </>
                                        ) : (
                                            <>Precio del plan: <span className="font-medium text-foreground">${selectedPlan.price.toFixed(2)}</span>/mes</>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {selectedPlan && (
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                    <h4 className="text-sm font-semibold text-foreground">Resumen</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-q-text-muted">Cliente</span>
                                        <span className="text-foreground font-medium">{clientName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-q-text-muted">Plan</span>
                                        <span className="text-foreground font-medium">{selectedPlan.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-q-text-muted">Cobro mensual</span>
                                        <span className="text-foreground font-semibold">${effectivePrice.toFixed(2)} USD</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-q-text-muted">Validez del link</span>
                                        <span className="text-foreground">48 horas</span>
                                    </div>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedPlan || generating}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generando link...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="h-4 w-4" />
                                        Generar Link de Pago
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        /* ======== GENERATED LINK RESULT ======== */
                        <div className="space-y-5">
                            {/* Success Banner */}
                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-green-900 dark:text-green-200 text-sm">
                                        Link generado exitosamente
                                    </p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                        Envía este link al cliente para que complete el pago.
                                    </p>
                                </div>
                            </div>

                            {/* Link Copy Box */}
                            <div className="border border-q-border rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-muted/30 border-b border-q-border">
                                    <p className="text-xs font-semibold text-q-text-muted uppercase tracking-wide">
                                        Link de Pago
                                    </p>
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={generatedLink}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-muted/50 border border-q-border rounded-lg text-sm text-foreground font-mono truncate"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                copied
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            }`}
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    Copiar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Link Details */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-q-text-muted">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Válido hasta:{' '}
                                        <span className="font-medium text-foreground">
                                            {expiresAt ? new Intl.DateTimeFormat('es-MX', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            }).format(new Date(expiresAt)) : '-'}
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-q-text-muted">
                                    <DollarSign className="h-4 w-4" />
                                    <span>
                                        Cobro: <span className="font-medium text-foreground">${effectivePrice.toFixed(2)} USD/mes</span>
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        if (generatedLink) {
                                            window.open(generatedLink, '_blank');
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-q-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Vista previa
                                </button>
                                <button
                                    onClick={() => {
                                        if (generatedLink) {
                                            const subject = encodeURIComponent(`Link de pago - ${selectedPlan?.name || 'Plan'}`);
                                            const body = encodeURIComponent(
                                                `Hola ${clientName},\n\nAquí tienes el link para activar tu plan ${selectedPlan?.name || ''}:\n\n${generatedLink}\n\nEste link es válido por 48 horas.\n\nSaludos,\n${currentTenant?.branding?.companyName || currentTenant?.name || ''}`
                                            );
                                            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Mail className="h-4 w-4" />
                                    Enviar por email
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GeneratePaymentLink;
