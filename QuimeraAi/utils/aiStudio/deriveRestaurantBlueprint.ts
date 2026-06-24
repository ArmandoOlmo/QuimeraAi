import type { RestaurantBlueprint } from '../../types/businessBlueprint';
import {
    createRestaurantBlueprintFromContext,
    isRestaurantIndustryText,
} from '../businessBlueprint/restaurantBlueprint';
import type { AiStudioBusinessBriefInput } from './types';
import { getBriefText } from './types';

export function deriveRestaurantBlueprintFromBusinessBrief(
    input: AiStudioBusinessBriefInput,
): RestaurantBlueprint {
    const plan = input.existingWebsitePlan;
    const text = getBriefText(input);

    return createRestaurantBlueprintFromContext({
        businessName: input.businessName || plan?.businessProfile.businessName,
        industry: input.industry || plan?.businessProfile.industry,
        subIndustry: input.subIndustry,
        description: input.businessDescription || input.description || plan?.businessProfile.description,
        services: input.services || plan?.businessProfile.services,
        contactInfo: plan?.businessProfile.contactInfo,
        menuItems: plan?.contentMap.menuItems,
        now: input.now,
        source: plan?.source === 'imported-url' ? 'imported' : 'ai-studio',
        enabled: isRestaurantIndustryText(text),
    });
}
