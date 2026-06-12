/**
 * CollectionBanner Component
 * Banner for showcasing collections/categories
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CollectionBannerData } from '../../../types/components';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';

interface CollectionBannerProps {
    data: CollectionBannerData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onCollectionClick?: (collectionId: string) => void;
}

const CollectionBanner: React.FC<CollectionBannerProps> = ({
    data,
    storeId,
    globalColors,
    onCollectionClick,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);

    // Style helpers
    const getPaddingY = () => {
        const map = { sm: 'py-8', md: 'py-12', lg: 'py-16' };
        return map[data.paddingY] || 'py-12';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getHeadlineSize = () => {
        const map = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' };
        return map[data.headlineFontSize || 'xl'] || 'text-5xl';
    };

    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.buttonBorderRadius || 'xl'] || 'rounded-xl';
    };

    const getTextAlignment = () => {
        const map = {
            left: 'text-left items-start',
            center: 'text-center items-center',
            right: 'text-right items-end',
        };
        return map[data.textAlignment] || 'text-center items-center';
    };

    const getContentPosition = () => {
        const map = {
            left: 'justify-start',
            center: 'justify-center',
            right: 'justify-end',
        };
        return map[data.contentPosition] || 'justify-center';
    };

    const getOverlayStyle = () => {
        if (data.overlayStyle === 'none') return 'transparent';
        if (data.overlayStyle === 'solid') {
            const opacity = Math.round((data.overlayOpacity / 100) * 255).toString(16).padStart(2, '0');
            return `${colors?.overlayColor}${opacity}`;
        }
        // Gradient
        const opacity = data.overlayOpacity / 100;
        const opacityHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
        return `linear-gradient(to bottom, ${colors?.overlayColor}${opacityHex}, ${colors?.overlayColor}${Math.round(opacity * 0.3 * 255).toString(16).padStart(2, '0')})`;
    };

    const handleButtonClick = () => {
        if (data.buttonUrl) {
            window.location.href = data.buttonUrl;
        } else if (data.collectionId) {
            onCollectionClick?.(data.collectionId);
        }
    };

    // Hero variant - full width with big text
    const renderHero = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 400}px`,
                backgroundColor: colors?.background,
            }}
        >
            {/* Background Image */}
            {data.backgroundImageUrl && (
                <img
                    src={data.backgroundImageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Overlay */}
            {data.overlayStyle !== 'none' && (
                <div
                    className="absolute inset-0"
                    style={{ background: getOverlayStyle() }}
                />
            )}

            {/* Content */}
            <div className={`relative h-full ${getPaddingX()} ${getPaddingY()} flex ${getContentPosition()}`}>
                <div className={`max-w-3xl flex flex-col ${getTextAlignment()}`}>
                    <h2
                        className={`${getHeadlineSize()} font-bold mb-4`}
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h2>
                    {data.description && (
                        <p
                            className={`${getDescriptionSize()} mb-6 max-w-xl`}
                            style={{ color: colors?.text }}
                        >
                            {data.description}
                        </p>
                    )}
                    {data.showButton && data.buttonText && (
                        <button
                            onClick={handleButtonClick}
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground,
                                color: colors?.buttonText,
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // Split variant - image on one side, content on other
    const renderSplit = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 400}px`,
                backgroundColor: colors?.background,
            }}
        >
            <div className="h-full grid grid-cols-1 lg:grid-cols-2">
                {/* Content Side */}
                <div className={`flex flex-col justify-center ${getPaddingX()} ${getPaddingY()} ${getTextAlignment()}`}>
                    <h2
                        className={`${getHeadlineSize()} font-bold mb-4`}
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h2>
                    {data.description && (
                        <p
                            className={`${getDescriptionSize()} mb-6`}
                            style={{ color: colors?.text }}
                        >
                            {data.description}
                        </p>
                    )}
                    {data.showButton && data.buttonText && (
                        <button
                            onClick={handleButtonClick}
                            className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground,
                                color: colors?.buttonText,
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>

                {/* Image Side */}
                <div className="relative hidden lg:block">
                    {data.backgroundImageUrl && (
                        <img
                            src={data.backgroundImageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}
                </div>
            </div>
        </div>
    );

    // Minimal variant - simple text with subtle background
    const renderMinimal = () => (
        <div
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={{ backgroundColor: colors?.background }}
        >
            <div className={`max-w-4xl mx-auto flex flex-col ${getTextAlignment()}`}>
                <h2
                    className={`${getHeadlineSize()} font-bold mb-3`}
                    style={{ color: colors?.heading }}
                >
                    {data.title}
                </h2>
                {data.description && (
                    <p
                        className={`${getDescriptionSize()} mb-6`}
                        style={{ color: colors?.text }}
                    >
                        {data.description}
                    </p>
                )}
                {data.showButton && data.buttonText && (
                    <button
                        onClick={handleButtonClick}
                        className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                        style={{
                            backgroundColor: colors?.buttonBackground,
                            color: colors?.buttonText,
                        }}
                    >
                        {data.buttonText}
                        <ArrowRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );

    // Overlay variant - image with text overlay card
    const renderOverlay = () => (
        <div
            className="relative overflow-hidden"
            style={{
                height: `${data.height || 400}px`,
                backgroundColor: colors?.background,
            }}
        >
            {/* Background Image */}
            {data.backgroundImageUrl && (
                <img
                    src={data.backgroundImageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Content Card */}
            <div className={`relative h-full ${getPaddingX()} ${getPaddingY()} flex items-center ${getContentPosition()}`}>
                <div
                    className={`max-w-lg p-8 rounded-2xl backdrop-blur-md ${getTextAlignment()} flex flex-col`}
                    style={{
                        backgroundColor: `${colors?.overlayColor}cc`,
                    }}
                >
                    <h2
                        className={`${getHeadlineSize()} font-bold mb-3`}
                        style={{ color: colors?.heading }}
                    >
                        {data.title}
                    </h2>
                    {data.description && (
                        <p
                            className={`${getDescriptionSize()} mb-6`}
                            style={{ color: colors?.text }}
                        >
                            {data.description}
                        </p>
                    )}
                    {data.showButton && data.buttonText && (
                        <button
                            onClick={handleButtonClick}
                            className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getBorderRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
                            style={{
                                backgroundColor: colors?.buttonBackground,
                                color: colors?.buttonText,
                            }}
                        >
                            {data.buttonText}
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {data.variant === 'hero' && renderHero()}
            {data.variant === 'split' && renderSplit()}
            {data.variant === 'minimal' && renderMinimal()}
            {data.variant === 'overlay' && renderOverlay()}
        </>
    );
};

export default CollectionBanner;










