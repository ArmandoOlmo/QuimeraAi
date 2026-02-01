/**
 * Social Channels Settings
 * Configuration panel for WhatsApp Business, Facebook Messenger, and Instagram DMs
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle, Phone, Instagram, Facebook, Save, Loader2,
    Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Copy,
    Shield, Webhook, Key, Building2, Globe, HelpCircle, RefreshCw,
    Sparkles, Settings2, ChevronDown, ChevronUp
} from 'lucide-react';
import { SocialChannelsConfig, WhatsAppChannelConfig, FacebookMessengerChannelConfig, InstagramChannelConfig } from '../../../types/ai-assistant';
import MetaOAuthConnect from './MetaOAuthConnect';

interface SocialChannelsSettingsProps {
    config: SocialChannelsConfig;
    projectId: string;
    onSave: (config: SocialChannelsConfig) => Promise<void>;
}

type ChannelTab = 'whatsapp' | 'facebook' | 'instagram';
type ConfigMode = 'auto' | 'manual';

const SocialChannelsSettings: React.FC<SocialChannelsSettingsProps> = ({
    config,
    projectId,
    onSave
}) => {
    const { t } = useTranslation();
    const [configMode, setConfigMode] = useState<ConfigMode>('auto');
    const [showManualConfig, setShowManualConfig] = useState(false);
    const [activeChannel, setActiveChannel] = useState<ChannelTab>('whatsapp');
    const [isSaving, setIsSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState<string | null>(null);

    // Check if any channel was auto-configured
    const isAutoConfigured = config.whatsapp?.autoConfigured ||
        config.facebook?.autoConfigured ||
        config.instagram?.autoConfigured;

    // Form state for each channel
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppChannelConfig>({
        enabled: false,
        phoneNumberId: '',
        businessAccountId: '',
        accessToken: '',
        webhookVerifyToken: generateVerifyToken(),
        ...config.whatsapp
    });

    const [facebookConfig, setFacebookConfig] = useState<FacebookMessengerChannelConfig>({
        enabled: false,
        pageId: '',
        pageAccessToken: '',
        webhookVerifyToken: generateVerifyToken(),
        ...config.facebook
    });

    const [instagramConfig, setInstagramConfig] = useState<InstagramChannelConfig>({
        enabled: false,
        accountId: '',
        accessToken: '',
        webhookVerifyToken: generateVerifyToken(),
        ...config.instagram
    });

    // Generate random verify token
    function generateVerifyToken(): string {
        return 'quimera_' + Math.random().toString(36).substring(2, 15);
    }

    // Sync with props
    useEffect(() => {
        if (config.whatsapp) setWhatsappConfig(prev => ({ ...prev, ...config.whatsapp }));
        if (config.facebook) setFacebookConfig(prev => ({ ...prev, ...config.facebook }));
        if (config.instagram) setInstagramConfig(prev => ({ ...prev, ...config.instagram }));
    }, [config]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                whatsapp: whatsappConfig,
                facebook: facebookConfig,
                instagram: instagramConfig
            });
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const toggleSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Get webhook URL based on environment
    const getWebhookUrl = (channel: ChannelTab) => {
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://us-central1-YOUR_PROJECT.cloudfunctions.net'
            : 'https://us-central1-YOUR_PROJECT.cloudfunctions.net';
        return `${baseUrl}/socialChannels-${channel}Webhook`;
    };

    const channels: { id: ChannelTab; name: string; icon: React.ReactNode; color: string; enabled: boolean }[] = [
        { id: 'whatsapp', name: 'WhatsApp Business', icon: <Phone size={20} />, color: 'bg-green-500', enabled: whatsappConfig.enabled },
        { id: 'facebook', name: 'Facebook Messenger', icon: <Facebook size={20} />, color: 'bg-blue-600', enabled: facebookConfig.enabled },
        { id: 'instagram', name: 'Instagram DMs', icon: <Instagram size={20} />, color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', enabled: instagramConfig.enabled },
    ];

    const renderWhatsAppSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                        <Phone size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">WhatsApp Business API</h4>
                        <p className="text-sm text-muted-foreground">Conecta tu número de WhatsApp Business</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={whatsappConfig.enabled}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-green-500 peer-focus:ring-2 peer-focus:ring-green-500/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">Webhook Configuration</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Webhook URL</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('whatsapp')}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('whatsapp'), 'wa-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'wa-webhook' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Verify Token</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={whatsappConfig.webhookVerifyToken}
                                onChange={(e) => setWhatsappConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(whatsappConfig.webhookVerifyToken, 'wa-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'wa-verify' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    API Credentials
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number ID</label>
                    <input
                        type="text"
                        value={whatsappConfig.phoneNumberId}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        placeholder="Ej: 123456789012345"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Encuéntralo en Meta Business Suite → WhatsApp → API Setup
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Business Account ID</label>
                    <input
                        type="text"
                        value={whatsappConfig.businessAccountId}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        placeholder="Ej: 123456789012345"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Access Token</label>
                    <div className="relative">
                        <input
                            type={showSecrets['wa-token'] ? 'text' : 'password'}
                            value={whatsappConfig.accessToken}
                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                            placeholder="Token de acceso permanente"
                            className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('wa-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showSecrets['wa-token'] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Link */}
            <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
                <HelpCircle size={14} />
                Guía de configuración de WhatsApp Business API
                <ExternalLink size={12} />
            </a>
        </div>
    );

    const renderFacebookSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Facebook size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Facebook Messenger</h4>
                        <p className="text-sm text-muted-foreground">Conecta tu página de Facebook</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={facebookConfig.enabled}
                        onChange={(e) => setFacebookConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-600/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">Webhook Configuration</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Callback URL</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('facebook')}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('facebook'), 'fb-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'fb-webhook' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Verify Token</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={facebookConfig.webhookVerifyToken}
                                onChange={(e) => setFacebookConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(facebookConfig.webhookVerifyToken, 'fb-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'fb-verify' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    API Credentials
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">Page ID</label>
                    <input
                        type="text"
                        value={facebookConfig.pageId}
                        onChange={(e) => setFacebookConfig(prev => ({ ...prev, pageId: e.target.value }))}
                        placeholder="ID de tu página de Facebook"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Page Access Token</label>
                    <div className="relative">
                        <input
                            type={showSecrets['fb-token'] ? 'text' : 'password'}
                            value={facebookConfig.pageAccessToken}
                            onChange={(e) => setFacebookConfig(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                            placeholder="Token de acceso de la página"
                            className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('fb-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showSecrets['fb-token'] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Link */}
            <a
                href="https://developers.facebook.com/docs/messenger-platform/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
                <HelpCircle size={14} />
                Guía de configuración de Messenger Platform
                <ExternalLink size={12} />
            </a>
        </div>
    );

    const renderInstagramSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg">
                        <Instagram size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Instagram Direct Messages</h4>
                        <p className="text-sm text-muted-foreground">Conecta tu cuenta de Instagram Business</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={instagramConfig.enabled}
                        onChange={(e) => setInstagramConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-pink-500 peer-focus:ring-2 peer-focus:ring-pink-500/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">Webhook Configuration</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Callback URL</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('instagram')}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('instagram'), 'ig-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'ig-webhook' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Verify Token</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={instagramConfig.webhookVerifyToken}
                                onChange={(e) => setInstagramConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(instagramConfig.webhookVerifyToken, 'ig-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'ig-verify' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    API Credentials
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">Instagram Account ID</label>
                    <input
                        type="text"
                        value={instagramConfig.accountId}
                        onChange={(e) => setInstagramConfig(prev => ({ ...prev, accountId: e.target.value }))}
                        placeholder="ID de tu cuenta de Instagram Business"
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Tu cuenta debe ser una cuenta de Instagram Business conectada a una página de Facebook
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Access Token</label>
                    <div className="relative">
                        <input
                            type={showSecrets['ig-token'] ? 'text' : 'password'}
                            value={instagramConfig.accessToken}
                            onChange={(e) => setInstagramConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                            placeholder="Token de acceso"
                            className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('ig-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showSecrets['ig-token'] ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Link */}
            <a
                href="https://developers.facebook.com/docs/instagram-api/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
                <HelpCircle size={14} />
                Guía de configuración de Instagram Messaging API
                <ExternalLink size={12} />
            </a>
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MessageCircle className="text-primary" size={24} />
                        Social Channels
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Conecta tus redes sociales para responder automáticamente con IA
                    </p>
                </div>
                {showManualConfig && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                )}
            </div>

            {/* Meta OAuth Connect - One Click Setup */}
            <MetaOAuthConnect
                projectId={projectId}
                onConnectionChange={(connected) => {
                    if (connected) {
                        // Refresh config after connection
                        window.location.reload();
                    }
                }}
            />

            {/* Auto-configured notice */}
            {isAutoConfigured && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-green-500" />
                        <span className="font-medium text-green-600">Canales configurados automáticamente</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tus credenciales fueron configuradas mediante la conexión con Meta.
                        Los webhooks están listos para recibir mensajes.
                    </p>
                </div>
            )}

            {/* Manual Configuration Toggle */}
            <button
                onClick={() => setShowManualConfig(!showManualConfig)}
                className="w-full flex items-center justify-between p-4 bg-secondary/30 border border-border rounded-xl hover:bg-secondary/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Settings2 size={18} className="text-muted-foreground" />
                    <div className="text-left">
                        <span className="font-medium text-sm">Configuración Manual</span>
                        <p className="text-xs text-muted-foreground">
                            {showManualConfig ? 'Ocultar configuración avanzada' : 'Mostrar configuración avanzada (opcional)'}
                        </p>
                    </div>
                </div>
                {showManualConfig ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* Manual Configuration Section */}
            {showManualConfig && (
                <>
                    {/* Channel Tabs */}
                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl">
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeChannel === channel.id
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                                    }`}
                            >
                                <span className={`p-1.5 rounded-lg ${channel.color} ${activeChannel === channel.id ? '' : 'opacity-60'}`}>
                                    {React.cloneElement(channel.icon as React.ReactElement, { size: 14, className: 'text-white' })}
                                </span>
                                <span className="hidden sm:inline">{channel.name}</span>
                                {channel.enabled && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Channel Content */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        {activeChannel === 'whatsapp' && renderWhatsAppSettings()}
                        {activeChannel === 'facebook' && renderFacebookSettings()}
                        {activeChannel === 'instagram' && renderInstagramSettings()}
                    </div>
                </>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Shield size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-foreground text-sm">Seguridad de Credenciales</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                        Tus tokens de acceso se almacenan de forma segura y nunca se exponen públicamente.
                        Te recomendamos usar tokens con permisos mínimos necesarios y rotarlos periódicamente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SocialChannelsSettings;

