import type { EmailProvider, EmailProviderRegistry } from './emailProviderService.ts';
import {
    addSuppression,
    filterSuppressedRecipients,
    isSuppressed,
    type EmailSuppressionInput,
} from './emailSuppressionService.ts';
import {
    assertEmailReadiness,
    getEmailReadiness,
    getEmailSettings,
    updateEmailSettings,
} from './emailSettingsService.ts';
import {
    addAudienceMembers,
    createAudience,
    deleteAudience,
    getAudiences,
    removeAudienceMembers,
    updateAudience,
    type EmailAudienceMemberInput,
} from './emailAudienceService.ts';
import {
    createCampaignDraft,
    deleteCampaign,
    duplicateCampaign,
    enqueueCampaignSend,
    getCampaigns,
    scheduleCampaign,
    sendCampaign,
    sendTestEmail,
    updateCampaign,
} from './emailCampaignService.ts';
import {
    createAutomationDraft,
    deleteAutomation,
    duplicateAutomation,
    getAutomations,
    updateAutomation,
} from './emailAutomationService.ts';
import { explainAudienceResolution, resolveCampaignRecipients } from './emailAudienceResolver.ts';
import { findEmailLogByIdempotencyKey, recordEmailLog } from './emailLogService.ts';
import { ingestEmailEvent } from './emailEventService.ts';
import { queueTransactionalEmail, sendTransactionalEmail } from './emailTransactionalService.ts';
import { ingestAutomationEvent } from './emailAutomationRuntime.ts';
import { processEmailOutbox } from './emailOutboxProcessor.ts';
import {
    dispatchCrossModuleTransactionalEmail,
    queueCrossModuleTransactionalEmail,
} from './emailCrossModuleDispatcher.ts';
import { getEmailAnalytics } from './emailAnalyticsService.ts';

type SupabaseClient = any;

