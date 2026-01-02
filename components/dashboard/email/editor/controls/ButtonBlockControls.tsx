/**
 * ButtonBlockControls
 * Controls for editing Button block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailButtonContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';

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
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition mt-0.5 ml-0.5`} />
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
    
    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                <Input
                    label={t('email.buttonText', 'Texto del botón')}
                    value={content.text || ''}
                    onChange={(e) => updateContent({ text: e.target.value })}
                    placeholder={t('email.buttonTextPlaceholder', 'Click aquí')}
                />
                
                <Input
                    label={t('email.buttonUrl', 'URL de destino')}
                    value={content.url || ''}
                    onChange={(e) => updateContent({ url: e.target.value })}
                    placeholder="https://"
                />
                
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






