/**
 * ReviewSummary Component
 * Resumen de reseñas con distribución de calificaciones
 */

import React from 'react';
import { Star } from 'lucide-react';
import { ReviewStats } from '../../../types/ecommerce';
import RatingStars from './RatingStars';

interface ReviewSummaryProps {
    stats: ReviewStats | null;
    onWriteReview?: () => void;
    primaryColor?: string;
}

const ReviewSummary: React.FC<ReviewSummaryProps> = ({
    stats,
    onWriteReview,
    primaryColor = '#6366f1',
}) => {
    const defaultStats: ReviewStats = {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    const data = stats || defaultStats;
    const { averageRating, totalReviews, ratingDistribution } = data;

    // Calculate percentages for bars
    const getPercentage = (count: number) => {
        if (totalReviews === 0) return 0;
        return (count / totalReviews) * 100;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left: Average Rating */}
                <div className="flex flex-col items-center md:w-1/3">
                    <div className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
                        {averageRating.toFixed(1)}
                    </div>
                    <RatingStars rating={averageRating} size="md" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {totalReviews} reseña{totalReviews !== 1 ? 's' : ''}
                    </p>

                    {onWriteReview && (
                        <button
                            onClick={onWriteReview}
                            className="mt-4 px-6 py-2 rounded-lg text-white font-medium transition-colors hover:opacity-90"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Escribir reseña
                        </button>
                    )}
                </div>

                {/* Right: Distribution Bars */}
                <div className="flex-1 space-y-3">
                    {[5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingDistribution[stars as keyof typeof ratingDistribution] || 0;
                        const percentage = getPercentage(count);

                        return (
                            <div key={stars} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-12 justify-end">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {stars}
                                    </span>
                                    <Star
                                        size={14}
                                        className="text-yellow-400"
                                        fill="currentColor"
                                    />
                                </div>

                                {/* Progress Bar */}
                                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: primaryColor,
                                        }}
                                    />
                                </div>

                                <span className="text-sm text-gray-500 dark:text-gray-400 w-10 text-right">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ReviewSummary;
