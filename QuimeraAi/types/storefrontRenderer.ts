import type { PageData } from './components';
import type { StorefrontSectionBlueprint } from './businessBlueprint';
import type { PageSection } from './ui';

export type StorefrontSectionKind =
    | 'announcementBar'
    | 'productHero'
    | 'featuredProducts'
    | 'categoryGrid'
    | 'trustBadges'
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
    source: 'blueprint' | 'componentOrder';
}

export interface StorefrontSectionResolverInput {
    pageData?: Partial<PageData> | Record<string, unknown>;
    componentOrder?: PageSection[] | string[];
    sectionVisibility?: Partial<Record<PageSection, boolean>> | Record<string, boolean>;
    blueprintSections?: StorefrontSectionBlueprint[];
}
