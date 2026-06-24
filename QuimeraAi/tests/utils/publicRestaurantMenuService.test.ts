import { describe, expect, it } from 'vitest';
import type { RestaurantAnalyticsEvent, RestaurantMenuItem, RestaurantSettings } from '../../types/restaurants';
import {
  loadPublicRestaurantMenu,
  trackPublicRestaurantMenuEvent,
  type PublicRestaurantMenuRepository,
} from '../../services/restaurants/publicRestaurantMenuService';

const now = '2026-06-24T12:00:00.000Z';

const restaurant: RestaurantSettings = {
  id: 'restaurant_public_menu',
  tenantId: 'tenant_public_menu',
  ownerId: 'owner_public_menu',
  name: 'Mesa QR',
  cuisineType: 'Steakhouse',
  address: 'Carolina, PR',
  phone: '787-555-0101',
  hours: 'Tue-Sun 5pm-10pm',
  reservationEnabled: true,
  maxPartySize: 8,
  reservationInterval: 30,
  averageTableDuration: 90,
  languagesEnabled: ['en', 'es'],
  currency: 'USD',
  qrMenuEnabled: true,
  publicSlug: 'mesa-qr',
  createdAt: now,
  updatedAt: now,
};

const menuItem = (overrides: Partial<RestaurantMenuItem> = {}): RestaurantMenuItem => ({
  id: overrides.id || 'dish_1',
  tenantId: restaurant.tenantId,
  restaurantId: restaurant.id,
  name: overrides.name || 'Prime Ribeye',
  description: overrides.description || 'Grilled ribeye with seasonal sides.',
  category: overrides.category || 'Mains',
  price: overrides.price ?? 42,
  currency: overrides.currency || 'USD',
  imageUrl: overrides.imageUrl || '',
  dietaryTags: overrides.dietaryTags || [],
  allergens: overrides.allergens || [],
  ingredients: overrides.ingredients || [],
  preparationTime: overrides.preparationTime || 20,
  isAvailable: overrides.isAvailable ?? true,
  isFeatured: overrides.isFeatured ?? false,
  upsellItems: overrides.upsellItems || [],
  aiGenerated: overrides.aiGenerated ?? false,
  generatedByAI: overrides.generatedByAI,
  needsReview: overrides.needsReview,
  userModified: overrides.userModified,
  lockedFromRegeneration: overrides.lockedFromRegeneration,
  source: overrides.source,
  blueprintItemId: overrides.blueprintItemId,
  syncKey: overrides.syncKey,
  priceSource: overrides.priceSource,
  publishStatus: overrides.publishStatus,
  availabilityStatus: overrides.availabilityStatus,
  position: overrides.position || 0,
  createdAt: now,
  updatedAt: now,
});

function createRepository(items: RestaurantMenuItem[] = []) {
  const events: Array<{ eventName: RestaurantAnalyticsEvent['eventName']; metadata?: Record<string, unknown> }> = [];
  const calls = {
    getRestaurantById: 0,
    getRestaurantBySlug: 0,
    listMenuItems: 0,
    recordEvent: 0,
  };

  const repository: PublicRestaurantMenuRepository = {
    async getRestaurantById(id) {
      calls.getRestaurantById += 1;
      return id === restaurant.id ? restaurant : null;
    },
    async getRestaurantBySlug(slug) {
      calls.getRestaurantBySlug += 1;
      return slug === restaurant.publicSlug ? restaurant : null;
    },
    async listMenuItems(restaurantId) {
      calls.listMenuItems += 1;
      return restaurantId === restaurant.id ? items : [];
    },
    async recordEvent(_restaurant, eventName, metadata) {
      calls.recordEvent += 1;
      events.push({ eventName, metadata });
    },
  };

  return { repository, calls, events };
}

describe('public restaurant menu service', () => {
  it('loads canonical restaurant menu data by restaurant id even when it is not a UUID', async () => {
    const fake = createRepository([
      menuItem({ id: 'dish_direct', name: 'Direct ID Dish', category: 'Mains', position: 1 }),
    ]);

    const result = await loadPublicRestaurantMenu('restaurant_public_menu', { repository: fake.repository });

    expect(result?.restaurant.id).toBe('restaurant_public_menu');
    expect(result?.items.map((item) => item.name)).toEqual(['Direct ID Dish']);
    expect(fake.calls.getRestaurantById).toBe(1);
    expect(fake.calls.getRestaurantBySlug).toBe(0);
  });

  it('loads canonical restaurant menu data by public slug', async () => {
    const fake = createRepository([
      menuItem({ id: 'dish_b', name: 'Burger', category: 'Mains', position: 2 }),
      menuItem({ id: 'dish_a', name: 'Croquetas', category: 'Appetizers', position: 1 }),
    ]);

    const result = await loadPublicRestaurantMenu('mesa-qr', { repository: fake.repository });

    expect(result?.restaurant.name).toBe('Mesa QR');
    expect(result?.items.map((item) => item.name)).toEqual(['Croquetas', 'Burger']);
    expect(fake.calls.getRestaurantBySlug).toBe(1);
    expect(fake.calls.listMenuItems).toBe(1);
  });

  it('filters unavailable, draft, and unpublished menu items from public results', async () => {
    const fake = createRepository([
      menuItem({ id: 'available', name: 'Available' }),
      menuItem({ id: 'hidden', name: 'Hidden', isAvailable: false }),
      menuItem({ id: 'draft', name: 'Draft', availabilityStatus: 'draft' }),
      menuItem({ id: 'unpublished', name: 'Unpublished', publishStatus: 'not_published' }),
    ]);

    const result = await loadPublicRestaurantMenu('mesa-qr', { repository: fake.repository });

    expect(result?.items.map((item) => item.id)).toEqual(['available']);
  });

  it('returns null when no restaurant matches the public key', async () => {
    const fake = createRepository();

    const result = await loadPublicRestaurantMenu('missing-restaurant', { repository: fake.repository });

    expect(result).toBeNull();
    expect(fake.calls.listMenuItems).toBe(0);
  });

  it('records public menu analytics events without blocking callers', async () => {
    const fake = createRepository();

    await trackPublicRestaurantMenuEvent(restaurant, 'dish_clicked', {
      dishId: 'dish_1',
    }, fake.repository);

    expect(fake.events).toEqual([
      { eventName: 'dish_clicked', metadata: { dishId: 'dish_1' } },
    ]);
  });
});
