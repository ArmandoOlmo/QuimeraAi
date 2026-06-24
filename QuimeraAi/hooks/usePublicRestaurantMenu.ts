import { useState, useEffect } from 'react';
import { RestaurantMenuItem, RestaurantSettings } from '../types/restaurants';
import { loadPublicRestaurantMenu } from '../services/restaurants/publicRestaurantMenuService';

/**
 * Hook to fetch public restaurant menu data from Supabase.
 * Reads canonical public restaurant/menu data so website blocks mirror the
 * Restaurant Engine without relying on the legacy public menu document shape.
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
        if (cancelled) return;

        const payload = await loadPublicRestaurantMenu(restaurantId);
        if (cancelled) return;

        if (payload) {
          setItems(payload.items);
          setRestaurant(payload.restaurant);
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
