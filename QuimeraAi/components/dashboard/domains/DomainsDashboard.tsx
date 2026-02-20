import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useDomains } from '../../../contexts/domains';
import { useProject } from '../../../contexts/project';
import { useUI } from '../../../contexts/core/UIContext';
import { useSafeTenant } from '../../../contexts/tenant';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { usePlanAccess } from '../../../hooks/usePlanFeatures';
import DashboardSidebar from '../DashboardSidebar';
import DashboardWaveRibbons from '../DashboardWaveRibbons';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { Menu, Search, Plus, Link2, CheckCircle, AlertTriangle, Clock, Copy, Globe, ShoppingCart, ExternalLink, RefreshCw, Loader2, X, Trash2, Settings, ArrowLeft, Crown, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../../ui/Modal';
import { Domain } from '../../../types';

// --- IMPORTS ---
import { useTranslation } from 'react-i18next';
import { CLOUD_RUN_DNS_CONFIG } from '../../../types/domains';

// --- QUIMERA DNS CONFIG (Centralized Load Balancer) ---
// Use the centralized Load Balancer IP (same as yooeat.com)
const QUIMERA_DNS = {
    IP: '130.211.43.242',
    CNAME: 'ghs.googlehosted.com' // Legacy fallback, but UI should show domain name
};

// --- STEP INDICATOR COMPONENT ---
const StepIndicator: React.FC<{
    step: number;
    label: string;
    completed: boolean;
    active: boolean;
}> = ({ step, label, completed, active }) => (
    <div className="flex flex-col items-center">
        <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
            ${completed
                ? 'bg-green-500 text-white'
                : active
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : 'bg-secondary text-muted-foreground'
            }
        `}>
            {completed ? <CheckCircle size={16} /> : step}
        </div>
        <span className={`text-xs mt-1 ${completed ? 'text-green-500' : active ? 'text-primary' : 'text-muted-foreground'}`}>
            {label}
        </span>
    </div>
);

// --- DNS CONFIG COMPONENT ---

// No DNSConfig component needed - we use Cloudflare automatically

// --- DOMAIN CARD COMPONENT ---
const DomainCard: React.FC<{ domain: Domain }> = ({ domain }) => {
    const { t } = useTranslation();
    const { deleteDomain, verifyDomain, updateDomain, deployDomain, getDomainDeploymentLogs, refetch } = useDomains();
    const { projects } = useProject();
    const [isVerifying, setIsVerifying] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deployConfirmOpen, setDeployConfirmOpen] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [deployProvider] = useState<'vercel' | 'cloudflare' | 'netlify' | 'cloud_run'>('cloud_run');
    const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

    // Check if domain has Cloudflare nameservers (simplified flow)
    const hasCloudflareSetup = !!(domain as any).cloudflareNameservers?.length;
    const cloudflareNameservers = (domain as any).cloudflareNameservers || [];
    const isPendingNameservers = domain.status === 'pending_nameservers' || (hasCloudflareSetup && domain.status === 'pending');

    const handleVerify = async () => {
        setIsVerifying(true);
        setVerificationMessage(null);

        try {
            // If domain has Cloudflare setup, use nameserver verification
            if (hasCloudflareSetup) {
                const { verifyExternalDomainNameservers } = await import('../../../services/domainService');
                const result = await verifyExternalDomainNameservers(domain.name);

                if (result.verified) {
                    setVerificationMessage('✅ ' + result.message);
                    await refetch(); // Refresh domain list
                } else {
                    setVerificationMessage('⏳ ' + result.message);
                }
            } else {
                // Legacy verification for domains without Cloudflare
                await verifyDomain(domain.id);
            }
        } catch (error: any) {
            console.error('[DomainCard] Verification error:', error);
            setVerificationMessage('❌ ' + (error.message || 'Error al verificar'));
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDelete = () => {
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            console.log(`🗑️ [DomainCard] === STARTING DELETE ===`);
            console.log(`🗑️ [DomainCard] Domain: ${domain.name} (ID: ${domain.id})`);

            await deleteDomain(domain.id);

            console.log(`✅ [DomainCard] Delete completed`);
        } catch (error: any) {
            console.error('❌ [DomainCard] Delete FAILED:', error);
            alert(`❌ Error:\n\n${error?.message || 'Error desconocido'}\n\nRevisa la consola para más detalles.`);
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
        }
    };

    const handleProjectChange = (projectId: string) => {
        // Find the selected project to get its userId (owner)
        const selectedProject = projects.find(p => p.id === projectId);
        const projectUserId = selectedProject?.userId;

        updateDomain(domain.id, {
            projectId,
            projectUserId: projectUserId || undefined,
        });
    };

    const handleDeploy = () => {
        if (!domain.projectId) {
            alert(t('domainsDashboard.connectProjectFirst'));
            return;
        }
        setDeployConfirmOpen(true);
    };

    const confirmDeploy = async () => {
        setDeployConfirmOpen(false);
        setIsDeploying(true);
        const success = await deployDomain(domain.id, deployProvider);
        setIsDeploying(false);

        if (success) {
            alert(t('domainsDashboard.deploySuccess'));
        } else {
            alert(t('domainsDashboard.deployFailed'));
        }
    };

    const connectedProject = projects.find(p => p.id === domain.projectId);
    const deploymentLogs = getDomainDeploymentLogs(domain.id);
    const isDeploymentInProgress = false; // Desbloqueado forzosamente para permitir cambios

    const handleDomainClick = async () => {
        if (domain.status === 'active' && domain.projectId) {
            try {
                const { httpsCallable } = await import('firebase/functions');
                const { getFunctionsInstance } = await import('../../../firebase');
                const functions = await getFunctionsInstance();

                // Sync domain mapping for Cloud Run SSR
                const syncFn = httpsCallable(functions, 'syncDomainMapping');
                await syncFn({ domain: domain.name, projectId: domain.projectId });

                alert('✅ Dominio sincronizado. Tu sitio debería cargar en unos segundos.');
            } catch (e: any) {
                console.error('Error syncing domain:', e);
                alert('❌ Error: ' + (e.message || 'No se pudo sincronizar el dominio'));
            }
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 ease-out">
            {/* Gradient blob decoration */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 dark:opacity-15 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-40 dark:group-hover:opacity-30 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3
                            className="text-xl font-bold text-foreground flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                            onClick={handleDomainClick}
                            title="Click para refrescar vinculación"
                        >
                            {domain.name}
                            {domain.deployment?.deploymentUrl && (
                                <a href={domain.deployment.deploymentUrl} target="_blank" rel="noreferrer"
                                    className="text-muted-foreground hover:text-primary" title={t('domainsDashboard.viewDeployment')}>
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {domain.status === 'active' && <span className="text-xs font-bold text-green-500 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20"><CheckCircle size={12} className="mr-1" /> {t('domainsDashboard.status.connected')}</span>}
                            {domain.status === 'pending' && <span className="text-xs font-bold text-yellow-500 flex items-center bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20"><Clock size={12} className="mr-1" /> {t('domainsDashboard.status.dnsPending')}</span>}
                            {domain.status === 'verifying' && <span className="text-xs font-bold text-blue-500 flex items-center bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.verifyingDns')}</span>}
                            {domain.status === 'ssl_pending' && <span className="text-xs font-bold text-purple-500 flex items-center bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.generatingSsl')}</span>}
                            {domain.status === 'deploying' && <span className="text-xs font-bold text-blue-500 flex items-center bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.status.deploying')}</span>}
                            {domain.status === 'deployed' && <span className="text-xs font-bold text-green-500 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20"><CheckCircle size={12} className="mr-1" /> {t('domainsDashboard.status.deployed')}</span>}
                            {domain.status === 'error' && (
                                <button
                                    onClick={handleVerify}
                                    className="text-xs font-bold text-red-500 flex items-center bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                >
                                    <AlertTriangle size={12} className="mr-1" /> {t('domainsDashboard.status.error')} - {t('domainsDashboard.retryVerify', 'Reintentar')}
                                </button>
                            )}
                            <span className="text-xs text-muted-foreground">• {domain.provider}</span>
                            {/* SSL Status Badge */}
                            {domain.sslStatus === 'active' && (
                                <span className="text-xs font-bold text-green-500 flex items-center bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                    🔒 SSL
                                </span>
                            )}
                            {domain.sslStatus === 'provisioning' && (
                                <span className="text-xs font-bold text-purple-500 flex items-center bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    <Loader2 size={10} className="mr-1 animate-spin" /> SSL...
                                </span>
                            )}
                        </div>
                        {domain.deployment?.deploymentUrl && (
                            <p className="text-xs text-muted-foreground mt-1">
                                🌐 {domain.deployment.deploymentUrl}
                            </p>
                        )}
                        {domain.deployment?.lastDeployedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('domainsDashboard.lastDeployed')}: {new Date(domain.deployment.lastDeployedAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {domain.status === 'deploying' && (
                            <button
                                onClick={() => updateDomain(domain.id, { status: 'active' })}
                                className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                title={t('common.cancel', 'Cancelar')}
                            >
                                <X size={18} />
                            </button>
                        )}
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || isDeleting}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                            title={t('domainsDashboard.verifyDns')}
                        >
                            <RefreshCw size={18} className={isVerifying ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            disabled={isDeleting}
                            title={t('domainsDashboard.deleteDomain', 'Eliminar dominio')}
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('domainsDashboard.connectedProject')}</label>
                        <select
                            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            value={domain.projectId || ''}
                            onChange={(e) => handleProjectChange(e.target.value)}
                        >
                            <option value="">{t('domainsDashboard.noProject')}</option>
                            {projects.filter(p => p.status !== 'Template').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('domainsDashboard.expiryDate')}</label>
                        <div className="text-sm text-foreground bg-secondary/10 px-3 py-2 rounded-lg border border-border">
                            {domain.expiryDate ? new Date(domain.expiryDate).toLocaleDateString() : t('domainsDashboard.autoRenew')}
                        </div>
                    </div>
                </div>

                {/* Domain Status Section */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-bold text-foreground mb-3 flex items-center">
                        <Globe size={14} className="mr-2 text-primary" />
                        {t('domainsDashboard.domainStatus')}
                    </h4>

                    {/* Status Steps */}
                    <div className="flex items-center gap-2 mb-4">
                        <StepIndicator
                            step={1}
                            label={t('domainsDashboard.stepProject')}
                            completed={!!domain.projectId}
                            active={!domain.projectId}
                        />
                        <div className="flex-1 h-0.5 bg-border" />
                        <StepIndicator
                            step={2}
                            label={t('domainsDashboard.stepDns')}
                            completed={domain.status === 'ssl_pending' || domain.status === 'active' || domain.status === 'deployed'}
                            active={domain.status === 'pending' || domain.status === 'pending_nameservers' || domain.status === 'verifying' || domain.status === 'error'}
                        />
                        <div className="flex-1 h-0.5 bg-border" />
                        <StepIndicator
                            step={3}
                            label={t('domainsDashboard.stepSsl')}
                            completed={domain.sslStatus === 'active'}
                            active={domain.status === 'ssl_pending' || (domain.status === 'active' && domain.sslStatus !== 'active')}
                        />
                        <div className="flex-1 h-0.5 bg-border" />
                        <StepIndicator
                            step={4}
                            label={t('domainsDashboard.stepActive')}
                            completed={domain.status === 'active' || domain.status === 'deployed'}
                            active={false}
                        />
                    </div>

                    {/* Status Messages */}
                    {!domain.projectId && (
                        <p className="text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded">
                            ⚠️ {t('domainsDashboard.selectProjectWarning')}
                        </p>
                    )}
                    {domain.projectId && domain.status === 'pending' && !hasCloudflareSetup && (
                        <p className="text-xs text-blue-600 bg-blue-500/10 p-2 rounded">
                            📋 {t('domainsDashboard.configureDnsWarning')}
                        </p>
                    )}
                    {domain.status === 'ssl_pending' && (
                        <p className="text-xs text-purple-600 bg-purple-500/10 p-2 rounded">
                            🔐 {t('domainsDashboard.sslGenerating')}
                        </p>
                    )}
                    {domain.status === 'active' && (
                        <p className="text-xs text-green-600 bg-green-500/10 p-2 rounded">
                            ✅ {t('domainsDashboard.domainActiveMessage')} <a href={`https://${domain.name}`} target="_blank" rel="noreferrer" className="underline font-bold">{domain.name}</a>
                        </p>
                    )}
                    {domain.status === 'error' && (
                        <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                            ❌ Error: {domain.deployment?.error || t('domainsDashboard.domainErrorMessage')}
                        </p>
                    )}

                </div>

                {/* SSL PROVISIONING NOTIFICATION */}
                {(domain.sslStatus === 'pending' || domain.sslStatus === 'provisioning') && domain.status !== 'pending' && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-5 mb-4">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0 animate-pulse">
                                <Loader2 size={20} className="text-purple-500 animate-spin" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-foreground text-base mb-1">
                                    {t('domainsDashboard.sslProvisioningTitle')}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {t('domainsDashboard.sslProvisioningDesc')}
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-400">
                                    {t('domainsDashboard.sslProvisioningNote')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                            <Loader2 size={14} className="text-purple-500 animate-spin" />
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                {t('domainsDashboard.sslProvisioningStatus')}
                            </span>
                        </div>
                    </div>
                )}



                {/* DNS INSTRUCTIONS - Show when domain is pending */}
                {domain.status === 'pending' && domain.projectId && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-5 mb-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                                <Globe size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground text-base mb-1">
                                    {t('domainsDashboard.configureDnsTitle')}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {t('domainsDashboard.configureDnsDesc')}
                                </p>
                            </div>
                        </div>

                        {/* WARNING: If Cloud Run mapping failed due to permissions, warn user */}
                        {domain.cloudRunMappingStatus === 'error' && (
                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-600">
                                ⚠️ <strong>Atención:</strong> La integración directa con Google no pudo completarse.
                                <div className="mt-1 text-xs opacity-70">
                                    {domain.cloudRunError ? `Motivo: ${domain.cloudRunError}` : 'Probablemente falten permisos de "Administrador de Cloud Run" o verificación de dominio.'}
                                </div>
                                <div className="mt-2 text-foreground font-medium">
                                    Por favor utiliza los <strong>Nameservers</strong> a continuación.
                                </div>
                            </div>
                        )}

                        {/* DNS Records Section */}
                        <div className="bg-card/80 rounded-lg p-4 mb-4 border border-border space-y-3">

                            {/* Option 1: Nameservers (Preferred if available) */}
                            {(domain as any).cloudflareNameservers?.length > 0 && (
                                <div className="bg-secondary/30 rounded-lg p-3 mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded">NAMESERVERS</span>
                                        <span className="text-xs text-muted-foreground">Recomendado (Cloudflare)</span>
                                    </div>
                                    <div className="grid gap-2">
                                        {(domain as any).cloudflareNameservers.map((ns: string, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between bg-background p-2 rounded border border-border">
                                                <code className="font-mono font-bold text-foreground">{ns}</code>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(ns);
                                                        alert('Nameserver copiado');
                                                    }}
                                                    className="p-1 hover:bg-primary/20 rounded text-primary"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Option 2: Records (Only show if mapping didn't fail, or as alternative) */}
                            {domain.cloudRunMappingStatus !== 'error' && (
                                <>
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Opción Alternativa (Registros Directos)</div>
                                    {/* A Record */}
                                    <div className="bg-secondary/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">A</span>
                                            <span className="text-xs text-muted-foreground">{t('domainsDashboard.dnsInstructions.aRecord')}</span>
                                        </div>
                                        <div className="flex items-center justify-between bg-background p-2 rounded border border-border">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">@ (Root)</span>
                                                <code className="font-mono font-bold text-foreground">130.211.43.242</code>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText('130.211.43.242');
                                                    alert(t('domainsDashboard.copied'));
                                                }}
                                                className="p-1 hover:bg-primary/20 rounded text-primary"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* CNAME Record */}
                                    <div className="bg-secondary/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded">CNAME</span>
                                            <span className="text-xs text-muted-foreground">{t('domainsDashboard.subdomain')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-xs text-muted-foreground">{t('domainsDashboard.hostLabel')}:</span>
                                                <code className="block font-mono font-bold text-foreground">www</code>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">{t('domainsDashboard.valueLabel')}:</span>
                                                <div className="flex items-center gap-2">
                                                    <code className="font-mono font-bold text-primary text-xs">{domain.name}</code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(domain.name);
                                                            alert(t('domainsDashboard.cnameCopied'));
                                                        }}
                                                        className="p-1 hover:bg-primary/20 rounded text-primary"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Verification message */}
                        {verificationMessage && (
                            <div className={`p-3 rounded-lg text-sm mb-4 ${verificationMessage.startsWith('✅')
                                ? 'bg-green-500/10 border border-green-500/20 text-green-600'
                                : verificationMessage.startsWith('❌')
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                                    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-600'
                                }`}>
                                {verificationMessage}
                            </div>
                        )}

                        {/* Verify button */}
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying}
                            className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
                        >
                            {isVerifying ? (
                                <><Loader2 size={18} className="animate-spin" /> {t('domainsDashboard.verifying')}</>
                            ) : (
                                <><RefreshCw size={18} /> {t('domainsDashboard.verifyDns')}</>
                            )}
                        </button>

                        <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                            <Clock size={12} />
                            {t('domainsDashboard.propagationNote')}
                        </p>
                    </div>
                )}

                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm font-medium text-primary hover:underline flex items-center"
                    >
                        {showDetails ? t('domainsDashboard.hideDns') : t('domainsDashboard.showDns')}
                    </button>
                    {deploymentLogs.length > 0 && (
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="text-sm font-medium text-primary hover:underline flex items-center"
                        >
                            {showLogs ? t('domainsDashboard.hideLogs') : t('domainsDashboard.showLogs')} ({deploymentLogs.length})
                        </button>
                    )}

                    <div className="flex-1" />

                    {domain.projectId && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDeploy()}
                                disabled={isDeploying}
                                className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                {t('domainsDashboard.deploy')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {
                showDetails && (
                    <div className="border-t border-border p-6 bg-background/50">
                        {/* Simple DNS Instructions */}
                        <div className="bg-secondary/20 rounded-xl p-6 border border-border">
                            <h4 className="font-bold text-foreground mb-4 flex items-center">
                                <Globe size={16} className="mr-2 text-primary" />
                                {t('domainsDashboard.dnsRecordsTitle')}
                            </h4>

                            <div className="space-y-3 mb-4">
                                {/* A Record */}
                                <div className="bg-card rounded-lg p-4 border border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded mr-2">A</span>
                                            <span className="text-sm text-muted-foreground">{t('domainsDashboard.hostLabel')}: <code className="font-mono font-bold">@</code></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono font-bold text-primary">{QUIMERA_DNS.IP}</code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(QUIMERA_DNS.IP);
                                                    alert(t('domainsDashboard.ipCopied'));
                                                }}
                                                className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* CNAME Record */}
                                <div className="bg-card rounded-lg p-4 border border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded mr-2">CNAME</span>
                                            <span className="text-sm text-muted-foreground">{t('domainsDashboard.hostLabel')}: <code className="font-mono font-bold">www</code></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono font-bold text-primary text-xs">{QUIMERA_DNS.CNAME.substring(0, 20)}...</code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(QUIMERA_DNS.CNAME);
                                                    alert(t('domainsDashboard.cnameCopied'));
                                                }}
                                                className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Clock size={14} className="text-blue-500 flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    {t('domainsDashboard.propagationNote')}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showLogs && deploymentLogs.length > 0 && (
                    <div className="border-t border-border p-6 bg-background/50">
                        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center">
                            <Settings size={14} className="mr-2 text-primary" />
                            {t('domainsDashboard.deploymentLogs')}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {deploymentLogs.slice().reverse().map((log) => (
                                <div
                                    key={log.id}
                                    className={`text-xs p-3 rounded-lg border ${log.status === 'success'
                                        ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                                        : log.status === 'failed'
                                            ? 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
                                            : 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold">{log.message}</span>
                                        <span className="text-muted-foreground">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {log.details && (
                                        <div className="text-muted-foreground mt-1">{log.details}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
                title={t('domainsDashboard.deleteConfirmTitle', '¿Eliminar dominio?')}
                message={t('domainsDashboard.deleteConfirmMessage', { name: domain.name, defaultValue: `El dominio "${domain.name}" será eliminado permanentemente.` })}
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Deploy Confirmation Modal */}
            <ConfirmationModal
                isOpen={deployConfirmOpen}
                onConfirm={confirmDeploy}
                onCancel={() => setDeployConfirmOpen(false)}
                title={t('domainsDashboard.deployTitle', 'Desplegar Dominio')}
                message={`${t('domainsDashboard.deployTo')} ${deployProvider === 'cloud_run' ? 'Quimera Cloud (SSR)' : deployProvider}? ${t('domainsDashboard.deployConfirm')}`}
                variant="warning"
            />
        </div >
    );
};

// --- DOMAIN SEARCH & BUY COMPONENT ---
const DomainSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { addDomain, refetch: refetchDomains } = useDomains();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
    const [results, setResults] = useState<{ name: string; price: number | null; available: boolean; premium?: boolean; renewalPrice?: number | null }[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Order tracking state
    const [orderStatus, setOrderStatus] = useState<{
        orderId: string;
        domainName: string;
        status: string;
        step?: string;
        nameservers?: string[];
    } | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    // Check URL params for returning from Stripe checkout
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        const sessionId = urlParams.get('session_id');
        const domainName = urlParams.get('domain');
        const domainSuccess = urlParams.get('domain_success');

        if (domainSuccess === 'true' && domainName) {
            console.log('[Domains] Detecting success redirect for:', domainName);
            // Show success and start polling using orderId (preferred) or sessionId (fallback)
            setOrderStatus({
                orderId: orderId || sessionId || '',
                domainName: decodeURIComponent(domainName),
                status: 'registering',
                step: 'Starting domain registration...'
            });
            setIsPolling(true);

            // Do NOT clear URL params immediately, let the user see the progress
            // We'll clear it when they close the modal or it completes
        }
    }, [t]);

    // Polling for order status
    const pollOrderStatus = useCallback(async (orderId: string) => {
        try {
            const { checkDomainOrderStatus } = await import('../../../services/nameComService');
            const status = await checkDomainOrderStatus(orderId);

            setOrderStatus(prev => prev ? {
                ...prev,
                status: status.status,
                step: getStepMessage(status.status, t),
                nameservers: status.nameservers
            } : null);

            // If completed or failed, stop polling
            if (status.status === 'completed') {
                setIsPolling(false);
                refetchDomains?.();
                return true;
            } else if (status.status === 'failed') {
                setIsPolling(false);
                setError(status.error || t('domainsDashboard.registrationFailed'));
                return true;
            }

            return false;
        } catch (e) {
            console.error('Poll status error:', e);
            return false;
        }
    }, [t, refetchDomains]);

    // Polling effect
    useEffect(() => {
        if (!isPolling || !orderStatus?.orderId) return;

        const interval = setInterval(async () => {
            const done = await pollOrderStatus(orderStatus.orderId);
            if (done) {
                clearInterval(interval);
            }
        }, 3000); // Poll every 3 seconds

        // Initial poll
        pollOrderStatus(orderStatus.orderId);

        return () => clearInterval(interval);
    }, [isPolling, orderStatus?.orderId, pollOrderStatus]);

    // Helper function for step messages
    function getStepMessage(status: string, t: any): string {
        switch (status) {
            case 'pending_payment': return t('domainsDashboard.stepPayment');
            case 'registering': return t('domainsDashboard.stepRegistering');
            case 'configuring_dns': return t('domainsDashboard.stepDns');
            case 'updating_nameservers': return t('domainsDashboard.stepNameservers');
            case 'completed': return t('domainsDashboard.stepCompleted');
            case 'failed': return t('domainsDashboard.stepFailed');
            default: return t('domainsDashboard.stepProcessing');
        }
    }

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setError(null);
        setResults([]);

        try {
            // Use Name.com API via Cloud Functions
            const { searchDomains } = await import('../../../services/nameComService');
            const searchResults = await searchDomains(query.trim());

            // Priority TLDs for sorting (show these first)
            const priorityTlds = ['.com', '.net', '.org', '.io', '.co'];

            const getTldPriority = (domain: string) => {
                const tld = '.' + domain.split('.').slice(1).join('.');
                const idx = priorityTlds.indexOf(tld);
                return idx === -1 ? 100 : idx;
            };

            // Combine available and unavailable results
            const allResults = [
                ...searchResults.available.map(d => ({
                    name: d.name,
                    price: d.price,
                    available: true,
                    premium: d.premium,
                    renewalPrice: d.renewalPrice
                })),
                ...searchResults.unavailable.map(d => ({
                    name: d.name,
                    price: null,
                    available: false,
                    premium: false,
                    renewalPrice: null
                }))
            ];

            // Sort: priority TLDs first, then available/unavailable, then by price
            allResults.sort((a, b) => {
                // First sort by TLD priority (show .com, .net, .org first)
                const priorityA = getTldPriority(a.name);
                const priorityB = getTldPriority(b.name);
                if (priorityA !== priorityB) return priorityA - priorityB;

                // Then by availability
                if (a.available !== b.available) return a.available ? -1 : 1;

                // Then by price
                return (a.price || 999) - (b.price || 999);
            });

            setResults(allResults);

        } catch (e: any) {
            console.error("Domain search failed:", e);
            setError(e.message || t('domainsDashboard.searchError'));
        } finally {
            setIsSearching(false);
        }
    };

    const handleBuy = async (domainName: string, price: number) => {
        if (!user) {
            alert(t('domainsDashboard.loginRequired'));
            return;
        }

        setIsPurchasing(domainName);
        setError(null);

        try {
            // Use Stripe checkout for secure payment
            const { createDomainCheckout } = await import('../../../services/nameComService');
            const result = await createDomainCheckout(domainName, price, 1);

            // Redirect to Stripe Checkout
            if (result.url) {
                window.location.href = result.url;
            } else {
                setError(t('domainsDashboard.checkoutError'));
            }

        } catch (e: any) {
            console.error("Domain checkout failed:", e);
            setError(e.message || t('domainsDashboard.checkoutError'));
        } finally {
            setIsPurchasing(null);
        }
    };

    return (
        <div className="p-6">
            {/* Order Progress Modal */}
            {orderStatus && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="text-center mb-6">
                            {orderStatus.status === 'completed' ? (
                                <>
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.registrationComplete')}</h3>
                                    <p className="text-muted-foreground">{t('domainsDashboard.domainReadyToUse')}</p>
                                </>
                            ) : orderStatus.status === 'failed' ? (
                                <>
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <X size={32} className="text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.stepFailed')}</h3>
                                    <p className="text-red-500">{error}</p>
                                </>
                            ) : (
                                <>
                                    <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.domainBeingRegistered')}</h3>
                                    <p className="text-muted-foreground">{t('domainsDashboard.pleaseWait')}</p>
                                </>
                            )}
                        </div>

                        <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">{t('domainsDashboard.domain')}</span>
                                <span className="font-bold text-foreground">{orderStatus.domainName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t('domainsDashboard.domainStatus')}</span>
                                <span className={`text-sm font-medium ${orderStatus.status === 'completed' ? 'text-green-500' :
                                    orderStatus.status === 'failed' ? 'text-red-500' : 'text-primary'
                                    }`}>
                                    {orderStatus.step}
                                </span>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        {orderStatus.status !== 'failed' && (
                            <div className="flex justify-between mb-6 px-2">
                                <StepIndicator
                                    step={1}
                                    label={t('domainsDashboard.stepProject').split(' ')[0]}
                                    completed={['registering', 'configuring_dns', 'updating_nameservers', 'completed'].includes(orderStatus.status)}
                                    active={orderStatus.status === 'pending_payment'}
                                />
                                <div className="flex-1 h-0.5 bg-border self-center mx-1 mt-[-12px]" />
                                <StepIndicator
                                    step={2}
                                    label="DNS"
                                    completed={['configuring_dns', 'updating_nameservers', 'completed'].includes(orderStatus.status)}
                                    active={orderStatus.status === 'registering'}
                                />
                                <div className="flex-1 h-0.5 bg-border self-center mx-1 mt-[-12px]" />
                                <StepIndicator
                                    step={3}
                                    label="SSL"
                                    completed={['updating_nameservers', 'completed'].includes(orderStatus.status)}
                                    active={orderStatus.status === 'configuring_dns'}
                                />
                                <div className="flex-1 h-0.5 bg-border self-center mx-1 mt-[-12px]" />
                                <StepIndicator
                                    step={4}
                                    label={t('domainsDashboard.active')}
                                    completed={orderStatus.status === 'completed'}
                                    active={orderStatus.status === 'updating_nameservers'}
                                />
                            </div>
                        )}

                        {/* Nameservers info (if completed) */}
                        {orderStatus.status === 'completed' && orderStatus.nameservers && orderStatus.nameservers.length > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                                <p className="text-sm font-medium text-blue-500 mb-2">{t('domainsDashboard.nameserversInfo')}</p>
                                <div className="space-y-1">
                                    {orderStatus.nameservers.map((ns, i) => (
                                        <code key={i} className="block text-xs bg-secondary px-2 py-1 rounded font-mono">{ns}</code>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setOrderStatus(null);
                                if (orderStatus.status === 'completed') {
                                    onClose();
                                }
                            }}
                            disabled={isPolling && orderStatus.status !== 'failed'}
                            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {orderStatus.status === 'completed'
                                ? t('domainsDashboard.viewDomain')
                                : orderStatus.status === 'failed'
                                    ? t('common.close')
                                    : t('domainsDashboard.pleaseWait').replace('...', '')
                            }
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-foreground">{t('domainsDashboard.findDomain')}</h2>
                    <p className="text-sm text-muted-foreground">{t('domainsDashboard.searchDesc')}</p>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 bg-editor-border/40 rounded-lg px-3 py-3">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                        placeholder={t('domainsDashboard.searchPlaceholder')}
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching || !query}
                    className="bg-primary text-primary-foreground font-bold px-6 rounded-lg hover:opacity-90 transition-all flex items-center disabled:opacity-50"
                >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : t('common.search')}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                    ❌ {error}
                </div>
            )}

            {/* Results */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                {/* Available Domains Section */}
                {results.filter(r => r.available).length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-green-500 mb-2 flex items-center">
                            <CheckCircle size={14} className="mr-1" /> {t('domainsDashboard.available')} ({results.filter(r => r.available).length})
                        </h3>
                        <div className="space-y-2">
                            {results.filter(r => r.available).map((res, idx) => (
                                <div
                                    key={`available-${idx}`}
                                    className="flex justify-between items-center p-3 bg-card border border-green-500/20 rounded-lg transition-colors hover:border-green-500/40"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-foreground">{res.name}</p>
                                            {res.premium && (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full font-medium">
                                                    Premium
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-green-500 font-medium flex items-center">
                                            <CheckCircle size={10} className="mr-1" /> {t('domainsDashboard.available')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {res.price !== null && (
                                            <div className="text-right">
                                                <span className="font-bold">${res.price.toFixed(2)}</span>
                                                <span className="text-xs text-muted-foreground">{t('domainsDashboard.perYear')}</span>
                                                {res.renewalPrice && res.renewalPrice !== res.price && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('domainsDashboard.renewalPrice', { price: res.renewalPrice.toFixed(2) })}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => res.price && handleBuy(res.name, res.price)}
                                            disabled={isPurchasing !== null}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 min-w-[90px]"
                                        >
                                            {isPurchasing === res.name ? (
                                                <Loader2 size={16} className="animate-spin mx-auto" />
                                            ) : (
                                                t('domainsDashboard.buy')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Unavailable Domains Section */}
                {results.filter(r => !r.available).length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center">
                            <X size={14} className="mr-1" /> {t('domainsDashboard.taken')} ({results.filter(r => !r.available).length})
                        </h3>
                        <div className="space-y-2">
                            {results.filter(r => !r.available).map((res, idx) => (
                                <div
                                    key={`unavailable-${idx}`}
                                    className="flex justify-between items-center p-3 bg-card/50 border border-red-500/20 rounded-lg opacity-70"
                                >
                                    <div>
                                        <p className="font-medium text-foreground line-through">{res.name}</p>
                                        <span className="text-xs text-red-500 font-medium flex items-center">
                                            <X size={10} className="mr-1" /> {t('domainsDashboard.taken')}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground px-3 py-1 bg-secondary/50 rounded">
                                        {t('domainsDashboard.notAvailable')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {results.length === 0 && !isSearching && !error && (
                    <div className="text-center py-10 text-muted-foreground">
                        <Globe size={40} className="mx-auto mb-3 opacity-30" />
                        <p>{t('domainsDashboard.enterKeyword')}</p>
                        <p className="text-xs mt-2">{t('domainsDashboard.searchHint')}</p>
                    </div>
                )}
                {isSearching && (
                    <div className="text-center py-10">
                        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
                        <p className="text-muted-foreground">{t('domainsDashboard.searchingDomains')}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground flex items-center justify-center">
                <Globe size={12} className="mr-1" /> {t('domainsDashboard.poweredByNameCom')}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
const DomainsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { domains, addDomain, refetch } = useDomains();
    const { projects } = useProject();
    const { setView } = useUI();
    const tenantContext = useSafeTenant();
    const upgradeContext = useSafeUpgrade();

    // Use the plan access hook that properly handles owner/superadmin bypass
    const { hasAccess } = usePlanAccess();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectDomainName, setConnectDomainName] = useState('');
    const [connectProjectId, setConnectProjectId] = useState('');

    // Cloudflare setup states
    const [isSettingUpCloudflare, setIsSettingUpCloudflare] = useState(false);
    const [cloudflareNameservers, setCloudflareNameservers] = useState<string[]>([]);
    const [cloudflareError, setCloudflareError] = useState<string | null>(null);
    const [showNameserversModal, setShowNameserversModal] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);

    // Auto-open modal when returning from Stripe checkout
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const domainSuccess = urlParams.get('domain_success');
        const domainCancel = urlParams.get('domain_cancel');

        if (domainSuccess === 'true' || domainCancel === 'true') {
            // Open the buy modal to show progress/result
            setIsBuyModalOpen(true);
        }
    }, []);

    // Check if custom domains are allowed - usePlanAccess handles owner/superadmin bypass automatically
    const customDomainsAllowed = hasAccess('customDomains');

    // Handler to show upgrade modal for domains feature
    const handleDomainUpgrade = () => {
        if (upgradeContext) {
            upgradeContext.openUpgradeModal('domains');
        }
    };

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectDomainName) return;

        // Check if custom domains are allowed
        if (!customDomainsAllowed) {
            handleDomainUpgrade();
            return;
        }

        // Require project selection
        if (!connectProjectId) {
            alert(t('domainsDashboard.selectProjectRequired', 'Por favor selecciona un proyecto para conectar con este dominio'));
            return;
        }

        setIsSettingUpCloudflare(true);
        setCloudflareError(null);

        try {
            // Simple: Just save the domain and let user configure DNS manually
            // No need for Cloudflare setup - user will add A record pointing to our Load Balancer IP
            const normalizedDomain = connectDomainName.toLowerCase().trim().replace(/^www\./, '');

            // Find the selected project to get its userId (owner)
            const selectedProject = projects.find(p => p.id === connectProjectId);
            const projectUserId = selectedProject?.userId; // Owner of the project

            await addDomain({
                id: `dom_${Date.now()}`,
                name: normalizedDomain,
                status: 'pending',
                provider: 'External',
                projectId: connectProjectId,
                projectUserId: projectUserId, // Store project owner for cross-user deployment
                createdAt: new Date().toISOString(),
                // Store DNS config for reference
                dnsConfig: {
                    aRecord: QUIMERA_DNS.IP,
                    cnameRecord: normalizedDomain
                }
            });

            setIsConnectModalOpen(false);
            alert(`✅ Dominio "${normalizedDomain}" agregado.\n\nAhora configura los registros DNS en tu proveedor:\n\n• Registro A: @ → ${QUIMERA_DNS.IP}\n• Registro CNAME: www → ${normalizedDomain}\n\nLuego haz clic en "Verificar" para activarlo.`);
            await refetch();

        } catch (error: any) {
            console.error('[DomainsDashboard] Error adding domain:', error);
            setCloudflareError(error.message || 'Error al guardar el dominio');
        } finally {
            setIsSettingUpCloudflare(false);
            setConnectDomainName('');
            setConnectProjectId('');
        }
    };

    // Handler for buy/search domain buttons
    const handleBuyDomain = () => {
        if (!customDomainsAllowed) {
            handleDomainUpgrade();
            return;
        }
        setIsBuyModalOpen(true);
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Link2 className="text-primary w-5 h-5" />
                            <h1 className="text-sm sm:text-lg font-semibold text-foreground">{t('domainsDashboard.title')}</h1>
                        </div>
                    </div>

                    <div className="flex gap-1 sm:gap-2">
                        <button
                            onClick={() => customDomainsAllowed ? setIsConnectModalOpen(true) : handleDomainUpgrade()}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-lg text-sm font-medium transition-all sm:bg-secondary/50 sm:border sm:border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary hidden sm:flex"
                        >
                            {!customDomainsAllowed && <Crown className="w-4 h-4 text-yellow-500" />}
                            <Link2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('domainsDashboard.connect')}</span>
                        </button>
                        <button
                            onClick={handleBuyDomain}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-lg text-sm font-medium transition-all sm:bg-secondary/50 sm:border sm:border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            {!customDomainsAllowed && <Crown className="w-4 h-4 text-yellow-500" />}
                            <ShoppingCart className="w-4 h-4" /> <span className="hidden sm:inline">{t('domainsDashboard.buyDomain')}</span>
                        </button>
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:border sm:border-border/40 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                            aria-label={t('common.back', 'Volver')}
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth bg-secondary/5 relative z-10">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Collapsible Instructions */}
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
                            >
                                <h4 className="font-semibold text-primary flex items-center gap-2 text-base">
                                    📋 {t('domainsDashboard.guideTitle', 'Guía: Gestiona tus dominios personalizados')}
                                </h4>
                                {showInstructions ? <ChevronUp className="text-primary" size={20} /> : <ChevronDown className="text-primary" size={20} />}
                            </button>

                            {showInstructions && (
                                <div className="px-5 pb-5 text-sm space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">1</span>
                                            <div>
                                                <strong className="text-foreground block mb-1">{t('domainsDashboard.guide.step1Title', 'Opciones Disponibles')}</strong>
                                                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                                                    <li><strong>{t('domainsDashboard.guide.buyDomain', 'Comprar Dominio')}:</strong> {t('domainsDashboard.guide.buyDomainDesc', 'Busca y registra un nuevo dominio directamente desde aquí.')}</li>
                                                    <li><strong>{t('domainsDashboard.guide.connectDomain', 'Conectar Existente')}:</strong> {t('domainsDashboard.guide.connectDomainDesc', 'Vincula un dominio que ya posees configurando los registros DNS.')}</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">2</span>
                                            <div>
                                                <strong className="text-foreground block mb-1">{t('domainsDashboard.guide.step2Title', 'Configuración DNS')}</strong>
                                                <p className="text-muted-foreground mb-2">
                                                    {t('domainsDashboard.guide.step2Desc', 'Para dominios externos, necesitarás configurar los registros DNS en tu proveedor:')}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded">
                                                    <div>
                                                        <span className="font-semibold text-primary block">{t('domainsDashboard.guide.aRecord', 'Registro A')}:</span>
                                                        @ → 130.211.43.242
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-primary block">{t('domainsDashboard.guide.cnameRecord', 'Registro CNAME')}:</span>
                                                        www → tudominio.com
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                                            <div>
                                                <strong className="text-foreground block mb-1">{t('domainsDashboard.guide.step3Title', 'Verificación y SSL')}</strong>
                                                <p className="text-muted-foreground">
                                                    {t('domainsDashboard.guide.step3Desc', 'Una vez configurados los DNS, haz clic en "Verificar" para activar tu dominio. El certificado SSL se generará automáticamente.')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-primary/20">
                                        <p className="text-xs text-muted-foreground flex gap-2">
                                            <span className="shrink-0">💡</span>
                                            <span>
                                                <strong>{t('domainsDashboard.guide.tip', 'Consejo Pro')}:</strong> {t('domainsDashboard.guide.tipDesc', 'La propagación DNS puede tardar entre 5 minutos y 48 horas. Si la verificación falla, espera un poco y vuelve a intentarlo.')}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {domains.length === 0 ? (
                            <div className="group relative overflow-hidden text-center py-20 rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-card/60 dark:bg-card/40 backdrop-blur-xl border-dashed shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 dark:opacity-15 blur-2xl bg-gradient-to-br from-primary to-primary/60" aria-hidden="true" />
                                <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Globe size={40} className="text-muted-foreground opacity-50" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">{t('domainsDashboard.noDomains')}</h2>
                                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                    {t('domainsDashboard.noDomainsDesc')}
                                </p>
                                <div className="flex justify-center gap-4">
                                    {!customDomainsAllowed ? (
                                        <button
                                            onClick={handleDomainUpgrade}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Crown className="w-5 h-5" /> {t('domainsDashboard.upgradeForDomains')}
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsConnectModalOpen(true)} className="px-6 py-3 rounded-xl border border-border bg-background hover:bg-secondary transition-colors font-bold">{t('domainsDashboard.connectExisting')}</button>
                                    )}
                                    {customDomainsAllowed && (
                                        <button onClick={handleBuyDomain} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-bold">{t('domainsDashboard.findDomain')}</button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {domains.map(domain => (
                                    <DomainCard key={domain.id} domain={domain} />
                                ))}
                            </div>
                        )}

                    </div>
                </main>

                {/* Buy Modal */}
                <Modal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} maxWidth="max-w-2xl">
                    <DomainSearch onClose={() => setIsBuyModalOpen(false)} />
                </Modal>

                {/* Connect Modal - Simple DNS Instructions */}
                <Modal isOpen={isConnectModalOpen} onClose={() => !isSettingUpCloudflare && setIsConnectModalOpen(false)} maxWidth="max-w-lg">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-foreground">{t('domainsDashboard.connectExistingTitle')}</h2>
                            <button
                                onClick={() => setIsConnectModalOpen(false)}
                                className="p-1 rounded-full hover:bg-secondary text-muted-foreground disabled:opacity-50"
                                disabled={isSettingUpCloudflare}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Error message */}
                        {cloudflareError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                ❌ {cloudflareError}
                            </div>
                        )}

                        <form onSubmit={handleConnectSubmit}>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('domainsDashboard.domainName')}</label>
                                <input
                                    required
                                    autoFocus
                                    disabled={isSettingUpCloudflare}
                                    value={connectDomainName}
                                    onChange={(e) => setConnectDomainName(e.target.value)}
                                    placeholder="tudominio.com"
                                    className="w-full bg-secondary/30 border border-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium disabled:opacity-50"
                                />
                            </div>

                            {/* Project Selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('domainsDashboard.connectToProject', 'Conectar a Proyecto')} *
                                </label>
                                <select
                                    required
                                    disabled={isSettingUpCloudflare}
                                    value={connectProjectId}
                                    onChange={(e) => setConnectProjectId(e.target.value)}
                                    className="w-full bg-secondary/30 border border-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium disabled:opacity-50"
                                >
                                    <option value="">{t('domainsDashboard.selectProject', 'Selecciona un proyecto...')}</option>
                                    {projects.filter(p => p.status !== 'Template').map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* DNS Instructions - Like Shopify */}
                            <div className="mb-6 bg-secondary/30 rounded-xl p-4 border border-border">
                                <h4 className="text-sm font-bold text-foreground mb-4 flex items-center">
                                    <Globe size={16} className="mr-2 text-primary" />
                                    {t('domainsDashboard.dnsInstructions', 'Configura estos registros DNS')}:
                                </h4>

                                {/* DNS Records Table */}
                                <div className="space-y-3">
                                    {/* A Record */}
                                    <div className="bg-card rounded-lg p-3 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">A</span>
                                            <span className="text-xs text-muted-foreground">{t('domainsDashboard.forRootDomain', 'Para el dominio raíz')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-xs text-muted-foreground">Host:</span>
                                                <code className="block font-mono font-bold">@</code>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">Valor:</span>
                                                <div className="flex items-center gap-1">
                                                    <code className="font-mono font-bold text-primary">{QUIMERA_DNS.IP}</code>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(QUIMERA_DNS.IP);
                                                            alert('¡IP copiada!');
                                                        }}
                                                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-primary"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CNAME Record */}
                                    <div className="bg-card rounded-lg p-3 border border-border">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded">CNAME</span>
                                            <span className="text-xs text-muted-foreground">{t('domainsDashboard.forWww', 'Para www')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-xs text-muted-foreground">Host:</span>
                                                <code className="block font-mono font-bold">www</code>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground">Valor:</span>
                                                <div className="flex items-center gap-1">
                                                    <code className="font-mono font-bold text-primary text-xs break-all">{connectDomainName || 'tudominio.com'}</code>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(QUIMERA_DNS.CNAME);
                                                            alert('¡CNAME copiado!');
                                                        }}
                                                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-primary flex-shrink-0"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick steps */}
                                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                                    <p className="font-bold mb-2">📋 Pasos rápidos:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Ve a tu proveedor de dominio (Name.com, GoDaddy, etc.)</li>
                                        <li>Busca "DNS" o "Manage DNS Records"</li>
                                        <li>Agrega los 2 registros de arriba</li>
                                        <li>Espera 5-15 minutos y haz clic en "Verificar"</li>
                                    </ol>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsConnectModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    disabled={isSettingUpCloudflare}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSettingUpCloudflare || !connectDomainName || !connectProjectId}
                                    className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSettingUpCloudflare ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {t('domainsDashboard.configuringDomain', 'Guardando...')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            {t('domainsDashboard.saveDomain', 'Guardar Dominio')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>

            </div >
        </div >
    );
};

export default DomainsDashboard;
