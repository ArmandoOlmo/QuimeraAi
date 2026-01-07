/**
 * ReviewCard Component
 * Tarjeta individual para mostrar una reseña
 */

import React, { useState } from 'react';
import { ThumbsUp, Check, User, Image as ImageIcon } from 'lucide-react';
import { Review } from '../../../types/ecommerce';
import RatingStars from './RatingStars';
import { ReviewColors } from './ReviewSummary';

interface ReviewCardProps {
    review: Review;
    onMarkHelpful?: (reviewId: string) => Promise<boolean>;
    hasVoted?: boolean;
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
    starColor: '#facc15',
    verifiedColor: '#16a34a',
};

const ReviewCard: React.FC<ReviewCardProps> = ({
    review,
    onMarkHelpful,
    hasVoted = false,
    primaryColor,
    colors: propColors,
}) => {
    // Merge colors
    const colors = {
        ...defaultColors,
        ...propColors,
        primary: propColors?.primary || primaryColor || defaultColors.primary,
    };
    const [voted, setVoted] = useState(hasVoted);
    const [helpfulCount, setHelpfulCount] = useState(review.helpfulVotes);
    const [isVoting, setIsVoting] = useState(false);
    const [showImages, setShowImages] = useState(false);

    const formatDate = (timestamp: { seconds: number }) => {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleMarkHelpful = async () => {
        if (voted || !onMarkHelpful || isVoting) return;

        setIsVoting(true);
        const success = await onMarkHelpful(review.id);
        if (success) {
            setVoted(true);
            setHelpfulCount((prev) => prev + 1);
        }
        setIsVoting(false);
    };

    // Get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div 
            className="rounded-xl p-6 border"
            style={{ backgroundColor: colors?.cardBackground, borderColor: colors?.border }}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: colors?.primary }}
                    >
                        {getInitials(review.customerName)}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span 
                                className="font-medium"
                                style={{ color: colors?.heading }}
                            >
                                {review.customerName}
                            </span>
                            {review.verifiedPurchase && (
                                <span 
                                    className="flex items-center gap-1 text-xs"
                                    style={{ color: colors?.verifiedColor }}
                                >
                                    <Check size={12} />
                                    Compra verificada
                                </span>
                            )}
                        </div>
                        <p className="text-sm" style={{ color: colors?.mutedText }}>
                            {formatDate(review.createdAt)}
                        </p>
                    </div>
                </div>

                <RatingStars 
                    rating={review.rating} 
                    size="sm" 
                    color={colors?.starColor}
                />
            </div>

            {/* Title */}
            <h4 
                className="font-semibold mb-2"
                style={{ color: colors?.heading }}
            >
                {review.title}
            </h4>

            {/* Comment */}
            <p 
                className="whitespace-pre-line mb-4"
                style={{ color: colors?.text }}
            >
                {review.comment}
            </p>

            {/* Images */}
            {review.images && review.images.length > 0 && (
                <div className="mb-4">
                    {!showImages ? (
                        <button
                            onClick={() => setShowImages(true)}
                            className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                            style={{ color: colors?.mutedText }}
                        >
                            <ImageIcon size={16} />
                            Ver {review.images.length} imagen{review.images.length !== 1 ? 'es' : ''}
                        </button>
                    ) : (
                        <div className="flex gap-2 flex-wrap">
                            {review.images.map((image, index) => (
                                <a
                                    key={index}
                                    href={image}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-20 rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                                    style={{ borderColor: colors?.border }}
                                >
                                    <img
                                        src={image}
                                        alt={`Imagen ${index + 1} de la reseña`}
                                        className="w-full h-full object-cover"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Admin Response */}
            {review.adminResponse && (
                <div 
                    className="mt-4 p-4 rounded-lg border-l-4"
                    style={{ 
                        backgroundColor: `${colors?.primary}10`, 
                        borderLeftColor: colors?.primary 
                    }}
                >
                    <p 
                        className="text-sm font-medium mb-1"
                        style={{ color: colors?.heading }}
                    >
                        Respuesta del vendedor
                    </p>
                    <p className="text-sm" style={{ color: colors?.text }}>
                        {review.adminResponse}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div 
                className="flex items-center justify-between mt-4 pt-4 border-t"
                style={{ borderColor: colors?.border }}
            >
                <button
                    onClick={handleMarkHelpful}
                    disabled={voted || isVoting}
                    className="flex items-center gap-2 text-sm transition-colors disabled:cursor-not-allowed hover:opacity-80"
                    style={{ color: voted ? colors?.verifiedColor : colors?.mutedText }}
                >
                    <ThumbsUp size={16} fill={voted ? 'currentColor' : 'none'} />
                    {voted ? 'Útil' : '¿Te resultó útil?'}
                    {helpfulCount > 0 && (
                        <span style={{ color: colors?.mutedText }}>
                            ({helpfulCount})
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ReviewCard;
