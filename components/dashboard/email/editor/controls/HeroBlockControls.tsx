/**
 * HeroBlockControls
 * Controls for editing Hero block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailHeroContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';
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

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <textarea
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-y min-h-[80px] transition-all placeholder:text-editor-text-secondary/50"
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
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
        </button>
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['sm', 'md', 'lg', 'xl'];
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
                />

                <Input
                    label={t('email.imageAlt', 'Texto alternativo')}
                    value={content.imageAlt || ''}
                    onChange={(e) => updateContent({ imageAlt: e.target.value })}
                    placeholder={t('email.imageAltPlaceholder', 'Descripción de la imagen...')}
                />

                <hr className="border-editor-border" />

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

                        <Input
                            label={t('email.buttonUrl', 'URL del botón')}
                            value={content.buttonUrl || ''}
                            onChange={(e) => updateContent({ buttonUrl: e.target.value })}
                            placeholder="https://"
                        />
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

            <hr className="border-editor-border" />

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

            <hr className="border-editor-border" />

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






