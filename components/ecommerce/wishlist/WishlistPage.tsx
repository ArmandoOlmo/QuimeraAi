/**
 * WishlistPage Component
 * Página completa de la lista de deseos
 */

import React from 'react';
import {
    Heart,
    ShoppingCart,
    Trash2,
    ArrowLeft,
    Loader2,
    Package,
} from 'lucide-react';
import { WishlistItem } from '../hooks/useWishlist';

interface WishlistPageProps {
    items: WishlistItem[];
    isLoading: boolean;
    onRemove: (productId: string) => Promise<void>;
    onAddToCart?: (item: WishlistItem) => void;
    onViewProduct?: (slug: string) => void;
    onClearAll: () => Promise<void>;
    onBack?: () => void;
    currencySymbol?: string;
    primaryColor?: string;
}

const WishlistPage: React.FC<WishlistPageProps> = ({
    items,
    isLoading,
    onRemove,
    onAddToCart,
    onViewProduct,
    onClearAll,
    onBack,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    const [removingId, setRemovingId] = React.useState<string | null>(null);
    const [addingToCartId, setAddingToCartId] = React.useState<string | null>(null);

    const handleRemove = async (productId: string) => {
        setRemovingId(productId);
        await onRemove(productId);
        setRemovingId(null);
    };

    const handleAddToCart = async (item: WishlistItem) => {
        if (!onAddToCart) return;
        setAddingToCartId(item.productId);
        onAddToCart(item);
        setTimeout(() => setAddingToCartId(null), 1000);
    };

    const handleAddAllToCart = () => {
        if (!onAddToCart) return;
        items.forEach((item) => onAddToCart(item));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2
                    className="animate-spin"
                    size={48}
                    style={{ color: primaryColor }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <Heart style={{ color: primaryColor }} />
                                    Mis Favoritos
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    {items.length} producto{items.length !== 1 ? 's' : ''} guardado{items.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {items.length > 0 && onAddToCart && (
                            <button
                                onClick={handleAddAllToCart}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ShoppingCart size={20} />
                                Agregar todos al carrito
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <Heart className="mx-auto text-gray-300 dark:text-gray-600 mb-6" size={80} />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            Tu lista de favoritos está vacía
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                            Explora nuestros productos y guarda los que más te gusten para encontrarlos fácilmente después.
                        </p>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-6 py-3 text-white rounded-lg transition-colors"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Explorar productos
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile: Add all to cart */}
                        {onAddToCart && (
                            <button
                                onClick={handleAddAllToCart}
                                className="sm:hidden w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition-colors"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ShoppingCart size={20} />
                                Agregar todos al carrito
                            </button>
                        )}

                        {/* Product Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 group"
                                >
                                    {/* Image */}
                                    <div
                                        className="relative aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer overflow-hidden"
                                        onClick={() => onViewProduct?.(item.productSlug)}
                                    >
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package size={48} />
                                            </div>
                                        )}

                                        {/* Discount Badge */}
                                        {item.productCompareAtPrice && item.productCompareAtPrice > item.productPrice && (
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                                -{Math.round(
                                                    ((item.productCompareAtPrice - item.productPrice) /
                                                        item.productCompareAtPrice) *
                                                        100
                                                )}%
                                            </div>
                                        )}

                                        {/* Remove Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemove(item.productId);
                                            }}
                                            disabled={removingId === item.productId}
                                            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 text-red-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                        >
                                            {removingId === item.productId ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3
                                            className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:underline"
                                            onClick={() => onViewProduct?.(item.productSlug)}
                                        >
                                            {item.productName}
                                        </h3>

                                        <div className="flex items-baseline gap-2 mt-2">
                                            <span
                                                className="text-lg font-bold"
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

                                        {onAddToCart && (
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                disabled={addingToCartId === item.productId}
                                                className="w-full mt-4 py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {addingToCartId === item.productId ? (
                                                    <>
                                                        <Loader2 size={18} className="animate-spin" />
                                                        Agregando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart size={18} />
                                                        Agregar al carrito
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Clear All */}
                        <div className="mt-8 text-center">
                            <button
                                onClick={onClearAll}
                                className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <Trash2 size={18} />
                                Vaciar lista de favoritos
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;











