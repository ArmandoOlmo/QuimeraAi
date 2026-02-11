/**
 * Voice Proxy Client
 * 
 * Client-side utility for interacting with Google Cloud TTS through our secure proxy.
 * This allows the public landing chatbot to use high-quality Google voices
 * without exposing API keys.
 */

const VOICE_PROXY_BASE_URL = 'https://us-central1-quimeraai.cloudfunctions.net';

export interface TTSOptions {
    voiceName?: string;
    speakingRate?: number;
    pitch?: number;
}

export interface VoiceChatOptions {
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    systemPrompt?: string;
    voiceName?: string;
    projectId?: string;
}

export interface TTSResponse {
    audio: string; // base64 encoded MP3
    mimeType: string;
    voice: string;
}

export interface VoiceChatResponse {
    text: string;
    audio: string | null;
    mimeType: string;
    voice: string;
}

/**
 * Convert text to speech using Google Cloud TTS
 */
export async function textToSpeech(text: string, options: TTSOptions = {}): Promise<TTSResponse> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/voice-tts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voiceName: options.voiceName || 'Quibo',
            speakingRate: options.speakingRate || 1.0,
            pitch: options.pitch || 0,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'TTS request failed');
    }

    return response.json();
}

/**
 * Chat with voice - sends message, gets AI response + audio
 */
export async function voiceChat(
    userMessage: string,
    options: VoiceChatOptions = {}
): Promise<VoiceChatResponse> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/voice-chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userMessage,
            conversationHistory: options.conversationHistory || [],
            systemPrompt: options.systemPrompt || '',
            voiceName: options.voiceName || 'Quibo',
            projectId: options.projectId || 'quimera-chat-landing',
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Voice chat request failed');
    }

    return response.json();
}

/**
 * Play audio from base64
 */
export function playBase64Audio(base64Audio: string, mimeType: string = 'audio/mp3'): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const audioData = `data:${mimeType};base64,${base64Audio}`;
            const audio = new Audio(audioData);

            audio.onended = () => resolve();
            audio.onerror = (e) => reject(new Error('Audio playback failed'));

            audio.play().catch(reject);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Play audio from base64 with controls
 */
export function createAudioPlayer(base64Audio: string, mimeType: string = 'audio/mp3'): {
    audio: HTMLAudioElement;
    play: () => Promise<void>;
    pause: () => void;
    stop: () => void;
} {
    const audioData = `data:${mimeType};base64,${base64Audio}`;
    const audio = new Audio(audioData);

    return {
        audio,
        play: () => audio.play(),
        pause: () => audio.pause(),
        stop: () => {
            audio.pause();
            audio.currentTime = 0;
        }
    };
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(audio: HTMLAudioElement): boolean {
    return !audio.paused && !audio.ended && audio.currentTime > 0;
}

// =============================================================================
// ELEVENLABS VOICE CLIENT
// =============================================================================

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category: 'premade' | 'cloned' | 'generated';
    description: string;
    labels: Record<string, string>;
    preview_url: string | null;
    fine_tuning?: any;
}

export interface ElevenLabsTTSResponse {
    audio: string; // base64 encoded MP3
    mimeType: string;
    voiceId: string;
}

export interface CloneVoiceResult {
    voice_id: string;
    name: string;
    success: boolean;
}

/**
 * ElevenLabs Text-to-Speech
 */
export async function elevenlabsTTS(
    text: string,
    voiceId: string,
    options: { modelId?: string; stability?: number; similarity?: number } = {}
): Promise<ElevenLabsTTSResponse> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/elevenlabs-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text,
            voiceId,
            modelId: options.modelId || 'eleven_multilingual_v2',
            stability: options.stability ?? 0.5,
            similarity: options.similarity ?? 0.75,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'ElevenLabs TTS failed');
    }

    return response.json();
}

/**
 * List all ElevenLabs voices (prebuilt + cloned)
 */
export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/elevenlabs-listVoices`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error('Failed to list ElevenLabs voices');
    }

    const data = await response.json();
    return data.voices || [];
}

/**
 * Clone a voice using an audio file (Instant Voice Cloning)
 */
export async function cloneVoice(
    name: string,
    audioBase64: string,
    projectId: string,
    options: {
        description?: string;
        audioFileName?: string;
        audioMimeType?: string;
        userId?: string;
        labels?: Record<string, string>;
    } = {}
): Promise<CloneVoiceResult> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/elevenlabs-cloneVoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            audioBase64,
            projectId,
            description: options.description || '',
            audioFileName: options.audioFileName || 'voice_sample.mp3',
            audioMimeType: options.audioMimeType || 'audio/mpeg',
            userId: options.userId || '',
            labels: options.labels ? JSON.stringify(options.labels) : undefined,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Voice cloning failed');
    }

    return response.json();
}

/**
 * Delete a cloned voice
 */
export async function deleteClonedVoice(voiceId: string, projectId?: string): Promise<void> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/elevenlabs-deleteVoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, projectId }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to delete voice');
    }
}

/**
 * Generate a preview of a voice
 */
export async function previewVoice(voiceId: string, text?: string): Promise<ElevenLabsTTSResponse> {
    const response = await fetch(`${VOICE_PROXY_BASE_URL}/elevenlabs-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Voice preview failed');
    }

    return response.json();
}
