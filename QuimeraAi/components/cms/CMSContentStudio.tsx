/**
 * CMSContentStudio
 * 
 * Conversational AI Content Assistant for User CMS (project-level).
 * Uses PROJECT-SPECIFIC context (business info, brand, website content,
 * existing posts, CRM leads) — NOT platform/Quimera knowledge.
 * 
 * Features:
 * - Multi-turn text chat (gemini-3-flash-preview)
 * - Real-time voice via Gemini Live API (gemini-3.1-flash-live-preview)
 * - Deep PROJECT context awareness (brand, industry, leads, content)
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
import ConfirmationModal from '../ui/ConfirmationModal';
import { LiveServerMessage, Modality } from '@google/genai';
import { getGoogleGenAI } from '../../utils/genAiClient';
import {
    generateChatContentViaProxy,
    extractTextFromResponse,
    type ChatMessage,
} from '../../utils/geminiProxyClient';
import { CMSPost } from '../../types';
import { useAuth } from '../../contexts/core/AuthContext';
import { useProject } from '../../contexts/project';
import { useCMS } from '../../contexts/cms';
import { useCRM } from '../../contexts/crm/CRMContext';
import { sanitizeHtml } from '../../utils/sanitize';
import { logApiCall } from '../../services/apiLoggingService';

// =============================================================================
// AUDIO UTILITIES (for Live API voice mode)
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

interface CMSContentStudioProps {
    onClose: () => void;
    onPostCreated: (post: CMSPost) => void;
}

interface DisplayMessage {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    timestamp: number;
}

type StudioPhase = 'conversation' | 'generating' | 'preview';

const CONTENT_TYPE_OPTIONS = [
    { value: 'blog', label: 'Blog' },
    { value: 'gallery', label: 'Galería' },
    { value: 'profile', label: 'Perfil' },
];

const TONE_OPTIONS = [
    'Profesional', 'Amigable', 'Persuasivo', 'Informativo', 'Inspirador', 'Técnico'
];

const MODEL_TEXT = 'gemini-3-flash-preview';
const MODEL_VOICE = 'gemini-3.1-flash-live-preview';

// =============================================================================
// PROJECT CONTEXT (replaces platform knowledge)
// =============================================================================

interface ProjectContentContext {
    businessName: string;
    industry: string;
    targetAudience: string;
    toneOfVoice: string;
    tagline: string;
    coreValues: string;
    websiteContent: string; // Extracted from project sections
    existingPostTitles: string[];
    leadsSummary: string; // Summary of CRM leads
}

/** Build system prompt using PROJECT data only — no Quimera platform knowledge */
function buildProjectSystemPrompt(ctx: ProjectContentContext, lang: 'es' | 'en'): string {
    const langLabel = lang === 'es' ? 'Spanish (Español)' : 'English';

    return `
You are a **Content Strategist AI** — an expert content creator specialized in helping a specific business create high-quality content.

YOUR ROLE:
You help the user plan, strategize, and create content for their business. You have detailed knowledge about their business, brand identity, target audience, and existing content.

=== BUSINESS PROFILE ===
- Business Name: ${ctx.businessName}
- Industry: ${ctx.industry}
- Target Audience: ${ctx.targetAudience}
- Tone of Voice: ${ctx.toneOfVoice}
- Tagline: "${ctx.tagline}"
- Core Values: ${ctx.coreValues}

${ctx.websiteContent ? `=== WEBSITE CONTENT (from their live site) ===
${ctx.websiteContent}
` : ''}

${ctx.existingPostTitles.length > 0 ? `=== EXISTING BLOG POSTS (avoid duplicating these topics) ===
${ctx.existingPostTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}
` : ''}

${ctx.leadsSummary ? `=== CRM & AUDIENCE INSIGHTS ===
${ctx.leadsSummary}
` : ''}

CONVERSATION GUIDELINES:
1. Engage in a natural conversation to understand what content the user needs
2. Ask clarifying questions about target audience, goals, and angle
3. Suggest content ideas that align with their brand identity and industry
4. Recommend the best tone, structure, and angle for the content
5. When the user is ready, they will click "Generate Article" — you will then produce the final structured content
6. Always respond in ${langLabel} unless asked otherwise
7. Be proactive — suggest related topics, internal linking opportunities, and SEO strategies
8. Reference the business's specific services, products, or values when relevant
9. Consider their existing content and suggest complementary topics
10. Use insights from their CRM data (if available) to suggest audience-relevant content

⚠️ CRITICAL RULES:
- You are a content strategist for "${ctx.businessName}", NOT for any platform or tool.
- NEVER mention, reference, or write about the platform used to create the content.
- Focus EXCLUSIVELY on generating content relevant to ${ctx.businessName}'s business, industry, and audience.
- All content must be written from the perspective of ${ctx.businessName}, as if published on their website.
- NEVER invent services, products, or capabilities that are not mentioned in the business profile above.

IMPORTANT:
- Every piece of content should reflect the brand's tone of voice: ${ctx.toneOfVoice}.
- Content should be relevant to ${ctx.industry} and targeted at ${ctx.targetAudience}.
- Suggest concrete examples that relate to the business's actual offerings and values.
`;
}

