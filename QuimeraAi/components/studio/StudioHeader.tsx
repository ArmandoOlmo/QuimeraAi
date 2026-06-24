import React from 'react';

interface StudioHeaderProps {
    title: string;
    subtitle?: string;
    isVoiceActive?: boolean;
    actions?: React.ReactNode;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({ title, subtitle, isVoiceActive, actions }) => (
    <div className="flex items-center justify-between border-b border-q-border/70 bg-q-bg/85 px-3 py-2.5 backdrop-blur-xl lg:px-5 lg:py-3">
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            <div className="relative flex-shrink-0">
                <img src="/logos/quimera-icon.svg" alt="Quimera" className="h-7 w-7 lg:h-8 lg:w-8" />
                {isVoiceActive && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-q-bg bg-q-success lg:h-3 lg:w-3" />
                )}
            </div>
            <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 truncate text-sm font-bold text-q-text lg:gap-2 lg:text-lg">
                    <span className="truncate">{title}</span>
                </h2>
                {subtitle && <p className="hidden text-[10px] text-q-text-secondary sm:block lg:text-xs">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-1 lg:gap-2">{actions}</div>}
    </div>
);

export default StudioHeader;
