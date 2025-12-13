/**
 * EcommerceControls
 * Control panels for all ecommerce section components
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageData } from '../../types';
import { CategoryItem, ComponentVisibilityContext } from '../../types/components';
import ColorControl from './ColorControl';
import TabbedControls from './TabbedControls';
import ImagePicker from './ImagePicker';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import { X, Check, Search, ChevronDown, ChevronUp, ChevronRight, FolderOpen, Package, Image as ImageIcon, Loader2, SlidersHorizontal, ShoppingBag, ShoppingCart, LayoutGrid, Maximize2, Palette, Info, Grid, List } from 'lucide-react';

// Helper Components (same as in Controls.tsx)
const Input = ({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
    <div className={`mb-3 ${className || ''}`}>
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <input
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
        />
    </div>
);

const TextArea = ({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
    <div className={`mb-3 ${className || ''}`}>
        {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
        <textarea
            {...props}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent resize-y min-h-[80px] transition-all placeholder:text-editor-text-secondary/50"
        />
    </div>
);

const ToggleControl = ({ label, checked, onChange }: { label?: string, checked: boolean, onChange: (checked: boolean) => void }) => (
    <div className={`flex items-center ${label ? 'justify-between mb-3' : ''}`}>
        {label && <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
        >
            <span className={`${checked ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
        </button>
    </div>
);

const FontSizeSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {['sm', 'md', 'lg', 'xl'].map((size) => (
                <button key={size} onClick={() => onChange(size)} className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}>
                    {size.toUpperCase()}
                </button>
            ))}
        </div>
    </div>
);

const PaddingSelector = ({ label, value, onChange, showNone, showXl }: { label: string, value: string, onChange: (val: string) => void, showNone?: boolean, showXl?: boolean }) => {
    const sizes = [
        ...(showNone ? ['none'] : []),
        'sm',
        'md',
        'lg',
        ...(showXl ? ['xl'] : []),
    ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {sizes.map((size) => (
                    <button key={size} onClick={() => onChange(size)} className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}>
                        {size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const BorderRadiusSelector = ({ label, value, onChange, extended }: { label: string, value: string, onChange: (val: string) => void, extended?: boolean }) => {
    const { t } = useTranslation();
    const options = extended
        ? [
            { v: 'none', l: t('common.none', 'None') },
            { v: 'sm', l: 'Sm' },
            { v: 'md', l: 'Med' },
            { v: 'lg', l: 'Lg' },
            { v: 'xl', l: 'XL' },
            { v: '2xl', l: '2XL' },
            { v: 'full', l: 'Full' }
        ]
        : [
            { v: 'none', l: t('common.none', 'None') },
            { v: 'md', l: 'Med' },
            { v: 'xl', l: 'Lg' },
            { v: 'full', l: 'Full' }
        ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button key={opt.v} onClick={() => onChange(opt.v)} className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}>
                        {opt.l}
                    </button>
                ))}
            </div>
        </div>
    );
};

const SelectControl = ({ label, value, options, onChange }: { label: string, value: string, options: { value: string, label: string }[], onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

/**
 * VisibilityContextSelector
 * Permite elegir dónde se muestra un componente: Landing, Tienda, o Ambos
 */
