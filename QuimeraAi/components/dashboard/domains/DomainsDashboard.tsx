import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useDomains } from '../../../contexts/domains';
import { useProject } from '../../../contexts/project';
import { useUI } from '../../../contexts/core/UIContext';
import { useSafeTenant } from '../../../contexts/tenant';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { usePlanAccess } from '../../../hooks/usePlanFeatures';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import DashboardSidebar from '../DashboardSidebar';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { Menu, Search, Plus, Link2, CheckCircle, AlertTriangle, Clock, Copy, Globe, ShoppingCart, ExternalLink, RefreshCw, Loader2, X, Trash2, Settings, Crown, Zap, ChevronDown, ChevronUp, Building2, Lock, ClipboardList, ShieldCheck, XCircle, User, Server, Sparkles, Timer } from 'lucide-react';
import Modal from '../../ui/Modal';
import HeaderBackButton from '../../ui/HeaderBackButton';
import { Domain } from '../../../types';

// --- IMPORTS ---
import { useTranslation } from 'react-i18next';
import { DNSRecord } from '../../../types/domains';
import AppSelect from '../../ui/AppSelect';

const getDomainDnsRecords = (domain: Domain): DNSRecord[] => {
    const dataRecords = (domain as any).data?.dnsRecords;
    if (Array.isArray(dataRecords) && dataRecords.length > 0) return dataRecords;
    if (Array.isArray(domain.dnsRecords) && domain.dnsRecords.length > 0) return domain.dnsRecords;
    return [];
};

// --- STEP INDICATOR COMPONENT ---
const GuideStepBadge: React.FC<{ step: number }> = ({ step }) => (
    <span className="quimera-guide-step-badge mt-0.5">{step}</span>
);

