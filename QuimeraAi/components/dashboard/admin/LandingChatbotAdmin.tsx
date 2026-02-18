/**
 * LandingChatbotAdmin.tsx
 * Dashboard de administración para el chatbot de la landing page pública de Quimera.ai
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { useAdmin } from '../../../contexts/admin';
import { useUI } from '../../../contexts/core/UIContext';
import DashboardSidebar from '../DashboardSidebar';
import FAQManager from '../ai/FAQManager';
import KnowledgeDocumentUploader from '../ai/KnowledgeDocumentUploader';
import ColorControl from '../../ui/ColorControl';
import {
    Menu,
    Bot,
    MessageSquare,
    Settings,
    Sliders,
    FileText,
    Save,
    Sparkles,
    User,
    Building2,
    Globe,
    Book,
    Activity,
    ChevronRight,
    Clock,
    Mic,
    Radio,
    BookOpen,
    ArrowLeft,
    Package,
    Shield,
    Phone,
    Facebook,
    Instagram,
    Users,
    Zap,
    BarChart3,
    MessageCircle,
    RefreshCw,
    Loader2,
    Power,
    Palette,
    Target,
    DollarSign,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    X,
    Hash,
    ExternalLink,
    Share2
} from 'lucide-react';
import {
    LandingChatbotConfig,
    defaultLandingChatbotConfig,
    ProductFeature,
    PricingPlan,
    ProactiveMessage,
    VoiceName,
    PersonalityTone,
    SalesMode,
    ResponseStyle,
    LandingChatbotColors,
    defaultChatbotColors,
    ColorSource,
    ButtonIconType
} from '../../../types/landingChatbot';
import LandingChatSimulator from './LandingChatSimulator';

// Color presets for quick selection
const colorPresets = [
    // Quimera App preset - applies ALL brand colors automatically
    {
        name: '🦋 Quimera App',
        primary: '#facc15',
        secondary: '#0f172a',
        isAppPreset: true,
        fullColors: {
            headerBackground: '#0f172a',
            headerText: '#facc15',
            botBubbleBackground: '#1e293b',
            botBubbleText: '#f1f5f9',
            userBubbleBackground: '#facc15',
            userBubbleText: '#0f172a',
            background: '#0f172a',
            inputBackground: '#1e293b',
            inputBorder: '#334155',
            inputText: '#f1f5f9',
            buttonBackground: '#facc15',
            buttonIcon: '#0f172a',
            primary: '#facc15',
            mutedText: '#94a3b8',
        }
    },
    { name: 'Quimera Purple', primary: '#6366f1', secondary: '#8b5cf6' },
    { name: 'Ocean Blue', primary: '#0ea5e9', secondary: '#06b6d4' },
    { name: 'Forest Green', primary: '#10b981', secondary: '#059669' },
    { name: 'Sunset Orange', primary: '#f97316', secondary: '#fb923c' },
    { name: 'Rose Pink', primary: '#f43f5e', secondary: '#ec4899' },
    { name: 'Slate Gray', primary: '#64748b', secondary: '#475569' },
    { name: 'Amber Gold', primary: '#f59e0b', secondary: '#d97706' },
    { name: 'Violet', primary: '#8b5cf6', secondary: '#a78bfa' },
];

// Button icon options
const buttonIconOptions: { id: ButtonIconType; label: string; icon: string }[] = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'help', label: 'Ayuda', icon: '❓' },
    { id: 'bot', label: 'Robot', icon: '🤖' },
    { id: 'sparkles', label: 'Sparkles', icon: '✨' },
    { id: 'custom-emoji', label: 'Emoji', icon: '🎨' },
    { id: 'custom-image', label: 'Imagen', icon: '🖼️' },
];

type Tab = 'overview' | 'knowledge' | 'personality' | 'voice' | 'leadCapture' | 'appearance' | 'social' | 'settings';

interface LandingChatbotAdminProps {
    onBack: () => void;
}

const voices: { name: VoiceName; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calma, equilibrada, profesional.', gender: 'Female' },
    { name: 'Puck', description: 'Enérgica, amigable, juvenil.', gender: 'Male' },
    { name: 'Charon', description: 'Profunda, autoritaria, confiable.', gender: 'Male' },
    { name: 'Kore', description: 'Cálida, acogedora, suave.', gender: 'Female' },
    { name: 'Fenrir', description: 'Fuerte, clara, directa.', gender: 'Male' },
];

const LandingChatbotAdmin: React.FC<LandingChatbotAdminProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { landingChatbotConfig, saveLandingChatbotConfig, designTokens } = useAdmin();
    const { setView } = useUI();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [formData, setFormData] = useState<LandingChatbotConfig>(() => {
        // Initialize with merged config, ensuring new fields exist
        const config = landingChatbotConfig || defaultLandingChatbotConfig;
        return {
            ...defaultLandingChatbotConfig,
            ...config,
            appearance: {
                ...defaultLandingChatbotConfig.appearance,
                ...config.appearance,
                // Migrate legacy field if present
                colorSource: (config.appearance as any).colorSource ||
                    ((config.appearance as any).useAppColors !== false ? 'app' : 'custom'),
                customColors: config.appearance.customColors || defaultLandingChatbotConfig.appearance.customColors,
            },
            knowledgeBase: {
                ...defaultLandingChatbotConfig.knowledgeBase,
                ...config.knowledgeBase,
            },
            personality: {
                ...defaultLandingChatbotConfig.personality,
                ...config.personality,
            },
            voice: {
                ...defaultLandingChatbotConfig.voice,
                ...config.voice,
            },
            leadCapture: {
                ...defaultLandingChatbotConfig.leadCapture,
                ...config.leadCapture,
            },
            behavior: {
                ...defaultLandingChatbotConfig.behavior,
                ...config.behavior,
            },
        };
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);
    const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');

    // Sync form data with context ONLY on initial load, not after local changes
    useEffect(() => {
        if (landingChatbotConfig && !hasLocalChanges) {
            const config = landingChatbotConfig;
            setFormData({
                ...defaultLandingChatbotConfig,
                ...config,
                appearance: {
                    ...defaultLandingChatbotConfig.appearance,
                    ...config.appearance,
                    colorSource: (config.appearance as any).colorSource ||
                        ((config.appearance as any).useAppColors !== false ? 'app' : 'custom'),
                    customColors: config.appearance.customColors || defaultLandingChatbotConfig.appearance.customColors,
                },
                knowledgeBase: {
                    ...defaultLandingChatbotConfig.knowledgeBase,
                    ...config.knowledgeBase,
                },
                personality: {
                    ...defaultLandingChatbotConfig.personality,
                    ...config.personality,
                },
                voice: {
                    ...defaultLandingChatbotConfig.voice,
                    ...config.voice,
                },
                leadCapture: {
                    ...defaultLandingChatbotConfig.leadCapture,
                    ...config.leadCapture,
                },
                behavior: {
                    ...defaultLandingChatbotConfig.behavior,
                    ...config.behavior,
                },
            });
        }
    }, [landingChatbotConfig, hasLocalChanges]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log('Saving config:', formData);
            await saveLandingChatbotConfig(formData);
            setHasLocalChanges(false); // Reset after successful save
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving config:', error);
            alert('Error al guardar: ' + (error as Error).message);
        }
        setIsSaving(false);
    };

    const [showRestoreDefaultsModal, setShowRestoreDefaultsModal] = useState(false);

    const handleRestoreDefaults = () => {
        setShowRestoreDefaultsModal(true);
    };

    const confirmRestoreDefaults = async () => {
        setShowRestoreDefaultsModal(false);
        setFormData(defaultLandingChatbotConfig);
        setHasLocalChanges(true);
        // Auto-save after restore
        setIsSaving(true);
        try {
            await saveLandingChatbotConfig(defaultLandingChatbotConfig);
            setHasLocalChanges(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving defaults:', error);
            alert('Error al guardar: ' + (error as Error).message);
        }
        setIsSaving(false);
    };

    const updateForm = <K extends keyof LandingChatbotConfig>(key: K, value: LandingChatbotConfig[K]) => {
        setHasLocalChanges(true);
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const updateNestedForm = <T extends keyof LandingChatbotConfig>(
        section: T,
        key: keyof LandingChatbotConfig[T],
        value: any
    ) => {
        setHasLocalChanges(true);
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [key]: value
            }
        }));
    };

    // Feature management
    const addFeature = () => {
        const newFeature: ProductFeature = {
            id: `feature-${Date.now()}`,
            name: '',
            description: '',
            includedInPlans: []
        };
        updateNestedForm('knowledgeBase', 'productFeatures', [
            ...formData.knowledgeBase.productFeatures,
            newFeature
        ]);
    };

    const updateFeature = (index: number, field: keyof ProductFeature, value: any) => {
        const updated = [...formData.knowledgeBase.productFeatures];
        updated[index] = { ...updated[index], [field]: value };
        updateNestedForm('knowledgeBase', 'productFeatures', updated);
    };

    const removeFeature = (index: number) => {
        const updated = formData.knowledgeBase.productFeatures.filter((_, i) => i !== index);
        updateNestedForm('knowledgeBase', 'productFeatures', updated);
    };

    // Pricing plan management
    const addPricingPlan = () => {
        const newPlan: PricingPlan = {
            id: `plan-${Date.now()}`,
            name: '',
            price: 0,
            currency: 'USD',
            billingCycle: 'monthly',
            description: '',
            features: []
        };
        updateNestedForm('knowledgeBase', 'pricingPlans', [
            ...formData.knowledgeBase.pricingPlans,
            newPlan
        ]);
    };

    const updatePricingPlan = (index: number, field: keyof PricingPlan, value: any) => {
        const updated = [...formData.knowledgeBase.pricingPlans];
        updated[index] = { ...updated[index], [field]: value };
        updateNestedForm('knowledgeBase', 'pricingPlans', updated);
    };

    const removePricingPlan = (index: number) => {
        const updated = formData.knowledgeBase.pricingPlans.filter((_, i) => i !== index);
        updateNestedForm('knowledgeBase', 'pricingPlans', updated);
    };

    // Proactive messages management
    const addProactiveMessage = () => {
        const newMessage: ProactiveMessage = {
            id: `msg-${Date.now()}`,
            enabled: true,
            trigger: 'time',
            triggerValue: 30,
            message: ''
        };
        updateNestedForm('behavior', 'proactiveMessages', [
            ...formData.behavior.proactiveMessages,
            newMessage
        ]);
    };

    const updateProactiveMessage = (index: number, field: keyof ProactiveMessage, value: any) => {
        const updated = [...formData.behavior.proactiveMessages];
        updated[index] = { ...updated[index], [field]: value };
        updateNestedForm('behavior', 'proactiveMessages', updated);
    };

    const removeProactiveMessage = (index: number) => {
        const updated = formData.behavior.proactiveMessages.filter((_, i) => i !== index);
        updateNestedForm('behavior', 'proactiveMessages', updated);
    };

    // High intent keywords management
    const updateHighIntentKeywords = (value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(k => k);
        updateNestedForm('leadCapture', 'highIntentKeywords', keywords);
    };

    // Excluded paths management
    const updateExcludedPaths = (value: string) => {
        const paths = value.split(',').map(p => p.trim()).filter(p => p);
        updateNestedForm('appearance', 'excludedPaths', paths);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Status Card */}
                        <div className={`relative overflow-hidden rounded-2xl border p-6 ${formData.isActive ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                                        <Power size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">
                                            {formData.isActive ? t('landingChatbot.status.active', 'Chatbot Activo') : t('landingChatbot.status.inactive', 'Chatbot Inactivo')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formData.isActive
                                                ? t('landingChatbot.status.activeDesc', 'El chatbot está visible en la landing page pública')
                                                : t('landingChatbot.status.inactiveDesc', 'El chatbot no se muestra a los visitantes')
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateForm('isActive', !formData.isActive)}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-secondary'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${formData.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <MessageCircle size={14} />
                                    {t('landingChatbot.stats.conversations', 'Conversaciones')}
                                </div>
                                <div className="text-2xl font-bold text-primary">0</div>
                                <div className="text-xs text-muted-foreground">Últimos 30 días</div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <Users size={14} />
                                    {t('landingChatbot.stats.leads', 'Leads')}
                                </div>
                                <div className="text-2xl font-bold text-green-500">0</div>
                                <div className="text-xs text-muted-foreground">Capturados por chat</div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <Target size={14} />
                                    {t('landingChatbot.stats.conversion', 'Conversión')}
                                </div>
                                <div className="text-2xl font-bold text-amber-500">0%</div>
                                <div className="text-xs text-muted-foreground">Tasa de conversión</div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <Clock size={14} />
                                    {t('landingChatbot.stats.responseTime', 'Tiempo Respuesta')}
                                </div>
                                <div className="text-2xl font-bold text-blue-500">--</div>
                                <div className="text-xs text-muted-foreground">Promedio</div>
                            </div>
                        </div>

                        {/* Quick Config Status */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Settings size={20} className="text-primary" />
                                {t('landingChatbot.configStatus', 'Estado de Configuración')}
                            </h3>
                            <div className="space-y-3">
                                {/* Knowledge Base */}
                                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${formData.knowledgeBase.companyInfo || formData.knowledgeBase.faqs.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        <span className="text-sm font-medium">{t('landingChatbot.tabs.knowledge', 'Base de Conocimiento')}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${formData.knowledgeBase.companyInfo || formData.knowledgeBase.faqs.length > 0 ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                        {formData.knowledgeBase.faqs.length} FAQs, {formData.knowledgeBase.documents.length} docs
                                    </span>
                                </div>

                                {/* Personality */}
                                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${formData.personality.systemPrompt ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        <span className="text-sm font-medium">{t('landingChatbot.tabs.personality', 'Personalidad')}</span>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded text-primary bg-primary/10 capitalize">
                                        {formData.personality.tone}
                                    </span>
                                </div>

                                {/* Voice */}
                                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${formData.voice.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-sm font-medium">{t('landingChatbot.tabs.voice', 'Voz')}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${formData.voice.enabled ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {formData.voice.enabled ? formData.voice.voiceName : 'Desactivado'}
                                    </span>
                                </div>

                                {/* Lead Capture */}
                                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${formData.leadCapture.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-sm font-medium">{t('landingChatbot.tabs.leadCapture', 'Captura de Leads')}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${formData.leadCapture.enabled ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        {formData.leadCapture.enabled ? 'Activo' : 'Desactivado'}
                                    </span>
                                </div>

                                {/* Appearance */}
                                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium">{t('landingChatbot.tabs.appearance', 'Apariencia')}</span>
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded text-primary bg-primary/10">
                                        {formData.appearance.useAppColors ? 'Colores de App' : 'Personalizado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Identity Preview */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Bot size={20} className="text-primary" />
                                {t('landingChatbot.identity', 'Identidad del Chatbot')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('landingChatbot.agentName', 'Nombre del Agente')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.agentName}
                                        onChange={(e) => updateForm('agentName', e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="Quimera Assistant"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('landingChatbot.agentRole', 'Rol del Agente')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.agentRole}
                                        onChange={(e) => updateForm('agentRole', e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="Sales & Support"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        {t('landingChatbot.welcomeMessage', 'Mensaje de Bienvenida')}
                                    </label>
                                    <textarea
                                        value={formData.welcomeMessage}
                                        onChange={(e) => updateForm('welcomeMessage', e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px] resize-y"
                                        placeholder="¡Hola! 👋 Soy el asistente de Quimera.ai..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'knowledge':
                return (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Company Info */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                                <Building2 size={18} className="text-primary" />
                                {t('landingChatbot.knowledge.companyInfo', 'Información de Quimera.ai')}
                            </label>
                            <textarea
                                className="w-full bg-secondary/30 border border-border rounded-xl p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder="Describe tu empresa, misión, visión, valores..."
                                value={formData.knowledgeBase.companyInfo}
                                onChange={(e) => updateNestedForm('knowledgeBase', 'companyInfo', e.target.value)}
                            />
                        </div>

                        {/* Product Features */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                    <Package size={18} className="text-primary" />
                                    {t('landingChatbot.knowledge.features', 'Funcionalidades del Producto')}
                                </label>
                                <button
                                    onClick={addFeature}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                                >
                                    <Plus size={16} />
                                    Añadir
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.knowledgeBase.productFeatures.map((feature, index) => (
                                    <div key={feature.id} className="p-4 bg-secondary/20 rounded-lg border border-border/50">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="Nombre de la funcionalidad"
                                                    value={feature.name}
                                                    onChange={(e) => updateFeature(index, 'name', e.target.value)}
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Descripción breve"
                                                    value={feature.description}
                                                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeFeature(index)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {formData.knowledgeBase.productFeatures.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay funcionalidades configuradas</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Plans */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
                                    <DollarSign size={18} className="text-primary" />
                                    {t('landingChatbot.knowledge.pricing', 'Planes y Precios')}
                                </label>
                                <button
                                    onClick={addPricingPlan}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                                >
                                    <Plus size={16} />
                                    Añadir Plan
                                </button>
                            </div>
                            <div className="space-y-4">
                                {formData.knowledgeBase.pricingPlans.map((plan, index) => (
                                    <div key={plan.id} className="p-4 bg-secondary/20 rounded-lg border border-border/50">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-3">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre del plan"
                                                        value={plan.name}
                                                        onChange={(e) => updatePricingPlan(index, 'name', e.target.value)}
                                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Precio"
                                                        value={plan.price}
                                                        onChange={(e) => updatePricingPlan(index, 'price', parseFloat(e.target.value))}
                                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                    <select
                                                        value={plan.currency}
                                                        onChange={(e) => updatePricingPlan(index, 'currency', e.target.value)}
                                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    >
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="MXN">MXN</option>
                                                    </select>
                                                    <select
                                                        value={plan.billingCycle}
                                                        onChange={(e) => updatePricingPlan(index, 'billingCycle', e.target.value)}
                                                        className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    >
                                                        <option value="monthly">Mensual</option>
                                                        <option value="yearly">Anual</option>
                                                    </select>
                                                </div>
                                                <textarea
                                                    placeholder="Descripción del plan y características (una por línea)"
                                                    value={plan.features.join('\n')}
                                                    onChange={(e) => updatePricingPlan(index, 'features', e.target.value.split('\n'))}
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[60px] resize-y"
                                                />
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={plan.isPopular || false}
                                                        onChange={(e) => updatePricingPlan(index, 'isPopular', e.target.checked)}
                                                        className="rounded border-border"
                                                    />
                                                    <span className="text-sm text-muted-foreground">Marcar como popular</span>
                                                </label>
                                            </div>
                                            <button
                                                onClick={() => removePricingPlan(index)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {formData.knowledgeBase.pricingPlans.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay planes de precios configurados</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FAQs */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('landingChatbot.knowledge.faqs', 'Preguntas Frecuentes')}
                                </h3>
                            </div>
                            <FAQManager
                                faqs={formData.knowledgeBase.faqs}
                                onFAQsChange={(faqs) => updateNestedForm('knowledgeBase', 'faqs', faqs)}
                            />
                        </div>

                        {/* Knowledge Documents */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={20} className="text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                                    {t('landingChatbot.knowledge.documents', 'Documentos de Conocimiento')}
                                </h3>
                            </div>
                            <KnowledgeDocumentUploader
                                documents={formData.knowledgeBase.documents || []}
                                onDocumentsChange={(docs) => updateNestedForm('knowledgeBase', 'documents', docs)}
                            />
                        </div>

                        {/* Additional Context */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                                <Sparkles size={18} className="text-primary" />
                                {t('landingChatbot.knowledge.additionalContext', 'Contexto Adicional')}
                            </label>
                            <textarea
                                className="w-full bg-secondary/30 border border-border rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                placeholder="Instrucciones adicionales o contexto específico que el chatbot debe conocer..."
                                value={formData.knowledgeBase.additionalContext || ''}
                                onChange={(e) => updateNestedForm('knowledgeBase', 'additionalContext', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'personality':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Tone Selection */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                                <MessageSquare size={18} className="text-primary" />
                                {t('landingChatbot.personality.tone', 'Tono de Comunicación')}
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(['professional', 'friendly', 'enthusiastic', 'technical'] as PersonalityTone[]).map(tone => (
                                    <button
                                        key={tone}
                                        onClick={() => updateNestedForm('personality', 'tone', tone)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all capitalize ${formData.personality.tone === tone ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                    >
                                        {tone === 'professional' && '💼 Profesional'}
                                        {tone === 'friendly' && '😊 Amigable'}
                                        {tone === 'enthusiastic' && '🚀 Entusiasta'}
                                        {tone === 'technical' && '🔧 Técnico'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Response Style */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                                <Sliders size={18} className="text-primary" />
                                {t('landingChatbot.personality.responseStyle', 'Estilo de Respuesta')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['concise', 'detailed'] as ResponseStyle[]).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => updateNestedForm('personality', 'responseStyle', style)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.personality.responseStyle === style ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                    >
                                        {style === 'concise' && '📝 Conciso'}
                                        {style === 'detailed' && '📖 Detallado'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sales Mode */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-4">
                                <Target size={18} className="text-primary" />
                                {t('landingChatbot.personality.salesMode', 'Modo de Ventas')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['soft', 'proactive'] as SalesMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => updateNestedForm('personality', 'salesMode', mode)}
                                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.personality.salesMode === mode ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                    >
                                        {mode === 'soft' && '🤝 Suave - Informativo'}
                                        {mode === 'proactive' && '💪 Proactivo - Orientado a conversión'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Languages */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                                <Globe size={18} className="text-primary" />
                                {t('landingChatbot.personality.languages', 'Idiomas')}
                            </label>
                            <input
                                type="text"
                                value={formData.personality.languages.join(', ')}
                                onChange={(e) => updateNestedForm('personality', 'languages', e.target.value.split(',').map(l => l.trim()))}
                                className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                placeholder="es, en, fr"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Separa los códigos de idioma con comas (ej: es, en, fr)
                            </p>
                        </div>

                        {/* System Prompt */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                                <Bot size={18} className="text-primary" />
                                {t('landingChatbot.personality.systemPrompt', 'Instrucciones del Sistema')}
                            </label>
                            <textarea
                                className="w-full bg-secondary/30 border border-border rounded-xl p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y font-mono text-sm leading-relaxed"
                                value={formData.personality.systemPrompt}
                                onChange={(e) => updateNestedForm('personality', 'systemPrompt', e.target.value)}
                                placeholder="Eres el asistente virtual de Quimera.ai..."
                            />
                        </div>

                        {/* Custom Instructions */}
                        <div className="bg-card border border-border rounded-xl p-6">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider mb-3">
                                <Sparkles size={18} className="text-primary" />
                                {t('landingChatbot.personality.customInstructions', 'Instrucciones Adicionales')}
                            </label>
                            <textarea
                                className="w-full bg-secondary/30 border border-border rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y text-sm leading-relaxed"
                                value={formData.personality.customInstructions || ''}
                                onChange={(e) => updateNestedForm('personality', 'customInstructions', e.target.value)}
                                placeholder="Reglas adicionales o comportamientos específicos..."
                            />
                        </div>
                    </div>
                );

            case 'voice':
                const filteredVoices = voiceGenderFilter === 'all'
                    ? voices
                    : voices.filter(v => v.gender === voiceGenderFilter);

                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Enable Voice Toggle */}
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Mic className="text-primary" />
                                    {t('landingChatbot.voice.enable', 'Habilitar Voz')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Permite a los visitantes interactuar con voz
                                </p>
                            </div>
                            <button
                                onClick={() => updateNestedForm('voice', 'enabled', !formData.voice.enabled)}
                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.voice.enabled ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.voice.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {formData.voice.enabled && (
                            <>
                                {/* Voice Selection */}
                                <div className="bg-card border border-border p-6 rounded-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-sm font-bold text-foreground flex items-center gap-2">
                                            <Radio className="text-primary" />
                                            {t('landingChatbot.voice.select', 'Seleccionar Voz')}
                                        </label>
                                        <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg">
                                            {(['all', 'Male', 'Female'] as const).map((filter) => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setVoiceGenderFilter(filter)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${voiceGenderFilter === filter
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                                        }`}
                                                >
                                                    {filter === 'all' ? 'Todos' : filter === 'Male' ? '♂ Masculino' : '♀ Femenino'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {filteredVoices.map(v => (
                                            <button
                                                key={v.name}
                                                onClick={() => updateNestedForm('voice', 'voiceName', v.name)}
                                                className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voice.voiceName === v.name ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-secondary/10 hover:border-primary/50'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${formData.voice.voiceName === v.name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                                    {v.gender === 'Male' ? '♂' : '♀'}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-foreground">{v.name}</h4>
                                                    <p className="text-xs text-muted-foreground">{v.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Auto-play Greeting */}
                                <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">
                                            {t('landingChatbot.voice.autoPlay', 'Saludo Automático con Voz')}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Reproduce el mensaje de bienvenida con voz automáticamente
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateNestedForm('voice', 'autoPlayGreeting', !formData.voice.autoPlayGreeting)}
                                        className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.voice.autoPlayGreeting ? 'bg-primary' : 'bg-secondary'}`}
                                    >
                                        <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.voice.autoPlayGreeting ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'leadCapture':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Enable Lead Capture */}
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Users className="text-primary" />
                                    {t('landingChatbot.leadCapture.enable', 'Captura de Leads')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Recopila información de contacto de visitantes interesados
                                </p>
                            </div>
                            <button
                                onClick={() => updateNestedForm('leadCapture', 'enabled', !formData.leadCapture.enabled)}
                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.enabled ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {formData.leadCapture.enabled && (
                            <>
                                {/* Trigger Settings */}
                                <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                                    <h3 className="font-bold text-lg">Configuración de Triggers</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                                            Solicitar datos después de X mensajes
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.leadCapture.triggerAfterMessages}
                                            onChange={(e) => updateNestedForm('leadCapture', 'triggerAfterMessages', parseInt(e.target.value))}
                                            className="w-24 bg-secondary/30 border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-t border-border">
                                        <div>
                                            <h4 className="font-medium">Formulario Pre-Chat</h4>
                                            <p className="text-sm text-muted-foreground">Solicitar datos antes de iniciar el chat</p>
                                        </div>
                                        <button
                                            onClick={() => updateNestedForm('leadCapture', 'preChatForm', !formData.leadCapture.preChatForm)}
                                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.preChatForm ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.preChatForm ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-t border-border">
                                        <div>
                                            <h4 className="font-medium">Progressive Profiling</h4>
                                            <p className="text-sm text-muted-foreground">Solicitar datos gradualmente durante la conversación</p>
                                        </div>
                                        <button
                                            onClick={() => updateNestedForm('leadCapture', 'progressiveProfilingEnabled', !formData.leadCapture.progressiveProfilingEnabled)}
                                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.progressiveProfilingEnabled ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.progressiveProfilingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content Gates */}
                                <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                                    <h3 className="font-bold text-lg">Gates de Contenido</h3>

                                    <div className="flex items-center justify-between py-3">
                                        <div>
                                            <h4 className="font-medium">Requerir email para ver precios</h4>
                                            <p className="text-sm text-muted-foreground">Gate de pricing</p>
                                        </div>
                                        <button
                                            onClick={() => updateNestedForm('leadCapture', 'requireEmailForPricing', !formData.leadCapture.requireEmailForPricing)}
                                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.requireEmailForPricing ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.requireEmailForPricing ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-t border-border">
                                        <div>
                                            <h4 className="font-medium">Requerir email para solicitar demo</h4>
                                            <p className="text-sm text-muted-foreground">Gate para demos</p>
                                        </div>
                                        <button
                                            onClick={() => updateNestedForm('leadCapture', 'requireEmailForDemo', !formData.leadCapture.requireEmailForDemo)}
                                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.requireEmailForDemo ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.requireEmailForDemo ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Exit Intent */}
                                <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">Exit Intent</h3>
                                            <p className="text-sm text-muted-foreground">Mostrar oferta cuando el usuario intente salir</p>
                                        </div>
                                        <button
                                            onClick={() => updateNestedForm('leadCapture', 'exitIntentEnabled', !formData.leadCapture.exitIntentEnabled)}
                                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.leadCapture.exitIntentEnabled ? 'bg-primary' : 'bg-secondary'}`}
                                        >
                                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.leadCapture.exitIntentEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {formData.leadCapture.exitIntentEnabled && (
                                        <div>
                                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                                Mensaje de Exit Intent
                                            </label>
                                            <textarea
                                                value={formData.leadCapture.exitIntentOffer}
                                                onChange={(e) => updateNestedForm('leadCapture', 'exitIntentOffer', e.target.value)}
                                                className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px] resize-y"
                                                placeholder="🎁 ¡Espera! Déjame tu email y te envío información exclusiva..."
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* High Intent Keywords */}
                                <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                                    <h3 className="font-bold text-lg">Palabras Clave de Alta Intención</h3>
                                    <p className="text-sm text-muted-foreground">
                                        El chatbot priorizará la captura de leads cuando detecte estas palabras
                                    </p>
                                    <input
                                        type="text"
                                        value={formData.leadCapture.highIntentKeywords.join(', ')}
                                        onChange={(e) => updateHighIntentKeywords(e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="precio, demo, comprar, contratar, plan..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'appearance':
                // Helper to update custom colors
                const updateCustomColor = (colorKey: keyof LandingChatbotColors, value: string) => {
                    setHasLocalChanges(true);
                    setFormData(prev => ({
                        ...prev,
                        appearance: {
                            ...prev.appearance,
                            customColors: {
                                ...prev.appearance.customColors,
                                [colorKey]: value
                            }
                        }
                    }));
                };

                // Apply color preset
                const applyColorPreset = (preset: typeof colorPresets[0]) => {
                    setHasLocalChanges(true);

                    // If preset has fullColors (like Quimera App), apply all colors
                    if ((preset as any).fullColors) {
                        setFormData(prev => ({
                            ...prev,
                            appearance: {
                                ...prev.appearance,
                                customColors: (preset as any).fullColors
                            }
                        }));
                    } else {
                        // For other presets, just apply primary colors
                        setFormData(prev => ({
                            ...prev,
                            appearance: {
                                ...prev.appearance,
                                customColors: {
                                    ...prev.appearance.customColors,
                                    headerBackground: preset.primary,
                                    userBubbleBackground: preset.primary,
                                    buttonBackground: preset.primary,
                                    primary: preset.primary,
                                }
                            }
                        }));
                    }
                };

                // Get current colors (from app or custom)
                const currentColors = formData.appearance.customColors || defaultChatbotColors;
                // Support legacy format
                const colorSource = (formData.appearance as any).colorSource || ((formData.appearance as any).useAppColors ? 'app' : 'custom');

                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Color Source */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Palette className="text-primary" />
                                Fuente de Colores
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => updateNestedForm('appearance', 'colorSource', 'app')}
                                    className={`p-4 rounded-xl border text-left transition-all ${colorSource === 'app' ? 'bg-primary/10 border-primary ring-2 ring-primary/30' : 'bg-secondary/20 border-border hover:border-primary/50'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                                            <Sparkles size={16} className="text-white" />
                                        </div>
                                        <span className="font-medium">Design Tokens</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Usar colores globales de la app</p>
                                </button>

                                <button
                                    onClick={() => updateNestedForm('appearance', 'colorSource', 'custom')}
                                    className={`p-4 rounded-xl border text-left transition-all ${colorSource === 'custom' ? 'bg-primary/10 border-primary ring-2 ring-primary/30' : 'bg-secondary/20 border-border hover:border-primary/50'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                            <Palette size={16} className="text-white" />
                                        </div>
                                        <span className="font-medium">Personalizados</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Definir colores específicos</p>
                                </button>
                            </div>
                        </div>

                        {/* Custom Colors - Only show when colorSource is 'custom' */}
                        {colorSource === 'custom' && (
                            <div className="bg-card border border-border p-6 rounded-xl space-y-5">
                                <h3 className="font-bold text-lg">Personalizar Colores</h3>

                                {/* Quick Presets */}
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-3">Presets Rápidos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {colorPresets.map(preset => (
                                            <button
                                                key={preset.name}
                                                onClick={() => applyColorPreset(preset)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-primary/50 bg-secondary/20 transition-all text-xs"
                                                title={preset.name}
                                            >
                                                <div
                                                    className="w-4 h-4 rounded-full ring-1 ring-black/10"
                                                    style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}
                                                />
                                                <span>{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color Groups */}
                                <div className="space-y-4 pt-2">
                                    {/* Header Colors */}
                                    <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                        <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Header</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorControl
                                                label="Fondo"
                                                value={currentColors.headerBackground}
                                                onChange={(value) => updateCustomColor('headerBackground', value)}
                                            />
                                            <ColorControl
                                                label="Texto"
                                                value={currentColors.headerText}
                                                onChange={(value) => updateCustomColor('headerText', value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Message Bubbles */}
                                    <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                        <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Mensajes</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorControl
                                                label="Burbuja Bot"
                                                value={currentColors.botBubbleBackground}
                                                onChange={(value) => updateCustomColor('botBubbleBackground', value)}
                                            />
                                            <ColorControl
                                                label="Burbuja Usuario"
                                                value={currentColors.userBubbleBackground}
                                                onChange={(value) => updateCustomColor('userBubbleBackground', value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Button & Accent */}
                                    <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                        <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Botón Flotante</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorControl
                                                label="Fondo del Botón"
                                                value={currentColors.buttonBackground}
                                                onChange={(value) => updateCustomColor('buttonBackground', value)}
                                            />
                                            <ColorControl
                                                label="Ícono del Botón"
                                                value={currentColors.buttonIcon}
                                                onChange={(value) => updateCustomColor('buttonIcon', value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Background Colors */}
                                    <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                        <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">Fondos</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <ColorControl
                                                label="Chat Background"
                                                value={currentColors.background}
                                                onChange={(value) => updateCustomColor('background', value)}
                                            />
                                            <ColorControl
                                                label="Input Background"
                                                value={currentColors.inputBackground}
                                                onChange={(value) => updateCustomColor('inputBackground', value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Reset Button */}
                                    <button
                                        onClick={() => updateNestedForm('appearance', 'customColors', { ...defaultChatbotColors })}
                                        className="w-full py-2 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary/30 transition-colors"
                                    >
                                        <RefreshCw size={14} className="inline mr-2" />
                                        Restaurar colores por defecto
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Position & Size */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                            <h3 className="font-bold text-lg">Posición y Tamaño</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Posición</label>
                                    <select
                                        value={formData.appearance.position}
                                        onChange={(e) => updateNestedForm('appearance', 'position', e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                    >
                                        <option value="bottom-right">Abajo Derecha</option>
                                        <option value="bottom-left">Abajo Izquierda</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Tamaño</label>
                                    <select
                                        value={formData.appearance.size}
                                        onChange={(e) => updateNestedForm('appearance', 'size', e.target.value)}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                    >
                                        <option value="sm">Pequeño</option>
                                        <option value="md">Mediano</option>
                                        <option value="lg">Grande</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Offset X (px)</label>
                                    <input
                                        type="number"
                                        value={formData.appearance.offsetX}
                                        onChange={(e) => updateNestedForm('appearance', 'offsetX', parseInt(e.target.value))}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Offset Y (px)</label>
                                    <input
                                        type="number"
                                        value={formData.appearance.offsetY}
                                        onChange={(e) => updateNestedForm('appearance', 'offsetY', parseInt(e.target.value))}
                                        className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Avatar / Logo */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    {formData.appearance.avatarUrl ? (
                                        <img src={formData.appearance.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <Bot size={20} className="text-primary" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Logo / Avatar del Bot</h3>
                                    <p className="text-sm text-muted-foreground">Aparece en el header y junto a los mensajes</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">URL del Logo</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="url"
                                            value={formData.appearance.avatarUrl || ''}
                                            onChange={(e) => updateNestedForm('appearance', 'avatarUrl', e.target.value)}
                                            className="flex-1 bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                            placeholder="https://ejemplo.com/mi-logo.png"
                                        />
                                        {formData.appearance.avatarUrl && (
                                            <button
                                                onClick={() => updateNestedForm('appearance', 'avatarUrl', '')}
                                                className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                                title="Eliminar logo"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Recomendado: PNG, SVG o JPG cuadrado (mínimo 64x64px). Se mostrará en círculo.
                                    </p>
                                </div>

                                {/* Preview */}
                                {formData.appearance.avatarUrl && (
                                    <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                        <p className="text-xs font-medium text-muted-foreground mb-3">Vista previa:</p>
                                        <div className="flex items-center gap-6">
                                            {/* Header preview */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 overflow-hidden flex items-center justify-center shrink-0">
                                                    <img
                                                        src={formData.appearance.avatarUrl}
                                                        alt="Header preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">Header</span>
                                            </div>
                                            {/* Message preview */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-secondary/50 border border-border overflow-hidden flex items-center justify-center shrink-0">
                                                    <img
                                                        src={formData.appearance.avatarUrl}
                                                        alt="Message preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">Mensajes</span>
                                            </div>
                                            {/* Button preview (if using custom-image) */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                                                    <img
                                                        src={formData.appearance.avatarUrl}
                                                        alt="Button preview"
                                                        className="w-7 h-7 object-contain"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground">Botón</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quick logos */}
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Logos rápidos:</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => updateNestedForm('appearance', 'avatarUrl', '/quimera-logo.svg')}
                                            className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors flex items-center gap-2"
                                        >
                                            <img src="/quimera-logo.svg" alt="Quimera" className="w-4 h-4" />
                                            Quimera
                                        </button>
                                        <button
                                            onClick={() => updateNestedForm('appearance', 'avatarUrl', '')}
                                            className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Bot size={14} />
                                            Ícono por defecto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Button Style & Icon */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-5">
                            <h3 className="font-bold text-lg">Estilo del Botón</h3>

                            {/* Button Shape */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-3">Forma</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['circle', 'rounded', 'square'] as const).map(style => (
                                        <button
                                            key={style}
                                            onClick={() => updateNestedForm('appearance', 'buttonStyle', style)}
                                            className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.appearance.buttonStyle === style ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                        >
                                            {style === 'circle' && '⬤ Círculo'}
                                            {style === 'rounded' && '▢ Redondeado'}
                                            {style === 'square' && '■ Cuadrado'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Button Icon */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-3">Ícono del Botón</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {buttonIconOptions.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => updateNestedForm('appearance', 'buttonIcon', option.id)}
                                            className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${formData.appearance.buttonIcon === option.id ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border hover:border-primary/50'}`}
                                        >
                                            <span className="text-lg">{option.icon}</span>
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Emoji Input */}
                            {formData.appearance.buttonIcon === 'custom-emoji' && (
                                <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Emoji personalizado</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={formData.appearance.customEmoji || ''}
                                            onChange={(e) => updateNestedForm('appearance', 'customEmoji', e.target.value)}
                                            className="w-20 bg-background border border-border rounded-lg p-3 text-3xl text-center focus:ring-2 focus:ring-primary/50 outline-none"
                                            placeholder="🦋"
                                            maxLength={2}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {['🦋', '🚀', '💬', '✨', '🤖', '💡', '🎯', '⚡'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => updateNestedForm('appearance', 'customEmoji', emoji)}
                                                    className={`w-10 h-10 rounded-lg border text-xl flex items-center justify-center transition-all ${formData.appearance.customEmoji === emoji ? 'bg-primary/20 border-primary' : 'bg-secondary/20 border-border hover:border-primary/50'}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Custom Image Input */}
                            {formData.appearance.buttonIcon === 'custom-image' && (
                                <div className="p-4 bg-secondary/10 rounded-lg border border-border/50">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">URL de imagen personalizada</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="url"
                                            value={formData.appearance.customIconUrl || ''}
                                            onChange={(e) => updateNestedForm('appearance', 'customIconUrl', e.target.value)}
                                            className="flex-1 bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                            placeholder="https://ejemplo.com/icono.png"
                                        />
                                        {formData.appearance.customIconUrl && (
                                            <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-secondary/30 flex items-center justify-center">
                                                <img
                                                    src={formData.appearance.customIconUrl}
                                                    alt="Custom icon"
                                                    className="w-8 h-8 object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Recomendado: PNG o SVG de 64x64px con fondo transparente
                                    </p>
                                </div>
                            )}

                            {/* Pulse Effect */}
                            <div className="flex items-center justify-between py-3 border-t border-border">
                                <div>
                                    <h4 className="font-medium">Efecto de Pulso</h4>
                                    <p className="text-sm text-muted-foreground">Animar el botón para atraer atención</p>
                                </div>
                                <button
                                    onClick={() => updateNestedForm('appearance', 'pulseEffect', !formData.appearance.pulseEffect)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.appearance.pulseEffect ? 'bg-primary' : 'bg-secondary'}`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.appearance.pulseEffect ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Page Visibility */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                            <h3 className="font-bold text-lg">Visibilidad por Página</h3>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <h4 className="font-medium">Mostrar en todas las páginas</h4>
                                    <p className="text-sm text-muted-foreground">Excepto las rutas excluidas</p>
                                </div>
                                <button
                                    onClick={() => updateNestedForm('appearance', 'showOnAllPages', !formData.appearance.showOnAllPages)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.appearance.showOnAllPages ? 'bg-primary' : 'bg-secondary'}`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.appearance.showOnAllPages ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Rutas Excluidas
                                </label>
                                <input
                                    type="text"
                                    value={formData.appearance.excludedPaths.join(', ')}
                                    onChange={(e) => updateExcludedPaths(e.target.value)}
                                    className="w-full bg-secondary/30 border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                                    placeholder="/login, /register, /dashboard"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Separa las rutas con comas
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'social':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-card border border-border p-6 rounded-xl">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Share2 className="text-primary" />
                                Canales Sociales
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Conecta el chatbot con las redes sociales de Quimera.ai
                            </p>

                            {/* WhatsApp */}
                            <div className="p-4 bg-secondary/20 rounded-lg border border-border/50 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                            <Phone size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">WhatsApp Business</h4>
                                            <p className="text-sm text-muted-foreground">Conectar con WhatsApp</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded-full">
                                        Próximamente
                                    </span>
                                </div>
                            </div>

                            {/* Facebook */}
                            <div className="p-4 bg-secondary/20 rounded-lg border border-border/50 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                            <Facebook size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Facebook Messenger</h4>
                                            <p className="text-sm text-muted-foreground">Conectar con Messenger</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded-full">
                                        Próximamente
                                    </span>
                                </div>
                            </div>

                            {/* Instagram */}
                            <div className="p-4 bg-secondary/20 rounded-lg border border-border/50">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
                                            <Instagram size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">Instagram DMs</h4>
                                            <p className="text-sm text-muted-foreground">Conectar con Instagram</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded-full">
                                        Próximamente
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Active/Inactive Toggle */}
                        <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Power className="text-primary" />
                                    {t('landingChatbot.settings.activate', 'Activar Chatbot')}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Mostrar el chatbot en la landing page pública
                                </p>
                            </div>
                            <button
                                onClick={() => updateForm('isActive', !formData.isActive)}
                                className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-primary' : 'bg-secondary'}`}
                            >
                                <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {/* Model Parameters */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Sliders className="text-primary" />
                                {t('landingChatbot.settings.modelParams', 'Parámetros del Modelo')}
                            </h3>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Temperatura (Creatividad)</label>
                                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">{formData.behavior.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={formData.behavior.temperature}
                                    onChange={(e) => updateNestedForm('behavior', 'temperature', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Preciso</span>
                                    <span>Equilibrado</span>
                                    <span>Creativo</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Max Tokens</label>
                                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">{formData.behavior.maxTokens}</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="2000"
                                    step="100"
                                    value={formData.behavior.maxTokens}
                                    onChange={(e) => updateNestedForm('behavior', 'maxTokens', parseInt(e.target.value))}
                                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Auto Open */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">Abrir Automáticamente</h3>
                                    <p className="text-sm text-muted-foreground">Abrir el chat automáticamente después de X segundos</p>
                                </div>
                                <button
                                    onClick={() => updateNestedForm('behavior', 'autoOpen', !formData.behavior.autoOpen)}
                                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.behavior.autoOpen ? 'bg-primary' : 'bg-secondary'}`}
                                >
                                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.behavior.autoOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {formData.behavior.autoOpen && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Delay (segundos)
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="120"
                                        value={formData.behavior.autoOpenDelay}
                                        onChange={(e) => updateNestedForm('behavior', 'autoOpenDelay', parseInt(e.target.value))}
                                        className="w-24 bg-secondary/30 border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Proactive Messages */}
                        <div className="bg-card border border-border p-6 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg">Mensajes Proactivos</h3>
                                <button
                                    onClick={addProactiveMessage}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                                >
                                    <Plus size={16} />
                                    Añadir
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.behavior.proactiveMessages.map((msg, index) => (
                                    <div key={msg.id} className="p-4 bg-secondary/20 rounded-lg border border-border/50">
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => updateProactiveMessage(index, 'enabled', !msg.enabled)}
                                                className={`mt-1 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${msg.enabled ? 'bg-primary' : 'bg-secondary'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${msg.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                            <div className="flex-1 space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select
                                                        value={msg.trigger}
                                                        onChange={(e) => updateProactiveMessage(index, 'trigger', e.target.value)}
                                                        className="bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    >
                                                        <option value="time">Tiempo (segundos)</option>
                                                        <option value="scroll">Scroll (%)</option>
                                                        <option value="exit-intent">Exit Intent</option>
                                                        <option value="page">Página específica</option>
                                                    </select>
                                                    <input
                                                        type={msg.trigger === 'page' ? 'text' : 'number'}
                                                        placeholder={msg.trigger === 'page' ? '/pricing' : '30'}
                                                        value={msg.triggerValue}
                                                        onChange={(e) => updateProactiveMessage(index, 'triggerValue', msg.trigger === 'page' ? e.target.value : parseInt(e.target.value))}
                                                        className="bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                                    />
                                                </div>
                                                <textarea
                                                    placeholder="Mensaje proactivo..."
                                                    value={msg.message}
                                                    onChange={(e) => updateProactiveMessage(index, 'message', e.target.value)}
                                                    className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[60px] resize-y"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeProactiveMessage(index)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {formData.behavior.proactiveMessages.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No hay mensajes proactivos configurados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 px-2 sm:px-6 border-b border-border flex items-center justify-between bg-background z-20 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border/40 rounded-full transition-colors"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Bot className="text-primary w-5 h-5" />
                            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                                {t('landingChatbot.title', 'Landing Page Chatbot')}
                            </h1>
                            {formData.isActive && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    Activo
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {showSuccess && (
                            <span className="text-sm text-green-500 flex items-center animate-fade-in-up">
                                <CheckCircle size={16} className="mr-1.5" />
                                <span className="hidden sm:inline">Guardado</span>
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-1.5 h-9 px-2 sm:px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${hasLocalChanges
                                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{isSaving ? 'Guardando...' : hasLocalChanges ? 'Guardar Cambios' : 'Guardar'}</span>
                        </button>
                        <button
                            onClick={handleRestoreDefaults}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:border sm:border-border text-sm font-medium transition-all sm:hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-50"
                            title="Restaurar valores por defecto"
                        >
                            <RefreshCw size={14} />
                            <span className="hidden sm:inline">Defaults</span>
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3 rounded-lg sm:bg-secondary/50 sm:hover:bg-secondary text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft size={16} />
                            <span className="hidden sm:inline">{t('common.back', 'Volver')}</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                    {/* LEFT: Configuration Area (Scrollable) */}
                    <div className="lg:col-span-7 xl:col-span-5 flex flex-col border-r border-border bg-background overflow-hidden relative z-10 shadow-[5px_0_30px_-10px_rgba(0,0,0,0.1)]">
                        {/* Tabs Header */}
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex space-x-1 bg-secondary/30 p-1 rounded-xl overflow-x-auto">
                                {[
                                    { id: 'overview', label: t('landingChatbot.tabs.overview', 'General'), icon: <Activity size={14} /> },
                                    { id: 'knowledge', label: t('landingChatbot.tabs.knowledge', 'Conocimiento'), icon: <Book size={14} /> },
                                    { id: 'personality', label: t('landingChatbot.tabs.personality', 'Personalidad'), icon: <User size={14} /> },
                                    { id: 'voice', label: t('landingChatbot.tabs.voice', 'Voz'), icon: <Mic size={14} /> },
                                    { id: 'leadCapture', label: t('landingChatbot.tabs.leadCapture', 'Leads'), icon: <Users size={14} /> },
                                    { id: 'appearance', label: t('landingChatbot.tabs.appearance', 'Apariencia'), icon: <Palette size={14} /> },
                                    { id: 'social', label: t('landingChatbot.tabs.social', 'Social'), icon: <Share2 size={14} /> },
                                    { id: 'settings', label: t('landingChatbot.tabs.settings', 'Ajustes'), icon: <Settings size={14} /> },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as Tab)}
                                        className={`flex items-center gap-1.5 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {tab.icon}
                                        <span className="hidden xl:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                            {renderTabContent()}
                        </div>
                    </div>

                    {/* RIGHT: Widget Preview Area (Fixed/Sticky Feel) */}
                    <div className="hidden lg:flex lg:col-span-5 xl:col-span-7 flex-col bg-muted/30 relative items-center justify-center p-10 overflow-hidden">
                        {/* Dot pattern - visible in both themes */}
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#d5d5d5_1px,transparent_1px)] dark:bg-[radial-gradient(#404040_1px,transparent_1px)] [background-size:16px_16px]"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">
                                {t('landingChatbot.liveSimulator', 'Simulador en Vivo')}
                            </h3>

                            {/* iPhone-style Phone Mockup */}
                            <div className="relative">
                                {/* Phone Frame */}
                                <div className="w-[320px] h-[650px] bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[50px] p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_30px_60px_-30px_rgba(0,0,0,0.6)] relative">
                                    {/* Inner bezel highlight */}
                                    <div className="absolute inset-[2px] rounded-[48px] bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 pointer-events-none"></div>

                                    {/* Screen */}
                                    <div className="relative w-full h-full bg-card rounded-[40px] overflow-hidden flex flex-col">
                                        {/* Dynamic Island */}
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-30 flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                                            <div className="w-3 h-3 rounded-full bg-zinc-800 ring-1 ring-zinc-700"></div>
                                        </div>

                                        {/* Status Bar */}
                                        <div className="h-12 px-6 flex items-end justify-between pb-1 text-[11px] font-semibold text-foreground z-20">
                                            <span>9:41</span>
                                            <div className="flex items-center gap-1">
                                                {/* Signal */}
                                                <div className="flex items-end gap-[2px] h-3">
                                                    <div className="w-[3px] h-[4px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[6px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[8px] bg-foreground rounded-sm"></div>
                                                    <div className="w-[3px] h-[10px] bg-foreground rounded-sm"></div>
                                                </div>
                                                {/* WiFi */}
                                                <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 18c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4.9-2.1l1.4 1.4C9.4 18.1 10.6 18.5 12 18.5s2.6-.4 3.5-1.2l1.4-1.4c-1.3-1.2-3-1.9-4.9-1.9s-3.6.7-4.9 1.9zm-2.8-2.8l1.4 1.4c1.8-1.8 4.3-2.8 6.9-2.8s5.1 1 6.9 2.8l1.4-1.4C18.7 11 15.5 9.7 12 9.7s-6.7 1.3-8.7 3.4zm-2.8-2.8l1.4 1.4C5.3 9.3 8.5 7.7 12 7.7s6.7 1.6 9.1 4l1.4-1.4C19.8 7.5 16.1 5.7 12 5.7S4.2 7.5 1.5 10.3z" />
                                                </svg>
                                                {/* Battery */}
                                                <div className="flex items-center gap-[2px]">
                                                    <div className="w-6 h-3 border border-foreground rounded-sm flex items-center p-[2px]">
                                                        <div className="w-full h-full bg-foreground rounded-[1px]"></div>
                                                    </div>
                                                    <div className="w-[2px] h-[5px] bg-foreground rounded-r-sm"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Browser URL Bar */}
                                        <div className="px-3 pb-2">
                                            <div className="h-8 bg-muted/60 rounded-full flex items-center justify-center gap-2 px-3">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span className="text-[10px] text-muted-foreground truncate">quimera.ai</span>
                                            </div>
                                        </div>

                                        {/* Website Content (Landing Page Preview) */}
                                        <div className="flex-1 overflow-hidden bg-background relative">
                                            {/* Hero Section */}
                                            <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative overflow-hidden">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
                                                            <span className="text-lg">🦋</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground">Quimera.ai</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content Skeleton */}
                                            <div className="p-4 space-y-4">
                                                {/* Feature Cards */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                        <div className="h-16 bg-secondary/60 rounded-lg flex items-center justify-center">
                                                            <span className="text-2xl">🚀</span>
                                                        </div>
                                                        <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                    </div>
                                                    <div className="bg-muted/50 rounded-xl p-2 space-y-2">
                                                        <div className="h-16 bg-secondary/60 rounded-lg flex items-center justify-center">
                                                            <span className="text-2xl">✨</span>
                                                        </div>
                                                        <div className="h-2 bg-secondary/60 rounded w-3/4"></div>
                                                        <div className="h-2 bg-secondary/60 rounded w-1/2"></div>
                                                    </div>
                                                </div>

                                                {/* Text Skeleton */}
                                                <div className="space-y-2">
                                                    <div className="h-2 bg-secondary/40 rounded w-full"></div>
                                                    <div className="h-2 bg-secondary/40 rounded w-5/6"></div>
                                                    <div className="h-2 bg-secondary/40 rounded w-4/6"></div>
                                                </div>

                                                {/* CTA Button Skeleton */}
                                                <div className="h-10 bg-primary/20 rounded-full w-3/4 mx-auto"></div>
                                            </div>

                                            {/* The Real Chat Widget Simulator */}
                                            <LandingChatSimulator config={formData} />
                                        </div>

                                        {/* Home Indicator */}
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full"></div>
                                    </div>
                                </div>

                                {/* Side buttons */}
                                <div className="absolute left-[-2px] top-28 w-[3px] h-8 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute left-[-2px] top-44 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute left-[-2px] top-60 w-[3px] h-14 bg-zinc-700 rounded-l-sm"></div>
                                <div className="absolute right-[-2px] top-36 w-[3px] h-20 bg-zinc-700 rounded-r-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={showRestoreDefaultsModal}
                onConfirm={confirmRestoreDefaults}
                onCancel={() => setShowRestoreDefaultsModal(false)}
                title="¿Restaurar valores por defecto?"
                message='Esto sobrescribirá tu configuración actual con los valores predeterminados (incluyendo el nombre "Quibo").'
                variant="warning"
                confirmText="Restaurar"
            />
        </div>
    );
};

export default LandingChatbotAdmin;
