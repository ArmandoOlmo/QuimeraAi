import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import {
  createAppointmentFromChat,
  createAppointmentFromPublicBooking,
  getAvailableAppointmentSlots,
  getAppointmentsByProject,
  type CanonicalAppointmentInput,
} from '../../services/appointments/appointmentEngineService.js';
import { recordChatbotEngineEvent } from '../../services/chatbotEngine/chatbotEngineEventService.js';
import {
  checkChatbotEcommerceOrderStatus,
  createChatbotFinanceQuoteRequest,
  createChatbotEcommerceBackInStockRequest,
  createChatbotEcommerceProductInquiry,
  explainChatbotEcommerceReturnsPolicy,
  explainChatbotEcommerceShippingPolicy,
  queueChatbotEmailFollowUpDraft,
  requestChatbotHumanHandoff,
  requestChatbotRealtyLead,
  requestChatbotRestaurantReservation,
  recommendChatbotEcommerceProducts,
  searchChatbotEcommerceProducts,
  startChatbotEcommerceCheckoutIntent,
  subscribeChatbotEmailAudience,
} from '../../services/chatbotEngine/chatbotEngineRuntimeActionService.js';
import { migrateBusinessBlueprint } from '../../utils/businessBlueprint/adapters.js';
import {
  buildChatbotEngineObservedEvent,
  CHATBOT_ACTION_BLOCKED_MESSAGE,
  evaluateChatbotAction,
  type ChatbotActionEvaluation,
  type ChatbotEngineActionStatus,
  type ChatbotEngineAuditEvent,
} from '../../utils/chatbotEngine/actionRegistry.js';
import {
  buildChatbotEngineSurfaceContext,
  compactMetadata as compactSurfaceMetadata,
} from '../../utils/chatbotEngine/surfaceContext.js';
import { evaluateChatbotSurfaceDeployment } from '../../utils/chatbotEngine/deploymentGuard.js';
import { classifyChatbotMessageIntent } from '../../utils/chatbotEngine/intentClassifier.js';
import { resolveProjectAiAssistantConfig } from '../../utils/chatbotEngine/projectAiAssistantConfig.js';

type ProjectRow = {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  name: string;
  status: string | null;
  published_at?: string | null;
  data?: Record<string, any> | null;
  theme?: Record<string, any> | null;
  brand_identity?: Record<string, any> | null;
  component_order?: any[] | null;
  section_visibility?: Record<string, boolean> | null;
  pages?: any[] | null;
  menus?: any[] | null;
  ai_assistant_config?: Record<string, any> | null;
};

type ParsedProjectParam = {
  ownerId?: string;
  projectId: string;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 256 * 1024;
const WRITE_LIMIT_PER_MINUTE = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(body));
}

function fail(res: ServerResponse, status: number, message: string, code?: string): void {
  send(res, status, { error: message, code });
}

function getRouteParts(req: IncomingMessage): string[] {
  const url = new URL(req.url || '/', 'http://localhost');
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) {
    return rewrittenPath.split('/').filter(Boolean).map(decodeURIComponent);
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const widgetIndex = parts.indexOf('widget');
  return widgetIndex >= 0 ? parts.slice(widgetIndex + 1).map(decodeURIComponent) : [];
}

function parseProjectParam(raw: string | undefined): ParsedProjectParam {
  if (!raw) throw Object.assign(new Error('Project ID is required.'), { status: 400 });
  const [maybeOwnerId, maybeProjectId] = raw.split('_');
  if (maybeProjectId && UUID_RE.test(maybeOwnerId) && UUID_RE.test(maybeProjectId)) {
    return { ownerId: maybeOwnerId, projectId: maybeProjectId };
  }
  return { projectId: raw };
}

function normalizeString(value: unknown, maxLength = 2000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeStringArray(value: unknown, maxItems = 12, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map(item => normalizeString(item, maxLength))
      .filter((item): item is string => Boolean(item))
      .slice(0, maxItems),
  ));
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key.length <= 80)
      .slice(0, 40),
  );
}

function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getProjectBusinessBlueprint(project: ProjectRow): Record<string, any> | null {
  const data = project.data || {};
  return data.businessBlueprint || data.data?.businessBlueprint || null;
}

function getProjectChatbotBlueprint(project: ProjectRow) {
  return migrateBusinessBlueprint(getProjectBusinessBlueprint(project))?.chatbotBlueprint || null;
}

function getProjectAppointmentsBlueprint(project: ProjectRow): Record<string, any> | null {
  return getProjectBusinessBlueprint(project)?.appointmentsBlueprint || null;
}

function normalizeWeeklyHours(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((rule) => ({
      day: normalizeString(rule?.day, 20) || '',
      enabled: rule?.enabled === true,
      startTime: normalizeString(rule?.startTime, 10) || '09:00',
      endTime: normalizeString(rule?.endTime, 10) || '17:00',
    }))
    .filter(rule => rule.day);
}

