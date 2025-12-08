/**
 * EcommerceControls
 * Control panels for all ecommerce section components
 */

import React from 'react';
import { PageData } from '../../types';
import ColorControl from './ColorControl';
import TabbedControls from './TabbedControls';

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

interface EcommerceControlsProps {
    data: PageData;
    setNestedData: (path: string, value: any) => void;
}

export const useFeaturedProductsControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.featuredProducts) return null;

    const d = data.featuredProducts;

    const contentTab = (
        <div className="space-y-4">
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
                onChange={(v) => setNestedData('featuredProducts.sourceType', v)}
            />

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
                <PaddingSelector label="Vertical" value={d.paddingY || 'lg'} onChange={(v) => setNestedData('featuredProducts.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('featuredProducts.paddingX', v)} />
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

            <BorderRadiusSelector label="Border Radius" value={d.borderRadius || 'xl'} onChange={(v) => setNestedData('featuredProducts.borderRadius', v)} />

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

export const useTrustBadgesControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.trustBadges) return null;

    const d = data.trustBadges;

    const contentTab = (
        <div className="space-y-4">
            <Input label="Title (optional)" value={d.title || ''} onChange={(e) => setNestedData('trustBadges.title', e.target.value)} />
            
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
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <PaddingSelector label="Vertical" value={d.paddingY || 'md'} onChange={(v) => setNestedData('trustBadges.paddingY', v)} />
                <PaddingSelector label="Horizontal" value={d.paddingX || 'md'} onChange={(v) => setNestedData('trustBadges.paddingX', v)} />
            </div>

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
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useAnnouncementBarControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.announcementBar) return null;

    const d = data.announcementBar;
    const firstMessage = d.messages?.[0] || { text: '', link: '', linkText: '' };

    const contentTab = (
        <div className="space-y-4">
            <Input 
                label="Message Text" 
                value={firstMessage.text || ''} 
                onChange={(e) => setNestedData('announcementBar.messages', [{ ...firstMessage, text: e.target.value }])} 
            />
            <Input 
                label="Link URL" 
                value={firstMessage.link || ''} 
                onChange={(e) => setNestedData('announcementBar.messages', [{ ...firstMessage, link: e.target.value }])} 
                placeholder="#store or https://..."
            />
            <Input 
                label="Link Text" 
                value={firstMessage.linkText || ''} 
                onChange={(e) => setNestedData('announcementBar.messages', [{ ...firstMessage, linkText: e.target.value }])} 
                placeholder="Shop now"
            />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Icon" checked={d.showIcon || false} onChange={(v) => setNestedData('announcementBar.showIcon', v)} />
            <ToggleControl label="Dismissible" checked={d.dismissible || false} onChange={(v) => setNestedData('announcementBar.dismissible', v)} />
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <SelectControl
                label="Variant"
                value={d.variant || 'static'}
                options={[
                    { value: 'static', label: 'Static' },
                    { value: 'scrolling', label: 'Scrolling' },
                    { value: 'rotating', label: 'Rotating' },
                ]}
                onChange={(v) => setNestedData('announcementBar.variant', v)}
            />

            <FontSizeSelector label="Font Size" value={d.fontSize || 'sm'} onChange={(v) => setNestedData('announcementBar.fontSize', v)} />

            {(d.variant === 'scrolling' || d.variant === 'rotating') && (
                <>
                    <NumberInput
                        label="Speed (ms)"
                        value={d.speed || 50}
                        onChange={(v) => setNestedData('announcementBar.speed', v)}
                        min={10}
                        max={200}
                    />
                    <ToggleControl label="Pause on Hover" checked={d.pauseOnHover || false} onChange={(v) => setNestedData('announcementBar.pauseOnHover', v)} />
                </>
            )}

            <hr className="border-editor-border/50" />

            <label className="block text-xs font-semibold text-editor-text-secondary uppercase tracking-wider">Colors</label>
            <ColorControl label="Background" value={d.colors?.background || '#4f46e5'} onChange={(v) => setNestedData('announcementBar.colors.background', v)} />
            <ColorControl label="Text" value={d.colors?.text || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.text', v)} />
            <ColorControl label="Link Color" value={d.colors?.linkColor || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.linkColor', v)} />
            <ColorControl label="Icon Color" value={d.colors?.iconColor || '#ffffff'} onChange={(v) => setNestedData('announcementBar.colors.iconColor', v)} />
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};

export const useCollectionBannerControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.collectionBanner) return null;

    const d = data.collectionBanner;

    const contentTab = (
        <div className="space-y-4">
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('collectionBanner.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.headlineFontSize || 'xl'} onChange={(v) => setNestedData('collectionBanner.headlineFontSize', v)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('collectionBanner.description', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Button" checked={d.showButton !== false} onChange={(v) => setNestedData('collectionBanner.showButton', v)} />
            {d.showButton !== false && (
                <>
                    <Input label="Button Text" value={d.buttonText || ''} onChange={(e) => setNestedData('collectionBanner.buttonText', e.target.value)} />
                    <Input label="Button URL" value={d.buttonUrl || ''} onChange={(e) => setNestedData('collectionBanner.buttonUrl', e.target.value)} placeholder="#store/category/..." />
                </>
            )}

            <hr className="border-editor-border/50" />

            <Input label="Background Image URL" value={d.backgroundImageUrl || ''} onChange={(e) => setNestedData('collectionBanner.backgroundImageUrl', e.target.value)} />
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

export const useProductBundleControls = ({ data, setNestedData }: EcommerceControlsProps) => {
    if (!data?.productBundle) return null;

    const d = data.productBundle;

    const contentTab = (
        <div className="space-y-4">
            <Input label="Title" value={d.title || ''} onChange={(e) => setNestedData('productBundle.title', e.target.value)} />
            <FontSizeSelector label="Title Size" value={d.titleFontSize || 'lg'} onChange={(v) => setNestedData('productBundle.titleFontSize', v)} />
            <TextArea label="Description" value={d.description || ''} onChange={(e) => setNestedData('productBundle.description', e.target.value)} rows={2} />
            
            <hr className="border-editor-border/50" />

            <NumberInput
                label="Bundle Price ($)"
                value={d.bundlePrice || 0}
                onChange={(v) => setNestedData('productBundle.bundlePrice', v)}
                min={0}
                step={0.01}
            />

            <NumberInput
                label="Original Price ($)"
                value={d.originalPrice || 0}
                onChange={(v) => setNestedData('productBundle.originalPrice', v)}
                min={0}
                step={0.01}
            />

            <Input label="Button Text" value={d.buttonText || 'Add Bundle to Cart'} onChange={(e) => setNestedData('productBundle.buttonText', e.target.value)} />

            <hr className="border-editor-border/50" />

            <ToggleControl label="Show Savings" checked={d.showSavings !== false} onChange={(v) => setNestedData('productBundle.showSavings', v)} />
            {d.showSavings !== false && (
                <Input label="Savings Text" value={d.savingsText || 'Save'} onChange={(e) => setNestedData('productBundle.savingsText', e.target.value)} />
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
