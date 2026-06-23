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
import { isStorefrontSectionKind, storefrontSectionRegistry } from '../../utils/storefrontRenderer';

interface StorefrontModuleRendererProps {
    storeId: string;
    decisions: StorefrontSectionRenderDecision[];
    globalColors?: StorefrontGlobalColors;
    isEditorPreview?: boolean;
    previewSessionKey?: string | null;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
    onNavigate?: (href: string) => void;
}

const STOREFRONT_EDITOR_SECTION_CLICK = 'quimera:storefront-editor:section-click';
const STOREFRONT_EDITOR_SELECTED_SELECTOR = '[data-storefront-editor-selected="true"]';
const STOREFRONT_EDITOR_SELECTED_OUTLINE = '2px solid #fbbf24';
const STOREFRONT_EDITOR_SELECTED_SHADOW = '0 0 0 5px rgba(251, 191, 36, 0.18)';

const storefrontComponentMap: Record<StorefrontSectionKind, React.FC<any>> = {
    announcementBar: AnnouncementBar,
    productHero: ProductHero,
    featuredProducts: FeaturedProducts,
    categoryGrid: CategoryGrid,
    trustBadges: TrustBadges,
    saleCountdown: SaleCountdown,
    collectionBanner: CollectionBanner,
    recentlyViewed: RecentlyViewed,
    productReviews: ProductReviews,
    productBundle: ProductBundle,
};

const shouldShowEditorPlaceholder = (decision: StorefrontSectionRenderDecision): boolean =>
    decision.status === 'empty' || decision.status === 'invalid' || decision.status === 'unsupported';

const getSectionLabel = (kind: string): string =>
    isStorefrontSectionKind(kind) ? storefrontSectionRegistry[kind].label : kind;

const clearStorefrontEditorSectionHighlights = () => {
    if (typeof document === 'undefined') return;

    document
        .querySelectorAll<HTMLElement>(STOREFRONT_EDITOR_SELECTED_SELECTOR)
        .forEach(element => {
            element.removeAttribute('data-storefront-editor-selected');
            element.style.outline = '';
            element.style.boxShadow = '';
        });
};

const markStorefrontEditorSectionSelected = (element: HTMLElement) => {
    clearStorefrontEditorSectionHighlights();
    element.setAttribute('data-storefront-editor-selected', 'true');
    element.style.outline = STOREFRONT_EDITOR_SELECTED_OUTLINE;
    element.style.boxShadow = STOREFRONT_EDITOR_SELECTED_SHADOW;
};

const StorefrontEditorSectionPlaceholder: React.FC<{
    decision: StorefrontSectionRenderDecision;
    globalColors?: StorefrontGlobalColors;
}> = ({ decision, globalColors }) => {
    const sectionLabel = getSectionLabel(String(decision.kind));
    const accentColor = globalColors?.accent || globalColors?.priceColor || '#fbbf24';
    const borderColor = globalColors?.border || globalColors?.borderColor || '#d1d5db';
    const textColor = globalColors?.text || '#0f172a';
    const mutedTextColor = globalColors?.mutedText || '#64748b';
    const backgroundColor = globalColors?.cardBackground || globalColors?.background || '#ffffff';
    const details = [...decision.reasons, ...decision.warnings].filter(Boolean).slice(0, 3);
    const statusLabel = decision.status === 'invalid'
        ? 'Requiere ajuste'
        : decision.status === 'unsupported'
            ? 'No soportado'
            : 'Pendiente de contenido';

    return (
        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8" data-storefront-editor-placeholder={decision.kind}>
            <div
                className="rounded-lg border border-dashed px-5 py-6"
                style={{
                    backgroundColor,
                    borderColor,
                    color: textColor,
                }}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <span
                            className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                            style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                        >
                            {statusLabel}
                        </span>
                        <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{sectionLabel}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: mutedTextColor }}>
                            Esta seccion ya esta en la plantilla del storefront. Completa sus controles para verla como modulo final en la tienda publicada.
                        </p>
                    </div>
                    <div className="flex-shrink-0 rounded-md border px-3 py-2 text-xs font-medium" style={{ borderColor, color: mutedTextColor }}>
                        {decision.source === 'blueprint' ? 'Blueprint' : 'Orden legacy'}
                    </div>
                </div>
                {details.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm" style={{ color: mutedTextColor }}>
                        {details.map(detail => (
                            <li key={detail}>- {detail}</li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
};

const StorefrontModuleRenderer: React.FC<StorefrontModuleRendererProps> = ({
    storeId,
    decisions,
    globalColors,
    isEditorPreview = false,
    previewSessionKey,
    onNavigateToProduct,
    onNavigateToCategory,
    onNavigate,
}) => {
    const notifyEditorSectionClick = (
        decision: StorefrontSectionRenderDecision,
        event: React.MouseEvent<HTMLDivElement>,
    ) => {
        if (!isEditorPreview || !previewSessionKey || typeof window === 'undefined') return;

        event.preventDefault();
        event.stopPropagation();
        markStorefrontEditorSectionSelected(event.currentTarget);

        window.parent?.postMessage({
            type: STOREFRONT_EDITOR_SECTION_CLICK,
            sessionKey: previewSessionKey,
            storeId,
            section: decision.kind,
            sectionId: decision.id,
        }, window.location.origin);
    };

    const renderEditorFrame = (
        decision: StorefrontSectionRenderDecision,
        children: React.ReactNode,
    ) => {
        if (!isEditorPreview) {
            return <React.Fragment key={decision.id}>{children}</React.Fragment>;
        }

        return (
            <div
                key={decision.id}
                data-storefront-editor-section={decision.kind}
                data-storefront-editor-section-id={decision.id}
                data-storefront-editor-section-label={getSectionLabel(String(decision.kind))}
                className="storefront-editor-preview-section relative cursor-pointer outline-offset-4 transition-[outline,box-shadow] duration-200"
                style={{ scrollMarginTop: 96 }}
                onClickCapture={(event) => notifyEditorSectionClick(decision, event)}
            >
                {children}
            </div>
        );
    };

    return (
        <>
            {decisions.map((decision) => {
                if (decision.status !== 'render') {
                    if (!isEditorPreview || !shouldShowEditorPlaceholder(decision)) return null;

                    return renderEditorFrame(
                        decision,
                        <StorefrontEditorSectionPlaceholder
                            decision={decision}
                            globalColors={globalColors}
                        />,
                    );
                }

                const Component = storefrontComponentMap[decision.kind as StorefrontSectionKind];
                if (!Component) return null;

                return renderEditorFrame(
                    decision,
                    <Component
                        storeId={storeId}
                        data={decision.data}
                        globalColors={globalColors}
                        isEditorPreview={isEditorPreview}
                        onProductClick={onNavigateToProduct}
                        onCategoryClick={onNavigateToCategory}
                        onCollectionClick={onNavigateToCategory}
                        onNavigate={onNavigate}
                    />,
                );
            })}
        </>
    );
};

export default StorefrontModuleRenderer;
