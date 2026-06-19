import React from 'react';
import {
    AnnouncementBar,
    CategoryGrid,
    CollectionBanner,
    FeaturedProducts,
    ProductBundle,
    ProductHero,
    ProductReviews,
    RecentlyViewed,
    SaleCountdown,
    TrustBadges,
} from './sections';
import type { StorefrontSectionKind, StorefrontSectionRenderDecision } from '../../types/storefrontRenderer';
import type { StorefrontGlobalColors } from './hooks/useUnifiedStorefrontColors';
import type { StorefrontEditorBlock } from '../../types/storefrontEditor';

interface StorefrontModuleRendererProps {
    storeId: string;
    decisions: StorefrontSectionRenderDecision[];
    globalColors?: StorefrontGlobalColors;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
}

const storefrontComponentMap: Record<StorefrontSectionKind, React.FC<any>> = {
    announcementBar: AnnouncementBar,
    header: () => null,
    hero: ProductHero,
    productHero: ProductHero,
    categoryTiles: CategoryGrid,
    featuredCollection: FeaturedProducts,
    productGrid: FeaturedProducts,
    featuredProducts: FeaturedProducts,
    promoBanner: () => null,
    imageWithText: () => null,
    categoryGrid: CategoryGrid,
    trustBadges: TrustBadges,
    testimonials: () => null,
    newsletter: () => null,
    faq: () => null,
    storeFooter: () => null,
    policiesAndLinks: () => null,
    newsletterPopup: () => null,
    cartDrawer: () => null,
    saleCountdown: SaleCountdown,
    collectionBanner: CollectionBanner,
    recentlyViewed: RecentlyViewed,
    productReviews: ProductReviews,
    productBundle: ProductBundle,
};

const GENERIC_SECTION_KINDS = new Set<StorefrontSectionKind>([
    'header',
    'promoBanner',
    'imageWithText',
    'testimonials',
    'newsletter',
    'faq',
    'storeFooter',
    'policiesAndLinks',
    'newsletterPopup',
    'cartDrawer',
]);

const getEditorPreviewState = () => {
    if (typeof window === 'undefined') {
        return { isEditorPreview: false, selectedSectionId: '', selectedBlockId: '' };
    }

    const params = new URLSearchParams(window.location.search);
    return {
        isEditorPreview: params.get('preview') === 'storefront-editor',
        selectedSectionId: params.get('selectedSectionId') || '',
        selectedBlockId: params.get('selectedBlockId') || '',
    };
};

const postEditorSelection = (payload: Record<string, unknown>) => {
    if (typeof window === 'undefined' || window.parent === window) return;
    window.parent.postMessage({ type: 'quimera:storefront-editor:select', ...payload }, window.location.origin);
};

const normalizeComponentData = (
    kind: StorefrontSectionKind,
    data: Record<string, unknown>,
): Record<string, unknown> => {
    if (kind === 'hero') {
        return {
            ...data,
            headline: data.headline || data.heading || data.title,
            subheadline: data.subheadline || data.subheading || data.description,
            buttonText: data.buttonText || data.buttonLabel,
            buttonUrl: data.buttonUrl || data.buttonLink,
            layout: data.layout || 'split',
        };
    }

    if (kind === 'categoryTiles') {
        return {
            ...data,
            variant: data.variant === 'carousel' ? 'cards' : data.variant,
            title: data.title || 'Compra por categoría',
        };
    }

    if (kind === 'featuredCollection' || kind === 'productGrid') {
        return {
            ...data,
            title: data.title || (kind === 'productGrid' ? 'Productos' : 'Colección destacada'),
            sourceType: data.sourceType === 'featured' ? 'newest' : data.sourceType,
        };
    }

    return data;
};

