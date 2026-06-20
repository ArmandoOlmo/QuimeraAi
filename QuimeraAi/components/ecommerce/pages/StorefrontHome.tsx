/**
 * StorefrontHome Component
 * 
 * Renders the Storefront Homepage based on the user's project configuration (`componentOrder`).
 * If components are configured, it renders them in order.
 * If no components are configured, it falls back to a default layout or empty state.
 */

import React, { useMemo } from 'react';
import ProductSearchPage from '../search/ProductSearchPage';
import { Project } from '../../../types';
import type { StorefrontSectionBlueprint } from '../../../types/businessBlueprint';
import { useStorefrontCart } from '../context';
import StorefrontModuleRenderer from '../StorefrontModuleRenderer';
import {
    getRenderableStorefrontSectionDecisions,
    resolveStorefrontEditorState,
    resolveStorefrontPageData,
    resolveStorefrontSectionDecisions,
} from '../../../utils/storefrontRenderer';

interface ThemeColors extends Record<string, string | undefined> {
    background?: string;
    text?: string;
    heading?: string;
    cardBackground?: string;
    cardText?: string;
    border?: string;
    priceColor?: string;
    salePriceColor?: string;
    mutedText?: string;
}

interface StorefrontHomeProps {
    storeId: string;
    projectData: Project;
    onNavigateToProduct: (slug: string) => void;
    onNavigateToCategory: (slug: string) => void;
    themeColors: ThemeColors;
}

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getStorefrontEditorSections = (
    projectData: Project,
    isEditorPreview: boolean,
): StorefrontSectionBlueprint[] | undefined => {
    const editorState = resolveStorefrontEditorState(projectData);
    const draftSections = isRecord(editorState.draft) && Array.isArray(editorState.draft.sections)
        ? editorState.draft.sections as StorefrontSectionBlueprint[]
        : undefined;
    const publishedSections = isRecord(editorState.published) && Array.isArray(editorState.published.sections)
        ? editorState.published.sections as StorefrontSectionBlueprint[]
        : undefined;

    if (isEditorPreview) return draftSections || publishedSections;
    return publishedSections || draftSections;
};

const getBusinessBlueprintSections = (
    projectData: Project,
    pageData: Record<string, any>,
): StorefrontSectionBlueprint[] | undefined => {
    const rootData = isRecord(projectData?.data) ? projectData.data as Record<string, any> : {};
    const candidates = [
        (projectData as any)?.businessBlueprint?.storefrontBlueprint?.sections,
        rootData.businessBlueprint?.storefrontBlueprint?.sections,
        pageData.businessBlueprint?.storefrontBlueprint?.sections,
    ];

    return candidates.find(Array.isArray) as StorefrontSectionBlueprint[] | undefined;
};

const StorefrontHome: React.FC<StorefrontHomeProps> = ({
    storeId,
    projectData,
    onNavigateToProduct,
    onNavigateToCategory,
    themeColors
}) => {
    const cart = useStorefrontCart();
    const isEditorPreview = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === 'storefront-editor';
    const pageData = useMemo(() => resolveStorefrontPageData(projectData), [projectData]);

    const sectionsToRender = useMemo(() => {
        const resolverInput = {
            pageData,
            componentOrder: projectData?.componentOrder,
            sectionVisibility: projectData?.sectionVisibility,
            blueprintSections: (
                getStorefrontEditorSections(projectData, isEditorPreview) ||
                getBusinessBlueprintSections(projectData, pageData)
            ),
        };

        return isEditorPreview
            ? resolveStorefrontSectionDecisions(resolverInput)
            : getRenderableStorefrontSectionDecisions(resolverInput);
    }, [isEditorPreview, pageData, projectData]);
    const hasRenderableSections = sectionsToRender.some(decision => (
        decision.status === 'render' ||
        (isEditorPreview && ['empty', 'invalid', 'unsupported'].includes(decision.status))
    ));

    return (
        <div
            className="storefront-home"
            style={{
                backgroundColor: themeColors?.background || '#ffffff',
                color: themeColors?.text || '#0f172a'
            }}
        >
            {hasRenderableSections ? (
                <StorefrontModuleRenderer
                    storeId={storeId}
                    decisions={sectionsToRender}
                    globalColors={themeColors}
                    isEditorPreview={isEditorPreview}
                    onNavigateToProduct={onNavigateToProduct}
                    onNavigateToCategory={onNavigateToCategory}
                />
            ) : isEditorPreview ? (
                <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No hay secciones visibles. Activa una sección o aplica un preset.
                    </div>
                </div>
            ) : null}

            {/* Always render the full product search/grid at the bottom for the core ecommerce experience */}
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <ProductSearchPage
                    storeId={storeId}
                    // Pass null userId as we are in public view
                    userId={null}
                    embedded={true}
                    // Ensure it receives style props
                    themeColors={themeColors}
                    title="Todos los Productos" // "All Products"
                    showFilterSidebar={true}
                    showSearchBar={true}
                    showSortOptions={true}
                    showViewModeToggle={true}
                    defaultViewMode="grid"
                    gridColumns={4}
                    // Use project primary color if available
                    primaryColor={themeColors.priceColor || '#6366f1'}
                    onProductClick={onNavigateToProduct}
                    onAddToCart={(product) => cart.addItem(product, 1)}
                />
            </div>
        </div>
    );
};

export default StorefrontHome;
