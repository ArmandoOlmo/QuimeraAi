import type { ContentGenerationJob } from '../../types/contentGeneration';
import type { ContentProviderAdapter } from '../../types/contentProviders';
import { CONTENT_FORMATS } from './catalog';

const now = () => new Date().toISOString();

export const quimeraPlaceholderProvider: ContentProviderAdapter = {
    id: 'quimera-orchestrator-placeholder',
    label: 'Quimera visual orchestrator',
    capabilities: ['text', 'image', 'image_edit', 'video', 'audio', 'voice', 'captions', 'export', 'moderation', 'references', 'batch', 'variations'],
    supportedFormats: CONTENT_FORMATS,
    supportsReferences: true,
    supportsBatch: true,
    supportsVariations: true,
    isAdminOnly: false,
    costMode: 'credits',
    isEnabled: true,
    async generate(input: Record<string, unknown>): Promise<ContentGenerationJob> {
        const timestamp = now();
        return {
            id: `job_quimera_${Date.now()}`,
            jobType: typeof input.jobType === 'string' ? input.jobType as ContentGenerationJob['jobType'] : 'image',
            status: 'queued',
            providerId: 'quimera-orchestrator-placeholder',
            input,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
    },
    async getJobStatus(jobId: string): Promise<ContentGenerationJob> {
        const timestamp = now();
        return {
            id: jobId,
            jobType: 'image',
            status: 'queued',
            providerId: 'quimera-orchestrator-placeholder',
            input: {},
            createdAt: timestamp,
            updatedAt: timestamp,
        };
    },
    async cancelJob(_jobId: string): Promise<void> {
        return undefined;
    },
};

export const CONTENT_PROVIDER_ADAPTERS: ContentProviderAdapter[] = [
    quimeraPlaceholderProvider,
];
