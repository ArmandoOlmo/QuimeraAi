/**
 * ImageBlockControls
 * Controls for editing Image block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailImageContent, EmailBlockStyles } from '../../../../../types/email';
import ImagePicker from '../../../../ui/ImagePicker';

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

const BorderRadiusSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = [
        { v: 'none', l: '0' },
        { v: 'sm', l: 'SM' },
        { v: 'md', l: 'MD' },
        { v: 'lg', l: 'LG' },
        { v: 'xl', l: 'XL' },
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

interface ImageBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const ImageBlockControls: React.FC<ImageBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailImageContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailImageContent>) => {
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
                <ImagePicker
                    label={t('email.image', 'Imagen')}
                    value={content.src || ''}
                    onChange={(url) => updateContent({ src: url })}
                />
                
                <Input
                    label={t('email.imageAlt', 'Texto alternativo')}
                    value={content.alt || ''}
                    onChange={(e) => updateContent({ alt: e.target.value })}
                    placeholder={t('email.imageAltPlaceholder', 'Descripción de la imagen...')}
                />
                
                <Input
                    label={t('email.imageLink', 'Enlace (opcional)')}
                    value={content.link || ''}
                    onChange={(e) => updateContent({ link: e.target.value })}
                    placeholder="https://"
                />
                
                <SliderControl
                    label={t('email.imageWidth', 'Ancho')}
                    value={content.width || 100}
                    min={25}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={(val) => updateContent({ width: val })}
                />
            </div>
        );
    }
    
    // Style tab
    return (
        <div className="space-y-4">
            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'center'}
                onChange={(val) => updateStyles({ alignment: val as any })}
            />
            
            <BorderRadiusSelector
                label={t('email.borderRadius', 'Bordes redondeados')}
                value={styles.borderRadius || 'none'}
                onChange={(val) => updateStyles({ borderRadius: val as any })}
            />
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'sm'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default ImageBlockControls;






