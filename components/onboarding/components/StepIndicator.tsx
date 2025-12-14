/**
 * StepIndicator
 * Visual progress indicator for onboarding steps
 * Supports dynamic step count based on ecommerce option
 */

import React, { useMemo } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingWizardStep } from '../../../types/onboarding';

interface StepIndicatorProps {
    currentStep: OnboardingWizardStep;
    totalSteps?: number;
    hasEcommerce?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
    currentStep, 
    totalSteps = 6,
    hasEcommerce = false 
}) => {
    const { t } = useTranslation();

    // Build steps array based on whether ecommerce is enabled
    const steps = useMemo(() => {
        const baseSteps = [
            { id: 1, label: t('onboarding.step1Title', 'Your Business') },
            { id: 2, label: t('onboarding.step2Title', 'Description') },
            { id: 3, label: t('onboarding.step3Title', 'Services') },
            { id: 4, label: t('onboarding.step4Title', 'Template') },
            { id: 5, label: t('onboarding.step5Title', 'Contact') },
        ];

        if (hasEcommerce) {
            return [
                ...baseSteps,
                { id: 6, label: t('onboarding.step6StoreTitle', 'Store'), isStore: true },
                { id: 7, label: t('onboarding.step7Title', 'Generate') },
            ];
        }

        return [
            ...baseSteps,
            { id: 6, label: t('onboarding.step6Title', 'Generate') },
        ];
    }, [hasEcommerce, t]);

    // Get current step label (handle step number correctly)
    const getCurrentStepLabel = () => {
        const step = steps.find(s => s.id === currentStep);
        return step?.label || '';
    };

    return (
        <div className="w-full px-4 py-3 md:py-6">
            {/* Desktop view */}
            <div className="hidden md:flex items-center justify-between max-w-3xl mx-auto">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;
                    const isStore = 'isStore' in step && step.isStore;

                    return (
                        <React.Fragment key={step.id}>
                            {/* Step circle and label */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        w-10 h-10 rounded-full flex items-center justify-center
                                        font-semibold text-sm transition-all duration-300
                                        ${isCompleted 
                                            ? 'bg-green-500 text-white' 
                                            : isCurrent 
                                                ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' 
                                                : 'bg-muted text-muted-foreground'
                                        }
                                    `}
                                >
                                    {isCompleted ? (
                                        <Check size={18} strokeWidth={3} />
                                    ) : isStore ? (
                                        <ShoppingBag size={18} />
                                    ) : (
                                        step.id
                                    )}
                                </div>
                                <span 
                                    className={`
                                        mt-2 text-xs font-medium text-center max-w-[80px]
                                        ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                                    `}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-2">
                                    <div 
                                        className={`
                                            h-1 rounded-full transition-all duration-300
                                            ${isCompleted 
                                                ? 'bg-green-500' 
                                                : 'bg-muted'
                                            }
                                        `}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Mobile view - compact */}
            <div className="md:hidden">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-foreground">
                        {getCurrentStepLabel()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {currentStep} / {totalSteps}
                    </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default StepIndicator;





