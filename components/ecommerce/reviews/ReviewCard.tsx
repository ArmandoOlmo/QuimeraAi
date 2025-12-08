/**
 * ReviewCard Component
 * Tarjeta individual para mostrar una reseña
 */

import React, { useState } from 'react';
import { ThumbsUp, Check, User, Image as ImageIcon } from 'lucide-react';
import { Review } from '../../../types/ecommerce';
import RatingStars from './RatingStars';

interface ReviewCardProps {
    review: Review;
    onMarkHelpful?: (reviewId: string) => Promise<boolean>;
    hasVoted?: boolean;
    primaryColor?: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
    review,
    onMarkHelpful,
    hasVoted = false,
    primaryColor = '#6366f1',
}) => {
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {getInitials(review.customerName)}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                                {review.customerName}
                            </span>
                            {review.verifiedPurchase && (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <Check size={12} />
                                    Compra verificada
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(review.createdAt)}
                        </p>
                    </div>
                </div>

                <RatingStars rating={review.rating} size="sm" />
            </div>

            {/* Title */}
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {review.title}
            </h4>

            {/* Comment */}
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line mb-4">
                {review.comment}
            </p>

            {/* Images */}
            {review.images && review.images.length > 0 && (
                <div className="mb-4">
                    {!showImages ? (
                        <button
                            onClick={() => setShowImages(true)}
                            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
                                    className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
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
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4" style={{ borderLeftColor: primaryColor }}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Respuesta del vendedor
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {review.adminResponse}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleMarkHelpful}
                    disabled={voted || isVoting}
                    className={`flex items-center gap-2 text-sm transition-colors ${
                        voted
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    } disabled:cursor-not-allowed`}
                >
                    <ThumbsUp size={16} fill={voted ? 'currentColor' : 'none'} />
                    {voted ? 'Útil' : '¿Te resultó útil?'}
                    {helpfulCount > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                            ({helpfulCount})
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ReviewCard;
