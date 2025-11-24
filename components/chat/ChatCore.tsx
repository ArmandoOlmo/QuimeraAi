import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { AiAssistantConfig, Project, ChatAppearanceConfig, Lead, PageData, PageSection } from '../../types';
import { LiveServerMessage, Modality } from '@google/genai';
import { MessageSquare, Send, Mic, Loader2, Minimize2, PhoneOff, Sparkles, X } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { getGoogleGenAI } from '../../utils/genAiClient';
import { logApiCall } from '../../services/apiLoggingService';

// =============================================================================
// INTERFACES
// =============================================================================

interface PageContext {
    section: string;
    pageData: PageData | null;
    visibleSections: PageSection[];
}

export interface ChatCoreProps {
    config: AiAssistantConfig;
    project: Project;
    appearance: ChatAppearanceConfig;
    onLeadCapture?: (leadData: Partial<Lead>) => Promise<void>;
    className?: string;
    showHeader?: boolean;
    headerActions?: React.ReactNode;
    onClose?: () => void;
    autoOpen?: boolean;
    isEmbedded?: boolean;
    currentPageContext?: PageContext;
}

interface Message {
    role: 'user' | 'model';
    text: string;
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

const detectLeadIntent = (message: string): boolean => {
    const intentKeywords = [
        'precio', 'costo', 'cotización', 'comprar', 'contratar', 'disponibilidad',
        'agendar', 'reunión', 'demostración', 'demo', 'presentación',
        'price', 'buy', 'quote', 'schedule', 'demo', 'meeting', 'purchase',
        'order', 'pricing', 'cost', 'how much', 'cuanto cuesta', 'quiero comprar'
    ];
    
    return intentKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
    );
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
// MAIN COMPONENT
// =============================================================================

const ChatCore: React.FC<ChatCoreProps> = ({
    config,
    project,
    appearance,
    onLeadCapture,
    className = '',
    showHeader = true,
    headerActions,
    onClose,
    autoOpen = false,
    isEmbedded = false,
    currentPageContext
}) => {
    const { hasApiKey, promptForKeySelection, handleApiError, user, activeProject } = useEditor();
    
    // Get lead capture config with defaults
    const leadConfig = config.leadCaptureConfig || {
        enabled: config.leadCaptureEnabled !== false,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: '🎁 ¡Espera! Déjame tu email y te envío información exclusiva + 20% de descuento',
        intentKeywords: [],
        progressiveProfilingEnabled: true
    };
    
    // Chat State
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Lead Capture State
    const [showPreChatForm, setShowPreChatForm] = useState(false);
    const [showLeadCaptureModal, setShowLeadCaptureModal] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [exitIntentShown, setExitIntentShown] = useState(false);
    const [preChatData, setPreChatData] = useState<PreChatFormData>({ name: '', email: '', phone: '' });
    const [quickLeadEmail, setQuickLeadEmail] = useState('');
    
    // Voice State
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);
    
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

    // =============================================================================
    // SYSTEM INSTRUCTION BUILDER
    // =============================================================================

