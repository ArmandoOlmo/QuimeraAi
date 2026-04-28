/**
 * HeroBlockControls
 * Controls for editing Hero block content and styles
 * Includes link type selector for the hero button, mirroring the web editor
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { useProject } from '../../../../../contexts/project';
import { EmailBlock, EmailHeroContent, EmailBlockStyles } from '../../../../../types/email';
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
        {label && <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <input
            {...props}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent transition-all placeholder:text-q-text-secondary/50"
        />
    </div>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <textarea
            {...props}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent resize-y min-h-[80px] transition-all placeholder:text-q-text-secondary/50"
        />
    </div>
);

const ToggleControl: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
        </button>
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['sm', 'md', 'lg', 'xl'];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-q-surface rounded-md border border-q-border p-1">
                {options.map((size) => (
                    <button
                        key={size}
                        onClick={() => onChange(size)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
                    >
                        {size.toUpperCase()}
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
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-q-surface rounded-md border border-q-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-sm font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'}`}
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

interface HeroBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const HeroBlockControls: React.FC<HeroBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    const { activeProject } = useProject();

    const content = block.content as EmailHeroContent;
    const styles = block.styles;

    const updateContent = (updates: Partial<EmailHeroContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };

    const updateStyles = (updates: Partial<EmailBlockStyles>) => {
        updateBlock(block.id, {
            styles: { ...styles, ...updates },
        });
    };

    const currentLinkType = content.linkType || 'manual';

    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                <Input
                    label={t('email.headline', 'Título')}
                    value={content.headline || ''}
                    onChange={(e) => updateContent({ headline: e.target.value })}
                    placeholder={t('email.headlinePlaceholder', 'Escribe el título...')}
                />

                <TextArea
                    label={t('email.subheadline', 'Subtítulo')}
                    value={content.subheadline || ''}
                    onChange={(e) => updateContent({ subheadline: e.target.value })}
                    placeholder={t('email.subheadlinePlaceholder', 'Escribe el subtítulo...')}
                />

                <ImagePicker
                    label={t('email.heroImage', 'Imagen')}
                    value={content.imageUrl || ''}
                    onChange={(url) => updateContent({ imageUrl: url })}
                    hideUrlInput={true}
                    destination="admin"
                    adminCategory="template"
                />

                <Input
                    label={t('email.imageAlt', 'Texto alternativo')}
                    value={content.imageAlt || ''}
                    onChange={(e) => updateContent({ imageAlt: e.target.value })}
                    placeholder={t('email.imageAltPlaceholder', 'Descripción de la imagen...')}
                />

                <hr className="border-q-border" />

                <ToggleControl
                    label={t('email.showButton', 'Mostrar botón')}
                    checked={content.showButton ?? true}
                    onChange={(checked) => updateContent({ showButton: checked })}
                />

                {content.showButton && (
                    <>
                        <Input
                            label={t('email.buttonText', 'Texto del botón')}
                            value={content.buttonText || ''}
                            onChange={(e) => updateContent({ buttonText: e.target.value })}
                            placeholder={t('email.buttonTextPlaceholder', 'Click aquí')}
                        />

                        {/* Link Type Selector - Same pattern as web editor CTA */}
                        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Link size={14} />
                                {t('email.linkType', 'Tipo de enlace')}
                            </label>
                            <div className="flex bg-q-surface rounded-md border border-q-border p-1">
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
                                            ? 'bg-q-accent text-q-bg'
                                            : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'
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
                                    label={t('email.buttonUrl', 'URL del botón')}
                                    value={content.buttonUrl || ''}
                                    onChange={(e) => updateContent({ buttonUrl: e.target.value })}
                                    placeholder="https://example.com or #section"
                                />
                                <p className="text-xs text-q-text-secondary -mt-2">
                                    {t('email.linkHelpManual', 'URLs externas o # para secciones de la página (ej. #contacto)')}
                                </p>
                            </>
                        )}

                        {/* Product Selector */}
                        {currentLinkType === 'product' && (
                            <SingleProductSelector
                                storeId={activeProject?.id || ''}
                                selectedProductId={content.buttonUrl?.startsWith('/product/') ? content.buttonUrl.split('/product/')[1] : undefined}
                                onSelect={(id) => {
                                    if (id) {
                                        updateContent({ buttonUrl: `/product/${id}` });
                                    } else {
                                        updateContent({ buttonUrl: '' });
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
                                        updateContent({ buttonUrl: '' });
                                    }
                                }}
                                label={t('email.selectCollection', 'Seleccionar colección')}
                            />
                        )}

                        {/* Content Selector */}
                        {currentLinkType === 'content' && (
                            <SingleContentSelector
                                selectedContentPath={content.buttonUrl}
                                onSelect={(path) => {
                                    updateContent({ buttonUrl: path || '' });
                                }}
                                label={t('email.selectContent', 'Seleccionar contenido')}
                            />
                        )}
                    </>
                )}
            </div>
        );
    }

    // Style tab
    return (
        <div className="space-y-4">
            <ColorControl
                label={t('email.backgroundColor', 'Color de fondo')}
                value={styles.backgroundColor || '#4f46e5'}
                onChange={(color) => updateStyles({ backgroundColor: color })}
            />

            <ColorControl
                label={t('email.headingColor', 'Color del título')}
                value={styles.headingColor || '#ffffff'}
                onChange={(color) => updateStyles({ headingColor: color })}
            />

            <ColorControl
                label={t('email.textColor', 'Color del texto')}
                value={styles.textColor || '#ffffff'}
                onChange={(color) => updateStyles({ textColor: color })}
            />

            <hr className="border-q-border" />

            <ColorControl
                label={t('email.buttonColor', 'Color del botón')}
                value={styles.buttonColor || '#ffffff'}
                onChange={(color) => updateStyles({ buttonColor: color })}
            />

            <ColorControl
                label={t('email.buttonTextColor', 'Color texto del botón')}
                value={styles.buttonTextColor || '#4f46e5'}
                onChange={(color) => updateStyles({ buttonTextColor: color })}
            />

            <hr className="border-q-border" />

            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'lg'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />

            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'center'}
                onChange={(val) => updateStyles({ alignment: val as any })}
            />
        </div>
    );
};

export default HeroBlockControls;
