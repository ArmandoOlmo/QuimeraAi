import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { FAQItem } from '../../../types';

interface FAQManagerProps {
    faqs: FAQItem[];
    onFAQsChange: (faqs: FAQItem[]) => void;
}

const FAQManager: React.FC<FAQManagerProps> = ({ faqs, onFAQsChange }) => {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
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

        onFAQsChange([...faqs, newFAQ]);
        setFormData({ question: '', answer: '' });
        setIsAdding(false);
    };

    const handleEdit = (faq: FAQItem) => {
        setEditingId(faq.id);
        setFormData({ question: faq.question, answer: faq.answer });
    };

    const handleUpdate = () => {
        if (!formData.question.trim() || !formData.answer.trim() || !editingId) return;

        onFAQsChange(
            faqs.map(faq =>
                faq.id === editingId
                    ? { ...faq, question: formData.question.trim(), answer: formData.answer.trim() }
                    : faq
            )
        );
        setEditingId(null);
        setFormData({ question: '', answer: '' });
    };

    const handleDelete = (id: string) => {
        if (confirm(t('aiAssistant.faq.deleteConfirm'))) {
            onFAQsChange(faqs.filter(faq => faq.id !== id));
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsAdding(false);
        setFormData({ question: '', answer: '' });
    };

    return (
        <div className="space-y-4">
            {/* Add New FAQ Button */}
            {!isAdding && !editingId && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-3 px-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-card/50 transition-all text-sm font-medium text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    {t('aiAssistant.faq.addFaq')}
                </button>
            )}

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                            {t('aiAssistant.faq.question')}
                        </label>
                        <input
                            type="text"
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            placeholder={t('aiAssistant.faq.questionPlaceholder')}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-y"
                            rows={4}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={editingId ? handleUpdate : handleAdd}
                            disabled={!formData.question.trim() || !formData.answer.trim()}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Save size={16} />
                            {editingId ? t('aiAssistant.faq.update') : t('aiAssistant.faq.add')} FAQ
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            <X size={16} />
                            {t('aiAssistant.faq.cancel')}
                        </button>
                    </div>
                </div>
            )}

            {/* FAQs List */}
            {faqs.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        {t('aiAssistant.faq.existingFaqs')} ({faqs.length})
                    </h4>
                    <div className="space-y-2">
                        {faqs.map((faq) => (
                            <div
                                key={faq.id}
                                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h5 className="text-sm font-semibold text-foreground">
                                        {faq.question}
                                    </h5>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button
                                            onClick={() => handleEdit(faq)}
                                            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                            title={t('aiAssistant.faq.edit')}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(faq.id)}
                                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                            title={t('aiAssistant.faq.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {faqs.length === 0 && !isAdding && (
                <div className="text-center py-8 bg-card/50 rounded-xl border border-dashed border-border">
                    <p className="text-sm text-muted-foreground mb-1">{t('aiAssistant.faq.noFaqs')}</p>
                    <p className="text-xs text-muted-foreground">
                        {t('aiAssistant.faq.noFaqsDesc')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default FAQManager;

