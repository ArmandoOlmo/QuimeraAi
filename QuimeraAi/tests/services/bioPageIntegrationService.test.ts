import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBioPageIntegrationReadiness } from '../../services/bioPage';
import type { BioPageData } from '../../services/bioPage';
import { loadPublicStorefrontCatalog } from '../../utils/ecommerce/publicStorefrontCatalog';

vi.mock('../../utils/ecommerce/publicStorefrontCatalog', () => ({
    loadPublicStorefrontCatalog: vi.fn(),
}));

vi.mock('../../utils/ecommerce/productDisplayGuards', () => ({
    filterRenderableStorefrontProducts: vi.fn((products: unknown[]) => products),
}));

type TableRows = Record<string, Record<string, any>[]>;

function createBioPageIntegrationClient(tables: TableRows) {
    const matchesFilters = (row: Record<string, any>, filters: Array<{ key: string; value: unknown }>) => (
        filters.every(filter => row[filter.key] === filter.value)
    );

    return {
        from(table: string) {
            const filters: Array<{ key: string; value: unknown }> = [];
            let maxRows: number | null = null;
            const query: any = {
                select: () => query,
                eq: (key: string, value: unknown) => {
                    filters.push({ key, value });
                    return query;
                },
                limit: (value: number) => {
                    maxRows = value;
                    return query;
                },
                maybeSingle: async () => ({
                    data: (tables[table] || []).filter(row => matchesFilters(row, filters))[0] || null,
                    error: null,
                }),
                then: (resolve: any) => {
                    const rows = (tables[table] || []).filter(row => matchesFilters(row, filters));
                    return Promise.resolve({
                        data: maxRows === null ? rows : rows.slice(0, maxRows),
                        error: null,
                    }).then(resolve);
                },
            };
            return query;
        },
    };
}

function basePage(overrides: Partial<BioPageData> = {}): BioPageData {
    return {
        id: 'bio-page-1',
        projectId: 'project-1',
        tenantId: null,
        userId: 'user-1',
        username: 'creator-shop',
        slug: 'creator-shop',
        title: 'Creator Shop',
        description: 'Premium creator funnel.',
        profile: {
            name: 'Creator Shop',
            displayName: 'Creator Shop',
            handle: 'creator-shop',
            bio: 'Premium creator funnel.',
            avatarUrl: 'https://cdn.test/avatar.jpg',
        },
        theme: {
            preset: 'default',
            layoutVariant: 'creator',
            backgroundColor: '#111827',
            backgroundType: 'solid',
            buttonStyle: 'fill',
            buttonShape: 'rounded',
            buttonShadow: 'none',
            buttonColor: '#facc15',
            buttonTextColor: '#111827',
            textColor: '#ffffff',
            titleFont: 'Inter',
            titleColor: '#ffffff',
            bodyFont: 'Inter',
            bodyColor: '#ffffff',
            profileLayout: 'circle',
            profileSize: 'small',
            titleStyle: 'text',
        },
        links: [],
        blocks: [
            {
                id: 'shop',
                type: 'product_grid',
                title: 'Shop',
                order: 0,
                visible: true,
                status: 'configured',
                data: { productIds: ['product-1'] },
            },
            {
                id: 'booking',
                type: 'booking',
                title: 'Book',
                order: 1,
                visible: true,
                status: 'configured',
                data: {},
            },
            {
                id: 'lead',
                type: 'lead_form',
                title: 'Contact',
                order: 2,
                visible: true,
                status: 'configured',
                data: {
                    fields: [{ id: 'email', label: 'Email', type: 'email', required: true }],
                    consentRequired: true,
                    consentText: 'I agree to be contacted.',
                    successMessage: 'Thanks.',
                },
            },
            {
                id: 'subscribe',
                type: 'email_subscribe',
                title: 'Subscribe',
                order: 3,
                visible: true,
                status: 'configured',
                data: {
                    placeholder: 'Email',
                    buttonText: 'Subscribe',
                    consentRequired: true,
                    consentText: 'I agree to receive marketing emails.',
                    successMessage: 'Subscribed.',
                },
            },
            {
                id: 'chat',
                type: 'chatbot_cta',
                title: 'Chat',
                order: 4,
                visible: true,
                status: 'configured',
                data: {},
            },
            {
                id: 'media',
                type: 'featured_media',
                title: 'Featured',
                order: 5,
                visible: true,
                status: 'configured',
                data: { url: 'https://cdn.test/media.jpg' },
            },
        ],
        products: [],
        emailSignupEnabled: true,
        isPublished: true,
        status: 'published',
        seo: {
            title: 'Creator Shop',
            description: 'Premium creator funnel.',
            ogImageUrl: 'https://cdn.test/og.jpg',
            schemaType: 'Person',
        },
        settings: {
            shopEnabled: true,
            bookingEnabled: true,
            leadCaptureEnabled: true,
            emailSignupEnabled: true,
            chatbotEnabled: true,
            analyticsEnabled: true,
            sourceMap: {
                bioPageBlueprint: 'businessBlueprint.bioPageBlueprint',
                ecommerce: 'ecommerceBlueprint',
                appointments: 'appointmentsBlueprint',
            },
        },
        aiAssistant: { enabled: true } as any,
        ...overrides,
    };
}

