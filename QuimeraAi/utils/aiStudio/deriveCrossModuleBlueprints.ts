import type { IntegrationEventType } from '../../types/integrationEvents';
import type {
    AiStudioBusinessBriefInput,
    AiStudioCrossModuleBlueprints,
    AiStudioEcommerceBlueprint,
    AiStudioStorefrontBlueprint,
} from './types';
import {
    classifyCommerceSignals,
    createAiStudioMetadata,
    createAiStudioReadiness,
} from './types';

const ECOMMERCE_EVENTS: IntegrationEventType[] = [
    'product_viewed',
    'add_to_cart',
    'checkout_started',
    'product_inquiry',
];

function businessKnowledge(input: AiStudioBusinessBriefInput): string[] {
    const plan = input.existingWebsitePlan;
    return [
        input.businessName || plan?.businessProfile.businessName,
        input.industry || plan?.businessProfile.industry,
        input.businessDescription || input.description || plan?.businessProfile.description,
        ...(input.services || plan?.businessProfile.services || []).map(service => service.name),
    ].filter((item): item is string => Boolean(item && item.trim()));
}

function contextDrafts(
    input: AiStudioBusinessBriefInput,
    ecommerceBlueprint: AiStudioEcommerceBlueprint,
): string[] {
    const signals = classifyCommerceSignals(input);
    const drafts = [
        'Draft store policies: payment, tax, shipping, returns, and pickup rules must be reviewed.',
        'Draft product FAQ: answer category, availability, and product inquiry questions only from reviewed catalog data.',
    ];

    if (ecommerceBlueprint.giftCardsEnabled) drafts.push('Draft gift card FAQ: redemption, delivery, and expiration rules need merchant approval.');
    if (signals.includes('restaurant')) drafts.push('Restaurant context: reservations, menu, catering, event tickets, and gift cards should be reviewed by the restaurant.');
    if (signals.includes('real-estate')) drafts.push('Real estate context: buyer guides, seller guides, consultations, and lead capture should stay informational until reviewed.');
    if (signals.includes('services')) drafts.push('Appointments context: paid consultations, packages, deposits, and add-ons require service availability review.');

    return drafts;
}

