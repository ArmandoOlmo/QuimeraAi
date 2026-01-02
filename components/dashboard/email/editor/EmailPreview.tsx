/**
 * EmailPreview
 * Center panel showing the email preview with responsive device simulation
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { useEmailEditor } from './EmailEditor';
import { renderEmailBlock } from './blocks/BlockRenderer';

// =============================================================================
// DEVICE DIMENSIONS
// =============================================================================

const DEVICE_WIDTHS = {
    desktop: 600,  // Standard email width
    mobile: 375,   // Standard mobile width
};

// =============================================================================
// COMPONENT
// =============================================================================

const EmailPreview: React.FC = () => {
    const { t } = useTranslation();
    const {
        document,
        selectedBlockId,
        setSelectedBlockId,
        previewDevice,
    } = useEmailEditor();
    
    const containerWidth = DEVICE_WIDTHS[previewDevice];
    
    return (
        <div className="h-full flex flex-col">
            {/* Preview Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-editor-border bg-editor-bg/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail size={16} className="text-editor-text-secondary" />
                        <span className="text-sm font-medium text-editor-text-primary">
                            {t('email.preview', 'Vista previa')}
                        </span>
                        <span className="text-xs text-editor-text-secondary px-2 py-0.5 bg-editor-panel-bg rounded">
                            {containerWidth}px
                        </span>
                    </div>
                    
                    {/* Subject Line Preview */}
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-editor-text-secondary">{t('email.subject', 'Asunto')}:</span>
                        <span className="text-editor-text-primary font-medium truncate max-w-[200px]">
                            {document.subject || t('email.noSubject', 'Sin asunto')}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Preview Container */}
            <div className="flex-1 overflow-auto p-6">
                <div className="flex justify-center">
                    {/* Email Frame */}
                    <div 
                        className="bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300"
                        style={{ 
                            width: containerWidth,
                            maxWidth: '100%',
                        }}
                    >
                        {/* Email Body Background */}
                        <div 
                            style={{ 
                                backgroundColor: document.globalStyles.bodyBackgroundColor,
                                minHeight: 400,
                            }}
                        >
                            {/* Email Content Container */}
                            <div 
                                style={{ 
                                    backgroundColor: document.globalStyles.backgroundColor,
                                    fontFamily: document.globalStyles.fontFamily,
                                    maxWidth: containerWidth,
                                    margin: '0 auto',
                                }}
                            >
                                {/* Render Blocks */}
                                {document.blocks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                                        <Mail size={48} className="text-gray-300 mb-4" />
                                        <h3 className="text-lg font-medium text-gray-500 mb-2">
                                            {t('email.emptyEmail', 'Email vacío')}
                                        </h3>
                                        <p className="text-sm text-gray-400 max-w-xs">
                                            {t('email.emptyEmailHint', 'Agrega bloques desde el panel izquierdo para comenzar a diseñar tu email')}
                                        </p>
                                    </div>
                                ) : (
                                    document.blocks
                                        .filter(block => block.visible)
                                        .map(block => (
                                            <div
                                                key={block.id}
                                                className={`
                                                    relative cursor-pointer transition-all duration-150
                                                    ${selectedBlockId === block.id 
                                                        ? 'ring-2 ring-blue-500 ring-offset-0' 
                                                        : 'hover:ring-2 hover:ring-blue-300/50 hover:ring-offset-0'
                                                    }
                                                `}
                                                onClick={() => setSelectedBlockId(block.id)}
                                            >
                                                {renderEmailBlock(block, document.globalStyles)}
                                                
                                                {/* Selection Indicator */}
                                                {selectedBlockId === block.id && (
                                                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                                                )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailPreview;






