/**
 * ColumnsBlockControls
 * Controls for editing Columns block content and styles
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Columns } from 'lucide-react';
import { useEmailEditor } from '../EmailEditor';
import { EmailBlock, EmailColumnsContent, EmailBlockStyles } from '../../../../../types/email';
import ColorControl from '../../../../ui/ColorControl';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const ColumnCountSelector: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => {
    const options = [2, 3];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-2 text-sm font-medium rounded-sm transition-colors flex items-center justify-center gap-2 ${value === opt ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        <Columns size={14} />
                        {opt} {opt === 2 ? 'columnas' : 'columnas'}
                    </button>
                ))}
            </div>
        </div>
    );
};

const GapSelector: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
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

// =============================================================================
// PROPS
// =============================================================================

interface ColumnsBlockControlsProps {
    block: EmailBlock;
    activeTab: 'content' | 'style';
}

// =============================================================================
// COMPONENT
// =============================================================================

const ColumnsBlockControls: React.FC<ColumnsBlockControlsProps> = ({ block, activeTab }) => {
    const { t } = useTranslation();
    const { updateBlock } = useEmailEditor();
    
    const content = block.content as EmailColumnsContent;
    const styles = block.styles;
    
    const updateContent = (updates: Partial<EmailColumnsContent>) => {
        updateBlock(block.id, {
            content: { ...content, ...updates },
        });
    };
    
    const updateStyles = (updates: Partial<EmailBlockStyles>) => {
        updateBlock(block.id, {
            styles: { ...styles, ...updates },
        });
    };
    
    const handleColumnCountChange = (count: 2 | 3) => {
        // Adjust columns array when count changes
        const currentColumns = content.columns || [[], []];
        if (count === 3 && currentColumns.length === 2) {
            updateContent({ 
                columnCount: count,
                columns: [...currentColumns, []] 
            });
        } else if (count === 2 && currentColumns.length === 3) {
            updateContent({ 
                columnCount: count,
                columns: currentColumns.slice(0, 2) 
            });
        } else {
            updateContent({ columnCount: count });
        }
    };
    
    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                <div className="bg-editor-panel-bg/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-editor-text-secondary flex items-center gap-2">
                        <Columns size={14} />
                        {t('email.columnsHint', 'Los bloques de columnas permiten dividir el contenido horizontalmente')}
                    </p>
                </div>
                
                <ColumnCountSelector
                    label={t('email.columnCount', 'Número de columnas')}
                    value={content.columnCount || 2}
                    onChange={(val) => handleColumnCountChange(val as 2 | 3)}
                />
                
                <GapSelector
                    label={t('email.columnGap', 'Espacio entre columnas')}
                    value={content.gap || 'md'}
                    onChange={(val) => updateContent({ gap: val as any })}
                />
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs text-amber-500">
                        {t('email.columnsNoteAdvanced', 'Nota: El soporte completo de contenido anidado en columnas llegará en una próxima actualización.')}
                    </p>
                </div>
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
            
            <PaddingSelector
                label={t('email.padding', 'Espaciado')}
                value={styles.padding || 'md'}
                onChange={(val) => updateStyles({ padding: val as any })}
            />
        </div>
    );
};

export default ColumnsBlockControls;






