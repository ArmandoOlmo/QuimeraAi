/**
 * DividerBlockControls
 * Controls for editing Divider block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailDividerContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const SelectControl: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
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
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{label}</label>
            <span className="text-xs text-q-text">{value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
    </div>
);

const PaddingSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
    const options = ['none', 'sm', 'md', 'lg'];
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
                        {size === 'none' ? '0' : size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

// =============================================================================
// PROPS
// =============================================================================

interface DividerBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const DividerBlockControls: React.FC<DividerBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailDividerContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailDividerContent>) => {
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
                <SelectControl
                    label={t('email.lineStyle', 'Estilo de línea')}
                    value={content.style || 'solid'}
                    options={[
                        { value: 'solid', label: t('email.solid', 'Sólido') },
                        { value: 'dashed', label: t('email.dashed', 'Guiones') },
                        { value: 'dotted', label: t('email.dotted', 'Puntos') },
                    ]}
                    onChange={(val) => updateContent({ style: val as any })}
                />
                
                <SliderControl
                    label={t('email.thickness', 'Grosor')}
                    value={content.thickness || 1}
                    min={1}
                    max={5}
                    unit="px"
                    onChange={(val) => updateContent({ thickness: val })}
                />
                
                <SliderControl
                    label={t('email.width', 'Ancho')}
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
            <ColorControl
                label={t('email.lineColor', 'Color de la línea')}
                value={styles.borderColor || '#e4e4e7'}
                onChange={(color) => updateStyles({ borderColor: color })}
            />
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'sm'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default DividerBlockControls;






