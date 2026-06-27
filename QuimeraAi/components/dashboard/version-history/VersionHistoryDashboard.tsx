import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    Check,
    ChevronDown,
    GitCompare,
    History,
    Menu,
    RefreshCw,
    RotateCcw,
    Shield,
    Store,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';
import QuimeraLoader from '../../ui/QuimeraLoader';
import { useProject } from '../../../contexts/project';
import { useUI } from '../../../contexts/core/UIContext';
import { useToast } from '../../../contexts/ToastContext';
import { useRouter } from '../../../hooks/useRouter';
import { ROUTES } from '../../../routes/config';
import { supabase } from '../../../supabase';
import type { BusinessBlueprintModuleKey } from '../../../types/businessBlueprint';
import type { BlueprintSnapshot, RestoreTarget, SnapshotDiff } from '../../../types/versionHistory';
import {
    diffBlueprintSnapshots,
    getBlueprintSnapshots,
    normalizeRestoreTarget,
    restoreBlueprintModule,
    restoreBlueprintSection,
    restoreBlueprintSnapshot,
} from '../../../utils/businessBlueprint';

const MODULE_KEYS: BusinessBlueprintModuleKey[] = [
    'businessProfile',
    'brandProfile',
    'websiteBlueprint',
    'storefrontBlueprint',
    'ecommerceBlueprint',
    'chatbotBlueprint',
    'leadBlueprint',
    'emailMarketingBlueprint',
    'mediaBlueprint',
    'bioPageBlueprint',
    'appointmentsBlueprint',
    'restaurantBlueprint',
    'realEstateBlueprint',
    'financeBlueprint',
    'analyticsBlueprint',
    'automationBlueprint',
];

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const formatDate = (value?: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
};

const Badge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ai' | 'manual' | 'protected' | 'published' }) => {
    const toneClasses = {
        neutral: 'border-q-border bg-q-surface text-q-text-muted',
        ai: 'border-q-accent/30 bg-q-accent/10 text-q-accent',
        manual: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        protected: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        published: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    };

    return (
        <span className={`inline-flex items-center rounded-[var(--q-radius-sm)] border px-2 py-0.5 text-[11px] font-semibold ${toneClasses[tone]}`}>
            {children}
        </span>
    );
};

