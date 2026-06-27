import { describe, expect, it } from 'vitest';
import {
    formatUnavailableAssistantServiceMessage,
    resolveAssistantServiceIdForEditorSection,
    resolveAssistantServiceIdForGuideTarget,
    resolveAssistantServiceIdForModule,
    resolveAssistantServiceIdForView,
} from '../../services/globalAssistant/globalAssistantServiceAvailability';

describe('globalAssistantServiceAvailability', () => {
    it('maps assistant modules and guide targets to platform services', () => {
        expect(resolveAssistantServiceIdForModule('media')).toBe('aiFeatures');
        expect(resolveAssistantServiceIdForModule('ecommerce')).toBe('ecommerce');
        expect(resolveAssistantServiceIdForModule('crm')).toBe('crm');
        expect(resolveAssistantServiceIdForModule('emailMarketing')).toBe('emailMarketing');
        expect(resolveAssistantServiceIdForModule('agency')).toBe('agency');
        expect(resolveAssistantServiceIdForModule('website')).toBeNull();

        expect(resolveAssistantServiceIdForGuideTarget('image')).toBe('aiFeatures');
        expect(resolveAssistantServiceIdForGuideTarget('video')).toBe('aiFeatures');
        expect(resolveAssistantServiceIdForGuideTarget('storefront')).toBe('ecommerce');
        expect(resolveAssistantServiceIdForGuideTarget('leads')).toBe('crm');
        expect(resolveAssistantServiceIdForGuideTarget('chatcore')).toBe('chatbot');
        expect(resolveAssistantServiceIdForGuideTarget('bioPage')).toBe('bioPage');
        expect(resolveAssistantServiceIdForGuideTarget('agency')).toBe('agency');
        expect(resolveAssistantServiceIdForGuideTarget('websiteBuilder')).toBeNull();
    });

    it('maps assistant navigation views to service gates', () => {
        expect(resolveAssistantServiceIdForView('assets')).toBe('aiFeatures');
        expect(resolveAssistantServiceIdForView('ai-assistant')).toBe('chatbot');
        expect(resolveAssistantServiceIdForView('biopage')).toBe('bioPage');
        expect(resolveAssistantServiceIdForView('blog-hub')).toBe('cms');
        expect(resolveAssistantServiceIdForView('restaurants')).toBe('restaurants');
        expect(resolveAssistantServiceIdForView('real-estate')).toBe('realEstate');
        expect(resolveAssistantServiceIdForView('agency')).toBe('agency');
        expect(resolveAssistantServiceIdForView('editor')).toBeNull();
        expect(resolveAssistantServiceIdForView('navigation')).toBeNull();
    });

    it('maps editor sections to service gates through the component registry', () => {
        expect(resolveAssistantServiceIdForEditorSection('menu')).toBe('restaurants');
        expect(resolveAssistantServiceIdForEditorSection('restaurantReservation')).toBe('restaurants');
        expect(resolveAssistantServiceIdForEditorSection('appointmentBooking')).toBe('appointments');
        expect(resolveAssistantServiceIdForEditorSection('featuredProducts')).toBe('ecommerce');
        expect(resolveAssistantServiceIdForEditorSection('leads')).toBe('crm');
        expect(resolveAssistantServiceIdForEditorSection('chatbot')).toBe('chatbot');
        expect(resolveAssistantServiceIdForEditorSection('hero')).toBeNull();
        expect(resolveAssistantServiceIdForEditorSection('unknown-section')).toBeNull();
    });

    it('returns short user-facing unavailable messages in the request language', () => {
        expect(formatUnavailableAssistantServiceMessage({
            target: 'image',
            request: 'Quiero crear una imagen',
            locale: 'es',
        })).toBe('Imágenes no está disponible ahora. Usa un servicio activo o pide a un admin que lo active.');

        expect(formatUnavailableAssistantServiceMessage({
            target: 'email',
            request: 'Open email',
            locale: 'en',
        })).toBe('Email is not available right now. Use an active service or ask an admin to enable it.');

        expect(formatUnavailableAssistantServiceMessage({
            target: 'menu',
            request: 'Abre el menú',
            locale: 'es',
        })).toBe('Menú no está disponible ahora. Usa un servicio activo o pide a un admin que lo active.');

        expect(formatUnavailableAssistantServiceMessage({
            target: 'emailMarketing',
            request: 'Crear email',
            locale: 'es',
        })).toBe('Email Marketing no está disponible ahora. Usa un servicio activo o pide a un admin que lo active.');

        expect(formatUnavailableAssistantServiceMessage({
            target: 'crm',
            request: 'Open CRM',
            locale: 'en',
        })).toBe('Leads is not available right now. Use an active service or ask an admin to enable it.');

        expect(formatUnavailableAssistantServiceMessage({
            target: 'aiFeatures',
            request: 'Quiero crear una imagen',
            locale: 'es',
        })).toBe('IA no está disponible ahora. Usa un servicio activo o pide a un admin que lo active.');
    });
});
