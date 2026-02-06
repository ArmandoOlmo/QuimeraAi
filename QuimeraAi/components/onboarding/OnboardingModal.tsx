/**
 * OnboardingModal
 * Main modal container for the onboarding flow
 */

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useOnboarding } from './hooks/useOnboarding';
import StepIndicator from './components/StepIndicator';

// Step Components
import Step0WebsiteAnalyzer from './steps/Step0WebsiteAnalyzer';
import Step1BusinessInfo from './steps/Step1BusinessInfo';
import Step2Description from './steps/Step2Description';
import Step3Services from './steps/Step3Services';
import Step4TemplateSelect from './steps/Step4TemplateSelect';
import Step5ContactInfo from './steps/Step5ContactInfo';
import Step6StoreSetup from './steps/Step6StoreSetup';
import Step7Generation from './steps/Step7Generation';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

const OnboardingModal: React.FC = () => {
    const { t } = useTranslation();
    const { isOnboardingOpen, setIsOnboardingOpen } = useUI();
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
        updateEcommerceSettings,
        updateStoreSetup,
        generateDescription,
        generateServices,
        getTemplateRecommendation,
        generateSuggestedCategories,
        startGeneration,
        saveProgress,
        suggestedCategories,
        isLoadingCategories,
        // Website Analysis
        isAnalyzingWebsite,
        analyzeWebsite,
        skipWebsiteAnalysis,
        // Bio Page Updates
        updateBioPageSettings,
    } = useOnboarding();

    // State for emergency cancel confirmation
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [generationDuration, setGenerationDuration] = useState(0);

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

    // Handle escape key (don't close during generation step)
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            const generationStep = progress?.hasEcommerce ? 7 : 6;
            if (e.key === 'Escape' && isOnboardingOpen && progress?.step !== generationStep) {
                closeOnboarding();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOnboardingOpen, progress?.step, progress?.hasEcommerce]);

    // Track generation duration for emergency cancel option
    useEffect(() => {
        const generationStep = progress?.hasEcommerce ? 7 : 6;
        const isCurrentlyGenerating = progress?.step === generationStep &&
            progress?.generationProgress?.phase !== 'idle' &&
            progress?.generationProgress?.phase !== 'completed' &&
            progress?.generationProgress?.phase !== 'error';

        if (isCurrentlyGenerating && progress?.generationProgress?.startedAt) {
            const startTime = progress.generationProgress.startedAt;
            const interval = setInterval(() => {
                setGenerationDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setGenerationDuration(0);
            setShowCancelConfirm(false);
        }
    }, [progress?.step, progress?.hasEcommerce, progress?.generationProgress?.phase, progress?.generationProgress?.startedAt]);

    // Handle emergency cancel
    const handleEmergencyCancel = async () => {
        setShowCancelConfirm(false);
        await resetOnboarding();
    };

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
            case 0:
                return (
                    <Step0WebsiteAnalyzer
                        onAnalysisComplete={(result) => {
                            // Analysis auto-populates progress, just go to next step
                            nextStep();
                        }}
                        onSkip={skipWebsiteAnalysis}
                        isAnalyzing={isAnalyzingWebsite}
                        onStartAnalysis={analyzeWebsite}
                    />
                );
            case 1:
                return (
                    <Step1BusinessInfo
                        businessName={progress.businessName}
                        industry={progress.industry}
                        subIndustry={progress.subIndustry}
                        hasEcommerce={progress.hasEcommerce}
                        ecommerceType={progress.ecommerceType}
                        hasBioPage={progress.hasBioPage}
                        onUpdate={updateBusinessInfo}
                        onEcommerceUpdate={updateEcommerceSettings}
                        onBioPageUpdate={updateBioPageSettings}
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
                // Step 6 is Store Setup (only if hasEcommerce) or Generation (if no ecommerce)
                if (progress.hasEcommerce) {
                    return (
                        <Step6StoreSetup
                            storeSetup={progress.storeSetup}
                            businessName={progress.businessName}
                            industry={progress.industry}
                            ecommerceType={progress.ecommerceType}
                            suggestedCategories={suggestedCategories}
                            isLoadingCategories={isLoadingCategories}
                            onUpdate={updateStoreSetup}
                            onGenerateCategories={generateSuggestedCategories}
                        />
                    );
                }
                // If no ecommerce, step 6 is Generation
                return (
                    <Step7Generation
                        progress={progress}
                        onStartGeneration={startGeneration}
                        onReset={resetOnboarding}
                    />
                );
            case 7:
                // Step 7 is always Generation (when ecommerce is enabled)
                return (
                    <Step7Generation
                        progress={progress}
                        onStartGeneration={startGeneration}
                        onReset={resetOnboarding}
                    />
                );
            default:
                return null;
        }
    };

    // Determine the generation step number based on hasEcommerce
    const generationStep = progress.hasEcommerce ? 7 : 6;
    const isGenerating = progress.step === generationStep && progress.generationProgress?.phase !== 'idle' && progress.generationProgress?.phase !== 'completed';
    const totalSteps = progress.hasEcommerce ? 7 : 6;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => !isGenerating && closeOnboarding()}
            />

            {/* Modal */}
            <div className="relative w-full max-w-none md:max-w-4xl h-[100dvh] md:h-auto md:max-h-[90vh] md:mx-4 md:rounded-2xl bg-background shadow-2xl flex flex-col border-0 md:border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border bg-card md:rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <img
                            src={QUIMERA_LOGO}
                            alt="Quimera"
                            className="w-7 h-7 md:w-8 md:h-8 object-contain"
                        />
                        <div>
                            <h2 className="text-base md:text-lg font-bold text-foreground">
                                {t('onboarding.title', 'Create Your Website')}
                            </h2>
                            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
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
                        {/* Emergency cancel button - visible during generation after 30 seconds */}
                        {isGenerating && generationDuration >= 30 && (
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="p-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title={t('onboarding.cancelGeneration', 'Cancel Generation')}
                            >
                                <X size={20} />
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
                <div className="border-b border-border bg-card/50 flex-shrink-0">
                    <StepIndicator
                        currentStep={progress.step}
                        totalSteps={totalSteps}
                        hasEcommerce={progress.hasEcommerce}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto overscroll-contain">
                    {error && (
                        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    {renderCurrentStep()}
                </div>

                {/* Footer with Navigation */}
                {progress.step !== generationStep && (
                    <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-t border-border bg-card md:rounded-b-2xl flex-shrink-0">
                        {/* Previous Button */}
                        <button
                            onClick={previousStep}
                            disabled={!canGoPrevious()}
                            className={`
                                flex items-center gap-1 md:gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl font-medium transition-all text-sm md:text-base
                                ${canGoPrevious()
                                    ? 'text-foreground hover:bg-accent'
                                    : 'text-muted-foreground/50 cursor-not-allowed'
                                }
                            `}
                        >
                            <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />
                            <span className="hidden sm:inline">{t('onboarding.previous', 'Previous')}</span>
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
                                flex items-center gap-1 md:gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-medium transition-all text-sm md:text-base
                                ${canGoNext()
                                    ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:scale-105'
                                    : 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                                }
                            `}
                        >
                            <span>
                                {progress.step === (generationStep - 1)
                                    ? t('onboarding.generate', 'Generate Website')
                                    : t('onboarding.next', 'Next')
                                }
                            </span>
                            <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                    </div>
                )}
            </div>

            {/* Emergency Cancel Confirmation Dialog */}
            {showCancelConfirm && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowCancelConfirm(false)}
                    />
                    <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <AlertTriangle size={20} className="text-amber-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('onboarding.cancelGenerationTitle', 'Cancel Generation?')}
                            </h3>
                        </div>
                        <p className="text-muted-foreground text-sm mb-6">
                            {t('onboarding.cancelGenerationMessage', 'This will stop the website generation and reset the process. You will need to start over.')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-muted text-foreground font-medium rounded-xl hover:bg-accent transition-colors"
                            >
                                {t('common.cancel', 'Continue')}
                            </button>
                            <button
                                onClick={handleEmergencyCancel}
                                className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
                            >
                                {t('onboarding.startOver', 'Start Over')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingModal;
