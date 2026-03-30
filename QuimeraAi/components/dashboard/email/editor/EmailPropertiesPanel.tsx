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
        <div className="h-full flex flex-col bg-editor-bg">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-editor-border">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('editor.properties', 'Propiedades')}
                        </h3>
                        {selectedBlock ? (
                            <p className="text-base font-semibold text-editor-text-primary mt-1 capitalize">
                                {selectedBlock.type}
                            </p>
                        ) : (
                            <p className="text-base text-editor-text-secondary mt-1">
                                {t('email.document', 'Documento')}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 bg-editor-panel-bg p-1 rounded-lg">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all
                                    ${activeTab === tab.id 
                                        ? 'bg-editor-accent text-white shadow-sm' 
                                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
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
                <div className="p-4">
                    {activeTab === 'style' ? (
                        <>
                            {/* Style Sub-Tabs Header (Only if block is selected) */}
                            {selectedBlock && (
                                <div className="flex gap-1 bg-editor-panel-bg p-1 rounded-lg mb-6 border border-editor-border">
                                    <button
                                        onClick={() => setStyleSubTab('block')}
                                        className={`
                                            flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all text-center
                                            ${styleSubTab === 'block' 
                                                ? 'bg-editor-accent/10 text-editor-accent border border-editor-accent/20' 
                                                : 'text-editor-text-secondary hover:text-editor-text-primary'
                                            }
                                        `}
                                    >
                                        {t('email.blockStyles', 'Bloque')}
                                    </button>
                                    <button
                                        onClick={() => setStyleSubTab('global')}
                                        className={`
                                            flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5
                                            ${styleSubTab === 'global' 
                                                ? 'bg-editor-accent/10 text-editor-accent border border-editor-accent/20' 
                                                : 'text-editor-text-secondary hover:text-editor-text-primary'
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
                                    <div className="mb-4 pb-2 border-b border-editor-border">
                                        <h4 className="text-sm font-bold text-editor-text-primary flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-editor-text-secondary" />
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
                    <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                        {t('email.subject', 'Asunto del email')}
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        placeholder={t('email.subjectPlaceholder', 'Escribe el asunto...')}
                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                    />
                </div>
                
                {/* Preview Text */}
                <div>
                    <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                        {t('email.previewText', 'Texto de vista previa')}
                    </label>
                    <textarea
                        value={previewText}
                        onChange={(e) => onPreviewTextChange(e.target.value)}
                        placeholder={t('email.previewTextPlaceholder', 'Texto que aparece después del asunto...')}
                        rows={3}
                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-none"
                    />
                    <p className="text-xs text-editor-text-secondary mt-1">
                        {t('email.previewTextHint', 'Se muestra en la bandeja de entrada después del asunto')}
                    </p>
                </div>
                
                {/* Hint */}
                <div className="bg-editor-panel-bg/50 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                        <Sparkles size={20} className="text-editor-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-editor-text-primary mb-1">
                                {t('email.selectBlockHint', 'Selecciona un bloque')}
                            </h4>
                            <p className="text-xs text-editor-text-secondary">
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
            <div className="bg-editor-panel-bg/50 rounded-full p-6 mb-4">
                <Palette size={32} className="text-editor-text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-editor-text-primary mb-2">
                {t('email.noBlockSelected', 'Ningún bloque seleccionado')}
            </h3>
            <p className="text-sm text-editor-text-secondary max-w-xs">
                {t('email.selectBlockForStyles', 'Selecciona un bloque para editar sus estilos')}
            </p>
        </div>
    );
};

export default EmailPropertiesPanel;






