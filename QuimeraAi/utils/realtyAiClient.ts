import { supabase } from '../supabase';
import type {
    CampaignType,
    RealtyCampaignAiOutput,
    RealtyAiLanguage,
    RealtyAiListingOutput,
    RealtyAiTone,
    RealtyListingScore,
    RealtyProperty,
} from '../types/realty';

export const REALTY_AI_DEFAULT_MODEL = 'gemini-2.5-flash';

export const REALTY_AI_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'openrouter/auto', label: 'OpenRouter Auto' },
];

export const REALTY_AI_TONES: RealtyAiTone[] = [
    'luxury',
    'family',
    'investment',
    'modern',
    'beach',
    'urban',
    'commercial',
    'rental',
    'new_development',
];

export interface RealtyAiGenerateInput {
    projectId: string;
    propertyId: string;
    tone: RealtyAiTone;
    language: RealtyAiLanguage;
    userPrompt?: string;
    model?: string;
    mode?: 'full' | 'fix';
    score?: RealtyListingScore;
}

export interface RealtyAiGenerateResult {
    success: true;
    model: string;
    prompt: string;
    output: RealtyAiListingOutput;
    generatedFields: string[];
    provider: 'openrouter';
    mode: 'full' | 'fix';
}

export interface RealtyCampaignAiGenerateInput {
    projectId: string;
    propertyId: string;
    campaignType: CampaignType;
    language: RealtyAiLanguage;
    tone?: RealtyAiTone | string;
    userPrompt?: string;
    model?: string;
}

export interface RealtyCampaignAiGenerateResult {
    success: true;
    model: string;
    prompt: string;
    output: RealtyCampaignAiOutput;
    generatedFields: string[];
    provider: 'openrouter';
}

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.map(item => String(item || '').trim()).filter(Boolean);
};

export const normalizeRealtyCampaignOutput = (value: unknown): RealtyCampaignAiOutput => {
    const record = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        title: String(record.title || '').trim(),
        goal: String(record.goal || '').trim(),
        audience: String(record.audience || '').trim(),
        mainCopy: String(record.mainCopy || record.main_copy || '').trim(),
        socialPost: String(record.socialPost || record.social_post || '').trim(),
        emailSubject: String(record.emailSubject || record.email_subject || '').trim(),
        emailBody: String(record.emailBody || record.email_body || '').trim(),
        smsCopy: String(record.smsCopy || record.sms_copy || record.whatsAppCopy || record.whatsappCopy || '').trim(),
        adHeadline: String(record.adHeadline || record.ad_headline || '').trim(),
        adPrimaryText: String(record.adPrimaryText || record.ad_primary_text || '').trim(),
        cta: String(record.cta || '').trim(),
        hashtags: toStringArray(record.hashtags).map(item => item.startsWith('#') ? item : `#${item.replace(/^#+/, '')}`),
    };
};

export const formatRealtyCampaignOutput = (output: Partial<RealtyCampaignAiOutput> | Record<string, unknown>): string => {
    const normalized = normalizeRealtyCampaignOutput(output);
    const sections = [
        ['Title', normalized.title],
        ['Goal', normalized.goal],
        ['Audience', normalized.audience],
        ['Main copy', normalized.mainCopy],
        ['Social post', normalized.socialPost],
        ['Email subject', normalized.emailSubject],
        ['Email body', normalized.emailBody],
        ['SMS/WhatsApp copy', normalized.smsCopy],
        ['Ad headline', normalized.adHeadline],
        ['Ad primary text', normalized.adPrimaryText],
        ['CTA', normalized.cta],
        ['Hashtags', normalized.hashtags.join(' ')],
    ];

    return sections
        .filter(([, value]) => String(value || '').trim())
        .map(([label, value]) => `${label}\n${value}`)
        .join('\n\n');
};

