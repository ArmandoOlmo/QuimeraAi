import { migrateBusinessBlueprint } from '../businessBlueprint';
import { buildChatbotEngineSurfaceDeploymentManifest, } from './surfaceDeploymentManifest';
const emptyCounts = () => ({
    total: 0,
    ready: 0,
    review: 0,
    blocked: 0,
});
function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function readinessStatus(readiness, needsReview = false) {
    if ((readiness?.blockers || []).length > 0)
        return 'blocked';
    if (needsReview || (readiness?.warnings || []).length > 0 || readiness?.isReady === false)
        return 'review';
    return 'ready';
}
function addStatus(counts, status) {
    counts.total += 1;
    counts[status] += 1;
}
function summarizeKnowledge(sources) {
    const counts = {
        ...emptyCounts(),
        privateSources: 0,
        internalSources: 0,
    };
    sources.forEach(source => {
        addStatus(counts, readinessStatus(source.readiness, source.needsReview || source.status !== 'ready'));
        if (source.visibility === 'private')
            counts.privateSources += 1;
        if (source.visibility === 'internal')
            counts.internalSources += 1;
    });
    return counts;
}
function summarizeActions(actions) {
    const counts = {
        ...emptyCounts(),
        enabled: 0,
        disabled: 0,
        publicAllowed: 0,
        requiresAuth: 0,
        requiresConsent: 0,
        idempotent: 0,
        auditLogged: 0,
    };
    actions.forEach(action => {
        addStatus(counts, readinessStatus(action.readiness, action.needsReview || action.status !== 'configured'));
        if (action.enabled)
            counts.enabled += 1;
        if (!action.enabled)
            counts.disabled += 1;
        if (action.publicAllowed)
            counts.publicAllowed += 1;
        if (action.requiresAuth)
            counts.requiresAuth += 1;
        if (action.requiresConsent)
            counts.requiresConsent += 1;
        if (action.idempotencyRequired)
            counts.idempotent += 1;
        if (action.auditLogRequired)
            counts.auditLogged += 1;
    });
    return counts;
}
function stringSetting(record, key) {
    const value = record[key];
    return typeof value === 'string' ? value.trim() : '';
}
function boolSetting(record, key) {
    return record[key] === true;
}
function collectAppearanceColors(settings) {
    const brandColors = isPlainRecord(settings.brandColors) ? settings.brandColors : {};
    const colorEntries = [
        ['primary', stringSetting(brandColors, 'primary') || stringSetting(settings, 'primaryColor')],
        ['secondary', stringSetting(brandColors, 'secondary') || stringSetting(settings, 'secondaryColor')],
        ['accent', stringSetting(brandColors, 'accent') || stringSetting(settings, 'accentColor')],
        ['background', stringSetting(brandColors, 'background') || stringSetting(settings, 'backgroundColor')],
        ['surface', stringSetting(brandColors, 'surface') || stringSetting(settings, 'surfaceColor')],
        ['text', stringSetting(brandColors, 'text') || stringSetting(settings, 'textColor')],
        ['border', stringSetting(brandColors, 'border') || stringSetting(settings, 'borderColor')],
    ];
    return Object.fromEntries(colorEntries.filter(([, value]) => Boolean(value)));
}
function summarizeAppearance(blueprint) {
    const settings = isPlainRecord(blueprint.deployment.appearanceSettings)
        ? blueprint.deployment.appearanceSettings
        : {};
    const colors = collectAppearanceColors(settings);
    const source = stringSetting(settings, 'source') || 'missing';
    const designSystemSource = stringSetting(settings, 'designSystemSource') || 'missing';
    const usesProjectTokens = boolSetting(settings, 'useQuimeraTokens');
    const designStarAligned = designSystemSource === 'Design Star' || boolSetting(settings, 'designStarAligned');
    const primaryColor = colors.primary || stringSetting(settings, 'primaryColor') || undefined;
    const accentColor = colors.accent || stringSetting(settings, 'accentColor') || undefined;
    const logoConfigured = Boolean(stringSetting(settings, 'logoUrl')
        || blueprint.agentProfile.avatarUrl);
    const avatarConfigured = Boolean(blueprint.agentProfile.avatarUrl
        || stringSetting(settings, 'avatarUrl')
        || stringSetting(settings, 'botAvatarEmoji'));
    const blockers = [
        source === 'missing'
            ? 'ES: Falta el contrato de apariencia del Chatbot Engine.\nEN: Chatbot Engine appearance contract is missing.'
            : '',
    ].filter(Boolean);
    const warnings = [
        !usesProjectTokens
            ? 'ES: La apariencia no confirma uso de tokens del proyecto.\nEN: Appearance does not confirm project token usage.'
            : '',
        !designStarAligned
            ? 'ES: La apariencia no declara alineación con Design Star.\nEN: Appearance does not declare Design Star alignment.'
            : '',
        Object.keys(colors).length < 3
            ? 'ES: La paleta de marca del ChatCore necesita al menos tres colores revisables.\nEN: ChatCore brand palette needs at least three reviewable colors.'
            : '',
        !logoConfigured && !avatarConfigured
            ? 'ES: Falta logo o avatar para mantener identidad visual en superficies públicas.\nEN: Logo or avatar is missing for visual identity across public surfaces.'
            : '',
    ].filter(Boolean);
    return {
        status: blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'review' : 'ready',
        source,
        designSystemSource,
        usesProjectTokens,
        designStarAligned,
        brandColorCount: Object.keys(colors).length,
        primaryColor,
        accentColor,
        logoConfigured,
        avatarConfigured,
        blockers,
        warnings,
    };
}
function buildCapabilitySummary(blueprint) {
    const voiceSettings = blueprint.deployment.voiceSettings;
    const financeActions = blueprint.actions.filter(action => action.ownerModule === 'finance');
    const financeNeedsReview = financeActions.length === 0
        || financeActions.some(action => action.needsReview || action.status !== 'configured' || !action.enabled);
    const mediaActions = blueprint.actions.filter(action => action.ownerModule === 'media-ai');
    const mediaNeedsReview = mediaActions.length === 0
        || mediaActions.some(action => action.needsReview || action.status !== 'configured' || !action.enabled);
    return [
        {
            id: 'leadCapture',
            enabled: blueprint.leadCapture.enabled,
            needsReview: blueprint.leadCapture.needsReview,
            status: blueprint.leadCapture.needsReview ? 'review' : 'ready',
        },
        {
            id: 'handoff',
            enabled: blueprint.handoff.enabled,
            needsReview: blueprint.handoff.needsReview,
            status: blueprint.handoff.needsReview ? 'review' : 'ready',
        },
        {
            id: 'appointments',
            enabled: blueprint.appointments.enabled,
            needsReview: blueprint.appointments.needsReview,
            status: blueprint.appointments.needsReview ? 'review' : 'ready',
        },
        {
            id: 'ecommerce',
            enabled: blueprint.ecommerce.enabled,
            needsReview: blueprint.ecommerce.needsReview,
            status: blueprint.ecommerce.needsReview ? 'review' : 'ready',
        },
        {
            id: 'restaurants',
            enabled: blueprint.restaurants.enabled,
            needsReview: blueprint.restaurants.needsReview,
            status: blueprint.restaurants.needsReview ? 'review' : 'ready',
        },
        {
            id: 'realEstate',
            enabled: blueprint.realEstate.enabled,
            needsReview: blueprint.realEstate.needsReview,
            status: blueprint.realEstate.needsReview ? 'review' : 'ready',
        },
        {
            id: 'bioPage',
            enabled: blueprint.bioPage.enabled,
            needsReview: blueprint.bioPage.needsReview,
            status: blueprint.bioPage.needsReview ? 'review' : 'ready',
        },
        {
            id: 'finance',
            enabled: financeActions.length > 0,
            needsReview: financeNeedsReview,
            status: financeActions.length === 0 ? 'blocked' : financeNeedsReview ? 'review' : 'ready',
        },
        {
            id: 'mediaAi',
            enabled: mediaActions.length > 0,
            needsReview: mediaNeedsReview,
            status: mediaActions.length === 0 ? 'blocked' : mediaNeedsReview ? 'review' : 'ready',
        },
        {
            id: 'voice',
            enabled: voiceSettings.enabled,
            needsReview: !voiceSettings.enabled || !voiceSettings.agentId,
            status: voiceSettings.enabled && voiceSettings.agentId ? 'ready' : 'blocked',
        },
    ];
}
function collectReadiness(blueprint, surfaces, appearance) {
    const checkpoints = [
        readinessStatus(blueprint.readiness, blueprint.needsReview),
        ...blueprint.knowledgeSources.map(source => readinessStatus(source.readiness, source.needsReview || source.status !== 'ready')),
        ...blueprint.actions.map(action => readinessStatus(action.readiness, action.needsReview || action.status !== 'configured')),
        ...surfaces.map(surface => surface.readinessStatus),
        appearance.status,
        readinessStatus(blueprint.testing.readiness, blueprint.testing.evaluationStatus !== 'passing'),
        readinessStatus(blueprint.deployment.readiness, blueprint.deployment.status !== 'deployed'),
    ];
    const blockers = [
        ...blueprint.readiness.blockers,
        ...blueprint.knowledgeSources.flatMap(source => source.readiness.blockers),
        ...blueprint.actions.flatMap(action => action.readiness.blockers),
        ...surfaces.flatMap(surface => surface.blockers),
        ...appearance.blockers,
        ...blueprint.testing.readiness.blockers,
        ...blueprint.deployment.readiness.blockers,
    ];
    const warnings = [
        ...blueprint.readiness.warnings,
        ...blueprint.knowledgeSources.flatMap(source => source.readiness.warnings),
        ...blueprint.actions.flatMap(action => action.readiness.warnings),
        ...surfaces.flatMap(surface => surface.warnings),
        ...appearance.warnings,
        ...blueprint.testing.readiness.warnings,
        ...blueprint.deployment.readiness.warnings,
    ];
    return {
        status: checkpoints.includes('blocked') ? 'blocked' : checkpoints.includes('review') ? 'review' : 'ready',
        readyCheckpoints: checkpoints.filter(status => status === 'ready').length,
        totalCheckpoints: checkpoints.length,
        blockers: Array.from(new Set(blockers)).filter(Boolean),
        warnings: Array.from(new Set(warnings)).filter(Boolean),
    };
}
export function resolveProjectChatbotBlueprint(project) {
    const data = isPlainRecord(project?.data) ? project?.data : null;
    const candidate = project?.businessBlueprint || (isPlainRecord(data?.businessBlueprint) ? data.businessBlueprint : undefined);
    const migratedBlueprint = migrateBusinessBlueprint(candidate);
    return migratedBlueprint?.chatbotBlueprint || null;
}
export function buildChatbotEngineDashboardSummary(blueprint) {
    if (!blueprint) {
        return {
            hasBlueprint: false,
            status: 'blocked',
            readyCheckpoints: 0,
            totalCheckpoints: 0,
            blockers: ['chatbot_blueprint_missing'],
            warnings: [],
            supportedLanguages: [],
            appearance: {
                status: 'blocked',
                source: 'missing',
                designSystemSource: 'missing',
                usesProjectTokens: false,
                designStarAligned: false,
                brandColorCount: 0,
                logoConfigured: false,
                avatarConfigured: false,
                blockers: ['chatbot_blueprint_missing'],
                warnings: [],
            },
            training: {
                businessKnowledgeCount: 0,
                productKnowledgeCount: 0,
                policyKnowledgeCount: 0,
                eventIntentCount: 0,
                knowledgeSectionCount: 0,
                supportedLanguageCount: 0,
            },
            knowledge: { ...emptyCounts(), privateSources: 0, internalSources: 0 },
            actions: {
                ...emptyCounts(),
                enabled: 0,
                disabled: 0,
                publicAllowed: 0,
                requiresAuth: 0,
                requiresConsent: 0,
                idempotent: 0,
                auditLogged: 0,
            },
            surfaces: [],
            capabilities: [],
            testLab: {
                scenarioCount: 0,
                regressionQuestionCount: 0,
                blockedRuleCount: 0,
                evaluationStatus: 'missing',
            },
            eventLog: {
                eventCount: 0,
                metricCount: 0,
                conversionGoalCount: 0,
                events: [],
            },
            deployment: {
                status: 'missing',
                deployedSurfaces: [],
                voiceEnabled: false,
                voiceProvider: 'none',
                voiceAgentConfigured: false,
                requireActionRegistry: true,
                requireKnowledgeReview: true,
                surfaceCoverage: {
                    required: 0,
                    deployedRequired: 0,
                    public: 0,
                    deployedPublic: 0,
                    missingRequired: [],
                    blocked: [],
                    review: [],
                    status: 'blocked',
                },
            },
        };
    }
    const surfaceManifest = buildChatbotEngineSurfaceDeploymentManifest(blueprint.channels);
    const surfaces = surfaceManifest.surfaces;
    const appearance = summarizeAppearance(blueprint);
    const readiness = collectReadiness(blueprint, surfaces, appearance);
    const safetySettings = isPlainRecord(blueprint.deployment.safetySettings) ? blueprint.deployment.safetySettings : {};
    const trainingSections = [
        blueprint.businessKnowledge,
        blueprint.productKnowledge,
        blueprint.policyKnowledge,
    ].filter(section => section.length > 0).length;
    return {
        hasBlueprint: true,
        engineVersion: blueprint.engineVersion,
        status: readiness.status,
        readyCheckpoints: readiness.readyCheckpoints,
        totalCheckpoints: readiness.totalCheckpoints,
        blockers: readiness.blockers,
        warnings: readiness.warnings,
        supportedLanguages: blueprint.agentProfile.supportedLanguages,
        agentName: blueprint.agentProfile.agentName,
        appearance,
        training: {
            businessKnowledgeCount: blueprint.businessKnowledge.length,
            productKnowledgeCount: blueprint.productKnowledge.length,
            policyKnowledgeCount: blueprint.policyKnowledge.length,
            eventIntentCount: blueprint.eventIntents.length,
            knowledgeSectionCount: trainingSections,
            supportedLanguageCount: blueprint.agentProfile.supportedLanguages.length,
        },
        knowledge: summarizeKnowledge(blueprint.knowledgeSources),
        actions: summarizeActions(blueprint.actions),
        surfaces,
        capabilities: buildCapabilitySummary(blueprint),
        testLab: {
            scenarioCount: blueprint.testing.testScenarios.length,
            regressionQuestionCount: blueprint.testing.regressionQuestions.length,
            blockedRuleCount: blueprint.testing.blockedAnswerRules.length,
            evaluationStatus: blueprint.testing.evaluationStatus,
        },
        eventLog: {
            eventCount: blueprint.analytics.events.length,
            metricCount: blueprint.analytics.metrics.length,
            conversionGoalCount: blueprint.analytics.conversionGoals.length,
            events: blueprint.analytics.events,
        },
        deployment: {
            status: blueprint.deployment.status,
            deployedSurfaces: blueprint.deployment.deployedSurfaces,
            voiceEnabled: blueprint.deployment.voiceSettings.enabled,
            voiceProvider: blueprint.deployment.voiceSettings.provider || 'none',
            voiceAgentConfigured: Boolean(blueprint.deployment.voiceSettings.agentId),
            requireActionRegistry: safetySettings.requireActionRegistry !== false,
            requireKnowledgeReview: safetySettings.requireKnowledgeReview !== false,
            surfaceCoverage: {
                required: surfaceManifest.requiredSurfaceCount,
                deployedRequired: surfaceManifest.deployedRequiredSurfaceCount,
                public: surfaceManifest.publicSurfaceCount,
                deployedPublic: surfaceManifest.deployedPublicSurfaceCount,
                missingRequired: surfaceManifest.missingRequiredSurfaceIds,
                blocked: surfaceManifest.blockedSurfaceIds,
                review: surfaceManifest.reviewSurfaceIds,
                status: surfaceManifest.coverageStatus,
            },
        },
    };
}
//# sourceMappingURL=blueprintDashboard.js.map