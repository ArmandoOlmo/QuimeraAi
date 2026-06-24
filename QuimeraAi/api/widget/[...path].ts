import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

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
  return project.ai_assistant_config?.isActive === true;
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

async function loadProject(parsed: ParsedProjectParam, req: IncomingMessage, requirePublic = true): Promise<ProjectRow> {
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
    if (!canAccessDraft && (!isPublished(project) || !isAssistantActive(project))) {
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
    aiAssistantConfig: sanitizeAssistantConfig(project.ai_assistant_config),
  };
}

async function handleGetWidget(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const config = sanitizeAssistantConfig(project.ai_assistant_config);
  send(res, 200, { config, project: publicProject(project) });
}

async function handleListAppointments(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  const now = new Date();
  const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data, error } = await getSupabaseAdmin()
    .from('project_appointments')
    .select('id, start_date, end_date, status')
    .eq('project_id', project.id)
    .gte('start_date', now.toISOString())
    .lte('start_date', rangeEnd.toISOString())
    .neq('status', 'cancelled')
    .order('start_date', { ascending: true })
    .limit(100);

  if (error) throw error;

  send(res, 200, {
    appointments: (data || []).map((item: any) => ({
      id: item.id,
      title: 'Reservado',
      startDate: item.start_date,
      endDate: item.end_date,
      status: item.status || 'scheduled',
    })),
  });
}

async function handleCreateLead(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const tenantId = await resolveTenantId(project);
  const body = await readJson(req);

  const message = normalizeString(body.message, 5000);
  const notes = normalizeString(body.notes, 5000);
  const customData = {
    message,
    conversationTranscript: normalizeString(body.conversationTranscript, 20000),
    leadScore: normalizeNumber(body.leadScore),
    aiAnalysis: normalizeString(body.aiAnalysis, 5000),
    recommendedAction: normalizeString(body.recommendedAction, 2000),
    aiScore: normalizeNumber(body.aiScore),
    widgetSource: 'public-widget-api',
  };

  const payload = {
    tenant_id: tenantId,
    project_id: project.id,
    name: normalizeString(body.name, 200) || null,
    email: normalizeString(body.email, 320) || null,
    phone: normalizeString(body.phone, 80) || null,
    company: normalizeString(body.company, 200) || null,
    status: normalizeString(body.status, 80) || 'new',
    source: normalizeString(body.source, 120) || 'chatbot-widget',
    value: normalizeNumber(body.value) || 0,
    tags: Array.from(new Set(['chatbot-widget', ...normalizeStringArray(body.tags)])),
    notes: notes || message || null,
    custom_data: customData,
  };

  if (!payload.email && !payload.phone && !payload.name) {
    throw Object.assign(new Error('Lead requires at least a name, email, or phone.'), { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('leads')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
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

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  const overlap = await getSupabaseAdmin()
    .from('project_appointments')
    .select('id')
    .eq('project_id', project.id)
    .neq('status', 'cancelled')
    .lt('start_date', endIso)
    .gt('end_date', startIso)
    .limit(1)
    .maybeSingle();

  if (overlap.error) throw overlap.error;
  if (overlap.data) {
    throw Object.assign(new Error('The selected appointment time is no longer available.'), { status: 409 });
  }

  const participantName = normalizeString(body.participantName, 200);
  const participantEmail = normalizeString(body.participantEmail, 320);
  const participantPhone = normalizeString(body.participantPhone, 80);
  const participants = participantName || participantEmail || participantPhone
    ? [{
        id: `participant_${Date.now()}`,
        name: participantName || 'Cliente',
        email: participantEmail || '',
        phone: participantPhone || '',
        role: 'attendee',
        status: 'pending',
        isRequired: true,
      }]
    : [];

  const { data, error } = await getSupabaseAdmin()
    .from('project_appointments')
    .insert({
      tenant_id: tenantId,
      project_id: project.id,
      title: normalizeString(body.title, 250) || 'Cita desde Chatbot',
      description: normalizeString(body.description, 5000) || '',
      type: normalizeString(body.type, 80) || 'consultation',
      status: 'scheduled',
      priority: 'medium',
      start_date: startIso,
      end_date: endIso,
      timezone: normalizeString(body.timezone, 120) || 'UTC',
      organizer_id: project.user_id,
      organizer_name: project.name,
      participants,
      location: { type: 'virtual' },
      reminders: [
        { id: `reminder_1_${Date.now()}`, type: 'email', minutes: 60, sent: false },
        { id: `reminder_2_${Date.now()}`, type: 'email', minutes: 1440, sent: false },
      ],
      linked_lead_ids: normalizeString(body.linkedLeadId, 80) ? [String(body.linkedLeadId)] : [],
      tags: ['chatbot', 'auto-scheduled'],
      created_by: project.user_id,
    })
    .select('id')
    .single();

  if (error) throw error;
  send(res, 201, { appointmentId: data.id });
}

async function handleCreateConversation(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const body = await readJson(req);
  const sessionId = normalizeString(body.sessionId, 120) || `session_${randomUUID()}`;
  const participantInfo = body.participantInfo && typeof body.participantInfo === 'object' ? body.participantInfo : {};

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
      tags: ['web-chat'],
    })
    .select('id')
    .single();

  if (created.error) throw created.error;
  send(res, 201, { conversationId: created.data.id, sessionId, messageCount: 0 });
}

async function loadConversation(projectId: string, conversationId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('social_conversations')
    .select('id, participant_id, message_count, unread_count')
    .eq('id', conversationId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw Object.assign(new Error('Conversation not found.'), { status: 404 });
  return data as { id: string; participant_id: string; message_count: number | null; unread_count: number | null };
}

async function handleCreateMessage(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam, conversationId: string): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  const body = await readJson(req);
  const conversation = await loadConversation(project.id, conversationId);

  const role = body.role === 'model' ? 'model' : 'user';
  const text = normalizeString(body.text, 12000);
  if (!text) throw Object.assign(new Error('Message text is required.'), { status: 400 });

  const now = new Date().toISOString();
  const isUser = role === 'user';
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
    })
    .select('id')
    .single();

  if (message.error) throw message.error;

  const nextMessageCount = Number(conversation.message_count || 0) + 1;
  const nextUnreadCount = isUser ? Number(conversation.unread_count || 0) + 1 : Number(conversation.unread_count || 0);
  const updated = await getSupabaseAdmin()
    .from('social_conversations')
    .update({
      last_message_at: now,
      message_count: nextMessageCount,
      unread_count: nextUnreadCount,
    })
    .eq('id', conversation.id);

  if (updated.error) throw updated.error;
  send(res, 201, { messageId: message.data.id, messageCount: nextMessageCount });
}

async function handleUpdateConversation(req: IncomingMessage, res: ServerResponse, parsed: ParsedProjectParam, conversationId: string): Promise<void> {
  const project = await loadProject(parsed, req);
  enforceWriteRateLimit(req, project.id);
  await loadConversation(project.id, conversationId);
  const body = await readJson(req);
  const participantInfo = body.participantInfo && typeof body.participantInfo === 'object' ? body.participantInfo : {};
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
  send(res, 200, { ok: true });
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
    if (req.method === 'POST' && resource === 'leads') return await handleCreateLead(req, res, parsed);
    if (req.method === 'POST' && resource === 'appointments') return await handleCreateAppointment(req, res, parsed);
    if (req.method === 'POST' && resource === 'conversations' && !id) return await handleCreateConversation(req, res, parsed);
    if (req.method === 'POST' && resource === 'conversations' && id && subResource === 'messages') {
      return await handleCreateMessage(req, res, parsed, id);
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
