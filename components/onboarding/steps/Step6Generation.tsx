/**
 * Step6Generation
 * Sixth step: Final generation with progress tracking
 */

import React, { useEffect, useState } from 'react';
import { Rocket, FileText, Image, Loader2, Check, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingProgress, GenerationProgress } from '../../../types/onboarding';
import ImageGenerationProgress from '../components/ImageGenerationProgress';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface Step6GenerationProps {
    progress: OnboardingProgress;
    onStartGeneration: () => Promise<void>;
    onReset?: () => void;
}

const Step6Generation: React.FC<Step6GenerationProps> = ({
    progress,
    onStartGeneration,
    onReset,
}) => {
    const { t } = useTranslation();
    const [hasStarted, setHasStarted] = useState(false);

    const generationProgress = progress.generationProgress;
    const phase = generationProgress?.phase || 'idle';

    // Auto-start generation when component mounts
    useEffect(() => {
        if (!hasStarted && phase === 'idle') {
            setHasStarted(true);
            onStartGeneration();
        }
    }, [hasStarted, phase, onStartGeneration]);

    const getPhaseStatus = (targetPhase: string) => {
        const phases = ['idle', 'content', 'images', 'finalizing', 'completed'];
        const currentIndex = phases.indexOf(phase);
        const targetIndex = phases.indexOf(targetPhase);

        if (phase === 'error') return 'error';
        if (currentIndex > targetIndex) return 'completed';
        if (currentIndex === targetIndex) return 'active';
        return 'pending';
    };

    const renderPhaseIndicator = (targetPhase: string, label: string, icon: React.ReactNode) => {
        const status = getPhaseStatus(targetPhase);

        return (
            <div className={`
                flex items-center gap-4 p-4 rounded-xl transition-all
                ${status === 'active' ? 'bg-primary/10 border border-primary/30' : ''}
                ${status === 'completed' ? 'bg-green-500/10 border border-green-500/30' : ''}
                ${status === 'pending' ? 'bg-card/50 border border-border' : ''}
                ${status === 'error' ? 'bg-destructive/10 border border-destructive/30' : ''}
            `}>
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${status === 'active' ? 'bg-primary/20' : ''}
                    ${status === 'completed' ? 'bg-green-500/20' : ''}
                    ${status === 'pending' ? 'bg-muted' : ''}
                    ${status === 'error' ? 'bg-destructive/20' : ''}
                `}>
                    {status === 'active' && <Loader2 size={20} className="text-primary animate-spin" />}
                    {status === 'completed' && <Check size={20} className="text-green-400" />}
                    {status === 'pending' && <div className="text-muted-foreground">{icon}</div>}
                    {status === 'error' && <AlertCircle size={20} className="text-destructive" />}
                </div>
                <div className="flex-1">
                    <p className={`
                        font-medium
                        ${status === 'active' ? 'text-primary' : ''}
                        ${status === 'completed' ? 'text-green-400' : ''}
                        ${status === 'pending' ? 'text-muted-foreground' : ''}
                        ${status === 'error' ? 'text-destructive' : ''}
                    `}>
                        {label}
                    </p>
                    {status === 'active' && targetPhase === 'content' && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('onboarding.generatingContent', 'Creating personalized content for your website...')}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // Completed state
    if (phase === 'completed') {
        return (
            <div className="max-w-xl mx-auto text-center space-y-8">
                <div className="relative">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-bounce">
                        <Check size={48} className="text-white" />
                    </div>
                    <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-green-400/30 animate-ping" />
                </div>

                <div>
                    <h3 className="text-3xl font-bold text-foreground mb-3">
                        {t('onboarding.websiteReady', 'Your Website is Ready!')} 🎉
                    </h3>
                    <p className="text-muted-foreground">
                        {t('onboarding.websiteReadyDescription', 'Your website has been generated successfully. You can now customize it in the editor.')}
                    </p>
                </div>

                <div className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles size={24} className="text-green-400" />
                        <span className="text-lg font-semibold text-foreground">
                            {progress.businessName}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('onboarding.redirectingToEditor', 'Redirecting to editor...')}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (phase === 'error') {
        return (
            <div className="max-w-xl mx-auto text-center space-y-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertCircle size={40} className="text-destructive" />
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                        {t('onboarding.generationError', 'Something went wrong')}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        {generationProgress?.error || t('onboarding.tryAgain', 'Please try again.')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => {
                                setHasStarted(false);
                            }}
                            className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:shadow-lg transition-all"
                        >
                            {t('onboarding.retryGeneration', 'Try Again')}
                        </button>
                        {onReset && (
                            <button
                                onClick={onReset}
                                className="px-6 py-3 bg-muted text-muted-foreground font-medium rounded-xl hover:bg-accent transition-all"
                            >
                                {t('onboarding.startOver', 'Start Over')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Generation in progress
    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header with animated logo */}
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-orange-500 to-pink-500 animate-spin-slow opacity-50 blur-xl" />
                    <div className="relative w-24 h-24 rounded-full bg-card border-2 border-border flex items-center justify-center">
                        <img 
                            src={QUIMERA_LOGO} 
                            alt="Quimera" 
                            className="w-16 h-16 object-contain animate-pulse"
                        />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.generatingWebsite', 'Generating Your Website')}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.pleaseWait', 'This may take a few minutes. Please wait...')}
                </p>
            </div>

            {/* Summary of what's being generated */}
            <div className="p-4 bg-card border border-border rounded-xl">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">{t('onboarding.business', 'Business')}:</span>
                        <p className="font-medium text-foreground">{progress.businessName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('onboarding.template', 'Template')}:</span>
                        <p className="font-medium text-foreground">{progress.selectedTemplateName}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('onboarding.industry', 'Industry')}:</span>
                        <p className="font-medium text-foreground capitalize">
                            {progress.industry.replace(/-/g, ' ')}
                        </p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">{t('onboarding.components', 'Components')}:</span>
                        <p className="font-medium text-foreground">
                            {progress.enabledComponents?.length || 0} {t('onboarding.active', 'active')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Phases */}
            <div className="space-y-3">
                {renderPhaseIndicator(
                    'content',
                    t('onboarding.phaseContent', 'Generating Content'),
                    <FileText size={20} />
                )}

                {/* Image Generation with detailed progress */}
                {phase === 'images' && generationProgress ? (
                    <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                        <ImageGenerationProgress progress={generationProgress} />
                    </div>
                ) : (
                    renderPhaseIndicator(
                        'images',
                        t('onboarding.phaseImages', 'Generating Images'),
                        <Image size={20} />
                    )
                )}

                {renderPhaseIndicator(
                    'finalizing',
                    t('onboarding.phaseFinalizing', 'Creating Website'),
                    <Rocket size={20} />
                )}
            </div>

            {/* Tip while waiting */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.generationTip', 'Our AI is analyzing your business and generating personalized content. Each image is created specifically for your brand.')}
                </p>
            </div>
        </div>
    );
};

export default Step6Generation;