async function readJson(req: IncomingMessage & { body?: any }): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function getRequestFingerprint(req: IncomingMessage, projectId: string): string {
  return createHash('sha256')
    .update([
      projectId,
      getClientIp(req),
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : 'unknown',
    ].join('|'))
    .digest('hex')
    .slice(0, 48);
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getWidgetContextRecord(body: Record<string, any>): Record<string, unknown> {
  const metadata = normalizeMetadata(body.metadata);
  const directContext = body.chatbotEngineContext || body.context || metadata.chatbotEngineContext;
  return directContext && typeof directContext === 'object' && !Array.isArray(directContext)
    ? directContext as Record<string, unknown>
    : {};
}

function hasWidgetActionConsent(body: Record<string, any>): boolean {
  const metadata = normalizeMetadata(body.metadata);
  const canonicalEmail = getNestedRecord(metadata, 'canonicalEmail');
  return body.consent === true
    || body.consentAccepted === true
    || body.privacyAccepted === true
    || body.transactionalConsent === true
    || body.marketingConsent === true
    || canonicalEmail.transactionalConsent === true
    || canonicalEmail.marketingConsent === true;
}

function hasWidgetMarketingConsent(body: Record<string, any>): boolean {
  const metadata = normalizeMetadata(body.metadata);
  const canonicalEmail = getNestedRecord(metadata, 'canonicalEmail');
  return body.marketingConsent === true
    || body.emailMarketingConsent === true
    || body.newsletterConsent === true
    || canonicalEmail.marketingConsent === true;
}

function getWidgetSourceSurface(body: Record<string, any>): string {
  const context = getWidgetContextRecord(body);
  return normalizeString(body.sourceSurface, 120)
    || normalizeString(body.surface, 120)
    || normalizeString(context.sourceSurface, 120)
    || (normalizeString(body.source, 120) === 'embedded-widget' ? 'website' : 'website');
}

function getWidgetSourceModule(body: Record<string, any>): string {
  const context = getWidgetContextRecord(body);
  const metadata = normalizeMetadata(body.metadata);
  return normalizeString(body.sourceModule, 120)
    || normalizeString(metadata.sourceModule, 120)
    || normalizeString(context.sourceModule, 120)
    || 'chatcore';
}

function getWidgetSurfaceContext(body: Record<string, any>) {
  const context = getWidgetContextRecord(body);
  return buildChatbotEngineSurfaceContext({
    ...context,
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    route: normalizeString(body.route, 500) || normalizeString(context.route, 500),
    contextKeys: Array.isArray(context.contextKeys) ? context.contextKeys : body.contextKeys,
    metadata: {
      ...compactSurfaceMetadata(context.metadata),
      ...compactSurfaceMetadata(normalizeMetadata(body.metadata)),
    },
  });
}

function getWidgetContextMetadata(body: Record<string, any>): Record<string, unknown> {
  const context = getWidgetSurfaceContext(body);
  return {
    sourceSurface: context.sourceSurface,
    sourceModule: context.sourceModule,
    chatbotEngineContext: context,
  };
}

function uniqueTags(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function recordWidgetChatbotEngineEvent(event: ChatbotEngineAuditEvent): Promise<void> {
  const result = await recordChatbotEngineEvent(getSupabaseAdmin(), event);
  if (result.warning) {
    console.warn('[WidgetApi] Chatbot Engine event not recorded:', result.warning);
  }
}

async function assertWidgetChatbotActionAllowed(
  req: IncomingMessage,
  project: ProjectRow,
  tenantId: string | null,
  body: Record<string, any>,
  options: {
    actionType: ChatbotActionEvaluation['actionType'];
    idempotencyKey?: string | null;
    idempotencyParts?: Array<string | number | boolean | null | undefined>;
    metadata?: Record<string, unknown>;
  },
): Promise<ChatbotActionEvaluation> {
  const actorId = await getAuthenticatedUserId(req);
  const evaluation = evaluateChatbotAction({
    blueprint: getProjectChatbotBlueprint(project),
    tenantId,
    projectId: project.id,
    actionType: options.actionType,
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body) || normalizeString(body.sourceComponent, 120) || 'chatcore',
    conversationId: normalizeString(body.sourceConversationId, 120) || normalizeString(body.conversationId, 120),
    publicRequest: true,
    hasAuth: Boolean(actorId),
    hasConsent: hasWidgetActionConsent(body),
    actorType: actorId ? 'project_user' : 'visitor',
    actorId,
    idempotencyKey: options.idempotencyKey,
    idempotencyParts: options.idempotencyParts,
    correlationId: normalizeString(body.correlationId, 240) || normalizeString(body.publicSubmissionId, 240),
    requestFingerprint: getRequestFingerprint(req, project.id),
    metadata: {
      endpoint: 'api/widget',
      widgetApi: true,
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
      ...(options.metadata || {}),
    },
  });
  const surfaceDeployment = evaluateChatbotSurfaceDeployment(
    getProjectChatbotBlueprint(project),
    getWidgetSourceSurface(body),
    { isPreview: false },
  );

  if (!surfaceDeployment.allowed) {
    await recordWidgetChatbotEngineEvent({
      ...evaluation.auditEvent,
      event_type: 'chatbot_surface_blocked',
      action_status: 'blocked',
      metadata: {
        ...evaluation.auditEvent.metadata,
        reason: surfaceDeployment.reason,
        blockers: surfaceDeployment.blockers,
        warnings: surfaceDeployment.warnings,
        surfaceDeployment: {
          surface: surfaceDeployment.surface,
          surfaceKey: surfaceDeployment.surfaceKey,
          status: surfaceDeployment.status,
          strict: surfaceDeployment.strict,
        },
      },
    });
    throw Object.assign(new Error(CHATBOT_ACTION_BLOCKED_MESSAGE), {
      status: 403,
      code: 'CHATBOT_SURFACE_BLOCKED',
    });
  }

  if (!evaluation.allowed) {
    await recordWidgetChatbotEngineEvent(evaluation.auditEvent);
    throw Object.assign(new Error(CHATBOT_ACTION_BLOCKED_MESSAGE), {
      status: 403,
      code: 'CHATBOT_ACTION_BLOCKED',
    });
  }

  return evaluation;
}

function eventWithResult(
  event: ChatbotEngineAuditEvent,
  overrides: Partial<Pick<ChatbotEngineAuditEvent, 'lead_id' | 'appointment_id' | 'conversation_id' | 'message_id' | 'event_type'>>,
  actionStatus: ChatbotEngineActionStatus,
  metadata: Record<string, unknown> = {},
): ChatbotEngineAuditEvent {
  return {
    ...event,
    ...overrides,
    event_type: overrides.event_type || event.event_type,
    action_status: actionStatus,
    metadata: {
      ...event.metadata,
      ...metadata,
      resultStatus: actionStatus,
    },
  };
}

function getActionErrorMetadata(error: unknown): Record<string, unknown> {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const status = Number(record.status || record.statusCode || 500);
  return {
    errorStatus: Number.isFinite(status) ? status : 500,
    errorCode: normalizeString(record.code, 120) || normalizeString(record.name, 120) || null,
    errorMessage: normalizeString(record.message, 500) || 'Action failed',
  };
}

async function runAuditedWidgetAction<T>(
  evaluation: ChatbotActionEvaluation,
  operation: () => Promise<T>,
  failureMetadata: Record<string, unknown> = {},
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await recordWidgetChatbotEngineEvent(eventWithResult(evaluation.auditEvent, {
      event_type: 'chatbot_action_failed',
    }, 'failed', {
      ...failureMetadata,
      ...getActionErrorMetadata(error),
    }));
    throw error;
  }
}

function enforceWriteRateLimit(req: IncomingMessage, projectId: string): void {
  const now = Date.now();
  const key = `${getClientIp(req)}:${projectId}`;
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }

  if (bucket.count >= WRITE_LIMIT_PER_MINUTE) {
    throw Object.assign(new Error('Too many widget requests. Please try again shortly.'), { status: 429 });
  }

  bucket.count += 1;
}

function isPublished(project: ProjectRow): boolean {
  return project.status === 'Published' || Boolean(project.published_at);
}

function isAssistantActive(project: ProjectRow): boolean {
  return resolveProjectAiAssistantConfig(project)?.isActive === true;
}

async function getAuthenticatedUserId(req: IncomingMessage): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || Array.isArray(authHeader)) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user.id;
}

