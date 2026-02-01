/**
 * EmailEditor
 * Main visual email editor component with 3-column layout
 * Follows the same structure as the web editor for user familiarity
 */

import React, { useState, useCallback, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
    EmailBlock,
    EmailBlockType,
    EmailDocument,
    EmailGlobalStyles,
    DEFAULT_EMAIL_GLOBAL_STYLES,
    DEFAULT_BLOCK_CONTENT,
    DEFAULT_BLOCK_STYLES,
} from '../../../../types/email';
import DashboardSidebar from '../../DashboardSidebar';
import EmailEditorHeader from './EmailEditorHeader';
import EmailBlockTree from './EmailBlockTree';
import EmailPreview from './EmailPreview';
import EmailPropertiesPanel from './EmailPropertiesPanel';

// =============================================================================
// CONTEXT
// =============================================================================

interface EmailEditorContextType {
    // Document state
    document: EmailDocument;
    setDocument: React.Dispatch<React.SetStateAction<EmailDocument>>;

    // Selection state
    selectedBlockId: string | null;
    setSelectedBlockId: (id: string | null) => void;

    // Preview state
    previewDevice: 'desktop' | 'mobile';
    setPreviewDevice: (device: 'desktop' | 'mobile') => void;

    // Block operations
    addBlock: (type: EmailBlockType, index?: number) => void;
    updateBlock: (id: string, updates: Partial<EmailBlock>) => void;
    deleteBlock: (id: string) => void;
    duplicateBlock: (id: string) => void;
    reorderBlocks: (newOrder: EmailBlock[]) => void;
    toggleBlockVisibility: (id: string) => void;

    // Global styles
    updateGlobalStyles: (updates: Partial<EmailGlobalStyles>) => void;

    // Subject/Preview text
    updateSubject: (subject: string) => void;
    updatePreviewText: (previewText: string) => void;

    // Dirty state
    isDirty: boolean;
    setIsDirty: (dirty: boolean) => void;
}

const EmailEditorContext = createContext<EmailEditorContextType | null>(null);

export const useEmailEditor = () => {
    const context = useContext(EmailEditorContext);
    if (!context) {
        throw new Error('useEmailEditor must be used within EmailEditorProvider');
    }
    return context;
};

// =============================================================================
// PROPS
// =============================================================================

interface EmailEditorProps {
    // Initial document (for editing existing)
    initialDocument?: Partial<EmailDocument>;

    // Callbacks
    onSave?: (document: EmailDocument) => void;
    onClose?: () => void;
    onSendTest?: () => void;

    // Campaign info (optional)
    campaignId?: string;
    campaignName?: string;
}

// =============================================================================
// DEFAULT DOCUMENT
// =============================================================================

const createDefaultDocument = (initial?: Partial<EmailDocument>): EmailDocument => {
    return {
        id: initial?.id || uuidv4(),
        name: initial?.name || 'Untitled Email',
        subject: initial?.subject || '',
        previewText: initial?.previewText || '',
        blocks: initial?.blocks || [],
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            ...initial?.globalStyles,
        },
    };
};

// =============================================================================
// COMPONENT
// =============================================================================

