import { useEffect, useMemo, useState } from 'react';
import { RestaurantReservation, RestaurantReservationStatus } from '../../types/restaurants';
import { RestaurantScope } from '../../services/restaurants/restaurantPaths';
import { createReservation, listenReservations, updateReservation, updateReservationStatus } from '../../services/restaurants/restaurantReservationService';

const todayIso = () => new Date().toISOString().slice(0, 10);

export function useRestaurantReservations(scope: RestaurantScope | null, restaurantId?: string | null) {
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scope || !restaurantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return listenReservations(
      scope,
      restaurantId,
      (next) => {
        setReservations(next);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [scope, restaurantId]);

  const todayReservations = useMemo(() => reservations.filter((item) => item.date === todayIso()), [reservations]);
  const pendingReservations = useMemo(() => reservations.filter((item) => item.status === 'pending'), [reservations]);

  return {
    reservations,
    todayReservations,
    pendingReservations,
    isLoading,
    error,
    createReservation: async (data: Partial<RestaurantReservation>) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return createReservation(scope, restaurantId, data);
    },
    updateReservation: async (reservationId: string, data: Partial<RestaurantReservation>) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return updateReservation(scope, restaurantId, reservationId, data);
    },
    updateStatus: async (reservationId: string, status: RestaurantReservationStatus) => {
      if (!scope || !restaurantId) throw new Error('Missing restaurant scope');
      return updateReservationStatus(scope, restaurantId, reservationId, status);
    },
  };
}
