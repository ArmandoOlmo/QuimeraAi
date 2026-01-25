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
import { useCMS } from '../../contexts/cms/CMSContext';
import { X, Check, Search, ChevronDown, ChevronUp, ChevronRight, FolderOpen, Package, Image as ImageIcon, Loader2, SlidersHorizontal, ShoppingBag, ShoppingCart, LayoutGrid, Maximize2, Palette, Info, Grid, List, MessageCircle, Trash2, Plus, FileText, Scale } from 'lucide-react';

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

const SliderControl = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void }) => (
    <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
            <span className="text-xs text-editor-text-primary">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
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

export interface SingleProductSelectorProps {
    selectedProductId: string | undefined;
    onSelect: (productId: string | undefined) => void;
    storeId: string;
    label?: string;
}

export const SingleProductSelector: React.FC<SingleProductSelectorProps> = ({ selectedProductId, onSelect, storeId, label = 'Producto Destacado' }) => {
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

export interface SingleCollectionSelectorProps {
    selectedCollectionId: string | undefined;
    onSelect: (collectionId: string | undefined) => void;
    storeId: string;
    gridCategories: CategoryItem[];
    label?: string;
}

export const SingleCollectionSelector: React.FC<SingleCollectionSelectorProps> = ({
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#f8fafc'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#6366f1'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Badge Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.badgeColors', 'Badge Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeBackground', 'Badge BG')}
                    value={d.colors?.badgeBackground || '#6366f1'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.badgeBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeText', 'Badge Text')}
                    value={d.colors?.badgeText || '#ffffff'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.badgeText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Price Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.priceColors', 'Price Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.priceColor', 'Price')}
                    value={d.colors?.priceColor || '#111827'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.priceColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.salePriceColor', 'Sale Price')}
                    value={d.colors?.salePriceColor || '#ef4444'}
                    onChange={(c) => setNestedData('featuredProducts.colors?.salePriceColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Border Color */}
            <ColorControl
                label={t('editor.controls.ecommerce.borderColor', 'Border Color')}
                value={d.colors?.borderColor || '#e5e7eb'}
                onChange={(c) => setNestedData('featuredProducts.colors?.borderColor', c)}
            />

            <hr className="border-editor-border/50" />

            {/* Padding Controls */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'md'}
                    onChange={(v) => setNestedData('featuredProducts.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('featuredProducts.paddingX', v)}
                    showNone
                    showXl
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#f8fafc'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Overlay Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.overlayColors', 'Overlay Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.overlayStart', 'Overlay Start')}
                    value={d.colors?.overlayStart || 'transparent'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.overlayStart', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.overlayEnd', 'Overlay End')}
                    value={d.colors?.overlayEnd || 'rgba(0,0,0,0.7)'}
                    onChange={(c) => setNestedData('categoryGrid.colors?.overlayEnd', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Border Color */}
            <ColorControl
                label={t('editor.controls.ecommerce.borderColor', 'Border Color')}
                value={d.colors?.borderColor || '#e5e7eb'}
                onChange={(c) => setNestedData('categoryGrid.colors?.borderColor', c)}
            />

            <hr className="border-editor-border/50" />

            {/* Layout */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'md'}
                    onChange={(v) => setNestedData('categoryGrid.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('categoryGrid.paddingX', v)}
                    showNone
                    showXl
                />
            </div>

            <BorderRadiusSelector
                label={t('editor.controls.ecommerce.cardRadius', 'Card Radius')}
                value={d.borderRadius || 'xl'}
                onChange={(v) => setNestedData('categoryGrid.borderRadius', v)}
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('productHero.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.overlayColor', 'Overlay')}
                    value={d.colors?.overlayColor || '#000000'}
                    onChange={(c) => setNestedData('productHero.colors?.overlayColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Text Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.textColors', 'Text Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#ffffff'}
                    onChange={(c) => setNestedData('productHero.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#ffffff'}
                    onChange={(c) => setNestedData('productHero.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('productHero.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#6366f1'}
                    onChange={(c) => setNestedData('productHero.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('productHero.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Badge Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.badgeColors', 'Badge Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeBackground', 'Badge BG')}
                    value={d.colors?.badgeBackground || '#ef4444'}
                    onChange={(c) => setNestedData('productHero.colors?.badgeBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeText', 'Badge Text')}
                    value={d.colors?.badgeText || '#ffffff'}
                    onChange={(c) => setNestedData('productHero.colors?.badgeText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'lg'}
                    onChange={(v) => setNestedData('productHero.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('productHero.paddingX', v)}
                    showNone
                    showXl
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#f8fafc'}
                    onChange={(c) => setNestedData('trustBadges.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('trustBadges.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('trustBadges.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent/Icon')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('trustBadges.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Border Color */}
            <ColorControl
                label={t('editor.controls.ecommerce.borderColor', 'Border Color')}
                value={d.colors?.borderColor || '#e5e7eb'}
                onChange={(c) => setNestedData('trustBadges.colors?.borderColor', c)}
            />

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'lg'}
                    onChange={(v) => setNestedData('trustBadges.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('trustBadges.paddingX', v)}
                    showNone
                    showXl
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#f8fafc'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#ffffff'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#94a3b8'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#ef4444'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Countdown Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.countdownColors', 'Countdown Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.countdownBackground', 'Countdown BG')}
                    value={d.colors?.countdownBackground || '#0f172a'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.countdownBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.countdownText', 'Countdown Text')}
                    value={d.colors?.countdownText || '#ffffff'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.countdownText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#ef4444'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Badge Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.badgeColors', 'Badge Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeBackground', 'Badge BG')}
                    value={d.colors?.badgeBackground || '#ef4444'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.badgeBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeText', 'Badge Text')}
                    value={d.colors?.badgeText || '#ffffff'}
                    onChange={(c) => setNestedData('saleCountdown.colors?.badgeText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'lg'}
                    onChange={(v) => setNestedData('saleCountdown.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('saleCountdown.paddingX', v)}
                    showNone
                    showXl
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
    if (!data?.announcementBar) return null;

    const d = data.announcementBar;
    const messages = d.messages || [];

    // Icon options for announcement bar
    const iconOptions = [
        { value: 'megaphone', label: 'Megaphone' },
        { value: 'tag', label: 'Tag' },
        { value: 'gift', label: 'Gift' },
        { value: 'truck', label: 'Truck' },
        { value: 'percent', label: 'Percent' },
        { value: 'sparkles', label: 'Sparkles' },
        { value: 'bell', label: 'Bell' },
        { value: 'info', label: 'Info' },
    ];

    // Handle message updates
    const updateMessage = (index: number, field: string, value: string) => {
        const newMessages = [...messages];
        newMessages[index] = { ...newMessages[index], [field]: value };
        setNestedData('announcementBar.messages', newMessages);
    };

    // Add new message
    const addMessage = () => {
        const newMessages = [...messages, { text: 'New announcement', link: '', linkText: '' }];
        setNestedData('announcementBar.messages', newMessages);
    };

    // Remove message
    const removeMessage = (index: number) => {
        const newMessages = messages.filter((_, i) => i !== index);
        setNestedData('announcementBar.messages', newMessages);
    };

    const contentTab = (
        <div className="space-y-4">
            {/* Variant Selection */}
            <SelectControl
                label={t('editor.controls.ecommerce.variant', 'Variant')}
                value={d.variant || 'static'}
                options={[
                    { value: 'static', label: t('editor.controls.ecommerce.static', 'Static') },
                    { value: 'scrolling', label: t('editor.controls.ecommerce.scrolling', 'Scrolling (Marquee)') },
                    { value: 'rotating', label: t('editor.controls.ecommerce.rotating', 'Rotating') },
                ]}
                onChange={(v) => setNestedData('announcementBar.variant', v)}
            />

            <hr className="border-editor-border/50" />

            {/* Messages */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <MessageCircle size={14} />
                {t('editor.controls.ecommerce.messages', 'Messages')}
            </h5>

            {messages.map((msg, index) => (
                <div key={index} className="p-3 bg-editor-bg/50 rounded-lg border border-editor-border/30 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-editor-text-secondary">
                            {t('editor.controls.ecommerce.message', 'Message')} {index + 1}
                        </span>
                        {messages.length > 1 && (
                            <button
                                onClick={() => removeMessage(index)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title={t('common.delete', 'Delete')}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                    <Input
                        label={t('editor.controls.ecommerce.text', 'Text')}
                        value={msg.text || ''}
                        onChange={(e) => updateMessage(index, 'text', e.target.value)}
                    />
                    <Input
                        label={t('editor.controls.ecommerce.linkUrl', 'Link URL')}
                        value={msg.link || ''}
                        onChange={(e) => updateMessage(index, 'link', e.target.value)}
                        placeholder="/tienda"
                    />
                    <Input
                        label={t('editor.controls.ecommerce.linkText', 'Link Text')}
                        value={msg.linkText || ''}
                        onChange={(e) => updateMessage(index, 'linkText', e.target.value)}
                        placeholder="Shop now"
                    />
                </div>
            ))}

            <button
                onClick={addMessage}
                className="w-full py-2 px-3 bg-editor-accent/20 hover:bg-editor-accent/30 text-editor-accent rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
                <Plus size={14} />
                {t('editor.controls.ecommerce.addMessage', 'Add Message')}
            </button>

            <hr className="border-editor-border/50" />

            {/* Display Options */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.displayOptions', 'Display Options')}
            </h5>

            <ToggleControl
                label={t('editor.controls.ecommerce.showIcon', 'Show Icon')}
                checked={d.showIcon ?? false}
                onChange={(v) => setNestedData('announcementBar.showIcon', v)}
            />

            {d.showIcon && (
                <SelectControl
                    label={t('editor.controls.ecommerce.icon', 'Icon')}
                    value={d.icon || 'megaphone'}
                    options={iconOptions}
                    onChange={(v) => setNestedData('announcementBar.icon', v)}
                />
            )}

            <ToggleControl
                label={t('editor.controls.ecommerce.dismissible', 'Dismissible')}
                checked={d.dismissible ?? false}
                onChange={(v) => setNestedData('announcementBar.dismissible', v)}
            />

            {(d.variant === 'scrolling' || d.variant === 'rotating') && (
                <>
                    <ToggleControl
                        label={t('editor.controls.ecommerce.pauseOnHover', 'Pause on Hover')}
                        checked={d.pauseOnHover ?? true}
                        onChange={(v) => setNestedData('announcementBar.pauseOnHover', v)}
                    />
                    <SliderControl
                        label={d.variant === 'scrolling'
                            ? t('editor.controls.ecommerce.scrollSpeed', 'Scroll Speed (seconds)')
                            : t('editor.controls.ecommerce.rotationSpeed', 'Rotation Speed (ms)')
                        }
                        value={d.speed || (d.variant === 'scrolling' ? 50 : 4000)}
                        min={d.variant === 'scrolling' ? 10 : 1000}
                        max={d.variant === 'scrolling' ? 100 : 10000}
                        step={d.variant === 'scrolling' ? 5 : 500}
                        onChange={(v) => setNestedData('announcementBar.speed', v)}
                    />
                </>
            )}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.colors', 'Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#4f46e5'}
                    onChange={(c) => setNestedData('announcementBar.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#ffffff'}
                    onChange={(c) => setNestedData('announcementBar.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.linkColor', 'Link Color')}
                    value={d.colors?.linkColor || '#ffffff'}
                    onChange={(c) => setNestedData('announcementBar.colors?.linkColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.iconColor', 'Icon Color')}
                    value={d.colors?.iconColor || '#ffffff'}
                    onChange={(c) => setNestedData('announcementBar.colors?.iconColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.borderColor', 'Border Color')}
                    value={d.colors?.borderColor || 'transparent'}
                    onChange={(c) => setNestedData('announcementBar.colors?.borderColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Size & Spacing */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.sizeSpacing', 'Size & Spacing')}
            </h5>

            <SliderControl
                label={t('editor.controls.ecommerce.height', 'Height (px)')}
                value={d.height || 40}
                min={30}
                max={80}
                step={2}
                onChange={(v) => setNestedData('announcementBar.height', v)}
            />

            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'sm'}
                    onChange={(v) => setNestedData('announcementBar.paddingY', v)}
                    showNone
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('announcementBar.paddingX', v)}
                    showNone
                />
            </div>

            <SelectControl
                label={t('editor.controls.ecommerce.fontSize', 'Font Size')}
                value={d.fontSize || 'sm'}
                options={[
                    { value: 'sm', label: t('editor.controls.ecommerce.small', 'Small') },
                    { value: 'md', label: t('editor.controls.ecommerce.medium', 'Medium') },
                    { value: 'lg', label: t('editor.controls.ecommerce.large', 'Large') },
                    { value: 'xl', label: t('editor.controls.ecommerce.extraLarge', 'Extra Large') },
                ]}
                onChange={(v) => setNestedData('announcementBar.fontSize', v)}
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

    // Get categoryGrid categories for the collection selector
    const gridCategories = data?.categoryGrid?.categories || [];

    const contentTab = (
        <div className="space-y-4">
            {/* Background Image */}
            <ImagePicker
                label={t('editor.controls.ecommerce.backgroundImage', 'Background Image')}
                value={d.backgroundImageUrl || ''}
                onChange={(url) => setNestedData('collectionBanner.backgroundImageUrl', url)}
                storeId={storeId}
            />

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

            <hr className="border-editor-border/50" />

            {/* Button Configuration */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonConfig', 'Configuración del Botón')}
            </h5>

            <Input
                label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                value={d.buttonText || ''}
                onChange={(e) => setNestedData('collectionBanner.buttonText', e.target.value)}
            />

            {/* Collection Selector */}
            {storeId && (
                <SingleCollectionSelector
                    selectedCollectionId={d.collectionId}
                    onSelect={(collectionId) => {
                        setNestedData('collectionBanner.collectionId', collectionId);
                        // Clear buttonUrl when selecting a collection
                        if (collectionId) {
                            setNestedData('collectionBanner.buttonUrl', '');
                        }
                    }}
                    storeId={storeId}
                    gridCategories={gridCategories}
                    label={t('editor.controls.ecommerce.linkToCollection', 'Enlazar a Colección')}
                />
            )}

            {/* Custom URL - only show if no collection selected */}
            {!d.collectionId && (
                <Input
                    label={t('editor.controls.ecommerce.customUrl', 'URL Personalizada (opcional)')}
                    value={d.buttonUrl || ''}
                    onChange={(e) => setNestedData('collectionBanner.buttonUrl', e.target.value)}
                    placeholder="https://..."
                />
            )}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.overlayColor', 'Overlay')}
                    value={d.colors?.overlayColor || '#000000'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.overlayColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Text Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.textColors', 'Text Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#ffffff'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#ffffff'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#6366f1'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('collectionBanner.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'lg'}
                    onChange={(v) => setNestedData('collectionBanner.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('collectionBanner.paddingX', v)}
                    showNone
                    showXl
                />
            </div>
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#f8fafc'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('recentlyViewed.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'md'}
                    onChange={(v) => setNestedData('recentlyViewed.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('recentlyViewed.paddingX', v)}
                    showNone
                    showXl
                />
            </div>
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('productReviews.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('productReviews.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('productReviews.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('productReviews.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#f8fafc'}
                    onChange={(c) => setNestedData('productReviews.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('productReviews.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Review Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.reviewColors', 'Review Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.starColor', 'Star Color')}
                    value={d.colors?.starColor || '#fbbf24'}
                    onChange={(c) => setNestedData('productReviews.colors?.starColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.verifiedBadgeColor', 'Verified Badge')}
                    value={d.colors?.verifiedBadgeColor || '#10b981'}
                    onChange={(c) => setNestedData('productReviews.colors?.verifiedBadgeColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'md'}
                    onChange={(v) => setNestedData('productReviews.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('productReviews.paddingX', v)}
                    showNone
                    showXl
                />
            </div>
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.sectionColors', 'Section Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#f8fafc'}
                    onChange={(c) => setNestedData('productBundle.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('productBundle.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('productBundle.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('productBundle.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#ffffff'}
                    onChange={(c) => setNestedData('productBundle.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('productBundle.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Price Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.priceColors', 'Price Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.priceColor', 'Price')}
                    value={d.colors?.priceColor || '#111827'}
                    onChange={(c) => setNestedData('productBundle.colors?.priceColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.savingsColor', 'Savings')}
                    value={d.colors?.savingsColor || '#10b981'}
                    onChange={(c) => setNestedData('productBundle.colors?.savingsColor', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#6366f1'}
                    onChange={(c) => setNestedData('productBundle.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('productBundle.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Badge Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.badgeColors', 'Badge Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeBackground', 'Badge BG')}
                    value={d.colors?.badgeBackground || '#6366f1'}
                    onChange={(c) => setNestedData('productBundle.colors?.badgeBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeText', 'Badge Text')}
                    value={d.colors?.badgeText || '#ffffff'}
                    onChange={(c) => setNestedData('productBundle.colors?.badgeText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingY', 'Padding Y')}
                    value={d.paddingY || 'md'}
                    onChange={(v) => setNestedData('productBundle.paddingY', v)}
                    showNone
                    showXl
                />
                <PaddingSelector
                    label={t('editor.controls.ecommerce.paddingX', 'Padding X')}
                    value={d.paddingX || 'md'}
                    onChange={(v) => setNestedData('productBundle.paddingX', v)}
                    showNone
                    showXl
                />
            </div>
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
            {/* Section Colors */}
            <h5 className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {t('editor.controls.ecommerce.storeColors', 'Store Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.background', 'Background')}
                    value={d.colors?.background || '#ffffff'}
                    onChange={(c) => setNestedData('storeSettings.colors?.background', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.heading', 'Heading')}
                    value={d.colors?.heading || '#111827'}
                    onChange={(c) => setNestedData('storeSettings.colors?.heading', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.text', 'Text')}
                    value={d.colors?.text || '#374151'}
                    onChange={(c) => setNestedData('storeSettings.colors?.text', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.accent', 'Accent')}
                    value={d.colors?.accent || '#6366f1'}
                    onChange={(c) => setNestedData('storeSettings.colors?.accent', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Card Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.cardColors', 'Card Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.cardBackground', 'Card Background')}
                    value={d.colors?.cardBackground || '#f8fafc'}
                    onChange={(c) => setNestedData('storeSettings.colors?.cardBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.cardText', 'Card Text')}
                    value={d.colors?.cardText || '#111827'}
                    onChange={(c) => setNestedData('storeSettings.colors?.cardText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Button Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.buttonColors', 'Button Colors')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonBackground', 'Button BG')}
                    value={d.colors?.buttonBackground || '#6366f1'}
                    onChange={(c) => setNestedData('storeSettings.colors?.buttonBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.buttonText', 'Button Text')}
                    value={d.colors?.buttonText || '#ffffff'}
                    onChange={(c) => setNestedData('storeSettings.colors?.buttonText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Price & Badge Colors */}
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                {t('editor.controls.ecommerce.priceAndBadgeColors', 'Price & Badge')}
            </h5>

            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.priceColor', 'Price')}
                    value={d.colors?.priceColor || '#111827'}
                    onChange={(c) => setNestedData('storeSettings.colors?.priceColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.salePriceColor', 'Sale Price')}
                    value={d.colors?.salePriceColor || '#ef4444'}
                    onChange={(c) => setNestedData('storeSettings.colors?.salePriceColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeBackground', 'Badge BG')}
                    value={d.colors?.badgeBackground || '#ef4444'}
                    onChange={(c) => setNestedData('storeSettings.colors?.badgeBackground', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.badgeText', 'Badge Text')}
                    value={d.colors?.badgeText || '#ffffff'}
                    onChange={(c) => setNestedData('storeSettings.colors?.badgeText', c)}
                />
            </div>

            <hr className="border-editor-border/50" />

            {/* Border & Star Colors */}
            <div className="grid grid-cols-2 gap-3">
                <ColorControl
                    label={t('editor.controls.ecommerce.borderColor', 'Border')}
                    value={d.colors?.borderColor || '#e5e7eb'}
                    onChange={(c) => setNestedData('storeSettings.colors?.borderColor', c)}
                />
                <ColorControl
                    label={t('editor.controls.ecommerce.starColor', 'Star Color')}
                    value={d.colors?.starColor || '#fbbf24'}
                    onChange={(c) => setNestedData('storeSettings.colors?.starColor', c)}
                />
            </div>
        </div>
    );

    return { contentTab, styleTab };
};

interface SingleContentSelectorProps {
    selectedContentPath: string | undefined;
    onSelect: (path: string | undefined) => void;
    label?: string;
}

export const SingleContentSelector: React.FC<SingleContentSelectorProps> = ({
    selectedContentPath,
    onSelect,
    label = 'Contenido'
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Use CMS Context for project-specific content
    const { cmsPosts } = useCMS();

    // Filter items
    const filteredArticles = cmsPosts.filter(a =>
        (a.status === 'published') &&
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectContent = (path: string | undefined) => {
        onSelect(path);
        setIsExpanded(false);
    };

    // Find selected item details for display
    const getSelectedItem = () => {
        if (!selectedContentPath) return null;

        // Check articles
        if (selectedContentPath.startsWith('/blog/')) {
            const slug = selectedContentPath.split('/').pop();
            const article = cmsPosts.find(a => a.slug === slug);
            if (article) return { name: article.title, type: 'article', icon: <FileText size={14} /> };
        }

        return { name: selectedContentPath, type: 'unknown', icon: <Info size={14} /> };
    };

    const selectedItem = getSelectedItem();

    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} />
                {label}
            </label>

            {/* Selected Content Display */}
            {selectedItem && (
                <div className="flex items-center gap-3 mb-2 p-2 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                    <div className="w-8 h-8 rounded bg-editor-accent/20 flex items-center justify-center flex-shrink-0 text-editor-accent">
                        {selectedItem.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-editor-text-primary truncate">{selectedItem.name}</p>
                        <p className="text-xs text-editor-text-secondary truncate">
                            {selectedItem.type === 'article' ? 'Artículo de Blog' : 'Contenido'}
                        </p>
                    </div>
                    <button
                        onClick={() => selectContent(undefined)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Quitar contenido"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
                title={isExpanded ? "Ocultar panel" : "Mostrar panel de selección"}
            >
                <span className="flex items-center gap-2">
                    {isExpanded ? 'Ocultar contenido' : selectedItem ? 'Cambiar contenido' : 'Seleccionar contenido'}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Content List */}
            {isExpanded && (
                <div className="mt-2 border border-editor-border rounded-md overflow-hidden bg-editor-panel-bg">
                    {/* Search */}
                    <div className="p-2 border-b border-editor-border">
                        <div className="flex items-center gap-1.5 bg-editor-border/40 rounded-md px-2 py-1.5">
                            <Search size={14} className="text-editor-text-secondary flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Buscar artículos..."
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

                    <div className="max-h-[200px] overflow-y-auto">
                        {filteredArticles.length === 0 ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                No hay artículos publicados.
                            </div>
                        ) : (
                            filteredArticles.map(article => (
                                <button
                                    key={article.id}
                                    onClick={() => selectContent(`/blog/${article.slug}`)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors ${selectedContentPath === `/blog/${article.slug}` ? 'bg-editor-accent/10' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded bg-editor-accent/20 flex items-center justify-center flex-shrink-0">
                                        <FileText size={14} className="text-editor-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-editor-text-primary truncate">{article.title}</p>
                                        <p className="text-xs text-editor-text-secondary truncate">{article.slug}</p>
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