async function resolveTenantId(project: ProjectRow): Promise<string> {
  if (project.tenant_id) return project.tenant_id;
  if (!project.user_id) {
    throw Object.assign(new Error('Project is missing tenant ownership.'), { status: 500 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('tenants')
    .select('id')
    .eq('owner_user_id', project.user_id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw Object.assign(new Error('Project tenant could not be resolved.'), { status: 500 });
  }

  return data.id;
}

async function loadProject(
  parsed: ParsedProjectParam,
  req: IncomingMessage,
  requirePublic = true,
  options: { requireAssistant?: boolean } = {},
): Promise<ProjectRow> {
  const { data, error } = await getSupabaseAdmin()
    .from('projects')
    .select('id, tenant_id, user_id, name, status, published_at, data, theme, brand_identity, component_order, section_visibility, pages, menus, ai_assistant_config')
    .eq('id', parsed.projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw Object.assign(new Error('Project not found.'), { status: 404 });

  const project = data as ProjectRow;
  if (parsed.ownerId && project.user_id && parsed.ownerId !== project.user_id) {
    throw Object.assign(new Error('Project not found.'), { status: 404 });
  }

  if (requirePublic) {
    const authUserId = await getAuthenticatedUserId(req);
    const canAccessDraft = authUserId && project.user_id === authUserId;
    if (!canAccessDraft && !isPublished(project)) {
      throw Object.assign(new Error('Widget is not available for this project.'), { status: 404 });
    }
    if (!canAccessDraft && options.requireAssistant && !isAssistantActive(project)) {
      throw Object.assign(new Error('Widget is not available for this project.'), { status: 404 });
    }
  }

  return project;
}

function sanitizeAssistantConfig(config: Record<string, any> | null | undefined): Record<string, any> {
  const source = config || {};
  const {
    socialChannels: _socialChannels,
    facebook: _facebook,
    whatsapp: _whatsapp,
    instagram: _instagram,
    ...safe
  } = source;

  return {
    agentName: safe.agentName || 'AI Assistant',
    tone: safe.tone || 'Professional',
    languages: safe.languages || 'Spanish, English',
    businessProfile: safe.businessProfile || '',
    productsServices: safe.productsServices || '',
    policiesContact: safe.policiesContact || '',
    specialInstructions: safe.specialInstructions || '',
    faqs: Array.isArray(safe.faqs) ? safe.faqs : [],
    knowledgeDocuments: Array.isArray(safe.knowledgeDocuments) ? safe.knowledgeDocuments : [],
    knowledgeLinks: Array.isArray(safe.knowledgeLinks) ? safe.knowledgeLinks : [],
    widgetColor: safe.widgetColor || '#111827',
    isActive: safe.isActive === true,
    leadCaptureEnabled: safe.leadCaptureEnabled !== false,
    leadCaptureConfig: safe.leadCaptureConfig,
    appearance: safe.appearance,
    enableLiveVoice: safe.enableLiveVoice === true,
    voiceName: safe.voiceName || 'Puck',
    cmsArticleIds: Array.isArray(safe.cmsArticleIds) ? safe.cmsArticleIds : [],
  };
}

function publicProject(project: ProjectRow): Record<string, any> {
  return {
    id: project.id,
    name: project.name,
    userId: project.user_id || undefined,
    status: project.status || undefined,
    data: project.data || {},
    theme: project.theme || {},
    brandIdentity: project.brand_identity || {},
    componentOrder: project.component_order || [],
    sectionVisibility: project.section_visibility || {},
    pages: project.pages || [],
    menus: project.menus || [],
    aiAssistantConfig: sanitizeAssistantConfig(resolveProjectAiAssistantConfig(project)),
  };
}

async function handleGetWidget(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req, true, { requireAssistant: true });
  const config = sanitizeAssistantConfig(resolveProjectAiAssistantConfig(project));
  send(res, 200, { config, project: publicProject(project) });
}

async function handleListAppointments(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const now = new Date();
  const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const appointments = await getAppointmentsByProject(getSupabaseAdmin(), project.id, {
    startDate: now,
    endDate: rangeEnd,
    limit: 100,
  });

  send(res, 200, {
    appointments: appointments.map((item) => ({
      id: item.id,
      title: 'Reservado',
      startDate: new Date(item.startDate.seconds * 1000).toISOString(),
      endDate: new Date(item.endDate.seconds * 1000).toISOString(),
      status: item.status || 'scheduled',
    })),
  });
}

async function handleListAvailability(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const url = new URL(req.url || '/', 'http://localhost');
  const actionBody = {
    date: url.searchParams.get('date') || undefined,
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    days: url.searchParams.get('days') || undefined,
    durationMinutes: url.searchParams.get('durationMinutes') || url.searchParams.get('duration') || undefined,
    intervalMinutes: url.searchParams.get('intervalMinutes') || undefined,
    minimumNoticeMinutes: url.searchParams.get('minimumNoticeMinutes') || undefined,
    maxSlots: url.searchParams.get('maxSlots') || undefined,
    sourceSurface: url.searchParams.get('sourceSurface') || url.searchParams.get('surface') || undefined,
    sourceModule: url.searchParams.get('sourceModule') || undefined,
    route: url.searchParams.get('route') || undefined,
    correlationId: url.searchParams.get('correlationId') || undefined,
    idempotencyKey: url.searchParams.get('idempotencyKey') || undefined,
  };
  const appointmentsBlueprint = getProjectAppointmentsBlueprint(project);
  const availability = appointmentsBlueprint?.availability || {};
  const bookingRules = appointmentsBlueprint?.bookingRules || {};

  const queryDate = parseDateParam(url.searchParams.get('date'));
  const startDate = parseDateParam(url.searchParams.get('startDate')) || queryDate || new Date();
  const days = Math.min(Math.max(normalizeNumber(url.searchParams.get('days')) || (queryDate ? 1 : 14), 1), 60);
  const endDate = parseDateParam(url.searchParams.get('endDate')) || addDays(startDate, days);
  const durationMinutes = normalizeNumber(url.searchParams.get('durationMinutes'))
    || normalizeNumber(url.searchParams.get('duration'))
    || normalizeNumber(appointmentsBlueprint?.services?.[0]?.durationMinutes)
    || 60;
  const intervalMinutes = normalizeNumber(url.searchParams.get('intervalMinutes'))
    || normalizeNumber(availability.intervalMinutes)
    || 30;
  const minimumNoticeMinutes = normalizeNumber(url.searchParams.get('minimumNoticeMinutes'))
    || normalizeNumber(availability.minimumNoticeMinutes)
    || 120;
  const maxSlots = normalizeNumber(url.searchParams.get('maxSlots')) || 48;
  const availabilityAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, actionBody, {
    actionType: 'check_availability',
    idempotencyKey: normalizeString(actionBody.idempotencyKey, 240),
    idempotencyParts: [
      startDate.toISOString(),
      endDate.toISOString(),
      durationMinutes,
      intervalMinutes,
      minimumNoticeMinutes,
      maxSlots,
    ],
    metadata: {
      availabilityWindow: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationMinutes,
        intervalMinutes,
        minimumNoticeMinutes,
        maxSlots,
      },
      bookingServiceId: normalizeString(url.searchParams.get('bookingServiceId'), 120),
    },
  });

  const slots = await runAuditedWidgetAction(availabilityAction, () => getAvailableAppointmentSlots(getSupabaseAdmin(), project.id, {
    startDate,
    endDate,
    durationMinutes,
    intervalMinutes,
    minimumNoticeMinutes,
    weeklyHours: normalizeWeeklyHours(availability.weeklyHours),
    maxSlots,
  }), {
    actionStage: 'appointment_availability_lookup',
  });
  await recordWidgetChatbotEngineEvent(eventWithResult(availabilityAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    slotCount: slots.length,
    durationMinutes,
    intervalMinutes,
    minimumNoticeMinutes,
    maxSlots,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    confirmationMode: bookingRules.confirmationMode || 'manual',
  }));

  send(res, 200, {
    projectId: project.id,
    sourceOfTruth: 'project_appointments',
    blockedTimeSource: 'project_appointment_blocks',
    durationMinutes,
    intervalMinutes,
    minimumNoticeMinutes,
    timezone: availability.timezone || 'UTC',
    confirmationMode: bookingRules.confirmationMode || 'manual',
    slots,
    services: Array.isArray(appointmentsBlueprint?.services)
      ? appointmentsBlueprint.services.map((service: Record<string, any>) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        paymentMode: service.paymentMode || 'none',
        depositAmount: service.depositAmount,
        prepaidAmount: service.prepaidAmount,
        paymentAmount: service.paymentAmount,
        currency: service.currency,
        ecommerceProductId: service.ecommerceProductId || service.depositProductId,
      }))
      : [],
  });
}

async function handleCreateLead(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const message = normalizeString(body.message, 5000);
  const notes = normalizeString(body.notes, 5000);
  const leadName = normalizeString(body.name, 200);
  const leadEmail = normalizeString(body.email, 320);
  const leadPhone = normalizeString(body.phone, 80);

  if (!leadEmail && !leadPhone && !leadName) {
    throw Object.assign(new Error('Lead requires at least a name, email, or phone.'), { status: 400 });
  }

  const leadAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'create_lead',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.publicSubmissionId, 120),
      leadEmail,
      leadPhone,
      leadName,
      message,
    ],
    metadata: {
      leadSource: normalizeString(body.source, 120) || 'chatbot-widget',
      sourceComponent: normalizeString(body.sourceComponent, 120),
    },
  });
  const customData = {
    message,
    conversationTranscript: normalizeString(body.conversationTranscript, 20000),
    leadScore: normalizeNumber(body.leadScore),
    aiAnalysis: normalizeString(body.aiAnalysis, 5000),
    recommendedAction: normalizeString(body.recommendedAction, 2000),
    aiScore: normalizeNumber(body.aiScore),
    sourceComponent: normalizeString(body.sourceComponent, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    chatbotEngineContext: getWidgetSurfaceContext(body),
    publicSubmissionId: normalizeString(body.publicSubmissionId, 120),
    correlationId: normalizeString(body.correlationId, 120),
    widgetSource: 'public-widget-api',
    chatbotEngine: {
      actionType: leadAction.actionType,
      actionStatus: leadAction.actionStatus,
      compatibilityMode: leadAction.compatibilityMode,
      idempotencyKey: leadAction.idempotencyKey,
      reason: leadAction.reason,
    },
  };

  const payload = {
    tenant_id: tenantId,
    project_id: project.id,
    name: leadName || null,
    email: leadEmail || null,
    phone: leadPhone || null,
    company: normalizeString(body.company, 200) || null,
    status: normalizeString(body.status, 80) || 'new',
    source: normalizeString(body.source, 120) || 'chatbot-widget',
    value: normalizeNumber(body.value) || 0,
    tags: Array.from(new Set(['chatbot-widget', ...normalizeStringArray(body.tags)])),
    notes: notes || message || null,
    custom_data: customData,
  };

  const data = await runAuditedWidgetAction(leadAction, async () => {
    const { data: createdLead, error } = await getSupabaseAdmin()
      .from('leads')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return createdLead;
  }, {
    actionStage: 'crm_lead_insert',
    leadSource: payload.source,
  });
  await recordWidgetChatbotEngineEvent(eventWithResult(leadAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: String(data.id),
  }, 'executed', {
    leadId: data.id,
  }));
  send(res, 201, { leadId: data.id });
}

