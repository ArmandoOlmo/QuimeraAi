import React from 'react';
import { Image as ImageIcon, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MediaGeneratorMode } from '../../../types/videoGeneration';

interface MediaModeToggleProps {
    mode: MediaGeneratorMode;
    onChange: (mode: MediaGeneratorMode) => void;
    allowedModes?: MediaGeneratorMode[];
    className?: string;
}

const MediaModeToggle: React.FC<MediaModeToggleProps> = ({
    mode,
    onChange,
    allowedModes = ['image', 'video'],
    className = '',
}) => {
    const { t } = useTranslation();

    if (allowedModes.length <= 1) return null;

    return (
        <div className={`inline-flex rounded-xl border border-q-border/60 bg-q-surface-overlay/40 p-0.5 ${className}`}>
            {allowedModes.includes('image') && (
                <button
                    type="button"
                    onClick={() => onChange('image')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'image'
                            ? 'bg-q-accent text-q-text-on-accent'
                            : 'text-q-text-secondary hover:text-q-text'
                    }`}
                >
                    <ImageIcon size={14} />
                    {t('mediaGeneration.modeImage', { defaultValue: 'Image' })}
                </button>
            )}
            {allowedModes.includes('video') && (
                <button
                    type="button"
                    onClick={() => onChange('video')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mode === 'video'
                            ? 'bg-q-accent text-q-text-on-accent'
                            : 'text-q-text-secondary hover:text-q-text'
                    }`}
                >
                    <Video size={14} />
                    {t('mediaGeneration.modeVideo', { defaultValue: 'Video' })}
                </button>
            )}
        </div>
    );
};

export default MediaModeToggle;
