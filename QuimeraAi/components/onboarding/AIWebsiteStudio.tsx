/**
 * AIWebsiteStudio
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
    X, Mic, MicOff, Send, Loader2,
    Building2, Palette, Phone,
    Zap, LayoutTemplate, Image,
    RefreshCcw, Volume2, Globe, Upload, Plus, Type
} from 'lucide-react';
import { useUI } from '../../contexts/core/UIContext';
import { useAIWebsiteStudio, BusinessBrief, GenerationPhase } from './hooks/useAIWebsiteStudio';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import ColorControl from '../ui/ColorControl';
import { FontFamily, PageSection } from '../../types/ui';
import ImagePicker from '../ui/ImagePicker';
import FontFamilyPicker from '../ui/FontFamilyPicker';
import { SortableComponentChips } from '../ui/SortableComponentChips';
import { WebsitePlanReview } from './WebsitePlanReview';
import { GeneratedWebsitePreview } from './GeneratedWebsitePreview';
import StudioActionBar from '../studio/StudioActionBar';
import StudioGenerationOverlay from '../studio/StudioGenerationOverlay';
import StudioSummaryPanel from '../studio/StudioSummaryPanel';
import { getAiStudioSummary, getAiStudioSummaryCopy, type StudioUXSummary } from '../../utils/studioUX';
import { CollapsibleSection, CollapsiblePanelHeader, useCollapsibleSections } from '../ui/CollapsibleSection';
import PortalAnchoredMenu from '../ui/PortalAnchoredMenu';
import { useSafeFiles } from '../../contexts/files';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const AIWebsiteStudio: React.FC = () => {
    const { isOnboardingOpen, setIsOnboardingOpen, onboardingMode } = useUI();
    const studio = useAIWebsiteStudio();
    const [isMobileBriefOpen, setIsMobileBriefOpen] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { t } = useTranslation();
    const translate = (key: string, options?: Record<string, unknown>) => t(key, options);

    // Auto-open: when ?onboarding=ai was used, automatically open the studio
    useEffect(() => {
        if (onboardingMode === 'ai-studio') {
            try {
                const autoOpen = localStorage.getItem('autoOpenStudio');
                if (autoOpen === 'true') {
                    localStorage.removeItem('autoOpenStudio');
                    setIsOnboardingOpen(true);
                }
            } catch (e) { /* ignore */ }
        }
    }, [onboardingMode, setIsOnboardingOpen]);

    // Initialize when opened
    useEffect(() => {
        if (isOnboardingOpen && onboardingMode === 'ai-studio') {
            studio.initStudio();
            let initialPrompt = '';
            let shouldStartVoice = false;
            try {
                initialPrompt = localStorage.getItem('aiStudioInitialPrompt') || '';
                if (initialPrompt) localStorage.removeItem('aiStudioInitialPrompt');
                shouldStartVoice = localStorage.getItem('aiStudioStartVoice') === 'true';
                if (shouldStartVoice) localStorage.removeItem('aiStudioStartVoice');
            } catch (e) { /* ignore */ }

            if (initialPrompt.trim()) {
                const timer = window.setTimeout(() => {
                    studio.setInput(initialPrompt);
                    inputRef.current?.focus();
                }, 80);
                return () => window.clearTimeout(timer);
            }

            if (shouldStartVoice) {
                const timer = window.setTimeout(() => {
                    studio.startVoiceSession();
                }, 120);
                return () => window.clearTimeout(timer);
            }
        }
    }, [isOnboardingOpen, onboardingMode]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOnboardingOpen && onboardingMode === 'ai-studio') {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOnboardingOpen, onboardingMode]);

    // Don't render if not in ai-studio mode or not open
    if (!isOnboardingOpen || onboardingMode !== 'ai-studio') return null;

    const handleClose = () => {
        // Block close only during active generation — allow when done
        const isDone = studio.generationPhase?.phase === 'done';
        if ((studio.isGenerating && !isDone) || studio.isSavingGeneratedProject) return;
        studio.stopVoiceSession();
        setIsOnboardingOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            studio.sendMessage(studio.input);
        }
    };

    const summary = getAiStudioSummary({
        brief: studio.businessBrief,
        websitePlan: studio.websitePlan,
        selectedComponents: studio.businessBrief.suggestedComponents,
        generatedProject: studio.generatedProject,
        copy: getAiStudioSummaryCopy(translate),
    });

    const focusInput = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(9,4,17,0.72)] p-0 backdrop-blur-sm lg:p-4" style={{ animation: 'aws-fadeIn 0.25s ease' }}>
            {/* Backdrop click — hidden on mobile since the studio keeps a full-height workspace there */}
            <div className="absolute inset-0 hidden lg:block" onClick={studio.isGenerating || studio.isSavingGeneratedProject ? undefined : handleClose} />

            {/* Modal Container — popup on desktop, full-height workspace on mobile */}
            <div
                className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-q-bg shadow-none lg:h-[90vh] lg:max-h-[860px] lg:max-w-6xl lg:rounded-2xl lg:border lg:border-q-border lg:shadow-2xl"
                style={{ animation: 'aws-slideUp 0.3s ease' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-3 lg:px-5 py-2.5 lg:py-3 border-b border-q-border/70 bg-q-bg/85 backdrop-blur-xl">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        {/* Branding icon */}
                        <div className="relative flex-shrink-0">
                            <img src="/logos/quimera-icon.svg" alt="Quimera" className="w-7 h-7 lg:w-8 lg:h-8" />
                            {studio.isVoiceActive && (
                                <span className="absolute -top-1 -right-1 w-2.5 lg:w-3 h-2.5 lg:h-3 bg-q-success rounded-full border-2 border-q-bg animate-pulse" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm lg:text-lg font-bold text-q-text flex items-center gap-1.5 lg:gap-2">
                                <span className="truncate">{t('aiWebsiteStudio.title')}</span>
                            </h2>
                            <p className="text-[10px] lg:text-xs text-q-text-secondary hidden sm:block">{t('aiWebsiteStudio.poweredBy')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                        {/* Mobile brief toggle — compact icon-only on small, label on med */}
                        {!studio.generatedProject && (
                            <button
                                onClick={() => setIsMobileBriefOpen(!isMobileBriefOpen)}
                                className="lg:hidden h-8 w-8 sm:w-auto sm:px-3 rounded-lg text-q-text-secondary text-xs hover:text-q-accent hover:bg-primary/10 transition-colors flex items-center justify-center sm:justify-start gap-1.5"
                            >
                                <LayoutTemplate size={15} />
                                <span className="hidden sm:inline">{t('aiWebsiteStudio.brief')}</span>
                                {studio.businessBrief.readinessScore > 0 && (
                                    <span className="hidden sm:inline ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-q-accent text-[10px] font-bold">
                                        {studio.businessBrief.readinessScore}%
                                    </span>
                                )}
                            </button>
                        )}
                        {/* Import website — icon-only on mobile, label on desktop */}
                        <button
                            onClick={() => studio.setShowUrlModal(true)}
                            disabled={studio.isExtracting || studio.isGenerating || studio.isSavingGeneratedProject || studio.isAccessLoading}
                            className="h-8 w-8 lg:w-auto lg:px-3 flex items-center justify-center lg:justify-start gap-1.5 rounded-lg text-q-accent hover:bg-primary/10 lg:bg-primary/10 text-xs font-medium lg:hover:bg-primary/20 transition-colors disabled:opacity-40"
                            title={t('aiWebsiteStudio.extraction.buttonLabel')}
                        >
                            {studio.isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                            <span className="hidden lg:inline">{t('aiWebsiteStudio.extraction.buttonLabel')}</span>
                        </button>
                        {/* Reset — bare icon */}
                        <button
                            onClick={() => { studio.stopVoiceSession(); studio.initStudio(); }}
                            disabled={studio.isGenerating || studio.isSavingGeneratedProject}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors disabled:opacity-30"
                            title={t('aiWebsiteStudio.reset')}
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        {/* Close */}
                        <button
                            onClick={handleClose}
                            disabled={studio.isGenerating || studio.isSavingGeneratedProject}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors disabled:opacity-30"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {studio.generatedProject ? (
                    <GeneratedWebsitePreview
                        project={studio.generatedProject}
                        isSaving={studio.isSavingGeneratedProject}
                        saveError={studio.generatedProjectSaveError}
                        onSaveAndOpen={studio.saveGeneratedProjectAndOpenEditor}
                        onRegenerate={studio.regenerateGeneratedWebsite}
                        onBackToPlan={studio.returnToPlanFromGeneratedPreview}
                    />
                ) : (
                    <>
                {/* ── Body ── */}
                <div className="flex flex-1 min-h-0 relative">
                    {/* LEFT: Chat Panel */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Messages */}
                        <div ref={studio.chatRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 custom-scrollbar">
                            <div className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
                            {studio.messages.map((msg, i) => (
                                <ChatBubble key={i} message={msg} />
                            ))}
                            {/* Live voice transcripts */}
                            {studio.liveUserTranscript && (
                                <div className="flex justify-end animate-pulse">
                                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed bg-primary/15 border border-primary/30 text-q-text">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] text-q-accent mb-1">
                                            <Mic className="w-3 h-3" /> {t('aiWebsiteStudio.chat.stopVoice')}
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
                                        {t('aiWebsiteStudio.chat.thinking')}
                                    </div>
                                </div>
                            )}
                            {/* Generation progress inline hint */}
                            {studio.generationPhase && studio.generationPhase.phase !== 'done' && (
                                <div className="mx-auto max-w-md bg-primary/10 border border-primary/20 rounded-xl p-3 text-center text-xs text-q-text-secondary">
                                    <Loader2 size={14} className="animate-spin inline mr-1 text-q-accent" />
                                    {t('aiWebsiteStudio.chat.generatingHint')}
                                </div>
                            )}
                            </div>
                        </div>

                        {/* ── Input Bar — matches Email AI Studio pattern ── */}
                        <div className="border-t border-q-border/70 bg-q-bg/85 p-3 backdrop-blur-xl lg:p-5">
                            <div className="quimera-ai-launcher mx-auto max-w-3xl">
                            <div className="flex flex-shrink-0 items-center gap-2">
                                {/* Voice button — fixed size-10 */}
                                {studio.isVoiceActive ? (
                                    <button
                                        onClick={studio.stopVoiceSession}
                                        className="no-min-touch size-10 flex shrink-0 items-center justify-center rounded-xl p-0 bg-q-error/20 text-q-error hover:bg-q-error/30 transition-all touch-manipulation"
                                        title={t('aiWebsiteStudio.chat.stopVoice')}
                                    >
                                        <MicOff className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={studio.startVoiceSession}
                                        disabled={studio.isVoiceConnecting || studio.isGenerating}
                                        className="no-min-touch size-10 flex shrink-0 items-center justify-center rounded-xl p-0 bg-q-surface-overlay/40 text-q-text-secondary hover:text-q-accent hover:bg-primary/10 transition-all disabled:opacity-50 touch-manipulation"
                                        title={t('aiWebsiteStudio.chat.startVoice')}
                                    >
                                        {studio.isVoiceConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                                    </button>
                                )}
                                {/* Text input — min-h-[40px] to match buttons */}
                                <textarea
                                    ref={inputRef}
                                    value={studio.input}
                                    onChange={e => studio.setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={studio.isVoiceActive ? t('aiWebsiteStudio.chat.voicePlaceholder') : t('aiWebsiteStudio.chat.textPlaceholder')}
                                    disabled={studio.isVoiceActive || studio.isGenerating}
                                    rows={1}
                                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-q-text placeholder:text-q-text-secondary/55 resize-none focus:outline-none min-h-[40px] max-h-[120px] transition-all disabled:opacity-40"
                                />
                                {/* Send button — fixed size-10 */}
                                <button
                                    onClick={() => studio.sendMessage(studio.input)}
                                    disabled={!studio.input.trim() || studio.isThinking || studio.isVoiceActive || studio.isGenerating}
                                    className="no-min-touch size-10 flex shrink-0 items-center justify-center rounded-full p-0 bg-q-accent text-q-text-on-accent hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-30 disabled:hover:shadow-none touch-manipulation"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Voice active indicator */}
                            {studio.isVoiceActive && (
                                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-q-success">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-q-success rounded-full animate-pulse" />
                                        {t('aiWebsiteStudio.chat.voicePlaceholder')}
                                    </span>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Business Brief Panel (desktop) */}
                    <div className="hidden lg:flex w-[360px] flex-col border-l border-q-border/70 bg-q-surface/55 backdrop-blur-xl overflow-y-auto custom-scrollbar">
                        <BriefPanel summary={summary} brief={studio.businessBrief} canGenerate={studio.canGenerate} isGenerating={studio.isGenerating} onGenerate={studio.startGeneration} referenceImages={studio.referenceImages} onAddReferenceImage={studio.addReferenceImage} onRemoveReferenceImage={studio.removeReferenceImage} onUpdateColor={studio.updateBriefColor} onUpdateFont={studio.updateBriefFont} onToggleComponent={studio.toggleBriefComponent} onSetComponents={studio.setBriefComponents} availableComponents={studio.availableComponents} />
                    </div>

                    {/* RIGHT: Business Brief Panel (mobile bottom sheet) */}
                    {isMobileBriefOpen && (
                        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
                            <div className="absolute inset-0 bg-q-text/50" onClick={() => setIsMobileBriefOpen(false)} style={{ animation: 'aws-fadeIn 0.2s ease' }} />
                            <div
                                className="relative bg-q-surface border-t border-q-border rounded-t-2xl flex flex-col overflow-hidden"
                                style={{ maxHeight: '75vh', animation: 'aws-slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
                            >
                                {/* Drag handle */}
                                <div className="flex justify-center pt-3 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-q-text-secondary/30" />
                                </div>
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-2 border-b border-q-border">
                                    <span className="text-sm font-semibold text-q-text flex items-center gap-2">
                                        <LayoutTemplate size={14} className="text-q-accent" />
                                        {t('aiWebsiteStudio.briefPanel.title')}
                                    </span>
                                    <button onClick={() => setIsMobileBriefOpen(false)} className="p-1.5 rounded-lg text-q-text-secondary hover:text-q-text hover:bg-q-surface-overlay/40 transition-colors"><X size={16} /></button>
                                </div>
                                {/* Content — scrollable */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <BriefPanel summary={summary} brief={studio.businessBrief} canGenerate={studio.canGenerate} isGenerating={studio.isGenerating} onGenerate={studio.startGeneration} referenceImages={studio.referenceImages} onAddReferenceImage={studio.addReferenceImage} onRemoveReferenceImage={studio.removeReferenceImage} onUpdateColor={studio.updateBriefColor} onUpdateFont={studio.updateBriefFont} onToggleComponent={studio.toggleBriefComponent} onSetComponents={studio.setBriefComponents} availableComponents={studio.availableComponents} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <StudioActionBar
                    primaryLabel={studio.isGenerating ? t('aiWebsiteStudio.flow.actions.generatingWebsite') : t('aiWebsiteStudio.flow.actions.generateWebsite')}
                    onPrimary={studio.startGeneration}
                    primaryDisabled={!studio.canGenerate || studio.isAccessLoading}
                    loading={studio.isGenerating}
                    helperText={summary.readiness.canGenerate
                        ? t('aiWebsiteStudio.flow.actions.readyHelper')
                        : summary.readiness.helperText}
                    secondaryActions={[
                        {
                            label: t('aiWebsiteStudio.flow.actions.improveBrief'),
                            onClick: () => studio.sendMessage(t('aiWebsiteStudio.flow.actions.improveBriefPrompt')),
                            disabled: studio.isThinking || studio.isGenerating,
                        },
                        {
                            label: t('aiWebsiteStudio.flow.actions.addDetails'),
                            onClick: focusInput,
                            disabled: studio.isGenerating,
                        },
                    ]}
                />

                {/* URL EXTRACTION MODAL */}
                {studio.showUrlModal && (
                    <UrlInputModal
                        onSubmit={studio.extractWebsiteData}
                        onClose={() => studio.setShowUrlModal(false)}
                    />
                )}

                {/* GENERATION OVERLAY */}
                {studio.generationPhase && <GenerationOverlay phase={studio.generationPhase} businessName={studio.businessBrief.businessName} />}

                {studio.showPlanReview && studio.websitePlan && (
                    <WebsitePlanReview
                        plan={studio.websitePlan}
                        availableComponents={studio.availableComponents}
                        isGenerating={studio.isGenerating}
                        onPlanChange={studio.setWebsitePlan}
                        onConfirm={studio.confirmWebsitePlan}
                        onClose={studio.returnToChatFromPlanReview}
                    />
                )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes aws-fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes aws-slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes aws-slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes aws-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            `}</style>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CHAT BUBBLE — uses editor tokens for theme support
// ═══════════════════════════════════════════════════════════════════════════

const ChatBubble: React.FC<{ message: { role: 'user' | 'model'; text: string; isVoice?: boolean } }> = ({ message }) => {
    const { t } = useTranslation();
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
                        <Volume2 size={10} /> {t('aiWebsiteStudio.voice')}
                    </div>
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS BRIEF PANEL — uses editor tokens
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'surface', 'text'] as const;

const BriefPanel: React.FC<{
    summary: StudioUXSummary;
    brief: BusinessBrief;
    canGenerate: boolean;
    isGenerating: boolean;
    onGenerate: () => void;
    referenceImages: string[];
    onAddReferenceImage: (imageUrl: string) => void;
    onRemoveReferenceImage: (index: number) => void;
    onUpdateColor: (colorKey: string, newColor: string) => void;
    onUpdateFont: (fontKey: 'header' | 'body' | 'button', newFont: FontFamily) => void;
    onToggleComponent: (component: PageSection) => void;
    onSetComponents: (components: PageSection[]) => void;
    availableComponents: { key: PageSection; label: string }[];
}> = ({ summary, brief, referenceImages, onAddReferenceImage, onRemoveReferenceImage, onUpdateColor, onUpdateFont, onToggleComponent, onSetComponents, availableComponents }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const componentPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const filesCtx = useSafeFiles();
    const [isDragging, setIsDragging] = useState(false);
    const [showComponentPicker, setShowComponentPicker] = useState(false);
    const [showLibraryPicker, setShowLibraryPicker] = useState(false);
    const { openSections, toggle, expandAll, collapseAll } = useCollapsibleSections({
        business: true,
        services: true,
        contact: true,
        colors: true,
        typography: true,
        components: true,
        referenceImages: true,
    });

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
                const libraryUrl = filesCtx?.hasActiveProject ? await filesCtx.uploadFile(file) : undefined;
                if (libraryUrl) {
                    onAddReferenceImage(libraryUrl);
                } else {
                    const base64 = await fileToBase64(file);
                    if (base64) onAddReferenceImage(base64);
                }
            } catch (e) { console.error('Error converting file:', e); }
        }
    };

    // Components not yet selected
    const availableToAdd = availableComponents.filter(c => !brief.suggestedComponents.includes(c.key));
    const businessRows = [
        { label: t('aiWebsiteStudio.briefPanel.name'), value: brief.businessName },
        { label: t('aiWebsiteStudio.briefPanel.industry'), value: brief.industry },
        { label: t('aiWebsiteStudio.briefPanel.tagline'), value: brief.tagline },
    ].filter(row => formatBriefValue(row.value));
    const contactRows = [
        { label: t('aiWebsiteStudio.briefPanel.email'), value: brief.contactInfo.email },
        { label: t('aiWebsiteStudio.briefPanel.phone'), value: brief.contactInfo.phone },
        { label: t('aiWebsiteStudio.briefPanel.address'), value: brief.contactInfo.address },
        { label: t('aiWebsiteStudio.briefPanel.hours'), value: brief.contactInfo.businessHours },
    ].filter(row => formatBriefValue(row.value));

    return (
        <div className="flex-1 flex flex-col gap-3 p-3 text-xs">
            <StudioSummaryPanel
                summary={summary}
                reviewLabel={t('studioUX.summary.aiGeneratedNeedsReview')}
                missingOnly
                missingTitle={t('aiWebsiteStudio.briefPanel.missingInformation')}
                missingEmptyLabel={t('aiWebsiteStudio.briefPanel.noMissingInformation')}
                missingRequiredLabel={t('aiWebsiteStudio.briefPanel.required')}
                missingReviewLabel={t('aiWebsiteStudio.briefPanel.reviewLater')}
            />

            <CollapsiblePanelHeader
                title={t('aiWebsiteStudio.briefPanel.title')}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
            />

            {/* Business Info */}
            {(businessRows.length > 0 || brief.description) && (
                <CollapsibleSection title={t('aiWebsiteStudio.briefPanel.business')} icon={<Building2 size={14} />} isOpen={openSections.business} onToggle={() => toggle('business')}>
                    <div className="space-y-1.5">
                        {businessRows.map(row => (
                            <BriefCompactField key={row.label} label={row.label} value={row.value} />
                        ))}
                    </div>
                    {brief.description && (
                        <p className="mt-2 line-clamp-3 rounded-md border border-q-border/60 bg-q-surface/35 px-2 py-1.5 text-[11px] leading-relaxed text-q-text-secondary">
                            {brief.description}
                        </p>
                    )}
                </CollapsibleSection>
            )}

            {/* Services */}
            {brief.services.length > 0 && (
                <CollapsibleSection title={`${t('aiWebsiteStudio.briefPanel.services')} (${brief.services.length})`} icon={<Zap size={14} />} isOpen={openSections.services} onToggle={() => toggle('services')}>
                    <div className="flex flex-wrap gap-1.5">
                        {brief.services.map((s, i) => (
                            <span key={i} className="rounded-md border border-q-border/60 bg-q-surface/45 px-2 py-1 text-[10px] font-medium text-q-text-secondary">
                                {formatBriefValue(s.name)}
                            </span>
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* Contact */}
            {contactRows.length > 0 && (
                <CollapsibleSection title={t('aiWebsiteStudio.briefPanel.contact')} icon={<Phone size={14} />} isOpen={openSections.contact} onToggle={() => toggle('contact')}>
                    <div className="space-y-1.5">
                        {contactRows.map(row => (
                            <BriefCompactField key={row.label} label={row.label} value={row.value} />
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* Color Palette */}
            <CollapsibleSection title={t('aiWebsiteStudio.briefPanel.colors')} icon={<Palette size={14} />} isOpen={openSections.colors} onToggle={() => toggle('colors')}>
                <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
                    {COLOR_KEYS.map(key => (
                        <ColorTokenControl
                            key={key}
                            label={t(`aiWebsiteStudio.briefPanel.colorTokens.${key}`)}
                            value={brief.colorPalette[key]}
                            onChange={(newColor) => onUpdateColor(key, newColor)}
                        />
                    ))}
                </div>
            </CollapsibleSection>

            {/* Typography */}
            <CollapsibleSection title={t('aiWebsiteStudio.briefPanel.typography')} icon={<Type size={14} />} isOpen={openSections.typography} onToggle={() => toggle('typography')}>
                <div className="space-y-2">
                    {(['header', 'body', 'button'] as const).map(key => (
                        <div key={key} className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-q-text-secondary">
                                {t(`aiWebsiteStudio.briefPanel.fontRoles.${key}`)}
                            </span>
                            <FontFamilyPicker
                                label=""
                                value={brief.fontPairing[key]}
                                onChange={(val) => onUpdateFont(key, val)}
                                showPreview={false}
                                compact
                            />
                        </div>
                    ))}
                </div>
            </CollapsibleSection>

            {/* Components — Uniform compact chips */}
            <CollapsibleSection title={`${t('aiWebsiteStudio.briefPanel.components')} (${brief.suggestedComponents.length})`} icon={<LayoutTemplate size={14} />} isOpen={openSections.components} onToggle={() => toggle('components')}>
                <div className="flex flex-wrap gap-[3px]">
                    <SortableComponentChips
                        items={brief.suggestedComponents}
                        onChange={onSetComponents}
                        onRemove={onToggleComponent}
                    />
                    {/* Inline add button */}
                    <div>
                        <button
                            ref={componentPickerTriggerRef}
                            onClick={() => setShowComponentPicker(!showComponentPicker)}
                            className="inline-flex items-center gap-0.5 h-[22px] px-1.5 rounded border border-dashed border-q-border text-q-text-secondary/60 hover:border-q-accent/40 hover:text-q-accent text-[9px] font-medium transition-all cursor-pointer leading-none"
                        >
                            <Plus size={9} />
                        </button>
                        <PortalAnchoredMenu
                            isOpen={showComponentPicker && availableToAdd.length > 0}
                            onClose={() => setShowComponentPicker(false)}
                            triggerRef={componentPickerTriggerRef}
                            width={176}
                            maxHeight={208}
                            className="py-1 shadow-2xl shadow-black/40"
                        >
                            {availableToAdd.map(comp => (
                                <button
                                    key={comp.key}
                                    onClick={() => { onToggleComponent(comp.key); setShowComponentPicker(false); }}
                                    className="w-full text-left px-2.5 py-1 text-[10px] text-q-text-secondary hover:bg-q-accent/10 hover:text-q-accent transition-colors cursor-pointer"
                                >
                                    {comp.label}
                                </button>
                            ))}
                        </PortalAnchoredMenu>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Reference Images */}
            <CollapsibleSection title={`${t('aiWebsiteStudio.briefPanel.referenceImages')} (${referenceImages.length}/14)`} icon={<Image size={14} />} isOpen={openSections.referenceImages} onToggle={() => toggle('referenceImages')}>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                />
                <div
                    className={`w-full rounded-lg border border-dashed px-3 py-2 transition-colors cursor-pointer group ${
                        isDragging ? 'border-q-accent bg-q-accent/10' : 'border-q-border hover:border-q-accent/50 bg-q-surface/30'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex items-center gap-2">
                        <Upload size={13} className="text-q-text-secondary group-hover:text-q-accent transition-colors" />
                        <div className="min-w-0">
                            <div className="truncate text-[10px] font-semibold text-q-text-secondary group-hover:text-q-accent">
                                {t('aiWebsiteStudio.briefPanel.uploadReference')}
                            </div>
                            <div className="truncate text-[9px] text-q-text-secondary/55">
                                {t('aiWebsiteStudio.briefPanel.uploadReferenceHint')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 w-full mt-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-1.5 rounded-lg border border-q-border hover:border-q-accent text-[10px] text-q-text-secondary hover:text-q-accent transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Upload size={12} /> {t('aiWebsiteStudio.briefPanel.localUpload')}
                    </button>
                    <button
                        onClick={() => setShowLibraryPicker(true)}
                        className="flex-1 py-1.5 rounded-lg border border-q-border hover:border-q-accent text-[10px] text-q-text-secondary hover:text-q-accent transition-colors flex items-center justify-center gap-1.5 bg-q-accent/10 text-q-accent border-q-accent/20"
                    >
                        <Image size={12} /> {t('aiWebsiteStudio.briefPanel.adminLibrary')}
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
                                    className="absolute inset-0 bg-q-text/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <X size={12} className="text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </CollapsibleSection>
        </div>
    );
};

// ── Brief sub-components ────────────────────────────────────────────────────

const ColorTokenControl: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-q-border/70 bg-q-surface/40 px-2 py-2">
        <ColorControl
            label={label}
            value={value}
            onChange={onChange}
            variant="editor"
            compact
        />
        <div className="min-w-0">
            <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-q-text-secondary">{label}</div>
            <div className="truncate font-mono text-[10px] text-q-text">{value?.toUpperCase?.() || value}</div>
        </div>
    </div>
);

function formatBriefValue(value: unknown): string {
    if (value == null || value === '') return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(formatBriefValue).filter(Boolean).join(', ');
    if (typeof value === 'object') {
        const record = value as Record<string, any>;
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (dayKeys.some(day => day in record)) {
            const labels: Record<string, string> = {
                monday: 'Mon',
                tuesday: 'Tue',
                wednesday: 'Wed',
                thursday: 'Thu',
                friday: 'Fri',
                saturday: 'Sat',
                sunday: 'Sun',
            };
            const openDays = dayKeys
                .map(day => {
                    const entry = record[day];
                    if (!entry || entry.isOpen === false) return '';
                    const hours = entry.openTime && entry.closeTime ? ` ${entry.openTime}-${entry.closeTime}` : '';
                    return `${labels[day]}${hours}`;
                })
                .filter(Boolean);
            return openDays.join(', ');
        }
        if ('es' in record || 'en' in record) {
            return String(record.es || record.en || Object.values(record).find(Boolean) || '');
        }
        return Object.values(record).map(formatBriefValue).filter(Boolean).join(', ');
    }
    return String(value);
}

const BriefCompactField: React.FC<{ label: string; value?: unknown }> = ({ label, value }) => {
    const displayValue = formatBriefValue(value);
    if (!displayValue) return null;

    return (
        <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-2 rounded-md border border-q-border/60 bg-q-surface/35 px-2 py-1.5">
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-q-text-secondary">{label}</span>
            <span className="truncate text-[11px] font-medium text-q-text">{displayValue}</span>
        </div>
    );
};

function getWebsiteProgressStep(phase: GenerationPhase, stepCount: number): number {
    if (phase.phase === 'done') return stepCount - 1;
    if (phase.phase === 'finalizing') return 5;
    if (phase.phase === 'images') return 4;
    if (phase.progress >= 35) return 2;
    if (phase.progress >= 5) return 1;
    return 0;
}

const GenerationOverlay: React.FC<{ phase: GenerationPhase; businessName: string }> = ({ phase, businessName }) => {
    const { t } = useTranslation();
    const isDone = phase.phase === 'done';
    const progressSteps = [
        t('aiWebsiteStudio.flow.progressSteps.understandingBusiness'),
        t('aiWebsiteStudio.flow.progressSteps.planningStructure'),
        t('aiWebsiteStudio.flow.progressSteps.selectingComponents'),
        t('aiWebsiteStudio.flow.progressSteps.creatingVisualDirection'),
        t('aiWebsiteStudio.flow.progressSteps.writingContent'),
        t('aiWebsiteStudio.flow.progressSteps.preparingPreview'),
        t('aiWebsiteStudio.flow.progressSteps.savingProject'),
    ];
    const progressStep = getWebsiteProgressStep(phase, progressSteps.length);

    return (
        <StudioGenerationOverlay
            phase={phase}
            title={isDone
                ? t('aiWebsiteStudio.generation.websiteCreated')
                : t('aiWebsiteStudio.generation.creating', { name: businessName || t('aiWebsiteStudio.generation.yourWebsite') })}
            progressLabel={t('studioUX.progress.generationProgress')}
            progressSteps={progressSteps}
            currentStep={progressStep}
            completedSteps={progressStep}
            eventsLabel={t('studioUX.progress.events')}
            imagesLabel={t('aiWebsiteStudio.generation.stats.images')}
            failedLabel={t('aiWebsiteStudio.generation.stats.failed')}
            generatedImagesLabel={t('aiWebsiteStudio.generation.generatedImages')}
        />
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
            setError(t('aiWebsiteStudio.extraction.urlFormatHint'));
        }
    };

    return (
        <div className="absolute inset-0 z-[101] flex items-center justify-center bg-q-text/60 backdrop-blur-sm" style={{ animation: 'aws-fadeIn 0.2s ease' }}>
            <div className="w-full max-w-md mx-4 bg-q-surface border border-q-border rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'aws-slideUp 0.25s ease' }}>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-q-border bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-q-accent p-2.5 rounded-xl shadow-lg shadow-primary/20">
                            <Globe className="text-primary-foreground w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-q-text">{t('aiWebsiteStudio.extraction.modalTitle')}</h3>
                            <p className="text-xs text-q-text-secondary mt-0.5">{t('aiWebsiteStudio.extraction.modalDescription')}</p>
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
                                placeholder={t('aiWebsiteStudio.extraction.urlPlaceholder')}
                                className="w-full bg-q-bg border border-q-border rounded-xl pl-10 pr-4 py-3 text-sm text-q-text placeholder:text-q-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        {error && <p className="text-xs text-q-error px-1">{error}</p>}
                        <p className="text-[10px] text-q-text-secondary/50 px-1">{t('aiWebsiteStudio.extraction.urlFormatHint')}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-q-border text-q-text-secondary text-sm font-medium hover:bg-q-surface-overlay/30 transition-colors"
                    >
                        {t('aiWebsiteStudio.extraction.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!url.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Globe size={14} />
                        {t('aiWebsiteStudio.extraction.extractButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIWebsiteStudio;