const EmailEditor: React.FC<EmailEditorProps> = ({
    initialDocument,
    onSave,
    onClose,
    onSendTest,
    campaignId,
    campaignName,
}) => {
    const { t } = useTranslation();

    // Document state
    const [document, setDocument] = useState<EmailDocument>(() =>
        createDefaultDocument(initialDocument)
    );

    // Selection state
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    // Preview device state
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

    // Dirty state (unsaved changes)
    const [isDirty, setIsDirty] = useState(false);

    // Mobile menu state for sidebar
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ==========================================================================
    // BLOCK OPERATIONS
    // ==========================================================================

    const addBlock = useCallback((type: EmailBlockType, index?: number) => {
        const newBlock: EmailBlock = {
            id: uuidv4(),
            type,
            visible: true,
            content: { ...DEFAULT_BLOCK_CONTENT[type] },
            styles: { ...DEFAULT_BLOCK_STYLES[type] },
        };

        setDocument(prev => {
            const newBlocks = [...prev.blocks];
            if (index !== undefined) {
                newBlocks.splice(index, 0, newBlock);
            } else {
                newBlocks.push(newBlock);
            }
            return { ...prev, blocks: newBlocks };
        });

        setSelectedBlockId(newBlock.id);
        setIsDirty(true);
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
        setDocument(prev => ({
            ...prev,
            blocks: prev.blocks.map(block =>
                block.id === id ? { ...block, ...updates } : block
            ),
        }));
        setIsDirty(true);
    }, []);

    const deleteBlock = useCallback((id: string) => {
        setDocument(prev => ({
            ...prev,
            blocks: prev.blocks.filter(block => block.id !== id),
        }));

        if (selectedBlockId === id) {
            setSelectedBlockId(null);
        }
        setIsDirty(true);
    }, [selectedBlockId]);

    const duplicateBlock = useCallback((id: string) => {
        setDocument(prev => {
            const blockIndex = prev.blocks.findIndex(b => b.id === id);
            if (blockIndex === -1) return prev;

            const originalBlock = prev.blocks[blockIndex];
            const newBlock: EmailBlock = {
                ...originalBlock,
                id: uuidv4(),
                content: { ...originalBlock.content },
                styles: { ...originalBlock.styles },
            };

            const newBlocks = [...prev.blocks];
            newBlocks.splice(blockIndex + 1, 0, newBlock);

            return { ...prev, blocks: newBlocks };
        });
        setIsDirty(true);
    }, []);

    const reorderBlocks = useCallback((newOrder: EmailBlock[]) => {
        setDocument(prev => ({ ...prev, blocks: newOrder }));
        setIsDirty(true);
    }, []);

    const toggleBlockVisibility = useCallback((id: string) => {
        setDocument(prev => ({
            ...prev,
            blocks: prev.blocks.map(block =>
                block.id === id ? { ...block, visible: !block.visible } : block
            ),
        }));
        setIsDirty(true);
    }, []);

    // ==========================================================================
    // GLOBAL STYLES
    // ==========================================================================

    const updateGlobalStyles = useCallback((updates: Partial<EmailGlobalStyles>) => {
        setDocument(prev => ({
            ...prev,
            globalStyles: { ...prev.globalStyles, ...updates },
        }));
        setIsDirty(true);
    }, []);

    // ==========================================================================
    // SUBJECT / PREVIEW TEXT
    // ==========================================================================

    const updateSubject = useCallback((subject: string) => {
        setDocument(prev => ({ ...prev, subject }));
        setIsDirty(true);
    }, []);

    const updatePreviewText = useCallback((previewText: string) => {
        setDocument(prev => ({ ...prev, previewText }));
        setIsDirty(true);
    }, []);

    // ==========================================================================
    // SAVE HANDLER
    // ==========================================================================

    const handleSave = useCallback(() => {
        if (onSave) {
            onSave(document);
            setIsDirty(false);
        }
    }, [document, onSave]);

    // ==========================================================================
    // CONTEXT VALUE
    // ==========================================================================

    const contextValue: EmailEditorContextType = {
        document,
        setDocument,
        selectedBlockId,
        setSelectedBlockId,
        previewDevice,
        setPreviewDevice,
        addBlock,
        updateBlock,
        deleteBlock,
        duplicateBlock,
        reorderBlocks,
        toggleBlockVisibility,
        updateGlobalStyles,
        updateSubject,
        updatePreviewText,
        isDirty,
        setIsDirty,
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <EmailEditorContext.Provider value={contextValue}>
            <div className="flex h-screen bg-editor-bg text-editor-text-primary">
                {/* Dashboard Sidebar - Collapsed by default, same as Web Editor */}
                <DashboardSidebar
                    isMobileOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    defaultCollapsed={true}
                />

                {/* Main Editor Content */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Header */}
                    <EmailEditorHeader
                        documentName={campaignName || document.name}
                        onSave={handleSave}
                        onClose={onClose}
                        onSendTest={onSendTest}
                        isDirty={isDirty}
                        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    />

                    {/* Main Content - 3 Column Layout */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Sidebar - Block Tree */}
                        <div className="w-64 flex-shrink-0 border-r border-editor-border overflow-hidden hidden md:block">
                            <EmailBlockTree />
                        </div>

                        {/* Center - Preview */}
                        <div className="flex-1 overflow-hidden bg-editor-panel-bg/30">
                            <EmailPreview />
                        </div>

                        {/* Right Sidebar - Properties Panel */}
                        <div className="w-80 flex-shrink-0 border-l border-editor-border overflow-hidden hidden lg:block">
                            <EmailPropertiesPanel />
                        </div>
                    </div>
                </div>
            </div>
        </EmailEditorContext.Provider>
    );
};

export default EmailEditor;






