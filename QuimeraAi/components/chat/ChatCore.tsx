import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { AiAssistantConfig, Project, ChatAppearanceConfig, Lead, PageData, PageSection } from '../../types';
import { LiveServerMessage, Modality } from '@google/genai';
import { MessageSquare, Send, Mic, Loader2, Minimize2, PhoneOff, Sparkles, X, Calendar } from 'lucide-react';
import { useSafeAuth } from '../../contexts/core/AuthContext';
import { useSafeAI } from '../../contexts/ai';
import { useSafeProject } from '../../contexts/project';
import { getGoogleGenAI, isProxyMode } from '../../utils/genAiClient';
import { generateContentViaProxy, generateMultimodalContentViaProxy } from '../../utils/geminiProxyClient';
import { captureCurrentView } from '../../utils/visionUtils';
import { logApiCall } from '../../services/apiLoggingService';
import { useEcommerceChat } from './hooks/useEcommerceChat';
import { useWebChatConversation } from './hooks/useWebChatConversation';
import { getGlobalChatbotPrompts, getDefaultPrompts, applyPromptTemplate } from '../../utils/globalChatbotPrompts';
import { elevenlabsTTS } from '../../utils/voiceProxyClient';
import type { GlobalChatbotPrompts } from '../../types';

// =============================================================================
// INTERFACES
// =============================================================================

interface PageContext {
    section: string;
    pageData: PageData | null;
    visibleSections: PageSection[];
}

// Appointment data interface for chatbot integration
export interface ChatAppointmentData {
    title: string;
    description?: string;
    type?: 'video_call' | 'phone_call' | 'in_person' | 'consultation' | 'demo' | 'follow_up' | 'interview' | 'other';
    startDate: Date;
    endDate: Date;
    participantName?: string;
    participantEmail?: string;
    participantPhone?: string;
    linkedLeadId?: string;
    conversationTranscript?: string; // Full chat transcript to include in lead
}

// Simplified appointment info for availability checking
export interface AppointmentSlot {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
}

export interface ChatCoreProps {
    config: AiAssistantConfig;
    project: Project;
    appearance: ChatAppearanceConfig;
    onLeadCapture?: (leadData: Partial<Lead>) => Promise<string | undefined>;
    onUpdateLeadTranscript?: (leadId: string, transcript: string) => Promise<void>;
    onCreateAppointment?: (appointmentData: ChatAppointmentData) => Promise<string | undefined>;
    existingAppointments?: AppointmentSlot[];
    className?: string;
    showHeader?: boolean;
    headerActions?: React.ReactNode;
    onClose?: () => void;
    autoOpen?: boolean;
    isEmbedded?: boolean;
    currentPageContext?: PageContext;
    cmsArticles?: { id: string; title: string; content: string }[];
}

interface Message {
    role: 'user' | 'model';
    text: string;
    isVoiceMessage?: boolean;
}

interface PreChatFormData {
    name: string;
    email: string;
    phone?: string;
}

// =============================================================================
// AUDIO UTILITY FUNCTIONS
// =============================================================================

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

// =============================================================================
// LEAD DETECTION & SCORING
// =============================================================================

const detectLeadIntent = (message: string, configKeywords?: string[]): boolean => {
    const defaultKeywords = [
        'precio', 'costo', 'cotización', 'comprar', 'contratar', 'disponibilidad',
        'agendar', 'reunión', 'demostración', 'demo', 'presentación',
        'price', 'buy', 'quote', 'schedule', 'demo', 'meeting', 'purchase',
        'order', 'pricing', 'cost', 'how much', 'cuanto cuesta', 'quiero comprar'
    ];

    // Use configurable keywords if provided, otherwise fall back to defaults
    const keywords = configKeywords && configKeywords.length > 0
        ? configKeywords
        : defaultKeywords;

    return keywords.some(keyword =>
        message.toLowerCase().includes(keyword.toLowerCase())
    );
};

// Detect visual intent - when user asks about what they see on screen
const detectVisualIntent = (message: string): boolean => {
    const visualKeywords = [
        // Spanish
        'qué veo', 'que veo', 'qué estoy viendo', 'que estoy viendo',
        'qué es esto', 'que es esto', 'qué hay aquí', 'que hay aqui',
        'describe la pantalla', 'muéstrame', 'muestrame',
        'cómo se ve', 'como se ve', 'analiza la pantalla',
        'qué sección', 'que seccion', 'dónde estoy', 'donde estoy',
        // English
        'what do i see', 'what am i seeing', 'what\'s this',
        'what is this', 'describe the screen', 'show me',
        'what\'s on screen', 'analyze the page', 'what section',
        'where am i', 'look at the screen', 'describe what you see'
    ];

    const lowerMessage = message.toLowerCase();
    return visualKeywords.some(keyword => lowerMessage.includes(keyword));
};

const calculateLeadScore = (
    leadData: Partial<Lead>,
    messages: Message[],
    hasHighIntent: boolean
): number => {
    let score = 0;

    // Base score for contact info
    if (leadData.email) score += 20;
    if (leadData.phone) score += 15;
    if (leadData.name) score += 10;
    if (leadData.company) score += 10;

    // Engagement score
    const conversationLength = messages.filter(m => m.role === 'user').length;
    score += Math.min(conversationLength * 3, 25);

    // High intent keywords
    if (hasHighIntent) score += 20;

    return Math.min(score, 100);
};

// =============================================================================
// CUSTOMER INTENT ANALYSIS (for Lead Capture)
// =============================================================================

interface CustomerIntentAnalysis {
    customerInterest: string;  // What the customer wants/needs
    urgency: 'low' | 'medium' | 'high';
    recommendedAction: string;
    intentScore: number;
}

/**
 * Analyzes conversation to extract customer intent using LLM
 * This provides valuable context for sales team when following up leads
 */
