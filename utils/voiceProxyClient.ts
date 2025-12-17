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
