/**
 * EmailPropertiesPanel
 * Right sidebar showing controls for the selected block or global styles
 * Follows the same pattern as PropertiesPanel.tsx for familiarity
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Palette, Settings, Mail, Sparkles } from 'lucide-react';
import { useEmailEditor } from './EmailEditor';
import { renderBlockControls } from './controls/ControlsRenderer';
import GlobalStylesControls from './controls/GlobalStylesControls';

// =============================================================================
// TAB TYPES
// =============================================================================

type TabType = 'content' | 'style';
type StyleSubTab = 'block' | 'global';

// =============================================================================
// COMPONENT
// =============================================================================

const EmailPropertiesPanel: React.FC = () => {
    const { t } = useTranslation();
    const {
        document,
        selectedBlockId,
        updateSubject,
        updatePreviewText,
    } = useEmailEditor();
    
    const [activeTab, setActiveTab] = useState<TabType>('content');
    const [styleSubTab, setStyleSubTab] = useState<StyleSubTab>('block');
    
    // Get selected block
    const selectedBlock = selectedBlockId 
        ? document.blocks.find(b => b.id === selectedBlockId)
        : null;
        
    // Switch to 'global' if style tab is active but no block is selected
    React.useEffect(() => {
        if (!selectedBlockId && activeTab === 'style' && styleSubTab === 'block') {
            setStyleSubTab('global');
        }
    }, [selectedBlockId, activeTab, styleSubTab]);
    
    // Define main tabs
    const tabs = [
        { id: 'content' as TabType, label: t('controls.contentTab', 'Contenido'), icon: FileText },
        { id: 'style' as TabType, label: t('controls.styleTab', 'Estilo'), icon: Palette },
    ];
    
    return (
        <div className="h-full flex flex-col bg-q-bg">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-q-border">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-q-text-secondary uppercase tracking-wider">
                            {t('editor.properties', 'Propiedades')}
                        </h3>
                        {selectedBlock ? (
                            <p className="text-base font-semibold text-q-text mt-1 capitalize">
                                {selectedBlock.type}
                            </p>
                        ) : (
                            <p className="text-base text-q-text-secondary mt-1">
                                {t('email.document', 'Documento')}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 rounded-md border border-q-border/70 bg-q-surface/40 p-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-all
                                    ${activeTab === tab.id 
                                        ? 'bg-q-accent/15 text-q-accent' 
                                        : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'
                                    }
                                `}
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="quimera-clean-controls p-4">
                    {activeTab === 'style' ? (
                        <>
                            {/* Style Sub-Tabs Header (Only if block is selected) */}
                            {selectedBlock && (
                                <div className="flex gap-1 rounded-md border border-q-border/70 bg-q-surface/40 p-1 mb-6">
                                    <button
                                        onClick={() => setStyleSubTab('block')}
                                        className={`
                                            flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition-all text-center
                                            ${styleSubTab === 'block' 
                                                ? 'bg-q-accent/15 text-q-accent' 
                                                : 'text-q-text-secondary hover:text-q-text'
                                            }
                                        `}
                                    >
                                        {t('email.blockStyles', 'Bloque')}
                                    </button>
                                    <button
                                        onClick={() => setStyleSubTab('global')}
                                        className={`
                                            flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5
                                            ${styleSubTab === 'global' 
                                                ? 'bg-q-accent/15 text-q-accent' 
                                                : 'text-q-text-secondary hover:text-q-text'
                                            }
                                        `}
                                    >
                                        <Settings size={12} />
                                        {t('email.globalStyles', 'Global')}
                                    </button>
                                </div>
                            )}

                            {/* Style Content */}
                            {styleSubTab === 'global' ? (
                                <div>
                                    <div className="mb-4 pb-2 border-b border-q-border">
                                        <h4 className="text-sm font-bold text-q-text flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-q-text-secondary" />
                                            {t('email.globalSettings', 'Configuración Global')}
                                        </h4>
                                    </div>
                                    <GlobalStylesControls />
                                </div>
                            ) : selectedBlock ? (
                                renderBlockControls(selectedBlock, 'style')
                            ) : (
                                <NoBlockStyleSelected />
                            )}
                        </>
                    ) : selectedBlock ? (
                        renderBlockControls(selectedBlock, 'content')
                    ) : (
                        <NoBlockSelected 
                            activeTab={activeTab}
                            subject={document.subject}
                            previewText={document.previewText || ''}
                            onSubjectChange={updateSubject}
                            onPreviewTextChange={updatePreviewText}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// NO BLOCK SELECTED STATES
// =============================================================================

interface NoBlockSelectedProps {
    activeTab: TabType;
    subject: string;
    previewText: string;
    onSubjectChange: (value: string) => void;
    onPreviewTextChange: (value: string) => void;
}

const NoBlockSelected: React.FC<NoBlockSelectedProps> = ({
    activeTab,
    subject,
    previewText,
    onSubjectChange,
    onPreviewTextChange,
}) => {
    const { t } = useTranslation();
    
    if (activeTab === 'content') {
        return (
            <div className="space-y-4">
                {/* Email Subject */}
                <div>
                    <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
                        {t('email.subject', 'Asunto del email')}
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        placeholder={t('email.subjectPlaceholder', 'Escribe el asunto...')}
                        className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent"
                    />
                </div>
                
                {/* Preview Text */}
                <div>
                    <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
                        {t('email.previewText', 'Texto de vista previa')}
                    </label>
                    <textarea
                        value={previewText}
                        onChange={(e) => onPreviewTextChange(e.target.value)}
                        placeholder={t('email.previewTextPlaceholder', 'Texto que aparece después del asunto...')}
                        rows={3}
                        className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent resize-none"
                    />
                    <p className="text-xs text-q-text-secondary mt-1">
                        {t('email.previewTextHint', 'Se muestra en la bandeja de entrada después del asunto')}
                    </p>
                </div>
                
                {/* Hint */}
                <div className="bg-q-surface/50 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                        <Sparkles size={20} className="text-q-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-q-text mb-1">
                                {t('email.selectBlockHint', 'Selecciona un bloque')}
                            </h4>
                            <p className="text-xs text-q-text-secondary">
                                {t('email.selectBlockHintDesc', 'Haz clic en un bloque en el preview o en la lista para editar su contenido')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return null;
};

const NoBlockStyleSelected: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-q-surface/50 rounded-full p-6 mb-4">
                <Palette size={32} className="text-q-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-q-text mb-2">
                {t('email.noBlockSelected', 'Ningún bloque seleccionado')}
            </h3>
            <p className="text-sm text-q-text-secondary max-w-xs">
                {t('email.selectBlockForStyles', 'Selecciona un bloque para editar sus estilos')}
            </p>
        </div>
    );
};

export default EmailPropertiesPanel;