const VisibilityContextSelector = ({
    value,
    onChange
}: {
    value: ComponentVisibilityContext | undefined,
    onChange: (val: ComponentVisibilityContext) => void
}) => {
    const { t } = useTranslation();
    return (
        <div className="mb-4 p-3 bg-editor-bg rounded-lg border border-editor-border">
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
                {t('editor.controls.ecommerce.visibility.label', 'Show in')}
            </label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 gap-1">
                {[
                    { value: 'both', label: t('editor.controls.ecommerce.visibility.both', 'Both'), icon: '🔗' },
                    { value: 'landing', label: t('editor.controls.ecommerce.visibility.landing', 'Landing Only'), icon: '🏠' },
                    { value: 'store', label: t('editor.controls.ecommerce.visibility.store', 'Store Only'), icon: '🛒' },
                ].map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value as ComponentVisibilityContext)}
                        className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${(value || 'both') === opt.value
                            ? 'bg-editor-accent text-editor-bg shadow-sm'
                            : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                            }`}
                    >
                        <span>{opt.icon}</span>
                        <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-editor-text-secondary mt-2 leading-tight">
                • <strong>{t('editor.controls.ecommerce.visibility.both', 'Both')}:</strong> {t('editor.controls.ecommerce.visibility.bothDesc', 'Visible on landing page and store')}<br />
                • <strong>{t('editor.controls.ecommerce.visibility.landing', 'Landing Only')}:</strong> {t('editor.controls.ecommerce.visibility.landingDesc', 'Only on the main page')}<br />
                • <strong>{t('editor.controls.ecommerce.visibility.store', 'Store Only')}:</strong> {t('editor.controls.ecommerce.visibility.storeDesc', 'Only on store/category/product views')}
            </p>
        </div>
    );
};

const NumberInput = ({ label, value, onChange, min, max, step }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number, step?: number }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
        />
    </div>
);

// ============================================================================
// PRODUCT SELECTOR COMPONENT - For manual product selection
// ============================================================================
interface ProductSelectorProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    storeId: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ selectedIds, onChange, storeId }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { products, isLoading } = usePublicProducts(storeId, { limitCount: 100 });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleProduct = (productId: string) => {
        if (selectedIds.includes(productId)) {
            onChange(selectedIds.filter(id => id !== productId));
        } else {
            onChange([...selectedIds, productId]);
        }
    };

    const removeProduct = (productId: string) => {
        onChange(selectedIds.filter(id => id !== productId));
    };

    const selectedProducts = products.filter(p => selectedIds.includes(p.id));

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                {t('editor.controls.ecommerce.productSelector.selectedProducts', 'Selected Products')} ({selectedIds.length})
            </label>

            {/* Selected Products Pills */}
            {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedProducts.map(product => (
                        <div
                            key={product.id}
                            className="flex items-center gap-1 bg-editor-accent/20 text-editor-accent px-2 py-1 rounded-full text-xs"
                        >
                            <span className="max-w-[120px] truncate">{product.name}</span>
                            <button
                                onClick={() => removeProduct(product.id)}
                                className="hover:bg-editor-accent/30 rounded-full p-0.5"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
            >
                <span>{isExpanded ? t('editor.controls.ecommerce.productSelector.hideProducts', 'Hide Products') : t('editor.controls.ecommerce.productSelector.selectProducts', 'Select Products')}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Product List */}
            {isExpanded && (
                <div className="mt-2 border border-editor-border rounded-md overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-editor-border">
                        <div className="flex items-center gap-1.5 bg-editor-border/40 rounded-md px-2 py-1.5">
                            <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={t('editor.controls.ecommerce.productSelector.searchPlaceholder', 'Search products...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {t('editor.controls.ecommerce.productSelector.loading', 'Loading products...')}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {products.length === 0 ? t('editor.controls.ecommerce.productSelector.noProductsInStore', 'No products in store') : t('editor.controls.ecommerce.productSelector.noProductsFound', 'No products found')}
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => toggleProduct(product.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors ${selectedIds.includes(product.id) ? 'bg-editor-accent/10' : ''
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.includes(product.id)
                                        ? 'bg-editor-accent border-editor-accent'
                                        : 'border-editor-border'
                                        }`}>
                                        {selectedIds.includes(product.id) && <Check size={12} className="text-white" />}
                                    </div>

                                    {/* Product Image */}
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-editor-border flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] text-editor-text-secondary">N/A</span>
                                        </div>
                                    )}

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-editor-text-primary truncate">{product.name}</p>
                                        <p className="text-xs text-editor-text-secondary">${product.price.toFixed(2)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface SingleProductSelectorProps {
    selectedProductId: string | undefined;
    onSelect: (productId: string | undefined) => void;
    storeId: string;
    label?: string;
}

const SingleProductSelector: React.FC<SingleProductSelectorProps> = ({ selectedProductId, onSelect, storeId, label = 'Producto Destacado' }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { products, isLoading } = usePublicProducts(storeId, { limitCount: 100 });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectProduct = (productId: string | undefined) => {
        onSelect(productId);
        setIsExpanded(false);
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const labelText = label === 'Producto Destacado' ? t('editor.controls.ecommerce.singleProductSelector.label', 'Featured Product') : label;

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                {labelText}
            </label>

            {/* Selected Product Display */}
            {selectedProduct && (
                <div className="flex items-center gap-3 mb-2 p-2 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                    {selectedProduct.image ? (
                        <img
                            src={selectedProduct.image}
                            alt={selectedProduct.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded bg-editor-border flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-editor-text-secondary">N/A</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-editor-text-primary truncate">{selectedProduct.name}</p>
                        <p className="text-xs text-editor-text-secondary">${selectedProduct.price.toFixed(2)}</p>
                    </div>
                    <button
                        onClick={() => selectProduct(undefined)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        title={t('editor.controls.ecommerce.singleProductSelector.remove', 'Remove product')}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
            >
                <span>{isExpanded ? t('editor.controls.ecommerce.singleProductSelector.hide', 'Hide Products') : selectedProduct ? t('editor.controls.ecommerce.singleProductSelector.change', 'Change Product') : t('editor.controls.ecommerce.singleProductSelector.select', 'Select Product')}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Product List */}
            {isExpanded && (
                <div className="mt-2 border border-editor-border rounded-md overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-editor-border">
                        <div className="flex items-center gap-1.5 bg-editor-border/40 rounded-md px-2 py-1.5">
                            <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                placeholder={t('editor.controls.ecommerce.singleProductSelector.searchPlaceholder', 'Search products...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-xs min-w-0"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-editor-text-secondary hover:text-editor-text-primary flex-shrink-0">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {t('editor.controls.ecommerce.singleProductSelector.loading', 'Loading products...')}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {products.length === 0 ? t('editor.controls.ecommerce.singleProductSelector.noProductsInStore', 'No products in store') : t('editor.controls.ecommerce.singleProductSelector.noProductsFound', 'No products found')}
                            </div>
                        ) : (
                            <>
                                {/* None Option */}
                                <button
                                    onClick={() => selectProduct(undefined)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors border-b border-editor-border ${!selectedProductId ? 'bg-editor-accent/10' : ''
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${!selectedProductId
                                        ? 'bg-editor-accent border-editor-accent'
                                        : 'border-editor-border'
                                        }`}>
                                        {!selectedProductId && <Check size={10} className="text-white" />}
                                    </div>
                                    <span className="text-sm text-editor-text-secondary italic">{t('editor.controls.ecommerce.singleProductSelector.none', 'None (no product)')}</span>
                                </button>

                                {filteredProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => selectProduct(product.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors ${selectedProductId === product.id ? 'bg-editor-accent/10' : ''
                                            }`}
                                    >
                                        {/* Radio */}
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedProductId === product.id
                                            ? 'bg-editor-accent border-editor-accent'
                                            : 'border-editor-border'
                                            }`}>
                                            {selectedProductId === product.id && <Check size={10} className="text-white" />}
                                        </div>

                                        {/* Product Image */}
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-editor-border flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] text-editor-text-secondary">N/A</span>
                                            </div>
                                        )}

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-editor-text-primary truncate">{product.name}</p>
                                            <p className="text-xs text-editor-text-secondary">${product.price.toFixed(2)}</p>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface SingleCollectionSelectorProps {
    selectedCollectionId: string | undefined;
    onSelect: (collectionId: string | undefined) => void;
    storeId: string;
    gridCategories: CategoryItem[];
    label?: string;
}

const SingleCollectionSelector: React.FC<SingleCollectionSelectorProps> = ({
    selectedCollectionId,
    storeId,
    gridCategories,
    onSelect,
    label = 'Colección'
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const { categories: storeCategories, isLoading } = usePublicProducts(storeId, { limitCount: 1 });

    // Combinar categorías de la tienda con las del categoryGrid
    const availableCollections: CategoryItem[] = React.useMemo(() => {
        const storeCats: CategoryItem[] = storeCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: '',
            imageUrl: '',
            productCount: 0,
            slug: cat.slug,
        }));

        const combined = new Map<string, CategoryItem>();
        storeCats.forEach(cat => combined.set(cat.id, cat));
        gridCategories.forEach(cat => {
            const existing = combined.get(cat.id);
            if (existing) {
                combined.set(cat.id, {
                    ...existing,
                    ...cat,
                    imageUrl: cat.imageUrl || existing.imageUrl,
                    description: cat.description || existing.description,
                });
            } else {
                combined.set(cat.id, cat);
            }
        });

        return Array.from(combined.values());
    }, [storeCategories, gridCategories]);

    const selectedCollection = availableCollections.find(c => c.id === selectedCollectionId);

    const selectCollection = (collectionId: string | undefined) => {
        onSelect(collectionId);
        setIsExpanded(false);
    };

    const labelText = label === 'Colección' ? t('editor.controls.ecommerce.collectionSelector.label', 'Collection') : label;

    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen size={14} />
                {labelText}
                {isLoading && <Loader2 size={12} className="animate-spin text-editor-accent" />}
            </label>

            {/* Selected Collection Display */}
            {selectedCollection && (
                <div className="flex items-center gap-3 mb-2 p-2 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                    {selectedCollection.imageUrl ? (
                        <img
                            src={selectedCollection.imageUrl}
                            alt={selectedCollection.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded bg-editor-border flex items-center justify-center flex-shrink-0">
                            <FolderOpen size={16} className="text-editor-text-secondary" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-editor-text-primary truncate">{selectedCollection.name}</p>
                        <p className="text-xs text-editor-text-secondary truncate">
                            {selectedCollection.description || `${selectedCollection.productCount || 0} ${t('editor.controls.ecommerce.collectionSelector.products', 'products')}`}
                        </p>
                    </div>
                    <button
                        onClick={() => selectCollection(undefined)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        title={t('editor.controls.ecommerce.collectionSelector.remove', 'Remove collection')}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
            >
                <span className="flex items-center gap-2">
                    <FolderOpen size={14} />
                    {isExpanded ? t('editor.controls.ecommerce.collectionSelector.hide', 'Hide collections') : selectedCollection ? t('editor.controls.ecommerce.collectionSelector.change', 'Change collection') : t('editor.controls.ecommerce.collectionSelector.select', 'Select collection')}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Collection List */}
            {isExpanded && (
                <div className="mt-2 border border-editor-border rounded-md overflow-hidden">
                    {/* None Option */}
                    <button
                        onClick={() => selectCollection(undefined)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors border-b border-editor-border ${!selectedCollectionId ? 'bg-editor-accent/10' : ''
                            }`}
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${!selectedCollectionId
                            ? 'bg-editor-accent border-editor-accent'
                            : 'border-editor-border'
                            }`}>
                            {!selectedCollectionId && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm text-editor-text-secondary italic">{t('editor.controls.ecommerce.collectionSelector.none', 'None')}</span>
                    </button>

                    {/* Collections List */}
                    <div className="max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                                {t('editor.controls.ecommerce.collectionSelector.loading', 'Loading collections...')}
                            </div>
                        ) : availableCollections.length === 0 ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {t('editor.controls.ecommerce.collectionSelector.noCollections', 'No collections available')}
                            </div>
                        ) : (
                            availableCollections.map(collection => (
                                <button
                                    key={collection.id}
                                    onClick={() => selectCollection(collection.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors ${selectedCollectionId === collection.id ? 'bg-editor-accent/10' : ''
                                        }`}
                                >
                                    {/* Radio */}
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedCollectionId === collection.id
                                        ? 'bg-editor-accent border-editor-accent'
                                        : 'border-editor-border'
                                        }`}>
                                        {selectedCollectionId === collection.id && <Check size={10} className="text-white" />}
                                    </div>

                                    {/* Collection Image */}
                                    {collection.imageUrl ? (
                                        <img
                                            src={collection.imageUrl}
                                            alt={collection.name}
                                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-editor-border flex items-center justify-center flex-shrink-0">
                                            <FolderOpen size={14} className="text-editor-text-secondary" />
                                        </div>
                                    )}

                                    {/* Collection Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-editor-text-primary truncate">{collection.name}</p>
                                        <p className="text-xs text-editor-text-secondary truncate">
                                            {collection.description || `${collection.productCount || 0} ${t('editor.controls.ecommerce.collectionSelector.products', 'products')}`}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface CategorySelectorProps {
    selectedCategoryId: string | undefined;
    onChange: (categoryId: string | undefined) => void;
    storeId: string;
}

const CategorySelector = ({
    selectedCategoryId,
    onChange,
    storeId
}: CategorySelectorProps) => {
    const { t } = useTranslation();
    const { categories, isLoading } = usePublicProducts(storeId, { limitCount: 100 });

    if (isLoading) {
        return (
            <div className="mb-3 text-center py-2 text-editor-text-secondary text-sm">
                <Loader2 size={16} className="animate-spin inline mr-2" />
                {t('editor.controls.ecommerce.categorySelector.loading', 'Loading categories...')}
            </div>
        );
    }

    if (!categories || categories.length === 0) {
        return (
            <div className="mb-3 p-2 border border-editor-border bg-editor-panel-bg rounded text-xs text-editor-text-secondary text-center">
                {t('editor.controls.ecommerce.categorySelector.noCategories', 'No categories available. Create categories in your store first.')}
            </div>
        );
    }

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                {t('editor.controls.ecommerce.categorySelector.label', 'Category')}
            </label>
            <select
                value={selectedCategoryId || ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
                <option value="">{t('editor.controls.ecommerce.categorySelector.select', 'Select a category...')}</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

interface EcommerceControlsProps {
    data: PageData;
    setNestedData: (path: string, value: any) => void;
    storeId?: string;
}

export const useFeaturedProductsControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.featuredProducts) return null;

    const d = data.featuredProducts;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector
                value={d.visibleIn}
                onChange={(v) => setNestedData('featuredProducts.visibleIn', v)}
            />
            <Input label={t('editor.controls.ecommerce.title', 'Title')} value={d.title || ''} onChange={(e) => setNestedData('featuredProducts.title', e.target.value)} />
            <FontSizeSelector label={t('editor.controls.ecommerce.titleSize', 'Title Size')} value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('featuredProducts.titleFontSize', v)} />
            <TextArea label={t('editor.controls.ecommerce.description', 'Description')} value={d.description || ''} onChange={(e) => setNestedData('featuredProducts.description', e.target.value)} rows={2} />

            <hr className="border-editor-border/50" />

            <SelectControl
                label={t('editor.controls.ecommerce.variant', 'Variant')}
                value={d.variant || 'carousel'}
                options={[
                    { value: 'carousel', label: t('editor.controls.ecommerce.carousel', 'Carousel') },
                    { value: 'grid', label: t('editor.controls.ecommerce.grid', 'Grid') },
                    { value: 'showcase', label: t('editor.controls.ecommerce.showcase', 'Showcase') },
                ]}
                onChange={(v) => setNestedData('featuredProducts.variant', v)}
            />

            <SelectControl
                label={t('editor.controls.ecommerce.productSource', 'Product Source')}
                value={d.sourceType || 'newest'}
                options={[
                    { value: 'newest', label: t('editor.controls.ecommerce.newestProducts', 'Newest Products') },
                    { value: 'bestsellers', label: t('editor.controls.ecommerce.bestSellers', 'Best Sellers') },
                    { value: 'on-sale', label: t('editor.controls.ecommerce.onSale', 'On Sale') },
                    { value: 'category', label: t('editor.controls.ecommerce.byCategory', 'By Category') },
                    { value: 'manual', label: t('editor.controls.ecommerce.manual', 'Manual Selection') },
                ]}
                onChange={(v) => {
                    setNestedData('featuredProducts.sourceType', v);
                    // Clear selections when changing source type
                    if (v !== 'manual') {
                        setNestedData('featuredProducts.productIds', []);
                    }
                    if (v !== 'category') {
                        setNestedData('featuredProducts.categoryId', undefined);
                    }
                }}
            />

            {/* Category Selector - shown when sourceType is 'category' */}
            {d.sourceType === 'category' && storeId && (
                <CategorySelector
                    selectedCategoryId={d.categoryId}
                    onChange={(categoryId) => setNestedData('featuredProducts.categoryId', categoryId)}
                    storeId={storeId}
                />
            )}

            {/* Product Selector - shown when sourceType is 'manual' */}
            {d.sourceType === 'manual' && storeId && (
                <ProductSelector
                    selectedIds={d.productIds || []}
                    onChange={(ids) => setNestedData('featuredProducts.productIds', ids)}
                    storeId={storeId}
                />
            )}

            <NumberInput
                label={t('editor.controls.ecommerce.productsToShow', 'Products to Show')}
                value={d.limitCount || 4}
                onChange={(v) => setNestedData('featuredProducts.limitCount', v)}
                min={1}
                max={12}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showBadge', 'Show Badge (New/Sale)')}
                checked={d.showBadge !== false}
                onChange={(v) => setNestedData('featuredProducts.showBadge', v)}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showPrice', 'Show Price')}
                checked={d.showPrice !== false}
                onChange={(v) => setNestedData('featuredProducts.showPrice', v)}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showAddToCart', 'Show Add to Cart')}
                checked={d.showAddToCart !== false}
                onChange={(v) => setNestedData('featuredProducts.showAddToCart', v)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('featuredProducts.backgroundColor', c)}
            />

            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingTop', 'Padding Top')}
                    value={d.paddingTop || 'md'}
                    onChange={(v) => setNestedData('featuredProducts.paddingTop', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingBottom', 'Padding Bottom')}
                    value={d.paddingBottom || 'md'}
                    onChange={(v) => setNestedData('featuredProducts.paddingBottom', v)}
                    showNone
                />
            </div>
        </div>
    );

    return { contentTab, styleTab };
};

export const useCategoryGridControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.categoryGrid) return null;

    const d = data.categoryGrid;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector
                value={d.visibleIn}
                onChange={(v) => setNestedData('categoryGrid.visibleIn', v)}
            />
            <Input label={t('editor.controls.ecommerce.title', 'Title')} value={d.title || ''} onChange={(e) => setNestedData('categoryGrid.title', e.target.value)} />
            <ToggleControl
                label={t('editor.controls.ecommerce.showTitle', 'Show Title')}
                checked={d.showTitle !== false}
                onChange={(v) => setNestedData('categoryGrid.showTitle', v)}
            />

            <SelectControl
                label={t('editor.controls.ecommerce.layout', 'Layout')}
                value={d.layout || 'grid'}
                options={[
                    { value: 'grid', label: t('editor.controls.ecommerce.grid', 'Grid') },
                    { value: 'slider', label: t('editor.controls.ecommerce.slider', 'Slider') },
                    { value: 'list', label: t('editor.controls.ecommerce.list', 'List') },
                ]}
                onChange={(v) => setNestedData('categoryGrid.layout', v)}
            />

            <NumberInput
                label={t('editor.controls.ecommerce.columns', 'Columns (Grid)')}
                value={d.columns || 3}
                onChange={(v) => setNestedData('categoryGrid.columns', v)}
                min={2}
                max={6}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showProductCount', 'Show Product Count')}
                checked={d.showProductCount !== false}
                onChange={(v) => setNestedData('categoryGrid.showProductCount', v)}
            />

            {/* Collection Selection - now managed in LeadsLibrary/AddLeadModal unified style or similar list management */}
            {/* For now, we assume automatic category fetching or basic selection */}

        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('categoryGrid.backgroundColor', c)}
            />
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingTop', 'Padding Top')}
                    value={d.paddingTop || 'md'}
                    onChange={(v) => setNestedData('categoryGrid.paddingTop', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingBottom', 'Padding Bottom')}
                    value={d.paddingBottom || 'md'}
                    onChange={(v) => setNestedData('categoryGrid.paddingBottom', v)}
                    showNone
                />
            </div>
            <BorderRadiusSelector
                label={t('editor.controls.ecommerce.cardRadius', 'Card Radius')}
                value={d.cardBorderRadius || 'md'}
                onChange={(v) => setNestedData('categoryGrid.cardBorderRadius', v)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

export const useProductHeroControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.productHero) return null;

    const d = data.productHero;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector
                value={d.visibleIn}
                onChange={(v) => setNestedData('productHero.visibleIn', v)}
            />
            {/* Single Product Selector */}
            {storeId && (
                <SingleProductSelector
                    selectedProductId={d.productId}
                    onSelect={(id) => setNestedData('productHero.productId', id)}
                    storeId={storeId}
                />
            )}

            <SelectControl
                label={t('editor.controls.ecommerce.layout', 'Layout')}
                value={d.layout || 'split'}
                options={[
                    { value: 'split', label: t('editor.controls.ecommerce.splitImageLeft', 'Split (Image Left)') },
                    { value: 'split-right', label: t('editor.controls.ecommerce.splitImageRight', 'Split (Image Right)') },
                    { value: 'full', label: t('editor.controls.ecommerce.fullWidth', 'Full Width') },
                    { value: 'centered', label: t('editor.controls.ecommerce.centered', 'Centered') },
                ]}
                onChange={(v) => setNestedData('productHero.layout', v)}
            />

            <SelectControl
                label={t('editor.controls.ecommerce.imageSize', 'Image Size')}
                value={d.imageSize || 'medium'}
                options={[
                    { value: 'small', label: t('editor.controls.ecommerce.small', 'Small') },
                    { value: 'medium', label: t('editor.controls.ecommerce.medium', 'Medium') },
                    { value: 'large', label: t('editor.controls.ecommerce.large', 'Large') },
                ]}
                onChange={(v) => setNestedData('productHero.imageSize', v)}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showPrice', 'Show Price')}
                checked={d.showPrice !== false}
                onChange={(v) => setNestedData('productHero.showPrice', v)}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showDescription', 'Show Description')}
                checked={d.showDescription !== false}
                onChange={(v) => setNestedData('productHero.showDescription', v)}
            />

            <ToggleControl
                label={t('editor.controls.ecommerce.showFeatures', 'Show Features')}
                checked={d.showFeatures !== false}
                onChange={(v) => setNestedData('productHero.showFeatures', v)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('productHero.backgroundColor', c)}
            />
            <ColorControl
                label={t('editor.controls.ecommerce.textColor', 'Text Color')}
                color={d.textColor || '#000000'}
                onChange={(c) => setNestedData('productHero.textColor', c)}
            />
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingTop', 'Padding Top')}
                    value={d.paddingTop || 'xl'}
                    onChange={(v) => setNestedData('productHero.paddingTop', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingBottom', 'Padding Bottom')}
                    value={d.paddingBottom || 'xl'}
                    onChange={(v) => setNestedData('productHero.paddingBottom', v)}
                    showNone
                />
            </div>
        </div>
    );

    return { contentTab, styleTab };
};

export const useTrustBadgesControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.trustBadges) return null;

    const d = data.trustBadges;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector
                value={d.visibleIn}
                onChange={(v) => setNestedData('trustBadges.visibleIn', v)}
            />
            <Input label={t('editor.controls.ecommerce.title', 'Title')} value={d.title || ''} onChange={(e) => setNestedData('trustBadges.title', e.target.value)} />

            {/* Note: In a real implementation, we would have a list editor for the badges (icon + title + desc) */}
            <div className="text-xs text-editor-text-secondary italic border p-2 rounded border-editor-border">
                {t('editor.controls.ecommerce.badgesManageNote', 'Badges content management would be here (list of icon/title/desc).')}
            </div>

            <SelectControl
                label={t('editor.controls.ecommerce.layout', 'Layout')}
                value={d.layout || 'grid'}
                options={[
                    { value: 'grid', label: t('editor.controls.ecommerce.grid', 'Grid') },
                    { value: 'flex', label: t('editor.controls.ecommerce.flexRow', 'Flex Row') },
                ]}
                onChange={(v) => setNestedData('trustBadges.layout', v)}
            />

            <NumberInput
                label={t('editor.controls.ecommerce.columns', 'Columns (Grid)')}
                value={d.columns || 4}
                onChange={(v) => setNestedData('trustBadges.columns', v)}
                min={2}
                max={4}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('trustBadges.backgroundColor', c)}
            />
            <ColorControl
                label={t('editor.controls.ecommerce.iconColor', 'Icon Color')}
                color={d.iconColor || '#3B82F6'}
                onChange={(c) => setNestedData('trustBadges.iconColor', c)}
            />
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingTop', 'Padding Top')}
                    value={d.paddingTop || 'lg'}
                    onChange={(v) => setNestedData('trustBadges.paddingTop', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingBottom', 'Padding Bottom')}
                    value={d.paddingBottom || 'lg'}
                    onChange={(v) => setNestedData('trustBadges.paddingBottom', v)}
                    showNone
                />
            </div>
        </div>
    );

    return { contentTab, styleTab };
};

export const useSaleCountdownControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.saleCountdown) return null;

    const d = data.saleCountdown;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector
                value={d.visibleIn}
                onChange={(v) => setNestedData('saleCountdown.visibleIn', v)}
            />
            <Input label={t('editor.controls.ecommerce.title', 'Title')} value={d.title || ''} onChange={(e) => setNestedData('saleCountdown.title', e.target.value)} />
            <TextArea label={t('editor.controls.ecommerce.subtitle', 'Subtitle')} value={d.subtitle || ''} onChange={(e) => setNestedData('saleCountdown.subtitle', e.target.value)} rows={2} />

            <Input
                label={t('editor.controls.ecommerce.endDate', 'End Date (ISO)')}
                type="datetime-local"
                value={d.endDate ? new Date(d.endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setNestedData('saleCountdown.endDate', new Date(e.target.value).toISOString())}
            />

            <SelectControl
                label={t('editor.controls.ecommerce.style', 'Style')}
                value={d.style || 'simple'}
                options={[
                    { value: 'simple', label: t('editor.controls.ecommerce.simpleText', 'Simple Text') },
                    { value: 'cards', label: t('editor.controls.ecommerce.timerCards', 'Timer Cards') },
                    { value: 'banner', label: t('editor.controls.ecommerce.fullBanner', 'Full Banner') },
                ]}
                onChange={(v) => setNestedData('saleCountdown.style', v)}
            />

            {/* Target Link or Product */}
            <SelectControl
                label={t('editor.controls.ecommerce.linkTarget', 'Link Target')}
                value={d.targetType || 'collection'}
                options={[
                    { value: 'collection', label: t('editor.controls.ecommerce.collection', 'Collection') },
                    { value: 'product', label: t('editor.controls.ecommerce.product', 'Product') },
                    { value: 'custom', label: t('editor.controls.ecommerce.customUrl', 'Custom URL') },
                ]}
                onChange={(v) => setNestedData('saleCountdown.targetType', v)}
            />

            {d.targetType === 'collection' && storeId && data.categoryGrid && (
                <SingleCollectionSelector
                    selectedCollectionId={d.targetId}
                    storeId={storeId}
                    gridCategories={data.categoryGrid.categories || []}
                    onSelect={(id) => setNestedData('saleCountdown.targetId', id)}
                />
            )}

            {d.targetType === 'product' && storeId && (
                <SingleProductSelector
                    selectedProductId={d.targetId}
                    storeId={storeId}
                    onSelect={(id) => setNestedData('saleCountdown.targetId', id)}
                />
            )}

            {d.targetType === 'custom' && (
                <Input label={t('editor.controls.ecommerce.url', 'URL')} value={d.targetUrl || ''} onChange={(e) => setNestedData('saleCountdown.targetUrl', e.target.value)} />
            )}

            <Input label={t('editor.controls.ecommerce.buttonText', 'Button Text')} value={d.buttonText || ''} onChange={(e) => setNestedData('saleCountdown.buttonText', e.target.value)} />

        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('saleCountdown.backgroundColor', c)}
            />
            <ColorControl
                label={t('editor.controls.ecommerce.textColor', 'Text Color')}
                color={d.textColor || '#000000'}
                onChange={(c) => setNestedData('saleCountdown.textColor', c)}
            />
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingTop', 'Padding Top')}
                    value={d.paddingTop || 'lg'}
                    onChange={(v) => setNestedData('saleCountdown.paddingTop', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingBottom', 'Padding Bottom')}
                    value={d.paddingBottom || 'lg'}
                    onChange={(v) => setNestedData('saleCountdown.paddingBottom', v)}
                    showNone
                />
            </div>
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// ANNOUNCEMENT (TOP BAR) EDITOR
// ============================================================================

interface AnnouncementMessageEditorProps {
    data: PageData;
    setNestedData: (path: string, value: any) => void;
}

export const AnnouncementMessageEditor = ({ data, setNestedData }: AnnouncementMessageEditorProps) => {
    const { t } = useTranslation();
    const d = data.announcement;
    if (!d) return null;

    return (
        <div className="space-y-4">
            <ToggleControl
                label={t('editor.controls.ecommerce.enabled', 'Enabled')}
                checked={d.enabled}
                onChange={(v) => setNestedData('announcement.enabled', v)}
            />

            {d.enabled && (
                <>
                    <Input
                        label={t('editor.controls.ecommerce.message', 'Message')}
                        value={d.message}
                        onChange={(e) => setNestedData('announcement.message', e.target.value)}
                    />

                    <SelectControl
                        label={t('editor.controls.ecommerce.linkType', 'Link Type')}
                        value={d.linkType || 'none'}
                        options={[
                            { value: 'none', label: t('common.none', 'None') },
                            { value: 'url', label: t('editor.controls.ecommerce.customUrl', 'Custom URL') },
                            { value: 'collection', label: t('editor.controls.ecommerce.collection', 'Collection') },
                        ]}
                        onChange={(v) => setNestedData('announcement.linkType', v)}
                    />

                    {d.linkType === 'url' && (
                        <Input
                            label={t('editor.controls.ecommerce.url', 'URL')}
                            value={d.linkUrl || ''}
                            onChange={(e) => setNestedData('announcement.linkUrl', e.target.value)}
                        />
                    )}

                    <hr className="border-editor-border/50" />

                    <ColorControl
                        label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                        color={d.backgroundColor || '#000000'}
                        onChange={(c) => setNestedData('announcement.backgroundColor', c)}
                    />

                    <ColorControl
                        label={t('editor.controls.ecommerce.textColor', 'Text Color')}
                        color={d.textColor || '#FFFFFF'}
                        onChange={(c) => setNestedData('announcement.textColor', c)}
                    />
                </>
            )}
        </div>
    );
};

// ============================================================================
// ANNOUNCEMENT BAR CONTROLS
// ============================================================================

export const useAnnouncementBarControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.announcement) return null;

    const d = data.announcement;

    const contentTab = (
        <div className="space-y-4">
            <ToggleControl
                label={t('editor.controls.ecommerce.enabled', 'Enabled')}
                checked={d.enabled}
                onChange={(v) => setNestedData('announcement.enabled', v)}
            />
            {d.enabled && (
                <>
                    <Input
                        label={t('editor.controls.ecommerce.message', 'Message')}
                        value={d.message || ''}
                        onChange={(e) => setNestedData('announcement.message', e.target.value)}
                    />
                    <SelectControl
                        label={t('editor.controls.ecommerce.linkType', 'Link Type')}
                        value={d.linkType || 'none'}
                        options={[
                            { value: 'none', label: t('common.none', 'None') },
                            { value: 'url', label: t('editor.controls.ecommerce.customUrl', 'Custom URL') },
                        ]}
                        onChange={(v) => setNestedData('announcement.linkType', v)}
                    />
                    {d.linkType === 'url' && (
                        <Input
                            label={t('editor.controls.ecommerce.url', 'URL')}
                            value={d.linkUrl || ''}
                            onChange={(e) => setNestedData('announcement.linkUrl', e.target.value)}
                        />
                    )}
                </>
            )}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || '#000000'}
                onChange={(c) => setNestedData('announcement.backgroundColor', c)}
            />
            <ColorControl
                label={t('editor.controls.ecommerce.textColor', 'Text Color')}
                color={d.textColor || '#FFFFFF'}
                onChange={(c) => setNestedData('announcement.textColor', c)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// COLLECTION BANNER CONTROLS
// ============================================================================

export const useCollectionBannerControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.collectionBanner) return null;

    const d = data.collectionBanner;

    const contentTab = (
        <div className="space-y-4">
            <Input
                label={t('editor.controls.ecommerce.title', 'Title')}
                value={d.title || ''}
                onChange={(e) => setNestedData('collectionBanner.title', e.target.value)}
            />
            <TextArea
                label={t('editor.controls.ecommerce.description', 'Description')}
                value={d.description || ''}
                onChange={(e) => setNestedData('collectionBanner.description', e.target.value)}
                rows={3}
            />
            <Input
                label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                value={d.buttonText || ''}
                onChange={(e) => setNestedData('collectionBanner.buttonText', e.target.value)}
            />
            <Input
                label={t('editor.controls.ecommerce.buttonUrl', 'Button URL')}
                value={d.buttonUrl || ''}
                onChange={(e) => setNestedData('collectionBanner.buttonUrl', e.target.value)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || '#f3f4f6'}
                onChange={(c) => setNestedData('collectionBanner.backgroundColor', c)}
            />
            <ColorControl
                label={t('editor.controls.ecommerce.textColor', 'Text Color')}
                color={d.textColor || '#000000'}
                onChange={(c) => setNestedData('collectionBanner.textColor', c)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// RECENTLY VIEWED CONTROLS
// ============================================================================

export const useRecentlyViewedControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.recentlyViewed) return null;

    const d = data.recentlyViewed;

    const contentTab = (
        <div className="space-y-4">
            <ToggleControl
                label={t('editor.controls.ecommerce.enabled', 'Enabled')}
                checked={d.enabled !== false}
                onChange={(v) => setNestedData('recentlyViewed.enabled', v)}
            />
            <Input
                label={t('editor.controls.ecommerce.title', 'Title')}
                value={d.title || ''}
                onChange={(e) => setNestedData('recentlyViewed.title', e.target.value)}
            />
            <Input
                label={t('editor.controls.ecommerce.maxItems', 'Max Items')}
                type="number"
                value={d.maxItems || 4}
                onChange={(e) => setNestedData('recentlyViewed.maxItems', parseInt(e.target.value) || 4)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('recentlyViewed.backgroundColor', c)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// PRODUCT REVIEWS CONTROLS
// ============================================================================

export const useProductReviewsControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.productReviews) return null;

    const d = data.productReviews;

    const contentTab = (
        <div className="space-y-4">
            <ToggleControl
                label={t('editor.controls.ecommerce.enabled', 'Enabled')}
                checked={d.enabled !== false}
                onChange={(v) => setNestedData('productReviews.enabled', v)}
            />
            <Input
                label={t('editor.controls.ecommerce.title', 'Title')}
                value={d.title || ''}
                onChange={(e) => setNestedData('productReviews.title', e.target.value)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('productReviews.backgroundColor', c)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// PRODUCT BUNDLE CONTROLS
// ============================================================================

export const useProductBundleControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.productBundle) return null;

    const d = data.productBundle;

    const contentTab = (
        <div className="space-y-4">
            <ToggleControl
                label={t('editor.controls.ecommerce.enabled', 'Enabled')}
                checked={d.enabled !== false}
                onChange={(v) => setNestedData('productBundle.enabled', v)}
            />
            <Input
                label={t('editor.controls.ecommerce.title', 'Title')}
                value={d.title || ''}
                onChange={(e) => setNestedData('productBundle.title', e.target.value)}
            />
            <TextArea
                label={t('editor.controls.ecommerce.description', 'Description')}
                value={d.description || ''}
                onChange={(e) => setNestedData('productBundle.description', e.target.value)}
                rows={2}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <ColorControl
                label={t('editor.controls.ecommerce.backgroundColor', 'Background Color')}
                color={d.backgroundColor || 'transparent'}
                onChange={(c) => setNestedData('productBundle.backgroundColor', c)}
            />
        </div>
    );

    return { contentTab, styleTab };
};

// ============================================================================
// STORE SETTINGS CONTROLS
// ============================================================================

export const useStoreSettingsControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    const { t } = useTranslation();
    if (!data?.storeSettings) return null;

    const d = data.storeSettings;

    const contentTab = (
        <div className="space-y-4">
            <Input
                label={t('editor.controls.ecommerce.storeName', 'Store Name')}
                value={d.storeName || ''}
                onChange={(e) => setNestedData('storeSettings.storeName', e.target.value)}
            />
            <Input
                label={t('editor.controls.ecommerce.currency', 'Currency')}
                value={d.currency || 'USD'}
                onChange={(e) => setNestedData('storeSettings.currency', e.target.value)}
            />
            <Input
                label={t('editor.controls.ecommerce.currencySymbol', 'Currency Symbol')}
                value={d.currencySymbol || '$'}
                onChange={(e) => setNestedData('storeSettings.currencySymbol', e.target.value)}
            />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                {t('editor.controls.ecommerce.noStyleOptions', 'No style options available for store settings.')}
            </p>
        </div>
    );

    return { contentTab, styleTab };
};
