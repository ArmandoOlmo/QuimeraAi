import { describe, expect, it } from 'vitest';
import type { ChatbotChannelBlueprint } from '../../types/businessBlueprint.ts';
import {
    buildChatbotEngineSurfaceDeploymentManifest,
    CHATBOT_ENGINE_DEPLOYMENT_SURFACES,
} from '../../utils/chatbotEngine/surfaceDeploymentManifest.ts';

const baseReadiness = { isReady: false, blockers: [], warnings: [] };

function buildChannels(overrides: Partial<ChatbotChannelBlueprint> = {}): ChatbotChannelBlueprint {
    const channel = (sourceSurface: ChatbotChannelBlueprint['webWidget']['sourceSurface'], routePattern: string) => ({
        enabled: false,
        status: 'draft' as const,
        sourceSurface,
        routePattern,
        contextKeys: ['projectId'],
        readiness: baseReadiness,
        needsReview: true,
    });

    return {
        webWidget: channel('website', '/site/:projectSlug/*'),
        embeddedWidget: channel('website', '/embed/chat/:projectId'),
        bioPage: channel('bio_page', '/bio/:slug'),
        storefront: channel('storefront', '/store/:projectSlug'),
        checkout: channel('checkout', '/checkout/:projectSlug'),
        bookingPage: channel('booking_page', '/booking/:projectSlug'),
        restaurantMenu: channel('restaurant_menu', '/menu/:restaurantSlug'),
        realtyPropertyPage: channel('realty_property_page', '/property/:propertySlug'),
        adminPreview: channel('admin_preview', '/dashboard/chatbot'),
        voice: channel('voice', 'voice://project/:projectId'),
        whatsappReadiness: baseReadiness,
        smsReadiness: baseReadiness,
        emailReadiness: baseReadiness,
        ...overrides,
    };
}

describe('chatbotEngine surface deployment manifest', () => {
    it('defines every canonical ChatCore deployment surface from the product goal', () => {
        expect(CHATBOT_ENGINE_DEPLOYMENT_SURFACES.filter(surface => surface.requiredForCanonicalDeployment).map(surface => surface.id)).toEqual([
            'webWidget',
            'storefront',
            'checkout',
            'bioPage',
            'bookingPage',
            'restaurantMenu',
            'realtyPropertyPage',
        ]);
        expect(CHATBOT_ENGINE_DEPLOYMENT_SURFACES.map(surface => surface.id)).toEqual(expect.arrayContaining([
            'embeddedWidget',
            'adminPreview',
            'voice',
        ]));
        expect(CHATBOT_ENGINE_DEPLOYMENT_SURFACES.every(surface => surface.requiredBlueprintPaths.length > 0)).toBe(true);
        expect(CHATBOT_ENGINE_DEPLOYMENT_SURFACES.every(surface => surface.runtimeEvidence.length > 0)).toBe(true);
    });

    it('reports missing required public surfaces until they are deployed', () => {
        const manifest = buildChatbotEngineSurfaceDeploymentManifest(buildChannels());

        expect(manifest.requiredSurfaceCount).toBe(7);
        expect(manifest.deployedRequiredSurfaceCount).toBe(0);
        expect(manifest.publicSurfaceCount).toBe(9);
        expect(manifest.coverageStatus).toBe('review');
        expect(manifest.missingRequiredSurfaceIds).toEqual([
            'webWidget',
            'storefront',
            'checkout',
            'bioPage',
            'bookingPage',
            'restaurantMenu',
            'realtyPropertyPage',
        ]);
    });

    it('marks canonical deployment ready when all required surfaces are deployed', () => {
        const deployedChannel = (sourceSurface: ChatbotChannelBlueprint['webWidget']['sourceSurface'], routePattern: string) => ({
            enabled: true,
            status: 'deployed' as const,
            sourceSurface,
            routePattern,
            contextKeys: ['projectId'],
            readiness: { isReady: true, blockers: [], warnings: [] },
            needsReview: false,
        });
        const manifest = buildChatbotEngineSurfaceDeploymentManifest(buildChannels({
            webWidget: deployedChannel('website', '/site/:projectSlug/*'),
            storefront: deployedChannel('storefront', '/store/:projectSlug'),
            checkout: deployedChannel('checkout', '/checkout/:projectSlug'),
            bioPage: deployedChannel('bio_page', '/bio/:slug'),
            bookingPage: deployedChannel('booking_page', '/booking/:projectSlug'),
            restaurantMenu: deployedChannel('restaurant_menu', '/menu/:restaurantSlug'),
            realtyPropertyPage: deployedChannel('realty_property_page', '/property/:propertySlug'),
        }));

        expect(manifest.deployedRequiredSurfaceCount).toBe(7);
        expect(manifest.missingRequiredSurfaceIds).toEqual([]);
        expect(manifest.coverageStatus).toBe('ready');
        expect(manifest.reviewSurfaceIds).toEqual(expect.arrayContaining(['embeddedWidget', 'adminPreview', 'voice']));
    });
});
