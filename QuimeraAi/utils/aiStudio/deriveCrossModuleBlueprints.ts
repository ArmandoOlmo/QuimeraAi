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

function bi(es: string, en: string): string {
    return `ES: ${es}\nEN: ${en}`;
}

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
        bi(
            'Políticas de tienda en borrador: pagos, impuestos, envíos, devoluciones y recogido deben revisarse.',
            'Draft store policies: payment, tax, shipping, returns, and pickup rules must be reviewed.',
        ),
        bi(
            'FAQ de productos en borrador: responder categorías, disponibilidad e inquiries solo desde catálogo revisado.',
            'Draft product FAQ: answer category, availability, and product inquiry questions only from reviewed catalog data.',
        ),
    ];

    if (ecommerceBlueprint.giftCardsEnabled) drafts.push(bi(
        'FAQ de gift cards en borrador: redención, entrega y expiración necesitan aprobación del comercio.',
        'Draft gift card FAQ: redemption, delivery, and expiration rules need merchant approval.',
    ));
    if (signals.includes('restaurant')) drafts.push(bi(
        'Contexto de restaurante: reservas, menú, catering, tickets de eventos y gift cards deben revisarse por el restaurante.',
        'Restaurant context: reservations, menu, catering, event tickets, and gift cards should be reviewed by the restaurant.',
    ));
    if (signals.includes('real-estate')) drafts.push(bi(
        'Contexto real estate: guías de compradores/vendedores, consultas y captura de leads deben ser informativas hasta revisión.',
        'Real estate context: buyer guides, seller guides, consultations, and lead capture should stay informational until reviewed.',
    ));
    if (signals.includes('services')) drafts.push(bi(
        'Contexto de citas: consultas pagadas, paquetes, depósitos y add-ons requieren revisión de disponibilidad del servicio.',
        'Appointments context: paid consultations, packages, deposits, and add-ons require service availability review.',
    ));

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
    const categoryKnowledge = ecommerceBlueprint.productCategories.map(category => bi(
        `Borrador de categoría: ${category}`,
        `Category draft: ${category}`,
    ));
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

    return {
        chatbotBlueprint: {
            enabled,
            status: enabled ? 'needs_review' : 'draft',
            needsReview: true,
            businessKnowledge: businessKnowledge(input),
            productKnowledge: enabled
                ? [
                    ...categoryKnowledge,
                    ...ecommerceBlueprint.starterProducts.map(product => bi(
                        `Producto en borrador: ${product.name}`,
                        `Draft product: ${product.name}`,
                    )),
                ]
                : [],
            policyKnowledge: enabled
                ? [
                    bi('Política de envío en borrador', 'Draft shipping policy'),
                    bi('Política de devoluciones en borrador', 'Draft returns policy'),
                    bi('Política de pago en borrador', 'Draft payment policy'),
                    bi('Política de gift cards en borrador', 'Draft gift card policy'),
                ]
                : [],
            eventIntents: enabled ? ECOMMERCE_EVENTS : ['lead_created'],
            contextDrafts: contextDrafts(input, ecommerceBlueprint),
            readiness: createAiStudioReadiness([
                bi(
                    'El conocimiento ecommerce del chatbot es solo borrador y no debe responder desde datos de producto sin revisar.',
                    'Chatbot ecommerce knowledge is draft-only and should not answer from unreviewed product data.',
                ),
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
                { type: 'welcome', status: 'draft', triggerEvent: 'newsletter_signup' },
                ...(enabled
                    ? [
                        { type: 'abandoned_cart', status: 'draft' as const, triggerEvent: 'cart_abandoned' },
                        { type: 'order_confirmation', status: 'draft' as const, triggerEvent: 'order_created' },
                        { type: 'post_purchase', status: 'draft' as const, triggerEvent: 'purchase_completed' },
                        { type: 'product_recommendation', status: 'draft' as const, triggerEvent: 'product_viewed' },
                        { type: 'back_in_stock', status: 'draft' as const, triggerEvent: 'inventory_back_in_stock' },
                        { type: 'merchant_new_order_alert', status: 'draft' as const, triggerEvent: 'order_created' },
                    ]
                    : []),
            ],
            logEvents: enabled
                ? ['email_flow_queued', 'email_sent', 'cart_abandoned', 'order_created']
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
