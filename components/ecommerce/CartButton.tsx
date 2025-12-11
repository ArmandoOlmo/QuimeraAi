/**
 * CartButton
 * Botón del carrito con badge de cantidad para usar en headers
 */

import React from 'react';
import { ShoppingCart, ShoppingBag } from 'lucide-react';

interface CartButtonProps {
    itemCount: number;
    onClick: () => void;
    variant?: 'icon' | 'button';
    primaryColor?: string;
    className?: string;
}

const CartButton: React.FC<CartButtonProps> = ({
    itemCount,
    onClick,
    variant = 'icon',
    primaryColor = '#6366f1',
    className = '',
}) => {
    if (variant === 'button') {
        return (
            <button
                onClick={onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-transform hover:scale-105 active:scale-95 ${className}`}
                style={{ backgroundColor: primaryColor }}
            >
                <ShoppingBag size={20} />
                <span>Carrito</span>
                {itemCount > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                        {itemCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`relative p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
            aria-label={`Carrito (${itemCount} productos)`}
        >
            <ShoppingCart size={24} />
            {itemCount > 0 && (
                <span
                    className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold shadow-lg"
                    style={{ backgroundColor: '#ef4444' }}
                >
                    {itemCount > 99 ? '99+' : itemCount}
                </span>
            )}
        </button>
    );
};

export default CartButton;



