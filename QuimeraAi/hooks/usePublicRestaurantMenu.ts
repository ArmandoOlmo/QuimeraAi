import { useState, useEffect } from 'react';
import { doc, getDoc } from '../firebase';
import { db } from '../firebase';
import { RestaurantMenuItem, RestaurantSettings } from '../types/restaurants';

interface PublicRestaurantMenuPayload {
  restaurant?: RestaurantSettings;
  items?: RestaurantMenuItem[];
}

/**
 * Hook to fetch public restaurant menu data from Firestore.
 * Reads from the `publicRestaurantMenus/{restaurantId}` collection,
 * which is synced by the restaurant dashboard when menu items are updated.
 */
export function usePublicRestaurantMenu(restaurantId: string | null | undefined) {
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setItems([]);
      setRestaurant(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const ref = doc(db, 'publicRestaurantMenus', restaurantId);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (snap.exists()) {
          const payload = snap.data() as PublicRestaurantMenuPayload;
          setItems(payload.items || []);
          setRestaurant(payload.restaurant || null);
        } else {
          setItems([]);
          setRestaurant(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[usePublicRestaurantMenu] Error loading menu:', err);
          setError(err.message || 'Failed to load menu');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [restaurantId]);

  return { items, restaurant, isLoading, error };
}