export interface EmailMarketingEngine {
    getEmailSettings(projectId: string): ReturnType<typeof getEmailSettings>;
    updateEmailSettings(projectId: string, input: Record<string, unknown>, userId?: string | null): ReturnType<typeof updateEmailSettings>;
    getEmailReadiness(projectId: string): Promise<ReturnType<typeof getEmailReadiness>>;
    getCampaigns(projectId: string): ReturnType<typeof getCampaigns>;
    createCampaignDraft(input: { projectId: string; userId?: string | null; campaign: Record<string, unknown> }): ReturnType<typeof createCampaignDraft>;
    updateCampaign(input: { projectId: string; campaignId: string; updates: Record<string, unknown> }): ReturnType<typeof updateCampaign>;
    duplicateCampaign(input: { projectId: string; userId?: string | null; campaignId: string }): ReturnType<typeof duplicateCampaign>;
    deleteCampaign(input: { projectId: string; campaignId: string }): ReturnType<typeof deleteCampaign>;
    scheduleCampaign(input: { projectId: string; campaignId: string; scheduledAt: string }): ReturnType<typeof scheduleCampaign>;
    getAutomations(projectId: string): ReturnType<typeof getAutomations>;
    createAutomationDraft(input: { projectId: string; userId?: string | null; automation: Record<string, unknown> }): ReturnType<typeof createAutomationDraft>;
    updateAutomation(input: { projectId: string; automationId: string; updates: Record<string, unknown> }): ReturnType<typeof updateAutomation>;
    duplicateAutomation(input: { projectId: string; userId?: string | null; automationId: string }): ReturnType<typeof duplicateAutomation>;
    deleteAutomation(input: { projectId: string; automationId: string }): ReturnType<typeof deleteAutomation>;
    getAudiences(projectId: string): ReturnType<typeof getAudiences>;
    createAudience(input: { projectId: string; userId?: string | null; audience: Record<string, unknown> }): ReturnType<typeof createAudience>;
    updateAudience(input: { projectId: string; audienceId: string; updates: Record<string, unknown> }): ReturnType<typeof updateAudience>;
    deleteAudience(input: { projectId: string; audienceId: string }): ReturnType<typeof deleteAudience>;
    addAudienceMembers(input: { projectId: string; audienceId: string; members: EmailAudienceMemberInput[] }): ReturnType<typeof addAudienceMembers>;
    removeAudienceMembers(input: { projectId: string; audienceId: string; emails?: string[]; leadIds?: string[]; customerIds?: string[] }): ReturnType<typeof removeAudienceMembers>;
    enqueueCampaignSend(input: { projectId: string; userId?: string | null; campaignId: string }): ReturnType<typeof enqueueCampaignSend>;
    sendCampaign(input: { projectId: string; userId?: string | null; campaignId: string; batchSize?: number }): ReturnType<typeof sendCampaign>;
    sendTestEmail(input: { projectId: string; userId?: string | null; campaignId?: string | null; recipientEmail: string; subject?: string; html?: string }): ReturnType<typeof sendTestEmail>;
    resolveAudienceRecipients(input: { projectId: string; campaign: Record<string, any>; requireMarketingConsent?: boolean }): ReturnType<typeof resolveCampaignRecipients>;
    explainAudienceResolution(input: { projectId: string; audienceId?: string | null }): ReturnType<typeof explainAudienceResolution>;
    addSuppression(input: Omit<EmailSuppressionInput, 'supabase'>): ReturnType<typeof addSuppression>;
    isSuppressed(input: { projectId: string; email: string; scope?: 'marketing' | 'transactional' }): ReturnType<typeof isSuppressed>;
    filterSuppressedRecipients<T extends { email: string }>(input: { projectId: string; recipients: T[]; scope?: 'marketing' | 'transactional' }): ReturnType<typeof filterSuppressedRecipients<T>>;
    recordEmailLog(input: Parameters<typeof recordEmailLog>[0] extends { supabase: any } ? Omit<Parameters<typeof recordEmailLog>[0], 'supabase'> : never): ReturnType<typeof recordEmailLog>;
    findEmailLogByIdempotencyKey(input: { projectId: string; idempotencyKey: string }): ReturnType<typeof findEmailLogByIdempotencyKey>;
    ingestEmailEvent(input: Omit<Parameters<typeof ingestEmailEvent>[0], 'supabase'>): ReturnType<typeof ingestEmailEvent>;
    queueTransactionalEmail(input: Omit<Parameters<typeof queueTransactionalEmail>[0], 'supabase'>): ReturnType<typeof queueTransactionalEmail>;
    sendTransactionalEmail(input: Omit<Parameters<typeof sendTransactionalEmail>[0], 'supabase' | 'provider'>): ReturnType<typeof sendTransactionalEmail>;
    queueCrossModuleTransactionalEmail(input: Omit<Parameters<typeof queueCrossModuleTransactionalEmail>[0], 'supabase' | 'provider'>): ReturnType<typeof queueCrossModuleTransactionalEmail>;
    dispatchCrossModuleTransactionalEmail(input: Omit<Parameters<typeof dispatchCrossModuleTransactionalEmail>[0], 'supabase' | 'provider'>): ReturnType<typeof dispatchCrossModuleTransactionalEmail>;
    processEmailOutbox(input?: Omit<Parameters<typeof processEmailOutbox>[0], 'supabase' | 'provider'>): ReturnType<typeof processEmailOutbox>;
    getEmailAnalytics(input: Omit<Parameters<typeof getEmailAnalytics>[0], 'supabase'>): ReturnType<typeof getEmailAnalytics>;
    ingestAutomationEvent(input: Omit<Parameters<typeof ingestAutomationEvent>[0], 'supabase'>): ReturnType<typeof ingestAutomationEvent>;
}

