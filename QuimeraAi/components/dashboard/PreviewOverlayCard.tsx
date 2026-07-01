import React from 'react';
import ProjectThumbnailFallback from './ProjectThumbnailFallback';

interface PreviewOverlayCardProps {
    thumbnailUrl?: string | null;
    title: React.ReactNode;
    titleText?: string;
    imageAlt?: string;
    description?: React.ReactNode;
    metadata?: React.ReactNode;
    footer?: React.ReactNode;
    badge?: React.ReactNode;
    topLeft?: React.ReactNode;
    topRight?: React.ReactNode;
    action?: React.ReactNode;
    cornerAction?: React.ReactNode;
    fallback?: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
    className?: string;
    mediaClassName?: string;
    fallbackLogoClassName?: string;
    isSelected?: boolean;
}

const PreviewOverlayCard: React.FC<PreviewOverlayCardProps> = ({
    thumbnailUrl,
    title,
    titleText,
    imageAlt,
    description,
    metadata,
    footer,
    badge,
    topLeft,
    topRight,
    action,
    cornerAction,
    fallback,
    onClick,
    ariaLabel,
    className = '',
    mediaClassName = 'aspect-[4/3]',
    fallbackLogoClassName = 'h-10 w-10',
    isSelected = false,
}) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            aria-label={ariaLabel}
            className={[
                'group relative overflow-hidden rounded-2xl border border-q-border/60 bg-q-surface/80 text-left',
                'transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-q-accent/35',
                onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-q-border hover:shadow-[var(--shadow-card-hover)]' : '',
                isSelected ? 'border-q-accent ring-2 ring-q-accent/35' : '',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div className={`relative w-full overflow-hidden bg-q-surface-overlay ${mediaClassName}`}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={imageAlt || titleText || ''}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        loading="lazy"
                    />
                ) : fallback ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {fallback}
                    </div>
                ) : (
                    <ProjectThumbnailFallback logoClassName={fallbackLogoClassName} />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/15" aria-hidden="true" />

                {(topLeft || topRight || badge) && (
                    <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">{topLeft}</div>
                        <div className="ml-auto flex min-w-0 items-center gap-2">{topRight || badge}</div>
                    </div>
                )}

                <div className={`absolute inset-x-0 bottom-0 z-20 p-4 text-white sm:p-5 ${cornerAction ? 'pr-16 sm:pr-16' : ''}`}>
                    <div className="min-w-0">
                        <h3 className="line-clamp-2 text-base font-bold leading-tight text-white sm:text-lg" title={titleText}>
                            {title}
                        </h3>
                        {description && (
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/80">
                                {description}
                            </div>
                        )}
                        {metadata && (
                            <div className="mt-2 text-xs font-medium text-white/80">
                                {metadata}
                            </div>
                        )}
                        {footer && (
                            <div className="mt-3">
                                {footer}
                            </div>
                        )}
                        {action && (
                            <div className="mt-3">
                                {action}
                            </div>
                        )}
                    </div>
                </div>

                {cornerAction && (
                    <div className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-q-accent text-q-text-on-accent shadow-lg shadow-q-accent/25 backdrop-blur-sm transition-transform group-hover:scale-105 sm:bottom-5 sm:right-5">
                        {cornerAction}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewOverlayCard;
