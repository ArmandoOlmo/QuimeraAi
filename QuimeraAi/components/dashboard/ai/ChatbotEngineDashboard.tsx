import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Clock3,
    FlaskConical,
    Globe2,
    Inbox,
    ListChecks,
    Loader2,
    Lock,
    Mic,
    Palette,
    Radio,
    RefreshCw,
    ShieldCheck,
    UserCheck,
    Workflow,
    XCircle,
} from 'lucide-react';
import {
    assignChatbotEngineHandoff,
    createEmptyChatbotEngineRuntimeSnapshot,
    getChatbotEngineRuntimeSnapshot,
    resolveChatbotEngineHandoff,
    type ChatbotEngineRuntimeConversation,
    type ChatbotEngineRuntimeEvent,
    type ChatbotEngineRuntimeHandoff,
} from '../../../services/chatbotEngine/chatbotEngineDashboardService';
import {
    runProjectChatbotTestLab,
    type ChatbotTestLabRunResult,
} from '../../../services/chatbotEngine/chatbotEngineTestLabService';
import {
    type ChatbotSurfaceDeploymentKey,
    type ChatbotEngineConfigResult,
    updateProjectChatbotActionReview,
    updateProjectChatbotKnowledgeSourceReview,
    updateProjectChatbotSurfaceDeployment,
    updateProjectChatbotTestScenarioStatus,
    updateProjectChatbotVoiceSettings,
} from '../../../services/chatbotEngine/chatbotEngineConfigurationService';
import { buildEmailReviewQueueUrl } from '../../../services/email/emailReviewQueueLinkService';
import { useToast } from '../../../contexts/ToastContext';
import type {
    ChatbotActionBlueprint,
    ChatbotBlueprint,
    ChatbotKnowledgeSourceBlueprint,
} from '../../../types/businessBlueprint';
import type { Project } from '../../../types/project';
import {
    buildChatbotEngineDashboardSummary,
    resolveProjectChatbotBlueprint,
    type ChatbotEngineReadinessStatus,
    type ChatbotEngineSurfaceSummary,
} from '../../../utils/chatbotEngine/blueprintDashboard';

interface ChatbotEngineDashboardProps {
    project: Project;
    actorId?: string | null;
    onOpenAppearance: () => void;
    onOpenInbox: () => void;
    onOpenKnowledge: () => void;
    onOpenVoice: () => void;
    onProjectRefresh?: (projectOverride?: Project) => Promise<void> | void;
}

const statusClass: Record<ChatbotEngineReadinessStatus, string> = {
    ready: 'border-q-success/30 bg-q-success/10 text-q-success',
    review: 'border-q-accent/30 bg-q-accent/10 text-q-accent',
    blocked: 'border-q-error/30 bg-q-error/10 text-q-error',
};

const statusIcon: Record<ChatbotEngineReadinessStatus, React.ReactNode> = {
    ready: <CheckCircle2 size={14} />,
    review: <AlertTriangle size={14} />,
    blocked: <XCircle size={14} />,
};

function toTitle(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildProjectOverride(project: Project, result: ChatbotEngineConfigResult): Project {
    const projectData = isRecord(result.data) ? result.data : {};
    const pageData = isRecord(projectData.data) ? projectData.data : projectData;

    return {
        ...project,
        ...projectData,
        data: pageData as Project['data'],
        businessBlueprint: result.businessBlueprint,
    };
}

function readinessFromSource(source: ChatbotKnowledgeSourceBlueprint): ChatbotEngineReadinessStatus {
    if (source.readiness.blockers.length > 0) return 'blocked';
    if (source.needsReview || source.status !== 'ready' || source.readiness.warnings.length > 0) return 'review';
    return 'ready';
}

function readinessFromAction(action: ChatbotActionBlueprint): ChatbotEngineReadinessStatus {
    if (action.readiness.blockers.length > 0) return 'blocked';
    if (action.needsReview || action.status !== 'configured' || action.readiness.warnings.length > 0) return 'review';
    return 'ready';
}

const ReadinessPill: React.FC<{ status: ChatbotEngineReadinessStatus; label: string }> = ({ status, label }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass[status]}`}>
        {statusIcon[status]}
        {label}
    </span>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode }> = ({ icon, title, action }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-q-border/60 bg-q-surface/70 text-q-text-muted">
                {icon}
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
        </div>
        {action}
    </div>
);

const MetricTile: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
    <div className="rounded-lg border border-q-border/60 bg-q-surface/40 p-3">
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">{label}</div>
        {hint && <div className="mt-1 text-xs text-q-text-muted">{hint}</div>}
    </div>
);

const InlineTag: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted = false }) => (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${muted ? 'border-q-border/60 text-q-text-muted' : 'border-q-accent/30 bg-q-accent/10 text-q-accent'}`}>
        {children}
    </span>
);

const RowText: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">{label}</span>
        <span className="truncate text-sm text-foreground">{value}</span>
    </div>
);

const RuntimeEventRow: React.FC<{
    event: ChatbotEngineRuntimeEvent;
    formatDateTime: (value?: string | null) => string;
    label: (key: string) => string;
    tokenLabel: (group: string, value?: string | null, fallback?: string) => string;
    sourceLabel: (surface?: string | null, module?: string | null) => string;
}> = ({ event, formatDateTime, label, tokenLabel, sourceLabel }) => (
    <div className="grid gap-3 border-b border-q-border/50 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] md:items-center">
        <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{tokenLabel('eventTypes', event.eventType)}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
                <InlineTag muted>{tokenLabel('actionStatuses', event.actionStatus)}</InlineTag>
                {event.actionType && <InlineTag muted>{tokenLabel('actionTypes', event.actionType)}</InlineTag>}
            </div>
        </div>
        <RowText label={label('fields.source')} value={sourceLabel(event.sourceSurface, event.sourceModule)} />
        <RowText label={label('fields.correlation')} value={event.correlationId || event.conversationId || '-'} />
        <span className="whitespace-nowrap text-xs text-q-text-muted">{formatDateTime(event.createdAt)}</span>
    </div>
);

