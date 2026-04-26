import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, MapPin, Phone, Utensils } from 'lucide-react';
import { doc, getDoc, updateDoc, increment } from '../../../firebase';
import { db } from '../../../firebase';
import { RestaurantMenuItem, RestaurantSettings } from '../../../types/restaurants';

interface PublicRestaurantMenuPayload {
  restaurant?: RestaurantSettings;
  items?: RestaurantMenuItem[];
}

const PublicRestaurantMenuPage: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const [payload, setPayload] = useState<PublicRestaurantMenuPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ref = doc(db, 'publicRestaurantMenus', restaurantId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPayload(snap.data() as PublicRestaurantMenuPayload);
        updateDoc(ref, { qrMenuScans: increment(1) }).catch(() => undefined);
      }
      setIsLoading(false);
    };
    load();
  }, [restaurantId]);

  const grouped = useMemo(() => {
    return (payload?.items || []).reduce<Record<string, RestaurantMenuItem[]>>((acc, item) => {
      acc[item.category] = [...(acc[item.category] || []), item];
      return acc;
    }, {});
  }, [payload?.items]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!payload?.restaurant) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">Menu not found.</div>;
  }

  const restaurant = payload.restaurant;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section
        className="min-h-[44vh] flex items-end px-5 py-8"
        style={restaurant.heroImageUrl ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.2)), url(${restaurant.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--muted)))' }}
      >
        <div className="mx-auto w-full max-w-3xl">
          {restaurant.logoUrl && <img src={restaurant.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover mb-4" />}
          <h1 className="text-4xl font-bold text-white">{restaurant.name}</h1>
          <p className="mt-2 text-white/85">{restaurant.cuisineType}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {restaurant.reservationEnabled && <a href="#reserve" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"><Calendar size={16} />Reserve</a>}
            {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur"><Phone size={16} />Call</a>}
            {restaurant.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur"><MapPin size={16} />Map</a>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-8 space-y-8">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-2xl font-bold mb-4">{category}</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <article key={item.id} className="flex gap-4 rounded-xl border border-border bg-card/60 p-3">
                  <div className="h-24 w-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Utensils className="m-8 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="font-bold whitespace-nowrap">{item.currency} {Number(item.price || 0).toFixed(2)}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.dietaryTags.map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{tag}</span>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {restaurant.reservationEnabled && (
          <div id="reserve" className="rounded-xl border border-border bg-card/60 p-5">
            <h2 className="text-xl font-bold">Reserve a table</h2>
            <p className="mt-2 text-sm text-muted-foreground">Call the restaurant to confirm availability.</p>
            {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-primary-foreground">Call {restaurant.phone}</a>}
          </div>
        )}
      </section>
    </main>
  );
};

export default PublicRestaurantMenuPage;
