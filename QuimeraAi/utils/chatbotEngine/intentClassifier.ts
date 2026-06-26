import type { ChatbotActionType, ChatbotSurface } from '../../types/businessBlueprint';
import { buildChatbotEngineSurfaceContext, type ChatbotEngineSurfaceContextInput } from './surfaceContext.js';

export type ChatbotMessageIntent =
    | 'general_question'
    | 'lead_capture'
    | 'pricing_request'
    | 'appointment_request'
    | 'availability_check'
    | 'product_search'
    | 'product_recommendation'
    | 'product_inquiry'
    | 'back_in_stock_request'
    | 'checkout_intent'
    | 'order_status'
    | 'restaurant_menu_question'
    | 'restaurant_reservation'
    | 'realty_inquiry'
    | 'realty_showing_request'
    | 'open_house_registration'
    | 'email_subscription'
    | 'email_follow_up'
    | 'finance_quote_request'
    | 'human_handoff'
    | 'support_request'
    | 'visual_context'
    | 'unknown';

export type ChatbotIntentUrgency = 'low' | 'medium' | 'high';

export interface ChatbotMessageIntentAnalysis {
    primaryIntent: ChatbotMessageIntent;
    confidence: number;
    urgency: ChatbotIntentUrgency;
    actionType?: ChatbotActionType;
    sourceSurface: ChatbotSurface;
    sourceModule: string;
    matchedSignals: string[];
}

export interface ChatbotMessageIntentInput {
    text: string;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    context?: ChatbotEngineSurfaceContextInput | null;
}

type IntentRule = {
    intent: ChatbotMessageIntent;
    actionType?: ChatbotActionType;
    signals: string[];
    surfaces?: ChatbotSurface[];
    urgency?: ChatbotIntentUrgency;
};

