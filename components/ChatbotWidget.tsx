
import React, { useState, useRef, useEffect } from 'react';
import { ChatbotData } from '../types';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, Send, X, Loader2, Minimize2 } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';

// Note: In a real production environment, the API Key should be proxied through a backend
// to prevent exposure. For this demo, we use process.env.API_KEY via a client wrapper.

interface ChatbotWidgetProps extends ChatbotData {
    isPreview?: boolean; // To disable actual API calls in preview if needed, though we allow them here
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ 
    welcomeMessage, 
    placeholderText, 
    knowledgeBase, 
    position, 
    colors,
    isPreview = false
}) => {
    const { addLead } = useEditor();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'model', text: welcomeMessage }]);
        }
    }, [isOpen, welcomeMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) {
             setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) {
                 throw new Error("API Key missing");
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Construct System Prompt with RAG Context & Lead Capture Logic
            const systemInstruction = `
                You are a helpful, friendly, and professional AI support agent for a specific business.
                
                YOUR KNOWLEDGE BASE (CONTEXT):
                "${knowledgeBase}"

                INSTRUCTIONS:
                1. Answer the user's question based ONLY on the context provided above.
                2. If the answer is not in the context, politely say you don't have that information and suggest they contact support directly.
                3. Keep answers concise (under 3 sentences if possible) unless detailed explanation is asked.
                4. Do not make up facts not present in the knowledge base.
                5. Be polite and helpful.

                LEAD CAPTURE PROTOCOL:
                If the user expresses interest in buying, booking, or getting a quote, ask for their name and email.
                If the user provides their name and email in this conversation, output a special JSON block at the END of your response like this:
                
                \`\`\`json
                { "lead": { "name": "User Name", "email": "user@email.com", "intent": "Summary of request" } }
                \`\`\`
                
                Hide this JSON from the user in the UI, the system will parse it.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                    { role: 'user', parts: [{ text: userMsg }] }
                ],
                config: {
                    systemInstruction: systemInstruction,
                }
            });

            let reply = response.text || "I'm sorry, I couldn't generate a response at this time.";
            
            // Check for Lead JSON
            const jsonMatch = reply.match(/```json\s*({[\s\S]*?})\s*```/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[1]);
                    if (data.lead) {
                        await addLead({
                            name: data.lead.name,
                            email: data.lead.email,
                            source: 'chatbot',
                            status: 'new',
                            notes: `Captured via Chatbot. Intent: ${data.lead.intent}`,
                            value: 0
                        });
                        console.log("Lead captured via Chatbot:", data.lead);
                    }
                    // Remove JSON from display text
                    reply = reply.replace(jsonMatch[0], '').trim();
                } catch (e) {
                    console.error("Failed to parse lead JSON", e);
                }
            }

            setMessages(prev => [...prev, { role: 'model', text: reply }]);

        } catch (error) {
            console.error("Chatbot Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const positionClasses = position === 'bottom-left' ? 'bottom-6 left-6' : 'bottom-6 right-6';

    return (
        <div className={`fixed ${positionClasses} z-50 flex flex-col items-end font-sans`}>
            {/* Chat Window */}
            <div 
                className={`
                    mb-4 w-[350px] sm:w-[380px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border border-gray-200 dark:border-gray-800
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none h-0'}
                `}
                style={{ maxHeight: '600px', height: '70vh' }}
            >
                {/* Header */}
                <div className="p-4 flex justify-between items-center text-white" style={{ backgroundColor: colors.primary }}>
                    <div className="flex items-center gap-2">
                        <MessageSquare size={20} />
                        <span className="font-bold">Support Chat</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <Minimize2 size={18} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-950 h-[calc(100%-130px)] custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div 
                                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'text-white rounded-tr-sm' 
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm'
                                }`}
                                style={msg.role === 'user' ? { backgroundColor: colors.primary } : {}}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-3">
                             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                                <Loader2 size={16} className="animate-spin text-gray-400" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-[65px] flex items-center gap-2">
                    <input 
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholderText}
                        className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                        style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="p-2.5 rounded-full text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-110
                    ${isOpen ? 'rotate-90 opacity-0 pointer-events-none absolute' : 'opacity-100 rotate-0'}
                `}
                style={{ backgroundColor: colors.primary }}
            >
                <MessageSquare size={28} />
            </button>

            {/* Close Button (Visible when open to swap) */}
             <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-110 bg-gray-600 dark:bg-gray-700
                    ${!isOpen ? 'rotate-90 opacity-0 pointer-events-none absolute' : 'opacity-100 rotate-0'}
                `}
            >
                <X size={28} />
            </button>
        </div>
    );
};

export default ChatbotWidget;