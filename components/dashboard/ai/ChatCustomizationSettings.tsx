import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { 
    Palette, MessageSquare, 
    Settings as SettingsIcon, Smile, Image as ImageIcon, Zap,
    ChevronDown, X
} from 'lucide-react';
import { ChatAppearanceConfig } from '../../../types';
import { getDefaultAppearanceConfig, THEME_PRESETS, applyThemePreset } from '../../../utils/chatThemes';
import ChatbotWidget from '../../ChatbotWidget';

// Emoji picker simple
const COMMON_EMOJIS = [
    '😊', '💬', '🤖', '💼', '🎯', '⚡', '🚀', '💡', '🌟', '🎨',
    '🔥', '❤️', '👋', '✨', '🎉', '💪', '🌈', '🦄', '🐝', '🌺',
    '📱', '💻', '🎧', '📞', '✉️', '🏆', '🎪', '🎭', '🎪', '🌙'
];

const ChatCustomizationSettings: React.FC = () => {
    const { aiAssistantConfig, saveAiAssistantConfig } = useEditor();
    
    const [config, setConfig] = useState<ChatAppearanceConfig>(
        aiAssistantConfig.appearance || getDefaultAppearanceConfig()
    );
    
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        branding: true,
        colors: false,
        behavior: false,
        messages: false,
        button: false
    });
    
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [newQuickReply, setNewQuickReply] = useState({ text: '', emoji: '' });
    const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

    useEffect(() => {
        if (aiAssistantConfig.appearance) {
            setConfig(aiAssistantConfig.appearance);
        }
    }, [aiAssistantConfig.appearance]);

    // Close color picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (activeColorPicker && !target.closest('.color-picker-wrapper') && !target.closest('.color-preset-modal')) {
                setActiveColorPicker(null);
            }
        };
        if (activeColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [activeColorPicker]);


    const applyPreset = (presetName: keyof typeof THEME_PRESETS) => {
        const newConfig = applyThemePreset(config, presetName);
        setConfig(newConfig);
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
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
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
    };

    const updateColors = (key: string, value: string) => {
        const newConfig = {
            ...config,
            colors: { ...config.colors, [key]: value }
        };
        setConfig(newConfig);
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
    };

    const updateBehavior = (key: string, value: any) => {
        const newConfig = {
            ...config,
            behavior: { ...config.behavior, [key]: value }
        };
        setConfig(newConfig);
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
    };

    const updateMessages = (key: string, value: any) => {
        const newConfig = {
            ...config,
            messages: { ...config.messages, [key]: value }
        };
        setConfig(newConfig);
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
    };

    const updateButton = (key: string, value: any) => {
        const newConfig = {
            ...config,
            button: { ...config.button, [key]: value }
        };
        setConfig(newConfig);
        // Update in real-time
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
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
            saveAiAssistantConfig({
                ...aiAssistantConfig,
                appearance: newConfig
            });
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
        saveAiAssistantConfig({
            ...aiAssistantConfig,
            appearance: newConfig
        });
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
                    <div className={`p-2.5 rounded-lg transition-all ${expandedSections[section] ? 'bg-primary text-white scale-105' : 'bg-secondary/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                        <Icon size={18} />
                    </div>
                    <h3 className={`font-semibold text-base transition-colors ${expandedSections[section] ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>{title}</h3>
                </div>
                <div className={`transition-transform duration-200 ${expandedSections[section] ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} className="text-muted-foreground" />
                </div>
            </button>
            
            <div 
                className={`grid transition-all duration-300 ease-in-out overflow-hidden ${
                    expandedSections[section] ? 'grid-rows-[1fr] opacity-100 pb-7' : 'grid-rows-[0fr] opacity-0'
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

    const PRESET_COLORS = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981',
        '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16', '#f97316', '#dc2626',
        '#1e40af', '#7c3aed', '#be185d', '#991b1b', '#92400e', '#065f46',
        '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#ffffff'
    ];

    const ColorPicker = ({ 
        label, 
        value, 
        onChange 
    }: { 
        label: string; 
        value: string; 
        onChange: (value: string) => void;
    }) => {
        const pickerKey = `color-${label}`;
        const isOpen = activeColorPicker === pickerKey;
        
        return (
            <div className="relative color-picker-wrapper">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">{label}</label>
                <div className="flex items-center gap-2">
                    {/* Color Preview Button */}
                    <button
                        type="button"
                        className="relative w-9 h-9 rounded-md border-2 border-border/50 cursor-pointer hover:border-primary transition-all shadow-sm flex-shrink-0"
                        style={{ backgroundColor: value }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveColorPicker(isOpen ? null : pickerKey);
                        }}
                        title="Click to see color presets"
                    />
                    
                    {/* HEX Input */}
                    <input
                        type="text"
                        value={value.toUpperCase()}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                                onChange(val);
                            }
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2.5 py-1.5 bg-card border border-border/50 rounded-md text-foreground font-mono text-xs focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                        placeholder="#000000"
                    />
                </div>
                
                {/* Preset Colors Modal */}
                {isOpen && (
                    <div 
                        className="color-preset-modal absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-2.5 z-50 w-full min-w-[200px]"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-foreground">Quick Colors</span>
                            <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveColorPicker(null);
                                }}
                                className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    type="button"
                                    key={color}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(color);
                                        setActiveColorPicker(null);
                                    }}
                                    className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                                    style={{ 
                                        backgroundColor: color,
                                        borderColor: value === color ? '#6366f1' : 'rgba(255,255,255,0.1)'
                                    }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Palette className="text-purple-500" />
                        Chat Customization
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Changes are saved automatically as you customize
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Live Preview Active</span>
                </div>
            </div>

            <div className="space-y-6">
                    
                    {/* Theme Presets - Cleaner UI */}
                    <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/10 rounded-2xl p-6">
                        <h3 className="font-bold text-foreground mb-5 flex items-center gap-2">
                            <Zap className="text-purple-500" size={20} />
                            Quick Theme Presets
                        </h3>
                        <div className="grid grid-cols-6 gap-3">
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
                        {/* Branding & Logo */}
                        <AccordionSection title="Branding & Logo" icon={ImageIcon} section="branding">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Logo Type</label>
                                    <div className="flex gap-2">
                                        {['none', 'emoji', 'image'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => updateBranding('logoType', type)}
                                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${
                                                    config.branding.logoType === type
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {config.branding.logoType === 'emoji' && (
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Logo Emoji</label>
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
                                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Logo URL</label>
                                        <input
                                            type="text"
                                            value={config.branding.logoUrl || ''}
                                            onChange={(e) => updateBranding('logoUrl', e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Bot Avatar Emoji</label>
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
                                    <span className="text-sm font-medium text-foreground">Show Bot Avatar</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.branding.showBotAvatar}
                                            onChange={(e) => updateBranding('showBotAvatar', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                    </label>
                                </div>
                            </div>
                        </AccordionSection>

                        {/* Colors */}
                        <AccordionSection title="Colors & Theme" icon={Palette} section="colors">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <ColorPicker 
                                    label="Primary" 
                                    value={config.colors.primaryColor}
                                    onChange={(v) => updateColors('primaryColor', v)}
                                />
                                <ColorPicker 
                                    label="Header BG" 
                                    value={config.colors.headerBackground}
                                    onChange={(v) => updateColors('headerBackground', v)}
                                />
                                <ColorPicker 
                                    label="User Bubble" 
                                    value={config.colors.userBubbleColor}
                                    onChange={(v) => updateColors('userBubbleColor', v)}
                                />
                                <ColorPicker 
                                    label="User Text" 
                                    value={config.colors.userTextColor}
                                    onChange={(v) => updateColors('userTextColor', v)}
                                />
                                <ColorPicker 
                                    label="Bot Bubble" 
                                    value={config.colors.botBubbleColor}
                                    onChange={(v) => updateColors('botBubbleColor', v)}
                                />
                                <ColorPicker 
                                    label="Bot Text" 
                                    value={config.colors.botTextColor}
                                    onChange={(v) => updateColors('botTextColor', v)}
                                />
                                <ColorPicker 
                                    label="Background" 
                                    value={config.colors.backgroundColor}
                                    onChange={(v) => updateColors('backgroundColor', v)}
                                />
                                <ColorPicker 
                                    label="Input BG" 
                                    value={config.colors.inputBackground}
                                    onChange={(v) => updateColors('inputBackground', v)}
                                />
                            </div>
                        </AccordionSection>

                        {/* Behavior */}
                        <AccordionSection title="Position & Behavior" icon={SettingsIcon} section="behavior">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Position</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
                                            <button
                                                key={pos}
                                                onClick={() => updateBehavior('position', pos)}
                                                className={`py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${
                                                    config.behavior.position === pos
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {pos.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Size</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['sm', 'md', 'lg', 'xl'].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => updateBehavior('width', size)}
                                                className={`py-2.5 px-3 rounded-lg font-medium transition-all uppercase text-sm ${
                                                    config.behavior.width === size
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                    <span className="text-sm font-medium text-foreground">Auto-open chat</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.behavior.autoOpen}
                                            onChange={(e) => updateBehavior('autoOpen', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                    </label>
                                </div>

                                {config.behavior.autoOpen && (
                                    <div className="p-4 bg-card border border-border/50 rounded-lg">
                                        <label className="block text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                            Auto-open delay: {config.behavior.autoOpenDelay}s
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
                        <AccordionSection title="Custom Messages" icon={MessageSquare} section="messages">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Welcome Message</label>
                                    <textarea
                                        value={config.messages.welcomeMessage}
                                        onChange={(e) => updateMessages('welcomeMessage', e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-card border border-border/50 rounded-lg text-foreground resize-none focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Input Placeholder</label>
                                    <input
                                        type="text"
                                        value={config.messages.inputPlaceholder}
                                        onChange={(e) => updateMessages('inputPlaceholder', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick Replies</label>
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
                                                placeholder="Add quick reply..."
                                                className="flex-1 px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                            />
                                            <button
                                                onClick={addQuickReply}
                                                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AccordionSection>

                        {/* Button */}
                        <AccordionSection title="Chat Button" icon={Smile} section="button">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Button Style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['circle', 'rounded', 'square'].map((style) => (
                                            <button
                                                key={style}
                                                onClick={() => updateButton('buttonStyle', style)}
                                                className={`py-2.5 px-4 rounded-lg font-medium transition-all capitalize text-sm ${
                                                    config.button.buttonStyle === style
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Button Size</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['sm', 'md', 'lg', 'xl'].map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => updateButton('buttonSize', size)}
                                                className={`py-2.5 px-3 rounded-lg font-medium transition-all uppercase text-sm ${
                                                    config.button.buttonSize === size
                                                        ? 'bg-primary text-white shadow-md'
                                                        : 'bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                                }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-colors">
                                    <span className="text-sm font-medium text-foreground">Pulse Effect</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.button.pulseEffect}
                                            onChange={(e) => updateButton('pulseEffect', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tooltip Text</label>
                                    <input
                                        type="text"
                                        value={config.button.tooltipText}
                                        onChange={(e) => updateButton('tooltipText', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-card border border-border/50 rounded-lg text-foreground focus:ring-1 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </AccordionSection>
                    </div>
                </div>
            </div>
    );
};

export default ChatCustomizationSettings;
