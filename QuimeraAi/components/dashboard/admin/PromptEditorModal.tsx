
import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../../contexts/admin';
import Modal from '../../ui/Modal';
import { LLMPrompt } from '../../../types';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardSelect from '../../ui/DashboardSelect';

interface PromptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptToEdit: LLMPrompt | null;
    initialPrompt?: Partial<LLMPrompt> | null;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, promptToEdit, initialPrompt }) => {
    const { t } = useTranslation();
    const { savePrompt } = useAdmin();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        template: '',
        model: 'gemini-3.1-pro-preview',
        version: 1,
        area: 'Other' as LLMPrompt['area'],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (promptToEdit) {
            setFormData({
                name: promptToEdit.name,
                description: promptToEdit.description,
                template: promptToEdit.template,
                model: promptToEdit.model,
                version: promptToEdit.version,
                area: promptToEdit.area || 'Other',
            });
        } else if (initialPrompt) {
            setFormData({
                name: initialPrompt.name || '',
                description: initialPrompt.description || '',
                template: initialPrompt.template || '',
                model: initialPrompt.model || 'gemini-3.1-pro-preview',
                version: initialPrompt.version || 1,
                area: (initialPrompt.area as any) || 'Other',
            });
        } else {
            setFormData({
                name: '',
                description: '',
                template: '',
                model: 'gemini-3.1-pro-preview',
                version: 1,
                area: 'Other',
            });
        }
        setError('');
    }, [promptToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'version' ? parseInt(value, 10) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const dataToSave = { ...formData };
            if (promptToEdit?.id) {
                (dataToSave as any).id = promptToEdit.id;
            }
            await savePrompt(dataToSave);
            onClose();
        } catch (err) {
            console.error('Failed to save prompt:', err);
            setError(t('superadmin.failedToSave'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 border-b border-editor-border flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">{promptToEdit ? 'Edit Prompt' : 'Create New Prompt'}</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-editor-border"><X /></button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 overflow-y-auto space-y-4">
                    {error && <p className="bg-red-500/10 text-red-400 text-sm p-3 rounded-md">{error}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="prompt-name" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.promptName')}</label>
                            <input id="prompt-name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="prompt-area" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.areaCategory')}</label>
                            <DashboardSelect
                                value={formData.area}
                                onChange={(val) => setFormData(prev => ({ ...prev, area: val as any }))}
                                options={[
                                    { value: 'Onboarding', label: t('superadmin.promptOnboarding') },
                                    { value: 'Content Generation', label: t('superadmin.promptContentGen') },
                                    { value: 'Image Generation', label: t('superadmin.promptImageGen') },
                                    { value: 'File Management', label: t('superadmin.promptFileManagement') },
                                    { value: 'Other', label: t('superadmin.promptOther') },
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="prompt-description" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.description')}</label>
                        <textarea id="prompt-description" name="description" value={formData.description} onChange={handleChange} required rows={2} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" placeholder={t('superadmin.descriptionPlaceholder')} />
                    </div>
                    <div>
                        <label htmlFor="prompt-template" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.template')}</label>
                        <p className="text-xs text-editor-text-secondary/70 mb-2">{'Use placeholders like `{{businessName}}` or `{{context}}` which will be replaced dynamically.'}</p>
                        <textarea id="prompt-template" name="template" value={formData.template} onChange={handleChange} required rows={8} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border font-mono text-sm focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="prompt-model" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.model')}</label>
                            <DashboardSelect
                                value={formData.model}
                                onChange={(val) => setFormData(prev => ({ ...prev, model: val }))}
                                options={[
                                    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Recommended)' },
                                    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
                                    { value: 'imagen-4.0-nano-banana-002', label: 'Quimera Nano Banana 2' },
                                    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
                                    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
                                    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
                                    { value: 'imagen-4.0-generate-001', label: 'Imagen 4.0 Standard' },
                                    { value: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4.0 Ultra' },
                                    { value: 'imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast' },
                                    { value: 'veo-3.1-fast-generate-preview', label: 'Veo Fast (Video)' },
                                ]}
                            />
                        </div>
                        <div>
                            <label htmlFor="prompt-version" className="block text-sm font-medium text-editor-text-secondary mb-1">{t('superadmin.version')}</label>
                            <input id="prompt-version" name="version" type="number" min="1" value={formData.version} onChange={handleChange} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-editor-panel-bg/50 border-t border-editor-border flex justify-end items-center space-x-3">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-5 rounded-lg hover:bg-editor-border transition-colors">{t('superadmin.cancel')}</button>
                    <button type="submit" disabled={isLoading} className="bg-editor-accent text-editor-bg font-bold py-2 px-5 rounded-lg shadow-md hover:bg-editor-accent-hover transition-colors disabled:opacity-50 flex items-center">
                        {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                        {isLoading ? t('superadmin.saving') : t('superadmin.savePrompt')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PromptEditorModal;
