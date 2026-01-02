/**
 * CompareButton Component
 * Botón para agregar/quitar productos de la comparación
 */

import React from 'react';
import { GitCompare, Check } from 'lucide-react';
import { PublicProduct } from './hooks/usePublicProduct';

interface CompareButtonProps {
    product: PublicProduct;
    isComparing: boolean;
    canAdd: boolean;
    onToggle: (product: PublicProduct) => void;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'button';
    primaryColor?: string;
}

const CompareButton: React.FC<CompareButtonProps> = ({
    product,
    isComparing,
    canAdd,
    onToggle,
    size = 'md',
    variant = 'icon',
    primaryColor = '#6366f1',
}) => {
    const sizeMap = {
        sm: { icon: 14, padding: 'p-1.5' },
        md: { icon: 18, padding: 'p-2' },
        lg: { icon: 22, padding: 'p-2.5' },
    };

    const { icon: iconSize, padding } = sizeMap[size];

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!canAdd && !isComparing) return;
        onToggle(product);
    };

    const disabled = !canAdd && !isComparing;

    if (variant === 'button') {
        return (
            <button
                onClick={handleClick}
                disabled={disabled}
                className={`flex items-center gap-2 ${padding} px-4 rounded-lg border-2 transition-all ${
                    isComparing
                        ? 'text-white'
                        : disabled
                        ? 'border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
                }`}
                style={isComparing ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                title={
                    isComparing
                        ? 'Quitar de comparación'
                        : disabled
                        ? 'Máximo de productos alcanzado'
                        : 'Agregar a comparación'
                }
            >
                {isComparing ? <Check size={iconSize} /> : <GitCompare size={iconSize} />}
                <span className="text-sm font-medium">
                    {isComparing ? 'Comparando' : 'Comparar'}
                </span>
            </button>
        );
    }

    // Icon variant
    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={`${padding} rounded-full transition-all ${
                isComparing
                    ? 'text-white'
                    : disabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            } shadow-md backdrop-blur-sm`}
            style={isComparing ? { backgroundColor: primaryColor } : {}}
            title={
                isComparing
                    ? 'Quitar de comparación'
                    : disabled
                    ? 'Máximo de productos alcanzado'
                    : 'Agregar a comparación'
            }
        >
            {isComparing ? <Check size={iconSize} /> : <GitCompare size={iconSize} />}
        </button>
    );
};

export default CompareButton;