    const buildSystemInstruction = () => {
        // Log current viewing section
        if (currentPageContext?.section) {
            console.log(`[ChatCore] 📍 Building instruction for section: ${currentPageContext.section}`);
        }

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
            
            ${config.specialInstructions ? `SPECIAL INSTRUCTIONS:\n${config.specialInstructions}` : ''}
        `;

        const brandName = project?.brandIdentity?.name || project?.name || 'our business';
        const brandIndustry = project?.brandIdentity?.industry || 'various services';

        const systemInstruction = `
            You are ${config.agentName || 'AI Assistant'}, a ${(config.tone || 'Professional').toLowerCase()} AI assistant for ${brandName} (${brandIndustry}).
            
            YOUR KNOWLEDGE BASE:
            ${businessContext}

            INSTRUCTIONS:
            1. Always respond in the SAME language the user is using
            2. When you receive [SYSTEM CONTEXT] in a message, use that information to answer about what the user is viewing
            3. Be ${(config.tone || 'Professional').toLowerCase()}, helpful, and conversational
            4. When asked "what am I seeing?" or "what's this section?", describe the specific content from the SYSTEM CONTEXT
            5. Available sections: ${currentPageContext?.visibleSections?.join(', ') || 'various sections'}
            
            FORMATTING:
            - Use **bold** for emphasis on important points
            - Use bullet points (- or *) for lists
            - Use numbered lists (1. 2. 3.) when order matters
            - Keep paragraphs short and readable
            - Use line breaks between different topics
            - Structure your responses clearly with headings if needed (## Heading)
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
                    ? (appearance.messages.welcomeMessage || `Hello! I'm {agentName}. How can I help you today?`).replace('{agentName}', agentName)
                    : `Hello! I'm ${agentName}. How can I help you today?`;
                
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

    // =============================================================================
    // LEAD CAPTURE HANDLERS
    // =============================================================================

    const handlePreChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preChatData.email || !preChatData.name) return;

        try {
            const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
            const leadScore = calculateLeadScore(preChatData, messages, false);

            if (onLeadCapture) {
                await onLeadCapture({
                    name: preChatData.name,
                    email: preChatData.email,
                    phone: preChatData.phone,
                    status: 'new',
                    message: 'Iniciado desde pre-chat form',
                    value: 0,
                    leadScore,
                    conversationTranscript: conversationText,
                    tags: ['chatbot', 'pre-chat-form'],
                    notes: 'Lead capturado antes de iniciar conversación'
                });
            }

            setLeadCaptured(true);
            setShowPreChatForm(false);
            
            // Start chat with personalized welcome
            const welcomeMsg = `¡Hola ${preChatData.name}! Soy ${config.agentName}. ¿En qué puedo ayudarte hoy? 😊`;
            setMessages([{ role: 'model', text: welcomeMsg }]);
        } catch (error) {
            console.error('Error capturing pre-chat lead:', error);
        }
    };

