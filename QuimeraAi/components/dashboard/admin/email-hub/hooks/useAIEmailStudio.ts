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
    db, collection, addDoc,
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
4. Diseñar flujos de automatización
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
                emailDocument: aiEmailDocument,
                audienceType: 'all' as const,
                status: 'draft' as CampaignStatus,
                stats: { totalRecipients: 0, sent: 0, delivered: 0, opened: 0, uniqueOpens: 0, clicked: 0, uniqueClicks: 0, bounced: 0, complained: 0, unsubscribed: 0 },
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

            const prompt = `Basándote en la conversación anterior, genera los datos para crear una automatización de email.
Devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{"name":"...","type":"welcome|abandoned-cart|post-purchase|win-back|birthday","subject":"...","triggerEvent":"customer.created|cart.abandoned|order.delivered|customer.inactive|customer.birthday","delayMinutes":60,"status":"draft"}

Conversación:\n${conversationSummary}`;

            const response = await generateChatContentViaProxy(
                'ai-email-studio', [], prompt,
                'Devuelve SOLO JSON válido.', MODEL_TEXT,
                { temperature: 0.3, maxOutputTokens: 2048 },
                user?.uid
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            let autoData: any;
            try {
                autoData = JSON.parse(responseText);
            } catch {
                autoData = {
                    name: `Automatización AI — ${new Date().toLocaleDateString('es-ES')}`,
                    type: 'welcome',
                    subject: 'Automatización generada por AI',
                    triggerEvent: 'customer.created',
                    delayMinutes: 60,
                    status: 'draft',
                };
            }

            const newAutomationData = {
                name: autoData.name || 'Automatización AI',
                type: autoData.type || 'welcome',
                status: autoData.status || 'draft',
                triggerConfig: {
                    type: 'event' as const,
                    event: autoData.triggerEvent || 'customer.created',
                },
                templateId: '',
                subject: autoData.subject || '',
                delayMinutes: autoData.delayMinutes || 60,
                stats: { triggered: 0, sent: 0, opened: 0, clicked: 0, converted: 0 },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'adminEmailAutomations'), newAutomationData);
            setAiCreatedItems(prev => [...prev, { type: 'automation', name: autoData.name, id: docRef.id, timestamp: Date.now() }]);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Automatización creada exitosamente!**\n\n- **Nombre:** ${autoData.name}\n- **Tipo:** ${autoData.type}\n- **Trigger:** ${autoData.triggerEvent}\n- **Delay:** ${formatDelay(autoData.delayMinutes)}\n- **Estado:** ${autoData.status}\n- **ID:** \`${docRef.id}\`\n\nLa automatización está lista. Puedes gestionarla desde la pestaña de Automatizaciones.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[AIEmailStudio] Automation creation error:', error);
            setAiMessages(prev => [...prev, { role: 'model', text: '⚠️ Error al crear la automatización. Intenta de nuevo.', timestamp: Date.now() }]);
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
