import type { StorefrontThemeSettings } from './ecommerce';
import type { StorefrontSectionKind } from './storefrontRenderer';

export type StorefrontEditorPageType = 'home' | 'collection' | 'product' | 'cart' | 'checkout';
export type StorefrontEditorNodeType = 'section' | 'block' | 'theme' | 'template';
export type StorefrontEditorGroup = 'header' | 'template' | 'footer' | 'overlay';

export type StorefrontEditorBlockKind =
    | 'text'
    | 'image'
    | 'button'
    | 'collectionCard'
    | 'productCard'
    | 'trustItem'
    | 'menuLink'
    | 'socialLink'
    | 'newsletterField'
    | 'richText'
    | 'badge'
    | 'iconText';

export type StorefrontInspectorControlType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'toggle'
    | 'range'
    | 'number'
    | 'colorScheme'
    | 'buttonStyle'
    | 'layout'
    | 'productSource'
    | 'collection'
    | 'image'
    | 'link'
    | 'spacing'
    | 'padding'
    | 'alignment';

export interface StorefrontInspectorOption {
    label: string;
    value: string | number | boolean;
}

export interface StorefrontInspectorControl {
    key: string;
    label: string;
    type: StorefrontInspectorControlType;
    helperText?: string;
    placeholder?: string;
    options?: StorefrontInspectorOption[];
    min?: number;
    max?: number;
    step?: number;
}

export interface StorefrontEditorMetadata {
    generatedBy?: 'ai' | 'user' | 'system';
    userModified?: boolean;
    lockedFromRegeneration?: boolean;
    lastEditedAt?: string;
    lastEditedBy?: string;
}

export interface StorefrontEditorNode {
    id: string;
    type: 'section' | 'block';
    kind: StorefrontSectionKind | StorefrontEditorBlockKind;
    label: string;
    enabled: boolean;
    order: number;
    parentId?: string;
    settings: Record<string, unknown>;
    children?: StorefrontEditorNode[];
}

export interface StorefrontEditorBlock {
    id: string;
    kind: StorefrontEditorBlockKind;
    label: string;
    enabled: boolean;
    order: number;
    settings: Record<string, unknown>;
    metadata?: StorefrontEditorMetadata;
}

export interface StorefrontEditorSection {
    id: string;
    kind: StorefrontSectionKind;
    label: string;
    group: StorefrontEditorGroup;
    enabled: boolean;
    order: number;
    settings: Record<string, unknown>;
    blocks: StorefrontEditorBlock[];
    metadata?: StorefrontEditorMetadata;
}

export interface StorefrontEditorColorScheme {
    id: string;
    name: string;
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
}

export interface StorefrontEditorTheme {
    themeSettings?: StorefrontThemeSettings | Record<string, unknown>;
    activeColorScheme?: string;
    colorSchemes: StorefrontEditorColorScheme[];
}

export interface StorefrontEditorTemplate {
    id: string;
    pageType: StorefrontEditorPageType;
    sections: StorefrontEditorSection[];
    theme: StorefrontEditorTheme;
    updatedAt: string;
    publishedAt?: string;
}

export interface SelectedStorefrontNode {
    nodeType: StorefrontEditorNodeType;
    id?: string;
    parentId?: string;
}

export interface StorefrontEditorSnapshot {
    id?: string;
    pageType?: StorefrontEditorPageType;
    componentOrder?: StorefrontSectionKind[];
    sectionVisibility?: Record<string, boolean>;
    sectionSettings?: Record<string, Record<string, unknown>>;
    sections?: StorefrontEditorSection[];
    theme?: StorefrontEditorTheme;
    themeSettings?: StorefrontThemeSettings | Record<string, unknown>;
    state?: 'draft' | 'published';
    updatedAt?: string;
    publishedAt?: string;
}
