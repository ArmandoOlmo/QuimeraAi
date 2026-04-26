import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '../../firebase';
import { db } from '../../firebase';
import { RestaurantSettings } from '../../types/restaurants';
import { getRestaurantPath, getRestaurantsPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'restaurant';

export const defaultRestaurantSettings = (
  scope: RestaurantScope,
  name = 'Restaurant'
): Omit<RestaurantSettings, 'id' | 'createdAt' | 'updatedAt'> => ({
  tenantId: getRestaurantTenantId(scope),
  ownerId: scope.userId,
  name,
  cuisineType: '',
  address: '',
  phone: '',
  hours: '',
  reservationEnabled: true,
  maxPartySize: 12,
  reservationInterval: 30,
  averageTableDuration: 90,
  languagesEnabled: ['es', 'en'],
  currency: 'USD',
  qrMenuEnabled: true,
  publicSlug: slugify(name),
});

export async function createRestaurant(scope: RestaurantScope, data: Partial<RestaurantSettings> = {}) {
  const restaurantsRef = collection(db, getRestaurantsPath(scope));
  const payload = {
    ...defaultRestaurantSettings(scope, data.name || 'Restaurant'),
    ...data,
    tenantId: getRestaurantTenantId(scope),
    ownerId: scope.userId,
    publicSlug: slugify(data.publicSlug || data.name || 'restaurant'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(restaurantsRef, payload);
  await syncPublicRestaurant(scope, ref.id);
  return ref.id;
}

export async function getRestaurants(scope: RestaurantScope): Promise<RestaurantSettings[]> {
  const snap = await getDocs(query(collection(db, getRestaurantsPath(scope)), orderBy('createdAt', 'asc')));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantSettings);
}

export function listenRestaurants(
  scope: RestaurantScope,
  onNext: (restaurants: RestaurantSettings[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, getRestaurantsPath(scope)), orderBy('createdAt', 'asc')),
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantSettings)),
    onError
  );
}

export async function updateRestaurant(
  scope: RestaurantScope,
  restaurantId: string,
  data: Partial<RestaurantSettings>
) {
  const cleanData = {
    ...data,
    publicSlug: data.publicSlug || data.name ? slugify(data.publicSlug || data.name || '') : undefined,
    updatedAt: serverTimestamp(),
  };
  Object.keys(cleanData).forEach((key) => (cleanData as Record<string, unknown>)[key] === undefined && delete (cleanData as Record<string, unknown>)[key]);
  await updateDoc(doc(db, getRestaurantPath(scope, restaurantId)), cleanData);
  await syncPublicRestaurant(scope, restaurantId);
}

export async function syncPublicRestaurant(scope: RestaurantScope, restaurantId: string) {
  const restaurantSnap = await getDoc(doc(db, getRestaurantPath(scope, restaurantId)));
  if (!restaurantSnap.exists()) return;
  const restaurant = { id: restaurantSnap.id, ...restaurantSnap.data() } as RestaurantSettings;
  await setDoc(
    doc(db, 'publicRestaurantMenus', restaurantId),
    {
      restaurant,
      tenantId: getRestaurantTenantId(scope),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
