import type { GlobalColors } from './ui';

export type ColorBriefSource = 'chat' | 'imported-url' | 'editor' | 'mixed';
export type ColorSystemMode = 'light' | 'dark' | 'auto';

export type ColorSignalRole =
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'background'
    | 'surface'
    | 'text'
    | 'logo'
    | 'image'
    | 'unknown';

export interface ColorSignal {
    color: string;
    source: 'ai' | 'import' | 'logo' | 'image' | 'css' | 'button' | 'link' | 'navigation' | 'background' | 'user';
    weight: number;
    roleGuess?: ColorSignalRole;
    label?: string;
}

export interface ColorBrief {
    source: ColorBriefSource;
    industry: string;
    mood: string[];
    personality?: string;
    mode: ColorSystemMode;
    generationMode?: 'from-scratch' | 'faithful-redesign' | 'modernize' | 'inspired-by';
    importedColors?: ColorSignal[];
    logoColors?: ColorSignal[];
    imageColors?: ColorSignal[];
    lockedColors?: Partial<GlobalColors>;
    hasEcommerce?: boolean;
    activeComponents?: string[];
}

export interface WebsiteColorSystem {
    id: string;
    name: string;
    nameEs: string;
    strategy: string;
    mode: Exclude<ColorSystemMode, 'auto'>;
    colors: GlobalColors;
    score: number;
    scores: {
        contrast: number;
        harmony: number;
        brandFit: number;
        componentReadiness: number;
        proportionBalance: number;
    };
    warnings: string[];
    sourceColors: string[];
}

export interface ColorCandidate {
    id: string;
    label: string;
    labelEs: string;
    description: string;
    descriptionEs: string;
    preview: string[];
    system: WebsiteColorSystem;
}

export interface ColorSystemValidationIssue {
    severity: 'error' | 'warning';
    path: string;
    message: string;
}

export interface ColorSystemValidationResult {
    valid: boolean;
    score: number;
    issues: ColorSystemValidationIssue[];
}
