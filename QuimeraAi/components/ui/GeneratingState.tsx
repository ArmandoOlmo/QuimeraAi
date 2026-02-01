import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageGenerationProgress } from '../../types/business';
import { Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface GeneratingStateProps {
    statusText: string;
    phase?: 'content' | 'images';
    imageProgress?: ImageGenerationProgress;
}

const GeneratingState: React.FC<GeneratingStateProps> = ({
    statusText,
    phase = 'content',
    imageProgress
}) => {
    const { t } = useTranslation();

    // Content generation phase (original behavior)
    if (phase === 'content') {
        return (
            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center h-full">
                {/* Animated Quimera Logo */}
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse"></div>
                    <img
                        src={QUIMERA_LOGO}
                        alt="Quimera AI"
                        className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse"
                    />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">AI is Building Your Website...</h2>
                <p className="text-editor-text-secondary max-w-sm">This may take a moment. Please don't close this window.</p>
                <div className="mt-6 bg-editor-panel-bg px-4 py-2 rounded-lg w-full max-w-md">
                    <p className="text-editor-text-primary animate-pulse">{statusText}</p>
                </div>
            </div>
        );
    }

    // Image generation phase
    const progress = imageProgress || { current: 0, total: 0, currentSection: '', completedImages: [], failedPaths: [] };
    const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    const estimatedSecondsPerImage = 8;
    const remainingImages = progress.total - progress.current;
    const estimatedTimeRemaining = remainingImages * estimatedSecondsPerImage;
    const estimatedMinutes = Math.floor(estimatedTimeRemaining / 60);
    const estimatedSeconds = estimatedTimeRemaining % 60;

    return (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center h-full">
            {/* Header */}
            <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mb-6">
                <ImageIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
                {t('imageGeneration.generatingImages')}
            </h2>
            <p className="text-editor-text-secondary max-w-sm mb-6">
                {t('imageGeneration.generatingImagesDesc')}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">
                        {t('imageGeneration.imageOf', { current: progress.current, total: progress.total })}
                    </span>
                    <span className="text-sm font-bold text-yellow-400">{progressPercentage}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Current Section */}
            {progress.currentSection && (
                <div className="bg-editor-panel-bg px-4 py-2 rounded-lg mb-6">
                    <p className="text-editor-text-primary animate-pulse flex items-center gap-2">
                        <img src={QUIMERA_LOGO} alt="Loading..." className="w-4 h-4 object-contain animate-pulse" />
                        {t('imageGeneration.generatingSection', { section: progress.currentSection })}
                    </p>
                </div>
            )}

            {/* Estimated Time */}
            {remainingImages > 0 && (
                <p className="text-xs text-gray-500 mb-6">
                    {t('imageGeneration.estimatedTime')} {estimatedMinutes > 0 && `${estimatedMinutes} ${t('imageGeneration.minutes')} `}
                    {estimatedSeconds} {t('imageGeneration.seconds')}
                </p>
            )}

            {/* Thumbnail Grid */}
            {progress.completedImages.length > 0 && (
                <div className="w-full max-w-md">
                    <p className="text-xs text-gray-500 mb-3">
                        {progress.completedImages.length} {t('imageGeneration.imagesGenerated')}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                        {progress.completedImages.slice(-8).map((url, index) => (
                            <div
                                key={index}
                                className="aspect-square rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10"
                            >
                                <img
                                    src={url}
                                    alt={`Generated ${index + 1}`}
                                    className="w-full h-full object-cover animate-fade-in"
                                />
                            </div>
                        ))}
                        {/* Placeholder for current generating */}
                        {progress.current < progress.total && (
                            <div className="aspect-square rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                                <img src={QUIMERA_LOGO} alt="Generating..." className="w-6 h-6 object-contain animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Failed Images Warning */}
            {progress.failedPaths.length > 0 && (
                <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-3 max-w-md">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="text-left">
                            <p className="text-sm text-orange-400 font-medium">
                                {t('imageGeneration.failed')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {t('imageGeneration.failedDesc')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion State */}
            {progress.current === progress.total && progress.total > 0 && (
                <div className="mt-4 flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">All images generated!</span>
                </div>
            )}
        </div>
    );
};

export default GeneratingState;
