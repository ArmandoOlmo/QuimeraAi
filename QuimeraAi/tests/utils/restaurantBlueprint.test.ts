import { describe, expect, it } from 'vitest';
import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    createAiStudioBusinessBlueprint,
    createBusinessBlueprintFromWebsitePlan,
    migrateBusinessBlueprint,
} from '../../utils/businessBlueprint';
import { deriveRestaurantBlueprintFromBusinessBrief } from '../../utils/aiStudio';

const now = '2026-06-24T12:00:00.000Z';

function restaurantPlan(overrides: Partial<WebsitePlan> = {}): WebsitePlan {
    return {
        source: 'chat',
        generationMode: 'from-scratch',
        businessProfile: {
            businessName: 'Carolina Steak Studio',
            industry: 'Modern steakhouse restaurant in Carolina PR',
            description: 'A modern steakhouse with reservations, private events, catering, gift cards, and a QR menu.',
            tagline: 'Fire, wine, and warm hospitality',
            services: [
                { name: 'Seasonal steaks', description: 'Rotating grill-forward menu.' },
                { name: 'Private dining', description: 'Events and group reservations.' },
                { name: 'Catering packages', description: 'Draft catering offers for review.' },
            ],
            contactInfo: {
                address: 'Carolina, PR',
                phone: '787-555-0101',
                hours: 'Tue-Sun 5pm-10pm',
                currency: 'USD',
            },
            hasEcommerce: true,
        },
        brandProfile: {
            colors: {
                primary: '#7c2d12',
                secondary: '#111827',
                accent: '#f59e0b',
                background: '#ffffff',
                surface: '#f8fafc',
                text: '#111827',
            },
            fonts: ['inter', 'inter'],
            visualStyle: 'warm editorial restaurant',
        },
        contentMap: {
            pages: [{ title: 'Home', purpose: 'landing', summary: 'Generated restaurant home page' }],
            menuItems: [],
            products: [],
        },
        componentPlan: [
            { component: 'hero', reason: 'First viewport', confidence: 0.9, source: 'ai' },
            { component: 'menu', reason: 'Restaurant menu', confidence: 0.9, source: 'ai' },
            { component: 'restaurantReservation', reason: 'Reservations', confidence: 0.9, source: 'ai' },
            { component: 'footer', reason: 'Footer', confidence: 0.8, source: 'ai' },
        ],
        assetPlan: [],
        qualityGoals: ['restaurant engine draft safety'],
        ...overrides,
    };
}

