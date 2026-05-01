import React, { useState } from 'react';
import ColorControl from '../../ui/ColorControl';
import { Input, TextArea, Select, ToggleControl, SliderControl, I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { Type, Settings, Link as LinkIcon, Image, Layout, CheckSquare, Plus, Trash2, Palette, Box, FolderOpen, FileText, Layers, Maximize2 } from 'lucide-react';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
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
                <I18nInput
                    label=""
                    value={data[fieldKey] || ''}
                    onChange={(val) => setNestedData(fieldKey, val)}
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
    defaultItems?: any[];
}> = ({ arrayKey, itemLabel, fields, deps, defaultItems }) => {
    const { data, setNestedData, t } = deps;
    const hasData = data[arrayKey] && data[arrayKey].length > 0;
    const items = hasData ? data[arrayKey] : (defaultItems || []);

    const handleChange = (index: number, key: string, value: any) => {
        if (!hasData) {
            // First edit: instantiate the default array in data
            const newItems = [...(defaultItems || [])].map(item => ({...item}));
            if (newItems[index]) newItems[index][key] = value;
            setNestedData(arrayKey, newItems);
        } else {
            setNestedData(`${arrayKey}.${index}.${key}`, value);
        }
    };

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
                                    <I18nTextArea
                                        key={field.key}
                                        value={item[field.key] || ''}
                                        onChange={(val) => handleChange(index, field.key, val)}
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
                                        onChange={(val) => handleChange(index, field.key, val)}
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
                                            onChange={(e) => handleChange(index, field.key, e.target.checked)}
                                            className="rounded border-q-border bg-q-surface text-q-accent focus:ring-q-accent"
                                        />
                                        {field.label}
                                    </label>
                                );
                            }
                            return (
                                <I18nInput
                                    key={field.key}
                                    value={item[field.key] || ''}
                                    onChange={(val) => handleChange(index, field.key, val)}
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
const renderCommonTextControls = (deps: ControlsDeps, defaultTitle?: string, defaultSubtitle?: string) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                <Type size={14} />
                {t('controls.content', 'Contenido')}
            </label>
            <AIFormControl label="Título" onAssistClick={() => setAiAssistField?.({ path: 'title', value: data.title, context: 'Section Title' })}>
                <I18nTextArea value={data.title || ''} onChange={(val) => setNestedData('title', val)} rows={2} placeholder={defaultTitle || "Escribe el título aquí..."} />
            </AIFormControl>
            <AIFormControl label="Subtítulo" onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Section Subtitle' })}>
                <I18nTextArea value={data.subtitle || ''} onChange={(val) => setNestedData('subtitle', val)} rows={3} placeholder={defaultSubtitle || "Escribe el subtítulo aquí..."} />
            </AIFormControl>
        </div>
    );
};



