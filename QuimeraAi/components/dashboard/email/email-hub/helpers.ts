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
        case 'sent': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        case 'approved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'sending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
        case 'trigger': return 'from-indigo-500 to-purple-600';
        case 'email': return 'from-blue-500 to-cyan-500';
        case 'delay': return 'from-amber-500 to-orange-500';
        case 'condition': return 'from-emerald-500 to-teal-500';
        case 'action': return 'from-pink-500 to-rose-500';
        default: return 'from-gray-500 to-gray-600';
    }
};

export const getNodeBorderColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'border-indigo-500/40';
        case 'email': return 'border-blue-500/40';
        case 'delay': return 'border-amber-500/40';
        case 'condition': return 'border-emerald-500/40';
        case 'action': return 'border-pink-500/40';
        default: return 'border-gray-500/40';
    }
};

export const getNodeBgColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'bg-indigo-500/10';
        case 'email': return 'bg-blue-500/10';
        case 'delay': return 'bg-amber-500/10';
        case 'condition': return 'bg-emerald-500/10';
        case 'action': return 'bg-pink-500/10';
        default: return 'bg-gray-500/10';
    }
};

export const getNodeTextColor = (type: string): string => {
    switch (type) {
        case 'trigger': return 'text-indigo-400';
        case 'email': return 'text-blue-400';
        case 'delay': return 'text-amber-400';
        case 'condition': return 'text-emerald-400';
        case 'action': return 'text-pink-400';
        default: return 'text-gray-400';
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
        case 'lifecycle': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
        case 'conversion': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        case 'engagement': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        case 'retention': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
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
