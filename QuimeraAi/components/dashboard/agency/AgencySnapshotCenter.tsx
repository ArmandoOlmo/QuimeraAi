import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Layers,
    Loader2,
    Lock,
    RefreshCw,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useTenant } from '../../../contexts/tenant/TenantContext';
import { useServiceAccess } from '../../../hooks/useServiceAccess';
import { supabase } from '../../../supabase';
import type { Project } from '../../../types';
import {
    agencySnapshotService,
    type AgencySnapshotApplyResult,
    type AgencySnapshotApplicationPreview,
    type AgencySnapshotRow,
} from '../../../services/agency/agencySnapshotService';
import { AgencyPanel, AgencyStatCard } from './AgencyDesignSystem';

interface AgencySnapshotCenterProps {
    projects: Project[];
    onSnapshotApplied?: () => Promise<void> | void;
}

function readSnapshotModules(snapshot: AgencySnapshotRow): string[] {
    const metadata = snapshot.metadata && typeof snapshot.metadata === 'object' && !Array.isArray(snapshot.metadata)
        ? snapshot.metadata as Record<string, unknown>
        : {};
    return Array.isArray(metadata.includedModules)
        ? metadata.includedModules.map(item => String(item || '').trim()).filter(Boolean)
        : [];
}

function formatSnapshotDate(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

async function postAgencySnapshotApi<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Tu sesion expiro. Inicia sesion de nuevo.');

    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const text = await response.text();
    let body: unknown = {};
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = { error: text };
        }
    }
    if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body
            ? String((body as { error?: unknown }).error || '')
            : '';
        throw new Error(message || `Agency snapshot API failed with ${response.status}`);
    }
    return body as T;
}

