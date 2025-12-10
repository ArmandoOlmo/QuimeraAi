/**
 * GlobalSearch Component
 * Buscador global que busca en productos de ecommerce y contenido de la web
 * Muestra resultados en un dropdown mientras el usuario escribe
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Loader2, ShoppingBag, FileText, Tag, ArrowRight } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    category?: string;
}

interface ContentResult {
    id: string;
    type: 'section' | 'page' | 'article';
    title: string;
    description?: string;
    href: string;
}

interface SearchResult {
    type: 'product' | 'content';
    item: Product | ContentResult;
}

interface GlobalSearchProps {
    storeId?: string;
    onProductClick?: (productId: string) => void;
    onContentClick?: (href: string) => void;
    placeholder?: string;
    primaryColor?: string;
    textColor?: string;
    sections?: Array<{ id: string; title: string; href: string; description?: string }>;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
    storeId,
    onProductClick,
    onContentClick,
    placeholder = 'Buscar productos y contenido...',
    primaryColor = '#6366f1',
    textColor = '#ffffff',
    sections = [],
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [showResults, setShowResults] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowResults(false);
                if (!searchTerm) {
                    setIsExpanded(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchTerm]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsExpanded(false);
                setSearchTerm('');
                setShowResults(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isExpanded]);

    // Search products when term changes
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (!searchTerm.trim() || searchTerm.length < 2) {
            setProducts([]);
            setShowResults(false);
            return;
        }

        // Show results immediately for sections (no need to wait for products)
        setShowResults(true);

        debounceRef.current = setTimeout(async () => {
            // If no storeId, still show section results
            if (!storeId) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                // Search products in Firebase (publicStores is where published products live)
                const productsRef = collection(db, 'publicStores', storeId, 'products');
                const searchLower = searchTerm.toLowerCase();
                
                // Get all products and filter client-side for better search
                const snapshot = await getDocs(query(productsRef, limit(50)));
                const allProducts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];

                // Filter by name, description, or category
                const filtered = allProducts.filter(p => 
                    p.name?.toLowerCase().includes(searchLower) ||
                    p.description?.toLowerCase().includes(searchLower) ||
                    p.category?.toLowerCase().includes(searchLower)
                ).slice(0, 5);

                setProducts(filtered);
            } catch (error) {
                console.error('Error searching products:', error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchTerm, storeId]);

    // Filter sections based on search term
    const filteredSections = useMemo(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) return [];
        
        const searchLower = searchTerm.toLowerCase();
        return sections.filter(s => 
            s.title?.toLowerCase().includes(searchLower) ||
            s.description?.toLowerCase().includes(searchLower)
        ).slice(0, 5);
    }, [searchTerm, sections]);

    const hasResults = products.length > 0 || filteredSections.length > 0;

    const handleProductClick = (product: Product) => {
        if (onProductClick) {
            onProductClick(product.id);
        } else {
            window.location.hash = `#product/${product.id}`;
        }
        setShowResults(false);
        setSearchTerm('');
        setIsExpanded(false);
    };

    const handleContentClick = (result: ContentResult) => {
        if (onContentClick) {
            onContentClick(result.href);
        } else {
            window.location.hash = result.href;
        }
        setShowResults(false);
        setSearchTerm('');
        setIsExpanded(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            // Navigate to store with search
            window.location.hash = `#store?search=${encodeURIComponent(searchTerm.trim())}`;
            setShowResults(false);
            setIsExpanded(false);
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        setProducts([]);
        setShowResults(false);
        inputRef.current?.focus();
    };

    const handleClose = () => {
        setIsExpanded(false);
        setSearchTerm('');
        setShowResults(false);
    };

    const toggleExpand = () => {
        if (isExpanded) {
            handleClose();
        } else {
            setIsExpanded(true);
        }
    };

    return (
        <div ref={containerRef} className="relative flex items-center">
            {/* Collapsed: Just the search icon */}
            {!isExpanded && (
                <button
                    onClick={toggleExpand}
                    className="p-2 rounded-full transition-all duration-200 hover:bg-white/10"
                    style={{ color: textColor }}
                    aria-label="Abrir búsqueda"
                >
                    <Search size={20} />
                </button>
            )}

            {/* Expanded: Search input */}
            {isExpanded && (
                <div className="relative">
                    <form 
                        onSubmit={handleSubmit}
                        className="flex items-center animate-in slide-in-from-right-2 duration-200"
                    >
                        <div
                            className="flex items-center bg-white/10 backdrop-blur-sm rounded-full border border-white/20 overflow-hidden"
                            style={{ borderColor: `${primaryColor}50` }}
                        >
                            <div className="pl-3">
                                <Search size={18} style={{ color: textColor, opacity: 0.7 }} />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
                                placeholder={placeholder}
                                className="w-48 md:w-64 px-3 py-2 bg-transparent text-sm focus:outline-none placeholder:opacity-60"
                                style={{ color: textColor }}
                            />
                            {isLoading ? (
                                <div className="pr-3">
                                    <Loader2 
                                        size={18} 
                                        className="animate-spin"
                                        style={{ color: textColor, opacity: 0.7 }} 
                                    />
                                </div>
                            ) : searchTerm ? (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="pr-3 transition-opacity hover:opacity-70"
                                    style={{ color: textColor, opacity: 0.7 }}
                                >
                                    <X size={18} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="pr-3 transition-opacity hover:opacity-70"
                                    style={{ color: textColor, opacity: 0.7 }}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Results Dropdown */}
                    {showResults && (
                        <div 
                            className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                            style={{ maxHeight: '70vh', overflowY: 'auto' }}
                        >
                            {isLoading && !hasResults && (
                                <div className="p-4 text-center text-slate-500">
                                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                    <p className="text-sm">Buscando...</p>
                                </div>
                            )}

                            {!isLoading && !hasResults && searchTerm.length >= 2 && (
                                <div className="p-4 text-center text-slate-500">
                                    <Search className="mx-auto mb-2 opacity-50" size={24} />
                                    <p className="text-sm">No se encontraron resultados para "{searchTerm}"</p>
                                </div>
                            )}

                            {/* Products Section */}
                            {products.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <ShoppingBag size={14} />
                                            Productos
                                        </h4>
                                    </div>
                                    {products.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                        >
                                            {product.imageUrl ? (
                                                <img 
                                                    src={product.imageUrl} 
                                                    alt={product.name}
                                                    className="w-10 h-10 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                                    <ShoppingBag size={16} className="text-slate-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    ${product.price?.toFixed(2)}
                                                    {product.category && (
                                                        <span className="ml-2 inline-flex items-center gap-1">
                                                            <Tag size={10} />
                                                            {product.category}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Content Section */}
                            {filteredSections.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <FileText size={14} />
                                            Contenido
                                        </h4>
                                    </div>
                                    {filteredSections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => handleContentClick({
                                                id: section.id,
                                                type: 'section',
                                                title: section.title,
                                                description: section.description,
                                                href: section.href
                                            })}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                                <FileText size={16} className="text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {section.title}
                                                </p>
                                                {section.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                        {section.description}
                                                    </p>
                                                )}
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* View All Results */}
                            {hasResults && (
                                <button
                                    onClick={handleSubmit}
                                    className="w-full px-4 py-3 text-center text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-200 dark:border-slate-700"
                                    style={{ color: primaryColor }}
                                >
                                    Ver todos los resultados para "{searchTerm}"
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
