/**
 * Public Restaurant Reservation Service
 *
 * Public website and QR menu forms should create reservations in the canonical
 * Restaurant Engine reservation path, not in an orphaned public subcollection.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from '@/utils/compatData';
import { db } from '@/utils/compatData';
import { supabase } from '@/supabase';
import { RestaurantReservation, RestaurantReservationSource, RestaurantSettings } from '../../types/restaurants';
import { createReservation } from './restaurantReservationService';
import { getAnalyticsEventsPath, getReservationsPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

export interface PublicReservationData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  partySize: number;
  tablePreference?: string;
  notes?: string;
  source?: Extract<RestaurantReservationSource, 'website' | 'qrMenu' | 'aiAssistant'>;
}

export interface PublicReservationResult {
  reservationId: string;
  restaurantId: string;
  status: RestaurantReservation['status'];
  source: RestaurantReservationSource;
  deduped: boolean;
  integrationDrafts: {
    analyticsEvent: 'reservation_created';
    crmLeadSource: 'reservation_created';
    emailFlow: 'reservation_received';
    chatbotIntent: 'book_reservation';
  };
}

export interface PublicRestaurantReservationRecord {
  id?: string;
  tenantId?: string;
  ownerId?: string;
  restaurant?: Partial<RestaurantSettings>;
  reservationEnabled?: boolean;
  maxPartySize?: number;
  reservationInterval?: number;
  name?: string;
  publicSlug?: string;
}

export interface PublicReservationRepository {
  createViaEndpoint?: (restaurantId: string, data: PublicReservationData) => Promise<PublicReservationResult>;
  getPublicRestaurant: (restaurantId: string) => Promise<PublicRestaurantReservationRecord | null>;
  findCanonicalReservation: (
    scope: RestaurantScope,
    restaurantId: string,
    data: SanitizedPublicReservationData
  ) => Promise<RestaurantReservation | null>;
  createCanonicalReservation: (
    scope: RestaurantScope,
    restaurantId: string,
    data: SanitizedPublicReservationData
  ) => Promise<string>;
  recordAnalyticsEvent?: (
    scope: RestaurantScope,
    restaurantId: string,
    reservationId: string,
    data: SanitizedPublicReservationData,
    deduped: boolean
  ) => Promise<void>;
}

export interface CreatePublicReservationOptions {
  now?: Date;
  useEndpoint?: boolean;
  repository?: PublicReservationRepository;
}

interface PublicReservationTarget {
  scope: RestaurantScope;
  restaurantId: string;
  restaurant: Partial<RestaurantSettings>;
}

export type SanitizedPublicReservationData = Required<Pick<PublicReservationData,
  'customerName' | 'customerEmail' | 'date' | 'time' | 'partySize' | 'source'
>> & Pick<PublicReservationData, 'customerPhone' | 'tablePreference' | 'notes'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const integrationDrafts: PublicReservationResult['integrationDrafts'] = {
  analyticsEvent: 'reservation_created',
  crmLeadSource: 'reservation_created',
  emailFlow: 'reservation_received',
  chatbotIntent: 'book_reservation',
};

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : trimmed.slice(0, 5);
};

const minutesFromMidnight = (time: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const parseLocalReservationDate = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRestaurantFromPublicRecord = (record: PublicRestaurantReservationRecord): Partial<RestaurantSettings> => {
  return record.restaurant && typeof record.restaurant === 'object' ? record.restaurant : record;
};

const normalizeEndpointErrorMessage = (error: unknown) => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  return String((error as { message?: unknown })?.message || error);
};

const normalizeSupabaseFunctionError = async (error: unknown) => {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.clone === 'function') {
    const body = await context.clone().json().catch(() => null) as { error?: string } | null;
    if (body?.error) return new Error(body.error);
  }
  return error;
};

const shouldFallbackFromEndpoint = (error: unknown) => {
  const status = Number((error as { context?: { status?: number }; status?: number })?.context?.status || (error as { status?: number })?.status || 0);
  if (status === 404) return true;
  const message = normalizeEndpointErrorMessage(error);
  return /function.*not.*found|not found|404|failed to fetch|network|fetch/i.test(message);
};

export function sanitizePublicReservationData(data: PublicReservationData): SanitizedPublicReservationData {
  return {
    customerName: data.customerName?.trim() || '',
    customerEmail: data.customerEmail?.trim().toLowerCase() || '',
    customerPhone: data.customerPhone?.trim() || '',
    date: data.date?.trim() || '',
    time: normalizeTime(data.time || ''),
    partySize: Number(data.partySize),
    tablePreference: data.tablePreference?.trim() || '',
    notes: data.notes?.trim() || '',
    source: data.source || 'website',
  };
}

export function validatePublicReservationData(
  data: PublicReservationData,
  restaurant: Partial<RestaurantSettings> = {},
  now = new Date()
): SanitizedPublicReservationData {
  const sanitized = sanitizePublicReservationData(data);

  if (!sanitized.customerName) throw new Error('Customer name is required');
  if (!sanitized.customerEmail) throw new Error('Customer email is required');
  if (!emailRegex.test(sanitized.customerEmail)) throw new Error('Invalid email address');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized.date)) throw new Error('Reservation date is required');
  if (minutesFromMidnight(sanitized.time) === null) throw new Error('Reservation time is required');
  if (!Number.isFinite(sanitized.partySize) || sanitized.partySize < 1) throw new Error('Party size must be at least 1');

  if (restaurant.reservationEnabled === false) {
    throw new Error('This restaurant is not accepting online reservations');
  }

  const maxPartySize = Number(restaurant.maxPartySize || 0);
  if (maxPartySize > 0 && sanitized.partySize > maxPartySize) {
    throw new Error(`Party size cannot exceed ${maxPartySize}`);
  }

  const reservationDate = parseLocalReservationDate(sanitized.date, sanitized.time);
  if (!reservationDate || reservationDate.getTime() <= now.getTime()) {
    throw new Error('Reservation date and time must be in the future');
  }

  const interval = Number(restaurant.reservationInterval || 0);
  const minutes = minutesFromMidnight(sanitized.time);
  if (interval > 0 && minutes !== null && minutes % interval !== 0) {
    throw new Error(`Reservation time must align with ${interval}-minute intervals`);
  }

  return sanitized;
}

export function resolvePublicReservationTarget(
  restaurantId: string,
  record: PublicRestaurantReservationRecord
): PublicReservationTarget {
  const restaurant = getRestaurantFromPublicRecord(record);
  const ownerId = record.ownerId || restaurant.ownerId;
  const tenantId = record.tenantId || restaurant.tenantId;
  const canonicalRestaurantId = record.id || restaurant.id || restaurantId;

  if (!canonicalRestaurantId) throw new Error('Restaurant ID is required');
  if (!ownerId) throw new Error('Restaurant reservation target is not configured');

  return {
    scope: { userId: ownerId, tenantId },
    restaurantId: canonicalRestaurantId,
    restaurant: {
      ...restaurant,
      id: canonicalRestaurantId,
      tenantId,
      ownerId,
    },
  };
}

async function invokePublicReservationEndpoint(
  restaurantId: string,
  data: PublicReservationData
): Promise<PublicReservationResult> {
  const { data: response, error } = await supabase.functions.invoke('create-public-restaurant-reservation', {
    body: { restaurantId, ...data },
  });

  if (error) throw await normalizeSupabaseFunctionError(error);
  if (response?.error) throw new Error(response.error);
  if (!response?.reservationId) throw new Error('Reservation endpoint returned an invalid response');

  return {
    reservationId: response.reservationId,
    restaurantId: response.restaurantId || restaurantId,
    status: response.status || 'pending',
    source: response.source || data.source || 'website',
    deduped: Boolean(response.deduped),
    integrationDrafts: response.integrationDrafts || integrationDrafts,
  };
}

async function getPublicRestaurantRecord(restaurantId: string): Promise<PublicRestaurantReservationRecord | null> {
  if (!restaurantId) return null;

  if (uuidRegex.test(restaurantId)) {
    const snap = await getDoc(doc(db, 'publicRestaurantMenus', restaurantId));
    if (snap.exists()) return { id: snap.id, ...snap.data() } as PublicRestaurantReservationRecord;
  }

  const slugSnap = await getDocs(query(collection(db, 'restaurants'), where('publicSlug', '==', restaurantId), limit(1)));
  const first = slugSnap.docs[0];
  return first ? ({ id: first.id, ...first.data() } as PublicRestaurantReservationRecord) : null;
}

async function findCanonicalReservation(
  scope: RestaurantScope,
  restaurantId: string,
  data: SanitizedPublicReservationData
): Promise<RestaurantReservation | null> {
  const snap = await getDocs(query(
    collection(db, getReservationsPath(scope, restaurantId)),
    where('customerEmail', '==', data.customerEmail),
    where('date', '==', data.date),
    where('time', '==', data.time),
    where('source', '==', data.source),
    limit(10)
  ));
  const match = snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as RestaurantReservation)
    .find((item) => item.status !== 'cancelled' && Number(item.partySize) === data.partySize);
  return match || null;
}

async function createCanonicalReservation(
  scope: RestaurantScope,
  restaurantId: string,
  data: SanitizedPublicReservationData
) {
  return createReservation(scope, restaurantId, {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone || '',
    date: data.date,
    time: data.time,
    partySize: data.partySize,
    tablePreference: data.tablePreference || '',
    notes: data.notes || '',
    status: 'pending',
    source: data.source,
  });
}

async function recordReservationAnalyticsEvent(
  scope: RestaurantScope,
  restaurantId: string,
  reservationId: string,
  data: SanitizedPublicReservationData,
  deduped: boolean
) {
  await addDoc(collection(db, getAnalyticsEventsPath(scope, restaurantId)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    eventName: 'reservation_created',
    metadata: {
      reservationId,
      source: data.source,
      partySize: data.partySize,
      deduped,
      crmLeadSource: integrationDrafts.crmLeadSource,
      emailFlow: integrationDrafts.emailFlow,
      chatbotIntent: integrationDrafts.chatbotIntent,
    },
    createdAt: serverTimestamp(),
  });
}

export const defaultPublicReservationRepository: PublicReservationRepository = {
  createViaEndpoint: invokePublicReservationEndpoint,
  getPublicRestaurant: getPublicRestaurantRecord,
  findCanonicalReservation,
  createCanonicalReservation,
  recordAnalyticsEvent: recordReservationAnalyticsEvent,
};

/**
 * Creates a public reservation through the canonical Restaurant Engine path.
 */