async function handleCreateAppointment(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const startDate = new Date(String(body.startDate || ''));
  const endDate = new Date(String(body.endDate || ''));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    throw Object.assign(new Error('A valid startDate and endDate are required.'), { status: 400 });
  }

  if (startDate < new Date(Date.now() - 5 * 60 * 1000)) {
    throw Object.assign(new Error('Appointments must be scheduled for a future time.'), { status: 400 });
  }

  const source = normalizeString(body.source, 80) === 'chatbot' ? 'chatbot' : 'public_booking';
  const bookingChannel = normalizeString(body.bookingChannel, 120);
  const participantEmail = normalizeString(body.participantEmail, 320);
  const participantName = normalizeString(body.participantName, 200);
  const providedSourceModule = normalizeString(body.sourceModule, 120)
    || normalizeString(normalizeMetadata(body.metadata).sourceModule, 120)
    || normalizeString(getWidgetContextRecord(body).sourceModule, 120);
  const appointmentSourceModule = providedSourceModule
    || (source === 'chatbot' ? getWidgetSourceModule(body) : 'website-builder');
  const appointmentSourceSurface = getWidgetSourceSurface(body);
  const appointmentMetadata = normalizeMetadata(body.metadata);
  const appointmentNotes = normalizeString(body.notes, 6000)
    || normalizeString(body.customerRequestSummary, 6000)
    || normalizeString(appointmentMetadata.customerRequestSummary, 6000)
    || normalizeString(body.description, 5000);
  const appointmentIdempotencyKey = normalizeString(body.idempotencyKey, 240)
    || `${source}:${project.id}:${participantEmail || participantName || 'guest'}:${startDate.toISOString()}`;
  const appointmentAction = source === 'chatbot'
    ? await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
      actionType: 'create_appointment',
      idempotencyKey: appointmentIdempotencyKey,
      idempotencyParts: [
        participantEmail,
        participantName,
        normalizeString(body.participantPhone, 80),
        startDate.toISOString(),
        endDate.toISOString(),
        normalizeString(body.bookingServiceId, 120),
      ],
      metadata: {
        bookingChannel,
        sourceComponent: normalizeString(body.sourceComponent, 120) || 'ChatCore',
      },
    })
    : null;
  const createAppointment = source === 'chatbot' ? createAppointmentFromChat : createAppointmentFromPublicBooking;
  const appointmentPayload: CanonicalAppointmentInput = {
    tenantId,
    projectId: project.id,
    title: normalizeString(body.title, 250) || (source === 'chatbot' ? 'Cita desde Chatbot' : 'Reserva desde sitio web'),
    description: normalizeString(body.description, 5000) || '',
    notes: appointmentNotes,
    type: normalizeString(body.type, 80) || 'consultation',
    status: 'scheduled',
    priority: 'medium',
    startDate,
    endDate,
    timezone: normalizeString(body.timezone, 120) || 'UTC',
    organizerId: project.user_id,
    organizerName: project.name,
    participantName,
    participantEmail,
    participantPhone: normalizeString(body.participantPhone, 80),
    linkedLeadId: normalizeString(body.linkedLeadId, 80),
    conversationTranscript: normalizeString(body.conversationTranscript, 20000),
    sourceComponent: normalizeString(body.sourceComponent, 120) || (source === 'chatbot' ? 'ChatCore' : 'PublicBooking'),
    sourceModule: appointmentSourceModule,
    sourceConversationId: normalizeString(body.sourceConversationId, 120),
    publicSubmissionId: normalizeString(body.publicSubmissionId, 120),
    idempotencyKey: appointmentIdempotencyKey,
    bookingServiceId: normalizeString(body.bookingServiceId, 120),
    ecommerceProductId: normalizeString(body.ecommerceProductId, 120),
    ecommerceOrderId: normalizeString(body.ecommerceOrderId, 120),
    paymentStatus: normalizeString(body.paymentStatus, 120),
    locale: normalizeString(body.locale, 16),
    createdBy: project.user_id,
    createdBySystem: true,
    generatedByAI: body.generatedByAI === true || Boolean(bookingChannel && bookingChannel !== 'chatcore_form'),
    needsReview: source !== 'chatbot',
    tags: uniqueTags([
      source === 'chatbot' ? 'chatbot' : 'public-booking',
      source === 'chatbot' ? 'chatcore' : 'appointment',
      source === 'chatbot' ? 'appointment-scheduled' : undefined,
      `surface:${appointmentSourceSurface}`,
      `module:${appointmentSourceModule}`,
    ]),
    metadata: {
      ...appointmentMetadata,
      ...getWidgetContextMetadata(body),
      customerRequestSummary: appointmentNotes,
      bookingChannel,
      widgetApi: true,
      clientIp: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
      ...(appointmentAction ? {
        chatbotEngine: {
          actionType: appointmentAction.actionType,
          actionStatus: appointmentAction.actionStatus,
          compatibilityMode: appointmentAction.compatibilityMode,
          idempotencyKey: appointmentAction.idempotencyKey,
          reason: appointmentAction.reason,
        },
      } : {}),
    },
  };
  const result = await (appointmentAction
    ? runAuditedWidgetAction(appointmentAction, () => createAppointment(getSupabaseAdmin(), appointmentPayload), {
    actionStage: 'appointment_create',
    bookingChannel,
  })
    : createAppointment(getSupabaseAdmin(), appointmentPayload));

  if (appointmentAction) {
    await recordWidgetChatbotEngineEvent(eventWithResult(appointmentAction.auditEvent, {
      event_type: 'chatbot_action_executed',
      appointment_id: result.appointmentId,
      lead_id: result.leadId ? String(result.leadId) : undefined,
    }, result.duplicate ? 'duplicate' : 'executed', {
      appointmentId: result.appointmentId,
      leadId: result.leadId || null,
      duplicate: result.duplicate,
      paymentStatus: result.appointment.paymentStatus || null,
    }));
  }

  send(res, result.duplicate ? 200 : 201, {
    appointmentId: result.appointmentId,
    projectId: project.id,
    leadId: result.leadId,
    duplicate: result.duplicate,
    ecommerceOrderId: result.appointment.ecommerceOrderId,
    paymentStatus: result.appointment.paymentStatus,
    paymentRequired: Boolean(result.appointment.ecommerceOrderId && result.appointment.paymentStatus && result.appointment.paymentStatus !== 'paid'),
    warnings: result.warnings,
  });
}

