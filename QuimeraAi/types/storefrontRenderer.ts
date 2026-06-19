import type { PageData } from './components';
import type { StorefrontSectionBlueprint } from './businessBlueprint';
import type { PageSection } from './ui';
import type {
    StorefrontEditorBlockKind,
    StorefrontEditorGroup,
    StorefrontEditorSection,
    StorefrontInspectorControl,
} from './storefrontEditor';

export type StorefrontSectionKind =
    | 'announcementBar'
    | 'header'
    | 'hero'
    | 'productHero'
    | 'categoryTiles'
    | 'featuredCollection'
    | 'productGrid'
    | 'featuredProducts'
    | 'promoBanner'
    | 'imageWithText'
    | 'categoryGrid'
    | 'trustBadges'
    | 'testimonials'
    | 'newsletter'
    | 'faq'
    | 'storeFooter'
    | 'policiesAndLinks'
    | 'newsletterPopup'
    | 'cartDrawer'
    | 'saleCountdown'
    | 'collectionBanner'
    | 'recentlyViewed'
    | 'productReviews'
    | 'productBundle';

export type StorefrontSectionRenderStatus =
    | 'render'
    | 'hidden'
    | 'empty'
    | 'invalid'
    | 'unsupported';

export type StorefrontSectionEmptyBehavior = 'hide' | 'render';

export interface StorefrontSectionRegistryItem {
    kind: StorefrontSectionKind;
    label: string;
    moduleRegistryId: string;
    emptyBehavior: StorefrontSectionEmptyBehavior;
    group?: StorefrontEditorGroup;
    category?: 'commerce' | 'content' | 'trust' | 'marketing' | 'footer' | 'overlay';
    previewLabel?: string;
    supportsBlocks?: boolean;
    allowedBlocks?: StorefrontEditorBlockKind[];
    defaultBlocks?: Array<{
        kind: StorefrontEditorBlockKind;
        label: string;
        settings?: Record<string, unknown>;
    }>;
    inspectorSchema?: StorefrontInspectorControl[];
    defaultVisible?: boolean;
    isCoreSection?: boolean;
    validVariants?: string[];
    defaultSettings: Record<string, unknown>;
    isEmpty?: (settings: Record<string, unknown>) => boolean;
}

export interface StorefrontSectionValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface StorefrontSectionRenderDecision {
    id: string;
    kind: StorefrontSectionKind | string;
    index: number;
    status: StorefrontSectionRenderStatus;
    data: Record<string, unknown>;
    reasons: string[];
    warnings: string[];
    source: 'editor' | 'blueprint' | 'componentOrder';
}

export interface StorefrontSectionResolverInput {
    pageData?: Partial<PageData> | Record<string, unknown>;
    componentOrder?: PageSection[] | string[];
    sectionVisibility?: Partial<Record<PageSection, boolean>> | Record<string, boolean>;
    blueprintSections?: StorefrontSectionBlueprint[];
    editorSections?: StorefrontEditorSection[];
}