export async function createPublicReservation(
  restaurantId: string,
  data: PublicReservationData,
  options: CreatePublicReservationOptions = {}
): Promise<string> {
  if (!restaurantId) throw new Error('Restaurant ID is required');

  const repository = options.repository || defaultPublicReservationRepository;

  if (options.useEndpoint !== false && repository.createViaEndpoint) {
    try {
      const result = await repository.createViaEndpoint(restaurantId, data);
      return result.reservationId;
    } catch (error) {
      if (!shouldFallbackFromEndpoint(error)) throw error;
      console.warn('[createPublicReservation] Falling back to client canonical flow:', error);
    }
  }

  const publicRestaurant = await repository.getPublicRestaurant(restaurantId);
  if (!publicRestaurant) throw new Error('Restaurant not found');

  const target = resolvePublicReservationTarget(restaurantId, publicRestaurant);
  const sanitized = validatePublicReservationData(data, target.restaurant, options.now);

  const existing = await repository.findCanonicalReservation(target.scope, target.restaurantId, sanitized);
  if (existing) {
    return existing.id;
  }

  const reservationId = await repository.createCanonicalReservation(target.scope, target.restaurantId, sanitized);

  if (repository.recordAnalyticsEvent) {
    try {
      await repository.recordAnalyticsEvent(target.scope, target.restaurantId, reservationId, sanitized, false);
    } catch (error) {
      console.warn('[createPublicReservation] Reservation created but analytics event failed:', error);
    }
  }

  return reservationId;
}
