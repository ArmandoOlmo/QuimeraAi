import React, { useId } from 'react';
import { isPendingImage } from '../../utils/imagePlaceholders';

interface SectionBackgroundProps {
    /** The background image URL set from the editor */
    backgroundImageUrl?: string;
    /** Overlay opacity (0-100). Defaults to 60 for readability */
    backgroundOverlayOpacity?: number;
    /** The section's background color (used as overlay base) */
    backgroundColor?: string;
    /** Children (the actual section component) */
    children: React.ReactNode;
}

/**
 * Wrapper component that adds a background image layer behind any section.
 * If no backgroundImageUrl is set, it renders children as-is (zero overhead).
 * When a background image is present, it renders:
 * 1. An absolutely-positioned background image covering the section
 * 2. A color overlay for text readability
 * 3. Children with transparent background so the image shows through
 *
 * KEY: Forces child <section> elements to have transparent backgrounds
 * via a scoped CSS rule, since section components set their own opaque
 * backgroundColor which would otherwise cover the background image.
 */
const SectionBackground: React.FC<SectionBackgroundProps> = ({
    backgroundImageUrl,
    backgroundOverlayOpacity = 60,
    backgroundColor,
    children,
}) => {
    const hasValidImage = backgroundImageUrl && !isPendingImage(backgroundImageUrl);
    const scopeId = useId().replace(/:/g, '');

    // No background image → render children directly with zero overhead
    if (!hasValidImage) return <>{children}</>;

    return (
        <div className="relative overflow-hidden" data-bg-scope={scopeId}>
            {/*
              Force child <section> (and any immediate wrapper div) to have
              transparent backgrounds so the image shows through.
              Uses a scoped attribute selector to avoid collisions.
            */}
            <style>{`
                [data-bg-scope="${scopeId}"] > .relative > section,
                [data-bg-scope="${scopeId}"] > .relative > div > section {
                    background-color: transparent !important;
                }
            `}</style>
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${backgroundImageUrl})`,
                    zIndex: 0,
                }}
            />
            {/* Color Overlay for readability */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: backgroundColor || '#000000',
                    opacity: backgroundOverlayOpacity / 100,
                    zIndex: 1,
                }}
            />
            {/* Content with z-10 stacking */}
            <div className="relative" style={{ zIndex: 2 }}>
                {children}
            </div>
        </div>
    );
};

export default SectionBackground;
