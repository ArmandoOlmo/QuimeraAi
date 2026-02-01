/**
 * EmailEditorHeader
 * Header component for the email editor with device toggle and actions
 * Follows the same pattern as EditorHeader.tsx for familiarity
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Monitor,
    Smartphone,
    Save,
    Check,
    Send,
    Eye,
    Menu,
} from 'lucide-react';
import { useEmailEditor } from './EmailEditor';

interface EmailEditorHeaderProps {
    documentName: string;
    onSave?: () => void;
    onClose?: () => void;
    onSendTest?: () => void;
    isDirty?: boolean;
    onOpenMobileMenu?: () => void;
}

const EmailEditorHeader: React.FC<EmailEditorHeaderProps> = ({
    documentName,
    onSave,
    onClose,
    onSendTest,
    isDirty = false,
    onOpenMobileMenu,
}) => {
    const { t } = useTranslation();
    const { previewDevice, setPreviewDevice } = useEmailEditor();

    const [saveState, setSaveState] = React.useState<'idle' | 'saved'>('idle');

    const handleSave = () => {
        if (onSave) {
            onSave();
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2500);
        }
    };

    const deviceOptions: { name: 'desktop' | 'mobile'; icon: React.ReactNode; width: string }[] = [
        { name: 'desktop', icon: <Monitor className="w-4 h-4" />, width: '600px' },
        { name: 'mobile', icon: <Smartphone className="w-4 h-4" />, width: '375px' },
    ];

    return (
        <header className="bg-editor-bg border-b border-editor-border/50 h-14 flex-shrink-0 z-20">
            <div className="h-full flex items-center justify-between px-4 gap-4">
                {/* LEFT SECTION - Mobile Menu, Back & Name */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Menu Button */}
                    {onOpenMobileMenu && (
                        <button
                            onClick={onOpenMobileMenu}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-md transition-colors"
                            title={t('common.menu', 'Menú')}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    {/* Back Button */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="h-9 w-9 flex items-center justify-center text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 rounded-md transition-colors"
                            title={t('common.back', 'Volver')}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Divider */}
                    <div className="w-px h-6 bg-editor-border/50" />

                    {/* Document Name */}
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-editor-text-primary truncate max-w-[200px]">
                            {documentName}
                        </span>
                        {isDirty && (
                            <span className="text-xs text-editor-text-secondary">
                                ({t('editor.unsaved', 'Sin guardar')})
                            </span>
                        )}
                    </div>
                </div>

                {/* CENTER SECTION - Device Toggle */}
                <div className="flex items-center gap-2 bg-editor-panel-bg rounded-lg p-1">
                    {deviceOptions.map(({ name, icon, width }) => (
                        <button
                            key={name}
                            onClick={() => setPreviewDevice(name)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                ${previewDevice === name
                                    ? 'bg-editor-accent text-white'
                                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg/50'
                                }
                            `}
                            title={`${t('email.preview', 'Vista previa')} ${name} (${width})`}
                        >
                            {icon}
                            <span className="hidden md:inline capitalize">{name}</span>
                        </button>
                    ))}
                </div>

                {/* RIGHT SECTION - Actions */}
                <div className="flex items-center gap-2">
                    {/* Preview Button */}
                    <button
                        className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40"
                        title={t('email.previewEmail', 'Vista previa del email')}
                    >
                        <Eye className="w-4 h-4" />
                        <span className="hidden lg:inline">{t('email.preview', 'Vista previa')}</span>
                    </button>

                    {/* Send Test Button */}
                    <button
                        onClick={onSendTest}
                        disabled={!onSendTest}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-all text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('email.sendTest', 'Enviar prueba')}
                    >
                        <Send className="w-4 h-4" />
                        <span className="hidden lg:inline">{t('email.sendTest', 'Enviar prueba')}</span>
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saveState === 'saved'}
                        className={`
                            flex items-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium transition-all
                            ${saveState === 'saved'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-editor-accent text-white hover:bg-editor-accent/90'
                            }
                        `}
                        title={saveState === 'idle' ? t('common.save', 'Guardar') : t('editor.saved', 'Guardado')}
                    >
                        {saveState === 'idle' ? (
                            <>
                                <Save className="w-4 h-4" />
                                <span>{t('common.save', 'Guardar')}</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>{t('editor.saved', 'Guardado')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default EmailEditorHeader;






