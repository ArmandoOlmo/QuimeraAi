/**
 * ProductDetailPage Component
 * Página completa de detalle de producto para el storefront
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
    Heart,
    Minus,
    Plus,
    Check,
    Truck,
    Shield,
    RotateCcw,
    Share2,
    Home,
    ChevronRight as ChevronRightIcon,
    Loader2,
    AlertCircle,
    Package,
} from 'lucide-react';
import { usePublicProduct, usePublicCategory, PublicProduct, PublicProductVariant } from './hooks/usePublicProduct';
import { useStorefrontTheme } from './hooks/useStorefrontTheme';
import { useProductReviews, useSubmitReview, useMarkReviewHelpful, ReviewSortBy } from './hooks/useProductReviews';
import RelatedProducts from './RelatedProducts';
import { ReviewSummary, ReviewList, ReviewForm, RatingStars } from './reviews';

// Types
interface ProductDetailPageProps {
    storeId: string;
    productSlug: string;
    onNavigateToStore?: () => void;
    onNavigateToCategory?: (categorySlug: string) => void;
    onNavigateToProduct?: (productSlug: string) => void;
    onAddToCart?: (product: PublicProduct, quantity: number, variant?: PublicProductVariant) => void;
    onWishlist?: (product: PublicProduct) => void;
    isWishlisted?: boolean;
}

type TabType = 'description' | 'specifications' | 'shipping';

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
    storeId,
    productSlug,
    onNavigateToStore,
    onNavigateToCategory,
    onNavigateToProduct,
    onAddToCart,
    onWishlist,
    isWishlisted = false,
}) => {
    // Hooks
    const { product, relatedProducts, isLoading, error } = usePublicProduct(storeId, productSlug);
    const { category } = usePublicCategory(storeId, product?.categoryId);
    const { theme } = useStorefrontTheme(storeId);

    // State
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<PublicProductVariant | undefined>();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<TabType>('description');
    const [addedToCart, setAddedToCart] = useState(false);
    const [reviewSortBy, setReviewSortBy] = useState<ReviewSortBy>('newest');
    const [showReviewForm, setShowReviewForm] = useState(false);

    // Reviews hooks
    const {
        reviews,
        stats: reviewStats,
        isLoading: reviewsLoading,
        isLoadingMore: reviewsLoadingMore,
        hasMore: hasMoreReviews,
        loadMore: loadMoreReviews,
        refetch: refetchReviews,
    } = useProductReviews(storeId, product?.id || '', { sortBy: reviewSortBy });

    const { submitReview, isSubmitting: isSubmittingReview } = useSubmitReview(
        storeId,
        product?.id || '',
        product?.name
    );

    const { markHelpful, hasVoted } = useMarkReviewHelpful(storeId);

    // Reset state when product changes
    useEffect(() => {
        setSelectedImageIndex(0);
        setQuantity(1);
        setAddedToCart(false);
        if (product?.variants && product.variants.length > 0) {
            setSelectedVariant(product.variants[0]);
        } else {
            setSelectedVariant(undefined);
        }
    }, [product?.id]);

    // Computed values
    const images = product?.images || [];
    const hasDiscount = product?.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount
        ? Math.round(((product!.compareAtPrice! - product!.price) / product!.compareAtPrice!) * 100)
        : 0;

    const currentPrice = selectedVariant?.price || product?.price || 0;
    const inStock = selectedVariant ? selectedVariant.inStock : (product?.inStock ?? true);

    // Variant options grouped by type
    const variantOptions = useMemo(() => {
        if (!product?.variants || product.variants.length === 0) return {};

        const options: Record<string, Set<string>> = {};
        product.variants.forEach((variant) => {
            if (variant.options) {
                variant.options.forEach((opt) => {
                    if (!options[opt.name]) {
                        options[opt.name] = new Set();
                    }
                    options[opt.name].add(opt.value);
                });
            }
        });

        return Object.entries(options).reduce((acc, [name, values]) => {
            acc[name] = Array.from(values);
            return acc;
        }, {} as Record<string, string[]>);
    }, [product?.variants]);

    // Handlers
    const handlePrevImage = () => {
        setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNextImage = () => {
        setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const incrementQuantity = () => {
        setQuantity((q) => q + 1);
    };

    const decrementQuantity = () => {
        if (quantity > 1) {
            setQuantity((q) => q - 1);
        }
    };

    const handleAddToCart = () => {
        if (product && onAddToCart) {
            onAddToCart(product, quantity, selectedVariant);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        }
    };

    const handleShare = async () => {
        if (navigator.share && product) {
            try {
                await navigator.share({
                    title: product.name,
                    text: product.shortDescription || product.description,
                    url: window.location.href,
                });
            } catch (err) {
                // User cancelled or error
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 
                        className="animate-spin mx-auto mb-4" 
                        size={48} 
                        style={{ color: theme.primaryColor }} 
                    />
                    <p className="text-gray-500 dark:text-gray-400">Cargando producto...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !product) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Producto no encontrado
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {error || 'El producto que buscas no existe o ya no está disponible.'}
                    </p>
                    {onNavigateToStore && (
                        <button
                            onClick={onNavigateToStore}
                            className="px-6 py-3 rounded-lg text-white font-medium transition-colors"
                            style={{ backgroundColor: theme.primaryColor }}
                        >
                            Volver a la tienda
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Breadcrumbs */}
            <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <ol className="flex items-center gap-2 text-sm">
                        <li>
                            <button
                                onClick={onNavigateToStore}
                                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            >
                                <Home size={16} />
                                <span>Tienda</span>
                            </button>
                        </li>
                        {category && (
                            <>
                                <ChevronRightIcon className="text-gray-400" size={16} />
                                <li>
                                    <button
                                        onClick={() => onNavigateToCategory?.(category.slug)}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {category.name}
                                    </button>
                                </li>
                            </>
                        )}
                        <ChevronRightIcon className="text-gray-400" size={16} />
                        <li className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                            {product.name}
                        </li>
                    </ol>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        {/* Main Image */}
                        <div className="relative aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
                            {images.length > 0 ? (
                                <img
                                    src={images[selectedImageIndex].url}
                                    alt={images[selectedImageIndex].altText || product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    <Package size={64} />
                                </div>
                            )}

                            {/* Discount Badge */}
                            {hasDiscount && (
                                <div
                                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-sm font-bold"
                                    style={{ backgroundColor: '#ef4444' }}
                                >
                                    -{discountPercentage}% OFF
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {images.map((image, index) => (
                                    <button
                                        key={image.id}
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                            selectedImageIndex === index
                                                ? 'ring-2 ring-offset-2'
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                        style={
                                            selectedImageIndex === index
                                                ? { borderColor: theme.primaryColor, ringColor: theme.primaryColor }
                                                : {}
                                        }
                                    >
                                        <img
                                            src={image.url}
                                            alt={image.altText || `${product.name} - ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                        {/* Category */}
                        {category && (
                            <button
                                onClick={() => onNavigateToCategory?.(category.slug)}
                                className="text-sm uppercase tracking-wide font-medium hover:underline"
                                style={{ color: theme.primaryColor }}
                            >
                                {category.name}
                            </button>
                        )}

                        {/* Title */}
                        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                            {product.name}
                        </h1>

                        {/* Rating */}
                        <div className="flex items-center gap-2">
                            <RatingStars 
                                rating={reviewStats?.averageRating || 0} 
                                size="md" 
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {reviewStats && reviewStats.totalReviews > 0 ? (
                                    <button 
                                        onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="hover:underline"
                                    >
                                        ({reviewStats.totalReviews} reseña{reviewStats.totalReviews !== 1 ? 's' : ''})
                                    </button>
                                ) : (
                                    '(Sin reseñas aún)'
                                )}
                            </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <span 
                                className="text-4xl font-bold"
                                style={{ color: theme.primaryColor }}
                            >
                                {theme.currencySymbol}{currentPrice.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span className="text-xl text-gray-400 line-through">
                                    {theme.currencySymbol}{product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Short Description */}
                        {product.shortDescription && (
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {product.shortDescription}
                            </p>
                        )}

                        {/* Stock Status */}
                        <div className="flex items-center gap-2">
                            {inStock ? (
                                <>
                                    <Check className="text-green-500" size={20} />
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                        En stock
                                        {product.lowStock && (
                                            <span className="text-orange-500 ml-2">
                                                - ¡Últimas unidades!
                                            </span>
                                        )}
                                    </span>
                                </>
                            ) : (
                                <span className="text-red-500 font-medium">Agotado</span>
                            )}
                        </div>

                        {/* Variant Options */}
                        {Object.entries(variantOptions).map(([optionName, values]) => (
                            <div key={optionName}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {optionName}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {values.map((value) => {
                                        const isSelected = selectedVariant?.options?.some(
                                            (o) => o.name === optionName && o.value === value
                                        );
                                        return (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    const variant = product.variants?.find((v) =>
                                                        v.options?.some((o) => o.name === optionName && o.value === value)
                                                    );
                                                    if (variant) setSelectedVariant(variant);
                                                }}
                                                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                                                    isSelected
                                                        ? 'text-white'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                                }`}
                                                style={isSelected ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor } : {}}
                                            >
                                                {value}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Quantity Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                Cantidad
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
                                    <button
                                        onClick={decrementQuantity}
                                        disabled={quantity <= 1}
                                        className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors rounded-l-lg"
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span className="w-14 text-center text-lg font-bold text-gray-900 dark:text-white">
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={incrementQuantity}
                                        className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-r-lg"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={handleAddToCart}
                                disabled={!inStock}
                                className={`flex-1 py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                                    addedToCart ? 'bg-green-500' : ''
                                }`}
                                style={!addedToCart ? { backgroundColor: theme.primaryColor } : {}}
                            >
                                {addedToCart ? (
                                    <>
                                        <Check size={24} />
                                        ¡Agregado!
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={24} />
                                        Agregar al carrito
                                    </>
                                )}
                            </button>
                            {onWishlist && (
                                <button
                                    onClick={() => onWishlist(product)}
                                    className={`p-4 rounded-xl border-2 transition-colors ${
                                        isWishlisted
                                            ? 'bg-red-50 dark:bg-red-500/10 border-red-500 text-red-500'
                                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-500 hover:text-red-500'
                                    }`}
                                >
                                    <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
                                </button>
                            )}
                            <button
                                onClick={handleShare}
                                className="p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                            >
                                <Share2 size={24} />
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                                <Truck className="mx-auto text-gray-400 mb-2" size={28} />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Envío rápido
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    3-5 días hábiles
                                </p>
                            </div>
                            <div className="text-center">
                                <Shield className="mx-auto text-gray-400 mb-2" size={28} />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Pago seguro
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Encriptación SSL
                                </p>
                            </div>
                            <div className="text-center">
                                <RotateCcw className="mx-auto text-gray-400 mb-2" size={28} />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    Devolución fácil
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    30 días garantía
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <div className="mt-16">
                    {/* Tab Headers */}
                    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
                        {[
                            { id: 'description' as TabType, label: 'Descripción' },
                            { id: 'specifications' as TabType, label: 'Especificaciones' },
                            { id: 'shipping' as TabType, label: 'Envío' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                                    activeTab === tab.id
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-0.5"
                                        style={{ backgroundColor: theme.primaryColor }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="py-8">
                        {activeTab === 'description' && (
                            <div className="prose prose-gray dark:prose-invert max-w-none">
                                {product.description ? (
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                        {product.description}
                                    </p>
                                ) : (
                                    <p className="text-gray-400 dark:text-gray-500 italic">
                                        No hay descripción disponible.
                                    </p>
                                )}
                            </div>
                        )}

                        {activeTab === 'specifications' && (
                            <div className="space-y-4">
                                {product.tags && product.tags.length > 0 ? (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {product.tags.map((tag, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                            >
                                                <Check 
                                                    size={18} 
                                                    style={{ color: theme.primaryColor }} 
                                                />
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {tag}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 dark:text-gray-500 italic">
                                        No hay especificaciones disponibles.
                                    </p>
                                )}
                            </div>
                        )}

                        {activeTab === 'shipping' && (
                            <div className="space-y-6">
                                <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                                    <Truck className="text-blue-500 flex-shrink-0 mt-0.5" size={24} />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                            Envío estándar
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Entrega en 3-5 días hábiles. El costo de envío se calcula en el checkout según tu ubicación.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                                    <RotateCcw className="text-green-500 flex-shrink-0 mt-0.5" size={24} />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                            Política de devolución
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Tienes 30 días para devolver el producto si no estás satisfecho. El producto debe estar sin usar y en su empaque original.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews Section */}
                <section id="reviews-section" className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                        Opiniones de clientes
                    </h2>

                    {/* Review Summary */}
                    <ReviewSummary
                        stats={reviewStats}
                        onWriteReview={() => setShowReviewForm(true)}
                        primaryColor={theme.primaryColor}
                    />

                    {/* Reviews List */}
                    <div className="mt-8">
                        <ReviewList
                            reviews={reviews}
                            isLoading={reviewsLoading}
                            isLoadingMore={reviewsLoadingMore}
                            hasMore={hasMoreReviews}
                            sortBy={reviewSortBy}
                            onSortChange={setReviewSortBy}
                            onLoadMore={loadMoreReviews}
                            onMarkHelpful={markHelpful}
                            hasVoted={hasVoted}
                            primaryColor={theme.primaryColor}
                        />
                    </div>
                </section>

                {/* Review Form Modal */}
                <ReviewForm
                    productName={product.name}
                    isOpen={showReviewForm}
                    onClose={() => setShowReviewForm(false)}
                    onSubmit={async (data) => {
                        const result = await submitReview(data);
                        if (result.success) {
                            // Refetch reviews after successful submission
                            setTimeout(() => refetchReviews(), 1000);
                        }
                        return result;
                    }}
                    primaryColor={theme.primaryColor}
                />

                {/* Related Products */}
                <RelatedProducts
                    products={relatedProducts}
                    onProductClick={(slug) => onNavigateToProduct?.(slug)}
                    onAddToCart={onAddToCart ? (p) => onAddToCart(p, 1) : undefined}
                    currencySymbol={theme.currencySymbol}
                    primaryColor={theme.primaryColor}
                />
            </div>
        </div>
    );
};

export default ProductDetailPage;
