/**
 * Project Types
 * Tipos para proyectos y templates
 */

import { PageData } from './components';
import { ThemeData, PageSection } from './ui';
import { BrandIdentity } from './business';
import { NavigationMenu } from './navigation';
import { AiAssistantConfig } from './ai-assistant';
import { ResponsiveStyles, ABTestConfig, ComponentStyles } from './features';
import { SEOConfig } from './seo';

// =============================================================================
// PROJECT
// =============================================================================
export interface Project {
    id: string;
    name: string;
    userId?: string;                // Owner user ID
    thumbnailUrl: string;
    faviconUrl?: string;  // Favicon URL for the website
    status: 'Published' | 'Draft' | 'Template';
    lastUpdated: string;
    data: PageData;
    theme: ThemeData;
    brandIdentity: BrandIdentity;
    componentOrder: PageSection[];
    sectionVisibility: Record<PageSection, boolean>;
    isArchived?: boolean;
    sourceTemplateId?: string;
    imagePrompts?: Record<string, string>;
    menus?: NavigationMenu[];
    aiAssistantConfig?: AiAssistantConfig;
    responsiveStyles?: Record<string, ResponsiveStyles>;
    seoConfig?: SEOConfig;
    
    // Design Tokens
    designTokens?: import('./features').DesignTokens;
    
    // A/B Testing
    abTests?: ABTestConfig[];
    
    // Component customization
    componentStatus?: Record<PageSection, boolean>;
    componentStyles?: ComponentStyles;
    
    // Template-specific fields
    category?: string;
    tags?: string[];
    description?: string;
    isFeatured?: boolean;
    previewImages?: string[];
    author?: string;
    version?: string;
    compatibilityVersion?: string;
    createdAt?: string;
    
    // Industry classification for LLM template matching
    industries?: string[];
}