const analyzeCustomerIntent = async (
    messages: Message[],
    projectName: string,
    userId?: string
): Promise<CustomerIntentAnalysis | null> => {
    // Skip if conversation is too short
    if (messages.filter(m => m.role === 'user').length < 1) {
        return null;
    }

    try {
        const conversationText = messages
            .map(m => `${m.role === 'user' ? 'Cliente' : 'Asistente'}: ${m.text}`)
            .join('\n');

        const prompt = `Analiza esta conversación de chatbot y extrae información clave del cliente.

CONVERSACIÓN:
${conversationText}

Responde SOLO en formato JSON válido:
{
    "customerInterest": "Resumen breve de qué producto/servicio busca el cliente o qué problema quiere resolver (máximo 150 caracteres)",
    "urgency": "low" | "medium" | "high",
    "recommendedAction": "Acción específica recomendada para el equipo de ventas (ej: 'Llamar para ofrecer demo', 'Enviar cotización', etc.)",
    "intentScore": número del 0-100 indicando qué tan listo está para comprar
}

CRITERIOS DE URGENCIA:
- high: Menciona precios, quiere comprar pronto, pide cotización
- medium: Hace preguntas específicas sobre productos/servicios
- low: Solo explorando o haciendo preguntas generales`;

        const response = await generateContentViaProxy(
            projectName || 'lead-intent-analysis',
            prompt,
            'gemini-2.5-flash',
            { temperature: 0.3, maxOutputTokens: 500 },
            userId
        );

        // Extract text from response
        let responseText = '';
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            responseText = response.candidates[0].content.parts[0].text;
        }

        if (!responseText) {
            console.warn('[ChatCore] Empty response from intent analysis');
            return null;
        }

        // Clean and parse JSON
        const cleanedText = responseText
            .replace(/```json\n?/gi, '')
            .replace(/```\n?/g, '')
            .trim();

        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('[ChatCore] Could not extract JSON from intent analysis');
            return null;
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!analysis.customerInterest || !analysis.recommendedAction) {
            console.warn('[ChatCore] Missing required fields in intent analysis');
            return null;
        }

        console.log('[ChatCore] ✅ Customer intent analyzed:', analysis);
        return {
            customerInterest: analysis.customerInterest.slice(0, 200),
            urgency: ['low', 'medium', 'high'].includes(analysis.urgency) ? analysis.urgency : 'medium',
            recommendedAction: analysis.recommendedAction.slice(0, 150),
            intentScore: Math.min(100, Math.max(0, Number(analysis.intentScore) || 50))
        };

    } catch (error) {
        console.error('[ChatCore] Error analyzing customer intent:', error);
        return null;
    }
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ChatCore: React.FC<ChatCoreProps> = ({
    config,
    project,
    appearance,
    onLeadCapture,
    onUpdateLeadTranscript,
    onCreateAppointment,
    existingAppointments = [],
    className = '',
    showHeader = true,
    headerActions,
    onClose,
    autoOpen = false,
    isEmbedded = false,
    currentPageContext,
    cmsArticles
}) => {
    const authContext = useSafeAuth();
    const user = authContext?.user ?? null;
    const aiContext = useSafeAI();
    const hasApiKey = aiContext?.hasApiKey ?? null;
    const promptForKeySelection = aiContext?.promptForKeySelection ?? (() => Promise.resolve());
    const handleApiError = aiContext?.handleApiError ?? (() => { });
    const projectContext = useSafeProject();
    const activeProject = projectContext?.activeProject ?? project; // Use prop project if context not available
    const { t } = useTranslation();

    // Ecommerce chat hook for order lookups and product info
    const isEcommerceEnabled = !!(project as any)?.ecommerceEnabled || !!(activeProject as any)?.ecommerceEnabled;
    const projectOwnerId = project?.userId || (activeProject as any)?.userId || user?.uid;
    const {
        checkOrderStatus,
        getProductInfo,
        getShippingInfo,
        getReturnPolicy,
        formatOrderResponse,
        formatProductResponse,
    } = useEcommerceChat(project?.id || activeProject?.id || '', projectOwnerId, config.languages?.includes('Spanish') ? 'es' : 'en');

    // Web chat conversation hook for Inbox persistence
    const projectIdForConversation = project?.id || activeProject?.id || '';
    const {
        getOrCreateConversation,
        saveMessage: saveConversationMessage,
        updateParticipantInfo,
        linkToLead,
    } = useWebChatConversation(projectIdForConversation, user?.uid);

    // Get lead capture config with defaults
    const leadConfig = config.leadCaptureConfig || {
        enabled: config.leadCaptureEnabled !== false,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: t('chatbotWidget.exitIntentOffer'),
        intentKeywords: [],
        progressiveProfilingEnabled: true
    };

    // Chat State
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef<Message[]>([]); // Ref to always have current messages
    const [isLoading, setIsLoading] = useState(false);

    // Lead Capture State
    const [showPreChatForm, setShowPreChatForm] = useState(false);
    const [showLeadCaptureModal, setShowLeadCaptureModal] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [exitIntentShown, setExitIntentShown] = useState(false);
    const [preChatData, setPreChatData] = useState<PreChatFormData>({ name: '', email: '', phone: '' });
    const [quickLeadEmail, setQuickLeadEmail] = useState('');

    // Appointment Form State
    const [showAppointmentForm, setShowAppointmentForm] = useState(false);
    const [appointmentForm, setAppointmentForm] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '10:00',
        duration: '60', // duración en minutos
        appointmentType: 'consultation',
        notes: ''
    });
    const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);

    // Voice State
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState(new Array(20).fill(4));

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const sessionRef = useRef<any>(null);
    const visualizerIntervalRef = useRef<number | null>(null);
    const isConnectedRef = useRef(false);

    // Voice Transcription Refs
    const voiceTranscriptRef = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
    const currentModelResponseRef = useRef<string>('');

    // ElevenLabs TTS audio ref
    const elevenLabsAudioRef = useRef<HTMLAudioElement | null>(null);

    // Lead tracking ref
    const capturedLeadIdRef = useRef<string | null>(null);

    // Global chatbot prompts (from SuperAdmin configuration)
    const [globalPrompts, setGlobalPrompts] = useState<GlobalChatbotPrompts>(getDefaultPrompts());

    // Load global prompts on mount
    useEffect(() => {
        getGlobalChatbotPrompts().then(prompts => {
            setGlobalPrompts(prompts);
        }).catch(console.error);
    }, []);

    // Keep messagesRef in sync with messages state (for use in callbacks)
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // =============================================================================
    // SYSTEM INSTRUCTION BUILDER
    // =============================================================================

    const buildSystemInstruction = () => {
        // Log configuration being applied
        console.log(`[ChatCore] 🤖 Building system instruction with config:`, {
            agentName: config.agentName,
            tone: config.tone,
            hasBusinessProfile: !!config.businessProfile,
            hasProductsServices: !!config.productsServices,
            hasPoliciesContact: !!config.policiesContact,
            faqsCount: config.faqs?.length || 0,
            knowledgeDocsCount: config.knowledgeDocuments?.length || 0,
            hasSpecialInstructions: !!config.specialInstructions
        });

        // Log current viewing section
        if (currentPageContext?.section) {
            console.log(`[ChatCore] 📍 Building instruction for section: ${currentPageContext.section}`);
        }

        // Get current date and time info
        const now = new Date();
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const monthsOfYear = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Get upcoming appointments for the next 14 days
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const upcomingAppointments = existingAppointments
            .filter(apt => apt.startDate >= now && apt.startDate <= twoWeeksFromNow && apt.status !== 'cancelled')
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
            .slice(0, 20); // Limit to 20 appointments

        // Format busy slots
        const busySlots = upcomingAppointments.map(apt => {
            const startDay = daysOfWeek[apt.startDate.getDay()];
            const startDate = apt.startDate.getDate();
            const startMonth = monthsOfYear[apt.startDate.getMonth()];
            const startTime = `${apt.startDate.getHours().toString().padStart(2, '0')}:${apt.startDate.getMinutes().toString().padStart(2, '0')}`;
            const endTime = `${apt.endDate.getHours().toString().padStart(2, '0')}:${apt.endDate.getMinutes().toString().padStart(2, '0')}`;
            return `- ${startDay} ${startDate} de ${startMonth}: ${startTime} - ${endTime} (${apt.title})`;
        }).join('\n');

        // Generate available time suggestions using configurable business hours
        const businessHoursStart = leadConfig.businessHoursStart ?? 9;
        const businessHoursEnd = leadConfig.businessHoursEnd ?? 18;
        const businessDays = leadConfig.businessDays ?? [1, 2, 3, 4, 5, 6]; // Default: Mon-Sat

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const activeDayNames = businessDays.map(d => dayNames[d]).join(', ');
        const closedDayNames = [0, 1, 2, 3, 4, 5, 6]
            .filter(d => !businessDays.includes(d))
            .map(d => dayNames[d]).join(', ');

        const formatHour = (h: number) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${hour12}:00 ${ampm}`;
        };

        const suggestAvailableSlots = () => {
            const suggestions: string[] = [];

            for (let dayOffset = 1; dayOffset <= 7 && suggestions.length < 5; dayOffset++) {
                const checkDate = new Date(now);
                checkDate.setDate(now.getDate() + dayOffset);

                // Skip non-business days
                if (!businessDays.includes(checkDate.getDay())) continue;

                const dayName = daysOfWeek[checkDate.getDay()];
                const dateNum = checkDate.getDate();
                const monthName = monthsOfYear[checkDate.getMonth()];

                // Check morning slot (1 hour after opening)
                const morningHour = businessHoursStart + 1;
                const morningSlot = new Date(checkDate);
                morningSlot.setHours(morningHour, 0, 0, 0);
                const morningBusy = upcomingAppointments.some(apt =>
                    apt.startDate.getTime() <= morningSlot.getTime() &&
                    apt.endDate.getTime() > morningSlot.getTime()
                );

                // Check afternoon slot (midpoint of business hours)
                const afternoonHour = Math.floor((businessHoursStart + businessHoursEnd) / 2) + 1;
                const afternoonSlot = new Date(checkDate);
                afternoonSlot.setHours(afternoonHour, 0, 0, 0);
                const afternoonBusy = upcomingAppointments.some(apt =>
                    apt.startDate.getTime() <= afternoonSlot.getTime() &&
                    apt.endDate.getTime() > afternoonSlot.getTime()
                );

                if (!morningBusy) {
                    suggestions.push(`${dayName} ${dateNum} de ${monthName} a las ${formatHour(morningHour)}`);
                }
                if (!afternoonBusy && suggestions.length < 5) {
                    suggestions.push(`${dayName} ${dateNum} de ${monthName} a las ${formatHour(afternoonHour)}`);
                }
            }

            return suggestions.length > 0
                ? suggestions.map(s => `- ${s}`).join('\n')
                : '- Consulta disponibilidad directamente';
        };

        const currentDateTime = `
            === FECHA Y HORA ACTUAL ===
            Hoy es: ${daysOfWeek[now.getDay()]}, ${now.getDate()} de ${monthsOfYear[now.getMonth()]} de ${now.getFullYear()}
            Hora actual: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}
            Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
            
            === AGENDA Y DISPONIBILIDAD ===
            Horario de atención: ${activeDayNames}, ${formatHour(businessHoursStart)} - ${formatHour(businessHoursEnd)}
            
            ${upcomingAppointments.length > 0 ? `HORARIOS OCUPADOS (próximos 14 días):
${busySlots}` : 'No hay citas programadas en los próximos días.'}
            
            HORARIOS DISPONIBLES SUGERIDOS:
