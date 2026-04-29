import React, { useState } from 'react';
import ColorControl from '../../ui/ColorControl';
import { Input, TextArea, Select } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { Type, Settings, Link as LinkIcon, Image, Layout, CheckSquare, Plus, Trash2, Palette, Box, FolderOpen, FileText } from 'lucide-react';
import { ControlsDeps } from '../ControlsShared';
import { SingleContentSelector } from '../../ui/EcommerceControls';
import TabbedControls from '../../ui/TabbedControls';

// Helper for Anchor Links
const AnchorLinkControl: React.FC<{ label: string, fieldKey: string, deps: ControlsDeps & { allSections?: any[] } }> = ({ label, fieldKey, deps }) => {
    const { data, setNestedData, allSections, t } = deps;
    const linkTypeField = `${fieldKey}Type`;
    
    // Determine initial link type based on existing data if type is not set
    const initialLinkType = data[linkTypeField] || 
        (data[fieldKey]?.startsWith('#section-') ? 'section' : 
         data[fieldKey]?.includes('/blog/') ? 'content' : 'manual');

    const linkType = data[linkTypeField] || initialLinkType;

    const handleLinkTypeChange = (type: string) => {
        setNestedData(linkTypeField, type);
    };

    const sectionOptions = (allSections || []).map(s => ({
        value: `#section-${s.id}`,
        label: s.type
    }));
    sectionOptions.unshift({ value: '', label: t('editor.none', 'Ninguno') });

    const linkTypes = [
        { value: 'section', label: t('editor.pageSection', 'Sección') },
        { value: 'manual', label: t('editor.manualUrl', 'URL') },
        { value: 'content', label: t('editor.content', 'Blog') },
    ];

    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                <LinkIcon size={14} />
                {label}
            </label>
            
            {/* Link Type Selector */}
            <div className="flex flex-wrap bg-q-bg p-1 rounded-md border border-q-border mb-3 gap-1">
                {linkTypes.map(type => (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => handleLinkTypeChange(type.value)}
                        className={`flex-1 min-w-[60px] py-1.5 px-2 text-[10px] font-medium rounded-sm transition-colors ${(linkType) === type.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Section Selector */}
            {linkType === 'section' && (
                <Select
                    value={data[fieldKey] || ''}
                    onChange={(val) => setNestedData(fieldKey, val)}
                    options={sectionOptions}
                    noMargin
                />
            )}

            {/* Manual URL Input */}
            {linkType === 'manual' && (
                <Input
                    label=""
                    value={data[fieldKey] || ''}
                    onChange={(e) => setNestedData(fieldKey, e.target.value)}
                    placeholder="https://... o /pagina"
                    className="mb-0"
                />
            )}

            {/* Content Picker */}
            {linkType === 'content' && (
                <SingleContentSelector
                    selectedContentPath={data[fieldKey] || undefined}
                    onSelect={(path) => {
                        if (path) {
                            setNestedData(fieldKey, path);
                        } else {
                            setNestedData(fieldKey, '');
                        }
                    }}
                    label={t('editor.controls.common.selectContent', 'Seleccionar Contenido')}
                />
            )}
        </div>
    );
};

// Generic List Manager for Quimera
const QuimeraListControl: React.FC<{
    arrayKey: string;
    itemLabel: string;
    fields: { key: string, label: string, type: 'input' | 'textarea' | 'image' | 'select' | 'checkbox', options?: string[] }[];
    deps: ControlsDeps;
}> = ({ arrayKey, itemLabel, fields, deps }) => {
    const { data, setNestedData, t } = deps;
    const items = data[arrayKey] || [];

    return (
        <div className="mb-4 space-y-3">
            <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
                <Layout size={14} />
                {t('editor.listOf', 'Lista de')} {itemLabel}
            </label>
            {items.map((item: any, index: number) => (
                <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border relative group">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-q-text-secondary">{itemLabel} #{index + 1}</span>
                        <button type="button" 
                            onClick={() => {
                                const newItems = items.filter((_: any, i: number) => i !== index);
                                setNestedData(arrayKey, newItems);
                            }}
                            className="text-q-text-secondary hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {fields.map(field => {
                            if (field.type === 'textarea') {
                                return (
                                    <TextArea
                                        key={field.key}
                                        value={item[field.key] || ''}
                                        onChange={(e) => setNestedData(`${arrayKey}.${index}.${field.key}`, e.target.value)}
                                        placeholder={field.label}
                                        rows={2}
                                    />
                                );
                            }
                            if (field.type === 'select') {
                                return (
                                    <Select
                                        key={field.key}
                                        value={item[field.key] || ''}
                                        onChange={(val) => setNestedData(`${arrayKey}.${index}.${field.key}`, val)}
                                        options={field.options?.map(opt => ({ value: opt, label: opt })) || []}
                                    />
                                );
                            }
                            if (field.type === 'checkbox') {
                                return (
                                    <label key={field.key} className="flex items-center gap-2 text-xs text-q-text-secondary">
                                        <input
                                            type="checkbox"
                                            checked={!!item[field.key]}
                                            onChange={(e) => setNestedData(`${arrayKey}.${index}.${field.key}`, e.target.checked)}
                                            className="rounded border-q-border bg-q-surface text-q-accent focus:ring-q-accent"
                                        />
                                        {field.label}
                                    </label>
                                );
                            }
                            return (
                                <Input
                                    key={field.key}
                                    value={item[field.key] || ''}
                                    onChange={(e) => setNestedData(`${arrayKey}.${index}.${field.key}`, e.target.value)}
                                    placeholder={field.label}
                                    label=""
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={() => {
                    const newItem = fields.reduce((acc, field) => ({ ...acc, [field.key]: field.type === 'checkbox' ? false : '' }), {});
                    setNestedData(arrayKey, [...items, newItem]);
                }}
                className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Plus size={14} /> {t('editor.add', 'Agregar')} {itemLabel}
            </button>
        </div>
    );
};

// Generic Styles Editor for Quimera (removed duplicate, keeping existing renderCommonColorControls)

// Common Text Content
const renderCommonTextControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                <Type size={14} />
                {t('controls.content', 'Contenido')}
            </label>
            <AIFormControl label="Título" onAssistClick={() => setAiAssistField?.({ path: 'title', value: data.title, context: 'Section Title' })}>
                <TextArea value={data.title || ''} onChange={(e) => setNestedData('title', e.target.value)} rows={2} placeholder="Escribe el título aquí..." />
            </AIFormControl>
            <AIFormControl label="Subtítulo" onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Section Subtitle' })}>
                <TextArea value={data.subtitle || ''} onChange={(e) => setNestedData('subtitle', e.target.value)} rows={3} placeholder="Escribe el subtítulo aquí..." />
            </AIFormControl>
        </div>
    );
};

// Common Colors
const renderCommonColorControls = (deps: ControlsDeps, portalContainer?: HTMLElement | null) => {
    const { data, setNestedData, t } = deps;
    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                <Settings size={14} />
                {t('editor.controls.common.colors', 'Colores')}
            </label>
            <div className="space-y-3">
                <ColorControl label="Color de Fondo (Background)" value={data.colors?.background} onChange={(v) => setNestedData('colors.background', v)} portalContainer={portalContainer} />
                <ColorControl label="Color de Texto Principal (Text)" value={data.colors?.text} onChange={(v) => setNestedData('colors.text', v)} portalContainer={portalContainer} />
                <ColorControl label="Color de Acento (Accent)" value={data.colors?.accent} onChange={(v) => setNestedData('colors.accent', v)} portalContainer={portalContainer} />
            </div>
        </div>
    );
};

// Helper to wrap content and styles in tabs
const withQuimeraTabs = (
    contentControls: React.ReactNode,
    deps: ControlsDeps & { portalContainer?: HTMLElement | null }
) => {
    return (
        <TabbedControls
            contentTab={<div className="space-y-4 pt-4">{contentControls}</div>}
            styleTab={<div className="space-y-4 pt-4">{renderCommonColorControls(deps, deps.portalContainer)}</div>}
        />
    );
};

// Hero Quimera
export const renderHeroQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null, allSections?: any[] }) => {
    const { data, setNestedData } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botones
                </label>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <Input label="Texto Botón Principal" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} />
                    <Input label="Texto Botón Secundario" value={data.secondaryButtonText || ''} onChange={(e) => setNestedData('secondaryButtonText', e.target.value)} />
                </div>
            </div>
            {/* Anchor Link Components */}
            <AnchorLinkControl label="Enlace Botón Principal" fieldKey="buttonLink" deps={deps} />
            <AnchorLinkControl label="Enlace Botón Secundario" fieldKey="secondaryButtonLink" deps={deps} />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Features Quimera (Also used by Metrics, AI Capabilities, etc. if they share the same schema)
export const renderFeaturesQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Zap, Star, Shield)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// CTA Quimera
export const renderCtaQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null, allSections?: any[] }) => {
    const { data, setNestedData } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botones
                </label>
                <Input label="Texto del Botón" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} />
            </div>
            {/* Anchor Link Component */}
            <AnchorLinkControl label="Enlace del Botón" fieldKey="buttonLink" deps={deps} />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Pricing Quimera
export const renderPricingQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="plans"
                itemLabel={t('editor.plan', 'Plan')}
                fields={[
                    { key: 'name', label: t('editor.name', 'Nombre del Plan'), type: 'input' },
                    { key: 'price', label: t('editor.price', 'Precio'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' },
                    { key: 'buttonText', label: t('editor.buttonText', 'Texto del Botón'), type: 'input' },
                    { key: 'popular', label: t('editor.popular', 'Destacado / Popular'), type: 'checkbox' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Testimonials Quimera
export const renderTestimonialsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="testimonials"
                itemLabel={t('editor.testimonial', 'Testimonio')}
                fields={[
                    { key: 'name', label: t('editor.name', 'Nombre'), type: 'input' },
                    { key: 'role', label: t('editor.role', 'Rol / Puesto'), type: 'input' },
                    { key: 'content', label: t('editor.content', 'Contenido'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// FAQ Quimera
export const renderFaqQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="faqs"
                itemLabel={t('editor.faq', 'Pregunta Frecuente')}
                fields={[
                    { key: 'question', label: t('editor.question', 'Pregunta'), type: 'input' },
                    { key: 'answer', label: t('editor.answer', 'Respuesta'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Metrics Quimera
export const renderMetricsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="metrics"
                itemLabel={t('editor.metric', 'Métrica')}
                fields={[
                    { key: 'value', label: t('editor.value', 'Valor (ej. 99%)'), type: 'input' },
                    { key: 'label', label: t('editor.label', 'Etiqueta'), type: 'input' },
                    { key: 'icon', label: t('editor.icon', 'Ícono (opcional)'), type: 'input' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Platform Showcase Quimera
export const renderPlatformShowcaseQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="features"
                itemLabel="Feature (Bento Grid)"
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Layout, Database)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// AI Capabilities Quimera
export const renderAiCapabilitiesQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="capabilities"
                itemLabel="Capacidad AI"
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. MessageSquare, FileText)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Agency White Label Quimera
export const renderAgencyWhiteLabelQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { data, setNestedData, t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="features"
                itemLabel="Característica"
                fields={[
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botón de Acción
                </label>
                <Input label="Texto del Botón" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} />
            </div>
            {/* Anchor Link Component */}
            <AnchorLinkControl label="Enlace del Botón" fieldKey="buttonLink" deps={deps} />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Industry Solutions Quimera
export const renderIndustrySolutionsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps)}
            <QuimeraListControl
                arrayKey="industries"
                itemLabel="Industria"
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Building2, ShoppingBag)'), type: 'input' },
                    { key: 'name', label: t('editor.name', 'Nombre de Industria'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título de la Solución'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' },
                    { key: 'featuresList', label: t('editor.featuresList', 'Características (una por línea)'), type: 'textarea' },
                    { key: 'imageColor', label: t('editor.imageColor', 'Clases de color (ej. from-blue-900 to-black)'), type: 'input' }
                ]}
                deps={deps}
            />
        </>
    );
    return withQuimeraTabs(content, deps);
};

// Generic fallback for Quimera suite components that share title/subtitle/colors
export const renderGenericQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    return withQuimeraTabs(
        <>{renderCommonTextControls(deps)}</>,
        deps
    );
};