const RuntimeConversationRow: React.FC<{
    conversation: ChatbotEngineRuntimeConversation;
    formatDateTime: (value?: string | null) => string;
    label: (key: string) => string;
    tokenLabel: (group: string, value?: string | null, fallback?: string) => string;
}> = ({ conversation, formatDateTime, label, tokenLabel }) => (
    <div className="grid gap-3 border-b border-q-border/50 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] md:items-center">
        <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
                {conversation.participantName || conversation.participantEmail || label('fields.unknownVisitor')}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
                <InlineTag muted>{tokenLabel('channels', conversation.channel)}</InlineTag>
                <InlineTag muted>{tokenLabel('conversationStatuses', conversation.status)}</InlineTag>
                {conversation.leadId && <InlineTag>{label('fields.linkedLead')}</InlineTag>}
            </div>
        </div>
        <RowText label={label('metrics.messages')} value={conversation.messageCount} />
        <RowText label={label('fields.unread')} value={conversation.unreadCount} />
        <span className="whitespace-nowrap text-xs text-q-text-muted">{formatDateTime(conversation.lastMessageAt)}</span>
    </div>
);

const RuntimeHandoffRow: React.FC<{
    handoff: ChatbotEngineRuntimeHandoff;
    formatDateTime: (value?: string | null) => string;
    label: (key: string) => string;
    canAssign: boolean;
    isMutating: boolean;
    onAssign: (conversationId: string) => void;
    onResolve: (conversationId: string) => void;
    tokenLabel: (group: string, value?: string | null, fallback?: string) => string;
}> = ({ handoff, formatDateTime, label, canAssign, isMutating, onAssign, onResolve, tokenLabel }) => (
    <div className="rounded-lg border border-q-border/60 bg-q-surface/35 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                    {handoff.requesterName || handoff.participantName || handoff.requesterEmail || handoff.participantEmail || label('fields.unknownVisitor')}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                    <InlineTag>{tokenLabel('priorities', handoff.priority)}</InlineTag>
                    <InlineTag muted>{tokenLabel('handoffReasons', handoff.reason)}</InlineTag>
                    {handoff.sourceSurface && <InlineTag muted>{tokenLabel('surfaceValues', handoff.sourceSurface)}</InlineTag>}
                    {handoff.leadId && <InlineTag>{label('fields.linkedLead')}</InlineTag>}
                </div>
            </div>
            <span className="whitespace-nowrap text-xs text-q-text-muted">{formatDateTime(handoff.requestedAt || handoff.lastMessageAt)}</span>
        </div>
        {handoff.summary && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-q-text-muted">{handoff.summary}</p>
        )}
        <div className="mt-3 grid gap-2 md:grid-cols-3">
            <RowText label={label('fields.assignment')} value={handoff.assignedTo || label('fields.unassigned')} />
            <RowText label={label('fields.unread')} value={handoff.unreadCount} />
            <RowText label={label('fields.conversation')} value={handoff.conversationId} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
            <button
                type="button"
                onClick={() => onAssign(handoff.conversationId)}
                disabled={!canAssign || isMutating}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isMutating ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                {label('actions.assignToMe')}
            </button>
            <button
                type="button"
                onClick={() => onResolve(handoff.conversationId)}
                disabled={isMutating}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-success/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isMutating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {label('actions.resolveHandoff')}
            </button>
        </div>
    </div>
);

