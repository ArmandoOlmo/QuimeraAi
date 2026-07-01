import type { ContentGenerationJob } from '../../types/contentGeneration';
import type {
    ContentProviderAdapter,
    ContentProviderBridgeDecision,
    ContentProviderBridgeRequest,
    ContentProviderCapability,
    ContentProviderRoutingRule,
} from '../../types/contentProviders';
import { CONTENT_PROVIDER_ADAPTERS, quimeraPlaceholderProvider } from './providers';

const now = () => new Date().toISOString();

const jobTypeForCapability = (capability: ContentProviderCapability): ContentGenerationJob['jobType'] => {
    if (capability === 'video') return 'video';
    if (capability === 'audio' || capability === 'voice') return 'audio';
    if (capability === 'captions') return 'caption';
    if (capability === 'export') return 'export';
    if (capability === 'variations') return 'variation';
    if (capability === 'text') return 'script';
    return 'image';
};

const isUsableProvider = (
    provider: ContentProviderAdapter | undefined,
    capability: ContentProviderCapability,
    includeAdminOnly: boolean,
): provider is ContentProviderAdapter => (
    Boolean(provider)
    && provider!.isEnabled
    && provider!.capabilities.includes(capability)
    && (includeAdminOnly || !provider!.isAdminOnly)
);

export function resolveContentProviderBridge(
    request: Pick<ContentProviderBridgeRequest, 'capability' | 'qualityMode'>,
    routingRules: ContentProviderRoutingRule[] = [],
    providers: ContentProviderAdapter[] = CONTENT_PROVIDER_ADAPTERS,
    options: { includeAdminOnly?: boolean } = {},
): ContentProviderBridgeDecision {
    const includeAdminOnly = options.includeAdminOnly === true;
    const enabledRule = routingRules.find(rule => (
        rule.isEnabled
        && rule.capability === request.capability
        && (!request.qualityMode || rule.qualityMode === request.qualityMode)
    ));
    const preferredProvider = providers.find(provider => provider.id === enabledRule?.preferredProviderId);

    if (isUsableProvider(preferredProvider, request.capability, includeAdminOnly)) {
        return {
            provider: preferredProvider,
            routingRule: enabledRule,
            reason: 'preferred_provider',
            warnings: preferredProvider.id === quimeraPlaceholderProvider.id
                ? ['Provider not connected. Quimera placeholder bridge queued a mock job.']
                : [],
        };
    }

    for (const fallbackId of enabledRule?.fallbackProviderIds || []) {
        const fallbackProvider = providers.find(provider => provider.id === fallbackId);
        if (isUsableProvider(fallbackProvider, request.capability, includeAdminOnly)) {
            return {
                provider: fallbackProvider,
                routingRule: enabledRule,
                reason: 'fallback_provider',
                warnings: fallbackProvider.id === quimeraPlaceholderProvider.id
                    ? ['Provider not connected. Quimera placeholder bridge queued a mock job.']
                    : [`Preferred provider ${enabledRule?.preferredProviderId} is unavailable; using fallback ${fallbackProvider.id}.`],
            };
        }
    }

    return {
        provider: quimeraPlaceholderProvider,
        routingRule: enabledRule,
        reason: 'default_placeholder',
        warnings: [
            enabledRule
                ? `Provider ${enabledRule.preferredProviderId} is unavailable for ${request.capability}.`
                : `No provider routing rule configured for ${request.capability}.`,
            'Provider not connected. Quimera placeholder bridge queued a mock job.',
        ],
    };
}

export async function createContentProviderBridgeJob(
    request: ContentProviderBridgeRequest,
    routingRules: ContentProviderRoutingRule[] = [],
    providers: ContentProviderAdapter[] = CONTENT_PROVIDER_ADAPTERS,
    options: { includeAdminOnly?: boolean; execute?: boolean } = {},
): Promise<{ decision: ContentProviderBridgeDecision; job: ContentGenerationJob }> {
    const timestamp = now();
    const decision = resolveContentProviderBridge(request, routingRules, providers, options);
    const input = {
        ...(request.input || {}),
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        format: request.format,
        capability: request.capability,
        bridgeMode: options.execute ? 'execute' : 'mock',
    };

    if (options.execute && decision.provider.id !== quimeraPlaceholderProvider.id) {
        const job = await decision.provider.generate(input);
        return {
            decision,
            job: {
                ...job,
                campaignId: request.campaignId || job.campaignId,
                sceneId: request.sceneId || job.sceneId,
                assetId: request.assetId || job.assetId,
                tenantId: request.tenantId || job.tenantId,
                projectId: request.projectId || job.projectId,
                createdBy: request.createdBy || job.createdBy,
                providerId: decision.provider.id,
                updatedAt: job.updatedAt || timestamp,
            },
        };
    }

    return {
        decision,
        job: {
            id: `job_bridge_${request.capability}_${Date.now()}`,
            jobType: jobTypeForCapability(request.capability),
            status: 'queued',
            campaignId: request.campaignId,
            sceneId: request.sceneId,
            assetId: request.assetId,
            providerId: decision.provider.id,
            tenantId: request.tenantId,
            projectId: request.projectId,
            createdBy: request.createdBy,
            input,
            output: {
                bridgeDecision: decision.reason,
                warnings: decision.warnings,
            },
            attempt: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    };
}
