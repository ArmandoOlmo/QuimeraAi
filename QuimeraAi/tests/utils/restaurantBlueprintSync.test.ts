import { describe, expect, it } from 'vitest';
import type { RestaurantBlueprint } from '../../types/businessBlueprint';
import type { RestaurantMenuItem, RestaurantSettings } from '../../types/restaurants';
import { createRestaurantBlueprintFromContext } from '../../utils/businessBlueprint';
import type { RestaurantScope } from '../../services/restaurants/restaurantPaths';
import {
  applyRestaurantBlueprintDraft,
  planRestaurantBlueprintSync,
  previewRestaurantBlueprintSync,
  type RestaurantBlueprintRepository,
} from '../../services/restaurants/restaurantBlueprintService';

const scope: RestaurantScope = { userId: 'user_restaurant_sync', tenantId: 'tenant_restaurant_sync' };
const now = '2026-06-24T12:00:00.000Z';

function makeBlueprint(): RestaurantBlueprint {
  return createRestaurantBlueprintFromContext({
    businessName: 'Mesa Sync',
    industry: 'Modern steakhouse restaurant in Carolina PR',
    description: 'Restaurant with QR menu, reservations, catering, event tickets, and gift cards.',
    contactInfo: {
      address: 'Carolina, PR',
      phone: '787-555-0101',
      hours: 'Tue-Sun 5pm-10pm',
      currency: 'USD',
    },
    services: [
      { name: 'Steaks', description: 'Grill menu.' },
      { name: 'Private events', description: 'Event reservations.' },
      { name: 'Catering packages', description: 'Catering drafts.' },
    ],
    now,
  });
}

