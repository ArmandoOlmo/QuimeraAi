import { describe, expect, it } from 'vitest';
import {
    buildChatbotEngineSurfaceContext,
    buildChatbotEngineSurfacePrompt,
    mergeChatbotEngineSurfaceContext,
} from '../../utils/chatbotEngine/surfaceContext';

describe('chatbotEngine surface context', () => {
    it('normalizes canonical ecommerce checkout context', () => {
        const context = buildChatbotEngineSurfaceContext({
            sourceSurface: 'checkout',
            sourceModule: 'ecommerce',
            route: '/store/project-1/checkout',
            entityType: 'checkout',
            contextKeys: ['storefront', 'checkout', 'checkout'],
            metadata: {
                routeView: 'checkout',
                ignored: undefined,
                nested: { productSlug: 't-shirt', extra: { tooDeep: true } },
            },
        });

        expect(context).toMatchObject({
            sourceSurface: 'checkout',
            sourceModule: 'ecommerce',
            route: '/store/project-1/checkout',
            entityType: 'checkout',
            contextKeys: ['storefront', 'checkout'],
        });
        expect(context.metadata.nested).toMatchObject({ productSlug: 't-shirt' });
        expect(context.metadata).not.toHaveProperty('ignored');
    });

    it('falls back to website/chatcore for unsafe surfaces and merges overlays', () => {
        const context = mergeChatbotEngineSurfaceContext(
            {
                sourceSurface: 'not-real',
                sourceModule: '',
                contextKeys: ['website'],
                metadata: { base: true },
            },
            {
                sourceSurface: 'storefront',
                sourceModule: 'ecommerce',
                contextKeys: ['product', 'website'],
                metadata: { productSlug: 'hat' },
            },
        );

        expect(context.sourceSurface).toBe('storefront');
        expect(context.sourceModule).toBe('ecommerce');
        expect(context.contextKeys).toEqual(['website', 'product']);
        expect(context.metadata).toMatchObject({ base: true, productSlug: 'hat' });
    });

    it('builds an implicit surface prompt', () => {
        const prompt = buildChatbotEngineSurfacePrompt(buildChatbotEngineSurfaceContext({
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
            entityType: 'product',
            entitySlug: 'demo-product',
            contextKeys: ['storefront:product'],
        }));

        expect(prompt).toContain('CHATBOT ENGINE SURFACE CONTEXT');
        expect(prompt).toContain('Surface: storefront');
        expect(prompt).toContain('Entity slug: demo-product');
    });

    it('normalizes booking page context for appointment actions', () => {
        const context = buildChatbotEngineSurfaceContext({
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            route: '/book',
            entityType: 'booking_page',
            entityId: 'appointment-section',
            contextKeys: ['website', 'booking_page', 'appointments'],
            metadata: {
                sourceComponent: 'AppointmentBooking',
                sourceBlockId: 'appointmentBooking-0',
            },
        });

        expect(context).toMatchObject({
            sourceSurface: 'booking_page',
            sourceModule: 'appointments',
            route: '/book',
            entityType: 'booking_page',
            entityId: 'appointment-section',
            contextKeys: ['website', 'booking_page', 'appointments'],
        });
        expect(context.metadata).toMatchObject({
            sourceComponent: 'AppointmentBooking',
            sourceBlockId: 'appointmentBooking-0',
        });
    });

    it('normalizes Bio Page context with the canonical owner module', () => {
        const context = buildChatbotEngineSurfaceContext({
            sourceSurface: 'bio_page',
            sourceModule: 'bio-page',
            route: '/bio/ganova',
            entityType: 'bio_page',
            entityId: 'bio-page-1',
            entitySlug: 'ganova',
            contextKeys: ['bio_page', 'block:chatbot_cta', 'block:booking'],
            metadata: {
                projectId: 'project-1',
                activeBlockId: 'chatbot-cta-1',
                visibleBlockCount: 6,
            },
        });

        expect(context).toMatchObject({
            sourceSurface: 'bio_page',
            sourceModule: 'bio-page',
            route: '/bio/ganova',
            entityType: 'bio_page',
            entityId: 'bio-page-1',
            entitySlug: 'ganova',
            contextKeys: ['bio_page', 'block:chatbot_cta', 'block:booking'],
        });
        expect(context.metadata).toMatchObject({
            projectId: 'project-1',
            activeBlockId: 'chatbot-cta-1',
        });
    });

    it('normalizes Realty Property Page context with the canonical owner module', () => {
        const context = buildChatbotEngineSurfaceContext({
            sourceSurface: 'realty_property_page',
            sourceModule: 'real-estate',
            route: '/listados/beach-villa',
            entityType: 'realty_property',
            entityId: 'property-1',
            entitySlug: 'beach-villa',
            contextKeys: ['website', 'realty_property_page'],
            metadata: {
                projectId: 'project-1',
                propertySlug: 'beach-villa',
            },
        });

        expect(context).toMatchObject({
            sourceSurface: 'realty_property_page',
            sourceModule: 'real-estate',
            route: '/listados/beach-villa',
            entityType: 'realty_property',
            entityId: 'property-1',
            entitySlug: 'beach-villa',
            contextKeys: ['website', 'realty_property_page'],
        });
        expect(context.metadata).toMatchObject({
            projectId: 'project-1',
            propertySlug: 'beach-villa',
        });
    });
});