export function AgencySnapshotCenter({ projects, onSnapshotApplied }: AgencySnapshotCenterProps) {
    const { t } = useTranslation();
    const { currentTenant } = useTenant();
    const serviceAccess = useServiceAccess();
    const snapshotAccess = serviceAccess.canAccessModule('agency-project-transfer', {
        serviceId: 'agency',
        featureKey: 'agencyModule',
        requiredPermission: 'canManageProjects',
    });
    const canUseSnapshots = !serviceAccess.isLoading && snapshotAccess.allowed;
    const agencyTenantId = currentTenant?.id || '';
    const projectOptions = React.useMemo(
        () => projects.filter(project => project.id && project.status !== 'Template'),
        [projects],
    );

    const [snapshots, setSnapshots] = React.useState<AgencySnapshotRow[]>([]);
    const [sourceProjectId, setSourceProjectId] = React.useState('');
    const [targetProjectId, setTargetProjectId] = React.useState('');
    const [selectedSnapshotId, setSelectedSnapshotId] = React.useState('');
    const [snapshotName, setSnapshotName] = React.useState('');
    const [preview, setPreview] = React.useState<AgencySnapshotApplicationPreview | null>(null);
    const [loadingSnapshots, setLoadingSnapshots] = React.useState(false);
    const [creatingSnapshot, setCreatingSnapshot] = React.useState(false);
    const [previewingSnapshot, setPreviewingSnapshot] = React.useState(false);
    const [applyingSnapshot, setApplyingSnapshot] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    const selectedSnapshot = snapshots.find(snapshot => snapshot.id === selectedSnapshotId) || null;
    const selectedSourceProject = projectOptions.find(project => project.id === sourceProjectId) || projectOptions[0] || null;
    const selectedTargetProject = projectOptions.find(project => project.id === targetProjectId) || projectOptions[0] || null;
    const activeSnapshots = snapshots.filter(snapshot => snapshot.status === 'active').length;
    const selectedSnapshotModules = selectedSnapshot ? readSnapshotModules(selectedSnapshot) : [];

    const loadSnapshots = React.useCallback(async () => {
        if (!agencyTenantId || !canUseSnapshots) return;
        setLoadingSnapshots(true);
        setError(null);
        try {
            const rows = await agencySnapshotService.listSnapshots(agencyTenantId);
            setSnapshots(rows);
            setSelectedSnapshotId(current => current && rows.some(row => row.id === current)
                ? current
                : rows.find(row => row.status === 'active')?.id || rows[0]?.id || '');
        } catch (err: any) {
            setError(err?.message || t('agency.snapshots.loadError', 'No se pudieron cargar los snapshots.'));
        } finally {
            setLoadingSnapshots(false);
        }
    }, [agencyTenantId, canUseSnapshots, t]);

    React.useEffect(() => {
        if (!sourceProjectId && selectedSourceProject) {
            setSourceProjectId(selectedSourceProject.id);
        }
        if (!targetProjectId && selectedTargetProject) {
            setTargetProjectId(selectedTargetProject.id);
        }
    }, [selectedSourceProject, selectedTargetProject, sourceProjectId, targetProjectId]);

    React.useEffect(() => {
        if (!snapshotName && selectedSourceProject) {
            setSnapshotName(`${selectedSourceProject.name} Snapshot`);
        }
    }, [selectedSourceProject, snapshotName]);

    React.useEffect(() => {
        loadSnapshots();
    }, [loadSnapshots]);

    React.useEffect(() => {
        setPreview(null);
        setSuccess(null);
    }, [selectedSnapshotId, targetProjectId]);

    const handleCreateSnapshot = async () => {
        if (!agencyTenantId || !selectedSourceProject || !canUseSnapshots) return;
        setCreatingSnapshot(true);
        setError(null);
        setSuccess(null);
        try {
            const result = await postAgencySnapshotApi<{ snapshot: AgencySnapshotRow }>('/api/agency/snapshots/create', {
                agencyTenantId,
                sourceProjectId: selectedSourceProject.id,
                name: snapshotName.trim() || `${selectedSourceProject.name} Snapshot`,
                description: t('agency.snapshots.defaultDescription', 'Snapshot creado desde el centro de proyectos de agencia.'),
                snapshotType: 'project_template',
                status: 'active',
                tags: ['agency-template'],
                versionLabel: t('agency.snapshots.initialVersion', 'Initial project snapshot'),
            });
            setSuccess(t('agency.snapshots.created', 'Snapshot creado.'));
            setSelectedSnapshotId(result.snapshot.id);
            await loadSnapshots();
        } catch (err: any) {
            setError(err?.message || t('agency.snapshots.createError', 'No se pudo crear el snapshot.'));
        } finally {
            setCreatingSnapshot(false);
        }
    };

    const handlePreviewSnapshot = async () => {
        if (!agencyTenantId || !selectedSnapshot || !selectedTargetProject || !canUseSnapshots) return;
        setPreviewingSnapshot(true);
        setError(null);
        setSuccess(null);
        try {
            const nextPreview = await postAgencySnapshotApi<AgencySnapshotApplicationPreview>('/api/agency/snapshots/apply-preview', {
                agencyTenantId,
                snapshotId: selectedSnapshot.id,
                targetProjectId: selectedTargetProject.id,
            });
            setPreview(nextPreview);
        } catch (err: any) {
            setError(err?.message || t('agency.snapshots.previewError', 'No se pudo generar el preview.'));
        } finally {
            setPreviewingSnapshot(false);
        }
    };

    const handleApplySnapshot = async () => {
        if (!agencyTenantId || !selectedSnapshot || !selectedTargetProject || !canUseSnapshots) return;
        setApplyingSnapshot(true);
        setError(null);
        setSuccess(null);
        try {
            const result = await postAgencySnapshotApi<AgencySnapshotApplyResult>('/api/agency/snapshots/apply', {
                agencyTenantId,
                snapshotId: selectedSnapshot.id,
                targetProjectId: selectedTargetProject.id,
                idempotencyKey: preview?.idempotencyKey,
            });
            setPreview(result.preview);
            if (result.status === 'failed') {
                setError(result.error || t('agency.snapshots.applyError', 'No se pudo aplicar el snapshot.'));
            } else {
                setSuccess(result.status === 'duplicate'
                    ? t('agency.snapshots.duplicate', 'Snapshot ya aplicado con la misma llave.')
                    : t('agency.snapshots.applied', 'Snapshot aplicado en borrador.'));
                await onSnapshotApplied?.();
            }
        } catch (err: any) {
            setError(err?.message || t('agency.snapshots.applyError', 'No se pudo aplicar el snapshot.'));
        } finally {
            setApplyingSnapshot(false);
        }
    };

    if (serviceAccess.isLoading) {
        return (
            <AgencyPanel title={t('agency.snapshots.title', 'Snapshot Center')} icon={Layers}>
                <div className="flex items-center gap-2 text-sm text-q-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('agency.snapshots.validatingAccess', 'Validando acceso')}
                </div>
            </AgencyPanel>
        );
    }

    if (!snapshotAccess.allowed) {
        return (
            <AgencyPanel title={t('agency.snapshots.title', 'Snapshot Center')} icon={Layers}>
                <div className="flex items-center gap-3 rounded-lg border border-q-border bg-q-bg/50 p-4 text-sm text-q-text-muted">
                    <Lock className="h-5 w-5 shrink-0" />
                    <span>{snapshotAccess.message}</span>
                </div>
            </AgencyPanel>
        );
    }

    return (
        <AgencyPanel
            title={t('agency.snapshots.title', 'Snapshot Center')}
            icon={Layers}
            action={
                <button
                    type="button"
                    onClick={loadSnapshots}
                    disabled={loadingSnapshots}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-q-border bg-q-surface hover:bg-muted disabled:opacity-50"
                    title={t('agency.snapshots.refresh', 'Refresh')}
                >
                    <RefreshCw className={`h-4 w-4 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                </button>
            }
        >
            <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <AgencyStatCard
                        icon={Layers}
                        label={t('agency.snapshots.total', 'Snapshots')}
                        value={snapshots.length}
                        tone="accent"
                    />
                    <AgencyStatCard
                        icon={CheckCircle2}
                        label={t('agency.snapshots.active', 'Activos')}
                        value={activeSnapshots}
                        tone="success"
                    />
                    <AgencyStatCard
                        icon={ShieldCheck}
                        label={t('agency.snapshots.runtime', 'Runtime')}
                        value={t('agency.snapshots.draftOnly', 'Draft')}
                        tone="warning"
                    />
                </div>

                {projectOptions.length === 0 ? (
                    <div className="rounded-lg border border-q-border bg-q-bg/50 p-4 text-sm text-q-text-muted">
                        {t('agency.snapshots.noProjects', 'No hay proyectos disponibles para capturar o aplicar snapshots.')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <div className="space-y-3 rounded-lg border border-q-border bg-q-bg/40 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <FileText className="h-4 w-4 text-q-text-muted" />
                                {t('agency.snapshots.capture', 'Capturar snapshot')}
                            </div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                {t('agency.snapshots.sourceProject', 'Proyecto origen')}
                            </label>
                            <select
                                value={sourceProjectId}
                                onChange={(event) => {
                                    setSourceProjectId(event.target.value);
                                    const nextProject = projectOptions.find(project => project.id === event.target.value);
                                    if (nextProject) setSnapshotName(`${nextProject.name} Snapshot`);
                                }}
                                className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                {projectOptions.map(project => (
                                    <option key={project.id} value={project.id}>{project.name}</option>
                                ))}
                            </select>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                {t('agency.snapshots.name', 'Nombre')}
                            </label>
                            <input
                                value={snapshotName}
                                onChange={(event) => setSnapshotName(event.target.value)}
                                className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground placeholder:text-q-text-muted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={t('agency.snapshots.namePlaceholder', 'Client starter snapshot')}
                            />
                            <button
                                type="button"
                                onClick={handleCreateSnapshot}
                                disabled={creatingSnapshot || !selectedSourceProject}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creatingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {t('agency.snapshots.create', 'Crear snapshot')}
                            </button>
                        </div>

                        <div className="space-y-3 rounded-lg border border-q-border bg-q-bg/40 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Layers className="h-4 w-4 text-q-text-muted" />
                                {t('agency.snapshots.apply', 'Aplicar snapshot')}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                        {t('agency.snapshots.snapshot', 'Snapshot')}
                                    </label>
                                    <select
                                        value={selectedSnapshotId}
                                        onChange={(event) => setSelectedSnapshotId(event.target.value)}
                                        className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="">{t('agency.snapshots.selectSnapshot', 'Selecciona snapshot')}</option>
                                        {snapshots.map(snapshot => (
                                            <option key={snapshot.id} value={snapshot.id}>
                                                {snapshot.name} · {snapshot.status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-q-text-muted">
                                        {t('agency.snapshots.targetProject', 'Proyecto destino')}
                                    </label>
                                    <select
                                        value={targetProjectId}
                                        onChange={(event) => setTargetProjectId(event.target.value)}
                                        className="w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        {projectOptions.map(project => (
                                            <option key={project.id} value={project.id}>{project.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedSnapshot && (
                                <div className="rounded-lg border border-q-border/70 bg-q-surface/70 p-3 text-xs text-q-text-muted">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-foreground">{selectedSnapshot.name}</span>
                                        <span className="rounded-full bg-q-bg px-2 py-0.5 uppercase">{selectedSnapshot.status}</span>
                                        {selectedSnapshot.updated_at && <span>{formatSnapshotDate(selectedSnapshot.updated_at)}</span>}
                                    </div>
                                    {selectedSnapshotModules.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {selectedSnapshotModules.slice(0, 6).map(moduleId => (
                                                <span key={moduleId} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                    {moduleId}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handlePreviewSnapshot}
                                    disabled={previewingSnapshot || !selectedSnapshot || !selectedTargetProject}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {previewingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                    {t('agency.snapshots.preview', 'Previsualizar')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplySnapshot}
                                    disabled={applyingSnapshot || !preview || !preview.readiness.isReady}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {applyingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {t('agency.snapshots.applyDraft', 'Aplicar en Draft')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(error || success) && (
                    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${error
                        ? 'border-q-error/30 bg-q-error/10 text-q-error'
                        : 'border-q-success/30 bg-q-success/10 text-q-success'
                        }`}>
                        {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                        <span>{error || success}</span>
                    </div>
                )}

                {preview && (
                    <div className="rounded-lg border border-q-border bg-q-surface/70 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    {t('agency.snapshots.previewTitle', 'Preview de aplicación')}
                                </p>
                                <p className="text-xs text-q-text-muted">
                                    {preview.snapshotName} {'->'} {preview.targetProjectName}
                                </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${preview.readiness.isReady
                                ? 'bg-q-success/10 text-q-success'
                                : 'bg-q-warning/10 text-q-warning'
                                }`}>
                                {preview.readiness.isReady
                                    ? t('agency.snapshots.ready', 'Ready')
                                    : t('agency.snapshots.needsReview', 'Needs review')}
                            </span>
                        </div>
                        {preview.readiness.blockers.length > 0 && (
                            <div className="mb-3 rounded-lg border border-q-warning/30 bg-q-warning/10 p-3 text-xs text-q-warning">
                                {preview.readiness.blockers.join(', ')}
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {preview.changes.slice(0, 8).map(change => (
                                <div key={change.field} className="rounded-lg border border-q-border/70 bg-q-bg/40 p-3">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-q-text-muted">{change.field}</span>
                                        <span className="rounded-full bg-q-surface px-2 py-0.5 text-[11px] text-q-text-muted">{change.action}</span>
                                    </div>
                                    <p className="text-xs text-q-text-muted">
                                        {change.beforeSummary} {'->'} <span className="text-foreground">{change.afterSummary}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AgencyPanel>
    );
}
