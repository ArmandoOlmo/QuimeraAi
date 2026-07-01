import { useTranslation } from 'react-i18next';
/**
 * AIStudioTab — User Email Hub AI Studio chat + voice + action panel
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Sparkles, Send, Users, Zap, Loader2, CheckCircle, RefreshCcw,
    Mic, PhoneOff, Volume2, Lightbulb,
} from 'lucide-react';
import type { DisplayMessage, AICreatedItem } from '../types';
import { MODEL_TEXT, MODEL_VOICE } from '../types';
import { CollapsibleSection, CollapsiblePanelHeader, useCollapsibleSections } from '../../../../ui/CollapsibleSection';

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
}) => {
    const { t } = useTranslation();
    const { openSections, toggle, expandAll, collapseAll } = useCollapsibleSections({
        quickActions: true,
        session: true,
        suggestions: true,
    });
    return (
    <div className="bg-q-surface border border-q-border rounded-2xl shadow-xl flex flex-col" style={{ height: 'calc(100vh - 170px)' }}>
        {/* Header */}
        <div className="p-4 border-b border-q-border flex items-center justify-between bg-gradient-to-r from-q-accent/10 via-q-accent/5 to-transparent rounded-t-2xl">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="bg-gradient-to-br from-q-accent to-q-accent p-2.5 rounded-xl shadow-lg shadow-q-accent/20"><Sparkles className="text-white w-5 h-5" /></div>
                    {isVoiceActive && (<span className="absolute -top-1 -right-1 w-3 h-3 bg-q-success rounded-full border-2 border-q-bg animate-pulse" />)}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-q-text flex items-center gap-2">
                        {t('aiEmailStudio.title')}
                        <span className="text-[10px] font-mono bg-q-accent/20 text-q-accent px-2 py-0.5 rounded-full">{isVoiceActive ? MODEL_VOICE.split('-').slice(-2).join('-') : MODEL_TEXT.split('-').slice(-2).join('-')}</span>
                    </h2>
                    <p className="text-xs text-q-text-secondary">{isVoiceActive ? t('aiEmailStudio.voiceActive') : t('aiEmailStudio.subtitle')}</p>
                </div>
            </div>
            <button onClick={() => { stopVoiceSession(); initAIStudio(); }} className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors" title={t('aiEmailStudio.reset')}><RefreshCcw className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
            {/* Conversation */}
            <div className="flex-1 flex flex-col min-w-0">
                <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-br from-q-accent to-q-accent text-q-text-on-accent rounded-br-md' : 'bg-[#1e1b2e] border border-q-accent/15 text-q-text-muted rounded-bl-md'}`}>
                                {msg.isVoice && (<span className="inline-flex items-center gap-1 text-[10px] opacity-60 mb-1"><Volume2 className="w-3 h-3" /> {t('aiEmailStudio.voice')}</span>)}
                                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0 text-q-text-muted">{children}</p>, strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>, ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-q-text-muted">{children}</ul>, ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-q-text-muted">{children}</ol>, li: ({ children }) => <li className="leading-relaxed text-q-text-muted">{children}</li> }}>{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {aiThinking && (<div className="flex justify-start"><div className="bg-q-surface border border-q-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-q-text-secondary"><Loader2 className="w-4 h-4 animate-spin text-q-accent" /> {t('aiEmailStudio.thinking')}</div></div>)}
                    {aiCreating && (<div className="flex justify-start"><div className="bg-q-surface border border-q-success/30 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-q-success"><Loader2 className="w-4 h-4 animate-spin" /> {t('aiEmailStudio.creating' + (aiCreating === 'campaign' ? 'Campaign' : aiCreating === 'audience' ? 'Audience' : 'Automation'))}</div></div>)}
                    {isVoiceActive && liveUserTranscript && (<div className="flex justify-end animate-pulse"><div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-q-accent/20 border border-q-accent/30 text-q-accent"><span className="inline-flex items-center gap-1.5 text-[10px] text-q-accent mb-1"><Mic className="w-3 h-3" /> {t('aiEmailStudio.speaking')}</span><p className="text-q-text-muted">{liveUserTranscript}</p></div></div>)}
                    {isVoiceActive && liveModelTranscript && (<div className="flex justify-start"><div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-[#1e1b2e] border border-q-accent/20 text-q-text-muted"><span className="inline-flex items-center gap-1.5 text-[10px] text-q-accent mb-1"><Volume2 className="w-3 h-3" /> {t('aiEmailStudio.answering')}</span><p className="text-q-text-muted">{liveModelTranscript}</p></div></div>)}
                    {aiCreatedItems.length > 0 && (
                        <div className="border-t border-q-border pt-4 mt-4">
                            <p className="text-xs text-q-text-secondary font-medium mb-2">{t('aiEmailStudio.resourcesCreated')}</p>
                            <div className="space-y-1.5">{aiCreatedItems.map((item, i) => (<div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-q-success/5 border border-q-success/20 rounded-lg"><CheckCircle size={12} className="text-q-success flex-shrink-0" /><span className="text-xs text-q-text">{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'} {item.name}</span><span className="text-[10px] text-q-text-secondary ml-auto">{item.type}</span></div>))}</div>
                        </div>
                    )}
                </div>
                {/* Input Bar */}
                <div className="p-3 border-t border-q-border bg-q-surface/50">
                    <div className="flex items-end gap-2">
                        {isVoiceActive ? (
                            <button onClick={stopVoiceSession} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-error/20 text-q-error hover:bg-q-error/30 transition-all" title={t('aiEmailStudio.stopVoice')}><PhoneOff className="w-4 h-4" /></button>
                        ) : (
                            <button onClick={startVoiceSession} disabled={isVoiceConnecting} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-accent hover:bg-q-accent/10 transition-all disabled:opacity-50" title={t('aiEmailStudio.startVoice')}>
                                {isVoiceConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                            </button>
                        )}
                        <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(aiInput); } }} placeholder={isVoiceActive ? t('aiEmailStudio.voicePlaceholder') : t('aiEmailStudio.inputPlaceholder')} className="flex-1 bg-q-bg border border-q-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-q-accent/50 resize-none min-h-[40px] max-h-[120px] text-q-text placeholder:text-q-text-secondary/50" rows={1} disabled={!!aiCreating} />
                        <button onClick={() => sendAIMessage(aiInput)} disabled={!aiInput.trim() || aiThinking || !!aiCreating} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-q-accent to-q-accent text-q-text-on-accent hover:shadow-lg hover:shadow-q-accent/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"><Send className="w-4 h-4" /></button>
                    </div>
                    {isVoiceActive && (<div className="mt-2 flex items-center justify-center gap-2 text-xs text-q-success"><span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-q-success rounded-full animate-pulse" /> {t('aiEmailStudio.listening')}</span><span className="text-q-text-secondary">•</span><span className="text-q-text-secondary font-mono">{MODEL_VOICE.split('-').slice(1).join('-')}</span></div>)}
                </div>
            </div>

            {/* Right Action Panel */}
            <div className="w-72 border-l border-q-border bg-q-surface/30 p-4 overflow-y-auto hidden lg:flex flex-col gap-4 custom-scrollbar">
                <CollapsiblePanelHeader title={t('aiEmailStudio.title')} onExpandAll={expandAll} onCollapseAll={collapseAll} />
                <CollapsibleSection title={t('aiEmailStudio.quickActions')} icon={<Zap size={14} />} isOpen={openSections.quickActions} onToggle={() => toggle('quickActions')}>
                    <div className="space-y-2">
                        <button onClick={aiCreateCampaign} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-q-accent/10 text-q-accent border border-q-accent/20 rounded-xl hover:bg-q-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'campaign' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <div className="text-left"><div className="font-medium">{t('aiEmailStudio.createCampaign')}</div><div className="text-[10px] text-q-accent/60">{t('aiEmailStudio.createCampaignDesc')}</div></div>
                        </button>
                        <button onClick={aiCreateAudience} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-q-accent/10 text-q-accent border border-q-accent/20 rounded-xl hover:bg-q-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'audience' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                            <div className="text-left"><div className="font-medium">{t('aiEmailStudio.createAudience')}</div><div className="text-[10px] text-q-accent/60">{t('aiEmailStudio.createAudienceDesc')}</div></div>
                        </button>
                        <button onClick={aiCreateAutomation} disabled={!!aiCreating || aiMessages.length < 3} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm bg-q-accent/10 text-q-accent border border-q-accent/20 rounded-xl hover:bg-q-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            {aiCreating === 'automation' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                            <div className="text-left"><div className="font-medium">{t('aiEmailStudio.createAutomation')}</div><div className="text-[10px] text-q-accent/60">{t('aiEmailStudio.createAutomationDesc')}</div></div>
                        </button>
                    </div>
                    {aiMessages.length < 3 && (<p className="text-[10px] text-q-text-secondary mt-2 text-center">{t('aiEmailStudio.firstConverse')}</p>)}
                </CollapsibleSection>
                {aiCreatedItems.length > 0 && (
                    <CollapsibleSection title={t('aiEmailStudio.session')} icon={<CheckCircle size={14} />} isOpen={openSections.session} onToggle={() => toggle('session')}>
                        <div className="bg-q-success/5 border border-q-success/15 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-q-success text-sm font-medium mb-1"><CheckCircle size={14} /> {t('aiEmailStudio.resourcesCreatedCount', { count: aiCreatedItems.length })}</div>
                            <div className="space-y-1 mt-2">{aiCreatedItems.map((item, i) => (<div key={i} className="text-[10px] text-q-text-secondary flex items-center gap-1.5"><span>{item.type === 'campaign' ? '📧' : item.type === 'audience' ? '👥' : '⚡'}</span><span className="truncate">{item.name}</span></div>))}</div>
                        </div>
                    </CollapsibleSection>
                )}
                <CollapsibleSection className="mt-auto" title={t('aiEmailStudio.suggestions')} icon={<Lightbulb size={14} />} isOpen={openSections.suggestions} onToggle={() => toggle('suggestions')}>
                    <div className="space-y-1.5 text-[10px] text-q-text-secondary">
                        <p>{t('aiEmailStudio.sugg1')}</p>
                        <p>{t('aiEmailStudio.sugg2')}</p>
                        <p>{t('aiEmailStudio.sugg3')}</p>
                        <p>{t('aiEmailStudio.sugg4')}</p>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    </div>
);
};

export default AIStudioTab;
