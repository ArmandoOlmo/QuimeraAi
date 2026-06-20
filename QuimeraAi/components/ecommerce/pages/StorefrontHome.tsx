/**
 * StorefrontHome Component
 * 
 * Renders the Storefront Homepage based on the user's project configuration (`componentOrder`).
 * If components are configured, it renders them in order.
 * If no components are configured, it falls back to an empty state in editor preview.
 */

import React, { useMemo } from 'react';
import { Project } from '../../../types';
import type { StorefrontSectionBlueprint } from '../../../types/businessBlueprint';
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
    previewSessionKey?: string | null;
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
    return publishedSections;
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
    themeColors,
    previewSessionKey,
}) => {
    const isEditorPreview = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === 'storefront-editor';
    const pageData = useMemo(() => resolveStorefrontPageData(projectData), [projectData]);

    const sectionsToRender = useMemo(() => {
        const editorSections = getStorefrontEditorSections(projectData, isEditorPreview);
        const resolverInput = {
            pageData,
            componentOrder: projectData?.componentOrder,
            sectionVisibility: projectData?.sectionVisibility,
            blueprintSections: editorSections || getBusinessBlueprintSections(projectData, pageData),
            includeMissingSections: !editorSections,
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
                    previewSessionKey={previewSessionKey}
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
        </div>
    );
};

export default StorefrontHome;
