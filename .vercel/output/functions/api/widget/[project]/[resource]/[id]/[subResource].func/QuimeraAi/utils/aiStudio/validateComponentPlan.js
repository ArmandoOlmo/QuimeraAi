import { getComponentAnatomy, isComponentLayoutVariant } from '../../registry/componentAnatomyRegistry';
import { getComponentDefinition } from '../../registry/componentRegistry';
const addIssue = (issues, issue) => {
    if (!issues.some(existing => (existing.code === issue.code &&
        existing.componentId === issue.componentId &&
        existing.field === issue.field))) {
        issues.push(issue);
    }
};
function hasRequiredData(componentId, context) {
    const data = context.availableData || {};
    switch (componentId) {
        case 'featuredProducts':
            return Boolean((data.productsCount || 0) > 0 || data.hasDraftProducts);
        case 'productCarousel':
            return (data.productsCount || 0) >= 4;
        case 'categoryShowcase':
            return (data.categoriesCount || 0) > 0;
        case 'saleCountdown':
            return Boolean(data.hasMerchantApprovedPromotion);
        case 'testimonials':
            return (data.testimonialsCount || 0) > 0 || (data.reviewsCount || 0) > 0;
        default:
            return true;
    }
}
function checkProtectedManualSection(issues, componentId, input) {
    const component = getComponentDefinition(componentId);
    const targetSection = component?.renderTargets?.websiteSection;
    if (!targetSection)
        return;
    const protectedSection = input.existingBusinessBlueprint?.websiteBlueprint.sectionBlueprints
        ?.find(section => section.type === targetSection && (section.metadata.userModified ||
        section.metadata.lockedFromRegeneration));
    if (protectedSection) {
        addIssue(issues, {
            code: 'protected_manual_section',
            severity: 'warning',
            componentId,
            field: 'metadata',
            message: `${componentId} maps to ${targetSection}, which is protected from regeneration.`,
        });
    }
}
export function validateComponentPlan(input) {
    const issues = [];
    const selectedIds = input.componentPlan.selectedComponents.map(component => component.componentId);
    const duplicateIds = selectedIds.filter((componentId, index) => selectedIds.indexOf(componentId) !== index);
    duplicateIds.forEach(componentId => {
        addIssue(issues, {
            code: 'duplicate_component',
            severity: 'warning',
            componentId,
            message: `${componentId} appears more than once in the component plan.`,
        });
    });
    input.componentPlan.selectedComponents.forEach(selected => {
        const component = getComponentDefinition(selected.componentId);
        if (!component) {
            addIssue(issues, {
                code: 'unknown_component',
                severity: 'error',
                componentId: selected.componentId,
                message: `${selected.componentId} is not registered in componentRegistry.`,
            });
            return;
        }
        if (!component.compatibleBuilders.includes(input.context.builder)) {
            addIssue(issues, {
                code: 'incompatible_builder',
                severity: 'error',
                componentId: component.id,
                field: 'compatibleBuilders',
                message: `${component.id} is not compatible with ${input.context.builder} builder.`,
                fallbackComponentId: component.fallbackComponentId,
            });
        }
        if (component.implementationStatus === 'metadata_only') {
            addIssue(issues, {
                code: 'metadata_only_component',
                severity: 'warning',
                componentId: component.id,
                field: 'implementationStatus',
                message: `${component.id} is selection metadata only; renderer does not consume its anatomy variants directly yet.`,
            });
        }
        if (component.implementationStatus === 'planned') {
            addIssue(issues, {
                code: 'planned_component',
                severity: 'warning',
                componentId: component.id,
                field: 'implementationStatus',
                message: `${component.id} is planned and must not be mounted as a rendered Website Builder section yet.`,
                fallbackComponentId: component.fallbackComponentId,
            });
        }
        if (input.context.builder === 'website' && component.family === 'storefront_section') {
            addIssue(issues, {
                code: 'forbidden_storefront_in_website',
                severity: 'error',
                componentId: component.id,
                field: 'family',
                message: 'Storefront sections cannot be mounted directly as website sections.',
                fallbackComponentId: component.fallbackComponentId,
            });
        }
        if (component.dataAccess.writes.length > 0) {
            addIssue(issues, {
                code: 'forbidden_ecommerce_write',
                severity: 'error',
                componentId: component.id,
                field: 'dataAccess.writes',
                message: `${component.id} attempts to write canonical ecommerce data from a presentation component.`,
            });
        }
        if (component.incompatibleIndustries.some(industry => input.context.industry.includes(industry))) {
            addIssue(issues, {
                code: 'incompatible_industry',
                severity: 'warning',
                componentId: component.id,
                field: 'compatibleIndustries',
                message: `${component.id} is discouraged for ${input.context.industry}.`,
            });
        }
        if (!component.pageIntents.includes(input.componentPlan.pageIntent)) {
            addIssue(issues, {
                code: 'incompatible_page_intent',
                severity: 'warning',
                componentId: component.id,
                field: 'pageIntents',
                message: `${component.id} is not a preferred component for ${input.componentPlan.pageIntent}.`,
            });
        }
        component.requiredModules.forEach(module => {
            if (!input.componentPlan.capabilities.includes(module)) {
                addIssue(issues, {
                    code: 'missing_required_module',
                    severity: component.fallbackComponentId ? 'warning' : 'error',
                    componentId: component.id,
                    field: 'requiredModules',
                    message: `${component.id} requires ${module}.`,
                    fallbackComponentId: component.fallbackComponentId,
                });
            }
        });
        if (!hasRequiredData(component.id, input.context)) {
            addIssue(issues, {
                code: 'missing_data',
                severity: component.fallbackComponentId ? 'warning' : 'error',
                componentId: component.id,
                field: 'dataRequirements',
                message: `${component.id} does not have the minimum required data.`,
                fallbackComponentId: component.fallbackComponentId,
            });
        }
        if (['saleCountdown', 'testimonials'].includes(component.id) && !hasRequiredData(component.id, input.context)) {
            addIssue(issues, {
                code: 'fake_data_risk',
                severity: 'warning',
                componentId: component.id,
                message: `${component.id} could imply unapproved promotions, sales, or reviews.`,
                fallbackComponentId: component.fallbackComponentId,
            });
        }
        checkProtectedManualSection(issues, component.id, input);
    });
    input.variantPlan?.forEach(variant => {
        const anatomy = getComponentAnatomy(variant.componentId);
        if (!anatomy) {
            addIssue(issues, {
                code: 'unknown_component',
                severity: 'error',
                componentId: variant.componentId,
                field: 'componentId',
                message: `${variant.componentId} has no componentAnatomyRegistry entry.`,
            });
            return;
        }
        if (!isComponentLayoutVariant(variant.componentId, variant.layoutVariant)) {
            addIssue(issues, {
                code: 'unknown_variant',
                severity: 'error',
                componentId: variant.componentId,
                field: 'layoutVariant',
                message: `${variant.layoutVariant} is not a registered variant for ${variant.componentId}.`,
            });
        }
        if (!anatomy.styleVariants.some(styleVariant => styleVariant.id === variant.styleVariant)) {
            addIssue(issues, {
                code: 'unknown_style_variant',
                severity: 'error',
                componentId: variant.componentId,
                field: 'styleVariant',
                message: `${variant.styleVariant} is not a registered style variant for ${variant.componentId}.`,
            });
        }
        variant.activeSlots.forEach(slotId => {
            if (!anatomy.availableSlots.some(slot => slot.id === slotId)) {
                addIssue(issues, {
                    code: 'unknown_slot',
                    severity: 'error',
                    componentId: variant.componentId,
                    field: `activeSlots.${slotId}`,
                    message: `${slotId} is not a registered slot for ${variant.componentId}.`,
                });
            }
        });
        if (!variant.mobileBehavior) {
            addIssue(issues, {
                code: 'unknown_variant',
                severity: 'error',
                componentId: variant.componentId,
                field: 'mobileBehavior',
                message: `${variant.componentId} is missing mobile behavior.`,
            });
        }
    });
    const valid = issues.every(issue => issue.severity !== 'error');
    return {
        valid,
        issues,
        warnings: issues.filter(issue => issue.severity === 'warning').map(issue => issue.message),
    };
}
//# sourceMappingURL=validateComponentPlan.js.map