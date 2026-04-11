/**
 * AIStudioTab — User Email Hub AI Studio chat + voice + action panel
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Sparkles, Send, Users, Zap, Loader2, CheckCircle, RefreshCcw,
    Mic, PhoneOff, Volume2,
} from 'lucide-react';
import type { DisplayMessage, AICreatedItem } from '../types';
import { MODEL_TEXT, MODEL_VOICE } from '../types';

interface AIStudioTabProps {
    // Chat
    aiMessages: DisplayMessage[];
    aiInput: string;
    setAiInput: (v: string) => void;
    aiThinking: boolean;
    aiCreating: string | null;
    aiCreatedItems: AICreatedItem[];
    aiChatRef: React.RefObject<HTMLDivElement | null>;
    sendAIMessage: (text: string) => Promise<void>;
    initAIStudio: () => void;

    // Voice
    isVoiceActive: boolean;
    isVoiceConnecting: boolean;
    liveUserTranscript: string;
    liveModelTranscript: string;
    startVoiceSession: () => Promise<void>;
    stopVoiceSession: () => void;

    // AI create
    aiCreateCampaign: () => Promise<void>;
    aiCreateAudience: () => Promise<void>;
    aiCreateAutomation: () => Promise<void>;
}

const AIStudioTab: React.FC<AIStudioTabProps> = ({
    aiMessages, aiInput, setAiInput, aiThinking, aiCreating, aiCreatedItems,
    aiChatRef, sendAIMessage, initAIStudio,
    isVoiceActive, isVoiceConnecting, liveUserTranscript, liveModelTranscript,
    startVoiceSession, stopVoiceSession,
    aiCreateCampaign, aiCreateAudience, aiCreateAutomation,
}) => (
    <div className="bg-editor-panel-bg border border-editor-border rounded-2xl shadow-xl flex flex-col" style={{ height: 'calc(100vh - 170px)' }}>
        {/* Header */}
        <div className="p-4 border-b border-editor-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/5 to-transparent rounded-t-2xl">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-purple-500/20"><Sparkles className="text-white w-5 h-5" /></div>
                    {isVoiceActive && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-editor-bg animate-pulse" />)}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-editor-text-primary flex items-center gap-2">
                        AI Email Studio
                        <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}</span>
                    </h2>
                    <p className="text-xs text-editor-text-secondary">{isVoiceActive ? '🎤 Modo de voz activo' : 'Planifica y crea con inteligencia artificial'}</p>
                </div>
            </div>
            <button onClick={() => { stopVoiceSession(); initAIStudio(); }} className="h-8 w-8 flex items-center justify-center rounded-lg text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-border/40 transition-colors" title="Reiniciar conversación"><RefreshCcw className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
            {/* Conversation */}
            <div className="flex-1 flex flex-col min-w-0">
                <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md' : 'bg-[#1e1b2e] border border-purple-500/15 text-gray-100 rounded-bl-md'}`}>
                                {msg.isVoice && (<span className="inline-flex items-center gap-1 text-[10px] opacity-60 mb-1"><Volume2 className="w-3 h-3" /> Voz</span>)}
                                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-100">{children}</p>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>, ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-200">{children}</ul>, ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-200">{children}</ol>, li: ({ children }) => <li className="leading-relaxed text-gray-200">{children}</li> }}>{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {aiThinking && (<div className="flex justify-start"><div className="bg-editor-panel-bg border border-editor-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-editor-text-secondary"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Pensando...</div></div>)}
                    {aiCreating && (<div className="flex justify-start"><div className="bg-editor-panel-bg border border-green-500/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-green-400"><Loader2 className="w-4 h-4 animate-spin" /> Creando {aiCreating === 'campaign' ? 'campaña' : aiCreating === 'audience' ? 'audiencia' : 'automatización'}...</div></div>)}
                    {isVoiceActive && liveUserTranscript && (<div className="flex justify-end animate-pulse"><div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-purple-500/20 border border-purple-500/30 text-purple-200"><span className="inline-flex items-center gap-1.5 text-[10px] text-purple-400 mb-1"><Mic className="w-3 h-3" /> Hablando...</span><p className="text-gray-100">{liveUserTranscript}</p></div></div>)}
                    {isVoiceActive && liveModelTranscript && (<div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1e1b2e] border border-blue-500/20 text-gray-100"><span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 mb-1"><Volume2 className="w-3 h-3" /> Respondiendo...</span><p className="text-gray-100">{liveModelTranscript}</p></div></div>)}
                    {aiCreatedItems.length > 0 && (
                        <div className="border-t border-editor-border pt-4 mt-4">
                            <p className="text-xs text-editor-text-secondary font-medium mb-2">Recursos creados esta sesión</p>
                            <div className="space-y-1.5">{aiCreatedItems.map((item, i) => (<div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/20 rounded-lg"><CheckCircle size={12} className="text-green-400 flex-shrink-0" /><span className="text-xs text-editor-text-primary">{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'} {item.name}</span><span className="text-[10px] text-editor-text-secondary ml-auto">{item.type}</span></div>))}</div>
                        </div>
                    )}
                </div>
                {/* Input Bar */}
                <div className="p-3 border-t border-editor-border bg-editor-panel-bg/50">
                    <div className="flex items-end gap-2">
                        {isVoiceActive ? (
                            <button onClick={stopVoiceSession} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all" title="Detener voz"><PhoneOff className="w-4 h-4" /></button>
                        ) : (
                            <button onClick={startVoiceSession} disabled={isVoiceConnecting} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-editor-border/40 text-editor-text-secondary hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50" title="Iniciar voz">
                                {isVoiceConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                            </button>
                        )}
                        <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(aiInput); } }} placeholder={isVoiceActive ? 'Hablando por voz...' : 'Describe la campaña, audiencia o automatización que quieres crear...'} className="flex-1 bg-editor-bg border border-editor-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[40px] max-h-[120px] text-editor-text-primary placeholder:text-editor-text-secondary/50" rows={1} disabled={!!aiCreating} />
                        <button onClick={() => sendAIMessage(aiInput)} disabled={!aiInput.trim() || aiThinking || !!aiCreating} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"><Send className="w-4 h-4" /></button>
                    </div>
                    {isVoiceActive && (<div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400"><span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Escuchando...</span><span className="text-editor-text-secondary">•</span><span className="text-editor-text-secondary font-mono">{MODEL_VOICE.split('-').slice(1).join('-')}</span></div>)}
                </div>
            </div>

            {/* Right Action Panel */}
            <div className="w-72 border-l border-editor-border bg-editor-panel-bg/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">
                <div>
                    <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">Acciones Rápidas</h4>
                    <div className="space-y-2">
                        <button onClick={aiCreateCampaign} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'campaign' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <div className="text-left"><div className="font-medium">Crear Campaña</div><div className="text-[10px] text-blue-400/60">Generar desde conversación</div></div>
                        </button>
                        <button onClick={aiCreateAudience} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'audience' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                            <div className="text-left"><div className="font-medium">Crear Audiencia</div><div className="text-[10px] text-purple-400/60">Segmento de contactos</div></div>
                        </button>
                        <button onClick={aiCreateAutomation} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'automation' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                            <div className="text-left"><div className="font-medium">Crear Automatización</div><div className="text-[10px] text-amber-400/60">Flujo automático de emails</div></div>
                        </button>
                    </div>
                    {aiMessages.length < 3 && (<p className="text-[10px] text-editor-text-secondary mt-2 text-center">Primero conversa con la AI para activar las acciones</p>)}
                </div>
                {aiCreatedItems.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sesión</h4>
                        <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1"><CheckCircle size={14} /> {aiCreatedItems.length} recurso{aiCreatedItems.length > 1 ? 's' : ''} creado{aiCreatedItems.length > 1 ? 's' : ''}</div>
                            <div className="space-y-1 mt-2">{aiCreatedItems.map((item, i) => (<div key={i} className="text-[10px] text-editor-text-secondary flex items-center gap-1.5"><span>{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'}</span><span className="truncate">{item.name}</span></div>))}</div>
                        </div>
                    </div>
                )}
                <div className="mt-auto">
                    <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Sugerencias</h4>
                    <div className="space-y-1.5 text-[10px] text-editor-text-secondary">
                        <p>💡 "Crea una campaña de bienvenida para nuevos suscriptores"</p>
                        <p>📊 "Analiza el rendimiento de mis últimas campañas"</p>
                        <p>🎯 "Sugiere segmentos de audiencia basados en engagement"</p>
                        <p>⚡ "Diseña un flujo de emails para carrito abandonado"</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default AIStudioTab;
