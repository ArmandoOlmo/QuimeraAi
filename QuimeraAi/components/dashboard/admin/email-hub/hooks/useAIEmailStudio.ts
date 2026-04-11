/**
 * useAIEmailStudio
 *
 * Custom hook encapsulating all AI Studio logic:
 * - Text chat with Gemini
 * - Voice mode with Gemini Live API
 * - AI-driven creation of campaigns, audiences, automations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../../contexts/core/AuthContext';
import { useAdmin } from '../../../../../contexts/admin/AdminContext';
import {
    db, collection, addDoc, doc, updateDoc,
} from '../../../../../firebase';
import { serverTimestamp } from 'firebase/firestore';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../../../../utils/genAiClient';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../../../../utils/geminiProxyClient';
import { logApiCall } from '../../../../../services/apiLoggingService';
import { generateEmailHtml } from '../../../../../utils/emailHtmlGenerator';
import { DEFAULT_EMAIL_GLOBAL_STYLES, DEFAULT_BLOCK_CONTENT, DEFAULT_BLOCK_STYLES } from '../../../../../types/email';
import type { EmailDocument, EmailBlockType, CampaignStatus } from '../../../../../types/email';
import { v4 as uuidv4 } from 'uuid';
import type {
    CrossTenantCampaign,
    CrossTenantAudience,
    DisplayMessage,
    AICreatedItem,
    AdminEmailTab,
} from '../types';
import { MODEL_TEXT, MODEL_VOICE } from '../types';
import { base64ToBytes, bytesToBase64, decodeAudioData, floatTo16BitPCM, formatDelay } from '../helpers';
import type { AdminEmailDataReturn } from './useAdminEmailData';

export interface AIEmailStudioReturn {
    // Chat state
    aiMessages: DisplayMessage[];
    aiInput: string;
    setAiInput: (v: string) => void;
    aiThinking: boolean;
    aiCreating: string | null;
    aiCreatedItems: AICreatedItem[];
    aiChatRef: React.RefObject<HTMLDivElement | null>;
    sendAIMessage: (text: string) => Promise<void>;

    // Voice state
    isVoiceActive: boolean;
    isVoiceConnecting: boolean;
    liveUserTranscript: string;
    liveModelTranscript: string;
    startVoiceSession: () => Promise<void>;
    stopVoiceSession: () => void;

    // AI create actions
    aiCreateCampaign: () => Promise<void>;
    aiCreateAudience: () => Promise<void>;
    aiCreateAutomation: () => Promise<void>;

    // Init
    initAIStudio: () => void;
}

export function useAIEmailStudio(
    data: AdminEmailDataReturn,
    activeTab: AdminEmailTab,
): AIEmailStudioReturn {
    const { user } = useAuth();
    const { tenants } = useAdmin();
    const { stats, tenantPerformance, campaigns, setCampaigns, audiences, setAudiences } = data;

    // Chat state
    const [aiMessages, setAiMessages] = useState<DisplayMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [aiThinking, setAiThinking] = useState(false);
    const [aiCreatedItems, setAiCreatedItems] = useState<AICreatedItem[]>([]);
    const [aiCreating, setAiCreating] = useState<string | null>(null);
    const aiHistoryRef = useRef<ChatMessage[]>([]);
    const aiChatRef = useRef<HTMLDivElement>(null);

    // Voice state
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');

    // Voice refs
    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isConnectedRef = useRef(false);
    const nextStartTimeRef = useRef(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const currentModelResponseRef = useRef<string>('');
    const currentUserTranscriptRef = useRef<string>('');

    // =========================================================================
    // SYSTEM PROMPT
    // =========================================================================

    const buildEmailStudioSystemPrompt = useCallback(() => {
        return `Eres un experto en Email Marketing para la plataforma Quimera.ai.
Tienes acceso a datos reales del sistema:
- ${tenants.length} tenants activos
- ${stats.totalCampaigns} campañas creadas
- ${stats.totalContacts.toLocaleString()} contactos en audiencias
- ${stats.totalSent.toLocaleString()} emails enviados históricamente
- Tasa de apertura promedio: ${stats.openRate}%
- Tasa de click promedio: ${stats.clickRate}%
- Top tenants por volumen: ${tenantPerformance.map(t => t.name).join(', ')}

Tu rol es ayudar al Super Administrador a:
1. Planificar y crear campañas de email efectivas
2. Optimizar subject lines para máximo open rate
3. Segmentar audiencias de manera inteligente
4. Diseñar flujos de automatización multi-paso
5. Analizar métricas y proponer mejoras
6. Diseñar emails profesionales usando bloques del editor visual

EDITOR VISUAL DE EMAIL:
El sistema usa un editor visual basado en bloques. Los tipos de bloques disponibles son:
- Hero: Sección principal con título, subtítulo, imagen de fondo y botón CTA
- Texto: Bloque de texto libre con formato
- Imagen: Bloque de imagen con dimensiones ajustables
- Botón: Botón CTA independiente con colores personalizables
- Divisor: Línea horizontal separadora
- Espaciador: Espacio en blanco vertical
- Columnas: Layout multi-columna (2 o 3 columnas)
- Productos: Catálogo de productos con precios y botones
- Redes Sociales: Íconos de redes sociales
- Pie de Email: Footer con datos legales y enlace de cancelar suscripción

Cuando crees campañas, cada bloque será individualmente editable, reordenable y personalizable en el editor visual.

AUTOMATIZACIONES DE EMAIL:
El sistema soporta flujos de trabajo multi-paso con un Constructor Visual de nodos. Puedes crear automatizaciones con estos tipos de nodos:
- ⚡ Trigger: El evento que inicia el flujo (customer.created, cart.abandoned, order.delivered, order.completed, customer.inactive, customer.birthday, browse.abandoned, customer.vip-qualified, customer.no-engagement-90d)
- 📧 Email: Envío de un email con subject y preview text configurables
- ⏱️ Delay: Espera antes del siguiente paso (minutos: 60=1h, 1440=1d, 4320=3d, 7200=5d, 10080=7d)
- 🔀 Condición: Verificación de comportamiento (email-opened, email-clicked, has-tag, purchase-made, custom)
- 🏷️ Acción: Tagging, mover a audiencia, notificaciones, etc.

Los 10 tipos de automatización disponibles son: welcome, abandoned-cart, post-purchase, win-back, birthday, browse-abandonment, upsell, review-request, vip-reward, sunset.
Las 4 categorías son: lifecycle (ciclo de vida), conversion, engagement, retention (retención).

Cuando crees automatizaciones, genera flujos de 5-8 pasos con emails, delays y condiciones para crear secuencias inteligentes.

IMPORTANTE: El administrador puede pedirte que CREES campañas, audiencias o automatizaciones directamente.
Cuando te pida crear algo, genera la respuesta normal conversacional describiendo lo que crearás.
El usuario usará los botones de acción en la interfaz para materializar la creación.

Responde siempre en español. Sé conciso pero informativo. Usa formato markdown.`;
    }, [stats, tenants, tenantPerformance]);

    // =========================================================================
    // INIT / WELCOME
    // =========================================================================

    const initAIStudio = useCallback(() => {
        const welcomeText = `¡Hola! 👋 Soy tu **Asistente AI de Email Marketing** para Quimera.ai.

Puedo ayudarte a:

- 📧 **Planificar** campañas de email completas
- ✍️ **Generar** subject lines, preview text y contenido HTML
- 🎯 **Recomendar** audiencias y segmentos óptimos
- ⏰ **Sugerir** horarios de envío basados en mejores prácticas
- 📊 **Analizar** el rendimiento de campañas anteriores
- 🤖 **Crear** flujos de automatización inteligentes
- 🎤 **Habla conmigo** usando el modo de voz

**Datos actuales del sistema:**
- ${stats.totalCampaigns} campañas totales
- ${stats.totalContacts.toLocaleString()} contactos en audiencias
- ${stats.totalSent.toLocaleString()} emails enviados
- ${stats.openRate}% tasa de apertura promedio

💡 **Usa los botones de acción** para crear campañas, audiencias y automatizaciones directamente desde esta conversación.

¿Qué tipo de campaña o estrategia de email necesitas crear hoy?`;

        const welcomeMsg: DisplayMessage = { role: 'model', text: welcomeText, timestamp: Date.now() };
        setAiMessages([welcomeMsg]);
        setAiCreatedItems([]);

        const systemContext = buildEmailStudioSystemPrompt();

        aiHistoryRef.current = [
            { role: 'user', text: `[CONTEXT] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [stats, tenants, tenantPerformance, buildEmailStudioSystemPrompt]);

    useEffect(() => {
        if (activeTab === 'ai-studio' && aiMessages.length === 0) {
            initAIStudio();
        }
    }, [activeTab, initAIStudio]);

    // Auto-scroll AI chat
    useEffect(() => {
        if (aiChatRef.current) {
            aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
        }
    }, [aiMessages, aiThinking, liveUserTranscript, liveModelTranscript]);

    // =========================================================================
    // SEND MESSAGE
    // =========================================================================

    const sendAIMessage = useCallback(async (text: string) => {
        if (!text.trim() || aiThinking) return;

        const userMsg: DisplayMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
        setAiMessages(prev => [...prev, userMsg]);
        setAiInput('');
        setAiThinking(true);

        aiHistoryRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildEmailStudioSystemPrompt();
            const conversationContext = aiHistoryRef.current
                .slice(1).slice(0, -1)
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const enrichedPrompt = `${systemPrompt}\n\n${conversationContext ? `--- CONVERSACIÓN PREVIA ---\n${conversationContext}\n--- FIN ---\n\n` : ''}Usuario: ${text.trim()}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio',
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
                setAiMessages(prev => [...prev, aiMsg]);
                aiHistoryRef.current.push({ role: 'model', text: responseText });
            }

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-email-studio',
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[AIEmailStudio] Chat error:', error);
            const errorMsg: DisplayMessage = {
                role: 'model',
                text: '⚠️ Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, errorMsg]);

            logApiCall({
                userId: user?.uid || '',
                projectId: 'ai-email-studio',
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        } finally {
            setAiThinking(false);
        }
    }, [aiThinking, user, buildEmailStudioSystemPrompt]);

    // =========================================================================
    // VOICE MODE — GEMINI LIVE API
    // =========================================================================

    const stopVoiceSession = useCallback(() => {
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
        // Flush any pending transcript into the conversation history before clearing
        if (currentUserTranscriptRef.current.trim()) {
            const leftover = currentUserTranscriptRef.current.trim();
            setAiMessages(prev => [...prev, { role: 'user', text: leftover, isVoice: true, timestamp: Date.now() }]);
            aiHistoryRef.current.push({ role: 'user', text: leftover });
        }
        if (currentModelResponseRef.current.trim()) {
            const leftover = currentModelResponseRef.current.trim();
            setAiMessages(prev => [...prev, { role: 'model', text: leftover, isVoice: true, timestamp: Date.now() }]);
            aiHistoryRef.current.push({ role: 'model', text: leftover });
        }
        // Clear live transcript state
        setLiveUserTranscript('');
        setLiveModelTranscript('');
        currentUserTranscriptRef.current = '';
        currentModelResponseRef.current = '';
        setIsVoiceActive(false);
        setIsVoiceConnecting(false);
    }, []);

    const startVoiceSession = async () => {
        setIsVoiceConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioCtx({ sampleRate: 24000 });
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const baseSystemPrompt = buildEmailStudioSystemPrompt();
            const conversationHistory = aiHistoryRef.current
                .filter(m => !m.text.startsWith('[CONTEXT]'))
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const systemPromptWithHistory = conversationHistory
                ? `${baseSystemPrompt}\n\n--- HISTORIAL DE CONVERSACIÓN PREVIA (el usuario ya habló contigo por texto, recuerda todo esto) ---\n${conversationHistory}\n--- FIN DEL HISTORIAL ---\n\nIMPORTANTE: Continúa la conversación naturalmente. El usuario ahora te habla por voz. Recuerda todo lo anterior y responde en contexto.`
                : baseSystemPrompt;

            let resolvedSession: any = null;
            let audioSendCount = 0;

            const session = await ai.live.connect({
                model: MODEL_VOICE,
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction: systemPromptWithHistory,
                    contextWindowCompression: { slidingWindow: {} },
                    sessionResumption: {},
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log('[EmailVoice] ✅ Session opened');
                        setIsVoiceConnecting(false);
                        setIsVoiceActive(true);
                        isConnectedRef.current = true;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        const msgKeys = Object.keys(msg);
                        if (!msgKeys.includes('sessionResumptionUpdate')) {
                            console.log('[EmailVoice] 📩 Message:', msgKeys, JSON.stringify(msg).substring(0, 300));
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
                            console.log('[EmailVoice] 🎤 User:', inputTranscript);
                            currentUserTranscriptRef.current += inputTranscript;
                            setLiveUserTranscript(currentUserTranscriptRef.current);
                        }
                        if (outputTranscript) {
                            console.log('[EmailVoice] 🔊 AI:', outputTranscript);
                            currentModelResponseRef.current += outputTranscript;
                            setLiveModelTranscript(currentModelResponseRef.current);
                        }

                        const turnComplete = msg.serverContent?.turnComplete
                            || msg.serverContent?.generationComplete
                            || msg.turnComplete;
                        if (turnComplete) {
                            console.log('[EmailVoice] ✅ Turn complete');
                            if (currentUserTranscriptRef.current.trim()) {
                                const userText = currentUserTranscriptRef.current.trim();
                                setAiMessages(prev => [...prev, { role: 'user', text: userText, isVoice: true, timestamp: Date.now() }]);
                                aiHistoryRef.current.push({ role: 'user', text: userText });
                                currentUserTranscriptRef.current = '';
                                setLiveUserTranscript('');
                            }
                            if (currentModelResponseRef.current.trim()) {
                                const modelText = currentModelResponseRef.current.trim();
                                setAiMessages(prev => [...prev, { role: 'model', text: modelText, isVoice: true, timestamp: Date.now() }]);
                                aiHistoryRef.current.push({ role: 'model', text: modelText });
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
                    onerror: (e: any) => { console.error('[EmailVoice] ❌ Error:', e); }
                }
            });

            resolvedSession = session;
            sessionRef.current = session;
            console.log('[EmailVoice] 🔗 Session resolved, setting up microphone...');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                console.log('[EmailVoice] 🎙️ Microphone access granted');

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
                            console.log(`[EmailVoice] 📤 Audio chunks sent: ${audioSendCount}`);
                        }
                    } catch (err) {
                        console.warn('[EmailVoice] Audio send error:', err);
                    }
                };

                source.connect(processor);
                processor.connect(inputCtx.destination);
                console.log('[EmailVoice] ✅ Audio pipeline ready — speak now!');
            } catch (micErr) {
                console.error('[EmailVoice] 🎙️ Microphone error:', micErr);
                stopVoiceSession();
            }
        } catch (error) {
            console.error('[EmailVoice] Voice session error:', error);
            setIsVoiceConnecting(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopVoiceSession(); };
    }, [stopVoiceSession]);

    // =========================================================================
    // AI CREATE CAMPAIGN
    // =========================================================================

    const aiCreateCampaign = async () => {
        setAiCreating('campaign');
        console.log('[AIEmailStudio] 🚀 Starting campaign creation with structured blocks...');

        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en TODA la conversación anterior, genera los datos para crear una campaña de email marketing con bloques visuales editables.

INSTRUCCIONES ESTRICTAS:
1. Devuelve ÚNICAMENTE un objeto JSON válido.
2. NO uses markdown, NO uses backticks, NO uses \`\`\`json.
3. El JSON debe contener estos campos de nivel superior:

{
  "name": "nombre de la campaña",
  "subject": "línea de asunto del email",
  "previewText": "texto de preview",
  "type": "newsletter",
  "blocks": [ ... ]
}

4. El campo "blocks" es un ARRAY de objetos de bloque. Cada bloque debe tener:
   { "type": "...", "content": { ... }, "styles": { ... } }

TIPOS DE BLOQUES DISPONIBLES:

a) "hero" — Sección principal con imagen de fondo, título, subtítulo y botón CTA.
   content: { "headline": "...", "subheadline": "...", "buttonText": "...", "buttonUrl": "#", "showButton": true, "imageUrl": "" }
   styles: { "backgroundColor": "#4f46e5", "textColor": "#ffffff", "headingColor": "#ffffff", "buttonColor": "#ffffff", "buttonTextColor": "#4f46e5", "padding": "lg", "alignment": "center" }

b) "text" — Bloque de texto libre (puede ser HTML con etiquetas <b>, <i>, <a>, <br>, <ul>, <li>).
   content: { "text": "Tu texto aquí...", "isHtml": false }
   styles: { "backgroundColor": "transparent", "textColor": "#52525b", "padding": "md", "alignment": "left", "fontSize": "md" }
   Nota: fontSize puede ser "xs", "sm", "md", "lg", "xl", "2xl", "3xl"

c) "image" — Bloque de imagen.
   content: { "src": "https://placehold.co/600x300/4f46e5/white?text=Tu+Imagen", "alt": "Descripción", "width": 100 }
   styles: { "padding": "sm", "alignment": "center", "borderRadius": "md" }

d) "button" — Botón CTA independiente.
   content: { "text": "Click Aquí", "url": "#", "fullWidth": false }
   styles: { "buttonColor": "#4f46e5", "buttonTextColor": "#ffffff", "padding": "md", "alignment": "center", "borderRadius": "md" }

e) "divider" — Línea horizontal separadora.
   content: { "style": "solid", "thickness": 1, "width": 100 }
   styles: { "borderColor": "#e4e4e7", "padding": "sm" }

f) "spacer" — Espacio en blanco vertical.
   content: { "height": 32 }
   styles: { "padding": "none" }

g) "social" — Íconos de redes sociales.
   content: { "links": { "facebook": "", "instagram": "", "twitter": "", "linkedin": "" }, "iconStyle": "color", "iconSize": "md" }
   styles: { "padding": "md", "alignment": "center" }

h) "footer" — Pie de email con datos legales y link de unsuscribe.
   content: { "companyName": "Tu Empresa", "address": "", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "showSocialLinks": false, "copyrightText": "© 2025 Todos los derechos reservados" }
   styles: { "backgroundColor": "#f4f4f5", "textColor": "#71717a", "padding": "lg", "alignment": "center", "fontSize": "xs" }

EJEMPLO DE CAMPAÑA COMPLETA:
{
  "name": "Newsletter Mayo",
  "subject": "🚀 Las novedades de mayo están aquí",
  "previewText": "Descubre todo lo nuevo este mes",
  "type": "newsletter",
  "blocks": [
    { "type": "hero", "content": { "headline": "Bienvenido a Mayo", "subheadline": "Las mejores novedades del mes", "buttonText": "Ver Más", "buttonUrl": "#", "showButton": true }, "styles": { "backgroundColor": "#4f46e5", "headingColor": "#ffffff", "textColor": "#ffffff", "buttonColor": "#ffffff", "buttonTextColor": "#4f46e5", "padding": "lg", "alignment": "center" } },
    { "type": "text", "content": { "text": "Hola! Te traemos las últimas actualizaciones...", "isHtml": false }, "styles": { "padding": "md", "textColor": "#374151", "alignment": "left", "fontSize": "md" } },
    { "type": "divider", "content": { "style": "solid", "thickness": 1, "width": 80 }, "styles": { "borderColor": "#e5e7eb", "padding": "sm" } },
    { "type": "button", "content": { "text": "Explora Ahora", "url": "#", "fullWidth": false }, "styles": { "buttonColor": "#4f46e5", "buttonTextColor": "#ffffff", "padding": "md", "alignment": "center", "borderRadius": "md" } },
    { "type": "footer", "content": { "companyName": "Quimera.ai", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "copyrightText": "© 2025 Quimera.ai" }, "styles": { "backgroundColor": "#f9fafb", "textColor": "#9ca3af", "padding": "lg", "alignment": "center", "fontSize": "xs" } }
  ]
}

REGLAS IMPORTANTES:
- Usa MÚLTIPLES bloques — un email profesional tiene mínimo 4-6 bloques.
- Empieza siempre con un bloque "hero" atractivo.
- Termina siempre con un bloque "footer" con unsubscribe.
- Usa colores coherentes y profesionales.
- El contenido debe reflejar lo que se discutió en la conversación.
- NO generes HTML crudo, genera la estructura de bloques.

CONVERSACIÓN PREVIA:
${conversationSummary}

RESPONDE SOLO CON EL JSON:`;

            console.log('[AIEmailStudio] 📤 Sending structured block prompt to proxy...');
            const response = await generateChatContentViaProxy(
                'ai-email-studio',
                [],
                prompt,
                'Eres un generador de JSON para bloques de email. Devuelve SOLO un objeto JSON válido con la estructura de bloques especificada. Sin markdown, sin explicaciones, sin backticks. Solo el JSON puro.',
                MODEL_TEXT,
                { temperature: 0.4, maxOutputTokens: 8192 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            console.log('[AIEmailStudio] 📝 Raw response:', responseText.substring(0, 500));

            // Clean markdown code fences if present
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // Try to extract JSON from the response even if there's surrounding text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                responseText = jsonMatch[0];
            }

            let campaignData: any;
            try {
                campaignData = JSON.parse(responseText);
                console.log('[AIEmailStudio] ✅ JSON parsed:', campaignData.name, '— blocks:', campaignData.blocks?.length);
            } catch (parseError) {
                console.warn('[AIEmailStudio] ⚠️ JSON parse failed, using fallback:', parseError);
                const lastUserMsg = aiHistoryRef.current.filter(m => m.role === 'user').pop()?.text || 'Campaña AI';
                campaignData = {
                    name: `Campaña — ${lastUserMsg.substring(0, 50)}`,
                    subject: lastUserMsg.substring(0, 100),
                    previewText: '',
                    type: 'newsletter',
                    blocks: [
                        { type: 'hero', content: { headline: lastUserMsg.substring(0, 80), subheadline: 'Campaña generada por AI Email Studio', buttonText: 'Ver más', buttonUrl: '#', showButton: true }, styles: { backgroundColor: '#4f46e5', headingColor: '#ffffff', textColor: '#ffffff', buttonColor: '#ffffff', buttonTextColor: '#4f46e5', padding: 'lg', alignment: 'center' } },
                        { type: 'text', content: { text: 'Personaliza el contenido de esta campaña desde el editor visual. Puedes arrastrar, reordenar y editar cada bloque individualmente.', isHtml: false }, styles: { padding: 'md', textColor: '#52525b', alignment: 'left', fontSize: 'md' } },
                        { type: 'footer', content: { companyName: 'Quimera.ai', showUnsubscribe: true, unsubscribeText: 'Cancelar suscripción', copyrightText: '© 2025 Quimera.ai' }, styles: { backgroundColor: '#f4f4f5', textColor: '#71717a', padding: 'lg', alignment: 'center', fontSize: 'xs' } },
                    ],
                };
            }

            // Convert AI blocks into proper EmailBlock[] with IDs and defaults
            const VALID_BLOCK_TYPES = new Set(['hero', 'text', 'image', 'button', 'divider', 'spacer', 'columns', 'products', 'social', 'footer']);
            const aiBlocks: any[] = Array.isArray(campaignData.blocks) ? campaignData.blocks : [];

            const emailBlocks = aiBlocks
                .filter((b: any) => b && VALID_BLOCK_TYPES.has(b.type))
                .map((b: any) => ({
                    id: uuidv4(),
                    type: b.type as EmailBlockType,
                    visible: true,
                    content: { ...(DEFAULT_BLOCK_CONTENT[b.type as EmailBlockType] || {}), ...(b.content || {}) },
                    styles: { ...(DEFAULT_BLOCK_STYLES[b.type as EmailBlockType] || {}), ...(b.styles || {}) },
                }));

            if (emailBlocks.length === 0) {
                emailBlocks.push({
                    id: uuidv4(),
                    type: 'text' as EmailBlockType,
                    visible: true,
                    content: { text: 'Campaña generada por AI Email Studio. Edita este bloque o añade más bloques desde el editor.', isHtml: false },
                    styles: { ...DEFAULT_BLOCK_STYLES.text },
                });
            }

            console.log('[AIEmailStudio] 🧱 Built', emailBlocks.length, 'editor blocks:', emailBlocks.map((b: any) => b.type));

            const aiEmailDocument = {
                id: uuidv4(),
                name: campaignData.name || 'Campaña AI',
                subject: campaignData.subject || 'Sin asunto',
                previewText: campaignData.previewText || '',
                blocks: emailBlocks,
                globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
            };

            const generatedHtml = generateEmailHtml(aiEmailDocument as EmailDocument);

            const newCampaign = {
                name: campaignData.name || 'Campaña AI',
                subject: campaignData.subject || 'Sin asunto',
                previewText: campaignData.previewText || '',
                type: campaignData.type || 'newsletter',
                htmlContent: generatedHtml,
                emailDocument: JSON.parse(JSON.stringify(aiEmailDocument)),
                audienceType: 'all' as const,
                status: 'draft' as CampaignStatus,
                stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, totalOpens: 0, uniqueOpens: 0, clicked: 0, totalClicks: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                tags: ['ai-generated'],
                createdBy: user?.uid || 'ai-studio',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            console.log('[AIEmailStudio] 💾 Saving to Firestore...');
            const docRef = await addDoc(collection(db, 'adminEmailCampaigns'), newCampaign);
            console.log('[AIEmailStudio] ✅ Saved! Doc ID:', docRef.id);

            setCampaigns(prev => [{
                id: docRef.id,
                ...newCampaign,
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as CrossTenantCampaign, ...prev]);

            setAiCreatedItems(prev => [...prev, { type: 'campaign', name: campaignData.name, id: docRef.id, timestamp: Date.now() }]);

            const blockSummary = emailBlocks.map((b: any) => {
                const labels: Record<string, string> = { hero: 'Hero', text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Divisor', spacer: 'Espaciador', social: 'Redes Sociales', footer: 'Pie de Email', columns: 'Columnas', products: 'Productos' };
                return `  - 🧱 ${labels[b.type] || b.type}`;
            }).join('\n');

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Campaña creada exitosamente!**\n\n- **Nombre:** ${campaignData.name}\n- **Asunto:** ${campaignData.subject}\n- **Tipo:** ${campaignData.type}\n- **Estado:** Borrador\n- **Bloques del editor:** ${emailBlocks.length}\n${blockSummary}\n- **ID:** \`${docRef.id}\`\n\n📝 La campaña ya aparece en la pestaña de **Campañas**. Al abrirla en el editor visual, cada bloque será **individualmente editable** — puedes arrastrar, reordenar, duplicar o eliminar bloques.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] ❌ Campaign creation error:', error);
            const errorDetail = error instanceof Error ? error.message : String(error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la campaña:**\n\n\`${errorDetail}\`\n\nPor favor intenta de nuevo. Si el problema persiste, verifica la consola del navegador para más detalles.`,
                timestamp: Date.now(),
            }]);
        } finally {
            setAiCreating(null);
        }
    };

    // =========================================================================
    // AI CREATE AUDIENCE
    // =========================================================================

    const aiCreateAudience = async () => {
        setAiCreating('audience');
        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en la conversación anterior, genera los datos para crear un segmento de audiencia.
Devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{"name":"...","description":"...","acceptsMarketing":true,"hasOrdered":false,"tags":[],"estimatedCount":0}

Conversación:\n${conversationSummary}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio', [], prompt,
                'Devuelve SOLO JSON válido.', MODEL_TEXT,
                { temperature: 0.3, maxOutputTokens: 2048 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) responseText = jsonMatch[0];

            let audienceData: any;
            try {
                audienceData = JSON.parse(responseText);
            } catch {
                const lastUserMsg = aiHistoryRef.current.filter(m => m.role === 'user').pop()?.text || 'Audiencia AI';
                audienceData = {
                    name: `Audiencia — ${lastUserMsg.substring(0, 50)}`,
                    description: lastUserMsg.substring(0, 200),
                    acceptsMarketing: true,
                    tags: ['ai-generated'],
                    estimatedCount: 0,
                };
            }

            const newAudience = {
                name: audienceData.name || 'Audiencia AI',
                description: audienceData.description || '',
                filters: [],
                acceptsMarketing: audienceData.acceptsMarketing ?? true,
                hasOrdered: audienceData.hasOrdered ?? false,
                tags: audienceData.tags || ['ai-generated'],
                estimatedCount: audienceData.estimatedCount || 0,
                isDefault: false,
                createdBy: user?.uid || 'ai-studio',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'adminEmailAudiences'), newAudience);

            setAudiences(prev => [{
                id: docRef.id,
                ...newAudience,
                tenantId: 'admin',
                tenantName: 'Super Admin',
                userId: user?.uid || 'admin',
                projectId: 'admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as CrossTenantAudience, ...prev]);

            setAiCreatedItems(prev => [...prev, { type: 'audience', name: audienceData.name, id: docRef.id, timestamp: Date.now() }]);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Audiencia creada exitosamente!**\n\n- **Nombre:** ${audienceData.name}\n- **Descripción:** ${audienceData.description}\n- **Acepta marketing:** ${audienceData.acceptsMarketing ? 'Sí' : 'No'}\n- **ID:** \`${docRef.id}\`\n\nEl segmento ya aparece en la pestaña de **Audiencias**.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] ❌ Audience creation error:', error);
            const errorDetail = error instanceof Error ? error.message : String(error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la audiencia:**\n\n\`${errorDetail}\`\n\nIntenta de nuevo.`,
                timestamp: Date.now(),
            }]);
        } finally {
            setAiCreating(null);
        }
    };

    // =========================================================================
    // AI CREATE AUTOMATION
    // =========================================================================

    const aiCreateAutomation = async () => {
        setAiCreating('automation');
        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.text}`)
                .join('\n');

            // ── STEP 1: Generate Automation Structure ──────────────────────────
            const automationPrompt = `Basándote en la conversación anterior, genera los datos para crear una automatización de email marketing COMPLETA con flujo de trabajo multi-paso.

Devuelve SOLO un JSON válido (sin markdown, sin backticks) con esta estructura:

{
  "name": "Nombre de la automatización",
  "description": "Descripción breve del flujo",
  "type": "welcome|abandoned-cart|post-purchase|win-back|birthday|browse-abandonment|upsell|review-request|vip-reward|sunset",
  "category": "lifecycle|conversion|engagement|retention",
  "triggerEvent": "customer.created|cart.abandoned|order.delivered|order.completed|customer.inactive|customer.birthday|browse.abandoned|customer.vip-qualified|customer.no-engagement-90d",
  "status": "draft",
  "steps": [
    {
      "id": "t1",
      "type": "trigger",
      "label": "Descripción del trigger",
      "order": 0
    },
    {
      "id": "e1",
      "type": "email",
      "label": "Nombre del email",
      "order": 1,
      "emailConfig": {
        "subject": "Línea de asunto del email",
        "previewText": "Preview text opcional"
      }
    },
    {
      "id": "d1",
      "type": "delay",
      "label": "Esperar X tiempo",
      "order": 2,
      "delayConfig": {
        "delayMinutes": 1440,
        "delayType": "fixed"
      }
    },
    {
      "id": "c1",
      "type": "condition",
      "label": "¿Condición?",
      "order": 3,
      "conditionConfig": {
        "conditionType": "email-opened|email-clicked|has-tag|purchase-made|custom",
        "referenceStepId": "e1"
      }
    },
    {
      "id": "a1",
      "type": "action",
      "label": "Descripción de la acción",
      "order": 4,
      "actionConfig": {
        "actionType": "add-tag|remove-tag|move-to-audience|update-field|send-notification",
        "tagName": "nombre-del-tag"
      }
    }
  ]
}

REGLAS DE PASOS:
- El primer paso SIEMPRE debe ser type "trigger" (order 0)
- Usa múltiples pasos — un flujo profesional tiene 5-8 pasos mínimo
- Alterna entre emails, delays y condiciones para crear un flujo inteligente
- Los delays comunes: 60 (1 hora), 1440 (1 día), 4320 (3 días), 7200 (5 días), 10080 (7 días)
- Si usas condiciones, colócalas DESPUÉS del email que verifican
- Termina con una acción (tag) cuando sea apropiado
- Cada "id" debe ser único (usa t1, e1, e2, d1, d2, c1, a1, etc.)
- Los subjects de emails deben ser creativos y con emojis

EJEMPLO COMPLETO (Serie de Bienvenida):
{"name":"Serie de Bienvenida","description":"Secuencia de onboarding para nuevos suscriptores","type":"welcome","category":"lifecycle","triggerEvent":"customer.created","status":"draft","steps":[{"id":"t1","type":"trigger","label":"Nuevo suscriptor","order":0},{"id":"e1","type":"email","label":"Email de Bienvenida","order":1,"emailConfig":{"subject":"¡Bienvenido! 🎉 Tu aventura empieza aquí","previewText":"Gracias por unirte a nuestra comunidad"}},{"id":"d1","type":"delay","label":"Esperar 1 día","order":2,"delayConfig":{"delayMinutes":1440,"delayType":"fixed"}},{"id":"e2","type":"email","label":"Guía de Primeros Pasos","order":3,"emailConfig":{"subject":"📚 Guía rápida para empezar","previewText":"Todo lo que necesitas saber"}},{"id":"c1","type":"condition","label":"¿Abrió el email?","order":4,"conditionConfig":{"conditionType":"email-opened","referenceStepId":"e2"}},{"id":"d2","type":"delay","label":"Esperar 3 días","order":5,"delayConfig":{"delayMinutes":4320,"delayType":"fixed"}},{"id":"e3","type":"email","label":"Tips Profesionales","order":6,"emailConfig":{"subject":"💡 5 tips que los pros usan","previewText":"Saca el máximo provecho"}},{"id":"a1","type":"action","label":"Marcar como onboarded","order":7,"actionConfig":{"actionType":"add-tag","tagName":"onboarding-complete"}}]}

Conversación:\n${conversationSummary}

RESPONDE SOLO CON EL JSON:`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio', [], automationPrompt,
                'Eres un generador de JSON para automatizaciones de email. Devuelve SOLO un JSON válido con la estructura de flujo multi-paso especificada. Sin markdown, sin explicaciones, sin backticks. Solo el JSON puro.',
                MODEL_TEXT,
                { temperature: 0.4, maxOutputTokens: 4096 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) responseText = jsonMatch[0];

            let autoData: any;
            try {
                autoData = JSON.parse(responseText);
                console.log('[AIEmailStudio] ✅ Automation JSON parsed:', autoData.name, '— steps:', autoData.steps?.length);
            } catch {
                console.warn('[AIEmailStudio] ⚠️ JSON parse failed for automation, using fallback');
                autoData = {
                    name: `Automatización AI — ${new Date().toLocaleDateString('es-ES')}`,
                    description: 'Automatización generada por AI Email Studio',
                    type: 'welcome',
                    category: 'lifecycle',
                    triggerEvent: 'customer.created',
                    status: 'draft',
                    steps: [
                        { id: 't1', type: 'trigger', label: 'Nuevo suscriptor', order: 0 },
                        { id: 'e1', type: 'email', label: 'Email de Bienvenida', order: 1, emailConfig: { subject: '¡Bienvenido! 🎉' } },
                        { id: 'd1', type: 'delay', label: 'Esperar 1 día', order: 2, delayConfig: { delayMinutes: 1440, delayType: 'fixed' } },
                        { id: 'e2', type: 'email', label: 'Seguimiento', order: 3, emailConfig: { subject: '¿Cómo va todo? 💬' } },
                    ],
                };
            }

            // Sanitize steps for Firestore (strip undefined values)
            const sanitizedSteps = Array.isArray(autoData.steps)
                ? autoData.steps.map((s: any) => JSON.parse(JSON.stringify(s)))
                : [];

            const firstEmailSubject = sanitizedSteps.find((s: any) => s.type === 'email')?.emailConfig?.subject || '';

            const newAutomationData = {
                name: autoData.name || 'Automatización AI',
                description: autoData.description || '',
                type: autoData.type || 'welcome',
                category: autoData.category || 'lifecycle',
                status: autoData.status || 'draft',
                triggerConfig: {
                    type: 'event' as const,
                    event: autoData.triggerEvent || 'customer.created',
                },
                audienceId: '',
                steps: sanitizedSteps,
                templateId: '',
                subject: firstEmailSubject,
                delayMinutes: sanitizedSteps.find((s: any) => s.type === 'delay')?.delayConfig?.delayMinutes || 60,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const automationDocRef = await addDoc(collection(db, 'adminEmailAutomations'), newAutomationData);
            const automationId = automationDocRef.id;
            setAiCreatedItems(prev => [...prev, { type: 'automation', name: autoData.name, id: automationId, timestamp: Date.now() }]);

            console.log('[AIEmailStudio] ✅ Automation saved:', automationId, '— now generating email content for each email step...');

            // ── STEP 2: Generate Visual Email Content for each email step ──────
            const emailSteps = sanitizedSteps.filter((s: any) => s.type === 'email');
            const emailCreationResults: { stepId: string; label: string; subject: string; campaignId: string; blockCount: number }[] = [];

            // Send a progress message
            const progressMsg: DisplayMessage = {
                role: 'model',
                text: `⏳ **Automatización creada.** Ahora estoy generando el contenido visual para ${emailSteps.length} email(s) del flujo...\n\n_Cada email tendrá su propio diseño con bloques editables en el editor visual._`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, progressMsg]);

            for (const emailStep of emailSteps) {
                try {
                    const stepSubject = emailStep.emailConfig?.subject || emailStep.label || 'Email';
                    const stepPreview = emailStep.emailConfig?.previewText || '';
                    const stepLabel = emailStep.label || 'Email';
                    const stepPosition = emailStep.order + 1;
                    const totalSteps = sanitizedSteps.length;

                    // Generate email blocks via AI
                    const emailBlockPrompt = `Genera el contenido visual en bloques para un email de automatización.

CONTEXTO:
- Automatización: "${autoData.name}" — ${autoData.description || ''}
- Tipo: ${autoData.type} | Categoría: ${autoData.category}
- Este es el paso ${stepPosition} de ${totalSteps} del flujo
- Nombre del paso: "${stepLabel}"
- Asunto: "${stepSubject}"
- Preview: "${stepPreview}"
- Trigger: ${autoData.triggerEvent}

Devuelve SOLO un JSON válido (sin markdown, sin backticks) con un array de bloques:
{
  "blocks": [
    { "type": "hero", "content": { "headline": "...", "subheadline": "...", "buttonText": "...", "buttonUrl": "#", "showButton": true }, "styles": { "backgroundColor": "#4f46e5", "headingColor": "#ffffff", "textColor": "#ffffff", "buttonColor": "#ffffff", "buttonTextColor": "#4f46e5", "padding": "lg", "alignment": "center" } },
    { "type": "text", "content": { "text": "...", "isHtml": false }, "styles": { "padding": "md", "textColor": "#374151", "alignment": "left", "fontSize": "md" } },
    { "type": "button", "content": { "text": "...", "url": "#", "fullWidth": false }, "styles": { "buttonColor": "#4f46e5", "buttonTextColor": "#ffffff", "padding": "md", "alignment": "center", "borderRadius": "md" } },
    { "type": "footer", "content": { "companyName": "Quimera.ai", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "copyrightText": "© 2025 Quimera.ai" }, "styles": { "backgroundColor": "#f9fafb", "textColor": "#9ca3af", "padding": "lg", "alignment": "center", "fontSize": "xs" } }
  ]
}

REGLAS:
- Genera mínimo 4 bloques: hero + texto + botón/imagen + footer
- El contenido debe ser relevante al paso y al tipo de automatización
- Usa colores coherentes y profesionales
- El tono debe coincidir con la posición en el flujo (primer email = bienvenida cálida, recordatorio = urgencia suave, etc.)
- Para ${autoData.type}: adapta el mensaje (bienvenida, abandono de carrito, post-compra, etc.)

RESPONDE SOLO CON EL JSON:`;

                    const emailResponse = await generateChatContentViaProxy(
                        'ai-email-studio', [], emailBlockPrompt,
                        'Genera SOLO un JSON válido con un array de bloques de email. Sin markdown, sin backticks.',
                        MODEL_TEXT,
                        { temperature: 0.5, maxOutputTokens: 4096 },
                        user?.uid
                    );

                    let emailResponseText = extractTextFromResponse(emailResponse) || '';
                    emailResponseText = emailResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const emailJsonMatch = emailResponseText.match(/\{[\s\S]*\}/);
                    if (emailJsonMatch) emailResponseText = emailJsonMatch[0];

                    let emailData: any;
                    try {
                        emailData = JSON.parse(emailResponseText);
                    } catch {
                        // Fallback blocks if AI parse fails
                        emailData = { blocks: [
                            { type: 'hero', content: { headline: stepLabel, subheadline: stepPreview || autoData.description, buttonText: 'Ver más', buttonUrl: '#', showButton: true }, styles: { backgroundColor: '#4f46e5', headingColor: '#ffffff', textColor: '#ffffff', buttonColor: '#ffffff', buttonTextColor: '#4f46e5', padding: 'lg', alignment: 'center' } },
                            { type: 'text', content: { text: `Este email es parte de la automatización "${autoData.name}". Personaliza el contenido desde el editor visual.`, isHtml: false }, styles: { padding: 'md', textColor: '#52525b', alignment: 'left', fontSize: 'md' } },
                            { type: 'footer', content: { companyName: 'Quimera.ai', showUnsubscribe: true, unsubscribeText: 'Cancelar suscripción', copyrightText: '© 2025 Quimera.ai' }, styles: { backgroundColor: '#f4f4f5', textColor: '#71717a', padding: 'lg', alignment: 'center', fontSize: 'xs' } },
                        ] };
                    }

                    // Build proper EmailBlocks with IDs and defaults
                    const VALID_BLOCK_TYPES = new Set(['hero', 'text', 'image', 'button', 'divider', 'spacer', 'columns', 'products', 'social', 'footer']);
                    const aiBlocks: any[] = Array.isArray(emailData.blocks) ? emailData.blocks : [];

                    const emailBlocks = aiBlocks
                        .filter((b: any) => b && VALID_BLOCK_TYPES.has(b.type))
                        .map((b: any) => ({
                            id: uuidv4(),
                            type: b.type as EmailBlockType,
                            visible: true,
                            content: { ...(DEFAULT_BLOCK_CONTENT[b.type as EmailBlockType] || {}), ...(b.content || {}) },
                            styles: { ...(DEFAULT_BLOCK_STYLES[b.type as EmailBlockType] || {}), ...(b.styles || {}) },
                        }));

                    if (emailBlocks.length === 0) {
                        emailBlocks.push({
                            id: uuidv4(),
                            type: 'text' as EmailBlockType,
                            visible: true,
                            content: { text: `Contenido del email "${stepLabel}". Edítalo desde el editor visual.`, isHtml: false },
                            styles: { ...DEFAULT_BLOCK_STYLES.text },
                        });
                    }

                    // Build EmailDocument
                    const emailDocument = {
                        id: uuidv4(),
                        name: `[Auto] ${autoData.name} — ${stepLabel}`,
                        subject: stepSubject,
                        previewText: stepPreview,
                        blocks: emailBlocks,
                        globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
                    };

                    const generatedHtml = generateEmailHtml(emailDocument as EmailDocument);

                    // Save to Firestore as an automation-linked campaign
                    const campaignData = {
                        name: emailDocument.name,
                        subject: stepSubject,
                        previewText: stepPreview,
                        type: 'automated' as const,
                        htmlContent: generatedHtml,
                        emailDocument: JSON.parse(JSON.stringify(emailDocument)),
                        audienceType: 'all' as const,
                        status: 'draft' as CampaignStatus,
                        stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, totalOpens: 0, uniqueOpens: 0, clicked: 0, totalClicks: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
                        tags: ['ai-generated', 'automation-email'],
                        automationId,
                        automationStepId: emailStep.id,
                        createdBy: user?.uid || 'ai-studio',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    };

                    const campaignDocRef = await addDoc(collection(db, 'adminEmailCampaigns'), campaignData);
                    console.log(`[AIEmailStudio] 📧 Email created for step "${stepLabel}": ${campaignDocRef.id} (${emailBlocks.length} blocks)`);

                    // Track in local campaigns state
                    setCampaigns(prev => [{
                        id: campaignDocRef.id,
                        ...campaignData,
                        tenantId: 'admin',
                        tenantName: 'Super Admin',
                        userId: user?.uid || 'admin',
                        projectId: 'admin',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as CrossTenantCampaign, ...prev]);

                    emailCreationResults.push({
                        stepId: emailStep.id,
                        label: stepLabel,
                        subject: stepSubject,
                        campaignId: campaignDocRef.id,
                        blockCount: emailBlocks.length,
                    });

                    // Update the step's emailConfig with the link
                    emailStep.emailConfig = {
                        ...emailStep.emailConfig,
                        campaignId: campaignDocRef.id,
                        emailDocumentId: campaignDocRef.id,
                        emailStatus: 'designed',
                    };
                } catch (emailErr) {
                    console.error(`[AIEmailStudio] ❌ Error creating email for step "${emailStep.label}":`, emailErr);
                    // Mark as pending so user knows it needs manual design
                    emailStep.emailConfig = {
                        ...emailStep.emailConfig,
                        emailStatus: 'pending',
                    };
                }
            }

            // ── STEP 3: Update automation with linked email IDs ────────────────
            if (emailCreationResults.length > 0) {
                const updatedSteps = sanitizedSteps.map((s: any) => {
                    const match = emailCreationResults.find(r => r.stepId === s.id);
                    if (match && s.type === 'email') {
                        return {
                            ...s,
                            emailConfig: {
                                ...s.emailConfig,
                                campaignId: match.campaignId,
                                emailDocumentId: match.campaignId,
                                emailStatus: 'designed',
                            },
                        };
                    }
                    return s;
                });

                try {
                    await updateDoc(doc(db, 'adminEmailAutomations', automationId), {
                        steps: updatedSteps.map((s: any) => JSON.parse(JSON.stringify(s))),
                        updatedAt: serverTimestamp(),
                    });
                    console.log('[AIEmailStudio] ✅ Automation updated with email links');
                } catch (updateErr) {
                    console.warn('[AIEmailStudio] ⚠️ Could not update automation with email links:', updateErr);
                }
            }

            // ── STEP 4: Build comprehensive confirmation message ────────────────
            const stepLabels: Record<string, string> = {
                trigger: '⚡ Trigger',
                email: '📧 Email',
                delay: '⏱️ Espera',
                condition: '🔀 Condición',
                action: '🏷️ Acción',
            };
            const stepsSummary = sanitizedSteps.map((s: any) => {
                let line = `  ${stepLabels[s.type] || s.type}: **${s.label}**`;
                if (s.emailConfig?.subject) line += ` — _"${s.emailConfig.subject}"_`;
                if (s.delayConfig?.delayMinutes) line += ` (${formatDelay(s.delayConfig.delayMinutes)})`;
                // Mark linked emails
                const emailResult = emailCreationResults.find(r => r.stepId === s.id);
                if (emailResult) line += ` ✅ _${emailResult.blockCount} bloques creados_`;
                return line;
            }).join('\n');

            const triggerLabels: Record<string, string> = {
                'customer.created': 'Nuevo cliente',
                'cart.abandoned': 'Carrito abandonado',
                'order.delivered': 'Pedido entregado',
                'order.completed': 'Compra completada',
                'customer.inactive': 'Cliente inactivo',
                'customer.birthday': 'Cumpleaños',
                'browse.abandoned': 'Navegación sin conversión',
                'customer.vip-qualified': 'Nivel VIP alcanzado',
                'customer.no-engagement-90d': 'Sin interacción 90 días',
            };

            const totalDelayMins = sanitizedSteps.reduce((sum: number, s: any) =>
                sum + (s.type === 'delay' ? (s.delayConfig?.delayMinutes || 0) : 0), 0);

            const emailsSummary = emailCreationResults.length > 0
                ? `\n\n**📧 Emails creados (${emailCreationResults.length}):**\n` +
                  emailCreationResults.map(r =>
                    `  - **${r.label}**: "${r.subject}" — ${r.blockCount} bloques visuales ✅`
                  ).join('\n') +
                  `\n\n_Cada email tiene contenido visual completo con bloques editables (hero, texto, botón, footer). Puedes editar cada uno desde la pestaña de **Campañas** o directamente desde el flujo de trabajo._`
                : '\n\n⚠️ _No se pudieron generar los emails automáticamente. Usa el botón "Diseñar Email" en cada paso del flujo para crear el contenido._';

            const aiExplanation = `\n\n---\n\n🤖 **Lo que hice:**\n` +
                `1. Diseñé un flujo de automatización "${autoData.type}" con ${sanitizedSteps.length} pasos\n` +
                `2. Generé ${emailCreationResults.length} email(s) con contenido visual completo\n` +
                `3. Vinculé cada email al paso correspondiente del flujo\n` +
                `4. Todo quedó en estado borrador para que puedas revisarlo\n\n` +
                `**Próximos pasos recomendados:**\n` +
                `- Revisa y personaliza cada email en la pestaña de Campañas\n` +
                `- Ajusta los tiempos de espera según tu audiencia\n` +
                `- Activa la automatización cuando estés listo`;

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Automatización creada con emails integrados!**\n\n` +
                    `- **Nombre:** ${autoData.name}\n` +
                    `- **Descripción:** ${autoData.description || '—'}\n` +
                    `- **Tipo:** ${autoData.type}\n` +
                    `- **Categoría:** ${autoData.category}\n` +
                    `- **Trigger:** ${triggerLabels[autoData.triggerEvent] || autoData.triggerEvent}\n` +
                    `- **Pasos:** ${sanitizedSteps.length}\n` +
                    `- **Duración total:** ${totalDelayMins > 0 ? formatDelay(totalDelayMins) : 'Instantáneo'}\n` +
                    `- **Estado:** Borrador\n` +
                    `- **ID:** \`${automationId}\`\n\n` +
                    `**Flujo de trabajo:**\n${stepsSummary}` +
                    emailsSummary +
                    aiExplanation,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] Automation creation error:', error);
            const errorDetail = error instanceof Error ? error.message : String(error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la automatización:**\n\n\`${errorDetail}\`\n\nPor favor intenta de nuevo.`,
                timestamp: Date.now(),
            }]);
        } finally {
            setAiCreating(null);
        }
    };

    return {
        aiMessages,
        aiInput, setAiInput,
        aiThinking,
        aiCreating,
        aiCreatedItems,
        aiChatRef,
        sendAIMessage,
        isVoiceActive,
        isVoiceConnecting,
        liveUserTranscript,
        liveModelTranscript,
        startVoiceSession,
        stopVoiceSession,
        aiCreateCampaign,
        aiCreateAudience,
        aiCreateAutomation,
        initAIStudio,
    };
}
