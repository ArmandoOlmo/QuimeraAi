/**
 * AgencyPlanEditor
 * Modal for creating and editing agency service plans
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../../../contexts/tenant/TenantContext';
import { useAuth } from '../../../../contexts/core/AuthContext';
import {
    X,
    Save,
    Package,
    DollarSign,
    Users,
    Database,
    Zap,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Check,
    TrendingUp,
    Info,
} from 'lucide-react';
import { saveAgencyPlan } from '../../../../services/agencyPlansService';
import {
    AgencyPlan,
    AgencyPlanLimits,
    AgencyPlanFeatures,
    createEmptyAgencyPlan,
    calculateMarkup,
    validateAgencyPlan,
    QUIMERA_PROJECT_COST,
    AGENCY_PLAN_COLORS,
    DEFAULT_AGENCY_PLAN_LIMITS,
    DEFAULT_AGENCY_PLAN_FEATURES,
} from '../../../../types/agencyPlans';

// =============================================================================
// PROPS
// =============================================================================

interface AgencyPlanEditorProps {
    isOpen: boolean;
    onClose: () => void;
    plan: AgencyPlan | null;
    onSave: () => void;
}

type TabId = 'general' | 'limits' | 'features';

// =============================================================================
// SUB COMPONENTS
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
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }
        `}
    >
        {icon}
        {label}
    </button>
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
    description?: string;
}> = ({ label, value, onChange, min = 0, max, step = 1, suffix, allowUnlimited, description }) => (
    <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
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
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            {allowUnlimited && (
                <button
                    type="button"
                    onClick={() => onChange(value === -1 ? 0 : -1)}
                    className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${value === -1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                    `}
                    title="Ilimitado"
                >
                    ∞
                </button>
            )}
        </div>
        {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
    </div>
);

const FeatureToggle: React.FC<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
    <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
        <div className="pt-0.5">
            <div
                onClick={(e) => {
                    e.preventDefault();
                    onChange(!checked);
                }}
                className={`
                    w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer
                    ${checked ? 'bg-primary' : 'bg-border'}
                `}
            >
                {checked && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
        </div>
        <div className="flex-1">
            <span className="text-foreground font-medium">{label}</span>
            {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
        </div>
    </label>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AgencyPlanEditor({ isOpen, onClose, plan, onSave }: AgencyPlanEditorProps) {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    // Form state
    const [formData, setFormData] = useState<Partial<AgencyPlan>>({});

    // Initialize form when plan changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (plan) {
                setFormData({ ...plan });
            } else if (currentTenant?.id) {
                setFormData(createEmptyAgencyPlan(currentTenant.id));
            }
            setErrors([]);
            setActiveTab('general');
        }
    }, [plan, isOpen, currentTenant?.id]);

    if (!isOpen) return null;

    const isNewPlan = !plan;

    // Calculate markup preview
    const markup = calculateMarkup(formData.price || 0, QUIMERA_PROJECT_COST);

    // Update handlers
    const updateField = <K extends keyof AgencyPlan>(field: K, value: AgencyPlan[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const updateLimit = <K extends keyof AgencyPlanLimits>(key: K, value: AgencyPlanLimits[K]) => {
        setFormData((prev) => ({
            ...prev,
            limits: { ...prev.limits!, [key]: value },
        }));
    };

    const updateFeature = <K extends keyof AgencyPlanFeatures>(key: K, value: AgencyPlanFeatures[K]) => {
        setFormData((prev) => ({
            ...prev,
            features: { ...prev.features!, [key]: value },
        }));
    };

    // Handle save
    const handleSave = async () => {
        const validation = validateAgencyPlan(formData);
        if (!validation.valid) {
            setErrors(validation.errors);
            return;
        }

        setIsLoading(true);
        setErrors([]);

        try {
            const result = await saveAgencyPlan(formData, user?.uid);
            if (result.success) {
                onSave();
            } else {
                setErrors([result.error || 'Error al guardar el plan']);
            }
        } catch (error) {
            setErrors([error instanceof Error ? error.message : 'Error al guardar']);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${formData.color || '#3b82f6'}20` }}
                        >
                            <Package className="w-5 h-5" style={{ color: formData.color || '#3b82f6' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {isNewPlan ? 'Crear Nuevo Plan' : `Editar: ${plan?.name}`}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {isNewPlan ? 'Define un plan de servicio para tus clientes' : 'Modifica la configuración del plan'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
                    <TabButton
                        active={activeTab === 'general'}
                        onClick={() => setActiveTab('general')}
                        icon={<Package className="w-4 h-4" />}
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
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Errores de validación</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-destructive/80">
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
                            {/* Name & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">
                                        Nombre del Plan *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="ej: Plan Básico"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {AGENCY_PLAN_COLORS.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => updateField('color', color.value)}
                                                className={`
                                                    w-8 h-8 rounded-lg transition-all
                                                    ${formData.color === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}
                                                `}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    rows={2}
                                    placeholder="Descripción breve del plan..."
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                                />
                            </div>

                            {/* Pricing with Markup Preview */}
                            <div className="bg-muted/30 rounded-xl p-5 border border-border">
                                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    Precio y Ganancia
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">
                                            Precio al Cliente *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <input
                                                type="number"
                                                value={formData.price || ''}
                                                onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                                                min={0}
                                                step={1}
                                                className="w-full pl-8 pr-16 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/mes</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                                            Tu Costo (Quimera)
                                        </label>
                                        <div className="px-4 py-2 bg-muted rounded-lg text-foreground font-medium">
                                            ${QUIMERA_PROJECT_COST}/mes
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-green-600 mb-1.5">
                                            Tu Ganancia
                                        </label>
                                        <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <span className="text-green-700 dark:text-green-400 font-bold">
                                                ${markup.markup}
                                            </span>
                                            <span className="text-green-600 dark:text-green-500 ml-2 text-sm">
                                                ({Math.round(markup.markupPercentage)}% markup)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        El costo de ${QUIMERA_PROJECT_COST}/mes es lo que Quimera te cobra por cada proyecto activo.
                                        La diferencia es tu ganancia neta por cliente.
                                    </p>
                                </div>
                            </div>

                            {/* Default Plan Toggle */}
                            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault || false}
                                        onChange={(e) => updateField('isDefault', e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div
                                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                                            formData.isDefault ? 'bg-primary' : 'bg-border'
                                        }`}
                                    >
                                        {formData.isDefault && <Check className="w-3 h-3 text-primary-foreground" />}
                                    </div>
                                    <div>
                                        <span className="text-foreground font-medium">Plan por Defecto</span>
                                        <p className="text-sm text-muted-foreground">
                                            Asignar automáticamente a nuevos clientes
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Limits Tab */}
                    {activeTab === 'limits' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <NumberInput
                                label="Proyectos"
                                value={formData.limits?.maxProjects ?? DEFAULT_AGENCY_PLAN_LIMITS.maxProjects}
                                onChange={(v) => updateLimit('maxProjects', v)}
                                min={1}
                                allowUnlimited
                                description="Número máximo de proyectos/sitios web"
                            />
                            <NumberInput
                                label="Usuarios"
                                value={formData.limits?.maxUsers ?? DEFAULT_AGENCY_PLAN_LIMITS.maxUsers}
                                onChange={(v) => updateLimit('maxUsers', v)}
                                min={1}
                                allowUnlimited
                                description="Usuarios que pueden acceder al proyecto"
                            />
                            <NumberInput
                                label="AI Credits"
                                value={formData.limits?.maxAiCredits ?? DEFAULT_AGENCY_PLAN_LIMITS.maxAiCredits}
                                onChange={(v) => updateLimit('maxAiCredits', v)}
                                min={0}
                                allowUnlimited
                                description="Créditos de IA mensuales (de tu pool)"
                            />
                            <NumberInput
                                label="Almacenamiento"
                                value={formData.limits?.maxStorageGB ?? DEFAULT_AGENCY_PLAN_LIMITS.maxStorageGB}
                                onChange={(v) => updateLimit('maxStorageGB', v)}
                                min={1}
                                suffix="GB"
                                allowUnlimited
                                description="Espacio para archivos e imágenes"
                            />
                            <NumberInput
                                label="Productos (E-commerce)"
                                value={formData.limits?.maxProducts ?? DEFAULT_AGENCY_PLAN_LIMITS.maxProducts}
                                onChange={(v) => updateLimit('maxProducts', v)}
                                min={0}
                                allowUnlimited
                                description="Productos en tienda online"
                            />
                            <NumberInput
                                label="Leads (CRM)"
                                value={formData.limits?.maxLeads ?? DEFAULT_AGENCY_PLAN_LIMITS.maxLeads}
                                onChange={(v) => updateLimit('maxLeads', v)}
                                min={0}
                                allowUnlimited
                                description="Contactos/leads en CRM"
                            />
                            <NumberInput
                                label="Emails por Mes"
                                value={formData.limits?.maxEmailsPerMonth ?? DEFAULT_AGENCY_PLAN_LIMITS.maxEmailsPerMonth}
                                onChange={(v) => updateLimit('maxEmailsPerMonth', v)}
                                min={0}
                                allowUnlimited
                                description="Emails de marketing mensuales"
                            />
                        </div>
                    )}

                    {/* Features Tab */}
                    {activeTab === 'features' && (
                        <div className="space-y-4">
                            {/* Core Features */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Core
                                </h3>
                                <div className="border border-border rounded-lg divide-y divide-border">
                                    <FeatureToggle
                                        label="Website Builder"
                                        description="Generación y edición de sitios web"
                                        checked={formData.features?.websiteBuilder ?? DEFAULT_AGENCY_PLAN_FEATURES.websiteBuilder}
                                        onChange={(v) => updateFeature('websiteBuilder', v)}
                                    />
                                    <FeatureToggle
                                        label="Editor Visual"
                                        description="Editor drag & drop"
                                        checked={formData.features?.visualEditor ?? DEFAULT_AGENCY_PLAN_FEATURES.visualEditor}
                                        onChange={(v) => updateFeature('visualEditor', v)}
                                    />
                                    <FeatureToggle
                                        label="Templates"
                                        description="Acceso a plantillas prediseñadas"
                                        checked={formData.features?.templates ?? DEFAULT_AGENCY_PLAN_FEATURES.templates}
                                        onChange={(v) => updateFeature('templates', v)}
                                    />
                                </div>
                            </div>

                            {/* CMS & CRM */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    CMS & CRM
                                </h3>
                                <div className="border border-border rounded-lg divide-y divide-border">
                                    <FeatureToggle
                                        label="CMS (Blog)"
                                        description="Sistema de gestión de contenido"
                                        checked={formData.features?.cmsEnabled ?? DEFAULT_AGENCY_PLAN_FEATURES.cmsEnabled}
                                        onChange={(v) => updateFeature('cmsEnabled', v)}
                                    />
                                    <FeatureToggle
                                        label="CRM"
                                        description="Gestión de contactos y leads"
                                        checked={formData.features?.crmEnabled ?? DEFAULT_AGENCY_PLAN_FEATURES.crmEnabled}
                                        onChange={(v) => updateFeature('crmEnabled', v)}
                                    />
                                </div>
                            </div>

                            {/* E-commerce & Communication */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    E-commerce & Marketing
                                </h3>
                                <div className="border border-border rounded-lg divide-y divide-border">
                                    <FeatureToggle
                                        label="E-Commerce"
                                        description="Tienda online con pagos"
                                        checked={formData.features?.ecommerceEnabled ?? DEFAULT_AGENCY_PLAN_FEATURES.ecommerceEnabled}
                                        onChange={(v) => updateFeature('ecommerceEnabled', v)}
                                    />
                                    <FeatureToggle
                                        label="Email Marketing"
                                        description="Campañas de email"
                                        checked={formData.features?.emailMarketing ?? DEFAULT_AGENCY_PLAN_FEATURES.emailMarketing}
                                        onChange={(v) => updateFeature('emailMarketing', v)}
                                    />
                                    <FeatureToggle
                                        label="Chatbot IA"
                                        description="Asistente virtual en el sitio"
                                        checked={formData.features?.chatbotEnabled ?? DEFAULT_AGENCY_PLAN_FEATURES.chatbotEnabled}
                                        onChange={(v) => updateFeature('chatbotEnabled', v)}
                                    />
                                </div>
                            </div>

                            {/* Branding & Analytics */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Branding & Analytics
                                </h3>
                                <div className="border border-border rounded-lg divide-y divide-border">
                                    <FeatureToggle
                                        label="Dominio Personalizado"
                                        description="Conectar dominio propio"
                                        checked={formData.features?.customDomain ?? DEFAULT_AGENCY_PLAN_FEATURES.customDomain}
                                        onChange={(v) => updateFeature('customDomain', v)}
                                    />
                                    <FeatureToggle
                                        label="Quitar Branding"
                                        description="Remover 'Powered by' del sitio"
                                        checked={formData.features?.removeBranding ?? DEFAULT_AGENCY_PLAN_FEATURES.removeBranding}
                                        onChange={(v) => updateFeature('removeBranding', v)}
                                    />
                                    <FeatureToggle
                                        label="Analytics"
                                        description="Métricas y reportes"
                                        checked={formData.features?.analyticsEnabled ?? DEFAULT_AGENCY_PLAN_FEATURES.analyticsEnabled}
                                        onChange={(v) => updateFeature('analyticsEnabled', v)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
                    {/* Markup Preview in Footer */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-muted-foreground">Ganancia:</span>
                            <span className="font-bold text-green-600">
                                ${markup.markup}/mes ({Math.round(markup.markupPercentage)}%)
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
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
        </div>
    );
}