describe('bioPageIntegrationService', () => {
    beforeEach(() => {
        vi.mocked(loadPublicStorefrontCatalog).mockResolvedValue({
            source: 'store-products',
            products: [{ id: 'product-1', name: 'Guide' }],
            categories: [],
        } as any);
    });

    it('reports ready status across the Bio Page ecosystem when canonical modules are configured', async () => {
        const client = createBioPageIntegrationClient({
            project_appointments: [{ id: 'appointment-1', project_id: 'project-1', status: 'active' }],
            email_audiences: [{ id: 'audience-1', project_id: 'project-1', name: 'Main' }],
            leads: [{ id: 'lead-1', project_id: 'project-1', source: 'bio_page' }],
            media_assets: [{
                id: 'asset-1',
                is_ai_generated: true,
                used_in: ['bio-page-1'],
                metadata: { bioPageId: 'bio-page-1' },
            }],
            bio_page_events: [{ id: 'event-1', bio_page_id: 'bio-page-1', event_type: 'bio_page_viewed' }],
            bio_page_qr_codes: [{ id: 'qr-1', bio_page_id: 'bio-page-1', url: 'https://app.test/bio/creator-shop' }],
            projects: [{
                id: 'project-1',
                ai_assistant_config: { enabled: true },
                data: {},
                component_order: ['hero', 'features'],
            }],
        });

        const readiness = await getBioPageIntegrationReadiness(basePage(), client as any);

        expect(readiness.ecommerce).toMatchObject({ status: 'ready', productCount: 1 });
        expect(readiness.appointments).toMatchObject({ status: 'ready', serviceCount: 1 });
        expect(readiness.crm).toMatchObject({ status: 'ready', leadBlockCount: 1, leadFieldCount: 1 });
        expect(readiness.emailMarketing).toMatchObject({ status: 'ready', audienceCount: 1 });
        expect(readiness.chatbot).toMatchObject({ status: 'ready', inlineCtaEnabled: true, floatingChatEnabled: true });
        expect(readiness.media).toMatchObject({ status: 'ready', assetCount: 1, aiGeneratedAssetCount: 1 });
        expect(readiness.analytics).toMatchObject({ status: 'ready', eventCount: 1 });
        expect(readiness.websiteBuilder).toMatchObject({ status: 'ready', sectionCount: 2 });
        expect(readiness.businessBlueprint).toMatchObject({ status: 'ready', sourceMapCount: 3, reviewRequiredCount: 0 });
        expect(readiness.designSystem).toMatchObject({ status: 'ready', hasBrandColors: true, hasTypography: true, hasLayoutVariant: true });
        expect(readiness.seo).toMatchObject({ status: 'ready', hasTitle: true, hasDescription: true, hasOgImage: true });
        expect(readiness.qrCode).toMatchObject({ status: 'ready', generated: true });
        expect(readiness.publication).toMatchObject({ status: 'ready', canPublish: true, issueCount: 0 });
    });

    it('treats BusinessBlueprint ChatCore knowledge as a valid Bio Page chatbot configuration', async () => {
        const client = createBioPageIntegrationClient({
            project_appointments: [],
            email_audiences: [],
            leads: [],
            media_assets: [],
            bio_page_events: [],
            bio_page_qr_codes: [],
            projects: [{
                id: 'project-1',
                ai_assistant_config: {},
                data: {
                    businessBlueprint: {
                        businessProfile: {
                            businessName: 'Bio Creator',
                            description: 'Creator storefront with booking and lead capture.',
                        },
                        chatbotBlueprint: {
                            enabled: true,
                            status: 'needs_review',
                            agentProfile: {
                                agentName: 'Bio Creator AI Agent',
                                supportedLanguages: ['es', 'en'],
                            },
                            businessKnowledge: ['Use visible Bio Page content only.'],
                        },
                    },
                },
                component_order: ['hero', 'footer'],
            }],
        });

        const readiness = await getBioPageIntegrationReadiness(basePage({
            aiAssistant: null,
            settings: { chatbotEnabled: true },
            blocks: [{
                id: 'chat',
                type: 'chatbot_cta',
                title: 'ChatCore',
                order: 0,
                visible: true,
                status: 'configured',
                data: {},
            }],
        }), client as any);

        expect(readiness.chatbot).toMatchObject({
            status: 'ready',
            inlineCtaEnabled: true,
            floatingChatEnabled: true,
            blockers: [],
        });
    });

    it('surfaces setup and publication blockers without inventing public content', async () => {
        vi.mocked(loadPublicStorefrontCatalog).mockResolvedValue({
            source: 'store-products',
            products: [],
            categories: [],
        } as any);

        const client = createBioPageIntegrationClient({
            project_appointments: [],
            email_audiences: [],
            leads: [],
            media_assets: [],
            bio_page_events: [],
            bio_page_qr_codes: [],
            projects: [{ id: 'project-1', data: {}, component_order: [] }],
        });

        const readiness = await getBioPageIntegrationReadiness(basePage({
            slug: '',
            username: '',
            title: '',
            description: '',
            profile: { name: '', displayName: '', handle: '', bio: '' },
            seo: {},
            aiAssistant: null,
            blocks: [
                {
                    id: 'shop',
                    type: 'product_grid',
                    title: 'Shop',
                    order: 0,
                    visible: true,
                    status: 'configured',
                    data: { productIds: ['missing-product'] },
                },
                {
                    id: 'lead',
                    type: 'lead_form',
                    title: 'Contact',
                    order: 1,
                    visible: true,
                    status: 'configured',
                    data: {},
                },
                {
                    id: 'subscribe',
                    type: 'email_subscribe',
                    title: 'Subscribe',
                    order: 2,
                    visible: true,
                    status: 'configured',
                    data: {},
                },
            ],
            settings: {
                shopEnabled: true,
                leadCaptureEnabled: true,
                emailSignupEnabled: true,
            },
        }), client as any);

        expect(readiness.ecommerce).toMatchObject({ status: 'needs_setup', productCount: 0 });
        expect(readiness.appointments.status).toBe('disabled');
        expect(readiness.crm).toMatchObject({ status: 'needs_setup', leadFieldCount: 0 });
        expect(readiness.emailMarketing).toMatchObject({ status: 'needs_setup', audienceCount: 0 });
        expect(readiness.chatbot.status).toBe('disabled');
        expect(readiness.media.status).toBe('disabled');
        expect(readiness.websiteBuilder).toMatchObject({ status: 'needs_setup', sectionCount: 0 });
        expect(readiness.businessBlueprint).toMatchObject({ status: 'needs_setup', sourceMapCount: 0 });
        expect(readiness.designSystem).toMatchObject({ status: 'ready', hasBrandColors: true, hasTypography: true });
        expect(readiness.seo).toMatchObject({ status: 'needs_setup', hasTitle: false, hasDescription: false });
        expect(readiness.qrCode).toMatchObject({ status: 'disabled', generated: false });
        expect(readiness.publication.canPublish).toBe(false);
        expect(readiness.publication.issues.length).toBeGreaterThan(0);
    });
});
