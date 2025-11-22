
import React, { useState, useRef, useEffect } from 'react';
import { AiAssistantConfig, Project } from '../../../types';
import { LiveServerMessage, Modality } from '@google/genai';
import { MessageSquare, Send, Mic, Loader2, Minimize2, PhoneOff } from 'lucide-react';
import { useEditor } from '../../../contexts/EditorContext';
import { getGoogleGenAI } from '../../../utils/genAiClient';
import InfoBubble from '../../ui/InfoBubble';
import { INFO_BUBBLE_CONTENT } from '../../../data/infoBubbleContent';

interface ChatSimulatorProps {
    config: AiAssistantConfig;
    project: Project;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

// --- Audio Utilities ---

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

// --- Component ---

const ChatSimulator: React.FC<ChatSimulatorProps> = ({ config, project }) => {
    const { hasApiKey, promptForKeySelection, handleApiError } = useEditor();
    
    // Get appearance config with fallbacks
    const appearance = config.appearance || {
        colors: {
            primaryColor: config.widgetColor || '#6366f1',
            headerBackground: config.widgetColor || '#6366f1',
            userBubbleColor: config.widgetColor || '#6366f1',
            userTextColor: '#ffffff',
            botBubbleColor: '#ffffff',
            botTextColor: '#1f2937',
            backgroundColor: '#f9fafb',
            inputBackground: '#f3f4f6'
        },
        branding: {
            logoType: 'none',
            logoEmoji: '💬',
            logoUrl: '',
            botAvatarEmoji: '🤖',
            showBotAvatar: true
        },
        messages: {
            welcomeMessage: `Hi! I'm ${config.agentName}, how can I help you today?`,
            inputPlaceholder: 'Type a message...',
            quickReplies: []
        }
    };
    
    // Build comprehensive system instruction
    const buildSystemInstruction = () => {
        const businessContext = `
            BUSINESS NAME: ${project.name}
            
            BUSINESS PROFILE:
            ${config.businessProfile}
            
            PRODUCTS & SERVICES:
            ${config.productsServices}
            
            POLICIES & CONTACT INFO:
            ${config.policiesContact}
            
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

        return `
            You are ${config.agentName}, a ${config.tone.toLowerCase()} AI assistant for ${project.brandIdentity.name} (${project.brandIdentity.industry}).
            Languages: ${config.languages}. Automatically detect the user's language and respond in the same language.
            
            YOUR KNOWLEDGE BASE:
            ${businessContext}

            CRITICAL INSTRUCTIONS:
            1. DETECT the language the user is speaking (e.g., English, Spanish, French) and reply in that EXACT SAME LANGUAGE
            2. Answer questions based ONLY on the knowledge base above
            3. Be ${config.tone.toLowerCase()}, helpful, and conversational
            4. Keep answers concise unless detailed explanation is needed
            5. If the answer is not in the knowledge base, politely say you don't have that information
            6. When answering from FAQs, provide the exact answer but feel free to rephrase naturally
            7. When citing information from uploaded documents, provide accurate information without mentioning the document source unless asked
        `;
    };
    
    // UI State
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: appearance.messages.welcomeMessage }
    ]);
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [visualizerLevels, setVisualizerLevels] = useState([1, 1, 1, 1]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    const sessionRef = useRef<any>(null); 
    const visualizerIntervalRef = useRef<number | null>(null);
    
    // Connection Safety Ref
    const isConnectedRef = useRef(false);

    useEffect(() => {
        setMessages([{ role: 'model', text: appearance.messages.welcomeMessage }]); 
    }, [appearance.messages.welcomeMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Cleanup on Unmount ---
    useEffect(() => {
        return () => {
            stopLiveSession();
        };
    }, []);

    // --- Visualizer Effect ---
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

    const startLiveSession = async () => {
        if (hasApiKey === false) {
            await promptForKeySelection();
            return;
        }
        
        setIsConnecting(true);

        try {
            const ai = await getGoogleGenAI();
            // 1. Initialize Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            
            audioContextRef.current = outputCtx;
            inputAudioContextRef.current = inputCtx;
            nextStartTimeRef.current = outputCtx.currentTime;

            // 2. Connect to Live API
            const sessionPromise = ai.live.connect({
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
                        isConnectedRef.current = true; // Strictly mark connected
                        console.log("Gemini Live Session Opened");
                        
                        // Start Mic Stream
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            streamRef.current = stream;
                            const source = inputCtx.createMediaStreamSource(stream);
                            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                            processorRef.current = processor;

                            processor.onaudioprocess = (e) => {
                                // CRITICAL: Stop processing if disconnected to prevent "Internal Error"
                                if (!isConnectedRef.current) return;

                                const inputData = e.inputBuffer.getChannelData(0);
                                const pcm16 = floatTo16BitPCM(inputData);
                                const base64Data = bytesToBase64(new Uint8Array(pcm16));
                                
                                sessionPromise.then(session => {
                                     // Check again inside promise resolution
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
                         // 1. Handle Interruption
                         if (message.serverContent?.interrupted) {
                            console.log("Model interrupted");
                            // Stop all currently playing audio
                            activeSourcesRef.current.forEach(source => {
                                try { source.stop(); } catch (e) {}
                            });
                            activeSourcesRef.current = [];
                            
                            // Reset timeline logic
                            if (audioContextRef.current) {
                                nextStartTimeRef.current = audioContextRef.current.currentTime;
                            }
                            return;
                        }

                        // 2. Handle Audio Output
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
        isConnectedRef.current = false; // Immediately stop data transmission

        // 1. Stop Mic
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

        // 2. Stop Speakers
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current = [];
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // 3. Close Session
        // We cannot invoke .close() on the promise directly, but setting strict flag handles logic
        if (sessionRef.current) {
             sessionRef.current = null;
        }

        setIsLiveActive(false);
        setIsConnecting(false);
        nextStartTimeRef.current = 0;
    };

    // --- Text Chat Fallback ---
    const handleTextSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        
        // Fallback to standard generation if not live
        if (!isLiveActive) {
            if (hasApiKey === false) { await promptForKeySelection(); return; }
            try {
                 const ai = await getGoogleGenAI();
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                        { role: 'user', parts: [{ text: userMsg }] }
                    ],
                    config: {
                        systemInstruction: buildSystemInstruction(),
                    }
                 });
                 setMessages(prev => [...prev, { role: 'model', text: response.text || "..." }]);
            } catch (e) {
                handleApiError(e);
                console.error(e);
            }
        }
    };

    return (
        <div className="absolute bottom-0 right-0 w-full h-full z-30 flex flex-col justify-end p-4 pointer-events-auto font-sans">
            {/* Chat Window */}
            <div 
                className={`
                    w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 transition-all duration-500
                    ${isLiveActive ? 'h-[550px] ring-4 ring-primary/20' : 'h-[500px]'}
                `}
            >
                {/* Header */}
                <div className="p-4 flex justify-between items-center text-white transition-colors duration-500" style={{ backgroundColor: isLiveActive ? '#ef4444' : appearance.colors.headerBackground }}>
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
                        <button className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                            <Minimize2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: appearance.colors.backgroundColor }}>
                    
                    {/* Live Mode Visualizer Overlay */}
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
                            <p className="text-xs text-gray-500 max-w-[200px] text-center mb-8">Speak naturally. I'm listening in {config.languages || 'your language'}.</p>
                            
                            <button 
                                onClick={stopLiveSession}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full text-sm font-bold text-white transition-colors shadow-lg flex items-center"
                            >
                                <PhoneOff size={18} className="mr-2" /> End Call
                            </button>
                        </div>
                    ) : (
                        /* Text Chat History (Standard View) */
                        <div className="h-full p-4 overflow-y-auto custom-scrollbar space-y-3">
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
                                                : 'rounded-tl-sm'
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
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                            
                            {/* Quick Replies */}
                            {appearance.messages.quickReplies && appearance.messages.quickReplies.length > 0 && messages.length <= 2 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {appearance.messages.quickReplies.map((qr) => (
                                        <button
                                            key={qr.id}
                                            onClick={async () => {
                                                const quickReplyText = qr.text;
                                                setMessages(prev => [...prev, { role: 'user', text: quickReplyText }]);
                                                
                                                if (hasApiKey === false) { await promptForKeySelection(); return; }
                                                try {
                                                    const ai = await getGoogleGenAI();
                                                    const response = await ai.models.generateContent({
                                                        model: 'gemini-2.5-flash',
                                                        contents: [
                                                            ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                                                            { role: 'user', parts: [{ text: quickReplyText }] }
                                                        ],
                                                        config: {
                                                            systemInstruction: buildSystemInstruction(),
                                                        }
                                                    });
                                                    setMessages(prev => [...prev, { role: 'model', text: response.text || "..." }]);
                                                } catch (e) {
                                                    handleApiError(e);
                                                    console.error(e);
                                                }
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

                {/* Footer / Input Controls */}
                {!isLiveActive && (
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
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSend()}
                            placeholder={appearance.messages.inputPlaceholder}
                            className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 rounded-full text-xs outline-none focus:ring-2 transition-all border border-gray-200 dark:border-gray-700"
                            style={{ 
                                '--tw-ring-color': appearance.colors.primaryColor + '40'
                            } as React.CSSProperties}
                        />
                        <button 
                            onClick={handleTextSend}
                            disabled={!input.trim()}
                            className="p-2.5 rounded-full text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: appearance.colors.primaryColor }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Info Bubble */}
            <InfoBubble bubbleId="chatSimulator" content={INFO_BUBBLE_CONTENT.chatSimulator} position="bottom-left" />
        </div>
    );
};

export default ChatSimulator;
