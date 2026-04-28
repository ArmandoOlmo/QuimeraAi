/**
 * AdminTemplateStudio
 *
 * Modal popup for conversational AI website generation.
 * Follows the same design system as AdminEmail AIStudio — uses editor-* CSS tokens
 * for automatic light/dark/black mode support.
 *
 * Left panel: Chat (text + voice)
 * Right panel: Business Brief (extracted data + readiness score + generate button)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    X, Mic, MicOff, Send, Sparkles, Loader2, ChevronRight,
    Building2, Palette, Phone, CheckCircle2, Circle,
    MessageSquare, Zap, LayoutTemplate, Image, FileText, Package, Save, PartyPopper,
    RefreshCcw, Volume2, Globe, Upload, Plus, Minus, Type
} from 'lucide-react';
import { useAdminTemplateStudio, BusinessBrief, GenerationPhase, GenerationEvent } from './hooks/useAdminTemplateStudio';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import ColorControl from '../../ui/ColorControl';
import { PageSection } from '../../../types/ui';
import ImagePicker from '../../ui/ImagePicker';
import FontFamilyPicker from '../../ui/FontFamilyPicker';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const AdminTemplateStudio: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const studio = useAdminTemplateStudio(onClose);
    const [isMobileBriefOpen, setIsMobileBriefOpen] = useState(false);
    const { t } = useTranslation();

    // Initialize when opened
    useEffect(() => {
        if (isOpen) {
            studio.initStudio();
        }
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    // Don't render if not open
    if (!isOpen) return null;

    const handleClose = () => {
        // Block close only during active generation — allow when done
        const isDone = studio.generationPhase?.phase === 'done';
        if (studio.isGenerating && !isDone) return;
        studio.stopVoiceSession();
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            studio.sendMessage(studio.input);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ animation: 'aws-fadeIn 0.25s ease' }}>
            {/* Backdrop click */}
            <div className="absolute inset-0" onClick={studio.isGenerating ? undefined : handleClose} />

            {/* Modal Container */}
            <div
                className="relative z-10 w-[96vw] max-w-[1200px] bg-q-surface border border-q-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: 'min(88vh, 840px)', animation: 'aws-slideUp 0.3s ease' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-q-border bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="bg-q-accent p-2.5 rounded-xl shadow-lg shadow-primary/20">
                                <Sparkles className="text-primary-foreground w-5 h-5" />
                            </div>
                            {studio.isVoiceActive && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-q-bg animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-q-text flex items-center gap-2">
                                {t('aiTemplateStudio.title')}
                                <span className="text-[10px] font-mono bg-primary/15 text-q-accent px-2 py-0.5 rounded-full">
                                    Quimera AI
                                </span>
                            </h2>
                            <p className="text-xs text-q-text-secondary">{t('aiTemplateStudio.poweredBy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mobile brief toggle */}
                        <button
                            onClick={() => setIsMobileBriefOpen(!isMobileBriefOpen)}
                            className="lg:hidden h-8 px-3 rounded-lg bg-q-surface-overlay/40 text-q-text-secondary text-xs hover:bg-q-surface-overlay/60 transition-colors flex items-center gap-1.5"
                        >
                            <LayoutTemplate size={14} />
                            {t('aiTemplateStudio.brief')}
                            {studio.businessBrief.readinessScore > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-q-accent text-[10px] font-bold">
                                    {studio.businessBrief.readinessScore}%
                                </span>
                            )}
                        </button>
                        {/* Import website */}
                        <button
                            onClick={() => studio.setShowUrlModal(true)}
                            disabled={studio.isExtracting || studio.isGenerating}
                            className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary/10 text-q-accent text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-40"
                            title={t('aiTemplateStudio.extraction.buttonLabel')}
                        >
                            {studio.isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{t('aiTemplateStudio.extraction.buttonLabel')}</span>
                        </button>
                        {/* Reset */}
                        <button
                            onClick={() => { studio.stopVoiceSession(); studio.initStudio(); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors"
                            title={t('aiTemplateStudio.reset')}
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        {/* Close */}
                        <button
                            onClick={handleClose}
                            disabled={studio.isGenerating}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors disabled:opacity-30"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 min-h-0 relative">
                    {/* LEFT: Chat Panel */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Messages */}
                        <div ref={studio.chatRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                            {studio.messages.map((msg, i) => (
                                <ChatBubble key={i} message={msg} />
                            ))}
                            {/* Live voice transcripts */}
                            {studio.liveUserTranscript && (
                                <div className="flex justify-end animate-pulse">
                                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-primary/15 border border-primary/30 text-q-text">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-q-accent mb-1">
                                            <Mic className="w-3 h-3" /> {t('aiTemplateStudio.chat.stopVoice')}
                                        </span>
                                        <p className="text-q-text">{studio.liveUserTranscript}</p>
                                    </div>
                                </div>
                            )}
                            {studio.liveModelTranscript && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed bg-q-surface border border-primary/20 text-q-text">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-q-accent mb-1">
                                            <Volume2 className="w-3 h-3" />
                                        </span>
                                        <p>{studio.liveModelTranscript}</p>
                                    </div>
                                </div>
                            )}
                            {/* Thinking indicator */}
                            {studio.isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-q-surface border border-q-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-sm text-q-text-secondary">
                                        <Loader2 className="w-4 h-4 animate-spin text-q-accent" />
                                        {t('aiTemplateStudio.chat.thinking')}
                                    </div>
                                </div>
                            )}
                            {/* Generation progress inline hint */}
                            {studio.generationPhase && studio.generationPhase.phase !== 'done' && (
                                <div className="mx-auto max-w-md bg-primary/10 border border-primary/20 rounded-xl p-3 text-center text-xs text-q-text-secondary">
                                    <Loader2 size={14} className="animate-spin inline mr-1 text-q-accent" />
                                    {t('aiTemplateStudio.chat.generatingHint')}
                                </div>
                            )}
                        </div>

                        {/* ── Input Bar — matches Email AI Studio pattern ── */}
                        <div className="p-3 border-t border-q-border bg-q-surface/50">
                            <div className="flex items-center gap-2 max-w-3xl mx-auto">
                                {/* Voice button — fixed h-10 w-10 */}
                                {studio.isVoiceActive ? (
                                    <button
                                        onClick={studio.stopVoiceSession}
                                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                        title={t('aiTemplateStudio.chat.stopVoice')}
                                    >
                                        <MicOff className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={studio.startVoiceSession}
                                        disabled={studio.isVoiceConnecting || studio.isGenerating}
                                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-accent hover:bg-primary/10 transition-all disabled:opacity-50"
                                        title={t('aiTemplateStudio.chat.startVoice')}
                                    >
                                        {studio.isVoiceConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                )}
                                {/* Text input — min-h-[40px] to match buttons */}
                                <textarea
                                    value={studio.input}
                                    onChange={e => studio.setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={studio.isVoiceActive ? t('aiTemplateStudio.chat.voicePlaceholder') : t('aiTemplateStudio.chat.textPlaceholder')}
                                    disabled={studio.isVoiceActive || studio.isGenerating}
                                    rows={1}
                                    className="flex-1 bg-q-bg border border-q-border rounded-xl px-4 py-2.5 text-sm text-q-text placeholder:text-q-text-secondary/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px] transition-all disabled:opacity-40"
                                />
                                {/* Send button — fixed h-10 w-10 */}
                                <button
                                    onClick={() => studio.sendMessage(studio.input)}
                                    disabled={!studio.input.trim() || studio.isThinking || studio.isVoiceActive || studio.isGenerating}
                                    className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-q-accent text-primary-foreground hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-30 disabled:hover:shadow-none"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Voice active indicator */}
                            {studio.isVoiceActive && (
                                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-400">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        {t('aiTemplateStudio.chat.voicePlaceholder')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Business Brief Panel (desktop) */}
                    <div className="hidden lg:flex w-[300px] flex-col border-l border-q-border bg-q-surface/30 overflow-y-auto custom-scrollbar">
                        <BriefPanel brief={studio.businessBrief} canGenerate={studio.canGenerate} isGenerating={studio.isGenerating} onGenerate={studio.startGeneration} referenceImages={studio.referenceImages} onAddReferenceImage={studio.addReferenceImage} onRemoveReferenceImage={studio.removeReferenceImage} onUpdateColor={studio.updateBriefColor} onUpdateFont={studio.updateBriefFont} onToggleComponent={studio.toggleBriefComponent} />
                    </div>

                    {/* RIGHT: Business Brief Panel (mobile drawer) */}
                    {isMobileBriefOpen && (
                        <div className="lg:hidden absolute inset-0 z-50 flex">
                            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileBriefOpen(false)} />
                            <div className="ml-auto relative w-[85%] max-w-[380px] bg-q-surface border-l border-q-border flex flex-col overflow-y-auto" style={{ animation: 'aws-slideInRight 0.3s ease' }}>
                                <div className="flex items-center justify-between px-4 py-3 border-b border-q-border">
                                    <span className="text-sm font-semibold text-q-text">{t('aiTemplateStudio.briefPanel.title')}</span>
                                    <button onClick={() => setIsMobileBriefOpen(false)} className="p-1 text-q-text-secondary hover:text-q-text"><X size={16} /></button>
                                </div>
                                <BriefPanel brief={studio.businessBrief} canGenerate={studio.canGenerate} isGenerating={studio.isGenerating} onGenerate={studio.startGeneration} referenceImages={studio.referenceImages} onAddReferenceImage={studio.addReferenceImage} onRemoveReferenceImage={studio.removeReferenceImage} onUpdateColor={studio.updateBriefColor} onUpdateFont={studio.updateBriefFont} onToggleComponent={studio.toggleBriefComponent} />
                            </div>
                        </div>
                    )}
                </div>

                {/* URL EXTRACTION MODAL */}
                {studio.showUrlModal && (
                    <UrlInputModal
                        onSubmit={studio.extractWebsiteData}
                        onClose={() => studio.setShowUrlModal(false)}
                    />
                )}

                {/* GENERATION OVERLAY */}
                {studio.generationPhase && <GenerationOverlay phase={studio.generationPhase} businessName={studio.businessBrief.businessName} />}
            </div>

            <style>{`
                @keyframes aws-fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes aws-slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes aws-slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes aws-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAT BUBBLE — uses editor tokens for theme support
// ═══════════════════════════════════════════════════════════════════════════

const ChatBubble: React.FC<{ message: { role: 'user' | 'model'; text: string; isVoice?: boolean } }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                    ? 'rounded-br-md bg-q-accent text-primary-foreground'
                    : 'rounded-bl-md bg-q-surface border border-q-border text-q-text'
            }`}>
                {isUser ? (
                    <p>{message.text}</p>
                ) : (
                    <ReactMarkdown
                        components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-q-text">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-q-text">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-q-text-secondary">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-q-text-secondary">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed text-q-text-secondary">{children}</li>,
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                )}
                {message.isVoice && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] opacity-50">
                        <Volume2 size={10} /> {t('aiTemplateStudio.voice')}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS BRIEF PANEL — uses editor tokens
// ═══════════════════════════════════════════════════════════════════════════

const AVAILABLE_COMPONENTS: { key: PageSection; label: string }[] = [
    { key: 'hero', label: 'Hero' }, { key: 'heroSplit', label: 'Hero Split' },
    { key: 'heroGallery', label: 'Hero Gallery' }, { key: 'heroWave', label: 'Hero Wave' },
    { key: 'heroNova', label: 'Hero Nova' }, { key: 'heroLead', label: 'Hero Lead' },
    { key: 'topBar', label: 'Top Bar' }, { key: 'logoBanner', label: 'Logo Banner' },
    { key: 'banner', label: 'Banner' }, { key: 'features', label: 'Features' },
    { key: 'testimonials', label: 'Testimonials' }, { key: 'pricing', label: 'Pricing' },
    { key: 'faq', label: 'FAQ' }, { key: 'cta', label: 'CTA' },
    { key: 'services', label: 'Services' }, { key: 'video', label: 'Video' },
    { key: 'howItWorks', label: 'How It Works' }, { key: 'menu', label: 'Menu' },
    { key: 'leads', label: 'Leads' }, { key: 'newsletter', label: 'Newsletter' },
    { key: 'map', label: 'Map' }, { key: 'signupFloat', label: 'Signup Float' },
    { key: 'slideshow', label: 'Slideshow' }, { key: 'portfolio', label: 'Portfolio' },
    { key: 'team', label: 'Team' },
    { key: 'separator1', label: 'Separator 1' }, { key: 'separator2', label: 'Separator 2' },
    { key: 'separator3', label: 'Separator 3' },
    // Lumina Suite
    { key: 'heroLumina', label: 'Hero Lumina' }, { key: 'featuresLumina', label: 'Features Lumina' },
    { key: 'ctaLumina', label: 'CTA Lumina' }, { key: 'portfolioLumina', label: 'Portfolio Lumina' },
    { key: 'pricingLumina', label: 'Pricing Lumina' }, { key: 'testimonialsLumina', label: 'Testimonials Lumina' },
    { key: 'faqLumina', label: 'FAQ Lumina' },
    // Neon Suite
    { key: 'heroNeon', label: 'Hero Neon' }, { key: 'testimonialsNeon', label: 'Testimonials Neon' },
    { key: 'featuresNeon', label: 'Features Neon' }, { key: 'ctaNeon', label: 'CTA Neon' },
    { key: 'portfolioNeon', label: 'Portfolio Neon' }, { key: 'pricingNeon', label: 'Pricing Neon' },
    { key: 'faqNeon', label: 'FAQ Neon' },
];

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'surface', 'text'] as const;

const BriefPanel: React.FC<{
    brief: BusinessBrief;
    canGenerate: boolean;
    isGenerating: boolean;
    onGenerate: () => void;
    referenceImages: string[];
    onAddReferenceImage: (base64: string) => void;
    onRemoveReferenceImage: (index: number) => void;
    onUpdateColor: (colorKey: string, newColor: string) => void;
    onUpdateFont: (fontKey: 'header' | 'body' | 'button', newFont: string) => void;
    onToggleComponent: (component: PageSection) => void;
}> = ({ brief, canGenerate, isGenerating, onGenerate, referenceImages, onAddReferenceImage, onRemoveReferenceImage, onUpdateColor, onUpdateFont, onToggleComponent }) => {
    const { t } = useTranslation();
    const readiness = brief.readinessScore;
    const readinessColor = readiness >= 80 ? '#22c55e' : readiness >= 50 ? '#f59e0b' : readiness >= 20 ? '#ef4444' : '#6b7280';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showComponentPicker, setShowComponentPicker] = useState(false);
    const [showLibraryPicker, setShowLibraryPicker] = useState(false);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFiles = async (files: FileList | File[]) => {
        const remaining = 14 - referenceImages.length;
        if (remaining <= 0) return;
        const toProcess = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);
        for (const file of toProcess) {
            try {
                const base64 = await fileToBase64(file);
                if (base64) onAddReferenceImage(base64);
            } catch (e) { console.error('Error converting file:', e); }
        }
    };

    // Components not yet selected
    const availableToAdd = AVAILABLE_COMPONENTS.filter(c => !brief.suggestedComponents.includes(c.key));

    return (
        <div className="flex-1 flex flex-col p-4 space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-q-text flex items-center gap-2">
                    <MessageSquare size={14} className="text-q-accent" />
                    {t('aiTemplateStudio.briefPanel.title')}
                </h3>
            </div>

            {/* Generate Button */}
            <div className="pb-2">
                <button
                    onClick={onGenerate}
                    disabled={!canGenerate || isGenerating}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        canGenerate && !isGenerating
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer'
                            : 'bg-q-surface-overlay/40 text-q-text-secondary/40 cursor-not-allowed'
                    }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            {t('aiTemplateStudio.briefPanel.generating')}
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            {t('aiTemplateStudio.briefPanel.generateButton')}
                        </>
                    )}
                </button>
                {!canGenerate && !isGenerating && (
                    <p className="text-center text-[10px] text-q-text-secondary/50 mt-2">
                        {t('aiTemplateStudio.briefPanel.keepChatting')}
                    </p>
                )}
            </div>

            {/* Readiness Score */}
            <div className="bg-q-bg rounded-xl p-3 border border-q-border">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-q-text-secondary">{t('aiTemplateStudio.briefPanel.readiness')}</span>
                    <span className="font-bold" style={{ color: readinessColor }}>{readiness}%</span>
                </div>
                <div className="w-full h-2 bg-q-surface-overlay rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${readiness}%`, background: `linear-gradient(90deg, ${readinessColor}80, ${readinessColor})` }}
                    />
                </div>
                {brief.missingFields.length > 0 && readiness < 80 && (
                    <p className="mt-2 text-[10px] text-q-text-secondary/60">
                        {t('aiTemplateStudio.briefPanel.missing')} {brief.missingFields.join(', ')}
                    </p>
                )}
            </div>

            {/* Business Info */}
            <BriefSection title={t('aiTemplateStudio.briefPanel.business')} icon={<Building2 size={13} />}>
                <BriefField label={t('aiTemplateStudio.briefPanel.name')} value={brief.businessName} />
                <BriefField label={t('aiTemplateStudio.briefPanel.industry')} value={brief.industry} />
                <BriefField label={t('aiTemplateStudio.briefPanel.tagline')} value={brief.tagline} />
                {brief.description && (
                    <p className="text-q-text-secondary/60 line-clamp-2 mt-1">{brief.description}</p>
                )}
            </BriefSection>

            {/* Services */}
            {brief.services.length > 0 && (
                <BriefSection title={`${t('aiTemplateStudio.briefPanel.services')} (${brief.services.length})`} icon={<Zap size={13} />}>
                    {brief.services.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-q-text-secondary">
                            <CheckCircle2 size={11} className="text-green-400/60 mt-0.5 flex-shrink-0" />
                            <span>{s.name}</span>
                        </div>
                    ))}
                </BriefSection>
            )}

            {/* Contact */}
            {(brief.contactInfo.email || brief.contactInfo.phone || brief.contactInfo.address) && (
                <BriefSection title={t('aiTemplateStudio.briefPanel.contact')} icon={<Phone size={13} />}>
                    {brief.contactInfo.email && <BriefField label={t('aiTemplateStudio.briefPanel.email')} value={brief.contactInfo.email} />}
                    {brief.contactInfo.phone && <BriefField label={t('aiTemplateStudio.briefPanel.phone')} value={brief.contactInfo.phone} />}
                    {brief.contactInfo.address && <BriefField label={t('aiTemplateStudio.briefPanel.address')} value={brief.contactInfo.address} />}
                    {brief.contactInfo.businessHours && <BriefField label={t('aiTemplateStudio.briefPanel.hours')} value={brief.contactInfo.businessHours} />}
                </BriefSection>
            )}

            {/* Color Palette */}
            <BriefSection title={t('aiTemplateStudio.briefPanel.colors')} icon={<Palette size={13} />}>
                <div className="grid grid-cols-2 gap-2">
                    {COLOR_KEYS.map(key => (
                        <ColorControl
                            key={key}
                            label={key}
                            value={brief.colorPalette[key]}
                            onChange={(newColor) => onUpdateColor(key, newColor)}
                            variant="editor"
                        />
                    ))}
                </div>
            </BriefSection>

            {/* Typography */}
            <BriefSection title={t('aiTemplateStudio.briefPanel.typography', { defaultValue: 'Typography' })} icon={<Type size={13} />}>
                <div className="space-y-2">
                    {(['header', 'body', 'button'] as const).map(key => (
                        <div key={key} className="flex flex-col gap-1">
                            <span className="text-[10px] text-q-text-secondary uppercase">{key}</span>
                            <FontFamilyPicker
                                value={brief.fontPairing[key]}
                                onChange={(val) => onUpdateFont(key, val as any)}
                            />
                        </div>
                    ))}
                </div>
            </BriefSection>

            {/* Components — Toggleable */}
            <BriefSection title={`${t('aiTemplateStudio.briefPanel.components')} (${brief.suggestedComponents.length})`} icon={<LayoutTemplate size={13} />}>
                <div className="flex flex-wrap gap-1">
                    {brief.suggestedComponents.map(comp => (
                        <button
                            key={comp}
                            onClick={() => onToggleComponent(comp as PageSection)}
                            className="group/chip flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-q-accent text-[10px] border border-primary/20 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
                            title={`Remove ${comp}`}
                        >
                            {comp}
                            <X size={9} className="opacity-0 group-hover/chip:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
                {/* Add Component */}
                <div className="relative mt-1.5">
                    <button
                        onClick={() => setShowComponentPicker(!showComponentPicker)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-q-border hover:border-q-accent/50 text-q-text-secondary hover:text-q-accent text-[10px] transition-colors cursor-pointer"
                    >
                        <Plus size={10} />
                        {t('aiTemplateStudio.briefPanel.addComponent', { defaultValue: 'Add component' })}
                    </button>
                    {showComponentPicker && availableToAdd.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-q-surface border border-q-border rounded-lg shadow-xl max-h-48 overflow-y-auto w-48 custom-scrollbar">
                            {availableToAdd.map(comp => (
                                <button
                                    key={comp.key}
                                    onClick={() => { onToggleComponent(comp.key); setShowComponentPicker(false); }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] text-q-text-secondary hover:bg-q-accent/10 hover:text-q-accent transition-colors cursor-pointer"
                                >
                                    {comp.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </BriefSection>

            {/* Reference Images */}
            <BriefSection title={`${t('aiTemplateStudio.briefPanel.referenceImages', { defaultValue: 'Reference Images' })} (${referenceImages.length}/14)`} icon={<Image size={13} />}>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                />
                <div
                    className={`w-full border-2 border-dashed rounded-xl transition-colors cursor-pointer group p-4 flex flex-col items-center justify-center gap-2 ${
                        isDragging ? 'border-q-accent bg-q-accent/10' : 'border-q-border hover:border-q-accent/50 bg-q-bg/30'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="size-8 rounded-full bg-q-surface-overlay/20 group-hover:bg-q-accent/10 flex items-center justify-center transition-colors">
                        <Upload size={16} className="text-q-text-secondary group-hover:text-q-accent transition-colors" />
                    </div>
                    <span className="text-[10px] font-medium text-q-text-secondary group-hover:text-q-accent transition-colors text-center">
                        {t('aiTemplateStudio.briefPanel.uploadReference', { defaultValue: 'Upload reference images' })}
                    </span>
                    <span className="text-[9px] text-q-text-secondary/50">
                        {t('aiTemplateStudio.briefPanel.uploadReferenceHint', { defaultValue: 'People, places, products, or style inspiration' })}
                    </span>
                </div>
                
                <div className="flex gap-2 w-full mt-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-1.5 rounded-lg border border-q-border hover:border-q-accent text-[10px] text-q-text-secondary hover:text-q-accent transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Upload size={12} /> Local
                    </button>
                    <button
                        onClick={() => setShowLibraryPicker(true)}
                        className="flex-1 py-1.5 rounded-lg border border-q-border hover:border-q-accent text-[10px] text-q-text-secondary hover:text-q-accent transition-colors flex items-center justify-center gap-1.5 bg-q-accent/10 text-q-accent border-q-accent/20"
                    >
                        <Image size={12} /> Librería Admin
                    </button>
                </div>

                {showLibraryPicker && (
                    <ImagePicker
                        label=""
                        value=""
                        onChange={(url) => {
                            if (!referenceImages.includes(url) && referenceImages.length < 14) {
                                onAddReferenceImage(url);
                            }
                        }}
                        destination="admin"
                        defaultOpen={true}
                        onClose={() => setShowLibraryPicker(false)}
                    />
                )}

                {referenceImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {referenceImages.map((img, idx) => (
                            <div key={idx} className="relative w-11 h-11 rounded-lg overflow-hidden group/thumb border border-q-border">
                                <img src={img} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveReferenceImage(idx); }}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <X size={12} className="text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </BriefSection>
        </div>
    );
};

// ── Brief sub-components ────────────────────────────────────────────────────

const BriefSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-q-text-secondary font-medium">
            {icon}
            <span>{title}</span>
        </div>
        <div className="pl-5 space-y-1">{children}</div>
    </div>
);

const BriefField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div className="flex items-center gap-1.5">
        {value ? <CheckCircle2 size={10} className="text-green-400/60 flex-shrink-0" /> : <Circle size={10} className="text-q-text-secondary/30 flex-shrink-0" />}
        <span className="text-q-text-secondary/60">{label}:</span>
        <span className={`truncate ${value ? 'text-q-text' : 'text-q-text-secondary/30 italic'}`}>{value || '...'}</span>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION OVERLAY — uses editor tokens for theme support
// ═══════════════════════════════════════════════════════════════════════════

const PHASE_LABELS_KEY: Record<string, string> = {
    content: 'aiTemplateStudio.generation.phases.content',
    images: 'aiTemplateStudio.generation.phases.images',
    finalizing: 'aiTemplateStudio.generation.phases.finalizing',
    done: 'aiTemplateStudio.generation.phases.done',
};

const GenerationOverlay: React.FC<{ phase: GenerationPhase; businessName: string }> = ({ phase, businessName }) => {
    const { t } = useTranslation();
    const eventsEndRef = useRef<HTMLDivElement>(null);
    const isDone = phase.phase === 'done';

    // Auto-scroll event log
    useEffect(() => {
        eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [phase.events.length]);

    const progressColor = isDone ? '#22c55e' : '#818cf8';
    const circumference = 2 * Math.PI * 52;
    const strokeDashoffset = circumference - (phase.progress / 100) * circumference;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ animation: 'aws-fadeIn 0.4s ease' }}>
            <div className="w-full max-w-3xl h-[600px] max-h-[calc(100%-2rem)] mx-4 flex flex-col rounded-2xl border border-q-border bg-q-surface shadow-2xl overflow-hidden">

                {/* ── Header ── */}
                <div className="px-6 pt-6 pb-4 border-b border-q-border">
                    <div className="flex items-center gap-4">
                        {/* Progress Ring */}
                        <div className="relative w-[72px] h-[72px] flex-shrink-0">
                            <svg className="transform -rotate-90" width="72" height="72" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" className="stroke-q-border" strokeWidth="8" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke={progressColor} strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                {isDone ? (
                                    <span className="text-xl">🎉</span>
                                ) : (
                                    <span className="text-base font-bold text-q-text font-mono">{Math.round(phase.progress)}%</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-q-text truncate">
                                {isDone ? t('aiTemplateStudio.generation.websiteCreated') : t('aiTemplateStudio.generation.creating', { name: businessName || t('aiTemplateStudio.generation.yourWebsite') })}
                            </h2>
                            <p className="text-sm text-q-text-secondary mt-0.5">{phase.currentStep}</p>
                             {/* Phase steps indicator */}
                            <div className="flex items-center gap-1 mt-2">
                                {(['content', 'images', 'finalizing', 'done'] as const).map((p, idx) => {
                                    const phases = ['content', 'images', 'finalizing', 'done'];
                                    const currentIdx = phases.indexOf(phase.phase);
                                    const isActive = idx === currentIdx;
                                    const isCompleted = idx < currentIdx;
                                    return (
                                        <React.Fragment key={p}>
                                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                                isActive ? 'bg-primary/15 text-q-accent ring-1 ring-primary/30' :
                                                isCompleted ? 'bg-green-500/10 text-green-400/60' :
                                                'bg-q-surface-overlay/40 text-q-text-secondary/40'
                                            }`}>
                                                {isCompleted ? <CheckCircle2 size={10} /> : isActive ? <Loader2 size={10} className="animate-spin" /> : <Circle size={10} />}
                                                <span className="hidden sm:inline">{t(PHASE_LABELS_KEY[p])}</span>
                                            </div>
                                            {idx < 3 && <ChevronRight size={10} className="text-q-text-secondary/20 flex-shrink-0" />}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats Bar ── */}
                {phase.imagesTotal > 0 && (
                    <div className="px-6 py-3 bg-q-bg border-b border-q-border flex items-center gap-6 text-xs">
                        <div className="flex items-center gap-1.5">
                            <Image size={13} className="text-q-accent" />
                            <span className="text-q-text-secondary">{t('aiTemplateStudio.generation.stats.images')}</span>
                            <span className="font-mono font-bold text-q-text">{phase.imagesCompleted}</span>
                            <span className="text-q-text-secondary/50">/ {phase.imagesTotal}</span>
                        </div>
                        {phase.imagesFailed > 0 && (
                            <div className="flex items-center gap-1.5">
                                <X size={13} className="text-red-400" />
                                <span className="text-red-400/60">{t('aiTemplateStudio.generation.stats.failed')} {phase.imagesFailed}</span>
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-q-text-secondary/50">{t('aiTemplateStudio.generation.stats.progress')}</span>
                            <div className="w-24 h-1.5 bg-q-surface-overlay rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-editor-accent to-primary transition-all duration-500"
                                    style={{ width: `${phase.progress}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Content: Timeline + Image Gallery ── */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Left: Event Timeline */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                        <div className="space-y-2">
                            {phase.events.map((event, i) => (
                                <EventRow key={i} event={event} isLatest={i === phase.events.length - 1} />
                            ))}
                            <div ref={eventsEndRef} />
                        </div>
                    </div>

                    {/* Right: Image Gallery */}
                    {phase.generatedImages.length > 0 && (
                        <div className="hidden sm:flex w-[200px] flex-col border-l border-q-border bg-q-bg overflow-y-auto p-3 gap-2 custom-scrollbar">
                            <span className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider">{t('aiTemplateStudio.generation.generatedImages')}</span>
                            {phase.generatedImages.map((img, i) => (
                                <div key={i} className="rounded-lg overflow-hidden border border-q-border bg-q-surface" style={{ animation: 'aws-fadeIn 0.5s ease' }}>
                                    <img src={img.url} alt={img.key} className="w-full h-24 object-cover" loading="lazy" />
                                    <div className="px-2 py-1">
                                        <span className="text-[9px] text-q-text-secondary truncate block">{img.key}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Footer shimmer ── */}
                {!isDone && (
                    <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0"
                        style={{ backgroundSize: '200% 100%', animation: 'aws-shimmer 2s linear infinite' }} />
                )}
                {isDone && (
                    <div className="h-1 w-full bg-gradient-to-r from-green-500/40 via-emerald-400/60 to-green-500/40" />
                )}
            </div>
        </div>
    );
};

// ── Event Row for timeline ──────────────────────────────────────────────

const EVENT_ICONS: Record<GenerationEvent['type'], React.ReactNode> = {
    start: <Sparkles size={12} className="text-yellow-400" />,
    content: <FileText size={12} className="text-q-accent" />,
    image_start: <Image size={12} className="text-q-accent" />,
    image_done: <CheckCircle2 size={12} className="text-green-400" />,
    image_fail: <X size={12} className="text-red-400" />,
    assemble: <Package size={12} className="text-q-accent" />,
    save: <Save size={12} className="text-cyan-400" />,
    done: <PartyPopper size={12} className="text-emerald-400" />,
    error: <X size={12} className="text-red-500" />,
};

const EventRow: React.FC<{ event: GenerationEvent; isLatest: boolean }> = ({ event, isLatest }) => {
    const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isImage = event.type === 'image_done' && event.imageUrl;

    return (
        <div className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${
            isLatest ? 'bg-q-surface-overlay/20' : '' }`}
            style={isLatest ? { animation: 'aws-fadeIn 0.3s ease' } : undefined}
        >
            <div className="mt-0.5 flex-shrink-0">{EVENT_ICONS[event.type]}</div>
            <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${event.type === 'error' || event.type === 'image_fail' ? 'text-red-400/80' : 'text-q-text-secondary'}`}>
                    {event.message}
                </p>
                {isImage && (
                    <img src={event.imageUrl} alt={event.imageKey || 'generated'}
                        className="mt-1.5 h-16 w-auto rounded-md border border-q-border object-cover sm:hidden"
                        loading="lazy" />
                )}
            </div>
            <span className="text-[9px] text-q-text-secondary/40 flex-shrink-0 font-mono mt-0.5">{time}</span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// URL INPUT MODAL — For website extraction
// ═══════════════════════════════════════════════════════════════════════════

const UrlInputModal: React.FC<{ onSubmit: (url: string) => void; onClose: () => void }> = ({ onSubmit, onClose }) => {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        let normalizedUrl = url.trim();
        if (!normalizedUrl) return;

        // Auto-add https:// if missing
        if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        // Validate URL format
        try {
            new URL(normalizedUrl);
            setError('');
            onSubmit(normalizedUrl);
        } catch {
            setError(t('aiTemplateStudio.extraction.urlFormatHint'));
        }
    };

    return (
        <div className="absolute inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ animation: 'aws-fadeIn 0.2s ease' }}>
            <div className="w-full max-w-md mx-4 bg-q-surface border border-q-border rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'aws-slideUp 0.25s ease' }}>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-q-border bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-q-accent p-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <Globe className="text-primary-foreground w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-q-text">{t('aiTemplateStudio.extraction.modalTitle')}</h3>
                            <p className="text-xs text-q-text-secondary mt-0.5">{t('aiTemplateStudio.extraction.modalDescription')}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-q-text-secondary/50" />
                            <input
                                ref={inputRef}
                                type="url"
                                value={url}
                                onChange={e => { setUrl(e.target.value); setError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                                placeholder={t('aiTemplateStudio.extraction.urlPlaceholder')}
                                className="w-full bg-q-bg border border-q-border rounded-xl pl-10 pr-4 py-3 text-sm text-q-text placeholder:text-q-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        {error && <p className="text-xs text-red-400 px-1">{error}</p>}
                        <p className="text-[10px] text-q-text-secondary/50 px-1">{t('aiTemplateStudio.extraction.urlFormatHint')}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-q-border text-q-text-secondary text-sm font-medium hover:bg-q-surface-overlay/30 transition-colors"
                    >
                        {t('aiTemplateStudio.extraction.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!url.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Globe size={14} />
                        {t('aiTemplateStudio.extraction.extractButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminTemplateStudio;
