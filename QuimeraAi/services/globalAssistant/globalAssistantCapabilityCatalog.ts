import type {
    AssistantActionDefinition,
    AssistantModuleTarget,
    AssistantSafetyLevel,
} from '../../types/globalAssistant';
import type { PlatformServiceId } from '../../types/serviceAvailability';
import {
    globalAssistantActionRegistry,
    type GlobalAssistantActionRegistry,
} from './globalAssistantActionRegistry';

export interface GlobalAssistantCapabilityAction {
    actionType: string;
    module: AssistantModuleTarget;
    description: string;
    safetyLevel: AssistantSafetyLevel;
    requiresConfirmation: boolean;
    previewSupported: boolean;
    rollbackSupported: boolean;
    mutatesData: boolean;
    executable: boolean;
    rollbackExecutable: boolean;
    safeNavigation: boolean;
    requiredPermissions: string[];
    requiredService?: PlatformServiceId;
    requiredFeature?: string;
    availableInContext: boolean;
    blockedBy: string[];
}

export interface GlobalAssistantModuleCapability {
    module: AssistantModuleTarget;
    actionCount: number;
    executableActionCount: number;
    previewActionCount: number;
    rollbackActionCount: number;
    rollbackExecutableActionCount: number;
    rollbackGapActionCount: number;
    safeNavigationActionCount: number;
    highRiskActionCount: number;
    serviceIds: PlatformServiceId[];
    featureFlags: string[];
    actionTypes: string[];
    executableActionTypes: string[];
    previewOnlyActionTypes: string[];
    unavailableActionTypes: string[];
}

export interface GlobalAssistantCapabilityCatalog {
    generatedAt: string;
    actionCount: number;
    executableActionCount: number;
    rollbackActionCount: number;
    rollbackExecutableActionCount: number;
    rollbackGapActionCount: number;
    modules: GlobalAssistantModuleCapability[];
    actions: GlobalAssistantCapabilityAction[];
}

export interface BuildGlobalAssistantCapabilityCatalogInput {
    registry?: GlobalAssistantActionRegistry;
    enabledServices?: PlatformServiceId[];
    enabledFeatures?: string[];
}

const HIGH_RISK_LEVELS = new Set<AssistantSafetyLevel>(['high', 'critical']);

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const isServiceAvailable = (
    definition: AssistantActionDefinition,
    enabledServices?: PlatformServiceId[],
): boolean => !definition.requiredService || !enabledServices || enabledServices.includes(definition.requiredService);

const isFeatureAvailable = (
    definition: AssistantActionDefinition,
    enabledFeatures?: string[],
): boolean => !definition.requiredFeature || !enabledFeatures || enabledFeatures.includes(definition.requiredFeature);

const toCapabilityAction = (
    definition: AssistantActionDefinition,
    input: BuildGlobalAssistantCapabilityCatalogInput,
): GlobalAssistantCapabilityAction => {
    const blockedBy = [
        ...(!isServiceAvailable(definition, input.enabledServices) && definition.requiredService
            ? [`service:${definition.requiredService}`]
            : []),
        ...(!isFeatureAvailable(definition, input.enabledFeatures) && definition.requiredFeature
            ? [`feature:${definition.requiredFeature}`]
            : []),
    ];
    const executable = typeof definition.execute === 'function';

    return {
        actionType: definition.actionType,
        module: definition.module,
        description: definition.description,
        safetyLevel: definition.safetyLevel,
        requiresConfirmation: definition.requiresConfirmation,
        previewSupported: definition.previewSupported,
        rollbackSupported: definition.rollbackSupported,
        mutatesData: definition.mutatesData,
        executable,
        rollbackExecutable: typeof definition.rollback === 'function',
        safeNavigation: !definition.mutatesData && definition.safetyLevel === 'low',
        requiredPermissions: definition.requiredPermissions,
        requiredService: definition.requiredService,
        requiredFeature: definition.requiredFeature,
        availableInContext: blockedBy.length === 0,
        blockedBy,
    };
};

const summarizeModule = (
    module: AssistantModuleTarget,
    actions: GlobalAssistantCapabilityAction[],
): GlobalAssistantModuleCapability => ({
    module,
    actionCount: actions.length,
    executableActionCount: actions.filter(action => action.executable).length,
    previewActionCount: actions.filter(action => action.previewSupported).length,
    rollbackActionCount: actions.filter(action => action.rollbackSupported).length,
    rollbackExecutableActionCount: actions.filter(action => action.rollbackSupported && action.rollbackExecutable).length,
    rollbackGapActionCount: actions.filter(action => action.rollbackSupported && !action.rollbackExecutable).length,
    safeNavigationActionCount: actions.filter(action => action.safeNavigation).length,
    highRiskActionCount: actions.filter(action => HIGH_RISK_LEVELS.has(action.safetyLevel)).length,
    serviceIds: unique(actions.map(action => action.requiredService).filter((service): service is PlatformServiceId => Boolean(service))),
    featureFlags: unique(actions.map(action => action.requiredFeature).filter((feature): feature is string => Boolean(feature))),
    actionTypes: actions.map(action => action.actionType),
    executableActionTypes: actions.filter(action => action.executable).map(action => action.actionType),
    previewOnlyActionTypes: actions
        .filter(action => action.previewSupported && !action.executable)
        .map(action => action.actionType),
    unavailableActionTypes: actions
        .filter(action => !action.availableInContext)
        .map(action => action.actionType),
});

export function buildGlobalAssistantCapabilityCatalog(
    input: BuildGlobalAssistantCapabilityCatalogInput = {},
): GlobalAssistantCapabilityCatalog {
    const registry = input.registry || globalAssistantActionRegistry;
    const actions = registry
        .list()
        .map(definition => toCapabilityAction(definition, input))
        .sort((left, right) => left.module.localeCompare(right.module) || left.actionType.localeCompare(right.actionType));
    const moduleNames = unique(actions.map(action => action.module)).sort();
    const modules = moduleNames.map(module =>
        summarizeModule(module, actions.filter(action => action.module === module)),
    );

    return {
        generatedAt: new Date().toISOString(),
        actionCount: actions.length,
        executableActionCount: actions.filter(action => action.executable).length,
        rollbackActionCount: actions.filter(action => action.rollbackSupported).length,
        rollbackExecutableActionCount: actions.filter(action => action.rollbackSupported && action.rollbackExecutable).length,
        rollbackGapActionCount: actions.filter(action => action.rollbackSupported && !action.rollbackExecutable).length,
        modules,
        actions,
    };
}
