/**
 * StorefrontHome - Homepage for the storefront
 * 
 * Displays featured products, categories, and promotional sections.
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';

interface StorefrontHomeProps {
    storeId: string;
    projectData?: any;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    category?: string;
    featured?: boolean;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    image?: string;
    productCount?: number;
}

const StorefrontHome: React.FC<StorefrontHomeProps> = ({
    storeId,
    projectData,
    onNavigateToProduct,
    onNavigateToCategory
}) => {
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get theme colors
    const primaryColor = projectData?.theme?.globalColors?.primary || '#4f46e5';
    const backgroundColor = projectData?.theme?.pageBackground || '#ffffff';

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch featured products
                const productsRef = collection(db, 'publicStores', storeId, 'products');
                const featuredQuery = query(
                    productsRef,
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc'),
                    limit(8)
                );
                const productsSnapshot = await getDocs(featuredQuery);
                const products = productsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];
                setFeaturedProducts(products);

                // Fetch categories
                const categoriesRef = collection(db, 'publicStores', storeId, 'categories');
                const categoriesSnapshot = await getDocs(categoriesRef);
                const cats = categoriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Category[];
                setCategories(cats);

            } catch (error) {
                console.error('Error fetching storefront data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [storeId]);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    return (
        <div style={{ backgroundColor }}>
            {/* Hero Section */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: projectData?.theme?.headingColor || '#1f2937' }}>
                        {projectData?.data?.hero?.headline || `Bienvenido a ${projectData?.name || 'Nuestra Tienda'}`}
                    </h1>
                    <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8" style={{ color: projectData?.theme?.textColor || '#6b7280' }}>
                        {projectData?.data?.hero?.subheadline || 'Descubre nuestra colección de productos'}
                    </p>
                    <button
                        onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-8 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Ver Productos
                    </button>
                </div>
            </section>

            {/* Categories Section */}
            {categories.length > 0 && (
                <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: projectData?.theme?.headingColor || '#1f2937' }}>
                            Categorías
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {categories.slice(0, 4).map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => onNavigateToCategory(category.slug)}
                                    className="group relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {category.image ? (
                                        <img
                                            src={category.image}
                                            alt={category.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                            <ShoppingBag className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                                        <span className="text-white font-semibold">{category.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Products */}
            <section id="products" className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold" style={{ color: projectData?.theme?.headingColor || '#1f2937' }}>
                            Productos Destacados
                        </h2>
                        <button 
                            className="flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all"
                            style={{ color: primaryColor }}
                        >
                            Ver todos <ArrowRight size={16} />
                        </button>
                    </div>

                    {featuredProducts.length === 0 ? (
                        <div className="text-center py-20">
                            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500">No hay productos disponibles aún</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {featuredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    primaryColor={primaryColor}
                                    onClick={() => onNavigateToProduct(product.slug)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

// Product Card Component
const ProductCard: React.FC<{
    product: Product;
    primaryColor: string;
    onClick: () => void;
}> = ({ product, primaryColor, onClick }) => {
    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercent = hasDiscount
        ? Math.round((1 - product.price / product.compareAtPrice!) * 100)
        : 0;

    return (
        <button
            onClick={onClick}
            className="group text-left bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
        >
            <div className="aspect-square relative overflow-hidden bg-gray-100">
                {product.images?.[0] ? (
                    <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-gray-300" />
                    </div>
                )}
                {hasDiscount && (
                    <span 
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded"
                        style={{ backgroundColor: primaryColor }}
                    >
                        -{discountPercent}%
                    </span>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-opacity-80">
                    {product.name}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: primaryColor }}>
                        ${product.price.toLocaleString()}
                    </span>
                    {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                            ${product.compareAtPrice!.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

export default StorefrontHome;





