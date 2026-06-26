import { describe, expect, it, vi } from 'vitest';
import {
    applyProjectBioPageBlueprintDraft,
    buildBioPageTrackedUrl,
    buildBioPageChatContext,
    createBioPageBlock,
    createBioPageDraft,
    createBioPageFromBlueprint,
    createBioPageLink,
    createDefaultBlocks,
    deleteBioPageBlock,
    deleteBioPageLink,
    duplicateBioPageBlock,
    duplicateBioPageLink,
    filterBioPageProductsForBlock,
    filterBioPageProductsForQuery,
    getBioPageAnalytics,
    getBioPageById,
    getBioPageEligibleStorefrontProducts,
    generateBioPageQrCode,
    getSafeBioBlockMediaUrl,
    getSafeBioBlockUrl,
    getBioPagePublishIssues,
    getBioPageAnonymousVisitorId,
    getBioPageTrafficSource,
    getBioPageUtm,
    getPublicBioPageBySlug,
    isBioSlugAvailable,
    mapStorefrontProductToBioPageProduct,
    publishBioPage,
    parseBioPageAppointmentPaymentReturn,
    prioritizeBioPageBlock,
    prioritizeBioPageLink,
    recordBioPageEvent,
    recordBioPageClick,
    recordBioPageView,
    sanitizeBioMediaUrl,
    sanitizeBioPageAnalyticsMetadata,
    sanitizeBioUrl,
    subscribeBioPageEmail,
    submitBioPageLead,
    toggleBlockVisibility,
    toggleLinkVisibility,
    trackBioPageAppointmentPaymentReturn,
    trackBioPageBookingCompleted,
    trackBioPageProductClick,
    trackBioPageQrScan,
    trackBioPageShare,
    trackBioPageTabChange,
    unpublishBioPage,
    updateBioPageBlock,
    updateBioPageDraft,
    updateBioPageLink,
    updateBioPageProfile,
    updateBioPageTheme,
    validateBioSlug,
} from '../../services/bioPage';
import { createBusinessBlueprintFromWebsitePlan } from '../../utils/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import type { PublicStorefrontProduct } from '../../utils/ecommerce/publicStorefrontCatalog';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import { getBioSlugFromPathname } from '../../utils/bioPageRouting';

function buildPlan(): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Creator Shop',
            industry: 'creator ecommerce',
            description: 'A creator brand selling digital guides and booking consultations.',
            tagline: 'Create better systems',
            services: [{ name: 'Consultation', description: 'Book a strategy session.' }],
            contactInfo: { city: 'San Juan', country: 'Puerto Rico', instagram: '@creator_shop' },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#facc15',
                secondary: '#111827',
                accent: '#38bdf8',
                background: '#0f172a',
                surface: '#111827',
                text: '#ffffff',
            },
            visualStyle: 'premium creator',
        },
        contentMap: {
            pages: [],
            extractedImages: [
                {
                    url: 'https://cdn.creator.test/hero.jpg',
                    alt: 'Creator workspace',
                    recommendedUse: 'Bio page hero media',
                    sourcePage: 'https://creator.test',
                },
                {
                    url: 'https://cdn.creator.test/project.jpg',
                    alt: 'Digital product preview',
                    recommendedUse: 'Portfolio item',
                },
            ],
        },
        componentPlan: [
            { component: 'hero', reason: 'Creator profile intro', confidence: 0.9 },
            { component: 'featuredProducts', reason: 'Shop links', confidence: 0.9 },
            { component: 'appointmentBooking', reason: 'Booking CTA', confidence: 0.86 },
            { component: 'newsletter', reason: 'Subscribe', confidence: 0.82 },
            { component: 'portfolio', reason: 'Showcase creator work', confidence: 0.8 },
        ],
        assetPlan: [{ targetPath: 'bio.featuredMedia.hero', source: 'generate', aspectRatio: '4:5' }],
        qualityGoals: ['bio page engine'],
    };
}

function storefrontProduct(overrides: Partial<PublicStorefrontProduct>): PublicStorefrontProduct {
    return {
        id: overrides.id || 'product-1',
        name: overrides.name || 'Product',
        slug: overrides.slug || 'product',
        description: '',
        price: 19,
        images: [],
        trackInventory: false,
        inStock: true,
        lowStock: false,
        storeId: 'store-1',
        userId: 'user-1',
        updatedAt: '2026-06-25T20:00:00.000Z',
        ...overrides,
    };
}

function createBioPageSupabaseMock() {
    const tables: Record<string, any[]> = {
        bio_pages: [],
        bio_page_links: [],
        bio_page_blocks: [],
        bio_page_events: [],
    };
    let idCounter = 1;

    const matchesFilters = (row: any, filters: Array<{ key: string; value: unknown; op: 'eq' | 'neq' }>) => (
        filters.every(filter => (
            filter.op === 'eq'
                ? row[filter.key] === filter.value
                : row[filter.key] !== filter.value
        ))
    );

    return {
        tables,
        from(table: string) {
            const state: {
                filters: Array<{ key: string; value: unknown; op: 'eq' | 'neq' }>;
                operation: 'select' | 'insert' | 'delete' | 'update';
                inserted: any[];
                updated: any | null;
            } = { filters: [], operation: 'select', inserted: [], updated: null };

            const query: any = {
                error: null,
                select: () => query,
                order: () => query,
                limit: () => query,
                eq: (key: string, value: unknown) => {
                    state.filters.push({ key, value, op: 'eq' });
                    if (state.operation === 'delete') {
                        tables[table] = (tables[table] || []).filter(row => !matchesFilters(row, state.filters));
                    }
                    if (state.operation === 'update') {
                        tables[table] = (tables[table] || []).map(row => (
                            matchesFilters(row, state.filters)
                                ? { ...row, ...state.updated }
                                : row
                        ));
                    }
                    return query;
                },
                neq: (key: string, value: unknown) => {
                    state.filters.push({ key, value, op: 'neq' });
                    return query;
                },
                delete: () => {
                    state.operation = 'delete';
                    return query;
                },
                update: (row: any) => {
                    state.operation = 'update';
                    state.updated = row;
                    return query;
                },
                insert: (rows: any | any[]) => {
                    state.operation = 'insert';
                    const nextRows = (Array.isArray(rows) ? rows : [rows]).map(row => ({
                        id: row.id || `${table}-${idCounter++}`,
                        created_at: row.created_at || new Date(0).toISOString(),
                        ...row,
                    }));
                    tables[table].push(...nextRows);
                    state.inserted = nextRows;
                    return query;
                },
                single: async () => ({ data: state.inserted[0] || null, error: null }),
                maybeSingle: async () => ({
                    data: (tables[table] || []).filter(row => matchesFilters(row, state.filters))[0] || null,
                    error: null,
                }),
                then: (resolve: any) => Promise.resolve({
                    data: state.operation === 'insert'
                        ? state.inserted
                        : (tables[table] || []).filter(row => matchesFilters(row, state.filters)),
                    error: null,
                }).then(resolve),
            };

            return query;
        },
    };
}

