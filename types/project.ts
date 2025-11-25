/**
 * Project Types
 * Tipos para proyectos y templates
 */

import { PageData } from './components';
import { ThemeData, PageSection } from './ui';
import { BrandIdentity } from './business';
import { Menu } from './navigation';
import { AiAssistantConfig } from './ai-assistant';
import { ResponsiveStyles, ConditionalRule } from './features';
import { SEOConfig } from './seo';

// =============================================================================
// PROJECT
// =============================================================================
export interface Project {
    id: string;
    name: string;
    thumbnailUrl: string;
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
    menus?: Menu[];
    aiAssistantConfig?: AiAssistantConfig;
    responsiveStyles?: Record<string, ResponsiveStyles>;
    conditionalRules?: ConditionalRule[];
    seoConfig?: SEOConfig;
    
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
}



