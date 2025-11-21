import React, { useState, useEffect } from 'react';
import Modal from '../../ui/Modal';
import { Plan, ServiceModule } from '../../../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface PlanEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    planToEdit: Plan | null;
    serviceModules: ServiceModule[];
    onSave: (plan: Plan) => void;
}

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ isOpen, onClose, planToEdit, serviceModules, onSave }) => {
    const [formData, setFormData] = useState<Omit<Plan, 'id' | 'isArchived'>>({
        name: '', description: '', price: { monthly: 0, annually: 0 },
        features: [''], serviceModuleIds: [], isFeatured: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (planToEdit) {
            setFormData({
                name: planToEdit.name,
                description: planToEdit.description,
                price: planToEdit.price,
                features: planToEdit.features.length > 0 ? planToEdit.features : [''],
                serviceModuleIds: planToEdit.serviceModuleIds,
                isFeatured: planToEdit.isFeatured,
            });
        } else {
            setFormData({
                name: '', description: '', price: { monthly: 0, annually: 0 },
                features: [''], serviceModuleIds: [], isFeatured: false,
            });
        }
    }, [planToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePriceChange = (cycle: 'monthly' | 'annually', value: string) => {
        setFormData(prev => ({
            ...prev,
            price: { ...prev.price, [cycle]: parseFloat(value) || 0 }
        }));
    };

    const handleFeatureChange = (index: number, value: string) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData(prev => ({ ...prev, features: newFeatures }));
    };

    const addFeature = () => setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
    const removeFeature = (index: number) => setFormData(prev => ({ ...prev, features: formData.features.filter((_, i) => i !== index) }));

    const handleModuleToggle = (moduleId: string) => {
        setFormData(prev => ({
            ...prev,
            serviceModuleIds: prev.serviceModuleIds.includes(moduleId)
                ? prev.serviceModuleIds.filter(id => id !== moduleId)
                : [...prev.serviceModuleIds, moduleId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const planData: Plan = {
            id: planToEdit?.id || '',
            ...formData,
            features: formData.features.filter(f => f.trim() !== ''),
            isArchived: planToEdit?.isArchived || false,
        };
        // Simulate API call
        setTimeout(() => {
            onSave(planData);
            setIsLoading(false);
            onClose();
        }, 500);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 border-b border-editor-border flex justify-between items-center"><h2 className="text-lg font-semibold text-white">{planToEdit ? 'Edit Plan' : 'Create New Plan'}</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-editor-border"><X /></button></div>
            <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 overflow-y-auto space-y-4 max-h-[70vh]">
                    <div><label htmlFor="plan-name" className="block text-sm font-medium text-editor-text-secondary mb-1">Plan Name</label><input id="plan-name" name="name" type="text" value={formData.name} onChange={handleChange} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent" /></div>
                    <div><label htmlFor="plan-description" className="block text-sm font-medium text-editor-text-secondary mb-1">Description</label><textarea id="plan-description" name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="plan-price-monthly" className="block text-sm font-medium text-editor-text-secondary mb-1">Monthly Price ($)</label><input id="plan-price-monthly" type="number" min="0" value={formData.price.monthly} onChange={e => handlePriceChange('monthly', e.target.value)} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent" /></div>
                        <div><label htmlFor="plan-price-annually" className="block text-sm font-medium text-editor-text-secondary mb-1">Annual Price ($)</label><input id="plan-price-annually" type="number" min="0" value={formData.price.annually} onChange={e => handlePriceChange('annually', e.target.value)} required className="w-full bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent" /></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-2">Features</label>
                        <div className="space-y-2">
                            {formData.features.map((feature, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input type="text" value={feature} onChange={e => handleFeatureChange(index, e.target.value)} placeholder="e.g., 10 Projects" className="flex-grow bg-editor-bg text-white p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent" />
                                    <button type="button" onClick={() => removeFeature(index)} className="p-2 text-editor-text-secondary rounded-full hover:bg-red-500/10 hover:text-red-400"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addFeature} className="mt-2 flex items-center text-xs font-semibold py-1 px-3 rounded-md bg-editor-border text-editor-text-secondary hover:bg-editor-accent hover:text-editor-bg"><Plus size={14} className="mr-1" /> Add Feature</button>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-editor-text-secondary mb-2">Included Service Modules</label>
                        <div className="space-y-2">
                            {serviceModules.map(module => (
                                <label key={module.id} className="flex items-center space-x-3 p-3 rounded-md bg-editor-bg border border-editor-border cursor-pointer hover:border-editor-accent/50">
                                    <input type="checkbox" checked={formData.serviceModuleIds.includes(module.id)} onChange={() => handleModuleToggle(module.id)} className="h-4 w-4 rounded bg-editor-border border-editor-border text-editor-accent focus:ring-editor-accent" />
                                    <span className="text-sm font-medium text-white">{module.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div className="flex items-center justify-between p-3 rounded-md bg-editor-bg border border-editor-border">
                        <label htmlFor="plan-featured" className="text-sm font-medium text-white">Mark as Featured Plan</label>
                        <button type="button" role="switch" aria-checked={formData.isFeatured} onClick={() => setFormData(p => ({...p, isFeatured: !p.isFeatured}))} className={`${formData.isFeatured ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors`}>
                            <span aria-hidden="true" className={`${formData.isFeatured ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition`}/>
                        </button>
                    </div>
                </div>
                <div className="p-6 bg-editor-panel-bg/50 border-t border-editor-border flex justify-end items-center space-x-3">
                    <button type="button" onClick={onClose} className="font-semibold py-2 px-5 rounded-lg hover:bg-editor-border">Cancel</button>
                    <button type="submit" disabled={isLoading} className="bg-editor-accent text-editor-bg font-bold py-2 px-5 rounded-lg shadow-md hover:bg-editor-accent-hover disabled:opacity-50 flex items-center">{isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}{isLoading ? 'Saving...' : 'Save Plan'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default PlanEditorModal;
