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
import { MessageSquare, X, Send, Mic, MicOff, Loader2, Bot, HelpCircle, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useAdmin } from '../contexts/admin';
import { LandingChatbotConfig, defaultLandingChatbotConfig, LandingChatMessage, LandingChatbotColors, defaultChatbotColors } from '../types/landingChatbot';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { getGoogleGenAI, isProxyMode } from '../utils/genAiClient';
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
// HELPER FUNCTIONS
// =============================================================================

const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// =============================================================================
// VOICE HELPERS
// =============================================================================

// Map config voice names to Web Speech API voice characteristics
const getVoiceByName = (voiceName: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    // Voice name mapping to characteristics
    const voicePreferences: Record<string, { lang: string; gender: 'female' | 'male'; keywords: string[] }> = {
        'Zephyr': { lang: 'es', gender: 'female', keywords: ['female', 'mujer', 'femenin'] },
        'Puck': { lang: 'es', gender: 'male', keywords: ['male', 'hombre', 'masculin'] },
        'Charon': { lang: 'es', gender: 'male', keywords: ['male', 'hombre', 'masculin'] },
        'Kore': { lang: 'es', gender: 'female', keywords: ['female', 'mujer', 'femenin'] },
        'Fenrir': { lang: 'es', gender: 'male', keywords: ['male', 'hombre', 'masculin'] },
    };

    const pref = voicePreferences[voiceName] || voicePreferences['Kore'];
    
    // Try to find a matching voice
    // First, look for Spanish voices
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    
    if (spanishVoices.length > 0) {
        // Try to match gender
        const genderMatch = spanishVoices.find(v => 
            pref.keywords.some(k => v.name.toLowerCase().includes(k))
        );
        if (genderMatch) return genderMatch;
        return spanishVoices[0];
    }
    
    // Fallback to any available voice
    return voices[0] || null;
};

