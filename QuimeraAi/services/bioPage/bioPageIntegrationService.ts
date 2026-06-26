import { supabase } from '../../supabase';
import { loadPublicStorefrontCatalog } from '../../utils/ecommerce/publicStorefrontCatalog';
import { filterRenderableStorefrontProducts } from '../../utils/ecommerce/productDisplayGuards';
import { resolveProjectAiAssistantConfig } from '../../utils/chatbotEngine/projectAiAssistantConfig';
import { getBioPagePublishIssues, sanitizeBioMediaUrl } from './bioPageEngineService';
import type { BioPageBlock, BioPageData } from './bioPageTypes';

type SupabaseClient = typeof supabase;
type SupabaseResult<T> = { data: T | null; error: { message?: string } | null };
type ReadinessStatus = 'ready' | 'needs_setup' | 'needs_review' | 'disabled';

interface ReadinessBase {
    enabled: boolean;
    status: ReadinessStatus;
    warning?: string;
    blockers: string[];
}

export interface BioPageIntegrationReadiness {
    ecommerce: ReadinessBase & { productCount: number };
    appointments: ReadinessBase & { serviceCount: number };
    crm: ReadinessBase & { leadCount: number; leadBlockCount: number; leadFieldCount: number };
    emailMarketing: ReadinessBase & { audienceCount: number; subscribeBlockCount: number };
    chatbot: ReadinessBase & { inlineCtaEnabled: boolean; floatingChatEnabled: boolean };
    media: ReadinessBase & { assetCount: number; aiGeneratedAssetCount: number; pageMediaReferenceCount: number };
    analytics: ReadinessBase & { eventCount: number; trackViews: boolean; trackClicks: boolean; trackSourceUTM: boolean };
    websiteBuilder: ReadinessBase & { sectionCount: number };
    businessBlueprint: ReadinessBase & { sourceMapCount: number; generatedBlockCount: number; reviewRequiredCount: number };
    designSystem: ReadinessBase & { tokenCount: number; hasBrandColors: boolean; hasTypography: boolean; hasLayoutVariant: boolean };
    seo: ReadinessBase & { hasTitle: boolean; hasDescription: boolean; hasOgImage: boolean };
    qrCode: ReadinessBase & { generated: boolean; url?: string };
    publication: ReadinessBase & { canPublish: boolean; issueCount: number; issues: string[] };
}