// Hero Quimera
export const renderHeroQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null, allSections?: any[] }) => {
    const { data, setNestedData, setAiAssistField, t } = deps;

    const contentTab = (
        <div className="space-y-4">
            {/* Badge Text */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Type size={14} />
                    {t('editor.heroQuimeraControls.content', 'Contenido')}
                </label>
                <AIFormControl label={t('editor.heroQuimeraControls.badgeText', 'Texto del Badge')} onAssistClick={() => setAiAssistField?.({ path: 'badgeText', value: data.badgeText, context: 'Hero Badge' })}>
                    <I18nInput value={data.badgeText || ''} onChange={(val) => setNestedData('badgeText', val)} placeholder="QuimeraAi Agency OS 2.0" label="" />
                </AIFormControl>
                <AIFormControl label={t('editor.heroQuimeraControls.title', 'Título')} onAssistClick={() => setAiAssistField?.({ path: 'title', value: data.title, context: 'Hero Title' })}>
                    <I18nTextArea value={data.title || ''} onChange={(val) => setNestedData('title', val)} rows={2} placeholder="Diseña tu futuro digital" />
                </AIFormControl>
                <AIFormControl label={t('editor.heroQuimeraControls.subtitle', 'Subtítulo')} onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Hero Subtitle' })}>
                    <I18nTextArea value={data.subtitle || ''} onChange={(val) => setNestedData('subtitle', val)} rows={3} placeholder="Crea sitios web impresionantes..." />
                </AIFormControl>
            </div>

            {/* Buttons */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} />
                    {t('editor.heroQuimeraControls.buttons', 'Botones')}
                </label>
                <I18nInput label={t('editor.heroQuimeraControls.primaryButtonText', 'Texto Botón Principal')} value={data.buttonText || ''} onChange={(val) => setNestedData('buttonText', val)} placeholder="Ej. Empezar Gratis" />
                <AnchorLinkControl label={t('editor.heroQuimeraControls.primaryButtonLink', 'Enlace Botón Principal')} fieldKey="buttonLink" deps={deps} />
                <div className="mt-4 border-t border-q-border pt-4">
                    <I18nInput label={t('editor.heroQuimeraControls.secondaryButtonText', 'Texto Botón Secundario')} value={data.secondaryButtonText || ''} onChange={(val) => setNestedData('secondaryButtonText', val)} placeholder="Ej. Ver Demo" />
                    <AnchorLinkControl label={t('editor.heroQuimeraControls.secondaryButtonLink', 'Enlace Botón Secundario')} fieldKey="secondaryButtonLink" deps={deps} />
                </div>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image */}
            <BackgroundImageControl sectionKey="" data={{ '': data }} setNestedData={(path, value) => {
                // BackgroundImageControl prefixes with sectionKey, but here data is flat
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                setNestedData(cleanPath, value);
            }} />

            {/* Layout */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Maximize2 size={14} />
                    {t('editor.heroQuimeraControls.layout', 'Layout')}
                </label>
                <SliderControl
                    label={t('editor.heroQuimeraControls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={data.sectionHeight || 80}
                    onChange={(v) => setNestedData('sectionHeight', v)}
                    min={50} max={100} step={5} suffix="vh"
                />
                <div>
                    <label className="block text-[11px] font-semibold text-q-text-secondary mb-1.5 uppercase tracking-wider">
                        {t('editor.heroQuimeraControls.textAlign', 'Alineación del Texto')}
                    </label>
                    <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
                        {(['left', 'center', 'right'] as const).map(align => (
                            <button
                                key={align}
                                type="button"
                                onClick={() => setNestedData('textAlign', align)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.textAlign || 'center') === align ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
                            >
                                {align === 'left' ? t('editor.heroQuimeraControls.alignLeft', 'Izquierda') : align === 'center' ? t('editor.heroQuimeraControls.alignCenter', 'Centro') : t('editor.heroQuimeraControls.alignRight', 'Derecha')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visual Effects */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} />
                    {t('editor.heroQuimeraControls.visualEffects', 'Efectos Visuales')}
                </label>
                <ToggleControl
                    label={t('editor.heroQuimeraControls.showDecoration', 'Mostrar Decoración (Ribbons)')}
                    checked={data.showDecoration ?? true}
                    onChange={(v) => setNestedData('showDecoration', v)}
                />
                <ToggleControl
                    label={t('editor.heroQuimeraControls.showParticles', 'Mostrar Partículas')}
                    checked={data.showParticles ?? true}
                    onChange={(v) => setNestedData('showParticles', v)}
                />
                <ToggleControl
                    label={t('editor.heroQuimeraControls.glassEffect', 'Efecto Cristal (Glassmorphism)')}
                    checked={data.glassEffect ?? false}
                    onChange={(v) => setNestedData('glassEffect', v)}
                />
                <ToggleControl
                    label={t('editor.heroQuimeraControls.textDropShadow', 'Sombra en Textos (Drop Shadow)')}
                    checked={data.textDropShadow ?? false}
                    onChange={(v) => setNestedData('textDropShadow', v)}
                />
            </div>

            {/* Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
                        <Settings size={14} />
                        {t('editor.controls.common.colors', 'Colores')}
                    </label>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.heroQuimeraControls.sectionColors', 'Sección')}</p>
                        <ColorControl label={t('editor.controls.common.background', 'Fondo')} value={data.colors?.background} onChange={(v) => setNestedData('colors.background', v)} />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.heroQuimeraControls.overlayColors', 'Overlay')}</p>
                        <ColorControl label={t('editor.heroQuimeraControls.overlayColor', 'Color de Overlay')} value={data.backgroundOverlayColor || data.colors?.background || '#000000'} onChange={(v) => setNestedData('backgroundOverlayColor', v)} />
                        <SliderControl
                            label={t('editor.heroQuimeraControls.overlayOpacity', 'Opacidad del Overlay')}
                            value={data.backgroundOverlayOpacity ?? 60}
                            onChange={(v) => setNestedData('backgroundOverlayOpacity', v)}
                            min={0} max={100} step={5} suffix="%"
                        />
                        <ToggleControl
                            label={t('editor.heroQuimeraControls.enableOverlay', 'Activar Overlay')}
                            checked={data.backgroundOverlayEnabled !== false}
                            onChange={(v) => setNestedData('backgroundOverlayEnabled', v)}
                        />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.heroQuimeraControls.textColors', 'Texto')}</p>
                        <ColorControl label={t('editor.controls.common.title', 'Título')} value={data.colors?.text} onChange={(v) => setNestedData('colors.text', v)} />
                        <ColorControl label={t('editor.heroQuimeraControls.secondaryText', 'Subtítulo')} value={data.colors?.secondaryText} onChange={(v) => setNestedData('colors.secondaryText', v)} />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.heroQuimeraControls.accentColors', 'Acento & Botones')}</p>
                        <ColorControl label={t('editor.controls.common.accent', 'Color de Acento')} value={data.colors?.accent} onChange={(v) => setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

// Features Quimera (Also used by Metrics, AI Capabilities, etc. if they share the same schema)
export const renderFeaturesQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Zap', title: 'Velocidad Increíble', description: 'Optimizada para cargar en milisegundos.' },
        { icon: 'Shield', title: 'Seguridad Total', description: 'Protección avanzada contra amenazas.' },
        { icon: 'Star', title: 'Diseño Premium', description: 'Interfaces que capturan la atención.' },
        { icon: 'Smartphone', title: 'Mobile First', description: 'Se ve perfecto en cualquier dispositivo.' },
        { icon: 'Database', title: 'Datos Seguros', description: 'Backups automáticos diarios.' },
        { icon: 'Globe', title: 'Alcance Global', description: 'CDN distribuida mundialmente.' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Todo lo que necesitas", "Descubre todas las herramientas...")}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Zap, Star, Shield)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
                <ToggleControl
                    label={t('editor.heroQuimeraControls.glassEffect', 'Efecto Cristal (Glassmorphism)')}
                    checked={deps.data.glassEffect !== false}
                    onChange={(v) => deps.setNestedData('glassEffect', v)}
                />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// CTA Quimera
export const renderCtaQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null, allSections?: any[] }) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const content = (
        <>
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Type size={14} />
                    {t('controls.content', 'Contenido')}
                </label>
                <AIFormControl label="Etiqueta Superior (Badge)" onAssistClick={() => setAiAssistField?.({ path: 'badgeText', value: data.badgeText, context: 'CTA Badge' })}>
                    <I18nInput value={data.badgeText || ''} onChange={(val) => setNestedData('badgeText', val)} placeholder="Ej. Sin tarjeta de crédito requerida" label="" />
                </AIFormControl>
                <AIFormControl label="Título" onAssistClick={() => setAiAssistField?.({ path: 'title', value: data.title, context: 'Section Title' })}>
                    <I18nTextArea value={data.title || ''} onChange={(val) => setNestedData('title', val)} rows={2} placeholder="¿Listo para escalar tu negocio digital?" />
                </AIFormControl>
                <AIFormControl label="Subtítulo" onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Section Subtitle' })}>
                    <I18nTextArea value={data.subtitle || ''} onChange={(val) => setNestedData('subtitle', val)} rows={3} placeholder="Escribe el subtítulo aquí..." />
                </AIFormControl>
            </div>
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botones
                </label>
                <I18nInput label="Texto Botón Principal" value={data.buttonText || ''} onChange={(val) => setNestedData('buttonText', val)} placeholder="Ej. Empezar Gratis" />
                <AnchorLinkControl label="Enlace Botón Principal" fieldKey="buttonLink" deps={deps} />
                
                <div className="mt-4 border-t border-q-border pt-4">
                    <I18nInput label="Texto Botón Secundario (Opcional)" value={data.secondaryButtonText || ''} onChange={(val) => setNestedData('secondaryButtonText', val)} placeholder="Ej. Ver Demo" />
                    <AnchorLinkControl label="Enlace Botón Secundario" fieldKey="secondaryButtonLink" deps={deps} />
                </div>
            </div>
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Pricing Quimera
export const renderPricingQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultPlans = [
        { name: "Básico", price: "$29", description: "Para empezar.", buttonText: "Comenzar", popular: false },
        { name: "Pro", price: "$79", description: "Lo más popular.", buttonText: "Prueba Gratis", popular: true },
        { name: "Empresa", price: "$199", description: "Para escalar.", buttonText: "Contactar", popular: false }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Planes Simples y Transparentes", "Elige el plan que mejor se adapte a tus necesidades. Sin sorpresas ocultas ni contratos a largo plazo.")}
            <QuimeraListControl
                arrayKey="plans"
                itemLabel={t('editor.plan', 'Plan')}
                defaultItems={defaultPlans}
                fields={[
                    { key: 'name', label: t('editor.name', 'Nombre del Plan'), type: 'input' },
                    { key: 'price', label: t('editor.price', 'Precio'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' },
                    { key: 'buttonText', label: t('editor.buttonText', 'Texto del Botón'), type: 'input' },
                    { key: 'buttonLink', label: t('editor.buttonLink', 'Enlace Botón'), type: 'input' },
                    { key: 'popular', label: t('editor.popular', 'Destacado / Popular'), type: 'checkbox' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Testimonials Quimera
export const renderTestimonialsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultTestimonials = [
        { author: "Laura Gómez", role: "Fundadora", company: "EduDigital", quote: "QuimeraAi nos permitió lanzar nuestra plataforma de cursos en días, no meses. La IA generó copys que convirtieron desde el día uno." },
        { author: "Carlos Mendoza", role: "Director Creativo", company: "Elevate Agency", quote: "Como agencia, la opción de marca blanca nos ha permitido ofrecer sitios web premium a nuestros clientes cobrando 3 veces más que antes. El editor es increíblemente fluido." },
        { author: "Elena Silva", role: "Broker", company: "Silva Real Estate", quote: "El sistema de inmobiliarias cambió nuestro negocio. Podemos listar propiedades automáticamente y la interfaz luce como un sitio de medio millón de dólares." }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Historias de Éxito", "Lo que nuestros clientes dicen de nosotros...")}
            <QuimeraListControl
                arrayKey="testimonials"
                itemLabel={t('editor.testimonial', 'Testimonio')}
                defaultItems={defaultTestimonials}
                fields={[
                    { key: 'author', label: t('editor.author', 'Nombre'), type: 'input' },
                    { key: 'role', label: t('editor.role', 'Rol / Puesto'), type: 'input' },
                    { key: 'company', label: t('editor.company', 'Empresa'), type: 'input' },
                    { key: 'quote', label: t('editor.quote', 'Testimonio / Cita'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// FAQ Quimera
export const renderFaqQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFaqs = [
        { question: '¿Cómo funciona?', answer: 'Es muy sencillo, regístrate y empieza a usar.' },
        { question: '¿Tienen soporte técnico?', answer: 'Sí, 24/7 a través de nuestro chat.' },
        { question: '¿Puedo cancelar en cualquier momento?', answer: 'Por supuesto, sin compromisos.' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Preguntas Frecuentes", "Resolvemos tus dudas principales")}
            <QuimeraListControl
                arrayKey="faqs"
                itemLabel={t('editor.faq', 'Pregunta Frecuente')}
                defaultItems={defaultFaqs}
                fields={[
                    { key: 'question', label: t('editor.question', 'Pregunta'), type: 'input' },
                    { key: 'answer', label: t('editor.answer', 'Respuesta'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Metrics Quimera
export const renderMetricsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultMetrics = [
        { title: '10x', description: 'Más rápido que el desarrollo tradicional' },
        { title: '99.9%', description: 'Uptime garantizado en todos los proyectos' },
        { title: '+5k', description: 'Usuarios activos diariamente' },
        { title: '24/7', description: 'Soporte técnico ininterrumpido' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Impacto Demostrado", "Resultados que hablan por sí solos.")}
            <QuimeraListControl
                arrayKey="items"
                itemLabel={t('editor.metric', 'Métrica')}
                defaultItems={defaultMetrics}
                fields={[
                    { key: 'title', label: t('editor.value', 'Valor (ej. 99%)'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Platform Showcase Quimera
export const renderPlatformShowcaseQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Layout', title: 'Web Editor Avanzado', description: 'Crea sitios impresionantes con nuestro editor drag & drop.' },
        { icon: 'Database', title: 'Gestión de Leads (CRM)', description: 'Captura, gestiona y nutre a tus clientes.' },
        { icon: 'Search', title: 'SEO Automático', description: 'Sitemaps, meta tags y robots.txt generados.' },
        { icon: 'Smartphone', title: 'Mobile First', description: 'Previsualizador móvil en tiempo real.' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Plataforma Todo en Uno", "Todo lo que necesitas para escalar tu negocio digital en un solo lugar.")}
            <QuimeraListControl
                arrayKey="features"
                itemLabel="Feature (Bento Grid)"
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Layout, Database)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// AI Capabilities Quimera
export const renderAiCapabilitiesQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultCapabilities = [
        { icon: 'MessageSquare', title: 'Generación de Copy', description: 'Crea textos persuasivos en segundos.' },
        { icon: 'Wand2', title: 'Diseño Asistido', description: 'Sugerencias de colores y layouts.' },
        { icon: 'Zap', title: 'Automatización', description: 'Workflows inteligentes sin código.' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Impulsado por Inteligencia Artificial", "Nuestra IA automatiza tareas repetitivas y potencia tu creatividad.")}
            <QuimeraListControl
                arrayKey="capabilities"
                itemLabel="Capacidad AI"
                defaultItems={defaultCapabilities}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. MessageSquare, FileText)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* Layout Controls */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layout size={14} /> {deps.t('editor.controls.common.layout', 'Diseño')}
                </label>
                <Select 
                    label={deps.t('editor.imagePosition', 'Posición de Imagen/Mockup')}
                    value={deps.data.imagePosition || 'right'}
                    options={[
                        { label: deps.t('editor.positionLeft', 'Izquierda'), value: 'left' },
                        { label: deps.t('editor.positionRight', 'Derecha'), value: 'right' }
                    ]}
                    onChange={(val) => deps.setNestedData('imagePosition', val)}
                />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Agency White Label Quimera
export const renderAgencyWhiteLabelQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { data, setNestedData, t } = deps;
    const defaultFeatures = [
        { title: 'Tu Marca, Tus Reglas', description: 'Eliminamos cualquier rastro de QuimeraAi. El dashboard, URLs y correos llevarán exclusivamente tu branding.' },
        { title: 'Márgenes de 300%+', description: 'Cobra a tus clientes lo que consideres justo. Nuestro costo fijo te permite escalar tus márgenes exponencialmente.' },
        { title: 'Facturación Integrada', description: 'Cobra a tus clientes directamente desde el panel con Stripe, y gestiona suscripciones de forma centralizada.' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Tu Propia Agencia Digital", "Ofrece nuestra tecnología bajo tu propia marca y multiplica tus ingresos sin esfuerzo técnico.")}
            <QuimeraListControl
                arrayKey="features"
                itemLabel="Característica"
                defaultItems={defaultFeatures}
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
                <I18nInput label="Texto del Botón" value={data.buttonText || ''} onChange={(val) => setNestedData('buttonText', val)} placeholder="Ej. Ser Partner" />
            </div>
            {/* Anchor Link Component */}
            <AnchorLinkControl label="Enlace del Botón" fieldKey="buttonLink" deps={deps} />
        </>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* Layout Controls */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layout size={14} /> {deps.t('editor.controls.common.layout', 'Diseño')}
                </label>
                <Select 
                    label={deps.t('editor.imagePosition', 'Posición de Imagen/Mockup')}
                    value={deps.data.imagePosition || 'right'}
                    options={[
                        { label: deps.t('editor.positionLeft', 'Izquierda'), value: 'left' },
                        { label: deps.t('editor.positionRight', 'Derecha'), value: 'right' }
                    ]}
                    onChange={(val) => deps.setNestedData('imagePosition', val)}
                />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Industry Solutions Quimera
export const renderIndustrySolutionsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultIndustries = [
        { icon: 'Building2', name: 'Inmobiliarias', title: 'Portal Inmobiliario Completo', description: 'Sistema de listados, mapa interactivo y CRM de leads.', featuresList: 'Listados de propiedades\nCRM integrado', imageColor: 'from-blue-900 to-black' },
        { icon: 'ShoppingBag', name: 'E-commerce', title: 'Tienda Online Optimizada', description: 'Carrito, pasarelas de pago y gestión de inventario.', featuresList: 'Pagos globales\nInventario en tiempo real', imageColor: 'from-purple-900 to-black' },
        { icon: 'GraduationCap', name: 'Educación', title: 'Plataforma LMS', description: 'Cursos en video, cuestionarios y certificados.', featuresList: 'Módulos de video\nCertificados automáticos', imageColor: 'from-green-900 to-black' }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, "Soluciones por Industria", "Adaptamos nuestra plataforma a las necesidades específicas de tu sector.")}
            <QuimeraListControl
                arrayKey="industries"
                itemLabel="Industria"
                defaultItems={defaultIndustries}
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
    
    const styleTab = (
        <div className="space-y-4">
            {/* 1. Background Image (shared component) */}
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />

            {/* 2. Overlay Controls (always visible, not gated by image) */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* 3. Colors */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    {/* Section colors */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    {/* Text */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    
                    {/* Cards */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                        
                    </div>
                    
                    {/* Accent */}
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;

};

// Generic fallback for Quimera suite components that share title/subtitle/colors
export const renderGenericQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const content = <>{renderCommonTextControls(deps)}</>;
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// --- Custom Quimera Feature Controls ---

// Content Manager Quimera
export const renderContentManagerQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Bot', title: t('contentManagerQuimera.feat1Title', 'Asistente de Escritura IA'), description: t('contentManagerQuimera.feat1Desc', 'Expande ideas, mejora la gramática o genera artículos completos desde un simple comando dentro del editor.') },
        { icon: 'Globe', title: t('contentManagerQuimera.feat2Title', 'Optimización SEO Automática'), description: t('contentManagerQuimera.feat2Desc', 'La IA sugiere meta títulos, descripciones y palabras clave basándose en el contenido de tu publicación.') },
        { icon: 'ImageIcon', title: t('contentManagerQuimera.feat3Title', 'Gestión Multimedia'), description: t('contentManagerQuimera.feat3Desc', 'Sube, recorta y organiza tus imágenes y videos en una galería centralizada lista para usar.') },
        { icon: 'Layout', title: t('contentManagerQuimera.feat4Title', 'Tipos de Contenido Dinámico'), description: t('contentManagerQuimera.feat4Desc', 'Crea blogs, portafolios, menús de restaurantes o listados inmobiliarios sin tocar código.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('contentManagerQuimera.title', 'Gestor de Contenidos con IA Integrada'), t('contentManagerQuimera.subtitle', 'Centraliza tus artículos, portafolios y servicios en un editor avanzado que escribe, traduce y optimiza por ti.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Bot, Globe, ImageIcon, Layout)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    // We can reuse the generic style tab from renderGenericQuimeraControls
    // For simplicity, we just copy the logic.
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Image Generator Quimera
export const renderImageGeneratorQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Sparkles', title: t('imageGeneratorQuimera.feat1Title', 'Generación desde Texto'), description: t('imageGeneratorQuimera.feat1Desc', 'Solo escribe un prompt detallado y la inteligencia artificial creará imágenes fotorrealistas, ilustraciones o logos únicos.') },
        { icon: 'ImageIcon', title: t('imageGeneratorQuimera.feat2Title', 'Sin Derechos de Autor'), description: t('imageGeneratorQuimera.feat2Desc', 'Úsalas libremente en tus artículos, productos y anuncios sin preocuparte por licencias de stock.') },
        { icon: 'Paintbrush', title: t('imageGeneratorQuimera.feat3Title', 'Variaciones y Estilos'), description: t('imageGeneratorQuimera.feat3Desc', 'Cambia el estilo visual fácilmente: 3D, acuarela, minimalista, realista o cyberpunk con un clic.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('imageGeneratorQuimera.title', 'Crea Imágenes Increíbles con IA'), t('imageGeneratorQuimera.subtitle', 'Describe lo que imaginas y deja que Quimera genere visuales profesionales, sin derechos de autor y listos para tu website o redes sociales en segundos.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Sparkles, ImageIcon, Paintbrush)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Chatbot Workflow Quimera
export const renderChatbotWorkflowQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'MessageSquare', title: t('chatbotWorkflowQuimera.feat1Title', 'Atención Inmediata'), description: t('chatbotWorkflowQuimera.feat1Desc', 'Responde al instante con el tono y personalidad de tu marca, resolviendo dudas frecuentes.') },
        { icon: 'UserPlus', title: t('chatbotWorkflowQuimera.feat2Title', 'Captura de Leads (CRM)'), description: t('chatbotWorkflowQuimera.feat2Desc', 'Identifica oportunidades y solicita datos clave (email, teléfono) guardándolos automáticamente en tu base de contactos.') },
        { icon: 'CalendarCheck', title: t('chatbotWorkflowQuimera.feat3Title', 'Agendamiento Inteligente'), description: t('chatbotWorkflowQuimera.feat3Desc', 'Se sincroniza con tus servicios y disponibilidad para agendar reuniones y enviar confirmaciones.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('chatbotWorkflowQuimera.title', 'El Recepcionista Perfecto: 24/7'), t('chatbotWorkflowQuimera.subtitle', 'Tu asistente virtual impulsado por IA no solo responde dudas; perfila clientes, guarda datos en tu CRM y agenda citas automáticamente sin que tengas que intervenir.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. MessageSquare, UserPlus, CalendarCheck)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Chatbot Builder Quimera
export const renderChatbotBuilderQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Database', title: t('chatbotBuilderQuimera.feat1Title', 'Base de Conocimiento'), description: t('chatbotBuilderQuimera.feat1Desc', 'Sube PDFs, pega URLs o escribe texto plano para que tu chatbot conozca todo sobre tu negocio al instante.') },
        { icon: 'PaintBucket', title: t('chatbotBuilderQuimera.feat2Title', 'Identidad Visual'), description: t('chatbotBuilderQuimera.feat2Desc', 'Cambia colores, tipografía, logo y posición para que el chat se integre perfectamente con tu página web.') },
        { icon: 'Settings', title: t('chatbotBuilderQuimera.feat3Title', 'Personalidad y Comportamiento'), description: t('chatbotBuilderQuimera.feat3Desc', 'Configura instrucciones detalladas (prompts) para definir el tono de voz, el rol del bot y sus reglas de atención.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('chatbotBuilderQuimera.title', 'Crea un Chatbot a tu Medida'), t('chatbotBuilderQuimera.subtitle', 'Personaliza cada aspecto de tu asistente. Entrénalo con tus propios documentos, define su personalidad y adapta su diseño visual a tu marca corporativa en segundos.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Database, PaintBucket, Settings)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Leads Manager Quimera
export const renderLeadsManagerQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Users', title: t('leadsManagerQuimera.feat1Title', 'Bandeja Centralizada'), description: t('leadsManagerQuimera.feat1Desc', 'Todos los contactos generados por formularios y chatbots se guardan automáticamente en tu panel principal.') },
        { icon: 'TrendingUp', title: t('leadsManagerQuimera.feat2Title', 'Enriquecimiento Automático'), description: t('leadsManagerQuimera.feat2Desc', 'La IA perfila a los prospectos y añade etiquetas según sus respuestas e intereses detectados.') },
        { icon: 'CheckCircle2', title: t('leadsManagerQuimera.feat3Title', 'Seguimiento Eficaz'), description: t('leadsManagerQuimera.feat3Desc', 'Añade notas, marca estados de negociación y no dejes que ningún contacto se enfríe.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('leadsManagerQuimera.title', 'Convierte Visitas en Clientes'), t('leadsManagerQuimera.subtitle', 'Centraliza todos tus contactos en un CRM nativo. Captura leads desde tu web, chatbot o enlaces externos y haz seguimiento sin perder ninguna oportunidad.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Users, TrendingUp, CheckCircle2)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Appointments Quimera
export const renderAppointmentsQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'CalendarClock', title: t('appointmentsQuimera.feat1Title', 'Sincronización Bidireccional'), description: t('appointmentsQuimera.feat1Desc', 'Se conecta con tu Google Calendar o Outlook para que nunca haya cruces de horarios.') },
        { icon: 'Clock', title: t('appointmentsQuimera.feat2Title', 'Recordatorios Automáticos'), description: t('appointmentsQuimera.feat2Desc', 'Envía notificaciones por email y SMS para reducir drásticamente las ausencias (no-shows).') },
        { icon: 'CalendarCheck', title: t('appointmentsQuimera.feat3Title', 'Tipos de Reunión Customizables'), description: t('appointmentsQuimera.feat3Desc', 'Configura duraciones, formularios previos y ubicación (Zoom, Meet, o presencial) por cada servicio.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('appointmentsQuimera.title', 'Agendamiento Inteligente'), t('appointmentsQuimera.subtitle', 'Olvídate de los correos interminables. Permite a tus clientes reservar reuniones, consultas o servicios directamente en tu sitio web según tu disponibilidad.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. CalendarClock, Clock, CalendarCheck)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Bio Page Quimera
export const renderBioPageQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Wand2', title: t('bioPageQuimera.feat1Title', 'Generación Automática'), description: t('bioPageQuimera.feat1Desc', 'La IA extrae tu información de Instagram o TikTok y crea tu página en 10 segundos con tu identidad visual.') },
        { icon: 'Sparkles', title: t('bioPageQuimera.feat2Title', 'Enlaces Inteligentes'), description: t('bioPageQuimera.feat2Desc', 'Destaca automáticamente el enlace más importante (como tu último video o producto) usando algoritmos de atención.') },
        { icon: 'Share2', title: t('bioPageQuimera.feat3Title', 'Analítica Predictiva'), description: t('bioPageQuimera.feat3Desc', 'Descubre de dónde vienen tus seguidores y qué enlace convierte mejor, con sugerencias de la IA para mejorar.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('bioPageQuimera.title', 'Tu Enlace en Bio potenciado por IA'), t('bioPageQuimera.subtitle', 'Reúne toda tu presencia online en una sola página optimizada. Solo dinos tus redes y la Inteligencia Artificial diseñará y ordenará tus enlaces para maximizar clics.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Wand2, Sparkles, Share2)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Email Marketing Quimera
export const renderEmailMarketingQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    const { t } = deps;
    const defaultFeatures = [
        { icon: 'Edit3', title: t('emailMarketingQuimera.feat1Title', 'Redacción Asistida'), description: t('emailMarketingQuimera.feat1Desc', 'Dile a la IA qué quieres promocionar y obtén múltiples opciones de correos con el tono de voz de tu marca.') },
        { icon: 'Zap', title: t('emailMarketingQuimera.feat2Title', 'Asuntos de Alta Conversión'), description: t('emailMarketingQuimera.feat2Desc', 'Genera títulos optimizados psicológicamente para evitar la carpeta de spam y maximizar los clics.') },
        { icon: 'Target', title: t('emailMarketingQuimera.feat3Title', 'Segmentación Dinámica'), description: t('emailMarketingQuimera.feat3Desc', 'La IA agrupa automáticamente a tus leads según su comportamiento e intereses para enviar mensajes personalizados.') }
    ];

    const content = (
        <>
            {renderCommonTextControls(deps, t('emailMarketingQuimera.title', 'Campañas de Email que se Escriben Solas'), t('emailMarketingQuimera.subtitle', 'Aumenta tus tasas de apertura con la IA. Genera asuntos irresistibles, redacta newsletters completos y segmenta a tus suscriptores en un par de clics.'))}
            <QuimeraListControl
                arrayKey="features"
                itemLabel={t('editor.feature', 'Característica')}
                defaultItems={defaultFeatures}
                fields={[
                    { key: 'icon', label: t('editor.icon', 'Ícono (ej. Edit3, Zap, Target)'), type: 'input' },
                    { key: 'title', label: t('editor.title', 'Título'), type: 'input' },
                    { key: 'description', label: t('editor.description', 'Descripción'), type: 'textarea' }
                ]}
                deps={deps}
            />
        </>
    );
    
    return renderGenericQuimeraControlsWithContent(deps, content);
};

// Helper for generic style tabs
const renderGenericQuimeraControlsWithContent = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }, content: React.ReactNode) => {
    const styleTab = (
        <div className="space-y-4">
            <BackgroundImageControl sectionKey="" data={{ '': deps.data }} setNestedData={(path, value) => {
                const cleanPath = path.startsWith('.') ? path.slice(1) : path;
                deps.setNestedData(cleanPath, value);
            }} />
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layers size={14} /> {deps.t('editor.heroQuimeraControls.overlayColors', 'Overlay')}
                </label>
                <ColorControl label="Color de Overlay" value={deps.data.backgroundOverlayColor || deps.data.colors?.background || '#000000'} onChange={(v) => deps.setNestedData('backgroundOverlayColor', v)} />
                <SliderControl label="Opacidad" value={deps.data.backgroundOverlayOpacity ?? 60} onChange={(v) => deps.setNestedData('backgroundOverlayOpacity', v)} min={0} max={100} step={5} suffix="%" />
                <ToggleControl label="Activar Overlay" checked={deps.data.backgroundOverlayEnabled !== false} onChange={(v) => deps.setNestedData('backgroundOverlayEnabled', v)} />
            </div>

            {/* Layout Controls */}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Layout size={14} /> {deps.t('editor.controls.common.layout', 'Diseño')}
                </label>
                <Select 
                    label={deps.t('editor.imagePosition', 'Posición de Imagen/Mockup')}
                    value={deps.data.imagePosition || 'right'}
                    options={[
                        { label: deps.t('editor.positionLeft', 'Izquierda'), value: 'left' },
                        { label: deps.t('editor.positionRight', 'Derecha'), value: 'right' }
                    ]}
                    onChange={(val) => deps.setNestedData('imagePosition', val)}
                />
            </div>
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-3">
                    <Settings size={14} /> {deps.t('editor.controls.common.colors', 'Colores')}
                </label>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Sección</p>
                        <ColorControl label="Fondo" value={deps.data.colors?.background} onChange={(v) => deps.setNestedData('colors.background', v)} />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Texto</p>
                        <ColorControl label="Título" value={deps.data.colors?.text} onChange={(v) => deps.setNestedData('colors.text', v)} />
                        <ColorControl label="Subtítulo" value={deps.data.colors?.secondaryText} onChange={(v) => deps.setNestedData('colors.secondaryText', v)} />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Tarjetas</p>
                        <ColorControl label="Fondo Tarjeta" value={deps.data.colors?.cardBackground} onChange={(v) => deps.setNestedData('colors.cardBackground', v)} />
                        <ColorControl label="Borde Tarjeta" value={deps.data.colors?.cardBorder} onChange={(v) => deps.setNestedData('colors.cardBorder', v)} />
                        <ColorControl label="Texto Tarjeta" value={deps.data.colors?.cardText} onChange={(v) => deps.setNestedData('colors.cardText', v)} />
                        <ColorControl label="Ícono" value={deps.data.colors?.iconColor} onChange={(v) => deps.setNestedData('colors.iconColor', v)} />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-q-border/50">
                        <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Acento</p>
                        <ColorControl label="Color de Acento" value={deps.data.colors?.accent} onChange={(v) => deps.setNestedData('colors.accent', v)} />
                    </div>
                </div>
            </div>
        </div>
    );
    return <TabbedControls contentTab={<div className="space-y-4 pt-4">{content}</div>} styleTab={<div className="space-y-4 pt-4">{styleTab}</div>} />;
};
