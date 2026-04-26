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
    sm: { logo: 'w-8 h-8', glow: 'w-14 h-14', logoSize: 32 },
    md: { logo: 'w-12 h-12', glow: 'w-24 h-24', logoSize: 48 },
    lg: { logo: 'w-14 h-14', glow: 'w-32 h-32', logoSize: 56 },
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
                <div className={`absolute ${s.glow} rounded-full bg-gradient-to-br from-yellow-300/25 via-amber-400/10 to-fuchsia-500/15 blur-2xl animate-pulse`} />
                <img
                    src={effectiveLogo}
                    alt="Loading..."
                    className={`relative z-10 ${s.logo} object-contain animate-pulse drop-shadow-[0_0_22px_rgba(250,204,21,0.28)] ${isCustomLogo ? 'rounded-full' : ''}`}
                    style={{ animationDuration: '1.5s' }}
                    width={s.logoSize}
                    height={s.logoSize}
                    loading="eager"
                    decoding="sync"
                    fetchPriority="high"
                />
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
