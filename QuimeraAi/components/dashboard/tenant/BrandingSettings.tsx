/**
 * BrandingSettings
 * Modern UI for managing tenant branding, portal identity, and custom domain
 */

import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import {
    Palette,
    Image,
    Globe,
    Check,
    X,
    Loader2,
    AlertCircle,
    Copy,
    ExternalLink,
    RefreshCw,
    Trash2,
    Eye,
    Type,
    Sparkles,
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant';
import { useAuth } from '../../../contexts/core/AuthContext';
import { TenantBranding } from '../../../types/multiTenant';
import { functions, httpsCallable } from '../../../firebase';
import ImagePicker from '../../ui/ImagePicker';
import ColorControl from '../../ui/ColorControl';

interface BrandingSettingsProps {
    className?: string;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ className = '' }) => {
    const { t } = useTranslation();
    const { currentTenant, updateTenant, canPerformInTenant } = useTenant();

    // Branding form state
    const [branding, setBranding] = useState<TenantBranding>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Domain state
    const [customDomain, setCustomDomain] = useState('');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [isRemovingDomain, setIsRemovingDomain] = useState(false);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
    const [dnsRecords, setDnsRecords] = useState<any>(null);
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [showRemoveDomainModal, setShowRemoveDomainModal] = useState(false);

    // Load current branding
    useEffect(() => {
        if (currentTenant?.branding) {
            setBranding(currentTenant.branding);
            setCustomDomain(currentTenant.branding.customDomain || '');
        }
    }, [currentTenant]);

    const { isUserOwner } = useAuth();
    const canManageSettings = canPerformInTenant('canManageSettings');

    // Check if tenant has agency plan for custom domains
    const hasCustomDomainFeature = isUserOwner || (currentTenant?.subscriptionPlan &&
        ['agency_starter', 'agency_pro', 'agency_scale', 'enterprise'].includes(currentTenant.subscriptionPlan));

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
            const addPortalDomain = httpsCallable(functions, 'portalDomains-add');
            const result = await addPortalDomain({
                tenantId: currentTenant.id,
                domain: customDomain,
            });

            const data = result.data as any;
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
            const verifyPortalDomain = httpsCallable(functions, 'portalDomains-verify');
            const result = await verifyPortalDomain({
                tenantId: currentTenant.id,
                domain: currentTenant.branding.customDomain,
            });

            const data = result.data as any;
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
            const removePortalDomain = httpsCallable(functions, 'portalDomains-remove');
            await removePortalDomain({ tenantId: currentTenant.id });

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
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-muted-foreground">Cargando...</p>
            </div>
        );
    }

    const primaryColor = branding.primaryColor || '#4f46e5';
    const secondaryColor = branding.secondaryColor || '#10b981';

    return (
        <div className={`space-y-6 ${className}`}>
            {/* ═══════════════════════════════════════════ */}
            {/* CARD 1: Workspace Identity              */}
            {/* ═══════════════════════════════════════════ */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Header with gradient accent */}
                <div className="relative p-5 border-b border-border">
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    }} />
                    <div className="relative flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                            background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
                        }}>
                            <Palette size={20} style={{ color: primaryColor }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('branding.title', 'Identidad del Workspace')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('branding.subtitle', 'Define los colores y nombre de tu marca')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Company Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('branding.companyName', 'Nombre de la empresa')}
                        </label>
                        <input
                            type="text"
                            value={branding.companyName || ''}
                            onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder={currentTenant.name}
                            disabled={!canManageSettings}
                        />
                    </div>

                    {/* Color Pickers — side by side using the app's ColorControl */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('branding.primaryColor', 'Color primario')}
                            </label>
                            <div className="flex items-center gap-3">
                                {/* Live swatch */}
                                <div
                                    className="w-10 h-10 rounded-xl border border-border shadow-inner flex-shrink-0 transition-colors"
                                    style={{ backgroundColor: primaryColor }}
                                />
                                <div className="flex-1">
                                    <ColorControl
                                        label=""
                                        value={primaryColor}
                                        onChange={(val) => setBranding({ ...branding, primaryColor: val })}
                                        paletteColors={[]}
                                        variant="dashboard"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('branding.secondaryColor', 'Color secundario')}
                            </label>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl border border-border shadow-inner flex-shrink-0 transition-colors"
                                    style={{ backgroundColor: secondaryColor }}
                                />
                                <div className="flex-1">
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

                    {/* Live brand preview bar */}
                    <div className="p-4 rounded-xl border border-border bg-background/50">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye size={14} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t('branding.preview', 'Vista previa')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Mini portal header simulation */}
                            <div className="flex-1 h-10 rounded-lg overflow-hidden flex items-center px-3 gap-2" style={{
                                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                            }}>
                                {branding.logoUrl ? (
                                    <img src={branding.logoUrl} alt="logo" className="w-6 h-6 rounded object-cover" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                                        {(branding.companyName || currentTenant.name || 'Q').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="text-white/90 text-sm font-medium truncate">
                                    {branding.companyName || currentTenant.name || 'Mi Empresa'}
                                </span>
                            </div>
                            {/* Mini button preview */}
                            <div
                                className="px-4 py-2 rounded-lg text-white text-xs font-medium"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {t('branding.ctaPreview', 'Botón CTA')}
                            </div>
                        </div>
                    </div>

                    {/* Footer Text */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('branding.footerText', 'Texto del footer')}
                        </label>
                        <input
                            type="text"
                            value={branding.footerText || ''}
                            onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder="© 2024 Mi Empresa. Todos los derechos reservados."
                            disabled={!canManageSettings}
                        />
                    </div>

                    {/* Save Button */}
                    {canManageSettings && (
                        <div className="flex items-center gap-4 pt-4 border-t border-border">
                            {saveError && (
                                <p className="text-sm text-destructive flex items-center gap-1">
                                    <AlertCircle size={14} />
                                    {saveError}
                                </p>
                            )}
                            {saveSuccess && (
                                <p className="text-sm text-green-500 flex items-center gap-1">
                                    <Check size={14} />
                                    {t('common.savedSuccessfully', 'Guardado correctamente')}
                                </p>
                            )}
                            <button
                                onClick={handleSaveBranding}
                                disabled={isSaving}
                                className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
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
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* CARD 2: Visual Assets (Logo + Favicon)   */}
            {/* ═══════════════════════════════════════════ */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Image size={20} className="text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('branding.visualAssets', 'Assets Visuales')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('branding.visualAssetsDesc', 'Logo y favicon de tu marca')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {/* Horizontal layout: Logo + Favicon side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo */}
                        <div className="space-y-3">
                            <ImagePicker
                                label={t('branding.logo', 'Logo de la empresa')}
                                value={branding.logoUrl || ''}
                                onChange={(url) => setBranding({ ...branding, logoUrl: url })}
                                destination="user"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('branding.logoHint', 'Se recomienda 200x200 o superior en formato PNG o SVG')}
                            </p>
                        </div>

                        {/* Favicon */}
                        <div className="space-y-3">
                            <ImagePicker
                                label={t('branding.favicon', 'Favicon')}
                                value={branding.faviconUrl || ''}
                                onChange={(url) => setBranding({ ...branding, faviconUrl: url })}
                                destination="user"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('branding.faviconHint', 'Se recomienda 32x32 o 64x64 píxeles en formato PNG o ICO')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* CARD 3: Domain & Subdomain               */}
            {/* ═══════════════════════════════════════════ */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Globe size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('branding.domainTitle', 'Dominio & Subdominio')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('branding.domainDesc', 'Configura la URL de tu portal de clientes')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-6">
                    {/* ── Quimera Subdomain ── */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Sparkles size={14} className="text-emerald-500" />
                            {t('branding.quimeraSubdomain', 'Subdominio Quimera')}
                            <span className="text-[10px] font-normal text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                {t('common.free', 'Gratis')}
                            </span>
                        </h3>

                        {currentTenant.branding?.quimeraSubdomain ? (
                            <div className="flex items-center justify-between p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Globe size={16} className="text-emerald-500" />
                                    <div>
                                        <p className="font-medium text-foreground text-sm">
                                            {currentTenant.branding.quimeraSubdomain}.quimera.ai
                                        </p>
                                        <p className="text-xs text-emerald-500">
                                            ✓ {t('branding.subdomainActive', 'Activo')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`https://${currentTenant.branding?.quimeraSubdomain}.quimera.ai`);
                                        }}
                                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                                        title="Copiar URL"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <a
                                        href={`https://${currentTenant.branding?.quimeraSubdomain}.quimera.ai`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('branding.noSubdomain', 'Aún no tienes un subdominio. Configura uno para que tu portal esté en tunombre.quimera.ai')}
                            </p>
                        )}

                        {canManageSettings && (
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    {currentTenant.branding?.quimeraSubdomain
                                        ? t('branding.changeSubdomain', 'Cambiar subdominio')
                                        : t('branding.setSubdomain', 'Elegir subdominio')}
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={branding.quimeraSubdomain || ''}
                                            onChange={e => setBranding({
                                                ...branding,
                                                quimeraSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                                            })}
                                            placeholder={currentTenant.name?.toLowerCase().replace(/\s+/g, '-') || 'mi-empresa'}
                                            maxLength={30}
                                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        />
                                    </div>
                                    <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">.quimera.ai</span>
                                </div>
                                {branding.quimeraSubdomain && (
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        Portal: <span className="text-primary font-medium">{branding.quimeraSubdomain}.quimera.ai</span>
                                        {' '}— {t('branding.saveToApply', 'guarda los cambios para aplicar')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* ── Custom Domain ── */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Globe size={14} className="text-primary" />
                            {t('branding.customDomain', 'Dominio Personalizado')}
                        </h3>

                        {!hasCustomDomainFeature ? (
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
                                <Globe size={28} className="text-muted-foreground flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground mb-0.5">
                                        {t('branding.agencyOnly', 'Disponible en planes Agency')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('branding.upgradeForDomain', 'Actualiza tu plan para usar tu propio dominio')}
                                    </p>
                                </div>
                                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                                    {t('common.viewPlans', 'Ver planes')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Current domain status */}
                                {currentTenant.branding?.customDomain && (
                                    <div className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl border border-border">
                                        <div>
                                            <p className="font-medium text-foreground text-sm">
                                                {currentTenant.branding.customDomain}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {currentTenant.branding.customDomainVerified ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-500">
                                                        <Check size={12} />
                                                        {t('branding.verified', 'Verificado')}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-yellow-500">
                                                        <AlertCircle size={12} />
                                                        {t('branding.pendingVerification', 'Pendiente de verificación')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!currentTenant.branding.customDomainVerified && (
                                                <button
                                                    onClick={handleVerifyDomain}
                                                    disabled={isVerifyingDomain}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
                                                onClick={requestRemoveDomain}
                                                disabled={isRemovingDomain}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
                                )}

                                {/* Add domain form */}
                                {!currentTenant.branding?.customDomain && (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={customDomain}
                                            onChange={(e) => setCustomDomain(e.target.value)}
                                            placeholder="portal.tudominio.com"
                                            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            disabled={!canManageSettings || isAddingDomain}
                                        />
                                        <button
                                            onClick={handleAddDomain}
                                            disabled={!customDomain || isAddingDomain || !canManageSettings}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
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

                                {/* DNS Records */}
                                {dnsRecords && (
                                    <div className="space-y-3 p-4 bg-secondary/30 rounded-xl border border-border">
                                        <h4 className="font-medium text-foreground text-sm">
                                            {t('branding.configureDNS', 'Configura estos registros DNS:')}
                                        </h4>

                                        {/* CNAME Record */}
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    CNAME
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(dnsRecords.cname.value)}
                                                    className="p-1 hover:bg-secondary rounded"
                                                >
                                                    <Copy size={12} className="text-muted-foreground" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-foreground font-mono">
                                                <span className="text-muted-foreground">Nombre:</span> {dnsRecords.cname.name}
                                            </p>
                                            <p className="text-xs text-foreground font-mono">
                                                <span className="text-muted-foreground">Valor:</span> {dnsRecords.cname.value}
                                            </p>
                                        </div>

                                        {/* TXT Record */}
                                        <div className="bg-background p-3 rounded-lg border border-border">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    TXT ({t('branding.verification', 'verificación')})
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(dnsRecords.txt.value)}
                                                    className="p-1 hover:bg-secondary rounded"
                                                >
                                                    <Copy size={12} className="text-muted-foreground" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-foreground font-mono">
                                                <span className="text-muted-foreground">Nombre:</span> {dnsRecords.txt.name}
                                            </p>
                                            <p className="text-xs text-foreground font-mono break-all">
                                                <span className="text-muted-foreground">Valor:</span> {dnsRecords.txt.value}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Verification result */}
                                {verificationResult && (
                                    <div className={`p-3.5 rounded-xl ${verificationResult.verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {verificationResult.verified ? (
                                                <Check size={16} className="text-green-500" />
                                            ) : (
                                                <AlertCircle size={16} className="text-yellow-500" />
                                            )}
                                            <span className={`text-sm font-medium ${verificationResult.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                                                {verificationResult.verified ? t('branding.verificationSuccess', 'Verificación exitosa') : t('branding.verificationIncomplete', 'Verificación incompleta')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            CNAME: {verificationResult.cnameVerified ? '✓' : '✗'} |
                                            TXT: {verificationResult.txtVerified ? '✓' : '✗'}
                                        </p>
                                        {verificationResult.errors && (
                                            <ul className="mt-1.5 text-xs text-muted-foreground">
                                                {verificationResult.errors.map((err: string, i: number) => (
                                                    <li key={i}>• {err}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Error/Success messages */}
                                {domainError && (
                                    <p className="text-sm text-destructive flex items-center gap-1">
                                        <AlertCircle size={14} />
                                        {domainError}
                                    </p>
                                )}
                                {domainSuccess && (
                                    <p className="text-sm text-green-500 flex items-center gap-1">
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
