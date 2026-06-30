import { supabase } from '../../supabase';
import { buildChatbotEngineExecutedEvent, buildChatbotEngineObservedEvent, CHATBOT_ACTION_BLOCKED_MESSAGE, evaluateChatbotAction, } from '../../utils/chatbotEngine/actionRegistry';
import { addProjectChatbotKnowledgeSource, disableAction, enableAction, getActionRegistry, getChatbotConfig, updateChatbotConfig, updateProjectChatbotKnowledgeSourceReview, updateProjectChatbotSurfaceDeployment, updateProjectChatbotTestScenarioStatus, } from '../chatbotEngine/chatbotEngineConfigurationService';
import { getChatbotEngineRuntimeSnapshot, } from '../chatbotEngine/chatbotEngineDashboardService';
import { recordChatbotEngineEvent } from '../chatbotEngine/chatbotEngineEventService';
import { checkChatbotEcommerceOrderStatus, createChatbotLead, createChatbotEcommerceBackInStockRequest, createChatbotEcommerceProductInquiry, createChatbotFinanceQuoteRequest, explainChatbotEcommerceReturnsPolicy, explainChatbotEcommerceShippingPolicy, queueChatbotEmailFollowUpDraft, recommendChatbotEcommerceProducts, requestChatbotMediaAssetDraft, requestChatbotHumanHandoff, requestChatbotRealtyLead, requestChatbotRestaurantReservation, searchChatbotEcommerceProducts, scoreChatbotLead, sendChatbotInternalAlert, startChatbotEcommerceCheckoutIntent, subscribeChatbotEmailAudience, updateChatbotLead, } from '../chatbotEngine/chatbotEngineRuntimeActionService';
import { createAppointmentFromChat, getAvailableAppointmentSlots, } from '../appointments/appointmentEngineService';
import { runChatbotTestScenarioInBlueprint, runProjectChatbotTestLab, } from '../chatbotEngine/chatbotEngineTestLabService';
import { buildChatbotMessageIntentMetadata, } from '../../utils/chatbotEngine/messageIntentMetadata';
const unsupportedActionMessage = [
    'ES: Esta accion aun no tiene ejecutor canónico en Chatbot Engine Service.',
    'EN: This action does not yet have a canonical executor in Chatbot Engine Service.',
].join('\n');
const conversationNotFoundMessage = [
    'ES: La conversacion no existe o no pertenece a este proyecto.',
    'EN: The conversation does not exist or does not belong to this project.',
].join('\n');
const analyticsMetadataSensitiveKeyPattern = /email|phone|transcript|summary|note|message|secret|token|password|agentid|customerrequest|raw/i;
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function cleanString(value, maxLength = 240) {
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}
function cleanKeyPart(value) {
    if (value === null || value === undefined || value === '')
        return 'none';
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'none';
}
function cleanTags(values) {
    if (!Array.isArray(values))
        return [];
    return Array.from(new Set(values
        .filter((item) => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean))).slice(0, 40);
}
function cleanNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
function cleanMessageRole(value) {
    return value === 'model' ? 'model' : 'user';
}
function addDays(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}
function collectPrimitiveRecordValues(record, keys, maxLength = 500) {
    return keys
        .map((key) => cleanString(record[key], maxLength))
        .filter((value) => Boolean(value));
}
function cleanKnowledgeSnippet(value, maxLength = 900) {
    const cleaned = cleanString(value, maxLength);
    if (!cleaned)
        return undefined;
    return cleaned.replace(/\s+/g, ' ').trim().slice(0, maxLength) || undefined;
}
function summarizeBusinessProfile(blueprint) {
    const profile = blueprint.businessProfile;
    const parts = [
        profile.businessName ? `Business: ${profile.businessName}` : '',
        profile.industry ? `Industry: ${profile.industry}` : '',
        profile.subIndustry ? `Sub-industry: ${profile.subIndustry}` : '',
        profile.description ? `Description: ${profile.description}` : '',
        profile.tagline ? `Tagline: ${profile.tagline}` : '',
        profile.targetAudience ? `Target audience: ${profile.targetAudience}` : '',
    ].filter(Boolean);
    const services = (profile.services || [])
        .slice(0, 8)
        .map(service => [service.name, service.description].filter(Boolean).join(': '))
        .filter(Boolean);
    if (services.length > 0)
        parts.push(`Services: ${services.join('; ')}`);
    const contact = Object.entries(profile.contactInfo || {})
        .filter(([, value]) => ['string', 'number'].includes(typeof value))
        .slice(0, 8)
        .map(([key, value]) => `${key}: ${String(value)}`);
    if (contact.length > 0)
        parts.push(`Public contact: ${contact.join('; ')}`);
    return parts;
}
function summarizeWebsiteKnowledge(blueprint) {
    const website = blueprint.websiteBlueprint;
    const parts = [];
    const pages = (website.pages || [])
        .slice(0, 8)
        .map(page => [page.title, page.slug ? `/${page.slug}` : ''].filter(Boolean).join(' '))
        .filter(Boolean);
    if (pages.length > 0)
        parts.push(`Website pages: ${pages.join('; ')}`);
    if ((website.sections || []).length > 0) {
        parts.push(`Visible section types: ${website.sections.slice(0, 14).join(', ')}`);
    }
    const sectionBlueprints = (website.sectionBlueprints || [])
        .filter(section => section.visible !== false)
        .slice(0, 10)
        .map(section => [section.type, section.componentId, section.layoutVariant].filter(Boolean).join(' / '))
        .filter(Boolean);
    if (sectionBlueprints.length > 0)
        parts.push(`Visible section blueprints: ${sectionBlueprints.join('; ')}`);
    if (website.chatbotPlacement && website.chatbotPlacement !== 'none') {
        parts.push(`ChatCore placement: ${website.chatbotPlacement}`);
    }
    return parts;
}
function summarizeEcommerceKnowledge(blueprint) {
    const ecommerce = blueprint.ecommerceBlueprint;
    const parts = [];
    if ((ecommerce.categories || []).length > 0)
        parts.push(`Categories: ${ecommerce.categories.slice(0, 12).join(', ')}`);
    const products = (ecommerce.starterProducts || [])
        .slice(0, 8)
        .map(product => [
        product.name,
        product.category ? `category ${product.category}` : '',
        product.description || '',
        typeof product.suggestedPrice === 'number' ? `suggested price ${product.suggestedPrice}` : '',
    ].filter(Boolean).join(' - '))
        .filter(Boolean);
    if (products.length > 0)
        parts.push(`Catalog context: ${products.join('; ')}`);
    const settings = [
        ecommerce.inventoryMode ? `inventory ${ecommerce.inventoryMode}` : '',
        ecommerce.fulfillmentMode ? `fulfillment ${ecommerce.fulfillmentMode}` : '',
        ecommerce.paymentMode ? `payments ${ecommerce.paymentMode}` : '',
        ecommerce.shippingMode ? `shipping ${ecommerce.shippingMode}` : '',
        ecommerce.taxMode ? `tax ${ecommerce.taxMode}` : '',
    ].filter(Boolean);
    if (settings.length > 0)
        parts.push(`Store settings: ${settings.join(', ')}`);
    return parts;
}
function summarizeAppointmentsKnowledge(blueprint) {
    const appointments = blueprint.appointmentsBlueprint;
    const parts = [];
    if ((appointments.serviceTypes || []).length > 0)
        parts.push(`Appointment service types: ${appointments.serviceTypes.join(', ')}`);
    if ((appointments.services || []).length > 0) {
        parts.push(`Appointment services: ${appointments.services.slice(0, 8).map(service => service.name).filter(Boolean).join(', ')}`);
    }
    if (appointments.availability) {
        parts.push([
            appointments.availability.timezone ? `timezone ${appointments.availability.timezone}` : '',
            appointments.availability.intervalMinutes ? `interval ${appointments.availability.intervalMinutes} minutes` : '',
            appointments.availability.minimumNoticeMinutes ? `minimum notice ${appointments.availability.minimumNoticeMinutes} minutes` : '',
        ].filter(Boolean).join(', '));
    }
    if (appointments.bookingRules?.confirmationMode) {
        parts.push(`Booking confirmation mode: ${appointments.bookingRules.confirmationMode}`);
    }
    return parts.filter(Boolean);
}
function summarizeRestaurantKnowledge(blueprint) {
    const restaurant = blueprint.restaurantBlueprint;
    const parts = collectPrimitiveRecordValues(restaurant.profile, [
        'name',
        'cuisine',
        'description',
        'serviceStyle',
        'address',
    ], 500);
    if ((restaurant.menuSignals || []).length > 0)
        parts.push(`Menu signals: ${restaurant.menuSignals.slice(0, 10).join(', ')}`);
    if ((restaurant.reservationRules || []).length > 0)
        parts.push(`Reservation rules: ${restaurant.reservationRules.slice(0, 10).join(', ')}`);
    return parts;
}
function summarizeRealtyKnowledge(blueprint) {
    const realty = blueprint.realEstateBlueprint;
    const parts = [];
    if (realty.profileType)
        parts.push(`Real estate profile: ${realty.profileType}`);
    if ((realty.listingTypes || []).length > 0)
        parts.push(`Listing types: ${realty.listingTypes.slice(0, 10).join(', ')}`);
    if ((realty.leadTypes || []).length > 0)
        parts.push(`Lead types: ${realty.leadTypes.slice(0, 10).join(', ')}`);
    const listings = (realty.listingDrafts || [])
        .filter(listing => listing.status === 'active')
        .slice(0, 6)
        .map(listing => [
        listing.title,
        listing.propertyType,
        listing.transactionType,
        typeof listing.price === 'number' ? listing.price : '',
    ].filter(Boolean).join(' - '))
        .filter(Boolean);
    if (listings.length > 0)
        parts.push(`Active listings: ${listings.join('; ')}`);
    return parts;
}
function summarizeBioPageKnowledge(blueprint) {
    const bioPage = blueprint.bioPageBlueprint;
    if (!bioPage)
        return [];
    return [
        `Bio Page status: ${bioPage.status}`,
        bioPage.enabled ? 'Bio Page is enabled in the reviewed blueprint.' : '',
    ].filter(Boolean);
}
function buildKnowledgeSourceText(source, businessBlueprint) {
    const parts = [
        source.name,
        source.contentPreview || '',
        source.sourceUrl ? `Source URL: ${source.sourceUrl}` : '',
    ].filter(Boolean);
    if (source.type === 'business_blueprint')
        parts.push(...summarizeBusinessProfile(businessBlueprint));
    if (source.type === 'website_content')
        parts.push(...summarizeWebsiteKnowledge(businessBlueprint));
    if (source.type === 'ecommerce_products' || source.type === 'ecommerce_policies')
        parts.push(...summarizeEcommerceKnowledge(businessBlueprint));
    if (source.type === 'appointments_services')
        parts.push(...summarizeAppointmentsKnowledge(businessBlueprint));
    if (source.type === 'restaurant_menu' || source.type === 'restaurant_reservations')
        parts.push(...summarizeRestaurantKnowledge(businessBlueprint));
    if (source.type === 'realty_listings')
        parts.push(...summarizeRealtyKnowledge(businessBlueprint));
    if (source.type === 'bio_page')
        parts.push(...summarizeBioPageKnowledge(businessBlueprint));
    return parts
        .map(part => cleanKnowledgeSnippet(part, 1200))
        .filter((part) => Boolean(part))
        .join('. ');
}
function tokenizeKnowledge(value) {
    return new Set(value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(token => token.length > 2)
        .filter(token => !['the', 'and', 'for', 'con', 'que', 'una', 'del', 'los', 'las', 'para', 'from', 'this', 'that'].includes(token)));
}
function rankKnowledgeSources(sources, businessBlueprint, question) {
    const queryTokens = tokenizeKnowledge(question);
    return sources
        .map((source) => {
        const text = buildKnowledgeSourceText(source, businessBlueprint);
        const textTokens = tokenizeKnowledge(text);
        const overlap = Array.from(queryTokens).filter(token => textTokens.has(token)).length;
        const score = overlap + (source.confidence || 0) + (source.type === 'business_blueprint' ? 0.25 : 0);
        return {
            citation: {
                sourceId: source.id,
                name: source.name,
                type: source.type,
                ownerModule: source.ownerModule,
                visibility: source.visibility,
                freshness: source.freshness,
                confidence: source.confidence,
                excerpt: cleanKnowledgeSnippet(text, 700) || source.name,
            },
            score,
        };
    })
        .filter(item => item.citation.excerpt)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map(item => item.citation);
}
export function executeAnswerFromKnowledgeAction(payload, chatbotBlueprint, businessBlueprint) {
    const question = cleanString(payload.question, 12000)
        || cleanString(payload.text, 12000)
        || cleanString(payload.message, 12000)
        || '';
    const eligibleSources = (chatbotBlueprint.knowledgeSources || []).filter(source => (source.status === 'ready'
        && source.needsReview === false
        && source.visibility === 'public'
        && source.readiness?.isReady === true));
    const citations = rankKnowledgeSources(eligibleSources, businessBlueprint, question || 'general project question');
    if (citations.length === 0) {
        return {
            status: 'needs_review',
            actionType: 'answer_from_knowledge',
            answerStatus: 'no_reviewed_knowledge',
            question: question || null,
            answer: [
                'ES: No tengo una fuente publica revisada suficiente para responder eso con seguridad. Puedo tomar tus datos o pasar esto a un humano.',
                'EN: I do not have enough reviewed public knowledge to answer that safely. I can collect your details or hand this to a human.',
            ].join('\n'),
            citations,
            sourceCount: 0,
            needsHumanReview: true,
            handoffRecommended: true,
            knowledgePolicy: 'reviewed_public_sources_only',
        };
    }
    const facts = citations.map(citation => citation.excerpt).join(' ');
    return {
        status: 'answered',
        actionType: 'answer_from_knowledge',
        answerStatus: 'answered_from_reviewed_public_knowledge',
        question: question || null,
        answer: [
            `ES: Segun el conocimiento publico revisado del proyecto: ${facts}`,
            `EN: Based on the project's reviewed public knowledge: ${facts}`,
        ].join('\n'),
        citations,
        sourceCount: citations.length,
        needsHumanReview: false,
        handoffRecommended: false,
        knowledgePolicy: 'reviewed_public_sources_only',
    };
}
function compactMetadata(value) {
    if (!isRecord(value))
        return {};
    return Object.fromEntries(Object.entries(value)
        .filter(([key, entry]) => key.length <= 80 && entry !== undefined)
        .slice(0, 60));
}
function sanitizeAnalyticsMetadata(value, depth = 0) {
    if (!isRecord(value) || depth > 3)
        return { metadata: {}, redacted: false };
    let redacted = false;
    const entries = [];
    for (const [key, entry] of Object.entries(value).slice(0, 60)) {
        if (!key || key.length > 80 || analyticsMetadataSensitiveKeyPattern.test(key)) {
            redacted = true;
            continue;
        }
        if (entry === undefined || entry === null || entry === '')
            continue;
        if (typeof entry === 'string') {
            entries.push([key, entry.slice(0, 300)]);
            continue;
        }
        if (typeof entry === 'number' || typeof entry === 'boolean') {
            entries.push([key, entry]);
            continue;
        }
        if (Array.isArray(entry)) {
            const safeArray = entry
                .filter(item => ['string', 'number', 'boolean'].includes(typeof item))
                .slice(0, 12)
                .map(item => typeof item === 'string' ? item.slice(0, 160) : item);
            entries.push([key, safeArray]);
            if (entry.length !== safeArray.length)
                redacted = true;
            continue;
        }
        if (isRecord(entry)) {
            const nested = sanitizeAnalyticsMetadata(entry, depth + 1);
            if (Object.keys(nested.metadata).length > 0)
                entries.push([key, nested.metadata]);
            if (nested.redacted)
                redacted = true;
            continue;
        }
        redacted = true;
    }
    return { metadata: Object.fromEntries(entries), redacted };
}
function serviceIdempotencyKey(parts) {
    return ['chatbot-engine-service', ...parts].map(cleanKeyPart).join(':').slice(0, 240);
}
function surfaceTags(input) {
    return uniqueStrings([
        ...(input.extra || []),
        input.sourceSurface ? `surface:${input.sourceSurface}` : '',
        input.sourceModule ? `module:${input.sourceModule}` : '',
    ]).slice(0, 40);
}
function combineReadiness(readiness) {
    const blockers = uniqueStrings(readiness.flatMap(item => item.blockers || []));
    const warnings = uniqueStrings(readiness.flatMap(item => item.warnings || []));
    return {
        isReady: blockers.length === 0 && readiness.every(item => item.isReady),
        blockers,
        warnings,
    };
}
function changedSections(current, next) {
    const entries = [
        ['agentProfile', current.agentProfile, next.agentProfile],
        ['knowledgeSources', current.knowledgeSources, next.knowledgeSources],
        ['actions', current.actions, next.actions],
        ['leadCapture', current.leadCapture, next.leadCapture],
        ['handoff', current.handoff, next.handoff],
        ['appointments', current.appointments, next.appointments],
        ['ecommerce', current.ecommerce, next.ecommerce],
        ['restaurants', current.restaurants, next.restaurants],
        ['realEstate', current.realEstate, next.realEstate],
        ['bioPage', current.bioPage, next.bioPage],
        ['channels', current.channels, next.channels],
        ['testing', current.testing, next.testing],
        ['analytics', current.analytics, next.analytics],
        ['deployment', current.deployment, next.deployment],
    ];
    return entries
        .filter(([, before, after]) => JSON.stringify(before) !== JSON.stringify(after))
        .map(([section]) => section);
}
export async function getChatbotReadiness(projectId, client = supabase) {
    const config = await getChatbotConfig(projectId, client);
    const blueprint = config.chatbotBlueprint;
    const actionReadiness = blueprint.actions.map(action => action.readiness);
    const knowledgeReadiness = blueprint.knowledgeSources.map(source => source.readiness);
    const channelReadiness = Object.values(blueprint.channels)
        .filter((value) => Boolean(value && typeof value === 'object' && 'readiness' in value))
        .map(value => value.readiness);
    const readiness = combineReadiness([
        blueprint.readiness,
        blueprint.testing.readiness,
        blueprint.deployment.readiness,
        ...actionReadiness,
        ...knowledgeReadiness,
        ...channelReadiness,
    ]);
    return {
        projectId,
        readiness,
        blueprintStatus: blueprint.status,
        needsReview: blueprint.needsReview,
        actionHealth: {
            total: blueprint.actions.length,
            configured: blueprint.actions.filter(action => action.status === 'configured').length,
            enabled: blueprint.actions.filter(action => action.enabled).length,
            blocked: blueprint.actions.filter(action => action.readiness?.blockers?.length > 0).length,
            needsReview: blueprint.actions.filter(action => action.needsReview || action.requiresReview).length,
        },
        knowledgeHealth: {
            total: blueprint.knowledgeSources.length,
            ready: blueprint.knowledgeSources.filter(source => source.status === 'ready').length,
            blocked: blueprint.knowledgeSources.filter(source => source.readiness?.blockers?.length > 0).length,
            needsReview: blueprint.knowledgeSources.filter(source => source.needsReview).length,
            stale: blueprint.knowledgeSources.filter(source => source.freshness === 'stale').length,
        },
        testingHealth: {
            status: blueprint.testing.evaluationStatus,
            scenarios: blueprint.testing.testScenarios.length,
            blockers: blueprint.testing.readiness.blockers,
            warnings: blueprint.testing.readiness.warnings,
        },
        deploymentHealth: {
            status: blueprint.deployment.status,
            deployedSurfaces: blueprint.deployment.deployedSurfaces,
            voiceEnabled: blueprint.deployment.voiceSettings.enabled,
            blockers: blueprint.deployment.readiness.blockers,
            warnings: blueprint.deployment.readiness.warnings,
        },
    };
}
export async function getKnowledgeSources(projectId, client = supabase) {
    const config = await getChatbotConfig(projectId, client);
    return config.chatbotBlueprint.knowledgeSources;
}
export function syncKnowledgeSource(projectId, input, client = supabase) {
    return updateProjectChatbotKnowledgeSourceReview(projectId, {
        ...input,
        enabled: true,
    }, client);
}
export function disableKnowledgeSource(projectId, input, client = supabase) {
    return updateProjectChatbotKnowledgeSourceReview(projectId, {
        ...input,
        enabled: false,
    }, client);
}
export function addKnowledgeSource(projectId, input, client = supabase) {
    return addProjectChatbotKnowledgeSource(projectId, input, client);
}
export function recordChatbotEvent(input, client = supabase) {
    const event = buildChatbotEngineObservedEvent({
        projectId: input.projectId,
        tenantId: input.tenantId,
        actionType: input.actionType || 'record_analytics_event',
        eventType: input.eventType,
        actionStatus: input.actionStatus === 'allowed' || input.actionStatus === 'blocked'
            ? 'observed'
            : input.actionStatus,
        sourceSurface: input.sourceSurface,
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        conversationId: input.conversationId,
        messageId: input.messageId,
        leadId: input.leadId,
        appointmentId: input.appointmentId,
        actorType: input.actorType || 'system',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            ...(input.metadata || {}),
            projectScoped: true,
            canonicalService: true,
        },
        now: input.now,
    });
    return recordChatbotEngineEvent(client, {
        ...event,
        action_type: input.actionType ?? event.action_type,
    });
}
export async function getChatbotAnalytics(projectId, client = supabase) {
    const snapshot = await getChatbotEngineRuntimeSnapshot(projectId, client);
    return snapshot.analytics;
}
export function createHandoff(input, client = supabase) {
    return requestChatbotHumanHandoff({
        supabase: client,
        ...input,
    });
}
export function deployChatbotToSurface(projectId, input, client = supabase) {
    return updateProjectChatbotSurfaceDeployment(projectId, input, client);
}
export async function applyChatbotBlueprintDraft(projectId, input, client = supabase) {
    return updateChatbotConfig(projectId, {
        ...input.chatbotBlueprint,
        status: 'draft',
        needsReview: true,
    }, {
        actorId: input.actorId,
        now: input.now,
    }, client);
}
export async function previewChatbotBlueprintSync(projectId, input, client = supabase) {
    const current = await getChatbotConfig(projectId, client);
    const nextBlueprint = {
        ...input.chatbotBlueprint,
        status: 'draft',
        needsReview: true,
    };
    const nextReadiness = combineReadiness([
        nextBlueprint.readiness,
        nextBlueprint.testing.readiness,
        nextBlueprint.deployment.readiness,
        ...nextBlueprint.actions.map(action => action.readiness),
        ...nextBlueprint.knowledgeSources.map(source => source.readiness),
    ]);
    return {
        projectId,
        currentReadiness: current.chatbotBlueprint.readiness,
        nextReadiness,
        changedSections: changedSections(current.chatbotBlueprint, nextBlueprint),
        blocked: nextReadiness.blockers.length > 0,
        blockers: nextReadiness.blockers,
        warnings: nextReadiness.warnings,
    };
}
export async function runChatbotTestScenario(projectId, input, client = supabase) {
    const now = input.now || new Date().toISOString();
    const config = await getChatbotConfig(projectId, client);
    const scenario = config.chatbotBlueprint.testing.testScenarios.find(item => item.id === input.scenarioId);
    if (!scenario) {
        throw Object.assign(new Error(`Chatbot test scenario not found: ${input.scenarioId}`), {
            code: 'CHATBOT_TEST_SCENARIO_NOT_FOUND',
        });
    }
    const result = runChatbotTestScenarioInBlueprint(config.chatbotBlueprint, scenario, {
        projectId,
        actorId: input.actorId,
        sourceSurface: input.sourceSurface || 'admin_preview',
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        now,
    });
    const persisted = await updateProjectChatbotTestScenarioStatus(projectId, {
        scenarioId: scenario.id,
        status: result.status,
        actorId: input.actorId,
        now,
    }, client);
    const event = await recordChatbotEngineEvent(client, {
        tenant_id: config.businessBlueprint.tenantId || null,
        project_id: projectId,
        event_type: 'chatbot_test_scenario_run',
        action_type: 'record_analytics_event',
        action_status: result.passed ? 'observed' : 'failed',
        source_surface: input.sourceSurface || 'admin_preview',
        source_module: input.sourceModule || 'chatbot-engine-service',
        idempotency_key: input.idempotencyKey || `chatbot-engine-test-scenario:${projectId}:${scenario.id}:${now}`,
        correlation_id: scenario.id,
        actor_type: input.actorId ? 'project_user' : 'system',
        actor_id: input.actorId || null,
        metadata: {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            status: result.status,
            passed: result.passed,
            blockers: result.blockers,
            blockedActions: result.blockedActions,
            blockedSources: result.blockedSources,
            canonicalService: true,
            projectScoped: true,
        },
        created_at: now,
    });
    return {
        projectId,
        scenario,
        result,
        chatbotBlueprint: persisted.chatbotBlueprint,
        eventId: event.id,
        warnings: event.warning ? [event.warning] : [],
    };
}
async function loadProjectConversation(client, projectId, conversationId) {
    const { data, error } = await client
        .from('social_conversations')
        .select('id,tenant_id,project_id,channel,participant_id,participant_name,participant_email,participant_phone,status,message_count,unread_count,tags,metadata,lead_id,notes')
        .eq('id', conversationId)
        .eq('project_id', projectId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data?.id) {
        throw Object.assign(new Error(conversationNotFoundMessage), {
            code: 'CHATBOT_CONVERSATION_NOT_FOUND',
            status: 404,
        });
    }
    return data;
}
function buildConversationMetadataPatch(input) {
    return {
        sourceSurface: cleanString(input.sourceSurface, 120) || 'website',
        sourceModule: cleanString(input.sourceModule, 120) || 'chatcore',
        chatbotEngineContext: input.chatbotEngineContext || null,
        ...compactMetadata(input.metadata),
        lastCanonicalServiceUpdateAt: input.now,
    };
}
export async function getOrCreateConversation(input, client = supabase) {
    const now = input.now || new Date().toISOString();
    const projectId = cleanString(input.projectId, 120);
    if (!projectId) {
        throw Object.assign(new Error('ES: projectId es requerido.\nEN: projectId is required.'), {
            code: 'CHATBOT_PROJECT_ID_REQUIRED',
            status: 400,
        });
    }
    const sessionId = cleanString(input.sessionId || input.participantId, 120) || `session_${Date.now()}`;
    const channel = cleanString(input.channel, 40) || 'web';
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const participant = input.participantInfo || {};
    const participantName = cleanString(participant.name, 200) || 'Visitante Web';
    const metadata = {
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        sessionId,
        canonicalService: true,
        projectScoped: true,
    };
    const existing = await client
        .from('social_conversations')
        .select('id,message_count')
        .eq('project_id', projectId)
        .eq('channel', channel)
        .eq('participant_id', sessionId)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (existing.error)
        throw existing.error;
    if (existing.data?.id) {
        const event = await recordChatbotEvent({
            tenantId: input.tenantId,
            projectId,
            eventType: 'chatbot_conversation_reused',
            actionType: 'save_conversation',
            actionStatus: 'observed',
            sourceSurface,
            sourceModule,
            conversationId: existing.data.id,
            actorType: input.actorType || 'visitor',
            actorId: input.actorId,
            idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([projectId, 'conversation-reused', sessionId]),
            correlationId: input.correlationId,
            metadata: {
                ...metadata,
                messageCount: Number(existing.data.message_count || 0),
            },
            now,
        }, client);
        return {
            projectId,
            tenantId: input.tenantId,
            conversationId: String(existing.data.id),
            sessionId,
            messageCount: Number(existing.data.message_count || 0),
            reused: true,
            eventId: event.id,
            duplicate: event.duplicate,
            warning: event.warning,
        };
    }
    const created = await client
        .from('social_conversations')
        .insert({
        tenant_id: input.tenantId || null,
        project_id: projectId,
        channel,
        participant_id: sessionId,
        participant_name: participantName,
        participant_avatar: cleanString(participant.avatarUrl, 1000) || null,
        participant_email: cleanString(participant.email, 320) || null,
        participant_phone: cleanString(participant.phone, 80) || null,
        status: 'active',
        started_at: now,
        last_message_at: now,
        message_count: 0,
        unread_count: 0,
        tags: surfaceTags({
            sourceSurface,
            sourceModule,
            extra: ['web-chat', ...cleanTags(input.tags)],
        }),
        metadata,
        created_at: now,
        updated_at: now,
    })
        .select('id')
        .single();
    if (created.error)
        throw created.error;
    const conversationId = String(created.data.id);
    const event = await recordChatbotEvent({
        tenantId: input.tenantId,
        projectId,
        eventType: 'chatbot_conversation_created',
        actionType: 'save_conversation',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([projectId, 'conversation-created', sessionId]),
        correlationId: input.correlationId,
        metadata: {
            ...metadata,
            participantCaptured: Boolean(participant.name || participant.email || participant.phone),
        },
        now,
    }, client);
    return {
        projectId,
        tenantId: input.tenantId,
        conversationId,
        sessionId,
        messageCount: 0,
        reused: false,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
    };
}
async function findIdempotentMessage(input, client) {
    const idempotencyKey = cleanString(input.idempotencyKey, 240);
    if (!idempotencyKey)
        return null;
    const { data, error } = await client
        .from('social_messages')
        .select('id,metadata')
        .eq('project_id', input.projectId)
        .eq('conversation_id', input.conversationId)
        .contains('metadata', { idempotencyKey })
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return data?.id ? data : null;
}
export async function saveConversationMessage(input, client = supabase) {
    const now = input.now || new Date().toISOString();
    const text = cleanString(input.text, 12000);
    if (!text) {
        throw Object.assign(new Error('ES: El texto del mensaje es requerido.\nEN: Message text is required.'), {
            code: 'CHATBOT_MESSAGE_TEXT_REQUIRED',
            status: 400,
        });
    }
    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const duplicateMessage = await findIdempotentMessage(input, client);
    if (duplicateMessage) {
        return {
            projectId: input.projectId,
            tenantId: input.tenantId || conversation.tenant_id || null,
            conversationId: input.conversationId,
            messageId: String(duplicateMessage.id),
            messageCount: Number(conversation.message_count || 0),
            unreadCount: Number(conversation.unread_count || 0),
            duplicate: true,
            intent: null,
            eventIds: [],
            warnings: [],
        };
    }
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const isUser = input.role === 'user';
    const idempotencyKey = cleanString(input.idempotencyKey, 240)
        || serviceIdempotencyKey([input.projectId, input.conversationId, input.role, Number(conversation.message_count || 0) + 1]);
    const intentMetadata = buildChatbotMessageIntentMetadata({
        role: input.role,
        text,
        isVoiceMessage: input.isVoiceMessage,
        sourceSurface,
        sourceModule,
        chatbotEngineContext: input.chatbotEngineContext,
        previousConversationMetadata: conversation.metadata,
        previousConversationTags: conversation.tags,
        now,
    });
    const messageMetadata = {
        ...intentMetadata.messageMetadata,
        ...compactMetadata(input.metadata),
        idempotencyKey,
        canonicalService: true,
        projectScoped: true,
    };
    const message = await client
        .from('social_messages')
        .insert({
        tenant_id: input.tenantId || conversation.tenant_id || null,
        project_id: input.projectId,
        conversation_id: input.conversationId,
        channel: cleanString(input.channel, 40) || conversation.channel || 'web',
        direction: isUser ? 'inbound' : 'outbound',
        sender_id: cleanString(input.senderId, 120) || (isUser ? conversation.participant_id : 'ai-assistant'),
        sender_name: cleanString(input.senderName, 200) || (isUser ? 'Visitante' : 'Asistente AI'),
        recipient_id: cleanString(input.recipientId, 120) || (isUser ? 'ai-assistant' : conversation.participant_id),
        message: text,
        message_type: cleanString(input.messageType, 40) || (input.isVoiceMessage ? 'audio' : 'text'),
        media_url: cleanString(input.mediaUrl, 1000) || null,
        timestamp: now,
        status: 'delivered',
        processed_by_ai: !isUser,
        metadata: messageMetadata,
        created_at: now,
        updated_at: now,
    })
        .select('id')
        .single();
    if (message.error)
        throw message.error;
    const nextMessageCount = Number(conversation.message_count || 0) + 1;
    const nextUnreadCount = isUser ? Number(conversation.unread_count || 0) + 1 : Number(conversation.unread_count || 0);
    const conversationMetadata = {
        ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        ...(intentMetadata.conversationMetadata || {}),
        canonicalService: true,
        projectScoped: true,
    };
    const conversationTags = surfaceTags({
        sourceSurface,
        sourceModule,
        extra: [
            ...cleanTags(conversation.tags),
            ...cleanTags(intentMetadata.conversationTags),
        ],
    });
    const updated = await client
        .from('social_conversations')
        .update({
        last_message_at: now,
        message_count: nextMessageCount,
        unread_count: nextUnreadCount,
        metadata: conversationMetadata,
        tags: conversationTags,
        updated_at: now,
    })
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);
    if (updated.error)
        throw updated.error;
    const eventIds = [];
    const warnings = [];
    const savedEvent = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_message_saved',
        actionType: 'save_message',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        messageId: String(message.data.id),
        actorType: input.actorType || (isUser ? 'visitor' : 'system'),
        actorId: input.actorId,
        idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            role: input.role,
            direction: isUser ? 'inbound' : 'outbound',
            messageLength: text.length,
            isVoiceMessage: input.isVoiceMessage === true,
            intent: intentMetadata.intent,
        },
        now,
    }, client);
    if (savedEvent.id)
        eventIds.push(savedEvent.id);
    if (savedEvent.warning)
        warnings.push(savedEvent.warning);
    if (intentMetadata.intent) {
        const intentEvent = await recordChatbotEvent({
            tenantId: input.tenantId || conversation.tenant_id || null,
            projectId: input.projectId,
            eventType: 'chatbot_intent_analyzed',
            actionType: 'analyze_intent',
            actionStatus: 'observed',
            sourceSurface,
            sourceModule,
            conversationId: input.conversationId,
            messageId: String(message.data.id),
            actorType: input.actorType || 'visitor',
            actorId: input.actorId,
            idempotencyKey: serviceIdempotencyKey([input.projectId, 'intent', input.conversationId, message.data.id, intentMetadata.intent.primaryIntent]),
            correlationId: input.correlationId,
            metadata: {
                intent: intentMetadata.intent,
                customerRequestSignal: true,
            },
            now,
        }, client);
        if (intentEvent.id)
            eventIds.push(intentEvent.id);
        if (intentEvent.warning)
            warnings.push(intentEvent.warning);
    }
    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        messageId: String(message.data.id),
        messageCount: nextMessageCount,
        unreadCount: nextUnreadCount,
        duplicate: false,
        intent: intentMetadata.intent,
        eventIds,
        warnings,
    };
}
export async function updateConversationParticipant(input, client = supabase) {
    const now = input.now || new Date().toISOString();
    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const participant = input.participantInfo || {};
    const updates = {
        metadata: {
            ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
            ...buildConversationMetadataPatch({
                sourceSurface,
                sourceModule,
                chatbotEngineContext: input.chatbotEngineContext,
                metadata: input.metadata,
                now,
            }),
            canonicalService: true,
            projectScoped: true,
        },
        tags: surfaceTags({
            sourceSurface,
            sourceModule,
            extra: [
                ...cleanTags(conversation.tags),
                ...cleanTags(input.tags),
            ],
        }),
        updated_at: now,
    };
    const name = cleanString(participant.name, 200);
    const email = cleanString(participant.email, 320);
    const phone = cleanString(participant.phone, 80);
    const avatar = cleanString(participant.avatarUrl, 1000);
    if (name)
        updates.participant_name = name;
    if (email)
        updates.participant_email = email;
    if (phone)
        updates.participant_phone = phone;
    if (avatar)
        updates.participant_avatar = avatar;
    if (input.status && ['active', 'closed', 'pending', 'escalated'].includes(input.status))
        updates.status = input.status;
    const updated = await client
        .from('social_conversations')
        .update(updates)
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);
    if (updated.error)
        throw updated.error;
    const event = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_participant_updated',
        actionType: 'save_conversation',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([input.projectId, 'participant', input.conversationId, now]),
        correlationId: input.correlationId,
        metadata: {
            participantUpdated: Boolean(name || email || phone || avatar),
            status: updates.status || conversation.status || null,
        },
        now,
    }, client);
    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        sessionId: String(conversation.participant_id || ''),
        messageCount: Number(conversation.message_count || 0),
        reused: true,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
    };
}
export async function linkConversationToLead(input, client = supabase) {
    const leadId = cleanString(input.leadId, 120);
    if (!leadId) {
        throw Object.assign(new Error('ES: leadId es requerido.\nEN: leadId is required.'), {
            code: 'CHATBOT_LEAD_ID_REQUIRED',
            status: 400,
        });
    }
    const now = input.now || new Date().toISOString();
    const conversation = await loadProjectConversation(client, input.projectId, input.conversationId);
    const sourceSurface = cleanString(input.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(input.sourceModule, 120) || 'chatcore';
    const metadata = {
        ...(isRecord(conversation.metadata) ? conversation.metadata : {}),
        ...buildConversationMetadataPatch({
            sourceSurface,
            sourceModule,
            chatbotEngineContext: input.chatbotEngineContext,
            metadata: input.metadata,
            now,
        }),
        linkedLeadId: leadId,
        leadLinkedAt: now,
        canonicalService: true,
        projectScoped: true,
    };
    const updated = await client
        .from('social_conversations')
        .update({
        lead_id: leadId,
        metadata,
        tags: surfaceTags({
            sourceSurface,
            sourceModule,
            extra: [
                ...cleanTags(conversation.tags),
                'lead-linked',
                ...cleanTags(input.tags),
            ],
        }),
        updated_at: now,
    })
        .eq('id', input.conversationId)
        .eq('project_id', input.projectId);
    if (updated.error)
        throw updated.error;
    const event = await recordChatbotEvent({
        tenantId: input.tenantId || conversation.tenant_id || null,
        projectId: input.projectId,
        eventType: 'chatbot_conversation_linked_to_lead',
        actionType: 'link_conversation_to_lead',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: input.conversationId,
        leadId,
        actorType: input.actorType || 'visitor',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey || serviceIdempotencyKey([input.projectId, 'lead-link', input.conversationId, leadId]),
        correlationId: input.correlationId,
        metadata: {
            previousLeadId: conversation.lead_id || null,
            leadLinked: true,
        },
        now,
    }, client);
    return {
        projectId: input.projectId,
        tenantId: input.tenantId || conversation.tenant_id || null,
        conversationId: input.conversationId,
        sessionId: String(conversation.participant_id || ''),
        messageCount: Number(conversation.message_count || 0),
        reused: true,
        leadId,
        eventId: event.id,
        duplicate: event.duplicate,
        warning: event.warning,
    };
}
function requirePayloadString(payload, keys, label, maxLength = 240) {
    for (const key of keys) {
        const value = cleanString(payload[key], maxLength);
        if (value)
            return value;
    }
    throw Object.assign(new Error(`ES: ${label} es requerido.\nEN: ${label} is required.`), {
        code: 'CHATBOT_ACTION_PAYLOAD_REQUIRED',
        status: 400,
        field: keys[0],
    });
}
function participantInfoFromPayload(payload) {
    const nested = isRecord(payload.participantInfo) ? payload.participantInfo : {};
    return {
        name: cleanString(nested.name, 200)
            || cleanString(payload.participantName, 200)
            || cleanString(payload.customerName, 200)
            || cleanString(payload.name, 200)
            || null,
        email: cleanString(nested.email, 320)
            || cleanString(payload.participantEmail, 320)
            || cleanString(payload.customerEmail, 320)
            || cleanString(payload.email, 320)
            || null,
        phone: cleanString(nested.phone, 80)
            || cleanString(payload.participantPhone, 80)
            || cleanString(payload.customerPhone, 80)
            || cleanString(payload.phone, 80)
            || null,
        avatarUrl: cleanString(nested.avatarUrl, 1000) || cleanString(payload.avatarUrl, 1000) || null,
    };
}
function runtimeCommon(scope, payload) {
    return {
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        sourceSurface: cleanString(payload.sourceSurface, 120) || 'website',
        sourceModule: cleanString(payload.sourceModule, 120) || 'chatcore',
        chatbotEngineContext: isRecord(payload.chatbotEngineContext) ? payload.chatbotEngineContext : null,
        metadata: compactMetadata(payload.metadata),
        correlationId: cleanString(payload.correlationId, 240),
        actorType: cleanString(payload.actorType, 40) || 'system',
        actorId: cleanString(payload.actorId, 120),
        idempotencyKey: cleanString(payload.idempotencyKey, 240),
        now: cleanString(payload.now, 80),
    };
}
async function executeSaveConversationAction(scope, payload, client) {
    const common = runtimeCommon(scope, payload);
    const conversationId = cleanString(payload.conversationId, 120);
    if (conversationId) {
        return updateConversationParticipant({
            ...common,
            conversationId,
            participantInfo: participantInfoFromPayload(payload),
            status: cleanString(payload.status, 40),
            tags: cleanTags(payload.tags),
        }, client);
    }
    return getOrCreateConversation({
        ...common,
        channel: cleanString(payload.channel, 40) || 'web',
        sessionId: cleanString(payload.sessionId, 120) || cleanString(payload.participantId, 120),
        participantInfo: participantInfoFromPayload(payload),
        tags: cleanTags(payload.tags),
    }, client);
}
async function executeSaveMessageAction(scope, payload, client) {
    const common = runtimeCommon(scope, payload);
    return saveConversationMessage({
        ...common,
        conversationId: requirePayloadString(payload, ['conversationId'], 'conversationId'),
        role: cleanMessageRole(payload.role),
        text: requirePayloadString(payload, ['text', 'message'], 'text', 12000),
        channel: cleanString(payload.channel, 40) || 'web',
        isVoiceMessage: payload.isVoiceMessage === true,
        messageType: cleanString(payload.messageType, 40),
        mediaUrl: cleanString(payload.mediaUrl, 1000),
        senderId: cleanString(payload.senderId, 120),
        senderName: cleanString(payload.senderName, 200),
        recipientId: cleanString(payload.recipientId, 120),
    }, client);
}
function executeAnalyzeIntentAction(payload) {
    const text = requirePayloadString(payload, ['text', 'message'], 'text', 12000);
    return buildChatbotMessageIntentMetadata({
        role: cleanMessageRole(payload.role),
        text,
        isVoiceMessage: payload.isVoiceMessage === true,
        sourceSurface: cleanString(payload.sourceSurface, 120) || 'website',
        sourceModule: cleanString(payload.sourceModule, 120) || 'chatcore',
        chatbotEngineContext: isRecord(payload.chatbotEngineContext) ? payload.chatbotEngineContext : null,
        previousConversationMetadata: isRecord(payload.previousConversationMetadata) ? payload.previousConversationMetadata : null,
        previousConversationTags: cleanTags(payload.previousConversationTags),
        now: cleanString(payload.now, 80),
    });
}
async function executeRecordAnalyticsEventAction(scope, payload, client) {
    const sourceSurface = cleanString(payload.sourceSurface, 120) || 'website';
    const sourceModule = cleanString(payload.sourceModule, 120) || 'chatcore';
    const eventType = cleanString(payload.eventType, 120)
        || cleanString(payload.event_type, 120)
        || 'chatbot_analytics_observed';
    const safeMetadata = sanitizeAnalyticsMetadata({
        ...(isRecord(payload.metadata) ? payload.metadata : {}),
        category: payload.category,
        label: payload.label,
        value: payload.value,
        currency: payload.currency,
        surface: sourceSurface,
        module: sourceModule,
        sessionId: payload.sessionId,
        sourceEventId: payload.sourceEventId,
        analyticsEventType: eventType,
    });
    const event = await recordChatbotEvent({
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        eventType,
        actionType: 'record_analytics_event',
        actionStatus: 'observed',
        sourceSurface,
        sourceModule,
        conversationId: cleanString(payload.conversationId, 120),
        messageId: cleanString(payload.messageId, 120),
        leadId: cleanString(payload.leadId, 120),
        appointmentId: cleanString(payload.appointmentId, 120),
        actorType: cleanString(payload.actorType, 40) || 'system',
        actorId: cleanString(payload.actorId, 120),
        idempotencyKey: cleanString(payload.analyticsIdempotencyKey, 240)
            || cleanString(payload.eventId, 240)
            || cleanString(payload.idempotencyKey, 240)
            || serviceIdempotencyKey([
                scope.projectId,
                'analytics',
                eventType,
                sourceSurface,
                sourceModule,
                cleanString(payload.conversationId, 120),
                cleanString(payload.sessionId, 120),
            ]),
        correlationId: cleanString(payload.correlationId, 240),
        metadata: {
            ...safeMetadata.metadata,
            analyticsRuntime: true,
            analyticsMetadataRedacted: safeMetadata.redacted,
        },
        now: cleanString(payload.now, 80),
    }, client);
    return {
        status: 'recorded',
        actionType: 'record_analytics_event',
        eventType,
        eventId: event.id,
        duplicate: event.duplicate === true,
        warning: event.warning,
        metadataRedacted: safeMetadata.redacted,
    };
}
async function executeCreateAppointmentAction(scope, payload, client) {
    const sourceSurface = cleanString(payload.sourceSurface, 120) || 'booking_page';
    const sourceModule = cleanString(payload.sourceModule, 120) || 'chatcore';
    const notes = cleanString(payload.customerRequestSummary, 6000)
        || cleanString(payload.notes, 6000)
        || cleanString(payload.message, 6000)
        || cleanString(payload.description, 6000)
        || null;
    return createAppointmentFromChat(client, {
        projectId: scope.projectId,
        tenantId: scope.tenantId,
        title: cleanString(payload.title, 250) || 'ChatCore appointment',
        description: cleanString(payload.description, 5000) || notes || '',
        type: cleanString(payload.type, 80),
        status: cleanString(payload.status, 80),
        startDate: requirePayloadString(payload, ['startDate', 'start_date'], 'startDate'),
        endDate: requirePayloadString(payload, ['endDate', 'end_date'], 'endDate'),
        timezone: cleanString(payload.timezone, 80),
        participantName: participantInfoFromPayload(payload).name || undefined,
        participantEmail: participantInfoFromPayload(payload).email || undefined,
        participantPhone: participantInfoFromPayload(payload).phone || undefined,
        linkedLeadId: cleanString(payload.linkedLeadId, 120) || cleanString(payload.leadId, 120),
        sourceLeadId: cleanString(payload.sourceLeadId, 120) || cleanString(payload.leadId, 120),
        sourceConversationId: cleanString(payload.conversationId, 120),
        sourceModule,
        sourceComponent: cleanString(payload.sourceComponent, 120) || 'ChatCore',
        idempotencyKey: cleanString(payload.idempotencyKey, 240),
        createdBy: scope.projectUserId || cleanString(payload.actorId, 120),
        notes,
        metadata: {
            ...compactMetadata(payload.metadata),
            chatbotEngine: true,
            sourceSurface,
            sourceModule,
        },
        createOrLinkLead: payload.createOrLinkLead !== false,
        needsReview: payload.needsReview !== false,
        generatedByAI: payload.generatedByAI !== false,
    });
}
async function executeCheckAvailabilityAction(scope, payload, client) {
    const rawStart = cleanString(payload.startDate, 80) || cleanString(payload.date, 40);
    const startDate = rawStart ? new Date(rawStart) : new Date();
    const days = Math.min(Math.max(cleanNumber(payload.days) || 14, 1), 60);
    const rawEnd = cleanString(payload.endDate, 80);
    const endDate = rawEnd ? new Date(rawEnd) : addDays(startDate, days);
    const slots = await getAvailableAppointmentSlots(client, scope.projectId, {
        startDate,
        endDate,
        durationMinutes: cleanNumber(payload.durationMinutes) || cleanNumber(payload.duration),
        intervalMinutes: cleanNumber(payload.intervalMinutes),
        minimumNoticeMinutes: cleanNumber(payload.minimumNoticeMinutes),
        maxSlots: cleanNumber(payload.maxSlots),
        weeklyHours: Array.isArray(payload.weeklyHours) ? payload.weeklyHours : undefined,
        now: cleanString(payload.now, 80),
    });
    return {
        projectId: scope.projectId,
        sourceOfTruth: 'project_appointments',
        blockedTimeSource: 'project_appointment_blocks',
        slotCount: slots.length,
        slots,
    };
}
async function dispatchChatbotRuntimeAction(actionType, scope, payload, config) {
    switch (actionType) {
        case 'answer_from_knowledge':
            return executeAnswerFromKnowledgeAction(payload, config.chatbotBlueprint, config.businessBlueprint);
        case 'record_analytics_event':
            return executeRecordAnalyticsEventAction(scope, payload, scope.supabase);
        case 'save_conversation':
            return executeSaveConversationAction(scope, payload, scope.supabase);
        case 'save_message':
            return executeSaveMessageAction(scope, payload, scope.supabase);
        case 'analyze_intent':
            return executeAnalyzeIntentAction(payload);
        case 'link_conversation_to_lead':
            return linkConversationToLead({
                ...runtimeCommon(scope, payload),
                conversationId: requirePayloadString(payload, ['conversationId'], 'conversationId'),
                leadId: requirePayloadString(payload, ['leadId', 'linkedLeadId'], 'leadId'),
            }, scope.supabase);
        case 'create_lead':
            return createChatbotLead({ ...scope, ...payload });
        case 'update_lead':
            return updateChatbotLead({ ...scope, ...payload });
        case 'create_appointment':
            return executeCreateAppointmentAction(scope, payload, scope.supabase);
        case 'check_availability':
            return executeCheckAvailabilityAction(scope, payload, scope.supabase);
        case 'score_lead':
            return scoreChatbotLead({ ...scope, ...payload });
        case 'handoff_to_human':
            return requestChatbotHumanHandoff({ ...scope, ...payload });
        case 'create_support_ticket':
            return requestChatbotHumanHandoff({
                ...scope,
                ...payload,
                reason: cleanString(payload.reason, 120) || 'support_request',
                summary: cleanString(payload.summary, 2000) || cleanString(payload.message, 2000) || 'Support requested from ChatCore.',
            });
        case 'request_restaurant_reservation':
            return requestChatbotRestaurantReservation({ ...scope, ...payload });
        case 'request_realty_showing':
        case 'register_open_house':
            return requestChatbotRealtyLead({ ...scope, ...payload, actionType });
        case 'search_products':
            return searchChatbotEcommerceProducts({ ...scope, ...payload });
        case 'recommend_products':
            return recommendChatbotEcommerceProducts({ ...scope, ...payload });
        case 'explain_shipping':
            return explainChatbotEcommerceShippingPolicy({ ...scope, ...payload });
        case 'explain_returns':
            return explainChatbotEcommerceReturnsPolicy({ ...scope, ...payload });
        case 'create_product_inquiry':
            return createChatbotEcommerceProductInquiry({ ...scope, ...payload });
        case 'back_in_stock_request':
            return createChatbotEcommerceBackInStockRequest({ ...scope, ...payload });
        case 'check_order_status':
            return checkChatbotEcommerceOrderStatus({ ...scope, ...payload });
        case 'start_checkout':
            return startChatbotEcommerceCheckoutIntent({ ...scope, ...payload });
        case 'subscribe_email_audience':
            return subscribeChatbotEmailAudience({ ...scope, ...payload });
        case 'queue_email_follow_up':
            return queueChatbotEmailFollowUpDraft({ ...scope, ...payload });
        case 'send_internal_alert':
            return sendChatbotInternalAlert({ ...scope, ...payload });
        case 'create_finance_quote_request':
            return createChatbotFinanceQuoteRequest({ ...scope, ...payload });
        case 'request_media_asset':
            return requestChatbotMediaAssetDraft({ ...scope, ...payload });
        default:
            throw Object.assign(new Error(unsupportedActionMessage), {
                code: 'CHATBOT_ACTION_EXECUTOR_MISSING',
                status: 501,
                actionType,
            });
    }
}
export async function executeChatbotAction(input, client = supabase) {
    const config = await getChatbotConfig(input.scope.projectId, client);
    const evaluation = evaluateChatbotAction({
        blueprint: config.chatbotBlueprint,
        tenantId: input.scope.tenantId,
        projectId: input.scope.projectId,
        actionType: input.actionType,
        sourceSurface: input.sourceSurface,
        sourceModule: input.sourceModule || 'chatbot-engine-service',
        conversationId: input.conversationId,
        leadId: input.leadId,
        appointmentId: input.appointmentId,
        publicRequest: input.publicRequest,
        hasAuth: input.hasAuth,
        hasConsent: input.hasConsent,
        actorType: input.actorType || 'system',
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        metadata: {
            ...(input.metadata || {}),
            canonicalService: true,
            projectScoped: true,
        },
        now: input.now,
    });
    const allowedEvent = await recordChatbotEngineEvent(client, evaluation.auditEvent);
    if (!evaluation.allowed) {
        throw Object.assign(new Error(CHATBOT_ACTION_BLOCKED_MESSAGE), {
            code: 'CHATBOT_ACTION_BLOCKED',
            status: 403,
            blockers: evaluation.blockers,
            eventId: allowedEvent.id,
            duplicate: allowedEvent.duplicate,
        });
    }
    const runtimeScope = {
        supabase: client,
        tenantId: input.scope.tenantId,
        projectId: input.scope.projectId,
        projectUserId: input.scope.projectUserId,
    };
    const runtimePayload = {
        ...(input.payload || {}),
        sourceSurface: (input.payload || {}).sourceSurface ?? input.sourceSurface,
        sourceModule: (input.payload || {}).sourceModule ?? input.sourceModule ?? 'chatbot-engine-service',
        conversationId: (input.payload || {}).conversationId ?? input.conversationId,
        leadId: (input.payload || {}).leadId ?? input.leadId,
        appointmentId: (input.payload || {}).appointmentId ?? input.appointmentId,
        idempotencyKey: (input.payload || {}).idempotencyKey ?? evaluation.idempotencyKey,
        correlationId: (input.payload || {}).correlationId ?? input.correlationId,
        actorType: (input.payload || {}).actorType ?? input.actorType ?? 'system',
        actorId: (input.payload || {}).actorId ?? input.actorId,
        now: (input.payload || {}).now ?? input.now,
        metadata: {
            ...(isRecord((input.payload || {}).metadata) ? (input.payload || {}).metadata : {}),
            ...(input.metadata || {}),
            canonicalService: true,
            projectScoped: true,
        },
    };
    const result = await dispatchChatbotRuntimeAction(input.actionType, runtimeScope, runtimePayload, config);
    const executedEvent = await recordChatbotEngineEvent(client, buildChatbotEngineExecutedEvent(evaluation, {
        resultRecorded: true,
        canonicalService: true,
    }));
    return {
        projectId: input.scope.projectId,
        actionType: input.actionType,
        result,
        allowedEventId: allowedEvent.id,
        executedEventId: executedEvent.id,
        duplicate: Boolean(allowedEvent.duplicate || executedEvent.duplicate),
        warnings: [allowedEvent.warning, executedEvent.warning].filter((item) => Boolean(item)),
    };
}
export { disableAction, enableAction, getActionRegistry, getChatbotConfig, getChatbotEngineRuntimeSnapshot, recordChatbotEngineEvent, runProjectChatbotTestLab, updateChatbotConfig, };
//# sourceMappingURL=chatbotEngineService.js.map