export function createEmailMarketingEngine(input: {
    supabase: SupabaseClient;
    provider?: EmailProvider;
    providers?: EmailProviderRegistry;
}): EmailMarketingEngine {
    const { supabase, provider, providers } = input;

    return {
        getEmailSettings(projectId) {
            return getEmailSettings({ supabase, projectId });
        },
        async getEmailReadiness(projectId) {
            const settings = await getEmailSettings({ supabase, projectId });
            return settings.readiness as ReturnType<typeof getEmailReadiness>;
        },
        updateEmailSettings(projectId, updates, userId) {
            return updateEmailSettings({ supabase, projectId, userId, updates });
        },
        getCampaigns(projectId) {
            return getCampaigns({ supabase, projectId });
        },
        createCampaignDraft(args) {
            return createCampaignDraft({ supabase, ...args });
        },
        updateCampaign(args) {
            return updateCampaign({ supabase, ...args });
        },
        duplicateCampaign(args) {
            return duplicateCampaign({ supabase, ...args });
        },
        deleteCampaign(args) {
            return deleteCampaign({ supabase, ...args });
        },
        scheduleCampaign(args) {
            return scheduleCampaign({ supabase, ...args });
        },
        getAutomations(projectId) {
            return getAutomations({ supabase, projectId });
        },
        createAutomationDraft(args) {
            return createAutomationDraft({ supabase, ...args });
        },
        updateAutomation(args) {
            return updateAutomation({ supabase, ...args });
        },
        duplicateAutomation(args) {
            return duplicateAutomation({ supabase, ...args });
        },
        deleteAutomation(args) {
            return deleteAutomation({ supabase, ...args });
        },
        getAudiences(projectId) {
            return getAudiences({ supabase, projectId });
        },
        createAudience(args) {
            return createAudience({ supabase, ...args });
        },
        updateAudience(args) {
            return updateAudience({ supabase, ...args });
        },
        deleteAudience(args) {
            return deleteAudience({ supabase, ...args });
        },
        addAudienceMembers(args) {
            return addAudienceMembers({ supabase, ...args });
        },
        removeAudienceMembers(args) {
            return removeAudienceMembers({ supabase, ...args });
        },
        enqueueCampaignSend(args) {
            return enqueueCampaignSend({ supabase, ...args });
        },
        sendCampaign(args) {
            return sendCampaign({ supabase, provider, providers, ...args });
        },
        sendTestEmail(args) {
            return sendTestEmail({ supabase, provider, providers, ...args });
        },
        resolveAudienceRecipients(args) {
            return resolveCampaignRecipients({ supabase, ...args });
        },
        explainAudienceResolution(args) {
            return explainAudienceResolution({ supabase, ...args });
        },
        addSuppression(args) {
            return addSuppression({ supabase, ...args });
        },
        isSuppressed(args) {
            return isSuppressed({ supabase, ...args });
        },
        filterSuppressedRecipients(args) {
            return filterSuppressedRecipients({ supabase, ...args });
        },
        recordEmailLog(args) {
            return recordEmailLog({ supabase, ...args });
        },
        findEmailLogByIdempotencyKey(args) {
            return findEmailLogByIdempotencyKey({ supabase, ...args });
        },
        ingestEmailEvent(args) {
            return ingestEmailEvent({ supabase, ...args });
        },
        queueTransactionalEmail(args) {
            return queueTransactionalEmail({ supabase, ...args });
        },
        sendTransactionalEmail(args) {
            return sendTransactionalEmail({ supabase, provider, providers, ...args });
        },
        queueCrossModuleTransactionalEmail(args) {
            return queueCrossModuleTransactionalEmail({ supabase, ...args });
        },
        dispatchCrossModuleTransactionalEmail(args) {
            return dispatchCrossModuleTransactionalEmail({ supabase, provider, providers, ...args });
        },
        processEmailOutbox(args = {}) {
            return processEmailOutbox({ supabase, provider, providers, ...args });
        },
        getEmailAnalytics(args) {
            return getEmailAnalytics({ supabase, ...args });
        },
        ingestAutomationEvent(args) {
            return ingestAutomationEvent({ supabase, ...args });
        },
    };
}

export function assertCanSendFromReadiness(
    settings: Awaited<ReturnType<typeof getEmailSettings>>,
    mode: 'test' | 'marketing' | 'transactional',
) {
    return assertEmailReadiness(settings, mode);
}
