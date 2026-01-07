/**
 * ReviewList Component
 * Lista de reseñas con ordenamiento y paginación
 */

import React from 'react';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { Review } from '../../../types/ecommerce';
import ReviewCard from './ReviewCard';
import { ReviewSortBy } from '../hooks/useProductReviews';
import { ReviewColors } from './ReviewSummary';

interface ReviewListProps {
    reviews: Review[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    sortBy: ReviewSortBy;
    onSortChange: (sort: ReviewSortBy) => void;
    onLoadMore: () => void;
    onMarkHelpful?: (reviewId: string) => Promise<boolean>;
    hasVoted?: (reviewId: string) => boolean;
    primaryColor?: string;
    colors?: ReviewColors;
}

const defaultColors: ReviewColors = {
    primary: '#6366f1',
    heading: '#1f2937',
    text: '#6b7280',
    mutedText: '#9ca3af',
    cardBackground: '#ffffff',
    border: '#e5e7eb',
    buttonBackground: '#6366f1',
    buttonText: '#ffffff',
    starColor: '#facc15',
};

const ReviewList: React.FC<ReviewListProps> = ({
    reviews,
    isLoading,
    isLoadingMore,
    hasMore,
    sortBy,
    onSortChange,
    onLoadMore,
    onMarkHelpful,
    hasVoted,
    primaryColor,
    colors: propColors,
}) => {
    // Merge colors
    const colors = {
        ...defaultColors,
        ...propColors,
        primary: propColors?.primary || primaryColor || defaultColors.primary,
    };

    const sortOptions: { value: ReviewSortBy; label: string }[] = [
        { value: 'newest', label: 'Más recientes' },
        { value: 'oldest', label: 'Más antiguas' },
        { value: 'highest', label: 'Mejor valoradas' },
        { value: 'lowest', label: 'Peor valoradas' },
        { value: 'helpful', label: 'Más útiles' },
    ];

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 
                    className="animate-spin" 
                    size={32} 
                    style={{ color: colors?.primary }} 
                />
            </div>
        );
    }

    // Empty state
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12">
                <MessageSquare 
                    className="mx-auto mb-4" 
                    size={48} 
                    style={{ color: colors?.border }}
                />
                <h3 
                    className="text-lg font-medium mb-2"
                    style={{ color: colors?.heading }}
                >
                    Sin reseñas aún
                </h3>
                <p style={{ color: colors?.mutedText }}>
                    Sé el primero en compartir tu opinión sobre este producto
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: colors?.mutedText }}>
                    {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
                </p>

                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as ReviewSortBy)}
                        className="appearance-none px-4 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2"
                        style={{ 
                            borderColor: colors?.border, 
                            backgroundColor: colors?.cardBackground,
                            color: colors?.heading,
                            '--tw-ring-color': colors?.primary 
                        } as React.CSSProperties}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        size={16}
                        style={{ color: colors?.mutedText }}
                    />
                </div>
            </div>

            {/* Reviews */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <ReviewCard
                        key={review.id}
                        review={review}
                        onMarkHelpful={onMarkHelpful}
                        hasVoted={hasVoted ? hasVoted(review.id) : false}
                        colors={colors}
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="text-center pt-4">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2 border rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto hover:opacity-80"
                        style={{ borderColor: colors?.border, color: colors?.text }}
                    >
                        {isLoadingMore ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Cargando...
                            </>
                        ) : (
                            'Ver más reseñas'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewList;
