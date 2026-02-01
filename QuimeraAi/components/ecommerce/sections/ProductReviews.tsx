/**
 * ProductReviews Component
 * Displays customer reviews and ratings
 */

import React, { useState } from 'react';
import { Star, CheckCircle, ThumbsUp, ChevronDown } from 'lucide-react';
import { ProductReviewsData, ProductReviewItem } from '../../../types/components';

interface ProductReviewsProps {
    data: ProductReviewsData;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ data }) => {
    const [sortBy, setSortBy] = useState(data.sortBy || 'newest');
    const [showAll, setShowAll] = useState(false);

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
    const getPaddingY = () => {
        const map = { sm: 'py-8', md: 'py-12', lg: 'py-16' };
        return map[data.paddingY] || 'py-12';
    };

    const getPaddingX = () => {
        const map = { sm: 'px-4', md: 'px-6', lg: 'px-8' };
        return map[data.paddingX] || 'px-6';
    };

    const getTitleSize = () => {
        const map = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl', xl: 'text-4xl' };
        return map[data.titleFontSize || 'lg'] || 'text-3xl';
    };

    const getBorderRadius = () => {
        const map = { none: 'rounded-none', md: 'rounded-lg', xl: 'rounded-xl', full: 'rounded-3xl' };
        return map[data.borderRadius || 'xl'] || 'rounded-xl';
    };

    // Stars component
    const Stars = ({ rating, size = 16 }: { rating: number; size?: number }) => (
        <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={size}
                    style={{ color: i < Math.round(rating) ? data.colors?.starColor : (data.colors?.borderColor || '#d1d5db') }}
                    fill={i < Math.round(rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );

    // Rating summary
    const RatingSummary = () => (
        <div className="flex flex-col md:flex-row gap-8 mb-8 p-6 rounded-xl" style={{ backgroundColor: data.colors?.cardBackground }}>
            {/* Average rating */}
            <div className="text-center md:text-left md:pr-8 md:border-r" style={{ borderColor: `${data.colors?.text}20` }}>
                <div className="text-5xl font-bold" style={{ color: data.colors?.heading }}>
                    {averageRating.toFixed(1)}
                </div>
                <Stars rating={averageRating} size={20} />
                <p className="mt-2 text-sm" style={{ color: data.colors?.text }}>
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
                                <span className="text-sm w-8" style={{ color: data.colors?.text }}>{star} ★</span>
                                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: `${data.colors?.text}20` }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${percent}%`,
                                            backgroundColor: data.colors?.starColor,
                                        }}
                                    />
                                </div>
                                <span className="text-sm w-8 text-right" style={{ color: data.colors?.text }}>
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
        const formattedDate = new Date(review.date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <div
                className={`p-5 ${getBorderRadius()}`}
                style={{ backgroundColor: data.colors?.cardBackground }}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {review.authorImage ? (
                            <img
                                src={review.authorImage}
                                alt={review.authorName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                style={{ backgroundColor: data.colors?.accent, color: data.colors?.buttonText }}
                            >
                                {review.authorName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold" style={{ color: data.colors?.cardText || data.colors?.heading }}>
                                    {review.authorName}
                                </span>
                                {data.showVerifiedBadge && review.verified && (
                                    <span
                                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `${data.colors?.verifiedBadgeColor}20`,
                                            color: data.colors?.verifiedBadgeColor,
                                        }}
                                    >
                                        <CheckCircle size={12} />
                                        Verificado
                                    </span>
                                )}
                            </div>
                            <p className="text-sm" style={{ color: data.colors?.text }}>
                                {formattedDate}
                            </p>
                        </div>
                    </div>
                    <Stars rating={review.rating} />
                </div>

                {/* Title */}
                {review.title && (
                    <h4 className="font-semibold mb-2" style={{ color: data.colors?.cardText || data.colors?.heading }}>
                        {review.title}
                    </h4>
                )}

                {/* Content */}
                <p className="leading-relaxed" style={{ color: data.colors?.text }}>
                    {review.content}
                </p>

                {/* Product info */}
                {data.showProductInfo && review.productName && (
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: `${data.colors?.text}20` }}>
                        {review.productImage && (
                            <img
                                src={review.productImage}
                                alt={review.productName}
                                className="w-12 h-12 rounded object-cover"
                            />
                        )}
                        <span className="text-sm" style={{ color: data.colors?.text }}>
                            {review.productName}
                        </span>
                    </div>
                )}

                {/* Helpful */}
                {review.helpful !== undefined && review.helpful > 0 && (
                    <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: data.colors?.text }}>
                        <ThumbsUp size={14} />
                        <span>{review.helpful} personas encontraron esto útil</span>
                    </div>
                )}
            </div>
        );
    };

    // List variant
    const renderList = () => (
        <div className="space-y-4">
            {displayedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );

    // Cards variant
    const renderCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
            ))}
        </div>
    );

    // Masonry variant
    const renderMasonry = () => (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
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

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Featured review */}
                {featuredReview && (
                    <div
                        className={`p-8 ${getBorderRadius()} lg:row-span-2`}
                        style={{ backgroundColor: data.colors?.accent }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            {featuredReview.authorImage ? (
                                <img
                                    src={featuredReview.authorImage}
                                    alt={featuredReview.authorName}
                                    className="w-14 h-14 rounded-full object-cover border-2"
                                    style={{ borderColor: data.colors?.buttonText }}
                                />
                            ) : (
                                <div 
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: data.colors?.buttonText }}
                                >
                                    {featuredReview.authorName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="font-semibold" style={{ color: data.colors?.buttonText }}>{featuredReview.authorName}</p>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={16}
                                            style={{ color: data.colors?.starColor }}
                                            fill={i < featuredReview.rating ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <blockquote className="text-xl leading-relaxed" style={{ color: data.colors?.buttonText, opacity: 0.9 }}>
                            "{featuredReview.content}"
                        </blockquote>
                        {featuredReview.title && (
                            <p className="mt-4 font-semibold" style={{ color: data.colors?.buttonText }}>— {featuredReview.title}</p>
                        )}
                    </div>
                )}

                {/* Other reviews */}
                <div className="space-y-4">
                    {otherReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <section
            className={`${getPaddingY()} ${getPaddingX()}`}
            style={{ backgroundColor: data.colors?.background }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        {data.title && (
                            <h2
                                className={`${getTitleSize()} font-bold`}
                                style={{ color: data.colors?.heading }}
                            >
                                {data.title}
                            </h2>
                        )}
                        {data.description && (
                            <p className="mt-1" style={{ color: data.colors?.text }}>{data.description}</p>
                        )}
                    </div>

                    {/* Sort dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className={`appearance-none px-4 py-2 pr-10 ${getBorderRadius()} cursor-pointer`}
                            style={{
                                backgroundColor: data.colors?.cardBackground,
                                color: data.colors?.text,
                                border: `1px solid ${data.colors?.text}30`,
                            }}
                        >
                            <option value="newest">Más recientes</option>
                            <option value="highest">Mayor calificación</option>
                            <option value="lowest">Menor calificación</option>
                            <option value="helpful">Más útiles</option>
                        </select>
                        <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: data.colors?.text }}
                        />
                    </div>
                </div>

                {/* Rating Summary */}
                <RatingSummary />

                {/* Reviews */}
                {reviews.length === 0 ? (
                    <div className="text-center py-12" style={{ color: data.colors?.text }}>
                        Aún no hay reseñas
                    </div>
                ) : (
                    <>
                        {data.variant === 'list' && renderList()}
                        {data.variant === 'cards' && renderCards()}
                        {data.variant === 'masonry' && renderMasonry()}
                        {data.variant === 'featured' && renderFeatured()}

                        {/* Show more button */}
                        {sortedReviews.length > (data.maxReviews || 6) && !showAll && (
                            <div className="text-center mt-8">
                                <button
                                    onClick={() => setShowAll(true)}
                                    className={`px-6 py-3 ${getBorderRadius()} font-semibold transition-opacity hover:opacity-80`}
                                    style={{
                                        backgroundColor: data.colors?.accent,
                                        color: data.colors?.buttonText || '#ffffff',
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
