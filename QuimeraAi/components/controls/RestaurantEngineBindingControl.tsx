import React, { useMemo } from 'react';
import { Link2, MapPin, RefreshCw, Utensils } from 'lucide-react';
import { useRestaurant } from '../../hooks/restaurants/useRestaurant';
import type { RestaurantSettings } from '../../types/restaurants';
import { applyRestaurantWebsiteBinding } from '../../utils/businessBlueprint/restaurantWebsiteBinding';
import { Select, Input } from '../ui/EditorControlPrimitives';
import { Button } from '../../src/design-system/components';

interface RestaurantEngineBindingControlProps {
  data: any;
  selectedRestaurantId?: string;
  manualPath: string;
  setNestedData: (path: string, value: any) => void;
  t: (key: string, fallback?: string) => string;
}

const restaurantLabel = (restaurant: RestaurantSettings) => [
  restaurant.name,
  restaurant.cuisineType,
  restaurant.address,
].filter(Boolean).join(' - ');

export const RestaurantEngineBindingControl: React.FC<RestaurantEngineBindingControlProps> = ({
  data,
  selectedRestaurantId = '',
  manualPath,
  setNestedData,
  t,
}) => {
  const { restaurants, isLoading } = useRestaurant();

  const selectedRestaurant = useMemo(() => (
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || null
  ), [restaurants, selectedRestaurantId]);

  const availableTargets = {
    includeMenu: Boolean(data?.menu),
    includeReservation: Boolean(data?.restaurantReservation),
    includeMap: Boolean(data?.map),
  };

  const syncRestaurant = (restaurant: RestaurantSettings) => {
    applyRestaurantWebsiteBinding(restaurant, setNestedData, availableTargets);
  };

  const handleSelect = (restaurantId: string) => {
    if (!restaurantId) {
      setNestedData(manualPath, '');
      return;
    }

    const restaurant = restaurants.find((item) => item.id === restaurantId);
    if (restaurant) {
      syncRestaurant(restaurant);
    } else {
      setNestedData(manualPath, restaurantId);
    }
  };

  return (
    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
        <Link2 size={14} />
        {t('restaurant.binding.title', 'Restaurant Engine')}
      </label>

      <Select
        label={t('restaurant.binding.selectLabel', 'Select Restaurant')}
        value={selectedRestaurantId}
        onChange={handleSelect}
        options={[
          { value: '', label: isLoading ? t('common.loading', 'Loading...') : t('restaurant.binding.manualOption', 'Manual ID / slug') },
          ...restaurants.map((restaurant) => ({
            value: restaurant.id,
            label: restaurantLabel(restaurant),
          })),
        ]}
      />

      <Input
        label={t('restaurant.reservation.restaurantIdLabel', 'Restaurant ID')}
        value={selectedRestaurantId}
        onChange={(event) => setNestedData(manualPath, event.currentTarget.value)}
        placeholder={t('restaurant.binding.restaurantIdPlaceholder', 'restaurant id or public slug')}
      />

      {selectedRestaurant ? (
        <div className="rounded-md border border-q-border bg-q-bg/60 p-3 text-xs text-q-text-secondary space-y-2">
          <div className="flex items-center gap-2 text-q-text-primary font-medium">
            <Utensils size={14} />
            <span>{selectedRestaurant.name}</span>
          </div>
          {selectedRestaurant.address && (
            <div className="flex items-start gap-2">
              <MapPin size={13} className="mt-0.5 shrink-0" />
              <span>{selectedRestaurant.address}</span>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            leftIcon={<RefreshCw size={14} />}
            onClick={() => syncRestaurant(selectedRestaurant)}
          >
            {t('restaurant.binding.syncSections', 'Sync menu, reservation and location')}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-q-text-secondary italic">
          {t('restaurant.binding.help', 'Use a Restaurant Engine profile so menu, reservations and location stay connected to real restaurant data.')}
        </p>
      )}
    </div>
  );
};
