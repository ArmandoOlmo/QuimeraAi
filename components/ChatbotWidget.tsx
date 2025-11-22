
import React, { useState, useRef, useEffect } from 'react';
import { getGoogleGenAI } from '../utils/genAiClient';
import { MessageSquare, Send, X, Loader2, Minimize2, Mic, PhoneOff, Sparkles } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { Modality, LiveServerMessage } from '@google/genai';
import { Lead } from '../types';
import { getDefaultAppearanceConfig, getSizeClasses, getButtonSizeClasses, getShadowClasses, getButtonStyleClasses } from '../utils/chatThemes';

// Note: In a real production environment, the API Key should be proxied through a backend
// to prevent exposure. This demo relies on the client-selected key (env or AI Studio).

interface ChatbotWidgetProps {
    isPreview?: boolean;
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

// Audio utility functions
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

// Intent Detection
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

// Lead Scoring
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

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ 
    isPreview = false
}) => {
    const { aiAssistantConfig, addLead, hasApiKey, promptForKeySelection, handleApiError, activeProject } = useEditor();
    
    // Get appearance config with defaults
    const appearance = aiAssistantConfig.appearance || getDefaultAppearanceConfig();
    
    // Chat State
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Lead Capture State
    const [showPreChatForm, setShowPreChatForm] = useState(false);
    const [showLeadCaptureModal, setShowLeadCaptureModal] = useState(false);
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [capturedLeadId, setCapturedLeadId] = useState<string | null>(null);
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

    // Don't render if not active and not in preview
    if (!aiAssistantConfig.isActive && !isPreview) return null;

    // Get lead capture config with defaults
    const leadConfig = aiAssistantConfig.leadCaptureConfig || {
        enabled: aiAssistantConfig.leadCaptureEnabled !== false,
        preChatForm: false,
        triggerAfterMessages: 3,
        requireEmailForAdvancedInfo: true,
        exitIntentEnabled: true,
        exitIntentOffer: '🎁 ¡Espera! Déjame tu email y te envío información exclusiva + 20% de descuento',
        intentKeywords: [],
        progressiveProfilingEnabled: true
    };

    // Initial welcome message and pre-chat form check
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Show pre-chat form if enabled
            if (leadConfig.enabled && leadConfig.preChatForm && !leadCaptured) {
                setShowPreChatForm(true);
            } else {
                const welcomeMsg = appearance.messages.welcomeMessageEnabled 
                    ? appearance.messages.welcomeMessage.replace('{agentName}', aiAssistantConfig.agentName)
                    : `Hello! I'm ${aiAssistantConfig.agentName}. How can I help you today?`;
                
                if (appearance.messages.welcomeDelay > 0) {
                    setTimeout(() => {
                        setMessages([{ role: 'model', text: welcomeMsg }]);
                    }, appearance.messages.welcomeDelay * 1000);
                } else {
                    setMessages([{ role: 'model', text: welcomeMsg }]);
                }
            }
        }
    }, [isOpen, aiAssistantConfig.agentName, leadConfig, leadCaptured, appearance.messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && !isLiveActive && !showPreChatForm) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isLiveActive, showPreChatForm]);

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
    }, [isLiveActive]);

    // Handle pre-chat form submission
    const handlePreChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preChatData.email || !preChatData.name) return;

        try {
            const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
            const leadScore = calculateLeadScore(preChatData, messages, false);

            await addLead({
                name: preChatData.name,
                email: preChatData.email,
                phone: preChatData.phone,
                source: 'chatbot-widget',
                status: 'new',
                message: 'Iniciado desde pre-chat form',
                value: 0,
                leadScore,
                conversationTranscript: conversationText,
                tags: ['chatbot', 'pre-chat-form'],
                notes: 'Lead capturado antes de iniciar conversación'
            });

            setLeadCaptured(true);
            setShowPreChatForm(false);
            
            // Start chat with personalized welcome
            const welcomeMsg = `¡Hola ${preChatData.name}! Soy ${aiAssistantConfig.agentName}. ¿En qué puedo ayudarte hoy? 😊`;
            setMessages([{ role: 'model', text: welcomeMsg }]);
        } catch (error) {
            console.error('Error capturing pre-chat lead:', error);
        }
    };

    // Handle quick lead capture during conversation
    const handleQuickLeadCapture = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickLeadEmail) return;

        try {
            const conversationText = messages.map(m => `${m.role}: ${m.text}`).join('\n');
            const hasHighIntent = messages.some(m => m.role === 'user' && detectLeadIntent(m.text));
            const leadScore = calculateLeadScore({ email: quickLeadEmail }, messages, hasHighIntent);

            await addLead({
                name: quickLeadEmail.split('@')[0], // Temporary name from email
                email: quickLeadEmail,
                source: 'chatbot-widget',
                status: 'new',
                message: 'Capturado durante conversación',
                value: 0,
                leadScore,
                conversationTranscript: conversationText,
                tags: ['chatbot', 'mid-conversation', hasHighIntent ? 'high-intent' : 'low-intent'],
                notes: `Lead capturado después de ${messages.filter(m => m.role === 'user').length} mensajes`
            });

            setLeadCaptured(true);
            setShowLeadCaptureModal(false);
            setQuickLeadEmail('');
            
            // Thank them
            setMessages(prev => [...prev, {
                role: 'model',
                text: '¡Perfecto! Te contactaremos pronto. ¿En qué más puedo ayudarte? 😊'
            }]);
        } catch (error) {
            console.error('Error capturing lead:', error);
        }
    };

    // Check if should trigger lead capture
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

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        
        // Add user message
        const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
        setMessages(newMessages);

        // Detect high intent and trigger lead capture if not captured yet
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
            if (!hasApiKey()) {
                promptForKeySelection();
                return;
            }

            const genai = await getGoogleGenAI();

            // Build context from config
            const systemContext = `
You are ${aiAssistantConfig.agentName}, a helpful AI assistant.
Tone: ${aiAssistantConfig.tone}
Languages: ${aiAssistantConfig.languages}

Business Profile:
${aiAssistantConfig.businessProfile}

Products & Services:
${aiAssistantConfig.productsServices}

Policies & Contact:
${aiAssistantConfig.policiesContact}

${aiAssistantConfig.specialInstructions ? `Special Instructions:\n${aiAssistantConfig.specialInstructions}` : ''}

${aiAssistantConfig.faqs && aiAssistantConfig.faqs.length > 0 ? `
FAQs:
${aiAssistantConfig.faqs.map((faq, i) => `Q${i+1}: ${faq.question}\nA${i+1}: ${faq.answer}`).join('\n\n')}
` : ''}

Respond helpfully and naturally. Keep responses concise but informative.
            `.trim();

            const conversationHistory = newMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const result = await genai.models.generateContent({
                model: 'gemini-1.5-flash',
                systemInstruction: systemContext,
                contents: conversationHistory
            });

            const botResponse = result.response.text();
            setMessages(prev => [...prev, { role: 'model', text: botResponse }]);

            // Check if we should trigger lead capture after this message
            setTimeout(() => checkLeadCaptureThreshold(), 500);

        } catch (error) {
            handleApiError(error);
            console.error("Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const stopLiveSession = async () => {
        if (visualizerIntervalRef.current) {
            clearInterval(visualizerIntervalRef.current);
            visualizerIntervalRef.current = null;
        }
        setVisualizerLevels([4, 4, 4, 4]);
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (processorRef.current && inputAudioContextRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (inputAudioContextRef.current) {
            await inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch {}
        });
        activeSourcesRef.current = [];

        if (sessionRef.current) {
            try {
                const session = await sessionRef.current;
                session.close();
            } catch {}
            sessionRef.current = null;
        }

        isConnectedRef.current = false;
        setIsLiveActive(false);
        setIsConnecting(false);
    };

    const startLiveSession = async () => {
        if (!hasApiKey()) {
            promptForKeySelection();
            return;
        }

        if (!aiAssistantConfig.enableLiveVoice) {
            alert("Live Voice is not enabled for this assistant.");
            return;
        }

        setIsConnecting(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const inputCtx = new AudioContext({ sampleRate: 16000 });
            inputAudioContextRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(inputCtx.destination);

            const outputCtx = new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = outputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            setIsLiveActive(true);
            setIsConnecting(false);
            isConnectedRef.current = true;

            const genai = await getGoogleGenAI();

            const systemInstruction = `
You are ${aiAssistantConfig.agentName}, speaking in ${aiAssistantConfig.languages}.
Tone: ${aiAssistantConfig.tone}

${aiAssistantConfig.businessProfile}

Keep responses conversational and natural for voice interaction.
            `.trim();

            const sessionPromise = genai.chats.create({
                model: 'gemini-2.0-flash-exp',
                systemInstruction,
                config: {
                    responseModalities: Modality.AUDIO
                },
                tools: [],
                liveHandlers: {
                    onopen: () => {
                        processor.onaudioprocess = (e) => {
                            if (!isConnectedRef.current) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcm = floatTo16BitPCM(inputData);
                            const b64 = bytesToBase64(new Uint8Array(pcm));
                            sessionPromise.then(session => {
                                if (session && isConnectedRef.current) {
                                    session.sendRealtimeInput([{ mimeType: 'audio/pcm', data: b64 }]);
                                }
                            });
                        };
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.serverContent?.modelTurn?.parts) {
                            for (const part of msg.serverContent.modelTurn.parts) {
                                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                    const data = base64ToBytes(part.inlineData.data);
                                    const buffer = await decodeAudioData(data, outputCtx, 24000, 1);
                                    const source = outputCtx.createBufferSource();
                                    source.buffer = buffer;
                                    source.connect(outputCtx.destination);
                                    const startTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
                                    source.start(startTime);
                                    nextStartTimeRef.current = startTime + buffer.duration;
                                    activeSourcesRef.current.push(source);
                                    source.onended = () => {
                                        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
                                    };
                                }
                            }
                        }
                    },
                    onclose: () => stopLiveSession(),
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Handle close with exit intent
    const handleChatClose = () => {
        // Exit intent: offer one last chance to capture lead
        if (leadConfig.enabled && leadConfig.exitIntentEnabled && !leadCaptured && messages.length > 2 && !exitIntentShown) {
            setExitIntentShown(true);
            setMessages(prev => [...prev, {
                role: 'model',
                text: leadConfig.exitIntentOffer || '🎁 ¡Espera! Déjame tu email y te envío información exclusiva.'
            }]);
            setShowLeadCaptureModal(true);
            return;
        }
        
        setIsOpen(false);
    };

    // Apply custom position
    const getPositionStyle = () => {
        const { position, offsetX, offsetY } = appearance.behavior;
        const positionMap: Record<string, any> = {
            'bottom-right': { bottom: `${offsetY}px`, right: `${offsetX}px` },
            'bottom-left': { bottom: `${offsetY}px`, left: `${offsetX}px` },
            'top-right': { top: `${offsetY}px`, right: `${offsetX}px` },
            'top-left': { top: `${offsetY}px`, left: `${offsetX}px` }
        };
        return positionMap[position] || positionMap['bottom-right'];
    };

    const sizeClasses = getSizeClasses(appearance.behavior.width);

    return (
        <div className={`fixed z-50 flex flex-col items-end font-sans`} style={getPositionStyle()}>
            {/* Chat Window */}
            <div 
                className={`
                    mb-4 ${sizeClasses.width} rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{ 
                    maxHeight: sizeClasses.height,
                    backgroundColor: appearance.colors.backgroundColor,
                    borderColor: appearance.colors.inputBorder
                }}
            >
                {/* Header */}
                <div 
                    className="p-4 flex justify-between items-center transition-colors duration-500" 
                    style={{ 
                        backgroundColor: isLiveActive ? '#ef4444' : appearance.colors.headerBackground,
                        color: appearance.colors.headerText
                    }}
                >
                    <div className="flex items-center gap-2">
                        {isLiveActive ? <Mic size={20} className="animate-pulse" /> : <MessageSquare size={20} />}
                        <div>
                            <span className="font-bold text-sm block leading-tight">{aiAssistantConfig.agentName}</span>
                            <span className="text-[10px] opacity-80 block leading-tight">
                                {isLiveActive ? 'Voice Active' : 'Chat Online'}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleChatClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <Minimize2 size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative bg-gray-50 dark:bg-gray-950 overflow-hidden">
                    {/* Pre-Chat Form */}
                    {showPreChatForm ? (
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
                                            const welcomeMsg = `Hello! I'm ${aiAssistantConfig.agentName}. How can I help you today?`;
                                            setMessages([{ role: 'model', text: welcomeMsg }]);
                                        }}
                                        className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                    >
                                        Continuar sin registro
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : null}

                    {/* Quick Lead Capture Modal */}
                    {showLeadCaptureModal ? (
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
                    ) : null}

                    {/* Live Voice Mode Overlay */}
                    {isLiveActive ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black z-10 text-white animate-fade-in-up p-4">
                            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-20"></div>
                                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-sm">
                                    <Mic size={28} className="text-red-500" />
                                </div>
                            </div>

                            {/* Audio Waveform Visualizer */}
                            <div className="flex items-center gap-1 h-10 mb-6">
                                {visualizerLevels.map((height, i) => (
                                    <div 
                                        key={i} 
                                        className="w-1.5 bg-white rounded-full transition-all duration-100"
                                        style={{ height: `${height}px`, opacity: 0.6 + (height/50) }}
                                    />
                                ))}
                            </div>
                            
                            <p className="text-base font-medium mb-1">Listening...</p>
                            <p className="text-xs text-gray-400 text-center mb-6">Speak naturally. I understand {aiAssistantConfig.languages}.</p>
                            
                            <button 
                                onClick={stopLiveSession}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-full text-sm font-bold text-white transition-colors shadow-lg flex items-center"
                            >
                                <PhoneOff size={16} className="mr-2" /> End Call
                            </button>
                        </div>
                    ) : (
                        /* Text Chat History */
                        <div className="h-full p-4 overflow-y-auto custom-scrollbar">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm border'
                                        }`}
                                        style={{
                                            backgroundColor: msg.role === 'user' ? appearance.colors.userBubbleColor : appearance.colors.botBubbleColor,
                                            color: msg.role === 'user' ? appearance.colors.userTextColor : appearance.colors.botTextColor,
                                            borderColor: msg.role === 'user' ? 'transparent' : appearance.colors.inputBorder
                                        }}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start mb-3">
                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-sm border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <Loader2 size={16} className="animate-spin text-gray-500" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                {!isLiveActive && !showPreChatForm && (
                    <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={appearance.messages.inputPlaceholder}
                                className="flex-1 px-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 text-sm"
                                style={{
                                    backgroundColor: appearance.colors.inputBackground,
                                    borderColor: appearance.colors.inputBorder,
                                    color: appearance.colors.inputText,
                                    '--tw-ring-color': appearance.colors.accentColor
                                } as React.CSSProperties}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="p-2.5 text-white rounded-full transition-colors shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ backgroundColor: appearance.colors.primaryColor }}
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                            {aiAssistantConfig.enableLiveVoice && (
                                <button
                                    onClick={startLiveSession}
                                    disabled={isConnecting}
                                    className="p-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-full transition-colors shadow-lg"
                                >
                                    {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${getButtonSizeClasses(appearance.button.buttonSize)}
                    ${getButtonStyleClasses(appearance.button.buttonStyle)}
                    ${getShadowClasses(appearance.button.shadowSize)}
                    ${appearance.button.pulseEffect && !isOpen ? 'animate-pulse' : ''}
                    hover:scale-110 transition-all duration-300 flex items-center justify-center group relative
                `}
                style={{ 
                    backgroundColor: appearance.colors.primaryColor,
                    color: appearance.colors.headerText
                }}
                title={appearance.button.showTooltip ? appearance.button.tooltipText : undefined}
            >
                {appearance.button.buttonIcon === 'custom-emoji' && appearance.button.customEmoji ? (
                    <span className={isOpen ? 'rotate-180 scale-0 transition-transform duration-300' : 'scale-100 transition-transform duration-300'}>
                        {appearance.button.customEmoji}
                    </span>
                ) : (
                    <MessageSquare size={28} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 scale-0' : 'scale-100'}`} />
                )}
                <X size={28} className={`absolute transition-transform duration-300 ${isOpen ? 'scale-100' : 'rotate-180 scale-0'}`} />
                
                {/* Notification Badge */}
                {!isOpen && messages.length === 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">1</span>
                    </div>
                )}
            </button>
        </div>
    );
};

export default ChatbotWidget;
