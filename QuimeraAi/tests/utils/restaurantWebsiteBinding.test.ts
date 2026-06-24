import { describe, expect, it, vi } from 'vitest';
import type { RestaurantSettings } from '../../types/restaurants';
import {
  applyRestaurantWebsiteBinding,
  createRestaurantWebsiteBindingPatch,
} from '../../utils/businessBlueprint/restaurantWebsiteBinding';

const now = '2026-06-24T12:00:00.000Z';

const restaurant: RestaurantSettings = {
  id: 'restaurant_binding_1',
  tenantId: 'tenant_binding',
  ownerId: 'owner_binding',
  name: 'Mesa Binding',
  cuisineType: 'Latin Grill',
  address: '123 Calle Luna, San Juan, PR',
  phone: '787-555-0199',
  hours: 'Tue-Sun 5pm-10pm',
  reservationEnabled: true,
  maxPartySize: 10,
  reservationInterval: 30,
  averageTableDuration: 90,
  languagesEnabled: ['en', 'es'],
  currency: 'USD',
  qrMenuEnabled: true,
  publicSlug: 'mesa-binding',
  createdAt: now,
  updatedAt: now,
};

describe('restaurant website binding', () => {
  it('creates a complete website patch from a Restaurant Engine profile', () => {
    expect(createRestaurantWebsiteBindingPatch(restaurant)).toEqual({
      'menu.dataSource': 'restaurant',
      'menu.restaurantId': 'restaurant_binding_1',
      'restaurantReservation.restaurantId': 'restaurant_binding_1',
      'restaurantReservation.maxPartySize': 10,
      'restaurantReservation.minPartySize': 1,
      'map.dataSource': 'restaurant',
      'map.restaurantId': 'restaurant_binding_1',
      'map.title': 'Mesa Binding',
      'map.address': '123 Calle Luna, San Juan, PR',
      'map.phone': '787-555-0199',
      'map.businessHours': 'Tue-Sun 5pm-10pm',
    });
  });

  it('respects target options so unrelated Website Builder sections are untouched', () => {
    const patch = createRestaurantWebsiteBindingPatch(restaurant, {
      includeMenu: true,
      includeReservation: false,
      includeMap: false,
    });

    expect(patch).toEqual({
      'menu.dataSource': 'restaurant',
      'menu.restaurantId': 'restaurant_binding_1',
    });
  });

  it('does not generate updates for restaurants without a stable id', () => {
    const patch = createRestaurantWebsiteBindingPatch({
      ...restaurant,
      id: '   ',
    });

    expect(patch).toEqual({});
  });

  it('applies the patch through the editor nested-data setter', () => {
    const setNestedData = vi.fn();

    const patch = applyRestaurantWebsiteBinding(restaurant, setNestedData, {
      includeMenu: false,
      includeReservation: true,
      includeMap: true,
    });

    expect(patch).toMatchObject({
      'restaurantReservation.restaurantId': 'restaurant_binding_1',
      'map.restaurantId': 'restaurant_binding_1',
    });
    expect(setNestedData).toHaveBeenCalledWith('restaurantReservation.restaurantId', 'restaurant_binding_1');
    expect(setNestedData).toHaveBeenCalledWith('restaurantReservation.maxPartySize', 10);
    expect(setNestedData).toHaveBeenCalledWith('restaurantReservation.minPartySize', 1);
    expect(setNestedData).toHaveBeenCalledWith('map.dataSource', 'restaurant');
    expect(setNestedData).toHaveBeenCalledWith('map.restaurantId', 'restaurant_binding_1');
    expect(setNestedData).not.toHaveBeenCalledWith('menu.restaurantId', expect.anything());
  });
});
