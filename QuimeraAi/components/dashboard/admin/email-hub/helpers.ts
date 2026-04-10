/**
 * Helper utilities for the Admin Email Hub
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
