import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    ChatbotActionType,
    ChatbotBlueprint,
    ChatbotKnowledgeSourceType,
    ChatbotSurface,
    ChatbotTestScenarioBlueprint,
} from '../../types/businessBlueprint';
import { supabase } from '../../supabase';
import { evaluateChatbotAction } from '../../utils/chatbotEngine/actionRegistry';
import { recordChatbotEngineEvent } from './chatbotEngineEventService';
import {
    getChatbotConfig,
    updateChatbotConfig,
    updateChatbotTestScenarioInBlueprint,
} from './chatbotEngineConfigurationService';

type SupabaseLike = Pick<SupabaseClient, 'from'>;

export interface ChatbotTestLabRunInput {
    projectId?: string;
    actorId?: string | null;
    sourceSurface?: ChatbotSurface | string | null;
    sourceModule?: string | null;
    idempotencyKey?: string | null;
    runId?: string | null;
    now?: string;
}

export interface ChatbotTestLabScenarioResult {
    scenarioId: string;
    name: string;
    status: ChatbotTestScenarioBlueprint['status'];
    passed: boolean;
    blockers: string[];
    warnings: string[];
    expectedActions: ChatbotActionType[];
    allowedActions: ChatbotActionType[];
    blockedActions: Array<{ actionType: ChatbotActionType; blockers: string[] }>;
    expectedSources: ChatbotKnowledgeSourceType[];
    readySources: ChatbotKnowledgeSourceType[];
    blockedSources: Array<{ sourceType: ChatbotKnowledgeSourceType; blockers: string[] }>;
    matchedBlockedRules: string[];
}

export interface ChatbotTestLabRunResult {
    projectId: string;
    runId: string;
    status: ChatbotBlueprint['testing']['evaluationStatus'];
    passed: boolean;
    scenarioResults: ChatbotTestLabScenarioResult[];
    eventId?: string;
    warnings: string[];
    chatbotBlueprint: ChatbotBlueprint;
}

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

function cleanString(value: unknown, maxLength = 240): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeText(value: unknown): string {
    return cleanString(value, 5000)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
}

function getScenarioBlockedRuleMatches(
    scenario: ChatbotTestScenarioBlueprint,
    blockedAnswerRules: string[],
): string[] {
    const prompt = normalizeText(scenario.prompt);
    if (!prompt) return [];
    const matchedTerms = RESTRICTED_PROMPT_TERMS.filter(term => prompt.includes(normalizeText(term)));
    if (matchedTerms.length === 0) return [];
    return blockedAnswerRules.length > 0 ? blockedAnswerRules : matchedTerms;
}

function evaluateScenarioActions(
    blueprint: ChatbotBlueprint,
    scenario: ChatbotTestScenarioBlueprint,
    input: Required<Pick<ChatbotTestLabRunInput, 'projectId' | 'sourceModule' | 'sourceSurface' | 'now'>> & Pick<ChatbotTestLabRunInput, 'actorId'>,
): Pick<ChatbotTestLabScenarioResult, 'allowedActions' | 'blockedActions' | 'warnings'> {
    const allowedActions: ChatbotActionType[] = [];
    const blockedActions: ChatbotTestLabScenarioResult['blockedActions'] = [];
    const warnings: string[] = [];

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
        } else {
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

function evaluateScenarioSources(
    blueprint: ChatbotBlueprint,
    scenario: ChatbotTestScenarioBlueprint,
): Pick<ChatbotTestLabScenarioResult, 'readySources' | 'blockedSources'> {
    const readySources: ChatbotKnowledgeSourceType[] = [];
    const blockedSources: ChatbotTestLabScenarioResult['blockedSources'] = [];

    for (const sourceType of scenario.expectedSources) {
        const matchingSources = blueprint.knowledgeSources.filter(source => source.type === sourceType);
        const readySource = matchingSources.find(source => (
            source.status === 'ready' &&
            source.needsReview === false &&
            source.readiness.blockers.length === 0
        ));

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

export function runChatbotTestScenarioInBlueprint(
    blueprint: ChatbotBlueprint,
    scenario: ChatbotTestScenarioBlueprint,
    input: Required<Pick<ChatbotTestLabRunInput, 'projectId' | 'sourceModule' | 'sourceSurface' | 'now'>> & Pick<ChatbotTestLabRunInput, 'actorId'>,
): ChatbotTestLabScenarioResult {
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

export function runChatbotTestLabInBlueprint(
    blueprint: ChatbotBlueprint,
    input: ChatbotTestLabRunInput = {},
): { blueprint: ChatbotBlueprint; scenarioResults: ChatbotTestLabScenarioResult[]; status: ChatbotBlueprint['testing']['evaluationStatus'] } {
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

    const nextBlueprint = scenarioResults.reduce((current, result) => updateChatbotTestScenarioInBlueprint(current, {
        scenarioId: result.scenarioId,
        status: result.status,
        actorId: input.actorId,
        now,
    }), blueprint);

    return {
        blueprint: nextBlueprint,
        scenarioResults,
        status: nextBlueprint.testing.evaluationStatus,
    };
}

export async function runProjectChatbotTestLab(
    projectId: string,
    input: ChatbotTestLabRunInput = {},
    client: SupabaseLike = supabase,
): Promise<ChatbotTestLabRunResult> {
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
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
        chatbotBlueprint: persisted.chatbotBlueprint,
    };
}