// Strip markdown for speech
const stripMarkdown = (text: string): string => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1')     // Italic
        .replace(/`(.*?)`/g, '$1')       // Code
        .replace(/#{1,6}\s/g, '')        // Headers
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
        .replace(/•/g, ',')              // Bullets
        .replace(/\n+/g, '. ')           // Newlines
        .trim();
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LandingChatbotWidget: React.FC = () => {
    const { t } = useTranslation();
    const { landingChatbotConfig, designTokens } = useAdmin();

    // Quimera logo URL
    const QUIMERA_LOGO = 'https://firebasestorage.googleapis.com/v0/b/quimeraai.firebasestorage.app/o/quimera%2Fquimeralogo.png?alt=media&token=82368c1c-0f63-42b7-831f-72780006f032';

    // Use config from context merged with defaults (to ensure new fields have values)
    const config: LandingChatbotConfig = {
        ...defaultLandingChatbotConfig,
        ...landingChatbotConfig,
        // Force isActive to true for public landing chatbot
        isActive: true,
        appearance: {
            ...defaultLandingChatbotConfig.appearance,
            ...(landingChatbotConfig?.appearance || {}),
            // Force Quimera logo if not set
            buttonIcon: landingChatbotConfig?.appearance?.buttonIcon || 'custom-image',
            customIconUrl: landingChatbotConfig?.appearance?.customIconUrl || QUIMERA_LOGO,
            avatarUrl: landingChatbotConfig?.appearance?.avatarUrl || QUIMERA_LOGO,
            // Only exclude dashboard/admin areas
            excludedPaths: ['/dashboard', '/admin'],
        },
        behavior: {
            ...defaultLandingChatbotConfig.behavior,
            ...(landingChatbotConfig?.behavior || {}),
        },
        voice: {
            ...defaultLandingChatbotConfig.voice,
            ...(landingChatbotConfig?.voice || {}),
        },
        personality: {
            ...defaultLandingChatbotConfig.personality,
            ...(landingChatbotConfig?.personality || {}),
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
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadFormData, setLeadFormData] = useState<LeadFormData>({ name: '', email: '' });
    const [leadCaptured, setLeadCaptured] = useState(false);
    const [sessionId] = useState(generateSessionId);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [hasShownProactive, setHasShownProactive] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // Initialize speech synthesis and load voices
    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
            
            const loadVoices = () => {
                const voices = synthRef.current?.getVoices() || [];
                setAvailableVoices(voices);
            };
            
            loadVoices();
            synthRef.current.onvoiceschanged = loadVoices;
        }
        
        return () => {
            // Cleanup speech synthesis
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'es-ES';
                
                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputValue(transcript);
                    setIsListening(false);
                    // Auto-send after voice input
                    if (transcript.trim()) {
                        setTimeout(() => {
                            const input = document.querySelector('input[placeholder]') as HTMLInputElement;
                            if (input) {
                                const event = new KeyboardEvent('keypress', { key: 'Enter' });
                                input.dispatchEvent(event);
                            }
                        }, 100);
                    }
                };
                
                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };
                
                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
        
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Text-to-speech function
    const speak = useCallback((text: string) => {
        if (!synthRef.current || !config.voice.enabled || !isVoiceMode) return;
        
        // Cancel any ongoing speech
        synthRef.current.cancel();
        
        const cleanText = stripMarkdown(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Set voice based on config
        const selectedVoice = getVoiceByName(config.voice.voiceName, availableVoices);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        synthRef.current.speak(utterance);
    }, [config.voice.enabled, config.voice.voiceName, isVoiceMode, availableVoices]);

    // Start listening function
    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            alert('Tu navegador no soporta reconocimiento de voz');
            return;
        }
        
        // Stop any ongoing speech
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        
        setIsListening(true);
        recognitionRef.current.start();
    }, []);

    // Stop listening function
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // Stop speaking function
    const stopSpeaking = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        setIsSpeaking(false);
    }, []);
    
    // Determine color source (support both new and legacy format)
    const colorSource = (config.appearance as any).colorSource || ((config.appearance as any).useAppColors ? 'app' : 'custom');
    const customColors: LandingChatbotColors = config.appearance.customColors || defaultChatbotColors;

    // Derived colors from design tokens or custom
    const colors: LandingChatbotColors = colorSource === 'app' && designTokens?.colors
        ? {
            headerBackground: designTokens.colors.primary || '#6366f1',
            headerText: '#ffffff',
            botBubbleBackground: designTokens.colors.muted || '#f4f4f5',
            botBubbleText: designTokens.colors.foreground || '#09090b',
            userBubbleBackground: designTokens.colors.primary || '#6366f1',
            userBubbleText: '#ffffff',
            background: designTokens.colors.background || '#ffffff',
            inputBackground: designTokens.colors.muted || '#f4f4f5',
            inputBorder: designTokens.colors.border || '#e4e4e7',
            inputText: designTokens.colors.foreground || '#09090b',
            buttonBackground: designTokens.colors.primary || '#6366f1',
            buttonIcon: '#ffffff',
            primary: designTokens.colors.primary || '#6366f1',
            mutedText: designTokens.colors['muted-foreground'] || '#71717a',
          }
        : customColors;

    // Get button icon based on config
    const getButtonIcon = () => {
        const iconSize = 28;
        const iconColor = colors.buttonIcon;
        
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

    // Don't render if inactive or on excluded path
    if (!config.isActive || isExcludedPath()) {
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
            
            // Speak welcome message if auto-play is enabled
            if (config.voice.enabled && config.voice.autoPlayGreeting && isVoiceMode) {
                setTimeout(() => speak(config.welcomeMessage), 500);
            }
        }
    }, [isOpen, config.welcomeMessage, config.voice.enabled, config.voice.autoPlayGreeting, isVoiceMode, speak]);

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
                    'landing-chatbot',
                    fullPrompt,
                    'gemini-2.0-flash-exp',
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
                    model: 'gemini-2.0-flash-exp',
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
            
            // Speak the response if voice mode is enabled
            if (isVoiceMode && config.voice.enabled) {
                speak(responseText);
            }

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
            
            // Speak error message if voice mode is enabled
            if (isVoiceMode && config.voice.enabled) {
                speak(errorContent);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle lead form submission
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadFormData.email) return;

        try {
            // Save lead to Firestore
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
            case 'chat': return <MessageSquare size={24} style={{ color: colors.buttonIcon }} />;
            case 'help': return <HelpCircle size={24} style={{ color: colors.buttonIcon }} />;
            case 'sparkles': return <Sparkles size={24} style={{ color: colors.buttonIcon }} />;
            case 'custom-emoji': return <span className="text-2xl">{config.appearance.customEmoji || '🦋'}</span>;
            case 'custom-image': return config.appearance.customIconUrl ? (
                <img src={config.appearance.customIconUrl} alt="Chat" className="w-7 h-7 object-contain" />
            ) : (
                <Bot size={24} style={{ color: colors.buttonIcon }} />
            );
            default: return <Bot size={24} style={{ color: colors.buttonIcon }} />;
        }
    };

    const sizeClasses = getSizeClasses();

    // Closed state - Floating button like GlobalAiAssistant
    if (!isOpen) {
        return ReactDOM.createPortal(
            <button 
                onClick={() => setIsOpen(true)} 
                className={`fixed z-[99999] p-3 shadow-2xl hover:scale-110 transition-transform border-4 border-white/20 flex items-center justify-center group ${getButtonStyleClasses()} ${config.appearance.pulseEffect ? 'animate-pulse' : ''}`}
                style={{ 
                    ...getPositionStyle(),
                    backgroundColor: colors.buttonBackground 
                }}
                title={`Chat con ${config.agentName}`}
            >
                {getCustomButtonIcon()}
                {/* Online indicator */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </button>,
            document.body
        );
    }

    // Open state - Chat window like GlobalAiAssistant
    const widgetContent = (
        <div
            className="fixed z-[99999] bg-card border border-border shadow-2xl transition-all duration-300 flex flex-col overflow-hidden rounded-2xl"
            style={{
                ...getPositionStyle(),
                width: sizeClasses.width.includes('[') ? sizeClasses.width.match(/\d+/)?.[0] + 'px' : '400px',
                height: sizeClasses.height.includes('[') ? sizeClasses.height.match(/\d+/)?.[0] + 'px' : '600px',
            }}
        >
            {/* Header - Like GlobalAiAssistant */}
            <div 
                className="p-4 flex justify-between items-center shrink-0 cursor-pointer"
                style={{ backgroundColor: colors.headerBackground }}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 overflow-hidden"
                        >
                            {config.appearance.avatarUrl ? (
                                <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover" />
                            ) : (
                                <Bot size={24} style={{ color: colors.headerText }} />
                            )}
                        </div>
                        {/* Status indicator */}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} style={{ borderColor: colors.headerBackground }}></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight" style={{ color: colors.headerText }}>
                            {config.agentName}
                        </h3>
                        <p className="text-[10px] opacity-90 font-medium" style={{ color: colors.headerText }}>
                            {isListening ? 'Escuchando...' : isSpeaking ? 'Hablando...' : isLoading ? 'Escribiendo...' : 'En línea'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1 items-center">
                    {config.voice.enabled && (
                        <button
                            onClick={() => {
                                if (isVoiceMode) {
                                    stopSpeaking();
                                    stopListening();
                                }
                                setIsVoiceMode(!isVoiceMode);
                            }}
                            className={`p-1.5 rounded-md transition-colors ${isVoiceMode ? 'bg-white/30' : 'hover:bg-white/20'}`}
                            title={isVoiceMode ? 'Desactivar voz' : 'Activar voz'}
                        >
                            {isVoiceMode ? (
                                <Volume2 size={18} style={{ color: colors.headerText }} className={isSpeaking ? 'animate-pulse' : ''} />
                            ) : (
                                <VolumeX size={18} style={{ color: colors.headerText }} />
                            )}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                    >
                        <X size={18} style={{ color: colors.headerText }} />
                    </button>
                </div>
            </div>

            {/* Messages area - Like GlobalAiAssistant */}
            <div className="flex-1 flex flex-col overflow-hidden relative" style={{ backgroundColor: colors.background }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" style={{ backgroundColor: `${colors.inputBackground}20` }}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {/* Bot avatar */}
                            {message.role === 'assistant' && (
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center mr-2 shrink-0 overflow-hidden border"
                                    style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }}
                                >
                                    {config.appearance.avatarUrl ? (
                                        <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bot size={16} style={{ color: colors.primary }} />
                                    )}
                                </div>
                            )}
                            
                            {/* Message bubble */}
                            <div
                                className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    message.role === 'user'
                                        ? 'rounded-tr-sm'
                                        : 'rounded-tl-sm border'
                                }`}
                                style={{
                                    backgroundColor: message.role === 'user' ? colors.userBubbleBackground : colors.background,
                                    color: message.role === 'user' ? colors.userBubbleText : colors.botBubbleText,
                                    borderColor: message.role === 'user' ? 'transparent' : colors.inputBorder
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
                                                style={{ color: message.role === 'user' ? colors.userBubbleText : colors.primary }}
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
                                    style={{ backgroundColor: `${colors.inputBackground}80`, borderColor: colors.inputBorder }}
                                >
                                    <span className="text-sm">👤</span>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Loading indicator - Like GlobalAiAssistant */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center mr-2 shrink-0 overflow-hidden border"
                                style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }}
                            >
                                {config.appearance.avatarUrl ? (
                                    <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover animate-pulse" />
                                ) : (
                                    <Bot size={16} style={{ color: colors.primary }} className="animate-pulse" />
                                )}
                            </div>
                            <div
                                className="px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-sm border"
                                style={{ backgroundColor: colors.background, color: colors.mutedText, borderColor: colors.inputBorder }}
                            >
                                <Loader2 size={14} className="animate-spin" style={{ color: colors.primary }} />
                                <span>Pensando...</span>
                            </div>
                        </div>
                    )}

                    {/* Lead capture form */}
                    {showLeadForm && (
                        <div 
                            className="p-4 rounded-xl border shadow-sm"
                            style={{ backgroundColor: colors.background, borderColor: colors.inputBorder }}
                        >
                            <h4 className="font-semibold mb-3" style={{ color: colors.botBubbleText }}>
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
                                        backgroundColor: colors.inputBackground, 
                                        borderColor: colors.inputBorder,
                                        color: colors.inputText
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
                                        backgroundColor: colors.inputBackground, 
                                        borderColor: colors.inputBorder,
                                        color: colors.inputText
                                    }}
                                />
                                <input
                                    type="tel"
                                    placeholder={t('landingChatbot.leadForm.phone', 'Tu teléfono (opcional)')}
                                    value={leadFormData.phone || ''}
                                    onChange={(e) => setLeadFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 transition-all"
                                    style={{ 
                                        backgroundColor: colors.inputBackground, 
                                        borderColor: colors.inputBorder,
                                        color: colors.inputText
                                    }}
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 shadow-md"
                                        style={{ backgroundColor: colors.buttonBackground, color: colors.buttonIcon }}
                                    >
                                        {t('landingChatbot.leadForm.submit', 'Enviar')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowLeadForm(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
                                        style={{ borderColor: colors.inputBorder, color: colors.mutedText }}
                                    >
                                        {t('landingChatbot.leadForm.later', 'Después')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area - Like GlobalAiAssistant */}
                <div 
                    className="p-4 border-t shrink-0"
                    style={{ backgroundColor: colors.background, borderColor: colors.inputBorder }}
                >
                    <div 
                        className="flex items-center gap-2 p-1.5 rounded-full border transition-all focus-within:ring-2"
                        style={{ 
                            backgroundColor: `${colors.inputBackground}50`, 
                            borderColor: colors.inputBorder,
                        }}
                    >
                        {/* Clear chat button */}
                        <button
                            onClick={() => setMessages([])}
                            className="p-2 rounded-full transition-colors hover:bg-red-500/10"
                            style={{ color: colors.mutedText }}
                            title="Limpiar chat"
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
                            disabled={isLoading || isListening}
                            className="flex-1 bg-transparent px-2 text-sm outline-none"
                            style={{ color: colors.inputText }}
                        />
                        
                        {/* Voice button */}
                        {config.voice.enabled && isVoiceMode && (
                            <button
                                type="button"
                                onClick={isListening ? stopListening : startListening}
                                disabled={isLoading || isSpeaking}
                                className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : ''}`}
                                style={!isListening ? { color: colors.primary } : {}}
                                title={isListening ? 'Detener grabación' : 'Hablar'}
                            >
                                <Mic size={20} />
                            </button>
                        )}
                        
                        {/* Stop speaking button */}
                        {isSpeaking && (
                            <button
                                type="button"
                                onClick={stopSpeaking}
                                className="p-2 rounded-full transition-colors animate-pulse"
                                style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                                title="Detener voz"
                            >
                                <VolumeX size={20} />
                            </button>
                        )}
                        
                        {/* Send button */}
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={isLoading || !inputValue.trim() || isListening}
                            className="p-2 rounded-full shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonIcon }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    
                    {/* Footer info */}
                    <div className="mt-2 flex justify-between items-center px-2">
                        <p className="text-[10px] flex items-center" style={{ color: colors.mutedText }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                            {config.agentRole}
                        </p>
                        <p className="text-[10px]" style={{ color: colors.mutedText }}>
                            Powered by <span style={{ color: colors.primary }} className="font-medium">Quimera.ai</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render using portal
    return typeof document !== 'undefined'
        ? ReactDOM.createPortal(widgetContent, document.body)
        : null;
};

export default LandingChatbotWidget;
