import { useEffect, useMemo, useState } from 'react';
import { RestaurantMenuItem } from '../../types/restaurants';
import { RestaurantScope } from '../../services/restaurants/restaurantPaths';
import { createMenuItem, deleteMenuItem, listenMenuItems, saveGeneratedMenu, updateMenuItem } from '../../services/restaurants/restaurantMenuService';

export function useRestaurantMenu(scope: RestaurantScope | null, restaurantId?: string | null) {
  const [items, setItems] = useState<RestaurantMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scope || !restaurantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return listenMenuItems(
      scope,
      restaurantId,
      (next) => {
        setItems(next);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [scope, restaurantId]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).filter(Boolean), [items]);
  const featuredItems = useMemo(() => items.filter((item) => item.isFeatured), [items]);
  const availableItems = useMemo(() => items.filter((item) => item.isAvailable), [items]);

  return {
    items,
    categories,
    featuredItems,
    availableItems,
    isLoading,
    error,
    createItem: async (data: Partial<RestaurantMenuItem>) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return createMenuItem(scope, restaurantId, data);
    },
    updateItem: async (itemId: string, data: Partial<RestaurantMenuItem>) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return updateMenuItem(scope, restaurantId, itemId, data);
    },
    deleteItem: async (itemId: string) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return deleteMenuItem(scope, restaurantId, itemId);
    },
    saveGeneratedItems: async (data: Array<Partial<RestaurantMenuItem>>) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return saveGeneratedMenu(scope, restaurantId, data);
    },
  };
}
