/**
 * Types and constants for the Admin Email Hub
 */

import React from 'react';
import {
    Heart, ShoppingCart, Star, RefreshCcw, Gift,
} from 'lucide-react';
import type {
    EmailCampaign, CampaignStatus, EmailAudience,
    EmailAutomation, AutomationType, AutomationStatus,
} from '../../../../types/email';

// =============================================================================
// TYPES
// =============================================================================

export type AdminEmailTab = 'overview' | 'campaigns' | 'audiences' | 'analytics' | 'automations' | 'ai-studio';

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
    category: 'engagement' | 'retention' | 'conversion' | 'lifecycle';
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
    },
];
