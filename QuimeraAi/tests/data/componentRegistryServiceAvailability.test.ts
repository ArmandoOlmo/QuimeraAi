import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    canAccessRegistryItem,
    filterAccessibleSections,
    getRegistryItem,
} from '../../data/componentRegistry';
import {
    buildServiceAwareComponentStatus,
    buildServiceAwareSectionVisibility,
    createServicePublicPredicate,
    filterServiceAvailablePages,
    filterServiceAvailableSections,
} from '../../utils/serviceAvailabilitySections';
import type { PageSection } from '../../types';
import type { GlobalServiceAvailability, PlatformServiceId } from '../../types/serviceAvailability';

const allowsEveryPlanFeature = () => true;

const expectSectionGate = (
    section: PageSection,
    serviceId: PlatformServiceId,
    requiredFeature?: string,
) => {
    const item = getRegistryItem(section);
    expect(item, section).toBeDefined();
    expect(item?.requiredService, section).toBe(serviceId);
    if (requiredFeature) expect(String(item?.requiredFeature), section).toBe(requiredFeature);
};

describe('componentRegistry service availability', () => {
    it('marks service-owned editor sections with canonical service gates', () => {
        expectSectionGate('heroLead', 'crm', 'crmEnabled');
        expectSectionGate('leads', 'crm', 'crmEnabled');
        expectSectionGate('signupFloat', 'crm', 'crmEnabled');
        expectSectionGate('newsletter', 'emailMarketing', 'emailMarketing');
        expectSectionGate('chatbot', 'chatbot', 'chatbotEnabled');
        expectSectionGate('cmsFeed', 'cms', 'cmsEnabled');
        expectSectionGate('articleContent', 'cms', 'cmsEnabled');
        expectSectionGate('menu', 'restaurants');
        expectSectionGate('restaurantReservation', 'restaurants');
        expectSectionGate('appointmentBooking', 'appointments');
        expectSectionGate('realEstateListings', 'realEstate', 'realEstateModule');
        expectSectionGate('propertyDirectory', 'realEstate', 'realEstateModule');
        expectSectionGate('propertyDetail', 'realEstate', 'realEstateModule');

        for (const section of [
            'storeSettings',
            'products',
            'featuredProducts',
            'categoryGrid',
            'productHero',
            'saleCountdown',
            'trustBadges',
            'recentlyViewed',
            'productReviews',
            'collectionBanner',
            'productBundle',
            'announcementBar',
            'productDetail',
            'categoryProducts',
            'productGrid',
            'cart',
            'checkout',
        ] as PageSection[]) {
            expectSectionGate(section, 'ecommerce', 'ecommerceEnabled');
        }
    });

    it('blocks every service-owned editor section when its service is unavailable', () => {
        const sections: PageSection[] = [
            'hero',
            'features',
            'footer',
            'heroLead',
            'leads',
            'signupFloat',
            'newsletter',
            'chatbot',
            'cmsFeed',
            'articleContent',
            'menu',
            'restaurantReservation',
            'appointmentBooking',
            'realEstateListings',
            'propertyDirectory',
            'propertyDetail',
            'storeSettings',
            'products',
            'featuredProducts',
            'categoryGrid',
            'productHero',
            'saleCountdown',
            'trustBadges',
            'recentlyViewed',
            'productReviews',
            'collectionBanner',
            'productBundle',
            'announcementBar',
            'productDetail',
            'categoryProducts',
            'productGrid',
            'cart',
            'checkout',
        ];

        const accessible = filterAccessibleSections(sections, {
            canAccessService: () => false,
            hasPlanFeature: allowsEveryPlanFeature,
        });

        expect(accessible).toEqual(expect.arrayContaining(['hero', 'features', 'footer']));
        sections
            .filter(section => !['hero', 'features', 'footer'].includes(section))
            .forEach(section => expect(accessible).not.toContain(section));
    });

    it('blocks a service-owned section even when its plan feature is available', () => {
        const item = getRegistryItem('featuredProducts');
        expect(item).toBeDefined();

        expect(canAccessRegistryItem(item!, {
            canAccessService: serviceId => serviceId !== 'ecommerce',
            hasPlanFeature: allowsEveryPlanFeature,
        })).toBe(false);
    });

    it('filters persisted render sections and pages by public service availability', () => {
        const isServicePublic = (serviceId: PlatformServiceId) => serviceId !== 'ecommerce' && serviceId !== 'crm';
        const sections: PageSection[] = ['header', 'hero', 'featuredProducts', 'leads', 'footer'];

        expect(filterServiceAvailableSections(sections, isServicePublic)).toEqual(['header', 'hero', 'footer']);
        expect(filterServiceAvailablePages([
            {
                id: 'home',
                title: 'Home',
                slug: '/',
                sections,
                sectionData: {},
                isHomePage: true,
            },
        ], isServicePublic)[0].sections).toEqual(['header', 'hero', 'footer']);
    });

    it('forces service-owned component status and visibility off for disabled services', () => {
        const isServicePublic = (serviceId: PlatformServiceId) => serviceId !== 'chatbot' && serviceId !== 'appointments';
        const status = buildServiceAwareComponentStatus(
            { chatbot: true, appointmentBooking: true, hero: true },
            ['hero', 'chatbot', 'appointmentBooking'],
            isServicePublic,
        );
        const visibility = buildServiceAwareSectionVisibility(
            { chatbot: true, appointmentBooking: true, hero: true },
            isServicePublic,
        );

        expect(status.hero).toBe(true);
        expect(status.chatbot).toBe(false);
        expect(status.appointmentBooking).toBe(false);
        expect(visibility.hero).toBe(true);
        expect(visibility.chatbot).toBe(false);
        expect(visibility.appointmentBooking).toBe(false);
    });

    it('treats missing service availability config as public and explicit development/not_public as hidden', () => {
        const availability = {
            services: {
                ecommerce: { status: 'development', updatedAt: '', updatedBy: 'test' },
                crm: { status: 'not_public', updatedAt: '', updatedBy: 'test' },
                chatbot: { status: 'public', updatedAt: '', updatedBy: 'test' },
            },
            lastUpdated: '',
            updatedBy: 'test',
        } as GlobalServiceAvailability;
        const isServicePublic = createServicePublicPredicate(availability);
        const defaultIsServicePublic = createServicePublicPredicate(null);

        expect(isServicePublic('ecommerce')).toBe(false);
        expect(isServicePublic('crm')).toBe(false);
        expect(isServicePublic('chatbot')).toBe(true);
        expect(defaultIsServicePublic('ecommerce')).toBe(true);
    });

    it('gates Bio Page editor surfaces by service availability', () => {
        const source = readFileSync(resolve(process.cwd(), 'components/dashboard/BioPageBuilder.tsx'), 'utf8');

        expect(source).toContain('BIO_SOURCE_MODULE_SERVICE_MAP');
        expect(source).toContain("ecommerce: 'ecommerce'");
        expect(source).toContain("appointments: 'appointments'");
        expect(source).toContain("'email-marketing': 'emailMarketing'");
        expect(source).toContain("chatcore: 'chatbot'");
        expect(source).toContain("'media-ai': 'aiFeatures'");
        expect(source).toContain('canAccessBioBlockDefinition');
        expect(source).toContain('canAccessBioBlock');
        expect(source).toContain('canAccessBioLink');
        expect(source).toContain('canAccessBioIntegration');
        expect(source).toContain('blocks\n            .filter(canAccessBioBlock)');
        expect(source).toContain('links\n            .filter(canAccessBioLink)');
        expect(source).toContain('BIO_BLOCK_LIBRARY.filter(canAccessBioBlockDefinition)');
        expect(source).toContain("activeTab === 'shop' && !canAccessEcommerce");
        expect(source).toContain("activeTab === 'audience' && !canAccessEmailMarketing");
        expect(source).toContain("activeTab === 'analytics' && !canAccessAnalytics");
        expect(source).toContain("serviceId: 'appointments'");
        expect(source).toContain('visiblePreviewLinks');
    });
});
