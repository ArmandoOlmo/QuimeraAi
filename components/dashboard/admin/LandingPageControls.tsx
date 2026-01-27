/**
 * LandingPageControls
 * Section-specific controls for the Landing Page Editor
 * Each section type has its own control panel with editable properties
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Type, Image, Palette, AlignLeft, AlignCenter, AlignRight,
    Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
    Sparkles, Link2, Upload, Bold, Italic, Underline, List,
    LayoutGrid, Columns, Rows, Clock, Play, Pause, Settings, ImageIcon
} from 'lucide-react';
import ImagePickerModal from '../../ui/ImagePickerModal';

// Types for landing page sections
interface LandingSection {
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    data: Record<string, any>;
}

interface LandingPageControlsProps {
    section: LandingSection;
    onUpdateSection: (sectionId: string, data: Record<string, any>) => void;
    onRefreshPreview: () => void;
}

// Reusable control components
const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
}> = ({ value, onChange, placeholder, multiline }) => {
    if (multiline) {
        return (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
        );
    }
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
    );
};

const Toggle: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${checked ? 'bg-primary' : 'bg-muted-foreground/30'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer"
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border bg-background text-xs font-mono"
            />
        </div>
    </div>
);

const SelectControl: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const RangeControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{label}</span>
            <span className="text-xs font-mono text-muted-foreground">{value}{unit}</span>
        </div>
        <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-primary"
        />
    </div>
);

// ============================================================================
// SECTION CONTROLS
// ============================================================================

const LandingPageControls: React.FC<LandingPageControlsProps> = ({
    section,
    onUpdateSection,
    onRefreshPreview
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

    // Get section data with defaults
    const data = section.data || {};

    // Update handler
    const updateData = (key: string, value: any) => {
        onUpdateSection(section.id, { ...data, [key]: value });
    };

    // Tab buttons
    const TabButton: React.FC<{ tab: 'content' | 'style'; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            {label}
        </button>
    );

    // Render controls based on section type
    const renderControls = () => {
        switch (section.type) {
            case 'hero':
            case 'heroModern':
            case 'heroGradient':
                return renderHeroControls();
            case 'features':
                return renderFeaturesControls();
            case 'pricing':
                return renderPricingControls();
            case 'testimonials':
                return renderTestimonialsControls();
            case 'faq':
                return renderFaqControls();
            case 'cta':
                return renderCtaControls();
            case 'footer':
                return renderFooterControls();
            case 'header':
                return renderHeaderControls();
            case 'screenshotCarousel':
                return renderCarouselControls();
            default:
                return renderGenericControls();
        }
    };

    // ========================================================================
    // HERO CONTROLS
    // ========================================================================
    const renderHeroControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.heroTitle', 'Título Principal')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Crea tu Sitio Web con IA"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroSubtitle', 'Subtítulo')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: La forma más rápida de crear sitios web profesionales"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.primaryButton', 'Botón Principal')}>
                        <TextInput
                            value={data.primaryButtonText || ''}
                            onChange={(v) => updateData('primaryButtonText', v)}
                            placeholder="Ej: Comenzar Gratis"
                        />
                        <TextInput
                            value={data.primaryButtonLink || ''}
                            onChange={(v) => updateData('primaryButtonLink', v)}
                            placeholder="/register"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.secondaryButton', 'Botón Secundario')}>
                        <Toggle
                            label={t('landingEditor.showSecondaryButton', 'Mostrar')}
                            checked={data.showSecondaryButton ?? true}
                            onChange={(v) => updateData('showSecondaryButton', v)}
                        />
                        {data.showSecondaryButton !== false && (
                            <>
                                <TextInput
                                    value={data.secondaryButtonText || ''}
                                    onChange={(v) => updateData('secondaryButtonText', v)}
                                    placeholder="Ej: Ver Demo"
                                />
                            </>
                        )}
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroImage', 'Imagen')}>
                        <div className="flex gap-2">
                            <TextInput
                                value={data.heroImage || ''}
                                onChange={(v) => updateData('heroImage', v)}
                                placeholder="URL de la imagen"
                            />
                            <button className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                <Sparkles size={18} />
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <SelectControl
                        label={t('landingEditor.layout', 'Layout')}
                        value={data.layout || 'centered'}
                        options={[
                            { value: 'centered', label: 'Centrado' },
                            { value: 'left', label: 'Izquierda' },
                            { value: 'right', label: 'Derecha' },
                            { value: 'split', label: 'Dividido' },
                        ]}
                        onChange={(v) => updateData('layout', v)}
                    />

                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#000000'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />

                    <ColorPicker
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showGradient', 'Mostrar gradiente')}
                        checked={data.showGradient ?? false}
                        onChange={(v) => updateData('showGradient', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // FEATURES CONTROLS
    // ========================================================================
    const renderFeaturesControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Características"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Todo lo que necesitas para tener éxito"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.features', 'Características')}>
                        <div className="space-y-3 mt-2">
                            {(data.features || []).map((feature: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newFeatures = [...(data.features || [])];
                                                newFeatures.splice(idx, 1);
                                                updateData('features', newFeatures);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={feature.title || ''}
                                        onChange={(v) => {
                                            const newFeatures = [...(data.features || [])];
                                            newFeatures[idx] = { ...newFeatures[idx], title: v };
                                            updateData('features', newFeatures);
                                        }}
                                        placeholder="Título"
                                    />
                                    <TextInput
                                        value={feature.description || ''}
                                        onChange={(v) => {
                                            const newFeatures = [...(data.features || [])];
                                            newFeatures[idx] = { ...newFeatures[idx], description: v };
                                            updateData('features', newFeatures);
                                        }}
                                        placeholder="Descripción"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newFeatures = [...(data.features || []), { title: '', description: '', icon: 'Star' }];
                                    updateData('features', newFeatures);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addFeature', 'Añadir característica')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <SelectControl
                        label={t('landingEditor.columns', 'Columnas')}
                        value={String(data.columns || 3)}
                        options={[
                            { value: '2', label: '2 columnas' },
                            { value: '3', label: '3 columnas' },
                            { value: '4', label: '4 columnas' },
                        ]}
                        onChange={(v) => updateData('columns', Number(v))}
                    />

                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#ffffff'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showIcons', 'Mostrar iconos')}
                        checked={data.showIcons ?? true}
                        onChange={(v) => updateData('showIcons', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // PRICING CONTROLS
    // ========================================================================
    const renderPricingControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Planes y Precios"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Elige el plan perfecto para ti"
                            multiline
                        />
                    </ControlGroup>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                            {t('landingEditor.pricingNote', 'Los planes de precios se gestionan desde el panel de Suscripciones.')}
                        </p>
                    </div>

                    <Toggle
                        label={t('landingEditor.showMonthlyToggle', 'Mostrar toggle mensual/anual')}
                        checked={data.showBillingToggle ?? true}
                        onChange={(v) => updateData('showBillingToggle', v)}
                    />

                    <Toggle
                        label={t('landingEditor.highlightPopular', 'Destacar plan popular')}
                        checked={data.highlightPopular ?? true}
                        onChange={(v) => updateData('highlightPopular', v)}
                    />
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#f8fafc'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />

                    <ColorPicker
                        label={t('landingEditor.accentColor', 'Color de acento')}
                        value={data.accentColor || '#7c3aed'}
                        onChange={(v) => updateData('accentColor', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // TESTIMONIALS CONTROLS
    // ========================================================================
    const renderTestimonialsControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Lo que dicen nuestros clientes"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.testimonials', 'Testimonios')}>
                        <div className="space-y-3 mt-2">
                            {(data.testimonials || []).map((testimonial: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Testimonio #{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newTestimonials = [...(data.testimonials || [])];
                                                newTestimonials.splice(idx, 1);
                                                updateData('testimonials', newTestimonials);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={testimonial.name || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], name: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Nombre"
                                    />
                                    <TextInput
                                        value={testimonial.role || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], role: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Cargo / Empresa"
                                    />
                                    <TextInput
                                        value={testimonial.text || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], text: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Testimonio"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newTestimonials = [...(data.testimonials || []), { name: '', role: '', text: '' }];
                                    updateData('testimonials', newTestimonials);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addTestimonial', 'Añadir testimonio')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <SelectControl
                        label={t('landingEditor.layout', 'Layout')}
                        value={data.layout || 'carousel'}
                        options={[
                            { value: 'carousel', label: 'Carrusel' },
                            { value: 'grid', label: 'Grid' },
                            { value: 'masonry', label: 'Masonry' },
                        ]}
                        onChange={(v) => updateData('layout', v)}
                    />

                    <Toggle
                        label={t('landingEditor.autoPlay', 'Auto-reproducir')}
                        checked={data.autoPlay ?? true}
                        onChange={(v) => updateData('autoPlay', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // FAQ CONTROLS
    // ========================================================================
    const renderFaqControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Preguntas Frecuentes"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.faqs', 'Preguntas')}>
                        <div className="space-y-3 mt-2">
                            {(data.faqs || []).map((faq: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newFaqs = [...(data.faqs || [])];
                                                newFaqs.splice(idx, 1);
                                                updateData('faqs', newFaqs);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={faq.question || ''}
                                        onChange={(v) => {
                                            const newFaqs = [...(data.faqs || [])];
                                            newFaqs[idx] = { ...newFaqs[idx], question: v };
                                            updateData('faqs', newFaqs);
                                        }}
                                        placeholder="Pregunta"
                                    />
                                    <TextInput
                                        value={faq.answer || ''}
                                        onChange={(v) => {
                                            const newFaqs = [...(data.faqs || [])];
                                            newFaqs[idx] = { ...newFaqs[idx], answer: v };
                                            updateData('faqs', newFaqs);
                                        }}
                                        placeholder="Respuesta"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newFaqs = [...(data.faqs || []), { question: '', answer: '' }];
                                    updateData('faqs', newFaqs);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addFaq', 'Añadir pregunta')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <SelectControl
                        label={t('landingEditor.faqStyle', 'Estilo')}
                        value={data.style || 'accordion'}
                        options={[
                            { value: 'accordion', label: 'Acordeón' },
                            { value: 'list', label: 'Lista' },
                            { value: 'cards', label: 'Tarjetas' },
                        ]}
                        onChange={(v) => updateData('style', v)}
                    />

                    <Toggle
                        label={t('landingEditor.allowMultipleOpen', 'Permitir múltiples abiertas')}
                        checked={data.allowMultipleOpen ?? false}
                        onChange={(v) => updateData('allowMultipleOpen', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // CTA CONTROLS
    // ========================================================================
    const renderCtaControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.ctaTitle', 'Título')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: ¿Listo para empezar?"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaSubtitle', 'Subtítulo')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Crea tu sitio web en minutos"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaButton', 'Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder="Ej: Comenzar Ahora"
                        />
                        <TextInput
                            value={data.buttonLink || ''}
                            onChange={(v) => updateData('buttonLink', v)}
                            placeholder="/register"
                        />
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#7c3aed'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />

                    <ColorPicker
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showPattern', 'Mostrar patrón de fondo')}
                        checked={data.showPattern ?? false}
                        onChange={(v) => updateData('showPattern', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // FOOTER CONTROLS
    // ========================================================================
    const renderFooterControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.companyName', 'Nombre de Empresa')}>
                        <TextInput
                            value={data.companyName || ''}
                            onChange={(v) => updateData('companyName', v)}
                            placeholder="Ej: Quimera.ai"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.tagline', 'Tagline')}>
                        <TextInput
                            value={data.tagline || ''}
                            onChange={(v) => updateData('tagline', v)}
                            placeholder="Ej: La mejor plataforma de creación de sitios web con IA"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.copyrightText', 'Texto de Copyright')}>
                        <TextInput
                            value={data.copyright || ''}
                            onChange={(v) => updateData('copyright', v)}
                            placeholder="© 2024 Quimera.ai. Todos los derechos reservados."
                        />
                    </ControlGroup>

                    <Toggle
                        label={t('landingEditor.showSocialLinks', 'Mostrar redes sociales')}
                        checked={data.showSocialLinks ?? true}
                        onChange={(v) => updateData('showSocialLinks', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showLegalLinks', 'Mostrar enlaces legales')}
                        checked={data.showLegalLinks ?? true}
                        onChange={(v) => updateData('showLegalLinks', v)}
                    />
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#111827'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />

                    <SelectControl
                        label={t('landingEditor.columns', 'Columnas')}
                        value={String(data.columns || 4)}
                        options={[
                            { value: '2', label: '2 columnas' },
                            { value: '3', label: '3 columnas' },
                            { value: '4', label: '4 columnas' },
                        ]}
                        onChange={(v) => updateData('columns', Number(v))}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // HEADER CONTROLS
    // ========================================================================
    const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);

    const renderHeaderControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.logoImage', 'Logo')}>
                        {/* Logo Preview & Picker */}
                        <div className="space-y-3">
                            {data.logoImage && (
                                <div className="relative w-full h-20 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                                    <img
                                        src={data.logoImage}
                                        alt="Logo"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                    <button
                                        onClick={() => updateData('logoImage', '')}
                                        className="absolute top-1 right-1 p-1 rounded bg-destructive/80 text-white hover:bg-destructive"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setIsLogoPickerOpen(true)}
                                className="w-full py-3 px-4 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <Image size={18} />
                                {data.logoImage
                                    ? t('landingEditor.changeLogo', 'Cambiar Logo')
                                    : t('landingEditor.selectLogo', 'Seleccionar Logo de Biblioteca')
                                }
                            </button>
                        </div>
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.logoText', 'Texto del Logo')}>
                        <TextInput
                            value={data.logoText || ''}
                            onChange={(v) => updateData('logoText', v)}
                            placeholder="Ej: Quimera.ai"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaButtons', 'Botones CTA')}>
                        <Toggle
                            label={t('landingEditor.showLoginButton', 'Mostrar botón de login')}
                            checked={data.showLoginButton ?? true}
                            onChange={(v) => updateData('showLoginButton', v)}
                        />
                        <Toggle
                            label={t('landingEditor.showRegisterButton', 'Mostrar botón de registro')}
                            checked={data.showRegisterButton ?? true}
                            onChange={(v) => updateData('showRegisterButton', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaButtonTexts', 'Textos de Botones')}>
                        <TextInput
                            value={data.loginText || ''}
                            onChange={(v) => updateData('loginText', v)}
                            placeholder="Login"
                        />
                        <TextInput
                            value={data.registerText || ''}
                            onChange={(v) => updateData('registerText', v)}
                            placeholder="Comenzar Gratis"
                        />
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <Toggle
                        label={t('landingEditor.stickyHeader', 'Header fijo')}
                        checked={data.sticky ?? true}
                        onChange={(v) => updateData('sticky', v)}
                    />

                    <Toggle
                        label={t('landingEditor.transparentHeader', 'Header transparente')}
                        checked={data.transparent ?? false}
                        onChange={(v) => updateData('transparent', v)}
                    />

                    <ColorPicker
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#000000'}
                        onChange={(v) => updateData('backgroundColor', v)}
                    />
                </>
            )}

            {/* Logo Picker Modal */}
            <ImagePickerModal
                isOpen={isLogoPickerOpen}
                onClose={() => setIsLogoPickerOpen(false)}
                onSelect={(url) => updateData('logoImage', url)}
                title={t('landingEditor.selectLogo', 'Seleccionar Logo')}
            />
        </div>
    );

    // ========================================================================
    // SCREENSHOT CAROUSEL CONTROLS
    // ========================================================================
    const renderCarouselControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Descubre nuestra plataforma"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.carouselImages', 'Imágenes')}>
                        <div className="space-y-2 mt-2">
                            {(data.images || []).map((image: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <TextInput
                                        value={image}
                                        onChange={(v) => {
                                            const newImages = [...(data.images || [])];
                                            newImages[idx] = v;
                                            updateData('images', newImages);
                                        }}
                                        placeholder="URL de imagen"
                                    />
                                    <button
                                        onClick={() => {
                                            const newImages = [...(data.images || [])];
                                            newImages.splice(idx, 1);
                                            updateData('images', newImages);
                                        }}
                                        className="shrink-0 p-2 text-destructive hover:bg-destructive/10 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    updateData('images', [...(data.images || []), '']);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addImage', 'Añadir imagen')}
                            </button>
                        </div>
                    </ControlGroup>

                    <button className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                        <Sparkles size={18} />
                        {t('landingEditor.generateWithAI', 'Generar con IA')}
                    </button>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <Toggle
                        label={t('landingEditor.autoScroll', 'Auto-scroll')}
                        checked={data.autoScroll ?? true}
                        onChange={(v) => updateData('autoScroll', v)}
                    />

                    {data.autoScroll !== false && (
                        <RangeControl
                            label={t('landingEditor.scrollSpeed', 'Velocidad')}
                            value={data.scrollSpeed || 50}
                            min={10}
                            max={200}
                            unit="px/s"
                            onChange={(v) => updateData('scrollSpeed', v)}
                        />
                    )}

                    <SelectControl
                        label={t('landingEditor.aspectRatio', 'Aspect Ratio')}
                        value={data.aspectRatio || '16:9'}
                        options={[
                            { value: '16:9', label: '16:9 (Widescreen)' },
                            { value: '4:3', label: '4:3 (Estándar)' },
                            { value: '3:2', label: '3:2' },
                            { value: '1:1', label: '1:1 (Cuadrado)' },
                        ]}
                        onChange={(v) => updateData('aspectRatio', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showNavigation', 'Mostrar navegación')}
                        checked={data.showNavigation ?? true}
                        onChange={(v) => updateData('showNavigation', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // GENERIC CONTROLS (for unsupported section types)
    // ========================================================================
    const renderGenericControls = () => (
        <div className="space-y-6">
            <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                <TextInput
                    value={data.title || ''}
                    onChange={(v) => updateData('title', v)}
                    placeholder="Título"
                />
            </ControlGroup>

            <ControlGroup label={t('landingEditor.content', 'Contenido')}>
                <TextInput
                    value={data.content || ''}
                    onChange={(v) => updateData('content', v)}
                    placeholder="Contenido"
                    multiline
                />
            </ControlGroup>

            <Toggle
                label={t('landingEditor.enabled', 'Habilitado')}
                checked={section.enabled}
                onChange={() => { }}
            />
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border">
                <TabButton tab="content" label={t('landingEditor.content', 'Contenido')} />
                <TabButton tab="style" label={t('landingEditor.style', 'Estilo')} />
            </div>

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-4">
                {renderControls()}
            </div>

            {/* Apply button */}
            <div className="p-4 border-t border-border">
                <button
                    onClick={onRefreshPreview}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    <Eye size={16} />
                    {t('landingEditor.applyChanges', 'Aplicar cambios')}
                </button>
            </div>
        </div>
    );
};

export default LandingPageControls;
