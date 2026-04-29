/**
 * AIContentStudio
 * 
 * Conversational AI Content Assistant for Super Admin.
 * Replaces the old wizard-based AppContentCreatorAssistant with a
 * two-way interactive interface featuring:
 * - Multi-turn text chat (gemini-3.1-flash-lite-preview)
 * - Real-time voice via Gemini Live API (gemini-3.1-flash-live-preview)
 * - Deep platform context awareness
 * - Content planning panel with article generation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
    X, Sparkles, Send, Mic, MicOff, Loader2,
    ArrowRight, CheckCircle, FileText, Settings2,
    Volume2, VolumeX, RefreshCcw, PhoneOff,
    ChevronDown, Zap, AlertTriangle
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
    buildContentStudioSystemPrompt,
    buildArticleGenerationPrompt,
    type DynamicPlatformContext,
} from '../../../utils/platformKnowledge';
import { AppArticle, AppArticleCategory } from '../../../types/appContent';
import { useAuth } from '../../../contexts/core/AuthContext';
import { useAppContent } from '../../../contexts/appContent';
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

interface AIContentStudioProps {
    onClose: () => void;
    onArticleCreated: (article: AppArticle) => void;
}

interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

type StudioPhase = 'conversation' | 'generating' | 'preview';

const CATEGORY_OPTIONS: { value: AppArticleCategory; labelKey: string; fallback: string }[] = [
    { value: 'blog', labelKey: 'contentManagement.categories.blog', fallback: 'Blog' },
    { value: 'news', labelKey: 'contentManagement.categories.news', fallback: 'Noticias' },
    { value: 'tutorial', labelKey: 'contentManagement.categories.tutorial', fallback: 'Tutorial' },
    { value: 'case-study', labelKey: 'contentManagement.categories.caseStudy', fallback: 'Caso de Éxito' },
    { value: 'announcement', labelKey: 'contentManagement.categories.announcement', fallback: 'Anuncio' },
    { value: 'guide', labelKey: 'contentManagement.categories.guide', fallback: 'Guía' },
    { value: 'update', labelKey: 'contentManagement.categories.update', fallback: 'Actualización' },
];

const TONE_OPTIONS = [
    'Profesional', 'Amigable', 'Persuasivo', 'Informativo', 'Inspirador', 'Técnico'
];

// NOTE: Switch to 'gemini-3.1-flash-lite-preview' after deploying updated Firebase Functions
const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';

// =============================================================================
// COMPONENT
// =============================================================================

const AIContentStudio: React.FC<AIContentStudioProps> = ({ onClose, onArticleCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { saveArticle, articles } = useAppContent();

    // --------------- Conversation State ---------------
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [phase, setPhase] = useState<StudioPhase>('conversation');

    // --------------- Content Plan State ---------------
    const [category, setCategory] = useState<AppArticleCategory>('blog');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [language, setLanguage] = useState<'es' | 'en'>('es');

    // --------------- Generated Article State ---------------
    const [generatedArticle, setGeneratedArticle] = useState<Partial<AppArticle> | null>(null);
    const [isSavingArticle, setIsSavingArticle] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

    // --------------- Voice State ---------------
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');

    // --------------- Context State ---------------
    const [platformContext, setPlatformContext] = useState<DynamicPlatformContext | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [isMobilePlanOpen, setIsMobilePlanOpen] = useState(false);

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
            const ctx = await loadDynamicPlatformContext(articles);
            setPlatformContext(ctx);

            // Welcome message (displayed to user)
            const welcomeText = language === 'es'
                ? `¡Hola! 👋 Soy tu **Estratega de Contenido AI** para ${ctx.appName}.\n\nConozco al detalle cada feature, servicio y capacidad de la plataforma. Puedo ayudarte a:\n\n- 📝 **Planificar** artículos, tutoriales y guías\n- 🎯 **Definir** audiencia, tono y ángulo perfecto\n- 💡 **Sugerir** temas basados en las capacidades de ${ctx.appName}\n- ✍️ **Generar** contenido completo optimizado para SEO\n\n¿Qué tipo de contenido necesitas crear hoy?`
                : `Hello! 👋 I'm your **AI Content Strategist** for ${ctx.appName}.\n\nI know every feature, service, and capability of the platform in detail. I can help you:\n\n- 📝 **Plan** articles, tutorials, and guides\n- 🎯 **Define** the perfect audience, tone, and angle\n- 💡 **Suggest** topics based on ${ctx.appName}'s capabilities\n- ✍️ **Generate** complete SEO-optimized content\n\nWhat kind of content do you need to create today?`;
            
            const welcomeMsg: DisplayMessage = {
                role: 'model',
                text: welcomeText,
                timestamp: Date.now(),
            };
            setMessages([welcomeMsg]);

            // Inject platform knowledge directly into conversation history.
            // This ensures the AI ALWAYS has Quimera.ai context, even if 
            // the backend system_instruction is not forwarded properly.
            const platformContextMessage = buildContentStudioSystemPrompt(ctx, language);
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

        // Update history ref
        historyRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildContentStudioSystemPrompt(platformContext, language);

            // Build conversation context from history for inclusion in the prompt.
            // This ensures the model always has the full context even if the 
            // backend doesn't process systemInstruction or history fields properly.
            const conversationContext = historyRef.current
                .slice(1) // Skip the injected [CONTEXT] message
                .slice(0, -1) // Skip the current message (it's sent as the prompt)
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const enrichedPrompt = `${systemPrompt}\n\n${conversationContext ? `--- CONVERSACIÓN PREVIA ---\n${conversationContext}\n--- FIN CONVERSACIÓN ---\n\n` : ''}Usuario: ${text.trim()}`;

            const response = await generateChatContentViaProxy(
                'ai-content-studio',
                [], // Don't rely on backend history processing
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
                projectId: 'ai-content-studio',
                model: MODEL_TEXT,
                feature: 'content-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[AIContentStudio] Chat error:', error);
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
                projectId: 'ai-content-studio',
                model: MODEL_TEXT,
                feature: 'content-studio-chat',
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

            const systemPrompt = buildContentStudioSystemPrompt(platformContext, language);

            // Store resolved session for direct access
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

                        // Debug: log message structure (throttled)
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

                        // Accumulate transcriptions — the Live API sends:
                        // serverContent.inputTranscription.text (user speech)
                        // serverContent.outputTranscription.text (model speech)
                        // serverContent.inputTranscript (legacy/alternative)
                        // serverContent.outputTranscript (legacy/alternative)
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

                        // On turn/generation complete, commit as permanent messages
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

            // Store the resolved session
            resolvedSession = session;
            sessionRef.current = session;
            console.log('[Voice] 🔗 Session resolved, setting up microphone...');

            // Set up microphone AFTER session is resolved
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
            console.error('[AIContentStudio] Voice session error:', error);
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
        // Clear live transcript state
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
    // ARTICLE GENERATION
    // =============================================================================

    const handleGenerate = async () => {
        if (!platformContext) return;
        setPhase('generating');

        try {
            const conversationSummary = historyRef.current
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const generationPrompt = buildArticleGenerationPrompt({
                conversationSummary,
                category,
                audience: audience || (language === 'es' ? 'Audiencia general' : 'General audience'),
                tone,
                language,
            });

            // Use the platform system prompt but send generation as a FRESH request
            // without multi-turn history. The conversation context is already
            // embedded in the generationPrompt itself — sending history separately
            // causes the AI to mix planning discussion into the article content.
            const systemPrompt = buildContentStudioSystemPrompt(platformContext, language);

            const response = await generateChatContentViaProxy(
                'ai-content-studio',
                [], // Empty history — the planning conversation is in the prompt, not as chat turns
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

            setGeneratedArticle({ ...parsedData, category });
            setPhase('preview');

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-content-studio',
                model: MODEL_TEXT,
                feature: 'content-studio-generate',
                success: true,
            });
        } catch (error) {
            console.error('[AIContentStudio] Generation error:', error);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error de generación' : 'Generation Error',
                message: language === 'es'
                    ? 'Error al generar el artículo. Por favor intenta de nuevo.'
                    : 'Error generating article. Please try again.',
            });
            setPhase('conversation');

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-content-studio',
                model: MODEL_TEXT,
                feature: 'content-studio-generate',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        }
    };

    const handleConfirmArticle = async () => {
        if (!generatedArticle || !user) {
            console.warn('[AIContentStudio] Cannot confirm: missing article or user');
            return;
        }

        setIsSavingArticle(true);
        try {
            console.log('[AIContentStudio] Saving generated article...');
            const generatedId = `article_${Date.now()}`;
            const now = new Date().toISOString();
            
            // Ensure readTime is a valid number
            const readTime = typeof generatedArticle.readTime === 'number' 
                ? generatedArticle.readTime 
                : parseInt(String(generatedArticle.readTime)) || 5;

            const newArticle: AppArticle = {
                id: generatedId,
                title: String(generatedArticle.title || 'Untitled Article'),
                slug: String(generatedArticle.slug || `article-${Date.now()}`),
                content: String(generatedArticle.content || '<p>AI generated content</p>'),
                excerpt: String(generatedArticle.excerpt || ''),
                featuredImage: '',
                status: 'draft',
                featured: false,
                category: generatedArticle.category || category,
                tags: Array.isArray(generatedArticle.tags) ? generatedArticle.tags.map(String) : [],
                author: 'Quimera Team',
                readTime,
                views: 0,
                createdAt: now,
                updatedAt: now,
                publishedAt: null,
                language,
                seo: generatedArticle.seo && typeof generatedArticle.seo === 'object' ? {
                    metaTitle: String((generatedArticle.seo as any).metaTitle || generatedArticle.title || ''),
                    metaDescription: String((generatedArticle.seo as any).metaDescription || generatedArticle.excerpt || ''),
                    metaKeywords: Array.isArray((generatedArticle.seo as any).metaKeywords) ? (generatedArticle.seo as any).metaKeywords.map(String) : [],
                } : {
                    metaTitle: String(generatedArticle.title || ''),
                    metaDescription: String(generatedArticle.excerpt || ''),
                    metaKeywords: Array.isArray(generatedArticle.tags) ? generatedArticle.tags.map(String) : [],
                },
            };

            console.log('[AIContentStudio] Article built:', newArticle.id, newArticle.title);
            await saveArticle(newArticle);
            console.log('[AIContentStudio] ✅ Article saved to Firestore, opening editor...');
            setIsSavingArticle(false);
            onArticleCreated(newArticle);
        } catch (error) {
            console.error('[AIContentStudio] Save error:', error);
            setIsSavingArticle(false);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error al guardar' : 'Save Error',
                message: language === 'es'
                    ? 'No se pudo guardar el artículo: ' + (error instanceof Error ? error.message : 'Error desconocido')
                    : 'Could not save the article: ' + (error instanceof Error ? error.message : 'Unknown error'),
            });
        }
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 lg:backdrop-blur-sm p-0 lg:p-4 animate-fade-in-up">
            <div className="bg-q-bg border-0 lg:border lg:border-q-border w-full h-full lg:h-auto lg:max-w-5xl rounded-none lg:rounded-2xl shadow-none lg:shadow-2xl overflow-hidden flex flex-col lg:max-h-[90vh]">

                {/* ===== HEADER ===== */}
                <div className="px-3 lg:p-4 py-2.5 lg:py-4 border-b border-q-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        {/* Branding icon — condensed on mobile (no box), boxed on desktop */}
                        <div className="relative flex-shrink-0">
                            <div className="hidden lg:flex bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                                <Sparkles className="text-white w-5 h-5" />
                            </div>
                            <Sparkles className="lg:hidden w-5 h-5 text-purple-400" />
                            {isVoiceActive && (
                                <span className="absolute -top-1 -right-1 w-2.5 lg:w-3 h-2.5 lg:h-3 bg-green-400 rounded-full border-2 border-q-bg animate-pulse" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm lg:text-lg font-bold text-q-text flex items-center gap-1.5 lg:gap-2">
                                <span className="truncate">AI Content Studio</span>
                                <span className="hidden sm:inline text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0">
                                    {isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}
                                </span>
                            </h2>
                            <p className="text-[10px] lg:text-xs text-q-text-secondary hidden sm:block">
                                {isVoiceActive
                                    ? (language === 'es' ? '🎤 Sesión de voz activa — habla naturalmente' : '🎤 Voice session active — speak naturally')
                                    : (language === 'es' ? 'Planifica y genera contenido con IA' : 'Plan and generate content with AI')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                        {/* Mobile Content Plan toggle */}
                        <button
                            onClick={() => setIsMobilePlanOpen(!isMobilePlanOpen)}
                            className="lg:hidden h-8 w-8 sm:w-auto sm:px-3 rounded-lg text-q-text-secondary text-xs hover:text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center justify-center sm:justify-start gap-1.5"
                            title={language === 'es' ? 'Plan de Contenido' : 'Content Plan'}
                        >
                            <FileText size={15} />
                            <span className="hidden sm:inline">{language === 'es' ? 'Plan' : 'Plan'}</span>
                        </button>
                        {/* Settings — bare icon */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors"
                            title={t('common.settings', 'Configuración')}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                        {/* Close */}
                        <button
                            onClick={() => { stopVoiceSession(); onClose(); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ===== BODY ===== */}
                <div className="flex-1 flex overflow-hidden relative">

                    {/* ===== LEFT: CONVERSATION PANEL ===== */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Messages */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md'
                                        : 'bg-[#1e1b2e] border border-purple-500/15 text-gray-100 rounded-bl-md'
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
                                    <div className="bg-q-surface border border-q-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-q-text-secondary">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                        {language === 'es' ? 'Pensando...' : 'Thinking...'}
                                    </div>
                                </div>
                            )}

                            {/* Live Voice Transcription */}
                            {isVoiceActive && liveUserTranscript && (
                                <div className="flex justify-end animate-pulse">
                                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-purple-500/20 border border-purple-500/30 text-purple-200">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-purple-400 mb-1">
                                            <Mic className="w-3 h-3" /> {language === 'es' ? 'Hablando...' : 'Speaking...'}
                                        </span>
                                        <p className="text-gray-100">{liveUserTranscript}</p>
                                    </div>
                                </div>
                            )}
                            {isVoiceActive && liveModelTranscript && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1e1b2e] border border-blue-500/20 text-gray-100">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 mb-1">
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
                                            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse" />
                                            <Loader2 className="w-16 h-16 text-purple-400 animate-spin relative z-10" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-q-text">
                                                {language === 'es' ? 'Generando artículo...' : 'Generating article...'}
                                            </p>
                                            <p className="text-xs text-q-text-secondary mt-1">
                                                {language === 'es'
                                                    ? 'Usando pensamiento profundo (thinkingLevel: high)'
                                                    : 'Using deep thinking (thinkingLevel: high)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview State */}
                            {phase === 'preview' && generatedArticle && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-green-400">
                                                {language === 'es' ? '¡Contenido generado con éxito!' : 'Content generated successfully!'}
                                            </p>
                                            <p className="text-xs text-green-400/70">
                                                {language === 'es' ? 'Revisa antes de abrir en el editor.' : 'Review before opening in editor.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-q-surface border border-q-border rounded-xl p-5 space-y-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">
                                                {t('contentManagement.editor.title', 'Título')}
                                            </span>
                                            <h3 className="text-xl font-bold text-q-text mt-1">
                                                {generatedArticle.title || 'Sin título'}
                                            </h3>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-purple-500/15 text-purple-300 rounded-full">
                                                {generatedArticle.category || category}
                                            </span>
                                            {generatedArticle.readTime && (
                                                <span className="px-2.5 py-1 text-xs font-medium bg-q-surface-overlay/40 text-q-text-secondary rounded-full">
                                                    {generatedArticle.readTime} min
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">
                                                {t('contentManagement.editor.excerpt', 'Resumen')}
                                            </span>
                                            <p className="text-q-text-secondary text-sm mt-1">
                                                {generatedArticle.excerpt || '—'}
                                            </p>
                                        </div>

                                        {generatedArticle.tags && generatedArticle.tags.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">Tags</span>
                                                <div className="flex gap-2 flex-wrap mt-1">
                                                    {generatedArticle.tags.map((tag, i) => (
                                                        <span key={i} className="px-2 py-0.5 text-xs bg-q-surface-overlay/30 text-q-text-secondary rounded-full">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">
                                                {language === 'es' ? 'Vista previa' : 'Preview'}
                                            </span>
                                            <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-6 bg-q-bg/50 p-4 rounded-lg border border-q-border/50 mt-1 overflow-hidden text-sm">
                                                {generatedArticle.content ? (
                                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedArticle.content) }} />
                                                ) : (
                                                    <p className="text-q-text-secondary italic">No content</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between">
                                        <button
                                            onClick={() => setPhase('conversation')}
                                            className="text-q-text-secondary hover:text-q-text font-medium px-4 py-2 transition-colors text-sm"
                                        >
                                            {language === 'es' ? '← Seguir conversando' : '← Continue conversation'}
                                        </button>
                                        <button
                                            onClick={handleConfirmArticle}
                                            disabled={isSavingArticle}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isSavingArticle ? (
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
                            <div className="p-3 border-t border-q-border bg-q-surface/50">
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
                                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-surface-overlay/40 text-q-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
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
                                            : (language === 'es' ? 'Escribe tu idea de contenido...' : 'Type your content idea...')}
                                        className="flex-1 bg-q-bg border border-q-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[40px] max-h-[120px] text-q-text placeholder:text-q-text-secondary/50"
                                        rows={1}
                                        disabled={phase !== 'conversation'}
                                    />

                                    {/* Send */}
                                    <button
                                        onClick={handleSendClick}
                                        disabled={!inputText.trim() || isThinking}
                                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
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
                                        <span className="text-q-text-secondary">•</span>
                                        <span className="text-q-text-secondary font-mono">
                                            {MODEL_VOICE.split('-').slice(1).join('-')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ===== RIGHT: CONTENT PLAN PANEL (desktop) ===== */}
                    <div className="w-72 border-l border-q-border bg-q-surface/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">

                        {/* Content Parameters */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-bold text-q-text">
                                    {language === 'es' ? 'Plan de Contenido' : 'Content Plan'}
                                </h3>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Categoría' : 'Category'}
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setCategory(cat.value)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat.value
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                                }`}
                                        >
                                            {cat.fallback}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Idioma' : 'Language'}
                                </label>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setLanguage('es')}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'es'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                            }`}
                                    >
                                        🇪🇸 Español
                                    </button>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'en'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                            }`}
                                    >
                                        🇺🇸 English
                                    </button>
                                </div>
                            </div>

                            {/* Audience */}
                            <div>
                                <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Audiencia' : 'Audience'}
                                </label>
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder={language === 'es' ? 'Emprendedores, Devs...' : 'Entrepreneurs, Devs...'}
                                    className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-q-text placeholder:text-q-text-secondary/50"
                                />
                            </div>

                            {/* Tone */}
                            <div>
                                <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Tono' : 'Tone'}
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {TONE_OPTIONS.map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTone(t)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tone === t
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-q-border/50" />

                        {/* Model Info */}
                        <div className="bg-q-bg/50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">
                                    {language === 'es' ? 'Modelos' : 'Models'}
                                </span>
                            </div>
                            <div className="space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-q-text-secondary">💬 Chat:</span>
                                    <span className="font-mono text-purple-300">flash-lite</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-q-text-secondary">🎤 Voz:</span>
                                    <span className="font-mono text-blue-300">flash-live</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-q-text-secondary">📝 Generar:</span>
                                    <span className="font-mono text-green-300">lite + high</span>
                                </div>
                            </div>
                        </div>

                        {/* Conversation Stats */}
                        <div className="bg-q-bg/50 rounded-xl p-3 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                                <span className="text-q-text-secondary">
                                    {language === 'es' ? 'Mensajes:' : 'Messages:'}
                                </span>
                                <span className="font-mono text-q-text">{messages.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-q-text-secondary">
                                    {language === 'es' ? 'Contexto:' : 'Context:'}
                                </span>
                                <span className="font-mono text-q-text">
                                    {historyRef.current.reduce((acc, m) => acc + m.text.length, 0).toLocaleString()} chars
                                </span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="mt-auto pt-2">
                            <button
                                onClick={handleGenerate}
                                disabled={messages.length < 2 || phase !== 'conversation' || isThinking}
                                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none text-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                {language === 'es' ? 'Generar Artículo' : 'Generate Article'}
                            </button>
                            {messages.length < 2 && (
                                <p className="text-[10px] text-q-text-secondary text-center mt-2">
                                    {language === 'es'
                                        ? 'Conversa primero para refinar tu idea'
                                        : 'Chat first to refine your idea'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ===== RIGHT: CONTENT PLAN PANEL (mobile bottom sheet) ===== */}
                    {isMobilePlanOpen && (
                        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
                            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobilePlanOpen(false)} style={{ animation: 'acs-fadeIn 0.2s ease' }} />
                            <div
                                className="relative bg-q-surface border-t border-q-border rounded-t-2xl flex flex-col overflow-hidden"
                                style={{ maxHeight: '75vh', animation: 'acs-slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
                            >
                                {/* Drag handle */}
                                <div className="flex justify-center pt-3 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-q-text-secondary/30" />
                                </div>
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-q-border">
                                    <span className="text-sm font-semibold text-q-text flex items-center gap-2">
                                        <FileText size={14} className="text-purple-400" />
                                        {language === 'es' ? 'Plan de Contenido' : 'Content Plan'}
                                    </span>
                                    <button onClick={() => setIsMobilePlanOpen(false)} className="p-1.5 rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors"><X size={16} /></button>
                                </div>
                                {/* Content — scrollable */}
                                <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
                                    {/* Content Parameters */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            <h3 className="text-sm font-bold text-q-text">
                                                {language === 'es' ? 'Parámetros' : 'Parameters'}
                                            </h3>
                                        </div>
                                        {/* Category */}
                                        <div>
                                            <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                                {language === 'es' ? 'Categoría' : 'Category'}
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {CATEGORY_OPTIONS.map((cat) => (
                                                    <button
                                                        key={cat.value}
                                                        onClick={() => setCategory(cat.value)}
                                                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat.value
                                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                            : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                                        }`}
                                                    >
                                                        {cat.fallback}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Language */}
                                        <div>
                                            <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                                {language === 'es' ? 'Idioma' : 'Language'}
                                            </label>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => setLanguage('es')} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'es' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'}`}>🇪🇸 Español</button>
                                                <button onClick={() => setLanguage('en')} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'en' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'}`}>🇺🇸 English</button>
                                            </div>
                                        </div>
                                        {/* Audience */}
                                        <div>
                                            <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                                {language === 'es' ? 'Audiencia' : 'Audience'}
                                            </label>
                                            <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder={language === 'es' ? 'Emprendedores, Devs...' : 'Entrepreneurs, Devs...'} className="w-full px-3 py-2 bg-q-bg border border-q-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-q-text placeholder:text-q-text-secondary/50" />
                                        </div>
                                        {/* Tone */}
                                        <div>
                                            <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                                {language === 'es' ? 'Tono' : 'Tone'}
                                            </label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {TONE_OPTIONS.map((t) => (
                                                    <button key={t} onClick={() => setTone(t)} className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${tone === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Generate Button */}
                                    <div className="pt-2">
                                        <button
                                            onClick={() => { setIsMobilePlanOpen(false); handleGenerate(); }}
                                            disabled={messages.length < 2 || phase !== 'conversation' || isThinking}
                                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none text-sm"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            {language === 'es' ? 'Generar Artículo' : 'Generate Article'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        <style>{`
            @keyframes acs-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes acs-slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
            {/* Error Modal — replaces browser alert() */}
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

export default AIContentStudio;