const ChatbotEngineDashboard: React.FC<ChatbotEngineDashboardProps> = ({
    project,
    actorId,
    onOpenAppearance,
    onOpenInbox,
    onOpenKnowledge,
    onOpenVoice,
    onProjectRefresh,
}) => {
    const { t, i18n } = useTranslation();
    const { success, error: showError, warning } = useToast();
    const blueprint = useMemo(() => resolveProjectChatbotBlueprint(project), [project]);
    const summary = useMemo(() => buildChatbotEngineDashboardSummary(blueprint), [blueprint]);
    const [runtimeSnapshot, setRuntimeSnapshot] = useState(() => createEmptyChatbotEngineRuntimeSnapshot(project.id));
    const [isRuntimeLoading, setIsRuntimeLoading] = useState(false);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [mutatingActionType, setMutatingActionType] = useState<string | null>(null);
    const [mutatingKnowledgeSourceId, setMutatingKnowledgeSourceId] = useState<string | null>(null);
    const [mutatingSurfaceId, setMutatingSurfaceId] = useState<string | null>(null);
    const [mutatingTestScenarioId, setMutatingTestScenarioId] = useState<string | null>(null);
    const [isRunningTestLab, setIsRunningTestLab] = useState(false);
    const [lastTestLabRun, setLastTestLabRun] = useState<ChatbotTestLabRunResult | null>(null);
    const [isMutatingVoice, setIsMutatingVoice] = useState(false);
    const [mutatingHandoffId, setMutatingHandoffId] = useState<string | null>(null);
    const [configurationMutationError, setConfigurationMutationError] = useState<string | null>(null);
    const [voiceProvider, setVoiceProvider] = useState<'none' | 'elevenlabs'>('none');
    const [voiceAgentId, setVoiceAgentId] = useState('');
    const [voiceConsentRequired, setVoiceConsentRequired] = useState(true);

    const statusLabel = (status: ChatbotEngineReadinessStatus) => t(`aiAssistant.chatbotEngine.status.${status}`);
    const enabledLabel = (enabled: boolean) => enabled ? t('aiAssistant.chatbotEngine.enabled') : t('aiAssistant.chatbotEngine.disabled');
    const engineLabel = useCallback((key: string) => t(`aiAssistant.chatbotEngine.${key}`), [t]);
    const tokenLabel = useCallback((group: string, value?: string | null, fallback = '-') => {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw) return fallback;
        return t(`aiAssistant.chatbotEngine.${group}.${raw}`, toTitle(raw));
    }, [t]);
    const sourceLabel = useCallback((surface?: string | null, module?: string | null) => {
        const surfaceText = tokenLabel('surfaceValues', surface, '');
        const moduleText = tokenLabel('ownerModules', module, '');
        if (surfaceText && moduleText) return `${surfaceText} · ${moduleText}`;
        return surfaceText || moduleText || '-';
    }, [tokenLabel]);
    const formatDateTime = useCallback((value?: string | null) => {
        if (!value) return t('aiAssistant.chatbotEngine.fields.never');
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return t('aiAssistant.chatbotEngine.fields.never');
        return new Intl.DateTimeFormat(i18n.language, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }, [i18n.language, t]);

    const showMutationError = useCallback((message: string, prefixKey = 'aiAssistant.chatbotEngine.runtime.configurationUpdateFailed') => {
        setConfigurationMutationError(message);
        showError(`${t(prefixKey)}: ${message}`, 8000);
    }, [showError, t]);

    const showBlockedReview = useCallback((blockers: string[]) => {
        const reason = blockers.find(Boolean) || t('aiAssistant.chatbotEngine.fields.blockedByReadiness');
        setConfigurationMutationError(reason);
        warning(t('aiAssistant.chatbotEngine.runtime.reviewBlocked', { reason }), 8000);
    }, [t, warning]);

    const loadRuntimeSnapshot = useCallback(async () => {
        if (!project.id) return;
        setIsRuntimeLoading(true);
        setRuntimeError(null);
        try {
            const snapshot = await getChatbotEngineRuntimeSnapshot(project.id);
            setRuntimeSnapshot(snapshot);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'runtime_snapshot_failed';
            setRuntimeError(message);
            setRuntimeSnapshot(createEmptyChatbotEngineRuntimeSnapshot(project.id));
        } finally {
            setIsRuntimeLoading(false);
        }
    }, [project.id]);

    useEffect(() => {
        setRuntimeSnapshot(createEmptyChatbotEngineRuntimeSnapshot(project.id));
        void loadRuntimeSnapshot();
    }, [loadRuntimeSnapshot, project.id]);

    useEffect(() => {
        if (!blueprint) return;
        const settings = blueprint.deployment.voiceSettings;
        setVoiceProvider(settings.provider || 'none');
        setVoiceAgentId(settings.agentId || '');
        setVoiceConsentRequired(settings.consentRequired);
    }, [
        blueprint?.deployment.voiceSettings.agentId,
        blueprint?.deployment.voiceSettings.consentRequired,
        blueprint?.deployment.voiceSettings.provider,
    ]);

    const handleReviewAction = useCallback(async (action: ChatbotActionBlueprint, enabled: boolean) => {
        if (enabled && action.readiness.blockers.length > 0) {
            showBlockedReview(action.readiness.blockers);
            return;
        }
        setMutatingActionType(action.actionType);
        setConfigurationMutationError(null);
        try {
            const result = await updateProjectChatbotActionReview(project.id, {
                actionType: action.actionType,
                enabled,
                actorId,
            });
            await onProjectRefresh?.(buildProjectOverride(project, result));
            success(t('aiAssistant.chatbotEngine.runtime.actionReviewSaved', {
                action: tokenLabel('actionTypes', action.actionType),
                status: enabled ? t('aiAssistant.chatbotEngine.enabled') : t('aiAssistant.chatbotEngine.disabled'),
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'action_update_failed';
            showMutationError(message, 'aiAssistant.chatbotEngine.runtime.actionUpdateFailed');
        } finally {
            setMutatingActionType(null);
        }
    }, [actorId, onProjectRefresh, project, showBlockedReview, showMutationError, success, t, tokenLabel]);

    const handleReviewKnowledgeSource = useCallback(async (source: ChatbotKnowledgeSourceBlueprint, enabled: boolean) => {
        if (enabled && source.readiness.blockers.length > 0) {
            showBlockedReview(source.readiness.blockers);
            return;
        }
        setMutatingKnowledgeSourceId(source.id);
        setConfigurationMutationError(null);
        try {
            const result = await updateProjectChatbotKnowledgeSourceReview(project.id, {
                sourceId: source.id,
                enabled,
                actorId,
            });
            await onProjectRefresh?.(buildProjectOverride(project, result));
            success(t('aiAssistant.chatbotEngine.runtime.knowledgeReviewSaved', {
                source: source.name,
                status: enabled ? t('aiAssistant.chatbotEngine.ready') : t('aiAssistant.chatbotEngine.disabled'),
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'knowledge_source_update_failed';
            showMutationError(message);
        } finally {
            setMutatingKnowledgeSourceId(null);
        }
    }, [actorId, onProjectRefresh, project, showBlockedReview, showMutationError, success, t]);

    const handleTestScenarioStatus = useCallback(async (
        scenarioId: string,
        status: 'passed' | 'failed' | 'needs_review',
    ) => {
        setMutatingTestScenarioId(scenarioId);
        setConfigurationMutationError(null);
        try {
            const result = await updateProjectChatbotTestScenarioStatus(project.id, {
                scenarioId,
                status,
                actorId,
            });
            await onProjectRefresh?.(buildProjectOverride(project, result));
            success(t('aiAssistant.chatbotEngine.runtime.scenarioStatusSaved', {
                status: tokenLabel('testStatuses', status),
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'test_scenario_update_failed';
            showMutationError(message);
        } finally {
            setMutatingTestScenarioId(null);
        }
    }, [actorId, onProjectRefresh, project, showMutationError, success, t, tokenLabel]);

    const handleSurfaceDeployment = useCallback(async (
        surfaceId: ChatbotSurfaceDeploymentKey,
        status: 'deployed' | 'paused',
    ) => {
        setMutatingSurfaceId(surfaceId);
        setConfigurationMutationError(null);
        try {
            const result = await updateProjectChatbotSurfaceDeployment(project.id, {
                surfaceId,
                status,
                actorId,
            });
            await onProjectRefresh?.(buildProjectOverride(project, result));
            success(t('aiAssistant.chatbotEngine.runtime.surfaceDeploymentSaved', {
                surface: t(`aiAssistant.chatbotEngine.surfaces.${surfaceId}`, toTitle(surfaceId)),
                status: tokenLabel('deploymentStatuses', status),
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'surface_update_failed';
            showMutationError(message);
        } finally {
            setMutatingSurfaceId(null);
        }
    }, [actorId, onProjectRefresh, project, showMutationError, success, t, tokenLabel]);

    const handleRunTestLab = useCallback(async () => {
        setIsRunningTestLab(true);
        setConfigurationMutationError(null);
        try {
            const result = await runProjectChatbotTestLab(project.id, {
                actorId,
                sourceSurface: 'admin_preview',
                sourceModule: 'chatbot-engine-dashboard',
            });
            setLastTestLabRun(result);
            await onProjectRefresh?.();
            await loadRuntimeSnapshot();
            success(t('aiAssistant.chatbotEngine.runtime.testLabRunSaved', {
                status: tokenLabel('evaluationStatuses', result.status),
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'test_lab_run_failed';
            showMutationError(message);
        } finally {
            setIsRunningTestLab(false);
        }
    }, [actorId, loadRuntimeSnapshot, onProjectRefresh, project.id, showMutationError, success, t, tokenLabel]);

    const handleSaveVoiceSettings = useCallback(async () => {
        const agentId = voiceAgentId.trim();
        if (voiceProvider !== 'none' && !agentId) {
            setConfigurationMutationError(t('aiAssistant.chatbotEngine.runtime.voiceAgentRequired'));
            warning(t('aiAssistant.chatbotEngine.runtime.voiceAgentRequired'), 7000);
            return;
        }
        setIsMutatingVoice(true);
        setConfigurationMutationError(null);
        try {
            const result = await updateProjectChatbotVoiceSettings(project.id, {
                enabled: voiceProvider !== 'none',
                provider: voiceProvider,
                agentId: agentId || null,
                languageMode: 'visitor_language',
                consentRequired: voiceConsentRequired,
                actorId,
            });
            await onProjectRefresh?.(buildProjectOverride(project, result));
            success(t('aiAssistant.chatbotEngine.runtime.voiceSettingsSaved'));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'voice_update_failed';
            showMutationError(message);
        } finally {
            setIsMutatingVoice(false);
        }
    }, [actorId, onProjectRefresh, project, showMutationError, success, t, voiceAgentId, voiceConsentRequired, voiceProvider, warning]);

    const handleAssignHandoff = useCallback(async (conversationId: string) => {
        if (!actorId) {
            setConfigurationMutationError(t('aiAssistant.chatbotEngine.runtime.handoffActorRequired'));
            warning(t('aiAssistant.chatbotEngine.runtime.handoffActorRequired'), 7000);
            return;
        }
        setMutatingHandoffId(`assign:${conversationId}`);
        setConfigurationMutationError(null);
        try {
            await assignChatbotEngineHandoff(project.id, {
                conversationId,
                actorId,
                assigneeId: actorId,
            });
            await loadRuntimeSnapshot();
            success(t('aiAssistant.chatbotEngine.runtime.handoffAssigned'));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'handoff_assign_failed';
            showMutationError(message);
        } finally {
            setMutatingHandoffId(null);
        }
    }, [actorId, loadRuntimeSnapshot, project.id, showMutationError, success, t, warning]);

    const handleResolveHandoff = useCallback(async (conversationId: string) => {
        setMutatingHandoffId(`resolve:${conversationId}`);
        setConfigurationMutationError(null);
        try {
            await resolveChatbotEngineHandoff(project.id, {
                conversationId,
                actorId,
            });
            await loadRuntimeSnapshot();
            success(t('aiAssistant.chatbotEngine.runtime.handoffResolved'));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'handoff_resolve_failed';
            showMutationError(message);
        } finally {
            setMutatingHandoffId(null);
        }
    }, [actorId, loadRuntimeSnapshot, project.id, showMutationError, success, t]);

    if (!blueprint) {
        return (
            <div className="space-y-5 animate-fade-in-up">
                <section className="quimera-dashboard-panel-card p-5">
                    <SectionTitle
                        icon={<Workflow size={17} />}
                        title={t('aiAssistant.chatbotEngine.title')}
                    />
                    <div className="mt-5 rounded-lg border border-q-error/30 bg-q-error/10 p-4 text-sm text-q-error">
                        {t('aiAssistant.chatbotEngine.noBlueprint')}
                    </div>
                </section>
            </div>
        );
    }

    const knowledgeSources = blueprint.knowledgeSources;
    const actions = blueprint.actions;

    return (
        <div className="space-y-5 animate-fade-in-up">
            <section className="quimera-dashboard-panel-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-foreground">{t('aiAssistant.chatbotEngine.title')}</h2>
                            <ReadinessPill status={summary.status} label={statusLabel(summary.status)} />
                        </div>
                        <p className="mt-1 text-sm text-q-text-muted">
                            {t('aiAssistant.chatbotEngine.subtitle', { projectName: project.name })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={onOpenKnowledge} className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground">
                            {t('aiAssistant.chatbotEngine.actions.openKnowledge')}
                        </button>
                        <button onClick={onOpenInbox} className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground">
                            {t('aiAssistant.chatbotEngine.actions.openInbox')}
                        </button>
                        <button
                            onClick={loadRuntimeSnapshot}
                            disabled={isRuntimeLoading}
                            className="inline-flex items-center gap-2 rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground disabled:opacity-60"
                        >
                            {isRuntimeLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                            {t('aiAssistant.chatbotEngine.actions.refreshRuntime')}
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.readiness')}
                        value={`${summary.readyCheckpoints}/${summary.totalCheckpoints}`}
                        hint={summary.engineVersion || 'v2'}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.knowledge')}
                        value={summary.knowledge.total}
                        hint={`${summary.knowledge.review + summary.knowledge.blocked} ${t('aiAssistant.chatbotEngine.metrics.needReview')}`}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.actions')}
                        value={summary.actions.total}
                        hint={`${summary.actions.enabled} ${t('aiAssistant.chatbotEngine.enabled')}`}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.surfaces')}
                        value={summary.surfaces.filter(surface => surface.enabled).length}
                        hint={`${summary.surfaces.length} ${t('aiAssistant.chatbotEngine.metrics.total')}`}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.events')}
                        value={runtimeSnapshot.analytics.totalEvents}
                        hint={`${summary.eventLog.eventCount} ${t('aiAssistant.chatbotEngine.metrics.definedEvents')}`}
                    />
                </div>

                {(runtimeError || runtimeSnapshot.warnings.length > 0) && (
                    <div className="mt-4 rounded-lg border border-q-accent/25 bg-q-accent/10 p-3 text-xs text-q-accent">
                        {runtimeError || t('aiAssistant.chatbotEngine.runtime.partialSnapshot')}
                    </div>
                )}

                {configurationMutationError && (
                    <div className="mt-4 rounded-lg border border-q-error/25 bg-q-error/10 p-3 text-xs text-q-error">
                        {t('aiAssistant.chatbotEngine.runtime.configurationUpdateFailed')}: {configurationMutationError}
                    </div>
                )}

                {(summary.blockers.length > 0 || summary.warnings.length > 0) && (
                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {summary.blockers.length > 0 && (
                            <div className="rounded-lg border border-q-error/25 bg-q-error/10 p-3">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-q-error">
                                    <XCircle size={15} />
                                    {t('aiAssistant.chatbotEngine.blockers')}
                                </div>
                                <ul className="space-y-1 text-xs text-q-error/90">
                                    {summary.blockers.slice(0, 5).map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {summary.warnings.length > 0 && (
                            <div className="rounded-lg border border-q-accent/25 bg-q-accent/10 p-3">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-q-accent">
                                    <AlertTriangle size={15} />
                                    {t('aiAssistant.chatbotEngine.warnings')}
                                </div>
                                <ul className="space-y-1 text-xs text-q-accent/90">
                                    {summary.warnings.slice(0, 5).map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<Workflow size={17} />}
                    title={t('aiAssistant.chatbotEngine.training')}
                    action={<InlineTag>{summary.training.knowledgeSectionCount}/3 {t('aiAssistant.chatbotEngine.metrics.trainingSections')}</InlineTag>}
                />
                <p className="mt-3 text-sm text-q-text-muted">
                    {t('aiAssistant.chatbotEngine.trainingDescription')}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.businessKnowledge')}
                        value={summary.training.businessKnowledgeCount}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.productKnowledge')}
                        value={summary.training.productKnowledgeCount}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.policyKnowledge')}
                        value={summary.training.policyKnowledgeCount}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.eventIntents')}
                        value={summary.training.eventIntentCount}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.fields.languages')}
                        value={summary.training.supportedLanguageCount}
                        hint={summary.supportedLanguages.join(', ') || '-'}
                    />
                </div>
            </section>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<BookOpen size={17} />}
                    title={t('aiAssistant.chatbotEngine.knowledgeCenter')}
                    action={<InlineTag>{summary.knowledge.ready}/{summary.knowledge.total} {t('aiAssistant.chatbotEngine.ready')}</InlineTag>}
                />
                <div className="mt-4 divide-y divide-q-border/60">
                    {knowledgeSources.map(source => {
                        const status = readinessFromSource(source);
                        const isMutating = mutatingKnowledgeSourceId === source.id;
                        const sourceEnabled = source.status === 'ready';
                        const canEnable = source.readiness.blockers.length === 0;
                        return (
                            <div key={source.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto_auto] md:items-center">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-foreground">{source.name}</div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        <InlineTag muted>{tokenLabel('knowledgeTypes', source.type)}</InlineTag>
                                        <InlineTag muted>{tokenLabel('ownerModules', source.ownerModule)}</InlineTag>
                                        <InlineTag muted>{tokenLabel('visibility', source.visibility)}</InlineTag>
                                    </div>
                                </div>
                                <RowText label={t('aiAssistant.chatbotEngine.fields.confidence')} value={`${Math.round(source.confidence * 100)}%`} />
                                <ReadinessPill status={status} label={statusLabel(status)} />
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleReviewKnowledgeSource(source, !sourceEnabled)}
                                        disabled={isMutating}
                                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isMutating && <Loader2 size={12} className="animate-spin" />}
                                        {sourceEnabled
                                            ? t('aiAssistant.chatbotEngine.actions.disableKnowledgeSource')
                                            : t('aiAssistant.chatbotEngine.actions.reviewKnowledgeSource')}
                                    </button>
                                    {!canEnable && !sourceEnabled && (
                                        <span className="text-xs text-q-text-muted">
                                            {t('aiAssistant.chatbotEngine.fields.blockedByReadiness')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<ListChecks size={17} />}
                    title={t('aiAssistant.chatbotEngine.actionRegistry')}
                    action={<InlineTag>{summary.actions.auditLogged}/{summary.actions.total} {t('aiAssistant.chatbotEngine.fields.audit')}</InlineTag>}
                />
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {actions.map(action => {
                        const status = readinessFromAction(action);
                        const isMutating = mutatingActionType === action.actionType;
                        const canEnable = action.readiness.blockers.length === 0;
                        return (
                            <div key={action.id} className="rounded-lg border border-q-border/60 bg-q-surface/30 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-foreground">{tokenLabel('actionTypes', action.actionType)}</div>
                                        <div className="mt-1 text-xs text-q-text-muted">{tokenLabel('ownerModules', action.ownerModule)}</div>
                                    </div>
                                    <ReadinessPill status={status} label={statusLabel(status)} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <InlineTag muted>{enabledLabel(action.enabled)}</InlineTag>
                                    {action.publicAllowed && <InlineTag>{t('aiAssistant.chatbotEngine.fields.public')}</InlineTag>}
                                    {action.requiresConfirmation && <InlineTag muted>{t('aiAssistant.chatbotEngine.fields.confirmation')}</InlineTag>}
                                    {action.requiresAuth && <InlineTag muted>{t('aiAssistant.chatbotEngine.fields.auth')}</InlineTag>}
                                    {action.requiresConsent && <InlineTag muted>{t('aiAssistant.chatbotEngine.fields.consent')}</InlineTag>}
                                    {action.idempotencyRequired && <InlineTag muted>{t('aiAssistant.chatbotEngine.fields.idempotent')}</InlineTag>}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleReviewAction(action, !action.enabled)}
                                        disabled={isMutating}
                                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isMutating && <Loader2 size={12} className="animate-spin" />}
                                        {action.enabled
                                            ? t('aiAssistant.chatbotEngine.actions.disableAction')
                                            : t('aiAssistant.chatbotEngine.actions.reviewAction')}
                                    </button>
                                    {!canEnable && !action.enabled && (
                                        <span className="text-xs text-q-text-muted">
                                            {t('aiAssistant.chatbotEngine.fields.blockedByReadiness')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<Radio size={17} />}
                    title={t('aiAssistant.chatbotEngine.deploySettings')}
                    action={<InlineTag>{tokenLabel('deploymentStatuses', summary.deployment.status)}</InlineTag>}
                />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.canonicalCoverage')}
                        value={`${summary.deployment.surfaceCoverage.deployedRequired}/${summary.deployment.surfaceCoverage.required}`}
                        hint={statusLabel(summary.deployment.surfaceCoverage.status)}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.publicCoverage')}
                        value={`${summary.deployment.surfaceCoverage.deployedPublic}/${summary.deployment.surfaceCoverage.public}`}
                        hint={`${summary.deployment.surfaceCoverage.missingRequired.length} ${t('aiAssistant.chatbotEngine.metrics.needReview')}`}
                    />
                    <MetricTile
                        label={t('aiAssistant.chatbotEngine.metrics.surfaces')}
                        value={summary.surfaces.length}
                        hint={summary.deployment.surfaceCoverage.missingRequired.map(surfaceId => t(`aiAssistant.chatbotEngine.surfaces.${surfaceId}`, toTitle(surfaceId))).slice(0, 2).join(', ') || t('aiAssistant.chatbotEngine.ready')}
                    />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {summary.surfaces.map((surface: ChatbotEngineSurfaceSummary) => {
                        const isMutating = mutatingSurfaceId === surface.id;
                        const isDeployed = surface.status === 'deployed' && surface.enabled;
                        return (
                            <div key={surface.id} className="rounded-lg border border-q-border/60 bg-q-surface/30 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-foreground">
                                            {t(`aiAssistant.chatbotEngine.surfaces.${surface.id}`, toTitle(surface.id))}
                                        </div>
                                        <div className="mt-1 text-xs text-q-text-muted">{surface.routePattern || tokenLabel('surfaceValues', surface.sourceSurface)}</div>
                                    </div>
                                    <ReadinessPill status={surface.readinessStatus} label={statusLabel(surface.readinessStatus)} />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <InlineTag muted>{enabledLabel(surface.enabled)}</InlineTag>
                                    <InlineTag muted>{tokenLabel('deploymentStatuses', surface.status)}</InlineTag>
                                    <InlineTag muted>{tokenLabel('ownerModules', surface.sourceModule)}</InlineTag>
                                    <InlineTag muted>
                                        {surface.requiredForCanonicalDeployment
                                            ? t('aiAssistant.chatbotEngine.fields.requiredSurface')
                                            : t('aiAssistant.chatbotEngine.fields.optionalSurface')}
                                    </InlineTag>
                                    {surface.publicSurface && <InlineTag>{t('aiAssistant.chatbotEngine.fields.public')}</InlineTag>}
                                    {surface.contextKeys.slice(0, 3).map(key => <InlineTag key={key} muted>{tokenLabel('contextKeys', key)}</InlineTag>)}
                                </div>
                                <div className="mt-3 grid gap-2">
                                    <RowText
                                        label={t('aiAssistant.chatbotEngine.fields.target')}
                                        value={t(`aiAssistant.chatbotEngine.deploymentTargets.${surface.id}`, surface.defaultRoutePattern)}
                                    />
                                    <RowText
                                        label={t('aiAssistant.chatbotEngine.fields.evidence')}
                                        value={surface.runtimeEvidence.slice(0, 2).join(' · ')}
                                    />
                                </div>
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSurfaceDeployment(surface.id as ChatbotSurfaceDeploymentKey, isDeployed ? 'paused' : 'deployed')}
                                        disabled={isMutating}
                                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isMutating && <Loader2 size={12} className="animate-spin" />}
                                        {isDeployed
                                            ? t('aiAssistant.chatbotEngine.actions.pauseSurface')
                                            : t('aiAssistant.chatbotEngine.actions.deploySurface')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                <section className="quimera-dashboard-panel-card p-5">
                    <SectionTitle
                        icon={<FlaskConical size={17} />}
                        title={t('aiAssistant.chatbotEngine.testLab')}
                        action={
                            <button
                                type="button"
                                onClick={handleRunTestLab}
                                disabled={isRunningTestLab || blueprint.testing.testScenarios.length === 0}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isRunningTestLab ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
                                {t('aiAssistant.chatbotEngine.actions.runTestLab')}
                            </button>
                        }
                    />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.scenarios')} value={summary.testLab.scenarioCount} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.regressions')} value={summary.testLab.regressionQuestionCount} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.blockedRules')} value={summary.testLab.blockedRuleCount} />
                    </div>
                    {lastTestLabRun && (
                        <div className={`mt-4 rounded-lg border p-3 text-xs ${lastTestLabRun.passed ? 'border-q-success/25 bg-q-success/10 text-q-success' : 'border-q-error/25 bg-q-error/10 text-q-error'}`}>
                            {t('aiAssistant.chatbotEngine.runtime.testLabRunResult', {
                                status: tokenLabel('evaluationStatuses', lastTestLabRun.status),
                                passed: lastTestLabRun.scenarioResults.filter(result => result.passed).length,
                                total: lastTestLabRun.scenarioResults.length,
                            })}
                        </div>
                    )}
                    <div className="mt-4 rounded-lg border border-q-border/60 p-3">
                        <RowText label={t('aiAssistant.chatbotEngine.fields.evaluation')} value={tokenLabel('evaluationStatuses', summary.testLab.evaluationStatus)} />
                    </div>
                    <div className="mt-4 divide-y divide-q-border/60 rounded-lg border border-q-border/60 px-3">
                        {blueprint.testing.testScenarios.length > 0 ? (
                            blueprint.testing.testScenarios.slice(0, 5).map(scenario => {
                                const isMutating = mutatingTestScenarioId === scenario.id;
                                return (
                                    <div key={scenario.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-foreground">{scenario.name}</div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <InlineTag muted>{scenario.persona}</InlineTag>
                                                <InlineTag muted>{tokenLabel('testStatuses', scenario.status)}</InlineTag>
                                                {scenario.expectedActions.slice(0, 3).map(action => <InlineTag key={action} muted>{tokenLabel('actionTypes', action)}</InlineTag>)}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleTestScenarioStatus(scenario.id, 'passed')}
                                                disabled={isMutating || scenario.status === 'passed'}
                                                className="inline-flex h-8 items-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-success/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isMutating && <Loader2 size={12} className="animate-spin" />}
                                                {t('aiAssistant.chatbotEngine.actions.markPassed')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTestScenarioStatus(scenario.id, 'failed')}
                                                disabled={isMutating || scenario.status === 'failed'}
                                                className="inline-flex h-8 items-center rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-error/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {t('aiAssistant.chatbotEngine.actions.markFailed')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTestScenarioStatus(scenario.id, 'needs_review')}
                                                disabled={isMutating || scenario.status === 'needs_review'}
                                                className="inline-flex h-8 items-center rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {t('aiAssistant.chatbotEngine.actions.markNeedsReview')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-3 text-sm text-q-text-muted">
                                {t('aiAssistant.chatbotEngine.runtime.emptyTestScenarios')}
                            </div>
                        )}
                    </div>
                </section>

                <section className="quimera-dashboard-panel-card p-5">
                    <SectionTitle
                        icon={<BarChart3 size={17} />}
                        title={t('aiAssistant.chatbotEngine.analytics')}
                        action={
                            <a
                                href={buildEmailReviewQueueUrl({ projectId: project.id, sourceModule: 'chatcore' })}
                                className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground"
                            >
                                {t('aiAssistant.chatbotEngine.actions.openEmailReviewQueue')}
                            </a>
                        }
                    />
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.executed')} value={runtimeSnapshot.analytics.executedActions} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.blocked')} value={runtimeSnapshot.analytics.blockedActions} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.observed')} value={runtimeSnapshot.analytics.observedEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.highIntent')} value={runtimeSnapshot.analytics.highIntentEvents} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.leadEvents')} value={runtimeSnapshot.analytics.leadEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.appointmentEvents')} value={runtimeSnapshot.analytics.appointmentEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.handoffEvents')} value={runtimeSnapshot.analytics.handoffEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.ecommerceEvents')} value={runtimeSnapshot.analytics.ecommerceEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.emailMarketingEvents')} value={runtimeSnapshot.analytics.emailMarketingEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.financeEvents')} value={runtimeSnapshot.analytics.financeEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.restaurantEvents')} value={runtimeSnapshot.analytics.restaurantEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.realtyEvents')} value={runtimeSnapshot.analytics.realtyEvents} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.voiceEvents')} value={runtimeSnapshot.analytics.voiceEvents} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {runtimeSnapshot.analytics.actionBreakdown.slice(0, 8).map(item => (
                            <InlineTag key={item.actionType} muted>{tokenLabel('actionTypes', item.actionType)}: {item.count}</InlineTag>
                        ))}
                        {runtimeSnapshot.analytics.actionBreakdown.length === 0 && (
                            <span className="text-xs text-q-text-muted">{t('aiAssistant.chatbotEngine.runtime.noActionEvents')}</span>
                        )}
                    </div>
                    {runtimeSnapshot.analytics.intentBreakdown.length > 0 && (
                        <div className="mt-4">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                                {t('aiAssistant.chatbotEngine.metrics.intents')}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {runtimeSnapshot.analytics.intentBreakdown.slice(0, 8).map(item => (
                                    <InlineTag key={item.intent} muted>{tokenLabel('intentTypes', item.intent)}: {item.count}</InlineTag>
                                ))}
                            </div>
                        </div>
                    )}
                    {(runtimeSnapshot.analytics.surfaceBreakdown.length > 0 || runtimeSnapshot.analytics.moduleBreakdown.length > 0) && (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-lg border border-q-border/60 bg-q-surface/30 p-3">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                                    {t('aiAssistant.chatbotEngine.metrics.surfaceBreakdown')}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {runtimeSnapshot.analytics.surfaceBreakdown.slice(0, 8).map(item => (
                                        <InlineTag key={item.sourceSurface} muted>
                                            {tokenLabel('surfaceValues', item.sourceSurface)}: {item.count}
                                        </InlineTag>
                                    ))}
                                    {runtimeSnapshot.analytics.surfaceBreakdown.length === 0 && (
                                        <span className="text-xs text-q-text-muted">{t('aiAssistant.chatbotEngine.runtime.noSurfaceEvents')}</span>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-lg border border-q-border/60 bg-q-surface/30 p-3">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                                    {t('aiAssistant.chatbotEngine.metrics.moduleBreakdown')}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {runtimeSnapshot.analytics.moduleBreakdown.slice(0, 8).map(item => (
                                        <InlineTag key={item.sourceModule} muted>
                                            {tokenLabel('ownerModules', item.sourceModule)}: {item.count}
                                        </InlineTag>
                                    ))}
                                    {runtimeSnapshot.analytics.moduleBreakdown.length === 0 && (
                                        <span className="text-xs text-q-text-muted">{t('aiAssistant.chatbotEngine.runtime.noModuleEvents')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<Clock3 size={17} />}
                    title={t('aiAssistant.chatbotEngine.eventLog')}
                    action={<InlineTag>{formatDateTime(runtimeSnapshot.analytics.lastEventAt)}</InlineTag>}
                />
                <div className="mt-4">
                    {runtimeSnapshot.events.length > 0 ? (
                        runtimeSnapshot.events.slice(0, 12).map(event => (
                            <RuntimeEventRow
                                key={event.id}
                                event={event}
                                formatDateTime={formatDateTime}
                                label={engineLabel}
                                tokenLabel={tokenLabel}
                                sourceLabel={sourceLabel}
                            />
                        ))
                    ) : (
                        <div className="rounded-lg border border-q-border/60 bg-q-surface/30 p-4 text-sm text-q-text-muted">
                            {isRuntimeLoading ? t('aiAssistant.chatbotEngine.runtime.loading') : t('aiAssistant.chatbotEngine.runtime.emptyEvents')}
                        </div>
                    )}
                </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
                <section className="quimera-dashboard-panel-card p-5">
                    <SectionTitle
                        icon={<Inbox size={17} />}
                        title={t('aiAssistant.chatbotEngine.inboxHandoff')}
                        action={
                            <button onClick={onOpenInbox} className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground">
                                {t('aiAssistant.chatbotEngine.actions.openInbox')}
                            </button>
                        }
                    />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.activeConversations')} value={runtimeSnapshot.inbox.activeConversations} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.metrics.escalatedConversations')} value={runtimeSnapshot.inbox.escalatedConversations} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.fields.unread')} value={runtimeSnapshot.inbox.unreadMessages} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.fields.assignment')} value={tokenLabel('assignmentStrategies', blueprint.handoff.assignmentStrategy)} />
                    </div>
                    <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                                {t('aiAssistant.chatbotEngine.runtime.handoffQueue')}
                            </span>
                            <InlineTag muted>{runtimeSnapshot.handoffs.length}</InlineTag>
                        </div>
                        {runtimeSnapshot.handoffs.length > 0 ? (
                            <div className="grid gap-3">
                                {runtimeSnapshot.handoffs.slice(0, 4).map(handoff => (
                                    <RuntimeHandoffRow
                                        key={handoff.conversationId}
                                        handoff={handoff}
                                        formatDateTime={formatDateTime}
                                        label={engineLabel}
                                        canAssign={Boolean(actorId)}
                                        isMutating={mutatingHandoffId === `assign:${handoff.conversationId}` || mutatingHandoffId === `resolve:${handoff.conversationId}`}
                                        onAssign={handleAssignHandoff}
                                        onResolve={handleResolveHandoff}
                                        tokenLabel={tokenLabel}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-q-border/60 bg-q-surface/30 p-4 text-sm text-q-text-muted">
                                {isRuntimeLoading ? t('aiAssistant.chatbotEngine.runtime.loading') : t('aiAssistant.chatbotEngine.runtime.emptyHandoffs')}
                            </div>
                        )}
                    </div>
                    <div className="mt-4">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-q-text-muted">
                            {t('aiAssistant.chatbotEngine.runtime.recentConversations')}
                        </div>
                        {runtimeSnapshot.conversations.length > 0 ? (
                            runtimeSnapshot.conversations.slice(0, 5).map(conversation => (
                                <RuntimeConversationRow
                                    key={conversation.id}
                                    conversation={conversation}
                                    formatDateTime={formatDateTime}
                                    label={engineLabel}
                                    tokenLabel={tokenLabel}
                                />
                            ))
                        ) : (
                            <div className="rounded-lg border border-q-border/60 bg-q-surface/30 p-4 text-sm text-q-text-muted">
                                {isRuntimeLoading ? t('aiAssistant.chatbotEngine.runtime.loading') : t('aiAssistant.chatbotEngine.runtime.emptyConversations')}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {blueprint.handoff.handoffReasons.map(reason => <InlineTag key={reason} muted>{tokenLabel('handoffReasons', reason)}</InlineTag>)}
                    </div>
                </section>

                <section className="quimera-dashboard-panel-card p-5">
                    <SectionTitle
                        icon={<Palette size={17} />}
                        title={t('aiAssistant.chatbotEngine.appearanceVoice')}
                        action={
                            <div className="flex gap-2">
                                <button onClick={onOpenAppearance} className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground">
                                    {t('aiAssistant.chatbotEngine.actions.openAppearance')}
                                </button>
                                <button onClick={onOpenVoice} className="rounded-lg border border-q-border/60 px-3 py-2 text-xs font-semibold text-q-text-muted hover:text-foreground">
                                    {t('aiAssistant.chatbotEngine.actions.openVoice')}
                                </button>
                            </div>
                        }
                    />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <MetricTile label={t('aiAssistant.chatbotEngine.fields.agent')} value={summary.agentName || '-'} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.fields.languages')} value={summary.supportedLanguages.join(', ') || '-'} />
                        <MetricTile label={t('aiAssistant.chatbotEngine.fields.voiceProvider')} value={tokenLabel('voiceProviders', summary.deployment.voiceProvider)} />
                        <MetricTile
                            label={t('aiAssistant.chatbotEngine.fields.voiceAgent')}
                            value={summary.deployment.voiceAgentConfigured ? t('aiAssistant.chatbotEngine.configured') : t('aiAssistant.chatbotEngine.notConfigured')}
                        />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] md:items-end">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-q-text-muted">
                            {t('aiAssistant.chatbotEngine.fields.voiceProvider')}
                            <select
                                value={voiceProvider}
                                onChange={(event) => setVoiceProvider(event.target.value as 'none' | 'elevenlabs')}
                                className="h-9 rounded-lg border border-q-border/60 bg-q-surface px-3 text-sm text-foreground outline-none focus:border-q-accent/60"
                            >
                                <option value="none">{t('aiAssistant.chatbotEngine.fields.noVoiceProvider')}</option>
                                <option value="elevenlabs">ElevenLabs</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-semibold text-q-text-muted">
                            {t('aiAssistant.chatbotEngine.fields.voiceAgent')}
                            <input
                                value={voiceAgentId}
                                onChange={(event) => setVoiceAgentId(event.target.value)}
                                placeholder={t('aiAssistant.chatbotEngine.fields.voiceAgentPlaceholder')}
                                className="h-9 rounded-lg border border-q-border/60 bg-q-surface px-3 text-sm text-foreground outline-none focus:border-q-accent/60"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={handleSaveVoiceSettings}
                            disabled={isMutatingVoice}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-q-border/60 px-3 text-xs font-semibold text-q-text-muted transition-colors hover:border-q-accent/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isMutatingVoice && <Loader2 size={12} className="animate-spin" />}
                            {t('aiAssistant.chatbotEngine.actions.saveVoiceSettings')}
                        </button>
                    </div>
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-q-text-muted">
                        <input
                            type="checkbox"
                            checked={voiceConsentRequired}
                            onChange={(event) => setVoiceConsentRequired(event.target.checked)}
                            className="h-4 w-4 rounded border-q-border text-q-accent focus:ring-q-accent"
                        />
                        {t('aiAssistant.chatbotEngine.fields.voiceConsentRequired')}
                    </label>
                </section>
            </div>

            <section className="quimera-dashboard-panel-card p-5">
                <SectionTitle
                    icon={<ShieldCheck size={17} />}
                    title={t('aiAssistant.chatbotEngine.safety')}
                />
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label={t('aiAssistant.chatbotEngine.fields.actionRegistry')} value={summary.deployment.requireActionRegistry ? t('aiAssistant.chatbotEngine.required') : t('aiAssistant.chatbotEngine.optional')} />
                    <MetricTile label={t('aiAssistant.chatbotEngine.fields.knowledgeReview')} value={summary.deployment.requireKnowledgeReview ? t('aiAssistant.chatbotEngine.required') : t('aiAssistant.chatbotEngine.optional')} />
                    <MetricTile label={t('aiAssistant.chatbotEngine.fields.privateSources')} value={summary.knowledge.privateSources + summary.knowledge.internalSources} />
                    <MetricTile label={t('aiAssistant.chatbotEngine.fields.lockedActions')} value={summary.actions.disabled} />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {summary.capabilities.map(capability => (
                        <InlineTag key={capability.id} muted={!capability.enabled}>
                            <span className="inline-flex items-center gap-1">
                                {capability.enabled ? <Globe2 size={11} /> : <Lock size={11} />}
                                {t(`aiAssistant.chatbotEngine.capabilities.${capability.id}`, toTitle(capability.id))}
                            </span>
                        </InlineTag>
                    ))}
                    <InlineTag muted>
                        <span className="inline-flex items-center gap-1">
                            <Mic size={11} />
                            {summary.deployment.voiceEnabled ? t('aiAssistant.chatbotEngine.enabled') : t('aiAssistant.chatbotEngine.disabled')}
                        </span>
                    </InlineTag>
                </div>
            </section>
        </div>
    );
};

export default ChatbotEngineDashboard;
