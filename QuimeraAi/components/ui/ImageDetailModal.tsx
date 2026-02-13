import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFiles } from '../../contexts/files';
import { useToast } from '../../contexts/ToastContext';
import { FileRecord } from '../../types';
import { X, FileText, HardDrive, Calendar, Sparkles, Trash2, Download } from 'lucide-react';
import { formatBytes, formatFileDate } from '../../utils/fileHelpers';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';

interface ImageDetailModalProps {
    file: FileRecord;
    isOpen: boolean;
    onClose: () => void;
}

const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ file, isOpen, onClose }) => {
    const { t } = useTranslation();
    const { deleteFile, updateFileNotes, generateFileSummary } = useFiles();
    const { success, error: showError } = useToast();
    const [notes, setNotes] = useState(file.notes || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const notesTimeoutRef = useRef<number | null>(null);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        if (notesTimeoutRef.current) {
            clearTimeout(notesTimeoutRef.current);
        }
        notesTimeoutRef.current = window.setTimeout(() => {
            updateFileNotes(file.id, newNotes);
            success(t('dashboard.assets.preview.notesSaved'));
        }, 1000);
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteFile(file.id, file.storagePath);
            success(t('dashboard.assets.actions.deleted'));
            setShowDeleteConfirm(false);
            onClose();
        } catch (err) {
            showError('Failed to delete file');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSummarize = async () => {
        try {
            await generateFileSummary(file.id, file.downloadURL);
            success('Summary generated');
        } catch (err) {
            showError('Failed to generate summary');
        }
    };

    const isSummarizable = file.type.startsWith('text/');

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
            <div className="flex flex-col h-full max-h-[85vh] bg-editor-panel-bg rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-editor-border flex justify-between items-center bg-editor-panel-bg z-10">
                    <h3 className="font-bold text-lg text-editor-text-primary truncate max-w-[70%]">{file.name}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-editor-border text-editor-text-secondary hover:text-editor-text-primary transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Image/File Preview */}
                <div className="flex-1 overflow-auto p-0 bg-black/90 flex items-center justify-center relative min-h-[300px]">
                    {file.type.startsWith('image/') && (
                        <div
                            className="absolute inset-0 opacity-30 blur-3xl scale-110"
                            style={{ backgroundImage: `url(${file.downloadURL})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                    )}

                    {file.type.startsWith('image/') ? (
                        <img
                            src={file.downloadURL}
                            alt={file.name}
                            className="max-w-full max-h-full object-contain shadow-2xl relative z-10"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 relative z-10">
                            <FileText size={80} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">{t('dashboard.assets.preview.notAvailable')}</p>
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="border-t border-editor-border bg-editor-panel-bg z-10">
                    {/* Basic Info */}
                    <div className="p-4 border-b border-editor-border/50">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-editor-text-primary mb-1">{t('dashboard.assets.preview.title', 'Información')}</p>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-editor-text-secondary">
                                    <span className="flex items-center">
                                        <HardDrive size={14} className="mr-2 text-editor-accent" />
                                        {formatBytes(file.size)}
                                    </span>
                                    <span className="flex items-center">
                                        <Calendar size={14} className="mr-2 text-editor-accent" />
                                        {formatFileDate(file.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase">{t('dashboard.assets.preview.notes', 'Notas')}</label>
                            <textarea
                                value={notes}
                                onChange={handleNotesChange}
                                rows={2}
                                placeholder={t('dashboard.assets.preview.notes', 'Añadir notas...')}
                                className="w-full bg-editor-bg text-sm text-editor-text-primary p-3 rounded-lg border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none resize-none"
                            />
                        </div>

                        {/* AI Summary */}
                        {file.aiSummary && (
                            <div className="bg-editor-bg/50 p-3 rounded-lg border border-editor-border/50">
                                <div className="flex items-center mb-2">
                                    <Sparkles size={14} className="text-editor-accent mr-2" />
                                    <span className="text-xs font-bold text-editor-accent uppercase">{t('dashboard.assets.preview.aiSummary', 'Resumen AI')}</span>
                                </div>
                                <p className="text-sm text-editor-text-primary leading-relaxed">{file.aiSummary}</p>
                            </div>
                        )}
                        {file.summary && !file.aiSummary && (
                            <div className="bg-editor-bg/50 p-3 rounded-lg border border-editor-border/50">
                                <div className="flex items-center mb-2">
                                    <Sparkles size={14} className="text-editor-accent mr-2" />
                                    <span className="text-xs font-bold text-editor-accent uppercase">{t('dashboard.assets.preview.aiSummary', 'Resumen')}</span>
                                </div>
                                <p className="text-sm text-editor-text-primary leading-relaxed">{file.summary}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex justify-between items-center">
                        <div className="flex gap-2">
                            {isSummarizable && (
                                <button
                                    onClick={handleSummarize}
                                    className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-editor-accent/10 text-editor-accent hover:bg-editor-accent hover:text-editor-bg transition-colors"
                                >
                                    <Sparkles size={14} className="mr-1.5" /> {t('dashboard.assets.preview.generateSummary', 'Generar Resumen')}
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                className="flex items-center text-xs font-bold py-2 px-4 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                            >
                                <Trash2 size={14} className="mr-1.5" /> {t('dashboard.assets.actions.delete', 'Eliminar')}
                            </button>
                        </div>
                        <a
                            href={file.downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center bg-editor-accent text-editor-bg px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-editor-accent-hover transition-transform hover:scale-105 text-sm"
                        >
                            <Download size={16} className="mr-2" /> {t('dashboard.assets.actions.download', 'Descargar')}
                        </a>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                title={t('dashboard.assets.actions.deleteConfirm', '¿Eliminar este archivo?')}
                message={t('dashboard.assets.actions.deleteConfirmMessage', 'Esta acción no se puede deshacer. El archivo será eliminado permanentemente.')}
                variant="danger"
                isLoading={isDeleting}
            />
        </Modal>
    );
};

export default ImageDetailModal;
