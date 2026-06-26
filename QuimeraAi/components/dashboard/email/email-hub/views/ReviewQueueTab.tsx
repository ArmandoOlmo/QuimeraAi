import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit2, FileText, Inbox, Loader2, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { AppButton } from '../../../../ui/system/AppButton';
import type { EmailReviewIntent, ReviewedIntentDraft, useEmailIntentReviewQueue } from '../hooks/useEmailIntentReviewQueue';
import type { UserEmailCampaign } from '../types';
import { describeEmailReviewQueueFilter } from '../../../../../services/email/emailReviewQueueLinkService.ts';

type ReviewQueue = ReturnType<typeof useEmailIntentReviewQueue>;

interface ReviewQueueTabProps {
    reviewQueue: ReviewQueue;
    campaignDrafts: UserEmailCampaign[];
    onEditCampaign: (campaign: UserEmailCampaign) => void;
    hasActiveFilter?: boolean;
    onClearFilters?: () => void;
}

const ReviewQueueTab: React.FC<ReviewQueueTabProps> = ({
    reviewQueue,
    campaignDrafts,
    onEditCampaign,
    hasActiveFilter,
    onClearFilters,
}) => {
    const [drafts, setDrafts] = useState<Record<string, ReviewedIntentDraft>>({});
    const [lastResult, setLastResult] = useState<Record<string, string>>({});

    useEffect(() => {
        setDrafts(prev => {
            const next = { ...prev };
            for (const intent of reviewQueue.intents) {
                if (!next[intent.id]) {
                    next[intent.id] = {
                        subject: intent.subject,
                        html: readInitialHtml(intent),
                        text: '',
                    };
                }
            }
            return next;
        });
    }, [reviewQueue.intents]);

    const filteredCampaignDrafts = hasActiveFilter ? [] : campaignDrafts;
    const hasPendingWork = reviewQueue.intents.length > 0 || filteredCampaignDrafts.length > 0;

    const sourceCounts = useMemo(() => {
        return reviewQueue.intents.reduce<Record<string, number>>((acc, intent) => {
            const key = intent.sourceModule || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }, [reviewQueue.intents]);

    const handleDraftChange = (intentId: string, field: keyof ReviewedIntentDraft, value: string) => {
        setDrafts(prev => ({
            ...prev,
            [intentId]: {
                subject: prev[intentId]?.subject || '',
                html: prev[intentId]?.html || '',
                text: prev[intentId]?.text || '',
                [field]: value,
            },
        }));
    };

    const handleApprove = async (intent: EmailReviewIntent) => {
        const result = await reviewQueue.approveIntent(intent, drafts[intent.id] || { subject: '', html: '' });
        const status = result?.status || result?.result?.status || 'queued';
        setLastResult(prev => ({ ...prev, [intent.id]: String(status) }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-q-text">Review Queue</h2>
                    <p className="text-sm text-q-text-secondary">Cross-module email drafts stay here until reviewed and explicitly approved.</p>
                </div>
                <AppButton
                    variant="secondary"
                    size="sm"
                    onClick={reviewQueue.refresh}
                    loading={reviewQueue.isLoading}
                    leftIcon={<RefreshCw size={14} />}
                >
                    Refresh
                </AppButton>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <MetricTile icon={<Inbox size={18} />} label="Transactional intents" value={reviewQueue.pendingCount} />
                <MetricTile icon={<FileText size={18} />} label="Campaign drafts" value={filteredCampaignDrafts.length} />
                <MetricTile icon={<ShieldCheck size={18} />} label="Safe sends" value="Reviewed only" />
            </div>

            {hasActiveFilter && (
                <div className="flex flex-col gap-3 rounded-lg border border-q-accent/30 bg-q-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-q-accent">Entity filter</p>
                        <p className="mt-1 text-sm text-q-text">{describeEmailReviewQueueFilter(reviewQueue.filters)}</p>
                    </div>
                    {onClearFilters && (
                        <AppButton variant="secondary" size="sm" onClick={onClearFilters}>
                            Show all reviews
                        </AppButton>
                    )}
                </div>
            )}

            {reviewQueue.error && (
                <div className="flex items-start gap-3 rounded-lg border border-q-error/30 bg-q-error/10 p-4 text-sm text-q-error">
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{reviewQueue.error}</span>
                </div>
            )}

            {reviewQueue.isLoading && (
                <div className="flex items-center justify-center rounded-lg border border-q-border bg-q-surface py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-q-accent" />
                </div>
            )}

            {!reviewQueue.isLoading && !hasPendingWork && (
                <div className="rounded-lg border border-q-border bg-q-surface p-10 text-center">
                    <CheckCircle2 size={36} className="mx-auto mb-3 text-q-success" />
                    <h3 className="text-base font-semibold text-q-text">{hasActiveFilter ? 'No pending email review for this entity' : 'No pending email review'}</h3>
                    <p className="mt-1 text-sm text-q-text-secondary">
                        {hasActiveFilter ? 'This entity has no review-blocked email intent right now.' : 'AI and cross-module email output will appear here before it can send.'}
                    </p>
                </div>
            )}

            {reviewQueue.intents.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-q-text-secondary">Transactional intents</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(sourceCounts).map(([source, count]) => (
                                <span key={source} className="rounded-full border border-q-border bg-q-surface px-2 py-0.5 text-xs text-q-text-secondary">
                                    {source}: {count}
                                </span>
                            ))}
                        </div>
                    </div>

                    {reviewQueue.intents.map(intent => {
                        const draft = drafts[intent.id] || { subject: intent.subject, html: '', text: '' };
                        const missingHtml = !draft.html.trim();
                        const unsafeDraft = !intent.safeToEdit;
                        const missingRequired = intent.missingFields.length > 0 || !draft.subject.trim() || missingHtml || unsafeDraft;
                        const isApproving = reviewQueue.approvingIntentId === intent.id;

                        return (
                            <article key={intent.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-q-accent/10 px-2 py-0.5 text-xs font-semibold text-q-accent">{intent.sourceModule}</span>
                                            <span className="rounded-full border border-q-border px-2 py-0.5 text-xs text-q-text-secondary">{intent.sourceEvent || intent.type}</span>
                                            <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">needs review</span>
                                        </div>
                                        <h4 className="mt-2 truncate text-base font-semibold text-q-text">{intent.subject || 'Untitled transactional email'}</h4>
                                        <p className="mt-1 text-sm text-q-text-secondary">
                                            {intent.recipientEmail || 'Missing recipient'} - {intent.sourceEntityType || 'entity'} {intent.sourceEntityId || intent.id}
                                        </p>
                                    </div>
                                    <AppButton
                                        variant="primary"
                                        size="sm"
                                        disabled={missingRequired || isApproving}
                                        loading={isApproving}
                                        onClick={() => handleApprove(intent)}
                                        leftIcon={<Send size={14} />}
                                    >
                                        Approve and send
                                    </AppButton>
                                </div>

                                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-q-text-secondary">Reviewed subject</span>
                                        <input
                                            value={draft.subject}
                                            onChange={event => handleDraftChange(intent.id, 'subject', event.target.value)}
                                            className="w-full rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none focus:border-q-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-q-text-secondary">Reviewed HTML</span>
                                        <textarea
                                            value={draft.html}
                                            onChange={event => handleDraftChange(intent.id, 'html', event.target.value)}
                                            rows={4}
                                            className="w-full resize-y rounded-lg border border-q-border bg-q-bg px-3 py-2 font-mono text-xs text-q-text outline-none focus:border-q-accent"
                                            placeholder="<p>Reviewed email body...</p>"
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-q-text-secondary">
                                    {intent.missingFields.map(field => (
                                        <span key={field} className="rounded-full border border-q-error/30 bg-q-error/10 px-2 py-0.5 text-q-error">Missing {field}</span>
                                    ))}
                                    {unsafeDraft && <span className="rounded-full border border-q-error/30 bg-q-error/10 px-2 py-0.5 text-q-error">Unsafe to edit</span>}
                                    {missingHtml && <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-q-warning">HTML required</span>}
                                    {lastResult[intent.id] && <span className="rounded-full border border-q-success/30 bg-q-success/10 px-2 py-0.5 text-q-success">Last result: {lastResult[intent.id]}</span>}
                                    <span>Idempotency: {intent.idempotencyKey || 'missing'}</span>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {filteredCampaignDrafts.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-q-text-secondary">Campaign drafts needing review</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {filteredCampaignDrafts.map(campaign => (
                            <article key={campaign.id} className="rounded-lg border border-q-border bg-q-surface p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-q-accent/10 px-2 py-0.5 text-xs font-semibold text-q-accent">{campaign.sourceModule || 'email-hub'}</span>
                                            <span className="rounded-full border border-q-warning/30 bg-q-warning/10 px-2 py-0.5 text-xs font-semibold text-q-warning">draft</span>
                                        </div>
                                        <h4 className="mt-2 truncate text-base font-semibold text-q-text">{campaign.name}</h4>
                                        <p className="mt-1 truncate text-sm text-q-text-secondary">{campaign.subject}</p>
                                    </div>
                                    <AppButton variant="secondary" size="sm" onClick={() => onEditCampaign(campaign)} leftIcon={<Edit2 size={14} />}>
                                        Review
                                    </AppButton>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

const MetricTile: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
    <div className="rounded-lg border border-q-border bg-q-surface p-4">
        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-q-accent/10 text-q-accent">{icon}</div>
        <div className="text-xl font-semibold text-q-text">{value}</div>
        <div className="text-sm text-q-text-secondary">{label}</div>
    </div>
);

function readInitialHtml(intent: EmailReviewIntent) {
    if (!intent.safeToEdit) return '';
    const metadata = intent.metadata || {};
    return String(metadata.reviewedHtml || metadata.reviewed_html || metadata.html || metadata.htmlContent || metadata.html_content || '');
}

export default ReviewQueueTab;
