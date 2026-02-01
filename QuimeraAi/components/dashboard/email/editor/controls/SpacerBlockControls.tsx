/**
 * SpacerBlockControls
 * Controls for editing Spacer block content
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailSpacerContent } from '../../../../../types/email';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

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

const QuickSizeSelector: React.FC<{
    label: string;
    value: number;
    options: { value: number; label: string }[];
    onChange: (value: number) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

// =============================================================================
// PROPS
// =============================================================================

interface SpacerBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const SpacerBlockControls: React.FC<SpacerBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailSpacerContent;
    
    const updateContent = (updates: Partial<EmailSpacerContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };
    
    // Spacer only has content controls, no style
    if (activeTab === 'style') {
        return (
            <div className="text-center py-8 text-editor-text-secondary">
                <p className="text-sm">{t('email.noStylesForSpacer', 'El espaciador no tiene opciones de estilo')}</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <QuickSizeSelector
                label={t('email.quickSize', 'Tamaño rápido')}
                value={content.height || 32}
                options={[
                    { value: 16, label: 'XS' },
                    { value: 24, label: 'SM' },
                    { value: 32, label: 'MD' },
                    { value: 48, label: 'LG' },
                    { value: 64, label: 'XL' },
                ]}
                onChange={(val) => updateContent({ height: val })}
            />
            
            <SliderControl
                label={t('email.customHeight', 'Altura personalizada')}
                value={content.height || 32}
                min={8}
                max={120}
                step={4}
                unit="px"
                onChange={(val) => updateContent({ height: val })}
            />
            
            {/* Visual Preview */}
            <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
                    {t('email.preview', 'Vista previa')}
                </label>
                <div className="bg-editor-panel-bg border border-editor-border rounded-md p-3">
                    <div className="flex items-center justify-center">
                        <div 
                            className="w-full bg-editor-accent/20 border border-dashed border-editor-accent/50 rounded"
                            style={{ height: `${Math.min(content.height || 32, 80)}px` }}
                        />
                    </div>
                    <p className="text-center text-xs text-editor-text-secondary mt-2">
                        {content.height || 32}px
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SpacerBlockControls;






