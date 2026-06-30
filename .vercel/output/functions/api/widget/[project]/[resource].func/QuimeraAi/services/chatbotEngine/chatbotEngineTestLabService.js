import { supabase } from '../../supabase';
import { evaluateChatbotAction } from '../../utils/chatbotEngine/actionRegistry';
import { buildChatbotEngineSurfaceDeploymentManifest, } from '../../utils/chatbotEngine/surfaceDeploymentManifest';
import { recordChatbotEngineEvent } from './chatbotEngineEventService';
import { getChatbotConfig, updateChatbotConfig, updateChatbotTestScenarioInBlueprint, } from './chatbotEngineConfigurationService';
const RESTRICTED_PROMPT_TERMS = [
    'precio exacto',
    'precios exactos',
    'inventario exacto',
    'estado de orden',
    'estado de mi orden',
    'numero de rastreo',
    'asesoria legal',
    'asesoria financiera',
    'garantia de alergeno',
    'testimonio inventado',
    'exact price',
    'exact prices',
    'exact inventory',
    'order status',
    'my order status',
    'tracking number',
    'legal advice',
    'financial advice',
    'allergen guarantee',
    'invented testimonial',
];
function cleanString(value, maxLength = 240) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function normalizeText(value) {
    return cleanString(value, 5000)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function getScenarioBlockedRuleMatches(scenario, blockedAnswerRules) {
    const prompt = normalizeText(scenario.prompt);
    if (!prompt)
        return [];
    const matchedTerms = RESTRICTED_PROMPT_TERMS.filter(term => prompt.includes(normalizeText(term)));
    if (matchedTerms.length === 0)
        return [];
    return blockedAnswerRules.length > 0 ? blockedAnswerRules : matchedTerms;
}
function evaluateScenarioActions(blueprint, scenario, input) {
    const allowedActions = [];
    const blockedActions = [];
    const warnings = [];
    for (const actionType of scenario.expectedActions) {
        const evaluation = evaluateChatbotAction({
            blueprint,
            tenantId: null,
            projectId: input.projectId,
            actionType,
            sourceSurface: input.sourceSurface,
            sourceModule: input.sourceModule,
            publicRequest: true,
            hasAuth: false,
            hasConsent: true,
            actorType: input.actorId ? 'project_user' : 'system',
            actorId: input.actorId,
            idempotencyParts: ['test-lab', scenario.id, actionType],
            metadata: {
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                testLab: true,
            },
            now: input.now,
        });
        if (evaluation.allowed) {
            allowedActions.push(actionType);
        }
        else {
            blockedActions.push({ actionType, blockers: evaluation.blockers });
        }
        warnings.push(...evaluation.warnings);
    }
    return {
        allowedActions,
        blockedActions,
        warnings: uniqueStrings(warnings),
    };
}
function evaluateScenarioSources(blueprint, scenario) {
    const readySources = [];
    const blockedSources = [];
    for (const sourceType of scenario.expectedSources) {
        const matchingSources = blueprint.knowledgeSources.filter(source => source.type === sourceType);
        const readySource = matchingSources.find(source => (source.status === 'ready' &&
            source.needsReview === false &&
            source.readiness.blockers.length === 0));
        if (readySource) {
            readySources.push(sourceType);
            continue;
        }
        const blockers = matchingSources.length === 0
            ? ['knowledge_source_missing']
            : uniqueStrings(matchingSources.flatMap(source => [
                ...(source.readiness.blockers || []),
                ...(source.status !== 'ready' ? [`knowledge_status_${source.status}`] : []),
                ...(source.needsReview ? ['knowledge_needs_review'] : []),
            ]));
        blockedSources.push({
            sourceType,
            blockers: blockers.length > 0 ? blockers : ['knowledge_source_not_ready'],
        });
    }
    return {
        readySources,
        blockedSources,
    };
}
function evaluateDeploymentCoverage(blueprint) {
    const manifest = buildChatbotEngineSurfaceDeploymentManifest(blueprint.channels);
    const requiredSurfaceIds = new Set(manifest.surfaces
        .filter(surface => surface.requiredForCanonicalDeployment)
        .map(surface => surface.id));
    const requiredBlockedSurfaceIds = manifest.blockedSurfaceIds.filter(surfaceId => requiredSurfaceIds.has(surfaceId));
    const requiredReviewSurfaceIds = manifest.reviewSurfaceIds.filter(surfaceId => requiredSurfaceIds.has(surfaceId));
    const blockers = uniqueStrings([
        ...manifest.missingRequiredSurfaceIds.map(surfaceId => `surface:${surfaceId}:not_deployed`),
        ...requiredBlockedSurfaceIds.map(surfaceId => `surface:${surfaceId}:blocked`),
    ]);
    const warnings = uniqueStrings([
        ...requiredReviewSurfaceIds
            .filter(surfaceId => !manifest.missingRequiredSurfaceIds.includes(surfaceId))
            .map(surfaceId => `surface:${surfaceId}:needs_review`),
    ]);
    return {
        status: blockers.length > 0 ? 'blocked' : manifest.coverageStatus,
        requiredSurfaceCount: manifest.requiredSurfaceCount,
        deployedRequiredSurfaceCount: manifest.deployedRequiredSurfaceCount,
        missingRequiredSurfaceIds: manifest.missingRequiredSurfaceIds,
        blockedSurfaceIds: requiredBlockedSurfaceIds,
        reviewSurfaceIds: requiredReviewSurfaceIds,
        blockers,
        warnings,
    };
}
function resolveTestLabStatus(scenarioResults, deploymentCoverage) {
    if (scenarioResults.length === 0)
        return 'not_run';
    if (scenarioResults.some(result => !result.passed) || deploymentCoverage.blockers.length > 0)
        return 'failing';
    if (deploymentCoverage.warnings.length > 0 || deploymentCoverage.status === 'review')
        return 'needs_review';
    return 'passing';
}
function buildTestLabReadiness(status, deploymentCoverage) {
    const deploymentBlocker = [
        'ES: Faltan superficies requeridas de ChatCore para el despliegue canonico.',
        'EN: Required ChatCore surfaces are missing for canonical deployment.',
    ].join('\n');
    const deploymentWarning = [
        'ES: Algunas superficies de ChatCore requieren revision antes del despliegue canonico.',
        'EN: Some ChatCore surfaces need review before canonical deployment.',
    ].join('\n');
    if (status === 'passing')
        return { isReady: true, blockers: [], warnings: [] };
    if (deploymentCoverage.blockers.length > 0) {
        return {
            isReady: false,
            blockers: [
                deploymentBlocker,
                ...deploymentCoverage.blockers,
            ],
            warnings: deploymentCoverage.warnings,
        };
    }
    if (deploymentCoverage.warnings.length > 0 || status === 'needs_review') {
        return {
            isReady: false,
            blockers: [],
            warnings: [
                deploymentWarning,
                ...deploymentCoverage.warnings,
            ],
        };
    }
    if (status === 'failing') {
        return {
            isReady: false,
            blockers: [[
                    'ES: El Test Lab encontro escenarios fallidos.',
                    'EN: Test Lab found failing scenarios.',
                ].join('\n')],
            warnings: [],
        };
    }
    return {
        isReady: false,
        blockers: [],
        warnings: [[
                'ES: El Test Lab aun no se ha ejecutado.',
                'EN: Test Lab has not run yet.',
            ].join('\n')],
    };
}
export function runChatbotTestScenarioInBlueprint(blueprint, scenario, input) {
    const actionResult = evaluateScenarioActions(blueprint, scenario, input);
    const sourceResult = evaluateScenarioSources(blueprint, scenario);
    const matchedBlockedRules = getScenarioBlockedRuleMatches(scenario, blueprint.testing.blockedAnswerRules);
    const blockers = uniqueStrings([
        ...actionResult.blockedActions.flatMap(item => item.blockers.map(blocker => `${item.actionType}:${blocker}`)),
        ...sourceResult.blockedSources.flatMap(item => item.blockers.map(blocker => `${item.sourceType}:${blocker}`)),
        ...matchedBlockedRules.map(() => 'blocked_answer_rule_matched'),
    ]);
    const passed = blockers.length === 0;
    return {
        scenarioId: scenario.id,
        name: scenario.name,
        status: passed ? 'passed' : 'failed',
        passed,
        blockers,
        warnings: actionResult.warnings,
        expectedActions: scenario.expectedActions,
        allowedActions: actionResult.allowedActions,
        blockedActions: actionResult.blockedActions,
        expectedSources: scenario.expectedSources,
        readySources: sourceResult.readySources,
        blockedSources: sourceResult.blockedSources,
        matchedBlockedRules,
    };
}
export function runChatbotTestLabInBlueprint(blueprint, input = {}) {
    const now = input.now || new Date().toISOString();
    const projectId = input.projectId || 'project';
    const sourceSurface = input.sourceSurface || 'admin_preview';
    const sourceModule = input.sourceModule || 'chatbot-engine-test-lab';
    const scenarioResults = blueprint.testing.testScenarios.map(scenario => runChatbotTestScenarioInBlueprint(blueprint, scenario, {
        projectId,
        actorId: input.actorId,
        sourceSurface,
        sourceModule,
        now,
    }));
    const deploymentCoverage = evaluateDeploymentCoverage(blueprint);
    const scenarioUpdatedBlueprint = scenarioResults.reduce((current, result) => updateChatbotTestScenarioInBlueprint(current, {
        scenarioId: result.scenarioId,
        status: result.status,
        actorId: input.actorId,
        now,
    }), blueprint);
    const status = resolveTestLabStatus(scenarioResults, deploymentCoverage);
    const nextBlueprint = {
        ...scenarioUpdatedBlueprint,
        testing: {
            ...scenarioUpdatedBlueprint.testing,
            evaluationStatus: status,
            readiness: buildTestLabReadiness(status, deploymentCoverage),
        },
    };
    return {
        blueprint: nextBlueprint,
        scenarioResults,
        deploymentCoverage,
        status,
    };
}
export async function runProjectChatbotTestLab(projectId, input = {}, client = supabase) {
    const now = input.now || new Date().toISOString();
    const runId = cleanString(input.runId, 120) || `chatbot-test-lab-${now}`;
    const config = await getChatbotConfig(projectId, client);
    const testRun = runChatbotTestLabInBlueprint(config.chatbotBlueprint, {
        ...input,
        projectId,
        now,
    });
    const persisted = await updateChatbotConfig(projectId, testRun.blueprint, {
        actorId: input.actorId,
        now,
    }, client);
    const event = await recordChatbotEngineEvent(client, {
        tenant_id: config.businessBlueprint.tenantId || null,
        project_id: projectId,
        event_type: 'chatbot_test_lab_run',
        action_type: 'record_analytics_event',
        action_status: testRun.status === 'passing' ? 'observed' : 'failed',
        source_surface: cleanString(input.sourceSurface, 120) || 'admin_preview',
        source_module: cleanString(input.sourceModule, 120) || 'chatbot-engine-test-lab',
        idempotency_key: cleanString(input.idempotencyKey, 240) || `chatbot-engine-test-lab:${projectId}:${runId}`,
        correlation_id: runId,
        actor_type: input.actorId ? 'project_user' : 'system',
        actor_id: cleanString(input.actorId, 120) || null,
        metadata: {
            runId,
            status: testRun.status,
            passed: testRun.status === 'passing',
            scenarioCount: testRun.scenarioResults.length,
            passedCount: testRun.scenarioResults.filter(result => result.passed).length,
            failedCount: testRun.scenarioResults.filter(result => !result.passed).length,
            deploymentCoverage: {
                status: testRun.deploymentCoverage.status,
                requiredSurfaceCount: testRun.deploymentCoverage.requiredSurfaceCount,
                deployedRequiredSurfaceCount: testRun.deploymentCoverage.deployedRequiredSurfaceCount,
                missingRequiredSurfaceIds: testRun.deploymentCoverage.missingRequiredSurfaceIds,
                blockedSurfaceIds: testRun.deploymentCoverage.blockedSurfaceIds,
                reviewSurfaceIds: testRun.deploymentCoverage.reviewSurfaceIds,
                blockers: testRun.deploymentCoverage.blockers,
                warnings: testRun.deploymentCoverage.warnings,
            },
            scenarioResults: testRun.scenarioResults.map(result => ({
                scenarioId: result.scenarioId,
                status: result.status,
                blockers: result.blockers,
                blockedActions: result.blockedActions,
                blockedSources: result.blockedSources,
            })),
        },
        created_at: now,
    });
    return {
        projectId,
        runId,
        status: persisted.chatbotBlueprint.testing.evaluationStatus,
        passed: persisted.chatbotBlueprint.testing.evaluationStatus === 'passing',
        scenarioResults: testRun.scenarioResults,
        deploymentCoverage: testRun.deploymentCoverage,
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
        chatbotBlueprint: persisted.chatbotBlueprint,
    };
}
//# sourceMappingURL=chatbotEngineTestLabService.js.map