${suggestAvailableSlots()}
            
            INSTRUCCIONES DE DISPONIBILIDAD:
            - Revisa los horarios ocupados antes de ofrecer una cita
            - Sugiere los horarios disponibles al cliente
            - Si el cliente pide un horario ocupado, ofrece alternativas cercanas
            - Horario de atención: ${activeDayNames}, ${formatHour(businessHoursStart)} - ${formatHour(businessHoursEnd)}${closedDayNames ? ` (cerrado ${closedDayNames})` : ''}
        `;

        const businessContext = `
            BUSINESS NAME: ${project?.name || 'Unknown Business'}
            
            BUSINESS PROFILE:
            ${config.businessProfile || 'No business profile provided. Just be a helpful AI assistant.'}
            
            PRODUCTS & SERVICES:
            ${config.productsServices || 'No specific products/services information provided. Answer general questions helpfully.'}
            
            POLICIES & CONTACT INFO:
            ${config.policiesContact || 'No policies/contact information provided.'}
            
            ${config.faqs && config.faqs.length > 0 ? `
            FREQUENTLY ASKED QUESTIONS:
            ${config.faqs.map((faq, idx) => `
            Q${idx + 1}: ${faq.question}
            A${idx + 1}: ${faq.answer}
            `).join('\n')}
            ` : ''}
            
            ${config.knowledgeDocuments && config.knowledgeDocuments.length > 0 ? `
            ADDITIONAL KNOWLEDGE BASE (from uploaded documents):
            ${config.knowledgeDocuments.map((doc, idx) => `
            [Document ${idx + 1}: ${doc.name}]
            ${doc.content.slice(0, 5000)}${doc.content.length > 5000 ? '...(content truncated)' : ''}
            `).join('\n\n')}
            ` : ''}
            
            ${config.knowledgeLinks && config.knowledgeLinks.filter(l => l.status === 'ready').length > 0 ? `
            KNOWLEDGE BASE FROM LINKS (extracted from websites and YouTube):
            ${config.knowledgeLinks.filter(l => l.status === 'ready').map((link, idx) => `
            [${link.type === 'youtube' ? 'YouTube' : 'Website'} ${idx + 1}: ${link.title}]
            Source: ${link.url}
            ${link.content.slice(0, 4000)}${link.content.length > 4000 ? '...(content truncated)' : ''}
            `).join('\n\n')}
            ` : ''}
            
            ${config.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${config.specialInstructions}` : ''}
            
            ${cmsArticles && cmsArticles.length > 0 ? `
            CMS ARTICLES KNOWLEDGE BASE (from blog/content management):
            ${cmsArticles.map((article, idx) => `
            [Article ${idx + 1}: ${article.title}]
            ${article.content.slice(0, 3000)}${article.content.length > 3000 ? '...(content truncated)' : ''}
            `).join('\n\n')}
            ` : ''}
        `;

        const brandName = project?.brandIdentity?.name || project?.name || 'our business';
        const brandIndustry = project?.brandIdentity?.industry || 'various services';

        // Apply global prompts with template substitution
        const promptVariables = {
            agentName: config.agentName || 'AI Assistant',
            tone: (config.tone || 'Professional').toLowerCase(),
            businessName: brandName,
            industry: brandIndustry,
            visibleSections: currentPageContext?.visibleSections?.join(', ') || 'various sections',
        };

        const identityInstruction = applyPromptTemplate(globalPrompts.identityTemplate, promptVariables);
        const coreInstructions = applyPromptTemplate(globalPrompts.coreInstructions, promptVariables);
        const formattingGuidelines = globalPrompts.formattingGuidelines;
        const appointmentInstructions = globalPrompts.appointmentInstructions;
        const ecommerceInstructions = isEcommerceEnabled ? globalPrompts.ecommerceInstructions : '';

        const systemInstruction = `
            ${identityInstruction}
            
            ${currentDateTime}
            
            YOUR KNOWLEDGE BASE:
            ${businessContext}

            ${coreInstructions}
            
            ${formattingGuidelines}
            
            ${appointmentInstructions}
            ${ecommerceInstructions}
            
            === VISUAL CONTEXT ===
            You can SEE the user's screen. When an image is provided:
            1. Use the screenshot to understand what the user is viewing
            2. If they ask about something on screen, describe what you see
            3. Reference specific elements, colors, text, or sections visible in the image
            4. Help them understand how to use what they're seeing
            5. Be specific about UI elements, buttons, or content shown
        `;

        return systemInstruction;
    };

    // =============================================================================
    // EFFECTS
    // =============================================================================

    // Initialize welcome message
    useEffect(() => {
        if (messages.length === 0 && !showPreChatForm) {
            // Show pre-chat form if enabled
            if (leadConfig.enabled && leadConfig.preChatForm && !leadCaptured) {
                setShowPreChatForm(true);
            } else {
                const agentName = config.agentName || 'AI Assistant';
                const welcomeMsg = appearance.messages?.welcomeMessageEnabled
                    ? (appearance.messages.welcomeMessage || t('chatbotWidget.welcomeMessageDefault', { agentName })).replace('{agentName}', agentName)
                    : t('chatbotWidget.welcomeMessageDefault', { agentName });

                const welcomeDelay = appearance.messages?.welcomeDelay || 0;
                if (welcomeDelay > 0) {
                    setTimeout(() => {
                        setMessages([{ role: 'model', text: welcomeMsg }]);
                    }, welcomeDelay * 1000);
                } else {
                    setMessages([{ role: 'model', text: welcomeMsg }]);
                }
            }
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when not in live mode
    useEffect(() => {
        if (!isLiveActive && !showPreChatForm) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isLiveActive, showPreChatForm]);

    // Visualizer effect for live voice
    useEffect(() => {
        if (isLiveActive) {
            let frame = 0;
            visualizerIntervalRef.current = window.setInterval(() => {
                frame++;
                const newLevels = Array.from({ length: 20 }, (_, i) => {
                    // Create a wave pattern using sine
                    const wave = Math.sin(frame * 0.2 + i * 0.3) * 15 + 20;
                    // Add some randomness
                    const noise = Math.random() * 15;
                    return Math.max(10, wave + noise);
                });
                setVisualizerLevels(newLevels);
            }, 80);
        } else {
            if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
            setVisualizerLevels(new Array(20).fill(4));
        }
        return () => {
            if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
        };
    }, [isLiveActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isLiveActive) stopLiveSession();
        };
    }, []);

    // Function to save final transcript to lead
    const saveFinalTranscriptToLead = async () => {
        if (capturedLeadIdRef.current && onUpdateLeadTranscript && messages.length > 0) {
            const fullTranscript = messages.map(m => {
                const prefix = m.isVoiceMessage ? '🎙️ ' : '';
                return `${prefix}${m.role === 'user' ? 'Usuario' : config.agentName || 'Asistente'}: ${m.text} `;
            }).join('\n\n');

            try {
                await onUpdateLeadTranscript(capturedLeadIdRef.current, fullTranscript);
                console.log('[ChatCore] ✅ Final transcript saved to lead');
            } catch (error) {
                console.error('[ChatCore] ❌ Error saving final transcript:', error);
            }
        }
    };

    // Save transcript when component unmounts or chat closes
    useEffect(() => {
        return () => {
            // Save transcript on unmount
            saveFinalTranscriptToLead();
        };
    }, [messages, capturedLeadIdRef.current]);

    // Auto-save transcript after each message exchange (if lead is captured)
    useEffect(() => {
        if (capturedLeadIdRef.current && messages.length > 0) {
            // Debounce: save after 3 seconds of the last message
            const timeoutId = setTimeout(() => {
                saveFinalTranscriptToLead();
            }, 3000);

            return () => clearTimeout(timeoutId);
        }
    }, [messages]);

    // =============================================================================
    // LEAD CAPTURE HANDLERS
    // =============================================================================

    const handlePreChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preChatData.email || !preChatData.name) return;

        try {
            const conversationText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

            console.log('[ChatCore] 📝 handlePreChatSubmit - Transcript generated:', {
                messageCount: messages.length,
                transcriptLength: conversationText.length,
                transcriptPreview: conversationText.substring(0, 300)
            });
            const leadScore = calculateLeadScore(preChatData, messages, false);

            // Analyze customer intent using LLM (if there's conversation history)
            const intentAnalysis = messages.length > 0
                ? await analyzeCustomerIntent(messages, project?.name || 'chatbot', user?.uid)
                : null;

            // Create conversation for Inbox with participant info
            const convId = await getOrCreateConversation({
                name: preChatData.name,
                email: preChatData.email,
                phone: preChatData.phone,
            });

            if (onLeadCapture) {
                const leadId = await onLeadCapture({
                    name: preChatData.name,
                    email: preChatData.email,
                    phone: preChatData.phone,
                    status: 'new',
                    message: t('chatbotWidget.leadSourcePreChat'),
                    value: 0,
                    leadScore: intentAnalysis?.intentScore || leadScore,
                    conversationTranscript: conversationText,
                    tags: ['chatbot', 'pre-chat-form'],
                    notes: t('chatbotWidget.leadNotesPreChat'),
                    // Include AI-analyzed customer intent
                    aiAnalysis: intentAnalysis?.customerInterest || undefined,
                    recommendedAction: intentAnalysis?.recommendedAction || undefined,
                    aiScore: intentAnalysis?.intentScore || undefined,
                });
                if (leadId) {
                    capturedLeadIdRef.current = leadId;
                    // Link conversation to lead for Inbox
                    if (convId) await linkToLead(leadId);
                }
            }

            setLeadCaptured(true);
            setShowPreChatForm(false);

            // Start chat with personalized welcome
            const welcomeMsg = t('chatbotWidget.welcomePersonalized', { name: preChatData.name, agentName: config.agentName });
            setMessages([{ role: 'model', text: welcomeMsg }]);

            // Save welcome message to conversation for Inbox
            if (convId) await saveConversationMessage({ role: 'model', text: welcomeMsg });
        } catch (error) {
            console.error('Error capturing pre-chat lead:', error);
        }
    };

    const handleQuickLeadCapture = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickLeadEmail) return;

        try {
            const conversationText = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

            console.log('[ChatCore] 📝 handleQuickLeadCapture - Transcript generated:', {
                messageCount: messages.length,
                transcriptLength: conversationText.length,
                transcriptPreview: conversationText.substring(0, 300)
            });
            const hasHighIntent = messages.some(m => m.role === 'user' && detectLeadIntent(m.text, leadConfig.intentKeywords));
            const leadScore = calculateLeadScore({ email: quickLeadEmail }, messages, hasHighIntent);

            // Analyze customer intent using LLM
            const intentAnalysis = await analyzeCustomerIntent(
                messages,
                project?.name || 'chatbot',
                user?.uid
            );

            // Update participant info in conversation for Inbox
            await updateParticipantInfo({
                name: quickLeadEmail.split('@')[0],
                email: quickLeadEmail,
            });

            if (onLeadCapture) {
                const leadId = await onLeadCapture({
                    name: quickLeadEmail.split('@')[0],
                    email: quickLeadEmail,
                    status: 'new',
                    message: t('chatbotWidget.leadSourceConversation'),
                    value: 0,
                    leadScore: intentAnalysis?.intentScore || leadScore,
                    conversationTranscript: conversationText,
                    tags: ['chatbot', 'mid-conversation', hasHighIntent ? 'high-intent' : 'low-intent'],
                    notes: t('chatbotWidget.leadNotesConversation', { count: messages.filter(m => m.role === 'user').length }),
                    // Include AI-analyzed customer intent
                    aiAnalysis: intentAnalysis?.customerInterest || undefined,
                    recommendedAction: intentAnalysis?.recommendedAction || undefined,
                    aiScore: intentAnalysis?.intentScore || undefined,
                });
                if (leadId) {
                    capturedLeadIdRef.current = leadId;
                    // Link conversation to lead for Inbox
                    await linkToLead(leadId);
                }
            }

            setLeadCaptured(true);
            setShowLeadCaptureModal(false);
            setQuickLeadEmail('');

            const thankYouMsg = t('chatbotWidget.contactSoon');
            setMessages(prev => [...prev, {
                role: 'model',
                text: thankYouMsg
            }]);

            // Save message to conversation for Inbox
            await saveConversationMessage({ role: 'model', text: thankYouMsg });
        } catch (error) {
            console.error('Error capturing lead:', error);
        }
    };

    const checkLeadCaptureThreshold = () => {
        if (!leadConfig.enabled || leadCaptured) return;

        const userMessagesCount = messages.filter(m => m.role === 'user').length;

        if (userMessagesCount >= leadConfig.triggerAfterMessages) {
            setMessages(prev => [...prev, {
                role: 'model',
                text: t('chatbotWidget.askEmail')
            }]);
            setShowLeadCaptureModal(true);
        }
    };

    // =============================================================================
    // APPOINTMENT FORM HANDLER
    // =============================================================================

    const handleAppointmentFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[ChatCore] 📅 Form submit clicked', {
            name: appointmentForm.name,
            email: appointmentForm.email,
            date: appointmentForm.date,
            time: appointmentForm.time,
            hasOnCreateAppointment: !!onCreateAppointment
        });

        if (!appointmentForm.name || !appointmentForm.email || !appointmentForm.date) {
            console.log('[ChatCore] ⚠️ Missing required fields');
            return;
        }

        if (!onCreateAppointment) {
            console.log('[ChatCore] ⚠️ No onCreateAppointment handler');
            return;
        }

        setIsCreatingAppointment(true);

        try {
            const [year, month, day] = appointmentForm.date.split('-').map(Number);
            const [hours, minutes] = appointmentForm.time.split(':').map(Number);

            console.log('[ChatCore] 📅 Parsed date:', { year, month, day, hours, minutes });
            const startDate = new Date(year, month - 1, day, hours, minutes);
            const durationMinutes = parseInt(appointmentForm.duration) || 60;
            const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

            // Generate transcript for the lead
            const transcriptForLead = messagesRef.current.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

            console.log('[ChatCore] 📝 Generating transcript for appointment:', {
                messagesCount: messagesRef.current.length,
                transcriptLength: transcriptForLead.length,
                transcriptPreview: transcriptForLead.substring(0, 500)
            });

            const appointmentData: ChatAppointmentData = {
                title: `Cita - ${appointmentForm.name} `,
                description: appointmentForm.notes || `Cita agendada por ${appointmentForm.name} a través del chat`,
                type: appointmentForm.appointmentType as any,
                startDate,
                endDate,
                participantName: appointmentForm.name,
                participantEmail: appointmentForm.email,
                participantPhone: appointmentForm.phone || undefined,
                linkedLeadId: capturedLeadIdRef.current || undefined,
                conversationTranscript: transcriptForLead, // Include full chat history
            };

            console.log('[ChatCore] 📅 Calling onCreateAppointment...');
            const appointmentId = await onCreateAppointment(appointmentData);
            console.log('[ChatCore] 📅 onCreateAppointment returned:', appointmentId);

            if (appointmentId) {
                console.log('[ChatCore] ✅ Appointment created successfully!');
                const formattedDate = startDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const formattedTime = startDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const durationText = parseInt(appointmentForm.duration) >= 60
                    ? `${parseInt(appointmentForm.duration) / 60} hora${parseInt(appointmentForm.duration) > 60 ? 's' : ''} `
                    : `${appointmentForm.duration} minutos`;

                setMessages(prev => [...prev, {
                    role: 'model',
                    text: `✅ **¡Cita agendada exitosamente! **\n\n📅 ** Fecha:** ${formattedDate} \n⏰ ** Hora:** ${formattedTime} \n⏱️ ** Duración:** ${durationText} \n👤 ** Nombre:** ${appointmentForm.name} \n📧 ** Email:** ${appointmentForm.email} \n\n¡Te esperamos! Si necesitas cambiar o cancelar tu cita, por favor contáctanos.`
                }]);

                setShowAppointmentForm(false);
                setAppointmentForm({ name: '', email: '', phone: '', date: '', time: '10:00', duration: '60', appointmentType: 'consultation', notes: '' });
            }
        } catch (error) {
            console.error('[ChatCore] Error creating appointment:', error);
            setMessages(prev => [...prev, {
                role: 'model',
                text: '⚠️ Hubo un error al agendar la cita. Por favor intenta de nuevo o contáctanos directamente.'
            }]);
        } finally {
            setIsCreatingAppointment(false);
        }
    };

    // =============================================================================
    // APPOINTMENT PROCESSING (AI-based)
    // =============================================================================

    const processAppointmentRequest = async (response: string): Promise<{ cleanedResponse: string; appointmentCreated: boolean }> => {
        console.log('[ChatCore] 📅 processAppointmentRequest called');
        console.log('[ChatCore] 📅 onCreateAppointment available:', !!onCreateAppointment);

        if (!onCreateAppointment) {
            console.log('[ChatCore] ⚠️ No onCreateAppointment handler - skipping');
            return { cleanedResponse: response, appointmentCreated: false };
        }

        // First try: Look for the structured block
        const appointmentRegex = /\[APPOINTMENT_REQUEST\]([\s\S]*?)\[\/APPOINTMENT_REQUEST\]/;
        let match = response.match(appointmentRegex);

        console.log('[ChatCore] 📅 Structured block found:', !!match);

        // Second try: Detect if AI CONFIRMED scheduling (not just offering)
        const confirmationPhrases = [
            /(?:tu|su|la) cita (?:ha sido |está |queda |fue )agendada/i,
            /cita confirmada/i,
            /appointment (?:has been |is )scheduled/i,
            /te esperamos el/i,
            /nos vemos el/i,
            /quedas agendad[oa]/i,
            /perfecto.*cita.*(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i,
            /agend(?:amos|é|ado).*(?:para el|el día)/i,
            /entonces.*cita.*(?:será|queda|es)/i,
            /tu cita (?:será|es|queda) (?:el|para el)/i,
            /reserv(?:amos|é|ado).*(?:para|el)/i,
            /confirm(?:amos|o|ado).*cita/i,
        ];

        const appointmentConfirmed = confirmationPhrases.some(regex => regex.test(response));

        // Make sure it's not just an offer (question or suggestion)
        const offerPhrases = [
            /podemos agendar/i,
            /puedes agendar/i,
            /te gustaría agendar/i,
            /quieres agendar/i,
            /deseas agendar/i,
            /\?[^.]*cita/i,
            /si (?:gustas|prefieres|quieres).*agendar/i,
        ];

        const isJustOffer = offerPhrases.some(regex => regex.test(response));

        const appointmentMentioned = appointmentConfirmed && !isJustOffer;

        console.log('[ChatCore] 📅 Appointment confirmed phrase found:', appointmentConfirmed);
        console.log('[ChatCore] 📅 Is just an offer:', isJustOffer);
        console.log('[ChatCore] 📅 Will attempt extraction:', appointmentMentioned && !match);

        // If no structured block but AI mentioned scheduling, try to extract from conversation
        if (!match && appointmentMentioned) {
            console.log('[ChatCore] 📅 AI confirmed appointment - extracting data from response...');
            console.log('[ChatCore] 📅 Response text:', response.substring(0, 300));

            // Try to extract date patterns
            const datePatterns = [
                /(\d{1,2})\s*de\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
                /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s*(\d{1,2})/i,
                /(\d{4}-\d{2}-\d{2})/,
            ];

            const timePatterns = [
                /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
                /(\d{1,2})\s*(am|pm)/i,
                /a las?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la tarde|de la mañana)?/i,
            ];

            // Extract name from previous messages
            let clientName = '';
            let clientEmail = '';
            const recentUserMessages = messages.filter(m => m.role === 'user').slice(-5);

            for (const msg of recentUserMessages) {
                // Look for name patterns
                const nameMatch = msg.text.match(/(?:me llamo|soy|mi nombre es)\s+([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i);
                if (nameMatch) clientName = nameMatch[1];

                // Look for email
                const emailMatch = msg.text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                if (emailMatch) clientEmail = emailMatch[1];
            }

            // Extract date from response
            let extractedDate = new Date();
            extractedDate.setDate(extractedDate.getDate() + 1); // Default to tomorrow

            const monthMap: Record<string, number> = {
                'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
                'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
            };

            for (const pattern of datePatterns) {
                const dateMatch = response.match(pattern);
                if (dateMatch) {
                    if (dateMatch[2] && monthMap[dateMatch[2].toLowerCase()] !== undefined) {
                        const day = parseInt(dateMatch[1]);
                        const month = monthMap[dateMatch[2].toLowerCase()];
                        const year = new Date().getFullYear();
                        extractedDate = new Date(year, month, day);
                    }
                    break;
                }
            }

            // Extract time from response
            let hours = 10;
            let minutes = 0;

            for (const pattern of timePatterns) {
                const timeMatch = response.match(pattern);
                if (timeMatch) {
                    hours = parseInt(timeMatch[1]);
                    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
                    const ampm = timeMatch[3]?.toLowerCase();
                    if (ampm && (ampm === 'pm' || ampm === 'de la tarde') && hours < 12) hours += 12;
                    if (ampm && (ampm === 'am' || ampm === 'de la mañana') && hours === 12) hours = 0;
                    break;
                }
            }

            extractedDate.setHours(hours, minutes, 0, 0);

            // Create appointment with extracted data
            const transcriptForLead = messagesRef.current.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

            const appointmentData: ChatAppointmentData = {
                title: `Cita - ${clientName || 'Cliente'} `,
                description: `Cita agendada a través del chat.Contexto: ${response.substring(0, 200)} `,
                type: 'consultation',
                startDate: extractedDate,
                endDate: new Date(extractedDate.getTime() + 60 * 60000),
                participantName: clientName || undefined,
                participantEmail: clientEmail || undefined,
                linkedLeadId: capturedLeadIdRef.current || undefined,
                conversationTranscript: transcriptForLead,
            };

            console.log('[ChatCore] 📅 Attempting to create appointment with data:', {
                title: appointmentData.title,
                startDate: appointmentData.startDate.toISOString(),
                endDate: appointmentData.endDate.toISOString(),
                participantName: appointmentData.participantName,
                participantEmail: appointmentData.participantEmail
            });

            try {
                const appointmentId = await onCreateAppointment(appointmentData);
                console.log('[ChatCore] 📅 ✅ Appointment created! ID:', appointmentId);
                return {
                    cleanedResponse: response + '\n\n✅ **¡Cita registrada en el sistema!**',
                    appointmentCreated: true
                };
            } catch (error) {
                console.error('[ChatCore] ❌ Error creating appointment:', error);
                return { cleanedResponse: response, appointmentCreated: false };
            }
        }

        if (!match) {
            return { cleanedResponse: response, appointmentCreated: false };
        }

        // Process structured block
        const appointmentBlock = match[1];
        const lines = appointmentBlock.trim().split('\n');
        const data: Record<string, string> = {};

        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim().toLowerCase();
                const value = line.substring(colonIndex + 1).trim();
                data[key] = value;
            }
        });

        // Parse date and time
        const dateStr = data.date || '';
        const timeStr = data.time || '10:00';
        const duration = parseInt(data.duration) || 60;

        let startDate: Date;
        let endDate: Date;

        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hours, minutes] = timeStr.split(':').map(Number);
            startDate = new Date(year, month - 1, day, hours, minutes);
            endDate = new Date(startDate.getTime() + duration * 60000);
        } catch {
            startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(10, 0, 0, 0);
            endDate = new Date(startDate.getTime() + duration * 60000);
        }

        const transcriptForLead = messagesRef.current.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

        const appointmentData: ChatAppointmentData = {
            title: data.title || 'Cita desde Chat',
            description: data.notes || `Cita agendada por ${data.name || 'cliente'} a través del chat`,
            type: (data.type as any) || 'consultation',
            startDate,
            endDate,
            participantName: data.name,
            participantEmail: data.email,
            participantPhone: data.phone,
            linkedLeadId: capturedLeadIdRef.current || undefined,
            conversationTranscript: transcriptForLead,
        };

        try {
            const appointmentId = await onCreateAppointment(appointmentData);
            console.log('[ChatCore] 📅 Appointment created:', appointmentId);

            const cleanedResponse = response.replace(appointmentRegex, '').trim();
            return {
                cleanedResponse: cleanedResponse + '\n\n✅ **¡Cita agendada exitosamente!**',
                appointmentCreated: true
            };
        } catch (error) {
            console.error('[ChatCore] ❌ Error creating appointment:', error);
            const cleanedResponse = response.replace(appointmentRegex, '').trim();
            return {
                cleanedResponse: cleanedResponse + '\n\n⚠️ *No se pudo agendar la cita automáticamente. Por favor contacta directamente.*',
                appointmentCreated: false
            };
        }
    };

    // =============================================================================
    // TEXT CHAT HANDLER
    // =============================================================================

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
        setMessages(newMessages);

        // Create conversation and save messages for Inbox
        const convId = await getOrCreateConversation();
        if (convId) {
            // Save previous messages (like welcome message) if this is the first user message
            const previousModelMessages = messages.filter(m => m.role === 'model');
            if (previousModelMessages.length > 0 && messages.filter(m => m.role === 'user').length === 0) {
                // This is the first user message, save the welcome message first
                for (const msg of previousModelMessages) {
                    await saveConversationMessage({ role: 'model', text: msg.text });
                }
            }
            // Save the current user message
            await saveConversationMessage({ role: 'user', text: userMessage });
        }

        // Detect high intent and trigger lead capture
        if (leadConfig.enabled && !leadCaptured && detectLeadIntent(userMessage, leadConfig.intentKeywords)) {
            setMessages(prev => [...prev, {
                role: 'model',
                text: t('chatbotWidget.askEmailHighIntent')
            }]);
            setShowLeadCaptureModal(true);
            return;
        }

        setIsLoading(true);

        try {
            if (hasApiKey === false && !isProxyMode()) {
                promptForKeySelection();
                setIsLoading(false);
                return;
            }

            const systemContext = buildSystemInstruction();

            // Build conversation history
            const conversationHistory = newMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            // Add page context as a system message at the start if available
            if (currentPageContext?.pageData && currentPageContext.section) {
                const sectionData = (currentPageContext.pageData as any)[currentPageContext.section];
                if (sectionData) {
                    const contextMessage = `[SYSTEM CONTEXT] The user is currently viewing the "${currentPageContext.section}" section.Content: ${JSON.stringify(sectionData).slice(0, 1500)} `;

                    // Prepend context to the latest user message
                    const lastMessageIndex = conversationHistory.length - 1;
                    if (lastMessageIndex >= 0 && conversationHistory[lastMessageIndex].role === 'user') {
                        conversationHistory[lastMessageIndex].parts[0].text =
                            contextMessage + '\n\n' + conversationHistory[lastMessageIndex].parts[0].text;

                        console.log('[ChatCore] 🎯 Page context injected into user message');
                    }
                }
            }

            let botResponse: string;

            // ALWAYS capture screen for visual context (like GlobalAiAssistant)
            let screenCapture: string | null = null;
            console.log('[ChatCore] 👁️ Capturing screen for visual context...');
            try {
                screenCapture = await captureCurrentView();
                if (screenCapture) {
                    console.log('[ChatCore] 📸 Screen captured successfully');
                }
            } catch (error) {
                console.warn('[ChatCore] ⚠️ Could not capture screen:', error);
            }

            // Build full prompt with system context and conversation history
            const fullPrompt = systemContext + '\n\n' +
                conversationHistory.map(msg =>
                    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts[0].text}`
                ).join('\n\n');

            // Use multimodal API if we have a screen capture (preferred)
            if (screenCapture) {
                console.log('[ChatCore] 🖼️ Using multimodal API with screen capture');
                const proxyResponse = await generateMultimodalContentViaProxy(
                    project.id,
                    fullPrompt,
                    [{ mimeType: "image/jpeg", data: screenCapture }],
                    'gemini-2.5-flash',
                    {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    },
                    user?.uid
                );

                botResponse = proxyResponse?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    t('chatbotWidget.errorResponse');
            } else {
                // Standard text-only API call
                console.log('[ChatCore] 📝 Using text-only API');
                const proxyResponse = await generateContentViaProxy(
                    project.id,
                    fullPrompt,
                    'gemini-2.5-flash',
                    {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048
                    },
                    user?.uid
                );

                botResponse = proxyResponse.response.candidates[0]?.content?.parts[0]?.text ||
                    t('chatbotWidget.errorResponse');
            }

            // Log API call
            if (user && activeProject) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject.id,
                    model: 'gemini-2.5-flash',
                    feature: isEmbedded ? 'embedded-widget' : 'chatbot',
                    success: true
                });
            }

            // Process appointment requests in the response
            const { cleanedResponse, appointmentCreated } = await processAppointmentRequest(botResponse);

            setMessages(prev => [...prev, { role: 'model', text: cleanedResponse }]);

            // Save bot response to conversation for Inbox
            await saveConversationMessage({ role: 'model', text: cleanedResponse });

            // ElevenLabs TTS auto-play: convert bot text response to audio
            if (config.voiceProvider === 'elevenlabs' && config.enableElevenLabsTTS && config.elevenlabsVoiceId) {
                try {
                    // Strip markdown for cleaner TTS output
                    const ttsText = cleanedResponse
                        .replace(/[*_~`#>\-\[\]()!]/g, '')
                        .replace(/\n{2,}/g, '. ')
                        .replace(/\n/g, ' ')
                        .trim();

                    if (ttsText.length > 0) {
                        console.log('[ChatCore] 🔊 ElevenLabs TTS: converting response to audio...');
                        const ttsResult = await elevenlabsTTS(ttsText, config.elevenlabsVoiceId);

                        // Stop any previous TTS audio
                        if (elevenLabsAudioRef.current) {
                            elevenLabsAudioRef.current.pause();
                            elevenLabsAudioRef.current = null;
                        }

                        const audio = new Audio(`data:${ttsResult.mimeType};base64,${ttsResult.audio}`);
                        elevenLabsAudioRef.current = audio;
                        audio.play().catch(err => {
                            console.warn('[ChatCore] 🔇 TTS autoplay blocked:', err.message);
                        });
                    }
                } catch (ttsError: any) {
                    console.warn('[ChatCore] ⚠️ ElevenLabs TTS failed:', ttsError.message);
                }
            }

            // If appointment was created, mark lead as captured
            if (appointmentCreated && !leadCaptured) {
                setLeadCaptured(true);
            }

            // Check if we should trigger lead capture
            setTimeout(() => checkLeadCaptureThreshold(), 500);

        } catch (error: any) {
            // Log failed API call
            if (user && activeProject) {
                logApiCall({
                    userId: user.uid,
                    projectId: activeProject.id,
                    model: 'gemini-2.5-flash',
                    feature: isEmbedded ? 'embedded-widget' : 'chatbot',
                    success: false,
                    errorMessage: error.message || 'Unknown error'
                });
            }
            handleApiError(error);
            console.error('ChatCore Error:', error?.message || error);

            // Provide more helpful error messages
            let errorMessage = t('chatbotWidget.genericError');
            if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
                errorMessage = t('chatbotWidget.rateLimitError', 'Too many requests. Please wait a moment and try again.');
            } else if (error?.message?.includes('API') || error?.message?.includes('configuration')) {
                errorMessage = t('chatbotWidget.configError', 'Service temporarily unavailable. Please try again later.');
            }

            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // =============================================================================
    // VOICE SESSION HANDLERS
    // =============================================================================

    const startLiveSession = async () => {
        if (hasApiKey === false) {
            promptForKeySelection();
            return;
        }

        if (!config.enableLiveVoice) {
            alert(t('chatbotWidget.liveVoiceDisabled'));
            return;
        }

        setIsConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            // Determine if we should use ElevenLabs TTS for voice output
            // We still use Gemini's native audio model (required), but mute its output
            // and use the outputAudioTranscription for ElevenLabs TTS instead
            const useElevenLabsVoice = config.voiceProvider === 'elevenlabs' && config.elevenlabsVoiceId;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    // Always use AUDIO - the native audio model requires it
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Zephyr' } }
                    },
                    systemInstruction: buildSystemInstruction(),
                    // Enable transcription for both user input and model output
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: async () => {
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            streamRef.current = stream;
                            const source = inputCtx.createMediaStreamSource(stream);
                            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;
                            processor.onaudioprocess = (e) => {
                                if (!isConnectedRef.current) return;
                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcm16 = floatTo16BitPCM(inputData);
                                const base64Data = bytesToBase64(new Uint8Array(pcm16));
                                sessionPromise.then(session => {
                                    if (!isConnectedRef.current) return;
                                    try {
                                        session.sendRealtimeInput({
                                            media: { mimeType: 'audio/pcm;rate=16000', data: base64Data }
                                        });
                                    } catch (err) { }
                                });
                            };
                            source.connect(processor);
                            processor.connect(inputCtx.destination);
                        } catch (micErr) {
                            stopLiveSession();
                            alert("No se pudo acceder al micrófono. Permite el acceso y recarga la página.");
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const msg = message as any;

                        if (message.serverContent?.interrupted) {
                            activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } });
                            activeSourcesRef.current = [];
                            if (audioContextRef.current) nextStartTimeRef.current = audioContextRef.current.currentTime;
                            // Stop any ElevenLabs TTS playback on interruption
                            if (elevenLabsAudioRef.current) {
                                elevenLabsAudioRef.current.pause();
                                elevenLabsAudioRef.current = null;
                            }
                            return;
                        }

                        // Capture user input transcription (from inputAudioTranscription config)
                        if (msg.serverContent?.inputTranscript) {
                            const userText = msg.serverContent.inputTranscript;
                            if (userText && userText.trim()) {
                                voiceTranscriptRef.current.push({ role: 'user', text: userText.trim() });
                            }
                        }

                        // Capture model output transcription (from outputAudioTranscription config)
                        if (msg.serverContent?.outputTranscript) {
                            const modelText = msg.serverContent.outputTranscript;
                            if (modelText && modelText.trim()) {
                                voiceTranscriptRef.current.push({ role: 'model', text: modelText.trim() });
                                // When using ElevenLabs, accumulate transcript for TTS
                                if (useElevenLabsVoice) {
                                    currentModelResponseRef.current += modelText;
                                }
                            }
                        }

                        // Also check for text in modelTurn parts (fallback + ElevenLabs text output)
                        const modelParts = message.serverContent?.modelTurn?.parts;
                        if (modelParts) {
                            for (const part of modelParts) {
                                if (part.text && part.text.trim()) {
                                    currentModelResponseRef.current += part.text;
                                }
                            }
                        }

                        // Check if turn is complete to save accumulated model response
                        if (msg.serverContent?.turnComplete && currentModelResponseRef.current.trim()) {
                            const fullResponse = currentModelResponseRef.current.trim();
                            voiceTranscriptRef.current.push({ role: 'model', text: fullResponse });

                            // ElevenLabs TTS: convert the text response to audio and play it
                            if (useElevenLabsVoice && config.elevenlabsVoiceId) {
                                try {
                                    console.log('[ChatCore] 🔊 ElevenLabs Live TTS: converting response to audio...');
                                    const ttsText = fullResponse
                                        .replace(/[*_~`#>\-\[\]()!]/g, '')
                                        .replace(/\n{2,}/g, '. ')
                                        .replace(/\n/g, ' ')
                                        .trim();
                                    if (ttsText.length > 0) {
                                        const ttsResult = await elevenlabsTTS(ttsText, config.elevenlabsVoiceId);
                                        // Stop any previous TTS audio
                                        if (elevenLabsAudioRef.current) {
                                            elevenLabsAudioRef.current.pause();
                                            elevenLabsAudioRef.current = null;
                                        }
                                        const audio = new Audio(`data:${ttsResult.mimeType};base64,${ttsResult.audio}`);
                                        elevenLabsAudioRef.current = audio;
                                        audio.play().catch(err => {
                                            console.warn('[ChatCore] 🔇 ElevenLabs TTS autoplay blocked:', err.message);
                                        });
                                    }
                                } catch (ttsError: any) {
                                    console.warn('[ChatCore] ⚠️ ElevenLabs Live TTS failed:', ttsError.message);
                                }
                            }

                            currentModelResponseRef.current = '';
                        }

                        // Handle Audio Output (only for Gemini native audio, not ElevenLabs)
                        if (!useElevenLabsVoice) {
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
                        }
                    },
                    onclose: () => stopLiveSession(),
                    onerror: () => { if (!isConnectedRef.current) return; }
                }
            });
            sessionRef.current = sessionPromise;
        } catch (error) {
            handleApiError(error);
            setIsConnecting(false);
            alert("Error al iniciar sesión de voz.");
        }
    };

    const stopLiveSession = () => {
        isConnectedRef.current = false;

        // Stop Mic
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

        // Stop Speakers
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Close Session
        if (sessionRef.current) {
            sessionRef.current = null;
        }

        // Add voice transcription to chat messages
        if (voiceTranscriptRef.current.length > 0) {
            console.log('[ChatCore] 🎙️ Voice transcript:', voiceTranscriptRef.current);

            const voiceMessages: Message[] = voiceTranscriptRef.current.map(t => ({
                role: t.role,
                text: t.text,
                isVoiceMessage: true
            }));

            // Add a separator message to indicate voice conversation
            setMessages(prev => [
                ...prev,
                { role: 'model', text: '🎙️ **Transcripción de llamada de voz:**', isVoiceMessage: true },
                ...voiceMessages
            ]);

            // Process voice transcript for appointments
            processVoiceTranscriptForAppointments(voiceTranscriptRef.current);

            // Clear transcript for next session
            voiceTranscriptRef.current = [];
            currentModelResponseRef.current = '';
        } else {
            // If no transcription available, add a note
            setMessages(prev => [
                ...prev,
                { role: 'model', text: '🎙️ *Llamada de voz finalizada* (transcripción no disponible)', isVoiceMessage: true }
            ]);
        }

        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    };

    // Process voice transcript for appointment detection
    const processVoiceTranscriptForAppointments = async (transcript: { role: 'user' | 'model'; text: string }[]) => {
        if (!onCreateAppointment) return;

        console.log('[ChatCore] 🎙️📅 Processing voice transcript for appointments...');

        // Combine all model responses to check for appointment confirmation
        const modelResponses = transcript.filter(t => t.role === 'model').map(t => t.text).join(' ');
        const userResponses = transcript.filter(t => t.role === 'user').map(t => t.text).join(' ');
        const fullConversation = transcript.map(t => `${t.role}: ${t.text} `).join('\n');

        // Check if appointment was confirmed in voice conversation
        const appointmentConfirmed = /(?:cita|appointment|reunión|meeting).*(?:agendada|confirmada|programada|scheduled|confirmed|registrada)/i.test(modelResponses) ||
            /(?:te espero|te esperamos|nos vemos|see you|quedamos)/i.test(modelResponses);

        // Check if it's just an offer (not confirmed)
        const isJustOffer = /(?:¿(?:te gustaría|quieres|deseas|podemos)|would you like|can we schedule|si gustas|si quieres)/i.test(modelResponses) &&
            !appointmentConfirmed;

        if (appointmentConfirmed && !isJustOffer) {
            console.log('[ChatCore] 🎙️📅 Appointment detected in voice conversation!');

            // Try to extract appointment details from conversation
            const datePatterns = [
                /(\d{1,2})\s*(?:de\s*)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
                /(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/i,
                /(?:mañana|pasado mañana|tomorrow)/i,
                /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/
            ];

            const timePatterns = [
                /(\d{1,2}):(\d{2})\s*(?:am|pm|AM|PM)?/,
                /(\d{1,2})\s*(?:de la\s*)?(mañana|tarde|noche)/i,
                /a las?\s*(\d{1,2})(?::(\d{2}))?/i
            ];

            // Extract name and email from user responses
            const nameMatch = userResponses.match(/(?:me llamo|mi nombre es|soy)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/i) ||
                userResponses.match(/^([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)?)/);
            const emailMatch = userResponses.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

            let extractedDate: Date | null = null;
            let extractedTime: { hours: number; minutes: number } | null = null;

            // Try to extract date
            for (const pattern of datePatterns) {
                const match = fullConversation.match(pattern);
                if (match) {
                    const today = new Date();
                    if (/mañana|tomorrow/i.test(match[0])) {
                        extractedDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                    } else if (/pasado mañana/i.test(match[0])) {
                        extractedDate = new Date(today.getTime() + 48 * 60 * 60 * 1000);
                    } else if (match[1] && match[2]) {
                        const months: { [key: string]: number } = {
                            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
                            'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
                        };
                        const monthNum = months[match[2].toLowerCase()];
                        if (monthNum !== undefined) {
                            extractedDate = new Date(today.getFullYear(), monthNum, parseInt(match[1]));
                        }
                    }
                    break;
                }
            }

            // Try to extract time
            for (const pattern of timePatterns) {
                const match = fullConversation.match(pattern);
                if (match) {
                    let hours = parseInt(match[1]) || 10;
                    const minutes = parseInt(match[2]) || 0;

                    // Adjust for AM/PM or time of day
                    if (/pm/i.test(match[0]) && hours < 12) hours += 12;
                    if (/tarde/i.test(match[0]) && hours < 12) hours += 12;
                    if (/noche/i.test(match[0]) && hours < 18) hours += 12;

                    extractedTime = { hours, minutes };
                    break;
                }
            }

            // If we have enough info, create the appointment
            if (extractedDate || extractedTime) {
                const startDate = extractedDate || new Date();
                if (extractedTime) {
                    startDate.setHours(extractedTime.hours, extractedTime.minutes, 0, 0);
                } else {
                    startDate.setHours(10, 0, 0, 0); // Default 10 AM
                }

                // If date is in the past, move to next occurrence
                if (startDate < new Date()) {
                    startDate.setDate(startDate.getDate() + 7);
                }

                const endDate = new Date(startDate.getTime() + 60 * 60000); // 1 hour

                const transcriptForLead = messagesRef.current.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');

                const appointmentData: ChatAppointmentData = {
                    title: `Cita por voz - ${nameMatch?.[1]?.trim() || 'Cliente'} `,
                    description: `Cita agendada durante llamada de voz`,
                    type: 'consultation',
                    startDate,
                    endDate,
                    participantName: nameMatch?.[1]?.trim() || 'Cliente de llamada',
                    participantEmail: emailMatch?.[1] || '',
                    linkedLeadId: capturedLeadIdRef.current || undefined,
                    conversationTranscript: transcriptForLead,
                };

                try {
                    const appointmentId = await onCreateAppointment(appointmentData);
                    if (appointmentId) {
                        console.log('[ChatCore] 🎙️📅 ✅ Voice appointment created:', appointmentId);
                        setMessages(prev => [...prev, {
                            role: 'model',
                            text: `✅ ** Cita registrada desde llamada de voz **\n📅 ${startDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} \n⏰ ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} `,
                            isVoiceMessage: true
                        }]);
                    }
                } catch (error) {
                    console.error('[ChatCore] 🎙️📅 ❌ Error creating voice appointment:', error);
                }
            } else {
                console.log('[ChatCore] 🎙️📅 Appointment mentioned but no date/time extracted');
            }
        }
    };

    // =============================================================================
    // RENDER
    // =============================================================================
    console.log('[ChatCore Debug] config.enableLiveVoice:', config.enableLiveVoice, 'isLiveActive:', isLiveActive, 'showPreChatForm:', showPreChatForm);

    return (
        <div className={`flex flex-col h-full ${className} `}>
            {/* Header */}
            {showHeader && (
                <div
                    className="p-4 flex justify-between items-center transition-colors duration-500"
                    style={{
                        backgroundColor: isLiveActive ? (appearance.colors?.accentColor || '#ef4444') : appearance.colors?.headerBackground,
                        color: appearance.colors?.headerText
                    }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isLiveActive ? (
                            <div className="p-2 rounded-full bg-white/20 animate-pulse flex-shrink-0">
                                <Mic size={20} />
                            </div>
                        ) : appearance.branding.logoType === 'emoji' ? (
                            <div className="w-10 h-10 flex items-center justify-center text-2xl flex-shrink-0">
                                {appearance.branding.logoEmoji}
                            </div>
                        ) : appearance.branding.logoType === 'image' && appearance.branding.logoUrl ? (
                            <img src={appearance.branding.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="p-2 rounded-full bg-white/20 flex-shrink-0">
                                <MessageSquare size={20} />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <span className="font-bold text-sm block leading-tight truncate">{config.agentName}</span>
                            <span className="text-[10px] opacity-80 block leading-tight truncate">
                                {isLiveActive ? t('chatbotWidget.liveSession') : t('chatbotWidget.chatOnline')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {headerActions}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-black/5 transition-colors"
                                style={{ color: appearance.colors?.headerText }}
                                title={t('common.close')}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden" style={{ backgroundColor: appearance.colors?.backgroundColor }}>

                {/* Pre-Chat Form - Compact */}
                {showPreChatForm && (
                    <div
                        className="absolute inset-0 flex flex-col z-20"
                        style={{ backgroundColor: appearance.colors?.backgroundColor }}
                    >
                        {/* Compact Header */}
                        <div
                            className="px-4 py-5 text-center"
                            style={{ background: `linear-gradient(135deg, ${appearance.colors?.primaryColor}, ${appearance.colors?.accentColor || appearance.colors?.primaryColor}dd)` }}
                        >
                            <div className="w-12 h-12 mx-auto rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl mb-2">
                                {appearance.branding.logoEmoji || '👋'}
                            </div>
                            <h3 className="text-sm font-bold text-white">
                                {t('chatbotWidget.preChatTitle', '¡Hola!')}
                            </h3>
                            <p className="text-[10px] text-white/70 mt-1">
                                {t('chatbotWidget.preChatSubtitle', 'Cuéntanos sobre ti')}
                            </p>
                        </div>

                        {/* Compact Form */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            <form onSubmit={handlePreChatSubmit} className="space-y-2.5">
                                <input
                                    type="text"
                                    placeholder={t('chatbotWidget.preChatName', 'Tu nombre')}
                                    value={preChatData.name}
                                    onChange={(e) => setPreChatData({ ...preChatData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2.5 text-xs rounded-lg border transition-colors focus:outline-none"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                    }}
                                />
                                <input
                                    type="email"
                                    placeholder={t('chatbotWidget.preChatEmail', 'Tu email')}
                                    value={preChatData.email}
                                    onChange={(e) => setPreChatData({ ...preChatData, email: e.target.value })}
                                    required
                                    className="w-full px-3 py-2.5 text-xs rounded-lg border transition-colors focus:outline-none"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                    }}
                                />
                                <input
                                    type="tel"
                                    placeholder={t('chatbotWidget.preChatPhone', 'Teléfono (opcional)')}
                                    value={preChatData.phone}
                                    onChange={(e) => setPreChatData({ ...preChatData, phone: e.target.value })}
                                    className="w-full px-3 py-2.5 text-xs rounded-lg border transition-colors focus:outline-none"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                    }}
                                />

                                <button
                                    type="submit"
                                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-all hover:opacity-90 mt-1"
                                    style={{
                                        backgroundColor: appearance.colors?.primaryColor,
                                        color: '#ffffff'
                                    }}
                                >
                                    {t('chatbotWidget.preChatStart', 'Iniciar Chat')} →
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPreChatForm(false);
                                        const welcomeMsg = appearance.messages?.welcomeMessage || `${t('chatbotWidget.welcomeMessageDefault', { agentName: config.agentName })} `;
                                        setMessages([{ role: 'model', text: welcomeMsg }]);
                                    }}
                                    className="w-full py-1.5 text-[10px] opacity-50 hover:opacity-100 transition-opacity"
                                    style={{ color: appearance.colors?.botTextColor }}
                                >
                                    {t('chatbotWidget.preChatSkip', 'Continuar sin registro')}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Quick Lead Capture Modal - Compact */}
                {showLeadCaptureModal && (
                    <div className="absolute inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm z-20 p-3">
                        <div
                            className="w-full rounded-2xl overflow-hidden border"
                            style={{
                                backgroundColor: appearance.colors?.botBubbleColor,
                                borderColor: appearance.colors?.inputBorder
                            }}
                        >
                            {/* Compact Header */}
                            <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: appearance.colors?.primaryColor + '20' }}
                                >
                                    <Sparkles size={16} style={{ color: appearance.colors?.primaryColor }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold" style={{ color: appearance.colors?.botTextColor }}>
                                        {t('chatbotWidget.leadModalTitle', '¿Te envío más info?')}
                                    </p>
                                    <p className="text-[10px] opacity-60" style={{ color: appearance.colors?.botTextColor }}>
                                        {t('chatbotWidget.leadModalSubtitle', 'Déjame tu email')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowLeadCaptureModal(false)}
                                    className="p-1 rounded-full opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} style={{ color: appearance.colors?.botTextColor }} />
                                </button>
                            </div>

                            {/* Compact Form */}
                            <form onSubmit={handleQuickLeadCapture} className="px-4 pb-4">
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder={t('auth.emailPlaceholder')}
                                        value={quickLeadEmail}
                                        onChange={(e) => setQuickLeadEmail(e.target.value)}
                                        required
                                        className="flex-1 min-w-0 px-3 py-2 text-xs rounded-lg border transition-colors focus:outline-none"
                                        style={{
                                            backgroundColor: appearance.colors?.inputBackground,
                                            borderColor: appearance.colors?.inputBorder,
                                            color: appearance.colors?.inputText,
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-90 flex-shrink-0"
                                        style={{
                                            backgroundColor: appearance.colors?.primaryColor,
                                            color: '#ffffff'
                                        }}
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Live Voice Mode Overlay - Modern Redesign */}
                {isLiveActive ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-between bg-gradient-to-b from-gray-900 via-gray-900 to-black z-[30] text-white animate-fade-in py-10">
                        {/* Premium Orbital Animation - Top Group */}
                        <div className="relative w-40 h-40 flex items-center justify-center mt-4">
                            {/* Orbital Rings */}
                            <div className="absolute inset-0 rounded-full border border-red-500/20 animate-[ping_3s_linear_infinite] scale-100 opacity-0"></div>
                            <div className="absolute inset-4 rounded-full border border-red-500/30 animate-[ping_2s_linear_infinite] scale-100 opacity-0"></div>
                            <div className="absolute inset-8 rounded-full border-2 border-red-500/40 animate-[pulse_2s_ease-in-out_infinite] opacity-30"></div>

                            {/* Glassmorphism Mic Container */}
                            <div className="w-20 h-20 rounded-full bg-red-600/10 backdrop-blur-md flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] relative z-10">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse"></div>
                                <Mic size={32} className="text-red-500 relative z-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            </div>
                        </div>

                        {/* Middle Group: Visualizer + Status */}
                        <div className="flex flex-col items-center w-full px-6">
                            {/* Audio Waveform Visualizer (20 bars) */}
                            <div className="flex items-end justify-center gap-[4px] h-12 mb-6 w-full">
                                {visualizerLevels.map((height, i) => (
                                    <div
                                        key={i}
                                        className="w-[3px] rounded-full transition-all duration-150"
                                        style={{
                                            height: `${height}px`,
                                            opacity: 0.4 + (height / 60),
                                            backgroundColor: appearance.colors?.accentColor || '#ef4444',
                                            boxShadow: `0 0 10px ${(appearance.colors?.accentColor || '#ef4444')}44`
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="text-center">
                                <h3 className="text-lg font-bold mb-1.5 tracking-tight text-white/95">
                                    {t('chatbotWidget.listening')}
                                </h3>
                                <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed mx-auto font-light">
                                    {t('chatbotWidget.voicePrompt')} <span className="text-red-400 font-medium">{config.languages || 'Spanish, English'}</span>.
                                </p>
                            </div>
                        </div>

                        {/* Bottom Group: End Call Button */}
                        <div className="pb-4">
                            <button
                                onClick={stopLiveSession}
                                className="group relative px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(220,38,38,0.3)] flex items-center overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <PhoneOff size={16} className="mr-2 relative z-10" />
                                <span className="relative z-10">{t('chatbotWidget.endCall')}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Text Chat History */
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                {msg.role === 'model' && appearance.branding.showBotAvatar && (
                                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-base mb-1">
                                        {msg.isVoiceMessage ? <Mic size={14} className="text-purple-500" /> : appearance.branding.botAvatarEmoji}
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'rounded-tr-sm'
                                        : 'rounded-tl-sm markdown-content'
                                        } ${msg.isVoiceMessage ? 'border border-purple-300/30' : ''} `}
                                    style={
                                        msg.role === 'user'
                                            ? {
                                                backgroundColor: msg.isVoiceMessage ? 'rgba(147, 51, 234, 0.1)' : appearance.colors?.userBubbleColor,
                                                color: appearance.colors?.userTextColor
                                            }
                                            : {
                                                backgroundColor: msg.isVoiceMessage ? 'rgba(147, 51, 234, 0.05)' : appearance.colors?.botBubbleColor,
                                                color: appearance.colors?.botTextColor
                                            }
                                    }
                                >
                                    {msg.role === 'model' ? (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="mb-4 last:mb-0 list-disc pl-5 space-y-2" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="mb-4 last:mb-0 list-decimal pl-5 space-y-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                                code: ({ node, className, ...props }) => {
                                                    const isInline = !className?.includes('language-');
                                                    return isInline ? (
                                                        <code className="bg-black/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                                                    ) : (
                                                        <code className="block bg-black/10 p-2 rounded my-2 text-xs font-mono overflow-x-auto" {...props} />
                                                    );
                                                },
                                                a: ({ node, ...props }) => <a className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-base font-bold mb-3 mt-4 first:mt-0" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-sm font-bold mb-3 mt-4 first:mt-0" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xs font-bold mb-2 mt-3 first:mt-0" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-current pl-3 italic my-4 opacity-80" {...props} />,
                                                hr: ({ node, ...props }) => <hr className="my-4 border-current opacity-20" {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            {msg.isVoiceMessage && <Mic size={10} className="text-purple-400 flex-shrink-0" />}
                                            {msg.text}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div
                                    className="p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2"
                                    style={{
                                        backgroundColor: appearance.colors?.botBubbleColor,
                                        color: appearance.colors?.botTextColor
                                    }}
                                >
                                    <div className="flex gap-1">
                                        <span
                                            className="w-2 h-2 rounded-full animate-bounce"
                                            style={{
                                                backgroundColor: appearance.colors?.primaryColor,
                                                animationDelay: '0ms'
                                            }}
                                        />
                                        <span
                                            className="w-2 h-2 rounded-full animate-bounce"
                                            style={{
                                                backgroundColor: appearance.colors?.primaryColor,
                                                animationDelay: '150ms'
                                            }}
                                        />
                                        <span
                                            className="w-2 h-2 rounded-full animate-bounce"
                                            style={{
                                                backgroundColor: appearance.colors?.primaryColor,
                                                animationDelay: '300ms'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />

                        {/* Quick Replies */}
                        {appearance.messages.quickReplies && appearance.messages.quickReplies.length > 0 && messages.length <= 2 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {appearance.messages.quickReplies.map((qr) => (
                                    <button
                                        key={qr.id}
                                        onClick={() => {
                                            setInput(qr.text);
                                            setTimeout(() => handleSend(), 100);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all hover:shadow-md hover:scale-105"
                                        style={{
                                            backgroundColor: appearance.colors?.primaryColor + '15',
                                            color: appearance.colors?.primaryColor,
                                            border: `1px solid ${appearance.colors?.primaryColor} 40`
                                        }}
                                    >
                                        {qr.emoji && <span>{qr.emoji}</span>}
                                        <span>{qr.text}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Bar */}
            {!isLiveActive && !showPreChatForm && (
                <>
                    <div className="py-1 px-2 text-center border-t text-[9px] opacity-40 flex items-center justify-center gap-1" style={{ borderColor: appearance.colors?.inputBorder, color: appearance.colors?.inputText }}>
                        <Sparkles size={8} /> {t('chatbotWidget.poweredBy')}
                    </div>
                    <div
                        className="px-2 py-2 border-t flex items-center gap-1.5"
                        style={{
                            backgroundColor: appearance.colors?.inputBackground,
                            borderColor: appearance.colors?.inputBorder
                        }}
                    >
                        {config.enableLiveVoice && (
                            <button
                                onClick={startLiveSession}
                                disabled={isConnecting}
                                className="p-2 rounded-full transition-all shadow-sm border flex-shrink-0"
                                style={{
                                    backgroundColor: isConnecting ? appearance.colors?.inputBackground : (appearance.colors?.accentColor + '15'),
                                    color: isConnecting ? appearance.colors?.inputText : appearance.colors?.accentColor,
                                    borderColor: isConnecting ? appearance.colors?.inputBorder : (appearance.colors?.accentColor + '40'),
                                    opacity: isConnecting ? 0.5 : 1
                                }}
                                title="Start Real-time Voice"
                            >
                                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                            </button>
                        )}
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('chatbotWidget.inputPlaceholder')}
                            className="flex-1 min-w-0 px-3 py-2 rounded-full text-xs outline-none focus:ring-2 transition-all border"
                            style={{
                                backgroundColor: appearance.colors?.inputBackground,
                                color: appearance.colors?.inputText,
                                borderColor: appearance.colors?.inputBorder,
                                '--tw-ring-color': appearance.colors?.primaryColor + '40'
                            } as React.CSSProperties}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-2 rounded-full text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            style={{ backgroundColor: appearance.colors?.primaryColor }}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </>
            )}

            {/* Appointment Form Modal */}
            {showAppointmentForm && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center p-4">
                    <div
                        className="w-full max-w-sm rounded-2xl shadow-2xl p-5 animate-fade-in-up"
                        style={{ backgroundColor: appearance.colors?.backgroundColor }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: appearance.colors?.botTextColor }}>
                                <Calendar size={18} style={{ color: appearance.colors?.primaryColor }} />
                                Agendar Cita
                            </h3>
                            <button
                                onClick={() => setShowAppointmentForm(false)}
                                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                            >
                                <X size={16} style={{ color: appearance.colors?.botTextColor }} />
                            </button>
                        </div>

                        <form onSubmit={handleAppointmentFormSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    value={appointmentForm.name}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                        '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                    } as React.CSSProperties}
                                    placeholder={t('landingChatbot.appointmentForm.namePlaceholder')}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={appointmentForm.email}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                        '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                    } as React.CSSProperties}
                                    placeholder={t('auth.emailPlaceholder')}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    value={appointmentForm.phone}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                        '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                    } as React.CSSProperties}
                                    placeholder={t('landingChatbot.appointmentForm.phonePlaceholder')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                        Fecha *
                                    </label>
                                    <input
                                        type="date"
                                        value={appointmentForm.date}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: appearance.colors?.inputBackground,
                                            borderColor: appearance.colors?.inputBorder,
                                            color: appearance.colors?.inputText,
                                            '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                        } as React.CSSProperties}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                        Hora *
                                    </label>
                                    <input
                                        type="time"
                                        value={appointmentForm.time}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: appearance.colors?.inputBackground,
                                            borderColor: appearance.colors?.inputBorder,
                                            color: appearance.colors?.inputText,
                                            '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                        } as React.CSSProperties}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                        Duración
                                    </label>
                                    <select
                                        value={appointmentForm.duration}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, duration: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: appearance.colors?.inputBackground,
                                            borderColor: appearance.colors?.inputBorder,
                                            color: appearance.colors?.inputText,
                                            '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                        } as React.CSSProperties}
                                    >
                                        <option value="15">{t('landingChatbot.appointmentForm.durations.15min')}</option>
                                        <option value="30">{t('landingChatbot.appointmentForm.durations.30min')}</option>
                                        <option value="45">{t('landingChatbot.appointmentForm.durations.45min')}</option>
                                        <option value="60">{t('landingChatbot.appointmentForm.durations.1hour')}</option>
                                        <option value="90">{t('landingChatbot.appointmentForm.durations.1half')}</option>
                                        <option value="120">{t('landingChatbot.appointmentForm.durations.2hours')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                        Tipo
                                    </label>
                                    <select
                                        value={appointmentForm.appointmentType}
                                        onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointmentType: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: appearance.colors?.inputBackground,
                                            borderColor: appearance.colors?.inputBorder,
                                            color: appearance.colors?.inputText,
                                            '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                        } as React.CSSProperties}
                                    >
                                        <option value="consultation">{t('landingChatbot.appointmentForm.types.consultation')}</option>
                                        <option value="meeting">{t('landingChatbot.appointmentForm.types.meeting')}</option>
                                        <option value="service">{t('landingChatbot.appointmentForm.types.service')}</option>
                                        <option value="followup">{t('landingChatbot.appointmentForm.types.followup')}</option>
                                        <option value="demo">{t('landingChatbot.appointmentForm.types.demo')}</option>
                                        <option value="other">{t('landingChatbot.appointmentForm.types.other')}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium mb-1" style={{ color: appearance.colors?.botTextColor }}>
                                    Notas
                                </label>
                                <textarea
                                    value={appointmentForm.notes}
                                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none focus:ring-2 resize-none"
                                    style={{
                                        backgroundColor: appearance.colors?.inputBackground,
                                        borderColor: appearance.colors?.inputBorder,
                                        color: appearance.colors?.inputText,
                                        '--tw-ring-color': appearance.colors?.primaryColor + '40'
                                    } as React.CSSProperties}
                                    placeholder={t('landingChatbot.appointmentForm.notesPlaceholder')}
                                    rows={2}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreatingAppointment || !appointmentForm.name || !appointmentForm.email || !appointmentForm.date}
                                className="w-full py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ backgroundColor: appearance.colors?.primaryColor }}
                            >
                                {isCreatingAppointment ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        {t('landingChatbot.appointmentForm.scheduling')}
                                    </>
                                ) : (
                                    <>
                                        <Calendar size={14} />
                                        {t('landingChatbot.appointmentForm.confirm')}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatCore;