export function deriveCrossModuleBlueprints(
    input: AiStudioBusinessBriefInput,
    ecommerceBlueprint: AiStudioEcommerceBlueprint,
    storefrontBlueprint: AiStudioStorefrontBlueprint,
): AiStudioCrossModuleBlueprints {
    const now = input.now || ecommerceBlueprint.metadata.generatedAt || new Date().toISOString();
    const metadata = createAiStudioMetadata(now);
    const enabled = ecommerceBlueprint.enabled;
    const categoryKnowledge = ecommerceBlueprint.productCategories.map(category => `Category draft: ${category}`);
    const signals = classifyCommerceSignals(input);
    const leadTags = [
        'ecommerce',
        'product-interest',
        'abandoned-cart',
        'high-intent',
        ...(ecommerceBlueprint.giftCardsEnabled ? ['gift-card'] : []),
        ...(signals.includes('restaurant') ? ['restaurant-commerce'] : []),
        ...(signals.includes('real-estate') ? ['real-estate-resource'] : []),
        ...(signals.includes('services') ? ['paid-service-interest'] : []),
    ];
    const emailFlow = (
        type: string,
        triggerEvent: IntegrationEventType,
        blockers: string[],
        templateType = type,
    ) => ({
        type,
        status: 'draft' as const,
        triggerEvent,
        templateType,
        enabled: false,
        needsReview: true,
        generatedByAI: true,
        userModified: false,
        readiness: createAiStudioReadiness([], blockers),
    });

    return {
        chatbotBlueprint: {
            enabled,
            status: enabled ? 'needs_review' : 'draft',
            needsReview: true,
            businessKnowledge: businessKnowledge(input),
            productKnowledge: enabled
                ? [
                    ...categoryKnowledge,
                    ...ecommerceBlueprint.starterProducts.map(product => `Draft product: ${product.name}`),
                ]
                : [],
            policyKnowledge: enabled
                ? ['Draft shipping policy', 'Draft returns policy', 'Draft payment policy', 'Draft gift card policy']
                : [],
            eventIntents: enabled ? ECOMMERCE_EVENTS : ['lead_created'],
            contextDrafts: contextDrafts(input, ecommerceBlueprint),
            readiness: createAiStudioReadiness([
                'Chatbot ecommerce knowledge is draft-only and should not answer from unreviewed product data.',
            ]),
            sourceMap: {
                productKnowledge: 'ecommerceBlueprint.productCategories',
                storefrontContext: storefrontBlueprint.enabled ? 'storefrontBlueprint' : 'storefrontBlueprint.disabled',
            },
            metadata,
        },
        leadBlueprint: {
            enabled,
            status: enabled ? 'needs_review' : 'draft',
            needsReview: true,
            leadSources: enabled
                ? ['storefront', 'product inquiry', 'cart intent', 'checkout intent', 'chatbot handoff']
                : ['website form', 'chatbot handoff'],
            leadTags: enabled ? leadTags : ['ai-studio', 'general-lead'],
            activityTimelineEvents: enabled
                ? ['product_view', 'add_to_cart', 'checkout_started', 'product_inquiry']
                : ['lead_created'],
            readiness: createAiStudioReadiness([
                'Lead tags and activity events are drafts until CRM automation is reviewed.',
            ]),
            sourceMap: {
                leadTags: 'ecommerceBlueprint.catalogStrategy',
                leadEvents: 'storefrontBlueprint.sections',
            },
            metadata,
        },
        emailMarketingBlueprint: {
            enabled,
            status: enabled ? 'needs_review' : 'draft',
            needsReview: true,
            flows: [
                emailFlow('welcome', 'newsletter_signup', ['Welcome flow needs sender, audience, and copy review.']),
                ...(enabled
                    ? [
                        emailFlow('abandoned_cart', 'cart_abandoned', ['Cart recovery requires customer email, consent, checkout URL, sender, and copy review.']),
                        emailFlow('order_confirmation', 'payment_succeeded', ['Order confirmation sends only after confirmed payment, valid recipient, template, and provider.']),
                        emailFlow('post_purchase', 'purchase_completed', ['Post purchase flow requires fulfillment/audience review before activation.']),
                        emailFlow('refund', 'order_refunded', ['Refund confirmation requires stored refund state and provider readiness.'], 'refund_confirmation'),
                        emailFlow('shipping_confirmation', 'order_fulfilled', ['Shipping confirmation requires stored fulfillment state and provider readiness.'], 'fulfillment_confirmation'),
                        emailFlow('low_stock_merchant_alert', 'low_stock', ['Low stock alerts require explicit inventory tracking and merchant recipient.'], 'low_stock_alert'),
                        emailFlow('product_recommendation', 'product_viewed', ['Product recommendation flow needs catalog/audience review.']),
                        emailFlow('back_in_stock', 'back_in_stock', ['Back-in-stock flow requires customer consent and inventory review.']),
                        emailFlow('merchant_new_order_alert', 'payment_succeeded', ['Merchant new order alert requires merchant recipient and confirmed payment.'], 'merchant_new_order'),
                    ]
                    : []),
            ],
            logEvents: enabled
                ? ['email_flow_queued', 'email_sent', 'cart_abandoned', 'payment_succeeded', 'order_fulfilled', 'order_refunded', 'low_stock']
                : ['email_flow_queued'],
            readiness: createAiStudioReadiness([
                'Email marketing flows are drafts only; no runtime sends are activated.',
            ]),
            sourceMap: {
                flows: 'ecommerceBlueprint.enabled',
                triggers: 'integrationEvents.draft',
            },
            metadata,
        },
    };
}