describe('bioPageEngineService', () => {
    it('validates reserved slugs and normalizes allowed slugs', () => {
        expect(validateBioSlug('Admin').ok).toBe(false);
        expect(validateBioSlug('Creator Shop!')).toMatchObject({ ok: true, slug: 'creator-shop' });
    });

    it('extracts canonical public Bio Page slugs from route paths', () => {
        expect(getBioSlugFromPathname('/bio/creator-shop')).toBe('creator-shop');
        expect(getBioSlugFromPathname('/bio/creator-shop/')).toBe('creator-shop');
        expect(getBioSlugFromPathname('/bio/creator-shop/extra')).toBe('creator-shop');
        expect(getBioSlugFromPathname('/bio/creator%20shop?utm_source=qr#contact')).toBe('creator shop');
        expect(getBioSlugFromPathname('/bio/creator%2Fextra')).toBe('creator');
        expect(getBioSlugFromPathname('/bio/?utm_source=qr')).toBe('');
        expect(getBioSlugFromPathname('/bio/%E0%A4%A')).toBe('');
        expect(getBioSlugFromPathname('/store/bio/creator-shop')).toBe('');
    });

    it('handles Bio Page slug availability before create, update, and publish', async () => {
        const client = createBioPageSupabaseMock();
        client.tables.bio_pages.push(
            {
                id: 'bio-owner',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                slug: 'creator-shop',
                title: 'Creator Shop',
                description: '',
                profile: { displayName: 'Creator Shop', handle: 'creator-shop', bio: '' },
                theme: {},
                seo: {},
                settings: {},
                status: 'draft',
            },
            {
                id: 'bio-conflict',
                project_id: 'project-2',
                tenant_id: 'tenant-1',
                user_id: 'user-2',
                slug: 'taken-slug',
                title: 'Taken',
                description: '',
                profile: { displayName: 'Taken', handle: 'taken-slug', bio: '' },
                theme: {},
                seo: {},
                settings: {},
                status: 'draft',
            },
        );

        await expect(isBioSlugAvailable({ slug: 'Taken Slug' }, client as any)).resolves.toMatchObject({
            ok: false,
            slug: 'taken-slug',
        });
        await expect(isBioSlugAvailable({ slug: 'Creator Shop', excludePageId: 'bio-owner' }, client as any)).resolves.toEqual({
            ok: true,
            slug: 'creator-shop',
        });
        await expect(isBioSlugAvailable({ slug: 'Fresh Slug' }, client as any)).resolves.toEqual({
            ok: true,
            slug: 'fresh-slug',
        });

        await expect(createBioPageDraft({
            projectId: 'project-3',
            tenantId: 'tenant-1',
            userId: 'user-3',
            slug: 'taken-slug',
        }, client as any)).rejects.toThrow('already in use');

        await expect(updateBioPageDraft({
            page: {
                id: 'bio-owner',
                projectId: 'project-1',
                tenantId: 'tenant-1',
                userId: 'user-1',
                username: 'creator-shop',
                slug: 'creator-shop',
                profile: { name: 'Creator Shop', displayName: 'Creator Shop', bio: '' },
                theme: {},
                links: [],
                blocks: [],
                products: [],
                emailSignupEnabled: false,
                isPublished: false,
                status: 'draft',
            } as any,
            slug: 'taken-slug',
            profile: { name: 'Creator Shop', displayName: 'Creator Shop', bio: '' },
            theme: {} as any,
            links: [],
            blocks: [],
            emailSignupEnabled: false,
        }, client as any)).rejects.toThrow('already in use');

        client.tables.bio_pages[0].slug = 'taken-slug';
        await expect(publishBioPage('bio-owner', client as any)).rejects.toThrow('already in use');
    });

    it('blocks unsafe URLs while allowing public/internal/contact links', () => {
        expect(sanitizeBioUrl('javascript:alert(1)')).toBe('');
        expect(sanitizeBioUrl('/store/demo')).toBe('/store/demo');
        expect(sanitizeBioUrl('hello@example.com')).toBe('https://hello@example.com/');
        expect(sanitizeBioUrl('quimera.ai')).toBe('https://quimera.ai/');
    });

    it('sanitizes public Bio Page block CTA URLs at runtime', () => {
        expect(getSafeBioBlockUrl({ data: { url: 'javascript:alert(1)' } })).toBe('');
        expect(getSafeBioBlockUrl({ data: { url: '/appointments?project=project-1' } })).toBe('/appointments?project=project-1');
        expect(getSafeBioBlockUrl({ data: {} }, '/appointments?project=project-1')).toBe('/appointments?project=project-1');
        expect(getSafeBioBlockUrl({ data: { url: 'creator.example/booking' } })).toBe('https://creator.example/booking');
    });

    it('sanitizes public Bio Page media URLs separately from CTA URLs', () => {
        expect(sanitizeBioMediaUrl('mailto:hello@example.com')).toBe('');
        expect(sanitizeBioMediaUrl('tel:+15555555555')).toBe('');
        expect(sanitizeBioMediaUrl('#media')).toBe('');
        expect(sanitizeBioMediaUrl('/uploads/bio/hero.jpg')).toBe('/uploads/bio/hero.jpg');
        expect(sanitizeBioMediaUrl('cdn.creator.test/hero.jpg')).toBe('https://cdn.creator.test/hero.jpg');
        expect(getSafeBioBlockMediaUrl({ data: { url: 'sms:+15555555555' } })).toBe('');
    });

    it('redacts contact and workflow PII from public Bio Page analytics metadata', () => {
        expect(sanitizeBioPageAnalyticsMetadata({
            bioPageId: 'bio-1',
            bioSlug: 'creator-shop',
            blockId: 'block-lead',
            sourceModule: 'bio-page-engine',
            sourceComponent: 'BioPageLeadFormBlock',
            sourceEvent: 'bio_page_lead_capture',
            emailMarketingSource: 'bio_page',
            audienceId: 'audience-1',
            audienceSync: 'synced',
            crmWrite: 'duplicate',
            duplicate: true,
            consentRequired: true,
            email: 'ana@example.com',
            recipientEmail: 'ana@example.com',
            phone: '+1 787 555 0100',
            name: 'Ana',
            message: 'I need help',
            bioPageDedupeKey: 'email:ana@example.com',
            canonicalEmail: { recipientEmail: 'ana@example.com' },
            sourceEntityId: 'ana@example.com',
            leadForm: { values: { email: 'ana@example.com' } },
            subscriberId: 'subscriber-1',
            leadId: 'lead-1',
            audienceError: 'blocked for ana@example.com',
        })).toEqual({
            bioPageId: 'bio-1',
            bioSlug: 'creator-shop',
            blockId: 'block-lead',
            sourceModule: 'bio-page-engine',
            sourceComponent: 'BioPageLeadFormBlock',
            sourceEvent: 'bio_page_lead_capture',
            emailMarketingSource: 'bio_page',
            audienceId: 'audience-1',
            audienceSync: 'synced',
            crmWrite: 'duplicate',
            duplicate: true,
            consentRequired: true,
        });
    });

    it('builds channel-specific tracked Bio Page URLs with sanitized UTM settings', () => {
        const page = {
            slug: 'Creator Shop!',
            settings: {
                shareUtmSource: 'instagram story',
                shareUtmMedium: 'social/share',
                shareUtmCampaign: 'Launch Promo!',
                qrUtmSource: 'print flyer',
                qrUtmMedium: 'qr code',
                qrUtmCampaign: 'Retail Drop 01',
            },
        } as any;

        expect(buildBioPageTrackedUrl({ page, origin: 'https://quimera.test', channel: 'share' })).toBe(
            'https://quimera.test/bio/creator-shop?utm_source=instagram-story&utm_medium=social-share&utm_campaign=Launch-Promo',
        );
        expect(buildBioPageTrackedUrl({ page, origin: 'https://quimera.test', channel: 'qr' })).toBe(
            'https://quimera.test/bio/creator-shop?utm_source=print-flyer&utm_medium=qr-code&utm_campaign=Retail-Drop-01',
        );
        expect(buildBioPageTrackedUrl({
            page: { slug: 'Creator Shop', settings: {} } as any,
            origin: 'https://quimera.test',
            channel: 'qr',
            utm: { utm_campaign: 'Override Campaign', utm_content: 'Poster A' },
        })).toBe(
            'https://quimera.test/bio/creator-shop?utm_source=qr&utm_medium=bio_page&utm_campaign=Override-Campaign&utm_content=Poster-A',
        );
    });

    it('generates QR code metadata with a sanitized optional logo', async () => {
        const upserts: Array<{ table: string; row: any; options: any }> = [];
        const client = {
            from(table: string) {
                return {
                    upsert(row: any, options: any) {
                        upserts.push({ table, row, options });
                        return { error: null };
                    },
                };
            },
        };
        const page = {
            id: 'bio-qr-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
            slug: 'creator-shop',
            settings: {
                qrUtmSource: 'print flyer',
                qrUtmMedium: 'qr code',
                qrUtmCampaign: 'Retail Drop 01',
                qrLogoUrl: 'javascript:alert(1)',
            },
            theme: {
                buttonColor: '#0f172a',
            },
            profile: {
                logoUrl: 'https://cdn.example.com/profile-logo.png',
                avatarUrl: 'https://cdn.example.com/avatar.png',
            },
        } as any;
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        let qr: Awaited<ReturnType<typeof generateBioPageQrCode>> | null = null;
        try {
            qr = await generateBioPageQrCode({
                page,
                origin: 'https://quimera.test',
                color: '#123456',
                backgroundColor: '#f8fafc',
                logoUrl: 'https://cdn.example.com/qr-logo.png',
                logoLoadTimeoutMs: 1,
                width: 192,
            }, client as any);
        } finally {
            warnSpy.mockRestore();
        }
        if (!qr) throw new Error('QR code was not generated.');

        expect(qr.url).toBe('https://quimera.test/bio/creator-shop?utm_source=print-flyer&utm_medium=qr-code&utm_campaign=Retail-Drop-01');
        expect(qr.dataUrl).toMatch(/^data:image\/png;base64,/);
        expect(upserts).toHaveLength(1);
        expect(upserts[0]).toMatchObject({
            table: 'bio_page_qr_codes',
            options: { onConflict: 'bio_page_id' },
            row: {
                tenant_id: 'tenant-1',
                project_id: 'project-1',
                bio_page_id: 'bio-qr-1',
                url: qr.url,
                color: '#123456',
                background_color: '#f8fafc',
                logo_url: 'https://cdn.example.com/qr-logo.png',
                metadata: {
                    generatedBy: 'bio-page-engine',
                    logoEmbedded: false,
                },
            },
        });
    });

    it('persists custom slug, SEO, and QR settings on draft updates', async () => {
        const client = createBioPageSupabaseMock();
        const page = {
            id: 'bio-settings',
            projectId: 'project-1',
            tenantId: 'tenant-1',
            userId: 'user-1',
            username: 'old-slug',
            slug: 'old-slug',
            title: 'Old Bio',
            description: 'Old description',
            profile: { name: 'Old Bio', displayName: 'Old Bio', bio: 'Old description' },
            theme: {},
            links: [],
            blocks: [],
            products: [],
            emailSignupEnabled: false,
            isPublished: false,
            status: 'draft',
            seo: { noIndex: true },
            settings: { qrColor: '#111827' },
        } as any;
        client.tables.bio_pages.push({
            id: page.id,
            project_id: page.projectId,
            tenant_id: page.tenantId,
            user_id: page.userId,
            slug: page.slug,
            title: page.title,
            description: page.description,
            profile: page.profile,
            theme: page.theme,
            seo: page.seo,
            settings: page.settings,
            status: page.status,
        });

        const updated = await updateBioPageDraft({
            page,
            slug: 'Creator SEO',
            profile: { name: 'Creator SEO', displayName: 'Creator SEO', bio: 'Smart funnel' },
            theme: page.theme,
            links: [],
            blocks: [],
            emailSignupEnabled: true,
            seo: {
                title: 'Creator SEO | Bio',
                description: 'A focused creator funnel.',
                ogImageUrl: 'https://cdn.example.com/og.png',
                canonicalUrl: 'https://example.com/bio/creator-seo',
                noIndex: false,
                schemaType: 'Person',
            },
            settings: {
                qrColor: '#123456',
                qrBackgroundColor: '#f8fafc',
                qrLogoUrl: 'https://cdn.example.com/logo.png',
                shareUtmSource: 'instagram',
                shareUtmMedium: 'social',
                shareUtmCampaign: 'creator-launch',
                qrUtmSource: 'print',
                qrUtmMedium: 'qr',
                qrUtmCampaign: 'market-popup',
            },
        }, client as any);

        expect(updated).toMatchObject({
            slug: 'creator-seo',
            username: 'creator-seo',
            title: 'Creator SEO',
            description: 'Smart funnel',
            emailSignupEnabled: true,
        });
        expect(client.tables.bio_pages[0]).toMatchObject({
            slug: 'creator-seo',
            seo: {
                title: 'Creator SEO | Bio',
                canonicalUrl: 'https://example.com/bio/creator-seo',
                noIndex: false,
                schemaType: 'Person',
            },
            settings: {
                emailSignupEnabled: true,
                qrColor: '#123456',
                qrBackgroundColor: '#f8fafc',
                qrLogoUrl: 'https://cdn.example.com/logo.png',
                shareUtmSource: 'instagram',
                shareUtmMedium: 'social',
                shareUtmCampaign: 'creator-launch',
                qrUtmSource: 'print',
                qrUtmMedium: 'qr',
                qrUtmCampaign: 'market-popup',
            },
        });
    });

    it('creates default blocks from existing editor state', () => {
        const blocks = createDefaultBlocks({
            links: [{ id: 'link-1', title: 'Website', url: '/', enabled: true, clicks: 0 }],
            profile: { name: 'Creator Shop', bio: 'Bio' },
            settings: { emailSignupEnabled: true, leadCaptureEnabled: true, chatbotEnabled: true },
        });

        expect(blocks.map(block => block.type)).toEqual(['profile', 'link', 'lead_form', 'email_subscribe', 'chatbot_cta']);
        expect(blocks.find(block => block.type === 'lead_form')?.data).toMatchObject({
            fields: [
                { id: 'name', label: 'Name', type: 'text', required: true },
                { id: 'email', label: 'Email', type: 'email', required: true },
                { id: 'message', label: 'Message', type: 'textarea', required: false },
            ],
            consentRequired: true,
            consentText: 'I agree to be contacted about this request.',
            successMessage: 'Thanks. We will be in touch soon.',
        });
        expect(blocks.find(block => block.type === 'email_subscribe')?.data).toMatchObject({
            placeholder: 'Email address',
            buttonText: 'Subscribe',
            consentRequired: true,
            consentText: 'I agree to receive marketing emails.',
            successMessage: 'Thanks for subscribing.',
        });
    });

    it('persists canonical profile, theme, block, and link service mutations', async () => {
        const client = createBioPageSupabaseMock();
        let page = await createBioPageDraft({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            userId: 'user-1',
            slug: 'service-crud',
            profile: { name: 'Service CRUD', displayName: 'Service CRUD', bio: 'Original bio' },
            theme: {
                preset: 'default',
                backgroundColor: '#0f172a',
                backgroundType: 'solid',
                buttonStyle: 'fill',
                buttonShape: 'rounded',
                buttonShadow: 'none',
                buttonColor: '#facc15',
                buttonTextColor: '#000000',
                textColor: '#ffffff',
                titleFont: 'Inter',
                titleColor: '#ffffff',
                bodyFont: 'Inter',
                bodyColor: '#ffffff',
                profileLayout: 'circle',
                profileSize: 'small',
                titleStyle: 'text',
            },
            links: [{ id: 'seed-link', title: 'Website', url: '/', enabled: true, clicks: 0, linkType: 'internal' }],
        }, client as any);

        page = await updateBioPageProfile(page, {
            ...page.profile,
            displayName: 'Service CRUD Pro',
            bio: 'Updated canonical profile',
        }, client as any);
        expect(page.profile).toMatchObject({
            displayName: 'Service CRUD Pro',
            bio: 'Updated canonical profile',
            userModified: true,
        });

        page = await updateBioPageTheme(page, {
            ...page.theme,
            buttonStyle: 'outline',
            buttonColor: '#38bdf8',
        }, client as any);
        expect(page.theme).toMatchObject({ buttonStyle: 'outline', buttonColor: '#38bdf8' });

        page = await createBioPageBlock(page, {
            id: 'faq-block',
            type: 'faq',
            title: 'FAQ',
            data: { items: [] },
        }, client as any);
        expect(page.blocks.find(block => block.title === 'FAQ')).toMatchObject({
            type: 'faq',
            userModified: true,
        });
        const faqBlockId = page.blocks.find(block => block.title === 'FAQ')?.id as string;

        page = await updateBioPageBlock(page, faqBlockId, {
            title: 'Questions',
            data: { items: [{ question: 'Can I book?', answer: 'Yes.' }] },
        }, client as any);
        expect(page.blocks.find(block => block.title === 'Questions')).toMatchObject({
            title: 'Questions',
            userModified: true,
        });
        const updatedFaqBlockId = page.blocks.find(block => block.title === 'Questions')?.id as string;

        page = await toggleBlockVisibility(page, updatedFaqBlockId, false, client as any);
        expect(page.blocks.find(block => block.title === 'Questions')).toMatchObject({
            visible: false,
            status: 'hidden',
        });

        page = await createBioPageLink(page, {
            id: 'offer-link',
            title: 'Offer',
            url: 'offer.example.com',
            linkType: 'external',
        }, client as any);
        expect(page.links.find(link => link.title === 'Offer')).toMatchObject({
            url: 'https://offer.example.com/',
            userModified: true,
        });
        const offerLinkId = page.links.find(link => link.title === 'Offer')?.id as string;

        page = await updateBioPageLink(page, offerLinkId, {
            title: 'Premium offer',
            url: 'https://offer.example.com/pro',
        }, client as any);
        expect(page.links.find(link => link.title === 'Premium offer')).toMatchObject({
            title: 'Premium offer',
            url: 'https://offer.example.com/pro',
            userModified: true,
        });
        const updatedOfferLinkId = page.links.find(link => link.title === 'Premium offer')?.id as string;

        page = await toggleLinkVisibility(page, updatedOfferLinkId, false, client as any);
        expect(page.links.find(link => link.title === 'Premium offer')).toMatchObject({
            enabled: false,
            visible: false,
        });
        const hiddenOfferLinkId = page.links.find(link => link.title === 'Premium offer')?.id as string;

        page = await deleteBioPageLink(page, hiddenOfferLinkId, client as any);
        const finalFaqBlockId = page.blocks.find(block => block.title === 'Questions')?.id as string;
        page = await deleteBioPageBlock(page, finalFaqBlockId, client as any);

        expect(page.links.some(link => link.title === 'Premium offer')).toBe(false);
        expect(page.blocks.some(block => block.title === 'Questions')).toBe(false);
        expect(client.tables.bio_page_links.some(row => row.title === 'Premium offer')).toBe(false);
        expect(client.tables.bio_page_blocks.some(row => row.title === 'Questions')).toBe(false);
    });

    it('duplicates and prioritizes links and blocks through canonical service mutations', async () => {
        const client = createBioPageSupabaseMock();
        let page = await createBioPageDraft({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            userId: 'user-1',
            slug: 'duplicate-priority',
            profile: { name: 'Creator Ops', displayName: 'Creator Ops', bio: 'Creator funnel' },
            links: [
                {
                    id: 'first-link',
                    title: 'First offer',
                    url: 'https://first.example.com',
                    enabled: true,
                    clicks: 12,
                    linkType: 'external',
                    order: 1,
                    needsReview: true,
                    generatedByAI: true,
                    metadata: { source: 'ai-studio' },
                },
                {
                    id: 'second-link',
                    title: 'Second offer',
                    url: 'https://second.example.com',
                    enabled: true,
                    clicks: 4,
                    linkType: 'external',
                    order: 0,
                },
            ],
            blocks: [
                { id: 'profile-block', type: 'profile', title: 'Profile', order: 0, visible: true, status: 'configured', data: {} },
                { id: 'links-block', type: 'link', title: 'Links', order: 1, visible: true, status: 'configured', data: { linkIds: ['first-link', 'second-link'] } },
                {
                    id: 'booking-block',
                    type: 'booking',
                    title: 'Book a call',
                    order: 2,
                    visible: true,
                    status: 'needs_review',
                    sourceModule: 'appointments',
                    data: { durationMinutes: 45, notes: ['strategy'] },
                    settings: { layout: 'cta' },
                    needsReview: true,
                    generatedByAI: true,
                },
                { id: 'faq-block', type: 'faq', title: 'FAQ', order: 3, visible: true, status: 'configured', data: { items: [] } },
            ],
        }, client as any);

        expect(page.links.map(link => link.title)).toEqual(['Second offer', 'First offer']);

        const firstOfferId = page.links.find(link => link.title === 'First offer')?.id as string;
        page = await duplicateBioPageLink(page, firstOfferId, client as any);
        const duplicatedLink = page.links.find(link => link.title === 'First offer copy');
        expect(page.links.map(link => link.title)).toEqual(['Second offer', 'First offer', 'First offer copy']);
        expect(duplicatedLink).toMatchObject({
            clicks: 0,
            needsReview: false,
            generatedByAI: false,
            userModified: true,
            metadata: expect.objectContaining({
                duplicatedFrom: firstOfferId,
                source: 'ai-studio',
            }),
        });
        expect(page.links.map(link => link.order)).toEqual([0, 1, 2]);

        page = await prioritizeBioPageLink(page, duplicatedLink?.id as string, client as any);
        expect(page.links.map(link => link.title)).toEqual(['First offer copy', 'Second offer', 'First offer']);
        expect(page.links.map(link => link.order)).toEqual([0, 1, 2]);

        const bookingBlockId = page.blocks.find(block => block.title === 'Book a call')?.id as string;
        page = await duplicateBioPageBlock(page, bookingBlockId, client as any);
        const duplicatedBlock = page.blocks.find(block => block.title === 'Book a call copy');
        expect(page.blocks.map(block => block.title)).toEqual(['Profile', 'Links', 'Book a call', 'Book a call copy', 'FAQ']);
        expect(duplicatedBlock).toMatchObject({
            type: 'booking',
            needsReview: false,
            generatedByAI: false,
            userModified: true,
            data: { durationMinutes: 45, notes: ['strategy'] },
            settings: { layout: 'cta' },
        });
        expect(page.blocks.map(block => block.order)).toEqual([0, 1, 2, 3, 4]);

        const faqBlockId = page.blocks.find(block => block.title === 'FAQ')?.id as string;
        page = await prioritizeBioPageBlock(page, faqBlockId, client as any);
        expect(page.blocks.map(block => block.title)).toEqual(['Profile', 'Links', 'FAQ', 'Book a call', 'Book a call copy']);
        expect(page.blocks.map(block => block.order)).toEqual([0, 1, 2, 3, 4]);
        expect(page.blocks.find(block => block.title === 'FAQ')).toMatchObject({ userModified: true });

        await expect(duplicateBioPageBlock(page, page.blocks.find(block => block.type === 'profile')?.id as string, client as any))
            .rejects.toThrow('cannot be duplicated');
    });

    it('creates a social links block from visible social editor links', () => {
        const blocks = createDefaultBlocks({
            links: [
                { id: 'website', title: 'Website', url: '/', enabled: true, clicks: 0, linkType: 'external' },
                { id: 'instagram', title: 'Instagram', url: 'https://instagram.com/creator', enabled: true, visible: true, clicks: 0, linkType: 'social', platform: 'instagram' },
                { id: 'hidden-social', title: 'Hidden social', url: 'https://example.com', enabled: false, visible: false, clicks: 0, linkType: 'social', platform: 'twitter' },
            ],
            profile: { name: 'Creator Shop', bio: 'Bio' },
            settings: {},
        });

        expect(blocks.map(block => block.type)).toEqual(['profile', 'link', 'social_links']);
        expect(blocks.find(block => block.type === 'link')?.data).toMatchObject({ linkIds: ['website', 'hidden-social'] });
        expect(blocks.find(block => block.type === 'social_links')?.data).toMatchObject({ linkIds: ['instagram'], layout: 'icons' });
    });

    it('maps AI BioPageBlueprint into a draft-safe runtime payload', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildPlan(), {
            now: '2026-06-25T20:00:00.000Z',
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            createdBy: '00000000-0000-4000-8000-000000000003',
        }).bioPageBlueprint!;

        const draft = createBioPageFromBlueprint({
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            userId: '00000000-0000-4000-8000-000000000003',
            blueprint,
        });

        expect(blueprint.status).toBe('needs_review');
        expect(blueprint.seo.noIndex).toBe(true);
        expect(blueprint.analytics.events).toContain('bio_booking_completed');
        expect(blueprint.links.find(link => link.linkType === 'chatbot')).toMatchObject({
            title: 'Ask AI',
            url: '',
            sourceMap: { chatbot: 'chatbotBlueprint' },
        });
        expect(draft.blocks?.some(block => block.type === 'featured_banner')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'product_grid')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'booking')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'contact')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'social_links')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'featured_media')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'media_grid')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'portfolio_grid')).toBe(true);
        expect(draft.blocks?.some(block => block.type === 'testimonials')).toBe(false);
        expect(draft.blocks?.some(block => block.type === 'faq')).toBe(false);
        expect(draft.blocks?.find(block => block.type === 'featured_banner')).toMatchObject({
            status: 'needs_review',
            generatedByAI: true,
            data: expect.objectContaining({ source: 'bioPageBlueprint.links' }),
        });
        expect(draft.blocks?.find(block => block.type === 'contact')?.data).toMatchObject({
            address: 'San Juan, Puerto Rico',
        });
        expect(draft.blocks?.find(block => block.type === 'featured_media')?.data).toMatchObject({
            url: 'https://cdn.creator.test/hero.jpg',
            mediaType: 'image',
        });
        expect(draft.blocks?.find(block => block.type === 'media_grid')?.data?.items).toEqual(expect.arrayContaining([
            expect.objectContaining({ url: 'https://cdn.creator.test/hero.jpg', title: 'Creator workspace' }),
            expect.objectContaining({ url: 'https://cdn.creator.test/project.jpg', title: 'Digital product preview' }),
        ]));
        expect(draft.blocks?.find(block => block.type === 'portfolio_grid')?.data?.items).toEqual(expect.arrayContaining([
            expect.objectContaining({ url: 'https://cdn.creator.test/hero.jpg', title: 'Creator workspace' }),
            expect.objectContaining({ url: 'https://cdn.creator.test/project.jpg', title: 'Digital product preview' }),
        ]));
        expect(draft.blocks?.find(block => block.type === 'lead_form')?.data).toMatchObject({
            fields: blueprint.leadCapture.fields,
            consentRequired: true,
            consentText: blueprint.leadCapture.consentText,
            successMessage: blueprint.leadCapture.successMessage,
        });
        expect(draft.blocks?.find(block => block.type === 'email_subscribe')?.data).toMatchObject({
            placeholder: blueprint.emailSubscribe.placeholder,
            buttonText: blueprint.emailSubscribe.buttonText,
            consentRequired: true,
            consentText: blueprint.emailSubscribe.consentText,
            successMessage: blueprint.emailSubscribe.successMessage,
        });
        expect(draft.settings?.sourceMap).toMatchObject({
            profile: 'websitePlan.businessProfile',
            bioPageBlueprint: 'businessBlueprint.bioPageBlueprint',
        });
        expect(blueprint.integrations).toMatchObject({
            businessBlueprint: true,
            designSystem: true,
        });
        expect(draft.blocks?.find(block => block.type === 'lead_form')?.sourceMap).toMatchObject({
            source: 'leadBlueprint.leadSources',
        });
        expect(draft.blocks?.find(block => block.type === 'lead_form')?.settings).toMatchObject({
            sourceMap: { source: 'leadBlueprint.leadSources' },
            blueprintStatus: 'needs_review',
        });
        expect(draft.links?.find(link => link.platform === 'instagram')).toMatchObject({
            linkType: 'social',
            url: 'https://instagram.com/creator_shop',
            openInNewTab: true,
            sourceMap: { url: 'websitePlan.businessProfile.contactInfo.instagram' },
            metadata: {
                sourceMap: { url: 'websitePlan.businessProfile.contactInfo.instagram' },
                blueprintStatus: 'needs_review',
            },
        });
        expect(draft.links?.find(link => link.linkType === 'chatbot')).toMatchObject({
            title: 'Ask AI',
            url: '',
            enabled: true,
            visible: true,
            sourceMap: { chatbot: 'chatbotBlueprint' },
            metadata: {
                sourceMap: { chatbot: 'chatbotBlueprint' },
                blueprintStatus: 'needs_review',
            },
        });
        expect(draft.settings?.emailSignupEnabled).toBe(true);
    });

    it('generates Bio Page proof and FAQ blocks only from explicit WebsitePlan content', () => {
        const plan = buildPlan();
        plan.contentMap = {
            ...plan.contentMap,
            testimonials: [
                {
                    quote: 'The guide helped us launch faster with fewer revisions.',
                    author: 'Ana Rivera',
                    role: 'Founder',
                    rating: 5,
                },
                { text: 'Second verified quote', name: 'Luis', rating: '4' },
                { author: 'Missing quote should be ignored' },
            ],
            faqs: [
                {
                    question: 'Can I book a strategy session?',
                    answer: 'Yes. Use the booking block after the draft is reviewed.',
                },
                { q: 'Do you sell digital products?', a: 'Yes. Active Ecommerce products can appear in the shop tab.' },
                { question: 'Missing answer should be ignored' },
            ],
        };
        plan.businessProfile.contactInfo = {
            ...plan.businessProfile.contactInfo,
            email: 'hello@creator.test',
            phone: '+1 787 555 0101',
            whatsapp: '+17875550101',
            website: 'https://creator.test',
        };

        const blueprint = createBusinessBlueprintFromWebsitePlan(plan, {
            now: '2026-06-25T20:00:00.000Z',
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            createdBy: '00000000-0000-4000-8000-000000000003',
        }).bioPageBlueprint!;
        const draft = createBioPageFromBlueprint({
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            userId: '00000000-0000-4000-8000-000000000003',
            blueprint,
        });

        const testimonialsBlock = draft.blocks?.find(block => block.type === 'testimonials');
        expect(testimonialsBlock).toMatchObject({
            title: 'Proof',
            status: 'needs_review',
            sourceMap: { testimonials: 'websitePlan.contentMap.testimonials' },
        });
        expect(testimonialsBlock?.data?.items).toEqual([
            expect.objectContaining({
                quote: 'The guide helped us launch faster with fewer revisions.',
                author: 'Ana Rivera',
                role: 'Founder',
                rating: 5,
            }),
            expect.objectContaining({
                quote: 'Second verified quote',
                author: 'Luis',
                rating: 4,
            }),
        ]);

        const faqBlock = draft.blocks?.find(block => block.type === 'faq');
        expect(faqBlock).toMatchObject({
            title: 'FAQ',
            status: 'needs_review',
            sourceMap: { faqs: 'websitePlan.contentMap.faqs' },
        });
        expect(faqBlock?.data?.items).toEqual([
            expect.objectContaining({
                question: 'Can I book a strategy session?',
                answer: 'Yes. Use the booking block after the draft is reviewed.',
            }),
            expect.objectContaining({
                question: 'Do you sell digital products?',
                answer: 'Yes. Active Ecommerce products can appear in the shop tab.',
            }),
        ]);

        expect(draft.blocks?.find(block => block.type === 'contact')?.data).toMatchObject({
            email: 'hello@creator.test',
            phone: '+1 787 555 0101',
            whatsapp: '+17875550101',
            url: 'https://creator.test',
        });
    });

    it('applies an AI Studio BioPageBlueprint into a canonical draft without publishing', async () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildPlan(), {
            now: '2026-06-25T20:00:00.000Z',
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            createdBy: '00000000-0000-4000-8000-000000000003',
        }).bioPageBlueprint!;
        const client = createBioPageSupabaseMock();

        const page = await applyProjectBioPageBlueprintDraft({
            project: {
                id: '00000000-0000-4000-8000-000000000001',
                tenantId: '00000000-0000-4000-8000-000000000002',
                userId: '00000000-0000-4000-8000-000000000003',
                businessBlueprint: { tenantId: '00000000-0000-4000-8000-000000000002', bioPageBlueprint: blueprint } as BusinessBlueprint,
            },
        }, client as any);

        expect(page).toMatchObject({
            projectId: '00000000-0000-4000-8000-000000000001',
            status: 'draft',
            isPublished: false,
            slug: blueprint.publicSlug,
        });
        expect(client.tables.bio_pages[0]).toMatchObject({
            project_id: '00000000-0000-4000-8000-000000000001',
            user_id: '00000000-0000-4000-8000-000000000003',
            status: 'draft',
        });
        expect(client.tables.bio_page_blocks.some(row => row.type === 'product_grid')).toBe(true);
        expect(client.tables.bio_page_blocks.some(row => row.type === 'booking')).toBe(true);
        expect(client.tables.bio_page_links.length).toBeGreaterThan(0);
        expect(client.tables.bio_pages[0].settings.sourceMap).toMatchObject({
            bioPageBlueprint: 'businessBlueprint.bioPageBlueprint',
        });
        expect(client.tables.bio_page_blocks.find(row => row.type === 'lead_form')?.settings).toMatchObject({
            sourceMap: { source: 'leadBlueprint.leadSources' },
            blueprintStatus: 'needs_review',
        });
        expect(client.tables.bio_page_links.find(row => row.platform === 'instagram')?.metadata).toMatchObject({
            sourceMap: { url: 'websitePlan.businessProfile.contactInfo.instagram' },
            blueprintStatus: 'needs_review',
        });
    });

    it('skips disabled or missing BioPageBlueprints during AI Studio handoff', async () => {
        const client = createBioPageSupabaseMock();

        await expect(applyProjectBioPageBlueprintDraft({
            project: {
                id: 'project-1',
                userId: 'user-1',
                businessBlueprint: {
                    bioPageBlueprint: { enabled: false },
                } as BusinessBlueprint,
            },
        }, client as any)).resolves.toBeNull();

        expect(client.tables.bio_pages).toEqual([]);
    });

    it('preserves user-modified and locked Bio Page rows during AI Studio reapply', async () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(buildPlan(), {
            now: '2026-06-25T20:00:00.000Z',
            projectId: '00000000-0000-4000-8000-000000000001',
            tenantId: '00000000-0000-4000-8000-000000000002',
            createdBy: '00000000-0000-4000-8000-000000000003',
        }).bioPageBlueprint!;
        const client = createBioPageSupabaseMock();

        client.tables.bio_pages.push({
            id: 'bio-existing',
            project_id: '00000000-0000-4000-8000-000000000001',
            tenant_id: '00000000-0000-4000-8000-000000000002',
            user_id: '00000000-0000-4000-8000-000000000003',
            slug: 'merchant-bio',
            title: 'Merchant Bio',
            description: 'Merchant edited page',
            profile: { displayName: 'Merchant Bio', handle: 'merchant-bio', bio: 'Merchant copy' },
            theme: {},
            seo: {},
            settings: {},
            status: 'draft',
            updated_at: '2026-06-25T20:00:00.000Z',
        });
        client.tables.bio_page_blocks.push({
            id: 'merchant-banner',
            bio_page_id: 'bio-existing',
            project_id: '00000000-0000-4000-8000-000000000001',
            tenant_id: '00000000-0000-4000-8000-000000000002',
            type: 'featured_banner',
            title: 'Merchant banner',
            description: 'Keep this banner',
            order_index: 0,
            visible: true,
            data: { headline: 'Do not overwrite' },
            settings: {},
            source_module: 'manual',
            generated_by_ai: false,
            needs_review: false,
            user_modified: true,
            locked_from_regeneration: false,
        });
        client.tables.bio_page_links.push({
            id: 'merchant-link',
            bio_page_id: 'bio-existing',
            project_id: '00000000-0000-4000-8000-000000000001',
            tenant_id: '00000000-0000-4000-8000-000000000002',
            title: 'Merchant link',
            url: 'https://merchant.example.com/',
            description: 'Keep this link',
            link_type: 'external',
            order_index: 0,
            visible: true,
            click_tracking_enabled: true,
            metadata: { userModified: true, lockedFromRegeneration: true },
        });

        const page = await applyProjectBioPageBlueprintDraft({
            project: {
                id: '00000000-0000-4000-8000-000000000001',
                tenantId: '00000000-0000-4000-8000-000000000002',
                userId: '00000000-0000-4000-8000-000000000003',
                businessBlueprint: { tenantId: '00000000-0000-4000-8000-000000000002', bioPageBlueprint: blueprint } as BusinessBlueprint,
            },
        }, client as any);

        expect(page?.status).toBe('draft');
        expect(page?.blocks.find(block => block.title === 'Merchant banner')).toMatchObject({
            type: 'featured_banner',
            userModified: true,
            data: { headline: 'Do not overwrite' },
        });
        expect(page?.links.find(link => link.title === 'Merchant link')).toMatchObject({
            url: 'https://merchant.example.com/',
            userModified: true,
            lockedFromRegeneration: true,
        });
        expect(page?.blocks.some(block => block.type === 'product_grid')).toBe(true);
        expect(page?.blocks.some(block => block.type === 'booking')).toBe(true);
    });

    it('keeps Bio Page product grids tied to real active storefront products', () => {
        expect(getBioPageEligibleStorefrontProducts({
            source: 'blueprint',
            products: [storefrontProduct({ id: 'ai-draft', status: 'draft' })],
        })).toEqual([]);

        const products = getBioPageEligibleStorefrontProducts({
            source: 'store-products',
            products: [
                storefrontProduct({ id: 'active', status: 'active' }),
                storefrontProduct({ id: 'published', status: 'published' }),
                storefrontProduct({ id: 'draft', status: 'draft' }),
                storefrontProduct({ id: 'archived', status: 'archived' }),
            ],
        });

        expect(products.map(product => product.id)).toEqual(['active', 'published']);
    });

    it('maps and filters Bio Page product collections by real Ecommerce categories', () => {
        const products = [
            mapStorefrontProductToBioPageProduct(storefrontProduct({
                id: 'guide-1',
                name: 'Creator Guide',
                categoryId: 'cat-guides',
                categoryName: 'Guides',
                categorySlug: 'guides',
                status: 'active',
            }), 'project-1'),
            mapStorefrontProductToBioPageProduct(storefrontProduct({
                id: 'session-1',
                name: 'Strategy Session',
                categoryId: 'cat-services',
                categoryName: 'Services',
                categorySlug: 'services',
                status: 'active',
            }), 'project-1'),
        ];

        expect(products[0]).toMatchObject({
            categoryId: 'cat-guides',
            categoryName: 'Guides',
            categorySlug: 'guides',
        });
        expect(filterBioPageProductsForBlock(products, {
            type: 'product_collection',
            data: { collectionIds: ['guides'] },
        } as any).map(product => product.id)).toEqual(['guide-1']);
        expect(filterBioPageProductsForBlock(products, {
            type: 'product_collection',
            data: { collectionIds: ['cat-services'] },
        } as any).map(product => product.id)).toEqual(['session-1']);
        expect(filterBioPageProductsForBlock(products, {
            type: 'product_grid',
            data: { productIds: ['session-1'] },
        } as any).map(product => product.id)).toEqual(['session-1']);
        expect(filterBioPageProductsForQuery(products, '')).toEqual(products);
        expect(filterBioPageProductsForQuery(products, 'creator guide').map(product => product.id)).toEqual(['guide-1']);
        expect(filterBioPageProductsForQuery(products, 'services').map(product => product.id)).toEqual(['session-1']);
        expect(filterBioPageProductsForQuery(products, 'missing')).toEqual([]);
    });

    it('returns only published Bio Pages with visible public children', async () => {
        const client = createBioPageSupabaseMock();
        client.tables.bio_pages.push(
            {
                id: 'bio-published',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                slug: 'creator-shop',
                title: 'Creator Shop',
                description: 'Published public Bio Page',
                profile: { displayName: 'Creator Shop', handle: 'creator-shop', bio: 'Public bio' },
                theme: {},
                seo: {},
                settings: {},
                status: 'published',
                updated_at: '2026-06-25T20:00:00.000Z',
            },
            {
                id: 'bio-draft',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                user_id: 'user-1',
                slug: 'draft-shop',
                title: 'Draft Shop',
                description: 'Private draft Bio Page',
                profile: { displayName: 'Draft Shop', handle: 'draft-shop', bio: 'Draft bio' },
                theme: {},
                seo: {},
                settings: {},
                status: 'draft',
                updated_at: '2026-06-25T20:00:00.000Z',
            },
        );
        client.tables.bio_page_links.push(
            {
                id: 'visible-link',
                bio_page_id: 'bio-published',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                title: 'Visible link',
                url: 'https://example.com/',
                link_type: 'external',
                order_index: 0,
                visible: true,
                click_tracking_enabled: true,
                metadata: {},
            },
            {
                id: 'hidden-link',
                bio_page_id: 'bio-published',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                title: 'Hidden link',
                url: 'https://hidden.example.com/',
                link_type: 'external',
                order_index: 1,
                visible: false,
                click_tracking_enabled: true,
                metadata: {},
            },
        );
        client.tables.bio_page_blocks.push(
            {
                id: 'visible-block',
                bio_page_id: 'bio-published',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                type: 'featured_banner',
                title: 'Visible banner',
                order_index: 0,
                visible: true,
                data: {},
                settings: {},
                needs_review: false,
            },
            {
                id: 'hidden-block',
                bio_page_id: 'bio-published',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                type: 'faq',
                title: 'Hidden FAQ',
                order_index: 1,
                visible: false,
                data: {},
                settings: {},
                needs_review: false,
            },
        );

        const page = await getPublicBioPageBySlug('creator-shop', client as any);

        expect(page).toMatchObject({
            id: 'bio-published',
            status: 'published',
            isPublished: true,
        });
        expect(page?.links.map(link => link.id)).toEqual(['visible-link']);
        expect(page?.blocks.map(block => block.id)).toEqual(['visible-block']);
        await expect(getPublicBioPageBySlug('draft-shop', client as any)).resolves.toBeNull();
    });

    it('serves a complete published public demo Bio Page when the demo slug has no DB record', async () => {
        const client = createBioPageSupabaseMock();
        const page = await getPublicBioPageBySlug('demo', client as any);
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i;

        expect(page).toMatchObject({
            slug: 'demo',
            status: 'published',
            isPublished: true,
            emailSignupEnabled: true,
            settings: expect.objectContaining({
                shopEnabled: true,
                bookingEnabled: true,
                leadCaptureEnabled: true,
                emailSignupEnabled: true,
                chatbotEnabled: true,
                analyticsEnabled: false,
            }),
        });
        expect(page?.id).toMatch(uuidRe);
        expect(page?.projectId).toMatch(uuidRe);
        expect(page?.links.every(link => uuidRe.test(link.id))).toBe(true);
        expect(page?.blocks.every(block => uuidRe.test(block.id))).toBe(true);
        expect(page?.blocks.map(block => block.type)).toEqual(expect.arrayContaining([
            'profile',
            'social_links',
            'link',
            'featured_banner',
            'product_grid',
            'media_grid',
            'portfolio_grid',
            'booking',
            'email_subscribe',
            'lead_form',
            'contact',
            'chatbot_cta',
        ]));
        expect(page?.links.map(link => link.linkType)).toEqual(expect.arrayContaining([
            'internal',
            'product',
            'booking',
            'chatbot',
            'social',
        ]));
        expect(page?.products).toHaveLength(2);
        expect(page?.seo).toMatchObject({ noIndex: true, canonicalUrl: '/bio/demo' });
    });

    it('does not persist analytics for the fallback demo Bio Page', async () => {
        const client = createBioPageSupabaseMock();
        const page = await getPublicBioPageBySlug('demo', client as any);
        const storageState: Record<string, string> = {};
        const storage = {
            getItem: (key: string) => storageState[key] || null,
            setItem: (key: string, value: string) => {
                storageState[key] = value;
            },
        };

        await recordBioPageView(page!, client as any, storage as any);
        await trackBioPageShare(page!, client as any);

        expect(client.tables.bio_page_events).toHaveLength(0);
    });

    it('uses a real published demo slug over the public demo fallback', async () => {
        const client = createBioPageSupabaseMock();
        client.tables.bio_pages.push({
            id: 'bio-real-demo',
            project_id: 'project-real',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            slug: 'demo',
            title: 'Real Published Demo',
            description: 'Real tenant-owned page',
            profile: { displayName: 'Real Demo', handle: 'demo', bio: 'Database page wins' },
            theme: {},
            seo: {},
            settings: {},
            status: 'published',
            published_at: '2026-06-26T01:00:00.000Z',
            updated_at: '2026-06-26T01:00:00.000Z',
        });
        client.tables.bio_page_links.push({
            id: 'real-demo-link',
            bio_page_id: 'bio-real-demo',
            project_id: 'project-real',
            tenant_id: 'tenant-1',
            title: 'Real link',
            url: 'https://real-demo.example.com/',
            link_type: 'external',
            order_index: 0,
            visible: true,
            click_tracking_enabled: true,
            metadata: {},
        });

        const page = await getPublicBioPageBySlug('demo', client as any);

        expect(page).toMatchObject({
            id: 'bio-real-demo',
            projectId: 'project-real',
            title: 'Real Published Demo',
        });
        expect(page?.links.map(link => link.id)).toEqual(['real-demo-link']);
    });

    it('publishes and unpublishes Bio Pages with public URL gating', async () => {
        const client = createBioPageSupabaseMock();
        client.tables.bio_pages.push({
            id: 'bio-toggle',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            slug: 'creator-shop',
            title: 'Creator Shop',
            description: 'Creator mini funnel',
            profile: { displayName: 'Creator Shop', handle: 'creator-shop', bio: 'Public when published' },
            theme: {},
            seo: {},
            settings: {},
            status: 'draft',
            published_at: null,
            updated_at: '2026-06-25T20:00:00.000Z',
        });
        client.tables.bio_page_links.push({
            id: 'shop-link',
            bio_page_id: 'bio-toggle',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            title: 'Shop',
            url: 'https://shop.creator.test/shop',
            link_type: 'external',
            order_index: 0,
            visible: true,
            click_tracking_enabled: true,
            metadata: {},
        });
        client.tables.bio_page_blocks.push({
            id: 'profile-block',
            bio_page_id: 'bio-toggle',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            type: 'profile',
            title: 'Profile',
            order_index: 0,
            visible: true,
            data: {},
            settings: {},
            needs_review: false,
        });

        await expect(getPublicBioPageBySlug('creator-shop', client as any)).resolves.toBeNull();

        const published = await publishBioPage('bio-toggle', client as any);

        expect(published).toMatchObject({
            id: 'bio-toggle',
            status: 'published',
            isPublished: true,
        });
        expect(published.publishedAt).toEqual(expect.any(String));
        await expect(getPublicBioPageBySlug('creator-shop', client as any)).resolves.toMatchObject({
            id: 'bio-toggle',
            status: 'published',
        });

        await unpublishBioPage('bio-toggle', client as any);

        expect(client.tables.bio_pages[0]).toMatchObject({
            status: 'draft',
            published_at: null,
        });
        await expect(getPublicBioPageBySlug('creator-shop', client as any)).resolves.toBeNull();
    });

    it('blocks public publishing until generated Bio Page links and blocks are reviewed', async () => {
        const client = createBioPageSupabaseMock();
        client.tables.bio_pages.push({
            id: 'bio-review-gate',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            user_id: 'user-1',
            slug: 'creator-review',
            title: 'Creator Review',
            description: 'Generated mini funnel',
            profile: { displayName: 'Creator Review', handle: 'creator-review', bio: 'Review before publishing' },
            theme: {},
            seo: {},
            settings: {},
            status: 'draft',
        });
        client.tables.bio_page_links.push({
            id: 'generated-shop-link',
            bio_page_id: 'bio-review-gate',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            title: 'Shop',
            url: '/store/:projectId',
            link_type: 'collection',
            order_index: 0,
            visible: true,
            click_tracking_enabled: true,
            metadata: { needsReview: true, generatedByAI: true },
        });
        client.tables.bio_page_blocks.push({
            id: 'generated-booking-block',
            bio_page_id: 'bio-review-gate',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            type: 'booking',
            title: 'Book an appointment',
            order_index: 0,
            visible: true,
            data: {},
            settings: {},
            needs_review: true,
            generated_by_ai: true,
        });
        client.tables.bio_page_blocks.push({
            id: 'empty-media-block',
            bio_page_id: 'bio-review-gate',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            type: 'featured_media',
            title: 'Featured media',
            order_index: 1,
            visible: true,
            data: {},
            settings: {},
            needs_review: false,
            generated_by_ai: true,
        });

        const draft = await getPublicBioPageBySlug('creator-review', client as any);
        expect(draft).toBeNull();
        const loaded = await getBioPageById('bio-review-gate', client as any);
        expect(getBioPagePublishIssues(loaded as any)).toEqual(expect.arrayContaining([
            'Link "Shop" still needs review.',
            'Link "Shop" still uses a placeholder URL.',
            'Block "Book an appointment" still needs review.',
            'Block "Featured media" needs a safe media URL.',
        ]));
        await expect(publishBioPage('bio-review-gate', client as any)).rejects.toThrow('not ready to publish');

        client.tables.bio_page_links[0].url = '/store/project-1';
        client.tables.bio_page_links[0].metadata.needsReview = false;
        client.tables.bio_page_blocks[0].needs_review = false;
        client.tables.bio_page_blocks[1].data = { url: 'https://cdn.creator.test/hero.jpg', mediaType: 'image' };

        await expect(publishBioPage('bio-review-gate', client as any)).resolves.toMatchObject({
            status: 'published',
        });
    });

    it('blocks publishing when Bio Page funnel forms are incomplete or unsafe', () => {
        const page = {
            id: 'bio-form-gate',
            projectId: 'project-1',
            slug: 'creator-form-gate',
            profile: { displayName: 'Creator Form Gate', bio: 'Bio' },
            links: [],
            blocks: [
                {
                    id: 'lead-bad',
                    type: 'lead_form',
                    title: 'Lead capture',
                    visible: true,
                    status: 'configured',
                    data: {
                        fields: [{ id: 'name', label: '', type: 'text', required: true }],
                        consentRequired: true,
                        consentText: '',
                        successMessage: '',
                    },
                },
                {
                    id: 'email-bad',
                    type: 'email_subscribe',
                    title: 'Newsletter',
                    visible: true,
                    status: 'configured',
                    data: {
                        placeholder: '',
                        buttonText: '',
                        consentRequired: false,
                        consentText: '',
                        successMessage: '',
                    },
                },
                {
                    id: 'booking-bad',
                    type: 'booking',
                    title: 'Book',
                    visible: true,
                    status: 'configured',
                    data: { url: 'javascript:alert(1)' },
                },
            ],
        } as any;

        expect(getBioPagePublishIssues(page)).toEqual(expect.arrayContaining([
            'Block "Lead capture" needs an email field.',
            'Block "Lead capture" has a field without a label.',
            'Block "Lead capture" needs consent copy.',
            'Block "Lead capture" needs a success message.',
            'Block "Newsletter" needs an email placeholder.',
            'Block "Newsletter" needs subscribe button text.',
            'Block "Newsletter" must require marketing consent.',
            'Block "Newsletter" needs marketing consent copy.',
            'Block "Newsletter" needs a success message.',
            'Block "Book" has an unsafe booking URL.',
        ]));
    });

    it('blocks publishing when Bio Page media blocks use non-embeddable URLs', () => {
        const page = {
            id: 'bio-media-gate',
            projectId: 'project-1',
            slug: 'creator-media-gate',
            profile: { displayName: 'Creator Media Gate', bio: 'Bio' },
            links: [],
            blocks: [
                {
                    id: 'media-mailto',
                    type: 'featured_media',
                    title: 'Featured media',
                    visible: true,
                    status: 'configured',
                    data: { url: 'mailto:hello@example.com', mediaType: 'image' },
                },
                {
                    id: 'media-grid-sms',
                    type: 'media_grid',
                    title: 'Media grid',
                    visible: true,
                    status: 'configured',
                    data: { items: [{ url: 'sms:+15555555555', type: 'image' }] },
                },
                {
                    id: 'portfolio-tel',
                    type: 'portfolio_grid',
                    title: 'Portfolio',
                    visible: true,
                    status: 'configured',
                    data: { items: [{ url: 'tel:+15555555555', type: 'image' }] },
                },
            ],
        } as any;

        expect(getBioPagePublishIssues(page)).toEqual(expect.arrayContaining([
            'Block "Featured media" needs a safe media URL.',
            'Block "Media grid" needs at least one safe media item.',
            'Block "Portfolio" needs at least one safe portfolio item.',
        ]));
    });

    it('builds a safe ChatCore context from visible Bio Page content', () => {
        const context = buildBioPageChatContext({
            id: 'bio-1',
            projectId: 'project-1',
            userId: 'user-1',
            username: 'creator-shop',
            slug: 'creator-shop',
            title: 'Creator Shop Bio',
            description: 'Public mini funnel',
            profile: {
                name: 'Creator Shop',
                displayName: 'Creator Shop',
                handle: 'creator-shop',
                bio: 'Digital guides and consulting.',
                category: 'Creator',
                location: 'San Juan',
            },
            theme: {} as any,
            links: [
                { id: 'link-visible', title: 'Website', url: 'https://example.com', enabled: true, visible: true, clicks: 0, linkType: 'external' },
                { id: 'link-hidden', title: 'Hidden', url: 'https://hidden.example.com', enabled: true, visible: false, clicks: 0, linkType: 'external' },
            ],
            blocks: [
                {
                    id: 'block-social',
                    type: 'social_links',
                    title: 'Social icons',
                    order: 0,
                    visible: true,
                    status: 'configured',
                    data: { linkIds: ['link-visible', 'link-hidden'], layout: 'icons' },
                },
                {
                    id: 'block-email',
                    type: 'email_subscribe',
                    title: 'Subscribe',
                    order: 1,
                    visible: true,
                    status: 'configured',
                    data: {
                        audienceId: 'audience-private',
                        placeholder: 'Email',
                        buttonText: 'Join',
                    },
                },
                {
                    id: 'block-booking',
                    type: 'booking',
                    title: 'Book a consultation',
                    order: 2,
                    visible: true,
                    status: 'configured',
                    data: { bookingMode: 'inline', durationMinutes: 45 },
                },
                {
                    id: 'block-testimonials',
                    type: 'testimonials',
                    title: 'Verified clients',
                    order: 3,
                    visible: true,
                    status: 'configured',
                    data: {
                        items: [
                            {
                                quote: 'The guide helped us launch faster.',
                                author: 'Ana Rivera',
                                role: 'Founder',
                                rating: 5,
                                privateEmail: 'ana@example.com',
                            },
                            { quote: '', author: 'Empty quote' },
                        ],
                    },
                },
                {
                    id: 'block-hidden',
                    type: 'faq',
                    title: 'Hidden FAQ',
                    order: 4,
                    visible: false,
                    status: 'hidden',
                    data: { items: [{ question: 'Hidden?', answer: 'Yes' }] },
                },
            ],
            products: [{ id: 'product-1', name: 'Digital Guide', price: 29, imageUrl: '', url: '/store/product/digital-guide', status: 'active' }],
            emailSignupEnabled: true,
            isPublished: true,
            status: 'published',
            settings: { shopEnabled: true, bookingEnabled: true, leadCaptureEnabled: false, chatbotEnabled: true },
            aiAssistant: { isActive: true } as any,
        });

        expect(context).toMatchObject({
            section: 'bioPage',
            visibleSections: ['bioPage'],
            pageData: {
                bioPage: {
                    sourceModule: 'bio-page-engine',
                    pageId: 'bio-1',
                    projectId: 'project-1',
                    slug: 'creator-shop',
                    activeBlockId: null,
                    profile: {
                        displayName: 'Creator Shop',
                        handle: 'creator-shop',
                    },
                    integrations: {
                        shopEnabled: true,
                        bookingEnabled: true,
                        emailSignupEnabled: true,
                        chatbotEnabled: true,
                    },
                    links: [{ id: 'link-visible', title: 'Website' }],
                    products: [{ id: 'product-1', name: 'Digital Guide', price: 29 }],
                },
            },
        });
        expect(context.pageData.bioPage.blocks.map(block => block.id)).toEqual(['block-social', 'block-email', 'block-booking', 'block-testimonials']);
        expect(context.pageData.bioPage.blocks.find(block => block.id === 'block-social')?.data).toMatchObject({
            linkIds: ['link-visible'],
            layout: 'icons',
        });
        expect(context.pageData.bioPage.blocks.find(block => block.id === 'block-email')?.data).toMatchObject({
            placeholder: 'Email',
            buttonText: 'Join',
            consentRequired: true,
        });
        expect(context.pageData.bioPage.blocks.find(block => block.id === 'block-testimonials')?.data).toMatchObject({
            items: [{ quote: 'The guide helped us launch faster.', author: 'Ana Rivera', role: 'Founder', rating: 5 }],
        });
        expect(JSON.stringify(context)).not.toContain('audience-private');
        expect(JSON.stringify(context)).not.toContain('link-hidden');
        expect(JSON.stringify(context)).not.toContain('block-hidden');
        expect(JSON.stringify(context)).not.toContain('privateEmail');
    });

    it('stores public lead metadata with Bio Page source and block attribution', async () => {
        const inserts: Array<{ table: string; row: any }> = [];
        const client = {
            from(table: string) {
                return {
                    insert(row: any) {
                        inserts.push({ table, row });
                        return { error: null };
                    },
                };
            },
        };

        const leadId = await submitBioPageLead({
            page: {
                id: 'bio-1',
                projectId: 'project-1',
                tenantId: 'tenant-1',
                slug: 'creator-shop',
            } as any,
            blockId: 'block-lead',
            lead: {
                name: 'Ana',
                email: 'ana@example.com',
                message: 'I need help',
                metadata: { canonicalEmail: { sourceModule: 'bio-page-engine' } },
            },
        }, client as any);

        expect(leadId).toMatch(/^[0-9a-f-]{36}$/);
        expect(inserts[0]).toMatchObject({
            table: 'leads',
            row: {
                id: leadId,
                source: 'bio_page',
                custom_data: {
                    bioPageId: 'bio-1',
                    bioSlug: 'creator-shop',
                    blockId: 'block-lead',
                    sourceModule: 'bio-page-engine',
                    bioPageDedupeKey: 'email:ana@example.com',
                    canonicalEmail: { sourceModule: 'bio-page-engine' },
                },
            },
        });
        expect(inserts[1]).toMatchObject({
            table: 'bio_page_events',
            row: {
                event_type: 'bio_lead_submitted',
                block_id: null,
                source: 'bio_page',
                metadata: {
                    bioPageId: 'bio-1',
                    bioSlug: 'creator-shop',
                    blockId: 'block-lead',
                    source: 'bio_page',
                    sourceModule: 'bio-page-engine',
                    crmWrite: 'created',
                },
            },
        });
        expect(JSON.stringify(inserts[1].row.metadata)).not.toContain('ana@example.com');
        expect(inserts[1].row.metadata).not.toHaveProperty('bioPageDedupeKey');
        expect(inserts[1].row.metadata).not.toHaveProperty('canonicalEmail');
        expect(inserts[1].row.metadata).not.toHaveProperty('leadId');
    });

    it('allows public lead capture for project-scoped Bio Pages without a tenant', async () => {
        const inserts: Array<{ table: string; row: any }> = [];
        const client = {
            from(table: string) {
                return {
                    insert(row: any) {
                        inserts.push({ table, row });
                        return { error: null };
                    },
                };
            },
        };

        const leadId = await submitBioPageLead({
            page: {
                id: 'bio-1',
                projectId: 'project-1',
                tenantId: null,
                slug: 'creator-shop',
            } as any,
            blockId: 'block-lead',
            lead: {
                name: 'Ana',
                email: 'ana@example.com',
            },
        }, client as any);

        expect(leadId).toMatch(/^[0-9a-f-]{36}$/);
        expect(inserts[0]).toMatchObject({
            table: 'leads',
            row: {
                id: leadId,
                tenant_id: null,
                project_id: 'project-1',
                source: 'bio_page',
            },
        });
        expect(inserts[1]).toMatchObject({
            table: 'bio_page_events',
            row: {
                tenant_id: null,
                project_id: 'project-1',
                event_type: 'bio_lead_submitted',
                source: 'bio_page',
                metadata: {
                    bioPageId: 'bio-1',
                    bioSlug: 'creator-shop',
                    blockId: 'block-lead',
                    sourceModule: 'bio-page-engine',
                    crmWrite: 'created',
                },
            },
        });
    });

    it('treats repeated Bio Page lead submissions as idempotent CRM duplicates', async () => {
        const inserts: Array<{ table: string; row: any }> = [];
        const client = {
            from(table: string) {
                return {
                    insert(row: any) {
                        inserts.push({ table, row });
                        if (table === 'leads') {
                            return {
                                error: {
                                    code: '23505',
                                    message: 'duplicate key value violates unique constraint "leads_bio_page_project_email_source_unique_idx"',
                                },
                            };
                        }
                        return { error: null };
                    },
                };
            },
        };

        const leadId = await submitBioPageLead({
            page: {
                id: 'bio-1',
                projectId: 'project-1',
                tenantId: 'tenant-1',
                slug: 'creator-shop',
            } as any,
            blockId: 'block-lead',
            lead: {
                name: 'Ana',
                email: 'ANA@EXAMPLE.COM',
                message: 'I need help again',
            },
        }, client as any);

        expect(leadId).toBeNull();
        expect(inserts[0]).toMatchObject({
            table: 'leads',
            row: {
                email: 'ana@example.com',
                source: 'bio_page',
            },
        });
        expect(inserts[1]).toMatchObject({
            table: 'bio_page_events',
            row: {
                event_type: 'bio_lead_submitted',
                block_id: null,
                source: 'bio_page',
                metadata: {
                    bioPageId: 'bio-1',
                    bioSlug: 'creator-shop',
                    blockId: 'block-lead',
                    source: 'bio_page',
                    sourceModule: 'bio-page-engine',
                    crmWrite: 'duplicate',
                    duplicate: true,
                },
            },
        });
        expect(JSON.stringify(inserts[1].row.metadata)).not.toContain('ana@example.com');
        expect(inserts[1].row.metadata).not.toHaveProperty('email');
        expect(inserts[1].row.metadata).not.toHaveProperty('bioPageDedupeKey');
        expect(inserts[1].row.metadata).not.toHaveProperty('canonicalEmail');
    });

    it('routes public email subscribers through the Email API when available', async () => {
        const invocations: Array<{ name: string; body: any }> = [];
        const client = {
            functions: {
                invoke: async (name: string, options: { body: any }) => {
                    invocations.push({ name, body: options.body });
                    return { data: { success: true, audienceSync: 'synced' }, error: null };
                },
            },
            from() {
                throw new Error('direct table writes should not run when email-api succeeds');
            },
        };

        const result = await subscribeBioPageEmail({
            page: {
                id: 'bio-1',
                projectId: 'project-1',
                slug: 'creator-shop',
                settings: {},
            } as any,
            email: 'ANA@EXAMPLE.COM',
            consent: true,
            audienceId: 'audience-1',
            blockId: 'block-email',
        }, client as any);

        expect(result).toEqual({ ok: true, duplicate: false });
        expect(invocations).toHaveLength(1);
        expect(invocations[0]).toMatchObject({
            name: 'email-api',
            body: {
                action: 'subscribeBioPageEmail',
                bioPageId: 'bio-1',
                slug: 'creator-shop',
                projectId: 'project-1',
                email: 'ana@example.com',
                audienceId: 'audience-1',
                blockId: 'block-email',
            },
        });
    });

    it('falls back to subscriber/event inserts when the Email API is unavailable', async () => {
        const inserts: Array<{ table: string; row: any }> = [];
        const client = {
            functions: {
                invoke: async () => ({ data: null, error: { message: 'function unavailable' } }),
            },
            from(table: string) {
                return {
                    insert(row: any) {
                        inserts.push({ table, row });
                        return { error: null };
                    },
                };
            },
        };

        const result = await subscribeBioPageEmail({
            page: {
                id: 'bio-1',
                projectId: 'project-1',
                tenantId: 'tenant-1',
                slug: 'creator-shop',
                settings: {},
            } as any,
            email: 'ana@example.com',
            consent: true,
            audienceId: 'audience-1',
            blockId: 'block-email',
            metadata: {
                sourceComponent: 'BioPageEmailSubscribeBlock',
                sourceEvent: 'bio_page_email_subscribe',
                consentRequired: true,
                email: 'leak@example.com',
                recipientEmail: 'leak@example.com',
                canonicalEmail: { recipientEmail: 'leak@example.com' },
                subscriberId: 'subscriber-private',
                audienceError: 'blocked for leak@example.com',
            },
        }, client as any);

        expect(result).toEqual({ ok: true });
        expect(inserts[0]).toMatchObject({
            table: 'bio_page_subscribers',
            row: {
                email: 'ana@example.com',
                audience_id: 'audience-1',
                metadata: {
                    bioPageId: 'bio-1',
                    blockId: 'block-email',
                    sourceModule: 'bio-page-engine',
                },
            },
        });
        expect(inserts[1]).toMatchObject({
            table: 'bio_page_events',
            row: {
                event_type: 'bio_email_subscribed',
                block_id: null,
                metadata: {
                    audienceId: 'audience-1',
                    audienceSync: 'deferred',
                    sourceComponent: 'BioPageEmailSubscribeBlock',
                    sourceEvent: 'bio_page_email_subscribe',
                    consentRequired: true,
                    blockId: 'block-email',
                },
            },
        });
        expect(JSON.stringify(inserts[1].row.metadata)).not.toContain('leak@example.com');
        expect(inserts[1].row.metadata).not.toHaveProperty('email');
        expect(inserts[1].row.metadata).not.toHaveProperty('recipientEmail');
        expect(inserts[1].row.metadata).not.toHaveProperty('canonicalEmail');
        expect(inserts[1].row.metadata).not.toHaveProperty('subscriberId');
        expect(inserts[1].row.metadata).not.toHaveProperty('audienceError');
    });

    it('summarizes Bio Page analytics by source, block, and link', async () => {
        const events = [
            { id: 'event-view-1', event_type: 'bio_page_viewed', source: null, block_id: null, link_id: null, referrer: null, utm: {}, user_agent: 'Mozilla/5.0 (iPhone)', metadata: { visitorId: 'visitor-1' } },
            { id: 'event-view-2', event_type: 'bio_page_viewed', source: null, block_id: null, link_id: null, referrer: null, utm: {}, user_agent: 'Mozilla/5.0 (iPhone)', metadata: { visitorId: 'visitor-1' } },
            { id: 'event-view-3', event_type: 'bio_page_viewed', source: null, block_id: null, link_id: null, referrer: null, utm: {}, user_agent: 'Mozilla/5.0 (iPad)', metadata: { visitorId: 'visitor-2' } },
            { event_type: 'bio_link_clicked', source: 'instagram', block_id: null, link_id: null, referrer: 'https://instagram.com/reel/1', utm: { utm_source: 'instagram', utm_campaign: 'launch' }, user_agent: 'Mozilla/5.0 (Macintosh)', metadata: { blockId: 'block-links', linkId: 'link-1' } },
            { event_type: 'bio_link_clicked', source: null, block_id: null, link_id: null, referrer: 'https://youtube.com/watch/1', utm: { utm_source: 'youtube', utm_campaign: 'launch' }, user_agent: 'Mozilla/5.0 (Macintosh)', metadata: { blockId: 'block-links', linkId: 'link-1' } },
            { event_type: 'bio_email_subscribed', source: 'email_subscribe', block_id: 'block-email', link_id: null, referrer: 'https://mail.example.com/newsletter', utm: { utm_source: 'email', utm_campaign: 'newsletter' }, user_agent: 'Mozilla/5.0 (Android)', metadata: {} },
        ];
        const query = {
            select: () => query,
            eq: () => query,
            order: () => query,
            gte: () => query,
            lte: () => query,
            then: (resolve: any) => Promise.resolve({ data: events, error: null }).then(resolve),
        };
        const client = { from: () => query };

        const analytics = await getBioPageAnalytics({
            page: {
                id: 'bio-1',
                links: [{ id: 'link-1', title: 'Instagram', clicks: 0 }],
            } as any,
        }, client as any);

        expect(analytics).toMatchObject({
            views: 3,
            uniqueViews: 2,
            returningViews: 1,
            clicks: 2,
            subscribers: 1,
            conversions: 1,
            conversionRate: 33.3,
            sourceBreakdown: {
                direct: 3,
                instagram: 1,
                youtube: 1,
                email_subscribe: 1,
            },
            utmSourceBreakdown: {
                instagram: 1,
                youtube: 1,
                email: 1,
            },
            utmCampaignBreakdown: {
                launch: 2,
                newsletter: 1,
            },
            referrerBreakdown: {
                direct: 3,
                'instagram.com': 1,
                'youtube.com': 1,
                'mail.example.com': 1,
            },
            deviceBreakdown: {
                mobile: 3,
                tablet: 1,
                desktop: 2,
            },
            blockBreakdown: {
                'block-links': 2,
                'block-email': 1,
            },
            topLinks: [{ id: 'link-1', title: 'Instagram', clicks: 2 }],
            linkSourceBreakdown: [{
                id: 'link-1',
                title: 'Instagram',
                clicks: 2,
                topSource: 'instagram',
                sources: {
                    instagram: 1,
                    youtube: 1,
                },
            }],
        });
    });

    it('records public views with stable anonymous visitor metadata', async () => {
        const client = createBioPageSupabaseMock();
        const storageState: Record<string, string> = {};
        const storage = {
            getItem: (key: string) => storageState[key] || null,
            setItem: (key: string, value: string) => {
                storageState[key] = value;
            },
        };
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
        } as any;

        const visitorId = getBioPageAnonymousVisitorId(storage as any);
        await recordBioPageView(page, client as any, storage as any);
        await recordBioPageView(page, client as any, storage as any);

        expect(visitorId).toMatch(/^bio_visitor_/);
        expect(client.tables.bio_page_events).toHaveLength(2);
        expect(client.tables.bio_page_events.map(event => event.metadata?.visitorId)).toEqual([visitorId, visitorId]);
        expect(client.tables.bio_page_events[0]).toMatchObject({
            event_type: 'bio_page_viewed',
            metadata: {
                anonymousVisitor: true,
            },
        });
    });

    it('sanitizes public traffic attribution before storing Bio Page events', async () => {
        const client = createBioPageSupabaseMock();
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
        } as any;

        expect(getBioPageUtm('?utm_source=instagram%20story&utm_campaign=ana@example.com&utm_content=Poster%20A%20/%20Q3')).toEqual({
            utm_source: 'instagram-story',
            utm_content: 'Poster-A-Q3',
        });

        await recordBioPageEvent({
            page,
            eventType: 'bio_page_viewed',
            source: ' Instagram Ads! ',
            referrer: 'https://instagram.com/reel/1?email=ana@example.com#lead',
            utm: {
                utm_source: ' newsletter list ',
                utm_campaign: 'ana@example.com',
                utm_content: 'Poster A / Q3?',
            },
        }, client as any);

        expect(client.tables.bio_page_events[0]).toMatchObject({
            event_type: 'bio_page_viewed',
            source: 'Instagram-Ads',
            referrer: 'https://instagram.com/reel/1',
            utm: {
                utm_source: 'newsletter-list',
                utm_content: 'Poster-A-Q3',
            },
        });
        expect(client.tables.bio_page_events[0].utm).not.toHaveProperty('utm_campaign');
        expect(JSON.stringify(client.tables.bio_page_events[0])).not.toContain('ana@example.com');
    });

    it('records link click analytics with persisted block attribution', async () => {
        const client = createBioPageSupabaseMock();
        const blockId = '11111111-1111-4111-8111-111111111111';
        const linkId = '22222222-2222-4222-8222-222222222222';
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
        } as any;
        const originalPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.history.replaceState({}, '', '/bio/demo?utm_source=qr&utm_medium=bio_page&utm_campaign=poster_launch');

        try {
            expect(getBioPageTrafficSource()).toBe('qr');
            await recordBioPageClick(page, {
                id: linkId,
                title: 'Consultation',
                url: 'https://example.com/book',
                enabled: true,
                clicks: 0,
                linkType: 'booking',
                platform: 'calendar',
            }, blockId, client as any);
        } finally {
            window.history.replaceState({}, '', originalPath || '/');
        }

        expect(client.tables.bio_page_events[0]).toMatchObject({
            bio_page_id: 'bio-1',
            project_id: 'project-1',
            block_id: blockId,
            link_id: linkId,
            event_type: 'bio_link_clicked',
            source: 'qr',
            utm: {
                utm_source: 'qr',
                utm_medium: 'bio_page',
                utm_campaign: 'poster_launch',
            },
            metadata: {
                title: 'Consultation',
                platform: 'calendar',
                linkDestination: 'calendar',
                linkType: 'booking',
                blockId,
                linkId,
            },
        });
    });

    it('does not write public click events that cannot satisfy persisted attribution policies', async () => {
        const client = createBioPageSupabaseMock();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
        } as any;

        try {
            await recordBioPageClick(page, {
                id: 'legacy-link-id',
                title: 'Consultation',
                url: 'https://example.com/book',
                enabled: true,
                clicks: 0,
                linkType: 'booking',
                platform: 'calendar',
            }, 'legacy-block-id', client as any);
            await trackBioPageProductClick(page, 'product-1', 'legacy-product-block', client as any);
        } finally {
            warnSpy.mockRestore();
        }

        expect(client.tables.bio_page_events).toHaveLength(0);
    });

    it('records product clicks with persisted Bio Page block attribution', async () => {
        const client = createBioPageSupabaseMock();
        const blockId = '33333333-3333-4333-8333-333333333333';
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
        } as any;

        await trackBioPageProductClick(page, 'store-product-1', blockId, client as any);

        expect(client.tables.bio_page_events[0]).toMatchObject({
            bio_page_id: 'bio-1',
            project_id: 'project-1',
            block_id: blockId,
            link_id: null,
            event_type: 'bio_product_clicked',
            source: 'ecommerce',
            metadata: {
                productId: 'store-product-1',
            },
        });
    });

    it('records public share, QR scan, and tab change events safely', async () => {
        const client = createBioPageSupabaseMock();
        const page = {
            id: 'bio-1',
            projectId: 'project-1',
            tenantId: 'tenant-1',
            slug: 'creator-shop',
        } as any;

        await trackBioPageShare(page, client as any);
        await trackBioPageQrScan(page, client as any);
        await trackBioPageTabChange(page, 'shop', client as any);

        expect(client.tables.bio_page_events).toMatchObject([
            {
                bio_page_id: 'bio-1',
                project_id: 'project-1',
                event_type: 'bio_profile_shared',
                source: 'share',
            },
            {
                bio_page_id: 'bio-1',
                project_id: 'project-1',
                event_type: 'bio_qr_scanned',
                source: 'qr',
                metadata: { slug: 'creator-shop' },
            },
            {
                bio_page_id: 'bio-1',
                project_id: 'project-1',
                event_type: 'bio_tab_changed',
                source: 'tab',
                metadata: { tab: 'shop' },
            },
        ]);
        expect(JSON.stringify(client.tables.bio_page_events)).not.toContain('ana@example.com');
    });

    it('records completed inline Appointments bookings with Bio Page block attribution', async () => {
        const client = createBioPageSupabaseMock();
        const page = {
            id: 'bio-appointments',
            projectId: 'project-1',
            tenantId: 'tenant-1',
            userId: 'user-1',
            slug: 'creator-shop',
        } as any;

        await trackBioPageBookingCompleted(page, 'booking-block', {
            appointmentId: 'appointment-1',
            bookingServiceId: 'service-1',
            startDate: '2026-06-26T15:00:00.000Z',
            paymentRequired: false,
        }, client as any);

        expect(client.tables.bio_page_events).toMatchObject([
            {
                bio_page_id: 'bio-appointments',
                project_id: 'project-1',
                tenant_id: 'tenant-1',
                event_type: 'bio_booking_completed',
                source: 'appointments',
                block_id: null,
                metadata: {
                    appointmentId: 'appointment-1',
                    bookingServiceId: 'service-1',
                    paymentRequired: false,
                    blockId: 'booking-block',
                },
            },
        ]);
    });

    it('records paid Appointments checkout returns once per visitor session', async () => {
        const client = createBioPageSupabaseMock();
        const storage = new Map<string, string>();
        const sessionStorageMock = {
            getItem: (key: string) => storage.get(key) || null,
            setItem: (key: string, value: string) => {
                storage.set(key, value);
            },
        };
        const page = {
            id: 'bio-appointments',
            projectId: 'project-1',
            tenantId: 'tenant-1',
            slug: 'creator-shop',
        } as any;
        const search = '?appointmentPayment=success&appointmentId=appointment-1&orderId=order-1&bioBlockId=booking-block';

        expect(parseBioPageAppointmentPaymentReturn(search)).toMatchObject({
            status: 'success',
            appointmentId: 'appointment-1',
            orderId: 'order-1',
            blockId: 'booking-block',
        });
        await expect(trackBioPageAppointmentPaymentReturn(page, search, sessionStorageMock, client as any)).resolves.toBe(true);
        await expect(trackBioPageAppointmentPaymentReturn(page, search, sessionStorageMock, client as any)).resolves.toBe(false);
        await expect(trackBioPageAppointmentPaymentReturn(page, '?appointmentPayment=cancelled&appointmentId=appointment-2', sessionStorageMock, client as any)).resolves.toBe(false);

        expect(client.tables.bio_page_events).toHaveLength(1);
        expect(client.tables.bio_page_events[0]).toMatchObject({
            bio_page_id: 'bio-appointments',
            project_id: 'project-1',
            tenant_id: 'tenant-1',
            event_type: 'bio_booking_completed',
            source: 'appointments',
            block_id: null,
            metadata: {
                appointmentId: 'appointment-1',
                orderId: 'order-1',
                blockId: 'booking-block',
                paymentRequired: true,
                paymentStatus: 'checkout_return_success',
                checkoutProvider: 'stripe',
            },
        });
    });
});
