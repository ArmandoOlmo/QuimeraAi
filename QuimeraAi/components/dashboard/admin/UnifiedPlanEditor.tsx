/**
 * Unified Plan Editor - Modal para crear/editar planes
 * Editor completo con límites, features, pricing y Stripe integration
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Save,
    Sparkles,
    Zap,
    Users,
    Database,
    Globe,
    ShoppingCart,
    Mail,
    MessageSquare,
    BarChart3,
    Palette,
    Code,
    Crown,
    AlertCircle,
    Check,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { StoredPlan, validatePlan, createEmptyPlan } from '../../../services/plansService';
import { PlanLimits, PlanFeatures, SubscriptionPlanId } from '../../../types/subscription';

// =============================================================================
// TYPES
// =============================================================================

interface UnifiedPlanEditorProps {
    isOpen: boolean;
    onClose: () => void;
    plan: StoredPlan | null; // null = creating new plan
    onSave: (plan: StoredPlan) => Promise<void>;
}

type TabId = 'general' | 'limits' | 'features' | 'stripe';

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAN_COLORS = [
    { name: 'Gris', value: '#6b7280' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Púrpura', value: '#8b5cf6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
];

const PLAN_ICONS = [
    'Sparkles', 'Rocket', 'Zap', 'Building2', 'Crown', 'Star', 'Diamond', 'Gem',
];

const SUPPORT_LEVELS = [
    { value: 'community', label: 'Comunidad' },
    { value: 'email', label: 'Email' },
    { value: 'chat', label: 'Chat' },
    { value: 'priority', label: 'Prioritario' },
    { value: 'dedicated', label: 'Dedicado' },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${active
                ? 'bg-editor-accent text-white'
                : 'bg-editor-bg text-editor-text-secondary hover:text-editor-text-primary'
            }
        `}
    >
        {icon}
        {label}
    </button>
);

const FeatureToggle: React.FC<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    icon?: React.ReactNode;
}> = ({ label, description, checked, onChange, icon }) => (
    <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-editor-bg cursor-pointer transition-colors">
        <div className="pt-0.5">
            <div
                className={`
                    w-5 h-5 rounded flex items-center justify-center transition-colors
                    ${checked ? 'bg-editor-accent' : 'bg-editor-border'}
                `}
                onClick={(e) => {
                    e.preventDefault();
                    onChange(!checked);
                }}
            >
                {checked && <Check className="w-3 h-3 text-white" />}
            </div>
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-editor-text-primary font-medium">{label}</span>
            </div>
            {description && (
                <p className="text-sm text-editor-text-secondary mt-0.5">{description}</p>
            )}
        </div>
    </label>
);

const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    allowUnlimited?: boolean;
}> = ({ label, value, onChange, min = 0, max, step = 1, suffix, allowUnlimited }) => (
    <div>
        <label className="block text-sm text-editor-text-secondary mb-1.5">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="number"
                value={value === -1 ? '' : value}
                onChange={(e) => {
                    const val = e.target.value === '' ? (allowUnlimited ? -1 : 0) : parseInt(e.target.value);
                    onChange(val);
                }}
                min={min}
                max={max}
                step={step}
                placeholder={allowUnlimited ? 'Ilimitado' : undefined}
                className="flex-1 px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
            />
            {suffix && <span className="text-sm text-editor-text-secondary">{suffix}</span>}
            {allowUnlimited && (
                <button
                    type="button"
                    onClick={() => onChange(value === -1 ? 0 : -1)}
                    className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${value === -1
                            ? 'bg-editor-accent text-white'
                            : 'bg-editor-border text-editor-text-secondary hover:bg-editor-border/80'
                        }
                    `}
                >
                    ∞
                </button>
            )}
        </div>
    </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const UnifiedPlanEditor: React.FC<UnifiedPlanEditorProps> = ({
    isOpen,
    onClose,
    plan,
    onSave,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        core: true,
        cms: true,
        crm: true,
        ecommerce: true,
        ai: true,
        communication: true,
        branding: true,
        analytics: true,
        advanced: true,
    });
    
    // Form state
    const [formData, setFormData] = useState<Partial<StoredPlan>>(createEmptyPlan());
    
    // Initialize form when plan changes
    useEffect(() => {
        if (plan) {
            setFormData({ ...plan });
        } else {
            setFormData(createEmptyPlan());
        }
        setErrors([]);
        setActiveTab('general');
    }, [plan, isOpen]);
    
    if (!isOpen) return null;
    
    const isNewPlan = !plan;
    
    // Update handlers
    const updateField = <K extends keyof StoredPlan>(field: K, value: StoredPlan[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const updateLimit = <K extends keyof PlanLimits>(key: K, value: PlanLimits[K]) => {
        setFormData(prev => ({
            ...prev,
            limits: { ...prev.limits!, [key]: value },
        }));
    };
    
    const updateFeature = <K extends keyof PlanFeatures>(key: K, value: PlanFeatures[K]) => {
        setFormData(prev => ({
            ...prev,
            features: { ...prev.features!, [key]: value },
        }));
    };
    
    const updatePrice = (cycle: 'monthly' | 'annually', value: number) => {
        setFormData(prev => ({
            ...prev,
            price: { ...prev.price!, [cycle]: value },
        }));
    };
    
    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };
    
    // Handle save
    const handleSave = async () => {
        const validation = validatePlan(formData);
        if (!validation.valid) {
            setErrors(validation.errors);
            return;
        }
        
        setIsLoading(true);
        setErrors([]);
        
        try {
            await onSave(formData as StoredPlan);
            onClose();
        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Error al guardar']);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Render section header
    const SectionHeader: React.FC<{ id: string; title: string; icon: React.ReactNode }> = ({ id, title, icon }) => (
        <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between p-3 bg-editor-bg rounded-lg hover:bg-editor-border/50 transition-colors"
        >
            <div className="flex items-center gap-2 text-editor-text-primary font-medium">
                {icon}
                {title}
            </div>
            {expandedSections[id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
    );
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-editor-panel-bg rounded-xl border border-editor-border w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-editor-border">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${formData.color}20` }}
                        >
                            <Crown className="w-5 h-5" style={{ color: formData.color }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-editor-text-primary">
                                {isNewPlan ? 'Crear Nuevo Plan' : `Editar: ${plan.name}`}
                            </h2>
                            <p className="text-sm text-editor-text-secondary">
                                {isNewPlan ? 'Configura un nuevo plan de suscripción' : 'Modifica la configuración del plan'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-editor-border overflow-x-auto">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={<Sparkles className="w-4 h-4" />}
                        label="General"
                    />
                    <TabButton
                        active={activeTab === 'limits'}
                        onClick={() => setActiveTab('limits')}
                        icon={<Database className="w-4 h-4" />}
                        label="Límites"
                    />
                    <TabButton
                        active={activeTab === 'features'}
                        onClick={() => setActiveTab('features')}
                        icon={<Zap className="w-4 h-4" />}
                        label="Features"
                    />
                    <TabButton
                        active={activeTab === 'stripe'}
                        onClick={() => setActiveTab('stripe')}
                        icon={<Code className="w-4 h-4" />}
                        label="Stripe"
                    />
                </div>
                
                {/* Errors */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Errores de validación</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-red-400/80">
                            {errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Plan ID */}
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">
                                        ID del Plan *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.id || ''}
                                        onChange={(e) => updateField('id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') as SubscriptionPlanId)}
                                        disabled={!isNewPlan}
                                        placeholder="ej: pro_plus"
                                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent disabled:opacity-50"
                                    />
                                    <p className="text-xs text-editor-text-secondary mt-1">
                                        Solo letras minúsculas, números y guiones bajos
                                    </p>
                                </div>
                                
                                {/* Name */}
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">
                                        Nombre del Plan *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="ej: Pro Plus"
                                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    />
                                </div>
                            </div>
                            
                            {/* Description */}
                            <div>
                                <label className="block text-sm text-editor-text-secondary mb-1.5">
                                    Descripción *
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    rows={2}
                                    placeholder="Descripción breve del plan..."
                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent resize-none"
                                />
                            </div>
                            
                            {/* Pricing */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">
                                        Precio Mensual (USD) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary">$</span>
                                        <input
                                            type="number"
                                            value={formData.price?.monthly || 0}
                                            onChange={(e) => updatePrice('monthly', parseFloat(e.target.value) || 0)}
                                            min={0}
                                            step={1}
                                            className="w-full pl-8 pr-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">
                                        Precio Anual (USD/mes) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-editor-text-secondary">$</span>
                                        <input
                                            type="number"
                                            value={formData.price?.annually || 0}
                                            onChange={(e) => updatePrice('annually', parseFloat(e.target.value) || 0)}
                                            min={0}
                                            step={1}
                                            className="w-full pl-8 pr-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                        />
                                    </div>
                                    {formData.price?.monthly && formData.price.monthly > 0 && formData.price?.annually && formData.price.annually > 0 && (
                                        <p className="text-xs text-green-400 mt-1">
                                            Ahorro: {Math.round(((formData.price.monthly - formData.price.annually) / formData.price.monthly) * 100)}% vs mensual
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Landing Page Visibility */}
                            <div className="p-4 bg-editor-bg rounded-lg border border-editor-border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-4 h-4 text-green-400" />
                                    <h4 className="text-sm font-medium text-editor-text-primary">Visibilidad en Landing Page</h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.showInLanding || false}
                                            onChange={(e) => updateField('showInLanding', e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.showInLanding ? 'bg-green-500' : 'bg-editor-border'}`}>
                                            {formData.showInLanding && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                        <span className="text-editor-text-primary font-medium">Mostrar en Landing Page</span>
                                    </label>
                                    {formData.showInLanding && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-editor-text-secondary">Orden:</label>
                                            <input
                                                type="number"
                                                value={formData.landingOrder ?? 1}
                                                onChange={(e) => updateField('landingOrder', parseInt(e.target.value) || 1)}
                                                min={1}
                                                max={10}
                                                className="w-16 px-2 py-1.5 bg-editor-panel-bg border border-editor-border rounded text-editor-text-primary text-center focus:outline-none focus:border-green-500"
                                            />
                                            <span className="text-xs text-editor-text-secondary">(1 = primero)</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-editor-text-secondary mt-2">
                                    Los planes activados aparecerán en el landing page público
                                </p>
                            </div>
                            
                            {/* Color & Icon */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PLAN_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => updateField('color', color.value)}
                                                className={`
                                                    w-8 h-8 rounded-lg transition-all
                                                    ${formData.color === color.value ? 'ring-2 ring-editor-accent ring-offset-2 ring-offset-editor-panel-bg' : ''}
                                                `}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-editor-text-secondary mb-1.5">Icono</label>
                                    <select
                                        value={formData.icon || 'Sparkles'}
                                        onChange={(e) => updateField('icon', e.target.value)}
                                        className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                    >
                                        {PLAN_ICONS.map((icon) => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isFeatured || false}
                                        onChange={(e) => updateField('isFeatured', e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${formData.isFeatured ? 'bg-editor-accent' : 'bg-editor-border'}`}>
                                        {formData.isFeatured && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-editor-text-primary">Destacado</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPopular || false}
                                        onChange={(e) => updateField('isPopular', e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${formData.isPopular ? 'bg-editor-accent' : 'bg-editor-border'}`}>
                                        {formData.isPopular && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-editor-text-primary">Popular</span>
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* Limits Tab */}
                    {activeTab === 'limits' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <NumberInput
                                label="Máx. Proyectos"
                                value={formData.limits?.maxProjects || 0}
                                onChange={(v) => updateLimit('maxProjects', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Máx. Usuarios"
                                value={formData.limits?.maxUsers || 0}
                                onChange={(v) => updateLimit('maxUsers', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Almacenamiento"
                                value={formData.limits?.maxStorageGB || 0}
                                onChange={(v) => updateLimit('maxStorageGB', v)}
                                suffix="GB"
                                allowUnlimited
                            />
                            <NumberInput
                                label="AI Credits / mes"
                                value={formData.limits?.maxAiCredits || 0}
                                onChange={(v) => updateLimit('maxAiCredits', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Dominios Personalizados"
                                value={formData.limits?.maxDomains || 0}
                                onChange={(v) => updateLimit('maxDomains', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Máx. Leads"
                                value={formData.limits?.maxLeads || 0}
                                onChange={(v) => updateLimit('maxLeads', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Máx. Productos (E-commerce)"
                                value={formData.limits?.maxProducts || 0}
                                onChange={(v) => updateLimit('maxProducts', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Emails / mes"
                                value={formData.limits?.maxEmailsPerMonth || 0}
                                onChange={(v) => updateLimit('maxEmailsPerMonth', v)}
                                allowUnlimited
                            />
                            <NumberInput
                                label="Sub-clientes (Agencias)"
                                value={formData.limits?.maxSubClients || 0}
                                onChange={(v) => updateLimit('maxSubClients', v)}
                                allowUnlimited
                            />
                        </div>
                    )}
                    
                    {/* Features Tab */}
                    {activeTab === 'features' && (
                        <div className="space-y-4">
                            {/* Core Features */}
                            <div>
                                <SectionHeader id="core" title="Core" icon={<Sparkles className="w-4 h-4" />} />
                                {expandedSections.core && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="AI Website Builder"
                                            description="Generación de sitios web con IA"
                                            checked={formData.features?.aiWebBuilder || false}
                                            onChange={(v) => updateFeature('aiWebBuilder', v)}
                                        />
                                        <FeatureToggle
                                            label="Editor Visual"
                                            description="Editor drag & drop"
                                            checked={formData.features?.visualEditor || false}
                                            onChange={(v) => updateFeature('visualEditor', v)}
                                        />
                                        <FeatureToggle
                                            label="Templates"
                                            description="Acceso a plantillas prediseñadas"
                                            checked={formData.features?.templates || false}
                                            onChange={(v) => updateFeature('templates', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* CMS */}
                            <div>
                                <SectionHeader id="cms" title="CMS" icon={<Database className="w-4 h-4" />} />
                                {expandedSections.cms && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="CMS Habilitado"
                                            description="Sistema de gestión de contenido"
                                            checked={formData.features?.cmsEnabled || false}
                                            onChange={(v) => updateFeature('cmsEnabled', v)}
                                        />
                                        <FeatureToggle
                                            label="CMS Avanzado"
                                            description="Blog, categorías, SEO avanzado"
                                            checked={formData.features?.cmsAdvanced || false}
                                            onChange={(v) => updateFeature('cmsAdvanced', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* CRM */}
                            <div>
                                <SectionHeader id="crm" title="CRM" icon={<Users className="w-4 h-4" />} />
                                {expandedSections.crm && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="CRM Habilitado"
                                            description="Gestión de contactos y leads"
                                            checked={formData.features?.crmEnabled || false}
                                            onChange={(v) => updateFeature('crmEnabled', v)}
                                        />
                                        <FeatureToggle
                                            label="Múltiples Pipelines"
                                            description="Pipelines de ventas personalizables"
                                            checked={formData.features?.crmPipelines || false}
                                            onChange={(v) => updateFeature('crmPipelines', v)}
                                        />
                                        <FeatureToggle
                                            label="Automatizaciones CRM"
                                            description="Workflows automatizados"
                                            checked={formData.features?.crmAutomations || false}
                                            onChange={(v) => updateFeature('crmAutomations', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* E-commerce */}
                            <div>
                                <SectionHeader id="ecommerce" title="E-Commerce" icon={<ShoppingCart className="w-4 h-4" />} />
                                {expandedSections.ecommerce && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="E-Commerce Habilitado"
                                            description="Tienda online con Stripe"
                                            checked={formData.features?.ecommerceEnabled || false}
                                            onChange={(v) => updateFeature('ecommerceEnabled', v)}
                                        />
                                        <div className="p-3">
                                            <label className="block text-sm text-editor-text-secondary mb-1.5">
                                                Fee por Transacción (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.features?.ecommerceTransactionFee || 0}
                                                onChange={(e) => updateFeature('ecommerceTransactionFee', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                max={10}
                                                step={0.5}
                                                className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* AI Features */}
                            <div>
                                <SectionHeader id="ai" title="IA & Chatbot" icon={<MessageSquare className="w-4 h-4" />} />
                                {expandedSections.ai && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="Chatbot"
                                            description="Widget de chat con IA"
                                            checked={formData.features?.chatbotEnabled || false}
                                            onChange={(v) => updateFeature('chatbotEnabled', v)}
                                        />
                                        <FeatureToggle
                                            label="Chatbot Personalizable"
                                            description="Personalización avanzada del chatbot"
                                            checked={formData.features?.chatbotCustomization || false}
                                            onChange={(v) => updateFeature('chatbotCustomization', v)}
                                        />
                                        <FeatureToggle
                                            label="Asistente IA"
                                            description="Asistente de edición con IA"
                                            checked={formData.features?.aiAssistant || false}
                                            onChange={(v) => updateFeature('aiAssistant', v)}
                                        />
                                        <FeatureToggle
                                            label="Generación de Imágenes"
                                            description="Crear imágenes con IA"
                                            checked={formData.features?.aiImageGeneration || false}
                                            onChange={(v) => updateFeature('aiImageGeneration', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Communication */}
                            <div>
                                <SectionHeader id="communication" title="Comunicación" icon={<Mail className="w-4 h-4" />} />
                                {expandedSections.communication && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="Email Marketing"
                                            description="Campañas de email"
                                            checked={formData.features?.emailMarketing || false}
                                            onChange={(v) => updateFeature('emailMarketing', v)}
                                        />
                                        <FeatureToggle
                                            label="Automatización de Email"
                                            description="Secuencias automáticas"
                                            checked={formData.features?.emailAutomation || false}
                                            onChange={(v) => updateFeature('emailAutomation', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Branding */}
                            <div>
                                <SectionHeader id="branding" title="Branding" icon={<Palette className="w-4 h-4" />} />
                                {expandedSections.branding && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="Dominios Personalizados"
                                            description="Conectar dominio propio"
                                            checked={formData.features?.customDomains || false}
                                            onChange={(v) => updateFeature('customDomains', v)}
                                        />
                                        <FeatureToggle
                                            label="Quitar Branding"
                                            description="Remover 'Powered by Quimera'"
                                            checked={formData.features?.removeBranding || false}
                                            onChange={(v) => updateFeature('removeBranding', v)}
                                        />
                                        <FeatureToggle
                                            label="White-Label"
                                            description="Portal completamente personalizado"
                                            checked={formData.features?.whiteLabel || false}
                                            onChange={(v) => updateFeature('whiteLabel', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Analytics */}
                            <div>
                                <SectionHeader id="analytics" title="Analytics" icon={<BarChart3 className="w-4 h-4" />} />
                                {expandedSections.analytics && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="Analytics Básico"
                                            description="Métricas básicas de visitantes"
                                            checked={formData.features?.analyticsBasic || false}
                                            onChange={(v) => updateFeature('analyticsBasic', v)}
                                        />
                                        <FeatureToggle
                                            label="Analytics Avanzado"
                                            description="Reportes detallados y exportación"
                                            checked={formData.features?.analyticsAdvanced || false}
                                            onChange={(v) => updateFeature('analyticsAdvanced', v)}
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Advanced */}
                            <div>
                                <SectionHeader id="advanced" title="Avanzado" icon={<Code className="w-4 h-4" />} />
                                {expandedSections.advanced && (
                                    <div className="mt-2 border border-editor-border rounded-lg divide-y divide-editor-border">
                                        <FeatureToggle
                                            label="Acceso API"
                                            description="API REST para integraciones"
                                            checked={formData.features?.apiAccess || false}
                                            onChange={(v) => updateFeature('apiAccess', v)}
                                        />
                                        <FeatureToggle
                                            label="Webhooks"
                                            description="Notificaciones en tiempo real"
                                            checked={formData.features?.webhooks || false}
                                            onChange={(v) => updateFeature('webhooks', v)}
                                        />
                                        <div className="p-3">
                                            <label className="block text-sm text-editor-text-secondary mb-1.5">
                                                Nivel de Soporte
                                            </label>
                                            <select
                                                value={formData.features?.supportLevel || 'community'}
                                                onChange={(e) => updateFeature('supportLevel', e.target.value as any)}
                                                className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent"
                                            >
                                                {SUPPORT_LEVELS.map((level) => (
                                                    <option key={level.value} value={level.value}>{level.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Stripe Tab */}
                    {activeTab === 'stripe' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-editor-bg rounded-lg border border-editor-border">
                                <p className="text-editor-text-secondary text-sm">
                                    Estos IDs se sincronizan automáticamente con Stripe cuando guardas el plan.
                                    Puedes editarlos manualmente si ya tienes productos/precios creados.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm text-editor-text-secondary mb-1.5">
                                    Stripe Product ID
                                </label>
                                <input
                                    type="text"
                                    value={formData.stripeProductId || ''}
                                    onChange={(e) => updateField('stripeProductId', e.target.value)}
                                    placeholder="prod_XXXXXXXXXXXXX"
                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent font-mono text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-editor-text-secondary mb-1.5">
                                    Stripe Price ID (Mensual)
                                </label>
                                <input
                                    type="text"
                                    value={formData.stripePriceIdMonthly || ''}
                                    onChange={(e) => updateField('stripePriceIdMonthly', e.target.value)}
                                    placeholder="price_XXXXXXXXXXXXX"
                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent font-mono text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-editor-text-secondary mb-1.5">
                                    Stripe Price ID (Anual)
                                </label>
                                <input
                                    type="text"
                                    value={formData.stripePriceIdAnnually || ''}
                                    onChange={(e) => updateField('stripePriceIdAnnually', e.target.value)}
                                    placeholder="price_XXXXXXXXXXXXX"
                                    className="w-full px-4 py-2 bg-editor-bg border border-editor-border rounded-lg text-editor-text-primary focus:outline-none focus:border-editor-accent font-mono text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-editor-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-editor-border text-editor-text-primary hover:bg-editor-border/80 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-6 py-2 rounded-lg bg-editor-accent text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isNewPlan ? 'Crear Plan' : 'Guardar Cambios'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedPlanEditor;

