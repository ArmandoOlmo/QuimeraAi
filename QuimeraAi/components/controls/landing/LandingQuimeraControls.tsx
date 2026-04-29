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
                                    <TextArea
                                        key={field.key}
                                        value={item[field.key] || ''}
                                        onChange={(e) => handleChange(index, field.key, e.target.value)}
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
                                <Input
                                    key={field.key}
                                    value={item[field.key] || ''}
                                    onChange={(e) => handleChange(index, field.key, e.target.value)}
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
                <TextArea value={data.title || ''} onChange={(e) => setNestedData('title', e.target.value)} rows={2} placeholder={defaultTitle || "Escribe el título aquí..."} />
            </AIFormControl>
            <AIFormControl label="Subtítulo" onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Section Subtitle' })}>
                <TextArea value={data.subtitle || ''} onChange={(e) => setNestedData('subtitle', e.target.value)} rows={3} placeholder={defaultSubtitle || "Escribe el subtítulo aquí..."} />
            </AIFormControl>
        </div>
    );
};

// Common Colors
const renderCommonColorControls = (deps: ControlsDeps, portalContainer?: HTMLElement | null, extended: boolean = false) => {
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
                {extended && (
                    <>
                        <ColorControl label="Fondo de Tarjetas (Card Bg)" value={data.colors?.cardBackground} onChange={(v) => setNestedData('colors.cardBackground', v)} portalContainer={portalContainer} />
                        <ColorControl label="Borde de Tarjetas (Card Border)" value={data.colors?.cardBorder} onChange={(v) => setNestedData('colors.cardBorder', v)} portalContainer={portalContainer} />
                        <ColorControl label="Texto de Tarjetas (Card Text)" value={data.colors?.cardText} onChange={(v) => setNestedData('colors.cardText', v)} portalContainer={portalContainer} />
                        <ColorControl label="Color de Íconos (Icon Color)" value={data.colors?.iconColor} onChange={(v) => setNestedData('colors.iconColor', v)} portalContainer={portalContainer} />
                        <ColorControl label="Texto Secundario (Secondary Text)" value={data.colors?.secondaryText} onChange={(v) => setNestedData('colors.secondaryText', v)} portalContainer={portalContainer} />
                    </>
                )}
            </div>
        </div>
    );
};

// Helper to wrap content and styles in tabs
const withQuimeraTabs = (
    contentControls: React.ReactNode,
    deps: ControlsDeps & { portalContainer?: HTMLElement | null },
    extendedColors: boolean = true
) => {
    return (
        <TabbedControls
            contentTab={<div className="space-y-4 pt-4">{contentControls}</div>}
            styleTab={<div className="space-y-4 pt-4">{renderCommonColorControls(deps, deps.portalContainer, extendedColors)}</div>}
        />
    );
};

// Hero Quimera
export const renderHeroQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null, allSections?: any[] }) => {
    const { data, setNestedData } = deps;
    const content = (
        <>
            {renderCommonTextControls(deps, "Diseña tu futuro digital", "Crea sitios web impresionantes...")}
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botones
                </label>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <Input label="Texto Botón Principal" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} placeholder="Ej. Empezar Gratis" />
                    <Input label="Texto Botón Secundario" value={data.secondaryButtonText || ''} onChange={(e) => setNestedData('secondaryButtonText', e.target.value)} placeholder="Ej. Ver Demo" />
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
    return withQuimeraTabs(content, deps);
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
                    <Input value={data.badgeText || ''} onChange={(e) => setNestedData('badgeText', e.target.value)} placeholder="Ej. Sin tarjeta de crédito requerida" label="" />
                </AIFormControl>
                <AIFormControl label="Título" onAssistClick={() => setAiAssistField?.({ path: 'title', value: data.title, context: 'Section Title' })}>
                    <TextArea value={data.title || ''} onChange={(e) => setNestedData('title', e.target.value)} rows={2} placeholder="¿Listo para escalar tu negocio digital?" />
                </AIFormControl>
                <AIFormControl label="Subtítulo" onAssistClick={() => setAiAssistField?.({ path: 'subtitle', value: data.subtitle, context: 'Section Subtitle' })}>
                    <TextArea value={data.subtitle || ''} onChange={(e) => setNestedData('subtitle', e.target.value)} rows={3} placeholder="Escribe el subtítulo aquí..." />
                </AIFormControl>
            </div>
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border mb-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Layout size={14} /> Botones
                </label>
                <Input label="Texto Botón Principal" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} placeholder="Ej. Empezar Gratis" />
                <AnchorLinkControl label="Enlace Botón Principal" fieldKey="buttonLink" deps={deps} />
                
                <div className="mt-4 border-t border-q-border pt-4">
                    <Input label="Texto Botón Secundario (Opcional)" value={data.secondaryButtonText || ''} onChange={(e) => setNestedData('secondaryButtonText', e.target.value)} placeholder="Ej. Ver Demo" />
                    <AnchorLinkControl label="Enlace Botón Secundario" fieldKey="secondaryButtonLink" deps={deps} />
                </div>
            </div>
        </>
    );
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
    return withQuimeraTabs(content, deps);
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
                <Input label="Texto del Botón" value={data.buttonText || ''} onChange={(e) => setNestedData('buttonText', e.target.value)} placeholder="Ej. Ser Partner" />
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
    return withQuimeraTabs(content, deps);
};

// Generic fallback for Quimera suite components that share title/subtitle/colors
export const renderGenericQuimeraControls = (deps: ControlsDeps & { portalContainer?: HTMLElement | null }) => {
    return withQuimeraTabs(
        <>{renderCommonTextControls(deps)}</>,
        deps
    );
};