const GuideIconChip: React.FC<{ icon: React.ElementType; size?: number }> = ({ icon: Icon, size = 20 }) => (
    <Icon size={size} className="quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
);

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
                ? 'bg-q-success text-white'
                : active
                    ? 'bg-primary text-primary-foreground animate-pulse'
                    : 'bg-secondary text-q-text-muted'
            }
        `}>
            {completed ? <CheckCircle size={16} /> : step}
        </div>
        <span className={`text-xs mt-1 ${completed ? 'text-q-success' : active ? 'text-primary' : 'text-q-text-muted'}`}>
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
    const [isExpanded, setIsExpanded] = useState(false);
    const [deployProvider] = useState<'vercel' | 'cloudflare' | 'netlify' | 'cloud_run'>('vercel');
    const [verificationMessage, setVerificationMessage] = useState<{ text: string; status: 'success' | 'error' | 'pending' } | null>(null);
    const shouldShowDnsInstructions = !!domain.projectId && (domain.status === 'pending' || domain.status === 'error');

    // Check if domain has Cloudflare nameservers (simplified flow)
    const hasCloudflareSetup = !!(domain as any).cloudflareNameservers?.length;
    const cloudflareNameservers = (domain as any).cloudflareNameservers || [];
    const isPendingNameservers = domain.status === 'pending_nameservers' || (hasCloudflareSetup && domain.status === 'pending');

    const handleVerify = async () => {
        setIsVerifying(true);
        setVerificationMessage(null);

        try {
            const success = await verifyDomain(domain.id);
            if (success) {
                setVerificationMessage({ text: t('domainsDashboard.domainSyncSuccess'), status: 'success' });
            } else {
                setVerificationMessage({ text: t('domainsDashboard.domainSyncErrorGeneric'), status: 'pending' });
            }
        } catch (e: any) {
            console.error('Error verifying domain:', e);
            setVerificationMessage({ text: e.message || 'Error', status: 'error' });
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
            console.log(`[DomainCard] === STARTING DELETE ===`);
            console.log(`[DomainCard] Domain: ${domain.name} (ID: ${domain.id})`);

            await deleteDomain(domain.id);

            console.log(`[DomainCard] Delete completed`);
        } catch (error: any) {
            console.error('[DomainCard] Delete FAILED:', error);
            alert(`Error:\n\n${error?.message || t('domainsDashboard.errorUnknown')}\n\nRevisa la consola para más detalles.`);
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
    const isAgencyLandingDomain = !!(domain as any).agencyLandingTenantId;
    const deploymentLogs = getDomainDeploymentLogs(domain.id);
    const isDeploymentInProgress = false; // Desbloqueado forzosamente para permitir cambios

    const handleSyncMapping = async () => {
        if (domain.projectId) {
            try {
                const { supabase } = await import('../../../supabase');
                const result = await supabase.functions.invoke('onboarding-api', {
                    body: {
                        action: 'sync-domain-mapping',
                        domain: domain.name,
                        projectId: domain.projectId
                    }
                });

                if (result.error) throw result.error;

                alert(t('domainsDashboard.domainSyncSuccess'));
                await refetch();
            } catch (e: any) {
                console.error('Error syncing domain:', e);
                alert(t('domainsDashboard.domainSyncError', { message: e.message || t('domainsDashboard.domainSyncErrorGeneric') }));
            }
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-q-border/60 bg-q-surface/80 dark:bg-q-surface/40 backdrop-blur-xl transition-all duration-300 ease-out hover:border-q-border">
            {/* Gradient blob decoration */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 dark:opacity-15 blur-2xl bg-gradient-to-br from-primary to-primary/60 group-hover:opacity-40 dark:group-hover:opacity-30 group-hover:scale-110 transition-all duration-500 pointer-events-none" aria-hidden="true" />
            <div className="p-6">
                {/* Accordion Header - Always visible */}
                <div
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2 transition-colors">
                            {domain.name}
                            {domain.deployment?.deploymentUrl && (
                                <a href={domain.deployment.deploymentUrl} target="_blank" rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-q-text-muted hover:text-primary" title={t('domainsDashboard.viewDeployment')}>
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {domain.status === 'active' && <span className="text-xs font-bold text-q-success flex items-center bg-q-success/10 px-2 py-0.5 rounded-full border border-q-success/20"><CheckCircle size={12} className="mr-1" /> {t('domainsDashboard.status.connected')}</span>}
                            {domain.status === 'pending' && <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20"><Clock size={12} className="mr-1" /> {t('domainsDashboard.status.dnsPending')}</span>}
                            {domain.status === 'verifying' && <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.verifyingDns')}</span>}
                            {domain.status === 'ssl_pending' && <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.generatingSsl')}</span>}
                            {domain.status === 'deploying' && <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20"><Loader2 size={12} className="mr-1 animate-spin" /> {t('domainsDashboard.status.deploying')}</span>}
                            {domain.status === 'deployed' && <span className="text-xs font-bold text-q-success flex items-center bg-q-success/10 px-2 py-0.5 rounded-full border border-q-success/20"><CheckCircle size={12} className="mr-1" /> {t('domainsDashboard.status.deployed')}</span>}
                            {domain.status === 'error' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleVerify(); }}
                                    className="text-xs font-bold text-q-error flex items-center bg-q-error/10 px-2 py-0.5 rounded-full border border-q-error/20 hover:bg-q-error/20 transition-colors"
                                >
                                    <AlertTriangle size={12} className="mr-1" /> {t('domainsDashboard.status.error')} - {t('domainsDashboard.retryVerify', 'Reintentar')}
                                </button>
                            )}
                            <span className="text-xs text-q-text-muted">• {domain.provider}</span>
                            {isAgencyLandingDomain && (
                                <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20">
                                    <Building2 size={12} className="mr-1" /> Agency Landing
                                </span>
                            )}
                            {domain.sslStatus === 'active' && (
                                <span className="text-xs font-bold text-q-success flex items-center bg-q-success/10 px-2 py-0.5 rounded-full border border-q-success/20">
                                    <Lock size={12} className="mr-1" /> SSL
                                </span>
                            )}
                            {domain.sslStatus === 'provisioning' && (
                                <span className="text-xs font-bold text-q-accent flex items-center bg-q-accent/10 px-2 py-0.5 rounded-full border border-q-accent/20">
                                    <Loader2 size={10} className="mr-1 animate-spin" /> SSL...
                                </span>
                            )}
                        </div>
                        {!isExpanded && domain.deployment?.deploymentUrl && (
                            <p className="text-xs text-q-text-muted mt-1 flex items-center gap-1">
                                <Globe size={12} /> {domain.deployment.deploymentUrl}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleVerify(); }}
                            disabled={isVerifying || isDeleting}
                            className="p-2 text-q-text-muted hover:text-primary hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                            title={t('domainsDashboard.verifyDns')}
                        >
                            <RefreshCw size={18} className={isVerifying ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                            className="p-2 text-q-text-muted hover:text-q-error hover:bg-q-error/10 rounded-lg transition-colors disabled:opacity-50"
                            disabled={isDeleting}
                            title={t('domainsDashboard.deleteDomain', 'Eliminar dominio')}
                        >
                            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                        <div className="p-2 text-q-text-muted">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </div>
                </div>

                {/* Accordion Body - Collapsible */}
                {isExpanded && (
                <div className="mt-6 pt-6 border-t border-q-border/50 animate-in fade-in slide-in-from-top-2 duration-200">

                <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-q-text-muted uppercase tracking-wider mb-2">{t('domainsDashboard.connectedProject')}</label>
                        <AppSelect
                            className="w-full bg-secondary/30 border border-q-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            value={domain.projectId || ''}
                            onChange={(e) => handleProjectChange(e.target.value)}
                        >
                            <option value="">{t('domainsDashboard.noProject')}</option>
                            {projects.filter(p => p.status !== 'Template').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </AppSelect>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-q-text-muted uppercase tracking-wider mb-2">{t('domainsDashboard.expiryDate')}</label>
                        <div className="text-sm text-foreground bg-secondary/10 px-3 py-2 rounded-lg border border-q-border">
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
                            completed={!!domain.dnsVerified || domain.status === 'ssl_pending' || domain.status === 'active' || domain.status === 'deployed'}
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
                        <p className="text-xs text-q-accent bg-q-accent/10 p-2 rounded flex items-center gap-1.5">
                            <AlertTriangle size={14} className="shrink-0" /> {t('domainsDashboard.selectProjectWarning')}
                        </p>
                    )}
                    {domain.projectId && domain.status === 'pending' && !hasCloudflareSetup && (
                        <p className="text-xs text-q-accent bg-q-accent/10 p-2 rounded flex items-center gap-1.5">
                            <ClipboardList size={14} className="shrink-0" /> {t('domainsDashboard.configureDnsWarning')}
                        </p>
                    )}
                    {domain.status === 'ssl_pending' && (
                        <p className="text-xs text-q-accent bg-q-accent/10 p-2 rounded flex items-center gap-1.5">
                            <ShieldCheck size={14} className="shrink-0" /> {t('domainsDashboard.sslGenerating')}
                        </p>
                    )}
                    {domain.status === 'active' && (
                        <p className="text-xs text-q-success bg-q-success/10 p-2 rounded flex items-center gap-1.5">
                            <CheckCircle size={14} className="shrink-0" /> {t('domainsDashboard.domainActiveMessage')} <a href={`https://${domain.name}`} target="_blank" rel="noreferrer" className="underline font-bold">{domain.name}</a>
                        </p>
                    )}
                    {domain.status === 'error' && (
                        <div className="bg-q-error/10 border border-q-error/20 rounded-lg p-3">
                            <p className="text-xs text-q-error font-bold flex items-center gap-1.5 mb-2">
                                <XCircle size={14} className="shrink-0" />
                                Falta configurar el DNS del dominio.
                            </p>
                            <p className="text-xs text-q-text-muted mb-2">
                                Ve al proveedor donde compraste el dominio, abre la zona DNS y cambia estos registros. Luego vuelve aquí y pulsa Reintentar.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-2 text-xs">
                                <div className="rounded-md bg-q-bg/80 border border-q-border p-2">
                                    <span className="block text-q-text-muted font-bold uppercase text-[10px] mb-1">Apex / dominio raíz</span>
                                    <code className="font-mono text-foreground">A @ -&gt; 76.76.21.21</code>
                                </div>
                                <div className="rounded-md bg-q-bg/80 border border-q-border p-2">
                                    <span className="block text-q-text-muted font-bold uppercase text-[10px] mb-1">WWW</span>
                                    <code className="font-mono text-foreground">CNAME www -&gt; cname.vercel-dns.com</code>
                                </div>
                            </div>
                            {(domain as any).error || domain.deployment?.error ? (
                                <p className="text-[11px] text-q-error/80 mt-2">
                                    Detalle: {(domain as any).error || domain.deployment?.error}
                                </p>
                            ) : null}
                        </div>
                    )}

                </div>

                {/* SSL PROVISIONING NOTIFICATION */}
                {(domain.sslStatus === 'pending' || domain.sslStatus === 'provisioning') && domain.status !== 'pending' && domain.status !== 'error' && (
                    <div className="bg-gradient-to-r from-q-accent/10 to-q-accent/10 border border-q-accent/30 rounded-xl p-5 mb-4">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-q-accent/20 rounded-lg flex-shrink-0 animate-pulse">
                                <Loader2 size={20} className="text-q-accent animate-spin" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-foreground text-base mb-1">
                                    {t('domainsDashboard.sslProvisioningTitle')}
                                </h4>
                                <p className="text-sm text-q-text-muted mb-2">
                                    {t('domainsDashboard.sslProvisioningDesc')}
                                </p>
                                <p className="text-xs text-q-accent dark:text-q-accent">
                                    {t('domainsDashboard.sslProvisioningNote')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-q-accent/10 rounded-lg">
                            <Loader2 size={14} className="text-q-accent animate-spin" />
                            <span className="text-sm font-medium text-q-accent dark:text-q-accent">
                                {t('domainsDashboard.sslProvisioningStatus')}
                            </span>
                        </div>
                    </div>
                )}



                {/* DNS INSTRUCTIONS - Show when domain is pending */}
                {shouldShowDnsInstructions && (
                    <div className="bg-gradient-to-r from-q-accent/10 to-q-accent/10 border border-q-accent/30 rounded-xl p-5 mb-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-q-accent/20 rounded-lg flex-shrink-0">
                                <Globe size={20} className="text-q-accent" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground text-base mb-1">
                                    {t('domainsDashboard.configureDnsHeading')}
                                </h4>
                                <p className="text-sm text-q-text-muted">
                                    {t('domainsDashboard.configureDnsSubtext')}
                                </p>
                            </div>
                        </div>

                        {/* DNS Records - Step by step guide */}
                        <div className="bg-q-surface/80 rounded-lg p-4 mb-4 border border-q-border">

                            <p className="text-sm text-q-text-muted mb-4" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.dnsProviderInstructions', { section: t('domainsDashboard.dnsRecords') }) }} />

                            <div className="space-y-4">
                                {getDomainDnsRecords(domain).map((record: any, idx: number) => (
                                    <div key={idx} className="bg-secondary/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-6 h-6 rounded-full bg-q-accent text-q-text-on-accent text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                            <span className="text-sm font-bold text-foreground">{record.type} Record</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 bg-q-bg p-3 rounded border border-q-border">
                                            <div>
                                                <span className="text-[10px] text-q-text-muted uppercase font-bold block mb-1">{t('domainsDashboard.typeLabel')}</span>
                                                <code className={`font-mono font-bold ${record.type === 'A' ? 'text-q-accent' : 'text-q-success'}`}>{record.type}</code>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-q-text-muted uppercase font-bold block mb-1">{t('domainsDashboard.hostNameLabel')}</span>
                                                <code className="font-mono font-bold text-foreground">{record.host || '@'}</code>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] text-q-text-muted uppercase font-bold block mb-1">{t('domainsDashboard.valuePointsTo')}</span>
                                                        <code className="font-mono font-bold text-primary text-xs">{record.value}</code>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(record.value);
                                                            alert(`Copiado: ${record.value}`);
                                                        }}
                                                        className="p-1 hover:bg-primary/20 rounded text-primary ml-2"
                                                        title={t('copy')}
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Step 3: Wait & Verify */}
                                <div className="bg-secondary/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-q-accent text-q-text-on-accent text-xs font-bold flex items-center justify-center">{getDomainDnsRecords(domain).length + 1}</span>
                                        <span className="text-sm font-bold text-foreground">{t('domainsDashboard.saveAndVerify')}</span>
                                    </div>
                                    <p className="text-xs text-q-text-muted ml-8" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.saveAndVerifyText') }} />
                                </div>
                            </div>

                            {/* Provider-specific tips */}
                            <div className="mt-4 p-3 bg-q-accent/10 border border-q-accent/20 rounded-lg">
                                <p className="text-xs font-bold text-q-accent dark:text-q-accent mb-1">{t('domainsDashboard.providerTipsTitle')}</p>
                                <ul className="text-xs text-q-text-muted space-y-1 list-disc list-inside">
                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.providerTipGoDaddy') }} />
                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.providerTipNamecheap') }} />
                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.providerTipGoogle') }} />
                                </ul>
                            </div>
                        </div>

                        {/* Verification message */}
                        {verificationMessage && (
                            <div className={`p-3 rounded-lg text-sm mb-4 flex items-center gap-2 ${verificationMessage.status === 'success'
                                ? 'bg-q-success/10 border border-q-success/20 text-q-success'
                                : verificationMessage.status === 'error'
                                    ? 'bg-q-error/10 border border-q-error/20 text-q-error'
                                    : 'bg-q-accent/10 border border-q-accent/20 text-q-accent'
                                }`}>
                                {verificationMessage.status === 'success' && <CheckCircle size={16} className="shrink-0" />}
                                {verificationMessage.status === 'error' && <XCircle size={16} className="shrink-0" />}
                                {verificationMessage.status === 'pending' && <Clock size={16} className="shrink-0" />}
                                {verificationMessage.text}
                            </div>
                        )}

                        {/* Verify button */}
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying}
                            className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
                        >
                            {isVerifying ? (
                                <><Loader2 size={18} className="animate-spin" /> {t('domainsDashboard.verifyingBtn')}</>
                            ) : (
                                <><RefreshCw size={18} /> {t('domainsDashboard.verifyDnsBtn')}</>
                            )}
                        </button>

                        <p className="text-xs text-center text-q-text-muted mt-3 flex items-center justify-center gap-1">
                            <Clock size={12} />
                            {t('domainsDashboard.dnsPropagationNote')}
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
                )}  {/* end isExpanded */}
            </div>

            {
                showDetails && (
                    <div className="border-t border-q-border p-6 bg-q-bg/50">
                        {/* Simple DNS Instructions */}
                        <div className="bg-secondary/20 rounded-xl p-6 border border-q-border">
                            <h4 className="font-bold text-foreground mb-4 flex items-center">
                                <Globe size={16} className="mr-2 text-primary" />
                                {t('domainsDashboard.dnsRecordsRequired')}
                            </h4>

                            {/* DNS Records Table */}
                            <div className="space-y-4">
                                {getDomainDnsRecords(domain).map((record: any, idx: number) => (
                                    <div key={idx} className="bg-q-surface rounded-lg p-4 border border-q-border">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className={`text-xs font-bold ${record.type === 'A' ? 'bg-q-accent/20 text-q-accent' : 'bg-q-success/20 text-q-success'} px-2 py-0.5 rounded mr-2`}>
                                                    {record.type}
                                                </span>
                                                <span className="text-sm text-q-text-muted">Host: <code className="font-mono font-bold">{record.host || '@'}</code></span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-[10px] text-q-text-muted uppercase font-bold block mb-0.5">{t('domainsDashboard.valuePointsTo')}</span>
                                                    <code className="font-mono font-bold text-foreground text-xs">{record.value}</code>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(record.value);
                                                        alert(`Copiado: ${record.value}`);
                                                    }}
                                                    className="p-1.5 hover:bg-primary/20 rounded text-primary"
                                                    title={t('copy')}
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 p-3 mt-4 bg-q-accent/10 border border-q-accent/20 rounded-lg">
                                <Clock size={14} className="text-q-accent flex-shrink-0" />
                                <p className="text-xs text-q-text-muted">
                                    {t('domainsDashboard.dnsPropagationNote')}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showLogs && deploymentLogs.length > 0 && (
                    <div className="border-t border-q-border p-6 bg-q-bg/50">
                        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center">
                            <Settings size={14} className="mr-2 text-primary" />
                            {t('domainsDashboard.deploymentLogs')}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {deploymentLogs.slice().reverse().map((log) => (
                                <div
                                    key={log.id}
                                    className={`text-xs p-3 rounded-lg border ${log.status === 'success'
                                        ? 'bg-q-success/5 border-q-success/20 text-q-success dark:text-q-success'
                                        : log.status === 'failed'
                                            ? 'bg-q-error/5 border-q-error/20 text-q-error dark:text-q-error'
                                            : 'bg-q-accent/5 border-q-accent/20 text-q-accent dark:text-q-accent'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold">{log.message}</span>
                                        <span className="text-q-text-muted">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {log.details && (
                                        <div className="text-q-text-muted mt-1">{log.details}</div>
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
            // Use Name.com API via server-side API route
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
                <div className="fixed inset-0 bg-q-text/60 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-q-surface border border-q-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="text-center mb-6">
                            {orderStatus.status === 'completed' ? (
                                <>
                                    <div className="w-16 h-16 bg-q-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-q-success" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.registrationComplete')}</h3>
                                    <p className="text-q-text-muted">{t('domainsDashboard.domainReadyToUse')}</p>
                                </>
                            ) : orderStatus.status === 'failed' ? (
                                <>
                                    <div className="w-16 h-16 bg-q-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <X size={32} className="text-q-error" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.stepFailed')}</h3>
                                    <p className="text-q-error">{error}</p>
                                </>
                            ) : (
                                <>
                                    <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-foreground">{t('domainsDashboard.domainBeingRegistered')}</h3>
                                    <p className="text-q-text-muted">{t('domainsDashboard.pleaseWait')}</p>
                                </>
                            )}
                        </div>

                        <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-q-text-muted">{t('domainsDashboard.domain')}</span>
                                <span className="font-bold text-foreground">{orderStatus.domainName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-q-text-muted">{t('domainsDashboard.domainStatus')}</span>
                                <span className={`text-sm font-medium ${orderStatus.status === 'completed' ? 'text-q-success' :
                                    orderStatus.status === 'failed' ? 'text-q-error' : 'text-primary'
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
                            <div className="bg-q-accent/10 border border-q-accent/20 rounded-lg p-3 mb-4">
                                <p className="text-sm font-medium text-q-accent mb-2">{t('domainsDashboard.nameserversInfo')}</p>
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
                    <p className="text-sm text-q-text-muted">{t('domainsDashboard.searchDesc')}</p>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-q-text-muted"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1 bg-q-surface-overlay/40 rounded-lg px-3 py-3">
                    <Search className="w-4 h-4 text-q-text-secondary flex-shrink-0" />
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
                <div className="mb-4 p-3 bg-q-error/10 border border-q-error/20 rounded-lg text-q-error text-sm flex items-center gap-1.5">
                    <XCircle size={16} className="shrink-0" /> {error}
                </div>
            )}

            {/* Results */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                {/* Available Domains Section */}
                {results.filter(r => r.available).length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-q-success mb-2 flex items-center">
                            <CheckCircle size={14} className="mr-1" /> {t('domainsDashboard.available')} ({results.filter(r => r.available).length})
                        </h3>
                        <div className="space-y-2">
                            {results.filter(r => r.available).map((res, idx) => (
                                <div
                                    key={`available-${idx}`}
                                    className="flex justify-between items-center p-3 bg-q-surface border border-q-success/20 rounded-lg transition-colors hover:border-q-success/40"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-foreground">{res.name}</p>
                                            {res.premium && (
                                                <span className="text-xs bg-q-accent/20 text-q-accent px-2 py-0.5 rounded-full font-medium">
                                                    Premium
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-q-success font-medium flex items-center">
                                            <CheckCircle size={10} className="mr-1" /> {t('domainsDashboard.available')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {res.price !== null && (
                                            <div className="text-right">
                                                <span className="font-bold">${res.price.toFixed(2)}</span>
                                                <span className="text-xs text-q-text-muted">{t('domainsDashboard.perYear')}</span>
                                                {res.renewalPrice && res.renewalPrice !== res.price && (
                                                    <p className="text-xs text-q-text-muted">
                                                        {t('domainsDashboard.renewalPrice', { price: res.renewalPrice.toFixed(2) })}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => res.price && handleBuy(res.name, res.price)}
                                            disabled={isPurchasing !== null}
                                            className="bg-q-success hover:bg-q-success text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50 min-w-[90px]"
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
                        <h3 className="text-sm font-bold text-q-error mb-2 flex items-center">
                            <X size={14} className="mr-1" /> {t('domainsDashboard.taken')} ({results.filter(r => !r.available).length})
                        </h3>
                        <div className="space-y-2">
                            {results.filter(r => !r.available).map((res, idx) => (
                                <div
                                    key={`unavailable-${idx}`}
                                    className="flex justify-between items-center p-3 bg-q-surface/50 border border-q-error/20 rounded-lg opacity-70"
                                >
                                    <div>
                                        <p className="font-medium text-foreground line-through">{res.name}</p>
                                        <span className="text-xs text-q-error font-medium flex items-center">
                                            <X size={10} className="mr-1" /> {t('domainsDashboard.taken')}
                                        </span>
                                    </div>
                                    <span className="text-sm text-q-text-muted px-3 py-1 bg-secondary/50 rounded">
                                        {t('domainsDashboard.notAvailable')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {results.length === 0 && !isSearching && !error && (
                    <div className="text-center py-10 text-q-text-muted">
                        <Globe size={40} className="mx-auto mb-3 opacity-30" />
                        <p>{t('domainsDashboard.enterKeyword')}</p>
                        <p className="text-xs mt-2">{t('domainsDashboard.searchHint')}</p>
                    </div>
                )}
                {isSearching && (
                    <div className="text-center py-10">
                        <Loader2 size={32} className="animate-spin mx-auto mb-3 text-primary" />
                        <p className="text-q-text-muted">{t('domainsDashboard.searchingDomains')}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 p-3 bg-secondary/20 rounded-lg text-xs text-q-text-muted flex items-center justify-center">
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
    const { navigate } = useRouter();
    const { user } = useAuth();
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
    const [showInstructions, setShowInstructions] = useState(false);



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
            const normalizedDomain = connectDomainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

            await addDomain({
                name: normalizedDomain,
                projectId: connectProjectId,
                provider: 'External'
            });

            setIsConnectModalOpen(false);
            alert(t('domainsDashboard.domainAddedAlertGeneric', 'Dominio añadido. Sigue las instrucciones para configurar los registros DNS.'));
            await refetch();

        } catch (error: any) {
            console.error('[DomainsDashboard] Error adding domain:', error);
            setCloudflareError(error.message || t('domainsDashboard.errorSavingDomain'));
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

    const domainStats = useMemo(() => {
        const pendingStatuses = new Set([
            'pending',
            'pending_nameservers',
            'verifying',
            'ssl_pending',
            'deploying',
        ]);
        const connectedStatuses = new Set(['active', 'deployed']);

        return {
            total: domains.length,
            connected: domains.filter((d) => connectedStatuses.has(d.status)).length,
            pending: domains.filter((d) => pendingStatuses.has(d.status)).length,
            withProject: domains.filter((d) => d.projectId).length,
        };
    }, [domains]);

    const statCards = [
        {
            id: 'total',
            icon: Link2,
            value: domainStats.total,
            labelKey: 'domainsDashboard.stats.total',
            defaultLabel: 'Total de dominios',
        },
        {
            id: 'connected',
            icon: CheckCircle,
            value: domainStats.connected,
            labelKey: 'domainsDashboard.status.connected',
            defaultLabel: 'Conectados',
        },
        {
            id: 'pending',
            icon: Clock,
            value: domainStats.pending,
            labelKey: 'domainsDashboard.status.dnsPending',
            defaultLabel: 'DNS Pendiente',
        },
        {
            id: 'withProject',
            icon: Globe,
            value: domainStats.withProject,
            labelKey: 'domainsDashboard.stats.withProject',
            defaultLabel: 'Con proyecto',
        },
    ];

    return (
        <div className="flex h-screen bg-q-bg text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
 <header className="quimera-dashboard-header-bar h-14 px-2 sm:px-6 flex items-center justify-between z-20 sticky top-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-border/40 rounded-full transition-colors">
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Link2 className="w-5 h-5 quimera-dashboard-header-icon" strokeWidth={2} />
                            <h1 className="text-sm sm:text-lg font-semibold text-foreground">{t('domainsDashboard.title')}</h1>
                        </div>
                    </div>

                    <div className="flex gap-1 sm:gap-2">
                        <button
                            onClick={() => customDomainsAllowed ? setIsConnectModalOpen(true) : handleDomainUpgrade()}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-lg text-sm font-medium transition-all sm:bg-secondary/50 sm:border sm:border-q-border/40 text-q-text-muted hover:text-foreground hover:bg-secondary hidden sm:flex"
                        >
                            {!customDomainsAllowed && <Crown className="w-4 h-4 text-q-accent" />}
                            <Link2 className="w-4 h-4" /> <span className="hidden sm:inline">{t('domainsDashboard.connect')}</span>
                        </button>
                        <button
                            onClick={handleBuyDomain}
                            className="flex items-center gap-1.5 h-9 px-2 sm:px-3 rounded-lg text-sm font-medium transition-all sm:bg-secondary/50 sm:border sm:border-q-border/40 text-q-text-muted hover:text-foreground hover:bg-secondary"
                        >
                            {!customDomainsAllowed && <Crown className="w-4 h-4 text-q-accent" />}
                            <ShoppingCart className="w-4 h-4" /> <span className="hidden sm:inline">{t('domainsDashboard.buyDomain')}</span>
                        </button>
                        <HeaderBackButton onClick={() => navigate(ROUTES.DASHBOARD)} />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth bg-secondary/5 relative z-10">
                    <div className="max-w-5xl mx-auto space-y-8">

                        {/* Statistics */}
                        <section className="relative z-[1] grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            {statCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <div
                                        key={card.id}
                                        className="group relative overflow-hidden rounded-xl md:rounded-2xl border border-q-border/60
                                            bg-q-surface/80 backdrop-blur-xl p-2.5 md:p-4 hover:border-q-border
                                            transition-all duration-300 ease-out"
                                    >
                                        <div
                                            className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 md:w-32 md:h-32 rounded-full blur-2xl
                                                group-hover:scale-110 transition-all duration-500"
                                            aria-hidden="true"
                                        />
                                        <div className="relative z-10">
                                            <div className="mb-1 md:mb-2">
                                                <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                            </div>
                                            <div className="text-xl md:text-3xl font-extrabold text-foreground">
                                                {card.value}
                                            </div>
                                            <div className="text-[10px] md:text-xs font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">
                                                {t(card.labelKey, card.defaultLabel)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>

                        {/* Collapsible Instructions - Comprehensive Beginner Guide */}
                        <div className="group relative overflow-hidden rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl">
                            <div
                                className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl
                                    group-hover:scale-105 transition-transform duration-500"
                                aria-hidden="true"
                            />
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="relative z-10 w-full p-5 flex items-center justify-between hover:bg-q-surface-overlay/30 transition-colors"
                            >
                                <h4 className="font-bold text-foreground flex items-center gap-3 text-base">
                                    <ClipboardList className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                    {t('domainsDashboard.guide.title')}
                                </h4>
                                {showInstructions
                                    ? <ChevronUp className="quimera-status-card-link" size={20} />
                                    : <ChevronDown className="quimera-status-card-link" size={20} />}
                            </button>

                            {showInstructions && (
                                <div className="relative z-10 px-5 pb-6 text-sm space-y-6">

                                    {/* ======== WHAT IS A DOMAIN - Intro for beginners ======== */}
                                    <div className="quimera-guide-panel-accent p-4">
                                        <h5 className="font-bold text-foreground mb-2 flex items-center gap-2">
                                            <GuideIconChip icon={Globe} size={16} />
                                            {t('domainsDashboard.guide.whatIsDomain')}
                                        </h5>
                                        <p className="text-q-text-muted text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.whatIsDomainDesc') }} />
                                    </div>

                                    {/* ======== VISUAL DIAGRAM - How DNS Works ======== */}
                                    <div className="quimera-guide-panel p-5">
                                        <h5 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                            {t('domainsDashboard.guide.howItWorksTitle')}
                                        </h5>
                                        <div className="flex flex-col items-center gap-0">
                                            <div className="quimera-guide-flow-row flex items-center gap-3 px-5 py-3 w-full max-w-md">
                                                <GuideIconChip icon={User} />
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{t('domainsDashboard.guide.diagramClientTypes')}</p>
                                                    <code className="quimera-guide-code-value text-xs font-bold">www.tunegocio.com</code>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center py-1">
                                                <div className="quimera-guide-arrow-line" />
                                                <ChevronDown size={16} className="quimera-guide-arrow -mt-1.5" />
                                            </div>
                                            <div className="quimera-guide-flow-row flex items-center gap-3 px-5 py-3 w-full max-w-md">
                                                <GuideIconChip icon={Globe} />
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{t('domainsDashboard.guide.diagramDnsLookup')}</p>
                                                    <p className="text-xs text-q-text-muted">{t('domainsDashboard.guide.diagramDnsLookupDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center py-1">
                                                <div className="quimera-guide-arrow-line" />
                                                <ChevronDown size={16} className="quimera-guide-arrow -mt-1.5" />
                                            </div>
                                            <div className="quimera-guide-flow-row flex items-center gap-3 px-5 py-3 w-full max-w-md">
                                                <GuideIconChip icon={Server} />
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{t('domainsDashboard.guide.diagramServerShows')}</p>
                                                    <p className="text-xs text-q-text-muted" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.diagramServerDesc') }} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center py-1">
                                                <div className="quimera-guide-arrow-line" />
                                                <ChevronDown size={16} className="quimera-guide-arrow -mt-1.5" />
                                            </div>
                                            <div className="quimera-guide-flow-row flex items-center gap-3 px-5 py-3 w-full max-w-md">
                                                <GuideIconChip icon={Sparkles} />
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{t('domainsDashboard.guide.diagramResult')}</p>
                                                    <p className="text-xs text-q-text-muted">{t('domainsDashboard.guide.diagramResultDesc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== STEP BY STEP GUIDE ======== */}
                                    <div className="space-y-5">
                                        <h5 className="font-bold text-foreground text-base flex items-center gap-2">
                                            {t('domainsDashboard.guide.stepByStepTitle')}
                                        </h5>

                                        {/* STEP 1: Go to your provider */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={1} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base">{t('domainsDashboard.guide.step1Title')}</strong>
                                                <p className="text-q-text-muted mb-3" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step1Desc') }} />
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div className="bg-q-surface border border-q-border rounded-lg p-3 text-center">
                                                        <p className="font-bold text-foreground text-sm">GoDaddy</p>
                                                        <p className="text-xs text-q-text-muted">godaddy.com</p>
                                                    </div>
                                                    <div className="bg-q-surface border border-q-border rounded-lg p-3 text-center">
                                                        <p className="font-bold text-foreground text-sm">Namecheap</p>
                                                        <p className="text-xs text-q-text-muted">namecheap.com</p>
                                                    </div>
                                                    <div className="bg-q-surface border border-q-border rounded-lg p-3 text-center">
                                                        <p className="font-bold text-foreground text-sm">Google Domains</p>
                                                        <p className="text-xs text-q-text-muted">domains.google</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-q-text-muted mt-2">
                                                    {t('domainsDashboard.guide.step1LoginHint')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* STEP 2: Find DNS section */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={2} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base">{t('domainsDashboard.guide.step2Title')}</strong>
                                                <p className="text-q-text-muted mb-3">
                                                    {t('domainsDashboard.guide.step2Desc')}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {['DNS', 'Manage DNS', 'DNS Records', 'Registros DNS', 'DNS Zone', 'Advanced DNS', 'Configuración DNS'].map(label => (
                                                        <span key={label} className="bg-secondary/80 text-foreground text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-q-border">
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="quimera-guide-callout p-3">
                                                    <p className="text-xs text-q-text-secondary flex items-start gap-2">
                                                        <AlertTriangle size={14} className="quimera-status-card-accent-text shrink-0 mt-0.5" />
                                                        <span dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step2Warning') }} />
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 3: DELETE old records */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={3} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base flex items-center gap-2">
                                                    {t('domainsDashboard.guide.step3Title')}
                                                </strong>
                                                <div className="quimera-guide-callout-critical p-4 mb-3">
                                                    <p className="text-sm quimera-guide-callout-critical-title mb-3">
                                                        {t('domainsDashboard.guide.step3Warning')}
                                                    </p>
                                                    <p className="text-sm text-q-text-muted mb-3" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step3Desc') }} />
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 quimera-guide-panel p-3">
                                                            <Trash2 size={16} className="text-q-error shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-foreground text-sm" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step3DeleteA') }} />
                                                                <p className="text-xs text-q-text-muted" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step3DeleteADesc') }} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 quimera-guide-panel p-3">
                                                            <Trash2 size={16} className="text-q-error shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-foreground text-sm" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step3DeleteCNAME') }} />
                                                                <p className="text-xs text-q-text-muted" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step3DeleteCNAMEDesc') }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-q-text-muted mt-3 italic">
                                                        {t('domainsDashboard.guide.step3NoRecordsHint')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 4: ADD new records */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={4} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base flex items-center gap-2">
                                                    {t('domainsDashboard.guide.step4Title')}
                                                </strong>
                                                <p className="text-q-text-muted mb-3" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step4Desc') }} />

                                                {/* Record 1: A */}
                                                <div className="quimera-guide-record-card p-4 mb-3">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="quimera-guide-record-badge">{t('domainsDashboard.guide.record1Label')}</span>
                                                        <span className="text-sm font-bold text-foreground">{t('domainsDashboard.guide.record1Title')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-q-bg p-4 rounded-lg border border-q-border">
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.typeColumn')}</span>
                                                            <code className="quimera-guide-code-accent text-lg font-extrabold">A</code>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.hostColumn')}</span>
                                                            <code className="font-mono font-extrabold text-foreground text-lg">@</code>
                                                            <p className="text-[10px] text-q-text-muted mt-0.5">{t('domainsDashboard.guide.atSymbolHint')}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.valueColumn')}</span>
                                                            <div className="flex items-center gap-2">
                                                                <code className="quimera-guide-code-value text-lg">76.76.21.21</code>
                                                                <button
                                                                    onClick={() => { navigator.clipboard.writeText('76.76.21.21'); alert(t('domainsDashboard.guide.ipCopiedToClipboard')); }}
                                                                    className="quimera-guide-copy-btn"
                                                                    title={t('domainsDashboard.guide.copyIpTitle')}
                                                                >
                                                                    <Copy size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Record 2: CNAME */}
                                                <div className="quimera-guide-record-card p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="quimera-guide-record-badge">{t('domainsDashboard.guide.record2Label')}</span>
                                                        <span className="text-sm font-bold text-foreground">{t('domainsDashboard.guide.record2Title')}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-q-bg p-4 rounded-lg border border-q-border">
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.typeColumn')}</span>
                                                            <code className="quimera-guide-code-accent text-lg font-extrabold">CNAME</code>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.hostColumn')}</span>
                                                            <code className="font-mono font-extrabold text-foreground text-lg">www</code>
                                                            <p className="text-[10px] text-q-text-muted mt-0.5">{t('domainsDashboard.guide.wwwLiteralHint')}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-q-text-muted uppercase font-bold tracking-wider block mb-1">{t('domainsDashboard.guide.valueColumn')}</span>
                                                            <div className="flex items-center gap-2">
                                                                <code className="quimera-guide-code-value text-base">cname.vercel-dns.com</code>
                                                            </div>
                                                            <p className="text-[10px] text-q-text-muted mt-0.5">{t('domainsDashboard.guide.cnameValueHint')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 5: Save */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={5} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base">{t('domainsDashboard.guide.step5Title')}</strong>
                                                <p className="text-q-text-muted mb-2" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step5Desc') }} />
                                                <div className="quimera-guide-callout p-3">
                                                    <p className="text-xs text-q-text-secondary flex items-start gap-2">
                                                        <Clock size={14} className="quimera-status-card-accent-text shrink-0 mt-0.5" />
                                                        <span dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step5PropagationNote') }} />
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 6: Connect here */}
                                        <div className="flex items-start gap-3">
                                            <GuideStepBadge step={6} />
                                            <div className="flex-1">
                                                <strong className="text-foreground block mb-2 text-base">{t('domainsDashboard.guide.step6Title')}</strong>
                                                <p className="text-q-text-muted" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.step6Desc') }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== PROVIDER-SPECIFIC GUIDES ======== */}
                                    <div className="quimera-guide-provider-section p-4">
                                        <h5 className="text-sm font-bold quimera-guide-provider-title mb-3 flex items-center gap-2">
                                            {t('domainsDashboard.guide.providerGuideTitle')}
                                        </h5>
                                        <div className="space-y-3">
                                            <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                                <p className="font-bold text-foreground text-sm mb-1" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyTitle') }} />
                                                <ol className="text-xs text-q-text-muted list-decimal list-inside space-y-0.5">
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyStep1') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyStep2') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyStep3') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyStep4') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.godaddyStep5') }} />
                                                </ol>
                                            </div>
                                            <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                                <p className="font-bold text-foreground text-sm mb-1" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapTitle') }} />
                                                <ol className="text-xs text-q-text-muted list-decimal list-inside space-y-0.5">
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep1') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep2') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep3') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep4') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep5') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.namecheapStep6') }} />
                                                </ol>
                                            </div>
                                            <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                                <p className="font-bold text-foreground text-sm mb-1" dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleTitle') }} />
                                                <ol className="text-xs text-q-text-muted list-decimal list-inside space-y-0.5">
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleStep1') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleStep2') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleStep3') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleStep4') }} />
                                                    <li dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.googleStep5') }} />
                                                </ol>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ======== PRO TIP ======== */}
                                    <div className="quimera-guide-divider pt-4">
                                        <p className="text-xs text-q-text-muted flex items-start gap-2">
                                            <Timer size={14} className="quimera-status-card-accent-text shrink-0 mt-0.5" />
                                            <span dangerouslySetInnerHTML={{ __html: t('domainsDashboard.guide.proTip') }} />
                                        </p>
                                    </div>

                                    {/* ======== CTA BUTTON - Connect Domain ======== */}
                                    <div className="flex flex-col items-center pt-2">
                                        <button
                                            onClick={() => customDomainsAllowed ? setIsConnectModalOpen(true) : handleDomainUpgrade()}
                                            className="quimera-guide-cta active:scale-[0.98]"
                                        >
                                            {!customDomainsAllowed && <Crown className="w-5 h-5" />}
                                            <Link2 size={20} />
                                            {t('domainsDashboard.guide.ctaButton')}
                                        </button>
                                        <p className="text-xs text-q-text-muted mt-2 text-center">
                                            {t('domainsDashboard.guide.ctaSubtext')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {domains.length === 0 ? (
                            <div className="group relative overflow-hidden text-center py-20 rounded-2xl border border-q-border/60 bg-q-surface/80 backdrop-blur-xl border-dashed">
                                <div
                                    className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl"
                                    aria-hidden="true"
                                />
                                <Globe size={40} className="quimera-dashboard-header-icon relative z-10 mx-auto mb-6" strokeWidth={1.5} />
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold text-foreground mb-2">{t('domainsDashboard.noDomains')}</h2>
                                    <p className="text-q-text-muted max-w-md mx-auto mb-8">
                                        {t('domainsDashboard.noDomainsDesc')}
                                    </p>
                                    <div className="flex justify-center gap-4">
                                    {!customDomainsAllowed ? (
                                        <button
                                            onClick={handleDomainUpgrade}
                                            className="quimera-guide-cta"
                                        >
                                            <Crown className="w-5 h-5" /> {t('domainsDashboard.upgradeForDomains')}
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsConnectModalOpen(true)} className="px-6 py-3 rounded-xl border border-q-border bg-q-bg hover:bg-secondary transition-colors font-bold">{t('domainsDashboard.connectExisting')}</button>
                                    )}
                                    {customDomainsAllowed && (
                                        <button onClick={handleBuyDomain} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-bold">{t('domainsDashboard.findDomain')}</button>
                                    )}
                                    </div>
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
                                className="p-1 rounded-full hover:bg-secondary text-q-text-muted disabled:opacity-50"
                                disabled={isSettingUpCloudflare}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Error message */}
                        {cloudflareError && (
                            <div className="mb-4 p-3 bg-q-error/10 border border-q-error/20 rounded-lg text-q-error text-sm flex items-center gap-1.5">
                                <XCircle size={16} className="shrink-0" /> {cloudflareError}
                            </div>
                        )}

                        <form onSubmit={handleConnectSubmit}>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-q-text-muted uppercase tracking-wider mb-2">{t('domainsDashboard.domainName')}</label>
                                <input
                                    required
                                    autoFocus
                                    disabled={isSettingUpCloudflare}
                                    value={connectDomainName}
                                    onChange={(e) => setConnectDomainName(e.target.value)}
                                    placeholder="tudominio.com"
                                    className="w-full bg-secondary/30 border border-q-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium disabled:opacity-50"
                                />
                            </div>

                            {/* Project Selection */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-q-text-muted uppercase tracking-wider mb-2">
                                    {t('domainsDashboard.connectToProject', 'Conectar a Proyecto')} *
                                </label>
                                <AppSelect
                                    required
                                    disabled={isSettingUpCloudflare}
                                    value={connectProjectId}
                                    onChange={(e) => setConnectProjectId(e.target.value)}
                                    className="w-full bg-secondary/30 border border-q-border rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/50 outline-none transition-all font-medium disabled:opacity-50"
                                >
                                    <option value="">{t('domainsDashboard.selectProject', 'Selecciona un proyecto...')}</option>
                                    {projects.filter(p => p.status !== 'Template').map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </AppSelect>
                            </div>

                            {/* DNS Instructions */}
                            <div className="mb-6 bg-secondary/30 rounded-xl p-4 border border-q-border">
                                <h4 className="text-sm font-bold text-foreground mb-4 flex items-center">
                                    <Globe size={16} className="mr-2 text-primary" />
                                    {t('domainsDashboard.dnsInstructions', 'Configura estos registros DNS')}
                                </h4>
                                <div className="bg-q-surface rounded-lg p-3 border border-q-border">
                                    <p className="text-sm text-q-text-muted">
                                        {t('domainsDashboard.connectModal.recordsAfterSave', 'Los registros DNS recomendados por Vercel aparecerán en la tarjeta del dominio después de guardarlo.')}
                                    </p>
                                </div>

                                {/* Quick steps */}
                                <div className="mt-4 pt-4 border-t border-q-border text-xs text-q-text-muted">
                                    <p className="font-bold mb-2">{t('domainsDashboard.connectModal.quickStepsTitle')}</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>{t('domainsDashboard.connectModal.quickStep1')}</li>
                                        <li>{t('domainsDashboard.connectModal.quickStep2')}</li>
                                        <li>{t('domainsDashboard.connectModal.quickStep3')}</li>
                                        <li>{t('domainsDashboard.connectModal.quickStep4')}</li>
                                    </ol>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsConnectModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-q-text-muted hover:text-foreground disabled:opacity-50"
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
