
import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import Modal from '../../ui/Modal';
import { LLMPrompt } from '../../../types';
import { X } from 'lucide-react';

interface PromptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    promptToEdit: LLMPrompt | null;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, promptToEdit }) => {
    const { savePrompt } = useEditor();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        template: '',
        model: 'gemini-3-pro-preview',
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
        } else {
            setFormData({
                name: '',
                description: '',
                template: '',
                model: 'gemini-3-pro-preview',
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
            if (promptToEdit) {
                (dataToSave as any).id = promptToEdit.id;
            }
            await savePrompt(dataToSave);
            onClose();
        } catch (err) {
            console.error('Failed to save prompt:', err);
            setError('Failed to save prompt. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 border-b border-editor-border flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">{promptToEdit ? 'Edit Prompt' : 'Create New Prompt'}</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-editor-border"><X/></button>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 overflow-y-auto space-y-4">
                    {error && <p className="bg-red-500/10 text-red-400 text-sm p-3 rounded-md">{error}</p>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="prompt-name" className="block text-sm font-medium text-editor-text-secondary mb-1">Prompt Name (Unique ID)</label>
                            <input id="prompt-name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="prompt-area" className="block text-sm font-medium text-editor-text-secondary mb-1">Area / Category</label>
                            <select id="prompt-area" name="area" value={formData.area} onChange={handleChange} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none">
                                <option>Onboarding</option>
                                <option>Content Generation</option>
                                <option>Image Generation</option>
                                <option>File Management</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <label htmlFor="prompt-description" className="block text-sm font-medium text-editor-text-secondary mb-1">Description</label>
                        <textarea id="prompt-description" name="description" value={formData.description} onChange={handleChange} required rows={2} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" placeholder="Explain what this prompt does and where it is used."/>
                    </div>
                     <div>
                        <label htmlFor="prompt-template" className="block text-sm font-medium text-editor-text-secondary mb-1">Template</label>
                        <p className="text-xs text-editor-text-secondary/70 mb-2">{'Use placeholders like `{{businessName}}` or `{{context}}` which will be replaced dynamically.'}</p>
                        <textarea id="prompt-template" name="template" value={formData.template} onChange={handleChange} required rows={8} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border font-mono text-sm focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="prompt-model" className="block text-sm font-medium text-editor-text-secondary mb-1">Model</label>
                            <select id="prompt-model" name="model" value={formData.model} onChange={handleChange} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none">
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Recommended)</option>
                                <option value="gemini-3-pro-image-preview">Nano Banana Pro (Gemini 3 Image)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="imagen-4.0-generate-001">Imagen 4</option>
                                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                                <option value="veo-3.1-fast-generate-preview">Veo Fast (Video)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="prompt-version" className="block text-sm font-medium text-editor-text-secondary mb-1">Version</label>
                            <input id="prompt-version" name="version" type="number" min="1" value={formData.version} onChange={handleChange} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent focus:outline-none" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-editor-panel-bg/50 border-t border-editor-border flex justify-end items-center space-x-3">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-5 rounded-lg hover:bg-editor-border transition-colors">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-editor-accent text-editor-bg font-bold py-2 px-5 rounded-lg shadow-md hover:bg-editor-accent-hover transition-colors disabled:opacity-50 flex items-center">
                        {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
                        {isLoading ? 'Saving...' : 'Save Prompt'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PromptEditorModal;
