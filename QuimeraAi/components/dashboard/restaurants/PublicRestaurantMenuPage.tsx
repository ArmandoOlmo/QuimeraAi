import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Leaf,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Star,
  Utensils,
  X,
} from 'lucide-react';
import { RestaurantMenuItem, RestaurantSettings } from '../../../types/restaurants';
import { createPublicReservation } from '../../../services/restaurants/publicRestaurantService';
import {
  loadPublicRestaurantMenu,
  trackPublicRestaurantMenuEvent,
} from '../../../services/restaurants/publicRestaurantMenuService';
import { Button, IconButton } from '../../../src/design-system/components';

interface PublicRestaurantMenuPayload {
  restaurant: RestaurantSettings;
  items: RestaurantMenuItem[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'menu';

const formatPrice = (item: RestaurantMenuItem) => {
  const price = Number(item.price || 0);
  if (!Number.isFinite(price) || price <= 0) return '';
  return `${item.currency || 'USD'} ${price.toFixed(2)}`;
};

const formatUpdatedAt = (value: unknown) => {
  if (!value) return '';
  const date = typeof value === 'string'
    ? new Date(value)
    : typeof (value as { toDate?: () => Date })?.toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const mapUrl = (address?: string) =>
  address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

const handleInteractiveKey = (event: React.KeyboardEvent, action: () => void) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
};

const PublicRestaurantMenuPage: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [payload, setPayload] = useState<PublicRestaurantMenuPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedDish, setSelectedDish] = useState<RestaurantMenuItem | null>(null);
  const [reservation, setReservation] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    partySize: 2,
    tablePreference: '',
    notes: '',
  });
  const [reservationStatus, setReservationStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [reservationError, setReservationError] = useState('');
  const reservationStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await loadPublicRestaurantMenu(restaurantId);
        if (cancelled) return;
        setPayload(next);
        if (next) {
          setActiveCategory(next.items[0]?.category || '');
          void trackPublicRestaurantMenuEvent(next.restaurant, 'qr_menu_viewed', {
            route: '/menu/:restaurantId',
            restaurantId,
            visibleItems: next.items.length,
          });
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Menu could not be loaded.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const restaurant = payload?.restaurant || null;
  const categories = useMemo(() => {
    const seen = new Set<string>();
    return (payload?.items || []).reduce<string[]>((acc, item) => {
      if (!item.category || seen.has(item.category)) return acc;
      seen.add(item.category);
      acc.push(item.category);
      return acc;
    }, []);
  }, [payload?.items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!payload) return [];
    return payload.items.filter((item) => {
      if (!needle) return true;
      return [
        item.name,
        item.description,
        item.category,
        ...(item.ingredients || []),
        ...(item.allergens || []),
        ...(item.dietaryTags || []),
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [payload, query]);

  const grouped = useMemo(() => {
    return filteredItems.reduce<Record<string, RestaurantMenuItem[]>>((acc, item) => {
      const category = item.category || 'Menu';
      acc[category] = [...(acc[category] || []), item];
      return acc;
    }, {});
  }, [filteredItems]);

  const featuredItems = useMemo(() => filteredItems.filter((item) => item.isFeatured).slice(0, 4), [filteredItems]);

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    restaurant && void trackPublicRestaurantMenuEvent(restaurant, 'category_clicked', { category });
    document.getElementById(`category-${slugify(category)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDishClick = (item: RestaurantMenuItem) => {
    setSelectedDish(item);
    restaurant && void trackPublicRestaurantMenuEvent(restaurant, 'dish_clicked', {
      dishId: item.id,
      dishName: item.name,
      category: item.category,
    });
  };

  const handleReservationStart = () => {
    if (!restaurant || reservationStarted.current) return;
    reservationStarted.current = true;
    void trackPublicRestaurantMenuEvent(restaurant, 'reservation_started', { source: 'qrMenu' });
  };

  const handleReservationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant) return;

    setReservationStatus('submitting');
    setReservationError('');

    try {
      await createPublicReservation(restaurant.id, {
        ...reservation,
        partySize: Number(reservation.partySize),
        source: 'qrMenu',
      });
      setReservationStatus('success');
      setReservation({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        date: '',
        time: '',
        partySize: 2,
        tablePreference: '',
        notes: '',
      });
    } catch (err: any) {
      setReservationError(err.message || 'Reservation could not be created.');
      setReservationStatus('error');
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const lastUpdated = formatUpdatedAt(restaurant?.updatedAt);
  const minPartySize = 1;
  const maxPartySize = Math.max(minPartySize, Number(restaurant?.maxPartySize || 12));

  if (isLoading) {
    return (
      <main className="min-h-screen bg-q-bg text-foreground flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-q-accent" />
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="min-h-screen bg-q-bg text-foreground flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-q-text-muted" />
          <h1 className="text-xl font-semibold">Menu not found</h1>
          <p className="mt-2 text-sm text-q-text-muted">{error || 'This restaurant menu is not available yet.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-q-bg text-foreground pb-24 md:pb-0">
      <section className="relative min-h-[58vh] overflow-hidden bg-q-surface">
        {restaurant.heroImageUrl && (
          <img
            src={restaurant.heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
        <div className="relative mx-auto flex min-h-[58vh] w-full max-w-5xl flex-col justify-end px-5 pb-8 pt-20 md:px-8">
          <div className="max-w-3xl">
            {restaurant.logoUrl && (
              <img src={restaurant.logoUrl} alt="" className="mb-5 h-16 w-16 rounded-lg border border-white/20 object-cover shadow-sm" />
            )}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
              {restaurant.cuisineType && <span>{restaurant.cuisineType}</span>}
              {lastUpdated && <span>Updated {lastUpdated}</span>}
            </div>
            <h1 className="text-4xl font-bold tracking-normal text-white md:text-6xl">{restaurant.name}</h1>
            <div className="mt-5 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
              {restaurant.address && (
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin size={16} className="shrink-0" />
                  <span className="truncate">{restaurant.address}</span>
                </span>
              )}
              {restaurant.hours && (
                <span className="flex min-w-0 items-center gap-2">
                  <Clock size={16} className="shrink-0" />
                  <span className="truncate">{restaurant.hours}</span>
                </span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {restaurant.reservationEnabled && (
                <a
                  href="#reserve"
                  onClick={handleReservationStart}
                  className="inline-flex items-center gap-2 rounded-lg bg-q-accent px-4 py-2.5 text-sm font-semibold text-q-text-on-accent shadow-sm transition hover:opacity-90"
                >
                  <Calendar size={16} />
                  Reserve
                </a>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  onClick={() => void trackPublicRestaurantMenuEvent(restaurant, 'call_clicked', { phone: restaurant.phone })}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Phone size={16} />
                  Call
                </a>
              )}
              {restaurant.address && (
                <a
                  href={mapUrl(restaurant.address)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => void trackPublicRestaurantMenuEvent(restaurant, 'map_clicked', { address: restaurant.address })}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <MapPin size={16} />
                  Map
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 border-b border-q-border bg-q-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3 md:px-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dishes, allergens, ingredients"
              className="w-full rounded-lg border border-q-border bg-q-surface py-2.5 pl-9 pr-3 text-sm text-q-text outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  variant={activeCategory === category ? 'primary' : 'secondary'}
                  size="sm"
                  className="shrink-0"
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        {featuredItems.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Star size={18} className="text-q-accent" />
              <h2 className="text-xl font-semibold">Featured dishes</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleDishClick(item)}
                  onKeyDown={(event) => handleInteractiveKey(event, () => handleDishClick(item))}
                  className="group overflow-hidden rounded-lg border border-q-border bg-q-surface text-left transition hover:border-q-accent/60"
                >
                  <div className="aspect-[4/3] bg-q-surface-overlay">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-q-text-muted">
                        <Utensils size={28} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 font-semibold">{item.name}</p>
                    {formatPrice(item) && <p className="mt-1 text-sm font-semibold text-q-accent">{formatPrice(item)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="rounded-lg border border-q-border bg-q-surface p-8 text-center">
            <Utensils className="mx-auto mb-3 h-8 w-8 text-q-text-muted" />
            <h2 className="text-lg font-semibold">No dishes found</h2>
            <p className="mt-2 text-sm text-q-text-muted">
              {query ? 'Try a different search.' : 'This menu is being prepared.'}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category} id={`category-${slugify(category)}`} className="scroll-mt-32">
                <h2 className="mb-4 text-2xl font-bold">{category}</h2>
                <div className="grid gap-3">
                  {items.map((item) => {
                    const price = formatPrice(item);
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleDishClick(item)}
                        onKeyDown={(event) => handleInteractiveKey(event, () => handleDishClick(item))}
                        className="group flex gap-4 rounded-lg border border-q-border bg-q-surface p-3 text-left transition hover:border-q-accent/60"
                      >
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-q-surface-overlay md:h-28 md:w-28">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-q-text-muted">
                              <Utensils size={26} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold">{item.name}</h3>
                            {price && <p className="shrink-0 text-sm font-bold text-q-accent">{price}</p>}
                          </div>
                          {item.description && <p className="mt-1 line-clamp-2 text-sm text-q-text-muted">{item.description}</p>}
                          <DishBadges item={item} compact />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {restaurant.reservationEnabled && (
          <section id="reserve" className="mt-12 scroll-mt-28 rounded-lg border border-q-border bg-q-surface p-5 md:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-q-accent">Reservations</p>
              <h2 className="mt-1 text-2xl font-bold">Reserve a table</h2>
              <p className="mt-2 text-sm text-q-text-muted">
                Requests are sent to the restaurant dashboard for confirmation.
              </p>
            </div>

            {reservationStatus === 'success' && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-q-success/30 bg-q-success/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-q-success" />
                <p>Your reservation request was received.</p>
              </div>
            )}

            {reservationStatus === 'error' && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-q-error/30 bg-q-error/10 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-q-error" />
                <p>{reservationError}</p>
              </div>
            )}

            <form onSubmit={handleReservationSubmit} onFocus={handleReservationStart} className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Name
                <input
                  required
                  value={reservation.customerName}
                  onChange={(event) => setReservation((current) => ({ ...current, customerName: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <input
                  required
                  type="email"
                  value={reservation.customerEmail}
                  onChange={(event) => setReservation((current) => ({ ...current, customerEmail: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Phone
                <input
                  type="tel"
                  value={reservation.customerPhone}
                  onChange={(event) => setReservation((current) => ({ ...current, customerPhone: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Guests
                <select
                  value={reservation.partySize}
                  onChange={(event) => setReservation((current) => ({ ...current, partySize: Number(event.target.value) }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                >
                  {Array.from({ length: maxPartySize - minPartySize + 1 }, (_, index) => minPartySize + index).map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Date
                <input
                  required
                  type="date"
                  min={today}
                  value={reservation.date}
                  onChange={(event) => setReservation((current) => ({ ...current, date: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Time
                <input
                  required
                  type="time"
                  step={Number(restaurant.reservationInterval || 30) * 60}
                  value={reservation.time}
                  onChange={(event) => setReservation((current) => ({ ...current, time: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
                Notes
                <textarea
                  rows={3}
                  value={reservation.notes}
                  onChange={(event) => setReservation((current) => ({ ...current, notes: event.target.value }))}
                  className="rounded-lg border border-q-border bg-q-bg px-3 py-2.5 text-sm outline-none transition focus:border-q-accent focus:ring-2 focus:ring-q-accent/20"
                />
              </label>
              <Button
                type="submit"
                loading={reservationStatus === 'submitting'}
                className="h-12 md:col-span-2"
                fullWidth
              >
                Send request
              </Button>
            </form>
          </section>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-q-border bg-q-bg/95 p-3 shadow-lg backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {restaurant.reservationEnabled ? (
            <a href="#reserve" onClick={handleReservationStart} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-q-accent px-3 py-2.5 text-sm font-semibold text-q-text-on-accent">
              <Calendar size={16} />
              Reserve
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-q-border bg-q-surface px-3 py-2.5 text-sm font-semibold text-q-text-muted">
              <Calendar size={16} />
              Closed
            </span>
          )}
          {restaurant.phone ? (
            <a href={`tel:${restaurant.phone}`} onClick={() => void trackPublicRestaurantMenuEvent(restaurant, 'call_clicked', { phone: restaurant.phone })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-q-border bg-q-surface px-3 py-2.5 text-sm font-semibold">
              <Phone size={16} />
              Call
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-q-border bg-q-surface px-3 py-2.5 text-sm font-semibold text-q-text-muted">
              <Phone size={16} />
              Call
            </span>
          )}
          {restaurant.address ? (
            <a href={mapUrl(restaurant.address)} target="_blank" rel="noreferrer" onClick={() => void trackPublicRestaurantMenuEvent(restaurant, 'map_clicked', { address: restaurant.address })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-q-border bg-q-surface px-3 py-2.5 text-sm font-semibold">
              <MapPin size={16} />
              Map
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-q-border bg-q-surface px-3 py-2.5 text-sm font-semibold text-q-text-muted">
              <MapPin size={16} />
              Map
            </span>
          )}
        </div>
      </div>

      {selectedDish && (
        <DishDetailModal item={selectedDish} onClose={() => setSelectedDish(null)} />
      )}
    </main>
  );
};

const DishBadges = ({ item, compact = false }: { item: RestaurantMenuItem; compact?: boolean }) => {
  const dietaryTags = item.dietaryTags || [];
  const allergens = item.allergens || [];
  const visibleDietary = compact ? dietaryTags.slice(0, 3) : dietaryTags;
  const visibleAllergens = compact ? allergens.slice(0, 2) : allergens;

  if (visibleDietary.length === 0 && visibleAllergens.length === 0 && !item.isFeatured) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {item.isFeatured && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-q-accent/10 px-2 py-1 text-xs font-medium text-q-accent">
          <Star size={12} />
          Featured
        </span>
      )}
      {visibleDietary.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-q-success/10 px-2 py-1 text-xs font-medium text-q-success">
          <Leaf size={12} />
          {tag}
        </span>
      ))}
      {visibleAllergens.map((allergen) => (
        <span key={allergen} className="inline-flex items-center gap-1 rounded-lg bg-q-warning/10 px-2 py-1 text-xs font-medium text-q-warning">
          <Info size={12} />
          {allergen}
        </span>
      ))}
    </div>
  );
};

const DishDetailModal = ({ item, onClose }: { item: RestaurantMenuItem; onClose: () => void }) => {
  const price = formatPrice(item);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-0 md:items-center md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg border border-q-border bg-q-bg shadow-xl md:rounded-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-q-border bg-q-bg/95 px-4 py-3 backdrop-blur">
          <h2 className="font-semibold">{item.name}</h2>
          <IconButton icon={<X size={18} />} label="Close dish details" onClick={onClose} />
        </div>
        {item.imageUrl && (
          <img src={item.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
        )}
        <div className="space-y-5 p-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-q-accent">{item.category}</p>
                <h3 className="mt-1 text-2xl font-bold">{item.name}</h3>
              </div>
              {price && <p className="shrink-0 text-lg font-bold text-q-accent">{price}</p>}
            </div>
            {item.description && <p className="mt-3 text-sm leading-6 text-q-text-muted">{item.description}</p>}
            <DishBadges item={item} />
          </div>

          {(item.ingredients || []).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Ingredients</h4>
              <p className="text-sm text-q-text-muted">{item.ingredients.join(', ')}</p>
            </div>
          )}

          {(item.upsellItems || []).length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare size={15} />
                Pair it with
              </h4>
              <p className="text-sm text-q-text-muted">{item.upsellItems.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicRestaurantMenuPage;
