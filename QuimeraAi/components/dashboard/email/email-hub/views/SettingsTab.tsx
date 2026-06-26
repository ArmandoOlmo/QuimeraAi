import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Globe2, MailCheck, Save, ShieldCheck, SlidersHorizontal, TestTube2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmailSettings } from '../../../../../hooks/useEmailSettings';
import AppSelect from '../../../../ui/AppSelect';
import { AppButton } from '../../../../ui/system/AppButton';
import type { EmailProviderReadiness, EmailSettings } from '../../../../../types/email';

interface SettingsTabProps {
    userId: string;
    projectId: string;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ userId, projectId }) => {
    const { t } = useTranslation();
    const { settings, updateSettings, syncProviderReadiness, provisionProviderDomain, isLoading, isSaving, error } = useEmailSettings(userId, projectId);
    const [saved, setSaved] = useState(false);
    const [synced, setSynced] = useState(false);
    const [domainProvisioned, setDomainProvisioned] = useState(false);
    const [form, setForm] = useState<Partial<EmailSettings> | null>(null);
    const [rateLimitTarget, setRateLimitTarget] = useState<'default' | 'resend' | 'sendgrid'>('default');
    const [copiedDnsRecord, setCopiedDnsRecord] = useState<string | null>(null);

    const effective = useMemo(() => ({ ...(settings || {}), ...(form || {}) }) as Partial<EmailSettings>, [settings, form]);
    const readiness = useMemo(() => calculateReadiness(effective), [effective]);
    const rateLimitPolicy = useMemo(() => ((effective.rateLimits as any)?.[rateLimitTarget] || {}) as Record<string, number>, [effective.rateLimits, rateLimitTarget]);
    const dnsRecords = useMemo(() => extractProviderDnsRecords(effective.providerReadiness?.raw), [effective.providerReadiness]);

    const setField = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => {
        setSaved(false);
        setForm(prev => ({ ...(prev || {}), [key]: value }));
    };

    const updateNested = (group: 'transactional' | 'marketing' | 'compliance' | 'tracking', key: string, value: unknown) => {
        setSaved(false);
        setForm(prev => ({
            ...(prev || {}),
            [group]: {
                ...((effective as any)[group] || {}),
                [key]: value,
            },
        }));
    };

    const updateRateLimit = (key: 'maxPerRun' | 'maxPerMinute' | 'retryAfterSeconds', value: number | undefined) => {
        setSaved(false);
        const nextPolicy = { ...rateLimitPolicy, [key]: value };
        Object.keys(nextPolicy).forEach(policyKey => {
            if (nextPolicy[policyKey] === undefined) delete nextPolicy[policyKey];
        });
        const nextRateLimits: Record<string, unknown> = { ...((effective.rateLimits as any) || {}) };
        if (Object.keys(nextPolicy).length > 0) {
            nextRateLimits[rateLimitTarget] = nextPolicy;
        } else {
            delete nextRateLimits[rateLimitTarget];
        }
        setForm(prev => ({ ...(prev || {}), rateLimits: nextRateLimits as any }));
    };

    const handleSave = async () => {
        if (!form) return;
        await updateSettings(form);
        setForm(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleSyncProvider = async () => {
        if (form) {
            await updateSettings(form);
            setForm(null);
        }
        await syncProviderReadiness();
        setSynced(true);
        setTimeout(() => setSynced(false), 2500);
    };

    const handleProvisionProviderDomain = async () => {
        if (form) {
            await updateSettings(form);
            setForm(null);
        }
        await provisionProviderDomain(effective.sendingDomain || '');
        setDomainProvisioned(true);
        setTimeout(() => setDomainProvisioned(false), 2500);
    };

    const copyDnsRecord = async (record: DnsRecordDisplay) => {
        const text = [record.type, record.host, record.value].filter(Boolean).join('\t');
        if (!text) return;
        await navigator.clipboard?.writeText(text);
        setCopiedDnsRecord(record.id);
        setTimeout(() => setCopiedDnsRecord(null), 1800);
    };

    if (isLoading) {
        return (
            <div className="rounded-xl border border-q-border bg-q-surface p-6 text-sm text-q-text-secondary">
                {t('common.loading', 'Cargando...')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-q-text">{t('email.settings.title', 'Email Settings')}</h2>
                    <p className="text-sm text-q-text-secondary">{t('email.settings.subtitle', 'Provider, sender, compliance and readiness for this project.')}</p>
                </div>
                <AppButton
                    onClick={handleSave}
                    disabled={!form || isSaving}
                    leftIcon={<Save size={16} />}
                >
                    {isSaving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
                </AppButton>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-q-error/30 bg-q-error/10 px-4 py-3 text-sm text-q-error">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}
            {saved && (
                <div className="flex items-center gap-2 rounded-xl border border-q-success/30 bg-q-success/10 px-4 py-3 text-sm text-q-success">
                    <CheckCircle2 size={16} />
                    {t('email.settings.saved', 'Settings saved.')}
                </div>
            )}
            {synced && (
                <div className="flex items-center gap-2 rounded-xl border border-q-success/30 bg-q-success/10 px-4 py-3 text-sm text-q-success">
                    <CheckCircle2 size={16} />
                    {t('email.settings.synced', 'Provider readiness synced from server configuration.')}
                </div>
            )}
            {domainProvisioned && (
                <div className="flex items-center gap-2 rounded-xl border border-q-success/30 bg-q-success/10 px-4 py-3 text-sm text-q-success">
                    <CheckCircle2 size={16} />
                    {t('email.settings.domainProvisioned', 'Provider domain automation updated.')}
                </div>
            )}

            <ReadinessPanel readiness={readiness} />

            <section className="grid gap-4 lg:grid-cols-2">
                <Panel title={t('email.settings.provider', 'Provider')} icon={<MailCheck size={18} />}>
                    <Field label={t('email.settings.providerLabel', 'Provider')}>
                        <AppSelect
                            value={effective.provider || 'resend'}
                            onChange={e => setField('provider', e.target.value as EmailSettings['provider'])}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text"
                        >
                            <option value="resend">Resend</option>
                            <option value="sendgrid">SendGrid</option>
                            <option value="unset">{t('email.settings.providerUnset', 'Unset')}</option>
                        </AppSelect>
                    </Field>
                    <StatusGrid
                        items={[
                            ['Secret', effective.apiKeyConfigured ? 'configured' : 'not_configured'],
                            ['Provider', effective.providerStatus || 'not_configured'],
                            ['Webhook signing', effective.webhookConfigured ? 'configured' : 'not_configured'],
                        ]}
                    />
                    <p className="text-xs text-q-text-muted">
                        {t('email.settings.secretHelp', 'API keys and webhook signing material stay in server env vars. Use sync to verify the current provider readiness.')}
                    </p>
                    <AppButton
                        type="button"
                        onClick={handleSyncProvider}
                        disabled={isSaving}
                        variant="secondary"
                        fullWidth
                        leftIcon={<TestTube2 size={16} />}
                    >
                        {isSaving ? t('email.settings.syncing', 'Syncing...') : t('email.settings.syncProvider', 'Sync provider readiness')}
                    </AppButton>
                </Panel>

                <Panel title={t('email.settings.sender', 'Sender')} icon={<SlidersHorizontal size={18} />}>
                    <Field label={t('email.settings.fromName', 'From name')}>
                        <input value={effective.fromName || ''} onChange={e => setField('fromName', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40" />
                    </Field>
                    <Field label={t('email.settings.fromEmail', 'From email')}>
                        <input type="email" value={effective.fromEmail || ''} onChange={e => setField('fromEmail', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40" />
                    </Field>
                    <Field label={t('email.settings.replyTo', 'Reply-to')}>
                        <input type="email" value={effective.replyTo || ''} onChange={e => setField('replyTo', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40" />
                    </Field>
                </Panel>

                <Panel title={t('email.settings.domain', 'Domain')} icon={<Globe2 size={18} />}>
                    <Field label={t('email.settings.sendingDomain', 'Sending domain')}>
                        <input value={effective.sendingDomain || ''} onChange={e => setField('sendingDomain', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40" placeholder="mail.example.com" />
                    </Field>
                    <StatusGrid
                        items={[
                            ['Domain', effective.domainStatus || 'not_configured'],
                            ['DKIM', effective.dkimStatus || 'not_configured'],
                            ['SPF', effective.spfStatus || 'not_configured'],
                            ['DMARC', effective.dmarcStatus || 'not_configured'],
                        ]}
                    />
                    <p className="text-xs text-q-text-muted">
                        {t('email.settings.domainHelp', 'Create or validate the provider domain from server-side settings, then copy the returned DNS records to your DNS host.')}
                    </p>
                    <AppButton
                        type="button"
                        onClick={handleProvisionProviderDomain}
                        disabled={isSaving || !effective.sendingDomain || effective.provider === 'unset'}
                        variant="secondary"
                        fullWidth
                        leftIcon={<Globe2 size={16} />}
                    >
                        {isSaving ? t('email.settings.provisioningDomain', 'Provisioning...') : t('email.settings.provisionDomain', 'Provision / validate domain')}
                    </AppButton>
                    <DnsRecordsList
                        records={dnsRecords}
                        copiedId={copiedDnsRecord}
                        onCopy={copyDnsRecord}
                    />
                </Panel>

                <Panel title={t('email.settings.compliance', 'Compliance')} icon={<ShieldCheck size={18} />}>
                    <Toggle
                        label={t('email.settings.requireConsent', 'Require marketing consent')}
                        checked={effective.compliance?.requireMarketingConsent !== false}
                        onChange={value => updateNested('compliance', 'requireMarketingConsent', value)}
                    />
                    <Toggle
                        label={t('email.settings.unsubscribeFooter', 'Require unsubscribe footer')}
                        checked={effective.compliance?.unsubscribeFooterEnabled !== false}
                        onChange={value => updateNested('compliance', 'unsubscribeFooterEnabled', value)}
                    />
                    <Toggle
                        label={t('email.settings.suppressionEnabled', 'Enable suppression checks')}
                        checked={effective.compliance?.suppressionEnabled !== false}
                        onChange={value => updateNested('compliance', 'suppressionEnabled', value)}
                    />
                    <Field label={t('email.settings.physicalAddress', 'Company address')}>
                        <textarea
                            value={(effective.compliance as any)?.physicalAddress || ''}
                            onChange={e => updateNested('compliance', 'physicalAddress', e.target.value)}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40 min-h-[72px]"
                        />
                    </Field>
                </Panel>

                <Panel title={t('email.settings.marketing', 'Marketing')} icon={<MailCheck size={18} />}>
                    <Toggle
                        label={t('email.settings.marketingEnabled', 'Enable Email Marketing sends')}
                        checked={effective.marketing?.enabled === true}
                        onChange={value => updateNested('marketing', 'enabled', value)}
                    />
                    <Toggle
                        label={t('email.settings.welcomeEmail', 'Welcome email draft flow')}
                        checked={effective.marketing?.welcomeEmail !== false}
                        onChange={value => updateNested('marketing', 'welcomeEmail', value)}
                    />
                    <Toggle
                        label={t('email.settings.abandonedCartEnabled', 'Abandoned cart flow')}
                        checked={effective.marketing?.abandonedCartEnabled === true}
                        onChange={value => updateNested('marketing', 'abandonedCartEnabled', value)}
                    />
                    <Field label={t('email.settings.abandonedCartDelay', 'Abandoned cart delay hours')}>
                        <input
                            type="number"
                            min={1}
                            value={effective.marketing?.abandonedCartDelayHours ?? 1}
                            onChange={e => updateNested('marketing', 'abandonedCartDelayHours', Math.max(1, Number(e.target.value) || 1))}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                        />
                    </Field>
                    <Toggle
                        label={t('email.settings.winBackEnabled', 'Win-back flow')}
                        checked={effective.marketing?.winBackEnabled === true}
                        onChange={value => updateNested('marketing', 'winBackEnabled', value)}
                    />
                    <Field label={t('email.settings.winBackDelay', 'Win-back delay days')}>
                        <input
                            type="number"
                            min={1}
                            value={effective.marketing?.winBackDelayDays ?? 30}
                            onChange={e => updateNested('marketing', 'winBackDelayDays', Math.max(1, Number(e.target.value) || 30))}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                        />
                    </Field>
                </Panel>

                <Panel title={t('email.settings.outboxPolicy', 'Outbox policy')} icon={<SlidersHorizontal size={18} />}>
                    <Field label={t('email.settings.rateLimitTarget', 'Policy target')}>
                        <AppSelect
                            value={rateLimitTarget}
                            onChange={e => setRateLimitTarget(e.target.value as 'default' | 'resend' | 'sendgrid')}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text"
                        >
                            <option value="default">{t('email.settings.rateLimitDefault', 'Default')}</option>
                            <option value="resend">Resend</option>
                            <option value="sendgrid">SendGrid</option>
                        </AppSelect>
                    </Field>
                    <Field label={t('email.settings.maxPerRun', 'Max sends per worker run')}>
                        <input
                            type="number"
                            min={1}
                            value={rateLimitPolicy.maxPerRun ?? ''}
                            onChange={e => updateRateLimit('maxPerRun', parsePositiveIntInput(e.target.value))}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                            placeholder={t('email.settings.unlimited', 'Unlimited')}
                        />
                    </Field>
                    <Field label={t('email.settings.maxPerMinute', 'Max sends per minute')}>
                        <input
                            type="number"
                            min={1}
                            value={rateLimitPolicy.maxPerMinute ?? ''}
                            onChange={e => updateRateLimit('maxPerMinute', parsePositiveIntInput(e.target.value))}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                            placeholder={t('email.settings.unlimited', 'Unlimited')}
                        />
                    </Field>
                    <Field label={t('email.settings.retryAfterSeconds', 'Deferral seconds')}>
                        <input
                            type="number"
                            min={1}
                            value={rateLimitPolicy.retryAfterSeconds ?? ''}
                            onChange={e => updateRateLimit('retryAfterSeconds', parsePositiveIntInput(e.target.value))}
                            className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40"
                            placeholder="60"
                        />
                    </Field>
                    <p className="text-xs text-q-text-muted">
                        {t('email.settings.outboxPolicyHelp', 'Queued rows are deferred, not failed, when a policy limit is reached. Provider-specific values override the default policy.')}
                    </p>
                </Panel>

                <Panel title={t('email.settings.branding', 'Branding')} icon={<TestTube2 size={18} />}>
                    <Field label={t('email.settings.logoUrl', 'Logo URL')}>
                        <input value={effective.logoUrl || ''} onChange={e => setField('logoUrl', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40" />
                    </Field>
                    <Field label={t('email.settings.primaryColor', 'Primary color')}>
                        <input type="color" value={effective.primaryColor || '#4f46e5'} onChange={e => setField('primaryColor', e.target.value as any)} className="h-10 w-full rounded-xl border border-q-border bg-q-bg px-2" />
                    </Field>
                    <Field label={t('email.settings.footerText', 'Footer text')}>
                        <textarea value={effective.footerText || ''} onChange={e => setField('footerText', e.target.value as any)} className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-muted focus:outline-none focus:ring-2 focus:ring-q-accent/40 min-h-[72px]" />
                    </Field>
                </Panel>

                <Panel title={t('email.settings.transactional', 'Transactional toggles')} icon={<MailCheck size={18} />}>
                    {[
                        ['orderConfirmation', 'Order confirmation'],
                        ['newOrderNotification', 'Merchant new order'],
                        ['paymentFailed', 'Payment failed'],
                        ['lowStockNotification', 'Low stock alert'],
                        ['appointmentConfirmation', 'Appointment confirmation'],
                        ['appointmentReminder', 'Appointment reminder'],
                        ['restaurants', 'Restaurants emails'],
                        ['reservationReceived', 'Reservation received'],
                        ['crm', 'CRM emails'],
                        ['leadEmails', 'Lead follow-up emails'],
                        ['chatcore', 'ChatCore emails'],
                        ['chatLeadEmails', 'Chat lead emails'],
                        ['realty', 'Realty emails'],
                        ['realtyPropertyInquiry', 'Property inquiry'],
                        ['realtyShowingRequest', 'Showing request'],
                        ['realtyOpenHouseRegistration', 'Open house registration'],
                        ['websiteBuilder', 'Website Builder emails'],
                        ['websiteFormEmails', 'Website form emails'],
                        ['aiStudio', 'AI Studio emails'],
                        ['aiStudioReviewedEmails', 'AI reviewed emails'],
                        ['reviewRequest', 'Review request'],
                    ].map(([key, label]) => (
                        <Toggle
                            key={key}
                            label={label}
                            checked={(effective.transactional as any)?.[key] !== false}
                            onChange={value => updateNested('transactional', key, value)}
                        />
                    ))}
                </Panel>
            </section>
        </div>
    );
};

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="rounded-xl border border-q-border bg-q-surface p-5">
        <div className="mb-4 flex items-center gap-2 text-q-text">
            <span className="text-q-accent">{icon}</span>
            <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-q-text-secondary">{label}</span>
        {children}
    </label>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <AppButton type="button" onClick={() => onChange(!checked)} variant="secondary" fullWidth className="justify-between text-left">
        <span>{label}</span>
        <span className={`h-5 w-9 rounded-full p-0.5 transition ${checked ? 'bg-q-accent' : 'bg-q-border'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </span>
    </AppButton>
);

interface DnsRecordDisplay {
    id: string;
    label: string;
    type: string;
    host: string;
    value: string;
    status: string;
    priority?: string;
    reason?: string;
}

const DnsRecordsList: React.FC<{
    records: DnsRecordDisplay[];
    copiedId: string | null;
    onCopy: (record: DnsRecordDisplay) => void;
}> = ({ records, copiedId, onCopy }) => {
    if (records.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-q-border bg-q-bg/50 px-3 py-2 text-xs text-q-text-muted">
                DNS records appear here after provider readiness sync returns verification records.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {records.map(record => (
                <div key={record.id} className="grid gap-2 rounded-lg border border-q-border bg-q-bg p-3 md:grid-cols-[72px_1fr_auto] md:items-center">
                    <div className="text-xs font-bold uppercase text-q-text-secondary">{record.type || 'DNS'}</div>
                    <div className="min-w-0 space-y-1">
                        <p className="truncate text-xs font-medium text-q-text">{record.host || record.label}</p>
                        <p className="truncate font-mono text-[11px] text-q-text-secondary">{record.value || '-'}</p>
                        {record.status && <p className="text-[11px] text-q-text-muted">{record.status.replace(/_/g, ' ')}</p>}
                        {record.reason && <p className="text-[11px] text-q-warning">{record.reason}</p>}
                    </div>
                    <AppButton
                        type="button"
                        variant="secondary"
                        onClick={() => onCopy(record)}
                        leftIcon={<Copy size={14} />}
                    >
                        {copiedId === record.id ? 'Copied' : 'Copy'}
                    </AppButton>
                </div>
            ))}
        </div>
    );
};

const ReadinessPanel: React.FC<{ readiness: EmailProviderReadiness }> = ({ readiness }) => (
    <section className="rounded-xl border border-q-border bg-q-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
            <div>
                <h3 className="text-sm font-bold text-q-text">Readiness</h3>
                <p className="text-xs text-q-text-secondary">Sending is blocked until provider, sender, unsubscribe and suppression checks are configured.</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${readiness.canSendMarketing ? 'border-q-success/30 bg-q-success/10 text-q-success' : 'border-q-warning/30 bg-q-warning/10 text-q-warning'}`}>
                {readiness.canSendMarketing ? 'Ready' : 'Blocked'}
            </span>
        </div>
        <StatusGrid
            items={[
                ['Provider', readiness.providerConfigured ? 'configured' : 'not_configured'],
                ['Sender', readiness.senderConfigured ? 'configured' : 'not_configured'],
                ['Marketing', readiness.marketingEnabled ? 'enabled' : 'disabled'],
                ['Domain', readiness.domainVerified ? 'verified' : 'not_configured'],
                ['Unsubscribe', readiness.unsubscribeConfigured ? 'configured' : 'not_configured'],
                ['Suppression', readiness.suppressionConfigured ? 'configured' : 'not_configured'],
                ['Webhook', readiness.webhookConfigured ? 'configured' : 'not_configured'],
            ]}
        />
        {readiness.readinessBlockers.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-q-warning">
                {readiness.readinessBlockers.map(item => <li key={item}>{item}</li>)}
            </ul>
        )}
    </section>
);

const StatusGrid: React.FC<{ items: Array<[string, string]> }> = ({ items }) => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {items.map(([label, status]) => (
            <div key={`${label}-${status}`} className="rounded-lg border border-q-border bg-q-bg px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-q-text-muted">{label}</p>
                <p className="mt-0.5 text-xs text-q-text">{status.replace(/_/g, ' ')}</p>
            </div>
        ))}
    </div>
);

function calculateReadiness(settings: Partial<EmailSettings>): EmailProviderReadiness {
    const providerConfigured = Boolean(settings.apiKeyConfigured && settings.provider && settings.provider !== 'unset');
    const senderConfigured = Boolean(settings.fromEmail?.includes('@') && settings.fromName?.trim());
    const marketingEnabled = settings.marketing?.enabled === true;
    const unsubscribeConfigured = settings.compliance?.unsubscribeFooterEnabled !== false;
    const suppressionConfigured = settings.compliance?.suppressionEnabled !== false;
    const domainVerified = settings.domainStatus === 'verified';
    const webhookConfigured = Boolean(settings.webhookConfigured);
    const blockers = [
        !providerConfigured ? 'Provider secret is not marked configured.' : '',
        !senderConfigured ? 'Sender name and from email are required.' : '',
        !marketingEnabled ? 'Email Marketing must be explicitly enabled.' : '',
        !unsubscribeConfigured ? 'Unsubscribe footer must be enabled.' : '',
        !suppressionConfigured ? 'Suppression checks must be enabled.' : '',
    ].filter(Boolean);

    return {
        providerConfigured,
        senderConfigured,
        marketingEnabled,
        domainVerified,
        unsubscribeConfigured,
        suppressionConfigured,
        trackingConfigured: Boolean(settings.tracking?.openTracking || settings.tracking?.clickTracking),
        webhookConfigured,
        testEmailSent: Boolean(settings.testEmailSentAt),
        canSendTest: providerConfigured && senderConfigured,
        canSendMarketing: blockers.length === 0,
        canSendTransactional: providerConfigured && senderConfigured,
        readinessBlockers: blockers,
        warnings: [],
    };
}

function parsePositiveIntInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function extractProviderDnsRecords(raw: unknown): DnsRecordDisplay[] {
    if (!raw || typeof raw !== 'object') return [];
    const records = Array.isArray((raw as any).records) ? (raw as any).records : [];
    return records
        .map((record: any, index: number): DnsRecordDisplay | null => {
            const label = readString(record.label) || `record-${index + 1}`;
            const type = readString(record.type).toUpperCase();
            const host = readString(record.host || record.hostname || record.name || record.record);
            const value = readString(record.value || record.data || record.target);
            const status = readString(record.status);
            const priority = readString(record.priority);
            const reason = readString(record.reason);
            if (!type && !host && !value) return null;
            return {
                id: `${label}-${type || 'dns'}-${host || index}`,
                label,
                type,
                host,
                value,
                status,
                priority,
                reason,
            };
        })
        .filter((record): record is DnsRecordDisplay => Boolean(record));
}

function readString(value: unknown) {
    return String(value || '').trim();
}

export default SettingsTab;
