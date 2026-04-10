/**
 * Types and constants for the Admin Email Hub
 */

import React from 'react';
import {
    Heart, ShoppingCart, Star, RefreshCcw, Gift,
    Eye, TrendingUp, MessageSquare, Crown, UserMinus,
} from 'lucide-react';
import type {
    EmailCampaign, CampaignStatus, EmailAudience,
    EmailAutomation, AutomationType, AutomationStatus,
    AutomationCategory, AutomationWorkflowStep,
} from '../../../../types/email';

// =============================================================================
// TYPES
// =============================================================================

export type AdminEmailTab = 'overview' | 'campaigns' | 'audiences' | 'analytics' | 'automations' | 'ai-studio';
export type AutomationCategoryFilter = 'all' | AutomationCategory;

export interface CrossTenantCampaign extends EmailCampaign {
    tenantId: string;
    tenantName: string;
    userId: string;
    projectId: string;
}

export interface CrossTenantAudience {
    id: string;
    name: string;
    description?: string;
    estimatedCount: number;
    tenantId: string;
    tenantName: string;
    userId: string;
    projectId: string;
    createdAt: any;
    filters?: any[];
    tags?: string[];
    acceptsMarketing?: boolean;
    hasOrdered?: boolean;
    staticMemberCount?: number;
}

export interface CrossTenantLog {
    id: string;
    status: string;
    sentAt: any;
    opened?: boolean;
    clicked?: boolean;
    recipientEmail?: string;
    subject?: string;
    type?: string;
    tenantId: string;
    tenantName: string;
}

export interface AutomationTemplate {
    id: string;
    name: string;
    description: string;
    type: AutomationType;
    icon: React.ReactNode;
    color: string;
    defaultDelay: number;
    triggerEvent: string;
    category: AutomationCategory;
    defaultSteps: AutomationWorkflowStep[];
}

export interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

export interface AICreatedItem {
    type: 'campaign' | 'audience' | 'automation';
    name: string;
    id: string;
    timestamp: number;
}

export interface AdminEmailHubProps {
    onBack: () => void;
}

export interface EmailStats {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    activeCampaigns: number;
    totalContacts: number;
    totalCampaigns: number;
    totalAudiences: number;
    openRate: string;
    clickRate: string;
    deliveryRate: string;
    bounceRate: string;
}

export interface MonthlyDataPoint {
    month: string;
    sent: number;
    opened: number;
    clicked: number;
}

export interface TenantPerformanceData {
    name: string;
    sent: number;
    opened: number;
    clicked: number;
    campaigns: number;
}