async function safeQuery<T>(
    label: string,
    query: PromiseLike<SupabaseResult<T>>,
): Promise<SupabaseResult<T>> {
    try {
        return await query;
    } catch (error) {
        console.warn(`[BioPageIntegrations] ${label} readiness unavailable:`, error);
        return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
}

function toArray<T = Record<string, any>>(result: SupabaseResult<T[] | null>): T[] {
    return Array.isArray(result.data) ? result.data : [];
}

function readRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function readArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function createReadiness(
    enabled: boolean,
    blockers: string[],
    warning?: string,
): ReadinessBase {
    return {
        enabled,
        status: !enabled ? 'disabled' : blockers.length ? 'needs_setup' : warning ? 'needs_review' : 'ready',
        warning,
        blockers,
    };
}

function getVisibleBlocks(page: BioPageData, types: BioPageBlock['type'][]): BioPageBlock[] {
    const typeSet = new Set(types);
    return (page.blocks || []).filter(block => (
        typeSet.has(block.type)
        && block.visible !== false
        && block.status !== 'hidden'
    ));
}

function countLeadFields(blocks: BioPageBlock[]): number {
    return blocks.reduce((total, block) => total + readArray(block.data?.fields).length, 0);
}

function countPageMediaReferences(page: BioPageData): number {
    const candidates: unknown[] = [
        page.profile?.avatarUrl,
        page.profile?.coverImageUrl,
        page.profile?.logoUrl,
        page.theme?.backgroundImage,
        page.theme?.backgroundVideo,
        page.seo?.ogImageUrl,
        ...page.links.flatMap(link => [link.thumbnail, link.imageUrl]),
        ...page.products.flatMap(product => [product.imageUrl]),
    ];

    page.blocks.forEach(block => {
        candidates.push(block.data?.url, block.data?.imageUrl, block.data?.mediaUrl, block.data?.backgroundImage);
        readArray(block.data?.items).forEach(item => {
            const record = readRecord(item);
            candidates.push(record.url, record.imageUrl, record.thumbnailUrl, record.mediaUrl);
        });
    });

    return candidates.filter(value => typeof value === 'string' && Boolean(sanitizeBioMediaUrl(value))).length;
}

function countRecordLeaves(value: unknown): number {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
    return Object.values(value as Record<string, unknown>).reduce<number>((total, entry) => {
        if (Array.isArray(entry)) return total + entry.length;
        if (entry && typeof entry === 'object') return total + countRecordLeaves(entry);
        return total + (entry === undefined || entry === null || entry === '' ? 0 : 1);
    }, 0);
}

function countBusinessBlueprintSourceMapEntries(page: BioPageData, projectData: Record<string, any>): number {
    const candidates: unknown[] = [
        page.settings?.sourceMap,
        projectData.businessBlueprint?.bioPageBlueprint?.sourceMap,
        projectData.businessBlueprint?.sourceMap,
        ...page.blocks.flatMap(block => [block.sourceMap, block.settings?.sourceMap]),
        ...page.links.flatMap(link => [link.sourceMap, link.metadata?.sourceMap]),
    ];

    return candidates.reduce<number>((total, candidate) => total + countRecordLeaves(candidate), 0);
}

function countReviewRequiredItems(page: BioPageData): number {
    const profileCount = page.profile?.needsReview ? 1 : 0;
    const linkCount = page.links.filter(link => link.needsReview).length;
    const blockCount = page.blocks.filter(block => block.needsReview).length;
    return profileCount + linkCount + blockCount;
}

function countBioThemeTokens(page: BioPageData): number {
    const theme: Partial<BioPageData['theme']> = page.theme || {};
    const tokenKeys: Array<keyof BioPageData['theme']> = [
        'backgroundColor',
        'gradientColor',
        'buttonColor',
        'buttonTextColor',
        'textColor',
        'titleColor',
        'bodyColor',
        'titleFont',
        'bodyFont',
        'buttonShape',
        'buttonStyle',
        'cardRadius',
        'layoutVariant',
    ];
    return tokenKeys.filter(key => {
        const value = theme[key];
        return value !== undefined && value !== null && value !== '';
    }).length;
}

function getSectionCount(projectData: Record<string, any>): number {
    const data = readRecord(projectData.data);
    const componentOrder = readArray(projectData.component_order).length
        ? readArray(projectData.component_order)
        : readArray(data.componentOrder);
    if (componentOrder.length) return componentOrder.length;

    const pages = readArray(data.pages);
    if (pages.length) {
        return pages.reduce<number>((total, page) => {
            const record = readRecord(page);
            return total + readArray(record.sections || record.componentOrder).length;
        }, 0);
    }

    return Object.keys(data).filter(key => {
        const value = data[key];
        return value && typeof value === 'object' && !Array.isArray(value);
    }).length;
}

function assetBelongsToBioPage(asset: Record<string, any>, page: BioPageData): boolean {
    const metadata = readRecord(asset.metadata);
    const usedIn = readArray(asset.used_in);
    return usedIn.includes(page.id)
        || usedIn.includes(page.projectId)
        || metadata.bioPageId === page.id
        || metadata.projectId === page.projectId
        || metadata.contentId === page.id
        || metadata.contentId === page.projectId
        || metadata.contentType === 'bio_page';
}

export async function getBioPageIntegrationReadiness(
    page: BioPageData,
    client: SupabaseClient = supabase,
): Promise<BioPageIntegrationReadiness> {
    const [appointments, audiences, project, leads, mediaAssets, events, qrCode] = await Promise.all([
        safeQuery('Appointments', client
            .from('project_appointments')
            .select('id,status,service_type')
            .eq('project_id', page.projectId)
            .limit(25)),
        safeQuery('Email Marketing', client
            .from('email_audiences')
            .select('id,name')
            .eq('project_id', page.projectId)
            .limit(25)),
        safeQuery('Project', client
            .from('projects')
            .select('ai_assistant_config,data,component_order,seo_config')
            .eq('id', page.projectId)
            .maybeSingle()),
        safeQuery('CRM', client
            .from('leads')
            .select('id,source')
            .eq('project_id', page.projectId)
            .limit(25)),
        safeQuery('Media AI', client
            .from('media_assets')
            .select('id,is_ai_generated,category,used_in,metadata')
            .limit(50)),
        safeQuery('Analytics', client
            .from('bio_page_events')
            .select('id,event_type')
            .eq('bio_page_id', page.id)
            .limit(50)),
        safeQuery('QR', client
            .from('bio_page_qr_codes')
            .select('id,url')
            .eq('bio_page_id', page.id)
            .maybeSingle()),
    ]);

    let productCount = 0;
    try {
        const catalog = await loadPublicStorefrontCatalog(page.projectId);
        productCount = filterRenderableStorefrontProducts(catalog.products).length;
    } catch (error) {
        console.warn('[BioPageIntegrations] Ecommerce readiness unavailable:', error);
    }

    const appointmentCount = appointments.error ? 0 : toArray(appointments).length;
    const audienceCount = audiences.error ? 0 : toArray(audiences).length;
    const leadRows = toArray(leads);
    const eventRows = toArray(events);
    const projectRow = readRecord(project.data);
    const projectData = readRecord(projectRow.data);
    const aiAssistant = resolveProjectAiAssistantConfig({
        ai_assistant_config: projectRow.ai_assistant_config,
        data: projectData,
    }) || projectData.aiAssistant || page.aiAssistant;
    const leadBlocks = getVisibleBlocks(page, ['lead_form', 'contact']);
    const subscribeBlocks = getVisibleBlocks(page, ['email_subscribe']);
    const bookingBlocks = getVisibleBlocks(page, ['booking']);
    const shopBlocks = getVisibleBlocks(page, ['product_grid', 'product_collection']);
    const chatbotBlocks = getVisibleBlocks(page, ['chatbot_cta']);
    const mediaBlocks = getVisibleBlocks(page, ['featured_banner', 'featured_media', 'media_grid', 'portfolio_grid']);
    const pageMediaReferenceCount = countPageMediaReferences(page);
    const linkedMediaAssets = toArray(mediaAssets).filter(asset => assetBelongsToBioPage(asset, page));
    const aiGeneratedAssetCount = linkedMediaAssets.filter(asset => asset.is_ai_generated === true).length;
    const seoTitle = page.seo?.title || page.title || page.profile?.displayName || page.profile?.name;
    const seoDescription = page.seo?.description || page.description || page.profile?.bio;
    const qrRecord = readRecord(qrCode.data);
    const publishIssues = getBioPagePublishIssues(page);
    const sourceMapCount = countBusinessBlueprintSourceMapEntries(page, projectData);
    const generatedBlockCount = page.blocks.filter(block => block.generatedByAI || block.sourceMap || block.settings?.sourceMap).length;
    const reviewRequiredCount = countReviewRequiredItems(page);
    const themeTokenCount = countBioThemeTokens(page);
    const hasBrandColors = Boolean(page.theme?.backgroundColor && page.theme?.buttonColor && page.theme?.textColor);
    const hasTypography = Boolean(page.theme?.titleFont && page.theme?.bodyFont);
    const hasLayoutVariant = Boolean(page.theme?.layoutVariant || page.theme?.preset);

    return {
        ecommerce: {
            ...createReadiness(
                shopBlocks.length > 0 || page.settings?.shopEnabled === true,
                productCount ? [] : ['no_public_products'],
                productCount ? undefined : 'No active Ecommerce products are available for public Bio Page display.',
            ),
            productCount,
        },
        appointments: {
            ...createReadiness(
                bookingBlocks.length > 0 || page.settings?.bookingEnabled === true,
                appointmentCount ? [] : ['appointments_not_configured'],
                appointmentCount ? undefined : 'Appointments must be configured before the public booking block is active.',
            ),
            serviceCount: appointmentCount,
        },
        crm: {
            ...createReadiness(
                leadBlocks.length > 0 || page.settings?.leadCaptureEnabled === true,
                leadBlocks.length && countLeadFields(leadBlocks) ? [] : ['lead_capture_not_configured'],
                leadBlocks.length ? undefined : 'Add a lead capture or contact block before collecting CRM leads.',
            ),
            leadCount: leadRows.length,
            leadBlockCount: leadBlocks.length,
            leadFieldCount: countLeadFields(leadBlocks),
        },
        emailMarketing: {
            ...createReadiness(
                subscribeBlocks.length > 0 || page.emailSignupEnabled === true || page.settings?.emailSignupEnabled === true,
                audienceCount ? [] : ['email_audience_not_configured'],
                audienceCount ? undefined : 'Select or create an Email Marketing audience before routing subscribers.',
            ),
            audienceCount,
            subscribeBlockCount: subscribeBlocks.length,
        },
        chatbot: {
            ...createReadiness(
                chatbotBlocks.length > 0 || page.settings?.chatbotEnabled === true || Boolean(page.aiAssistant),
                aiAssistant ? [] : ['chatcore_not_configured'],
                aiAssistant ? undefined : 'ChatCore needs an assistant configuration before public chat is enabled.',
            ),
            inlineCtaEnabled: chatbotBlocks.length > 0,
            floatingChatEnabled: page.settings?.chatbotEnabled === true,
        },
        media: {
            ...createReadiness(
                mediaBlocks.length > 0 || pageMediaReferenceCount > 0 || linkedMediaAssets.length > 0,
                pageMediaReferenceCount || linkedMediaAssets.length ? [] : ['media_not_selected'],
                pageMediaReferenceCount || linkedMediaAssets.length ? undefined : 'Add Media AI assets, a featured image, or a portfolio grid before publishing a visual Bio Page.',
            ),
            assetCount: linkedMediaAssets.length,
            aiGeneratedAssetCount,
            pageMediaReferenceCount,
        },
        analytics: {
            ...createReadiness(
                page.settings?.analyticsEnabled !== false,
                [],
                page.status === 'published' || eventRows.length ? undefined : 'Analytics will start after the Bio Page receives public traffic.',
            ),
            eventCount: eventRows.length,
            trackViews: page.settings?.trackViews !== false,
            trackClicks: page.settings?.trackClicks !== false,
            trackSourceUTM: page.settings?.trackSourceUTM !== false,
        },
        websiteBuilder: {
            ...createReadiness(
                true,
                getSectionCount(projectRow) ? [] : ['website_builder_project_empty'],
                getSectionCount(projectRow) ? undefined : 'Website Builder has no project sections available to inform Bio Page generation.',
            ),
            sectionCount: getSectionCount(projectRow),
        },
        businessBlueprint: {
            ...createReadiness(
                true,
                sourceMapCount ? [] : ['business_blueprint_provenance_missing'],
                reviewRequiredCount
                    ? 'AI Studio Bio Page provenance is present, but generated items still need review.'
                    : undefined,
            ),
            sourceMapCount,
            generatedBlockCount,
            reviewRequiredCount,
        },
        designSystem: {
            ...createReadiness(
                true,
                hasBrandColors && hasTypography && hasLayoutVariant ? [] : ['design_system_theme_incomplete'],
                themeTokenCount >= 8 ? undefined : 'Review Bio Page theme tokens before launch.',
            ),
            tokenCount: themeTokenCount,
            hasBrandColors,
            hasTypography,
            hasLayoutVariant,
        },
        seo: {
            ...createReadiness(
                true,
                seoTitle && seoDescription ? [] : ['seo_missing_title_or_description'],
                seoTitle && seoDescription ? undefined : 'SEO title and description should be reviewed before publishing.',
            ),
            hasTitle: Boolean(seoTitle),
            hasDescription: Boolean(seoDescription),
            hasOgImage: Boolean(page.seo?.ogImageUrl || page.profile?.coverImageUrl || page.profile?.avatarUrl),
        },
        qrCode: {
            ...createReadiness(
                Boolean(page.slug),
                page.slug ? [] : ['slug_required_for_qr'],
                qrRecord.id ? undefined : 'Generate a trackable QR code after the slug is ready.',
            ),
            generated: Boolean(qrRecord.id),
            url: typeof qrRecord.url === 'string' ? qrRecord.url : undefined,
        },
        publication: {
            ...createReadiness(
                true,
                publishIssues,
                publishIssues.length ? 'Review publish blockers before making the Bio Page public.' : undefined,
            ),
            canPublish: publishIssues.length === 0,
            issueCount: publishIssues.length,
            issues: publishIssues,
        },
    };
}
