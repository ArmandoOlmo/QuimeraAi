import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/core/AuthContext';
import { useSafeTenant } from '../../contexts/tenant';
import { RestaurantSettings } from '../../types/restaurants';
import { createRestaurant, listenRestaurants, updateRestaurant } from '../../services/restaurants/restaurantService';
import { RestaurantScope } from '../../services/restaurants/restaurantPaths';

export function useRestaurant() {
  const { user } = useAuth();
  const tenant = useSafeTenant();
  const [restaurants, setRestaurants] = useState<RestaurantSettings[]>([]);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() => localStorage.getItem('restaurantActiveId'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo<RestaurantScope | null>(() => {
    if (!user?.uid) return null;
    return { userId: user.uid, tenantId: tenant?.currentTenant?.id };
  }, [user?.uid, tenant?.currentTenant?.id]);

  useEffect(() => {
    if (!scope) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return listenRestaurants(
      scope,
      (items) => {
        setRestaurants(items);
        if (!activeRestaurantId && items[0]) {
          setActiveRestaurantId(items[0].id);
          localStorage.setItem('restaurantActiveId', items[0].id);
        }
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [scope, activeRestaurantId]);

  const activeRestaurant = restaurants.find((item) => item.id === activeRestaurantId) || restaurants[0] || null;

  const selectRestaurant = (id: string) => {
    setActiveRestaurantId(id);
    localStorage.setItem('restaurantActiveId', id);
  };

  return {
    scope,
    restaurants,
    activeRestaurant,
    activeRestaurantId: activeRestaurant?.id || null,
    selectRestaurant,
    isLoading,
    error,
    createRestaurant: async (data?: Partial<RestaurantSettings>) => {
      if (!scope) throw new Error('Missing user scope');
      const id = await createRestaurant(scope, data);
      selectRestaurant(id);
      return id;
    },
    updateRestaurant: async (restaurantId: string, data: Partial<RestaurantSettings>) => {
      if (!scope) throw new Error('Missing user scope');
      await updateRestaurant(scope, restaurantId, data);
    },
  };
}
