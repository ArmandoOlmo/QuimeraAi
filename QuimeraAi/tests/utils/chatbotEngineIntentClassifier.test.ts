import { describe, expect, it } from 'vitest';
import { classifyChatbotMessageIntent } from '../../utils/chatbotEngine/intentClassifier';

describe('chatbotEngine intent classifier', () => {
    it('classifies checkout intent on storefront surfaces', () => {
        const result = classifyChatbotMessageIntent({
            text: 'I want to buy this product and checkout now',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });

        expect(result).toMatchObject({
            primaryIntent: 'checkout_intent',
            actionType: 'start_checkout',
            urgency: 'high',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });
        expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('classifies realty showing requests from property pages', () => {
        const result = classifyChatbotMessageIntent({
            text: 'Quiero agendar una visita para ver propiedad este fin de semana',
            sourceSurface: 'realty_property_page',
            sourceModule: 'realty',
        });

        expect(result).toMatchObject({
            primaryIntent: 'realty_showing_request',
            actionType: 'request_realty_showing',
            urgency: 'high',
        });
    });

    it('classifies contact details as lead capture without storing the raw contact value', () => {
        const result = classifyChatbotMessageIntent({
            text: 'My email is ada@example.com',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(result).toMatchObject({
            primaryIntent: 'lead_capture',
            actionType: 'create_lead',
            urgency: 'medium',
            matchedSignals: ['contact_info'],
        });
        expect(JSON.stringify(result)).not.toContain('ada@example.com');
    });

    it('classifies back-in-stock requests as ecommerce actions', () => {
        const result = classifyChatbotMessageIntent({
            text: 'Avísame cuando vuelva este producto, está agotado',
            sourceSurface: 'storefront',
            sourceModule: 'ecommerce',
        });

        expect(result).toMatchObject({
            primaryIntent: 'back_in_stock_request',
            actionType: 'back_in_stock_request',
            urgency: 'medium',
        });
        expect(result.matchedSignals).toEqual(expect.arrayContaining(['agotado']));
    });

    it('classifies email follow-up requests as draft-only Email Marketing actions', () => {
        const result = classifyChatbotMessageIntent({
            text: 'Please send details by email and follow up by email tomorrow',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(result).toMatchObject({
            primaryIntent: 'email_follow_up',
            actionType: 'queue_email_follow_up',
            urgency: 'medium',
        });
        expect(result.matchedSignals).toEqual(expect.arrayContaining(['follow up by email']));
    });

    it('classifies formal quote and invoice requests as Finance draft actions', () => {
        const result = classifyChatbotMessageIntent({
            text: 'Please send invoice or formal quote for this consultation package',
            sourceSurface: 'website',
            sourceModule: 'chatcore',
        });

        expect(result).toMatchObject({
            primaryIntent: 'finance_quote_request',
            actionType: 'create_finance_quote_request',
            urgency: 'high',
        });
        expect(result.matchedSignals).toEqual(expect.arrayContaining(['send invoice']));
    });
});
