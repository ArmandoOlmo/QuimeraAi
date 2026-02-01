/**
 * GlobalTrackingPixels Component
 * 
 * Configuración de píxeles de tracking a nivel global de la aplicación.
 * Permite al Super Admin configurar analytics para medir el rendimiento
 * general de Quimera: ventas, conversiones, tráfico, etc.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../../contexts/admin';
import { AdPixelConfig } from '../../../types';
import DashboardSidebar from '../DashboardSidebar';
import { 
    Activity, 
    ExternalLink, 
    CheckCircle, 
    Menu, 
    ArrowLeft,
    BarChart3,
    TrendingUp,
    ShoppingCart,
    Users
} from 'lucide-react';

interface GlobalTrackingPixelsProps {
    onBack?: () => void;
}

const GlobalTrackingPixels: React.FC<GlobalTrackingPixelsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { globalAdPixels, saveGlobalAdPixels } = useAdmin();
    const [localConfig, setLocalConfig] = useState<AdPixelConfig>(globalAdPixels || {});
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (globalAdPixels) {
            setLocalConfig(globalAdPixels);
        }
    }, [globalAdPixels]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveGlobalAdPixels(localConfig);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving global ad pixels:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof AdPixelConfig, value: any) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    // Count active pixels
    const activePixelsCount = [
        localConfig.facebookPixelEnabled && localConfig.facebookPixelId,
        localConfig.googleTagManagerEnabled && localConfig.googleTagManagerId,
        localConfig.googleAdsEnabled && localConfig.googleAdsId,
        localConfig.googleAnalyticsEnabled && localConfig.googleAnalyticsId,
        localConfig.tiktokPixelEnabled && localConfig.tiktokPixelId,
        localConfig.twitterPixelEnabled && localConfig.twitterPixelId,
        localConfig.linkedinEnabled && localConfig.linkedinPartnerId,
        localConfig.pinterestEnabled && localConfig.pinterestTagId,
        localConfig.snapchatEnabled && localConfig.snapchatPixelId,
        localConfig.microsoftUetEnabled && localConfig.microsoftUetId,
        localConfig.redditPixelEnabled && localConfig.redditPixelId,
    ].filter(Boolean).length;

    return (
        <div className="flex h-screen bg-background text-foreground">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 px-4 sm:px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <Activity className="text-purple-500 w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground">
                                {t('superadmin.globalTrackingPixels', 'Píxeles de Tracking Global')}
                            </h1>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 px-4 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                    >
                        {showSuccess && <CheckCircle className="w-4 h-4" />}
                        {isSaving ? t('common.saving', 'Guardando...') : showSuccess ? t('common.saved', 'Guardado') : t('common.saveChanges', 'Guardar Cambios')}
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-secondary/5">
                    <div className="max-w-4xl mx-auto space-y-6">
                        
                        {/* Info Banner */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex gap-3">
                                <BarChart3 className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-medium text-purple-400 mb-1">
                                        {t('superadmin.globalPixelsTitle', 'Analytics de la Plataforma Quimera')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('superadmin.globalPixelsDesc', 'Estos píxeles se inyectarán en toda la aplicación para medir el rendimiento global: registros, suscripciones, uso de la plataforma, conversiones y más.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-card rounded-lg p-4 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                        <Activity className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{activePixelsCount}</p>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.activePixels', 'Píxeles Activos')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card rounded-lg p-4 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{t('superadmin.trackingScope', 'Alcance')}</p>
                                        <p className="text-sm font-medium text-foreground">{t('superadmin.allAppPages', 'Toda la App')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card rounded-lg p-4 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{t('superadmin.trackEvents', 'Eventos')}</p>
                                        <p className="text-sm font-medium text-foreground">{t('superadmin.signupsLogins', 'Registros, Logins')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card rounded-lg p-4 border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{t('superadmin.conversions', 'Conversiones')}</p>
                                        <p className="text-sm font-medium text-foreground">{t('superadmin.subscriptionsSales', 'Suscripciones')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Google Analytics 4 - Primary for App Analytics */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#F9AB00] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M22.84 2.998v17.958c0 1.66-1.36 3.002-3.04 3.002h-.72c-1.68 0-3.04-1.34-3.04-3.002V6.6c0-1.66 1.36-3.002 3.04-3.002h.72c1.68-.6 3.04.74 3.04 2.4zM7.92 11.998v8.958c0 1.66-1.36 3.002-3.04 3.002h-.72c-1.68 0-3.04-1.34-3.04-3.002v-8.958c0-1.66 1.36-3.002 3.04-3.002h.72c1.68 0 3.04 1.34 3.04 3.002zm5.04 4.48a3.04 3.04 0 100 6.08 3.04 3.04 0 000-6.08z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Google Analytics 4</h2>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.ga4Recommended', 'Recomendado para analytics de la app')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('googleAnalyticsEnabled', !localConfig.googleAnalyticsEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.googleAnalyticsEnabled ? 'bg-[#F9AB00]' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.googleAnalyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.googleAnalyticsEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Measurement ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.googleAnalyticsId || ''}
                                            onChange={(e) => updateField('googleAnalyticsId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#F9AB00]/50"
                                            placeholder="G-XXXXXXXXXX"
                                        />
                                    </div>
                                    <a 
                                        href="https://analytics.google.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-[#F9AB00] hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        {t('seo.openGA4', 'Abrir Google Analytics')}
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Google Tag Manager */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#246FDB] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M12.003 0L1.5 6v12l10.503 6L22.5 18V6L12.003 0zm-.003 2.29l8.5 4.86v9.71l-8.5 4.86-8.5-4.86V7.15l8.5-4.86z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Google Tag Manager</h2>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.gtmAdvanced', 'Para configuración avanzada de tags')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('googleTagManagerEnabled', !localConfig.googleTagManagerEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.googleTagManagerEnabled ? 'bg-[#246FDB]' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.googleTagManagerEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.googleTagManagerEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Container ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.googleTagManagerId || ''}
                                            onChange={(e) => updateField('googleTagManagerId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#246FDB]/50"
                                            placeholder="GTM-XXXXXXX"
                                        />
                                    </div>
                                    <a 
                                        href="https://tagmanager.google.com" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-[#246FDB] hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        {t('seo.openGTM', 'Abrir Google Tag Manager')}
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Facebook/Meta Pixel */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Meta Pixel</h2>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.metaForAds', 'Para campañas de adquisición')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('facebookPixelEnabled', !localConfig.facebookPixelEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.facebookPixelEnabled ? 'bg-[#1877F2]' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.facebookPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.facebookPixelEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Pixel ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.facebookPixelId || ''}
                                            onChange={(e) => updateField('facebookPixelId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#1877F2]/50"
                                            placeholder="123456789012345"
                                        />
                                    </div>
                                    <a 
                                        href="https://business.facebook.com/events_manager2" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-[#1877F2] hover:underline"
                                    >
                                        <ExternalLink size={12} />
                                        {t('seo.findInEventManager', 'Buscar en Events Manager')}
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Google Ads */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">G</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">Google Ads</h2>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.gadsConversions', 'Tracking de conversiones de ads')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('googleAdsEnabled', !localConfig.googleAdsEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.googleAdsEnabled ? 'bg-[#4285F4]' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.googleAdsEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.googleAdsEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Google Ads ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.googleAdsId || ''}
                                            onChange={(e) => updateField('googleAdsId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#4285F4]/50"
                                            placeholder="AW-123456789"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TikTok Pixel */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">TikTok Pixel</h2>
                                        <p className="text-xs text-muted-foreground">TikTok Ads</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('tiktokPixelEnabled', !localConfig.tiktokPixelEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.tiktokPixelEnabled ? 'bg-black' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.tiktokPixelEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.tiktokPixelEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Pixel ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.tiktokPixelId || ''}
                                            onChange={(e) => updateField('tiktokPixelId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="XXXXXXXXXXXXXXXX"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* LinkedIn */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">LinkedIn Insight</h2>
                                        <p className="text-xs text-muted-foreground">{t('superadmin.linkedinB2B', 'Ideal para B2B SaaS')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateField('linkedinEnabled', !localConfig.linkedinEnabled)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        localConfig.linkedinEnabled ? 'bg-[#0A66C2]' : 'bg-gray-600'
                                    }`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        localConfig.linkedinEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {localConfig.linkedinEnabled && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Partner ID
                                        </label>
                                        <input
                                            type="text"
                                            value={localConfig.linkedinPartnerId || ''}
                                            onChange={(e) => updateField('linkedinPartnerId', e.target.value)}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/50"
                                            placeholder="123456"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Scripts */}
                        <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                            <h2 className="text-lg font-semibold text-foreground mb-2">
                                {t('seo.customScripts', 'Scripts Personalizados')}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('superadmin.customScriptsGlobal', 'Scripts adicionales para hotjar, intercom, mixpanel, etc.')}
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('seo.customHeadScripts', 'Scripts en <head>')}
                                    </label>
                                    <textarea
                                        value={localConfig.customHeadScripts || ''}
                                        onChange={(e) => updateField('customHeadScripts', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="<script>...</script>"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        {t('seo.customBodyScripts', 'Scripts en <body>')}
                                    </label>
                                    <textarea
                                        value={localConfig.customBodyScripts || ''}
                                        onChange={(e) => updateField('customBodyScripts', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="<script>...</script>"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Active Pixels Summary */}
                        {activePixelsCount > 0 && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-medium text-green-400 mb-2">
                                            {t('seo.activePixels', 'Píxeles Activos')} ({activePixelsCount})
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {localConfig.googleAnalyticsEnabled && localConfig.googleAnalyticsId && (
                                                <span className="px-2 py-1 bg-[#F9AB00]/20 text-[#F9AB00] rounded text-xs">GA4</span>
                                            )}
                                            {localConfig.googleTagManagerEnabled && localConfig.googleTagManagerId && (
                                                <span className="px-2 py-1 bg-[#246FDB]/20 text-[#246FDB] rounded text-xs">GTM</span>
                                            )}
                                            {localConfig.facebookPixelEnabled && localConfig.facebookPixelId && (
                                                <span className="px-2 py-1 bg-[#1877F2]/20 text-[#1877F2] rounded text-xs">Meta</span>
                                            )}
                                            {localConfig.googleAdsEnabled && localConfig.googleAdsId && (
                                                <span className="px-2 py-1 bg-[#4285F4]/20 text-[#4285F4] rounded text-xs">Google Ads</span>
                                            )}
                                            {localConfig.tiktokPixelEnabled && localConfig.tiktokPixelId && (
                                                <span className="px-2 py-1 bg-white/10 text-foreground rounded text-xs">TikTok</span>
                                            )}
                                            {localConfig.linkedinEnabled && localConfig.linkedinPartnerId && (
                                                <span className="px-2 py-1 bg-[#0A66C2]/20 text-[#0A66C2] rounded text-xs">LinkedIn</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalTrackingPixels;