describe('RestaurantBlueprint V2', () => {
    it('creates a review-safe RestaurantBlueprint V2 from a restaurant WebsitePlan', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(restaurantPlan(), { now });
        const restaurant = blueprint.restaurantBlueprint;

        expect(restaurant.enabled).toBe(true);
        expect(restaurant.status).toBe('needs_review');
        expect(restaurant.profile).toMatchObject({
            name: 'Carolina Steak Studio',
            cuisineType: 'Steakhouse',
            address: 'Carolina, PR',
            phone: '787-555-0101',
            currency: 'USD',
        });
        expect(restaurant.menuDraft.status).toBe('needs_review');
        expect(restaurant.menuDraft.publishStatus).toBe('not_published');
        expect(restaurant.menuDraft.categories).toEqual(expect.arrayContaining(['Steaks', 'Sides']));
        expect(restaurant.menuDraft.items.length).toBeGreaterThan(0);
        expect(restaurant.menuDraft.items.every(item => item.needsReview && item.generatedByAI && !item.userModified)).toBe(true);
        expect(restaurant.menuDraft.items.every(item => item.priceSource !== 'ai-suggested' || item.needsReview)).toBe(true);
        expect(restaurant.reservations).toMatchObject({
            enabled: true,
            confirmationMode: 'manual',
            needsReview: true,
        });
        expect(restaurant.publicMenu).toMatchObject({
            enabled: true,
            qrMenuEnabled: true,
            routeStrategy: '/menu/:restaurantId',
            stickyCtaEnabled: true,
        });
        expect(restaurant.ecommerceOffers.giftCards).toMatchObject({ enabled: true, status: 'draft', needsReview: true });
        expect(restaurant.ecommerceOffers.cateringPackages).toMatchObject({ enabled: true, status: 'draft', needsReview: true });
        expect(restaurant.legacyEcommerceOffers).toEqual(expect.arrayContaining(['giftCards', 'cateringPackages']));
        expect(restaurant.integrations.analyticsEvents).toEqual(expect.arrayContaining(['reservation_created', 'qr_menu_viewed']));
    });

    it('migrates legacy restaurant blueprints without breaking isBusinessBlueprint', () => {
        const blueprint = createBusinessBlueprintFromWebsitePlan(restaurantPlan(), { now });
        const legacyRestaurant = {
            enabled: true,
            status: 'generated',
            needsReview: true,
            readiness: { isReady: true, warnings: [], blockers: [] },
            metadata: {
                generatedBy: 'ai',
                userModified: false,
                generatedAt: now,
            },
            menuSignals: ['steaks', 'reservations'],
            reservationRules: ['party size'],
            ecommerceOffers: ['gift cards', 'catering packages'],
        };
        const legacy = {
            ...blueprint,
            restaurantBlueprint: legacyRestaurant,
        } as unknown as BusinessBlueprint;

        const migrated = migrateBusinessBlueprint(legacy);

        expect(migrated).toBeTruthy();
        expect(migrated?.restaurantBlueprint.profile.name).toBe('Carolina Steak Studio');
        expect(migrated?.restaurantBlueprint.menuDraft.items.length).toBeGreaterThan(0);
        expect(migrated?.restaurantBlueprint.ecommerceOffers.giftCards.needsReview).toBe(true);
        expect(migrated?.restaurantBlueprint.legacyEcommerceOffers).toEqual(expect.arrayContaining(['gift cards', 'catering packages']));
    });

    it('derives a complete restaurant blueprint from an AI Studio restaurant brief', () => {
        const restaurant = deriveRestaurantBlueprintFromBusinessBrief({
            businessName: 'Mesa Fuego',
            industry: 'Steakhouse moderno en Carolina PR',
            businessDescription: 'Restaurante de steaks con menú QR, reservas, catering, eventos privados y gift cards.',
            productsServicesText: 'steakhouse menu reservas catering event tickets gift cards QR menu',
            now,
        });

        expect(restaurant.enabled).toBe(true);
        expect(restaurant.profile.cuisineType).toBe('Steakhouse');
        expect(restaurant.menuDraft.items.length).toBeGreaterThan(0);
        expect(restaurant.menuDraft.items.every(item => item.needsReview)).toBe(true);
        expect(restaurant.reservations.confirmationMode).toBe('manual');
        expect(restaurant.publicMenu.showReserveButton).toBe(true);
        expect(restaurant.ecommerceOffers.eventTickets.enabled).toBe(true);
        expect(restaurant.integrations.crmTags).toEqual(expect.arrayContaining(['restaurant', 'reservation']));
    });

    it('lets AI Studio mount registered restaurant sections without overwriting locked restaurant data', () => {
        const initial = createAiStudioBusinessBlueprint(restaurantPlan(), { now });
        const existing: BusinessBlueprint = {
            ...initial,
            restaurantBlueprint: {
                ...initial.restaurantBlueprint,
                menuDraft: {
                    ...initial.restaurantBlueprint.menuDraft,
                    categories: ['Manual category'],
                },
                metadata: {
                    ...initial.restaurantBlueprint.metadata,
                    lockedFromRegeneration: true,
                },
            },
        };

        const merged = createAiStudioBusinessBlueprint(restaurantPlan({
            businessProfile: {
                ...restaurantPlan().businessProfile,
                description: 'Updated steakhouse brief with sushi, brunch, and catering.',
            },
        }), {
            now: '2026-06-24T12:30:00.000Z',
            existingBusinessBlueprint: existing,
        });

        expect(merged.websiteBlueprint.sections).toEqual(expect.arrayContaining(['menu', 'restaurantReservation', 'map']));
        expect(merged.restaurantBlueprint.menuDraft.categories).toEqual(['Manual category']);
        expect(merged.restaurantBlueprint.metadata.lockedFromRegeneration).toBe(true);
        expect(merged.sourceMap.restaurantBlueprint).toBe('aiStudio.deriveRestaurantBlueprintFromBusinessBrief');
    });
});
