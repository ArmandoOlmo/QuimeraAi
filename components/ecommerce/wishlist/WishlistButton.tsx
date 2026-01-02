/**
 * WishlistButton Component
 * Botón para agregar/quitar productos de la lista de deseos
 */

import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { PublicProduct } from '../hooks/usePublicProduct';

interface WishlistButtonProps {
    product: PublicProduct;
    isInWishlist: boolean;
    onToggle: (product: PublicProduct) => Promise<void>;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'button';
    showLabel?: boolean;
    primaryColor?: string;
}

const WishlistButton: React.FC<WishlistButtonProps> = ({
    product,
    isInWishlist,
    onToggle,
    size = 'md',
    variant = 'icon',
    showLabel = false,
    primaryColor = '#ef4444',
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [animate, setAnimate] = useState(false);

    const sizeMap = {
        sm: { icon: 16, padding: 'p-1.5' },
        md: { icon: 20, padding: 'p-2' },
        lg: { icon: 24, padding: 'p-3' },
    };

    const { icon: iconSize, padding } = sizeMap[size];

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoading) return;

        setIsLoading(true);
        setAnimate(true);

        try {
            await onToggle(product);
        } finally {
            setIsLoading(false);
            setTimeout(() => setAnimate(false), 300);
        }
    };

    if (variant === 'button') {
        return (
            <button
                onClick={handleClick}
                disabled={isLoading}
                className={`flex items-center gap-2 ${padding} px-4 rounded-lg border-2 transition-all duration-200 ${
                    isInWishlist
                        ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-500'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-500'
                } disabled:opacity-50`}
            >
                {isLoading ? (
                    <Loader2 size={iconSize} className="animate-spin" />
                ) : (
                    <Heart
                        size={iconSize}
                        fill={isInWishlist ? 'currentColor' : 'none'}
                        className={animate ? 'scale-125 transition-transform' : 'transition-transform'}
                    />
                )}
                {showLabel && (
                    <span className="text-sm font-medium">
                        {isInWishlist ? 'En favoritos' : 'Agregar a favoritos'}
                    </span>
                )}
            </button>
        );
    }

    // Icon variant
    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={`${padding} rounded-full transition-all duration-200 ${
                isInWishlist
                    ? 'bg-red-50 dark:bg-red-500/20 text-red-500'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400 hover:text-red-500'
            } shadow-md backdrop-blur-sm disabled:opacity-50`}
            title={isInWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
            {isLoading ? (
                <Loader2 size={iconSize} className="animate-spin" />
            ) : (
                <Heart
                    size={iconSize}
                    fill={isInWishlist ? 'currentColor' : 'none'}
                    className={animate ? 'scale-125 transition-transform' : 'transition-transform'}
                />
            )}
        </button>
    );
};

export default WishlistButton;











