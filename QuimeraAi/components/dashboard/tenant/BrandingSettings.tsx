/**
 * BrandingSettings
 * Workspace branding, visual identity, and portal domain controls.
 */

import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    Palette,
    Image as ImageIcon,
    Globe,
    Check,
    Loader2,
    AlertCircle,
    Copy,
    ExternalLink,
    RefreshCw,
    Trash2,
    Eye,
    Sparkles,
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { TenantBranding } from '../../../types/multiTenant';
import { getCanonicalPlanFeatures, isPlatformUnlimitedUser } from '../../../services/billing/planCatalog';

import ImagePicker from '../../ui/ImagePicker';
import ColorControl from '../../ui/ColorControl';
import { settingsPanelClass } from '../settings/SettingsStatCard';

interface BrandingSettingsProps {
    className?: string;
}

const inputClass =
    'w-full rounded-lg border border-q-border bg-q-bg px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60';

const DnsRecordRow = ({
    type,
    name,
    value,
    onCopy,
}: {
    type: string;
    name: string;
    value: string;
    onCopy: () => void;
}) => (
    <div className="rounded-lg border border-q-border bg-q-bg p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-q-text-muted">
                {type}
            </span>
            <button
                type="button"
                onClick={onCopy}
                className="rounded-md p-1.5 text-q-text-muted transition-colors hover:bg-secondary hover:text-foreground"
                title="Copiar valor"
            >
                <Copy size={12} />
            </button>
        </div>
        <p className="break-all font-mono text-xs text-foreground">
            <span className="text-q-text-muted">Nombre:</span> {name}
        </p>
        <p className="mt-1 break-all font-mono text-xs text-foreground">
            <span className="text-q-text-muted">Valor:</span> {value}
        </p>
    </div>
);

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ className = '' }) => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { currentTenant, updateTenant, canPerformInTenant } = useTenant();

    const [branding, setBranding] = useState<TenantBranding>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [customDomain, setCustomDomain] = useState('');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [isRemovingDomain, setIsRemovingDomain] = useState(false);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
    const [dnsRecords, setDnsRecords] = useState<any>(null);
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [showRemoveDomainModal, setShowRemoveDomainModal] = useState(false);

    useEffect(() => {
        if (currentTenant?.branding) {
            setBranding(currentTenant.branding);
            setCustomDomain(currentTenant.branding.customDomain || '');
        }
    }, [currentTenant]);

    const { userDocument } = useAuth();
    const canManageSettings = canPerformInTenant('canManageSettings');

    const hasCustomDomainFeature = isPlatformUnlimitedUser(userDocument?.role) ||
        Boolean(currentTenant?.subscriptionPlan && getCanonicalPlanFeatures(currentTenant.subscriptionPlan).customDomains);

    const handleSaveBranding = async () => {
        if (!currentTenant) return;

        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            await updateTenant(currentTenant.id, { branding });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            setSaveError(err.message || 'Error guardando configuración');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddDomain = async () => {
        if (!currentTenant || !customDomain) return;

        setIsAddingDomain(true);
        setDomainError(null);
        setDomainSuccess(null);
        setDnsRecords(null);

        try {
            const { supabase } = await import('@/supabase');
            const result = await supabase.functions.invoke('onboarding-api', {
                body: { action: 'addPortalDomain', tenantId: currentTenant.id, domain: customDomain }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            setDnsRecords(data.dnsRecords);
            setDomainSuccess('Dominio agregado. Configura los registros DNS mostrados abajo.');
        } catch (err: any) {
            setDomainError(err.message || 'Error agregando dominio');
        } finally {
            setIsAddingDomain(false);
        }
    };

    const handleVerifyDomain = async () => {
        if (!currentTenant || !currentTenant.branding?.customDomain) return;

        setIsVerifyingDomain(true);
        setDomainError(null);
        setVerificationResult(null);

        try {
            const { supabase } = await import('@/supabase');
            const result = await supabase.functions.invoke('onboarding-api', {
                body: { action: 'verifyPortalDomain', tenantId: currentTenant.id, domain: currentTenant.branding.customDomain }
            });
            if (result.error) throw result.error;
            const data = result.data?.data || result.data;
            setVerificationResult(data);

            if (data.verified) {
                setDomainSuccess('¡Dominio verificado correctamente!');
            } else {
                setDomainError('Verificación incompleta. Revisa los registros DNS.');
            }
        } catch (err: any) {
            setDomainError(err.message || 'Error verificando dominio');
        } finally {
            setIsVerifyingDomain(false);
        }
    };

    const requestRemoveDomain = () => {
        setShowRemoveDomainModal(true);
    };

    const handleRemoveDomain = async () => {
        if (!currentTenant) return;
        setShowRemoveDomainModal(false);

        setIsRemovingDomain(true);
        setDomainError(null);

        try {
            const { supabase } = await import('@/supabase');
            const result = await supabase.functions.invoke('onboarding-api', {
                body: { action: 'removePortalDomain', tenantId: currentTenant.id }
            });
            if (result.error) throw result.error;

            setCustomDomain('');
            setDnsRecords(null);
            setVerificationResult(null);
            setDomainSuccess('Dominio eliminado correctamente');
        } catch (err: any) {
            setDomainError(err.message || 'Error eliminando dominio');
        } finally {
            setIsRemovingDomain(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (!currentTenant) {
        return (
            <div className={`p-8 text-center ${className}`}>
                <Loader2 className="mx-auto mb-2 animate-spin quimera-status-card-accent-text" size={24} />
                <p className="text-q-text-muted">Cargando...</p>
            </div>
        );
    }

    const primaryColor = branding.primaryColor || '#f6a900';
    const secondaryColor = branding.secondaryColor || '#10b981';
    const tenantBranding = currentTenant.branding || {};
    const savedSubdomain = tenantBranding.quimeraSubdomain;
    const savedCustomDomain = tenantBranding.customDomain;
    const previewName = branding.companyName || currentTenant.name || 'Mi Empresa';
    const previewInitial = previewName.charAt(0).toUpperCase();

    return (
        <div className={`space-y-8 ${className}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-q-border bg-q-surface">
                            <Palette size={20} className="quimera-dashboard-header-icon" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-q-accent">
                                {t('settings.branding', 'Branding')}
                            </p>
                            <h2 className="text-2xl font-semibold leading-tight text-foreground">
                                {t('branding.workspaceBrandTitle', 'Identidad y dominio')}
                            </h2>
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-q-text-muted">
                        {t('branding.workspaceBrandDescription', 'Ajusta la marca del workspace, la apariencia del portal y las rutas públicas que verán tus clientes.')}
                    </p>
                </div>

                {canManageSettings && (
                    <button
                        type="button"
                        onClick={handleSaveBranding}
                        disabled={isSaving}
                        className="quimera-guide-cta inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {t('common.saving', 'Guardando...')}
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                {t('common.saveChanges', 'Guardar cambios')}
                            </>
                        )}
                    </button>
                )}
            </div>

            {(saveError || saveSuccess) && (
                <div className={`flex items-center gap-2 rounded-lg border p-4 text-sm ${saveError ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-q-success/30 bg-q-success/10 text-q-success'}`}>
                    {saveError ? <AlertCircle size={16} /> : <Check size={16} />}
                    {saveError || t('common.savedSuccessfully', 'Guardado correctamente')}
                </div>
            )}

            <div className={settingsPanelClass}>
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_26rem]">
                    <div className="border-b border-q-border p-5 lg:border-b-0 lg:border-r lg:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <Sparkles size={18} className="quimera-dashboard-header-icon" />
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {t('branding.title', 'Identidad del Workspace')}
                                </h3>
                                <p className="text-sm text-q-text-muted">
                                    {t('branding.subtitle', 'Define el nombre público y los textos base del portal.')}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    {t('branding.companyName', 'Nombre de la empresa')}
                                </label>
                                <input
                                    type="text"
                                    value={branding.companyName || ''}
                                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                                    className={inputClass}
                                    placeholder={currentTenant.name}
                                    disabled={!canManageSettings}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-foreground">
                                    {t('branding.footerText', 'Texto del footer')}
                                </label>
                                <input
                                    type="text"
                                    value={branding.footerText || ''}
                                    onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                                    className={inputClass}
                                    placeholder="2026 Mi Empresa. Todos los derechos reservados."
                                    disabled={!canManageSettings}
                                />
                            </div>
                        </div>

                        <div className="mt-5 rounded-lg border border-q-border bg-q-bg/50 p-4">
                            <p className="text-sm font-medium text-foreground">
                                {t('branding.brandScopeTitle', 'Dónde se aplica')}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-q-text-muted">
                                {t('branding.brandScopeDescription', 'Estos valores alimentan el portal del cliente, páginas públicas y experiencias white-label disponibles para el plan del workspace.')}
                            </p>
                        </div>
                    </div>

                    <div className="p-5 lg:p-6">
                        <div className="mb-3 flex items-center gap-2">
                            <Eye size={15} className="text-q-text-muted" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                {t('branding.preview', 'Vista previa')}
                            </span>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-q-border bg-q-bg">
                            <div
                                className="flex min-h-[112px] flex-col justify-between p-4"
                                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                            >
                                <div className="flex items-center gap-3">
                                    {branding.logoUrl ? (
                                        <img src={branding.logoUrl} alt="logo" className="h-10 w-10 rounded-lg border border-white/20 object-cover" />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/18 text-sm font-bold text-white">
                                            {previewInitial}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">{previewName}</p>
                                        <p className="truncate text-xs text-white/70">
                                            {savedSubdomain ? `${savedSubdomain}.quimera.ai` : 'portal.quimera.ai'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center gap-2">
                                    <span className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold" style={{ color: primaryColor }}>
                                        {t('branding.ctaPreview', 'Botón CTA')}
                                    </span>
                                    <span className="rounded-md border border-white/35 px-3 py-1.5 text-xs font-semibold text-white/90">
                                        {t('common.preview', 'Vista previa')}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-q-text-muted">
                                    {branding.footerText || t('branding.footerPreviewFallback', 'Footer y textos públicos heredarán esta identidad.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
                <div className={settingsPanelClass}>
                    <div className="border-b border-q-border p-5">
                        <div className="flex items-center gap-3">
                            <Palette size={18} className="quimera-dashboard-header-icon" />
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {t('branding.visualSystem', 'Sistema visual')}
                                </h3>
                                <p className="text-sm text-q-text-muted">
                                    {t('branding.visualSystemDescription', 'Colores principales usados por el portal y acciones de marca.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 p-5 md:grid-cols-2">
                        <div className="rounded-lg border border-q-border bg-q-bg/50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('branding.primaryColor', 'Color primario')}
                                </label>
                                <span className="h-8 w-8 rounded-lg border border-q-border" style={{ backgroundColor: primaryColor }} />
                            </div>
                            <div className={!canManageSettings ? 'pointer-events-none opacity-60' : ''}>
                                <ColorControl
                                    label=""
                                    value={primaryColor}
                                    onChange={(val) => setBranding({ ...branding, primaryColor: val })}
                                    paletteColors={[]}
                                    variant="dashboard"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-q-border bg-q-bg/50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <label className="text-sm font-medium text-foreground">
                                    {t('branding.secondaryColor', 'Color secundario')}
                                </label>
                                <span className="h-8 w-8 rounded-lg border border-q-border" style={{ backgroundColor: secondaryColor }} />
                            </div>
                            <div className={!canManageSettings ? 'pointer-events-none opacity-60' : ''}>
                                <ColorControl
                                    label=""
                                    value={secondaryColor}
                                    onChange={(val) => setBranding({ ...branding, secondaryColor: val })}
                                    paletteColors={[]}
                                    variant="dashboard"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={settingsPanelClass}>
                    <div className="border-b border-q-border p-5">
                        <div className="flex items-center gap-3">
                            <ImageIcon size={18} className="quimera-dashboard-header-icon" />
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    {t('branding.visualAssets', 'Assets visuales')}
                                </h3>
                                <p className="text-sm text-q-text-muted">
                                    {t('branding.visualAssetsDesc', 'Logo y favicon de tu marca.')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 p-5">
                        <div className={!canManageSettings ? 'pointer-events-none opacity-60' : ''}>
                            <ImagePicker
                                label={t('branding.logo', 'Logo de la empresa')}
                                value={branding.logoUrl || ''}
                                onChange={(url) => setBranding({ ...branding, logoUrl: url })}
                                destination="user"
                            />
                            <p className="mt-2 text-xs text-q-text-muted">
                                {t('branding.logoHint', 'Se recomienda 200x200 o superior en formato PNG o SVG')}
                            </p>
                        </div>

                        <div className={!canManageSettings ? 'pointer-events-none opacity-60' : ''}>
                            <ImagePicker
                                label={t('branding.favicon', 'Favicon')}
                                value={branding.faviconUrl || ''}
                                onChange={(url) => setBranding({ ...branding, faviconUrl: url })}
                                destination="user"
                            />
                            <p className="mt-2 text-xs text-q-text-muted">
                                {t('branding.faviconHint', 'Se recomienda 32x32 o 64x64 píxeles en formato PNG o ICO')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={settingsPanelClass}>
                <div className="border-b border-q-border p-5">
                    <div className="flex items-center gap-3">
                        <Globe size={18} className="quimera-dashboard-header-icon" />
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('branding.domainSettings', 'Dominio y subdominio')}
                            </h3>
                            <p className="text-sm text-q-text-muted">
                                {t('branding.domainSettingsDescription', 'Define la URL pública del portal y verifica dominios personalizados.')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <div className="rounded-lg border border-q-border bg-q-bg/50 p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-semibold text-foreground">
                                    {t('branding.quimeraSubdomain', 'Subdominio Quimera')}
                                </h4>
                                <p className="mt-1 text-xs text-q-text-muted">
                                    {t('branding.quimeraSubdomainDescription', 'URL incluida para publicar tu portal rápidamente.')}
                                </p>
                            </div>
                            <span className="rounded-full bg-q-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-q-success">
                                {t('common.free', 'Gratis')}
                            </span>
                        </div>

                        {savedSubdomain ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-q-success/20 bg-q-success/5 p-3.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {savedSubdomain}.quimera.ai
                                    </p>
                                    <p className="mt-0.5 text-xs text-q-success">
                                        {t('branding.subdomainActive', 'Activo')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(`https://${savedSubdomain}.quimera.ai`)}
                                        className="rounded-lg p-2 text-q-text-muted transition-colors hover:bg-secondary hover:text-foreground"
                                        title="Copiar URL"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={`https://${savedSubdomain}.quimera.ai`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg p-2 text-q-text-muted transition-colors hover:bg-secondary hover:text-foreground"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <p className="rounded-lg border border-q-border bg-q-bg p-3.5 text-sm text-q-text-muted">
                                {t('branding.noSubdomain', 'Aún no tienes un subdominio. Configura uno para que tu portal esté en tunombre.quimera.ai')}
                            </p>
                        )}

                        {canManageSettings && (
                            <div className="mt-4">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                    {savedSubdomain
                                        ? t('branding.changeSubdomain', 'Cambiar subdominio')
                                        : t('branding.setSubdomain', 'Elegir subdominio')}
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <input
                                        type="text"
                                        value={branding.quimeraSubdomain || ''}
                                        onChange={e => setBranding({
                                            ...branding,
                                            quimeraSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                                        })}
                                        placeholder={currentTenant.name?.toLowerCase().replace(/\s+/g, '-') || 'mi-empresa'}
                                        maxLength={30}
                                        className={inputClass}
                                    />
                                    <span className="text-sm font-medium text-q-text-muted sm:whitespace-nowrap">.quimera.ai</span>
                                </div>
                                {branding.quimeraSubdomain && (
                                    <p className="mt-2 text-xs text-q-text-muted">
                                        Portal: <span className="quimera-status-card-link font-medium">{branding.quimeraSubdomain}.quimera.ai</span>
                                        {' '}· {t('branding.saveToApply', 'guarda los cambios para aplicar')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border border-q-border bg-q-bg/50 p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-semibold text-foreground">
                                    {t('branding.customDomain', 'Dominio personalizado')}
                                </h4>
                                <p className="mt-1 text-xs text-q-text-muted">
                                    {t('branding.customDomainDescription', 'Usa un dominio propio y verifica sus registros DNS.')}
                                </p>
                            </div>
                            <Globe size={17} className={hasCustomDomainFeature ? 'text-q-accent' : 'text-q-text-muted'} />
                        </div>

                        {!hasCustomDomainFeature ? (
                            <div className="rounded-lg border border-q-border bg-secondary/30 p-4">
                                <p className="text-sm font-semibold text-foreground">
                                    {t('branding.agencyOnly', 'Disponible en planes Agency')}
                                </p>
                                <p className="mt-1 text-sm text-q-text-muted">
                                    {t('branding.upgradeForDomain', 'Actualiza tu plan para usar tu propio dominio.')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate(ROUTES.SETTINGS_SUBSCRIPTION)}
                                    className="quimera-guide-cta mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                                >
                                    {t('common.viewPlans', 'Ver planes')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {savedCustomDomain ? (
                                    <div className="rounded-lg border border-q-border bg-q-bg p-3.5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {savedCustomDomain}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    {tenantBranding.customDomainVerified ? (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-q-success">
                                                            <Check size={12} />
                                                            {t('branding.verified', 'Verificado')}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-q-accent">
                                                            <AlertCircle size={12} />
                                                            {t('branding.pendingVerification', 'Pendiente de verificación')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {!tenantBranding.customDomainVerified && (
                                                    <button
                                                        type="button"
                                                        onClick={handleVerifyDomain}
                                                        disabled={!canManageSettings || isVerifyingDomain}
                                                        className="quimera-guide-cta inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isVerifyingDomain ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <RefreshCw size={14} />
                                                        )}
                                                        {t('branding.verify', 'Verificar')}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={requestRemoveDomain}
                                                    disabled={!canManageSettings || isRemovingDomain}
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isRemovingDomain ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                    {t('common.delete', 'Eliminar')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <input
                                            type="text"
                                            value={customDomain}
                                            onChange={(e) => setCustomDomain(e.target.value)}
                                            placeholder="portal.tudominio.com"
                                            className={inputClass}
                                            disabled={!canManageSettings || isAddingDomain}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddDomain}
                                            disabled={!customDomain || isAddingDomain || !canManageSettings}
                                            className="quimera-guide-cta inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                        >
                                            {isAddingDomain ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Globe size={16} />
                                            )}
                                            {t('common.add', 'Agregar')}
                                        </button>
                                    </div>
                                )}

                                {dnsRecords && (
                                    <div className="space-y-3 rounded-lg border border-q-border bg-secondary/30 p-4">
                                        <h5 className="text-sm font-semibold text-foreground">
                                            {t('branding.configureDNS', 'Configura estos registros DNS:')}
                                        </h5>
                                        {dnsRecords.cname && (
                                            <DnsRecordRow
                                                type="CNAME"
                                                name={dnsRecords.cname.name}
                                                value={dnsRecords.cname.value}
                                                onCopy={() => copyToClipboard(dnsRecords.cname.value)}
                                            />
                                        )}
                                        {dnsRecords.txt && (
                                            <DnsRecordRow
                                                type={`TXT (${t('branding.verification', 'verificación')})`}
                                                name={dnsRecords.txt.name}
                                                value={dnsRecords.txt.value}
                                                onCopy={() => copyToClipboard(dnsRecords.txt.value)}
                                            />
                                        )}
                                    </div>
                                )}

                                {verificationResult && (
                                    <div className={`rounded-lg border p-3.5 ${verificationResult.verified ? 'border-q-success/30 bg-q-success/10' : 'border-q-accent/30 bg-q-accent/10'}`}>
                                        <div className="mb-1 flex items-center gap-2">
                                            {verificationResult.verified ? (
                                                <Check size={16} className="text-q-success" />
                                            ) : (
                                                <AlertCircle size={16} className="text-q-accent" />
                                            )}
                                            <span className={`text-sm font-semibold ${verificationResult.verified ? 'text-q-success' : 'text-q-accent'}`}>
                                                {verificationResult.verified ? t('branding.verificationSuccess', 'Verificación exitosa') : t('branding.verificationIncomplete', 'Verificación incompleta')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-q-text-muted">
                                            CNAME: {verificationResult.cnameVerified ? 'OK' : 'Pendiente'} · TXT: {verificationResult.txtVerified ? 'OK' : 'Pendiente'}
                                        </p>
                                        {verificationResult.errors && (
                                            <ul className="mt-2 space-y-1 text-xs text-q-text-muted">
                                                {verificationResult.errors.map((err: string, i: number) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {domainError && (
                                    <p className="flex items-center gap-1 text-sm text-destructive">
                                        <AlertCircle size={14} />
                                        {domainError}
                                    </p>
                                )}
                                {domainSuccess && (
                                    <p className="flex items-center gap-1 text-sm text-q-success">
                                        <Check size={14} />
                                        {domainSuccess}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showRemoveDomainModal}
                onConfirm={handleRemoveDomain}
                onCancel={() => setShowRemoveDomainModal(false)}
                title={t('branding.removeDomainTitle', '¿Eliminar dominio?')}
                message={t('branding.removeDomainMessage', '¿Estás seguro de eliminar el dominio personalizado?')}
                variant="danger"
            />
        </div>
    );
};

export default BrandingSettings;
