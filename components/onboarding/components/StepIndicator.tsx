/**
 * StepIndicator
 * Visual progress indicator for onboarding steps
 */

import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingStep } from '../../../types/onboarding';

interface StepIndicatorProps {
    currentStep: OnboardingStep;
    totalSteps?: number;
}

const STEP_ICONS = ['Building2', 'FileText', 'Briefcase', 'Layout', 'Contact', 'Rocket'];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps = 6 }) => {
    const { t } = useTranslation();

    const steps = [
        { id: 1, label: t('onboarding.step1Title', 'Your Business') },
        { id: 2, label: t('onboarding.step2Title', 'Description') },
        { id: 3, label: t('onboarding.step3Title', 'Services') },
        { id: 4, label: t('onboarding.step4Title', 'Template') },
        { id: 5, label: t('onboarding.step5Title', 'Contact') },
        { id: 6, label: t('onboarding.step6Title', 'Generate') },
    ];

    return (
        <div className="w-full px-4 py-6">
            {/* Desktop view */}
            <div className="hidden md:flex items-center justify-between max-w-3xl mx-auto">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;
                    const isUpcoming = currentStep < step.id;

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
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                        {steps[currentStep - 1]?.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {currentStep} / {totalSteps}
                    </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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