    const handleQuickLeadCapture = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickLeadEmail) return;

        try {
            const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
            const hasHighIntent = messages.some(m => m.role === 'user' && detectLeadIntent(m.text));
            const leadScore = calculateLeadScore({ email: quickLeadEmail }, messages, hasHighIntent);

            if (onLeadCapture) {
                await onLeadCapture({
                    name: quickLeadEmail.split('@')[0],
                    email: quickLeadEmail,
                    status: 'new',
                    message: 'Capturado durante conversación',
                    value: 0,
                    leadScore,
                    conversationTranscript: conversationText,
                    tags: ['chatbot', 'mid-conversation', hasHighIntent ? 'high-intent' : 'low-intent'],
                    notes: `Lead capturado después de ${messages.filter(m => m.role === 'user').length} mensajes`
                });
            }

            setLeadCaptured(true);
            setShowLeadCaptureModal(false);
            setQuickLeadEmail('');
            
            setMessages(prev => [...prev, {
                role: 'model',
                text: '¡Perfecto! Te contactaremos pronto. ¿En qué más puedo ayudarte? 😊'
            }]);
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
                text: '¡Me encanta ayudarte! Para brindarte información más personalizada, ¿podrías compartir tu email? 📧'
            }]);
            setShowLeadCaptureModal(true);
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

        // Detect high intent and trigger lead capture
        if (leadConfig.enabled && !leadCaptured && detectLeadIntent(userMessage)) {
            setMessages(prev => [...prev, {
                role: 'model',
                text: '¡Genial! Me encantaría ayudarte con eso. Para brindarte la mejor información, ¿podrías compartir tu email? 📧'
            }]);
            setShowLeadCaptureModal(true);
            return;
        }

        setIsLoading(true);

        try {
            if (hasApiKey === false) {
                promptForKeySelection();
                setIsLoading(false);
                return;
            }

            const genai = await getGoogleGenAI();
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
                    const contextMessage = `[SYSTEM CONTEXT] The user is currently viewing the "${currentPageContext.section}" section. Content: ${JSON.stringify(sectionData).slice(0, 1500)}`;
                    
                    // Prepend context to the latest user message
                    const lastMessageIndex = conversationHistory.length - 1;
                    if (lastMessageIndex >= 0 && conversationHistory[lastMessageIndex].role === 'user') {
                        conversationHistory[lastMessageIndex].parts[0].text = 
                            contextMessage + '\n\n' + conversationHistory[lastMessageIndex].parts[0].text;
                        
                        console.log('[ChatCore] 🎯 Page context injected into user message');
                    }
                }
            }

            const result = await genai.models.generateContent({
                model: 'gemini-2.5-flash',
                systemInstruction: systemContext,
                contents: conversationHistory
            });
            
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

            const botResponse = result.text;
            setMessages(prev => [...prev, { role: 'model', text: botResponse }]);

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
            console.error('ChatCore Error:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
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
        if (!hasApiKey) {
            promptForKeySelection();
            return;
        }

        if (!config.enableLiveVoice) {
            alert("Live Voice is not enabled for this assistant.");
            return;
        }

        setIsConnecting(true);

        try {
            const genai = await getGoogleGenAI();
            
            // Initialize Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            // Connect to Live API
            const sessionPromise = genai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName || 'Zephyr' } },
                    },
                    systemInstruction: buildSystemInstruction(),
                },
                callbacks: {
                    onopen: async () => {
                        setIsConnecting(false);
                        setIsLiveActive(true);
                        isConnectedRef.current = true;
                        console.log("Gemini Live Session Opened");
                        
                        // Start Mic Stream
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
                                            media: {
                                                mimeType: 'audio/pcm;rate=16000',
                                                data: base64Data
                                            }
                                        });
                                    } catch (err) {
                                        console.warn("Error sending audio frame:", err);
                                    }
                                });
                            };

                            source.connect(processor);
                            processor.connect(inputCtx.destination);
                        } catch (micErr) {
                            console.error("Mic Error:", micErr);
                            stopLiveSession();
                            alert("Could not access microphone.");
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            console.log("Model interrupted");
                            activeSourcesRef.current.forEach(source => {
                                try { source.stop(); } catch (e) {}
                            });
                            activeSourcesRef.current = [];
                            
                            if (audioContextRef.current) {
                                nextStartTimeRef.current = audioContextRef.current.currentTime;
                            }
                            return;
                        }

                        // Handle Audio Output
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
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
                            source.onended = () => {
                                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
                            };
                        }
                    },
                    onclose: () => {
                        console.log("Session closed");
                        stopLiveSession();
                    },
                    onerror: (err) => {
                        console.error("Session error:", err);
                        stopLiveSession();
                    }
                }
            });
            
            sessionRef.current = sessionPromise;

        } catch (error) {
            handleApiError(error);
            console.error("Connection failed:", error);
            setIsConnecting(false);
            alert("Failed to start voice session.");
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
            try { source.stop(); } catch (e) {}
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

        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    };

    // =============================================================================
    // RENDER
    // =============================================================================

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header */}
            {showHeader && (
                <div 
                    className="p-4 flex justify-between items-center transition-colors duration-500" 
                    style={{ 
                        backgroundColor: isLiveActive ? '#ef4444' : appearance.colors.headerBackground,
                        color: appearance.colors.headerText
                    }}
                >
                    <div className="flex items-center gap-3">
                        {isLiveActive ? (
                            <div className="p-2 rounded-full bg-white/20 animate-pulse">
                                <Mic size={20} />
                            </div>
                        ) : appearance.branding.logoType === 'emoji' ? (
                            <div className="w-10 h-10 flex items-center justify-center text-2xl">
                                {appearance.branding.logoEmoji}
                            </div>
                        ) : appearance.branding.logoType === 'image' && appearance.branding.logoUrl ? (
                            <img src={appearance.branding.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="p-2 rounded-full bg-white/20">
                                <MessageSquare size={20} />
                            </div>
                        )}
                        <div>
                            <span className="font-bold text-sm block leading-tight">{config.agentName}</span>
                            <span className="text-[10px] opacity-80 block leading-tight">
                                {isLiveActive ? 'Live Voice Session' : 'Chat Online'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {headerActions}
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <Minimize2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden" style={{ backgroundColor: appearance.colors.backgroundColor }}>
                
                {/* Pre-Chat Form */}
                {showPreChatForm && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-20 p-6">
                        <div className="w-full max-w-sm">
                            <div className="text-center mb-6">
                                <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    ¡Hola! 👋
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Para brindarte una mejor experiencia, cuéntanos un poco sobre ti
                                </p>
                            </div>
                            <form onSubmit={handlePreChatSubmit} className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Tu nombre"
                                        value={preChatData.name}
                                        onChange={(e) => setPreChatData({ ...preChatData, name: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Tu email"
                                        value={preChatData.email}
                                        onChange={(e) => setPreChatData({ ...preChatData, email: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="tel"
                                        placeholder="Teléfono (opcional)"
                                        value={preChatData.phone}
                                        onChange={(e) => setPreChatData({ ...preChatData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                                >
                                    Iniciar Chat 💬
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPreChatForm(false);
                                        const welcomeMsg = `Hello! I'm ${config.agentName}. How can I help you today?`;
                                        setMessages([{ role: 'model', text: welcomeMsg }]);
                                    }}
                                    className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    Continuar sin registro
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Quick Lead Capture Modal */}
                {showLeadCaptureModal && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20 p-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                📧 Déjanos tu email
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Para enviarte la mejor información personalizada
                            </p>
                            <form onSubmit={handleQuickLeadCapture} className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={quickLeadEmail}
                                    onChange={(e) => setQuickLeadEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                                    >
                                        Enviar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowLeadCaptureModal(false)}
                                        className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        Ahora no
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Live Voice Mode Overlay */}
                {isLiveActive ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black z-10 text-white animate-fade-in-up">
                        <div className="w-32 h-32 rounded-full bg-red-500/10 flex items-center justify-center mb-8 relative">
                            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-20"></div>
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-sm">
                                <Mic size={32} className="text-red-500" />
                            </div>
                        </div>

                        {/* Audio Waveform Visualizer */}
                        <div className="flex items-center gap-1 h-12 mb-6">
                            {visualizerLevels.map((height, i) => (
                                <div 
                                    key={i} 
                                    className="w-1.5 bg-white rounded-full transition-all duration-100"
                                    style={{ height: `${height}px`, opacity: 0.6 + (height/50) }}
                                />
                            ))}
                        </div>
                        
                        <p className="text-lg font-medium mb-2">Listening...</p>
                        <p className="text-xs text-gray-500 max-w-[200px] text-center mb-8">
                            Speak naturally. I'm listening in {config.languages || 'your language'}.
                        </p>
                        
                        <button 
                            onClick={stopLiveSession}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full text-sm font-bold text-white transition-colors shadow-lg flex items-center"
                        >
                            <PhoneOff size={18} className="mr-2" /> End Call
                        </button>
                    </div>
                ) : (
                    /* Text Chat History */
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                {msg.role === 'model' && appearance.branding.showBotAvatar && (
                                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-base mb-1">
                                        {appearance.branding.botAvatarEmoji}
                                    </div>
                                )}
                                <div 
                                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'rounded-tr-sm' 
                                            : 'rounded-tl-sm markdown-content'
                                    }`}
                                    style={
                                        msg.role === 'user' 
                                            ? { 
                                                backgroundColor: appearance.colors.userBubbleColor,
                                                color: appearance.colors.userTextColor
                                            } 
                                            : { 
                                                backgroundColor: appearance.colors.botBubbleColor,
                                                color: appearance.colors.botTextColor
                                            }
                                    }
                                >
                                    {msg.role === 'model' ? (
                                        <ReactMarkdown
                                            components={{
                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                                li: ({node, ...props}) => <li className="ml-2" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                                em: ({node, ...props}) => <em className="italic" {...props} />,
                                                code: ({node, inline, ...props}) => 
                                                    inline ? (
                                                        <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                                                    ) : (
                                                        <code className="block bg-black/10 p-2 rounded my-2 text-xs font-mono overflow-x-auto" {...props} />
                                                    ),
                                                a: ({node, ...props}) => <a className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                                                h1: ({node, ...props}) => <h1 className="text-base font-bold mb-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-sm font-bold mb-2" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-xs font-bold mb-1" {...props} />,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-current pl-2 italic my-2 opacity-80" {...props} />,
                                                hr: ({node, ...props}) => <hr className="my-2 border-current opacity-20" {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                                    <Loader2 size={16} className="animate-spin text-gray-500" />
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
                                            backgroundColor: appearance.colors.primaryColor + '15',
                                            color: appearance.colors.primaryColor,
                                            border: `1px solid ${appearance.colors.primaryColor}40`
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
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2" style={{ backgroundColor: appearance.colors.inputBackground }}>
                    {config.enableLiveVoice && (
                        <button 
                            onClick={startLiveSession}
                            disabled={isConnecting}
                            className={`p-2.5 rounded-full transition-all shadow-sm ${isConnecting ? 'bg-gray-100 text-gray-400' : 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200'}`}
                            title="Start Real-time Voice"
                        >
                            {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                        </button>
                    )}
                    <input 
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={appearance.messages.inputPlaceholder}
                        className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 rounded-full text-xs outline-none focus:ring-2 transition-all border border-gray-200 dark:border-gray-700"
                        style={{ 
                            '--tw-ring-color': appearance.colors.primaryColor + '40'
                        } as React.CSSProperties}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 rounded-full text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: appearance.colors.primaryColor }}
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatCore;

