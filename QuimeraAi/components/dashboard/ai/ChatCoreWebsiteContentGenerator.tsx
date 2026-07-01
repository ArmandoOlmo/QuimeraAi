import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle, Loader2, Send, Sparkles, User } from 'lucide-react';
import type { AiAssistantConfig, Project } from '../../../types';
import {
    buildChatCoreWebsiteSystemInstruction,
    buildChatCoreWebsiteUserPrompt,
    extractChatCoreWebsiteContext,
    mergeChatCoreWebsiteDraft,
    parseChatCoreWebsiteGuideResult,
    type ChatCoreGuideMessage,
    type ChatCoreWebsiteContentDraft,
} from '../../../utils/chatbotEngine/chatCoreWebsiteContent';
import {
    extractTextFromResponse,
    generateChatContentViaProxy,
} from '../../../utils/geminiProxyClient';

interface ChatCoreWebsiteContentGeneratorProps {
    project: Project;
    config: AiAssistantConfig;
    userId?: string;
    onApplyConfig: (config: AiAssistantConfig) => void;
}

const PREVIEW_FIELDS: Array<{
    key: keyof ChatCoreWebsiteContentDraft;
    labelKey: string;
    label: string;
}> = [
    { key: 'businessProfile', labelKey: 'aiAssistant.dashboard.websiteContent.fields.businessProfile', label: 'Perfil del negocio' },
    { key: 'productsServices', labelKey: 'aiAssistant.dashboard.websiteContent.fields.productsServices', label: 'Productos y servicios' },
    { key: 'policiesContact', labelKey: 'aiAssistant.dashboard.websiteContent.fields.policiesContact', label: 'Politicas y contacto' },
    { key: 'specialInstructions', labelKey: 'aiAssistant.dashboard.websiteContent.fields.specialInstructions', label: 'Instrucciones operativas' },
];

