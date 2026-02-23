/**
 * QuimeraLoader Component
 * Unified loading animation.
 * Accepts optional logoUrl prop for agency branding.
 * Falls back to Quimera logo when no prop is provided.
 * NO HOOKS — this component is pure props-based to avoid React error #310.
 */

import React from 'react';

const QUIMERA_LOGO = "https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032";

interface QuimeraLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    text?: string;
    className?: string;
    /** Optional logo URL for agency branding. Falls back to Quimera logo. */
    logoUrl?: string;
}

const sizeMap = {
    sm: { logo: 'w-8 h-8', container: 'w-10 h-10', halo1: 'w-14 h-14', halo2: 'w-12 h-12', border: 'border', logoSize: 32 },
    md: { logo: 'w-12 h-12', container: 'w-16 h-16', halo1: 'w-24 h-24', halo2: 'w-20 h-20', border: 'border-2', logoSize: 48 },
    lg: { logo: 'w-14 h-14', container: 'w-20 h-20', halo1: 'w-32 h-32', halo2: 'w-24 h-24', border: 'border-2', logoSize: 56 },
};

const QuimeraLoader: React.FC<QuimeraLoaderProps> = ({
    size = 'md',
    fullScreen = false,
    text,
    className = '',
    logoUrl,
}) => {
    const s = sizeMap[size];
    const effectiveLogo = logoUrl || QUIMERA_LOGO;
    const isCustomLogo = !!logoUrl;

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

                {/* Logo container */}
                <div className={`relative z-10 ${s.container} rounded-full bg-editor-panel-bg shadow-2xl flex items-center justify-center ${s.border} border-yellow-400/30`}>
                    <img
                        src={effectiveLogo}
                        alt="Loading..."
                        className={`${s.logo} object-contain animate-pulse ${isCustomLogo ? 'rounded-full' : ''}`}
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
