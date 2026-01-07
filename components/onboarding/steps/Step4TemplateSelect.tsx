/**
 * Step4TemplateSelect
 * Fourth step: AI template recommendation + gallery + component selection
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Sparkles, Check, Eye, EyeOff, AlertCircle, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project, PageSection } from '../../../types';
import { TemplateRecommendation, getIndustryComponentDefaults } from '../../../types/onboarding';
import AIAssistButton from '../components/AIAssistButton';

// Helper to get template colors safely
const getTemplateColors = (template: Project) => {
    const gc = template.theme?.globalColors;
    return {
        primary: gc?.primary || '#6366f1',
        secondary: gc?.secondary || '#8b5cf6',
        accent: gc?.accent || '#f59e0b',
        background: gc?.background || '#0d0514',
        text: gc?.text || '#ffffff'
    };
};

interface Step4TemplateSelectProps {
    templates: Project[];
    selectedTemplateId?: string;
    enabledComponents?: PageSection[];
    disabledComponents?: PageSection[];
    aiRecommendation?: TemplateRecommendation;
    industry: string;
    onUpdate: (templateId: string, templateName: string, enabledComponents: PageSection[], disabledComponents: PageSection[]) => void;
    onGetRecommendation: () => Promise<TemplateRecommendation>;
}

// All available components
const ALL_COMPONENTS: PageSection[] = [
    'header', 'hero', 'heroSplit', 'features', 'services', 'testimonials',
    'team', 'portfolio', 'pricing', 'faq', 'cta', 'video', 'slideshow',
    'howItWorks', 'newsletter', 'leads', 'banner', 'menu', 'map', 'footer'
];

// Component labels


const Step4TemplateSelect: React.FC<Step4TemplateSelectProps> = ({
    templates,
    selectedTemplateId,
    enabledComponents: initialEnabledComponents,
    disabledComponents: initialDisabledComponents,
    aiRecommendation,
    industry,
    onUpdate,
    onGetRecommendation,
}) => {
    const { t } = useTranslation();
    const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
    const [recommendation, setRecommendation] = useState<TemplateRecommendation | null>(aiRecommendation || null);
    const [error, setError] = useState<string | null>(null);
    const [showComponentSettings, setShowComponentSettings] = useState(false);
    const [localEnabledComponents, setLocalEnabledComponents] = useState<PageSection[]>(
        initialEnabledComponents || []
    );
    const [localDisabledComponents, setLocalDisabledComponents] = useState<PageSection[]>(
        initialDisabledComponents || []
    );

    // Get industry defaults
    const industryDefaults = useMemo(() => getIndustryComponentDefaults(industry), [industry]);

    // Initialize components based on template + industry when template is selected
    useEffect(() => {
        if (selectedTemplateId && !initialEnabledComponents?.length) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                // Get components that the template actually has
                const templateComponents = Object.keys(template.sectionVisibility || {}).filter(
                    key => template.sectionVisibility?.[key as keyof typeof template.sectionVisibility]
                ) as PageSection[];

                // Enable only recommended + optional for this industry (intersected with what template has)
                const enabled = templateComponents.filter(comp =>
                    industryDefaults.recommended.includes(comp) ||
                    industryDefaults.optional.includes(comp) ||
                    comp === 'header' || comp === 'footer'
                );

                // Disable what template has but industry doesn't need
                const disabled = templateComponents.filter(comp =>
                    !enabled.includes(comp)
                );

                setLocalEnabledComponents(enabled);
                setLocalDisabledComponents(disabled);
            }
        }
    }, [selectedTemplateId, industryDefaults, initialEnabledComponents, templates]);

    // Get recommendation on mount if not already done
    useEffect(() => {
        if (!recommendation && templates.length > 0) {
            handleGetRecommendation();
        }
    }, [templates.length]);

    const handleGetRecommendation = async () => {
        setIsLoadingRecommendation(true);
        setError(null);
        try {
            const rec = await onGetRecommendation();
            setRecommendation(rec);
            // Auto-select recommended template
            if (rec.templateId) {
                const template = templates.find(t => t.id === rec.templateId);
                if (template) {
                    handleSelectTemplate(template, rec);
                }
            }
        } catch (err: any) {
            console.error('Failed to get recommendation:', err);
            setError(t('onboarding.errorGettingRecommendation', 'Failed to get AI recommendation.'));
        } finally {
            setIsLoadingRecommendation(false);
        }
    };

    const handleSelectTemplate = (template: Project, rec?: TemplateRecommendation) => {
        // Get components that the template actually has (from sectionVisibility)
        const templateComponents = Object.keys(template.sectionVisibility || {}).filter(
            key => template.sectionVisibility?.[key as keyof typeof template.sectionVisibility]
        ) as PageSection[];

        // Get recommended components for this industry
        const recommended = rec?.suggestedComponents || industryDefaults.recommended;
        const disabled = rec?.disabledComponents || industryDefaults.disabled;

        // Enable only components that: 1) template has AND 2) are recommended for industry
        const enabledComponents = templateComponents.filter(comp =>
            recommended.includes(comp) ||
            industryDefaults.optional.includes(comp) ||
            comp === 'header' || comp === 'footer' // Always keep header/footer
        );

        // Disable components that: 1) template has BUT 2) are not needed for this industry
        const disabledComponents = templateComponents.filter(comp =>
            disabled.includes(comp) ||
            (!recommended.includes(comp) && !industryDefaults.optional.includes(comp) && comp !== 'header' && comp !== 'footer')
        );

        // Debug logging only in development
        if (import.meta.env.DEV) {
            console.log('📋 Template components:', templateComponents);
            console.log('✅ Enabled:', enabledComponents);
            console.log('❌ Disabled:', disabledComponents);
        }

        setLocalEnabledComponents(enabledComponents);
        setLocalDisabledComponents(disabledComponents);

        onUpdate(template.id, template.name, enabledComponents, disabledComponents);
    };

    const handleToggleComponent = (component: PageSection) => {
        let newEnabled = [...localEnabledComponents];
        let newDisabled = [...localDisabledComponents];

        if (newEnabled.includes(component)) {
            newEnabled = newEnabled.filter(c => c !== component);
            newDisabled.push(component);
        } else {
            newDisabled = newDisabled.filter(c => c !== component);
            newEnabled.push(component);
        }

        setLocalEnabledComponents(newEnabled);
        setLocalDisabledComponents(newDisabled);

        if (selectedTemplateId) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                onUpdate(template.id, template.name, newEnabled, newDisabled);
            }
        }
    };

    const isComponentEnabled = (component: PageSection) => {
        return localEnabledComponents.includes(component);
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <Layout size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-editor-text-primary mb-2">
                    {t('onboarding.step4Heading', 'Choose Your Template')}
                </h3>
                <p className="text-editor-text-secondary">
                    {t('onboarding.step4Subheading', 'AI recommends the best template for your industry.')}
                </p>
            </div>

            {/* AI Recommendation */}
            {isLoadingRecommendation ? (
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 size={24} className="text-purple-400 animate-spin" />
                    <span className="text-editor-text-secondary">
                        {t('onboarding.analyzingBusiness', 'Analyzing your business...')}
                    </span>
                </div>
            ) : recommendation ? (
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Sparkles size={20} className="text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-editor-text-primary flex items-center gap-2">
                                {t('onboarding.aiRecommends', 'AI Recommends')}
                                <span className="text-purple-400">{recommendation.templateName}</span>
                                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                    {recommendation.matchScore}% {t('onboarding.match', 'match')}
                                </span>
                            </h4>
                            <ul className="mt-2 space-y-1">
                                {recommendation.matchReasons.map((reason, index) => (
                                    <li key={index} className="text-sm text-editor-text-secondary flex items-center gap-2">
                                        <Check size={14} className="text-green-400" />
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex justify-center">
                    <AIAssistButton
                        onClick={handleGetRecommendation}
                        isLoading={isLoadingRecommendation}
                        label={t('onboarding.getRecommendation', 'Get AI Recommendation')}
                        size="lg"
                    />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Template Gallery */}
            <div>
                <h4 className="text-sm font-medium text-editor-text-secondary mb-4">
                    {t('onboarding.allTemplates', 'All Templates')} ({templates.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
                    {templates.map((template) => {
                        const isSelected = selectedTemplateId === template.id;
                        const isRecommended = recommendation?.templateId === template.id;
                        const colors = getTemplateColors(template);

                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className={`
                                    relative group rounded-xl overflow-hidden border-2 transition-all
                                    ${isSelected
                                        ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                                        : 'hover:scale-[1.02] hover:shadow-lg'
                                    }
                                `}
                                style={{
                                    borderColor: isSelected ? undefined : `${colors?.primary}50`,
                                }}
                            >
                                {/* Color accent bar at top */}
                                <div 
                                    className="absolute top-0 left-0 right-0 h-1 z-10"
                                    style={{
                                        background: `linear-gradient(90deg, ${colors?.primary}, ${colors?.secondary}, ${colors?.accent})`,
                                    }}
                                />

                                {/* Thumbnail */}
                                <div className="aspect-video overflow-hidden relative">
                                    {template.thumbnailUrl ? (
                                        <img
                                            src={template.thumbnailUrl}
                                            alt={template.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div 
                                            className="w-full h-full flex items-center justify-center"
                                            style={{
                                                background: `linear-gradient(135deg, ${colors?.background} 0%, ${colors?.primary}30 50%, ${colors?.secondary}40 100%)`,
                                            }}
                                        >
                                            <Layout size={32} style={{ color: colors?.text, opacity: 0.5 }} />
                                        </div>
                                    )}
                                </div>

                                {/* Name & Colors */}
                                <div 
                                    className="p-2"
                                    style={{
                                        background: `linear-gradient(135deg, ${colors?.background}ee 0%, ${colors?.primary}20 100%)`,
                                    }}
                                >
                                    <p className="text-sm font-medium text-editor-text-primary truncate mb-1.5">
                                        {template.name}
                                    </p>
                                    {/* Color swatches */}
                                    <div className="flex items-center gap-1">
                                        {[colors?.primary, colors?.secondary, colors?.accent, colors?.text].map((color, idx) => (
                                            <div 
                                                key={idx}
                                                className="w-4 h-4 rounded-full shadow-sm"
                                                style={{ 
                                                    backgroundColor: color,
                                                    border: '1.5px solid rgba(255,255,255,0.2)',
                                                }} 
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Selected indicator */}
                                {isSelected && (
                                    <div className="absolute top-3 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                                        <Check size={14} className="text-slate-900" />
                                    </div>
                                )}

                                {/* AI Recommended badge */}
                                {isRecommended && (
                                    <div className="absolute top-3 left-2 px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full flex items-center gap-1 shadow-lg">
                                        <Star size={10} />
                                        AI
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {templates.length === 0 && (
                    <div className="text-center py-8 text-editor-text-secondary">
                        <Layout size={48} className="mx-auto mb-4 opacity-30" />
                        <p>{t('onboarding.noTemplatesAvailable', 'No templates available')}</p>
                    </div>
                )}
            </div>

            {/* Component Settings */}
            {selectedTemplate && (
                <div className="border border-editor-border rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowComponentSettings(!showComponentSettings)}
                        className="w-full flex items-center justify-between p-4 bg-editor-sidebar hover:bg-editor-sidebar-hover transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Eye size={18} className="text-editor-text-secondary" />
                            <span className="font-medium text-editor-text-primary">
                                {t('onboarding.componentSettings', 'Component Settings')}
                            </span>
                            <span className="text-xs text-editor-text-secondary">
                                ({localEnabledComponents.length} {t('onboarding.active', 'active')})
                            </span>
                        </div>
                        {showComponentSettings ? (
                            <ChevronUp size={18} className="text-editor-text-secondary" />
                        ) : (
                            <ChevronDown size={18} className="text-editor-text-secondary" />
                        )}
                    </button>

                    {showComponentSettings && (
                        <div className="p-4 border-t border-editor-border">
                            <p className="text-sm text-editor-text-secondary mb-4">
                                {t('onboarding.componentSettingsHint', 'Toggle components on/off based on your needs. AI has pre-selected the best options for your industry.')}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {ALL_COMPONENTS.map((component) => {
                                    const isEnabled = isComponentEnabled(component);
                                    const isRecommended = industryDefaults.recommended.includes(component);

                                    return (
                                        <button
                                            key={component}
                                            onClick={() => handleToggleComponent(component)}
                                            className={`
                                                flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                                                ${isEnabled
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : 'bg-editor-sidebar-hover text-editor-text-secondary border border-transparent'
                                                }
                                            `}
                                        >
                                            {isEnabled ? (
                                                <Eye size={14} />
                                            ) : (
                                                <EyeOff size={14} className="opacity-50" />
                                            )}
                                            <span className="truncate">{t(`onboarding.componentsList.${component}` as any, component)}</span>
                                            {isRecommended && (
                                                <Star size={10} className="text-yellow-400 flex-shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tip */}
            <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl">
                <p className="text-sm text-pink-300">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step4Tip', 'The AI analyzes your industry and business type to suggest the most suitable template and components. You can always customize everything later in the editor.')}
                </p>
            </div>
        </div>
    );
};

export default Step4TemplateSelect;
