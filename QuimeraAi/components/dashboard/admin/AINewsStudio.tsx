/**
 * AINewsStudio
 * 
 * Conversational AI News Assistant for Super Admin.
 * Adapted from AIContentStudio for the News module (/admin/news).
 * Features:
 * - Multi-turn text chat (gemini-3-flash-preview)
 * - Real-time voice via Gemini Live API (gemini-3.1-flash-live-preview)
 * - Deep platform context awareness
 * - News planning panel with generation
 * - Generates NewsItem-compatible content (not AppArticle)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
    X, Sparkles, Send, Mic, MicOff, Loader2,
    ArrowRight, CheckCircle, FileText, Settings2,
    Volume2, VolumeX, RefreshCcw, PhoneOff,
    ChevronDown, Zap, AlertTriangle, Newspaper
} from 'lucide-react';
import ConfirmationModal from '../../ui/ConfirmationModal';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../../utils/geminiProxyClient';
import {
    loadDynamicPlatformContext,
    buildNewsStudioSystemPrompt,
    buildNewsGenerationPrompt,
    type DynamicPlatformContext,
} from '../../../utils/platformKnowledge';
import {
    NewsItem,
    NewsCategory,
    NEWS_CATEGORY_LABELS,
} from '../../../types/news';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useNews } from '../../../contexts/news';
import { sanitizeHtml } from '../../../utils/sanitize';
import { logApiCall } from '../../../services/apiLoggingService';

// =============================================================================
// AUDIO UTILITIES (mirrored from ChatCore for Live API)
// =============================================================================

function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

async function decodeAudioData(
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

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

// =============================================================================
// TYPES
// =============================================================================

interface AINewsStudioProps {
    onClose: () => void;
    onNewsCreated: (news: NewsItem) => void;
}

interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

type StudioPhase = 'conversation' | 'generating' | 'preview';

const NEWS_CATEGORY_OPTIONS: { value: NewsCategory; label: string }[] = [
    { value: 'update', label: 'Actualización' },
    { value: 'feature', label: 'Nueva Función' },
    { value: 'tip', label: 'Tip' },
    { value: 'announcement', label: 'Anuncio' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'promotion', label: 'Promoción' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'other', label: 'Otro' },
];

const TONE_OPTIONS = [
    'Profesional', 'Amigable', 'Persuasivo', 'Informativo', 'Inspirador', 'Urgente'
];

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';

// =============================================================================
// COMPONENT
// =============================================================================

const AINewsStudio: React.FC<AINewsStudioProps> = ({ onClose, onNewsCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { createNews, newsItems } = useNews();

    // --------------- Conversation State ---------------
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [phase, setPhase] = useState<StudioPhase>('conversation');

    // --------------- News Plan State ---------------
    const [category, setCategory] = useState<NewsCategory>('update');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [language, setLanguage] = useState<'es' | 'en'>('es');

    // --------------- Generated News State ---------------
    const [generatedNews, setGeneratedNews] = useState<Partial<NewsItem> | null>(null);
    const [isSavingNews, setIsSavingNews] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

    // --------------- Voice State ---------------
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');

    // --------------- Context State ---------------
    const [platformContext, setPlatformContext] = useState<DynamicPlatformContext | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // --------------- Refs ---------------
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const historyRef = useRef<ChatMessage[]>([]);
    // Voice refs
    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isConnectedRef = useRef(false);
    const nextStartTimeRef = useRef(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const voiceTranscriptRef = useRef<string>('');
    const currentModelResponseRef = useRef<string>('');
    const currentUserTranscriptRef = useRef<string>('');

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    useEffect(() => {
        const init = async () => {
            // Pass existing news titles to avoid duplication
            const existingTitles = newsItems.map(n => ({ title: n.title }));
            const ctx = await loadDynamicPlatformContext(existingTitles);
            setPlatformContext(ctx);

            const welcomeText = language === 'es'
                ? `¡Hola! 👋 Soy tu **Estratega de Noticias AI** para ${ctx.appName}.\n\nConozco al detalle cada feature y capacidad de la plataforma. Puedo ayudarte a:\n\n- 📰 **Planificar** noticias, anuncios y novedades\n- 🎯 **Definir** audiencia objetivo y categoría\n- 💡 **Sugerir** temas de actualización relevantes\n- ✍️ **Generar** noticias completas para el dashboard\n\n¿Qué noticia o anuncio necesitas crear hoy?`
                : `Hello! 👋 I'm your **AI News Strategist** for ${ctx.appName}.\n\nI know every feature and capability of the platform in detail. I can help you:\n\n- 📰 **Plan** news, announcements, and updates\n- 🎯 **Define** target audience and category\n- 💡 **Suggest** relevant update topics\n- ✍️ **Generate** complete dashboard news items\n\nWhat news or announcement do you need to create today?`;

            const welcomeMsg: DisplayMessage = {
                role: 'model',
                text: welcomeText,
                timestamp: Date.now(),
            };
            setMessages([welcomeMsg]);

            const platformContextMessage = buildNewsStudioSystemPrompt(ctx, language);
            historyRef.current = [
                { role: 'user', text: `[CONTEXT] ${platformContextMessage}` },
                { role: 'model', text: welcomeText },
            ];
        };
        init();
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    // =============================================================================
    // TEXT CHAT — MULTI-TURN VIA PROXY
    // =============================================================================

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isThinking || !platformContext) return;

        const userMsg: DisplayMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsThinking(true);

        historyRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildNewsStudioSystemPrompt(platformContext, language);

            const conversationContext = historyRef.current
                .slice(1)
                .slice(0, -1)
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const enrichedPrompt = `${systemPrompt}\n\n${conversationContext ? `--- CONVERSACIÓN PREVIA ---\n${conversationContext}\n--- FIN CONVERSACIÓN ---\n\n` : ''}Usuario: ${text.trim()}`;

            const response = await generateChatContentViaProxy(
                'ai-news-studio',
                [],
                enrichedPrompt,
                systemPrompt,
                MODEL_TEXT,
                { temperature: 1.0, thinkingLevel: 'medium', maxOutputTokens: 4096 },
                user?.uid
            );

            const responseText = extractTextFromResponse(response);

            if (responseText) {
                const aiMsg: DisplayMessage = { role: 'model', text: responseText, timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
                historyRef.current.push({ role: 'model', text: responseText });
            }

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-news-studio',
                model: MODEL_TEXT,
                feature: 'news-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[AINewsStudio] Chat error:', error);
            const errorMsg: DisplayMessage = {
                role: 'model',
                text: language === 'es'
                    ? '⚠️ Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
                    : '⚠️ There was an error processing your message. Please try again.',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-news-studio',
                model: MODEL_TEXT,
                feature: 'news-studio-chat',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        } finally {
            setIsThinking(false);
        }
    }, [isThinking, platformContext, language, user]);

    const handleSendClick = () => {
        sendMessage(inputText);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputText);
        }
    };

    // =============================================================================
    // VOICE MODE — GEMINI LIVE API
    // =============================================================================

    const startVoiceSession = async () => {
        if (!platformContext) return;
        setIsVoiceConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioCtx({ sampleRate: 24000 });
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const systemPrompt = buildNewsStudioSystemPrompt(platformContext, language);

            let resolvedSession: any = null;
            let audioSendCount = 0;

            const session = await ai.live.connect({
                model: MODEL_VOICE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction: systemPrompt,
                    contextWindowCompression: { slidingWindow: {} },
                    sessionResumption: {},
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log('[Voice] ✅ Session opened');
                        setIsVoiceConnecting(false);
                        setIsVoiceActive(true);
                        isConnectedRef.current = true;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        const msgKeys = Object.keys(msg);
                        if (!msgKeys.includes('sessionResumptionUpdate')) {
                            console.log('[Voice] 📩 Message:', msgKeys, JSON.stringify(msg).substring(0, 300));
                        }

                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) { } });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }

                        const inputTranscript = msg.serverContent?.inputTranscription?.text
                            || msg.serverContent?.inputTranscript
                            || msg.inputTranscript;
                        const outputTranscript = msg.serverContent?.outputTranscription?.text
                            || msg.serverContent?.outputTranscript
                            || msg.outputTranscript;

                        if (inputTranscript) {
                            console.log('[Voice] 🎤 User:', inputTranscript);
                            currentUserTranscriptRef.current += inputTranscript;
                            setLiveUserTranscript(currentUserTranscriptRef.current);
                        }
                        if (outputTranscript) {
                            console.log('[Voice] 🔊 AI:', outputTranscript);
                            currentModelResponseRef.current += outputTranscript;
                            setLiveModelTranscript(currentModelResponseRef.current);
                        }

                        const turnComplete = msg.serverContent?.turnComplete
                            || msg.serverContent?.generationComplete
                            || msg.turnComplete;
                        if (turnComplete) {
                            console.log('[Voice] ✅ Turn complete');
                            if (currentUserTranscriptRef.current.trim()) {
                                const userText = currentUserTranscriptRef.current.trim();
                                setMessages(prev => [...prev, { role: 'user', text: userText, isVoice: true, timestamp: Date.now() }]);
                                historyRef.current.push({ role: 'user', text: userText });
                                currentUserTranscriptRef.current = '';
                                setLiveUserTranscript('');
                            }
                            if (currentModelResponseRef.current.trim()) {
                                const modelText = currentModelResponseRef.current.trim();
                                setMessages(prev => [...prev, { role: 'model', text: modelText, isVoice: true, timestamp: Date.now() }]);
                                historyRef.current.push({ role: 'model', text: modelText });
                                currentModelResponseRef.current = '';
                                setLiveModelTranscript('');
                            }
                        }

                        // Handle audio output
                        const modelParts = message.serverContent?.modelTurn?.parts;
                        const audioData = modelParts?.[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current) {
                            const ctx = audioContextRef.current;
                            const bytes = base64ToBytes(audioData);
                            const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = buffer;
                            source.connect(ctx.destination);
                            const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            source.start(startTime);
                            nextStartTimeRef.current = startTime + buffer.duration;
                            activeSourcesRef.current.push(source);
                            source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source); };
                        }
                    },
                    onclose: () => stopVoiceSession(),
                    onerror: (e: any) => { console.error('[Voice] ❌ Error:', e); }
                }
            });

            resolvedSession = session;
            sessionRef.current = session;
            console.log('[Voice] 🔗 Session resolved, setting up microphone...');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                console.log('[Voice] 🎙️ Microphone access granted');

                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;

                processor.onaudioprocess = (e) => {
                    if (!isConnectedRef.current || !resolvedSession) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64Data = bytesToBase64(new Uint8Array(pcm16));
                    try {
                        resolvedSession.sendRealtimeInput({
                            audio: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                        });
                        audioSendCount++;
                        if (audioSendCount % 50 === 0) {
                            console.log(`[Voice] 📤 Audio chunks sent: ${audioSendCount}`);
                        }
                    } catch (err) {
                        console.warn('[Voice] Audio send error:', err);
                    }
                };

                source.connect(processor);
                processor.connect(inputCtx.destination);
                console.log('[Voice] ✅ Audio pipeline ready — speak now!');
            } catch (micErr) {
                console.error('[Voice] 🎙️ Microphone error:', micErr);
                stopVoiceSession();
                setErrorModal({
                    open: true,
                    title: language === 'es' ? 'Error de micrófono' : 'Microphone Error',
                    message: language === 'es'
                        ? 'No se pudo acceder al micrófono. Permite el acceso y recarga la página.'
                        : 'Could not access microphone. Please allow access and reload.',
                });
            }
        } catch (error) {
            console.error('[AINewsStudio] Voice session error:', error);
            setIsVoiceConnecting(false);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error de voz' : 'Voice Error',
                message: language === 'es' ? 'Error al iniciar sesión de voz.' : 'Error starting voice session.',
            });
        }
    };

    const stopVoiceSession = () => {
        isConnectedRef.current = false;
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
        if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => { }); inputAudioContextRef.current = null; }
        activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) { } });
        activeSourcesRef.current = [];
        if (sessionRef.current) {
            try { sessionRef.current.close?.(); } catch (_e) { }
            sessionRef.current = null;
        }
        setLiveUserTranscript('');
        setLiveModelTranscript('');
        currentUserTranscriptRef.current = '';
        currentModelResponseRef.current = '';
        setIsVoiceActive(false);
        setIsVoiceConnecting(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopVoiceSession(); };
    }, []);

    // =============================================================================
    // NEWS GENERATION
    // =============================================================================

    const handleGenerate = async () => {
        if (!platformContext) return;
        setPhase('generating');

        try {
            const conversationSummary = historyRef.current
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const generationPrompt = buildNewsGenerationPrompt({
                conversationSummary,
                category,
                audience: audience || (language === 'es' ? 'Todos los usuarios' : 'All users'),
                tone,
                language,
            });

            const systemPrompt = buildNewsStudioSystemPrompt(platformContext, language);

            const response = await generateChatContentViaProxy(
                'ai-news-studio',
                [],
                generationPrompt,
                systemPrompt,
                MODEL_TEXT,
                { temperature: 1.0, thinkingLevel: 'high', maxOutputTokens: 16384 },
                user?.uid
            );

            const responseText = extractTextFromResponse(response);
            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) {
                cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            let parsedData = JSON.parse(cleanedText);
            if (Array.isArray(parsedData)) parsedData = parsedData[0];
            if (!parsedData || typeof parsedData !== 'object') throw new Error('Invalid response');

            setGeneratedNews({ ...parsedData, category });
            setPhase('preview');

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-news-studio',
                model: MODEL_TEXT,
                feature: 'news-studio-generate',
                success: true,
            });
        } catch (error) {
            console.error('[AINewsStudio] Generation error:', error);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error de generación' : 'Generation Error',
                message: language === 'es'
                    ? 'Error al generar la noticia. Por favor intenta de nuevo.'
                    : 'Error generating news. Please try again.',
            });
            setPhase('conversation');

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-news-studio',
                model: MODEL_TEXT,
                feature: 'news-studio-generate',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        }
    };

    const handleConfirmNews = async () => {
        if (!generatedNews || !user) {
            console.warn('[AINewsStudio] Cannot confirm: missing news or user');
            return;
        }

        setIsSavingNews(true);
        try {
            console.log('[AINewsStudio] Saving generated news...');

            const newsData: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'> = {
                title: String(generatedNews.title || 'Untitled News'),
                excerpt: String(generatedNews.excerpt || '').slice(0, 200),
                body: String(generatedNews.body || '<p>AI generated news content</p>'),
                category: generatedNews.category || category,
                tags: Array.isArray(generatedNews.tags) ? generatedNews.tags.map(String) : [],
                status: 'draft',
                featured: generatedNews.featured || false,
                priority: typeof generatedNews.priority === 'number' ? generatedNews.priority : 0,
                targeting: { type: 'all' },
                createdBy: user.uid,
            };

            console.log('[AINewsStudio] News data built:', newsData.title);
            const newId = await createNews(newsData);
            console.log('[AINewsStudio] ✅ News saved to Firestore with ID:', newId);

            const savedNewsItem: NewsItem = {
                ...newsData,
                id: newId,
                views: 0,
                clicks: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            setIsSavingNews(false);
            onNewsCreated(savedNewsItem);
        } catch (error) {
            console.error('[AINewsStudio] Save error:', error);
            setIsSavingNews(false);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error al guardar' : 'Save Error',
                message: language === 'es'
                    ? 'No se pudo guardar la noticia: ' + (error instanceof Error ? error.message : 'Error desconocido')
                    : 'Could not save the news: ' + (error instanceof Error ? error.message : 'Unknown error'),
            });
        }
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-editor-bg border border-editor-border w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

                {/* ===== HEADER ===== */}
                <div className="p-4 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                                <Newspaper className="text-white w-5 h-5" />
                            </div>
                            {isVoiceActive && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-editor-bg animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                                AI News Studio
                                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                    {isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}
                                </span>
                            </h2>
                            <p className="text-xs text-editor-text-secondary">
                                {isVoiceActive
                                    ? (language === 'es' ? '🎤 Sesión de voz activa — habla naturalmente' : '🎤 Voice session active — speak naturally')
                                    : (language === 'es' ? 'Planifica y genera noticias con IA' : 'Plan and generate news with AI')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 transition-colors"
                            title={t('common.settings', 'Configuración')}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { stopVoiceSession(); onClose(); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-editor-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ===== BODY ===== */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ===== LEFT: CONVERSATION PANEL ===== */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Messages */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-md'
                                        : 'bg-[#1b1e2e] border border-blue-500/15 text-gray-100 rounded-bl-md'
                                        }`}>
                                        {msg.isVoice && (
                                            <span className="inline-flex items-center gap-1 text-[10px] opacity-60 mb-1">
                                                <Volume2 className="w-3 h-3" /> {language === 'es' ? 'Voz' : 'Voice'}
                                            </span>
                                        )}
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-100">{children}</p>,
                                                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-200">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-200">{children}</ol>,
                                                li: ({ children }) => <li className="leading-relaxed text-gray-200">{children}</li>,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}

                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-editor-panel-bg border border-editor-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-editor-text-secondary">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                        {language === 'es' ? 'Pensando...' : 'Thinking...'}
                                    </div>
                                </div>
                            )}

                            {/* Live Voice Transcription */}
                            {isVoiceActive && liveUserTranscript && (
                                <div className="flex justify-end animate-pulse">
                                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-blue-500/20 border border-blue-500/30 text-blue-200">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 mb-1">
                                            <Mic className="w-3 h-3" /> {language === 'es' ? 'Hablando...' : 'Speaking...'}
                                        </span>
                                        <p className="text-gray-100">{liveUserTranscript}</p>
                                    </div>
                                </div>
                            )}
                            {isVoiceActive && liveModelTranscript && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1b1e2e] border border-cyan-500/20 text-gray-100">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-cyan-400 mb-1">
                                            <Volume2 className="w-3 h-3" /> {language === 'es' ? 'Respondiendo...' : 'Responding...'}
                                        </span>
                                        <p className="text-gray-100">{liveModelTranscript}</p>
                                    </div>
                                </div>
                            )}

                            {/* Generating State */}
                            {phase === 'generating' && (
                                <div className="flex justify-center py-8">
                                    <div className="text-center space-y-4">
                                        <div className="relative mx-auto w-16 h-16">
                                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse" />
                                            <Loader2 className="w-16 h-16 text-blue-400 animate-spin relative z-10" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-editor-text-primary">
                                                {language === 'es' ? 'Generando noticia...' : 'Generating news...'}
                                            </p>
                                            <p className="text-xs text-editor-text-secondary mt-1">
                                                {language === 'es'
                                                    ? 'Usando pensamiento profundo (thinkingLevel: high)'
                                                    : 'Using deep thinking (thinkingLevel: high)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview State */}
                            {phase === 'preview' && generatedNews && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-green-400">
                                                {language === 'es' ? '¡Noticia generada con éxito!' : 'News generated successfully!'}
                                            </p>
                                            <p className="text-xs text-green-400/70">
                                                {language === 'es' ? 'Revisa antes de abrir en el editor.' : 'Review before opening in editor.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-5 space-y-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
                                                {t('contentManagement.editor.title', 'Título')}
                                            </span>
                                            <h3 className="text-xl font-bold text-editor-text-primary mt-1">
                                                {generatedNews.title || 'Sin título'}
                                            </h3>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-blue-500/15 text-blue-300 rounded-full">
                                                {NEWS_CATEGORY_LABELS[generatedNews.category as NewsCategory] || generatedNews.category || category}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
                                                {language === 'es' ? 'Extracto' : 'Excerpt'}
                                            </span>
                                            <p className="text-editor-text-secondary text-sm mt-1">
                                                {generatedNews.excerpt || '—'}
                                            </p>
                                        </div>

                                        {generatedNews.tags && generatedNews.tags.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">Tags</span>
                                                <div className="flex gap-2 flex-wrap mt-1">
                                                    {generatedNews.tags.map((tag, i) => (
                                                        <span key={i} className="px-2 py-0.5 text-xs bg-editor-border/30 text-editor-text-secondary rounded-full">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
                                                {language === 'es' ? 'Vista previa' : 'Preview'}
                                            </span>
                                            <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6 bg-editor-bg/50 p-4 rounded-lg border border-editor-border/50 mt-1 overflow-hidden text-sm">
                                                {generatedNews.body ? (
                                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedNews.body) }} />
                                                ) : (
                                                    <p className="text-editor-text-secondary italic">No content</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between">
                                        <button
                                            onClick={() => setPhase('conversation')}
                                            className="text-editor-text-secondary hover:text-editor-text-primary font-medium px-4 py-2 transition-colors text-sm"
                                        >
                                            {language === 'es' ? '← Seguir conversando' : '← Continue conversation'}
                                        </button>
                                        <button
                                            onClick={handleConfirmNews}
                                            disabled={isSavingNews}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isSavingNews ? (
                                                <><Loader2 size={16} className="animate-spin" /> {language === 'es' ? 'Guardando...' : 'Saving...'}</>
                                            ) : (
                                                <>{language === 'es' ? 'Abrir en Editor' : 'Open in Editor'} <ArrowRight size={16} /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Bar */}
                        {phase === 'conversation' && (
                            <div className="p-3 border-t border-editor-border bg-editor-panel-bg/50">
                                <div className="flex items-end gap-2">
                                    {/* Voice Toggle */}
                                    {isVoiceActive ? (
                                        <button
                                            onClick={stopVoiceSession}
                                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                            title={language === 'es' ? 'Detener voz' : 'Stop voice'}
                                        >
                                            <PhoneOff className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startVoiceSession}
                                            disabled={isVoiceConnecting}
                                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-editor-border/40 text-editor-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                                            title={language === 'es' ? 'Iniciar voz (Gemini Live)' : 'Start voice (Gemini Live)'}
                                        >
                                            {isVoiceConnecting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Mic className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}

                                    {/* Text Input */}
                                    <textarea
                                        ref={inputRef}
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isVoiceActive
                                            ? (language === 'es' ? 'Sesión de voz activa — habla o escribe...' : 'Voice session active — speak or type...')
                                            : (language === 'es' ? 'Describe la noticia que quieres crear...' : 'Describe the news you want to create...')}
                                        className="flex-1 bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[40px] max-h-[120px] text-editor-text-primary placeholder:text-editor-text-secondary/50"
                                        rows={1}
                                        disabled={phase !== 'conversation'}
                                    />

                                    {/* Send */}
                                    <button
                                        onClick={handleSendClick}
                                        disabled={!inputText.trim() || isThinking}
                                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Voice Active Indicator */}
                                {isVoiceActive && (
                                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            {language === 'es' ? 'Escuchando...' : 'Listening...'}
                                        </span>
                                        <span className="text-editor-text-secondary">•</span>
                                        <span className="text-editor-text-secondary font-mono">
                                            {MODEL_VOICE.split('-').slice(1).join('-')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ===== RIGHT: NEWS PLAN PANEL ===== */}
                    <div className="w-72 border-l border-editor-border bg-editor-panel-bg/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">

                        {/* News Parameters */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Newspaper className="w-4 h-4 text-blue-400" />
                                <h3 className="text-sm font-bold text-editor-text-primary">
                                    {language === 'es' ? 'Plan de Noticia' : 'News Plan'}
                                </h3>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Categoría' : 'Category'}
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {NEWS_CATEGORY_OPTIONS.map((cat) => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setCategory(cat.value)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat.value
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                : 'bg-editor-bg/50 text-editor-text-secondary border border-editor-border/50 hover:border-blue-500/30'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Idioma' : 'Language'}
                                </label>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setLanguage('es')}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'es'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-editor-bg/50 text-editor-text-secondary border border-editor-border/50 hover:border-blue-500/30'
                                            }`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'en'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-editor-bg/50 text-editor-text-secondary border border-editor-border/50 hover:border-blue-500/30'
                                            }`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            </div>

                            {/* Audience */}
                            <div>
                                <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Audiencia' : 'Audience'}
                                </label>
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder={language === 'es' ? 'Todos, Pro users...' : 'All, Pro users...'}
                                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-editor-text-primary placeholder:text-editor-text-secondary/50"
                                />
                            </div>

                            {/* Tone */}
                            <div>
                                <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Tono' : 'Tone'}
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {TONE_OPTIONS.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tone === t
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                : 'bg-editor-bg/50 text-editor-text-secondary border border-editor-border/50 hover:border-blue-500/30'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-editor-border/50" />

                        {/* Model Info */}
                        <div className="bg-editor-bg/50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
                                    {language === 'es' ? 'Modelos' : 'Models'}
                                </span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-editor-text-secondary">💬 Chat:</span>
                                    <span className="font-mono text-blue-300">flash</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-editor-text-secondary">🎤 Voz:</span>
                                    <span className="font-mono text-cyan-300">flash-live</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-editor-text-secondary">📝 Generar:</span>
                                    <span className="font-mono text-green-300">flash + high</span>
                                </div>
                            </div>
                        </div>

                        {/* Conversation Stats */}
                        <div className="bg-editor-bg/50 rounded-xl p-3 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                                <span className="text-editor-text-secondary">
                                    {language === 'es' ? 'Mensajes:' : 'Messages:'}
                                </span>
                                <span className="font-mono text-editor-text-primary">{messages.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-editor-text-secondary">
                                    {language === 'es' ? 'Contexto:' : 'Context:'}
                                </span>
                                <span className="font-mono text-editor-text-primary">
                                    {historyRef.current.reduce((acc, m) => acc + m.text.length, 0).toLocaleString()} chars
                                </span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="mt-auto pt-2">
                            <button
                                onClick={handleGenerate}
                                disabled={messages.length < 2 || phase !== 'conversation' || isThinking}
                                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none text-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                {language === 'es' ? 'Generar Noticia' : 'Generate News'}
                            </button>
                            {messages.length < 2 && (
                                <p className="text-[10px] text-editor-text-secondary text-center mt-2">
                                    {language === 'es'
                                        ? 'Conversa primero para refinar tu idea'
                                        : 'Chat first to refine your idea'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
            {/* Error Modal */}
            <ConfirmationModal
                isOpen={errorModal.open}
                onConfirm={() => setErrorModal({ open: false, title: '', message: '' })}
                onCancel={() => setErrorModal({ open: false, title: '', message: '' })}
                title={errorModal.title}
                message={errorModal.message}
                variant="warning"
                confirmText="OK"
                icon={<AlertTriangle size={24} />}
            />
        </>
    );
};

export default AINewsStudio;
