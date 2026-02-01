/**
 * RatingStars Component
 * Componente de estrellas para mostrar y seleccionar calificaciones
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg';
    interactive?: boolean;
    onChange?: (rating: number) => void;
    showValue?: boolean;
    color?: string;
    emptyColor?: string;
    textColor?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
    rating,
    maxRating = 5,
    size = 'md',
    interactive = false,
    onChange,
    showValue = false,
    color = '#facc15', // Yellow-400
    emptyColor = '#d1d5db', // Gray-300
    textColor = '#6b7280', // Gray-500
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeMap = {
        sm: 14,
        md: 20,
        lg: 28,
    };

    const iconSize = sizeMap[size];
    const displayRating = hoverRating || rating;

    const handleClick = (index: number) => {
        if (interactive && onChange) {
            onChange(index);
        }
    };

    const handleMouseEnter = (index: number) => {
        if (interactive) {
            setHoverRating(index);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            setHoverRating(0);
        }
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {Array.from({ length: maxRating }).map((_, index) => {
                    const starIndex = index + 1;
                    const isFilled = starIndex <= displayRating;
                    const isHalfFilled = !isFilled && starIndex - 0.5 <= displayRating;

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => handleClick(starIndex)}
                            onMouseEnter={() => handleMouseEnter(starIndex)}
                            onMouseLeave={handleMouseLeave}
                            disabled={!interactive}
                            className={`p-0.5 transition-transform ${
                                interactive
                                    ? 'cursor-pointer hover:scale-110'
                                    : 'cursor-default'
                            }`}
                            aria-label={`${starIndex} estrellas`}
                        >
                            <Star
                                size={iconSize}
                                className="transition-colors"
                                style={
                                    isFilled || isHalfFilled
                                        ? { color, fill: color }
                                        : { color: emptyColor }
                                }
                                fill={isFilled ? 'currentColor' : 'none'}
                            />
                        </button>
                    );
                })}
            </div>
            {showValue && (
                <span className="ml-1 text-sm" style={{ color: textColor }}>
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default RatingStars;