export const getGeneratedRealtyCampaignFields = (output: RealtyCampaignAiOutput): string[] => {
    const fields: string[] = [];
    if (output.title) fields.push('title');
    if (output.goal) fields.push('goal');
    if (output.audience) fields.push('audience');
    if (output.mainCopy) fields.push('mainCopy');
    if (output.socialPost) fields.push('socialPost');
    if (output.emailSubject) fields.push('emailSubject');
    if (output.emailBody) fields.push('emailBody');
    if (output.smsCopy) fields.push('smsCopy');
    if (output.adHeadline) fields.push('adHeadline');
    if (output.adPrimaryText) fields.push('adPrimaryText');
    if (output.cta) fields.push('cta');
    if (output.hashtags.length > 0) fields.push('hashtags');
    return fields;
};

const normalizeFaq = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
        .map(item => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const record = item as Record<string, unknown>;
            const question = String(record.question || '').trim();
            const answer = String(record.answer || '').trim();
            return question && answer ? { question, answer } : null;
        })
        .filter((item): item is { question: string; answer: string } => Boolean(item));
};

export const normalizeRealtyAiListingOutput = (value: unknown): RealtyAiListingOutput => {
    const record = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};

    return {
        title: String(record.title || '').trim(),
        descriptionShort: String(record.descriptionShort || record.description_short || '').trim(),
        descriptionLong: String(record.descriptionLong || record.description_long || record.description || '').trim(),
        highlights: toStringArray(record.highlights),
        features: toStringArray(record.features),
        amenitiesCopy: String(record.amenitiesCopy || record.amenities_copy || '').trim(),
        cta: String(record.cta || '').trim(),
        faq: normalizeFaq(record.faq),
        seoTitle: String(record.seoTitle || record.seo_title || '').trim(),
        seoDescription: String(record.seoDescription || record.seo_description || '').trim(),
        socialPost: String(record.socialPost || record.social_post || '').trim(),
        emailCopy: String(record.emailCopy || record.email_copy || '').trim(),
        smsCopy: String(record.smsCopy || record.sms_copy || record.whatsAppCopy || record.whatsappCopy || '').trim(),
        adCopy: String(record.adCopy || record.ad_copy || '').trim(),
    };
};

export const formatRealtyAiListingOutput = (output: RealtyAiListingOutput): string => {
    const sections = [
        ['Title', output.title],
        ['Short description', output.descriptionShort],
        ['Long description', output.descriptionLong],
        ['Highlights', output.highlights.map(item => `- ${item}`).join('\n')],
        ['Features', output.features.map(item => `- ${item}`).join('\n')],
        ['Amenities copy', output.amenitiesCopy],
        ['CTA', output.cta],
        ['FAQ', output.faq.map(item => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n')],
        ['SEO title', output.seoTitle],
        ['SEO description', output.seoDescription],
        ['Social post', output.socialPost],
        ['Email copy', output.emailCopy],
        ['WhatsApp/SMS copy', output.smsCopy],
        ['Ad copy', output.adCopy],
    ];

    return sections
        .filter(([, value]) => String(value || '').trim())
        .map(([label, value]) => `${label}\n${value}`)
        .join('\n\n');
};

export const getGeneratedRealtyFields = (output: RealtyAiListingOutput): string[] => {
    const fields: string[] = [];
    if (output.title) fields.push('title');
    if (output.descriptionShort) fields.push('descriptionShort');
    if (output.descriptionLong) fields.push('descriptionLong');
    if (output.highlights.length > 0) fields.push('highlights');
    if (output.features.length > 0) fields.push('features');
    if (output.amenitiesCopy) fields.push('amenitiesCopy');
    if (output.cta) fields.push('cta');
    if (output.faq.length > 0) fields.push('faq');
    if (output.seoTitle) fields.push('seoTitle');
    if (output.seoDescription) fields.push('seoDescription');
    if (output.socialPost) fields.push('socialPost');
    if (output.emailCopy) fields.push('emailCopy');
    if (output.smsCopy) fields.push('smsCopy');
    if (output.adCopy) fields.push('adCopy');
    return fields;
};

export const generateRealtyListingContent = async (input: RealtyAiGenerateInput): Promise<RealtyAiGenerateResult> => {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
            action: 'realty_listing_generate',
            projectId: input.projectId,
            propertyId: input.propertyId,
            tone: input.tone,
            language: input.language,
            userPrompt: input.userPrompt,
            model: input.model || REALTY_AI_DEFAULT_MODEL,
            mode: input.mode || 'full',
            missingRequired: input.score?.missingRequired || [],
            missingRecommended: input.score?.missingRecommended || [],
            recommendations: input.score?.recommendations || [],
        },
    });

    if (error) {
        throw new Error(error.message || 'Realty AI generation failed');
    }

    if (!data?.success) {
        throw new Error(data?.error || 'Realty AI generation failed');
    }

    const output = normalizeRealtyAiListingOutput(data.output);
    return {
        success: true,
        model: data.model || input.model || REALTY_AI_DEFAULT_MODEL,
        prompt: data.prompt || input.userPrompt || '',
        output,
        generatedFields: Array.isArray(data.generatedFields) ? data.generatedFields : getGeneratedRealtyFields(output),
        provider: 'openrouter',
        mode: data.mode === 'fix' ? 'fix' : 'full',
    };
};