/** Build the generation prompt for the final article */
function buildProjectGenerationPrompt(params: {
    conversationSummary: string;
    category: string;
    audience: string;
    tone: string;
    language: 'es' | 'en';
    businessName: string;
}): string {
    const { conversationSummary, category, audience, tone, language, businessName } = params;
    const langLabel = language === 'es' ? 'Spanish (Español)' : 'English';

    return `
=== TASK: GENERATE FINAL ARTICLE ===

You are now switching from PLANNING MODE to GENERATION MODE.

Below is the planning conversation where the user discussed what content they want to create for "${businessName}". Your job is to EXTRACT the content topic, key points, and ideas from this conversation and then produce a COMPLETE, STANDALONE ARTICLE.

⚠️ CRITICAL RULES:
1. The article must be ONLY the final content itself — a blog post, tutorial, guide, etc.
2. NEVER reference the planning conversation in the article.
3. NEVER include meta-commentary about creating the content.
4. The reader has NO knowledge of the planning — the article must be completely self-contained.
5. Write as an expert writer directly addressing the target audience of ${businessName}.
6. NEVER mention the platform or tool used to create this content.
7. The article should read as if it was published on ${businessName}'s own website/blog.

--- PLANNING CONVERSATION (extract ideas from this, do NOT include in the article) ---
${conversationSummary}
--- END PLANNING CONVERSATION ---

ARTICLE PARAMETERS:
- Business: ${businessName}
- Category: ${category}
- Target Audience: ${audience || 'General'}
- Tone: ${tone}
- Language: ${langLabel}

Return a JSON object with exactly these fields:
{
  "title": "Catchy, SEO-friendly title (in ${langLabel})",
  "slug": "seo-friendly-slug-in-kebab-case",
  "excerpt": "Compelling summary for meta description, 150-160 chars (in ${langLabel})",
  "content": "<h2>...</h2><p>...</p>... Full HTML article content. Well-structured with <h2>, <h3>, <p>, <ul>/<li>, <blockquote>. Comprehensive, at least 1000 words. Include practical examples relevant to ${businessName}'s industry.",
  "tags": ["tag1", "tag2", "tag3"],
  "readTime": 5,
  "seo": {
    "metaTitle": "SEO title, 55-60 chars max (in ${langLabel})",
    "metaDescription": "SEO description, 150-155 chars max (in ${langLabel})",
    "metaKeywords": ["keyword1", "keyword2", "keyword3"]
  }
}

QUALITY REQUIREMENTS:
- The article must demonstrate deep knowledge of the subject matter
- Include specific, practical examples relevant to ${businessName}'s industry
- Have clear structure: introduction → main sections → conclusion
- Be fully optimized for search engines
- Reflect ${businessName}'s brand voice and values

Output ONLY valid JSON. No markdown fences, no explanations, no commentary.
`;
}

/** Extract website content summary from project data */
function extractWebsiteContentSummary(project: any): string {
    if (!project?.data) return '';
    const parts: string[] = [];
    const d = project.data;

    // Hero section
    if (d.hero) {
        if (d.hero.headline) parts.push(`Main headline: "${d.hero.headline}"`);
        if (d.hero.subheadline) parts.push(`Subheadline: "${d.hero.subheadline}"`);
    }

    // Services
    if (d.services?.items?.length) {
        const svcNames = d.services.items.map((s: any) => s.title || s.name).filter(Boolean);
        if (svcNames.length) parts.push(`Services offered: ${svcNames.join(', ')}`);
    }

    // Features
    if (d.features?.items?.length) {
        const featNames = d.features.items.map((f: any) => f.title || f.name).filter(Boolean);
        if (featNames.length) parts.push(`Key features: ${featNames.join(', ')}`);
    }

    // FAQ
    if (d.faq?.items?.length) {
        parts.push(`FAQ topics: ${d.faq.items.map((f: any) => f.question).filter(Boolean).slice(0, 5).join('; ')}`);
    }

    // Testimonials
    if (d.testimonials?.items?.length) {
        parts.push(`${d.testimonials.items.length} client testimonials on file`);
    }

    // Team
    if (d.team?.members?.length) {
        parts.push(`Team members: ${d.team.members.map((m: any) => `${m.name} (${m.role || m.position})`).filter(Boolean).join(', ')}`);
    }

    // Portfolio
    if (d.portfolio?.items?.length) {
        parts.push(`${d.portfolio.items.length} portfolio items`);
    }

    return parts.join('\n');
}

