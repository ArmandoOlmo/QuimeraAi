/**
 * Step3Services
 * Third step: Services/Products with AI suggestions
 */

import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Edit2, Check, X, AlertCircle, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingService } from '../../../types/onboarding';
import AIAssistButton from '../components/AIAssistButton';

interface Step3ServicesProps {
    services: OnboardingService[];
    businessName: string;
    industry: string;
    onUpdate: (services: OnboardingService[]) => void;
    onGenerateAI: () => Promise<OnboardingService[]>;
}

const Step3Services: React.FC<Step3ServicesProps> = ({
    services,
    businessName,
    industry,
    onUpdate,
    onGenerateAI,
}) => {
    const { t } = useTranslation();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [newService, setNewService] = useState({ name: '', description: '' });

    const handleGenerateServices = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const generatedServices = await onGenerateAI();
            onUpdate(generatedServices);
        } catch (err: any) {
            console.error('Failed to generate services:', err);
            setError(t('onboarding.errorGeneratingServices', 'Failed to generate services. Please try again.'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddService = () => {
        if (!newService.name.trim()) return;
        
        const service: OnboardingService = {
            id: `service-${Date.now()}`,
            name: newService.name.trim(),
            description: newService.description.trim(),
            isAIGenerated: false,
        };
        
        onUpdate([...services, service]);
        setNewService({ name: '', description: '' });
        setIsAdding(false);
    };

    const handleEditService = (service: OnboardingService) => {
        setEditingId(service.id);
        setEditForm({ name: service.name, description: service.description || '' });
    };

    const handleSaveEdit = () => {
        if (!editingId || !editForm.name.trim()) return;
        
        const updated = services.map(s => 
            s.id === editingId 
                ? { ...s, name: editForm.name.trim(), description: editForm.description.trim() }
                : s
        );
        
        onUpdate(updated);
        setEditingId(null);
        setEditForm({ name: '', description: '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({ name: '', description: '' });
    };

    const handleDeleteService = (id: string) => {
        onUpdate(services.filter(s => s.id !== id));
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
                    <Briefcase size={32} className="text-secondary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.step3Heading', 'Your Services & Products')}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.step3Subheading', 'What do you offer? Let AI suggest or add your own.')}
                </p>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
                <AIAssistButton
                    onClick={handleGenerateServices}
                    isLoading={isGenerating}
                    disabled={services.length >= 10}
                    label={services.length > 0 
                        ? t('onboarding.regenerateServices', 'Regenerate Services with AI')
                        : t('onboarding.generateServices', 'Generate Services with AI')
                    }
                    size="lg"
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Services List */}
            <div className="space-y-3">
                {services.map((service, index) => (
                    <div 
                        key={service.id}
                        className={`
                            p-4 bg-card border border-border rounded-xl
                            ${service.isAIGenerated ? 'border-l-4 border-l-primary' : ''}
                        `}
                    >
                        {editingId === service.id ? (
                            /* Edit Mode */
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    placeholder={t('onboarding.serviceName', 'Service name')}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                    autoFocus
                                />
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder={t('onboarding.serviceDescription', 'Brief description (optional)')}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={!editForm.name.trim()}
                                        className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Display Mode */
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-1">
                                    <GripVertical size={16} className="text-muted-foreground/30" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-foreground">
                                            {service.name}
                                        </h4>
                                        {service.isAIGenerated && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                                                AI
                                            </span>
                                        )}
                                    </div>
                                    {service.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {service.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEditService(service)}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add New Service */}
                {isAdding ? (
                    <div className="p-4 bg-card border border-primary/30 rounded-xl space-y-3">
                        <input
                            type="text"
                            value={newService.name}
                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            placeholder={t('onboarding.serviceName', 'Service name')}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            autoFocus
                        />
                        <textarea
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                            placeholder={t('onboarding.serviceDescription', 'Brief description (optional)')}
                            rows={2}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewService({ name: '', description: '' });
                                }}
                                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleAddService}
                                disabled={!newService.name.trim()}
                                className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {t('common.add', 'Add')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        disabled={services.length >= 10}
                        className="w-full p-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        <span>{t('onboarding.addService', 'Add Service')}</span>
                    </button>
                )}
            </div>

            {/* Empty state */}
            {services.length === 0 && !isAdding && (
                <div className="text-center py-8 text-muted-foreground">
                    <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                    <p>{t('onboarding.noServicesYet', 'No services added yet')}</p>
                    <p className="text-sm mt-1">{t('onboarding.useAIOrAdd', 'Use AI to generate or add manually')}</p>
                </div>
            )}

            {/* Counter */}
            {services.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    {services.length}/10 {t('onboarding.servicesAdded', 'services added')}
                </p>
            )}
        </div>
    );
};

export default Step3Services;
