async function handleCreateConversation(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const body = await readJson(req);
  const sessionId = normalizeString(body.sessionId, 120) || `session_${randomUUID()}`;
  const participantInfo = body.participantInfo && typeof body.participantInfo === 'object' ? body.participantInfo : {};
  const widgetContextMetadata = getWidgetContextMetadata(body);
  const sourceSurface = getWidgetSourceSurface(body);
  const sourceModule = getWidgetSourceModule(body);

  const existing = await getSupabaseAdmin()
    .from('social_conversations')
    .select('id, message_count')
    .eq('project_id', project.id)
    .eq('channel', 'web')
    .eq('participant_id', sessionId)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) {
    await recordWidgetChatbotEngineEvent(buildChatbotEngineObservedEvent({
      tenantId: project.tenant_id,
      projectId: project.id,
      actionType: 'save_conversation',
      eventType: 'chatbot_conversation_reused',
      sourceSurface,
      sourceModule,
      conversationId: existing.data.id,
      idempotencyParts: [sessionId],
      correlationId: normalizeString(body.correlationId, 240),
      requestFingerprint: getRequestFingerprint(req, project.id),
      metadata: {
        widgetApi: true,
        sessionId,
        messageCount: Number(existing.data.message_count || 0),
        ...widgetContextMetadata,
      },
    }));
    send(res, 200, {
      conversationId: existing.data.id,
      sessionId,
      messageCount: Number(existing.data.message_count || 0),
    });
    return;
  }

  const now = new Date().toISOString();
  const created = await getSupabaseAdmin()
    .from('social_conversations')
    .insert({
      project_id: project.id,
      channel: 'web',
      participant_id: sessionId,
      participant_name: normalizeString(participantInfo.name, 200) || 'Visitante Web',
      participant_email: normalizeString(participantInfo.email, 320) || null,
      participant_phone: normalizeString(participantInfo.phone, 80) || null,
      status: 'active',
      started_at: now,
      last_message_at: now,
      message_count: 0,
      unread_count: 0,
      tags: uniqueTags(['web-chat', `surface:${sourceSurface}`, `module:${sourceModule}`]),
      metadata: {
        widgetApi: true,
        sessionId,
        ...widgetContextMetadata,
      },
    })
    .select('id')
    .single();

  if (created.error) throw created.error;
  await recordWidgetChatbotEngineEvent(buildChatbotEngineObservedEvent({
    tenantId: project.tenant_id,
    projectId: project.id,
    actionType: 'save_conversation',
    eventType: 'chatbot_conversation_created',
    sourceSurface,
    sourceModule,
    conversationId: created.data.id,
    idempotencyParts: [sessionId],
    correlationId: normalizeString(body.correlationId, 240),
    requestFingerprint: getRequestFingerprint(req, project.id),
    metadata: {
      widgetApi: true,
      sessionId,
      participantCaptured: Boolean(participantInfo.name || participantInfo.email || participantInfo.phone),
      ...widgetContextMetadata,
    },
  }));
  send(res, 201, { conversationId: created.data.id, sessionId, messageCount: 0 });
}

async function loadConversation(projectId: string, conversationId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('social_conversations')
    .select('id, participant_id, message_count, unread_count, metadata, tags')
    .eq('id', conversationId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw Object.assign(new Error('Conversation not found.'), { status: 404 });
  return data as {
    id: string;
    participant_id: string;
    message_count: number | null;
    unread_count: number | null;
    metadata?: Record<string, unknown> | null;
    tags?: string[] | null;
  };
}

async function handleCreateMessage(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam, conversationId: string): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const body = await readJson(req);
  const conversation = await loadConversation(project.id, conversationId);
  const widgetContextMetadata = getWidgetContextMetadata(body);
  const sourceSurface = getWidgetSourceSurface(body);
  const sourceModule = getWidgetSourceModule(body);

  const role = body.role === 'model' ? 'model' : 'user';
  const text = normalizeString(body.text, 12000);
  if (!text) throw Object.assign(new Error('Message text is required.'), { status: 400 });

  const now = new Date().toISOString();
  const isUser = role === 'user';
  const intentAnalysis = isUser
    ? classifyChatbotMessageIntent({
      text,
      sourceSurface,
      sourceModule,
      context: widgetContextMetadata.chatbotEngineContext as any,
    })
    : null;
  const messageMetadata = {
    widgetApi: true,
    role,
    direction: isUser ? 'inbound' : 'outbound',
    isVoiceMessage: body.isVoiceMessage === true,
    ...(intentAnalysis ? { intent: intentAnalysis } : {}),
    ...widgetContextMetadata,
  };
  const message = await getSupabaseAdmin()
    .from('social_messages')
    .insert({
      conversation_id: conversation.id,
      project_id: project.id,
      channel: 'web',
      direction: isUser ? 'inbound' : 'outbound',
      sender_id: isUser ? conversation.participant_id : 'ai-assistant',
      sender_name: isUser ? 'Visitante' : 'Asistente AI',
      recipient_id: isUser ? 'ai-assistant' : conversation.participant_id,
      message: text,
      message_type: body.isVoiceMessage ? 'audio' : 'text',
      timestamp: now,
      status: 'delivered',
      processed_by_ai: !isUser,
      metadata: messageMetadata,
    })
    .select('id')
    .single();

  if (message.error) throw message.error;

  const nextMessageCount = Number(conversation.message_count || 0) + 1;
  const nextUnreadCount = isUser ? Number(conversation.unread_count || 0) + 1 : Number(conversation.unread_count || 0);
  const previousMetadata = conversation.metadata && typeof conversation.metadata === 'object' ? conversation.metadata : {};
  const previousIntentHistory = Array.isArray(previousMetadata.intentHistory) ? previousMetadata.intentHistory : [];
  const conversationIntentPatch = intentAnalysis ? {
    metadata: {
      ...previousMetadata,
      ...widgetContextMetadata,
      lastIntent: intentAnalysis.primaryIntent,
      lastIntentActionType: intentAnalysis.actionType || null,
      lastIntentConfidence: intentAnalysis.confidence,
      lastIntentUrgency: intentAnalysis.urgency,
      lastIntentAt: now,
      intentHistory: [
        {
          intent: intentAnalysis.primaryIntent,
          actionType: intentAnalysis.actionType || null,
          confidence: intentAnalysis.confidence,
          urgency: intentAnalysis.urgency,
          at: now,
        },
        ...previousIntentHistory.filter(item => item && typeof item === 'object'),
      ].slice(0, 10),
    },
    tags: uniqueTags([
      ...(Array.isArray(conversation.tags) ? conversation.tags : []),
      `intent:${intentAnalysis.primaryIntent}`,
      intentAnalysis.urgency === 'high' ? 'high-intent' : null,
      intentAnalysis.actionType ? `action:${intentAnalysis.actionType}` : null,
    ]),
  } : {};
  const updated = await getSupabaseAdmin()
    .from('social_conversations')
    .update({
      last_message_at: now,
      message_count: nextMessageCount,
      unread_count: nextUnreadCount,
      ...conversationIntentPatch,
    })
    .eq('id', conversation.id);

  if (updated.error) throw updated.error;
  await recordWidgetChatbotEngineEvent(buildChatbotEngineObservedEvent({
    tenantId: project.tenant_id,
    projectId: project.id,
    actionType: 'save_message',
    eventType: 'chatbot_message_saved',
    sourceSurface,
    sourceModule,
    conversationId: conversation.id,
    messageId: message.data.id,
    idempotencyParts: [conversation.id, role, nextMessageCount],
    correlationId: normalizeString(body.correlationId, 240),
    requestFingerprint: getRequestFingerprint(req, project.id),
    metadata: {
      widgetApi: true,
      role,
      direction: isUser ? 'inbound' : 'outbound',
      messageLength: text.length,
      isVoiceMessage: body.isVoiceMessage === true,
      ...(intentAnalysis ? { intent: intentAnalysis } : {}),
      ...widgetContextMetadata,
    },
  }));
  if (intentAnalysis) {
    await recordWidgetChatbotEngineEvent(buildChatbotEngineObservedEvent({
      tenantId: project.tenant_id,
      projectId: project.id,
      actionType: 'analyze_intent',
      eventType: 'chatbot_intent_analyzed',
      sourceSurface,
      sourceModule,
      conversationId: conversation.id,
      messageId: message.data.id,
      idempotencyParts: [conversation.id, message.data.id, intentAnalysis.primaryIntent],
      correlationId: normalizeString(body.correlationId, 240),
      requestFingerprint: getRequestFingerprint(req, project.id),
      metadata: {
        widgetApi: true,
        intent: intentAnalysis,
        ...widgetContextMetadata,
      },
    }));
  }
  send(res, 201, { messageId: message.data.id, messageCount: nextMessageCount });
}

