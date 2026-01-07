/**
 * ReviewSummary Component
 * Resumen de reseñas con distribución de calificaciones
 */

import React from 'react';
import { Star } from 'lucide-react';
import { ReviewStats } from '../../../types/ecommerce';
import RatingStars from './RatingStars';

export interface ReviewColors {
    primary?: string;
    heading?: string;
    text?: string;
    mutedText?: string;
    cardBackground?: string;
    border?: string;
    buttonBackground?: string;
    buttonText?: string;
    starColor?: string;
    starEmptyColor?: string;
    progressBackground?: string;
    verifiedColor?: string;
}

interface ReviewSummaryProps {
    stats: ReviewStats | null;
    onWriteReview?: () => void;
    primaryColor?: string;
    colors?: ReviewColors;
}

const defaultReviewColors: ReviewColors = {
    primary: '#6366f1',
    heading: '#1f2937',
    text: '#6b7280',
    mutedText: '#9ca3af',
    cardBackground: '#ffffff',
    border: '#e5e7eb',
    buttonBackground: '#6366f1',
    buttonText: '#ffffff',
    starColor: '#facc15',
    starEmptyColor: '#d1d5db',
    progressBackground: '#e5e7eb',
    verifiedColor: '#16a34a',
};

const ReviewSummary: React.FC<ReviewSummaryProps> = ({
    stats,
    onWriteReview,
    primaryColor,
    colors: propColors,
}) => {
    // Merge colors
    const colors = {
        ...defaultReviewColors,
        ...propColors,
        primary: propColors?.primary || primaryColor || defaultReviewColors.primary,
        buttonBackground: propColors?.buttonBackground || primaryColor || defaultReviewColors.buttonBackground,
    };

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
        <div 
            className="rounded-xl p-6 border"
            style={{ backgroundColor: colors?.cardBackground, borderColor: colors?.border }}
        >
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left: Average Rating */}
                <div className="flex flex-col items-center md:w-1/3">
                    <div 
                        className="text-5xl font-bold mb-2"
                        style={{ color: colors?.heading }}
                    >
                        {averageRating.toFixed(1)}
                    </div>
                    <RatingStars 
                        rating={averageRating} 
                        size="md" 
                        color={colors?.starColor}
                        emptyColor={colors?.starEmptyColor}
                    />
                    <p className="text-sm mt-2" style={{ color: colors?.mutedText }}>
                        {totalReviews} reseña{totalReviews !== 1 ? 's' : ''}
                    </p>

                    {onWriteReview && (
                        <button
                            onClick={onWriteReview}
                            className="mt-4 px-6 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                            style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonText }}
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
                                    <span className="text-sm" style={{ color: colors?.text }}>
                                        {stars}
                                    </span>
                                    <Star
                                        size={14}
                                        style={{ color: colors?.starColor }}
                                        fill="currentColor"
                                    />
                                </div>

                                {/* Progress Bar */}
                                <div 
                                    className="flex-1 h-3 rounded-full overflow-hidden"
                                    style={{ backgroundColor: colors?.progressBackground }}
                                >
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: colors?.primary,
                                        }}
                                    />
                                </div>

                                <span 
                                    className="text-sm w-10 text-right"
                                    style={{ color: colors?.mutedText }}
                                >
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
