/**
 * StorefrontCategory - Category page for the storefront
 * 
 * Displays products filtered by category.
 */

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ShoppingBag, ChevronLeft, Filter, Loader2 } from 'lucide-react';

interface StorefrontCategoryProps {
    storeId: string;
    categorySlug: string;
    onNavigateHome: () => void;
    onNavigateToProduct: (slug: string) => void;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    category?: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
}

const StorefrontCategory: React.FC<StorefrontCategoryProps> = ({
    storeId,
    categorySlug,
    onNavigateHome,
    onNavigateToProduct
}) => {
    const [category, setCategory] = useState<Category | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Find category by slug
                const categoriesRef = collection(db, 'publicStores', storeId, 'categories');
                const categoryQuery = query(categoriesRef, where('slug', '==', categorySlug));
                const categorySnapshot = await getDocs(categoryQuery);
                
                if (!categorySnapshot.empty) {
                    const categoryData = {
                        id: categorySnapshot.docs[0].id,
                        ...categorySnapshot.docs[0].data()
                    } as Category;
                    setCategory(categoryData);

                    // Fetch products in this category
                    const productsRef = collection(db, 'publicStores', storeId, 'products');
                    const productsQuery = query(
                        productsRef,
                        where('category', '==', categoryData.id),
                        where('status', '==', 'active')
                    );
                    const productsSnapshot = await getDocs(productsQuery);
                    const productsList = productsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Product[];
                    setProducts(productsList);
                }
            } catch (error) {
                console.error('Error fetching category data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [storeId, categorySlug]);

    // Sort products
    const sortedProducts = [...products].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            default:
                return 0; // Keep original order for newest
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Categoría no encontrada</h2>
                <p className="text-gray-500 mb-4">La categoría que buscas no existe.</p>
                <button
                    onClick={onNavigateHome}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Category Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <button
                        onClick={onNavigateHome}
                        className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
                    >
                        <ChevronLeft size={20} />
                        <span>Volver</span>
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                                {category.name}
                            </h1>
                            {category.description && (
                                <p className="text-gray-500 mt-1">{category.description}</p>
                            )}
                            <p className="text-sm text-gray-400 mt-1">
                                {products.length} producto{products.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        
                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="newest">Más recientes</option>
                                <option value="price-asc">Precio: Menor a mayor</option>
                                <option value="price-desc">Precio: Mayor a menor</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {sortedProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No hay productos en esta categoría</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {sortedProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onClick={() => onNavigateToProduct(product.slug)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Product Card
const ProductCard: React.FC<{
    product: Product;
    onClick: () => void;
}> = ({ product, onClick }) => {
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
                    <span className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded bg-red-500">
                        -{discountPercent}%
                    </span>
                )}
            </div>
            <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600">
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

export default StorefrontCategory;











