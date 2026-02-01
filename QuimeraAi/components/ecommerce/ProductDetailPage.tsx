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
import { useUnifiedStorefrontColors, ComponentColors } from './hooks/useUnifiedStorefrontColors';
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
    /** Optional colors from Web Editor - uses unified colors system */
    colors?: ComponentColors;
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
    colors: componentColors,
}) => {
    // Hooks
    const { product, relatedProducts, isLoading, error } = usePublicProduct(storeId, productSlug);
    const { category } = usePublicCategory(storeId, product?.categoryId);
    // Unified colors system - uses component colors from Web Editor if provided
    const colors = useUnifiedStorefrontColors(storeId, componentColors);
    
    // Currency symbol (default to $, can be overridden via props in the future)
    const currencySymbol = '$';

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
            <div 
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: colors?.background }}
            >
                <div className="text-center">
                    <Loader2 
                        className="animate-spin mx-auto mb-4" 
                        size={48} 
                        style={{ color: colors?.primary }} 
                    />
                    <p style={{ color: colors?.mutedText }}>Cargando producto...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !product) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: colors?.background }}
            >
                <div className="text-center max-w-md mx-auto px-4">
                    <AlertCircle className="mx-auto mb-4" size={48} style={{ color: colors?.error }} />
                    <h1 
                        className="text-2xl font-bold mb-2"
                        style={{ color: colors?.heading }}
                    >
                        Producto no encontrado
                    </h1>
                    <p className="mb-6" style={{ color: colors?.mutedText }}>
                        {error || 'El producto que buscas no existe o ya no está disponible.'}
                    </p>
                    {onNavigateToStore && (
                        <button
                            onClick={onNavigateToStore}
                            className="px-6 py-3 rounded-lg font-medium transition-colors"
                            style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonText }}
                        >
                            Volver a la tienda
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: colors?.background }}>
            {/* Breadcrumbs */}
            <nav 
                className="border-b"
                style={{ backgroundColor: colors?.cardBackground, borderColor: colors?.border }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <ol className="flex items-center gap-2 text-sm">
                        <li>
                            <button
                                onClick={onNavigateToStore}
                                className="flex items-center gap-1 transition-colors hover:opacity-80"
                                style={{ color: colors?.mutedText }}
                            >
                                <Home size={16} />
                                <span>Tienda</span>
                            </button>
                        </li>
                        {category && (
                            <>
                                <ChevronRightIcon style={{ color: colors?.mutedText }} size={16} />
                                <li>
                                    <button
                                        onClick={() => onNavigateToCategory?.(category.slug)}
                                        className="transition-colors hover:opacity-80"
                                        style={{ color: colors?.mutedText }}
                                    >
                                        {category.name}
                                    </button>
                                </li>
                            </>
                        )}
                        <ChevronRightIcon style={{ color: colors?.mutedText }} size={16} />
                        <li 
                            className="font-medium truncate max-w-[200px]"
                            style={{ color: colors?.heading }}
                        >
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
                        <div 
                            className="relative aspect-square rounded-2xl overflow-hidden shadow-sm"
                            style={{ backgroundColor: colors?.cardBackground }}
                        >
                            {images.length > 0 ? (
                                <img
                                    src={images[selectedImageIndex].url}
                                    alt={images[selectedImageIndex].altText || product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div 
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ color: colors?.mutedText }}
                                >
                                    <Package size={64} />
                                </div>
                            )}

                            {/* Discount Badge */}
                            {hasDiscount && (
                                <div
                                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold"
                                    style={{ backgroundColor: colors?.badgeBackground, color: colors?.badgeText }}
                                >
                                    -{discountPercentage}% OFF
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 backdrop-blur-sm rounded-full shadow-md transition-colors hover:opacity-80"
                                        style={{ backgroundColor: `${colors?.cardBackground}e6`, color: colors?.text }}
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={handleNextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 backdrop-blur-sm rounded-full shadow-md transition-colors hover:opacity-80"
                                        style={{ backgroundColor: `${colors?.cardBackground}e6`, color: colors?.text }}
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
                                                ? { borderColor: colors?.primary, outlineColor: colors?.primary }
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
                                style={{ color: colors?.primary }}
                            >
                                {category.name}
                            </button>
                        )}

                        {/* Title */}
                        <h1 
                            className="text-3xl lg:text-4xl font-bold"
                            style={{ color: colors?.heading }}
                        >
                            {product.name}
                        </h1>

                        {/* Rating */}
                        <div className="flex items-center gap-2">
                            <RatingStars 
                                rating={reviewStats?.averageRating || 0} 
                                size="md" 
                            />
                            <span className="text-sm" style={{ color: colors?.mutedText }}>
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
                                style={{ color: colors?.price }}
                            >
                                {currencySymbol}{currentPrice.toFixed(2)}
                            </span>
                            {hasDiscount && (
                                <span 
                                    className="text-xl line-through"
                                    style={{ color: colors?.originalPrice }}
                                >
                                    {currencySymbol}{product.compareAtPrice!.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Short Description */}
                        {product.shortDescription && (
                            <p className="text-lg" style={{ color: colors?.text }}>
                                {product.shortDescription}
                            </p>
                        )}

                        {/* Stock Status */}
                        <div className="flex items-center gap-2">
                            {inStock ? (
                                <>
                                    <Check style={{ color: colors?.success }} size={20} />
                                    <span className="font-medium" style={{ color: colors?.success }}>
                                        En stock
                                        {product.lowStock && (
                                            <span className="ml-2" style={{ color: colors?.warning }}>
                                                - ¡Últimas unidades!
                                            </span>
                                        )}
                                    </span>
                                </>
                            ) : (
                                <span className="font-medium" style={{ color: colors?.error }}>Agotado</span>
                            )}
                        </div>

                        {/* Variant Options */}
                        {Object.entries(variantOptions).map(([optionName, values]) => (
                            <div key={optionName}>
                                <label 
                                    className="block text-sm font-medium mb-3"
                                    style={{ color: colors?.text }}
                                >
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
                                                className="px-4 py-2 rounded-lg border-2 font-medium transition-all"
                                                style={isSelected 
                                                    ? { backgroundColor: colors?.buttonBackground, borderColor: colors?.buttonBackground, color: colors?.buttonText } 
                                                    : { borderColor: colors?.border, color: colors?.text }
                                                }
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
                            <label 
                                className="block text-sm font-medium mb-3"
                                style={{ color: colors?.text }}
                            >
                                Cantidad
                            </label>
                            <div className="flex items-center gap-4">
                                <div 
                                    className="flex items-center border rounded-lg"
                                    style={{ borderColor: colors?.border }}
                                >
                                    <button
                                        onClick={decrementQuantity}
                                        disabled={quantity <= 1}
                                        className="p-3 disabled:opacity-50 transition-colors rounded-l-lg hover:opacity-80"
                                        style={{ color: colors?.text }}
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span 
                                        className="w-14 text-center text-lg font-bold"
                                        style={{ color: colors?.heading }}
                                    >
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={incrementQuantity}
                                        className="p-3 transition-colors rounded-r-lg hover:opacity-80"
                                        style={{ color: colors?.text }}
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
                                className="flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                style={!addedToCart 
                                    ? { backgroundColor: colors?.buttonBackground, color: colors?.buttonText } 
                                    : { backgroundColor: colors?.success, color: '#ffffff' }
                                }
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
                                    className="p-4 rounded-xl border-2 transition-colors"
                                    style={isWishlisted 
                                        ? { backgroundColor: `${colors?.error}10`, borderColor: colors?.error, color: colors?.error }
                                        : { borderColor: colors?.border, color: colors?.text }
                                    }
                                >
                                    <Heart size={24} fill={isWishlisted ? 'currentColor' : 'none'} />
                                </button>
                            )}
                            <button
                                onClick={handleShare}
                                className="p-4 rounded-xl border-2 transition-colors hover:opacity-80"
                                style={{ borderColor: colors?.border, color: colors?.text }}
                            >
                                <Share2 size={24} />
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div 
                            className="grid grid-cols-3 gap-4 pt-6 border-t"
                            style={{ borderColor: colors?.border }}
                        >
                            <div className="text-center">
                                <Truck className="mx-auto mb-2" size={28} style={{ color: colors?.accent }} />
                                <p className="text-sm font-medium" style={{ color: colors?.heading }}>
                                    Envío rápido
                                </p>
                                <p className="text-xs" style={{ color: colors?.mutedText }}>
                                    3-5 días hábiles
                                </p>
                            </div>
                            <div className="text-center">
                                <Shield className="mx-auto mb-2" size={28} style={{ color: colors?.accent }} />
                                <p className="text-sm font-medium" style={{ color: colors?.heading }}>
                                    Pago seguro
                                </p>
                                <p className="text-xs" style={{ color: colors?.mutedText }}>
                                    Encriptación SSL
                                </p>
                            </div>
                            <div className="text-center">
                                <RotateCcw className="mx-auto mb-2" size={28} style={{ color: colors?.accent }} />
                                <p className="text-sm font-medium" style={{ color: colors?.heading }}>
                                    Devolución fácil
                                </p>
                                <p className="text-xs" style={{ color: colors?.mutedText }}>
                                    30 días garantía
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <div className="mt-16">
                    {/* Tab Headers */}
                    <div 
                        className="flex gap-1 border-b"
                        style={{ borderColor: colors?.border }}
                    >
                        {[
                            { id: 'description' as TabType, label: 'Descripción' },
                            { id: 'specifications' as TabType, label: 'Especificaciones' },
                            { id: 'shipping' as TabType, label: 'Envío' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="px-6 py-3 font-medium text-sm transition-colors relative"
                                style={{ color: activeTab === tab.id ? colors?.heading : colors?.mutedText }}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-0.5"
                                        style={{ backgroundColor: colors?.accent }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="py-8">
                        {activeTab === 'description' && (
                            <div className="max-w-none">
                                {product.description ? (
                                    <p 
                                        className="whitespace-pre-line leading-relaxed"
                                        style={{ color: colors?.text }}
                                    >
                                        {product.description}
                                    </p>
                                ) : (
                                    <p className="italic" style={{ color: colors?.mutedText }}>
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
                                                className="flex items-center gap-3 p-3 rounded-lg"
                                                style={{ backgroundColor: colors?.cardBackground }}
                                            >
                                                <Check 
                                                    size={18} 
                                                    style={{ color: colors?.accent }} 
                                                />
                                                <span style={{ color: colors?.text }}>
                                                    {tag}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="italic" style={{ color: colors?.mutedText }}>
                                        No hay especificaciones disponibles.
                                    </p>
                                )}
                            </div>
                        )}

                        {activeTab === 'shipping' && (
                            <div className="space-y-6">
                                <div 
                                    className="flex items-start gap-4 p-4 border rounded-lg"
                                    style={{ backgroundColor: `${colors?.info}10`, borderColor: `${colors?.info}30` }}
                                >
                                    <Truck className="flex-shrink-0 mt-0.5" size={24} style={{ color: colors?.info }} />
                                    <div>
                                        <h4 className="font-medium mb-1" style={{ color: colors?.heading }}>
                                            Envío estándar
                                        </h4>
                                        <p className="text-sm" style={{ color: colors?.text }}>
                                            Entrega en 3-5 días hábiles. El costo de envío se calcula en el checkout según tu ubicación.
                                        </p>
                                    </div>
                                </div>
                                <div 
                                    className="flex items-start gap-4 p-4 border rounded-lg"
                                    style={{ backgroundColor: `${colors?.success}10`, borderColor: `${colors?.success}30` }}
                                >
                                    <RotateCcw className="flex-shrink-0 mt-0.5" size={24} style={{ color: colors?.success }} />
                                    <div>
                                        <h4 className="font-medium mb-1" style={{ color: colors?.heading }}>
                                            Política de devolución
                                        </h4>
                                        <p className="text-sm" style={{ color: colors?.text }}>
                                            Tienes 30 días para devolver el producto si no estás satisfecho. El producto debe estar sin usar y en su empaque original.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews Section */}
                <section 
                    id="reviews-section" 
                    className="mt-16 pt-12 border-t"
                    style={{ borderColor: colors?.border }}
                >
                    <h2 
                        className="text-2xl font-bold mb-8"
                        style={{ color: colors?.heading }}
                    >
                        Opiniones de clientes
                    </h2>

                    {/* Review Summary */}
                    <ReviewSummary
                        stats={reviewStats}
                        onWriteReview={() => setShowReviewForm(true)}
                        colors={{
                            primary: colors?.primary,
                            heading: colors?.heading,
                            text: colors?.text,
                            mutedText: colors?.mutedText,
                            cardBackground: colors?.cardBackground,
                            border: colors?.border,
                            buttonBackground: colors?.buttonBackground,
                            buttonText: colors?.buttonText,
                            starColor: '#facc15', // Yellow for stars
                            starEmptyColor: colors?.border,
                            progressBackground: colors?.border,
                            verifiedColor: colors?.success,
                        }}
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
                            colors={{
                                primary: colors?.primary,
                                heading: colors?.heading,
                                text: colors?.text,
                                mutedText: colors?.mutedText,
                                cardBackground: colors?.cardBackground,
                                border: colors?.border,
                                starColor: '#facc15',
                                verifiedColor: colors?.success,
                            }}
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
                    colors={{
                        primary: colors?.primary,
                        heading: colors?.heading,
                        text: colors?.text,
                        mutedText: colors?.mutedText,
                        cardBackground: colors?.cardBackground,
                        border: colors?.border,
                        buttonBackground: colors?.buttonBackground,
                        buttonText: colors?.buttonText,
                        starColor: '#facc15',
                    }}
                />

                {/* Related Products */}
                <RelatedProducts
                    products={relatedProducts}
                    onProductClick={(slug) => onNavigateToProduct?.(slug)}
                    onAddToCart={onAddToCart ? (p) => onAddToCart(p, 1) : undefined}
                    currencySymbol={currencySymbol}
                    colors={{
                        primary: colors?.primary,
                        heading: colors?.heading,
                        text: colors?.text,
                        mutedText: colors?.mutedText,
                        cardBackground: colors?.cardBackground,
                        border: colors?.border,
                        badgeBackground: colors?.badgeBackground,
                        badgeText: colors?.badgeText,
                        buttonBackground: colors?.buttonBackground,
                        buttonText: colors?.buttonText,
                        salePrice: colors?.salePrice,
                        originalPrice: colors?.originalPrice,
                        warning: colors?.warning,
                    }}
                />
            </div>
        </div>
    );
};

export default ProductDetailPage;
