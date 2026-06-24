import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from '@/utils/compatData';
import { db } from '@/utils/compatData';
import { RestaurantAnalyticsEvent, RestaurantMenuItem, RestaurantSettings } from '../../types/restaurants';
import { getAnalyticsEventsPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

export interface PublicRestaurantMenuData {
  restaurant: RestaurantSettings;
  items: RestaurantMenuItem[];
}

export interface PublicRestaurantMenuRepository {
  getRestaurantById: (restaurantId: string) => Promise<RestaurantSettings | null>;
  getRestaurantBySlug: (slug: string) => Promise<RestaurantSettings | null>;
  listMenuItems: (restaurantId: string) => Promise<RestaurantMenuItem[]>;
  recordEvent?: (
    restaurant: RestaurantSettings,
    eventName: RestaurantAnalyticsEvent['eventName'],
    metadata?: Record<string, unknown>
  ) => Promise<void>;
}

export interface PublicMenuLoadOptions {
  repository?: PublicRestaurantMenuRepository;
}

const isPublishedMenuItem = (item: RestaurantMenuItem) => {
  if (item.isAvailable === false) return false;
  if (item.publishStatus === 'not_published') return false;
  if (item.availabilityStatus === 'draft' || item.availabilityStatus === 'unavailable') return false;
  return true;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const sortMenuItems = (items: RestaurantMenuItem[]) => {
  return [...items].sort((a, b) => {
    const categoryCompare = (a.category || '').localeCompare(b.category || '');
    if (categoryCompare !== 0) return categoryCompare;
    return Number(a.position || 0) - Number(b.position || 0);
  });
};

async function getRestaurantById(restaurantId: string): Promise<RestaurantSettings | null> {
  if (!uuidRegex.test(restaurantId)) return null;
  const snap = await getDoc(doc(db, 'restaurants', restaurantId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RestaurantSettings) : null;
}

async function getRestaurantBySlug(slug: string): Promise<RestaurantSettings | null> {
  const snap = await getDocs(query(collection(db, 'restaurants'), where('publicSlug', '==', slug), limit(1)));
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...first.data() } as RestaurantSettings) : null;
}

async function listMenuItems(restaurantId: string): Promise<RestaurantMenuItem[]> {
  const snap = await getDocs(query(collection(db, 'restaurants', restaurantId, 'menuItems'), orderBy('position', 'asc')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantMenuItem);
}

async function recordEvent(
  restaurant: RestaurantSettings,
  eventName: RestaurantAnalyticsEvent['eventName'],
  metadata: Record<string, unknown> = {}
) {
  const scope: RestaurantScope = {
    userId: restaurant.ownerId,
    tenantId: restaurant.tenantId,
  };

  await addDoc(collection(db, getAnalyticsEventsPath(scope, restaurant.id)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId: restaurant.id,
    eventName,
    metadata: {
      source: 'public-menu',
      ...metadata,
    },
    createdAt: serverTimestamp(),
  });
}

export const defaultPublicRestaurantMenuRepository: PublicRestaurantMenuRepository = {
  getRestaurantById,
  getRestaurantBySlug,
  listMenuItems,
  recordEvent,
};

export async function loadPublicRestaurantMenu(
  restaurantIdOrSlug: string,
  options: PublicMenuLoadOptions = {}
): Promise<PublicRestaurantMenuData | null> {
  const key = restaurantIdOrSlug.trim();
  if (!key) return null;

  const repository = options.repository || defaultPublicRestaurantMenuRepository;
  const restaurant = await repository.getRestaurantById(key) || await repository.getRestaurantBySlug(key);

  if (!restaurant) return null;

  const items = await repository.listMenuItems(restaurant.id);
  return {
    restaurant,
    items: sortMenuItems(items.filter(isPublishedMenuItem)),
  };
}

export async function trackPublicRestaurantMenuEvent(
  restaurant: RestaurantSettings | null | undefined,
  eventName: RestaurantAnalyticsEvent['eventName'],
  metadata: Record<string, unknown> = {},
  repository: PublicRestaurantMenuRepository = defaultPublicRestaurantMenuRepository
) {
  if (!restaurant || !repository.recordEvent) return;
  try {
    await repository.recordEvent(restaurant, eventName, metadata);
  } catch (error) {
    console.warn('[trackPublicRestaurantMenuEvent] Event skipped:', error);
  }
}