async function handleUpdateConversation(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam, conversationId: string): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const conversation = await loadConversation(project.id, conversationId);
  const body = await readJson(req);
  const participantInfo = body.participantInfo && typeof body.participantInfo === 'object' ? body.participantInfo : {};
  const widgetContextMetadata = getWidgetContextMetadata(body);
  const sourceSurface = getWidgetSourceSurface(body);
  const sourceModule = getWidgetSourceModule(body);
  const updates: Record<string, any> = {};

  const name = normalizeString(participantInfo.name, 200);
  const email = normalizeString(participantInfo.email, 320);
  const phone = normalizeString(participantInfo.phone, 80);
  const leadId = normalizeString(body.leadId, 80);
  const status = normalizeString(body.status, 40);

  if (name) updates.participant_name = name;
  if (email) updates.participant_email = email;
  if (phone) updates.participant_phone = phone;
  if (leadId) updates.lead_id = leadId;
  if (status && ['active', 'closed', 'pending', 'escalated'].includes(status)) updates.status = status;
  updates.metadata = {
    ...(conversation.metadata && typeof conversation.metadata === 'object' ? conversation.metadata : {}),
    ...widgetContextMetadata,
    lastWidgetUpdateAt: new Date().toISOString(),
  };
  updates.tags = uniqueTags([
    ...(Array.isArray(conversation.tags) ? conversation.tags : []),
    `surface:${sourceSurface}`,
    `module:${sourceModule}`,
  ]);

  if (Object.keys(updates).length === 0) {
    send(res, 200, { ok: true });
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from('social_conversations')
    .update(updates)
    .eq('id', conversationId)
    .eq('project_id', project.id);

  if (error) throw error;
  if (leadId) {
    await recordWidgetChatbotEngineEvent(buildChatbotEngineObservedEvent({
      tenantId: project.tenant_id,
      projectId: project.id,
      actionType: 'link_conversation_to_lead',
      eventType: 'chatbot_conversation_linked_to_lead',
      sourceSurface,
      sourceModule,
      conversationId,
      leadId,
      idempotencyParts: [conversationId, leadId],
      correlationId: normalizeString(body.correlationId, 240),
      requestFingerprint: getRequestFingerprint(req, project.id),
      metadata: {
        widgetApi: true,
        status: updates.status || null,
        participantUpdated: Boolean(name || email || phone),
        ...widgetContextMetadata,
      },
    }));
  }
  send(res, 200, { ok: true });
}

async function handleRequestHumanHandoff(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam, conversationId: string): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const handoffAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'handoff_to_human',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      conversationId,
      normalizeString(body.reason, 120),
      normalizeString(body.priority, 40),
    ],
    metadata: {
      conversationId,
      handoffReason: normalizeString(body.reason, 120) || 'human_requested',
    },
  });

  const result = await runAuditedWidgetAction(handoffAction, () => requestChatbotHumanHandoff({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    conversationId,
    reason: normalizeString(body.reason, 120),
    priority: normalizeString(body.priority, 40),
    summary: normalizeString(body.summary, 5000) || normalizeString(body.message, 5000),
    requesterName: normalizeString(body.requesterName, 200),
    requesterEmail: normalizeString(body.requesterEmail, 320),
    requesterPhone: normalizeString(body.requesterPhone, 80),
    assignedTo: normalizeString(body.assignedTo, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: handoffAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'human_handoff_request',
    conversationId,
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(handoffAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    conversation_id: result.conversationId,
    lead_id: result.leadId ? String(result.leadId) : undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    handoffReason: normalizeString(body.reason, 120) || 'human_requested',
    duplicate: result.duplicate,
  }));

  send(res, result.duplicate ? 200 : 201, {
    conversationId: result.conversationId,
    status: result.status,
    duplicate: result.duplicate,
    leadId: result.leadId,
  });
}

async function handleRequestRestaurantReservation(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const reservationAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'request_restaurant_reservation',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.restaurantId, 120),
      normalizeString(body.customerEmail, 320) || normalizeString(body.email, 320),
      normalizeString(body.date, 20),
      normalizeString(body.time, 20),
      normalizeNumber(body.partySize),
    ],
    metadata: {
      restaurantId: normalizeString(body.restaurantId, 120),
      partySize: normalizeNumber(body.partySize),
    },
  });

  const result = await runAuditedWidgetAction(reservationAction, () => requestChatbotRestaurantReservation({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    restaurantId: normalizeString(body.restaurantId, 120) || '',
    customerName: normalizeString(body.customerName, 200) || normalizeString(body.name, 200) || '',
    customerEmail: normalizeString(body.customerEmail, 320) || normalizeString(body.email, 320) || '',
    customerPhone: normalizeString(body.customerPhone, 80) || normalizeString(body.phone, 80),
    date: normalizeString(body.date, 20) || '',
    time: normalizeString(body.time, 20) || '',
    partySize: normalizeNumber(body.partySize) || 0,
    tablePreference: normalizeString(body.tablePreference, 200),
    notes: normalizeString(body.notes, 5000) || normalizeString(body.message, 5000),
    conversationId: normalizeString(body.conversationId, 120) || normalizeString(body.sourceConversationId, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: reservationAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'restaurant_reservation_request',
    restaurantId: normalizeString(body.restaurantId, 120),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(reservationAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: result.leadId ? String(result.leadId) : undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    restaurantReservationId: result.reservationId || null,
    reservationStatus: result.status,
    duplicate: result.duplicate,
  }));

  send(res, result.duplicate ? 200 : 201, {
    reservationId: result.reservationId,
    status: result.status,
    leadId: result.leadId,
    duplicate: result.duplicate,
  });
}

async function handleRequestRealtyLead(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: ParsedProjectParam,
  actionType: 'request_realty_showing' | 'register_open_house',
): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const realtyAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType,
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.propertyId, 120),
      normalizeString(body.openHouseId, 120),
      normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
      normalizeString(body.preferredDate, 120),
    ],
    metadata: {
      propertyId: normalizeString(body.propertyId, 120),
      openHouseId: normalizeString(body.openHouseId, 120),
      realtyAction: actionType,
    },
  });

  const result = await runAuditedWidgetAction(realtyAction, () => requestChatbotRealtyLead({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    actionType,
    propertyId: normalizeString(body.propertyId, 120) || '',
    openHouseId: normalizeString(body.openHouseId, 120),
    name: normalizeString(body.name, 200) || normalizeString(body.customerName, 200) || '',
    email: normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320) || '',
    phone: normalizeString(body.phone, 80) || normalizeString(body.customerPhone, 80),
    message: normalizeString(body.message, 5000) || normalizeString(body.notes, 5000),
    preferredDate: normalizeString(body.preferredDate, 120),
    budget: normalizeNumber(body.budget),
    conversationId: normalizeString(body.conversationId, 120) || normalizeString(body.sourceConversationId, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: realtyAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'realty_lead_request',
    propertyId: normalizeString(body.propertyId, 120),
    realtyAction: actionType,
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(realtyAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: result.crmLeadId ? String(result.crmLeadId) : undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    propertyLeadId: result.propertyLeadId || null,
    crmLeadId: result.crmLeadId || null,
    pipelineEventType: result.pipelineEventType,
    duplicate: result.duplicate,
  }));

  send(res, result.duplicate ? 200 : 201, {
    propertyLeadId: result.propertyLeadId,
    crmLeadId: result.crmLeadId,
    pipelineEventType: result.pipelineEventType,
    duplicate: result.duplicate,
  });
}

async function handleSubscribeEmailAudience(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const emailAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'subscribe_email_audience',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.audienceId, 120),
      normalizeString(body.email, 320),
    ],
    metadata: {
      audienceId: normalizeString(body.audienceId, 120),
      marketingConsent: hasWidgetMarketingConsent(body),
    },
  });

  const result = await runAuditedWidgetAction(emailAction, () => subscribeChatbotEmailAudience({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    audienceId: normalizeString(body.audienceId, 120) || '',
    email: normalizeString(body.email, 320) || '',
    name: normalizeString(body.name, 200),
    leadId: normalizeString(body.leadId, 120),
    customerId: normalizeString(body.customerId, 120),
    marketingConsent: hasWidgetMarketingConsent(body),
    consentSource: normalizeString(body.consentSource, 120) || normalizeString(body.sourceComponent, 120) || 'chatbot-widget',
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: emailAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'email_audience_subscribe',
    audienceId: normalizeString(body.audienceId, 120),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(emailAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: normalizeString(body.leadId, 120),
  }, 'executed', {
    audienceId: result.audienceId,
    email: result.email,
    staticMemberCount: result.staticMemberCount,
  }));

  send(res, 201, result);
}

