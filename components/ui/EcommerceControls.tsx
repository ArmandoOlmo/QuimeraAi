/**
 * EcommerceControls
 * Control panels for all ecommerce section components
 */

import React, { useState } from 'react';
import { PageData } from '../../types';
import { CategoryItem, ComponentVisibilityContext } from '../../types/components';
import ColorControl from './ColorControl';
import TabbedControls from './TabbedControls';
import ImagePicker from './ImagePicker';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import { X, Check, Search, ChevronDown, ChevronUp, ChevronRight, FolderOpen, Package, Image as ImageIcon, Loader2, SlidersHorizontal, ShoppingBag, LayoutGrid, Maximize2, Palette, Info, Grid, List } from 'lucide-react';

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

const PaddingSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {['sm', 'md', 'lg'].map((size) => (
                <button key={size} onClick={() => onChange(size)} className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}>
                    {size.toUpperCase()}
                </button>
            ))}
        </div>
    </div>
);

const BorderRadiusSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
            {[{v: 'none', l: 'None'}, {v: 'md', l: 'Med'}, {v: 'xl', l: 'Lg'}, {v: 'full', l: 'Full'}].map((opt) => (
                <button key={opt.v} onClick={() => onChange(opt.v)} className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}>
                    {opt.l}
                </button>
            ))}
        </div>
    </div>
);

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
}) => (
    <div className="mb-4 p-3 bg-editor-bg rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
            Mostrar en
        </label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 gap-1">
            {[
                { value: 'both', label: 'Ambos', icon: '🔗' },
                { value: 'landing', label: 'Solo Landing', icon: '🏠' },
                { value: 'store', label: 'Solo Tienda', icon: '🛒' },
            ].map((opt) => (
                <button 
                    key={opt.value} 
                    onClick={() => onChange(opt.value as ComponentVisibilityContext)} 
                    className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                        (value || 'both') === opt.value 
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
            • <strong>Ambos:</strong> Visible en landing page y tienda<br/>
            • <strong>Solo Landing:</strong> Solo en la página principal<br/>
            • <strong>Solo Tienda:</strong> Solo en vistas de tienda/categoría/producto
        </p>
    </div>
);

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
                Selected Products ({selectedIds.length})
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
                <span>{isExpanded ? 'Hide Products' : 'Select Products'}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Product List */}
            {isExpanded && (
                <div className="mt-2 border border-editor-border rounded-md overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-editor-border">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-editor-bg border border-editor-border rounded-md pl-7 pr-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                            />
                        </div>
                    </div>
                    
                    {/* Products List */}
                    <div className="max-h-[250px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                Loading products...
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                {products.length === 0 ? 'No products in store' : 'No products found'}
                            </div>
                        ) : (
                            filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => toggleProduct(product.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors ${
                                        selectedIds.includes(product.id) ? 'bg-editor-accent/10' : ''
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                        selectedIds.includes(product.id) 
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

// ============================================================================
// CATEGORY SELECTOR COMPONENT - For category-based product filtering
// ============================================================================
interface CategorySelectorProps {
    selectedCategoryId: string | undefined;
    onChange: (categoryId: string | undefined) => void;
    storeId: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategoryId, onChange, storeId }) => {
    const { categories, isLoading } = usePublicProducts(storeId, { limitCount: 1 });

    if (isLoading) {
        return (
            <div className="mb-3">
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                    Category
                </label>
                <div className="bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-secondary">
                    Loading categories...
                </div>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="mb-3">
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                    Category
                </label>
                <div className="bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-secondary">
                    No categories available. Create categories in your store first.
                </div>
            </div>
        );
    }

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                Category
            </label>
            <select
                value={selectedCategoryId || ''}
                onChange={(e) => onChange(e.target.value || undefined)}
                className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            >
                <option value="">Select a category...</option>
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
    if (!data?.featuredProducts) return null;

    const d = data.featuredProducts;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('featuredProducts.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('featuredProducts.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('featuredProducts.titleFontSize', v)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('featuredProducts.description', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            <SelectControl
                label="Variant"
                value={d.variant || 'carousel'}
                options={[
                    { value: 'carousel', label: 'Carousel' },
                    { value: 'grid', label: 'Grid' },
                    { value: 'showcase', label: 'Showcase' },
                ]}
                onChange={(v) => setNestedData('featuredProducts.variant', v)}
            />

            <SelectControl
                label="Product Source"
                value={d.sourceType || 'newest'}
                options={[
                    { value: 'newest', label: 'Newest Products' },
                    { value: 'bestsellers', label: 'Best Sellers' },
                    { value: 'on-sale', label: 'On Sale' },
                    { value: 'category', label: 'By Category' },
                    { value: 'manual', label: 'Manual Selection' },
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
                label="Products to Show"
                value={d.productsToShow || 8}
                onChange={(v) => setNestedData('featuredProducts.productsToShow', v)}
                min={1}
                max={20}
            />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Badge" checked={d.showBadge || false} onChange={(v) => setNestedData('featuredProducts.showBadge', v)} />
            <ToggleControl label="Show Price" checked={d.showPrice !== false} onChange={(v) => setNestedData('featuredProducts.showPrice', v)} />
            <ToggleControl label="Show Rating" checked={d.showRating || false} onChange={(v) => setNestedData('featuredProducts.showRating', v)} />
            <ToggleControl label="Show Add to Cart" checked={d.showAddToCart || false} onChange={(v) => setNestedData('featuredProducts.showAddToCart', v)} />
            <ToggleControl label="Show View All Button" checked={d.showViewAll || false} onChange={(v) => setNestedData('featuredProducts.showViewAll', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'md'} onChange={(v) => setNestedData('featuredProducts.paddingY', v)} showNone showXl />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('featuredProducts.paddingX', v)} showNone showXl />
            </div>

            <SelectControl
                label="Columns"
                value={String(d.columns || 4)}
                options={[
                    { value: '2', label: '2 Columns' },
                    { value: '3', label: '3 Columns' },
                    { value: '4', label: '4 Columns' },
                    { value: '5', label: '5 Columns' },
                ]}
                onChange={(v) => setNestedData('featuredProducts.columns', Number(v))}
            />

            <SelectControl
                label="Card Style"
                value={d.cardStyle || 'modern'}
                options={[
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'modern', label: 'Modern' },
                    { value: 'elegant', label: 'Elegant' },
                    { value: 'overlay', label: 'Overlay' },
                ]}
                onChange={(v) => setNestedData('featuredProducts.cardStyle', v)}
            />

            <BorderRadiusSelector label="Border Radius" value={d.borderRadius || 'xl'} onChange={(v) => setNestedData('featuredProducts.borderRadius', v)} extended />

            <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Card Gap</label>
                <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                    {['sm', 'md', 'lg'].map((gap) => (
                        <button
                            key={gap}
                            onClick={() => setNestedData('featuredProducts.cardGap', gap)}
                            className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${d.cardGap === gap || (!d.cardGap && gap === 'md') ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                        >
                            {gap.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {d.variant === 'carousel' && (
                <>
                    <hr className="border-editor-border/50" />
                    <ToggleControl label="Auto Scroll" checked={d.autoScroll || false} onChange={(v) => setNestedData('featuredProducts.autoScroll', v)} />
                    <ToggleControl label="Show Arrows" checked={d.showArrows !== false} onChange={(v) => setNestedData('featuredProducts.showArrows', v)} />
                    <ToggleControl label="Show Dots" checked={d.showDots || false} onChange={(v) => setNestedData('featuredProducts.showDots', v)} />
                    {d.autoScroll && (
                        <NumberInput
                            label="Scroll Speed (ms)"
                            value={d.scrollSpeed || 5000}
                            onChange={(v) => setNestedData('featuredProducts.scrollSpeed', v)}
                            min={1000}
                            max={10000}
                            step={500}
                        />
                    )}
                </>
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('featuredProducts.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('featuredProducts.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('featuredProducts.colors.text', v)} />
            <ColorControl label="Accent" value={d.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('featuredProducts.colors.accent', v)} />
            <ColorControl label="Card Background" value={d.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('featuredProducts.colors.cardBackground', v)} />
            <ColorControl label="Button Background" value={d.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('featuredProducts.colors.buttonBackground', v)} />
            <ColorControl label="Badge Background" value={d.colors?.badgeBackground || '#10b981'} onChange={(v) => setNestedData('featuredProducts.colors.badgeBackground', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useCategoryGridControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.categoryGrid) return null;

    const d = data.categoryGrid;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('categoryGrid.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('categoryGrid.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('categoryGrid.titleFontSize', v)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('categoryGrid.description', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            <SelectControl
                label="Variant"
                value={d.variant || 'cards'}
                options={[
                    { value: 'cards', label: 'Cards' },
                    { value: 'overlay', label: 'Overlay' },
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'banner', label: 'Banner' },
                ]}
                onChange={(v) => setNestedData('categoryGrid.variant', v)}
            />

            <ToggleControl label="Show Product Count" checked={d.showProductCount !== false} onChange={(v) => setNestedData('categoryGrid.showProductCount', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'lg'} onChange={(v) => setNestedData('categoryGrid.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('categoryGrid.paddingX', v)} />
            </div>

            <SelectControl
                label="Columns"
                value={String(d.columns || 4)}
                options={[
                    { value: '2', label: '2 Columns' },
                    { value: '3', label: '3 Columns' },
                    { value: '4', label: '4 Columns' },
                    { value: '5', label: '5 Columns' },
                    { value: '6', label: '6 Columns' },
                ]}
                onChange={(v) => setNestedData('categoryGrid.columns', Number(v))}
            />

            <SelectControl
                label="Image Aspect Ratio"
                value={d.imageAspectRatio || '1:1'}
                options={[
                    { value: '1:1', label: 'Square (1:1)' },
                    { value: '4:3', label: 'Landscape (4:3)' },
                    { value: '3:4', label: 'Portrait (3:4)' },
                    { value: '16:9', label: 'Wide (16:9)' },
                ]}
                onChange={(v) => setNestedData('categoryGrid.imageAspectRatio', v)}
            />

            <BorderRadiusSelector label="Border Radius" value={d.borderRadius || 'xl'} onChange={(v) => setNestedData('categoryGrid.borderRadius', v)} />

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('categoryGrid.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('categoryGrid.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('categoryGrid.colors.text', v)} />
            <ColorControl label="Card Background" value={d.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('categoryGrid.colors.cardBackground', v)} />
            <ColorControl label="Overlay Start" value={d.colors?.overlayStart || 'transparent'} onChange={(v) => setNestedData('categoryGrid.colors.overlayStart', v)} />
            <ColorControl label="Overlay End" value={d.colors?.overlayEnd || 'rgba(0,0,0,0.7)'} onChange={(v) => setNestedData('categoryGrid.colors.overlayEnd', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useProductHeroControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.productHero) return null;

    const d = data.productHero;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('productHero.visibleIn', v)} 
            />
            <Input label="Headline" value={d.headline || ''} onChange={(e) => setNestedData('productHero.headline', e.target.value)} />
            <FontSizeSelector label="Headline Size" value={d.headlineFontSize || 'xl'} onChange={(v) => setNestedData('productHero.headlineFontSize', v)} />
            <TextArea label="Subheadline" value={d.subheadline || ''} onChange={(e) => setNestedData('productHero.subheadline', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            <Input label="Button Text" value={d.buttonText || ''} onChange={(e) => setNestedData('productHero.buttonText', e.target.value)} />
            <Input label="Button URL" value={d.buttonUrl || ''} onChange={(e) => setNestedData('productHero.buttonUrl', e.target.value)} placeholder="#store or URL" />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Badge" checked={d.showBadge || false} onChange={(v) => setNestedData('productHero.showBadge', v)} />
            {d.showBadge && (
                <Input label="Badge Text" value={d.badgeText || ''} onChange={(e) => setNestedData('productHero.badgeText', e.target.value)} />
            )}

            <hr className="border-editor-border/50" />

            <Input label="Background Image URL" value={d.backgroundImageUrl || ''} onChange={(e) => setNestedData('productHero.backgroundImageUrl', e.target.value)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'featured'}
                options={[
                    { value: 'featured', label: 'Featured' },
                    { value: 'collection', label: 'Collection' },
                    { value: 'sale', label: 'Sale' },
                    { value: 'new-arrivals', label: 'New Arrivals' },
                ]}
                onChange={(v) => setNestedData('productHero.variant', v)}
            />

            <SelectControl
                label="Layout"
                value={d.layout || 'single'}
                options={[
                    { value: 'single', label: 'Single' },
                    { value: 'split', label: 'Split' },
                    { value: 'carousel', label: 'Carousel' },
                ]}
                onChange={(v) => setNestedData('productHero.layout', v)}
            />

            <NumberInput
                label="Height (px)"
                value={d.height || 500}
                onChange={(v) => setNestedData('productHero.height', v)}
                min={300}
                max={800}
                step={50}
            />

            <SelectControl
                label="Content Position"
                value={d.contentPosition || 'left'}
                options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                ]}
                onChange={(v) => setNestedData('productHero.contentPosition', v)}
            />

            <SelectControl
                label="Overlay Style"
                value={d.overlayStyle || 'gradient'}
                options={[
                    { value: 'gradient', label: 'Gradient' },
                    { value: 'solid', label: 'Solid' },
                    { value: 'none', label: 'None' },
                ]}
                onChange={(v) => setNestedData('productHero.overlayStyle', v)}
            />

            {d.overlayStyle !== 'none' && (
                <NumberInput
                    label="Overlay Opacity (%)"
                    value={d.overlayOpacity || 50}
                    onChange={(v) => setNestedData('productHero.overlayOpacity', v)}
                    min={0}
                    max={100}
                    step={5}
                />
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('productHero.colors.background', v)} />
            <ColorControl label="Overlay Color" value={d.colors?.overlayColor || '#000000'} onChange={(v) => setNestedData('productHero.colors.overlayColor', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('productHero.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#ffffff'} onChange={(v) => setNestedData('productHero.colors.text', v)} />
            <ColorControl label="Button Background" value={d.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('productHero.colors.buttonBackground', v)} />
            <ColorControl label="Button Text" value={d.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('productHero.colors.buttonText', v)} />
            <ColorControl label="Badge Background" value={d.colors?.badgeBackground || '#ef4444'} onChange={(v) => setNestedData('productHero.colors.badgeBackground', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

// Icon options for Trust Badges
const trustBadgeIconOptions = [
    { value: 'truck', label: '🚚 Truck (Shipping)' },
    { value: 'shield', label: '🛡️ Shield (Security)' },
    { value: 'credit-card', label: '💳 Credit Card (Payment)' },
    { value: 'refresh-cw', label: '🔄 Refresh (Returns)' },
    { value: 'clock', label: '⏰ Clock (Fast)' },
    { value: 'award', label: '🏆 Award (Quality)' },
    { value: 'lock', label: '🔒 Lock (Secure)' },
    { value: 'headphones', label: '🎧 Headphones (Support)' },
    { value: 'package', label: '📦 Package (Delivery)' },
    { value: 'check-circle', label: '✅ Check Circle (Verified)' },
    { value: 'star', label: '⭐ Star (Rating)' },
    { value: 'heart', label: '❤️ Heart (Favorite)' },
];

// Badge Item Editor Component
const BadgeItemEditor = ({ 
    badge, 
    index, 
    onUpdate, 
    onRemove 
}: { 
    badge: { icon: string; title: string; description?: string }; 
    index: number; 
    onUpdate: (index: number, field: string, value: string) => void;
    onRemove: (index: number) => void;
}) => (
    <div className="p-3 bg-editor-bg rounded-lg border border-editor-border mb-3">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-editor-text-secondary uppercase">Badge {index + 1}</span>
            <button
                onClick={() => onRemove(index)}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
                Remove
            </button>
        </div>
        <SelectControl
            label="Icon"
            value={badge.icon || 'check-circle'}
            options={trustBadgeIconOptions}
            onChange={(v) => onUpdate(index, 'icon', v)}
        />
        <Input 
            label="Title" 
            value={badge.title || ''} 
            onChange={(e) => onUpdate(index, 'title', e.target.value)} 
            placeholder="e.g., Free Shipping"
        />
        <Input 
            label="Description" 
            value={badge.description || ''} 
            onChange={(e) => onUpdate(index, 'description', e.target.value)} 
            placeholder="e.g., On orders over $50"
        />
    </div>
);

export const useTrustBadgesControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.trustBadges) return null;

    const d = data.trustBadges;

    // Default badges if none exist
    const badges = d.badges?.length > 0 ? d.badges : [
        { icon: 'truck', title: 'Free Shipping', description: 'On orders over $50' },
        { icon: 'shield', title: 'Secure Payment', description: '100% secure transactions' },
        { icon: 'refresh-cw', title: 'Easy Returns', description: '30-day return policy' },
        { icon: 'headphones', title: '24/7 Support', description: 'Customer service' },
    ];

    // Handler to update a specific badge field
    const updateBadge = (index: number, field: string, value: string) => {
        const newBadges = [...badges];
        newBadges[index] = { ...newBadges[index], [field]: value };
        setNestedData('trustBadges.badges', newBadges);
    };

    // Handler to remove a badge
    const removeBadge = (index: number) => {
        const newBadges = badges.filter((_, i) => i !== index);
        setNestedData('trustBadges.badges', newBadges);
    };

    // Handler to add a new badge
    const addBadge = () => {
        const newBadges = [...badges, { icon: 'check-circle', title: 'New Badge', description: '' }];
        setNestedData('trustBadges.badges', newBadges);
    };

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('trustBadges.visibleIn', v)} 
            />
            <Input label="Section Title (optional)" value={d.title || ''} onChange={(e) => setNestedData('trustBadges.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'md'} onChange={(v) => setNestedData('trustBadges.titleFontSize', v)} />
            
            <hr className="border-editor-border/50" />

            <SelectControl
                label="Variant"
                value={d.variant || 'horizontal'}
                options={[
                    { value: 'horizontal', label: 'Horizontal' },
                    { value: 'grid', label: 'Grid' },
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'detailed', label: 'Detailed' },
                ]}
                onChange={(v) => setNestedData('trustBadges.variant', v)}
            />

            <ToggleControl label="Show Labels" checked={d.showLabels !== false} onChange={(v) => setNestedData('trustBadges.showLabels', v)} />

            <SelectControl
                label="Icon Size"
                value={d.iconSize || 'md'}
                options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                ]}
                onChange={(v) => setNestedData('trustBadges.iconSize', v)}
            />

            <hr className="border-editor-border/50" />

            {/* Badge Items Editor */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                        Badges ({badges.length})
                    </label>
                    <button
                        onClick={addBadge}
                        className="text-xs px-3 py-1 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors font-medium"
                    >
                        + Add Badge
                    </button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto pr-1">
                    {badges.map((badge, index) => (
                        <BadgeItemEditor
                            key={index}
                            badge={badge}
                            index={index}
                            onUpdate={updateBadge}
                            onRemove={removeBadge}
                        />
                    ))}
                </div>

                {badges.length === 0 && (
                    <div className="text-center py-4 text-editor-text-secondary text-sm">
                        No badges yet. Click "+ Add Badge" to create one.
                    </div>
                )}
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'md'} onChange={(v) => setNestedData('trustBadges.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('trustBadges.paddingX', v)} />
            </div>

            <BorderRadiusSelector label="Border Radius" value={d.borderRadius || 'xl'} onChange={(v) => setNestedData('trustBadges.borderRadius', v)} />

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#1e293b'} onChange={(v) => setNestedData('trustBadges.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('trustBadges.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('trustBadges.colors.text', v)} />
            <ColorControl label="Icon Color" value={d.colors?.iconColor || '#4f46e5'} onChange={(v) => setNestedData('trustBadges.colors.iconColor', v)} />
            <ColorControl label="Border Color" value={d.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('trustBadges.colors.borderColor', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useSaleCountdownControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.saleCountdown) return null;

    const d = data.saleCountdown;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('saleCountdown.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('saleCountdown.title', e.target.value)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('saleCountdown.description', e.target.value)} rows={2} />
            
            <Input label="Badge Text" value={d.badgeText || ''} onChange={(e) => setNestedData('saleCountdown.badgeText', e.target.value)} />
            <Input label="Discount Text" value={d.discountText || ''} onChange={(e) => setNestedData('saleCountdown.discountText', e.target.value)} placeholder="e.g., Up to 50% OFF" />

            <hr className="border-editor-border/50" />

            <Input 
                label="End Date" 
                type="datetime-local"
                value={d.endDate ? new Date(d.endDate).toISOString().slice(0, 16) : ''} 
                onChange={(e) => setNestedData('saleCountdown.endDate', new Date(e.target.value).toISOString())} 
            />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Days" checked={d.showDays !== false} onChange={(v) => setNestedData('saleCountdown.showDays', v)} />
            <ToggleControl label="Show Hours" checked={d.showHours !== false} onChange={(v) => setNestedData('saleCountdown.showHours', v)} />
            <ToggleControl label="Show Minutes" checked={d.showMinutes !== false} onChange={(v) => setNestedData('saleCountdown.showMinutes', v)} />
            <ToggleControl label="Show Seconds" checked={d.showSeconds !== false} onChange={(v) => setNestedData('saleCountdown.showSeconds', v)} />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Products" checked={d.showProducts || false} onChange={(v) => setNestedData('saleCountdown.showProducts', v)} />
            {d.showProducts && (
                <NumberInput
                    label="Products to Show"
                    value={d.productsToShow || 4}
                    onChange={(v) => setNestedData('saleCountdown.productsToShow', v)}
                    min={1}
                    max={8}
                />
            )}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'banner'}
                options={[
                    { value: 'banner', label: 'Banner' },
                    { value: 'fullwidth', label: 'Full Width' },
                    { value: 'inline', label: 'Inline' },
                    { value: 'floating', label: 'Floating' },
                ]}
                onChange={(v) => setNestedData('saleCountdown.variant', v)}
            />

            {d.showProducts && (
                <SelectControl
                    label="Card Style"
                    value={d.cardStyle || 'modern'}
                    options={[
                        { value: 'minimal', label: 'Minimal' },
                        { value: 'modern', label: 'Modern' },
                        { value: 'elegant', label: 'Elegant' },
                        { value: 'overlay', label: 'Overlay' },
                    ]}
                    onChange={(v) => setNestedData('saleCountdown.cardStyle', v)}
                />
            )}

            <BorderRadiusSelector 
                label="Border Radius" 
                value={d.borderRadius || 'xl'} 
                onChange={(v) => setNestedData('saleCountdown.borderRadius', v)} 
                extended 
            />

            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'md'} onChange={(v) => setNestedData('saleCountdown.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('saleCountdown.paddingX', v)} />
            </div>

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#1e293b'} onChange={(v) => setNestedData('saleCountdown.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('saleCountdown.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('saleCountdown.colors.text', v)} />
            <ColorControl label="Accent" value={d.colors?.accent || '#ef4444'} onChange={(v) => setNestedData('saleCountdown.colors.accent', v)} />
            <ColorControl label="Countdown Background" value={d.colors?.countdownBackground || '#0f172a'} onChange={(v) => setNestedData('saleCountdown.colors.countdownBackground', v)} />
            <ColorControl label="Countdown Text" value={d.colors?.countdownText || '#ffffff'} onChange={(v) => setNestedData('saleCountdown.colors.countdownText', v)} />
            <ColorControl label="Button Background" value={d.colors?.buttonBackground || '#ef4444'} onChange={(v) => setNestedData('saleCountdown.colors.buttonBackground', v)} />
            
            {d.showProducts && d.cardStyle !== 'overlay' && (
                <>
                    <hr className="border-editor-border/50" />
                    <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
                    <ColorControl label="Card Background" value={d.colors?.cardBackground || 'rgba(255,255,255,0.1)'} onChange={(v) => setNestedData('saleCountdown.colors.cardBackground', v)} />
                    <ColorControl label="Card Text" value={d.colors?.cardText || '#ffffff'} onChange={(v) => setNestedData('saleCountdown.colors.cardText', v)} />
                </>
            )}
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

// ============================================================================
// ANNOUNCEMENT MESSAGE EDITOR COMPONENT - For editing individual messages
// ============================================================================
type AnnouncementLinkType = 'manual' | 'product' | 'collection';

interface AnnouncementMessageEditorProps {
    message: { text: string; link?: string; linkText?: string; linkType?: AnnouncementLinkType };
    index: number;
    onUpdate: (index: number, field: string, value: string) => void;
    onRemove: (index: number) => void;
    storeId: string;
    isOnly: boolean;
}

const AnnouncementMessageEditor: React.FC<AnnouncementMessageEditorProps> = ({ 
    message, 
    index, 
    onUpdate, 
    onRemove, 
    storeId,
    isOnly 
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [linkType, setLinkType] = useState<AnnouncementLinkType>(message.linkType || 'manual');
    const [productSearch, setProductSearch] = useState('');
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [showCollectionPicker, setShowCollectionPicker] = useState(false);
    
    const { products, categories, isLoading } = usePublicProducts(storeId, { limitCount: 100 });
    
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    const handleLinkTypeChange = (newType: AnnouncementLinkType) => {
        setLinkType(newType);
        onUpdate(index, 'linkType', newType);
        // Clear link when changing type
        if (newType !== 'manual') {
            onUpdate(index, 'link', '');
        }
    };

    const handleProductSelect = (productId: string, productName: string, productSlug?: string) => {
        const link = productSlug ? `#store/product/${productSlug}` : `#store/product/${productId}`;
        onUpdate(index, 'link', link);
        onUpdate(index, 'linkText', `Ver ${productName}`);
        setShowProductPicker(false);
    };

    const handleCollectionSelect = (categoryId: string, categoryName: string, categorySlug?: string) => {
        const link = categorySlug ? `#store/category/${categorySlug}` : `#store/category/${categoryId}`;
        onUpdate(index, 'link', link);
        onUpdate(index, 'linkText', `Ver ${categoryName}`);
        setShowCollectionPicker(false);
    };

    // Get selected item name for display
    const getSelectedItemName = () => {
        if (!message.link) return null;
        
        if (linkType === 'product') {
            const productIdOrSlug = message.link.replace('#store/product/', '');
            const product = products.find(p => p.id === productIdOrSlug || p.slug === productIdOrSlug);
            return product?.name;
        }
        if (linkType === 'collection') {
            const categoryIdOrSlug = message.link.replace('#store/category/', '');
            const category = categories.find(c => c.id === categoryIdOrSlug || c.slug === categoryIdOrSlug);
            return category?.name;
        }
        return null;
    };

    return (
        <div className="bg-editor-bg rounded-lg border border-editor-border mb-3 overflow-hidden">
            {/* Header */}
            <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-editor-panel-bg/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight size={14} className="text-editor-text-secondary" />
                    </div>
                    <span className="text-xs font-bold text-editor-text-secondary uppercase">
                        Mensaje {index + 1}
                    </span>
                    {message.text && (
                        <span className="text-xs text-editor-text-secondary/70 truncate max-w-[120px]">
                            - {message.text}
                        </span>
                    )}
                </div>
                {!isOnly && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-3 pt-0 space-y-3 border-t border-editor-border/50">
                    {/* Message Text */}
                    <Input 
                        label="Texto del mensaje" 
                        value={message.text || ''} 
                        onChange={(e) => onUpdate(index, 'text', e.target.value)} 
                        placeholder="¡Envío gratis en pedidos mayores a $50!"
                    />

                    {/* Link Type Selector */}
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                            Tipo de enlace
                        </label>
                        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                            <button 
                                onClick={() => handleLinkTypeChange('manual')} 
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${linkType === 'manual' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                            >
                                URL Manual
                            </button>
                            <button 
                                onClick={() => handleLinkTypeChange('product')} 
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${linkType === 'product' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                            >
                                Producto
                            </button>
                            <button 
                                onClick={() => handleLinkTypeChange('collection')} 
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${linkType === 'collection' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                            >
                                Colección
                            </button>
                        </div>
                    </div>

                    {/* Manual URL Input */}
                    {linkType === 'manual' && (
                        <Input 
                            label="URL del enlace" 
                            value={message.link || ''} 
                            onChange={(e) => onUpdate(index, 'link', e.target.value)} 
                            placeholder="#store, /pagina, o https://..."
                        />
                    )}

                    {/* Product Picker */}
                    {linkType === 'product' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                Seleccionar Producto
                            </label>
                            
                            {/* Selected Product Display */}
                            {message.link && getSelectedItemName() && (
                                <div className="flex items-center gap-2 bg-editor-accent/20 text-editor-accent px-3 py-2 rounded-md text-sm">
                                    <Check size={14} />
                                    <span className="flex-1 truncate">{getSelectedItemName()}</span>
                                    <button 
                                        onClick={() => { onUpdate(index, 'link', ''); onUpdate(index, 'linkText', ''); }}
                                        className="hover:bg-editor-accent/30 rounded p-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Product Picker Button */}
                            <button
                                onClick={() => setShowProductPicker(!showProductPicker)}
                                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
                            >
                                <span>{showProductPicker ? 'Ocultar productos' : 'Buscar producto'}</span>
                                {showProductPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {/* Product List */}
                            {showProductPicker && (
                                <div className="border border-editor-border rounded-md overflow-hidden">
                                    <div className="p-2 border-b border-editor-border">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-editor-text-secondary" />
                                            <input
                                                type="text"
                                                placeholder="Buscar productos..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full bg-editor-bg border border-editor-border rounded-md pl-7 pr-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {isLoading ? (
                                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                                Cargando productos...
                                            </div>
                                        ) : filteredProducts.length === 0 ? (
                                            <div className="p-4 text-center text-editor-text-secondary text-sm">
                                                {products.length === 0 ? 'No hay productos en la tienda' : 'No se encontraron productos'}
                                            </div>
                                        ) : (
                                            filteredProducts.map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => handleProductSelect(product.id, product.name, product.slug)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors"
                                                >
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
                    )}

                    {/* Collection Picker */}
                    {linkType === 'collection' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                Seleccionar Colección
                            </label>
                            
                            {/* Selected Collection Display */}
                            {message.link && getSelectedItemName() && (
                                <div className="flex items-center gap-2 bg-editor-accent/20 text-editor-accent px-3 py-2 rounded-md text-sm">
                                    <FolderOpen size={14} />
                                    <span className="flex-1 truncate">{getSelectedItemName()}</span>
                                    <button 
                                        onClick={() => { onUpdate(index, 'link', ''); onUpdate(index, 'linkText', ''); }}
                                        className="hover:bg-editor-accent/30 rounded p-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}

                            {/* Collection Picker Button */}
                            <button
                                onClick={() => setShowCollectionPicker(!showCollectionPicker)}
                                className="w-full flex items-center justify-between bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary hover:bg-editor-bg transition-colors"
                            >
                                <span>{showCollectionPicker ? 'Ocultar colecciones' : 'Seleccionar colección'}</span>
                                {showCollectionPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {/* Collection List */}
                            {showCollectionPicker && (
                                <div className="border border-editor-border rounded-md overflow-hidden max-h-[200px] overflow-y-auto">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-editor-text-secondary text-sm">
                                            Cargando colecciones...
                                        </div>
                                    ) : categories.length === 0 ? (
                                        <div className="p-4 text-center text-editor-text-secondary text-sm">
                                            No hay colecciones. Crea categorías en tu tienda primero.
                                        </div>
                                    ) : (
                                        categories.map(category => (
                                            <button
                                                key={category.id}
                                                onClick={() => handleCollectionSelect(category.id, category.name, category.slug)}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-editor-bg transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded bg-editor-accent/20 flex items-center justify-center flex-shrink-0">
                                                    <FolderOpen size={14} className="text-editor-accent" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-editor-text-primary truncate">{category.name}</p>
                                                    <p className="text-xs text-editor-text-secondary">/{category.slug}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Link Text */}
                    <Input 
                        label="Texto del botón/enlace" 
                        value={message.linkText || ''} 
                        onChange={(e) => onUpdate(index, 'linkText', e.target.value)} 
                        placeholder="Comprar ahora"
                    />

                    {/* Link Preview */}
                    {message.link && (
                        <div className="bg-editor-panel-bg/50 rounded-md p-2 text-xs">
                            <span className="text-editor-text-secondary">Enlace: </span>
                            <span className="text-editor-accent font-mono">{message.link}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Icon options for announcement bar
const announcementIconOptions = [
    { value: 'megaphone', label: '📢 Megáfono' },
    { value: 'tag', label: '🏷️ Etiqueta' },
    { value: 'gift', label: '🎁 Regalo' },
    { value: 'truck', label: '🚚 Envío' },
    { value: 'percent', label: '💯 Porcentaje' },
    { value: 'sparkles', label: '✨ Destellos' },
    { value: 'bell', label: '🔔 Campana' },
    { value: 'info', label: 'ℹ️ Info' },
];

export const useAnnouncementBarControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    if (!data?.announcementBar) return null;

    const d = data.announcementBar;

    // Default messages if none exist
    const messages = d.messages?.length > 0 ? d.messages : [
        { text: '¡Envío gratis en pedidos mayores a $50!', link: '#store', linkText: 'Comprar ahora', linkType: 'manual' as AnnouncementLinkType },
    ];

    // Handler to update a specific message field
    const updateMessage = (index: number, field: string, value: string) => {
        const newMessages = [...messages];
        newMessages[index] = { ...newMessages[index], [field]: value };
        setNestedData('announcementBar.messages', newMessages);
    };

    // Handler to remove a message
    const removeMessage = (index: number) => {
        if (messages.length > 1) {
            const newMessages = messages.filter((_, i) => i !== index);
            setNestedData('announcementBar.messages', newMessages);
        }
    };

    // Handler to add a new message
    const addMessage = () => {
        const newMessages = [...messages, { text: 'Nuevo mensaje', link: '', linkText: '', linkType: 'manual' as AnnouncementLinkType }];
        setNestedData('announcementBar.messages', newMessages);
    };

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('announcementBar.visibleIn', v)} 
            />
            
            {/* Messages Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                        Mensajes ({messages.length})
                    </label>
                    <button
                        onClick={addMessage}
                        className="text-xs px-3 py-1 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors font-medium"
                    >
                        + Agregar
                    </button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto pr-1">
                    {messages.map((message, index) => (
                        <AnnouncementMessageEditor
                            key={index}
                            message={message}
                            index={index}
                            onUpdate={updateMessage}
                            onRemove={removeMessage}
                            storeId={storeId}
                            isOnly={messages.length === 1}
                        />
                    ))}
                </div>
            </div>

            <hr className="border-editor-border/50" />

            {/* Display Options */}
            <ToggleControl label="Mostrar icono" checked={d.showIcon || false} onChange={(v) => setNestedData('announcementBar.showIcon', v)} />
            
            {d.showIcon && (
                <SelectControl
                    label="Icono"
                    value={d.icon || 'megaphone'}
                    options={announcementIconOptions}
                    onChange={(v) => setNestedData('announcementBar.icon', v)}
                />
            )}
            
            <ToggleControl label="Se puede cerrar" checked={d.dismissible || false} onChange={(v) => setNestedData('announcementBar.dismissible', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variante"
                value={d.variant || 'static'}
                options={[
                    { value: 'static', label: 'Estático' },
                    { value: 'scrolling', label: 'Deslizante (Marquee)' },
                    { value: 'rotating', label: 'Rotativo' },
                ]}
                onChange={(v) => setNestedData('announcementBar.variant', v)}
            />

            <FontSizeSelector label="Tamaño de texto" value={d.fontSize || 'sm'} onChange={(v) => setNestedData('announcementBar.fontSize', v)} />

            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'sm'} onChange={(v) => setNestedData('announcementBar.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('announcementBar.paddingX', v)} />
            </div>

            <NumberInput
                label="Altura (px) - opcional"
                value={d.height || 0}
                onChange={(v) => setNestedData('announcementBar.height', v || undefined)}
                min={0}
                max={100}
                step={4}
            />

            {(d.variant === 'scrolling' || d.variant === 'rotating') && (
                <>
                    <hr className="border-editor-border/50" />
                    <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Animación</label>
                    <NumberInput
                        label={d.variant === 'scrolling' ? 'Velocidad (segundos)' : 'Intervalo (ms)'}
                        value={d.speed || (d.variant === 'scrolling' ? 50 : 4000)}
                        onChange={(v) => setNestedData('announcementBar.speed', v)}
                        min={d.variant === 'scrolling' ? 10 : 1000}
                        max={d.variant === 'scrolling' ? 200 : 10000}
                        step={d.variant === 'scrolling' ? 10 : 500}
                    />
                    <ToggleControl label="Pausar al hover" checked={d.pauseOnHover || false} onChange={(v) => setNestedData('announcementBar.pauseOnHover', v)} />
                </>
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colores</label>
            <ColorControl label="Fondo" value={d.colors?.background || '#4f46e5'} onChange={(v) => setNestedData('announcementBar.colors.background', v)} />
            <ColorControl label="Texto" value={d.colors?.text || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.text', v)} />
            <ColorControl label="Color de enlace" value={d.colors?.linkColor || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.linkColor', v)} />
            <ColorControl label="Color de icono" value={d.colors?.iconColor || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.iconColor', v)} />
            <ColorControl label="Borde inferior" value={d.colors?.borderColor || ''} onChange={(v) => setNestedData('announcementBar.colors.borderColor', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

/**
 * CollectionSelectorVisual - Componente separado para el selector de colecciones
 * Esto permite usar hooks de forma segura
 */
interface CollectionSelectorVisualProps {
    storeId: string;
    gridCategories: CategoryItem[];
    selectedCollectionId: string | undefined;
    onSelect: (collection: CategoryItem | null) => void;
}

const CollectionSelectorVisual: React.FC<CollectionSelectorVisualProps> = ({
    storeId,
    gridCategories,
    selectedCollectionId,
    onSelect,
}) => {
    // Hook para obtener categorías de la tienda
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

    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen size={14} />
                Seleccionar Colección
                {isLoading && <Loader2 size={12} className="animate-spin text-editor-accent" />}
            </label>
            
            {isLoading ? (
                <div className="bg-editor-panel-bg border border-editor-border rounded-lg px-4 py-6 text-center">
                    <Loader2 size={24} className="animate-spin text-editor-accent mx-auto mb-2" />
                    <p className="text-sm text-editor-text-secondary">Cargando colecciones...</p>
                </div>
            ) : availableCollections.length > 0 ? (
                <div className="space-y-2">
                    {/* Opción Personalizado */}
                    <button
                        onClick={() => onSelect(null)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                            !selectedCollectionId 
                                ? 'border-editor-accent bg-editor-accent/10' 
                                : 'border-editor-border hover:border-editor-accent/50 bg-editor-panel-bg'
                        }`}
                    >
                        <div className="w-12 h-12 rounded-md bg-editor-bg flex items-center justify-center flex-shrink-0">
                            <Package size={20} className="text-editor-text-secondary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-editor-text-primary">Personalizado</p>
                            <p className="text-xs text-editor-text-secondary truncate">Configura manualmente título e imagen</p>
                        </div>
                        {!selectedCollectionId && (
                            <Check size={18} className="text-editor-accent flex-shrink-0" />
                        )}
                    </button>

                    {/* Lista de Colecciones */}
                    <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                        {availableCollections.map((collection) => (
                            <button
                                key={collection.id}
                                onClick={() => onSelect(collection)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                                    selectedCollectionId === collection.id 
                                        ? 'border-editor-accent bg-editor-accent/10' 
                                        : 'border-editor-border hover:border-editor-accent/50 bg-editor-panel-bg'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-md bg-editor-bg flex-shrink-0 overflow-hidden">
                                    {collection.imageUrl ? (
                                        <img 
                                            src={collection.imageUrl} 
                                            alt={collection.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FolderOpen size={20} className="text-editor-text-secondary" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-editor-text-primary truncate">
                                        {collection.name}
                                    </p>
                                    <p className="text-xs text-editor-text-secondary truncate">
                                        {collection.description || (collection.productCount ? `${collection.productCount} productos` : 'Sin descripción')}
                                    </p>
                                </div>
                                {selectedCollectionId === collection.id && (
                                    <Check size={18} className="text-editor-accent flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-4 text-sm">
                    <div className="flex items-start gap-3">
                        <FolderOpen size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-200 mb-1">No hay colecciones disponibles</p>
                            <p className="text-xs text-editor-text-secondary leading-relaxed">
                                Agrega categorías en el <strong>Dashboard → Categorías</strong> para poder seleccionarlas aquí.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const useCollectionBannerControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    if (!data?.collectionBanner) return null;

    const d = data.collectionBanner;
    const gridCategories = data.categoryGrid?.categories || [];

    // Handler para seleccionar una colección (recibe el objeto completo o null)
    const handleCollectionSelect = (collection: CategoryItem | null) => {
        if (!collection) {
            // Limpiar selección - modo personalizado
            setNestedData('collectionBanner.collectionId', '');
            return;
        }
        
        // Auto-rellenar datos de la colección seleccionada
        setNestedData('collectionBanner.collectionId', collection.id);
        setNestedData('collectionBanner.title', collection.name);
        setNestedData('collectionBanner.description', collection.description || '');
        if (collection.imageUrl) {
            setNestedData('collectionBanner.backgroundImageUrl', collection.imageUrl);
        }
        // Auto-configurar el botón
        setNestedData('collectionBanner.buttonText', `Ver ${collection.name}`);
        setNestedData('collectionBanner.buttonUrl', `#store/category/${collection.slug || collection.id}`);
    };

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('collectionBanner.visibleIn', v)} 
            />
            
            {/* Selector Visual de Colección - Componente separado que maneja sus propios hooks */}
            <CollectionSelectorVisual
                storeId={storeId}
                gridCategories={gridCategories}
                selectedCollectionId={d.collectionId}
                onSelect={handleCollectionSelect}
            />

            <hr className="border-editor-border/50" />

            {/* Personalización del contenido */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                    Personalizar Contenido
                </label>
                <Input label="Título" value={d.title || ''} onChange={(e) => setNestedData('collectionBanner.title', e.target.value)} />
                <FontSizeSelector label="Tamaño del Título" value={d.headlineFontSize || 'xl'} onChange={(v) => setNestedData('collectionBanner.headlineFontSize', v)} />
                <TextArea label="Descripción" value={d.description || ''} onChange={(e) => setNestedData('collectionBanner.description', e.target.value)} rows={2} />
            </div>
            
            <hr className="border-editor-border/50" />

            {/* Configuración del botón */}
            <div className="space-y-3">
                <ToggleControl label="Mostrar Botón" checked={d.showButton !== false} onChange={(v) => setNestedData('collectionBanner.showButton', v)} />
                {d.showButton !== false && (
                    <Input label="Texto del Botón" value={d.buttonText || ''} onChange={(e) => setNestedData('collectionBanner.buttonText', e.target.value)} />
                )}
            </div>

            <hr className="border-editor-border/50" />

            {/* Imagen de fondo */}
            <div className="mb-3">
                <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    Imagen de Fondo
                </label>
                <ImagePicker 
                    label="" 
                    value={d.backgroundImageUrl || ''} 
                    onChange={(url) => setNestedData('collectionBanner.backgroundImageUrl', url)} 
                />
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'hero'}
                options={[
                    { value: 'hero', label: 'Hero' },
                    { value: 'split', label: 'Split' },
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'overlay', label: 'Overlay Card' },
                ]}
                onChange={(v) => setNestedData('collectionBanner.variant', v)}
            />

            <NumberInput
                label="Height (px)"
                value={d.height || 400}
                onChange={(v) => setNestedData('collectionBanner.height', v)}
                min={200}
                max={700}
                step={50}
            />

            <SelectControl
                label="Text Alignment"
                value={d.textAlignment || 'center'}
                options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                ]}
                onChange={(v) => setNestedData('collectionBanner.textAlignment', v)}
            />

            <SelectControl
                label="Overlay Style"
                value={d.overlayStyle || 'gradient'}
                options={[
                    { value: 'gradient', label: 'Gradient' },
                    { value: 'solid', label: 'Solid' },
                    { value: 'none', label: 'None' },
                ]}
                onChange={(v) => setNestedData('collectionBanner.overlayStyle', v)}
            />

            {d.overlayStyle !== 'none' && (
                <NumberInput
                    label="Overlay Opacity (%)"
                    value={d.overlayOpacity || 50}
                    onChange={(v) => setNestedData('collectionBanner.overlayOpacity', v)}
                    min={0}
                    max={100}
                    step={5}
                />
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('collectionBanner.colors.background', v)} />
            <ColorControl label="Overlay Color" value={d.colors?.overlayColor || '#000000'} onChange={(v) => setNestedData('collectionBanner.colors.overlayColor', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('collectionBanner.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#ffffff'} onChange={(v) => setNestedData('collectionBanner.colors.text', v)} />
            <ColorControl label="Button Background" value={d.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('collectionBanner.colors.buttonBackground', v)} />
            <ColorControl label="Button Text" value={d.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('collectionBanner.colors.buttonText', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useRecentlyViewedControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.recentlyViewed) return null;

    const d = data.recentlyViewed;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('recentlyViewed.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('recentlyViewed.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('recentlyViewed.titleFontSize', v)} />
            <Input label="Description" value={d.description || ''} onChange={(e) => setNestedData('recentlyViewed.description', e.target.value)} />
            
            <hr className="border-editor-border/50" />

            <NumberInput
                label="Max Products"
                value={d.maxProducts || 10}
                onChange={(v) => setNestedData('recentlyViewed.maxProducts', v)}
                min={3}
                max={20}
            />

            <ToggleControl label="Show Price" checked={d.showPrice !== false} onChange={(v) => setNestedData('recentlyViewed.showPrice', v)} />
            <ToggleControl label="Show Rating" checked={d.showRating || false} onChange={(v) => setNestedData('recentlyViewed.showRating', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'carousel'}
                options={[
                    { value: 'carousel', label: 'Carousel' },
                    { value: 'grid', label: 'Grid' },
                    { value: 'compact', label: 'Compact' },
                ]}
                onChange={(v) => setNestedData('recentlyViewed.variant', v)}
            />

            <SelectControl
                label="Columns"
                value={String(d.columns || 5)}
                options={[
                    { value: '2', label: '2 Columns' },
                    { value: '3', label: '3 Columns' },
                    { value: '4', label: '4 Columns' },
                    { value: '5', label: '5 Columns' },
                    { value: '6', label: '6 Columns' },
                ]}
                onChange={(v) => setNestedData('recentlyViewed.columns', Number(v))}
            />

            <SelectControl
                label="Card Style"
                value={d.cardStyle || 'minimal'}
                options={[
                    { value: 'minimal', label: 'Minimal' },
                    { value: 'modern', label: 'Modern' },
                    { value: 'elegant', label: 'Elegant' },
                    { value: 'overlay', label: 'Overlay' },
                ]}
                onChange={(v) => setNestedData('recentlyViewed.cardStyle', v)}
            />

            {d.variant === 'carousel' && (
                <>
                    <ToggleControl label="Auto Scroll" checked={d.autoScroll || false} onChange={(v) => setNestedData('recentlyViewed.autoScroll', v)} />
                    <ToggleControl label="Show Arrows" checked={d.showArrows !== false} onChange={(v) => setNestedData('recentlyViewed.showArrows', v)} />
                </>
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('recentlyViewed.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('recentlyViewed.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('recentlyViewed.colors.text', v)} />
            <ColorControl label="Card Background" value={d.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('recentlyViewed.colors.cardBackground', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useProductReviewsControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.productReviews) return null;

    const d = data.productReviews;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('productReviews.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('productReviews.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('productReviews.titleFontSize', v)} />
            <Input label="Description" value={d.description || ''} onChange={(e) => setNestedData('productReviews.description', e.target.value)} />
            
            <hr className="border-editor-border/50" />

            <NumberInput
                label="Max Reviews"
                value={d.maxReviews || 6}
                onChange={(v) => setNestedData('productReviews.maxReviews', v)}
                min={1}
                max={20}
            />

            <ToggleControl label="Show Rating Distribution" checked={d.showRatingDistribution !== false} onChange={(v) => setNestedData('productReviews.showRatingDistribution', v)} />
            <ToggleControl label="Show Photos" checked={d.showPhotos || false} onChange={(v) => setNestedData('productReviews.showPhotos', v)} />
            <ToggleControl label="Show Verified Badge" checked={d.showVerifiedBadge !== false} onChange={(v) => setNestedData('productReviews.showVerifiedBadge', v)} />
            <ToggleControl label="Show Product Info" checked={d.showProductInfo || false} onChange={(v) => setNestedData('productReviews.showProductInfo', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'cards'}
                options={[
                    { value: 'list', label: 'List' },
                    { value: 'cards', label: 'Cards' },
                    { value: 'masonry', label: 'Masonry' },
                    { value: 'featured', label: 'Featured' },
                ]}
                onChange={(v) => setNestedData('productReviews.variant', v)}
            />

            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'lg'} onChange={(v) => setNestedData('productReviews.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('productReviews.paddingX', v)} />
            </div>

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#0f172a'} onChange={(v) => setNestedData('productReviews.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('productReviews.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('productReviews.colors.text', v)} />
            <ColorControl label="Card Background" value={d.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('productReviews.colors.cardBackground', v)} />
            <ColorControl label="Star Color" value={d.colors?.starColor || '#fbbf24'} onChange={(v) => setNestedData('productReviews.colors.starColor', v)} />
            <ColorControl label="Verified Badge" value={d.colors?.verifiedBadgeColor || '#10b981'} onChange={(v) => setNestedData('productReviews.colors.verifiedBadgeColor', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

// Component to show pricing info - uses hooks internally so it's safe
const BundlePricingInfo: React.FC<{ storeId: string; productIds: string[]; discountPercent: number }> = ({ 
    storeId, 
    productIds, 
    discountPercent 
}) => {
    const { products: allProducts } = usePublicProducts(storeId, { limitCount: 100 });
    
    const selectedProducts = productIds
        .map(id => allProducts.find(p => p.id === id))
        .filter(Boolean);
    
    if (selectedProducts.length === 0) return null;
    
    const calculatedOriginalPrice = selectedProducts.reduce((sum, p) => sum + (p?.price || 0), 0);
    const calculatedBundlePrice = calculatedOriginalPrice * (1 - discountPercent / 100);
    
    return (
        <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-editor-accent mb-2 font-semibold">💰 Precios Calculados</p>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-editor-text-secondary">Precio original:</span>
                    <span className="text-editor-text-primary line-through">${calculatedOriginalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-editor-text-secondary">Descuento:</span>
                    <span className="text-editor-accent">-{discountPercent}%</span>
                </div>
                <div className="flex justify-between font-semibold">
                    <span className="text-editor-text-primary">Precio bundle:</span>
                    <span className="text-green-400">${calculatedBundlePrice.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export const useProductBundleControls = ({ data, setNestedData, storeId = '' }: EcommerceControlsProps) => {
    if (!data?.productBundle) return null;

    const d = data.productBundle;

    const contentTab = (
        <div className="space-y-4">
            <VisibilityContextSelector 
                value={d.visibleIn} 
                onChange={(v) => setNestedData('productBundle.visibleIn', v)} 
            />
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('productBundle.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('productBundle.titleFontSize', v)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('productBundle.description', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            {/* Product Selector */}
            <div className="mb-4">
                <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} />
                    Productos del Bundle
                </label>
                {storeId ? (
                    <ProductSelector
                        selectedIds={d.productIds || []}
                        onChange={(ids) => setNestedData('productBundle.productIds', ids)}
                        storeId={storeId}
                    />
                ) : (
                    <div className="bg-editor-panel-bg/50 border border-editor-border/50 rounded-md px-3 py-3 text-sm text-editor-text-secondary">
                        <p>No hay tienda conectada.</p>
                        <p className="text-xs opacity-70 mt-1">Conecta una tienda para seleccionar productos.</p>
                    </div>
                )}
            </div>

            {/* Pricing Info - Component uses hook internally */}
            {storeId && d.productIds?.length > 0 && (
                <BundlePricingInfo 
                    storeId={storeId} 
                    productIds={d.productIds} 
                    discountPercent={d.discountPercent || 15} 
                />
            )}

            <hr className="border-editor-border/50" />

            <NumberInput
                label="Descuento (%)"
                value={d.discountPercent || 15}
                onChange={(v) => setNestedData('productBundle.discountPercent', v)}
                min={0}
                max={90}
                step={5}
            />

            <Input label="Button Text" value={d.buttonText || 'Agregar Bundle al Carrito'} onChange={(e) => setNestedData('productBundle.buttonText', e.target.value)} />
            <Input label="Button URL (opcional)" value={d.buttonUrl || ''} onChange={(e) => setNestedData('productBundle.buttonUrl', e.target.value)} placeholder="#checkout o URL" />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Savings" checked={d.showSavings !== false} onChange={(v) => setNestedData('productBundle.showSavings', v)} />
            {d.showSavings !== false && (
                <Input label="Savings Text" value={d.savingsText || 'Ahorra'} onChange={(e) => setNestedData('productBundle.savingsText', e.target.value)} />
            )}
            <ToggleControl label="Show Individual Prices" checked={d.showIndividualPrices !== false} onChange={(v) => setNestedData('productBundle.showIndividualPrices', v)} />
            <ToggleControl label="Show Badge" checked={d.showBadge || false} onChange={(v) => setNestedData('productBundle.showBadge', v)} />
            {d.showBadge && (
                <Input label="Badge Text" value={d.badgeText || 'Bundle'} onChange={(e) => setNestedData('productBundle.badgeText', e.target.value)} />
            )}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'horizontal'}
                options={[
                    { value: 'horizontal', label: 'Horizontal' },
                    { value: 'vertical', label: 'Vertical' },
                    { value: 'compact', label: 'Compact' },
                ]}
                onChange={(v) => setNestedData('productBundle.variant', v)}
            />

            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'lg'} onChange={(v) => setNestedData('productBundle.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('productBundle.paddingX', v)} />
            </div>

            <BorderRadiusSelector label="Border Radius" value={d.borderRadius || 'xl'} onChange={(v) => setNestedData('productBundle.borderRadius', v)} />

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#1e293b'} onChange={(v) => setNestedData('productBundle.colors.background', v)} />
            <ColorControl label="Heading" value={d.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('productBundle.colors.heading', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('productBundle.colors.text', v)} />
            <ColorControl label="Card Background" value={d.colors?.cardBackground || '#0f172a'} onChange={(v) => setNestedData('productBundle.colors.cardBackground', v)} />
            <ColorControl label="Price Color" value={d.colors?.priceColor || '#ffffff'} onChange={(v) => setNestedData('productBundle.colors.priceColor', v)} />
            <ColorControl label="Savings Color" value={d.colors?.savingsColor || '#10b981'} onChange={(v) => setNestedData('productBundle.colors.savingsColor', v)} />
            <ColorControl label="Button Background" value={d.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('productBundle.colors.buttonBackground', v)} />
            <ColorControl label="Badge Background" value={d.colors?.badgeBackground || '#4f46e5'} onChange={(v) => setNestedData('productBundle.colors.badgeBackground', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

// ============================================================================
// STORE SETTINGS CONTROLS
// ============================================================================
export const useStoreSettingsControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data) return null;
    
    // Use defaults if storeSettings doesn't exist yet
    const settings = data.storeSettings;
    const showFilterSidebar = settings?.showFilterSidebar !== false;
    const showSearchBar = settings?.showSearchBar !== false;
    const showSortOptions = settings?.showSortOptions !== false;
    const showViewModeToggle = settings?.showViewModeToggle !== false;
    const showRatings = settings?.showRatings !== false;
    const showBadges = settings?.showBadges !== false;
    const showQuickView = settings?.showQuickView === true;
    const showAddToCart = settings?.showAddToCart !== false;
    const showWishlist = settings?.showWishlist === true;
    const showCompare = settings?.showCompare === true;
    const defaultViewMode = settings?.defaultViewMode || 'grid';
    const productsPerPage = settings?.productsPerPage || 12;
    const gridColumns = settings?.gridColumns || 4;
    const cardStyle = settings?.cardStyle || 'modern';
    const borderRadius = settings?.borderRadius || 'xl';
    const showPagination = settings?.showPagination !== false;
    const infiniteScroll = settings?.infiniteScroll === true;
    const paddingY = settings?.paddingY || 'md';
    const paddingX = settings?.paddingX || 'md';
    const cardGap = settings?.cardGap || 'md';
    
    // Colors with defaults - Store Settings (Product Search Page)
    const background = settings?.colors?.background || '#ffffff';
    const heading = settings?.colors?.heading || '#1f2937';
    const text = settings?.colors?.text || '#6b7280';
    const accent = settings?.colors?.accent || '#4f46e5';
    const cardBackground = settings?.colors?.cardBackground || '#ffffff';
    const cardText = settings?.colors?.cardText || '#1f2937';
    const buttonBackground = settings?.colors?.buttonBackground || '#4f46e5';
    const buttonText = settings?.colors?.buttonText || '#ffffff';
    const badgeBackground = settings?.colors?.badgeBackground || '#ef4444';
    const badgeText = settings?.colors?.badgeText || '#ffffff';
    const priceColor = settings?.colors?.priceColor || '#1f2937';
    const salePriceColor = settings?.colors?.salePriceColor || '#ef4444';
    const borderColor = settings?.colors?.borderColor || '#e5e7eb';
    const starColor = settings?.colors?.starColor || '#fbbf24';
    
    // Colors for Product Detail Page
    const productDetail = data.productDetailPage;
    const pdBackground = productDetail?.colors?.background || '#ffffff';
    const pdHeading = productDetail?.colors?.heading || '#1f2937';
    const pdText = productDetail?.colors?.text || '#6b7280';
    const pdAccent = productDetail?.colors?.accent || '#4f46e5';
    const pdCardBackground = productDetail?.colors?.cardBackground || '#ffffff';
    const pdCardText = productDetail?.colors?.cardText || '#1f2937';
    const pdButtonBackground = productDetail?.colors?.buttonBackground || '#4f46e5';
    const pdButtonText = productDetail?.colors?.buttonText || '#ffffff';
    const pdBadgeBackground = productDetail?.colors?.badgeBackground || '#ef4444';
    const pdBadgeText = productDetail?.colors?.badgeText || '#ffffff';
    const pdPriceColor = productDetail?.colors?.priceColor || '#1f2937';
    const pdSalePriceColor = productDetail?.colors?.salePriceColor || '#ef4444';
    const pdBorderColor = productDetail?.colors?.borderColor || '#e5e7eb';
    const pdStarColor = productDetail?.colors?.starColor || '#fbbf24';
    const pdLinkColor = productDetail?.colors?.linkColor || '#4f46e5';
    
    const contentTab = (
        <div className="space-y-4">
            {/* Display Options */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <SlidersHorizontal size={14} />
                    Display Options
                </label>
                <div className="space-y-3">
                    <ToggleControl
                        label="Show Filter Sidebar"
                        checked={showFilterSidebar}
                        onChange={(v) => setNestedData('storeSettings.showFilterSidebar', v)}
                    />
                    <ToggleControl
                        label="Show Search Bar"
                        checked={showSearchBar}
                        onChange={(v) => setNestedData('storeSettings.showSearchBar', v)}
                    />
                    <ToggleControl
                        label="Show Sort Options"
                        checked={showSortOptions}
                        onChange={(v) => setNestedData('storeSettings.showSortOptions', v)}
                    />
                    <ToggleControl
                        label="Show View Mode Toggle"
                        checked={showViewModeToggle}
                        onChange={(v) => setNestedData('storeSettings.showViewModeToggle', v)}
                    />
                </div>
            </div>

            {/* Product Card Options */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <ShoppingBag size={14} />
                    Product Cards
                </label>
                <div className="space-y-3">
                    <ToggleControl
                        label="Show Ratings"
                        checked={showRatings}
                        onChange={(v) => setNestedData('storeSettings.showRatings', v)}
                    />
                    <ToggleControl
                        label="Show Badges (Sale, New)"
                        checked={showBadges}
                        onChange={(v) => setNestedData('storeSettings.showBadges', v)}
                    />
                    <ToggleControl
                        label="Show Add to Cart"
                        checked={showAddToCart}
                        onChange={(v) => setNestedData('storeSettings.showAddToCart', v)}
                    />
                    <ToggleControl
                        label="Show Quick View"
                        checked={showQuickView}
                        onChange={(v) => setNestedData('storeSettings.showQuickView', v)}
                    />
                    <ToggleControl
                        label="Show Wishlist"
                        checked={showWishlist}
                        onChange={(v) => setNestedData('storeSettings.showWishlist', v)}
                    />
                    <ToggleControl
                        label="Show Compare"
                        checked={showCompare}
                        onChange={(v) => setNestedData('storeSettings.showCompare', v)}
                    />
                </div>
            </div>

            {/* Pagination Options */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <LayoutGrid size={14} />
                    Pagination
                </label>
                <div className="space-y-3">
                    <SelectControl
                        label="Products Per Page"
                        value={String(productsPerPage)}
                        options={[
                            { value: '6', label: '6 products' },
                            { value: '9', label: '9 products' },
                            { value: '12', label: '12 products' },
                            { value: '18', label: '18 products' },
                            { value: '24', label: '24 products' },
                        ]}
                        onChange={(v) => setNestedData('storeSettings.productsPerPage', Number(v))}
                    />
                    <ToggleControl
                        label="Show Pagination"
                        checked={showPagination}
                        onChange={(v) => setNestedData('storeSettings.showPagination', v)}
                    />
                    <ToggleControl
                        label="Infinite Scroll"
                        checked={infiniteScroll}
                        onChange={(v) => setNestedData('storeSettings.infiniteScroll', v)}
                    />
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-400 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 flex-shrink-0" />
                    <span>These settings control how the store page displays products. Go to the Ecommerce Dashboard to manage products and inventory.</span>
                </p>
            </div>
        </div>
    );
    
    const styleTab = (
        <div className="space-y-4">
            {/* Layout */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <LayoutGrid size={14} />
                    Layout
                </label>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Default View Mode</label>
                        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                            <button
                                onClick={() => setNestedData('storeSettings.defaultViewMode', 'grid')}
                                className={`flex-1 py-2 text-xs font-medium rounded-sm transition-colors flex items-center justify-center gap-1 ${defaultViewMode === 'grid' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                            >
                                <Grid size={14} />
                                Grid
                            </button>
                            <button
                                onClick={() => setNestedData('storeSettings.defaultViewMode', 'list')}
                                className={`flex-1 py-2 text-xs font-medium rounded-sm transition-colors flex items-center justify-center gap-1 ${defaultViewMode === 'list' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                            >
                                <List size={14} />
                                List
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Grid Columns</label>
                        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                            {[2, 3, 4, 5].map((cols) => (
                                <button
                                    key={cols}
                                    onClick={() => setNestedData('storeSettings.gridColumns', cols)}
                                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${gridColumns === cols ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                                >
                                    {cols}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <SelectControl
                        label="Card Style"
                        value={cardStyle}
                        options={[
                            { value: 'minimal', label: 'Minimal' },
                            { value: 'modern', label: 'Modern' },
                            { value: 'elegant', label: 'Elegant' },
                            { value: 'overlay', label: 'Overlay' },
                        ]}
                        onChange={(v) => setNestedData('storeSettings.cardStyle', v)}
                    />
                    
                    <BorderRadiusSelector
                        label="Border Radius"
                        value={borderRadius}
                        onChange={(v) => setNestedData('storeSettings.borderRadius', v)}
                        extended
                    />
                    
                    <div>
                        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Card Gap</label>
                        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                            {['sm', 'md', 'lg'].map((gap) => (
                                <button
                                    key={gap}
                                    onClick={() => setNestedData('storeSettings.cardGap', gap)}
                                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${cardGap === gap ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                                >
                                    {gap.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacing */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Maximize2 size={14} />
                    Spacing
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <PaddingSelector label="Vertical" value={paddingY} onChange={(v) => setNestedData('storeSettings.paddingY', v)} showNone showXl />
                    <PaddingSelector label="Horizontal" value={paddingX} onChange={(v) => setNestedData('storeSettings.paddingX', v)} showNone showXl />
                </div>
            </div>

            {/* Colors - Product Search Page */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Palette size={14} />
                    Product Search Colors
                </label>
                <div className="space-y-2">
                    <ColorControl label="Background" value={background} onChange={(v) => setNestedData('storeSettings.colors.background', v)} />
                    <ColorControl label="Heading" value={heading} onChange={(v) => setNestedData('storeSettings.colors.heading', v)} />
                    <ColorControl label="Text" value={text} onChange={(v) => setNestedData('storeSettings.colors.text', v)} />
                    <ColorControl label="Accent" value={accent} onChange={(v) => setNestedData('storeSettings.colors.accent', v)} />
                    <ColorControl label="Card Background" value={cardBackground} onChange={(v) => setNestedData('storeSettings.colors.cardBackground', v)} />
                    <ColorControl label="Card Text" value={cardText} onChange={(v) => setNestedData('storeSettings.colors.cardText', v)} />
                    <ColorControl label="Button Background" value={buttonBackground} onChange={(v) => setNestedData('storeSettings.colors.buttonBackground', v)} />
                    <ColorControl label="Button Text" value={buttonText} onChange={(v) => setNestedData('storeSettings.colors.buttonText', v)} />
                    <ColorControl label="Badge Background" value={badgeBackground} onChange={(v) => setNestedData('storeSettings.colors.badgeBackground', v)} />
                    <ColorControl label="Badge Text" value={badgeText} onChange={(v) => setNestedData('storeSettings.colors.badgeText', v)} />
                    <ColorControl label="Price" value={priceColor} onChange={(v) => setNestedData('storeSettings.colors.priceColor', v)} />
                    <ColorControl label="Sale Price" value={salePriceColor} onChange={(v) => setNestedData('storeSettings.colors.salePriceColor', v)} />
                    <ColorControl label="Border" value={borderColor} onChange={(v) => setNestedData('storeSettings.colors.borderColor', v)} />
                    <ColorControl label="Star" value={starColor} onChange={(v) => setNestedData('storeSettings.colors.starColor', v)} />
                </div>
            </div>

            {/* Colors - Product Detail Page */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                    <Palette size={14} />
                    Product Detail Colors
                </label>
                <div className="space-y-2">
                    <ColorControl label="Background" value={pdBackground} onChange={(v) => setNestedData('productDetailPage.colors.background', v)} />
                    <ColorControl label="Heading" value={pdHeading} onChange={(v) => setNestedData('productDetailPage.colors.heading', v)} />
                    <ColorControl label="Text" value={pdText} onChange={(v) => setNestedData('productDetailPage.colors.text', v)} />
                    <ColorControl label="Accent" value={pdAccent} onChange={(v) => setNestedData('productDetailPage.colors.accent', v)} />
                    <ColorControl label="Card Background" value={pdCardBackground} onChange={(v) => setNestedData('productDetailPage.colors.cardBackground', v)} />
                    <ColorControl label="Card Text" value={pdCardText} onChange={(v) => setNestedData('productDetailPage.colors.cardText', v)} />
                    <ColorControl label="Button Background" value={pdButtonBackground} onChange={(v) => setNestedData('productDetailPage.colors.buttonBackground', v)} />
                    <ColorControl label="Button Text" value={pdButtonText} onChange={(v) => setNestedData('productDetailPage.colors.buttonText', v)} />
                    <ColorControl label="Badge Background" value={pdBadgeBackground} onChange={(v) => setNestedData('productDetailPage.colors.badgeBackground', v)} />
                    <ColorControl label="Badge Text" value={pdBadgeText} onChange={(v) => setNestedData('productDetailPage.colors.badgeText', v)} />
                    <ColorControl label="Price" value={pdPriceColor} onChange={(v) => setNestedData('productDetailPage.colors.priceColor', v)} />
                    <ColorControl label="Sale Price" value={pdSalePriceColor} onChange={(v) => setNestedData('productDetailPage.colors.salePriceColor', v)} />
                    <ColorControl label="Border" value={pdBorderColor} onChange={(v) => setNestedData('productDetailPage.colors.borderColor', v)} />
                    <ColorControl label="Star" value={pdStarColor} onChange={(v) => setNestedData('productDetailPage.colors.starColor', v)} />
                    <ColorControl label="Link" value={pdLinkColor} onChange={(v) => setNestedData('productDetailPage.colors.linkColor', v)} />
                </div>
            </div>
        </div>
    );
    
    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
