import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CheckCircle2,
    Clock3,
    Loader2,
    MessageSquareWarning,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { usePortal } from './PortalContext';
import { usePortalApprovals, type PortalApproval, type PortalApprovalDecision } from '../../hooks/usePortalApprovals';

function getStatusClass(status: PortalApproval['status']) {
    switch (status) {
        case 'approved':
            return 'bg-q-success/10 text-q-success';
        case 'rejected':
            return 'bg-q-error/10 text-q-error';
        case 'change_requested':
            return 'bg-q-warning/10 text-q-warning';
        case 'pending':
            return 'bg-q-accent/10 text-q-accent';
        default:
            return 'bg-muted text-q-text-muted';
    }
}

const PortalApprovalsPanel: React.FC = () => {
    const { t } = useTranslation();
    const { tenant, theme } = usePortal();
    const {
        approvals,
        pendingApprovals,
        isLoading,
        isResponding,
        error,
        respondApproval,
    } = usePortalApprovals(tenant?.id);
    const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
    const [responseNote, setResponseNote] = useState('');

    const visibleApprovals = pendingApprovals.length > 0 ? pendingApprovals : approvals.slice(0, 3);

    const handleRespond = async (approvalId: string, decision: PortalApprovalDecision) => {
        await respondApproval(approvalId, decision, responseNote);
        setActiveApprovalId(null);
        setResponseNote('');
    };

    if (isLoading) {
        return (
            <section className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-q-text-muted" />
                    <span className="text-sm text-q-text-muted">
                        {t('portal.approvals.loading', 'Loading approvals...')}
                    </span>
                </div>
            </section>
        );
    }

    if (!isLoading && approvals.length === 0) {
        return (
            <section className="bg-q-surface border border-q-border rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${theme.primaryColor}18` }}
                    >
                        <ShieldCheck className="h-5 w-5" style={{ color: theme.primaryColor }} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground">
                            {t('portal.approvals.title', 'Approvals')}
                        </h2>
                        <p className="mt-1 text-sm text-q-text-muted">
                            {t('portal.approvals.empty', 'No pending approvals right now.')}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-q-surface border border-q-border rounded-xl overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-q-border p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" style={{ color: theme.primaryColor }} />
                        <h2 className="font-semibold text-foreground">
                            {t('portal.approvals.title', 'Approvals')}
                        </h2>
                    </div>
                    <p className="mt-1 text-sm text-q-text-muted">
                        {t('portal.approvals.subtitle', 'Review transferred projects and agency requests before they go live.')}
                    </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-q-accent/10 px-3 py-1 text-xs font-medium text-q-accent">
                    <Clock3 className="h-3.5 w-3.5" />
                    {t('portal.approvals.pendingCount', '{{count}} pending', { count: pendingApprovals.length })}
                </span>
            </div>

            {error && (
                <div className="border-b border-q-border bg-q-error/10 px-5 py-3 text-sm text-q-error">
                    {error}
                </div>
            )}

            <div className="divide-y divide-border">
                {visibleApprovals.map((approval) => {
                    const isActive = activeApprovalId === approval.id;
                    const isPending = approval.status === 'pending';
                    const responding = isResponding === approval.id;

                    return (
                        <article key={approval.id} className="p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-medium text-foreground">
                                            {approval.title}
                                        </h3>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(approval.status)}`}>
                                            {t(`portal.approvals.status.${approval.status}`, approval.status)}
                                        </span>
                                    </div>
                                    {approval.description && (
                                        <p className="mt-1 text-sm text-q-text-muted">
                                            {approval.description}
                                        </p>
                                    )}
                                    <p className="mt-2 text-xs text-q-text-muted">
                                        {t('portal.approvals.requestedAt', 'Requested {{date}}', {
                                            date: new Date(approval.requestedAt).toLocaleDateString(),
                                        })}
                                    </p>
                                    {approval.responseNote && (
                                        <p className="mt-2 text-sm text-q-text-muted">
                                            {approval.responseNote}
                                        </p>
                                    )}
                                </div>

                                {isPending && !isActive && (
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRespond(approval.id, 'approved')}
                                            disabled={responding}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-q-success px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                                        >
                                            {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                            {t('portal.approvals.approve', 'Approve')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveApprovalId(approval.id)}
                                            disabled={responding}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                                        >
                                            <MessageSquareWarning className="h-4 w-4" />
                                            {t('portal.approvals.requestChanges', 'Request changes')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isPending && isActive && (
                                <div className="mt-4 rounded-lg bg-secondary/40 p-4">
                                    <label className="block text-sm font-medium text-foreground">
                                        {t('portal.approvals.responseNote', 'Response note')}
                                    </label>
                                    <textarea
                                        value={responseNote}
                                        onChange={(event) => setResponseNote(event.target.value)}
                                        rows={3}
                                        className="mt-2 w-full rounded-lg border border-q-border bg-q-surface p-3 text-sm text-foreground outline-none focus:ring-2"
                                        style={{ '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
                                        placeholder={t('portal.approvals.responsePlaceholder', 'Tell the agency what should change or why this was rejected.')}
                                    />
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleRespond(approval.id, 'change_requested')}
                                            disabled={responding || !responseNote.trim()}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-q-warning px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                                        >
                                            {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareWarning className="h-4 w-4" />}
                                            {t('portal.approvals.sendChanges', 'Send changes')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRespond(approval.id, 'rejected')}
                                            disabled={responding || !responseNote.trim()}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-q-error px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            {t('portal.approvals.reject', 'Reject')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveApprovalId(null);
                                                setResponseNote('');
                                            }}
                                            disabled={responding}
                                            className="rounded-lg border border-q-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default PortalApprovalsPanel;
