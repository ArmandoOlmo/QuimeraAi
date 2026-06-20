/**
 * ProductReviews Component
 * Displays customer reviews and ratings
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, CheckCircle, ThumbsUp, ChevronDown } from 'lucide-react';
import { ProductReviewsData, ProductReviewItem } from '../../../types/components';
import { resolveI18nField } from '../../../utils/i18nContent';
import { useSafeProject } from '../../../contexts/project';
import { StorefrontGlobalColors, useUnifiedStorefrontColors } from '../hooks/useUnifiedStorefrontColors';
import AppSelect from '../../ui/AppSelect';
import {
    getStorefrontCardGapClass,
    getStorefrontColorWithOpacity,
    getStorefrontColumnsClass,
    getStorefrontContentPositionClass,
    getStorefrontPaddingXClass,
    getStorefrontPaddingYClass,
    getStorefrontRadiusClass,
    getStorefrontSectionBackgroundStyle,
    getStorefrontTextAlignmentClass,
} from './sectionVisualStyles';

interface ProductReviewsProps {
    data: ProductReviewsData;
    storeId?: string;
    globalColors?: StorefrontGlobalColors;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ data, storeId, globalColors }) => {
    const { i18n } = useTranslation();
    const projectContext = useSafeProject();
    const effectiveStoreId = storeId || projectContext?.activeProjectId || '';
    const colors = useUnifiedStorefrontColors(effectiveStoreId, data.colors, globalColors);
    const [sortBy, setSortBy] = useState(data.sortBy || 'newest');
    const [showAll, setShowAll] = useState(false);
    const text = React.useCallback((value: any) => resolveI18nField(value, i18n.language), [i18n.language]);
    const title = text(data.title as any);
    const description = text(data.description as any);

    // Default reviews if none provided
    const defaultReviews: ProductReviewItem[] = [
        {
            id: '1',
            authorName: 'María García',
            rating: 5,
            title: 'Excelente producto',
            content: 'Superó mis expectativas. La calidad es increíble y el envío fue muy rápido.',
            date: new Date().toISOString(),
            verified: true,
            helpful: 12,
        },
        {
            id: '2',
            authorName: 'Carlos López',
            rating: 4,
            title: 'Muy bueno',
            content: 'Buen producto, cumple con lo prometido. Solo le doy 4 estrellas porque tardó un poco en llegar.',
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            verified: true,
            helpful: 8,
        },
        {
            id: '3',
            authorName: 'Ana Martínez',
            rating: 5,
            title: 'Lo recomiendo',
            content: 'Ya es la segunda vez que compro y sigo igual de satisfecha. Muy recomendado.',
            date: new Date(Date.now() - 86400000 * 5).toISOString(),
            verified: false,
            helpful: 5,
        },
    ];

    const reviews = data.reviews?.length > 0 ? data.reviews : defaultReviews;

    // Sort reviews
    const sortedReviews = React.useMemo(() => {
        const sorted = [...reviews];
        switch (sortBy) {
            case 'highest':
                sorted.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                sorted.sort((a, b) => a.rating - b.rating);
                break;
            case 'helpful':
                sorted.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return sorted;
    }, [reviews, sortBy]);

    const displayedReviews = showAll ? sortedReviews : sortedReviews.slice(0, data.maxReviews || 6);

    // Calculate average rating
    const averageRating = data.averageRating || 
        (reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0);
    const totalReviews = data.totalReviews || reviews.length;

    // Rating distribution
    const ratingDistribution = React.useMemo(() => {
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
            if (dist[rating] !== undefined) dist[rating]++;
        });
        return dist;
    }, [reviews]);

    // Style helpers
    const getPaddingY = () => getStorefrontPaddingYClass(data.paddingY, 'lg');
    const getPaddingX = () => getStorefrontPaddingXClass(data.paddingX, 'md');
    const getCardGap = () => getStorefrontCardGapClass(data.cardGap, 'md');
    const getGridCols = () => getStorefrontColumnsClass(data.columns, 3);

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };
    const getDescriptionSize = () => {
        const map = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
        return map[data.descriptionFontSize || 'md'] || 'text-base';
    };

    const getBorderRadius = () => getStorefrontRadiusClass(data.borderRadius, 'xl');
    const getTextAlignment = () => getStorefrontTextAlignmentClass(data.textAlignment, 'left');
    const getContentPosition = () => getStorefrontContentPositionClass(data.contentPosition, 'left');
    const getCardSurfaceStyle = (featured = false): React.CSSProperties => ({
        backgroundColor: getStorefrontColorWithOpacity(colors?.cardBackground, data.glassEffect ? 0.78 : 1, colors?.cardBackground || '#ffffff'),
        border: `1px solid ${getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.72, 'rgba(15,23,42,0.12)')}`,
        boxShadow: featured ? '0 24px 70px rgba(15,23,42,0.18)' : '0 14px 38px rgba(15,23,42,0.08)',
    });

    // Stars component
    const Stars = ({ rating, size = 16 }: { rating: number; size?: number }) => (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={size}
                    style={{ color: i < Math.round(rating) ? colors?.starColor : (colors?.borderColor || '#d1d5db') }}
                    fill={i < Math.round(rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );

    // Rating summary
    const RatingSummary = () => (
        <div className={`flex flex-col md:flex-row ${getCardGap()} mb-8 p-6 ${getBorderRadius()}`} style={getCardSurfaceStyle(true)}>
            {/* Average rating */}
            <div className="text-center md:text-left md:pr-8 md:border-r" style={{ borderColor: getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.55, 'rgba(15,23,42,0.12)') }}>
                <div className="text-5xl font-bold" style={{ color: colors?.heading }}>
                    {averageRating.toFixed(1)}
                </div>
                <Stars rating={averageRating} size={20} />
                <p className="mt-2 text-sm" style={{ color: colors?.text }}>
                    {totalReviews} reseñas
                </p>
            </div>

            {/* Rating distribution */}
            {data.showRatingDistribution && (
                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingDistribution[star as 1 | 2 | 3 | 4 | 5];
                        const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-3">
                                <span className="text-sm w-8" style={{ color: colors?.text }}>{star} ★</span>
                                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: `${colors?.text}20` }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${percent}%`,
                                            backgroundColor: colors?.starColor,
                                        }}
                                    />
                                </div>
                                <span className="text-sm w-8 text-right" style={{ color: colors?.text }}>
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // Review card
    const ReviewCard = ({ review }: { review: ProductReviewItem }) => {
        const authorName = text(review.authorName as any);
        const reviewTitle = text(review.title as any);
        const reviewContent = text(review.content as any);
        const productName = text(review.productName as any);
        const formattedDate = new Date(review.date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <div
                className={`group overflow-hidden p-5 ${getBorderRadius()} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                style={getCardSurfaceStyle()}
            >
                {data.showPhotos && review.productImage && (
                    <div className={`-mx-5 -mt-5 mb-5 aspect-[16/9] overflow-hidden ${getBorderRadius()}`}>
                        <img
                            src={review.productImage}
                            alt={productName || reviewTitle || authorName}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {review.authorImage ? (
                            <img
                                src={review.authorImage}
                                alt={authorName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                style={{ backgroundColor: colors?.accent, color: colors?.buttonText }}
                            >
                                {(authorName || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold" style={{ color: colors?.cardText || colors?.heading }}>
                                    {authorName}
                                </span>
                                {data.showVerifiedBadge && review.verified && (
                                    <span
                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                                        style={{
                                            backgroundColor: getStorefrontColorWithOpacity(colors?.verifiedBadgeColor, 0.14, 'rgba(22,163,74,0.14)'),
                                            color: colors?.verifiedBadgeColor,
                                        }}
                                    >
                                        <CheckCircle size={12} />
                                        Verificado
                                    </span>
                                )}
                            </div>
                            <p className="text-sm" style={{ color: colors?.text }}>
                                {formattedDate}
                            </p>
                        </div>
                    </div>
                    <Stars rating={review.rating} />
                </div>

                {/* Title */}
                {reviewTitle && (
                    <h4 className="font-semibold mb-2" style={{ color: colors?.cardText || colors?.heading }}>
                        {reviewTitle}
                    </h4>
                )}

                {/* Content */}
                <p className="leading-relaxed" style={{ color: colors?.text }}>
                    {reviewContent}
                </p>

                {/* Product info */}
                {data.showProductInfo && productName && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.55, 'rgba(15,23,42,0.12)') }}>
                        {review.productImage && (
                            <img
                                src={review.productImage}
                                alt={productName}
                                className="w-12 h-12 rounded object-cover"
                            />
                        )}
                        <span className="text-sm" style={{ color: colors?.text }}>
                            {productName}
                        </span>
                    </div>
                )}

                {/* Helpful */}
                {review.helpful !== undefined && review.helpful > 0 && (
                    <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: colors?.text }}>
                        <ThumbsUp size={14} />
                        <span>{review.helpful} personas encontraron esto útil</span>
                    </div>
                )}
            </div>
        );
    };

    // List variant
    const renderList = () => (
        <div className={data.cardGap === 'sm' ? 'space-y-3' : data.cardGap === 'lg' ? 'space-y-8' : data.cardGap === 'xl' ? 'space-y-10' : 'space-y-4'}>
            {displayedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );

    // Cards variant
    const renderCards = () => (
        <div className={`grid grid-cols-1 ${getGridCols()} ${getCardGap()}`}>
            {displayedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );

    // Masonry variant
    const renderMasonry = () => (
        <div className={`${data.columns === 2 ? 'columns-1 md:columns-2' : data.columns === 4 ? 'columns-1 md:columns-2 xl:columns-4' : data.columns === 5 ? 'columns-1 md:columns-2 xl:columns-5' : data.columns === 6 ? 'columns-1 md:columns-3 xl:columns-6' : 'columns-1 md:columns-2 lg:columns-3'} ${data.cardGap === 'sm' ? 'gap-3 space-y-3' : data.cardGap === 'lg' ? 'gap-8 space-y-8' : data.cardGap === 'xl' ? 'gap-10 space-y-10' : 'gap-6 space-y-6'}`}>
            {displayedReviews.map((review) => (
                <div key={review.id} className="break-inside-avoid">
                    <ReviewCard review={review} />
                </div>
            ))}
        </div>
    );

    // Featured variant (highlights best reviews)
    const renderFeatured = () => {
        const featuredReview = sortedReviews.find(r => r.rating === 5) || sortedReviews[0];
        const otherReviews = sortedReviews.filter(r => r.id !== featuredReview?.id).slice(0, 3);
        const featuredAuthorName = text(featuredReview?.authorName as any);
        const featuredContent = text(featuredReview?.content as any);
        const featuredTitle = text(featuredReview?.title as any);

        return (
            <div className={`grid grid-cols-1 lg:grid-cols-2 ${getCardGap()}`}>
                {/* Featured review */}
                {featuredReview && (
                    <div
                        className={`p-8 ${getBorderRadius()} lg:row-span-2`}
                        style={{
                            backgroundColor: colors?.accent,
                            boxShadow: '0 28px 80px rgba(15,23,42,0.22)',
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            {featuredReview.authorImage ? (
	                                <img
	                                    src={featuredReview.authorImage}
	                                    alt={featuredAuthorName}
	                                    className="w-14 h-14 rounded-full object-cover border-2"
	                                    style={{ borderColor: colors?.buttonText }}
	                                />
                            ) : (
                                <div 
	                                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
	                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: colors?.buttonText }}
	                                >
	                                    {(featuredAuthorName || '?').charAt(0).toUpperCase()}
	                                </div>
	                            )}
	                            <div>
	                                <p className="font-semibold" style={{ color: colors?.buttonText }}>{featuredAuthorName}</p>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={16}
                                            style={{ color: colors?.starColor }}
                                            fill={i < featuredReview.rating ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                </div>
                            </div>
	                        </div>
	                        <blockquote className="text-xl leading-relaxed" style={{ color: colors?.buttonText, opacity: 0.9 }}>
	                            "{featuredContent}"
	                        </blockquote>
	                        {featuredTitle && (
	                            <p className="mt-4 font-semibold" style={{ color: colors?.buttonText }}>- {featuredTitle}</p>
	                        )}
                    </div>
                )}

                {/* Other reviews */}
                <div className={data.cardGap === 'sm' ? 'space-y-3' : data.cardGap === 'lg' ? 'space-y-8' : data.cardGap === 'xl' ? 'space-y-10' : 'space-y-4'}>
                    {otherReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            </div>
        );
    };

    const renderSpotlight = () => {
        const spotlightReview = sortedReviews.find(r => r.rating >= 5) || sortedReviews[0];
        const supportingReviews = sortedReviews.filter(review => review.id !== spotlightReview?.id).slice(0, 4);
        const spotlightAuthorName = text(spotlightReview?.authorName as any);
        const spotlightContent = text(spotlightReview?.content as any);
        const spotlightTitle = text(spotlightReview?.title as any);

        if (!spotlightReview) return null;

        return (
            <div className={`grid grid-cols-1 lg:grid-cols-[0.9fr_1.6fr] ${getCardGap()}`}>
                <aside
                    className={`flex flex-col justify-between p-7 sm:p-8 ${getBorderRadius()}`}
                    style={{
                        ...getCardSurfaceStyle(true),
                        backgroundImage: `radial-gradient(circle at top left, ${getStorefrontColorWithOpacity(colors?.accent, 0.22, 'rgba(79,70,229,0.22)')}, transparent 42%)`,
                    }}
                >
                    <div>
                        <div className="text-6xl font-black leading-none" style={{ color: colors?.heading }}>
                            {averageRating.toFixed(1)}
                        </div>
                        <div className="mt-3">
                            <Stars rating={averageRating} size={22} />
                        </div>
                        <p className="mt-3 text-sm" style={{ color: colors?.text }}>
                            {totalReviews} reseñas
                        </p>
                    </div>

                    {data.showRatingDistribution && (
                        <div className="mt-8 space-y-2">
                            {[5, 4, 3, 2, 1].map((star) => {
                                const count = ratingDistribution[star as 1 | 2 | 3 | 4 | 5];
                                const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-3">
                                        <span className="w-8 text-xs font-semibold" style={{ color: colors?.text }}>{star} ★</span>
                                        <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: getStorefrontColorWithOpacity(colors?.borderColor || colors?.border, 0.38, 'rgba(15,23,42,0.12)') }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: colors?.starColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <div className={`grid grid-cols-1 ${getCardGap()}`}>
                    <article
                        className={`relative overflow-hidden p-7 sm:p-8 ${getBorderRadius()}`}
                        style={{
                            ...getCardSurfaceStyle(true),
                            backgroundImage: `linear-gradient(135deg, ${getStorefrontColorWithOpacity(colors?.accent, 0.16, 'rgba(79,70,229,0.16)')}, transparent 58%)`,
                        }}
                    >
                        {spotlightReview.productImage && data.showPhotos && (
                            <div className={`mb-6 aspect-[16/7] overflow-hidden ${getBorderRadius()}`}>
                                <img
                                    src={spotlightReview.productImage}
                                    alt={text(spotlightReview.productName as any) || spotlightTitle || spotlightAuthorName}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {spotlightReview.authorImage ? (
                                    <img
                                        src={spotlightReview.authorImage}
                                        alt={spotlightAuthorName}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="flex h-12 w-12 items-center justify-center rounded-full font-bold"
                                        style={{ backgroundColor: colors?.accent, color: colors?.buttonText || '#ffffff' }}
                                    >
                                        {(spotlightAuthorName || '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold" style={{ color: colors?.cardText || colors?.heading }}>
                                        {spotlightAuthorName}
                                    </p>
                                    {data.showVerifiedBadge && spotlightReview.verified && (
                                        <span
                                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                                            style={{
                                                backgroundColor: getStorefrontColorWithOpacity(colors?.verifiedBadgeColor, 0.14, 'rgba(22,163,74,0.14)'),
                                                color: colors?.verifiedBadgeColor,
                                            }}
                                        >
                                            <CheckCircle size={12} />
                                            Verificado
                                        </span>
                                    )}
                                </div>
                            </div>
                            <Stars rating={spotlightReview.rating} />
                        </div>
                        {spotlightTitle && (
                            <h4 className="text-2xl font-bold leading-tight" style={{ color: colors?.heading }}>
                                {spotlightTitle}
                            </h4>
                        )}
                        <blockquote className="mt-4 text-lg leading-8" style={{ color: colors?.text }}>
                            {spotlightContent}
                        </blockquote>
                    </article>

                    {supportingReviews.length > 0 && (
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${getCardGap()}`}>
                            {supportingReviews.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <section
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={getStorefrontSectionBackgroundStyle(data, colors?.background)}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className={`mb-8 flex flex-col gap-4 ${getTextAlignment()}`}>
                    <div className={`flex w-full flex-col ${getTextAlignment()}`}>
                        {title && (
                            <h2
                                className={`${getTitleSize()} font-bold`}
                                style={{ color: colors?.heading }}
                            >
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p className={`mt-2 max-w-2xl ${getDescriptionSize()}`} style={{ color: colors?.text }}>{description}</p>
                        )}
                    </div>

                    {/* Sort dropdown */}
                    <div className={`relative flex ${getContentPosition()}`}>
                        <AppSelect
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className={`appearance-none px-4 py-2 pr-10 ${getBorderRadius()} cursor-pointer`}
                            style={{
                                backgroundColor: colors?.cardBackground,
                                color: colors?.text,
                                border: `1px solid ${colors?.text}30`,
                            }}
                        >
                            <option value="newest">Más recientes</option>
                            <option value="highest">Mayor calificación</option>
                            <option value="lowest">Menor calificación</option>
                            <option value="helpful">Más útiles</option>
                        </AppSelect>
                        <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: colors?.text }}
                        />
                    </div>
                </div>

                {/* Rating Summary */}
                {data.variant !== 'spotlight' && <RatingSummary />}

                {/* Reviews */}
                {reviews.length === 0 ? (
                    <div className="text-center py-12" style={{ color: colors?.text }}>
                        Aún no hay reseñas
                    </div>
                ) : (
                    <>
                        {data.variant === 'list' && renderList()}
                        {data.variant === 'cards' && renderCards()}
                        {data.variant === 'masonry' && renderMasonry()}
                        {data.variant === 'featured' && renderFeatured()}
                        {data.variant === 'spotlight' && renderSpotlight()}

                        {/* Show more button */}
                        {sortedReviews.length > (data.maxReviews || 6) && !showAll && (
                            <div className="text-center mt-8">
                                <button
                                    onClick={() => setShowAll(true)}
                                    className={`px-6 py-3 ${getBorderRadius()} font-semibold transition-opacity hover:opacity-80`}
                                    style={{
                                        backgroundColor: colors?.accent,
                                        color: colors?.buttonText || '#ffffff',
                                    }}
                                >
                                    Ver todas las reseñas ({sortedReviews.length})
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default ProductReviews;
