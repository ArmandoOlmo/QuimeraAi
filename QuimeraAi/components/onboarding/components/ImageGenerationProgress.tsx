/**
 * ImageGenerationProgress
 * Shows progress of image generation with time estimates
 */

import React, { useMemo } from 'react';
import { Image, Check, X, Loader2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GenerationProgress, ImageGenerationItem } from '../../../types/onboarding';
import ProgressBar3D from '../../ui/ProgressBar3D';

interface ImageGenerationProgressProps {
    progress: GenerationProgress;
}

const ImageGenerationProgress: React.FC<ImageGenerationProgressProps> = ({ progress }) => {
    const { t } = useTranslation();

    const estimatedTimeRemaining = useMemo(() => {
        const remaining = progress.imagesTotal - progress.imagesCompleted;
        const avgTimePerImage = 15; // seconds
        const totalSeconds = remaining * avgTimePerImage;

        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        } else {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}m ${seconds}s`;
        }
    }, [progress.imagesTotal, progress.imagesCompleted]);

    const percentage = progress.imagesTotal > 0
        ? Math.round((progress.imagesCompleted / progress.imagesTotal) * 100)
        : 0;

    const getStatusIcon = (status: ImageGenerationItem['status']) => {
        switch (status) {
            case 'completed':
                return <Check size={14} className="text-green-400" />;
            case 'failed':
                return <X size={14} className="text-red-400" />;
            case 'generating':
                return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
            default:
                return <div className="w-3.5 h-3.5 rounded-full bg-editor-sidebar-hover" />;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with progress */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image size={20} className="text-purple-400" />
                    <span className="font-medium text-editor-text-primary">
                        {t('onboarding.generatingImages', 'Generating Images')}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-editor-text-secondary">
                    <Clock size={14} />
                    <span>{estimatedTimeRemaining}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-editor-text-secondary">
                        {t('onboarding.imageProgress', {
                            current: progress.imagesCompleted,
                            total: progress.imagesTotal,
                            defaultValue: `Image ${progress.imagesCompleted} of ${progress.imagesTotal}`,
                        })}
                    </span>
                    <span className="text-editor-text-primary font-medium">{percentage}%</span>
                </div>
                <ProgressBar3D
                    percentage={percentage}
                    gradient={{ from: '#a855f7', to: '#fb923c' }}
                    size="lg"
                />
            </div>

            {/* Current image being generated */}
            {progress.currentImage && progress.currentImage.status === 'generating' && (
                <div className="p-3 bg-editor-sidebar-hover/50 rounded-xl border border-editor-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Loader2 size={16} className="text-yellow-400 animate-spin" />
                        <span className="text-sm font-medium text-editor-text-primary">
                            {t('onboarding.currentlyGenerating', 'Currently generating...')}
                        </span>
                    </div>
                    <p className="text-xs text-editor-text-secondary line-clamp-2">
                        {progress.currentImage.prompt}
                    </p>
                </div>
            )}

            {/* Image list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.allImages.map((img, index) => (
                    <div
                        key={img.id}
                        className={`
                            flex items-center gap-3 p-2 rounded-lg transition-all
                            ${img.status === 'generating' ? 'bg-yellow-500/10 border border-yellow-500/30' : ''}
                            ${img.status === 'completed' ? 'bg-green-500/10' : ''}
                            ${img.status === 'failed' ? 'bg-red-500/10' : ''}
                        `}
                    >
                        <div className="flex-shrink-0">
                            {getStatusIcon(img.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-editor-text-secondary truncate">
                                {img.promptKey}
                            </p>
                        </div>
                        {img.status === 'completed' && img.imageUrl && (
                            <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden">
                                <img
                                    src={img.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageGenerationProgress;
















