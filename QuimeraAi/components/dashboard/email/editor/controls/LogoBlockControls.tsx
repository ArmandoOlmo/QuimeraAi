/**
 * LogoBlockControls
 * Controls for editing Logo block content and styles
 * Includes image picker (global library) and link type selector (same as Hero)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { useProject } from '../../../../../contexts/project';
import { EmailBlock, EmailLogoContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';
import ImagePicker from '../../../../ui/ImagePicker';
import {
    SingleProductSelector,
    SingleCollectionSelector,
    SingleContentSelector
} from '../../../../ui/EcommerceControls';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <input
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
        />
    </div>
);

const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
    <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
            <span className="text-xs text-editor-text-primary">{value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['none', 'sm', 'md', 'lg'];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((size) => (
                    <button
                        key={size}
                        onClick={() => onChange(size)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {size === 'none' ? '0' : size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const AlignmentSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = [
        { v: 'left', l: '←' },
        { v: 'center', l: '↔' },
        { v: 'right', l: '→' },
    ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-sm font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {opt.l}
                    </button>
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// PROPS
// =============================================================================

interface LogoBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const LogoBlockControls: React.FC<LogoBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();

    let activeProject: any = null;
    try {
        const proj = useProject();
        activeProject = proj?.activeProject;
    } catch { /* admin mode — no project */ }

    const content = block.content as EmailLogoContent;
    const styles = block.styles;

    const currentLinkType = content.linkType || 'manual';

    const updateContent = (updates: Partial<EmailLogoContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };

    const updateStyles = (updates: Partial<EmailBlockStyles>) => {
        updateBlock(block.id, {
            styles: { ...styles, ...updates },
        });
    };

    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                {/* Logo Image */}
                <ImagePicker
                    label={t('email.logoImage', 'Logo')}
                    value={content.src || ''}
                    onChange={(url) => updateContent({ src: url })}
                    destination="admin"
                    adminCategory="template"
                />

                <Input
                    label={t('email.imageAlt', 'Texto alternativo')}
                    value={content.alt || ''}
                    onChange={(e) => updateContent({ alt: e.target.value })}
                    placeholder="Logo de la empresa"
                />

                {/* Size Controls */}
                <SliderControl
                    label={t('email.logoWidth', 'Ancho')}
                    value={content.width || 150}
                    min={30}
                    max={400}
                    step={5}
                    unit="px"
                    onChange={(val) => updateContent({ width: val })}
                />

                <hr className="border-editor-border" />

                {/* Link Type Selector — same as Hero */}
                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Link size={14} />
                        {t('email.linkType', 'Tipo de enlace')}
                    </label>
                    <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                        {[
                            { value: 'manual', label: 'URL' },
                            { value: 'product', label: t('email.linkProduct', 'Producto') },
                            { value: 'collection', label: t('email.linkCollection', 'Colección') },
                            { value: 'content', label: t('email.linkContent', 'Contenido') }
                        ].map((type) => (
                            <button
                                key={type.value}
                                onClick={() => updateContent({ linkType: type.value as any })}
                                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${currentLinkType === type.value
                                    ? 'bg-editor-accent text-editor-bg'
                                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Manual URL Input */}
                {(currentLinkType === 'manual') && (
                    <>
                        <Input
                            label={t('email.logoLink', 'URL del logo')}
                            value={content.linkUrl || ''}
                            onChange={(e) => updateContent({ linkUrl: e.target.value })}
                            placeholder="https://example.com"
                        />
                        <p className="text-xs text-editor-text-secondary -mt-2">
                            {t('email.linkHelpManual', 'URLs externas o # para secciones de la página (ej. #contacto)')}
                        </p>
                    </>
                )}

                {/* Product Selector */}
                {currentLinkType === 'product' && (
                    <SingleProductSelector
                        storeId={activeProject?.id || ''}
                        selectedProductId={content.linkUrl?.startsWith('/product/') ? content.linkUrl.split('/product/')[1] : undefined}
                        onSelect={(id) => {
                            if (id) {
                                updateContent({ linkUrl: `/product/${id}` });
                            } else {
                                updateContent({ linkUrl: '' });
                            }
                        }}
                        label={t('email.selectProduct', 'Seleccionar producto')}
                    />
                )}

                {/* Collection Selector */}
                {currentLinkType === 'collection' && (
                    <SingleCollectionSelector
                        storeId={activeProject?.id || ''}
                        gridCategories={[]}
                        selectedCollectionId={content.collectionId}
                        onSelect={(id) => {
                            updateContent({ collectionId: id || undefined });
                            if (id) {
                                updateContent({ linkUrl: '' });
                            }
                        }}
                        label={t('email.selectCollection', 'Seleccionar colección')}
                    />
                )}

                {/* Content Selector */}
                {currentLinkType === 'content' && (
                    <SingleContentSelector
                        selectedContentPath={content.linkUrl}
                        onSelect={(path) => {
                            updateContent({ linkUrl: path || '' });
                        }}
                        label={t('email.selectContent', 'Seleccionar contenido')}
                    />
                )}
            </div>
        );
    }

    // Style tab
    return (
        <div className="space-y-4">
            <ColorControl
                label={t('email.backgroundColor', 'Color de fondo')}
                value={styles.backgroundColor || 'transparent'}
                onChange={(color) => updateStyles({ backgroundColor: color })}
            />

            <hr className="border-editor-border" />

            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'center'}
                onChange={(val) => updateStyles({ alignment: val as any })}
            />

            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'md'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default LogoBlockControls;
