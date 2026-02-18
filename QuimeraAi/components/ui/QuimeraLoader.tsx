/**
 * QuimeraLoader Component
 * Unified loading animation using the Quimera app icon.
 * Replaces all generic CSS spinners across the app for consistent branding.
 */

import React from 'react';

interface QuimeraLoaderProps {
    /** Size of the loader */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to center in full screen */
    fullScreen?: boolean;
    /** Optional loading text */
    text?: string;
    /** Optional className for the wrapper */
    className?: string;
}

const sizeMap = {
    sm: { logo: 'w-8 h-8', container: 'w-10 h-10', halo1: 'w-14 h-14', halo2: 'w-12 h-12', halo3: 'w-18 h-18', border: 'border', logoSize: 32, containerPx: 40 },
    md: { logo: 'w-12 h-12', container: 'w-16 h-16', halo1: 'w-24 h-24', halo2: 'w-20 h-20', halo3: 'w-28 h-28', border: 'border-2', logoSize: 48, containerPx: 64 },
    lg: { logo: 'w-14 h-14', container: 'w-20 h-20', halo1: 'w-32 h-32', halo2: 'w-24 h-24', halo3: 'w-40 h-40', border: 'border-2', logoSize: 56, containerPx: 80 },
};

const QuimeraLoader: React.FC<QuimeraLoaderProps> = ({
    size = 'md',
    fullScreen = false,
    text,
    className = '',
}) => {
    const s = sizeMap[size];

    const loader = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                {/* Pulsing halos */}
                <div
                    className={`absolute ${s.halo1} rounded-full bg-yellow-400/20 animate-ping`}
                    style={{ animationDuration: '2s' }}
                />
                <div
                    className={`absolute ${s.halo2} rounded-full bg-yellow-400/30 animate-ping`}
                    style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}
                />

                {/* Logo container with glow */}
                <div className={`relative z-10 ${s.container} rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center ${s.border} border-yellow-400/30`}>
                    <img
                        src="https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032"
                        alt="Loading..."
                        className={`${s.logo} object-contain animate-pulse`}
                        style={{ animationDuration: '1.5s' }}
                        width={s.logoSize}
                        height={s.logoSize}
                        loading="eager"
                        decoding="sync"
                        fetchPriority="high"
                    />
                </div>
            </div>

            {text && (
                <p className="text-editor-text-secondary text-sm animate-pulse">{text}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-editor-bg flex items-center justify-center">
                {loader}
            </div>
        );
    }

    return loader;
};

export default QuimeraLoader;
