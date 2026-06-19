import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { Project } from '../../types/project';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    createBusinessBlueprintFromWebsitePlan,
    type BusinessBlueprintAdapterOptions,
} from './adapters';

export type AiStudioBusinessBlueprintOptions = BusinessBlueprintAdapterOptions;

export function createAiStudioBusinessBlueprint(
    plan: WebsitePlan,
    options: AiStudioBusinessBlueprintOptions = {},
): BusinessBlueprint {
    return createBusinessBlueprintFromWebsitePlan(plan, {
        ...options,
        source: options.source || (plan.source === 'imported-url' ? 'imported' : 'ai-studio'),
    });
}

export function attachAiStudioBusinessBlueprint<TProject extends Pick<Project, 'id'> & Partial<Project>>(
    project: TProject,
    plan: WebsitePlan,
    options: Omit<AiStudioBusinessBlueprintOptions, 'projectId'> = {},
): TProject & { businessBlueprint: BusinessBlueprint } {
    return {
        ...project,
        businessBlueprint: createAiStudioBusinessBlueprint(plan, {
            ...options,
            projectId: project.id,
        }),
    };
}