const ChatCoreWebsiteContentGenerator: React.FC<ChatCoreWebsiteContentGeneratorProps> = ({
    project,
    config,
    userId,
    onApplyConfig,
}) => {
    const { t, i18n } = useTranslation();
    const websiteContext = useMemo(() => extractChatCoreWebsiteContext(project), [project]);
    const [messages, setMessages] = useState<ChatCoreGuideMessage[]>([
        {
            role: 'model',
            text: t(
                'aiAssistant.dashboard.websiteContent.initialMessage',
                'Listo para crear el contenido del ChatCore desde el website guardado.'
            ),
        },
    ]);
    const [input, setInput] = useState('');
    const [draft, setDraft] = useState<ChatCoreWebsiteContentDraft | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [applied, setApplied] = useState(false);

    const isSpanish = i18n.language?.toLowerCase().startsWith('es');

    const runGuide = async (message: string) => {
        const userMessage = message.trim();
        if (!userMessage || isGenerating) return;

        setIsGenerating(true);
        setError('');
        setApplied(false);
        setInput('');

        const nextUserMessage: ChatCoreGuideMessage = { role: 'user', text: userMessage };
        const history = messages;
        setMessages(prev => [...prev, nextUserMessage]);

        try {
            const prompt = buildChatCoreWebsiteUserPrompt({
                project,
                currentConfig: config,
                websiteContext,
                userMessage,
            });
            const response = await generateChatContentViaProxy(
                project.id,
                history,
                prompt,
                buildChatCoreWebsiteSystemInstruction(),
                'gemini-2.5-flash',
                {
                    temperature: 0.35,
                    maxOutputTokens: 8192,
                    billing: {
                        projectId: project.id,
                        userId,
                        operation: 'chatcore_website_content_generation',
                        description: 'Generate ChatCore content from saved website context',
                        metadata: {
                            source: 'chatcore_dashboard',
                            websiteSections: websiteContext.sectionCount,
                            websitePages: websiteContext.pageCount,
                        },
                    },
                },
                userId
            );
            const text = extractTextFromResponse(response);
            const result = parseChatCoreWebsiteGuideResult(text, project.name);
            const assistantText = result.assistantReply || (
                result.ready
                    ? t('aiAssistant.dashboard.websiteContent.draftReady', 'Borrador listo para revisar.')
                    : text
            );

            setMessages(prev => [...prev, { role: 'model', text: assistantText }]);
            if (result.draft) setDraft(result.draft);
        } catch (err) {
            console.error('[ChatCoreWebsiteContentGenerator] Generation failed:', err);
            setError(t('aiAssistant.dashboard.websiteContent.error', 'No se pudo generar el contenido ahora.'));
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    text: t('aiAssistant.dashboard.websiteContent.errorReply', 'No pude completar la generación. Inténtalo de nuevo o añade más detalles.'),
                },
            ]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateFromWebsite = () => {
        runGuide(isSpanish
            ? 'Genera el contenido completo del ChatCore usando el website guardado como fuente principal.'
            : 'Generate the complete ChatCore content using the saved website as the primary source.'
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        runGuide(input);
    };

    const handleApply = () => {
        if (!draft) return;
        onApplyConfig(mergeChatCoreWebsiteDraft(config, draft));
        setApplied(true);
    };

    return (
        <div className="quimera-dashboard-panel-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                            {t('aiAssistant.dashboard.websiteContent.title', 'Contenido desde website')}
                        </h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-q-text-muted">
                        <span className="rounded-full border border-q-border bg-q-surface px-2.5 py-1">
                            {t('aiAssistant.dashboard.websiteContent.pages', '{{count}} páginas', { count: websiteContext.pageCount })}
                        </span>
                        <span className="rounded-full border border-q-border bg-q-surface px-2.5 py-1">
                            {t('aiAssistant.dashboard.websiteContent.sections', '{{count}} secciones', { count: websiteContext.sectionCount })}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleGenerateFromWebsite}
                    disabled={isGenerating || !websiteContext.hasUsableContent}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {t('aiAssistant.dashboard.websiteContent.generate', 'Generar desde website')}
                </button>
            </div>

            {!websiteContext.hasUsableContent && (
                <div className="mt-4 rounded-lg border border-q-accent/25 bg-q-accent/10 px-4 py-3 text-sm text-q-text-muted">
                    {t('aiAssistant.dashboard.websiteContent.needsWebsite', 'Guarda el website con contenido antes de generar desde la página.')}
                </div>
            )}

            <div className="mt-5 max-h-[320px] space-y-3 overflow-y-auto rounded-lg border border-q-border bg-q-bg p-3">
                {messages.map((message, index) => {
                    const isUser = message.role === 'user';
                    return (
                        <div
                            key={`${message.role}-${index}-${message.text.slice(0, 12)}`}
                            className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            {!isUser && (
                                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Bot size={14} />
                                </span>
                            )}
                            <div className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-q-border bg-q-surface text-foreground'
                                }`}>
                                {message.text}
                            </div>
                            {isUser && (
                                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-q-text-muted">
                                    <User size={14} />
                                </span>
                            )}
                        </div>
                    );
                })}
                {isGenerating && (
                    <div className="flex items-center gap-2 text-sm text-q-text-muted">
                        <Loader2 size={16} className="animate-spin" />
                        {t('aiAssistant.dashboard.websiteContent.thinking', 'Generando...')}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={isGenerating}
                    className="min-w-0 flex-1 rounded-lg border border-q-border bg-q-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-q-text-muted focus:border-primary"
                    placeholder={t('aiAssistant.dashboard.websiteContent.placeholder', 'Añade detalles o pide un ajuste...')}
                />
                <button
                    type="submit"
                    disabled={isGenerating || !input.trim()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-q-border text-q-text-muted transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t('aiAssistant.dashboard.websiteContent.send', 'Enviar')}
                >
                    <Send size={16} />
                </button>
            </form>

            {error && (
                <div className="mt-3 rounded-lg border border-q-error/25 bg-q-error/10 px-4 py-3 text-sm text-q-error">
                    {error}
                </div>
            )}

            {draft && (
                <div className="mt-5 rounded-lg border border-q-border bg-q-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="font-semibold text-foreground">
                                {t('aiAssistant.dashboard.websiteContent.previewTitle', 'Borrador del ChatCore')}
                            </h4>
                            <p className="text-xs text-q-text-muted">
                                {draft.faqs.length} FAQs · {draft.knowledgeDocument?.content.length || 0} chars
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-q-success/30 bg-q-success/10 px-4 text-sm font-semibold text-q-success transition-colors hover:bg-q-success/15"
                        >
                            <CheckCircle size={16} />
                            {applied
                                ? t('aiAssistant.dashboard.websiteContent.applied', 'Aplicado')
                                : t('aiAssistant.dashboard.websiteContent.apply', 'Aplicar al ChatCore')}
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                        {PREVIEW_FIELDS.map(field => {
                            const value = draft[field.key];
                            if (typeof value !== 'string' || !value) return null;
                            return (
                                <div key={field.key} className="rounded-lg border border-q-border/60 bg-q-bg p-3">
                                    <div className="text-xs font-bold uppercase tracking-wider text-q-text-muted">
                                        {t(field.labelKey, field.label)}
                                    </div>
                                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-foreground">
                                        {value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatCoreWebsiteContentGenerator;
