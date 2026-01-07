/**
 * LandingChatSimulator.tsx
 * Simulador de chat para previsualizar el chatbot de la landing page
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Mic, Loader2, Bot, X, Volume2, MessageSquare, HelpCircle, Sparkles } from 'lucide-react';
import { LandingChatbotConfig, defaultChatbotColors, LandingChatbotColors } from '../../../types/landingChatbot';
import { useAdmin } from '../../../contexts/admin';

interface LandingChatSimulatorProps {
    config: LandingChatbotConfig;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const LandingChatSimulator: React.FC<LandingChatSimulatorProps> = ({ config }) => {
    const { designTokens } = useAdmin();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Determine color source (support both new and legacy format)
    const colorSource = (config.appearance as any).colorSource || ((config.appearance as any).useAppColors ? 'app' : 'custom');
    const customColors: LandingChatbotColors = config.appearance.customColors || defaultChatbotColors;

    // Derived colors from design tokens or custom
    const colors = colorSource === 'app' && designTokens?.colors
        ? {
            headerBackground: designTokens.colors?.primary || '#6366f1',
            headerText: '#ffffff',
            botBubbleBackground: designTokens.colors?.muted || '#f4f4f5',
            botBubbleText: designTokens.colors?.foreground || '#09090b',
            userBubbleBackground: designTokens.colors?.primary || '#6366f1',
            userBubbleText: '#ffffff',
            background: designTokens.colors?.background || '#ffffff',
            inputBackground: designTokens.colors?.muted || '#f4f4f5',
            inputBorder: designTokens.colors?.border || '#e4e4e7',
            inputText: designTokens.colors?.foreground || '#09090b',
            buttonBackground: designTokens.colors?.primary || '#6366f1',
            buttonIcon: '#ffffff',
            primary: designTokens.colors?.primary || '#6366f1',
            mutedText: designTokens.colors['muted-foreground'] || '#71717a',
          }
        : customColors;

    // Get button icon element
    const getButtonIcon = () => {
        const iconSize = 24;
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
                    <img src={config.appearance.customIconUrl} alt="Chat" className="w-6 h-6 object-contain" />
                ) : (
                    <Bot size={iconSize} style={{ color: iconColor }} />
                );
            default:
                return <Bot size={iconSize} style={{ color: iconColor }} />;
        }
    };

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: generateId(),
                role: 'assistant',
                content: config.welcomeMessage
            }]);
        }
    }, [config.welcomeMessage]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Simulate AI response
    const simulateResponse = (userMessage: string) => {
        setIsLoading(true);
        
        // Simulate typing delay
        setTimeout(() => {
            let response = '';
            const lowerMessage = userMessage.toLowerCase();
            
            // Check for pricing questions
            if (lowerMessage.includes('precio') || lowerMessage.includes('plan') || lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('cuanto') || lowerMessage.includes('cuánto')) {
                if (config.knowledgeBase.pricingPlans.length > 0) {
                    response = '💰 **Tenemos planes para todos:**\n\n';
                    config.knowledgeBase.pricingPlans.forEach(plan => {
                        const popular = plan.isPopular ? ' ⭐ Popular' : '';
                        response += `• **${plan.name}**${popular}: $${plan.price} USD/mes\n`;
                    });
                    response += '\n¿Te gustaría saber más detalles de algún plan específico? 🚀';
                } else {
                    response = '💰 Tenemos planes desde **$0/mes (Free)** hasta **$299/mes (Enterprise)**. El plan más popular es **Pro** a $49/mes. ¿Te cuento los detalles?';
                }
            }
            // Check for specific plan questions
            else if (lowerMessage.includes('pro') && (lowerMessage.includes('plan') || lowerMessage.includes('incluye') || lowerMessage.includes('tiene'))) {
                const proPlan = config.knowledgeBase.pricingPlans.find(p => p.id === 'pro');
                if (proPlan) {
                    response = `🚀 **Plan Pro - $${proPlan.price}/mes**\n\n${proPlan.description}\n\n**Incluye:**\n`;
                    proPlan.features.slice(0, 8).forEach(f => { response += `• ${f}\n`; });
                    response += '\n¡Es nuestro plan más popular! ¿Te interesa probarlo?';
                }
            }
            // Check for ecommerce questions
            else if (lowerMessage.includes('tienda') || lowerMessage.includes('ecommerce') || lowerMessage.includes('vender') || lowerMessage.includes('productos')) {
                const ecomFeature = config.knowledgeBase.productFeatures.find(f => f.id === 'ecommerce');
                response = '🛒 **¡Sí, tenemos E-commerce completo!**\n\n';
                if (ecomFeature) {
                    response += `${ecomFeature.description}\n\n`;
                }
                response += '**Incluye:**\n• Catálogo de productos con variantes\n• Carrito y checkout con Stripe\n• Gestión de pedidos y envíos\n• Códigos de descuento\n• Reseñas de clientes\n\nDisponible desde el plan **Pro** ($49/mes). ¿Te gustaría una demo? 🎯';
            }
            // Check for chatbot questions
            else if (lowerMessage.includes('chatbot') || lowerMessage.includes('bot') || lowerMessage.includes('asistente') || lowerMessage.includes('chat')) {
                response = '🤖 **AI Chatbot para tu sitio web**\n\n';
                response += 'Nuestro chatbot con IA puede:\n• Responder preguntas automáticamente\n• Capturar leads 24/7\n• Agendar citas\n• Hablar con voz\n• Conectarse a WhatsApp, FB e Instagram\n\n';
                response += 'Disponible desde el plan **Pro**. ¿Te muestro cómo funciona?';
            }
            // Check for AI/features questions
            else if (lowerMessage.includes('funcion') || lowerMessage.includes('feature') || lowerMessage.includes('caracteristica') || lowerMessage.includes('que hace') || lowerMessage.includes('que puede') || lowerMessage.includes('ia') || lowerMessage.includes('inteligencia')) {
                if (config.knowledgeBase.productFeatures.length > 0) {
                    response = '✨ **Principales funcionalidades de Quimera.ai:**\n\n';
                    // Show top 6 features
                    const topFeatures = config.knowledgeBase.productFeatures.slice(0, 6);
                    topFeatures.forEach(feature => {
                        response += `• **${feature.name}**\n`;
                    });
                    response += '\n¿Sobre cuál te gustaría saber más? 🎯';
                } else {
                    response = '✨ Quimera.ai te permite crear sitios web profesionales con IA, sin programar. Incluye:\n• AI Web Builder\n• Editor visual\n• CMS/Blog\n• CRM\n• E-commerce\n• AI Chatbot\n• Email Marketing\n\n¿Qué funcionalidad te interesa más?';
                }
            }
            // Check for CRM/Leads questions
            else if (lowerMessage.includes('crm') || lowerMessage.includes('lead') || lowerMessage.includes('cliente')) {
                response = '👥 **CRM / Gestión de Leads**\n\nCaptura y gestiona leads desde tu sitio:\n• Pipeline visual de ventas\n• Actividades y tareas\n• Seguimiento automatizado\n• Hasta 25,000 leads en Agency\n\nDisponible desde el plan **Starter**. ¿Te gustaría ver una demo? 🎯';
            }
            // Check for domain questions
            else if (lowerMessage.includes('dominio') || lowerMessage.includes('domain') || lowerMessage.includes('.com')) {
                response = '🌐 **Dominios Personalizados**\n\nPuedes conectar tu propio dominio (ej: tunegocio.com) con:\n• Certificado SSL gratuito\n• Configuración DNS guiada\n• Múltiples dominios por proyecto\n\nDisponible desde el plan **Starter** ($19/mes). ¿Necesitas ayuda con tu dominio?';
            }
            // Check for company info questions
            else if (lowerMessage.includes('quimera') || lowerMessage.includes('empresa') || lowerMessage.includes('ustedes') || lowerMessage.includes('qué es') || lowerMessage.includes('qué es')) {
                if (config.knowledgeBase.companyInfo) {
                    response = config.knowledgeBase.companyInfo.split('\n').slice(0, 4).join('\n');
                } else {
                    response = '🦋 **Quimera.ai** es una plataforma de creación de sitios web con inteligencia artificial.\n\nPermitimos que emprendedores y negocios creen websites profesionales en minutos, sin programar.\n\n¿Qué te gustaría saber sobre nosotros?';
                }
            }
            // Check for help/start questions
            else if (lowerMessage.includes('empezar') || lowerMessage.includes('comenzar') || lowerMessage.includes('cómo') || lowerMessage.includes('como') || lowerMessage.includes('ayuda') || lowerMessage.includes('probar')) {
                response = '🚀 **¡Es muy fácil empezar!**\n\n1. Regístrate gratis (sin tarjeta)\n2. Describe tu negocio\n3. La IA genera tu sitio en minutos\n4. Personaliza con el editor visual\n5. ¡Publica!\n\n¿Te gustaría crear tu sitio ahora? Es **100% gratis** para empezar 🎉';
            }
            // Check for FAQ matches
            else if (config.knowledgeBase.faqs.length > 0) {
                // Try to find a matching FAQ
                const matchedFaq = config.knowledgeBase.faqs.find(faq => {
                    const keywords = faq.question.toLowerCase().split(' ').filter(w => w.length > 3);
                    return keywords.some(keyword => lowerMessage.includes(keyword));
                });
                if (matchedFaq) {
                    response = matchedFaq.answer;
                }
            }
            
            // Default response based on personality
            if (!response) {
                const toneResponses = {
                    professional: `Gracias por contactarnos. Puedo ayudarte con información sobre Quimera.ai: funcionalidades, planes o cómo empezar. ¿Qué necesitas saber?`,
                    friendly: `¡Hey! 😊 Soy Quibo y estoy aquí para ayudarte.\n\nPuedo contarte sobre:\n• 💰 Planes y precios\n• ✨ Funcionalidades\n• 🚀 Cómo empezar\n\n¿Qué te interesa?`,
                    enthusiastic: `¡Genial que estés aquí! 🚀 Soy Quibo, tu asistente de IA.\n\n¿Sobre qué te cuento?\n• Planes y precios 💰\n• E-commerce 🛒\n• AI Chatbot 🤖\n• ¡Lo que quieras!`,
                    technical: `Puedo darte info técnica sobre:\n• Stack: React + Firebase + Gemini AI\n• API REST e integraciones\n• Sistema de componentes\n• Arquitectura multi-tenant\n\n¿Qué te interesa?`
                };
                response = toneResponses[config.personality.tone] || toneResponses.enthusiastic;
            }

            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'assistant',
                content: response
            }]);
            setIsLoading(false);
        }, 800 + Math.random() * 800);
    };

    const handleSend = () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: inputValue.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        simulateResponse(userMessage.content);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <div className="absolute bottom-4 right-4 z-30">
                <button
                    onClick={() => setIsOpen(true)}
                    className={`w-12 h-12 shadow-2xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-white/20 ${
                        config.appearance.buttonStyle === 'circle' ? 'rounded-full' : 
                        config.appearance.buttonStyle === 'rounded' ? 'rounded-xl' : 'rounded-lg'
                    } ${config.appearance.pulseEffect ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: colors?.buttonBackground }}
                >
                    {getButtonIcon()}
                    {/* Online indicator */}
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                </button>
            </div>
        );
    }

    return (
        <div className="absolute bottom-0 right-0 w-full h-full z-30 flex flex-col pointer-events-auto font-sans">
            {/* Chat Container - GlobalAiAssistant style */}
            <div 
                className="w-full h-full flex flex-col overflow-hidden border border-border/50 rounded-t-xl shadow-inner"
                style={{ backgroundColor: colors?.background }}
            >
                {/* Header - Like GlobalAiAssistant */}
                <div
                    className="px-3 py-2.5 flex items-center justify-between shrink-0"
                    style={{ backgroundColor: colors?.headerBackground }}
                >
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                                {config.appearance.avatarUrl ? (
                                    <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover" />
                                ) : (
                                    <Bot size={14} style={{ color: colors?.headerText }} />
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white/50"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-xs leading-tight" style={{ color: colors?.headerText }}>
                                {config.agentName}
                            </h3>
                            <p className="text-[9px] opacity-90 font-medium" style={{ color: colors?.headerText }}>
                                {isLoading ? 'Escribiendo...' : 'En línea'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        {config.voice.enabled && (
                            <button className="p-1 rounded hover:bg-white/20 transition-colors">
                                <Volume2 size={12} style={{ color: colors?.headerText }} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/20 rounded transition-colors"
                        >
                            <X size={12} style={{ color: colors?.headerText }} />
                        </button>
                    </div>
                </div>

                {/* Messages - Like GlobalAiAssistant */}
                <div 
                    className="flex-1 overflow-y-auto p-2.5 space-y-2.5"
                    style={{ backgroundColor: `${colors?.inputBackground}30` }}
                >
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {/* Bot avatar */}
                            {message.role === 'assistant' && (
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center mr-1.5 shrink-0 border overflow-hidden"
                                    style={{ backgroundColor: `${colors?.primary}10`, borderColor: `${colors?.primary}20` }}
                                >
                                    {config.appearance.avatarUrl ? (
                                        <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bot size={12} style={{ color: colors?.primary }} />
                                    )}
                                </div>
                            )}
                            
                            <div
                                className={`max-w-[80%] px-2.5 py-2 rounded-xl text-[11px] leading-relaxed shadow-sm ${
                                    message.role === 'user'
                                        ? 'rounded-tr-sm'
                                        : 'rounded-tl-sm border'
                                }`}
                                style={{
                                    backgroundColor: message.role === 'user' ? colors?.userBubbleBackground : colors?.background,
                                    color: message.role === 'user' ? colors?.userBubbleText : colors?.botBubbleText,
                                    borderColor: message.role === 'user' ? 'transparent' : colors?.inputBorder
                                }}
                            >
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc ml-3 mb-1 text-[10px]">{children}</ul>,
                                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                            
                            {/* User avatar */}
                            {message.role === 'user' && (
                                <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center ml-1.5 shrink-0 border"
                                    style={{ backgroundColor: `${colors?.inputBackground}80`, borderColor: colors?.inputBorder }}
                                >
                                    <span className="text-[10px]">👤</span>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Loading - Like GlobalAiAssistant */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center mr-1.5 shrink-0 border overflow-hidden"
                                style={{ backgroundColor: `${colors?.primary}10`, borderColor: `${colors?.primary}20` }}
                            >
                                {config.appearance.avatarUrl ? (
                                    <img src={config.appearance.avatarUrl} alt={config.agentName} className="w-full h-full object-cover animate-pulse" />
                                ) : (
                                    <Bot size={12} style={{ color: colors?.primary }} className="animate-pulse" />
                                )}
                            </div>
                            <div
                                className="px-2.5 py-2 rounded-xl rounded-tl-sm shadow-sm flex items-center gap-1.5 text-[10px] border"
                                style={{ backgroundColor: colors?.background, color: colors?.mutedText, borderColor: colors?.inputBorder }}
                            >
                                <Loader2 size={10} className="animate-spin" style={{ color: colors?.primary }} />
                                <span>Pensando...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input - Like GlobalAiAssistant */}
                <div 
                    className="p-2 border-t shrink-0"
                    style={{ borderColor: colors?.inputBorder, backgroundColor: colors?.background }}
                >
                    <div 
                        className="flex items-center gap-1 p-1 rounded-full border transition-all"
                        style={{ backgroundColor: `${colors?.inputBackground}50`, borderColor: colors?.inputBorder }}
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={config.inputPlaceholder}
                            disabled={isLoading}
                            className="flex-1 bg-transparent px-2 outline-none text-[11px]"
                            style={{ color: colors?.inputText }}
                        />
                        {config.voice.enabled && (
                            <button
                                type="button"
                                className="p-1.5 rounded-full transition-colors"
                                style={{ color: colors?.primary }}
                            >
                                <Mic size={12} />
                            </button>
                        )}
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !inputValue.trim()}
                            className="p-1.5 rounded-full shadow-sm transition-all disabled:opacity-50"
                            style={{ backgroundColor: colors?.buttonBackground, color: colors?.buttonIcon }}
                        >
                            {isLoading ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Send size={12} />
                            )}
                        </button>
                    </div>
                    <div className="mt-1 flex justify-between items-center px-1">
                        <p className="text-[8px] flex items-center" style={{ color: colors?.mutedText }}>
                            <span className="w-1 h-1 rounded-full bg-green-500 mr-1"></span>
                            {config.agentRole}
                        </p>
                        <p className="text-[8px]" style={{ color: colors?.mutedText }}>
                            <span style={{ color: colors?.primary }}>Quimera.ai</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingChatSimulator;
