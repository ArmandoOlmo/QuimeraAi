import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAI } from '../../../contexts/ai/AIContext';
import { useProject } from '../../../contexts/project';
import {
    Palette, MessageSquare,
    Settings as SettingsIcon, Smile, Image as ImageIcon, Zap,
    ChevronDown, X, Upload, Trash2
} from 'lucide-react';
import { ChatAppearanceConfig } from '../../../types';
import { getDefaultAppearanceConfig, THEME_PRESETS, applyThemePreset, buildProjectPreset } from '../../../utils/chatThemes';
import ChatbotWidget from '../../ChatbotWidget';
import EcommerceImagePicker from '../ecommerce/components/EcommerceImagePicker';
import ColorControl from '../../ui/ColorControl';
import { useToast } from '../../../contexts/ToastContext';

// Emoji picker simple
const COMMON_EMOJIS = [
    '😊', '💬', '🤖', '💼', '🎯', '⚡', '🚀', '💡', '🌟', '🎨',
    '🔥', '❤️', '👋', '✨', '🎉', '💪', '🌈', '🦄', '🐝', '🌺',
    '📱', '💻', '🎧', '📞', '✉️', '🏆', '🎪', '🎭', '🎪', '🌙'
];

const ChatCustomizationSettings: React.FC = () => {
    const { aiAssistantConfig, saveAiAssistantConfig } = useAI();
    const { activeProject } = useProject();
    const { t } = useTranslation();
    const { success, error: showError } = useToast();

    const [config, setConfig] = useState<ChatAppearanceConfig>(
        aiAssistantConfig.appearance || getDefaultAppearanceConfig()
    );

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        branding: true,
        behavior: false,
        messages: false,
        button: false
    });

    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [newQuickReply, setNewQuickReply] = useState({ text: '', emoji: '' });
    const [showImagePicker, setShowImagePicker] = useState(false);

    useEffect(() => {
        if (aiAssistantConfig.appearance) {
            setConfig(aiAssistantConfig.appearance);
        }
    }, [aiAssistantConfig.appearance]);

    // Helper to save config with project ID
    const saveConfig = useCallback((newAppearanceConfig: ChatAppearanceConfig) => {
        if (!activeProject?.id) return;
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newAppearanceConfig
        }, activeProject.id);
    }, [activeProject?.id, aiAssistantConfig, saveAiAssistantConfig]);

    const applyPreset = (presetName: keyof typeof THEME_PRESETS) => {
        const newConfig = applyThemePreset(config, presetName);
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    // Build project-colors preset from the active project's theme
    const projectGlobalColors = activeProject?.theme?.globalColors;
    const projectPreset = projectGlobalColors ? buildProjectPreset(projectGlobalColors) : null;

    // Build palette colors array for ColorControl popover
    const projectPaletteColors = projectGlobalColors
        ? Object.values(projectGlobalColors).filter((c): c is string => typeof c === 'string' && c.startsWith('#'))
        : undefined;

    const applyProjectPreset = () => {
        if (!projectPreset) return;
        const newConfig: ChatAppearanceConfig = {
            ...config,
            colors: { ...config.colors, ...projectPreset.colors },
            branding: { ...config.branding, ...projectPreset.branding },
            button: { ...config.button, ...projectPreset.button },
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const updateColor = (key: string, value: string) => {
        const newConfig = {
            ...config,
            colors: { ...config.colors, [key]: value }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateBranding = (key: string, value: any) => {
        const newConfig = {
            ...config,
            branding: { ...config.branding, [key]: value }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const handleImageSelect = (url: string) => {
        updateBranding('logoUrl', url);
        setShowImagePicker(false);
    };

    const updateBehavior = (key: string, value: any) => {
        const newConfig = {
            ...config,
            behavior: { ...config.behavior, [key]: value }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const updateMessages = (key: string, value: any) => {
        const newConfig = {
            ...config,
            messages: { ...config.messages, [key]: value }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const updateButton = (key: string, value: any) => {
        const newConfig = {
            ...config,
            button: { ...config.button, [key]: value }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const addQuickReply = () => {
        if (newQuickReply.text) {
            const newConfig = {
                ...config,
                messages: {
                    ...config.messages,
                    quickReplies: [
                        ...config.messages.quickReplies,
                        { id: Date.now().toString(), ...newQuickReply }
                    ]
                }
            };
            setConfig(newConfig);
            saveConfig(newConfig);
            setNewQuickReply({ text: '', emoji: '' });
        }
    };

    const removeQuickReply = (id: string) => {
        const newConfig = {
            ...config,
            messages: {
                ...config.messages,
                quickReplies: config.messages.quickReplies.filter(qr => qr.id !== id)
            }
        };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const AccordionSection = ({
        title,
        icon: Icon,
        section,
        children
    }: {
        title: string;
        icon: React.ElementType;
        section: string;
        children: React.ReactNode;
    }) => (
        <div className="border-b border-border/30 last:border-0">
            <button
                onClick={() => toggleSection(section)}
                className="w-full py-6 flex items-center justify-between hover:text-primary transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg transition-all ${expandedSections[section] ? 'bg-primary text-primary-foreground scale-105' : 'bg-secondary/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                        <Icon size={18} />
                    </div>
                    <h3 className={`font-semibold text-base transition-colors ${expandedSections[section] ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>{title}</h3>
                </div>
                <div className={`transition-transform duration-200 ${expandedSections[section] ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} className="text-muted-foreground" />
                </div>
            </button>

            <div
                className={`grid transition-all duration-300 ease-in-out overflow-hidden ${expandedSections[section] ? 'grid-rows-[1fr] opacity-100 pb-7' : 'grid-rows-[0fr] opacity-0'
                    }`}
            >
                <div className="min-h-0">
                    <div className="pt-2 space-y-6 px-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Palette className="text-primary" />
                        {t('chatCustomization.title')}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t('chatCustomization.autoSaveNote')}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">{t('chatCustomization.livePreview')}</span>
                </div>
            </div>

            <div className="space-y-6">

                {/* Theme Presets - Cleaner UI */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 rounded-2xl p-4">
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                        <Zap className="text-primary" size={18} />
                        {t('chatCustomization.quickThemePresets')}
                    </h3>
                    <div className="grid grid-cols-7 gap-3">
                        {/* Project Colors preset (highlighted) */}
                        {projectPreset && (
                            <button
                                onClick={applyProjectPreset}
                                className="group flex flex-col items-center p-2 rounded-xl hover:bg-primary/10 transition-all ring-2 ring-primary/30 bg-primary/5"
                            >
                                <div
                                    className="w-12 h-12 rounded-full mb-2 border-2 border-primary group-hover:scale-110 transition-transform shadow-md"
                                    style={{
                                        background: `linear-gradient(135deg, ${projectGlobalColors?.primary || '#4F46E5'} 60%, ${projectGlobalColors?.secondary || '#6366F1'} 100%)`
                                    }}
                                />
                                <span className="text-xs font-bold text-primary">{t('chatCustomization.projectPreset')}</span>
                            </button>
                        )}
                        {Object.keys(THEME_PRESETS).map((presetName) => (
                            <button
                                key={presetName}
                                onClick={() => applyPreset(presetName as keyof typeof THEME_PRESETS)}
                                className="group flex flex-col items-center p-2 rounded-xl hover:bg-secondary/30 transition-all"
                            >
                                <div
                                    className="w-12 h-12 rounded-full mb-2 border-2 border-transparent group-hover:scale-110 transition-transform shadow-sm group-hover:border-primary"
                                    style={{
                                        backgroundColor: THEME_PRESETS[presetName as keyof typeof THEME_PRESETS].colors?.primaryColor
                                    }}
                                />
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground capitalize">{presetName}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Settings Container - Clean & Light */}
                <div className="bg-card/50 border border-border/30 rounded-2xl px-8 py-2 space-y-0 shadow-sm">
                    {/* Color Palette */}
                    <AccordionSection title={t('chatCustomization.colorPalette')} icon={Palette} section="colors">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {[
                                { key: 'primaryColor', label: t('chatCustomization.colors.primary') },
                                { key: 'secondaryColor', label: t('chatCustomization.colors.secondary') },
                                { key: 'headerBackground', label: t('chatCustomization.colors.headerBackground') },
                                { key: 'headerText', label: t('chatCustomization.colors.headerText') },
                                { key: 'userBubbleColor', label: t('chatCustomization.colors.userBubble') },
                                { key: 'userTextColor', label: t('chatCustomization.colors.userText') },
                                { key: 'botBubbleColor', label: t('chatCustomization.colors.botBubble') },
                                { key: 'botTextColor', label: t('chatCustomization.colors.botText') },
                                { key: 'backgroundColor', label: t('chatCustomization.colors.background') },
                                { key: 'inputBackground', label: t('chatCustomization.colors.inputBackground') },
                                { key: 'inputBorder', label: t('chatCustomization.colors.inputBorder') },
                                { key: 'inputText', label: t('chatCustomization.colors.inputText') },
                            ].map(({ key, label }) => (
                                <ColorControl
                                    key={key}
                                    label={label}
                                    value={(config.colors as any)?.[key] || '#000000'}
                                    onChange={(val) => updateColor(key, val)}
                                    paletteColors={projectPaletteColors}
                                />
                            ))}
                        </div>
                    </AccordionSection>

                    {/* Branding & Logo */}
                    <AccordionSection title={t('chatCustomization.brandingAndLogo')} icon={ImageIcon} section="branding">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.logoType')}</label>
                                <div className="flex gap-2">
                                    {['none', 'emoji', 'image'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => updateBranding('logoType', type)}
                                            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${config.branding.logoType === type
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                        >
                                            {t(`chatCustomization.logoTypes.${type}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {config.branding.logoType === 'emoji' && (
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.logoEmoji')}</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowEmojiPicker(showEmojiPicker === 'logo' ? null : 'logo')}
                                            className="w-full px-4 py-5 bg-card border border-border/50 rounded-lg text-3xl text-center hover:border-primary hover:shadow-md transition-all"
                                        >
                                            {config.branding.logoEmoji || '💬'}
                                        </button>
                                        {showEmojiPicker === 'logo' && (
                                            <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-2xl p-4 grid grid-cols-8 gap-2 z-50 max-w-sm">
                                                {COMMON_EMOJIS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => {
                                                            updateBranding('logoEmoji', emoji);
                                                            setShowEmojiPicker(null);
                                                        }}
                                                        className="text-2xl hover:scale-125 transition-transform p-2 hover:bg-secondary/50 rounded-lg"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {config.branding.logoType === 'image' && (
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.logoImage')}</label>

                                    <div className="border border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-3 bg-card/30">
                                        {config.branding.logoUrl ? (
                                            <div className="relative group">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-border shadow-sm bg-white/5">
                                                    <img
                                                        src={config.branding.logoUrl}
                                                        alt={t('chatCustomization.chatLogoAlt')}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => updateBranding('logoUrl', '')}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110"
                                                    title={t('chatCustomization.removeLogo')}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl border border-border bg-secondary/20 flex items-center justify-center text-muted-foreground">
                                                <ImageIcon size={24} className="opacity-50" />
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center gap-2">
                                            <button
                                                onClick={() => setShowImagePicker(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-all"
                                            >
                                                <ImageIcon size={14} />
                                                {config.branding.logoUrl ? t('chatCustomization.changeImage') : t('chatCustomization.selectImage')}
                                            </button>
                                            <p className="text-[10px] text-muted-foreground">
                                                {t('chatCustomization.selectFromLibrary')}
                                            </p>
                                        </div>
                                    </div>

                                    <EcommerceImagePicker
                                        isOpen={showImagePicker}
                                        onClose={() => setShowImagePicker(false)}
                                        onSelect={handleImageSelect}
                                        multiple={false}
                                        currentImages={config.branding.logoUrl ? [config.branding.logoUrl] : []}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.botAvatarEmoji')}</label>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowEmojiPicker(showEmojiPicker === 'bot' ? null : 'bot')}
                                        className="w-full px-4 py-5 bg-card border border-border/50 rounded-lg text-3xl text-center hover:border-primary hover:shadow-md transition-all"
                                    >
                                        {config.branding.botAvatarEmoji || '🤖'}
                                    </button>
                                    {showEmojiPicker === 'bot' && (
                                        <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-2xl p-4 grid grid-cols-8 gap-2 z-50 max-w-sm">
                                            {COMMON_EMOJIS.map((emoji) => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => {
                                                        updateBranding('botAvatarEmoji', emoji);
                                                        setShowEmojiPicker(null);
                                                    }}
                                                    className="text-2xl hover:scale-125 transition-transform p-2 hover:bg-secondary/50 rounded-lg"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-foreground">{t('chatCustomization.showBotAvatar')}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.branding.showBotAvatar}
                                        onChange={(e) => updateBranding('showBotAvatar', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                </label>
                            </div>
                        </div>
                    </AccordionSection>


                    {/* Behavior */}
                    <AccordionSection title={t('chatCustomization.positionAndBehavior')} icon={SettingsIcon} section="behavior">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.position')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                                        <button
                                            key={pos}
                                            onClick={() => updateBehavior('position', pos)}
                                            className={`py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${config.behavior.position === pos
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                        >
                                            {pos.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.size')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['sm', 'md', 'lg', 'xl'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateBehavior('width', size)}
                                            className={`py-2.5 px-3 rounded-lg font-medium transition-all uppercase text-sm ${config.behavior.width === size
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-foreground">{t('chatCustomization.autoOpenChat')}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.behavior.autoOpen}
                                        onChange={(e) => updateBehavior('autoOpen', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                </label>
                            </div>

                            {config.behavior.autoOpen && (
                                <div className="p-4 bg-card border border-border/50 rounded-lg">
                                    <label className="block text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                        {t('chatCustomization.autoOpenDelay', { seconds: config.behavior.autoOpenDelay })}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30"
                                        value={config.behavior.autoOpenDelay}
                                        onChange={(e) => updateBehavior('autoOpenDelay', parseInt(e.target.value))}
                                        className="w-full accent-primary h-2 bg-secondary/50 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </AccordionSection>

                    {/* Messages */}
                    <AccordionSection title={t('chatCustomization.customMessages')} icon={MessageSquare} section="messages">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.welcomeMessage')}</label>
                                <textarea
                                    value={config.messages.welcomeMessage}
                                    onChange={(e) => updateMessages('welcomeMessage', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-card border border-border/50 rounded-lg text-foreground resize-none focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.inputPlaceholder')}</label>
                                <input
                                    type="text"
                                    value={config.messages.inputPlaceholder}
                                    onChange={(e) => updateMessages('inputPlaceholder', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.quickReplies')}</label>
                                <div className="space-y-2">
                                    {config.messages.quickReplies.map((qr) => (
                                        <div key={qr.id} className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                            <span className="text-lg">{qr.emoji}</span>
                                            <span className="flex-1 text-sm text-foreground">{qr.text}</span>
                                            <button
                                                onClick={() => removeQuickReply(qr.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded text-red-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-2">
                                        <input
                                            type="text"
                                            value={newQuickReply.text}
                                            onChange={(e) => setNewQuickReply({ ...newQuickReply, text: e.target.value })}
                                            placeholder={t('chatCustomization.addQuickReplyPlaceholder')}
                                            className="flex-1 px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                        />
                                        <button
                                            onClick={addQuickReply}
                                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                                        >
                                            {t('chatCustomization.add')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionSection>

                    {/* Button */}
                    <AccordionSection title={t('chatCustomization.chatButton')} icon={Smile} section="button">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.buttonStyle')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['circle', 'rounded', 'square'].map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => updateButton('buttonStyle', style)}
                                            className={`py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${config.button.buttonStyle === style
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.buttonSize')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['sm', 'md', 'lg', 'xl'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateButton('buttonSize', size)}
                                            className={`py-2.5 px-3 rounded-lg font-medium transition-all uppercase text-sm ${config.button.buttonSize === size
                                                ? 'bg-primary text-primary-foreground shadow-md'
                                                : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-foreground">{t('chatCustomization.pulseEffect')}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.button.pulseEffect}
                                        onChange={(e) => updateButton('pulseEffect', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('chatCustomization.tooltipText')}</label>
                                <input
                                    type="text"
                                    value={config.button.tooltipText}
                                    onChange={(e) => updateButton('tooltipText', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    </AccordionSection>
                </div >
            </div >
        </div >
    );
};

export default ChatCustomizationSettings;
