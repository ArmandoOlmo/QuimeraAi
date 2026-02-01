/**
 * BrandingSettings
 * UI for managing tenant branding and custom portal domain
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant';
import { useAuth } from '../../../contexts/core/AuthContext';
import { TenantBranding } from '../../../types/multiTenant';
import { functions, httpsCallable } from '../../../firebase';
import ImagePicker from '../../ui/ImagePicker';

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

    const handleRemoveDomain = async () => {
        if (!currentTenant) return;

        if (!confirm('¿Estás seguro de eliminar el dominio personalizado?')) return;

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

    return (
        <div className={`space-y-8 ${className}`}>
            {/* Branding Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Palette size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('branding.title', 'Branding')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('branding.subtitle', 'Personaliza la apariencia de tu portal')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Company Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('branding.companyName', 'Nombre de la empresa')}
                        </label>
                        <input
                            type="text"
                            value={branding.companyName || ''}
                            onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            placeholder={currentTenant.name}
                            disabled={!canManageSettings}
                        />
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('branding.primaryColor', 'Color primario')}
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={branding.primaryColor || '#4f46e5'}
                                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                    className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                                    disabled={!canManageSettings}
                                />
                                <input
                                    type="text"
                                    value={branding.primaryColor || '#4f46e5'}
                                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
                                    disabled={!canManageSettings}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('branding.secondaryColor', 'Color secundario')}
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={branding.secondaryColor || '#10b981'}
                                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                    className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                                    disabled={!canManageSettings}
                                />
                                <input
                                    type="text"
                                    value={branding.secondaryColor || '#10b981'}
                                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
                                    disabled={!canManageSettings}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <ImagePicker
                            label={t('branding.logo', 'Logo de la empresa')}
                            value={branding.logoUrl || ''}
                            onChange={(url) => setBranding({ ...branding, logoUrl: url })}
                            destination="user"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('branding.logoHint', 'Se recomienda 200x200 o superior en formato PNG o SVG')}
                        </p>
                    </div>

                    {/* Favicon Upload */}
                    <div>
                        <ImagePicker
                            label={t('branding.favicon', 'Favicon')}
                            value={branding.faviconUrl || ''}
                            onChange={(url) => setBranding({ ...branding, faviconUrl: url })}
                            destination="user"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('branding.faviconHint', 'Se recomienda 32x32 o 64x64 píxeles en formato PNG o ICO')}
                        </p>
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
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
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
                                    Guardado correctamente
                                </p>
                            )}
                            <button
                                onClick={handleSaveBranding}
                                disabled={isSaving}
                                className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Guardar cambios
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Domain Section */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                {t('branding.customDomain', 'Dominio Personalizado')}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t('branding.customDomainSubtitle', 'Usa tu propio dominio para el portal de clientes')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {!hasCustomDomainFeature ? (
                        <div className="text-center py-8">
                            <Globe size={40} className="mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                Disponible en planes Agency
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Actualiza a un plan Agency para usar tu propio dominio en el portal.
                            </p>
                            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                Ver planes
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Current domain status */}
                            {currentTenant.branding?.customDomain && (
                                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {currentTenant.branding.customDomain}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {currentTenant.branding.customDomainVerified ? (
                                                <span className="flex items-center gap-1 text-xs text-green-500">
                                                    <Check size={12} />
                                                    Verificado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-yellow-500">
                                                    <AlertCircle size={12} />
                                                    Pendiente de verificación
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
                                                Verificar
                                            </button>
                                        )}
                                        <button
                                            onClick={handleRemoveDomain}
                                            disabled={isRemovingDomain}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        >
                                            {isRemovingDomain ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                            Eliminar
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
                                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                        disabled={!canManageSettings || isAddingDomain}
                                    />
                                    <button
                                        onClick={handleAddDomain}
                                        disabled={!customDomain || isAddingDomain || !canManageSettings}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
                                    >
                                        {isAddingDomain ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Globe size={16} />
                                        )}
                                        Agregar
                                    </button>
                                </div>
                            )}

                            {/* DNS Records */}
                            {dnsRecords && (
                                <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                                    <h4 className="font-medium text-foreground">
                                        Configura estos registros DNS:
                                    </h4>

                                    {/* CNAME Record */}
                                    <div className="bg-background p-4 rounded-lg border border-border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-muted-foreground uppercase">
                                                Registro CNAME
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(dnsRecords.cname.value)}
                                                className="p-1 hover:bg-secondary rounded"
                                            >
                                                <Copy size={14} className="text-muted-foreground" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-foreground font-mono">
                                            <span className="text-muted-foreground">Nombre:</span> {dnsRecords.cname.name}
                                        </p>
                                        <p className="text-sm text-foreground font-mono">
                                            <span className="text-muted-foreground">Valor:</span> {dnsRecords.cname.value}
                                        </p>
                                    </div>

                                    {/* TXT Record */}
                                    <div className="bg-background p-4 rounded-lg border border-border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-muted-foreground uppercase">
                                                Registro TXT (verificación)
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(dnsRecords.txt.value)}
                                                className="p-1 hover:bg-secondary rounded"
                                            >
                                                <Copy size={14} className="text-muted-foreground" />
                                            </button>
                                        </div>
                                        <p className="text-sm text-foreground font-mono">
                                            <span className="text-muted-foreground">Nombre:</span> {dnsRecords.txt.name}
                                        </p>
                                        <p className="text-sm text-foreground font-mono break-all">
                                            <span className="text-muted-foreground">Valor:</span> {dnsRecords.txt.value}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Verification result */}
                            {verificationResult && (
                                <div className={`p-4 rounded-lg ${verificationResult.verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {verificationResult.verified ? (
                                            <Check size={18} className="text-green-500" />
                                        ) : (
                                            <AlertCircle size={18} className="text-yellow-500" />
                                        )}
                                        <span className={`font-medium ${verificationResult.verified ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {verificationResult.verified ? 'Verificación exitosa' : 'Verificación incompleta'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        CNAME: {verificationResult.cnameVerified ? '✓' : '✗'} |
                                        TXT: {verificationResult.txtVerified ? '✓' : '✗'}
                                    </p>
                                    {verificationResult.errors && (
                                        <ul className="mt-2 text-sm text-muted-foreground">
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
    );
};

export default BrandingSettings;






