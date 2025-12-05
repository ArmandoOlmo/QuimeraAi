/**
 * OnboardingModal
 * Main modal container for the onboarding flow
 */

import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { useOnboarding } from './hooks/useOnboarding';
import StepIndicator from './components/StepIndicator';

// Step Components
import Step1BusinessInfo from './steps/Step1BusinessInfo';
import Step2Description from './steps/Step2Description';
import Step3Services from './steps/Step3Services';
import Step4TemplateSelect from './steps/Step4TemplateSelect';
import Step5ContactInfo from './steps/Step5ContactInfo';
import Step6Generation from './steps/Step6Generation';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const OnboardingModal: React.FC = () => {
    const { t } = useTranslation();
    const { isOnboardingOpen, setIsOnboardingOpen } = useEditor();
    const {
        progress,
        isLoading,
        isSaving,
        error,
        templates,
        resetOnboarding,
        openOnboarding,
        nextStep,
        previousStep,
        canGoNext,
        canGoPrevious,
        updateBusinessInfo,
        updateDescription,
        updateServices,
        updateTemplateSelection,
        updateContactInfo,
        generateDescription,
        generateServices,
        getTemplateRecommendation,
        startGeneration,
        saveProgress,
    } = useOnboarding();

    // Initialize progress when modal opens
    useEffect(() => {
        if (isOnboardingOpen && !progress) {
            openOnboarding();
        }
    }, [isOnboardingOpen, progress, openOnboarding]);

    const closeOnboarding = () => {
        setIsOnboardingOpen(false);
        if (progress && progress.businessName) {
            saveProgress();
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOnboardingOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOnboardingOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOnboardingOpen && progress?.step !== 6) {
                closeOnboarding();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOnboardingOpen, progress?.step]);

    if (!isOnboardingOpen) return null;

    // Show loading while progress is being initialized
    if (!progress) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <div className="relative bg-background rounded-2xl p-8 flex items-center gap-4 border border-border">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <span className="text-foreground">{t('common.loading', 'Loading...')}</span>
                </div>
            </div>
        );
    }

    const renderCurrentStep = () => {
        switch (progress.step) {
            case 1:
                return (
                    <Step1BusinessInfo
                        businessName={progress.businessName}
                        industry={progress.industry}
                        subIndustry={progress.subIndustry}
                        onUpdate={updateBusinessInfo}
                    />
                );
            case 2:
                return (
                    <Step2Description
                        description={progress.description || ''}
                        tagline={progress.tagline}
                        businessName={progress.businessName}
                        industry={progress.industry}
                        onUpdate={updateDescription}
                        onGenerateAI={generateDescription}
                    />
                );
            case 3:
                return (
                    <Step3Services
                        services={progress.services || []}
                        businessName={progress.businessName}
                        industry={progress.industry}
                        onUpdate={updateServices}
                        onGenerateAI={generateServices}
                    />
                );
            case 4:
                return (
                    <Step4TemplateSelect
                        templates={templates}
                        selectedTemplateId={progress.selectedTemplateId}
                        enabledComponents={progress.enabledComponents}
                        disabledComponents={progress.disabledComponents}
                        aiRecommendation={progress.aiRecommendation}
                        industry={progress.industry}
                        onUpdate={updateTemplateSelection}
                        onGetRecommendation={getTemplateRecommendation}
                    />
                );
            case 5:
                return (
                    <Step5ContactInfo
                        contactInfo={progress.contactInfo}
                        onUpdate={updateContactInfo}
                    />
                );
            case 6:
                return (
                    <Step6Generation
                        progress={progress}
                        onStartGeneration={startGeneration}
                        onReset={resetOnboarding}
                    />
                );
            default:
                return null;
        }
    };

    const isGenerating = progress.step === 6 && progress.generationProgress?.phase !== 'idle' && progress.generationProgress?.phase !== 'completed';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => !isGenerating && closeOnboarding()}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-4xl max-h-[90vh] mx-4 bg-background rounded-2xl shadow-2xl flex flex-col border border-border ${progress.step === 1 ? '' : 'overflow-hidden'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <img 
                            src={QUIMERA_LOGO} 
                            alt="Quimera" 
                            className="w-8 h-8 object-contain"
                        />
                        <div>
                            <h2 className="text-lg font-bold text-foreground">
                                {t('onboarding.title', 'Create Your Website')}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t('onboarding.subtitle', 'AI-powered website builder')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Reset button - always visible except during generation */}
                        {!isGenerating && (
                            <button
                                onClick={resetOnboarding}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                title={t('onboarding.startOver', 'Start Over')}
                            >
                                <RotateCcw size={18} />
                            </button>
                        )}
                        {/* Close button */}
                        {!isGenerating && (
                            <button
                                onClick={closeOnboarding}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="border-b border-border bg-card/50">
                    <StepIndicator currentStep={progress.step} />
                </div>

                {/* Content */}
                <div className={`flex-1 p-6 ${progress.step === 1 ? 'overflow-visible' : 'overflow-y-auto'}`}>
                    {error && (
                        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    {renderCurrentStep()}
                </div>

                {/* Footer with Navigation */}
                {progress.step !== 6 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card rounded-b-2xl">
                        {/* Previous Button */}
                        <button
                            onClick={previousStep}
                            disabled={!canGoPrevious()}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                                ${canGoPrevious()
                                    ? 'text-foreground hover:bg-accent'
                                    : 'text-muted-foreground/50 cursor-not-allowed'
                                }
                            `}
                        >
                            <ChevronLeft size={18} />
                            <span>{t('onboarding.previous', 'Previous')}</span>
                        </button>

                        {/* Saving indicator */}
                        {isSaving && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                                {t('onboarding.saving', 'Saving...')}
                            </span>
                        )}

                        {/* Next Button */}
                        <button
                            onClick={nextStep}
                            disabled={!canGoNext()}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
                                ${canGoNext()
                                    ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:scale-105'
                                    : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                                }
                            `}
                        >
                            <span>
                                {progress.step === 5 
                                    ? t('onboarding.generate', 'Generate Website')
                                    : t('onboarding.next', 'Next')
                                }
                            </span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingModal;
