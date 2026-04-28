/**
 * AgencyDomainPanel
 * Complete custom domain configuration for agency landing pages.
 * Reuses the same DNS infrastructure as project domains (Load Balancer IP, Cloud Run SSL),
 * but binds the domain to an agencyLandingTenantId instead of a projectId.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDomains } from '../../../contexts/domains';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import { Domain } from '../../../types';
import { isValidDomain } from '../../../services/domainService';
import { saveAgencyLanding } from '../../../services/agencyLandingService';
import {
    Globe,
    CheckCircle,
    AlertTriangle,
    Clock,
    Copy,
    ExternalLink,
    RefreshCw,
    Loader2,
    Plus,
    Trash2,
    Link2,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import ConfirmationModal from '../../ui/ConfirmationModal';

// Load Balancer IP (same as projects)
const QUIMERA_DNS_IP = '130.211.43.242';

const AgencyDomainPanel: React.FC = () => {
    const { t } = useTranslation();
    const { domains, addDomain, deleteDomain, verifyDomain, updateDomain, refetch } = useDomains();
    const { currentTenant } = useTenant();
    const { user } = useAuth();

    const tenantId = currentTenant?.id;

    // Filter domains that belong to this agency landing
    const agencyDomains = domains.filter(d => d.agencyLandingTenantId === tenantId);

    // UI State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDomainName, setNewDomainName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
    const [deleteConfirmDomain, setDeleteConfirmDomain] = useState<Domain | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [verificationMessages, setVerificationMessages] = useState<Record<string, string>>({});

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomainName || !tenantId || !user) return;

        const normalized = newDomainName.toLowerCase().trim().replace(/^www\./, '').replace(/^https?:\/\//, '');

        if (!isValidDomain(normalized)) {
            setAddError('Dominio inválido. Ejemplo: miagencia.com');
            return;
        }

        // Check if already exists
        if (domains.find(d => d.name === normalized)) {
            setAddError('Este dominio ya está registrado en tu cuenta.');
            return;
        }

        setIsAdding(true);
        setAddError(null);

        try {
            await addDomain({
                id: `dom_${Date.now()}`,
                name: normalized,
                status: 'pending',
                provider: 'External',
                agencyLandingTenantId: tenantId,
                // No projectId — this is for the agency landing
                createdAt: new Date().toISOString(),
                dnsConfig: {
                    aRecord: QUIMERA_DNS_IP,
                    cnameRecord: normalized,
                },
            });

            // Also update the agencyLanding document with the custom domain
            await saveAgencyLanding(tenantId, {
                domain: {
                    customDomain: normalized,
                    domainVerified: false,
                },
            });

            setNewDomainName('');
            setShowAddForm(false);
            await refetch();
        } catch (err: any) {
            console.error('[AgencyDomainPanel] Error adding domain:', err);
            setAddError(err.message || 'Error al agregar el dominio');
        } finally {
            setIsAdding(false);
        }
    };

    const handleVerify = async (domain: Domain) => {
        setVerifyingDomainId(domain.id);
        setVerificationMessages(prev => ({ ...prev, [domain.id]: '' }));

        try {
            const success = await verifyDomain(domain.id);
            if (success) {
                setVerificationMessages(prev => ({
                    ...prev,
                    [domain.id]: '✅ ¡Dominio verificado y activo!',
                }));

                // Update agency landing config
                if (tenantId) {
                    await saveAgencyLanding(tenantId, {
                        domain: {
                            customDomain: domain.name,
                            domainVerified: true,
                            sslEnabled: true,
                        },
                    });
                }

                await refetch();
            } else {
                setVerificationMessages(prev => ({
                    ...prev,
                    [domain.id]: '⏳ DNS aún no propagado. Intenta de nuevo en unos minutos.',
                }));
            }
        } catch (err: any) {
            setVerificationMessages(prev => ({
                ...prev,
                [domain.id]: `❌ Error: ${err.message || 'Error al verificar'}`,
            }));
        } finally {
            setVerifyingDomainId(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirmDomain) return;
        setIsDeletingId(deleteConfirmDomain.id);

        try {
            await deleteDomain(deleteConfirmDomain.id);

            // Clear from agency landing config
            if (tenantId) {
                await saveAgencyLanding(tenantId, {
                    domain: {
                        customDomain: '',
                        domainVerified: false,
                    },
                });
            }
        } catch (err: any) {
            console.error('[AgencyDomainPanel] Error deleting domain:', err);
        } finally {
            setIsDeletingId(null);
            setDeleteConfirmDomain(null);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        // Use a brief visual feedback instead of alert
        const el = document.getElementById(`copy-feedback-${text}`);
        if (el) {
            el.textContent = '✓';
            setTimeout(() => { el.textContent = ''; }, 1500);
        }
    };

    // Status badge component
    const StatusBadge: React.FC<{ domain: Domain }> = ({ domain }) => {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            active: {
                color: 'text-green-500 bg-green-500/10 border-green-500/20',
                icon: <CheckCircle size={12} />,
                label: 'Activo',
            },
            pending: {
                color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
                icon: <Clock size={12} />,
                label: 'DNS Pendiente',
            },
            ssl_pending: {
                color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
                icon: <Loader2 size={12} className="animate-spin" />,
                label: 'SSL en proceso',
            },
            verifying: {
                color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                icon: <Loader2 size={12} className="animate-spin" />,
                label: 'Verificando...',
            },
            error: {
                color: 'text-red-500 bg-red-500/10 border-red-500/20',
                icon: <AlertTriangle size={12} />,
                label: 'Error',
            },
        };

        const config = statusConfig[domain.status] || statusConfig.pending;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${config.color}`}>
                {config.icon} {config.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Dominio Personalizado
                    </h3>
                    <p className="text-xs text-q-text-muted mt-1">
                        Conecta un dominio propio para tu landing page de agencia
                    </p>
                </div>
                {agencyDomains.length === 0 && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
                    >
                        <Plus size={14} />
                        Conectar Dominio
                    </button>
                )}
            </div>

            {/* Existing Domains */}
            {agencyDomains.map(domain => (
                <div
                    key={domain.id}
                    className="border border-q-border rounded-xl overflow-hidden bg-q-surface/80 backdrop-blur-sm"
                >
                    {/* Domain Header */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-foreground text-base">{domain.name}</h4>
                                <StatusBadge domain={domain} />
                                {domain.sslStatus === 'active' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border text-green-500 bg-green-500/10 border-green-500/20">
                                        <ShieldCheck size={12} /> SSL
                                    </span>
                                )}
                            </div>
                            {domain.status === 'active' && (
                                <a
                                    href={`https://${domain.name}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                >
                                    https://{domain.name} <ExternalLink size={10} />
                                </a>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleVerify(domain)}
                                disabled={verifyingDomainId === domain.id}
                                className="p-2 text-q-text-muted hover:text-primary hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                                title="Verificar DNS"
                            >
                                <RefreshCw size={16} className={verifyingDomainId === domain.id ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setDeleteConfirmDomain(domain)}
                                disabled={isDeletingId === domain.id}
                                className="p-2 text-q-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Eliminar dominio"
                            >
                                {isDeletingId === domain.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Verification Message */}
                    {verificationMessages[domain.id] && (
                        <div className={`mx-4 mb-3 p-3 rounded-lg text-sm ${
                            verificationMessages[domain.id].startsWith('✅')
                                ? 'bg-green-500/10 border border-green-500/20 text-green-600'
                                : verificationMessages[domain.id].startsWith('❌')
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                                    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-600'
                        }`}>
                            {verificationMessages[domain.id]}
                        </div>
                    )}

                    {/* DNS Instructions — only show when domain is pending */}
                    {(domain.status === 'pending' || domain.status === 'error') && (
                        <div className="border-t border-q-border p-4 bg-gradient-to-b from-blue-500/5 to-transparent">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={14} className="text-blue-500" />
                                <h5 className="text-sm font-bold text-foreground">Configura tu DNS</h5>
                            </div>
                            <p className="text-xs text-q-text-muted mb-4">
                                Ve a tu proveedor de dominios y agrega estos registros DNS:
                            </p>

                            <div className="space-y-2">
                                {/* A Record */}
                                <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">A</span>
                                        <span className="text-xs text-q-text-muted">Dominio raíz</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-[10px] text-q-text-muted uppercase font-bold block">Host</span>
                                            <code className="font-mono font-bold text-foreground">@</code>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-q-text-muted uppercase font-bold block">Valor</span>
                                            <div className="flex items-center gap-1">
                                                <code className="font-mono font-bold text-primary">{QUIMERA_DNS_IP}</code>
                                                <button
                                                    onClick={() => copyToClipboard(QUIMERA_DNS_IP, 'IP')}
                                                    className="p-1 hover:bg-secondary rounded text-q-text-muted hover:text-primary transition-colors"
                                                    title="Copiar IP"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                                <span id={`copy-feedback-${QUIMERA_DNS_IP}`} className="text-green-500 text-xs font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CNAME Record */}
                                <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded">CNAME</span>
                                        <span className="text-xs text-q-text-muted">Para www.{domain.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-[10px] text-q-text-muted uppercase font-bold block">Host</span>
                                            <code className="font-mono font-bold text-foreground">www</code>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-q-text-muted uppercase font-bold block">Valor</span>
                                            <div className="flex items-center gap-1">
                                                <code className="font-mono font-bold text-primary text-xs">{domain.name}</code>
                                                <button
                                                    onClick={() => copyToClipboard(domain.name, 'CNAME')}
                                                    className="p-1 hover:bg-secondary rounded text-q-text-muted hover:text-primary transition-colors"
                                                    title="Copiar CNAME"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                                <span id={`copy-feedback-${domain.name}`} className="text-green-500 text-xs font-bold" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verify Button */}
                            <button
                                onClick={() => handleVerify(domain)}
                                disabled={verifyingDomainId === domain.id}
                                className="w-full mt-4 bg-primary text-primary-foreground font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
                            >
                                {verifyingDomainId === domain.id ? (
                                    <><Loader2 size={16} className="animate-spin" /> Verificando...</>
                                ) : (
                                    <><RefreshCw size={16} /> Verificar DNS</>
                                )}
                            </button>

                            <p className="text-[10px] text-center text-q-text-muted mt-2 flex items-center justify-center gap-1">
                                <Clock size={10} />
                                Los cambios de DNS pueden tardar entre 5 min y 48 horas en propagarse.
                            </p>
                        </div>
                    )}

                    {/* SSL Provisioning notice */}
                    {domain.status === 'ssl_pending' && (
                        <div className="border-t border-q-border p-4 bg-gradient-to-b from-purple-500/5 to-transparent">
                            <div className="flex items-center gap-2">
                                <Loader2 size={14} className="text-purple-500 animate-spin" />
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    Generando certificado SSL... Esto puede tomar unos minutos.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Active status message */}
                    {domain.status === 'active' && (
                        <div className="border-t border-q-border p-4 bg-gradient-to-b from-green-500/5 to-transparent">
                            <p className="text-sm text-green-600 flex items-center gap-2">
                                <CheckCircle size={14} />
                                Tu landing page de agencia está disponible en{' '}
                                <a href={`https://${domain.name}`} target="_blank" rel="noreferrer" className="font-bold underline">
                                    {domain.name}
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            ))}

            {/* Add Domain Form */}
            {showAddForm && (
                <div className="border border-primary/30 rounded-xl overflow-hidden bg-primary/5">
                    <form onSubmit={handleAddDomain} className="p-5">
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <Link2 size={16} className="text-primary" />
                            Conectar Dominio Existente
                        </h4>

                        {addError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                                <AlertTriangle size={14} />
                                {addError}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-q-text-muted uppercase tracking-wider mb-2">
                                Nombre del dominio
                            </label>
                            <input
                                required
                                autoFocus
                                disabled={isAdding}
                                value={newDomainName}
                                onChange={(e) => {
                                    setNewDomainName(e.target.value);
                                    setAddError(null);
                                }}
                                placeholder="miagencia.com"
                                className="w-full bg-q-bg border border-q-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium disabled:opacity-50 text-foreground placeholder:text-q-text-muted"
                            />
                            <p className="text-xs text-q-text-muted mt-1.5">
                                Ingresa el dominio sin www ni https. Ejemplo: <code className="font-mono text-primary">miagencia.com</code>
                            </p>
                        </div>

                        {/* DNS Preview */}
                        <div className="mb-4 bg-q-surface rounded-lg p-4 border border-q-border">
                            <h5 className="text-xs font-bold text-q-text-muted uppercase tracking-wider mb-3">
                                Registros DNS que necesitarás configurar:
                            </h5>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded text-[10px]">A</span>
                                    <span className="text-q-text-muted">@ →</span>
                                    <code className="font-mono font-bold text-primary">{QUIMERA_DNS_IP}</code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded text-[10px]">CNAME</span>
                                    <span className="text-q-text-muted">www →</span>
                                    <code className="font-mono font-bold text-primary">{newDomainName || 'miagencia.com'}</code>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setAddError(null);
                                    setNewDomainName('');
                                }}
                                className="px-4 py-2 text-sm font-medium text-q-text-muted hover:text-foreground transition-colors"
                                disabled={isAdding}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isAdding || !newDomainName}
                                className="bg-primary text-primary-foreground font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAdding ? (
                                    <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                                ) : (
                                    <><CheckCircle size={14} /> Conectar Dominio</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Empty state */}
            {agencyDomains.length === 0 && !showAddForm && (
                <div className="text-center py-8 rounded-xl border border-dashed border-q-border bg-muted/10">
                    <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Globe size={24} className="text-q-text-muted opacity-50" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Sin dominio personalizado</h4>
                    <p className="text-xs text-q-text-muted max-w-xs mx-auto mb-4">
                        Conecta tu propio dominio para que tu landing page de agencia sea accesible desde una URL profesional.
                    </p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
                    >
                        <Plus size={14} />
                        Conectar Dominio
                    </button>
                </div>
            )}

            {/* Tips */}
            {(agencyDomains.length > 0 || showAddForm) && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">💡 Tips:</p>
                    <ul className="text-xs text-q-text-muted space-y-0.5 list-disc list-inside">
                        <li><strong>GoDaddy:</strong> DNS → Registros DNS. Si ya existe un registro A con @, edítalo.</li>
                        <li><strong>Namecheap:</strong> Advanced DNS → Host Records. Usa @ como Host.</li>
                        <li><strong>Google Domains:</strong> DNS → Registros personalizados.</li>
                    </ul>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmationModal
                isOpen={!!deleteConfirmDomain}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmDomain(null)}
                title="¿Eliminar dominio?"
                message={`El dominio "${deleteConfirmDomain?.name}" será desconectado de tu landing page.`}
                variant="danger"
                isLoading={!!isDeletingId}
            />
        </div>
    );
};

export default AgencyDomainPanel;