const VersionHistoryDashboard: React.FC = () => {
    const { t } = useTranslation();
    const { setView } = useUI();
    const { projects, activeProject, activeProjectId, loadProject } = useProject();
    const { success, error: showError, warning } = useToast();
    const { params, navigate } = useRouter();
    const routeProjectId = params.projectId || null;
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(routeProjectId || activeProjectId);
    const [projectData, setProjectData] = useState<Record<string, unknown> | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
    const [detailMode, setDetailMode] = useState<'view' | 'compare'>('view');
    const [restoreModuleKey, setRestoreModuleKey] = useState<BusinessBlueprintModuleKey>('websiteBlueprint');
    const [restoreSectionId, setRestoreSectionId] = useState('');
    const [overwriteProtected, setOverwriteProtected] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const selectableProjects = useMemo(
        () => projects.filter(project => project.status !== 'Template'),
        [projects],
    );

    const effectiveProjectId = selectedProjectId || activeProjectId;
    const effectiveProject = projects.find(project => project.id === effectiveProjectId) || activeProject;

    const snapshots = useMemo(
        () => getBlueprintSnapshots(projectData).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
        [projectData],
    );

    const selectedSnapshot = useMemo(
        () => snapshots.find(snapshot => snapshot.id === selectedSnapshotId) || snapshots[0] || null,
        [snapshots, selectedSnapshotId],
    );

    const diff: SnapshotDiff | null = useMemo(
        () => selectedSnapshot && projectData ? diffBlueprintSnapshots(projectData, selectedSnapshot) : null,
        [projectData, selectedSnapshot],
    );

    const loadHistory = useCallback(async (projectId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, data')
                .eq('id', projectId)
                .maybeSingle();

            if (error) throw error;
            const row = asRecord(data);
            const nextData = asRecord(row.data);
            setProjectData(nextData);
            setProjectName(typeof row.name === 'string' ? row.name : effectiveProject?.name || '');
            const nextSnapshots = getBlueprintSnapshots(nextData);
            setSelectedSnapshotId(current => current && nextSnapshots.some(snapshot => snapshot.id === current)
                ? current
                : nextSnapshots[0]?.id || null);
        } catch (err) {
            console.error('[VersionHistory] Failed to load history', err);
            showError(t('versionHistory.errors.load', 'Could not load version history.'));
        } finally {
            setIsLoading(false);
        }
    }, [effectiveProject?.name, showError, t]);

    useEffect(() => {
        if (routeProjectId && routeProjectId !== selectedProjectId) {
            setSelectedProjectId(routeProjectId);
        }
    }, [routeProjectId, selectedProjectId]);

    useEffect(() => {
        if (!effectiveProjectId) return;
        loadHistory(effectiveProjectId);
    }, [effectiveProjectId, loadHistory]);

    const handleProjectSelect = async (projectId: string) => {
        setSelectedProjectId(projectId);
        navigate(ROUTES.PROJECT_VERSION_HISTORY, { projectId });
        await loadProject(projectId, false, false);
    };

    const runRestore = async (snapshot: BlueprintSnapshot, target: RestoreTarget) => {
        if (!effectiveProjectId) return;
        const confirmMessage = target.scope === 'project'
            ? t('versionHistory.confirmRestoreProject', 'Restore this snapshot into the current project? Protected modules will be preserved unless overwrite is enabled.')
            : t('versionHistory.confirmRestoreTarget', 'Restore this target from the selected snapshot?');
        if (!window.confirm(confirmMessage)) return;

        setIsRestoring(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('data')
                .eq('id', effectiveProjectId)
                .maybeSingle();
            if (error) throw error;

            const currentData = asRecord(asRecord(data).data);
            let result;
            if (target.scope === 'module' && target.moduleKey) {
                result = restoreBlueprintModule(currentData, snapshot, target.moduleKey, {
                    confirmOverwriteProtected: target.confirmOverwriteProtected,
                });
            } else if (target.scope === 'section' && target.sectionId) {
                result = restoreBlueprintSection(currentData, snapshot, target.sectionId, {
                    confirmOverwriteProtected: target.confirmOverwriteProtected,
                });
            } else {
                result = restoreBlueprintSnapshot(currentData, snapshot, target);
            }

            if (!result.restored) {
                warning(result.warnings[0] || t('versionHistory.restoreSkipped', 'Restore was skipped.'));
                return;
            }

            const now = new Date().toISOString();
            const { error: updateError } = await supabase
                .from('projects')
                .update({ data: result.nextProjectData, last_updated: now })
                .eq('id', effectiveProjectId);
            if (updateError) throw updateError;

            await loadProject(effectiveProjectId, false, false);
            await loadHistory(effectiveProjectId);
            if (result.protectedPaths.length) {
                warning(t('versionHistory.restoreProtected', 'Restore completed. Protected manual changes were preserved.'));
            } else {
                success(t('versionHistory.restoreSuccess', 'Snapshot restored.'));
            }
        } catch (err) {
            console.error('[VersionHistory] Restore failed', err);
            showError(t('versionHistory.errors.restore', 'Could not restore this snapshot.'));
        } finally {
            setIsRestoring(false);
        }
    };

    const renderProjectSelector = () => (
        <select
            value={effectiveProjectId || ''}
            onChange={event => handleProjectSelect(event.target.value)}
            className="h-9 min-w-[220px] rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-sm text-q-text"
            aria-label={t('versionHistory.projectSelect', 'Project')}
        >
            <option value="" disabled>{t('versionHistory.selectProject', 'Select a project')}</option>
            {selectableProjects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
            ))}
        </select>
    );

    const renderSnapshotList = () => {
        if (isLoading) {
            return <div className="flex min-h-[320px] items-center justify-center"><QuimeraLoader size="md" /></div>;
        }
        if (!snapshots.length) {
            return (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[var(--q-radius-lg)] border border-dashed border-q-border p-8 text-center">
                    <History className="h-8 w-8 text-q-text-muted" />
                    <div>
                        <p className="text-sm font-semibold text-q-text">{t('versionHistory.emptyTitle', 'No snapshots yet')}</p>
                        <p className="mt-1 max-w-md text-sm text-q-text-muted">
                            {t('versionHistory.emptyDescription', 'AI actions will create automatic snapshots here before they change project data.')}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {snapshots.map(snapshot => {
                    const isSelected = selectedSnapshot?.id === snapshot.id;
                    const sourceTone = snapshot.source.startsWith('ai') ? 'ai' : snapshot.source === 'manual_save' ? 'manual' : 'neutral';
                    return (
                        <article
                            key={snapshot.id}
                            className={`rounded-[var(--q-radius-lg)] border p-4 transition-colors ${
                                isSelected ? 'border-q-accent bg-q-accent/5' : 'border-q-border bg-q-surface hover:border-q-border-strong'
                            }`}
                        >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate text-sm font-semibold text-q-text">{snapshot.label}</h2>
                                        <Badge tone={sourceTone}>{snapshot.source.replace(/_/g, ' ')}</Badge>
                                        <Badge>{snapshot.changeType.replace(/_/g, ' ')}</Badge>
                                        {snapshot.moduleKey && <Badge>{snapshot.moduleKey}</Badge>}
                                        {snapshot.sectionId && <Badge tone="protected">{snapshot.sectionId}</Badge>}
                                    </div>
                                    <p className="mt-1 text-xs text-q-text-muted">{formatDate(snapshot.createdAt)}</p>
                                    <p className="mt-2 text-sm text-q-text-muted">{snapshot.summary}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedSnapshotId(snapshot.id); setDetailMode('view'); }}
                                        className="inline-flex h-9 items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text hover:bg-q-surface-overlay"
                                    >
                                        <History className="h-4 w-4" />
                                        {t('versionHistory.view', 'View')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedSnapshotId(snapshot.id); setDetailMode('compare'); }}
                                        className="inline-flex h-9 items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text hover:bg-q-surface-overlay"
                                    >
                                        <GitCompare className="h-4 w-4" />
                                        {t('versionHistory.compare', 'Compare')}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isRestoring}
                                        onClick={() => runRestore(snapshot, normalizeRestoreTarget({ scope: 'project', confirmOverwriteProtected: overwriteProtected }, snapshot))}
                                        className="inline-flex h-9 items-center gap-2 rounded-[var(--q-radius-md)] bg-q-accent px-3 text-xs font-semibold text-q-text-on-accent hover:bg-q-accent-hover disabled:opacity-60"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t('versionHistory.restore', 'Restore')}
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        );
    };

    const renderDetails = () => {
        if (!selectedSnapshot) {
            return (
                <div className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-5 text-sm text-q-text-muted">
                    {t('versionHistory.selectSnapshot', 'Select a snapshot to inspect it.')}
                </div>
            );
        }

        return (
            <aside className="space-y-4">
                <section className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase text-q-text-muted">{t('versionHistory.selectedSnapshot', 'Selected snapshot')}</p>
                            <h2 className="mt-1 text-base font-semibold text-q-text">{selectedSnapshot.label}</h2>
                            <p className="mt-1 text-xs text-q-text-muted">{formatDate(selectedSnapshot.createdAt)}</p>
                        </div>
                        <Badge tone={selectedSnapshot.source.startsWith('ai') ? 'ai' : 'neutral'}>{selectedSnapshot.source.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-[var(--q-radius-md)] border border-q-border bg-q-bg p-3">
                            <p className="font-semibold text-q-text">{selectedSnapshot.scope}</p>
                            <p className="text-q-text-muted">{t('versionHistory.scope', 'Scope')}</p>
                        </div>
                        <div className="rounded-[var(--q-radius-md)] border border-q-border bg-q-bg p-3">
                            <p className="font-semibold text-q-text">{selectedSnapshot.moduleKey || '-'}</p>
                            <p className="text-q-text-muted">{t('versionHistory.module', 'Module')}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-q-text">{detailMode === 'compare' ? t('versionHistory.diff', 'Diff') : t('versionHistory.restoreOptions', 'Restore options')}</h3>
                        <button
                            type="button"
                            onClick={() => setDetailMode(detailMode === 'compare' ? 'view' : 'compare')}
                            className="text-xs font-semibold text-q-accent hover:text-q-accent-hover"
                        >
                            {detailMode === 'compare' ? t('versionHistory.showRestore', 'Show restore') : t('versionHistory.showDiff', 'Show diff')}
                        </button>
                    </div>

                    {detailMode === 'compare' && diff ? (
                        <div className="space-y-3">
                            <p className="text-sm text-q-text-muted">{diff.summary}</p>
                            <div className="flex flex-wrap gap-2">
                                {diff.changedModules.map(moduleKey => <Badge key={moduleKey}>{moduleKey}</Badge>)}
                                {diff.protectedPaths.map(path => <Badge key={path} tone="protected"><Shield className="mr-1 h-3 w-3" />{path}</Badge>)}
                            </div>
                            <div className="max-h-72 overflow-auto rounded-[var(--q-radius-md)] border border-q-border bg-q-bg p-3 text-xs text-q-text-muted">
                                {[...diff.changedPaths, ...diff.addedPaths, ...diff.removedPaths].slice(0, 80).map(path => (
                                    <div key={path} className="truncate py-0.5">{path}</div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="flex items-start gap-2 rounded-[var(--q-radius-md)] border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-q-text">
                                <input
                                    type="checkbox"
                                    checked={overwriteProtected}
                                    onChange={event => setOverwriteProtected(event.target.checked)}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="font-semibold">{t('versionHistory.overwriteProtected', 'Overwrite protected manual changes')}</span>
                                    <span className="mt-0.5 block text-q-text-muted">{t('versionHistory.overwriteProtectedHint', 'Leave off to preserve userModified and lockedFromRegeneration content.')}</span>
                                </span>
                            </label>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-q-text-muted">{t('versionHistory.restoreModule', 'Restore module')}</label>
                                <div className="flex gap-2">
                                    <select
                                        value={restoreModuleKey}
                                        onChange={event => setRestoreModuleKey(event.target.value as BusinessBlueprintModuleKey)}
                                        className="min-w-0 flex-1 rounded-[var(--q-radius-md)] border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text"
                                    >
                                        {MODULE_KEYS.map(moduleKey => <option key={moduleKey} value={moduleKey}>{moduleKey}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={isRestoring}
                                        onClick={() => runRestore(selectedSnapshot, { scope: 'module', moduleKey: restoreModuleKey, confirmOverwriteProtected: overwriteProtected })}
                                        className="inline-flex h-10 items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text hover:bg-q-surface-overlay disabled:opacity-60"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t('versionHistory.restore', 'Restore')}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-q-text-muted">{t('versionHistory.restoreSection', 'Restore section by ID')}</label>
                                <div className="flex gap-2">
                                    <input
                                        value={restoreSectionId}
                                        onChange={event => setRestoreSectionId(event.target.value)}
                                        placeholder={t('versionHistory.sectionIdPlaceholder', 'section id')}
                                        className="min-w-0 flex-1 rounded-[var(--q-radius-md)] border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text"
                                    />
                                    <button
                                        type="button"
                                        disabled={isRestoring || !restoreSectionId.trim()}
                                        onClick={() => runRestore(selectedSnapshot, { scope: 'section', sectionId: restoreSectionId.trim(), confirmOverwriteProtected: overwriteProtected })}
                                        className="inline-flex h-10 items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text hover:bg-q-surface-overlay disabled:opacity-60"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t('versionHistory.restore', 'Restore')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </aside>
        );
    };

    return (
        <div className="flex h-screen bg-q-bg text-q-text">
            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="quimera-dashboard-header-bar h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-q-text hover:bg-muted rounded-lg transition-colors"
                            aria-label={t('common.openMenu', 'Open menu')}
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <History className="h-5 w-5 text-q-accent" />
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-semibold text-q-text">{t('versionHistory.title', 'Version History')}</h1>
                            <p className="hidden truncate text-xs text-q-text-muted sm:block">{projectName || effectiveProject?.name || t('versionHistory.noProject', 'No project selected')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:block">{renderProjectSelector()}</div>
                        <button
                            type="button"
                            onClick={() => effectiveProjectId && loadHistory(effectiveProjectId)}
                            disabled={!effectiveProjectId || isLoading}
                            className="inline-flex h-9 items-center gap-2 rounded-[var(--q-radius-md)] border border-q-border bg-q-surface px-3 text-xs font-semibold text-q-text hover:bg-q-surface-overlay disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
                        </button>
                        <HeaderBackButton onClick={() => setView('dashboard')} />
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto flex max-w-7xl flex-col gap-5">
                        <div className="md:hidden">{renderProjectSelector()}</div>
                        <section className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-4">
                                <p className="text-2xl font-semibold text-q-text">{snapshots.length}</p>
                                <p className="text-xs font-semibold uppercase text-q-text-muted">{t('versionHistory.snapshots', 'Snapshots')}</p>
                            </div>
                            <div className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-4">
                                <p className="truncate text-sm font-semibold text-q-text">{formatDate(snapshots[0]?.createdAt)}</p>
                                <p className="text-xs font-semibold uppercase text-q-text-muted">{t('versionHistory.latest', 'Latest')}</p>
                            </div>
                            <div className="rounded-[var(--q-radius-lg)] border border-q-border bg-q-surface p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-q-text">
                                    {overwriteProtected ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <Check className="h-4 w-4 text-emerald-500" />}
                                    {overwriteProtected ? t('versionHistory.overwriteOn', 'Overwrite enabled') : t('versionHistory.safeRestoreOn', 'Safe restore on')}
                                </div>
                                <p className="text-xs font-semibold uppercase text-q-text-muted">{t('versionHistory.guardrails', 'Guardrails')}</p>
                            </div>
                        </section>

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                            <section className="min-w-0">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-base font-semibold text-q-text">{t('versionHistory.history', 'History')}</h2>
                                        <p className="text-sm text-q-text-muted">{t('versionHistory.historyHint', 'Automatic snapshots created before AI mutations.')}</p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-q-text-muted" />
                                </div>
                                {renderSnapshotList()}
                            </section>
                            {renderDetails()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default VersionHistoryDashboard;
