/**
 * ProductQuickView
 * Modal de vista rápida de producto para el storefront
 */

import React, { useState } from 'react';
import {
    X,
    ShoppingCart,
    Heart,
    Minus,
    Plus,
    ChevronLeft,
    ChevronRight,
    Star,
    Check,
    Truck,
    Shield,
    RotateCcw,
} from 'lucide-react';
import { Product, ProductVariant } from '../../types/ecommerce';

interface ProductQuickViewProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product, quantity: number, variant?: ProductVariant) => void;
    onWishlist?: (productId: string) => void;
    isWishlisted?: boolean;
    currencySymbol?: string;
    primaryColor?: string;
}

const ProductQuickView: React.FC<ProductQuickViewProps> = ({
    product,
    isOpen,
    onClose,
    onAddToCart,
    onWishlist,
    isWishlisted = false,
    currencySymbol = '$',
    primaryColor = '#6366f1',
}) => {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
        product.variants?.[0]
    );
    const [quantity, setQuantity] = useState(1);

    const images = product.images || [];
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
        : 0;

    const currentPrice = selectedVariant?.price || product.price;
    const inStock = product.trackInventory ? product.quantity > 0 : true;

    const handlePrevImage = () => {
        setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNextImage = () => {
        setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const handleAddToCart = () => {
        onAddToCart(product, quantity, selectedVariant);
        onClose();
    };

    const incrementQuantity = () => {
        const maxQty = product.trackInventory ? product.quantity : 99;
        if (quantity < maxQty) {
            setQuantity((q) => q + 1);
        }
    };

    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity((q) => q - 1);
        }
    };

    // Group variants by option type (e.g., size, color)
    const variantOptions = React.useMemo(() => {
        if (!product.variants || product.variants.length === 0) return {};

        const options: Record<string, Set<string>> = {};
        product.variants.forEach((variant) => {
            if (variant.options) {
                // Handle both array and object formats
                const optEntries = Array.isArray(variant.options)
                    ? variant.options.map((opt: { name: string; value: string }) => [opt.name, opt.value] as const)
                    : Object.entries(variant.options);
                
                optEntries.forEach(([name, value]) => {
                    if (!options[name]) {
                        options[name] = new Set();
                    }
                    options[name].add(value);
                });
            }
        });

        return Object.entries(options).reduce((acc, [name, values]) => {
            acc[name] = Array.from(values);
            return acc;
        }, {} as Record<string, string[]>);
    }, [product.variants]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
                    {/* Image Gallery */}
                    <div className="md:w-1/2 relative bg-gray-100 dark:bg-gray-800">
                        {/* Main Image */}
                        <div className="relative aspect-square">
                            {images.length > 0 ? (
                                <img
                                    src={images[selectedImageIndex].url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    Sin imagen
                                </div>
                            )}

                            {/* Discount Badge */}
                            {hasDiscount && (
                                <div
                                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-bold"
                                    style={{ backgroundColor: '#ef4444' }}
                                >
                                    -{discountPercentage}%
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2 p-4 overflow-x-auto">
                                {images.map((image, index) => (
                                    <button
                                        key={image.id}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                            selectedImageIndex === index
                                                ? ''
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                        style={selectedImageIndex === index ? { borderColor: primaryColor } : {}}
                                    >
                                        <img
                                            src={image.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="md:w-1/2 p-6 md:overflow-y-auto flex flex-col">
                        {/* Category */}
                        {product.categoryId && (
                            <p className="text-sm uppercase tracking-wide mb-2" style={{ color: primaryColor }}>
                                Categoría
                            </p>
                        )}

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {product.name}
                        </h2>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        className="text-yellow-400"
                                        fill="currentColor"
                                    />
                                ))}
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                (0 reseñas)
                            </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-3 mb-4">
                            <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                                {currencySymbol}{currentPrice.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-lg text-gray-400 line-through">
                                    {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Stock Status */}
                        <div className="flex items-center gap-2 mb-4">
                            {inStock ? (
                                <>
                                    <Check className="text-green-500" size={18} />
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                        En stock
                                        {product.trackInventory && product.quantity <= 5 && (
                                            <span className="text-orange-500 ml-2">
                                                (Solo quedan {product.quantity})
                                            </span>
                                        )}
                                    </span>
                                </>
                            ) : (
                                <span className="text-red-500 font-medium">Agotado</span>
                            )}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-4">
                                {product.description}
                            </p>
                        )}

                        {/* Variant Options */}
                        {Object.entries(variantOptions).map(([optionName, values]) => (
                            <div key={optionName} className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {optionName}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {values.map((value) => {
                                        // Check if this option is selected (works with both array and object formats)
                                        const isSelected = selectedVariant?.options 
                                            ? (Array.isArray(selectedVariant.options)
                                                ? selectedVariant.options.some((o: { name: string; value: string }) => o.name === optionName && o.value === value)
                                                : selectedVariant.options[optionName] === value)
                                            : false;
                                        return (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    const variant = product.variants?.find((v) =>
                                                        v.options 
                                                            ? (Array.isArray(v.options)
                                                                ? v.options.some((o: { name: string; value: string }) => o.name === optionName && o.value === value)
                                                                : v.options[optionName] === value)
                                                            : false
                                                    );
                                                    if (variant) setSelectedVariant(variant);
                                                }}
                                                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                                                    isSelected
                                                        ? 'text-white'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                                                }`}
                                                style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                                            >
                                                {value}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Quantity */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cantidad
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={decrementQuantity}
                                    disabled={quantity <= 1}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    <Minus size={20} />
                                </button>
                                <span className="w-12 text-center text-lg font-bold text-gray-900 dark:text-white">
                                    {quantity}
                                </span>
                                <button
                                    onClick={incrementQuantity}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={handleAddToCart}
                                disabled={!inStock}
                                className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ShoppingCart size={20} />
                                Agregar al carrito
                            </button>
                            {onWishlist && (
                                <button
                                    onClick={() => onWishlist(product.id)}
                                    className={`p-3 rounded-xl border-2 transition-colors ${
                                        isWishlisted
                                            ? 'bg-red-50 dark:bg-red-500/10 border-red-500 text-red-500'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-500'
                                    }`}
                                >
                                    <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
                                </button>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                                <Truck className="mx-auto text-gray-400 mb-1" size={24} />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Envío rápido
                                </p>
                            </div>
                            <div className="text-center">
                                <Shield className="mx-auto text-gray-400 mb-1" size={24} />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Pago seguro
                                </p>
                            </div>
                            <div className="text-center">
                                <RotateCcw className="mx-auto text-gray-400 mb-1" size={24} />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Devolución fácil
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProductQuickView;



