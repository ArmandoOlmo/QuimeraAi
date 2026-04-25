/**
 * ButtonBlockControls
 * Controls for editing Button block content and styles
 * Includes link type selector (manual URL, product, collection, content) 
 * mirroring the web editor's CTA link functionality
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { useProject } from '../../../../../contexts/project';
import { EmailBlock, EmailButtonContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';
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

const ToggleControl: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
        </button>
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['sm', 'md', 'lg'];
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

const BorderRadiusSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = [
        { v: 'none', l: '0' },
        { v: 'sm', l: 'SM' },
        { v: 'md', l: 'MD' },
        { v: 'lg', l: 'LG' },
        { v: 'full', l: 'Full' },
    ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
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

interface ButtonBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const ButtonBlockControls: React.FC<ButtonBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    const { activeProject } = useProject();
    
    const content = block.content as EmailButtonContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailButtonContent>) => {
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
                    label={t('email.buttonText', 'Texto del botón')}
                    value={content.text || ''}
                    onChange={(e) => updateContent({ text: e.target.value })}
                    placeholder={t('email.buttonTextPlaceholder', 'Click aquí')}
                />

                {/* Link Type Selector - Same pattern as web editor CTA */}
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
                            label={t('email.buttonUrl', 'URL de destino')}
                            value={content.url || ''}
                            onChange={(e) => updateContent({ url: e.target.value })}
                            placeholder="https://example.com or #section"
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
                        selectedProductId={content.url?.startsWith('/product/') ? content.url.split('/product/')[1] : undefined}
                        onSelect={(id) => {
                            if (id) {
                                updateContent({ url: `/product/${id}` });
                            } else {
                                updateContent({ url: '' });
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
                                updateContent({ url: '' });
                            }
                        }}
                        label={t('email.selectCollection', 'Seleccionar colección')}
                    />
                )}

                {/* Content Selector */}
                {currentLinkType === 'content' && (
                    <SingleContentSelector
                        selectedContentPath={content.url}
                        onSelect={(path) => {
                            updateContent({ url: path || '' });
                        }}
                        label={t('email.selectContent', 'Seleccionar contenido')}
                    />
                )}
                
                <ToggleControl
                    label={t('email.fullWidth', 'Ancho completo')}
                    checked={content.fullWidth ?? false}
                    onChange={(checked) => updateContent({ fullWidth: checked })}
                />
            </div>
        );
    }
    
    // Style tab
    return (
        <div className="space-y-4">
            <ColorControl
                label={t('email.buttonColor', 'Color del botón')}
                value={styles.buttonColor || '#4f46e5'}
                onChange={(color) => updateStyles({ buttonColor: color })}
            />
            
            <ColorControl
                label={t('email.buttonTextColor', 'Color del texto')}
                value={styles.buttonTextColor || '#ffffff'}
                onChange={(color) => updateStyles({ buttonTextColor: color })}
            />
            
            <hr className="border-editor-border" />
            
            <BorderRadiusSelector
                label={t('email.borderRadius', 'Bordes redondeados')}
                value={styles.borderRadius || 'md'}
                onChange={(val) => updateStyles({ borderRadius: val as any })}
            />
            
            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'center'}
                onChange={(val) => updateStyles({ alignment: val as any })}
            />
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado exterior')}
                value={styles.padding || 'md'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default ButtonBlockControls;
