/**
 * CollectionBanner Component
 * Banner for showcasing collections/categories
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CollectionBannerData } from '../../../types/components';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import {
    getStorefrontContentPositionClass,
    getStorefrontOverlayBackground,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface CollectionBannerProps {
    data: CollectionBannerData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
    onCollectionClick?: (collectionId: string) => void;
    onNavigate?: (href: string) => void;
}

const CollectionBanner: React.FC<CollectionBannerProps> = ({
    data,
    storeId,
    globalColors,
    onCollectionClick,
    onNavigate,
}) => {
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'lg');

    const getHeadlineSize = () => {
        const map = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl' };
        return map[data.headlineFontSize || 'xl'] || 'text-5xl';
    };

    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };

    const getButtonRadius = () => getStorefrontRadiusClass(data.buttonBorderRadius, 'xl');
    const getSectionRadius = () => getStorefrontRadiusClass(data.borderRadius || data.buttonBorderRadius, 'xl');
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'center');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'center');
    const getOverlayStyle = () => getStorefrontOverlayBackground(data.overlayStyle, colors?.overlayColor, data.overlayOpacity);

    const handleButtonClick = () => {
        if (data.buttonUrl) {
            if (onNavigate) {
                onNavigate(data.buttonUrl);
            } else {
                window.location.href = data.buttonUrl;
            }
        } else if (data.collectionId) {
            onCollectionClick?.(data.collectionId);
        }
    };

    // Hero variant - full width with big text
    const renderHero = () => (
        <div
            className={`relative overflow-hidden ${getSectionRadius()}`}
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                height: `${data.height || 400}px`,
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
                            className={`inline-flex items-center gap-2 px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
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
            className={`relative overflow-hidden ${getSectionRadius()}`}
                style={{
                    ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                    height: `${data.height || 400}px`,
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
                            className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
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
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
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
                    className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
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
            className={`relative overflow-hidden ${getSectionRadius()}`}
            style={{
                ...getStorefrontSectionBackgroundStyle(data, colors?.background),
                height: `${data.height || 400}px`,
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
            <div className="absolute inset-0" style={{ background: getOverlayStyle() }} />

            {/* Content Card */}
            <div className={`relative h-full ${getPaddingX()} ${getPaddingY()} flex items-center ${getContentPosition()}`}>
                <div
                    className={`max-w-lg p-8 ${getSectionRadius()} backdrop-blur-md ${getTextAlignment()} flex flex-col`}
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
                            className={`inline-flex items-center gap-2 w-fit px-6 py-3 ${getButtonRadius()} font-semibold transition-all hover:opacity-90 hover:gap-3`}
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