const RULES: IntentRule[] = [
    {
        intent: 'human_handoff',
        actionType: 'handoff_to_human',
        urgency: 'high',
        signals: ['human', 'agent', 'representative', 'person', 'call me', 'talk to someone', 'humano', 'agente', 'representante', 'persona', 'llamame', 'hablar con alguien'],
    },
    {
        intent: 'appointment_request',
        actionType: 'create_appointment',
        urgency: 'high',
        surfaces: ['website', 'booking_page', 'bio_page', 'voice'],
        signals: ['book', 'booking', 'appointment', 'schedule', 'calendar', 'reserve a time', 'cita', 'agendar', 'agenda', 'reservar hora', 'calendario', 'consulta'],
    },
    {
        intent: 'availability_check',
        actionType: 'check_availability',
        urgency: 'medium',
        signals: ['available', 'availability', 'open slot', 'when can', 'que dia', 'disponible', 'disponibilidad', 'cuando pueden', 'horario disponible'],
    },
    {
        intent: 'restaurant_reservation',
        actionType: 'request_restaurant_reservation',
        urgency: 'high',
        surfaces: ['restaurant_menu'],
        signals: ['reserve', 'reservation', 'table', 'party of', 'tonight', 'dinner', 'reservar', 'reserva', 'mesa', 'personas', 'comensales', 'cena'],
    },
    {
        intent: 'restaurant_menu_question',
        actionType: 'answer_from_knowledge',
        urgency: 'medium',
        surfaces: ['restaurant_menu'],
        signals: ['menu', 'dish', 'ingredients', 'allergens', 'vegan', 'spicy', 'plato', 'ingredientes', 'alergenos', 'vegano', 'picante'],
    },
    {
        intent: 'realty_showing_request',
        actionType: 'request_realty_showing',
        urgency: 'high',
        surfaces: ['realty_property_page'],
        signals: ['showing', 'tour', 'visit property', 'see the property', 'visita', 'mostrar propiedad', 'ver propiedad', 'recorrido'],
    },
    {
        intent: 'open_house_registration',
        actionType: 'register_open_house',
        urgency: 'high',
        surfaces: ['realty_property_page'],
        signals: ['open house', 'casa abierta', 'registro open house', 'registrarme'],
    },
    {
        intent: 'realty_inquiry',
        actionType: 'answer_from_knowledge',
        urgency: 'medium',
        surfaces: ['realty_property_page'],
        signals: ['property', 'listing', 'price', 'mortgage', 'neighborhood', 'propiedad', 'listing', 'precio', 'hipoteca', 'vecindario'],
    },
    {
        intent: 'order_status',
        actionType: 'check_order_status',
        urgency: 'medium',
        surfaces: ['storefront', 'checkout'],
        signals: ['order status', 'track order', 'where is my order', 'shipping status', 'estado de orden', 'rastrear orden', 'donde esta mi orden', 'envio'],
    },
    {
        intent: 'checkout_intent',
        actionType: 'start_checkout',
        urgency: 'high',
        surfaces: ['storefront', 'checkout', 'bio_page'],
        signals: ['checkout', 'buy now', 'cart', 'purchase', 'pay', 'comprar', 'carrito', 'pagar', 'checkout'],
    },
    {
        intent: 'product_recommendation',
        actionType: 'recommend_products',
        urgency: 'medium',
        surfaces: ['storefront', 'checkout', 'bio_page'],
        signals: ['recommend', 'best product', 'which one', 'suggest', 'recomienda', 'mejor producto', 'cual me recomiendas', 'sugiere'],
    },
    {
        intent: 'product_search',
        actionType: 'search_products',
        urgency: 'medium',
        surfaces: ['storefront', 'checkout', 'bio_page'],
        signals: ['find', 'search', 'looking for', 'do you have', 'buscar', 'busco', 'tienen', 'producto'],
    },
    {
        intent: 'back_in_stock_request',
        actionType: 'back_in_stock_request',
        urgency: 'medium',
        surfaces: ['storefront', 'bio_page'],
        signals: ['back in stock', 'notify me', 'restock', 'out of stock', 'avisame cuando vuelva', 'avisame cuando este disponible', 'notificame', 'reponer inventario', 'agotado'],
    },
    {
        intent: 'product_inquiry',
        actionType: 'create_product_inquiry',
        urgency: 'high',
        surfaces: ['storefront', 'bio_page'],
        signals: ['more info', 'details', 'is it in stock', 'quote this product', 'mas informacion', 'detalles', 'hay inventario', 'cotizar producto'],
    },
    {
        intent: 'finance_quote_request',
        actionType: 'create_finance_quote_request',
        urgency: 'high',
        signals: ['send invoice', 'invoice me', 'payment request', 'quote request', 'formal quote', 'send estimate', 'enviar factura', 'facturame', 'solicitud de pago', 'cotizacion formal', 'enviar cotizacion', 'enviar estimado'],
    },
    {
        intent: 'pricing_request',
        actionType: 'create_lead',
        urgency: 'high',
        signals: ['price', 'pricing', 'quote', 'cost', 'estimate', 'budget', 'precio', 'cotizacion', 'costo', 'estimado', 'presupuesto'],
    },
    {
        intent: 'email_subscription',
        actionType: 'subscribe_email_audience',
        urgency: 'medium',
        signals: ['subscribe', 'newsletter', 'updates', 'email me', 'suscribir', 'boletin', 'newsletter', 'actualizaciones', 'mandame email'],
    },
    {
        intent: 'email_follow_up',
        actionType: 'queue_email_follow_up',
        urgency: 'medium',
        signals: ['follow up by email', 'send me a follow up', 'email follow up', 'send details by email', 'seguimiento por email', 'enviame seguimiento', 'enviar detalles por email', 'mandame seguimiento'],
    },
    {
        intent: 'visual_context',
        actionType: 'answer_from_knowledge',
        urgency: 'low',
        signals: ['what do i see', 'what is this', 'describe screen', 'analyze page', 'que veo', 'que es esto', 'describe la pantalla', 'analiza la pagina'],
    },
    {
        intent: 'support_request',
        actionType: 'create_support_ticket',
        urgency: 'high',
        signals: ['problem', 'issue', 'broken', 'help', 'support', 'problema', 'no funciona', 'ayuda', 'soporte'],
    },
    {
        intent: 'lead_capture',
        actionType: 'create_lead',
        urgency: 'medium',
        signals: ['contact me', 'call me', 'send info', 'demo', 'contactame', 'llamame', 'enviame informacion', 'demostracion'],
    },
];

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function hasContactSignal(value: string): boolean {
    return /[\w.+-]+@[\w-]+\.[\w.]+/.test(value) || /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(value);
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesSignal(text: string, signal: string): boolean {
    if (!signal) return false;
    const isSingleToken = /^[a-z0-9]+$/.test(signal);
    if (!isSingleToken) return text.includes(signal);
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(signal)}([^a-z0-9]|$)`).test(text);
}

function scoreRule(rule: IntentRule, text: string, surface: ChatbotSurface): { score: number; signals: string[] } {
    const signals = rule.signals.filter(signal => matchesSignal(text, normalizeText(signal)));
    if (signals.length === 0) return { score: 0, signals: [] };
    const surfaceBoost = rule.surfaces?.includes(surface) ? 0.28 : rule.surfaces ? -0.08 : 0;
    const urgencyBoost = rule.urgency === 'high' ? 0.12 : rule.urgency === 'medium' ? 0.06 : 0;
    const score = Math.min(0.98, 0.45 + signals.length * 0.12 + surfaceBoost + urgencyBoost);
    return { score, signals };
}

export function classifyChatbotMessageIntent(input: ChatbotMessageIntentInput): ChatbotMessageIntentAnalysis {
    const context = buildChatbotEngineSurfaceContext({
        ...(input.context || {}),
        sourceSurface: input.sourceSurface || input.context?.sourceSurface,
        sourceModule: input.sourceModule || input.context?.sourceModule,
    });
    const text = normalizeText(input.text || '');

    let best: {
        intent: ChatbotMessageIntent;
        actionType?: ChatbotActionType;
        urgency: ChatbotIntentUrgency;
        confidence: number;
        signals: string[];
    } = {
        intent: text ? 'general_question' : 'unknown',
        urgency: 'low',
        confidence: text ? 0.32 : 0.1,
        signals: [],
    };

    for (const rule of RULES) {
        const result = scoreRule(rule, text, context.sourceSurface);
        if (result.score > best.confidence) {
            best = {
                intent: rule.intent,
                actionType: rule.actionType,
                urgency: rule.urgency || 'medium',
                confidence: result.score,
                signals: result.signals.map(signal => normalizeText(signal)).slice(0, 6),
            };
        }
    }

    if (hasContactSignal(input.text) && best.intent === 'general_question') {
        best = {
            intent: 'lead_capture',
            actionType: 'create_lead',
            urgency: 'medium',
            confidence: 0.72,
            signals: ['contact_info'],
        };
    }

    return {
        primaryIntent: best.intent,
        confidence: Number(best.confidence.toFixed(2)),
        urgency: best.urgency,
        actionType: best.actionType,
        sourceSurface: context.sourceSurface,
        sourceModule: context.sourceModule,
        matchedSignals: best.signals,
    };
}