export const generateRealtyCampaignContent = async (input: RealtyCampaignAiGenerateInput): Promise<RealtyCampaignAiGenerateResult> => {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
            action: 'realty_campaign_generate',
            projectId: input.projectId,
            propertyId: input.propertyId,
            campaignType: input.campaignType,
            language: input.language,
            tone: input.tone || 'luxury',
            userPrompt: input.userPrompt,
            model: input.model || REALTY_AI_DEFAULT_MODEL,
        },
    });

    if (error) {
        throw new Error(error.message || 'Realty campaign AI generation failed');
    }

    if (!data?.success) {
        throw new Error(data?.error || 'Realty campaign AI generation failed');
    }

    const output = normalizeRealtyCampaignOutput(data.output);
    return {
        success: true,
        model: data.model || input.model || REALTY_AI_DEFAULT_MODEL,
        prompt: data.prompt || input.userPrompt || '',
        output,
        generatedFields: Array.isArray(data.generatedFields) ? data.generatedFields : getGeneratedRealtyCampaignFields(output),
        provider: 'openrouter',
    };
};

export const buildRealtyAiPropertyPatch = (
    property: RealtyProperty,
    output: RealtyAiListingOutput,
    overwriteExisting: boolean
): Partial<RealtyProperty> => {
    const nextMetadata = {
        ...(property.metadata || {}),
        faq: output.faq.length > 0 ? output.faq : property.metadata?.faq,
        cta: output.cta || property.metadata?.cta,
        amenitiesCopy: output.amenitiesCopy || property.metadata?.amenitiesCopy,
        socialPost: output.socialPost || property.metadata?.socialPost,
        emailCopy: output.emailCopy || property.metadata?.emailCopy,
        smsCopy: output.smsCopy || property.metadata?.smsCopy,
        adCopy: output.adCopy || property.metadata?.adCopy,
    };

    const shouldApply = (current: unknown, next: unknown) => {
        if (Array.isArray(next)) return next.length > 0 && (overwriteExisting || !Array.isArray(current) || current.length === 0);
        return Boolean(String(next || '').trim()) && (overwriteExisting || !String(current || '').trim());
    };

    const descriptionLong = shouldApply(property.descriptionLong || property.description, output.descriptionLong)
        ? output.descriptionLong
        : property.descriptionLong || property.description;

    return {
        ...property,
        title: shouldApply(property.title, output.title) ? output.title : property.title,
        descriptionShort: shouldApply(property.descriptionShort, output.descriptionShort) ? output.descriptionShort : property.descriptionShort,
        descriptionLong,
        description: descriptionLong,
        highlights: shouldApply(property.highlights, output.highlights) ? output.highlights : property.highlights,
        features: shouldApply(property.features, output.features) ? output.features : property.features,
        seoTitle: shouldApply(property.seoTitle, output.seoTitle) ? output.seoTitle : property.seoTitle,
        seoDescription: shouldApply(property.seoDescription, output.seoDescription) ? output.seoDescription : property.seoDescription,
        metadata: nextMetadata,
    };
};
