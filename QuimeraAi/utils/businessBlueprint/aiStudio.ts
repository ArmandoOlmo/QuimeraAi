import type { BusinessBlueprint } from '../../types/businessBlueprint';
import type { Project } from '../../types/project';
import type { WebsitePlan } from '../../types/websitePlan';
import {
    critiqueComponentDesign,
    deriveCrossModuleBlueprints,
    deriveEcommerceBlueprintFromBusinessBrief,
    deriveRestaurantBlueprintFromBusinessBrief,
    deriveStorefrontBlueprintFromBusinessBrief,
    deriveWebsiteEcommerceBlocks,
    selectAiStudioComponents,
    selectComponentVariants,
    validateComponentPlan,
    type AiStudioBusinessBriefInput,
} from '../aiStudio';
import type { BusinessBlueprintAdapterOptions } from './adapters';
import { mergeAiStudioBlueprint } from './mergeAiStudioBlueprint';
import { applyRenderableSectionVariantSettingsToData } from './renderableSectionVariants';

export interface AiStudioBusinessBlueprintOptions extends BusinessBlueprintAdapterOptions {
    existingBusinessBlueprint?: BusinessBlueprint | null;
}

function businessBriefInputFromWebsitePlan(plan: WebsitePlan, now?: string): AiStudioBusinessBriefInput {
    return {
        businessName: plan.businessProfile.businessName,
        businessDescription: plan.businessProfile.description,
        description: plan.businessProfile.description,
        industry: plan.businessProfile.industry,
        productsServicesText: [
            plan.businessProfile.tagline,
            ...plan.businessProfile.services.flatMap(service => [service.name, service.description]),
            ...(plan.contentMap.products || []).flatMap(product => {
                if (!product || typeof product !== 'object') return [];
                const record = product as Record<string, unknown>;
                return [record.name, record.title, record.category, record.description].filter(Boolean).map(String);
            }),
        ].filter(Boolean).join(' '),
        services: plan.businessProfile.services,
        hasEcommerce: plan.businessProfile.hasEcommerce,
        existingWebsitePlan: plan,
        now,
    };
}

export function createAiStudioBusinessBlueprint(
    plan: WebsitePlan,
    options: AiStudioBusinessBlueprintOptions = {},
): BusinessBlueprint {
    const now = options.now || new Date().toISOString();
    const briefInput = businessBriefInputFromWebsitePlan(plan, now);
    const ecommerceBlueprint = deriveEcommerceBlueprintFromBusinessBrief(briefInput);
    const storefrontBlueprint = deriveStorefrontBlueprintFromBusinessBrief(briefInput, ecommerceBlueprint, plan.brandProfile);
    const websiteEcommerceBlocks = deriveWebsiteEcommerceBlocks(briefInput, ecommerceBlueprint, storefrontBlueprint);
    const restaurantBlueprint = deriveRestaurantBlueprintFromBusinessBrief(briefInput);
    const crossModuleBlueprints = deriveCrossModuleBlueprints(briefInput, ecommerceBlueprint, storefrontBlueprint);
    const componentSelection = selectAiStudioComponents(briefInput, {
        builder: 'website',
        ecommerceBlueprint,
        storefrontBlueprint,
    });
    const componentVariantSelection = selectComponentVariants(
        componentSelection.componentPlan,
        componentSelection.context,
    );
    const designCritic = critiqueComponentDesign({
        componentPlan: componentSelection.componentPlan,
        variantPlan: componentVariantSelection.variants,
        context: componentSelection.context,
    });
    const componentValidation = validateComponentPlan({
        componentPlan: componentSelection.componentPlan,
        variantPlan: componentVariantSelection.variants,
        context: componentSelection.context,
        existingBusinessBlueprint: options.existingBusinessBlueprint,
    });

    return mergeAiStudioBlueprint({
        existingBusinessBlueprint: options.existingBusinessBlueprint,
        websitePlan: plan,
        ecommerceBlueprint,
        storefrontBlueprint,
        websiteEcommerceBlocks,
        restaurantBlueprint,
        componentSelectionContext: componentSelection.context,
        componentPlan: componentSelection.componentPlan,
        componentVariantPlan: componentVariantSelection.variants,
        designCritic,
        componentValidation,
        chatbotBlueprint: crossModuleBlueprints.chatbotBlueprint,
        leadBlueprint: crossModuleBlueprints.leadBlueprint,
        emailMarketingBlueprint: crossModuleBlueprints.emailMarketingBlueprint,
        options: {
            ...options,
            now,
            source: options.source || (plan.source === 'imported-url' ? 'imported' : 'ai-studio'),
        },
    });
}

export function attachAiStudioBusinessBlueprint<TProject extends Pick<Project, 'id'> & Partial<Project>>(
    project: TProject,
    plan: WebsitePlan,
    options: Omit<AiStudioBusinessBlueprintOptions, 'projectId'> = {},
): TProject & { businessBlueprint: BusinessBlueprint } {
    const businessBlueprint = createAiStudioBusinessBlueprint(plan, {
        ...options,
        projectId: project.id,
    });
    const data = applyRenderableSectionVariantSettingsToData(
        project.data,
        businessBlueprint.websiteBlueprint.sectionBlueprints,
    );

    return {
        ...project,
        data,
        businessBlueprint,
    };
}
