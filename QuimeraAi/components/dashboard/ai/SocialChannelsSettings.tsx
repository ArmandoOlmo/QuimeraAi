/**
 * Social Channels Settings
 * Configuration panel for WhatsApp Business, Facebook Messenger, and Instagram DMs
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MessageCircle, Phone, Instagram, Facebook, Save, Loader2,
    Eye, EyeOff, CheckCircle, ExternalLink, Copy,
    Shield, Webhook, Key, HelpCircle,
    Sparkles, Settings2, ChevronDown, ChevronUp
} from 'lucide-react';
import { AiSocialChannelsConfig, WhatsAppChannelConfig, FacebookMessengerChannelConfig, InstagramChannelConfig } from '../../../types/ai-assistant';
import MetaOAuthConnect from './MetaOAuthConnect';

interface SocialChannelsSettingsProps {
    config: AiSocialChannelsConfig;
    projectId: string;
    onSave: (config: AiSocialChannelsConfig) => Promise<void>;
}

type ChannelTab = 'whatsapp' | 'facebook' | 'instagram';

const SocialChannelsSettings: React.FC<SocialChannelsSettingsProps> = ({
    config,
    projectId,
    onSave
}) => {
    const { t } = useTranslation();
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
        return `${window.location.origin}/api/social/${channel}/webhook`;
    };

    const channels: { id: ChannelTab; name: string; icon: React.ReactNode; color: string; enabled: boolean }[] = [
        { id: 'whatsapp', name: t('aiAssistant.socialChannels.channels.whatsapp'), icon: <Phone size={20} />, color: 'bg-q-success', enabled: whatsappConfig.enabled },
        { id: 'facebook', name: t('aiAssistant.socialChannels.channels.facebook'), icon: <Facebook size={20} />, color: 'bg-q-accent', enabled: facebookConfig.enabled },
        { id: 'instagram', name: t('aiAssistant.socialChannels.channels.instagram'), icon: <Instagram size={20} />, color: 'bg-gradient-to-br from-q-accent via-q-accent/80 to-q-warning', enabled: instagramConfig.enabled },
    ];

    const renderWhatsAppSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-q-success/10 border border-q-success/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-q-success rounded-lg">
                        <Phone size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">WhatsApp Business API</h4>
                        <p className="text-sm text-q-text-muted">{t('aiAssistant.socialChannels.forms.whatsappDescription')}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={whatsappConfig.enabled}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-q-success peer-focus:ring-2 peer-focus:ring-q-success/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-q-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-q-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">{t('aiAssistant.socialChannels.forms.webhookConfiguration')}</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.webhookUrl')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('whatsapp')}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('whatsapp'), 'wa-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'wa-webhook' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.verifyToken')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={whatsappConfig.webhookVerifyToken}
                                onChange={(e) => setWhatsappConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(whatsappConfig.webhookVerifyToken, 'wa-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'wa-verify' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    {t('aiAssistant.socialChannels.forms.apiCredentials')}
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.phoneNumberId')}</label>
                    <input
                        type="text"
                        value={whatsappConfig.phoneNumberId}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        placeholder={t('aiAssistant.socialChannels.forms.idExample')}
                        className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-q-text-muted mt-1">
                        {t('aiAssistant.socialChannels.forms.whatsappPhoneHelp')}
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.businessAccountId')}</label>
                    <input
                        type="text"
                        value={whatsappConfig.businessAccountId}
                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        placeholder={t('aiAssistant.socialChannels.forms.idExample')}
                        className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.accessToken')}</label>
                    <div className="relative">
                        <input
                            type={showSecrets['wa-token'] ? 'text' : 'password'}
                            value={whatsappConfig.accessToken}
                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                            placeholder={t('aiAssistant.socialChannels.forms.permanentTokenPlaceholder')}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('wa-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-muted hover:text-foreground"
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
                {t('aiAssistant.socialChannels.help.whatsapp')}
                <ExternalLink size={12} />
            </a>
        </div>
    );

    const renderFacebookSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-q-accent/10 border border-q-accent/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-q-accent rounded-lg">
                        <Facebook size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Facebook Messenger</h4>
                        <p className="text-sm text-q-text-muted">{t('aiAssistant.socialChannels.forms.facebookDescription')}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={facebookConfig.enabled}
                        onChange={(e) => setFacebookConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-q-accent peer-focus:ring-2 peer-focus:ring-q-accent/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-q-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-q-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">{t('aiAssistant.socialChannels.forms.webhookConfiguration')}</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.callbackUrl')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('facebook')}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('facebook'), 'fb-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'fb-webhook' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.verifyToken')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={facebookConfig.webhookVerifyToken}
                                onChange={(e) => setFacebookConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(facebookConfig.webhookVerifyToken, 'fb-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'fb-verify' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    {t('aiAssistant.socialChannels.forms.apiCredentials')}
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.pageId')}</label>
                    <input
                        type="text"
                        value={facebookConfig.pageId}
                        onChange={(e) => setFacebookConfig(prev => ({ ...prev, pageId: e.target.value }))}
                        placeholder={t('aiAssistant.socialChannels.forms.pageIdPlaceholder')}
                        className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.pageAccessToken')}</label>
                    <div className="relative">
                        <input
                            type={showSecrets['fb-token'] ? 'text' : 'password'}
                            value={facebookConfig.pageAccessToken}
                            onChange={(e) => setFacebookConfig(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                            placeholder={t('aiAssistant.socialChannels.forms.pageTokenPlaceholder')}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('fb-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-muted hover:text-foreground"
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
                {t('aiAssistant.socialChannels.help.facebook')}
                <ExternalLink size={12} />
            </a>
        </div>
    );

    const renderInstagramSettings = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-q-accent/10 via-q-accent/10 to-q-warning/10 border border-q-accent/20 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-q-accent via-q-accent/80 to-q-warning rounded-lg">
                        <Instagram size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Instagram Direct Messages</h4>
                        <p className="text-sm text-q-text-muted">{t('aiAssistant.socialChannels.forms.instagramDescription')}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={instagramConfig.enabled}
                        onChange={(e) => setInstagramConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-q-accent peer-focus:ring-2 peer-focus:ring-q-accent/50 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-q-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>

            {/* Webhook Info */}
            <div className="p-4 bg-secondary/30 border border-q-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <Webhook size={16} className="text-primary" />
                    <span className="font-medium text-sm">{t('aiAssistant.socialChannels.forms.webhookConfiguration')}</span>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.callbackUrl')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={getWebhookUrl('instagram')}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(getWebhookUrl('instagram'), 'ig-webhook')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'ig-webhook' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-q-text-muted mb-1 block">{t('aiAssistant.socialChannels.forms.verifyToken')}</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={instagramConfig.webhookVerifyToken}
                                onChange={(e) => setInstagramConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                                className="flex-1 bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(instagramConfig.webhookVerifyToken, 'ig-verify')}
                                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                                {copied === 'ig-verify' ? <CheckCircle size={16} className="text-q-success" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    {t('aiAssistant.socialChannels.forms.apiCredentials')}
                </h4>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.instagramAccountId')}</label>
                    <input
                        type="text"
                        value={instagramConfig.accountId}
                        onChange={(e) => setInstagramConfig(prev => ({ ...prev, accountId: e.target.value }))}
                        placeholder={t('aiAssistant.socialChannels.forms.instagramAccountPlaceholder')}
                        className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-q-text-muted mt-1">
                        {t('aiAssistant.socialChannels.forms.instagramAccountHelp')}
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">{t('aiAssistant.socialChannels.forms.accessToken')}</label>
                    <div className="relative">
                        <input
                            type={showSecrets['ig-token'] ? 'text' : 'password'}
                            value={instagramConfig.accessToken}
                            onChange={(e) => setInstagramConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                            placeholder={t('aiAssistant.socialChannels.forms.accessTokenPlaceholder')}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => toggleSecret('ig-token')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-q-text-muted hover:text-foreground"
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
                {t('aiAssistant.socialChannels.help.instagram')}
                <ExternalLink size={12} />
            </a>
        </div>
    );

    return (
        <div className="max-w-3xl space-y-5 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MessageCircle className="text-primary" size={24} />
                        {t('aiAssistant.socialChannels.title')}
                    </h3>
                    <p className="text-sm text-q-text-muted mt-1">
                        {t('aiAssistant.socialChannels.subtitle')}
                    </p>
                </div>
                {showManualConfig && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? t('aiAssistant.socialChannels.saving') : t('aiAssistant.socialChannels.saveChanges')}
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
                <div className="p-4 bg-q-success/10 border border-q-success/20 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-q-success" />
                        <span className="font-medium text-q-success">{t('aiAssistant.socialChannels.autoConfiguredTitle')}</span>
                    </div>
                    <p className="text-sm text-q-text-muted mt-1">
                        {t('aiAssistant.socialChannels.autoConfiguredDescription')}
                    </p>
                </div>
            )}

            {/* Manual Configuration Toggle */}
            <button
                onClick={() => setShowManualConfig(!showManualConfig)}
                className="w-full flex items-center justify-between p-4 bg-secondary/30 border border-q-border rounded-xl hover:bg-secondary/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Settings2 size={18} className="text-q-text-muted" />
                    <div className="text-left">
                        <span className="font-medium text-sm">{t('aiAssistant.socialChannels.manual.title')}</span>
                        <p className="text-xs text-q-text-muted">
                            {showManualConfig
                                ? t('aiAssistant.socialChannels.manual.hide')
                                : t('aiAssistant.socialChannels.manual.show')}
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
                                        ? 'bg-q-surface text-foreground shadow-sm'
                                        : 'text-q-text-muted hover:text-foreground hover:bg-q-surface/50'
                                    }`}
                            >
                                <span className={`p-1.5 rounded-lg text-white ${channel.color} ${activeChannel === channel.id ? '' : 'opacity-60'}`}>
                                    {channel.icon}
                                </span>
                                <span className="hidden sm:inline">{channel.name}</span>
                                {channel.enabled && (
                                    <span className="w-2 h-2 bg-q-success rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Channel Content */}
                    <div className="bg-q-surface border border-q-border rounded-xl p-6">
                        {activeChannel === 'whatsapp' && renderWhatsAppSettings()}
                        {activeChannel === 'facebook' && renderFacebookSettings()}
                        {activeChannel === 'instagram' && renderInstagramSettings()}
                    </div>
                </>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-q-accent/10 border border-q-accent/20 rounded-xl">
                <Shield size={20} className="text-q-accent shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-foreground text-sm">{t('aiAssistant.socialChannels.security.title')}</h4>
                    <p className="text-xs text-q-text-muted mt-1">
                        {t('aiAssistant.socialChannels.security.description')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SocialChannelsSettings;
