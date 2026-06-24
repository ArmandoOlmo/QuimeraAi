import { describe, expect, it } from 'vitest';
import type { RestaurantReservation } from '../../types/restaurants';
import type { RestaurantScope } from '../../services/restaurants/restaurantPaths';
import {
  createPublicReservation,
  resolvePublicReservationTarget,
  validatePublicReservationData,
  type PublicReservationRepository,
  type PublicRestaurantReservationRecord,
  type SanitizedPublicReservationData,
} from '../../services/restaurants/publicRestaurantService';

const now = new Date('2026-06-24T16:00:00.000Z');

const baseRestaurant: PublicRestaurantReservationRecord = {
  id: 'restaurant_public_1',
  tenantId: 'tenant_restaurant_public',
  ownerId: 'user_restaurant_public',
  name: 'Mesa Public',
  reservationEnabled: true,
  maxPartySize: 6,
  reservationInterval: 30,
  publicSlug: 'mesa-public',
};

const validReservation = {
  customerName: 'Ana Rivera',
  customerEmail: 'ANA@EXAMPLE.COM',
  customerPhone: '787-555-1212',
  date: '2026-06-25',
  time: '19:00',
  partySize: 4,
  tablePreference: 'outdoor',
  notes: 'Birthday dinner',
} as const;

function createFakeRepository(record: PublicRestaurantReservationRecord | null = baseRestaurant) {
  const reservations: RestaurantReservation[] = [];
  const analyticsEvents: Array<{ restaurantId: string; reservationId: string; deduped: boolean }> = [];
  const calls = {
    getPublicRestaurant: 0,
    findCanonicalReservation: 0,
    createCanonicalReservation: 0,
    recordAnalyticsEvent: 0,
  };

  const repository: PublicReservationRepository = {
    async getPublicRestaurant() {
      calls.getPublicRestaurant += 1;
      return record;
    },
    async findCanonicalReservation(_scope: RestaurantScope, restaurantId: string, data: SanitizedPublicReservationData) {
      calls.findCanonicalReservation += 1;
      return reservations.find(item => (
        item.restaurantId === restaurantId &&
        item.customerEmail === data.customerEmail &&
        item.date === data.date &&
        item.time === data.time &&
        item.source === data.source &&
        item.partySize === data.partySize &&
        item.status !== 'cancelled'
      )) || null;
    },
    async createCanonicalReservation(scope: RestaurantScope, restaurantId: string, data: SanitizedPublicReservationData) {
      calls.createCanonicalReservation += 1;
      const id = `reservation_${reservations.length + 1}`;
      reservations.push({
        id,
        tenantId: scope.tenantId || `tenant_${scope.userId}`,
        restaurantId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        date: data.date,
        time: data.time,
        partySize: data.partySize,
        tablePreference: data.tablePreference,
        notes: data.notes,
        status: 'pending',
        source: data.source,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      return id;
    },
    async recordAnalyticsEvent(_scope, restaurantId, reservationId, _data, deduped) {
      calls.recordAnalyticsEvent += 1;
      analyticsEvents.push({ restaurantId, reservationId, deduped });
    },
  };

  return {
    repository,
    reservations,
    analyticsEvents,
    calls,
  };
}

describe('public restaurant reservation service', () => {
  it('validates and normalizes public reservation data against restaurant settings', () => {
    const sanitized = validatePublicReservationData(validReservation, baseRestaurant, now);

    expect(sanitized.customerEmail).toBe('ana@example.com');
    expect(sanitized.source).toBe('website');
    expect(sanitized.partySize).toBe(4);
  });

  it('resolves the canonical restaurant scope from public restaurant data', () => {
    const target = resolvePublicReservationTarget('restaurant_public_1', baseRestaurant);

    expect(target.restaurantId).toBe('restaurant_public_1');
    expect(target.scope).toEqual({
      userId: 'user_restaurant_public',
      tenantId: 'tenant_restaurant_public',
    });
  });

  it('creates public reservations in the canonical reservation repository and records analytics', async () => {
    const fake = createFakeRepository();

    const reservationId = await createPublicReservation('restaurant_public_1', validReservation, {
      repository: fake.repository,
      useEndpoint: false,
      now,
    });

    expect(reservationId).toBe('reservation_1');
    expect(fake.reservations).toHaveLength(1);
    expect(fake.reservations[0]).toMatchObject({
      restaurantId: 'restaurant_public_1',
      customerEmail: 'ana@example.com',
      status: 'pending',
      source: 'website',
    });
    expect(fake.analyticsEvents).toEqual([
      { restaurantId: 'restaurant_public_1', reservationId: 'reservation_1', deduped: false },
    ]);
  });

  it('returns an existing canonical reservation on retry instead of duplicating it', async () => {
    const fake = createFakeRepository();

    const first = await createPublicReservation('restaurant_public_1', validReservation, {
      repository: fake.repository,
      useEndpoint: false,
      now,
    });
    const second = await createPublicReservation('restaurant_public_1', validReservation, {
      repository: fake.repository,
      useEndpoint: false,
      now,
    });

    expect(first).toBe('reservation_1');
    expect(second).toBe('reservation_1');
    expect(fake.reservations).toHaveLength(1);
    expect(fake.calls.createCanonicalReservation).toBe(1);
  });

  it('blocks invalid public reservations before writing canonical data', async () => {
    const fake = createFakeRepository({ ...baseRestaurant, maxPartySize: 2 });

    await expect(createPublicReservation('restaurant_public_1', {
      ...validReservation,
      partySize: 4,
    }, {
      repository: fake.repository,
      useEndpoint: false,
      now,
    })).rejects.toThrow('Party size cannot exceed 2');

    expect(fake.reservations).toHaveLength(0);
    expect(fake.calls.createCanonicalReservation).toBe(0);
  });

  it('blocks closed reservation settings, past dates, and off-interval times', () => {
    expect(() => validatePublicReservationData(validReservation, {
      ...baseRestaurant,
      reservationEnabled: false,
    }, now)).toThrow('not accepting online reservations');

    expect(() => validatePublicReservationData({
      ...validReservation,
      date: '2026-06-23',
    }, baseRestaurant, now)).toThrow('must be in the future');

    expect(() => validatePublicReservationData({
      ...validReservation,
      time: '19:15',
    }, baseRestaurant, now)).toThrow('30-minute intervals');
  });
});