async function handleQueueEmailFollowUpDraft(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);
  const recipientEmail = normalizeString(body.email, 320) || normalizeString(body.recipientEmail, 320);
  const conversationId = normalizeString(body.sourceConversationId, 120) || normalizeString(body.conversationId, 120);
  const leadId = normalizeString(body.leadId, 120);

  const emailAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'queue_email_follow_up',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.sourceEvent, 120) || 'chatbot_email_follow_up_queued',
      leadId || conversationId,
      recipientEmail,
    ],
    metadata: {
      recipientEmail,
      leadId: leadId || null,
      conversationId: conversationId || null,
      marketingConsent: hasWidgetMarketingConsent(body),
    },
  });

  const result = await runAuditedWidgetAction(emailAction, () => queueChatbotEmailFollowUpDraft({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    email: recipientEmail,
    name: normalizeString(body.name, 200) || normalizeString(body.recipientName, 200),
    leadId,
    customerId: normalizeString(body.customerId, 120),
    conversationId,
    subject: normalizeString(body.subject, 240),
    html: normalizeString(body.html, 12000) || normalizeString(body.bodyHtml, 12000),
    text: normalizeString(body.text, 12000) || normalizeString(body.bodyText, 12000),
    marketingConsent: hasWidgetMarketingConsent(body),
    consentSource: normalizeString(body.consentSource, 120) || normalizeString(body.sourceComponent, 120) || 'chatbot-widget',
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    sourceEvent: normalizeString(body.sourceEvent, 120),
    idempotencyKey: emailAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'email_follow_up_draft_queue',
    conversationId: conversationId || null,
    leadId: leadId || null,
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(emailAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    conversation_id: conversationId || undefined,
    lead_id: leadId || undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    emailLogId: result.emailLogId,
    email: result.email,
    reviewRequired: result.reviewRequired,
    reviewQueueUrl: result.reviewQueueUrl,
  }));

  send(res, result.duplicate ? 200 : 201, result);
}

async function handleCreateFinanceQuoteRequest(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);
  const customerEmail = normalizeString(body.customerEmail, 320) || normalizeString(body.email, 320);
  const customerName = normalizeString(body.customerName, 200) || normalizeString(body.name, 200);
  const conversationId = normalizeString(body.sourceConversationId, 120) || normalizeString(body.conversationId, 120);
  const leadId = normalizeString(body.leadId, 120);
  const sourceEvent = normalizeString(body.sourceEvent, 120) || 'chatbot_finance_quote_request_created';

  const financeAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'create_finance_quote_request',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      sourceEvent,
      leadId || conversationId,
      customerEmail,
      normalizeString(body.description, 500) || normalizeString(body.message, 500),
      normalizeNumber(body.amount),
    ],
    metadata: {
      customerEmail,
      leadId: leadId || null,
      conversationId: conversationId || null,
      paymentCreated: false,
      paymentLinkCreated: false,
    },
  });

  const result = await runAuditedWidgetAction(financeAction, () => createChatbotFinanceQuoteRequest({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    customerName,
    customerEmail,
    customerAddress: normalizeString(body.customerAddress, 500) || normalizeString(body.address, 500),
    description: normalizeString(body.description, 1000) || normalizeString(body.message, 1000),
    amount: normalizeNumber(body.amount),
    currency: normalizeString(body.currency, 12),
    items: Array.isArray(body.items) ? body.items : [],
    dueDate: normalizeString(body.dueDate, 20),
    paymentTerms: normalizeString(body.paymentTerms, 200),
    leadId,
    conversationId,
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    sourceEvent,
    idempotencyKey: financeAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'finance_quote_request_create',
    conversationId: conversationId || null,
    leadId: leadId || null,
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(financeAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    conversation_id: conversationId || undefined,
    lead_id: leadId || undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    invoiceId: result.invoiceId,
    invoiceNumber: result.invoiceNumber,
    reviewRequired: result.reviewRequired,
    paymentCreated: false,
    paymentLinkCreated: false,
  }));

  send(res, result.duplicate ? 200 : 201, result);
}

async function handleSearchProducts(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const body = req.method === 'POST' ? await readJson(req) : {};

  const searchAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'search_products',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.query, 240),
      normalizeString(body.categoryId, 120),
      normalizeString(body.categorySlug, 120),
      normalizeNumber(body.limit),
    ],
    metadata: {
      query: normalizeString(body.query, 240),
      categoryId: normalizeString(body.categoryId, 120),
      tags: normalizeStringArray(body.tags, 12, 80),
    },
  });

  const result = await runAuditedWidgetAction(searchAction, () => searchChatbotEcommerceProducts({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    query: normalizeString(body.query, 240),
    categoryId: normalizeString(body.categoryId, 120),
    categorySlug: normalizeString(body.categorySlug, 120),
    tags: normalizeStringArray(body.tags, 12, 80),
    inStockOnly: body.inStockOnly !== false,
    featuredOnly: body.featuredOnly === true,
    limit: normalizeNumber(body.limit),
  }), {
    actionStage: 'ecommerce_product_search',
    query: normalizeString(body.query, 240),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(searchAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    productIds: result.products.map(product => product.id),
    totalMatched: result.totalMatched,
  }));

  send(res, 200, result);
}

async function handleRecommendProducts(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const recommendationAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'recommend_products',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.activeProductId, 120),
      normalizeString(body.activeProductSlug, 240),
      normalizeString(body.query, 240),
    ],
    metadata: {
      activeProductId: normalizeString(body.activeProductId, 120),
      activeProductSlug: normalizeString(body.activeProductSlug, 240),
      query: normalizeString(body.query, 240),
    },
  });

  const result = await runAuditedWidgetAction(recommendationAction, () => recommendChatbotEcommerceProducts({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    activeProductId: normalizeString(body.activeProductId, 120),
    activeProductSlug: normalizeString(body.activeProductSlug, 240),
    query: normalizeString(body.query, 240),
    categoryId: normalizeString(body.categoryId, 120),
    categorySlug: normalizeString(body.categorySlug, 120),
    tags: normalizeStringArray(body.tags, 12, 80),
    inStockOnly: body.inStockOnly !== false,
    limit: normalizeNumber(body.limit),
  }), {
    actionStage: 'ecommerce_product_recommendations',
    activeProductId: normalizeString(body.activeProductId, 120),
    activeProductSlug: normalizeString(body.activeProductSlug, 240),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(recommendationAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    activeProductId: result.activeProductId,
    productIds: result.products.map(product => product.id),
  }));

  send(res, 200, result);
}

async function handleExplainShippingPolicy(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const body = req.method === 'POST' ? await readJson(req) : {};

  const shippingAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'explain_shipping',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: ['shipping-policy'],
    metadata: {
      policyType: 'shipping',
    },
  });

  const result = await runAuditedWidgetAction(shippingAction, () => explainChatbotEcommerceShippingPolicy({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'ecommerce_shipping_policy_lookup',
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(shippingAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    policyType: 'shipping',
    configured: result.configured,
    methodCount: result.methods.length,
  }));

  send(res, 200, result);
}

async function handleExplainReturnsPolicy(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const body = req.method === 'POST' ? await readJson(req) : {};

  const returnsAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'explain_returns',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: ['returns-policy'],
    metadata: {
      policyType: 'returns',
    },
  });

  const result = await runAuditedWidgetAction(returnsAction, () => explainChatbotEcommerceReturnsPolicy({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'ecommerce_returns_policy_lookup',
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(returnsAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    policyType: 'returns',
    configured: result.configured,
    hasTermsUrl: Boolean(result.termsUrl),
  }));

  send(res, 200, result);
}

