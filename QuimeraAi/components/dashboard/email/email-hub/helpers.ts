/**
 * Helper utilities for the User Email Hub
 * Copied from admin/email-hub/helpers.ts — identical functionality
 */

import React from 'react';
import {
    CheckCircle, Edit2, Clock, Send, Pause, XCircle, Play,
} from 'lucide-react';

// =============================================================================
// DATE / STATUS HELPERS
// =============================================================================

export const formatDate = (dateVal: any): string => {
    if (!dateVal) return '—';
    const date = dateVal.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'sent': return 'bg-q-success/20 text-q-success border-q-success/30';
        case 'draft': return 'bg-q-surface-overlay/20 text-q-text-muted border-q-border/30';
        case 'approved': return 'bg-q-success/20 text-q-success border-q-success/30';
        case 'scheduled': return 'bg-q-accent/20 text-q-accent border-q-accent/30';
        case 'sending': return 'bg-q-accent/20 text-q-accent border-q-accent/30';
        case 'paused': return 'bg-q-accent/20 text-q-accent border-q-accent/30';
        case 'cancelled': return 'bg-q-error/20 text-q-error border-q-error/30';
        case 'active': return 'bg-q-success/20 text-q-success border-q-success/30';
        default: return 'bg-q-surface-overlay/20 text-q-text-muted border-q-border/30';
    }
};

export const getStatusIcon = (status: string) => {
    switch (status) {
        case 'sent': return React.createElement(CheckCircle, { size: 14 });
        case 'draft': return React.createElement(Edit2, { size: 14 });
        case 'approved': return React.createElement(CheckCircle, { size: 14 });
        case 'scheduled': return React.createElement(Clock, { size: 14 });
        case 'sending': return React.createElement(Send, { size: 14 });
        case 'paused': return React.createElement(Pause, { size: 14 });
        case 'cancelled': return React.createElement(XCircle, { size: 14 });
        case 'active': return React.createElement(Play, { size: 14 });
        default: return React.createElement(Clock, { size: 14 });
    }
};

export const formatDelay = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} horas`;
    return `${Math.round(minutes / 1440)} días`;
};

// =============================================================================
// WORKFLOW NODE HELPERS
// =============================================================================

export const getNodeColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'from-q-accent to-q-accent';
        case 'email': return 'from-q-accent to-q-accent';
        case 'delay': return 'from-q-accent to-q-warning';
        case 'condition': return 'from-q-success to-q-success';
        case 'action': return 'from-q-accent to-q-error';
        default: return 'from-q-surface-overlay to-q-surface-overlay';
    }
};

export const getNodeBorderColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'border-q-accent/40';
        case 'email': return 'border-q-accent/40';
        case 'delay': return 'border-q-accent/40';
        case 'condition': return 'border-q-success/40';
        case 'action': return 'border-q-accent/40';
        default: return 'border-q-border/40';
    }
};

export const getNodeBgColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'bg-q-accent/10';
        case 'email': return 'bg-q-accent/10';
        case 'delay': return 'bg-q-accent/10';
        case 'condition': return 'bg-q-success/10';
        case 'action': return 'bg-q-accent/10';
        default: return 'bg-q-surface-overlay/10';
    }
};

export const getNodeTextColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'text-q-accent';
        case 'email': return 'text-q-accent';
        case 'delay': return 'text-q-accent';
        case 'condition': return 'text-q-success';
        case 'action': return 'text-q-accent';
        default: return 'text-q-text-muted';
    }
};

export const formatTriggerEvent = (event: string): string => {
    const map: Record<string, string> = {
        'customer.created': 'Nuevo cliente / suscriptor',
        'cart.abandoned': 'Carrito abandonado',
        'order.delivered': 'Pedido entregado',
        'order.completed': 'Compra completada',
        'customer.inactive': 'Cliente inactivo (30 días)',
        'customer.birthday': 'Cumpleaños del cliente',
        'browse.abandoned': 'Navegación sin conversión',
        'customer.vip-qualified': 'Alcanzó nivel VIP',
        'customer.no-engagement-90d': 'Sin interacción (90 días)',
    };
    return map[event] || event;
};

export const calculateWorkflowDuration = (steps: { type: string; delayConfig?: { delayMinutes: number } }[]): string => {
    let totalMinutes = 0;
    steps.forEach(step => {
        if (step.type === 'delay' && step.delayConfig?.delayMinutes) {
            totalMinutes += step.delayConfig.delayMinutes;
        }
    });
    if (totalMinutes === 0) return 'Instantáneo';
    if (totalMinutes < 60) return `${totalMinutes} minutos`;
    if (totalMinutes < 1440) return `${Math.round(totalMinutes / 60)} horas`;
    if (totalMinutes < 10080) return `${Math.round(totalMinutes / 1440)} días`;
    return `${Math.round(totalMinutes / 10080)} semanas`;
};

export const getCategoryLabel = (category: string): string => {
    switch (category) {
        case 'lifecycle': return 'Ciclo de vida';
        case 'conversion': return 'Conversión';
        case 'engagement': return 'Engagement';
        case 'retention': return 'Retención';
        default: return category;
    }
};

export const getCategoryColor = (category: string): string => {
    switch (category) {
        case 'lifecycle': return 'text-q-accent bg-q-accent/10 border-q-accent/30';
        case 'conversion': return 'text-q-accent bg-q-accent/10 border-q-accent/30';
        case 'engagement': return 'text-q-accent bg-q-accent/10 border-q-accent/30';
        case 'retention': return 'text-q-success bg-q-success/10 border-q-success/30';
        default: return 'text-q-text-muted bg-q-surface-overlay/10 border-q-border/30';
    }
};

// =============================================================================
// AUDIO UTILITIES (for Gemini Live API voice mode)
// =============================================================================

export function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

export function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

export async function decodeAudioData(
    data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
}

export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}