/** Build leads summary for AI context */
function buildLeadsSummary(leads: any[]): string {
    if (!leads || leads.length === 0) return '';
    const parts: string[] = [];
    parts.push(`Total leads/contacts: ${leads.length}`);

    // Lead sources breakdown
    const sources: Record<string, number> = {};
    leads.forEach(l => { sources[l.source || 'unknown'] = (sources[l.source || 'unknown'] || 0) + 1; });
    const topSources = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topSources.length) parts.push(`Lead sources: ${topSources.map(([s, c]) => `${s} (${c})`).join(', ')}`);

    // Industries represented
    const industries = [...new Set(leads.map(l => l.industry).filter(Boolean))];
    if (industries.length) parts.push(`Industries represented: ${industries.slice(0, 8).join(', ')}`);

    // Status breakdown
    const statuses: Record<string, number> = {};
    leads.forEach(l => { statuses[l.status || 'unknown'] = (statuses[l.status || 'unknown'] || 0) + 1; });
    parts.push(`Lead statuses: ${Object.entries(statuses).map(([s, c]) => `${s} (${c})`).join(', ')}`);

    return parts.join('\n');
}

// =============================================================================
// COMPONENT
// =============================================================================

const CMSContentStudio: React.FC<CMSContentStudioProps> = ({ onClose, onPostCreated }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { activeProject } = useProject();
    const { cmsPosts } = useCMS();
    const { leads } = useCRM();

    // --------------- Conversation State ---------------
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [phase, setPhase] = useState<StudioPhase>('conversation');

    // --------------- Content Plan State ---------------
    const [contentType, setContentType] = useState('blog');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [language, setLanguage] = useState<'es' | 'en'>('es');

    // --------------- Generated Post State ---------------
    const [generatedPost, setGeneratedPost] = useState<Partial<CMSPost> & { tags?: string[]; readTime?: number; seo?: any } | null>(null);
    const [isSavingPost, setIsSavingPost] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

    // --------------- Voice State ---------------
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveModelTranscript, setLiveModelTranscript] = useState('');

    // --------------- Context State ---------------
    const [projectContext, setProjectContext] = useState<ProjectContentContext | null>(null);
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
        const init = () => {
            // Build PROJECT-SPECIFIC context from actual project data
            const brand = activeProject?.brandIdentity;
            const businessName = brand?.businessName || brand?.name || activeProject?.name || '';
            const ctx: ProjectContentContext = {
                businessName,
                industry: brand?.industry || '',
                targetAudience: brand?.targetAudience || '',
                toneOfVoice: brand?.toneOfVoice || 'Professional',
                tagline: brand?.tagline || '',
                coreValues: brand?.coreValues || '',
                websiteContent: extractWebsiteContentSummary(activeProject),
                existingPostTitles: cmsPosts.map(p => p.title),
                leadsSummary: buildLeadsSummary(leads),
            };
            setProjectContext(ctx);

            // Set default audience from brand if available
            if (brand?.targetAudience && !audience) {
                setAudience(brand.targetAudience);
            }

            // Build project-aware welcome message
            const welcomeText = language === 'es'
                ? `¡Hola! 👋 Soy tu **Asistente de Contenido AI**${businessName ? ` para **${businessName}**` : ''}.\n\nConozco tu negocio${ctx.industry ? ` en el sector de **${ctx.industry}**` : ''} y puedo ayudarte a:\n\n- 📝 **Planificar** artículos, blogs y contenido para tu marca\n- 🎯 **Definir** audiencia, tono y ángulo perfecto\n- 💡 **Sugerir** temas relevantes para tu industria\n- ✍️ **Generar** contenido completo optimizado para SEO\n${ctx.existingPostTitles.length > 0 ? `\nYa tienes **${ctx.existingPostTitles.length}** publicaciones. Puedo sugerir temas complementarios.\n` : ''}\n¿Qué tipo de contenido necesitas crear hoy?`
                : `Hello! 👋 I'm your **AI Content Assistant**${businessName ? ` for **${businessName}**` : ''}.\n\nI know your business${ctx.industry ? ` in the **${ctx.industry}** sector` : ''} and can help you:\n\n- 📝 **Plan** articles, blogs, and content for your brand\n- 🎯 **Define** the perfect audience, tone, and angle\n- 💡 **Suggest** topics relevant to your industry\n- ✍️ **Generate** complete SEO-optimized content\n${ctx.existingPostTitles.length > 0 ? `\nYou already have **${ctx.existingPostTitles.length}** posts. I can suggest complementary topics.\n` : ''}\nWhat kind of content do you need to create today?`;

            const welcomeMsg: DisplayMessage = {
                role: 'model',
                text: welcomeText,
                timestamp: Date.now(),
            };
            setMessages([welcomeMsg]);

            // Inject project context into conversation history
            const systemContext = buildProjectSystemPrompt(ctx, language);
            historyRef.current = [
                { role: 'user', text: `[CONTEXT] ${systemContext}` },
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
        if (!text.trim() || isThinking || !projectContext) return;

        const userMsg: DisplayMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsThinking(true);

        historyRef.current.push({ role: 'user', text: text.trim() });

        try {
            const systemPrompt = buildProjectSystemPrompt(projectContext, language);

            // Build conversation context from history
            const conversationContext = historyRef.current
                .slice(1) // Skip the injected [CONTEXT] message
                .slice(0, -1) // Skip the current message
                .map(m => `${m.role === 'user' ? 'Usuario' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const enrichedPrompt = `${systemPrompt}\n\n${conversationContext ? `--- CONVERSACIÓN PREVIA ---\n${conversationContext}\n--- FIN CONVERSACIÓN ---\n\n` : ''}Usuario: ${text.trim()}`;

            const projectId = activeProject?.id || 'content-creator-assistant';
            const response = await generateChatContentViaProxy(
                projectId,
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
                projectId,
                model: MODEL_TEXT,
                feature: 'cms-content-studio-chat',
                success: true,
            });
        } catch (error) {
            console.error('[CMSContentStudio] Chat error:', error);
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
                projectId: activeProject?.id || 'content-creator-assistant',
                model: MODEL_TEXT,
                feature: 'cms-content-studio-chat',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        } finally {
            setIsThinking(false);
        }
    }, [isThinking, projectContext, language, user, activeProject]);

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
        if (!projectContext) return;
        setIsVoiceConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioCtx({ sampleRate: 24000 });
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            const systemPrompt = buildProjectSystemPrompt(projectContext, language);

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

                        // Accumulate transcriptions
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

                        // On turn complete, commit as permanent messages
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

            // Set up microphone
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
            console.error('[CMSContentStudio] Voice session error:', error);
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
    // ARTICLE GENERATION — outputs CMSPost
    // =============================================================================

    const handleGenerate = async () => {
        if (!projectContext) return;
        setPhase('generating');

        const projectId = activeProject?.id || 'content-creator-assistant';

        try {
            const conversationSummary = historyRef.current
                .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
                .join('\n\n');

            const generationPrompt = buildProjectGenerationPrompt({
                conversationSummary,
                category: contentType,
                audience: audience || projectContext.targetAudience || (language === 'es' ? 'Audiencia general' : 'General audience'),
                tone,
                language,
                businessName: projectContext.businessName,
            });

            const systemPrompt = buildProjectSystemPrompt(projectContext, language);

            const response = await generateChatContentViaProxy(
                projectId,
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

            // Try to extract JSON if response contains extra text
            if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    console.log('🔧 Extracted JSON from conversational response');
                    cleanedText = jsonMatch[0];
                }
            }

            let parsedData = JSON.parse(cleanedText);
            if (Array.isArray(parsedData)) parsedData = parsedData[0];
            if (!parsedData || typeof parsedData !== 'object') throw new Error('Invalid response');

            setGeneratedPost({ ...parsedData });
            setPhase('preview');

            logApiCall({
                userId: user?.uid || '',
                projectId,
                model: MODEL_TEXT,
                feature: 'cms-content-studio-generate',
                success: true,
            });
        } catch (error) {
            console.error('[CMSContentStudio] Generation error:', error);
            setErrorModal({
                open: true,
                title: language === 'es' ? 'Error de generación' : 'Generation Error',
                message: language === 'es'
                    ? 'Error al generar el contenido. Por favor intenta de nuevo.'
                    : 'Error generating content. Please try again.',
            });
            setPhase('conversation');

            logApiCall({
                userId: user?.uid || '',
                projectId,
                model: MODEL_TEXT,
                feature: 'cms-content-studio-generate',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown',
            });
        }
    };

    // =============================================================================
    // CONFIRM — Build CMSPost and pass to parent (parent handles save)
    // =============================================================================

    const handleConfirmPost = () => {
        if (!generatedPost || !user) {
            console.warn('[CMSContentStudio] Cannot confirm: missing post or user');
            return;
        }

        console.log('[CMSContentStudio] Building CMSPost from generated data...');

        const now = new Date().toISOString();
        const newPost: CMSPost = {
            id: '',  // Empty ID — parent (CMSDashboard) will save via saveCMSPost which generates the Firebase ID
            title: String(generatedPost.title || 'Untitled'),
            slug: String(generatedPost.slug || `post-${Date.now()}`),
            content: String(generatedPost.content || '<p>Contenido generado por IA</p>'),
            excerpt: String(generatedPost.excerpt || ''),
            featuredImage: '',
            status: 'draft',
            authorId: user.uid,
            createdAt: now,
            updatedAt: now,
            // Map SEO fields from the AI's nested seo object to flat CMSPost fields
            seoTitle: generatedPost.seo?.metaTitle
                ? String(generatedPost.seo.metaTitle)
                : String(generatedPost.seoTitle || generatedPost.title || ''),
            seoDescription: generatedPost.seo?.metaDescription
                ? String(generatedPost.seo.metaDescription)
                : String(generatedPost.seoDescription || generatedPost.excerpt || ''),
        };

        console.log('[CMSContentStudio] ✅ Passing CMSPost to parent:', newPost.title);
        onPostCreated(newPost);
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-q-bg border border-q-border w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

                {/* ===== HEADER ===== */}
                <div className="p-4 border-b border-q-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                                <Sparkles className="text-white w-5 h-5" />
                            </div>
                            {isVoiceActive && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-q-bg animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-q-text flex items-center gap-2">
                                {language === 'es' ? 'Estudio de Contenido AI' : 'AI Content Studio'}
                                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                    {isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}
                                </span>
                            </h2>
                            <p className="text-xs text-q-text-secondary">
                                {isVoiceActive
                                    ? (language === 'es' ? '🎤 Sesión de voz activa — habla naturalmente' : '🎤 Voice session active — speak naturally')
                                    : activeProject?.data?.businessName
                                        ? `${activeProject.data.businessName} — ${language === 'es' ? 'Planifica y genera contenido con IA' : 'Plan and generate content with AI'}`
                                        : (language === 'es' ? 'Planifica y genera contenido con IA' : 'Plan and generate content with AI')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors"
                            title={t('common.settings', 'Configuración')}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { stopVoiceSession(); onClose(); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
                                                {language === 'es' ? 'Generando contenido...' : 'Generating content...'}
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
                            {phase === 'preview' && generatedPost && (
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
                                                {generatedPost.title || 'Sin título'}
                                            </h3>
                                        </div>

                                        <div className="flex gap-2 flex-wrap">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-purple-500/15 text-purple-300 rounded-full">
                                                {contentType}
                                            </span>
                                            {generatedPost.readTime && (
                                                <span className="px-2.5 py-1 text-xs font-medium bg-q-surface-overlay/40 text-q-text-secondary rounded-full">
                                                    {generatedPost.readTime} min
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">
                                                {t('contentManagement.editor.excerpt', 'Resumen')}
                                            </span>
                                            <p className="text-q-text-secondary text-sm mt-1">
                                                {generatedPost.excerpt || '—'}
                                            </p>
                                        </div>

                                        {generatedPost.tags && generatedPost.tags.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider">Tags</span>
                                                <div className="flex gap-2 flex-wrap mt-1">
                                                    {generatedPost.tags.map((tag: string, i: number) => (
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
                                                {generatedPost.content ? (
                                                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(generatedPost.content) }} />
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
                                            onClick={handleConfirmPost}
                                            disabled={isSavingPost}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {isSavingPost ? (
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

                    {/* ===== RIGHT: CONTENT PLAN PANEL ===== */}
                    <div className="w-72 border-l border-q-border bg-q-surface/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">

                        {/* Content Parameters */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-bold text-q-text">
                                    {language === 'es' ? 'Plan de Contenido' : 'Content Plan'}
                                </h3>
                            </div>

                            {/* Content Type */}
                            <div>
                                <label className="text-[10px] font-bold text-q-text-secondary uppercase tracking-wider mb-1.5 block">
                                    {language === 'es' ? 'Tipo' : 'Type'}
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {CONTENT_TYPE_OPTIONS.map((ct) => (
                                        <button
                                            key={ct.value}
                                            onClick={() => setContentType(ct.value)}
                                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${contentType === ct.value
                                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                : 'bg-q-bg/50 text-q-text-secondary border border-q-border/50 hover:border-purple-500/30'
                                                }`}
                                        >
                                            {ct.label}
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

export default CMSContentStudio;
