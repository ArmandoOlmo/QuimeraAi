/**
 * ReviewList Component
 * Lista de reseñas con ordenamiento y paginación
 */

import React from 'react';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { Review } from '../../../types/ecommerce';
import ReviewCard from './ReviewCard';
import { ReviewSortBy } from '../hooks/useProductReviews';

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
}

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
    primaryColor = '#6366f1',
}) => {
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
                    style={{ color: primaryColor }} 
                />
            </div>
        );
    }

    // Empty state
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12">
                <MessageSquare className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Sin reseñas aún
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Sé el primero en compartir tu opinión sobre este producto
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
                </p>

                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as ReviewSortBy)}
                        className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={16}
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
                        primaryColor={primaryColor}
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="text-center pt-4">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
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