export interface ConfirmModalState {
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const MODEL_TEXT = 'gemini-3-flash-preview';
export const MODEL_VOICE = 'gemini-3.1-flash-live-preview';

// Helper to create default workflow steps for each template
function makeStep(
    id: string, type: AutomationWorkflowStep['type'], label: string, order: number,
    config?: Partial<Pick<AutomationWorkflowStep, 'emailConfig' | 'delayConfig' | 'conditionConfig' | 'actionConfig'>>
): AutomationWorkflowStep {
    return { id, type, label, order, ...config };
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
    {
        id: 'welcome-series',
        name: 'Serie de Bienvenida',
        description: 'Envía automáticamente una secuencia de emails de bienvenida a nuevos suscriptores',
        type: 'welcome',
        icon: React.createElement(Heart, { size: 24 }),
        color: 'text-pink-400 bg-pink-500/10',
        defaultDelay: 0,
        triggerEvent: 'customer.created',
        category: 'lifecycle',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Nuevo suscriptor', 0),
            makeStep('e1', 'email', 'Email de Bienvenida', 1, { emailConfig: { subject: '¡Bienvenido! 🎉' } }),
            makeStep('d1', 'delay', 'Esperar 1 día', 2, { delayConfig: { delayMinutes: 1440, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Primeros Pasos', 3, { emailConfig: { subject: 'Cómo empezar — Guía rápida' } }),
            makeStep('d2', 'delay', 'Esperar 3 días', 4, { delayConfig: { delayMinutes: 4320, delayType: 'fixed' } }),
            makeStep('e3', 'email', 'Tips Profesionales', 5, { emailConfig: { subject: '5 tips para sacar el máximo provecho' } }),
        ],
    },
    {
        id: 'abandoned-cart',
        name: 'Carrito Abandonado',
        description: 'Recupera ventas perdidas enviando recordatorios a quienes dejaron productos en el carrito',
        type: 'abandoned-cart',
        icon: React.createElement(ShoppingCart, { size: 24 }),
        color: 'text-amber-400 bg-amber-500/10',
        defaultDelay: 60,
        triggerEvent: 'cart.abandoned',
        category: 'conversion',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Carrito abandonado', 0),
            makeStep('d1', 'delay', 'Esperar 1 hora', 1, { delayConfig: { delayMinutes: 60, delayType: 'fixed' } }),
            makeStep('e1', 'email', 'Recordatorio suave', 2, { emailConfig: { subject: '¿Olvidaste algo? Tu carrito te espera 🛒' } }),
            makeStep('c1', 'condition', '¿Compró?', 3, { conditionConfig: { conditionType: 'purchase-made' } }),
            makeStep('d2', 'delay', 'Esperar 24 horas', 4, { delayConfig: { delayMinutes: 1440, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Oferta de descuento', 5, { emailConfig: { subject: '¡10% OFF solo para ti! Tu carrito expira pronto ⏰' } }),
        ],
    },
    {
        id: 'post-purchase',
        name: 'Post-Compra',
        description: 'Solicita reseñas y ofrece productos relacionados después de una compra',
        type: 'post-purchase',
        icon: React.createElement(Star, { size: 24 }),
        color: 'text-yellow-400 bg-yellow-500/10',
        defaultDelay: 4320,
        triggerEvent: 'order.delivered',
        category: 'engagement',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Pedido entregado', 0),
            makeStep('d1', 'delay', 'Esperar 3 días', 1, { delayConfig: { delayMinutes: 4320, delayType: 'fixed' } }),
            makeStep('e1', 'email', 'Solicitar reseña', 2, { emailConfig: { subject: '¿Cómo fue tu experiencia? ⭐' } }),
            makeStep('c1', 'condition', '¿Dejó reseña?', 3, { conditionConfig: { conditionType: 'email-clicked' } }),
            makeStep('d2', 'delay', 'Esperar 7 días', 4, { delayConfig: { delayMinutes: 10080, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Productos recomendados', 5, { emailConfig: { subject: 'Te podría gustar esto 🎁' } }),
        ],
    },
    {
        id: 'win-back',
        name: 'Re-Engagement',
        description: 'Recupera clientes inactivos con ofertas especiales y contenido personalizado',
        type: 'win-back',
        icon: React.createElement(RefreshCcw, { size: 24 }),
        color: 'text-blue-400 bg-blue-500/10',
        defaultDelay: 43200,
        triggerEvent: 'customer.inactive',
        category: 'retention',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Cliente inactivo (30 días)', 0),
            makeStep('e1', 'email', 'Te echamos de menos', 1, { emailConfig: { subject: 'Te echamos de menos 💙' } }),
            makeStep('d1', 'delay', 'Esperar 5 días', 2, { delayConfig: { delayMinutes: 7200, delayType: 'fixed' } }),
            makeStep('c1', 'condition', '¿Abrió email?', 3, { conditionConfig: { conditionType: 'email-opened', referenceStepId: 'e1' } }),
            makeStep('e2', 'email', 'Oferta exclusiva', 4, { emailConfig: { subject: '20% OFF exclusivo para ti — ¡Regresa!' } }),
            makeStep('d2', 'delay', 'Esperar 7 días', 5, { delayConfig: { delayMinutes: 10080, delayType: 'fixed' } }),
            makeStep('a1', 'action', 'Marcar como inactivo', 6, { actionConfig: { actionType: 'add-tag', tagName: 'inactive-30d' } }),
        ],
    },
    {
        id: 'birthday',
        name: 'Felicitación de Cumpleaños',
        description: 'Envía felicitaciones y descuentos especiales en el cumpleaños del cliente',
        type: 'birthday',
        icon: React.createElement(Gift, { size: 24 }),
        color: 'text-purple-400 bg-purple-500/10',
        defaultDelay: 0,
        triggerEvent: 'customer.birthday',
        category: 'lifecycle',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Cumpleaños del cliente', 0),
            makeStep('e1', 'email', 'Felicitación + Descuento', 1, { emailConfig: { subject: '¡Feliz Cumpleaños! 🎂 Un regalo especial para ti' } }),
            makeStep('d1', 'delay', 'Esperar 3 días', 2, { delayConfig: { delayMinutes: 4320, delayType: 'fixed' } }),
            makeStep('c1', 'condition', '¿Usó el descuento?', 3, { conditionConfig: { conditionType: 'purchase-made' } }),
            makeStep('e2', 'email', 'Último recordatorio', 4, { emailConfig: { subject: '¡Tu regalo de cumpleaños expira pronto!' } }),
        ],
    },
    {
        id: 'browse-abandonment',
        name: 'Abandono de Navegación',
        description: 'Recupera visitantes que navegaron productos pero no añadieron al carrito',
        type: 'browse-abandonment',
        icon: React.createElement(Eye, { size: 24 }),
        color: 'text-cyan-400 bg-cyan-500/10',
        defaultDelay: 120,
        triggerEvent: 'browse.abandoned',
        category: 'conversion',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Navegó sin añadir al carrito', 0),
            makeStep('d1', 'delay', 'Esperar 2 horas', 1, { delayConfig: { delayMinutes: 120, delayType: 'fixed' } }),
            makeStep('e1', 'email', 'Productos que te interesaron', 2, { emailConfig: { subject: '¿Encontraste lo que buscabas? 👀' } }),
            makeStep('c1', 'condition', '¿Visitó de nuevo?', 3, { conditionConfig: { conditionType: 'email-clicked' } }),
            makeStep('d2', 'delay', 'Esperar 2 días', 4, { delayConfig: { delayMinutes: 2880, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Recomendaciones personalizadas', 5, { emailConfig: { subject: 'Selección especial para ti ✨' } }),
        ],
    },
    {
        id: 'upsell',
        name: 'Upsell / Cross-sell',
        description: 'Sugiere productos complementarios o upgrades después de una compra',
        type: 'upsell',
        icon: React.createElement(TrendingUp, { size: 24 }),
        color: 'text-emerald-400 bg-emerald-500/10',
        defaultDelay: 10080,
        triggerEvent: 'order.completed',
        category: 'conversion',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Compra completada', 0),
            makeStep('d1', 'delay', 'Esperar 7 días', 1, { delayConfig: { delayMinutes: 10080, delayType: 'fixed' } }),
            makeStep('e1', 'email', 'Productos complementarios', 2, { emailConfig: { subject: 'Complementa tu compra 🎯' } }),
            makeStep('c1', 'condition', '¿Hizo clic?', 3, { conditionConfig: { conditionType: 'email-clicked', referenceStepId: 'e1' } }),
            makeStep('d2', 'delay', 'Esperar 3 días', 4, { delayConfig: { delayMinutes: 4320, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Oferta especial upgrade', 5, { emailConfig: { subject: 'Upgrade exclusivo con 15% OFF 🚀' } }),
        ],
    },
    {
        id: 'review-request',
        name: 'Solicitud de Reseña',
        description: 'Solicita reseñas de productos con un flujo inteligente de seguimiento',
        type: 'review-request',
        icon: React.createElement(MessageSquare, { size: 24 }),
        color: 'text-orange-400 bg-orange-500/10',
        defaultDelay: 7200,
        triggerEvent: 'order.delivered',
        category: 'engagement',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Pedido entregado', 0),
            makeStep('d1', 'delay', 'Esperar 5 días', 1, { delayConfig: { delayMinutes: 7200, delayType: 'fixed' } }),
            makeStep('e1', 'email', 'Solicitar reseña', 2, { emailConfig: { subject: '¿Nos das tu opinión? ⭐' } }),
            makeStep('c1', 'condition', '¿Dejó reseña?', 3, { conditionConfig: { conditionType: 'email-clicked', referenceStepId: 'e1' } }),
            makeStep('d2', 'delay', 'Esperar 5 días', 4, { delayConfig: { delayMinutes: 7200, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Recordatorio amigable', 5, { emailConfig: { subject: 'Tu opinión es importante para nosotros 💬' } }),
            makeStep('a1', 'action', 'Etiquetar como solicitado', 6, { actionConfig: { actionType: 'add-tag', tagName: 'review-requested' } }),
        ],
    },
    {
        id: 'vip-reward',
        name: 'Recompensa VIP',
        description: 'Recompensa a tus mejores clientes con beneficios exclusivos automáticos',
        type: 'vip-reward',
        icon: React.createElement(Crown, { size: 24 }),
        color: 'text-yellow-300 bg-yellow-500/10',
        defaultDelay: 0,
        triggerEvent: 'customer.vip-qualified',
        category: 'retention',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Cliente alcanza nivel VIP', 0),
            makeStep('e1', 'email', 'Bienvenida VIP', 1, { emailConfig: { subject: '¡Bienvenido al Club VIP! 👑' } }),
            makeStep('a1', 'action', 'Añadir etiqueta VIP', 2, { actionConfig: { actionType: 'add-tag', tagName: 'vip' } }),
            makeStep('d1', 'delay', 'Esperar 7 días', 3, { delayConfig: { delayMinutes: 10080, delayType: 'fixed' } }),
            makeStep('e2', 'email', 'Beneficios exclusivos', 4, { emailConfig: { subject: 'Tus beneficios VIP exclusivos 💎' } }),
        ],
    },
    {
        id: 'sunset',
        name: 'Sunset (Limpieza)',
        description: 'Identifica y limpia suscriptores inactivos para mejorar la entregabilidad',
        type: 'sunset',
        icon: React.createElement(UserMinus, { size: 24 }),
        color: 'text-gray-400 bg-gray-500/10',
        defaultDelay: 129600,
        triggerEvent: 'customer.no-engagement-90d',
        category: 'retention',
        defaultSteps: [
            makeStep('t1', 'trigger', 'Sin interacción en 90 días', 0),
            makeStep('e1', 'email', 'Último intento', 1, { emailConfig: { subject: '¿Sigues ahí? Última oportunidad 🔔' } }),
            makeStep('d1', 'delay', 'Esperar 7 días', 2, { delayConfig: { delayMinutes: 10080, delayType: 'fixed' } }),
            makeStep('c1', 'condition', '¿Abrió email?', 3, { conditionConfig: { conditionType: 'email-opened', referenceStepId: 'e1' } }),
            makeStep('e2', 'email', 'Confirmación de baja', 4, { emailConfig: { subject: 'Te daremos de baja pronto — haz clic si quieres seguir' } }),
            makeStep('d2', 'delay', 'Esperar 5 días', 5, { delayConfig: { delayMinutes: 7200, delayType: 'fixed' } }),
            makeStep('a1', 'action', 'Desuscribir', 6, { actionConfig: { actionType: 'remove-tag', tagName: 'subscribed' } }),
        ],
    },
];