const GenericStorefrontSection: React.FC<{
    kind: StorefrontSectionKind;
    data: Record<string, any>;
    globalColors?: StorefrontGlobalColors;
    selectedBlockId?: string;
    isEditorPreview?: boolean;
}> = ({ kind, data, globalColors, selectedBlockId, isEditorPreview }) => {
    if ((kind === 'newsletterPopup' || kind === 'cartDrawer') && !isEditorPreview) return null;

    const blocks = Array.isArray(data.blocks) ? data.blocks as StorefrontEditorBlock[] : [];
    const title = data.title || data.headline || data.logoText || data.text || '';
    const description = data.description || data.subheadline || data.body || '';
    const isFooter = kind === 'storeFooter' || kind === 'policiesAndLinks';
    const isHeader = kind === 'header';
    const isOverlay = kind === 'newsletterPopup' || kind === 'cartDrawer';
    const background = isFooter
        ? (globalColors?.heading || '#111827')
        : (data.colorScheme === 'scheme2' ? globalColors?.cardBackground : globalColors?.background) || '#ffffff';
    const textColor = isFooter ? '#ffffff' : globalColors?.text || '#334155';
    const headingColor = isFooter ? '#ffffff' : globalColors?.heading || '#0f172a';
    const borderColor = globalColors?.border || '#e2e8f0';

    return (
        <section
            className={`${isOverlay ? 'mx-auto my-6 max-w-xl rounded-lg border shadow-lg' : ''} ${isHeader ? 'border-b' : isFooter ? 'border-t' : ''}`}
            style={{ backgroundColor: background, borderColor }}
        >
            <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${isHeader ? 'py-4' : isFooter ? 'py-10' : 'py-12'}`}>
                {isHeader ? (
                    <div className="flex items-center justify-between gap-6">
                        <div className="text-lg font-bold" style={{ color: headingColor }}>
                            {title || 'Tienda'}
                        </div>
                        <div className="hidden items-center gap-5 text-sm font-medium md:flex" style={{ color: textColor }}>
                            {blocks.filter(block => block.enabled !== false).slice(0, 4).map(block => (
                                <span
                                    key={block.id}
                                    data-storefront-block-id={block.id}
                                    data-storefront-block-kind={block.kind}
                                    className={selectedBlockId === block.id ? 'rounded outline outline-2 outline-offset-4 outline-sky-400' : ''}
                                >
                                    {String(block.settings?.text || block.label)}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={isFooter ? 'grid gap-8 md:grid-cols-[1.2fr_1fr]' : 'text-center'}>
                        <div className={isFooter ? 'text-left' : 'mx-auto max-w-3xl'}>
                            {title && (
                                <h2 className="text-2xl font-bold md:text-3xl" style={{ color: headingColor }}>
                                    {String(title)}
                                </h2>
                            )}
                            {description && (
                                <p className="mt-3 text-sm md:text-base" style={{ color: textColor }}>
                                    {String(description)}
                                </p>
                            )}
                            {data.buttonText && (
                                <button
                                    type="button"
                                    className="mt-6 rounded-md px-5 py-2.5 text-sm font-semibold"
                                    style={{
                                        backgroundColor: globalColors?.priceColor || '#4f46e5',
                                        color: '#ffffff',
                                    }}
                                >
                                    {String(data.buttonText)}
                                </button>
                            )}
                        </div>
                        {blocks.length > 0 && (
                            <div className={`mt-8 grid gap-3 ${isFooter ? 'mt-0 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                                {blocks.filter(block => block.enabled !== false).slice(0, 6).map(block => (
                                    <div
                                        key={block.id}
                                        data-storefront-block-id={block.id}
                                        data-storefront-block-kind={block.kind}
                                        className={`rounded-lg border p-4 text-left ${selectedBlockId === block.id ? 'outline outline-2 outline-offset-2 outline-sky-400' : ''}`}
                                        style={{ borderColor, backgroundColor: isFooter ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)' }}
                                    >
                                        <div className="text-sm font-semibold" style={{ color: headingColor }}>
                                            {String(block.settings?.text || block.settings?.title || block.label)}
                                        </div>
                                        {(block.settings?.body || block.settings?.placeholder) && (
                                            <p className="mt-1 text-xs" style={{ color: textColor }}>
                                                {String(block.settings.body || block.settings.placeholder)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

const StorefrontModuleRenderer: React.FC<StorefrontModuleRendererProps> = ({
    storeId,
    decisions,
    globalColors,
    onNavigateToProduct,
    onNavigateToCategory,
}) => {
    const { isEditorPreview, selectedSectionId, selectedBlockId } = getEditorPreviewState();

    return (
        <>
            {decisions.map((decision, index) => {
                if (decision.status !== 'render') return null;

                const Component = storefrontComponentMap[decision.kind as StorefrontSectionKind];
                if (!Component) return null;
                const kind = decision.kind as StorefrontSectionKind;
                const isSelected = selectedSectionId === decision.id;
                const normalizedData = normalizeComponentData(kind, decision.data);

                return (
                    <React.Fragment key={decision.id}>
                        {isEditorPreview && (
                            <div
                                className="storefront-editor-insertion-point flex items-center justify-center py-1 text-xs font-semibold text-sky-600"
                                aria-hidden="true"
                            >
                                <span className="rounded-full border border-sky-300 bg-white px-2 py-0.5 shadow-sm">+</span>
                            </div>
                        )}
                        <div
                            data-storefront-section-id={decision.id}
                            data-storefront-section-kind={kind}
                            data-storefront-section-index={index}
                            className={`relative ${isEditorPreview ? 'cursor-default' : ''} ${isSelected ? 'outline outline-2 outline-offset-[-2px] outline-sky-500' : ''}`}
                            onClickCapture={(event) => {
                                if (!isEditorPreview) return;
                                event.preventDefault();
                                event.stopPropagation();
                                const target = event.target as HTMLElement;
                                const blockEl = target.closest('[data-storefront-block-id]') as HTMLElement | null;
                                if (blockEl) {
                                    postEditorSelection({
                                        nodeType: 'block',
                                        id: blockEl.dataset.storefrontBlockId,
                                        parentId: decision.id,
                                    });
                                    return;
                                }
                                postEditorSelection({
                                    nodeType: 'section',
                                    id: decision.id,
                                });
                            }}
                        >
                            {isEditorPreview && isSelected && (
                                <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white shadow">
                                    {kind}
                                </div>
                            )}
                            {GENERIC_SECTION_KINDS.has(kind) ? (
                                <GenericStorefrontSection
                                    kind={kind}
                                    data={normalizedData}
                                    globalColors={globalColors}
                                    selectedBlockId={selectedBlockId}
                                    isEditorPreview={isEditorPreview}
                                />
                            ) : (
                                <Component
                                    storeId={storeId}
                                    data={normalizedData}
                                    globalColors={globalColors}
                                    onProductClick={onNavigateToProduct}
                                    onCategoryClick={onNavigateToCategory}
                                    onCollectionClick={onNavigateToCategory}
                                />
                            )}
                        </div>
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default StorefrontModuleRenderer;
