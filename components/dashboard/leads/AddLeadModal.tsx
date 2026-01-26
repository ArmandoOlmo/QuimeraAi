import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X, User, Mail, Phone, Briefcase, Building2,
    Globe, DollarSign, Plus, Loader2, Sparkles,
    ChevronLeft, ChevronRight, Check, AlertCircle
} from 'lucide-react';
import Modal from '../../ui/Modal';
import { Lead } from '../../../types';

// =============================================================================
// TYPES
// =============================================================================

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (leadData: Partial<Lead>) => Promise<void>;
}

type WizardStep = 'contact' | 'company';

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
    { id: 'contact', label: 'Información de Contacto', icon: User },
    { id: 'company', label: 'Detalles de Empresa', icon: Building2 },
];

// =============================================================================
// STEP COMPONENTS
// =============================================================================

// Step 1: Contact
interface ContactStepProps {
    data: Partial<Lead>;
    onChange: (field: keyof Lead, value: any) => void;
    t: any;
}

const ContactStep: React.FC<ContactStepProps> = ({ data, onChange, t }) => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('common.name')} <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            required
                            value={data.name || ''}
                            onChange={e => onChange('name', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="e.g. Sarah Connor"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('leads.email')} <span className="text-red-400">*</span></label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            required
                            type="email"
                            value={data.email || ''}
                            onChange={e => onChange('email', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="sarah@skynet.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('leads.phone')}</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            type="tel"
                            value={data.phone || ''}
                            onChange={e => onChange('phone', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('leads.jobTitle')}</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            value={data.jobTitle || ''}
                            onChange={e => onChange('jobTitle', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="e.g. CTO"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 2: Company
interface CompanyStepProps {
    data: Partial<Lead>;
    onChange: (field: keyof Lead, value: any) => void;
    t: any;
}

const CompanyStep: React.FC<CompanyStepProps> = ({ data, onChange, t }) => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('leads.companyName')}</label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            value={data.company || ''}
                            onChange={e => onChange('company', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="e.g. Cyberdyne Systems"
                        />
                    </div>
                </div>

                <div className="space-y-1.5 group">
                    <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-primary transition-colors">{t('leads.industry')}</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            value={data.industry || ''}
                            onChange={e => onChange('industry', e.target.value)}
                            className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                            placeholder="e.g. Technology"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1.5 group max-w-[50%]">
                <label className="text-xs font-medium text-foreground/80 ml-1 group-focus-within:text-green-500 transition-colors">{t('leads.dealValue')}</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-green-500 transition-colors" size={16} />
                    <input
                        type="number"
                        min="0"
                        value={data.value || 0}
                        onChange={e => onChange('value', Number(e.target.value))}
                        className="w-full bg-secondary/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-green-500 outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 transition-all placeholder:text-muted-foreground/30 hover:bg-secondary/50"
                        placeholder="0.00"
                    />
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState<WizardStep>('contact');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [formData, setFormData] = useState<Partial<Lead>>({
        name: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        industry: '',
        value: 0,
        source: 'manual',
        status: 'new'
    });

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === STEPS.length - 1;

    const validateStep = (): boolean => {
        const newErrors: string[] = [];
        if (currentStep === 'contact') {
            if (!formData.name?.trim()) newErrors.push('El nombre es requerido');
            if (!formData.email?.trim()) newErrors.push('El email es requerido');
        }
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].id);
        }
    };

    const handlePrev = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].id);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                jobTitle: '',
                industry: '',
                value: 0,
                source: 'manual',
                status: 'new'
            });
            setCurrentStep('contact');
            onClose();
        } catch (error) {
            console.error("Error adding lead:", error);
            setErrors(['Error al crear el lead. Inténtalo de nuevo.']);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof Lead, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Reset when opening
    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                jobTitle: '',
                industry: '',
                value: 0,
                source: 'manual',
                status: 'new'
            });
            setCurrentStep('contact');
            setErrors([]);
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            className="bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
        >
            <div className="flex flex-col h-[70vh] max-h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary shadow-inner shadow-primary/5">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground tracking-tight">
                                {t('leads.addNewLead')}
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {STEPS[currentStepIndex].label}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-6 py-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        {STEPS.map((step, index) => {
                            const isActive = index === currentStepIndex;
                            const isCompleted = index < currentStepIndex;
                            const Icon = step.icon;

                            return (
                                <React.Fragment key={step.id}>
                                    <button
                                        onClick={() => index < currentStepIndex && setCurrentStep(step.id)}
                                        disabled={index > currentStepIndex}
                                        className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg
                                            transition-all duration-200
                                            ${isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                                                    : 'text-muted-foreground'
                                            }
                                        `}
                                    >
                                        {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                                        <span className="text-sm font-medium hidden sm:inline">
                                            {step.label}
                                        </span>
                                    </button>

                                    {index < STEPS.length - 1 && (
                                        <ChevronRight size={16} className="text-muted-foreground/50" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {errors.map((error, i) => (
                            <p key={i} className="text-sm text-red-500 flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {currentStep === 'contact' && (
                        <ContactStep data={formData} onChange={handleChange} t={t} />
                    )}
                    {currentStep === 'company' && (
                        <CompanyStep data={formData} onChange={handleChange} t={t} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/5 bg-secondary/20">
                    <button
                        onClick={handlePrev}
                        disabled={isFirstStep}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                            transition-colors
                            ${isFirstStep
                                ? 'text-muted-foreground/50 cursor-not-allowed'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }
                        `}
                    >
                        <ChevronLeft size={18} />
                        {t('common.previous')}
                    </button>

                    {isLastStep ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('leads.creating')}
                                </>
                            ) : (
                                <>
                                    <Plus size={18} />
                                    {t('leads.createLead')}
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                            {t('common.next')}
                            <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default AddLeadModal;
