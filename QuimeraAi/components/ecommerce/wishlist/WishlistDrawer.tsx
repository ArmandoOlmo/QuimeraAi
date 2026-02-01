/**
 * WishlistDrawer Component
 * Drawer lateral para mostrar la lista de deseos
 */

import React from 'react';
import {
    X,
    Heart,
    ShoppingCart,
    Trash2,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { WishlistItem } from '../hooks/useWishlist';

interface WishlistDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: WishlistItem[];
    isLoading: boolean;
    onRemove: (productId: string) => Promise<void>;
    onAddToCart?: (item: WishlistItem) => void;
    onViewProduct?: (slug: string) => void;
    onClearAll: () => Promise<void>;
    currencySymbol?: string;
    primaryColor?: string;
}

const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
    isOpen,
    onClose,
    items,
    isLoading,
    onRemove,
    onAddToCart,
    onViewProduct,
    onClearAll,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    const [removingId, setRemovingId] = React.useState<string | null>(null);
    const [clearing, setClearing] = React.useState(false);

    const handleRemove = async (productId: string) => {
        setRemovingId(productId);
        await onRemove(productId);
        setRemovingId(null);
    };

    const handleClearAll = async () => {
        if (!confirm('¿Estás seguro de eliminar todos los favoritos?')) return;
        setClearing(true);
        await onClearAll();
        setClearing(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Heart style={{ color: primaryColor }} size={24} />
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Mis Favoritos
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {items.length} producto{items.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2
                                className="animate-spin"
                                size={32}
                                style={{ color: primaryColor }}
                            />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
                            <Heart className="text-gray-300 dark:text-gray-600 mb-4" size={64} />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Tu lista está vacía
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Guarda tus productos favoritos para encontrarlos fácilmente después
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    {/* Image */}
                                    <div
                                        className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 cursor-pointer"
                                        onClick={() => onViewProduct?.(item.productSlug)}
                                    >
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Heart size={24} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4
                                            className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                                            onClick={() => onViewProduct?.(item.productSlug)}
                                        >
                                            {item.productName}
                                        </h4>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span
                                                className="font-bold"
                                                style={{ color: primaryColor }}
                                            >
                                                {currencySymbol}{item.productPrice.toFixed(2)}
                                            </span>
                                            {item.productCompareAtPrice && item.productCompareAtPrice > item.productPrice && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    {currencySymbol}{item.productCompareAtPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-3">
                                            {onAddToCart && (
                                                <button
                                                    onClick={() => onAddToCart(item)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <ShoppingCart size={14} />
                                                    Agregar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onViewProduct?.(item.productSlug)}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                                title="Ver producto"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleRemove(item.productId)}
                                                disabled={removingId === item.productId}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                title="Eliminar"
                                            >
                                                {removingId === item.productId ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleClearAll}
                            disabled={clearing}
                            className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {clearing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Trash2 size={16} />
                            )}
                            Eliminar todos los favoritos
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default WishlistDrawer;