function createFakeRepository(seed: {
  restaurants?: RestaurantSettings[];
  menuItems?: Record<string, RestaurantMenuItem[]>;
} = {}) {
  const restaurants = [...(seed.restaurants || [])];
  const menuItems: Record<string, RestaurantMenuItem[]> = { ...(seed.menuItems || {}) };
  const calls = {
    createRestaurant: 0,
    updateRestaurant: 0,
    createMenuItem: 0,
    updateMenuItem: 0,
    syncPublicRestaurant: 0,
    syncPublicMenuItems: 0,
  };

  const repository: RestaurantBlueprintRepository = {
    async listRestaurants() {
      return restaurants;
    },
    async createRestaurant(_scope, data) {
      calls.createRestaurant += 1;
      const id = `restaurant_${restaurants.length + 1}`;
      restaurants.push({
        id,
        tenantId: data.tenantId || 'tenant_restaurant_sync',
        ownerId: data.ownerId || 'user_restaurant_sync',
        name: data.name || 'Restaurant',
        reservationEnabled: data.reservationEnabled ?? true,
        maxPartySize: data.maxPartySize || 8,
        reservationInterval: data.reservationInterval || 30,
        averageTableDuration: data.averageTableDuration || 90,
        languagesEnabled: data.languagesEnabled || ['en', 'es'],
        currency: data.currency || 'USD',
        qrMenuEnabled: data.qrMenuEnabled ?? true,
        publicSlug: data.publicSlug || 'restaurant',
        createdAt: now,
        updatedAt: now,
        ...data,
      } as RestaurantSettings);
      menuItems[id] = menuItems[id] || [];
      return id;
    },
    async updateRestaurant(_scope, restaurantId, data) {
      calls.updateRestaurant += 1;
      const index = restaurants.findIndex(item => item.id === restaurantId);
      if (index >= 0) restaurants[index] = { ...restaurants[index], ...data } as RestaurantSettings;
    },
    async listMenuItems(_scope, restaurantId) {
      return menuItems[restaurantId] || [];
    },
    async createMenuItem(_scope, restaurantId, data) {
      calls.createMenuItem += 1;
      const id = `menu_${restaurantId}_${(menuItems[restaurantId] || []).length + 1}`;
      menuItems[restaurantId] = menuItems[restaurantId] || [];
      menuItems[restaurantId].push({
        id,
        tenantId: data.tenantId || 'tenant_restaurant_sync',
        restaurantId,
        name: data.name || 'Dish',
        description: data.description || '',
        category: data.category || 'Menu',
        price: data.price || 0,
        currency: data.currency || 'USD',
        dietaryTags: data.dietaryTags || [],
        allergens: data.allergens || [],
        ingredients: data.ingredients || [],
        isAvailable: data.isAvailable ?? false,
        isFeatured: data.isFeatured ?? false,
        upsellItems: data.upsellItems || [],
        aiGenerated: data.aiGenerated ?? true,
        position: data.position || 0,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as RestaurantMenuItem);
      return id;
    },
    async updateMenuItem(_scope, restaurantId, itemId, data) {
      calls.updateMenuItem += 1;
      menuItems[restaurantId] = (menuItems[restaurantId] || []).map(item => (
        item.id === itemId ? { ...item, ...data } as RestaurantMenuItem : item
      ));
    },
    async syncPublicRestaurant() {
      calls.syncPublicRestaurant += 1;
    },
    async syncPublicMenuItems() {
      calls.syncPublicMenuItems += 1;
    },
  };

  return {
    repository,
    restaurants,
    menuItems,
    calls,
  };
}

describe('restaurant blueprint draft sync', () => {
  it('previews restaurant, menu, reservation, public menu, ecommerce, and integration drafts without writes', async () => {
    const blueprint = makeBlueprint();
    const fake = createFakeRepository();

    const result = await previewRestaurantBlueprintSync(scope, blueprint, { now }, fake.repository);

    expect(result.errors).toEqual([]);
    expect(result.summary.dryRun).toBe(true);
    expect(result.preview.wouldCreateRestaurant).toBe(true);
    expect(result.preview.categoriesCount).toBeGreaterThan(0);
    expect(result.preview.menuItemsToCreate).toBe(blueprint.menuDraft.items.length);
    expect(result.preview.reservationsEnabled).toBe(true);
    expect(result.preview.publicMenuEnabled).toBe(true);
    expect(result.preview.ecommerceOffers).toEqual(expect.arrayContaining(['giftCards', 'cateringPackages', 'eventTickets']));
    expect(result.preview.integrations.analyticsEvents).toBeGreaterThan(0);
    expect(fake.calls.createRestaurant).toBe(0);
    expect(fake.calls.createMenuItem).toBe(0);
  });

  it('applies a restaurant blueprint as draft data with review-safe menu items', async () => {
    const blueprint = makeBlueprint();
    const fake = createFakeRepository();

    const result = await applyRestaurantBlueprintDraft(scope, blueprint, { now }, fake.repository);
    const restaurantId = result.restaurantId!;
    const createdItems = fake.menuItems[restaurantId];

    expect(result.errors).toEqual([]);
    expect(result.summary.restaurantCreated).toBe(1);
    expect(result.summary.menuItemsCreated).toBe(blueprint.menuDraft.items.length);
    expect(result.summary.publicMenuSynced).toBe(true);
    expect(fake.restaurants[0]).toMatchObject({
      source: 'ai-studio',
      generatedByAI: true,
      needsReview: true,
      reservationEnabled: true,
      qrMenuEnabled: true,
    });
    expect(createdItems).toHaveLength(blueprint.menuDraft.items.length);
    expect(createdItems.every(item => item.aiGenerated === true && item.needsReview === true)).toBe(true);
    expect(createdItems.every(item => item.isAvailable === false && item.publishStatus === 'not_published')).toBe(true);
    expect(createdItems.every(item => item.source === 'ai-studio' && Boolean(item.syncKey))).toBe(true);
    expect(fake.calls.syncPublicRestaurant).toBe(1);
    expect(fake.calls.syncPublicMenuItems).toBe(1);
  });

  it('is idempotent on a second apply and does not duplicate generated menu items', async () => {
    const blueprint = makeBlueprint();
    const fake = createFakeRepository();
    const first = await applyRestaurantBlueprintDraft(scope, blueprint, { now }, fake.repository);
    const restaurantId = first.restaurantId!;

    const second = await applyRestaurantBlueprintDraft(scope, blueprint, { now }, fake.repository);

    expect(second.errors).toEqual([]);
    expect(second.summary.restaurantCreated).toBe(0);
    expect(second.summary.menuItemsCreated).toBe(0);
    expect(second.summary.menuItemsSkipped).toBe(blueprint.menuDraft.items.length);
    expect(fake.restaurants).toHaveLength(1);
    expect(fake.menuItems[restaurantId]).toHaveLength(blueprint.menuDraft.items.length);
  });

  it('skips user-modified or locked menu items even when overwrite is requested', async () => {
    const blueprint = makeBlueprint();
    const existingRestaurant: RestaurantSettings = {
      id: 'restaurant_existing',
      tenantId: 'tenant_restaurant_sync',
      ownerId: 'user_restaurant_sync',
      name: blueprint.profile.name,
      reservationEnabled: true,
      maxPartySize: 8,
      reservationInterval: 30,
      averageTableDuration: 90,
      languagesEnabled: ['en', 'es'],
      currency: 'USD',
      qrMenuEnabled: true,
      publicSlug: blueprint.profile.publicSlug || 'mesa-sync',
      createdAt: now,
      updatedAt: now,
    };
    const protectedDraft = blueprint.menuDraft.items[0];
    const protectedItem: RestaurantMenuItem = {
      id: 'manual_item',
      tenantId: 'tenant_restaurant_sync',
      restaurantId: 'restaurant_existing',
      name: protectedDraft.name,
      description: 'Manual edited copy',
      category: protectedDraft.category,
      price: 99,
      currency: 'USD',
      dietaryTags: [],
      allergens: [],
      ingredients: [],
      isAvailable: true,
      isFeatured: false,
      upsellItems: [],
      aiGenerated: true,
      needsReview: false,
      userModified: true,
      syncKey: `ai-studio-restaurant:${blueprint.profile.publicSlug}:menu:${protectedDraft.id}`,
      position: 0,
      createdAt: now,
      updatedAt: now,
    };
    const fake = createFakeRepository({
      restaurants: [existingRestaurant],
      menuItems: { restaurant_existing: [protectedItem] },
    });

    const plan = planRestaurantBlueprintSync({
      scope,
      blueprint,
      existingRestaurants: [existingRestaurant],
      existingMenuItems: [protectedItem],
      restaurantId: existingRestaurant.id,
      options: { overwriteExisting: true, dryRun: false },
    });
    const result = await applyRestaurantBlueprintDraft(scope, blueprint, { now, overwriteExisting: true }, fake.repository);

    expect(plan.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'skip_menu_item', itemId: 'manual_item', reason: 'user_modified_or_locked' }),
    ]));
    expect(result.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'skip_menu_item', itemId: 'manual_item', reason: 'user_modified_or_locked' }),
    ]));
    expect(fake.menuItems.restaurant_existing.find(item => item.id === 'manual_item')?.description).toBe('Manual edited copy');
    expect(fake.calls.updateMenuItem).toBe(0);
  });
});
