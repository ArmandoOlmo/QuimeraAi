import type { GlobalColors, PageSection } from './ui';
import type { ColorBrief, ColorCandidate } from './colorSystem';

export type WebsitePlanSource = 'chat' | 'imported-url' | 'mixed';
export type WebsiteGenerationMode = 'from-scratch' | 'faithful-redesign' | 'modernize' | 'inspired-by';

export interface WebsitePlanBusinessProfile {
    businessName: string;
    industry: string;
    description: string;
    tagline?: string;
    services: Array<{ name: string; description: string }>;
    contactInfo: Record<string, any>;
    hasEcommerce?: boolean;
}

export interface WebsitePlanBrandProfile {
    colors: Partial<GlobalColors> & Pick<GlobalColors, 'primary'>;
    fonts?: string[];
    visualStyle?: string;
    logoUrl?: string;
    isDarkTheme?: boolean;
    colorBrief?: ColorBrief;
    colorCandidates?: ColorCandidate[];
    selectedColorCandidateId?: string;
}

export interface WebsitePlanContentMap {
    pages: Array<{ url?: string; title: string; purpose: string; summary: string }>;
    testimonials?: any[];
    products?: any[];
    menuItems?: any[];
    properties?: any[];
    extractedImages?: Array<{
        url: string;
        alt?: string;
        sourcePage?: string;
        recommendedUse?: string;
        score?: number;
        width?: number;
        height?: number;
    }>;
    missingOpportunities?: string[];
}

export interface WebsitePlanComponentItem {
    component: PageSection;
    reason: string;
    confidence: number;
    source?: 'ai' | 'import' | 'user';
}

export interface WebsitePlanAssetItem {
    targetPath: string;
    source: 'existing' | 'generate' | 'none';
    existingUrl?: string;
    prompt?: string;
    aspectRatio: string;
}

export interface WebsitePlan {
    source: WebsitePlanSource;
    generationMode: WebsiteGenerationMode;
    businessProfile: WebsitePlanBusinessProfile;
    brandProfile: WebsitePlanBrandProfile;
    contentMap: WebsitePlanContentMap;
    componentPlan: WebsitePlanComponentItem[];
    assetPlan: WebsitePlanAssetItem[];
    qualityGoals: string[];
}

export interface WebsitePlanValidationIssue {
    severity: 'error' | 'warning';
    path: string;
    message: string;
}

export interface WebsitePlanValidationResult {
    valid: boolean;
    issues: WebsitePlanValidationIssue[];
}
