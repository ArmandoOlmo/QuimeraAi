/**
 * Step4TemplateSelect
 * Fourth step: Template gallery + component selection
 * The user manually picks their template (organized by color scheme).
 * AI recommendation has been removed — the user is in full control.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Check, Eye, EyeOff, Star, ChevronDown, ChevronUp, Palette, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project, PageSection } from '../../../types';
import { getIndustryComponentDefaults } from '../../../types/onboarding';

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
    industry: string;
    onUpdate: (templateId: string, templateName: string, enabledComponents: PageSection[], disabledComponents: PageSection[]) => void;
}

// All available components (complete list)
const ALL_COMPONENTS: PageSection[] = [
    'header', 'topBar', 'logoBanner', 'hero', 'heroSplit', 'heroGallery', 'heroWave', 'heroNova',
    'features', 'services', 'testimonials',
    'team', 'portfolio', 'pricing', 'faq', 'cta', 'video', 'slideshow',
    'howItWorks', 'newsletter', 'leads', 'banner', 'menu', 'map',
    'products', 'announcementBar',
    'cmsFeed', 'chatbot', 'signupFloat', 'footer'
];

// Component labels


const Step4TemplateSelect: React.FC<Step4TemplateSelectProps> = ({
    templates,
    selectedTemplateId,
    enabledComponents: initialEnabledComponents,
    disabledComponents: initialDisabledComponents,
    industry,
    onUpdate,
}) => {
    const { t } = useTranslation();
    const [showComponentSettings, setShowComponentSettings] = useState(true);
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

    const handleSelectTemplate = (template: Project) => {
        // Get components that the template actually has (from sectionVisibility)
        const templateComponents = Object.keys(template.sectionVisibility || {}).filter(
            key => template.sectionVisibility?.[key as keyof typeof template.sectionVisibility]
        ) as PageSection[];

        // Get recommended components for this industry
        const recommended = industryDefaults.recommended;
        const disabled = industryDefaults.disabled;

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
        <div className="space-y-6">
            {/* Header + Instructions */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <Layout size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-editor-text-primary mb-2">
                    {t('onboarding.step4Heading', 'Choose Your Template')}
                </h3>
                <p className="text-editor-text-secondary max-w-lg mx-auto">
                    {t('onboarding.step4Subheading2', 'Browse the templates below and pick the one you like. Each template has its own unique color palette and style.')}
                </p>
            </div>

            {/* Info Box — organized by color + full customization */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
                    <Palette size={18} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-editor-text-primary text-sm mb-1">
                        {t('onboarding.templateColorHint', 'Templates organized by color')}
                    </h4>
                    <p className="text-xs text-editor-text-secondary leading-relaxed">
                        {t('onboarding.templateCustomizeHint', 'Each template comes with a pre-designed color scheme. Choose the one that best matches your brand — but don\'t worry, you can edit absolutely everything later: colors, texts, images, and components. Make it 100% yours!')}
                    </p>
                </div>
            </div>

            {/* Template Gallery */}
            <div>
                <h4 className="text-sm font-medium text-editor-text-secondary mb-4">
                    {t('onboarding.allTemplates', 'All Templates')} ({templates.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2">
                    {templates.map((template) => {
                        const isSelected = selectedTemplateId === template.id;
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

            {/* Component Settings — open by default */}
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
                                {t('onboarding.componentSettingsHintManual', 'Toggle components on/off based on your needs. Components marked with ⭐ are recommended for your industry.')}
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
                    {t('onboarding.step4TipManual', 'Pick the template that catches your eye — you\'ll be able to customize every detail later in the editor. Colors, fonts, images, components... everything is editable!')}
                </p>
            </div>
        </div>
    );
};

export default Step4TemplateSelect;
