import type {
    ComponentId,
    ComponentImplementationStatus,
    ComponentRegistryFamily,
    PageIntent,
    VisualDensity,
} from './componentRegistry';

export type ComponentSlotKind =
    | 'content'
    | 'media'
    | 'cta'
    | 'navigation'
    | 'trust'
    | 'data'
    | 'form'
    | 'layout';

export type ComponentBackgroundOption =
    | 'plain'
    | 'surface'
    | 'brandTint'
    | 'image'
    | 'imageOverlay'
    | 'gradient'
    | 'pattern'
    | 'none';

export type ComponentMediaOption =
    | 'none'
    | 'singleImage'
    | 'imageGrid'
    | 'productMedia'
    | 'gallery'
    | 'video'
    | 'iconSet'
    | 'map'
    | 'listingCards';

export type ComponentContentDensity = VisualDensity;
export type ComponentMobileBehavior = 'stackedMobile' | 'carouselMobile' | 'accordionMobile' | 'priorityContent' | 'compactStrip' | 'hiddenMobile';

export interface ComponentSlotDefinition {
    id: string;
    label: string;
    kind: ComponentSlotKind;
    required?: boolean;
    dataPath?: string;
}

export interface ComponentLayoutVariantDefinition {
    id: string;
    label: string;
    description: string;
    recommendedSlots: string[];
    bestForIndustries: string[];
    bestForPageIntents: PageIntent[];
    avoidWhen: string[];
    mobileBehavior: ComponentMobileBehavior;
}

export interface ComponentStyleVariantDefinition {
    id: string;
    label: string;
    description: string;
    bestForIndustries: string[];
}

export interface ComponentEditorControlDefinition {
    slotId: string;
    controls: string[];
}

export interface ComponentAnatomyEntry {
    componentId: ComponentId;
    family: ComponentRegistryFamily;
    description: string;
    availableSlots: ComponentSlotDefinition[];
    requiredSlots: string[];
    optionalSlots: string[];
    layoutVariants: ComponentLayoutVariantDefinition[];
    styleVariants: ComponentStyleVariantDefinition[];
    backgroundOptions: ComponentBackgroundOption[];
    mediaOptions: ComponentMediaOption[];
    contentDensityOptions: ComponentContentDensity[];
    mobileBehaviorOptions: ComponentMobileBehavior[];
    bestForIndustries: string[];
    bestForPageIntents: PageIntent[];
    avoidWhen: string[];
    compatibleThemePresets: string[];
    compatibleDesignPatterns: string[];
    editorControlsMap: ComponentEditorControlDefinition[];
    defaultVariant: string;
    fallbackVariant: string;
    aiGuidance: string[];
    antiPatterns: string[];
}

export interface ComponentVariantPlan {
    componentId: ComponentId;
    implementationStatus?: ComponentImplementationStatus;
    layoutVariant: string;
    styleVariant: string;
    activeSlots: string[];
    backgroundChoice: ComponentBackgroundOption;
    mediaTreatment: ComponentMediaOption;
    density: ComponentContentDensity;
    mobileBehavior: ComponentMobileBehavior;
    designPatternIds: string[];
    designRationale: string;
    confidence: number;
    sourceMap: Record<string, string | string[]>;
}

export interface ComponentVariantSelectionResult {
    variants: ComponentVariantPlan[];
    warnings: string[];
    sourceMap: Record<string, string | string[]>;
}
