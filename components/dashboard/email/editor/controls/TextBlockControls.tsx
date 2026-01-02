/**
 * TextBlockControls
 * Controls for editing Text block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailTextContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, ...props }) => (
    <div className="mb-3">
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <textarea
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-y min-h-[120px] transition-all placeholder:text-editor-text-secondary/50"
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

const FontSizeSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
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

interface TextBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const TextBlockControls: React.FC<TextBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailTextContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailTextContent>) => {
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
                <TextArea
                    label={t('email.text', 'Texto')}
                    value={content.text || ''}
                    onChange={(e) => updateContent({ text: e.target.value })}
                    placeholder={t('email.textPlaceholder', 'Escribe tu contenido aquí...')}
                />
                
                <ToggleControl
                    label={t('email.allowHtml', 'Permitir HTML')}
                    checked={content.isHtml ?? false}
                    onChange={(checked) => updateContent({ isHtml: checked })}
                />
                
                {content.isHtml && (
                    <p className="text-xs text-amber-500">
                        {t('email.htmlWarning', 'Usa HTML básico. Estilos complejos pueden no renderizar en todos los clientes de email.')}
                    </p>
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
            
            <ColorControl
                label={t('email.textColor', 'Color del texto')}
                value={styles.textColor || '#52525b'}
                onChange={(color) => updateStyles({ textColor: color })}
            />
            
            <hr className="border-editor-border" />
            
            <FontSizeSelector
                label={t('email.fontSize', 'Tamaño de fuente')}
                value={styles.fontSize || 'md'}
                onChange={(val) => updateStyles({ fontSize: val as any })}
            />
            
            <AlignmentSelector
                label={t('email.alignment', 'Alineación')}
                value={styles.alignment || 'left'}
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

export default TextBlockControls;