async function handleCreateProductInquiry(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const inquiryAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'create_product_inquiry',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.productId, 120),
      normalizeString(body.productSlug, 240),
      normalizeString(body.email, 320),
      normalizeString(body.phone, 80),
    ],
    metadata: {
      productId: normalizeString(body.productId, 120),
      productSlug: normalizeString(body.productSlug, 240),
    },
  });

  const result = await runAuditedWidgetAction(inquiryAction, () => createChatbotEcommerceProductInquiry({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    productId: normalizeString(body.productId, 120),
    productSlug: normalizeString(body.productSlug, 240),
    name: normalizeString(body.name, 200) || normalizeString(body.customerName, 200),
    email: normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
    phone: normalizeString(body.phone, 80) || normalizeString(body.customerPhone, 80),
    message: normalizeString(body.message, 5000) || normalizeString(body.notes, 5000),
    quantity: normalizeNumber(body.quantity),
    conversationId: normalizeString(body.conversationId, 120) || normalizeString(body.sourceConversationId, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: inquiryAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'ecommerce_product_inquiry_create',
    productId: normalizeString(body.productId, 120),
    productSlug: normalizeString(body.productSlug, 240),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(inquiryAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: result.leadId ? String(result.leadId) : undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    leadId: result.leadId || null,
    productId: result.product.id,
    productSlug: result.product.slug,
    duplicate: result.duplicate,
  }));

  send(res, result.duplicate ? 200 : 201, {
    leadId: result.leadId,
    product: result.product,
    duplicate: result.duplicate,
  });
}

async function handleBackInStockRequest(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const stockAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'back_in_stock_request',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.productId, 120),
      normalizeString(body.productSlug, 240),
      normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
    ],
    metadata: {
      productId: normalizeString(body.productId, 120),
      productSlug: normalizeString(body.productSlug, 240),
    },
  });

  const result = await runAuditedWidgetAction(stockAction, () => createChatbotEcommerceBackInStockRequest({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    productId: normalizeString(body.productId, 120),
    productSlug: normalizeString(body.productSlug, 240),
    email: normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
    name: normalizeString(body.name, 200) || normalizeString(body.customerName, 200),
    conversationId: normalizeString(body.conversationId, 120) || normalizeString(body.sourceConversationId, 120),
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: stockAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'ecommerce_back_in_stock_request',
    productId: normalizeString(body.productId, 120),
    productSlug: normalizeString(body.productSlug, 240),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(stockAction.auditEvent, {
    event_type: 'chatbot_action_executed',
    lead_id: result.leadId ? String(result.leadId) : undefined,
  }, result.duplicate ? 'duplicate' : 'executed', {
    notificationId: result.notificationId,
    leadId: result.leadId,
    productId: result.product.id,
    productSlug: result.product.slug,
    duplicate: result.duplicate,
  }));

  send(res, result.duplicate ? 200 : 201, {
    notificationId: result.notificationId,
    leadId: result.leadId,
    product: result.product,
    duplicate: result.duplicate,
  });
}

async function handleCheckOrderStatus(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const orderAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'check_order_status',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      normalizeString(body.orderId, 120),
      normalizeString(body.orderNumber, 120),
      normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
    ],
    metadata: {
      orderId: normalizeString(body.orderId, 120),
      orderNumber: normalizeString(body.orderNumber, 120),
      verification: body.orderAccessToken ? 'token' : 'email',
    },
  });

  const result = await runAuditedWidgetAction(orderAction, () => checkChatbotEcommerceOrderStatus({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    orderId: normalizeString(body.orderId, 120),
    orderNumber: normalizeString(body.orderNumber, 120),
    email: normalizeString(body.email, 320) || normalizeString(body.customerEmail, 320),
    orderAccessToken: normalizeString(body.orderAccessToken, 500) || normalizeString(body.token, 500),
  }), {
    actionStage: 'ecommerce_order_status_lookup',
    orderId: normalizeString(body.orderId, 120),
    orderNumber: normalizeString(body.orderNumber, 120),
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(orderAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    status: result.status,
    paymentStatus: result.paymentStatus,
    fulfillmentStatus: result.fulfillmentStatus,
  }));

  send(res, 200, result);
}

async function handleStartCheckoutIntent(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const checkoutAction = await assertWidgetChatbotActionAllowed(req, project, tenantId, body, {
    actionType: 'start_checkout',
    idempotencyKey: normalizeString(body.idempotencyKey, 240),
    idempotencyParts: [
      JSON.stringify(Array.isArray(body.items) ? body.items.slice(0, 25) : []),
    ],
    metadata: {
      itemCount: Array.isArray(body.items) ? body.items.length : 0,
      paymentCreated: false,
    },
  });

  const result = await runAuditedWidgetAction(checkoutAction, () => startChatbotEcommerceCheckoutIntent({
    supabase: getSupabaseAdmin(),
    tenantId,
    projectId: project.id,
    projectUserId: project.user_id,
    items: Array.isArray(body.items) ? body.items : [],
    sourceSurface: getWidgetSourceSurface(body),
    sourceModule: getWidgetSourceModule(body),
    idempotencyKey: checkoutAction.idempotencyKey,
    metadata: {
      ...normalizeMetadata(body.metadata),
      ...getWidgetContextMetadata(body),
    },
  }), {
    actionStage: 'ecommerce_checkout_intent_start',
    itemCount: Array.isArray(body.items) ? body.items.length : 0,
  });

  await recordWidgetChatbotEngineEvent(eventWithResult(checkoutAction.auditEvent, {
    event_type: 'chatbot_action_executed',
  }, 'executed', {
    itemCount: result.items.length,
    subtotal: result.subtotal,
    checkoutUrl: result.checkoutUrl,
    paymentCreated: false,
  }));

  send(res, 200, result);
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, JSON_HEADERS);
    res.end();
    return;
  }

  try {
    const [rawProjectId, resource, id, subResource] = getRouteParts(req);
    const parsed = parseProjectParam(rawProjectId);

    if (req.method === 'GET' && !resource) return await handleGetWidget(req, res, parsed);
    if (req.method === 'GET' && resource === 'appointments') return await handleListAppointments(req, res, parsed);
    if (req.method === 'GET' && resource === 'availability') return await handleListAvailability(req, res, parsed);
    if (req.method === 'POST' && resource === 'leads') return await handleCreateLead(req, res, parsed);
    if (req.method === 'POST' && resource === 'appointments') return await handleCreateAppointment(req, res, parsed);
    if (req.method === 'POST' && resource === 'restaurant-reservations') return await handleRequestRestaurantReservation(req, res, parsed);
    if (req.method === 'POST' && resource === 'realty-showings') return await handleRequestRealtyLead(req, res, parsed, 'request_realty_showing');
    if (req.method === 'POST' && resource === 'open-house-registrations') return await handleRequestRealtyLead(req, res, parsed, 'register_open_house');
    if (req.method === 'POST' && resource === 'email-audience-subscriptions') return await handleSubscribeEmailAudience(req, res, parsed);
    if (req.method === 'POST' && resource === 'email-follow-up-drafts') return await handleQueueEmailFollowUpDraft(req, res, parsed);
    if (req.method === 'POST' && resource === 'finance' && id === 'quote-requests') return await handleCreateFinanceQuoteRequest(req, res, parsed);
    if (req.method === 'POST' && resource === 'products' && id === 'search') return await handleSearchProducts(req, res, parsed);
    if (req.method === 'POST' && resource === 'products' && id === 'recommendations') return await handleRecommendProducts(req, res, parsed);
    if (req.method === 'POST' && resource === 'products' && id === 'inquiries') return await handleCreateProductInquiry(req, res, parsed);
    if (req.method === 'POST' && resource === 'products' && id === 'back-in-stock') return await handleBackInStockRequest(req, res, parsed);
    if (req.method === 'POST' && resource === 'policies' && id === 'shipping') return await handleExplainShippingPolicy(req, res, parsed);
    if (req.method === 'POST' && resource === 'policies' && id === 'returns') return await handleExplainReturnsPolicy(req, res, parsed);
    if (req.method === 'POST' && resource === 'orders' && id === 'status') return await handleCheckOrderStatus(req, res, parsed);
    if (req.method === 'POST' && resource === 'checkout' && id === 'intent') return await handleStartCheckoutIntent(req, res, parsed);
    if (req.method === 'POST' && resource === 'conversations' && !id) return await handleCreateConversation(req, res, parsed);
    if (req.method === 'POST' && resource === 'conversations' && id && subResource === 'messages') {
      return await handleCreateMessage(req, res, parsed, id);
    }
    if (req.method === 'POST' && resource === 'conversations' && id && subResource === 'handoff') {
      return await handleRequestHumanHandoff(req, res, parsed, id);
    }
    if (req.method === 'PATCH' && resource === 'conversations' && id && !subResource) {
      return await handleUpdateConversation(req, res, parsed, id);
    }

    fail(res, 404, 'Widget endpoint not found.');
  } catch (error: any) {
    const status = Number(error?.status || error?.statusCode || 500);
    fail(res, status, error?.message || 'Internal server error.', error?.code);
  }
}
