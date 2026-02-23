/**
 * WhiteLabelSettings
 * Configuration panel for agency white-label branding
 * Allows logo/favicon upload, brand colors, custom domain, and email settings
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { TenantBranding } from '../../../types/multiTenant';
import { storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ColorControl from '../../ui/ColorControl';
import { toast } from 'react-hot-toast';
import {
    Shield,
    Upload,
    Image as ImageIcon,
    Globe,
    Mail,
    Building2,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle,
    Trash2,
    Eye,
    Palette,
    ExternalLink,
    Info,
    Sparkles,
} from 'lucide-react';

export function WhiteLabelSettings() {
    const { t } = useTranslation();
    const { currentTenant, updateTenant } = useTenant();

    // Form state
    const [branding, setBranding] = useState<TenantBranding>({
        companyName: '',
        primaryColor: '#4f46e5',
        secondaryColor: '#10b981',
        logoUrl: '',
        faviconUrl: '',
        customDomain: '',
        customDomainVerified: false,
        emailFromName: '',
        emailFromAddress: '',
        footerText: '',
        supportEmail: '',
        supportUrl: '',
    });

    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    // Load existing branding from tenant
    useEffect(() => {
        if (currentTenant?.branding) {
            setBranding(prev => ({
                ...prev,
                ...currentTenant.branding,
            }));
        }
    }, [currentTenant]);

    const updateField = useCallback((field: keyof TenantBranding, value: any) => {
        setBranding(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    }, []);

    // Upload file to Firebase Storage
    const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    }, []);

    // Handle logo upload
    const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentTenant) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error(t('dashboard.agency.whiteLabel.invalidImageType'));
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error(t('dashboard.agency.whiteLabel.fileTooLarge'));
            return;
        }

        setUploadingLogo(true);
        try {
            const url = await uploadFile(file, `tenants/${currentTenant.id}/branding/logo`);
            updateField('logoUrl', url);
            toast.success(t('dashboard.agency.whiteLabel.logoUploaded'));
        } catch (err) {
            console.error('Logo upload error:', err);
            toast.error(t('dashboard.agency.whiteLabel.uploadError'));
        } finally {
            setUploadingLogo(false);
        }
    }, [currentTenant, uploadFile, updateField, t]);

    // Handle favicon upload
    const handleFaviconUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentTenant) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('dashboard.agency.whiteLabel.invalidImageType'));
            return;
        }

        if (file.size > 1 * 1024 * 1024) {
            toast.error(t('dashboard.agency.whiteLabel.fileTooLarge'));
            return;
        }

        setUploadingFavicon(true);
        try {
            const url = await uploadFile(file, `tenants/${currentTenant.id}/branding/favicon`);
            updateField('faviconUrl', url);
            toast.success(t('dashboard.agency.whiteLabel.faviconUploaded'));
        } catch (err) {
            console.error('Favicon upload error:', err);
            toast.error(t('dashboard.agency.whiteLabel.uploadError'));
        } finally {
            setUploadingFavicon(false);
        }
    }, [currentTenant, uploadFile, updateField, t]);

    // Save branding to Firestore
    const handleSave = useCallback(async () => {
        if (!currentTenant) return;

        setSaving(true);
        try {
            await updateTenant(currentTenant.id, { branding });
            setHasChanges(false);
            toast.success(t('dashboard.agency.whiteLabel.saved'));
        } catch (err) {
            console.error('Save branding error:', err);
            toast.error(t('dashboard.agency.whiteLabel.saveError'));
        } finally {
            setSaving(false);
        }
    }, [currentTenant, branding, updateTenant, t]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        {t('dashboard.agency.whiteLabel.title')}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {t('dashboard.agency.whiteLabel.subtitle')}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {saving ? t('common.saving') : t('common.save')}
                </button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                    {t('dashboard.agency.whiteLabel.infoBanner')}
                </p>
            </div>

            {/* ================================================================= */}
            {/* SECTION 1: Company Identity */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.companyIdentity')}
                    </h3>
                </div>
                <div className="p-6 space-y-5">
                    {/* Company Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.companyName')}
                        </label>
                        <input
                            type="text"
                            value={branding.companyName || ''}
                            onChange={(e) => updateField('companyName', e.target.value)}
                            placeholder={t('dashboard.agency.whiteLabel.companyNamePlaceholder')}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>

                    {/* Support Email */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.supportEmail')}
                        </label>
                        <input
                            type="email"
                            value={branding.supportEmail || ''}
                            onChange={(e) => updateField('supportEmail', e.target.value)}
                            placeholder="soporte@tuagencia.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>

                    {/* Support URL */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.supportUrl')}
                        </label>
                        <input
                            type="url"
                            value={branding.supportUrl || ''}
                            onChange={(e) => updateField('supportUrl', e.target.value)}
                            placeholder="https://soporte.tuagencia.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>

                    {/* Footer Text */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.footerText')}
                        </label>
                        <input
                            type="text"
                            value={branding.footerText || ''}
                            onChange={(e) => updateField('footerText', e.target.value)}
                            placeholder={t('dashboard.agency.whiteLabel.footerTextPlaceholder')}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 2: Logo & Favicon */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.logoAndFavicon')}
                    </h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-3">
                                {t('dashboard.agency.whiteLabel.logo')}
                            </label>
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                                {branding.logoUrl ? (
                                    <div className="space-y-3">
                                        <img
                                            src={branding.logoUrl}
                                            alt="Logo"
                                            className="w-24 h-24 object-contain mx-auto rounded-xl bg-muted p-2"
                                        />
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => logoInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                            >
                                                <Upload className="h-3 w-3" />
                                                {t('dashboard.agency.whiteLabel.change')}
                                            </button>
                                            <button
                                                onClick={() => updateField('logoUrl', '')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploadingLogo}
                                        className="w-full py-4 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {uploadingLogo ? (
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        ) : (
                                            <Upload className="h-8 w-8" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {uploadingLogo
                                                ? t('dashboard.agency.whiteLabel.uploading')
                                                : t('dashboard.agency.whiteLabel.uploadLogo')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            PNG, JPG, SVG · Max 2MB
                                        </span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Favicon Upload */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-3">
                                {t('dashboard.agency.whiteLabel.favicon')}
                            </label>
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                                {branding.faviconUrl ? (
                                    <div className="space-y-3">
                                        <img
                                            src={branding.faviconUrl}
                                            alt="Favicon"
                                            className="w-16 h-16 object-contain mx-auto rounded-lg bg-muted p-2"
                                        />
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => faviconInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                            >
                                                <Upload className="h-3 w-3" />
                                                {t('dashboard.agency.whiteLabel.change')}
                                            </button>
                                            <button
                                                onClick={() => updateField('faviconUrl', '')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => faviconInputRef.current?.click()}
                                        disabled={uploadingFavicon}
                                        className="w-full py-4 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {uploadingFavicon ? (
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        ) : (
                                            <Upload className="h-8 w-8" />
                                        )}
                                        <span className="text-sm font-medium">
                                            {uploadingFavicon
                                                ? t('dashboard.agency.whiteLabel.uploading')
                                                : t('dashboard.agency.whiteLabel.uploadFavicon')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            ICO, PNG · 32×32 o 64×64 · Max 1MB
                                        </span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={faviconInputRef}
                                type="file"
                                accept="image/x-icon,image/png,image/svg+xml"
                                onChange={handleFaviconUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 3: Brand Colors */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.brandColors')}
                    </h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ColorControl
                            label={t('dashboard.agency.whiteLabel.primaryColor')}
                            value={branding.primaryColor || '#4f46e5'}
                            onChange={(color) => updateField('primaryColor', color)}
                        />
                        <ColorControl
                            label={t('dashboard.agency.whiteLabel.secondaryColor')}
                            value={branding.secondaryColor || '#10b981'}
                            onChange={(color) => updateField('secondaryColor', color)}
                        />
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 4: Custom Domain */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.customDomain')}
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.domainLabel')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={branding.customDomain || ''}
                                onChange={(e) => updateField('customDomain', e.target.value)}
                                placeholder="app.tuagencia.com"
                                className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            {branding.customDomain && (
                                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${branding.customDomainVerified
                                    ? 'bg-green-500/10 text-green-600'
                                    : 'bg-yellow-500/10 text-yellow-600'
                                    }`}>
                                    {branding.customDomainVerified ? (
                                        <>
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {t('dashboard.agency.whiteLabel.verified')}
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {t('dashboard.agency.whiteLabel.pending')}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {branding.customDomain && !branding.customDomainVerified && (
                        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">
                                {t('dashboard.agency.whiteLabel.dnsInstructions')}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {t('dashboard.agency.whiteLabel.dnsDescription')}
                            </p>
                            <div className="bg-background rounded-lg p-3 border border-border font-mono text-xs text-foreground">
                                <div className="grid grid-cols-3 gap-2 text-muted-foreground mb-2">
                                    <span>{t('dashboard.agency.whiteLabel.dnsType')}</span>
                                    <span>{t('dashboard.agency.whiteLabel.dnsName')}</span>
                                    <span>{t('dashboard.agency.whiteLabel.dnsValue')}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span>CNAME</span>
                                    <span>{branding.customDomain}</span>
                                    <span>quimera.ai</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 5: Email Configuration */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.emailConfig')}
                    </h3>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.emailFromName')}
                        </label>
                        <input
                            type="text"
                            value={branding.emailFromName || ''}
                            onChange={(e) => updateField('emailFromName', e.target.value)}
                            placeholder={t('dashboard.agency.whiteLabel.emailFromNamePlaceholder')}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            {t('dashboard.agency.whiteLabel.emailFromAddress')}
                        </label>
                        <input
                            type="email"
                            value={branding.emailFromAddress || ''}
                            onChange={(e) => updateField('emailFromAddress', e.target.value)}
                            placeholder="noreply@tuagencia.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 6: Live Preview */}
            {/* ================================================================= */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        {t('dashboard.agency.whiteLabel.preview')}
                    </h3>
                </div>
                <div className="p-6">
                    {/* Simulated portal header */}
                    <div className="rounded-xl border border-border overflow-hidden shadow-lg">
                        {/* Portal header bar */}
                        <div
                            className="h-14 flex items-center px-4 gap-3"
                            style={{ backgroundColor: branding.primaryColor || '#4f46e5' }}
                        >
                            {branding.logoUrl ? (
                                <img
                                    src={branding.logoUrl}
                                    alt="Logo"
                                    className="w-8 h-8 rounded-lg object-contain bg-white/20 p-0.5"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                            )}
                            <span className="font-bold text-white text-sm">
                                {branding.companyName || t('dashboard.agency.whiteLabel.companyNamePlaceholder')}
                            </span>
                            <div className="ml-auto flex gap-2">
                                <div className="w-16 h-2 rounded-full bg-white/20" />
                                <div className="w-12 h-2 rounded-full bg-white/20" />
                                <div className="w-14 h-2 rounded-full bg-white/20" />
                            </div>
                        </div>

                        {/* Portal body mockup */}
                        <div className="bg-background p-6 space-y-4">
                            <div className="flex gap-3">
                                <div
                                    className="w-2 h-16 rounded-full"
                                    style={{ backgroundColor: branding.primaryColor || '#4f46e5' }}
                                />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-3/4 rounded bg-muted" />
                                    <div className="h-3 w-1/2 rounded bg-muted" />
                                    <div className="h-3 w-2/3 rounded bg-muted" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                                        <div
                                            className="h-1.5 w-8 rounded-full"
                                            style={{ backgroundColor: branding.secondaryColor || '#10b981' }}
                                        />
                                        <div className="h-2 w-full rounded bg-muted" />
                                        <div className="h-2 w-2/3 rounded bg-muted" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Portal footer */}
                        <div className="border-t border-border px-4 py-2 text-center">
                            <span className="text-[10px] text-muted-foreground">
                                {branding.footerText || `© ${new Date().getFullYear()} ${branding.companyName || t('dashboard.agency.whiteLabel.companyNamePlaceholder')}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Save Button (mobile-friendly) */}
            {hasChanges && (
                <div className="sticky bottom-4 flex justify-center pb-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-xl hover:shadow-2xl transition-all hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4" />
                        )}
                        {saving ? t('common.saving') : t('dashboard.agency.whiteLabel.saveChanges')}
                    </button>
                </div>
            )}
        </div>
    );
}

export default WhiteLabelSettings;
