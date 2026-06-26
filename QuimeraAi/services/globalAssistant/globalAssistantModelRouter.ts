import type {
    AssistantIntent,
    AssistantModelConfig,
} from '../../types/globalAssistant';

export const GLOBAL_ASSISTANT_MODELS = {
    orchestrator: 'anthropic/claude-opus-4.7',
    fallback: 'google/gemini-2.5-pro',
    fast: 'google/gemini-2.5-flash',
    imagePro: 'google/gemini-3-pro-image',
    imageFast: 'google/gemini-3.1-flash-image',
} as const;

/**
 * Verified against https://openrouter.ai/api/v1/models on 2026-06-26.
 * Keep this as metadata, not as a permanent guarantee. The runtime should refresh
 * provider capabilities before hard failures or production rollout.
 */
export const VERIFIED_OPENROUTER_MODEL_CAPABILITIES: AssistantModelConfig[] = [
    {
        role: 'orchestrator',
        modelId: GLOBAL_ASSISTANT_MODELS.orchestrator,
        contextLength: 1_000_000,
        supportsTools: true,
        supportsToolChoice: true,
        supportsStructuredOutputs: true,
        supportsResponseFormat: true,
        supportsReasoning: true,
        supportsImages: true,
        supportsAudioVideoInput: false,
        providerPolicy: { requireParameters: true, dataCollection: 'deny' },
    },
    {
        role: 'fallback',
        modelId: GLOBAL_ASSISTANT_MODELS.fallback,
        contextLength: 1_048_576,
        supportsTools: true,
        supportsToolChoice: true,
        supportsStructuredOutputs: true,
        supportsResponseFormat: true,
        supportsReasoning: true,
        supportsImages: true,
        supportsAudioVideoInput: true,
        providerPolicy: { requireParameters: true, dataCollection: 'deny' },
    },
    {
        role: 'fast',
        modelId: GLOBAL_ASSISTANT_MODELS.fast,
        contextLength: 1_048_576,
        supportsTools: true,
        supportsToolChoice: true,
        supportsStructuredOutputs: true,
        supportsResponseFormat: true,
        supportsReasoning: true,
        supportsImages: true,
        supportsAudioVideoInput: true,
        providerPolicy: { requireParameters: true, dataCollection: 'deny' },
    },
    {
        role: 'imagePro',
        modelId: GLOBAL_ASSISTANT_MODELS.imagePro,
        contextLength: 65_536,
        supportsTools: true,
        supportsToolChoice: true,
        supportsStructuredOutputs: true,
        supportsResponseFormat: true,
        supportsReasoning: true,
        supportsImages: true,
        supportsAudioVideoInput: false,
        providerPolicy: { requireParameters: true, dataCollection: 'deny' },
    },
    {
        role: 'imageFast',
        modelId: GLOBAL_ASSISTANT_MODELS.imageFast,
        contextLength: 131_072,
        supportsTools: false,
        supportsToolChoice: false,
        supportsStructuredOutputs: true,
        supportsResponseFormat: true,
        supportsReasoning: true,
        supportsImages: true,
        supportsAudioVideoInput: false,
        providerPolicy: { requireParameters: true, dataCollection: 'deny' },
    },
];

export function getAssistantModelConfig(role: AssistantModelConfig['role']): AssistantModelConfig {
    const config = VERIFIED_OPENROUTER_MODEL_CAPABILITIES.find(model => model.role === role);
    if (!config) throw new Error(`Unknown Global Assistant model role: ${role}`);
    return config;
}

export function selectModelForIntent(intent: AssistantIntent): AssistantModelConfig {
    if (intent.intent === 'generate_image') return getAssistantModelConfig('imagePro');
    if (intent.intent === 'generate_video') return getAssistantModelConfig('fallback');
    if (intent.safetyLevel === 'low' && ['open', 'search', 'explain'].includes(intent.intent)) {
        return getAssistantModelConfig('fast');
    }
    return getAssistantModelConfig('orchestrator');
}

export function assertModelSupportsToolLoop(config: AssistantModelConfig): string[] {
    const missing: string[] = [];
    if (!config.supportsTools) missing.push('tools');
    if (!config.supportsToolChoice) missing.push('tool_choice');
    if (!config.supportsStructuredOutputs) missing.push('structured_outputs');
    if (!config.supportsResponseFormat) missing.push('response_format');
    return missing;
}

export function buildOpenRouterProviderPolicy(config: AssistantModelConfig) {
    return {
        require_parameters: config.providerPolicy?.requireParameters ?? true,
        ...(config.providerPolicy?.dataCollection ? { data_collection: config.providerPolicy.dataCollection } : {}),
    };
}
