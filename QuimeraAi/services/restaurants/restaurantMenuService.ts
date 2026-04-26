import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '../../firebase';
import { db } from '../../firebase';
import { RestaurantMenuItem } from '../../types/restaurants';
import { getMenuItemsPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

const cleanArray = (value?: string[]) => (value || []).map((item) => item.trim()).filter(Boolean);

export async function createMenuItem(
  scope: RestaurantScope,
  restaurantId: string,
  data: Partial<RestaurantMenuItem>
) {
  if (!data.name?.trim()) throw new Error('Dish name is required');
  if (!data.category?.trim()) throw new Error('Category is required');
  const payload = {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    category: data.category,
    price: Number(data.price || 0),
    currency: data.currency || 'USD',
    imageUrl: data.imageUrl || '',
    dietaryTags: data.dietaryTags || [],
    allergens: cleanArray(data.allergens),
    ingredients: cleanArray(data.ingredients),
    preparationTime: Number(data.preparationTime || 0),
    isAvailable: data.isAvailable ?? true,
    isFeatured: data.isFeatured ?? false,
    upsellItems: cleanArray(data.upsellItems),
    aiGenerated: data.aiGenerated ?? false,
    position: data.position ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, getMenuItemsPath(scope, restaurantId)), payload);
  await syncPublicMenuItems(scope, restaurantId);
  return ref.id;
}

export async function updateMenuItem(
  scope: RestaurantScope,
  restaurantId: string,
  itemId: string,
  data: Partial<RestaurantMenuItem>
) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, getMenuItemsPath(scope, restaurantId), itemId), payload);
  await syncPublicMenuItems(scope, restaurantId);
}

export async function deleteMenuItem(scope: RestaurantScope, restaurantId: string, itemId: string) {
  await deleteDoc(doc(db, getMenuItemsPath(scope, restaurantId), itemId));
  await syncPublicMenuItems(scope, restaurantId);
}

export async function saveGeneratedMenu(
  scope: RestaurantScope,
  restaurantId: string,
  items: Array<Partial<RestaurantMenuItem>>
) {
  const batch = writeBatch(db);
  const itemsRef = collection(db, getMenuItemsPath(scope, restaurantId));
  items.forEach((item, index) => {
    if (!item.name || !item.category) return;
    const ref = doc(itemsRef);
    batch.set(ref, {
      tenantId: getRestaurantTenantId(scope),
      restaurantId,
      name: item.name,
      description: item.description || '',
      category: item.category,
      price: Number(item.price || 0),
      currency: item.currency || 'USD',
      imageUrl: item.imageUrl || '',
      dietaryTags: item.dietaryTags || [],
      allergens: item.allergens || [],
      ingredients: item.ingredients || [],
      preparationTime: Number(item.preparationTime || 0),
      isAvailable: item.isAvailable ?? true,
      isFeatured: item.isFeatured ?? false,
      upsellItems: item.upsellItems || [],
      aiGenerated: true,
      position: item.position ?? index,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  await syncPublicMenuItems(scope, restaurantId);
}

export function listenMenuItems(
  scope: RestaurantScope,
  restaurantId: string,
  onNext: (items: RestaurantMenuItem[]) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    query(collection(db, getMenuItemsPath(scope, restaurantId)), orderBy('position', 'asc')),
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantMenuItem)),
    onError
  );
}

export async function syncPublicMenuItems(scope: RestaurantScope, restaurantId: string) {
  const snap = await getDocs(query(collection(db, getMenuItemsPath(scope, restaurantId)), orderBy('position', 'asc')));
  const items = snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantMenuItem);
  await setDoc(
    doc(db, 'publicRestaurantMenus', restaurantId),
    {
      tenantId: getRestaurantTenantId(scope),
      items: items.filter((item) => item.isAvailable),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
