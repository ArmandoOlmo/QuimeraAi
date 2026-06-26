/**
 * useUserAIEmailStudio
 *
 * User-scoped version of useAIEmailStudio.
 * No dependency on useAdmin() — system prompt is project-scoped.
 * Created email assets are project-scoped; canonical audience drafts go through email-api.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/core/AuthContext';
import { supabase } from '../../../../../supabase';
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
    UserEmailCampaign,
    UserEmailAudience,
    DisplayMessage,
    AICreatedItem,
    UserEmailTab,
} from '../types';
import { MODEL_TEXT, MODEL_VOICE } from '../types';
import { base64ToBytes, bytesToBase64, decodeAudioData, floatTo16BitPCM, formatDelay } from '../helpers';
import type { UserEmailDataReturn } from './useUserEmailData';

export interface UserAIEmailStudioReturn {
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

export function useUserAIEmailStudio(
    data: UserEmailDataReturn,
    activeTab: UserEmailTab,
    userId: string,
    projectId: string,
    projectName: string,
): UserAIEmailStudioReturn {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { stats, setCampaigns, setAudiences } = data;

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
    // SYSTEM PROMPT (user-scoped, no cross-tenant data)
    // =========================================================================

    const buildEmailStudioSystemPrompt = useCallback(() => {
        const responseLanguage = i18n.language?.toLowerCase().startsWith('en') ? 'inglés' : 'español';

        return `Eres un experto en Email Marketing para la plataforma Quimera.ai.
Estás ayudando al usuario del proyecto "${projectName}" con su estrategia de email marketing.

Datos actuales del proyecto:
- ${stats.totalCampaigns} campañas creadas
- ${stats.totalContacts.toLocaleString()} contactos en audiencias
- ${stats.totalSent.toLocaleString()} emails enviados
- Tasa de apertura: ${stats.openRate}%
- Tasa de click: ${stats.clickRate}%

Tu rol es ayudar al usuario a:
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

AUTOMATIZACIONES DE EMAIL:
Soporta flujos multi-paso con Constructor Visual. Tipos de nodos:
- ⚡ Trigger: customer.created, cart.abandoned, order.delivered, order.completed, customer.inactive, customer.birthday, browse.abandoned, customer.vip-qualified, customer.no-engagement-90d
- 📧 Email: Envío con subject y preview text
- ⏱️ Delay: Espera (60=1h, 1440=1d, 4320=3d, 7200=5d, 10080=7d)
- 🔀 Condición: email-opened, email-clicked, has-tag, purchase-made, custom
- 🏷️ Acción: add-tag, remove-tag, move-to-audience, send-notification

10 tipos: welcome, abandoned-cart, post-purchase, win-back, birthday, browse-abandonment, upsell, review-request, vip-reward, sunset.

IMPORTANTE: Cuando te pida crear algo, genera la respuesta conversacional. El usuario usará los botones de acción para materializar la creación.

Responde siempre en ${responseLanguage}. Sé conciso pero informativo. Usa formato markdown.`;
    }, [stats, projectName, i18n.language]);

    // =========================================================================
    // INIT / WELCOME
    // =========================================================================

    const initAIStudio = useCallback(() => {
        const welcomeText = t('aiEmailStudio.welcome.user', {
            projectName,
            totalCampaigns: stats.totalCampaigns,
            totalContacts: stats.totalContacts.toLocaleString(i18n.language),
            totalSent: stats.totalSent.toLocaleString(i18n.language),
            openRate: stats.openRate,
        });

        const welcomeMsg: DisplayMessage = { role: 'model', text: welcomeText, timestamp: Date.now() };
        setAiMessages([welcomeMsg]);
        setAiCreatedItems([]);

        const systemContext = buildEmailStudioSystemPrompt();
        aiHistoryRef.current = [
            { role: 'user', text: `[CONTEXT] ${systemContext}` },
            { role: 'model', text: welcomeText },
        ];
    }, [stats, projectName, buildEmailStudioSystemPrompt, t, i18n.language]);

    useEffect(() => {
        if (activeTab === 'ai-studio' && aiMessages.length === 0) {
            initAIStudio();
        }
    }, [activeTab, initAIStudio]);

    useEffect(() => {
        if (activeTab === 'ai-studio' && aiMessages.length === 1 && aiMessages[0]?.role === 'model') {
            initAIStudio();
        }
    }, [activeTab, i18n.language]);

    // Auto-scroll
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
                projectId,
                [],
                enrichedPrompt,
                systemPrompt,
                MODEL_TEXT,
                { temperature: 1.0, thinkingLevel: 'medium', maxOutputTokens: 4096 },
                user?.id
            );

            const responseText = extractTextFromResponse(response);
            if (responseText) {
                const aiMsg: DisplayMessage = { role: 'model', text: responseText, timestamp: Date.now() };
                setAiMessages(prev => [...prev, aiMsg]);
                aiHistoryRef.current.push({ role: 'model', text: responseText });
            }

            logApiCall({
                userId: user?.id || '',
                projectId,
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[UserAIEmailStudio] Chat error:', error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: '⚠️ Hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
                timestamp: Date.now(),
            }]);

            logApiCall({
                userId: user?.id || '',
                projectId,
                model: MODEL_TEXT,
                feature: 'email-studio-chat',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        } finally {
            setAiThinking(false);
        }
    }, [aiThinking, user, projectId, buildEmailStudioSystemPrompt]);

    // =========================================================================
    // VOICE MODE — GEMINI LIVE API
    // =========================================================================

    const stopVoiceSession = useCallback(() => {
        isConnectedRef.current = false;
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (inputAudioContextRef.current) { inputAudioContextRef.current.close().catch(() => {}); inputAudioContextRef.current = null; }
        activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) {} });
        activeSourcesRef.current = [];
        if (sessionRef.current) {
            try { sessionRef.current.close?.(); } catch (_e) {}
            sessionRef.current = null;
        }
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
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const systemPromptWithHistory = conversationHistory
                ? `${baseSystemPrompt}\n\n--- HISTORIAL DE CONVERSACIÓN PREVIA ---\n${conversationHistory}\n--- FIN ---\n\nIMPORTANTE: Continúa la conversación naturalmente. El usuario ahora te habla por voz.`
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
                        setIsVoiceConnecting(false);
                        setIsVoiceActive(true);
                        isConnectedRef.current = true;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (_e) {} });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            return;
                        }

                        const inputTranscript = msg.serverContent?.inputTranscription?.text || msg.serverContent?.inputTranscript || msg.inputTranscript;
                        const outputTranscript = msg.serverContent?.outputTranscription?.text || msg.serverContent?.outputTranscript || msg.outputTranscript;

                        if (inputTranscript) {
                            currentUserTranscriptRef.current += inputTranscript;
                            setLiveUserTranscript(currentUserTranscriptRef.current);
                        }
                        if (outputTranscript) {
                            currentModelResponseRef.current += outputTranscript;
                            setLiveModelTranscript(currentModelResponseRef.current);
                        }

                        const turnComplete = msg.serverContent?.turnComplete || msg.serverContent?.generationComplete || msg.turnComplete;
                        if (turnComplete) {
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
                    onerror: (e: any) => { console.error('[EmailVoice] Error:', e); }
                }
            });

            resolvedSession = session;
            sessionRef.current = session;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;

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
                    } catch (err) {
                        console.warn('[EmailVoice] Audio send error:', err);
                    }
                };

                source.connect(processor);
                processor.connect(inputCtx.destination);
            } catch (micErr) {
                console.error('[EmailVoice] Microphone error:', micErr);
                stopVoiceSession();
            }
        } catch (error) {
            console.error('[EmailVoice] Voice session error:', error);
            setIsVoiceConnecting(false);
        }
    };

    useEffect(() => {
        return () => { stopVoiceSession(); };
    }, [stopVoiceSession]);

    // =========================================================================
    // AI CREATE CAMPAIGN
    // =========================================================================

    const aiCreateCampaign = async () => {
        setAiCreating('campaign');
        try {
            const conversationSummary = aiHistoryRef.current
                .filter(m => m.text.indexOf('[CONTEXT]') === -1)
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en TODA la conversación anterior, genera los datos para crear una campaña de email marketing con bloques visuales editables.

INSTRUCCIONES ESTRICTAS:
1. Devuelve ÚNICAMENTE un objeto JSON válido.
2. NO uses markdown, NO uses backticks, NO uses \`\`\`json.
3. El JSON debe contener estos campos:

{
  "name": "nombre de la campaña",
  "subject": "línea de asunto del email",
  "previewText": "texto de preview",
  "type": "newsletter",
  "blocks": [ ... ]
}

4. El campo "blocks" es un ARRAY de objetos de bloque. Cada bloque:
   { "type": "...", "content": { ... }, "styles": { ... } }

TIPOS DE BLOQUES DISPONIBLES:
a) "hero" — content: { "headline": "...", "subheadline": "...", "buttonText": "...", "buttonUrl": "#", "showButton": true }
b) "text" — content: { "text": "...", "isHtml": false }
c) "image" — content: { "src": "https://placehold.co/600x300", "alt": "...", "width": 100 }
d) "button" — content: { "text": "...", "url": "#", "fullWidth": false }
e) "divider" — content: { "style": "solid", "thickness": 1, "width": 100 }
f) "spacer" — content: { "height": 32 }
g) "social" — content: { "links": {}, "iconStyle": "color", "iconSize": "md" }
h) "footer" — content: { "companyName": "${projectName}", "showUnsubscribe": true, "unsubscribeText": "Cancelar suscripción", "copyrightText": "© 2025 ${projectName}" }

REGLAS:
- Mínimo 4-6 bloques. Empieza con "hero", termina con "footer".
- Colores coherentes y profesionales.
- Refleja lo discutido en la conversación.

CONVERSACIÓN PREVIA:
${conversationSummary}

RESPONDE SOLO CON EL JSON:`;

            const response = await generateChatContentViaProxy(
                projectId, [], prompt,
                'Devuelve SOLO un JSON válido con bloques de email.',
                MODEL_TEXT,
                { temperature: 0.4, maxOutputTokens: 8192 },
                user?.id
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) responseText = jsonMatch[0];

            let campaignData: any;
            try {
                campaignData = JSON.parse(responseText);
            } catch {
                const lastUserMsg = aiHistoryRef.current.filter(m => m.role === 'user').pop()?.text || 'Campaña AI';
                campaignData = {
                    name: `Campaña — ${lastUserMsg.substring(0, 50)}`,
                    subject: lastUserMsg.substring(0, 100),
                    previewText: '',
                    type: 'newsletter',
                    blocks: [
                        { type: 'hero', content: { headline: lastUserMsg.substring(0, 80), subheadline: 'Campaña generada por AI', buttonText: 'Ver más', buttonUrl: '#', showButton: true }, styles: { backgroundColor: '#4f46e5', headingColor: '#ffffff', textColor: '#ffffff', buttonColor: '#ffffff', buttonTextColor: '#4f46e5', padding: 'lg', alignment: 'center' } },
                        { type: 'text', content: { text: 'Personaliza el contenido desde el editor visual.', isHtml: false }, styles: { padding: 'md', textColor: '#52525b', alignment: 'left', fontSize: 'md' } },
                        { type: 'footer', content: { companyName: projectName, showUnsubscribe: true, unsubscribeText: 'Cancelar suscripción', copyrightText: `© 2025 ${projectName}` }, styles: { backgroundColor: '#f4f4f5', textColor: '#71717a', padding: 'lg', alignment: 'center', fontSize: 'xs' } },
                    ],
                };
            }

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
                    content: { text: 'Campaña generada por AI. Edita este bloque o añade más.', isHtml: false },
                    styles: { ...DEFAULT_BLOCK_STYLES.text },
                });
            }

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
                generatedByAI: true,
                needsReview: true,
                userModified: false,
                safeToEdit: true,
                sourceModule: 'ai-studio',
                sourceComponent: 'email-ai-studio',
                sourceEvent: 'ai_campaign_draft_created',
                sendMode: 'draft_only',
                readiness: {
                    blockers: ['AI-generated campaigns must be reviewed before sending.'],
                },
                createdBy: user?.id || userId,
            };

            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createCampaignDraft',
                    projectId,
                    campaign: newCampaign,
                },
            });
            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to create canonical campaign draft');

            const createdCampaign = mapUserCampaignFromCanonical(result?.campaign || {}, userId, projectId);
            setCampaigns(prev => [createdCampaign, ...prev.filter(item => item.id !== createdCampaign.id)]);

            setAiCreatedItems(prev => [...prev, { type: 'campaign', name: createdCampaign.name, id: createdCampaign.id, timestamp: Date.now() }]);

            const blockSummary = emailBlocks.map((b: any) => {
                const labels: Record<string, string> = { hero: 'Hero', text: 'Texto', image: 'Imagen', button: 'Botón', divider: 'Divisor', spacer: 'Espaciador', social: 'Redes Sociales', footer: 'Pie de Email' };
                return `  - 🧱 ${labels[b.type] || b.type}`;
            }).join('\n');

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Campaña creada como draft para revisión.**\n\n- **Nombre:** ${createdCampaign.name}\n- **Asunto:** ${createdCampaign.subject}\n- **Tipo:** ${createdCampaign.type}\n- **Bloques:** ${emailBlocks.length}\n${blockSummary}\n- **ID:** \`${createdCampaign.id}\`\n\nNo se envió ningún email. Revísala y apruébala antes de enviar.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[UserAIEmailStudio] Campaign creation error:', error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la campaña:** \`${error instanceof Error ? error.message : String(error)}\`\n\nIntenta de nuevo.`,
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
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n');

            const prompt = `Basándote en la conversación anterior, genera los datos para crear un segmento de audiencia.
Devuelve SOLO un JSON válido (sin markdown, sin backticks):
{"name":"...","description":"...","acceptsMarketing":true,"hasOrdered":false,"tags":[],"estimatedCount":0}

Conversación:\n${conversationSummary}`;

            const response = await generateChatContentViaProxy(
                projectId, [], prompt,
                'Devuelve SOLO JSON válido.', MODEL_TEXT,
                { temperature: 0.3, maxOutputTokens: 2048 },
                user?.id
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
                generatedByAI: true,
                needsReview: true,
                userModified: false,
                safeToEdit: true,
                sourceModule: 'ai-studio',
                sourceComponent: 'email-ai-studio',
                sourceEvent: 'ai_audience_draft_created',
                readiness: {
                    blockers: ['AI-generated audiences must be reviewed before use.'],
                },
                createdBy: user?.id || userId,
            };

            const { data: result, error } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createAudience',
                    projectId,
                    audience: newAudience,
                },
            });

            if (error) throw error;
            if (result?.success === false) throw new Error(result.error || 'Unable to create canonical audience');

            const createdAudience = mapUserAudienceFromCanonical(result?.audience || {}, userId, projectId);
            setAudiences(prev => [createdAudience, ...prev.filter(item => item.id !== createdAudience.id)]);

            setAiCreatedItems(prev => [...prev, { type: 'audience', name: createdAudience.name, id: createdAudience.id, timestamp: Date.now() }]);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Audiencia creada como draft para revisión.**\n\n- **Nombre:** ${createdAudience.name}\n- **Descripción:** ${createdAudience.description || ''}\n- **ID:** \`${createdAudience.id}\`\n\nNo se añadió ningún contacto automáticamente sin revisión.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[UserAIEmailStudio] Audience creation error:', error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la audiencia:** \`${error instanceof Error ? error.message : String(error)}\``,
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
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n');

            const automationPrompt = `Basándote en la conversación anterior, genera los datos para crear una automatización de email marketing COMPLETA con flujo multi-paso.

Devuelve SOLO un JSON válido (sin markdown, sin backticks):
{
  "name": "Nombre",
  "description": "Descripción",
  "type": "welcome|abandoned-cart|post-purchase|win-back|birthday|browse-abandonment|upsell|review-request|vip-reward|sunset",
  "category": "lifecycle|conversion|engagement|retention",
  "triggerEvent": "customer.created|cart.abandoned|order.delivered|...",
  "status": "draft",
  "steps": [
    { "id": "t1", "type": "trigger", "label": "...", "order": 0 },
    { "id": "e1", "type": "email", "label": "...", "order": 1, "emailConfig": { "subject": "..." } },
    { "id": "d1", "type": "delay", "label": "...", "order": 2, "delayConfig": { "delayMinutes": 1440, "delayType": "fixed" } },
    { "id": "c1", "type": "condition", "label": "...", "order": 3, "conditionConfig": { "conditionType": "email-opened", "referenceStepId": "e1" } },
    { "id": "a1", "type": "action", "label": "...", "order": 4, "actionConfig": { "actionType": "add-tag", "tagName": "..." } }
  ]
}

REGLAS: Primer paso = trigger. 5-8 pasos mínimo. Alterna emails, delays y condiciones.

Conversación:\n${conversationSummary}

RESPONDE SOLO CON EL JSON:`;

            const response = await generateChatContentViaProxy(
                projectId, [], automationPrompt,
                'Devuelve SOLO JSON válido para automatización de email.', MODEL_TEXT,
                { temperature: 0.4, maxOutputTokens: 4096 },
                user?.id
            );

            let responseText = extractTextFromResponse(response) || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) responseText = jsonMatch[0];

            let autoData: any;
            try {
                autoData = JSON.parse(responseText);
            } catch {
                autoData = {
                    name: `Automatización AI — ${new Date().toLocaleDateString('es-ES')}`,
                    description: 'Automatización generada por AI',
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

            const sanitizedSteps = Array.isArray(autoData.steps)
                ? autoData.steps.map((s: any) => JSON.parse(JSON.stringify(s)))
                : [];

            const firstEmailSubject = sanitizedSteps.find((s: any) => s.type === 'email')?.emailConfig?.subject || '';

            const newAutomationData = {
                name: autoData.name || 'Automatización AI',
                description: autoData.description || '',
                type: autoData.type || 'welcome',
                category: autoData.category || 'lifecycle',
                status: 'draft',
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
                generatedByAI: true,
                needsReview: true,
                userModified: false,
                safeToEdit: true,
                sourceModule: 'ai-studio',
                sourceComponent: 'email-ai-studio',
                sourceEvent: 'ai_automation_draft_created',
                sendMode: 'draft_only',
                readiness: {
                    blockers: ['AI-generated automations remain inactive until reviewed and explicitly activated.'],
                },
            };

            const { data: automationResult, error: automationError } = await supabase.functions.invoke('email-api', {
                body: {
                    action: 'createAutomationDraft',
                    projectId,
                    automation: newAutomationData,
                },
            });
            if (automationError) throw automationError;
            if (automationResult?.success === false) throw new Error(automationResult.error || 'Unable to create automation draft');
            const automationId = String(automationResult?.automation?.id || '');
            if (!automationId) throw new Error('Automation draft was created without an id');
            setAiCreatedItems(prev => [...prev, { type: 'automation', name: autoData.name, id: automationId, timestamp: Date.now() }]);

            // Generate email content for each email step
            const emailSteps = sanitizedSteps.filter((s: any) => s.type === 'email');
            const emailCreationResults: { stepId: string; label: string; subject: string; campaignId: string; blockCount: number }[] = [];

            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⏳ **Automatización creada.** Generando contenido visual para ${emailSteps.length} email(s)...`,
                timestamp: Date.now(),
            }]);

            for (const emailStep of emailSteps) {
                try {
                    const stepSubject = emailStep.emailConfig?.subject || emailStep.label || 'Email';
                    const stepPreview = emailStep.emailConfig?.previewText || '';
                    const stepLabel = emailStep.label || 'Email';

                    const emailBlockPrompt = `Genera bloques para un email de automatización "${autoData.name}" (tipo: ${autoData.type}).
Paso: "${stepLabel}", Asunto: "${stepSubject}"

Devuelve SOLO JSON: { "blocks": [ ... ] }
Mínimo 4 bloques: hero + texto + botón + footer.
Empresa: "${projectName}".

RESPONDE SOLO CON EL JSON:`;

                    const emailResponse = await generateChatContentViaProxy(
                        projectId, [], emailBlockPrompt,
                        'Genera SOLO JSON con bloques de email.', MODEL_TEXT,
                        { temperature: 0.5, maxOutputTokens: 4096 },
                        user?.id
                    );

                    let emailResponseText = extractTextFromResponse(emailResponse) || '';
                    emailResponseText = emailResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const emailJsonMatch = emailResponseText.match(/\{[\s\S]*\}/);
                    if (emailJsonMatch) emailResponseText = emailJsonMatch[0];

                    let emailData: any;
                    try {
                        emailData = JSON.parse(emailResponseText);
                    } catch {
                        emailData = { blocks: [
                            { type: 'hero', content: { headline: stepLabel, subheadline: autoData.description, buttonText: 'Ver más', buttonUrl: '#', showButton: true }, styles: { backgroundColor: '#4f46e5', headingColor: '#ffffff', textColor: '#ffffff', buttonColor: '#ffffff', buttonTextColor: '#4f46e5', padding: 'lg', alignment: 'center' } },
                            { type: 'text', content: { text: `Personaliza este email desde el editor visual.`, isHtml: false }, styles: { padding: 'md', textColor: '#52525b', alignment: 'left', fontSize: 'md' } },
                            { type: 'footer', content: { companyName: projectName, showUnsubscribe: true, unsubscribeText: 'Cancelar suscripción', copyrightText: `© 2025 ${projectName}` }, styles: { backgroundColor: '#f4f4f5', textColor: '#71717a', padding: 'lg', alignment: 'center', fontSize: 'xs' } },
                        ] };
                    }

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
                            id: uuidv4(), type: 'text' as EmailBlockType, visible: true,
                            content: { text: `Contenido del email "${stepLabel}". Edítalo desde el editor visual.`, isHtml: false },
                            styles: { ...DEFAULT_BLOCK_STYLES.text },
                        });
                    }

                    const emailDocument = {
                        id: uuidv4(),
                        name: `[Auto] ${autoData.name} — ${stepLabel}`,
                        subject: stepSubject,
                        previewText: stepPreview,
                        blocks: emailBlocks,
                        globalStyles: DEFAULT_EMAIL_GLOBAL_STYLES,
                    };

                    const generatedHtml = generateEmailHtml(emailDocument as EmailDocument);

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
                        generatedByAI: true,
                        needsReview: true,
                        userModified: false,
                        safeToEdit: true,
                        sourceModule: 'ai-studio',
                        sourceComponent: 'email-ai-studio',
                        sourceEvent: 'ai_automation_email_draft_created',
                        sendMode: 'draft_only',
                        readiness: {
                            blockers: ['Automation email drafts must be reviewed before use.'],
                        },
                        createdBy: user?.id || userId,
                    };

                    const { data: campaignResult, error: campaignError } = await supabase.functions.invoke('email-api', {
                        body: {
                            action: 'createCampaignDraft',
                            projectId,
                            campaign: campaignData,
                        },
                    });
                    if (campaignError) throw campaignError;
                    if (campaignResult?.success === false) throw new Error(campaignResult.error || 'Unable to create automation email draft');

                    const createdCampaign = mapUserCampaignFromCanonical(campaignResult?.campaign || {}, userId, projectId);
                    setCampaigns(prev => [createdCampaign, ...prev.filter(item => item.id !== createdCampaign.id)]);

                    emailCreationResults.push({
                        stepId: emailStep.id, label: stepLabel, subject: stepSubject,
                        campaignId: createdCampaign.id, blockCount: emailBlocks.length,
                    });

                    emailStep.emailConfig = {
                        ...emailStep.emailConfig,
                        campaignId: createdCampaign.id,
                        emailDocumentId: createdCampaign.id,
                        emailStatus: 'designed',
                    };
                } catch (emailErr) {
                    console.error(`[UserAIEmailStudio] Error creating email for step "${emailStep.label}":`, emailErr);
                    emailStep.emailConfig = { ...emailStep.emailConfig, emailStatus: 'pending' };
                }
            }

            // Update automation with linked email IDs
            if (emailCreationResults.length > 0) {
                const updatedSteps = sanitizedSteps.map((s: any) => {
                    const match = emailCreationResults.find(r => r.stepId === s.id);
                    if (match && s.type === 'email') {
                        return { ...s, emailConfig: { ...s.emailConfig, campaignId: match.campaignId, emailDocumentId: match.campaignId, emailStatus: 'designed' } };
                    }
                    return s;
                });

                try {
                    const { data: updateResult, error: updateError } = await supabase.functions.invoke('email-api', {
                        body: {
                            action: 'updateAutomation',
                            projectId,
                            automationId,
                            updates: {
                                steps: updatedSteps.map((s: any) => JSON.parse(JSON.stringify(s))),
                            },
                        },
                    });
                    if (updateError) throw updateError;
                    if (updateResult?.success === false) throw new Error(updateResult.error || 'Unable to update automation email links');
                } catch (updateErr) {
                    console.warn('[UserAIEmailStudio] Could not update automation with email links:', updateErr);
                }
            }

            const stepLabels: Record<string, string> = { trigger: '⚡ Trigger', email: '📧 Email', delay: '⏱️ Espera', condition: '🔀 Condición', action: '🏷️ Acción' };
            const stepsSummary = sanitizedSteps.map((s: any) => {
                let line = `  ${stepLabels[s.type] || s.type}: **${s.label}**`;
                if (s.emailConfig?.subject) line += ` — _"${s.emailConfig.subject}"_`;
                if (s.delayConfig?.delayMinutes) line += ` (${formatDelay(s.delayConfig.delayMinutes)})`;
                const emailResult = emailCreationResults.find(r => r.stepId === s.id);
                if (emailResult) line += ` ✅ _${emailResult.blockCount} bloques_`;
                return line;
            }).join('\n');

            const totalDelayMins = sanitizedSteps.reduce((sum: number, s: any) =>
                sum + (s.type === 'delay' ? (s.delayConfig?.delayMinutes || 0) : 0), 0);

            const confirmMsg: DisplayMessage = {
                role: 'model',
                text: `✅ **Automatización creada con ${emailCreationResults.length} emails!**\n\n` +
                    `- **Nombre:** ${autoData.name}\n` +
                    `- **Tipo:** ${autoData.type} | **Categoría:** ${autoData.category}\n` +
                    `- **Pasos:** ${sanitizedSteps.length}\n` +
                    `- **Duración:** ${totalDelayMins > 0 ? formatDelay(totalDelayMins) : 'Instantáneo'}\n` +
                    `- **ID:** \`${automationId}\`\n\n` +
                    `**Flujo:**\n${stepsSummary}\n\n` +
                    `📝 Todo en estado borrador. Revisa en la pestaña de **Automatizaciones**.`,
                timestamp: Date.now(),
            };
            setAiMessages(prev => [...prev, confirmMsg]);
            aiHistoryRef.current.push({ role: 'model', text: confirmMsg.text });

        } catch (error) {
            console.error('[UserAIEmailStudio] Automation creation error:', error);
            setAiMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ **Error al crear la automatización:** \`${error instanceof Error ? error.message : String(error)}\``,
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

function mapUserCampaignFromCanonical(
    campaign: Record<string, any>,
    userId: string,
    projectId: string,
): UserEmailCampaign {
    return {
        ...campaign,
        id: String(campaign.id || ''),
        name: String(campaign.name || ''),
        subject: String(campaign.subject || ''),
        previewText: campaign.previewText ?? campaign.preview_text ?? '',
        type: campaign.type || 'newsletter',
        htmlContent: campaign.htmlContent ?? campaign.html_content ?? '',
        emailDocument: campaign.emailDocument ?? campaign.email_document,
        audienceType: campaign.audienceType ?? campaign.audience_type ?? 'all',
        audienceSegmentId: campaign.audienceSegmentId ?? campaign.audience_segment_id,
        customRecipientEmails: campaign.customRecipientEmails ?? campaign.custom_recipient_emails ?? [],
        status: campaign.status || 'draft',
        scheduledAt: campaign.scheduledAt ?? campaign.scheduled_at,
        sentAt: campaign.sentAt ?? campaign.sent_at,
        stats: {
            totalRecipients: 0,
            sent: 0,
            delivered: 0,
            opened: 0,
            totalOpens: 0,
            uniqueOpens: 0,
            clicked: 0,
            totalClicks: 0,
            uniqueClicks: 0,
            bounced: 0,
            complained: 0,
            unsubscribed: 0,
            ...(campaign.stats || {}),
        },
        tags: Array.isArray(campaign.tags) ? campaign.tags : [],
        generatedByAI: campaign.generatedByAI ?? campaign.generated_by_ai,
        needsReview: campaign.needsReview ?? campaign.needs_review,
        userModified: campaign.userModified ?? campaign.user_modified,
        safeToEdit: campaign.safeToEdit ?? campaign.safe_to_edit,
        sourceModule: campaign.sourceModule ?? campaign.source_module,
        sourceComponent: campaign.sourceComponent ?? campaign.source_component,
        sourceEvent: campaign.sourceEvent ?? campaign.source_event,
        sourceEntityType: campaign.sourceEntityType ?? campaign.source_entity_type,
        sourceEntityId: campaign.sourceEntityId ?? campaign.source_entity_id,
        correlationId: campaign.correlationId ?? campaign.correlation_id,
        idempotencyKey: campaign.idempotencyKey ?? campaign.idempotency_key,
        readiness: campaign.readiness || {},
        metadata: campaign.metadata || {},
        createdBy: campaign.createdBy ?? campaign.created_by ?? userId,
        userId,
        projectId,
        createdAt: campaign.createdAt ?? campaign.created_at ?? new Date().toISOString(),
        updatedAt: campaign.updatedAt ?? campaign.updated_at ?? new Date().toISOString(),
    } as UserEmailCampaign;
}

function mapUserAudienceFromCanonical(
    audience: Record<string, any>,
    userId: string,
    projectId: string,
): UserEmailAudience {
    const staticMembers = audience.staticMembers || audience.static_members || {};
    const members = Array.isArray(staticMembers.members)
        ? staticMembers.members
        : Array.isArray(audience.members)
            ? audience.members
            : [];

    return {
        id: String(audience.id || ''),
        name: String(audience.name || ''),
        description: audience.description || '',
        estimatedCount: Number(audience.estimatedCount ?? audience.estimated_count ?? members.length ?? 0),
        userId,
        projectId,
        createdAt: audience.createdAt || audience.created_at || new Date().toISOString(),
        filters: Array.isArray(audience.filters) ? audience.filters : [],
        tags: Array.isArray(audience.tags) ? audience.tags : [],
        acceptsMarketing: audience.acceptsMarketing ?? audience.accepts_marketing,
        hasOrdered: audience.hasOrdered ?? audience.has_ordered,
        staticMemberCount: Number(audience.staticMemberCount ?? audience.static_member_count ?? members.length ?? 0),
        members,
        staticMembers,
    } as UserEmailAudience;
}
