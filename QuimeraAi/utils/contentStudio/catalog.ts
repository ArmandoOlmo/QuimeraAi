import type {
    ContentFlowStep,
    ContentFormat,
    ContentPlatform,
    ContentTypeDefinition,
} from '../../types/contentGeneration';

export const CONTENT_STUDIO_BLUEPRINT_VERSION = '1.0.0';
export const CONTENT_STUDIO_SCHEMA_VERSION = 1;

export const CONTENT_STUDIO_USER_FLOW: ContentFlowStep[] = [
    'brief',
    'strategy',
    'script',
    'storyboard',
    'assets',
    'timeline',
    'review',
    'export',
];

export const CONTENT_FACTORY_ADMIN_FLOW: ContentFlowStep[] = [
    'adminOverview',
    'globalPresets',
    'promptBlocks',
    'stylePacks',
    'templatePacks',
    'providerRouting',
    'generationJobs',
    'usage',
    'safetyPolicies',
    'publishing',
    'auditLogs',
];

export const CONTENT_FORMATS: ContentFormat[] = [
    '1:1',
    '4:5',
    '9:16',
    '16:9',
    '3:2',
    'website_hero',
    'email_banner',
    'story',
    'carousel',
];

export const CONTENT_PLATFORMS: ContentPlatform[] = [
    'instagram',
    'tiktok',
    'youtube_shorts',
    'youtube',
    'facebook',
    'linkedin',
    'google_ads',
    'meta_ads',
    'website',
    'email',
    'blog',
    'storefront',
    'template_marketplace',
];

export const CONTENT_TYPE_DEFINITIONS: ContentTypeDefinition[] = [
    {
        id: 'social_post',
        label: 'Social post',
        description: 'Single-image or text-first post for social channels.',
        defaultFormats: ['1:1', '4:5'],
        supportedPlatforms: ['instagram', 'facebook', 'linkedin'],
        requiredInputs: ['brief', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'asset_list'],
    },
    {
        id: 'social_carousel',
        label: 'Social carousel',
        description: 'Multi-slide education, launch, or offer sequence.',
        defaultFormats: ['carousel', '4:5'],
        supportedPlatforms: ['instagram', 'linkedin', 'facebook'],
        requiredInputs: ['brief', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'storyboard'],
    },
    {
        id: 'reel_short',
        label: 'Reel / Short',
        description: 'Short vertical video plan with script, scene prompts, captions, and timeline.',
        defaultFormats: ['9:16'],
        supportedPlatforms: ['instagram', 'tiktok', 'youtube_shorts'],
        requiredInputs: ['brief', 'brandProfile'],
        defaultFlow: ['brief', 'script', 'storyboard', 'assets', 'timeline', 'review', 'export'],
        availableExportTypes: ['copy_package', 'json_package', 'prompts_package', 'storyboard'],
    },
    {
        id: 'ad_creative',
        label: 'Ad creative',
        description: 'Performance creative package for paid ads.',
        defaultFormats: ['1:1', '4:5', '9:16'],
        supportedPlatforms: ['meta_ads', 'google_ads', 'instagram', 'facebook'],
        requiredInputs: ['brief', 'offer', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'asset_list'],
    },
    {
        id: 'product_promo',
        label: 'Product promo',
        description: 'Product-focused creative for ecommerce and storefront promotion.',
        defaultFormats: ['1:1', '4:5', '9:16'],
        supportedPlatforms: ['storefront', 'instagram', 'tiktok', 'meta_ads'],
        requiredInputs: ['brief', 'product'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'asset_list'],
    },
    {
        id: 'website_asset_pack',
        label: 'Website asset pack',
        description: 'Hero, section, and support visuals for a website or landing page.',
        defaultFormats: ['website_hero', '16:9', '3:2'],
        supportedPlatforms: ['website'],
        requiredInputs: ['brief', 'websiteBlueprint', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['json_package', 'prompts_package', 'asset_list'],
    },
    {
        id: 'email_banner',
        label: 'Email banner',
        description: 'Header visual and copy package for email marketing.',
        defaultFormats: ['email_banner'],
        supportedPlatforms: ['email'],
        requiredInputs: ['brief', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'asset_list'],
    },
    {
        id: 'blog_visual',
        label: 'Blog visual',
        description: 'Feature image and supporting visuals for editorial content.',
        defaultFormats: ['16:9', '3:2'],
        supportedPlatforms: ['blog', 'website'],
        requiredInputs: ['brief', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['json_package', 'prompts_package', 'asset_list'],
    },
    {
        id: 'campaign_pack',
        label: 'Campaign pack',
        description: 'Reusable multi-channel package with copy, storyboard, prompts, and assets.',
        defaultFormats: ['1:1', '4:5', '9:16', 'email_banner'],
        supportedPlatforms: ['instagram', 'facebook', 'email', 'website', 'storefront'],
        requiredInputs: ['brief', 'businessProfile', 'brandProfile'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['copy_package', 'json_package', 'prompts_package', 'storyboard'],
    },
    {
        id: 'template_preview',
        label: 'Template preview',
        description: 'Admin-oriented preview media for templates and marketplace packs.',
        defaultFormats: ['website_hero', '16:9', '1:1'],
        supportedPlatforms: ['template_marketplace', 'website'],
        requiredInputs: ['brief', 'template'],
        defaultFlow: CONTENT_STUDIO_USER_FLOW,
        availableExportTypes: ['json_package', 'asset_list', 'prompts_package'],
        adminOnly: true,
    },
];

export const getContentTypeDefinition = (id: string): ContentTypeDefinition => (
    CONTENT_TYPE_DEFINITIONS.find(type => type.id === id) || CONTENT_TYPE_DEFINITIONS[0]
);
