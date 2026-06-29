import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { FAQItem } from '../../../types';
import ConfirmationModal from '../../ui/ConfirmationModal';

interface FAQManagerProps {
    faqs?: FAQItem[] | null;
    onFAQsChange: (faqs: FAQItem[]) => void;
}

const FAQManager: React.FC<FAQManagerProps> = ({ faqs, onFAQsChange }) => {
    const { t } = useTranslation();
    const safeFaqs = (Array.isArray(faqs) ? faqs : []).filter(Boolean);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id?: string; index: number } | null>(null);
    const [formData, setFormData] = useState<{ question: string; answer: string }>({
        question: '',
        answer: ''
    });

    const handleAdd = () => {
        if (!formData.question.trim() || !formData.answer.trim()) return;

        const newFAQ: FAQItem = {
            id: `faq_${Date.now()}`,
            question: formData.question.trim(),
            answer: formData.answer.trim()
        };

        onFAQsChange([...safeFaqs, newFAQ]);
        setFormData({ question: '', answer: '' });
        setIsAdding(false);
    };

    const handleEdit = (faq: FAQItem, index: number) => {
        setEditingId(faq.id || null);
        setEditingIndex(index);
        setFormData({
            question: typeof faq.question === 'string' ? faq.question : '',
            answer: typeof faq.answer === 'string' ? faq.answer : ''
        });
    };

    const handleUpdate = () => {
        if (!formData.question.trim() || !formData.answer.trim() || (editingId === null && editingIndex === null)) return;

        onFAQsChange(
            safeFaqs.map((faq, index) =>
                (editingId ? faq.id === editingId : index === editingIndex)
                    ? { ...faq, question: formData.question.trim(), answer: formData.answer.trim() }
                    : faq
            )
        );
        setEditingId(null);
        setEditingIndex(null);
        setFormData({ question: '', answer: '' });
    };

    const handleDelete = (id: string | undefined, index: number) => {
        setDeleteTarget({ id, index });
    };

    const handleConfirmDelete = () => {
        if (deleteTarget) {
            onFAQsChange(safeFaqs.filter((faq, index) => (
                deleteTarget.id ? faq.id !== deleteTarget.id : index !== deleteTarget.index
            )));
            setDeleteTarget(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingIndex(null);
        setIsAdding(false);
        setFormData({ question: '', answer: '' });
    };

    return (
        <div className="space-y-4">
            {/* Add New FAQ Button */}
            {!isAdding && !editingId && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-q-border rounded-xl hover:border-primary/50 hover:bg-q-surface/50 transition-all text-sm font-medium text-q-text-muted hover:text-primary flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    {t('aiAssistant.faq.addFaq')}
                </button>
            )}

            {/* Add/Edit Form */}
            {(isAdding || editingId !== null || editingIndex !== null) && (
                <div className="bg-q-surface border border-q-border rounded-xl p-4 space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                            {t('aiAssistant.faq.question')}
                        </label>
                        <input
                            type="text"
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            placeholder={t('aiAssistant.faq.questionPlaceholder')}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                            {t('aiAssistant.faq.answer')}
                        </label>
                        <textarea
                            value={formData.answer}
                            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            placeholder={t('aiAssistant.faq.answerPlaceholder')}
                            className="w-full bg-q-bg border border-q-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-y"
                            rows={4}
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            onClick={(editingId !== null || editingIndex !== null) ? handleUpdate : handleAdd}
                            disabled={!formData.question.trim() || !formData.answer.trim()}
                            className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            {(editingId !== null || editingIndex !== null) ? t('aiAssistant.faq.update') : t('aiAssistant.faq.add')} FAQ
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <X size={16} />
                            {t('aiAssistant.faq.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* FAQs List */}
            {safeFaqs.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        {t('aiAssistant.faq.existingFaqs')} ({safeFaqs.length})
                    </h4>
                    <div className="space-y-2">
                        {safeFaqs.map((faq, index) => {
                            const question = faq.question || 'Untitled question';
                            const answer = faq.answer || '';

                            return (
                            <div
                                key={faq.id || `${question}-${index}`}
                                className="min-w-0 bg-q-surface border border-q-border rounded-lg p-4 hover:border-primary/50 transition-colors group"
                            >
                                <div className="flex min-w-0 items-start justify-between gap-3 mb-2">
                                    <h5 className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                                        {question}
                                    </h5>
                                    <div className="flex gap-1 opacity-100 transition-opacity flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100">
                                        <button
                                            onClick={() => handleEdit(faq, index)}
                                            className="p-1.5 rounded hover:bg-q-accent/10 dark:hover:bg-q-accent/12 text-q-accent dark:text-q-accent transition-colors"
                                            title={t('aiAssistant.faq.edit')}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(faq.id, index)}
                                            className="p-1.5 rounded hover:bg-q-error/10 dark:hover:bg-q-error/12 text-q-error dark:text-q-error transition-colors"
                                            title={t('aiAssistant.faq.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="break-words text-xs text-q-text-muted leading-relaxed">
                                    {answer}
                                </p>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {safeFaqs.length === 0 && !isAdding && editingId === null && editingIndex === null && (
                <div className="text-center py-8 bg-q-surface/50 rounded-xl border border-dashed border-q-border">
                    <p className="text-sm text-q-text-muted mb-1">{t('aiAssistant.faq.noFaqs')}</p>
                    <p className="text-xs text-q-text-muted">
                        {t('aiAssistant.faq.noFaqsDesc')}
                    </p>
                </div>
            )}
            {/* Delete FAQ Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
                title={t('aiAssistant.faq.deleteConfirmTitle', '¿Eliminar pregunta?')}
                message={t('aiAssistant.faq.deleteConfirm', 'Esta acción eliminará la pregunta frecuente permanentemente.')}
                variant="danger"
            />
        </div>
    );
};

export default FAQManager;
