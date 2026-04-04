/**
 * LandingChatbotWidget.tsx
 * Widget de chatbot para la landing page pública de Quimera.ai
 * 
 * Este componente se renderiza en la landing page y permite a los visitantes
 * hacer preguntas sobre Quimera.ai, sus precios y funcionalidades.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Loader2, Bot, HelpCircle, Sparkles, Mic, PhoneOff, Minus, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Modality, LiveServerMessage } from '@google/genai';
import { useSafeAdmin } from '../contexts/admin';
import { LandingChatbotConfig, defaultLandingChatbotConfig, LandingChatMessage, LandingChatbotColors, defaultChatbotColors } from '../types/landingChatbot';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { savePlatformLead } from '../services/platformLeadService';
import { isProxyMode, getGoogleGenAI } from '../utils/genAiClient';
import { generateContentViaProxy, extractTextFromResponse } from '../utils/geminiProxyClient';

// =============================================================================
// INTERFACES
// =============================================================================

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface LeadFormData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
}

// =============================================================================
// AUDIO HELPER FUNCTIONS (matching GlobalAiAssistant)
// =============================================================================

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

function base64ToBytes(base64: string) {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to convert hex color to rgba with opacity
const hexToRgba = (hex: string, alpha: number): string => {
    const cleanHex = hex?.replace('#', '') || '000000';
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LandingChatbotWidget: React.FC = () => {
    const { t } = useTranslation();
    const adminContext = useSafeAdmin();

    // Extract values safely with fallbacks
    const landingChatbotConfig = adminContext?.landingChatbotConfig;
    const designTokens = adminContext?.designTokens;

    // Debug logging
    console.log('[LandingChatbotWidget] Rendering, isActive:', true, 'path:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');

    // Quimera logo URL - ALWAYS use this for the public chatbot
    const QUIMERA_LOGO = 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032';

    // Use config from context merged with defaults
    // IMPORTANT: Some values are FORCED for the public landing chatbot
    const config: LandingChatbotConfig = {
        ...defaultLandingChatbotConfig,
        ...landingChatbotConfig,
        // FORCE isActive to true - landing chatbot should always be active
        isActive: true,
        // FORCE agent name to Quibo
        agentName: 'Quibo',
        agentRole: 'AI Assistant',
        welcomeMessage: '¡Hola! 👋 Soy **Quibo**, el asistente de IA de Quimera.ai. Puedo ayudarte a conocer nuestra plataforma de creación de sitios web. ¿Qué te gustaría saber?',
        appearance: {
            ...defaultLandingChatbotConfig.appearance,
            ...(landingChatbotConfig?.appearance || {}),
            // FORCE Quimera logo - this is the public Quimera chatbot
            buttonIcon: 'custom-image' as const,
            customIconUrl: QUIMERA_LOGO,
            avatarUrl: QUIMERA_LOGO,
            // FORCE excluded paths - only hide in authenticated areas
            excludedPaths: ['/dashboard', '/admin'],
        },
        behavior: {
            ...defaultLandingChatbotConfig.behavior,
            ...(landingChatbotConfig?.behavior || {}),
        },
        voice: {
            ...defaultLandingChatbotConfig.voice,
            ...(landingChatbotConfig?.voice || {}),
            // FORCE voice enabled for live voice
            enabled: true,
            autoPlayGreeting: false,
        },
        personality: {
            ...defaultLandingChatbotConfig.personality,
            ...(landingChatbotConfig?.personality || {}),
            // FORCE Quibo in system prompt
            systemPrompt: `Eres Quibo, el asistente de IA de Quimera.ai, una plataforma de creación de sitios web con inteligencia artificial.

Tu objetivo es ayudar a los visitantes a conocer Quimera.ai, resolver sus dudas y guiarlos hacia la conversión.

Personalidad:
- Amigable, profesional y entusiasta
- Tu nombre es Quibo (derivado de Quimera)
- Conoces a fondo todas las funcionalidades de Quimera.ai
- Siempre ofreces ayuda proactiva`,
        },
        leadCapture: {
            ...defaultLandingChatbotConfig.leadCapture,
            ...(landingChatbotConfig?.leadCapture || {}),
        },
        knowledgeBase: {
            ...defaultLandingChatbotConfig.knowledgeBase,
            ...(landingChatbotConfig?.knowledgeBase || {}),
        },
    };

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadFormData, setLeadFormData] = useState<LeadFormData>({ name: '', email: '' });
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [sessionId] = useState(generateSessionId);
    const [hasShownProactive, setHasShownProactive] = useState(false);

    // Voice State - matching GlobalAiAssistant
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Refs - matching GlobalAiAssistant
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const sessionRef = useRef<any>(null);
    const visualizerIntervalRef = useRef<number | null>(null);
    const isConnectedRef = useRef(false);

    // Determine color source (support both new and legacy format)
    const colorSource = (config.appearance as any).colorSource || ((config.appearance as any).useAppColors ? 'app' : 'custom');
    const customColors: LandingChatbotColors = config.appearance.customColors || defaultChatbotColors;

    // Derived colors from design tokens or custom
    // When colorSource === 'app', map design tokens to match GlobalAiAssistant's
    // Tailwind class mapping (bg-primary → header, bg-card → bubbles, bg-background → container)
    const dtColors = designTokens?.colors as any;
    const colors: LandingChatbotColors = colorSource === 'app' && dtColors
        ? {
            headerBackground: dtColors?.primary || '#FBB92B',
            headerText: dtColors?.['primary-foreground'] || '#0a0a0a',
            botBubbleBackground: dtColors?.card || '#111111',
            botBubbleText: dtColors?.foreground || '#f5f5f5',
            userBubbleBackground: dtColors?.primary || '#FBB92B',
            userBubbleText: dtColors?.['primary-foreground'] || '#0a0a0a',
            background: dtColors?.background || '#000000',
            inputBackground: dtColors?.card || '#111111',
            inputBorder: dtColors?.border || '#222222',
            inputText: dtColors?.foreground || '#f5f5f5',
            buttonBackground: dtColors?.primary || '#FBB92B',
            buttonIcon: dtColors?.['primary-foreground'] || '#0a0a0a',
            primary: dtColors?.primary || '#FBB92B',
            mutedText: dtColors?.['muted-foreground'] || '#737373',
        }
        : customColors;

    // Get button icon based on config
    const getButtonIcon = () => {
        const iconSize = 28;
        const iconColor = colors?.buttonIcon;

        switch (config.appearance.buttonIcon) {
            case 'chat':
                return <MessageSquare size={iconSize} style={{ color: iconColor }} />;
            case 'help':
                return <HelpCircle size={iconSize} style={{ color: iconColor }} />;
            case 'bot':
                return <Bot size={iconSize} style={{ color: iconColor }} />;
            case 'sparkles':
                return <Sparkles size={iconSize} style={{ color: iconColor }} />;
            case 'custom-emoji':
                return <span className="text-2xl">{config.appearance.customEmoji || '🦋'}</span>;
            case 'custom-image':
                return config.appearance.customIconUrl ? (
                    <img src={config.appearance.customIconUrl} alt="Chat" className="w-7 h-7 object-contain" />
                ) : (
                    <Bot size={iconSize} style={{ color: iconColor }} />
                );
            default:
                return <Bot size={iconSize} style={{ color: iconColor }} />;
        }
    };

    // Check if current path is excluded
    const isExcludedPath = () => {
        if (typeof window === 'undefined') return false;
        const currentPath = window.location.pathname;
        return config.appearance.excludedPaths.some(path => currentPath.startsWith(path));
    };

    // Debug: Log excluded path check
    const excluded = isExcludedPath();
    console.log('[LandingChatbotWidget] isActive:', config.isActive, 'isExcludedPath:', excluded);

    // Don't render if inactive or on excluded path
    if (!config.isActive || excluded) {
        console.log('[LandingChatbotWidget] Not rendering - isActive:', config.isActive, 'excluded:', excluded);
        return null;
    }

    // Auto-scroll to bottom of messages
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Add welcome message on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: generateMessageId(),
                role: 'assistant',
                content: config.welcomeMessage,
                timestamp: new Date()
            }]);

        }
    }, [isOpen, config.welcomeMessage]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    // Proactive message timer
    useEffect(() => {
        if (!config.behavior.autoOpen || hasShownProactive) return;

        const proactiveMsg = config.behavior.proactiveMessages.find(m => m.enabled && m.trigger === 'time');
        if (proactiveMsg) {
            proactiveTimerRef.current = setTimeout(() => {
                if (!isOpen) {
                    setIsOpen(true);
                    setMessages([{
                        id: generateMessageId(),
                        role: 'assistant',
                        content: proactiveMsg.message,
                        timestamp: new Date()
                    }]);
                    setHasShownProactive(true);
                }
            }, (proactiveMsg.triggerValue as number) * 1000);
        }

        return () => {
            if (proactiveTimerRef.current) {
                clearTimeout(proactiveTimerRef.current);
            }
        };
    }, [config.behavior.autoOpen, config.behavior.proactiveMessages, hasShownProactive, isOpen]);

    // Build system prompt
    const buildSystemPrompt = (): string => {
        const { knowledgeBase, personality } = config;

        let prompt = personality.systemPrompt + '\n\n';

        // Add company info
        if (knowledgeBase.companyInfo) {
            prompt += `## Información de la Empresa\n${knowledgeBase.companyInfo}\n\n`;
        }

        // Add product features
        if (knowledgeBase.productFeatures.length > 0) {
            prompt += '## Funcionalidades del Producto\n';
            knowledgeBase.productFeatures.forEach(f => {
                prompt += `- **${f.name}**: ${f.description}\n`;
            });
            prompt += '\n';
        }

        // Add pricing plans
        if (knowledgeBase.pricingPlans.length > 0) {
            prompt += '## Planes y Precios\n';
            knowledgeBase.pricingPlans.forEach(p => {
                prompt += `- **${p.name}**: ${p.price} ${p.currency}/${p.billingCycle === 'monthly' ? 'mes' : 'año'} - ${p.description}\n`;
                p.features.forEach(f => {
                    prompt += `  - ${f}\n`;
                });
            });
            prompt += '\n';
        }

        // Add FAQs
        if (knowledgeBase.faqs.length > 0) {
            prompt += '## Preguntas Frecuentes\n';
            knowledgeBase.faqs.forEach(faq => {
                prompt += `**P: ${faq.question}**\nR: ${faq.answer}\n\n`;
            });
        }

        // Add personality settings
        prompt += `\n## Estilo de Comunicación
- Tono: ${personality.tone}
- Estilo de respuesta: ${personality.responseStyle === 'concise' ? 'Breve y conciso' : 'Detallado y completo'}
- Modo de ventas: ${personality.salesMode === 'soft' ? 'Informativo, sin presión' : 'Proactivo, orientado a conversión'}
- Idiomas: ${personality.languages.join(', ')}`;

        if (personality.customInstructions) {
            prompt += `\n\n## Instrucciones Adicionales\n${personality.customInstructions}`;
        }

        return prompt;
    };

    // Check for high-intent keywords
    const hasHighIntentKeyword = (message: string): boolean => {
        return config.leadCapture.highIntentKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    };

    // Send message to AI
    const sendMessage = async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        const newUserMessage: Message = {
            id: generateMessageId(),
            role: 'user',
            content: userMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        // Check for lead capture triggers
        const messageCount = messages.filter(m => m.role === 'user').length + 1;
        const shouldCaptureLead = config.leadCapture.enabled &&
            !leadCaptured &&
            (messageCount >= config.leadCapture.triggerAfterMessages || hasHighIntentKeyword(userMessage));

        try {
            const systemPrompt = buildSystemPrompt();
            const conversationHistory = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            let responseText = '';

            if (isProxyMode()) {
                // Use proxy for AI calls
                // Build a full prompt with system instructions and conversation history
                const conversationContext = messages.map(m =>
                    `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
                ).join('\n');

                const fullPrompt = `${systemPrompt}

${conversationContext ? `Historial de conversación:\n${conversationContext}\n\n` : ''}Usuario: ${userMessage}

Asistente:`;

                const result = await generateContentViaProxy(
                    'quimera-chat-landing', // Use pattern that's allowed in Cloud Function
                    fullPrompt,
                    'gemini-3-flash-preview',
                    {
                        temperature: config.behavior.temperature,
                        maxOutputTokens: config.behavior.maxTokens,
                    }
                );
                responseText = extractTextFromResponse(result) || 'Lo siento, no pude procesar tu mensaje.';
            } else {
                // Use direct API
                const genAI = await getGoogleGenAI();
                if (!genAI) {
                    throw new Error('API key not configured');
                }
                const model = genAI.getGenerativeModel({
                    model: 'gemini-3-flash-preview',
                    systemInstruction: systemPrompt
                });
                const chat = model.startChat({
                    history: conversationHistory,
                    generationConfig: {
                        temperature: config.behavior.temperature,
                        maxOutputTokens: config.behavior.maxTokens,
                    }
                });
                const result = await chat.sendMessage(userMessage);
                responseText = result.response.text() || 'Lo siento, no pude procesar tu mensaje.';
            }

            const assistantMessage: Message = {
                id: generateMessageId(),
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Show lead form if triggered
            if (shouldCaptureLead) {
                setTimeout(() => setShowLeadForm(true), 1000);
            }

        } catch (error) {
            console.error('[LandingChatbot] Error sending message:', error);
            const errorContent = t('landingChatbot.errorMessage', 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.');
            const errorMessage: Message = {
                id: generateMessageId(),
                role: 'assistant',
                content: errorContent,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadFormData.email) return;

        try {
            // 1. Save to legacy landingChatbot collection
            await addDoc(collection(db, 'landingChatbot', 'leads', 'items'), {
                ...leadFormData,
                source: 'landing-chatbot',
                status: 'new',
                score: 50,
                sessionId,
                conversationPreview: messages.slice(-3).map(m => m.content).join(' | '),
                tags: ['landing', 'chatbot'],
                createdAt: serverTimestamp(),
            });

            // 2. Also save to root-level platformLeads for the admin dashboard
            await savePlatformLead({
                name: leadFormData.name,
                email: leadFormData.email,
                phone: leadFormData.phone,
                company: leadFormData.company,
                source: 'landing-chatbot',
                status: 'new',
                score: 50,
                tags: ['landing', 'chatbot'],
                metadata: {
                    sessionId,
                    conversationPreview: messages.slice(-3).map(m => m.content).join(' | '),
                },
            });

            setLeadCaptured(true);
            setShowLeadForm(false);

            // Add thank you message
            setMessages(prev => [...prev, {
                id: generateMessageId(),
                role: 'assistant',
                content: t('landingChatbot.leadCapturedMessage', '¡Gracias! Hemos recibido tu información. Un miembro de nuestro equipo te contactará pronto. ¿Hay algo más en lo que pueda ayudarte?'),
                timestamp: new Date()
            }]);

        } catch (error) {
            console.error('[LandingChatbot] Error saving lead:', error);
        }
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    // =========================================================================
    // VOICE MODE - Gemini Live API (matching GlobalAiAssistant)
    // =========================================================================

    const stopLiveSession = useCallback(() => {
        isConnectedRef.current = false;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (processorRef.current && inputAudioContextRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { /* already stopped */ } });
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (sessionRef.current) {
            try {
                const session = sessionRef.current;
                if (session && typeof session.then === 'function') {
                    session.then((s: any) => { try { s.close?.(); } catch (e) { /* ignore */ } }).catch(() => { });
                } else if (session && typeof session.close === 'function') {
                    session.close();
                }
            } catch (e) {
                console.warn('[Landing Voice] Error closing session:', e);
            }
            sessionRef.current = null;
        }
        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    }, []);

    const startLiveSession = useCallback(async () => {
        setIsConnecting(true);

        try {
            // STEP 1: Request microphone permission
            console.log('[Landing Voice] Requesting microphone permission...');
            let micStream: MediaStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[Landing Voice] Microphone access granted');
            } catch (micErr: any) {
                console.error('[Landing Voice] Microphone access denied:', micErr);
                setIsConnecting(false);
                alert(`No se pudo acceder al micrófono: ${micErr?.message || 'Permiso denegado'}. Por favor, permite el acceso al micrófono en tu navegador.`);
                return;
            }

            // STEP 2: Set up audio contexts
            const ai = await getGoogleGenAI();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;
            streamRef.current = micStream;

            // Voice system prompt for the landing chatbot
            const voiceSystemPrompt = config.personality.systemPrompt || 
                'Eres Quibo, el asistente de voz de Quimera.ai. Responde de forma breve, amigable y natural.';

            // STEP 3: Connect to WebSocket
            const sessionPromise = ai.live.connect({
                model: 'gemini-3.1-flash-live-preview',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice.voiceName || 'Kore' } } },
                    systemInstruction: voiceSystemPrompt,
                },
                callbacks: {
                    onopen: async () => {
                        console.log('[Landing Voice] WebSocket connected');
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;

                        // Set up audio processing
                        const source = inputCtx.createMediaStreamSource(micStream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processorRef.current = processor;
                        let audioSendCount = 0;
                        processor.onaudioprocess = (e) => {
                            if (!isConnectedRef.current) return;
                            if (inputCtx.state === 'suspended') {
                                inputCtx.resume();
                            }
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcm16 = floatTo16BitPCM(inputData);
                            const base64Data = bytesToBase64(new Uint8Array(pcm16));
                            sessionPromise.then(session => {
                                if (!isConnectedRef.current) return;
                                try {
                                    session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: base64Data } });
                                    audioSendCount++;
                                    if (audioSendCount % 100 === 0) {
                                        console.log(`[Landing Voice] 🎤 Audio chunks sent: ${audioSendCount}`);
                                    }
                                } catch (err) {
                                    console.error('[Landing Voice] ❌ Error sending audio chunk:', err);
                                }
                            });
                        };
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        console.log('[Landing Voice] ⏳ Audio streaming started');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const sc = message.serverContent;

                        if (sc?.interrupted) {
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }

                        // Resume output audio context if suspended
                        if (audioContextRef.current?.state === 'suspended') {
                            await audioContextRef.current.resume();
                        }

                        // Handle audio data
                        const parts = sc?.modelTurn?.parts || [];
                        for (const part of parts) {
                            const audioData = (part as any)?.inlineData?.data;
                            if (audioData && audioContextRef.current) {
                                const ctx = audioContextRef.current;
                                try {
                                    const bytes = base64ToBytes(audioData);
                                    const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                                    const src = ctx.createBufferSource();
                                    src.buffer = buffer;
                                    src.connect(ctx.destination);
                                    const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                    src.start(startTime);
                                    nextStartTimeRef.current = startTime + buffer.duration;
                                    activeSourcesRef.current.push(src);
                                    src.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== src); };
                                } catch (audioErr) {
                                    console.error('[Landing Voice] Error playing audio chunk:', audioErr);
                                }
                            }
                        }

                        if (sc?.turnComplete) {
                            console.log('[Landing Voice] ✅ Model turn complete');
                        }
                    },
                    onclose: (e: any) => {
                        console.log('[Landing Voice] WebSocket closed:', e?.reason || 'unknown');
                        stopLiveSession();
                    },
                    onerror: (e: any) => {
                        console.error('[Landing Voice] WebSocket error:', e);
                        if (!isConnectedRef.current) return;
                        stopLiveSession();
                    }
                }
            });
            sessionRef.current = sessionPromise;
        } catch (error: any) {
            console.error('[Landing Voice] Failed to start session:', error);
            setIsConnecting(false);
            alert(`Error al iniciar sesión de voz: ${error?.message || 'Error desconocido'}. Por favor, intenta de nuevo.`);
        }
    }, [config.personality.systemPrompt, config.voice.voiceName, stopLiveSession]);

    // Visualizer animation - matching GlobalAiAssistant
    useEffect(() => {
        if (isLiveActive) {
            visualizerIntervalRef.current = window.setInterval(() => {
                setVisualizerLevels([
                    Math.random() * 20 + 10,
                    Math.random() * 40 + 10,
                    Math.random() * 30 + 10,
                    Math.random() * 20 + 10,
                ]);
            }, 100);
        } else {
            if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
            setVisualizerLevels([4, 4, 4, 4]);
        }
        return () => { if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current); };
    }, [isLiveActive]);

    // Cleanup voice on unmount
    useEffect(() => { return () => stopLiveSession(); }, [stopLiveSession]);

    // Get position styles
    const getPositionStyle = () => {
        const { position, offsetX, offsetY } = config.appearance;
        return position === 'bottom-right'
            ? { bottom: `${offsetY}px`, right: `${offsetX}px` }
            : { bottom: `${offsetY}px`, left: `${offsetX}px` };
    };

    // Get size classes
    const getSizeClasses = () => {
        switch (config.appearance.size) {
            case 'sm': return { width: 'w-80', height: 'h-96' };
            case 'lg': return { width: 'w-[440px]', height: 'h-[600px]' };
            default: return { width: 'w-96', height: 'h-[500px]' };
        }
    };

    // Logo URL for the bot avatar
    const LOGO_URL = '/quimera-logo.svg';

    // Get button style classes
    const getButtonStyleClasses = () => {
        switch (config.appearance.buttonStyle) {
            case 'rounded': return 'rounded-xl';
            case 'square': return 'rounded-lg';
            default: return 'rounded-full';
        }
    };

    // Get custom button icon for closed state
    const getCustomButtonIcon = () => {
        switch (config.appearance.buttonIcon) {
            case 'chat': return <MessageSquare size={24} style={{ color: colors?.buttonIcon }} />;
            case 'help': return <HelpCircle size={24} style={{ color: colors?.buttonIcon }} />;
            case 'sparkles': return <Sparkles size={24} style={{ color: colors?.buttonIcon }} />;
            case 'custom-emoji': return <span className="text-2xl">{config.appearance.customEmoji || '🦋'}</span>;
            case 'custom-image': return config.appearance.customIconUrl ? (
                <img src={config.appearance.customIconUrl} alt="Chat" className="w-7 h-7 object-contain" />
            ) : (
                <Bot size={24} style={{ color: colors?.buttonIcon }} />
            );
            default: return <Bot size={24} style={{ color: colors?.buttonIcon }} />;
        }
    };

    const sizeClasses = getSizeClasses();

    // =========================================================================
    // FOOTER TRIGGER BAR (Dynamic: Center Bar OR Side Bubble)
    // =========================================================================
    const footerTriggerContent = isMinimized ? (
        // MODE 1: MINIMIZED BUBBLE (Bottom-Right)
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none" style={{ animation: 'fadeIn 0.3s ease' }}>
            <button
                onClick={() => { setIsMinimized(false); setIsOpen(true); }}
                className={`pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 border ${isLiveActive ? 'animate-pulse' : ''}`}
                style={{
                    backgroundColor: colors?.botBubbleBackground || '#111111',
                    borderColor: isLiveActive ? '#ef4444' : colors?.inputBorder || '#222222',
                    borderWidth: isLiveActive ? '2px' : '1px',
                }}
            >
                <div className="relative flex items-center justify-center w-full h-full">
                    <img src={QUIMERA_LOGO} alt="Quibo" className={`w-8 h-8 object-contain ${isLiveActive ? 'animate-pulse' : ''}`} />
                    {isLiveActive ? (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 animate-pulse" style={{ borderColor: colors?.botBubbleBackground || '#111111' }} />
                    ) : (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2" style={{ borderColor: colors?.botBubbleBackground || '#111111' }} />
                    )}
                </div>
            </button>
        </div>
    ) : (
        // MODE 2: DEFAULT CENTER BAR (Bottom-Center)
        <div className="fixed bottom-6 inset-x-0 z-[9999] px-6 pointer-events-none" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div
                className={`assistant-footer-trigger pointer-events-auto mx-auto flex items-center gap-3 px-5 py-3 border rounded-full shadow-xl transition-all max-w-md w-full ${isLiveActive ? 'animate-pulse' : ''}`}
                style={{
                    backgroundColor: isLiveActive ? hexToRgba(colors?.primary || '#FBB92B', 0.15) : hexToRgba(colors?.botBubbleBackground || '#111111', 0.95),
                    borderColor: isLiveActive ? hexToRgba(colors?.primary || '#FBB92B', 0.5) : colors?.inputBorder || '#222222',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Logo with status indicator */}
                <div className="relative shrink-0">
                    <img src={QUIMERA_LOGO} alt="Quibo" className={`w-9 h-9 object-contain transition-transform ${isLiveActive ? 'scale-110' : ''}`} />
                    <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} style={{ borderColor: colors?.botBubbleBackground || '#111111' }} />
                </div>

                {/* Content area */}
                <div className="flex-1">
                    {isLiveActive ? (
                        <div className="flex items-center gap-2">
                            <div className="flex items-end gap-0.5 h-5">
                                {visualizerLevels.slice(0, 8).map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-1 rounded-full transition-all duration-75"
                                        style={{ height: `${Math.max(4, height / 3)}px`, backgroundColor: colors?.primary || '#FBB92B' }}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: colors?.primary || '#FBB92B' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Escuchando...
                            </span>
                        </div>
                    ) : (
                        <button onClick={() => setIsOpen(true)} className="flex-1 min-w-0 text-left group mx-2">
                            <p className="text-sm transition-colors truncate" style={{ color: colors?.mutedText || '#737373' }}>
                                Pregunta a {config.agentName}...
                            </p>
                        </button>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                    {/* Voice toggle */}
                    {config.voice.enabled && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isLiveActive) { stopLiveSession(); } 
                                else { startLiveSession(); }
                            }}
                            className="shrink-0 flex items-center justify-center rounded-full transition-all"
                            style={{
                                width: '36px', height: '36px', minWidth: '36px',
                                backgroundColor: isLiveActive ? 'rgba(239,68,68,0.2)' : 'transparent',
                                color: isLiveActive ? '#ef4444' : colors?.mutedText || '#737373',
                            }}
                            onMouseEnter={(e) => { if (!isLiveActive) e.currentTarget.style.color = colors?.primary || '#FBB92B'; }}
                            onMouseLeave={(e) => { if (!isLiveActive) e.currentTarget.style.color = colors?.mutedText || '#737373'; }}
                        >
                            {isConnecting ? (
                                <img src={QUIMERA_LOGO} alt="..." className="w-5 h-5 object-contain animate-pulse" />
                            ) : isLiveActive ? <PhoneOff size={18} /> : <Mic size={18} />}
                        </button>
                    )}
                    {/* Minimize bar → bubble */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                        className="shrink-0 flex items-center justify-center rounded-full transition-colors"
                        style={{
                            width: '36px', height: '36px', minWidth: '36px',
                            color: colors?.mutedText || '#737373',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = colors?.primary || '#FBB92B'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = colors?.mutedText || '#737373'; }}
                        title="Minimizar"
                    >
                        <Minus size={18} />
                    </button>
                    {/* Open drawer */}
                    {!isLiveActive && (
                        <button
                            onClick={() => setIsOpen(true)}
                            className="shrink-0 flex items-center justify-center rounded-full shadow-sm transition-colors"
                            style={{
                                width: '36px', height: '36px', minWidth: '36px',
                                backgroundColor: hexToRgba(colors?.primary || '#FBB92B', 0.1),
                                color: colors?.primary || '#FBB92B',
                            }}
                        >
                            <Send size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // =========================================================================
    // MODE 3: DRAWER CONTENT (Full chat panel)
    // =========================================================================
    const drawerContent = (
        <div
            className={`fixed z-[10000] border shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-300 ${isExpanded ? 'inset-4' : 'bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] h-[65vh] md:h-[550px]'}`}
            style={{
                backgroundColor: colors?.background || '#000000',
                borderColor: colors?.inputBorder || '#222222',
                animation: 'slideUp 0.3s ease',
            }}
        >
            {/* Drawer Header */}
            <div
                className="p-4 flex justify-between items-center shrink-0 select-none"
                style={{ backgroundColor: colors?.headerBackground }}
            >
                <div className="flex items-center gap-3">
                    {/* Minimize button → sends to bubble */}
                    <button
                        onClick={() => { setIsMinimized(true); setIsOpen(false); }}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: colors?.headerText }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors?.headerText}15`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Minimizar a burbuja"
                    >
                        <Minus size={20} />
                    </button>

                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border"
                            style={{ backgroundColor: `${colors?.headerText}10`, borderColor: `${colors?.headerText}20` }}
                        >
                            {config.appearance.avatarUrl ? (
                                <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover" />
                            ) : (
                                <Bot size={24} style={{ color: colors?.headerText }} />
                            )}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} style={{ borderColor: colors?.headerBackground }}></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight" style={{ color: colors?.headerText }}>
                            {config.agentName}
                        </h3>
                        <p className="text-[10px] opacity-90 font-medium" style={{ color: colors?.headerText }}>
                            {isLiveActive ? '🎤 Escuchando...' : isLoading ? 'Escribiendo...' : 'En línea'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1 items-center">
                    {/* Expand/collapse toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-md transition-colors hidden md:flex"
                        style={{ color: colors?.headerText }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors?.headerText}20`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    {/* Close → back to center bar */}
                    <button
                        onClick={() => { setIsOpen(false); setIsMinimized(false); stopLiveSession(); }}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: colors?.headerText }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors?.headerText}20`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 flex flex-col overflow-hidden relative" style={{ backgroundColor: 'transparent' }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ backgroundColor: hexToRgba(colors?.background || '#000000', 0.5) }}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {/* Bot avatar */}
                            {message.role === 'assistant' && (
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center mr-2 shrink-0 overflow-hidden border"
                                    style={{ backgroundColor: `${colors?.primary}10`, borderColor: `${colors?.primary}20` }}
                                >
                                    {config.appearance.avatarUrl ? (
                                        <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-5 h-5 object-contain" />
                                    ) : (
                                        <Bot size={16} style={{ color: colors?.primary }} />
                                    )}
                                </div>
                            )}

                            {/* Message bubble */}
                            <div
                                className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${message.role === 'user'
                                    ? 'rounded-tr-sm'
                                    : 'rounded-tl-sm border'
                                    }`}
                                style={{
                                    backgroundColor: message.role === 'user' ? colors?.userBubbleBackground : colors?.botBubbleBackground,
                                    color: message.role === 'user' ? colors?.userBubbleText : colors?.botBubbleText,
                                    borderColor: message.role === 'user' ? 'transparent' : colors?.inputBorder,
                                }}
                            >
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                        a: ({ href, children }) => (
                                            <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline hover:opacity-80"
                                                style={{ color: message.role === 'user' ? colors?.userBubbleText : colors?.primary }}
                                            >
                                                {children}
                                            </a>
                                        ),
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>

                            {/* User avatar */}
                            {message.role === 'user' && (
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center ml-2 shrink-0 overflow-hidden border"
                                    style={{ backgroundColor: `${colors?.inputBackground}80`, borderColor: colors?.inputBorder }}
                                >
                                    <span className="text-sm">👤</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center mr-2 shrink-0 overflow-hidden border"
                                style={{ backgroundColor: `${colors?.primary}10`, borderColor: `${colors?.primary}20` }}
                            >
                                {config.appearance.avatarUrl ? (
                                    <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-5 h-5 object-contain animate-pulse" />
                                ) : (
                                    <Bot size={16} style={{ color: colors?.primary }} className="animate-pulse" />
                                )}
                            </div>
                            <div
                                className="px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm border"
                                style={{ backgroundColor: colors?.botBubbleBackground, color: colors?.mutedText, borderColor: colors?.inputBorder }}
                            >
                                <img src={QUIMERA_LOGO} alt="Loading..." className="w-4 h-4 object-contain animate-pulse" />
                                <span>Pensando...</span>
                            </div>
                        </div>
                    )}

                    {/* Lead capture form */}
                    {showLeadForm && (
                        <div
                            className="p-4 rounded-2xl border shadow-sm"
                            style={{ backgroundColor: colors?.botBubbleBackground, borderColor: colors?.inputBorder }}
                        >
                            <h4 className="font-semibold mb-3" style={{ color: colors?.botBubbleText }}>
                                {t('landingChatbot.leadForm.title', '¿Te gustaría que te contactemos?')}
                            </h4>
                            <form onSubmit={handleLeadSubmit} className="space-y-3">
                                <input
                                    type="text"
                                    placeholder={t('landingChatbot.leadForm.name', 'Tu nombre')}
                                    value={leadFormData.name}
                                    onChange={(e) => setLeadFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all"
                                    style={{
                                        backgroundColor: colors?.inputBackground,
                                        borderColor: colors?.inputBorder,
                                        color: colors?.inputText
                                    }}
                                />
                                <input
                                    type="email"
                                    required
                                    placeholder={t('landingChatbot.leadForm.email', 'Tu email *')}
                                    value={leadFormData.email}
                                    onChange={(e) => setLeadFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all"
                                    style={{
                                        backgroundColor: colors?.inputBackground,
                                        borderColor: colors?.inputBorder,
                                        color: colors?.inputText
                                    }}
                                />
                                <input
                                    type="tel"
                                    placeholder={t('landingChatbot.leadForm.phone', 'Tu teléfono (opcional)')}
                                    value={leadFormData.phone || ''}
                                    onChange={(e) => setLeadFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all"
                                    style={{
                                        backgroundColor: colors?.inputBackground,
                                        borderColor: colors?.inputBorder,
                                        color: colors?.inputText
                                    }}
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 shadow-md"
                                        style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonIcon }}
                                    >
                                        {t('landingChatbot.leadForm.submit', 'Enviar')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowLeadForm(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
                                        style={{ borderColor: colors?.inputBorder, color: colors?.mutedText }}
                                    >
                                        {t('landingChatbot.leadForm.later', 'Después')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div
                    className="p-4 border-t shrink-0"
                    style={{ backgroundColor: colors?.botBubbleBackground, borderColor: colors?.inputBorder }}
                >
                    {/* Voice active overlay */}
                    {isLiveActive ? (
                        <div className="flex items-center gap-3 justify-center py-2">
                            <div className="flex items-end gap-1 h-8">
                                {visualizerLevels.map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 rounded-full transition-all duration-75"
                                        style={{ height: `${Math.max(4, height)}px`, backgroundColor: colors?.primary }}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: colors?.primary }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Escuchando...
                            </span>
                            <button
                                onClick={stopLiveSession}
                                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all"
                            >
                                <PhoneOff size={18} />
                            </button>
                        </div>
                    ) : (
                    <div
                        className="flex items-center gap-2 p-1.5 rounded-full border transition-all"
                        style={{
                            backgroundColor: hexToRgba(colors?.inputBackground || '#111111', 0.3),
                            borderColor: colors?.inputBorder,
                        }}
                    >
                        {/* Clear chat */}
                        <button
                            onClick={() => setMessages([])}
                            className="p-2 rounded-full transition-colors"
                            style={{ color: colors?.mutedText }}
                            title="Limpiar chat"
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = colors?.mutedText || '#737373'}
                        >
                            <X size={18} />
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={config.inputPlaceholder}
                            disabled={isLoading || isLiveActive}
                            className="flex-1 bg-transparent px-2 text-sm outline-none"
                            style={{ color: colors?.inputText, '--tw-placeholder-opacity': '0.5' } as any}
                        />

                        {/* Voice button */}
                        {config.voice.enabled && (
                            <button
                                onClick={startLiveSession}
                                disabled={isConnecting || isLiveActive}
                                className="p-2 rounded-full transition-all"
                                style={{ color: colors?.mutedText }}
                                onMouseEnter={(e) => { if (!isConnecting) e.currentTarget.style.color = colors?.primary || '#FBB92B'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = colors?.mutedText || '#737373'; }}
                                title="Modo voz"
                            >
                                {isConnecting ? (
                                    <img src={QUIMERA_LOGO} alt="Connecting..." className="w-5 h-5 object-contain animate-pulse" />
                                ) : (
                                    <Mic size={20} />
                                )}
                            </button>
                        )}

                        {/* Send button */}
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={isLoading || !inputValue.trim() || isLiveActive}
                            className="shrink-0 flex items-center justify-center rounded-full shadow-md transition-all hover:opacity-90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxWidth: '36px', maxHeight: '36px', aspectRatio: '1 / 1', backgroundColor: colors?.buttonBackground, color: colors?.buttonIcon }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    )}

                    {/* Footer status bar */}
                    <div className="mt-2 flex justify-between items-center px-2">
                        <p className="text-[10px] flex items-center" style={{ color: colors?.mutedText }}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                            {isLiveActive ? '🎤 Voz activa' : config.agentRole}
                        </p>
                        <p className="text-[10px]" style={{ color: colors?.mutedText }}>
                            Powered by <span style={{ color: colors?.primary }} className="font-medium">Quimera.ai</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // =========================================================================
    // MAIN RENDER
    // =========================================================================
    return typeof document !== 'undefined'
        ? ReactDOM.createPortal(
            <>
                {/* Footer Trigger - Center Bar or Bubble (when drawer is closed) */}
                {!isOpen && footerTriggerContent}

                {/* Drawer - Full chat panel (when open) */}
                {isOpen && drawerContent}

                {/* CSS Keyframes for animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </>,
            document.body
        )
        : null;
};

export default LandingChatbotWidget;
