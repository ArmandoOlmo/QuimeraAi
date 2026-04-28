import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  BarChart3,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock,
  ExternalLink,
  Grid,
  List,
  Loader2,
  Mail,
  Menu as MenuIcon,
  Pencil,
  Phone,
  Plus,
  QrCode,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import DashboardSidebar from '../DashboardSidebar';
import HeaderBackButton from '../../ui/HeaderBackButton';
import ConfirmationModal from '../../ui/ConfirmationModal';
import ImagePickerModal from '../../ui/ImagePickerModal';
import { usePlanAccess } from '../../../hooks/usePlanFeatures';
import { useSafeUpgrade } from '../../../contexts/UpgradeContext';
import { useUI } from '../../../contexts/core/UIContext';
import { useRestaurant } from '../../../hooks/restaurants/useRestaurant';
import { useRestaurantMenu } from '../../../hooks/restaurants/useRestaurantMenu';
import { useRestaurantReservations } from '../../../hooks/restaurants/useRestaurantReservations';
import { generateReservationMessage, generateReviewTemplate, runDishAssistant } from '../../../services/restaurants/restaurantAiService';
import { DIETARY_TAG_LABELS, DietaryTag, RestaurantMenuItem, RestaurantReservation, RESTAURANT_MENU_CATEGORIES } from '../../../types/restaurants';

type RestaurantView = 'overview' | 'menu' | 'digital-menu' | 'reservations' | 'reviews' | 'settings';
type MenuViewMode = 'grid' | 'table';

const premiumPlans = ['individual', 'agency_starter', 'agency_pro', 'agency_scale', 'enterprise'];
const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyDish: Partial<RestaurantMenuItem> = {
  name: '',
  description: '',
  category: 'Main Courses',
  price: 0,
  currency: 'USD',
  dietaryTags: [],
  allergens: [],
  ingredients: [],
  preparationTime: 15,
  isAvailable: true,
  isFeatured: false,
  upsellItems: [],
  aiGenerated: false,
};

const emptyReservation: Partial<RestaurantReservation> = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  date: todayIso(),
  time: '19:00',
  partySize: 2,
  tablePreference: '',
  status: 'pending',
  source: 'manual',
  notes: '',
};

const RestaurantsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { planId, isLoading: isPlanLoading } = usePlanAccess();
  const upgrade = useSafeUpgrade();
  const { setView: setDashboardView } = useUI();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<RestaurantView>(() => (localStorage.getItem('restaurantActiveView') as RestaurantView) || 'overview');
  const restaurantState = useRestaurant();
  const menu = useRestaurantMenu(restaurantState.scope, restaurantState.activeRestaurantId);
  const reservations = useRestaurantReservations(restaurantState.scope, restaurantState.activeRestaurantId);

  const hasAccess = premiumPlans.includes(planId);

  const navItems: Array<{ id: RestaurantView; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: t('restaurants.overview', 'Overview'), icon: BarChart3 },
    { id: 'menu', label: t('restaurants.menu', 'Menu'), icon: Utensils },
    { id: 'digital-menu', label: t('restaurants.digitalMenu', 'Digital Menu'), icon: QrCode },
    { id: 'reservations', label: t('restaurants.reservations', 'Reservations'), icon: Calendar },
    { id: 'reviews', label: t('restaurants.reviews', 'Reviews'), icon: Clipboard },
    { id: 'settings', label: t('restaurants.settings', 'Settings'), icon: Settings },
  ];

  const setView = (view: RestaurantView) => {
    setActiveView(view);
    localStorage.setItem('restaurantActiveView', view);
  };

  const ensureRestaurant = async () => {
    if (!restaurantState.activeRestaurantId) {
      await restaurantState.createRestaurant({ name: t('restaurants.defaultName', 'My Restaurant') });
    }
  };

  React.useEffect(() => {
    if (hasAccess && !restaurantState.isLoading && restaurantState.restaurants.length === 0) {
      ensureRestaurant().catch((err) => toast.error(err.message));
    }
  }, [hasAccess, restaurantState.isLoading, restaurantState.restaurants.length]);

  const publicUrl = restaurantState.activeRestaurantId
    ? `${window.location.origin}/menu/${restaurantState.activeRestaurantId}`
    : '';

  const renderView = () => {
    if (!restaurantState.activeRestaurant) return <EmptyPanel title={t('restaurants.noRestaurant', 'Create your restaurant profile')} action={t('restaurants.createRestaurant', 'Create restaurant')} onAction={() => restaurantState.createRestaurant({ name: t('restaurants.defaultName', 'My Restaurant') })} />;

    switch (activeView) {
      case 'overview':
        return <OverviewView items={menu.items} reservations={reservations.reservations} todayCount={reservations.todayReservations.length} pendingCount={reservations.pendingReservations.length} onNavigate={setView} />;
      case 'menu':
        return <MenuManager menu={menu} restaurantCurrency={restaurantState.activeRestaurant.currency} scope={restaurantState.scope} restaurantId={restaurantState.activeRestaurantId} />;
      case 'digital-menu':
        return <DigitalMenuView restaurant={restaurantState.activeRestaurant} items={menu.availableItems} publicUrl={publicUrl} />;
      case 'reservations':
        return <ReservationsManager reservationsState={reservations} scope={restaurantState.scope} restaurantId={restaurantState.activeRestaurantId} />;
      case 'reviews':
        return <ReviewsAI scope={restaurantState.scope} restaurantId={restaurantState.activeRestaurantId} />;
      case 'settings':
        return <RestaurantSettingsView restaurant={restaurantState.activeRestaurant} onSave={(data) => restaurantState.updateRestaurant(restaurantState.activeRestaurantId!, data)} />;
    }
  };

  if (isPlanLoading || restaurantState.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-q-bg"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen bg-q-bg text-foreground overflow-hidden">
      <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Section Navigation Panel — Desktop only */}
      <div className="hidden md:flex flex-col w-56 lg:w-64 border-r border-q-border bg-q-surface/50 flex-shrink-0 overflow-hidden">
          {/* Panel Header */}
          <div className="h-14 px-4 border-b border-q-border flex items-center gap-2 flex-shrink-0">
              <Utensils size={20} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground truncate">
                  {t('restaurants.title', 'Restaurants')}
              </h2>
          </div>

          {/* Section List */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
              <div className="space-y-0.5">
                  {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                          <button
                              key={item.id}
                              onClick={() => setView(item.id)}
                              className={`
                                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                  ${isActive
                                      ? 'bg-primary/10 text-primary shadow-sm'
                                      : 'text-q-text-muted hover:text-foreground hover:bg-secondary/50'
                                  }
                              `}
                          >
                              <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                              <span className="truncate">{item.label}</span>
                          </button>
                      );
                  })}
              </div>
          </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 px-2 sm:px-6 border-b border-q-border flex items-center bg-q-bg z-20 sticky top-0">
          {/* Left Section - Menu Button & Title */}
          <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <Utensils size={24} className="text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">
                {t('restaurants.title', 'Restaurants')}
              </h1>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {restaurantState.restaurants.length > 1 && (
              <select
                className="bg-muted/50 border border-q-border rounded-lg px-3 py-2 text-sm"
                value={restaurantState.activeRestaurantId || ''}
                onChange={(event) => restaurantState.selectRestaurant(event.target.value)}
              >
                {restaurantState.restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            )}
            <HeaderBackButton onClick={() => setDashboardView('dashboard')} />
          </div>
        </header>

        {/* Mobile Tabs */}
        <div className="md:hidden border-b border-q-border bg-q-bg px-2 py-2">
            <div className="grid grid-cols-3 gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors leading-tight ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-q-text-muted hover:text-foreground hover:bg-secondary/50'
                                }`}
                        >
                            <Icon size={16} className="shrink-0" />
                            <span className="truncate w-full text-center px-0.5">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Content Area */}
        <main id="main-content" className="flex-1 overflow-hidden flex flex-col">
            <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {!hasAccess ? (
                    <div className="max-w-2xl rounded-xl border border-q-border bg-q-surface/70 p-8">
                        <Sparkles className="h-10 w-10 text-primary mb-4" />
                        <h2 className="text-2xl font-bold mb-2">{t('restaurants.premiumGateTitle', 'Restaurants is a premium module')}</h2>
                        <p className="text-q-text-muted mb-6">{t('restaurants.premiumGateDescription', 'Upgrade to manage menus, QR publishing, reservations and restaurant AI workflows.')}</p>
                        <button onClick={() => upgrade?.openUpgradeModal('generic')} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">{t('common.upgrade', 'Upgrade')}</button>
                    </div>
                    ) : (
                    <div className="space-y-6">{renderView()}</div>
                    )}
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) => (
  <div className="rounded-xl border border-q-border bg-q-surface/60 p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-q-text-muted">{label}</p>
      <Icon size={18} className="text-primary" />
    </div>
    <p className="mt-3 text-2xl font-bold">{value}</p>
  </div>
);

const OverviewView = ({ items, reservations, todayCount, pendingCount, onNavigate }: { items: RestaurantMenuItem[]; reservations: RestaurantReservation[]; todayCount: number; pendingCount: number; onNavigate: (view: RestaurantView) => void }) => {
  const { t } = useTranslation();
  const popular = items.filter((item) => item.isFeatured).slice(0, 4);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold">{t('restaurants.overview', 'Overview')}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{t('restaurants.overviewSubtitle', 'Performance and quick actions')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <Stat label={t('restaurants.totalDishes', 'Total dishes')} value={items.length} icon={Utensils} />
        <Stat label={t('restaurants.todayReservations', "Today's reservations")} value={todayCount} icon={Calendar} />
        <Stat label={t('restaurants.pendingReservations', 'Pending reservations')} value={pendingCount} icon={Clipboard} />
        <Stat label={t('restaurants.popularDishes', 'Popular dishes')} value={popular.length} icon={Star} />
        <Stat label={t('restaurants.activePromotions', 'Active promotions')} value="0" icon={Sparkles} />
        <Stat label={t('restaurants.qrScans', 'QR scans')} value="0" icon={QrCode} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['menu', t('restaurants.createDish', 'Create dish'), Plus],
          ['reservations', t('restaurants.createReservation', 'Create reservation'), Calendar],
          ['digital-menu', t('restaurants.publishQr', 'Publish QR menu'), QrCode],
        ].map(([view, label, Icon]) => (
          <button key={view as string} onClick={() => onNavigate(view as RestaurantView)} className="rounded-xl border border-q-border bg-q-surface/60 p-4 text-left hover:bg-muted/60 transition-colors">
            {React.createElement(Icon as React.ElementType, { size: 20, className: 'text-primary mb-3' })}
            <span className="text-sm font-medium">{label as string}</span>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-q-border bg-q-surface/60 p-4">
        <h2 className="font-semibold mb-3">{t('restaurants.popularDishes', 'Popular dishes')}</h2>
        {popular.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{popular.map((item) => <DishMini key={item.id} item={item} />)}</div> : <p className="text-sm text-q-text-muted">{t('restaurants.noFeaturedDishes', 'Feature dishes to surface them here.')}</p>}
      </div>
    </div>
  );
};

const DishMini = ({ item }: { item: RestaurantMenuItem }) => (
  <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
    <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Utensils className="m-3 text-q-text-muted" />}</div>
    <div className="min-w-0 flex-1"><p className="font-medium truncate">{item.name}</p><p className="text-sm text-q-text-muted">{item.currency} {item.price.toFixed(2)}</p></div>
  </div>
);

const MenuManager = ({ menu, restaurantCurrency, scope, restaurantId }: any) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [viewMode, setViewMode] = useState<MenuViewMode>('grid');
  const [editing, setEditing] = useState<Partial<RestaurantMenuItem> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const filtered = menu.items.filter((item: RestaurantMenuItem) => {
    const q = query.toLowerCase();
    return (!q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) && (!category || item.category === category) && (!tag || item.dietaryTags.includes(tag as DietaryTag));
  });

  const runAi = async (item: RestaurantMenuItem, action: string) => {
    const output = await runDishAssistant(scope, restaurantId, action, item, i18n.language);
    await menu.updateItem(item.id, action.includes('description') || action.includes('premium') ? { description: output } : {});
    toast.success(t('restaurants.aiApplied', 'AI output generated'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Utensils className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold">{t('restaurants.menu', 'Menu')}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{menu.items.length} {t('restaurants.dishes', 'dishes')}</p>
        </div>
        <button onClick={() => setEditing({ ...emptyDish, currency: restaurantCurrency })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          {t('restaurants.createDish', 'Create dish')}
        </button>
      </div>
      <div className="rounded-xl border border-q-border bg-q-surface/60 p-5 flex flex-col lg:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 rounded-lg bg-muted/50 px-3 py-2"><Search size={16} className="text-q-text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('restaurants.searchDishes', 'Search dishes...')} className="bg-transparent outline-none flex-1 text-sm" /></div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-muted/50 border border-q-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"><option value="">{t('ecommerce.allCategories', 'All categories')}</option>{RESTAURANT_MENU_CATEGORIES.concat(menu.categories.filter((c: string) => !RESTAURANT_MENU_CATEGORIES.includes(c))).map((cat) => <option key={cat}>{cat}</option>)}</select>
        <select value={tag} onChange={(e) => setTag(e.target.value)} className="bg-muted/50 border border-q-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"><option value="">{t('restaurants.allTags', 'All tags')}</option>{Object.entries(DIETARY_TAG_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <div className="flex rounded-lg bg-muted/50 p-1"><button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}`}><Grid size={18} /></button><button onClick={() => setViewMode('table')} className={`p-2 rounded ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : ''}`}><List size={18} /></button></div>
      </div>
      {filtered.length === 0 ? <EmptyPanel title={t('restaurants.emptyMenu', 'No dishes yet')} action={t('restaurants.createDish', 'Create dish')} onAction={() => setEditing({ ...emptyDish, currency: restaurantCurrency })} /> : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((item: RestaurantMenuItem) => <DishCard key={item.id} item={item} onEdit={() => setEditing(item)} onDelete={() => setDeleteId(item.id)} onToggle={(data) => menu.updateItem(item.id, data)} onAi={runAi} />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-q-border bg-q-surface/60"><table className="w-full text-sm"><tbody>{filtered.map((item: RestaurantMenuItem) => <tr key={item.id} className="border-b border-q-border last:border-0"><td className="p-3 font-medium">{item.name}</td><td className="p-3 text-q-text-muted">{item.category}</td><td className="p-3">{item.currency} {item.price.toFixed(2)}</td><td className="p-3">{item.isAvailable ? t('restaurants.available', 'Available') : t('restaurants.unavailable', 'Unavailable')}</td><td className="p-3 text-right"><button onClick={() => setEditing(item)} className="p-2 hover:bg-muted rounded"><Pencil size={16} /></button></td></tr>)}</tbody></table></div>
      )}
      {editing && <DishForm initial={editing} onClose={() => setEditing(null)} onSave={async (data) => { editing.id ? await menu.updateItem(editing.id, data) : await menu.createItem(data); setEditing(null); toast.success(t('common.saved', 'Saved')); }} />}
      <ConfirmationModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { await menu.deleteItem(deleteId); setDeleteId(null); }} title={t('restaurants.deleteDish', 'Delete dish')} message={t('restaurants.deleteDishConfirm', 'This dish will be removed from the menu.')} confirmText={t('common.delete', 'Delete')} variant="danger" />
    </div>
  );
};

const DishCard = ({ item, onEdit, onDelete, onToggle, onAi }: { item: RestaurantMenuItem; onEdit: () => void; onDelete: () => void; onToggle: (data: Partial<RestaurantMenuItem>) => void; onAi: (item: RestaurantMenuItem, action: string) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-q-border bg-q-surface/60 overflow-hidden">
      <div className="aspect-[4/3] bg-muted">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><Utensils className="text-q-text-muted" /></div>}</div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between gap-3"><div><h3 className="font-semibold">{item.name}</h3><p className="text-sm text-q-text-muted">{item.category}</p></div><p className="font-bold">{item.currency} {item.price.toFixed(2)}</p></div>
        <p className="text-sm text-q-text-muted line-clamp-2">{item.description}</p>
        <div className="flex flex-wrap gap-1">{item.dietaryTags.map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{t(`restaurants.dietaryTagLabels.${tag}`, DIETARY_TAG_LABELS[tag])}</span>)}</div>
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={() => onToggle({ isAvailable: !item.isAvailable })} className="px-3 py-1.5 rounded-lg bg-muted text-xs">{item.isAvailable ? t('restaurants.disable', 'Disable') : t('restaurants.enable', 'Enable')}</button>
          <button onClick={() => onToggle({ isFeatured: !item.isFeatured })} className="px-3 py-1.5 rounded-lg bg-muted text-xs">{item.isFeatured ? t('restaurants.unfeature', 'Unfeature') : t('restaurants.feature', 'Feature')}</button>
          <button onClick={() => onAi(item, 'improve description')} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs">{t('restaurants.aiAssist', 'AI')}</button>
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-muted"><Pencil size={16} /></button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-muted text-red-500"><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
};

const DishForm = ({ initial, onClose, onSave }: { initial: Partial<RestaurantMenuItem>; onClose: () => void; onSave: (data: Partial<RestaurantMenuItem>) => Promise<void> }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<Partial<RestaurantMenuItem>>(initial);
  const update = (key: keyof RestaurantMenuItem, value: any) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-q-border bg-q-bg p-5">
        <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">{form.id ? t('restaurants.editDish', 'Edit dish') : t('restaurants.createDish', 'Create dish')}</h2><button onClick={onClose}><X size={20} /></button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t('restaurants.name', 'Name')} value={form.name || ''} onChange={(v) => update('name', v)} />
          <Select label={t('restaurants.category', 'Category')} value={form.category || ''} onChange={(v) => update('category', v)} options={RESTAURANT_MENU_CATEGORIES} />
          <Input label={t('restaurants.price', 'Price')} type="number" value={String(form.price || 0)} onChange={(v) => update('price', Number(v))} />
          <Input label={t('restaurants.currency', 'Currency')} value={form.currency || 'USD'} onChange={(v) => update('currency', v)} />
          <Input label={t('restaurants.imageUrl', 'Image URL')} value={form.imageUrl || ''} onChange={(v) => update('imageUrl', v)} />
          <Input label={t('restaurants.preparationTime', 'Prep time')} type="number" value={String(form.preparationTime || 0)} onChange={(v) => update('preparationTime', Number(v))} />
          <TextArea className="md:col-span-2" label={t('restaurants.description', 'Description')} value={form.description || ''} onChange={(v) => update('description', v)} />
          <Input label={t('restaurants.ingredients', 'Ingredients')} value={(form.ingredients || []).join(', ')} onChange={(v) => update('ingredients', v.split(','))} />
          <Input label={t('restaurants.allergens', 'Allergens')} value={(form.allergens || []).join(', ')} onChange={(v) => update('allergens', v.split(','))} />
          <Input label={t('restaurants.upsells', 'Upsells')} value={(form.upsellItems || []).join(', ')} onChange={(v) => update('upsellItems', v.split(','))} />
          <div className="space-y-2"><p className="text-sm font-medium">{t('restaurants.dietaryTags', 'Dietary tags')}</p><div className="flex flex-wrap gap-2">{Object.entries(DIETARY_TAG_LABELS).map(([key, label]) => <button key={key} type="button" onClick={() => { const exists = (form.dietaryTags || []).includes(key as DietaryTag); update('dietaryTags', exists ? (form.dietaryTags || []).filter((tag) => tag !== key) : [...(form.dietaryTags || []), key]); }} className={`px-2 py-1 rounded-lg text-xs border ${form.dietaryTags?.includes(key as DietaryTag) ? 'bg-primary text-primary-foreground border-primary' : 'border-q-border bg-muted/40'}`}>{label}</button>)}</div></div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted">{t('common.cancel', 'Cancel')}</button><button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">{t('common.save', 'Save')}</button></div>
      </div>
    </div>
  );
};


const DigitalMenuView = ({ restaurant, items, publicUrl }: { restaurant: any; items: RestaurantMenuItem[]; publicUrl: string }) => {
  const { t } = useTranslation();
  const copy = async () => { await navigator.clipboard.writeText(publicUrl); toast.success(t('common.copied', 'Copied')); };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold">{t('restaurants.digitalMenu', 'Digital Menu')}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{t('restaurants.digitalMenuSubtitle', 'Your public QR code menu link and preview')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="rounded-xl border border-q-border bg-q-surface/60 p-5 space-y-4">
          <button onClick={copy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"><Clipboard size={18} />{t('restaurants.copyMenuLink', 'Copy Menu Link')}</button>
          <button onClick={() => window.open(publicUrl, '_blank')} className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 font-medium hover:bg-muted/80 transition-colors"><ExternalLink size={18} />{t('restaurants.previewPublicMenu', 'Preview Public Menu')}</button>
          <div className="rounded-lg border border-q-border bg-q-bg p-6 text-center mt-4">
            <div className="mx-auto grid h-44 w-44 grid-cols-7 gap-1 rounded bg-white p-3">{Array.from({ length: 49 }).map((_, i) => <span key={i} className={`${(i * 7 + i) % 5 === 0 || i < 7 || i % 7 === 0 ? 'bg-black' : 'bg-white'}`} />)}</div>
            <p className="text-xs text-q-text-muted mt-4">{t('restaurants.qrFallback', 'QR visual fallback. The menu link is ready to copy.')}</p>
          </div>
        </div>
      <PublicMenuPreview restaurant={restaurant} items={items} />
      </div>
    </div>
  );
};

const PublicMenuPreview = ({ restaurant, items }: { restaurant: any; items: RestaurantMenuItem[] }) => {
  const grouped = items.reduce<Record<string, RestaurantMenuItem[]>>((acc, item) => ({ ...acc, [item.category]: [...(acc[item.category] || []), item] }), {});
  return (
    <div className="rounded-xl border border-q-border bg-q-surface/60 overflow-hidden">
      <div className="min-h-56 bg-muted p-6 flex items-end" style={restaurant.heroImageUrl ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.15)), url(${restaurant.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        <div><h2 className="text-3xl font-bold text-white">{restaurant.name}</h2><p className="text-white/80">{restaurant.cuisineType}</p></div>
      </div>
      <div className="p-5 space-y-6">{Object.entries(grouped).map(([cat, catItems]) => <section key={cat}><h3 className="text-xl font-bold mb-3">{cat}</h3><div className="space-y-3">{catItems.map((item) => <DishMini key={item.id} item={item} />)}</div></section>)}</div>
    </div>
  );
};

const ReservationCard = ({ item, onEdit, onUpdateStatus }: { item: RestaurantReservation; onEdit: () => void; onUpdateStatus: (status: string) => void }) => {
  const { t } = useTranslation();
  
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    noShow: 'bg-muted text-q-text-muted border-q-border',
  };

  return (
    <div className="rounded-xl border border-q-border bg-q-surface/60 p-5 space-y-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {item.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{item.customerName}</h3>
            <div className="flex items-center gap-2 text-sm text-q-text-muted mt-0.5">
              <span className="flex items-center gap-1"><Calendar size={14}/> {item.date}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={14}/> {item.time}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Users size={14}/> {item.partySize}</span>
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${statusColors[item.status] || statusColors.pending}`}>
          {t(`restaurants.status.${item.status}`, item.status)}
        </span>
      </div>

      {(item.customerEmail || item.customerPhone || item.notes) && (
        <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-sm">
          {item.customerEmail && <p className="flex items-center gap-2 text-q-text-muted"><Mail size={14}/> {item.customerEmail}</p>}
          {item.customerPhone && <p className="flex items-center gap-2 text-q-text-muted"><Phone size={14}/> {item.customerPhone}</p>}
          {item.notes && <p className="text-q-text-muted italic border-t border-q-border/50 pt-2 mt-2">"{item.notes}"</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-q-border/50">
        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {['confirmed', 'cancelled', 'completed', 'noShow'].map((s) => (
            <button 
              key={s} 
              onClick={() => onUpdateStatus(s)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${item.status === s ? 'bg-primary/20 text-primary pointer-events-none' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
            >
              {t(`restaurants.status.${s}`, s)}
            </button>
          ))}
        </div>
        <button onClick={onEdit} className="p-2 rounded-lg bg-muted hover:bg-primary/20 hover:text-primary transition-colors shrink-0">
          <Pencil size={16} />
        </button>
      </div>
    </div>
  );
};

const ReservationsManager = ({ reservationsState, scope, restaurantId }: any) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Partial<RestaurantReservation> | null>(null);
  const [status, setStatus] = useState('');
  const filtered = reservationsState.reservations.filter((item: RestaurantReservation) => !status || item.status === status);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold">{t('restaurants.reservations', 'Reservations')}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{filtered.length} {t('restaurants.reservations', 'reservations')}</p>
        </div>
        <button onClick={() => setEditing(emptyReservation)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <Plus size={18} />
          {t('restaurants.createReservation', 'Create reservation')}
        </button>
      </div>
      <div className="rounded-xl border border-q-border bg-q-surface/60 p-5">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-muted/50 border border-q-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto mb-4">
          <option value="">{t('restaurants.allStatuses', 'All statuses')}</option>
          {['pending', 'confirmed', 'cancelled', 'completed', 'noShow'].map((s) => <option key={s} value={s}>{t(`restaurants.status.${s}`, s)}</option>)}
        </select>
        {filtered.length === 0 ? (
          <EmptyPanel title={t('restaurants.emptyReservations', 'No reservations yet')} action={t('restaurants.createReservation', 'Create reservation')} onAction={() => setEditing(emptyReservation)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((item: RestaurantReservation) => (
              <ReservationCard key={item.id} item={item} onEdit={() => setEditing(item)} onUpdateStatus={(s) => reservationsState.updateStatus(item.id, s)} />
            ))}
          </div>
        )}
      </div>
      {editing && <ReservationForm initial={editing} onClose={() => setEditing(null)} onAi={async () => toast.success(await generateReservationMessage(scope, restaurantId, 'confirmation', JSON.stringify(editing)))} onSave={async (data) => { editing.id ? await reservationsState.updateReservation(editing.id, data) : await reservationsState.createReservation(data); setEditing(null); toast.success(t('common.saved', 'Saved')); }} />}
    </div>
  );
};

const DAYS_ES = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EditorDatePicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');
  const dayNames = isEs ? DAYS_ES : DAYS_EN;
  const monthNames = isEs ? MONTHS_ES : MONTHS_EN;
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n: number) => String(n).padStart(2, '0');
  const selectedDateStr = value;

  const selectDay = (day: number) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const displayValue = value
    ? (() => {
        const [y, m, d] = value.split('-').map(Number);
        return `${d} ${monthNames[m - 1]?.slice(0, 3)} ${y}`;
      })()
    : '';

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div ref={containerRef} className="relative block space-y-2">
      <span className="text-xs font-bold text-q-text-muted uppercase tracking-wider block">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-md border border-q-border bg-q-bg/80 px-3 py-2 text-sm outline-none transition-colors hover:bg-q-bg focus:ring-2 focus:ring-primary/20"
      >
        <span className={value ? 'text-foreground' : 'text-q-text-muted'}>
          {displayValue || (isEs ? 'Seleccionar fecha' : 'Select date')}
        </span>
        <Calendar size={16} className="text-q-text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[280px] rounded-lg border border-q-border bg-q-surface p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => goMonth(-1)} className="rounded-md p-1 hover:bg-muted text-foreground"><ChevronLeft size={18} /></button>
            <span className="text-sm font-semibold text-foreground">{monthNames[viewMonth]} {viewYear}</span>
            <button type="button" onClick={() => goMonth(1)} className="rounded-md p-1 hover:bg-muted text-foreground"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-semibold text-q-text-muted">
            {dayNames.map(d => <span key={d} className="py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
            {cells.map((day, idx) => {
              if (day === null) return <span key={`e-${idx}`} />;
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              const isPast = new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => selectDay(day)}
                  className={`rounded-md py-1.5 text-sm transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground font-bold' :
                    isPast ? 'text-q-text-muted/40 cursor-default' :
                    isToday ? 'border border-primary font-bold text-primary hover:bg-muted' :
                    'text-foreground hover:bg-muted'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const EditorTimePicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation();
  const times = [];
  for (let h = 8; h <= 23; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }

  return (
    <div className="block space-y-2">
      <span className="text-xs font-bold text-q-text-muted uppercase tracking-wider block">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex w-full appearance-none items-center justify-between rounded-md border border-q-border bg-q-bg/80 px-3 py-2 pr-10 text-sm outline-none transition-colors hover:bg-q-bg focus:ring-2 focus:ring-primary/20"
        >
          <option value="" disabled className="text-q-text-muted">{t('restaurants.selectTime', 'Select time')}</option>
          {times.map(timeStr => <option key={timeStr} value={timeStr}>{timeStr}</option>)}
        </select>
        <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-q-text-muted" />
      </div>
    </div>
  );
};

const ReservationForm = ({ initial, onClose, onSave, onAi }: { initial: Partial<RestaurantReservation>; onClose: () => void; onSave: (data: Partial<RestaurantReservation>) => Promise<void>; onAi: () => Promise<void> }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const set = (key: keyof RestaurantReservation, value: any) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-xl" fullScreenMobile>
      <div className="flex flex-col h-full flex-1 min-h-0 quimera-clean-controls">
        <div className="p-5 border-b border-q-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="text-q-text-muted w-5 h-5" />
            <h2 className="text-xl font-bold">{form.id ? t('restaurants.editReservation', 'Edit reservation') : t('restaurants.createReservation', 'Create reservation')}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-q-text-muted transition-colors"><X size={16} /></button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 custom-scrollbar">
          <div className="flex items-center gap-2 mb-2">
            <Clipboard size={16} className="text-q-text-muted" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-q-text-muted">{t('restaurants.reservationDetails', 'Reservation Details')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t('restaurants.customerName', 'Name')} value={form.customerName || ''} onChange={(v) => set('customerName', v)} />
            <Input label={t('restaurants.customerEmail', 'Email')} value={form.customerEmail || ''} onChange={(v) => set('customerEmail', v)} />
            <Input label={t('restaurants.customerPhone', 'Phone')} value={form.customerPhone || ''} onChange={(v) => set('customerPhone', v)} />
            <Input label={t('restaurants.partySize', 'Party size')} type="number" value={String(form.partySize || 1)} onChange={(v) => set('partySize', Number(v))} />
            <EditorDatePicker label={t('restaurants.date', 'Date')} value={form.date || ''} onChange={(v) => set('date', v)} />
            <EditorTimePicker label={t('restaurants.time', 'Time')} value={form.time || ''} onChange={(v) => set('time', v)} />
            <TextArea className="md:col-span-2" label={t('restaurants.notes', 'Notes')} value={form.notes || ''} onChange={(v) => set('notes', v)} />
          </div>
        </div>

        <div className="p-5 border-t border-q-border flex justify-between gap-2 shrink-0 bg-q-surface">
          <button onClick={onAi} className="px-4 py-2 rounded-md bg-primary/10 text-primary flex items-center gap-2 font-medium hover:bg-primary/20 transition-colors">
            <Sparkles size={16} />{t('restaurants.aiAssist', 'AI Message')}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-muted font-medium hover:bg-muted/80 transition-colors">{t('common.cancel', 'Cancel')}</button>
            <button onClick={() => onSave(form)} className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">{t('common.save', 'Save')}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};


const ReviewsAI = ({ scope, restaurantId }: any) => {
  const { t } = useTranslation();
  return <AiOutputPanel title={t('restaurants.reviewsAiTitle', 'Reviews AI')} subtitle={t('restaurants.reviewsAiSubtitle', 'Draft professional responses to customer reviews')} icon={Clipboard} actions={['request', 'positiveReply', 'negativeReply']} run={(type, context) => generateReviewTemplate(scope, restaurantId, type as any, context)} />;
};

const AiOutputPanel = ({ title, subtitle, actions, run, icon: Icon }: { title: string; subtitle: string; actions: string[]; run: (action: string, context: string) => Promise<string>; icon: React.ElementType }) => {
  const { t } = useTranslation();
  const [action, setAction] = useState(actions[0]);
  const [context, setContext] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="rounded-xl border border-q-border bg-q-surface/60 p-5 space-y-4">
          <Select label={t('restaurants.action', 'Action')} value={action} onChange={setAction} options={actions} />
          <TextArea label={t('restaurants.context', 'Context')} value={context} onChange={setContext} />
          <button disabled={loading} onClick={async () => { setLoading(true); try { setOutput(await run(action, context)); } finally { setLoading(false); } }} className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-primary px-4 py-2.5 mt-4 text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {t('restaurants.generate', 'Generate')}
          </button>
        </div>
        <div className="rounded-xl border border-q-border bg-q-surface/60 p-5 whitespace-pre-wrap text-sm leading-relaxed">
          {output || t('restaurants.aiOutputPlaceholder', 'AI output will appear here.')}
        </div>
      </div>
    </div>
  );
};

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

interface DaySchedule {
  open: boolean;
  openTime: string;
  closeTime: string;
}
type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeekSchedule = WEEK_DAYS.reduce((acc, day) => {
  acc[day] = { open: day !== 'sunday', openTime: '09:00', closeTime: '22:00' };
  return acc;
}, {} as WeekSchedule);

const parseSchedule = (hours?: string): WeekSchedule => {
  if (!hours) return { ...DEFAULT_SCHEDULE };
  try {
    const parsed = JSON.parse(hours);
    if (typeof parsed === 'object' && parsed.monday !== undefined) return parsed;
  } catch { /* not JSON */ }
  return { ...DEFAULT_SCHEDULE };
};

const ImageField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('restaurants.orPasteUrl', 'or paste URL')}
          className="flex-1 rounded-lg border border-q-border bg-muted/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors whitespace-nowrap"
        >
          <Search size={14} />
          {t('restaurants.browseLibrary', 'Browse library')}
        </button>
      </div>
      {value && (
        <div className="relative mt-2 rounded-xl overflow-hidden border border-q-border bg-muted/20 max-w-xs">
          <img src={value} alt={label} className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <p className="text-xs text-white/80">{t('restaurants.currentImage', 'Current image')}</p>
          </div>
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <ImagePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => onChange(url)}
        title={label}
        useProjectLibrary={true}
      />
    </div>
  );
};

const ScheduleEditor = ({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) => {
  const { t } = useTranslation();
  const updateDay = (day: string, patch: Partial<DaySchedule>) => {
    onChange({ ...schedule, [day]: { ...schedule[day], ...patch } });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-q-text-muted">{t('restaurants.scheduleDescription', 'Set your operating hours for each day of the week')}</p>
      <div className="grid gap-2">
        {WEEK_DAYS.map((day) => {
          const d = schedule[day] || DEFAULT_SCHEDULE[day];
          return (
            <div key={day} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${d.open ? 'border-primary/30 bg-primary/5' : 'border-q-border bg-muted/20'
              }`}>
              <button
                onClick={() => updateDay(day, { open: !d.open })}
                className={`shrink-0 w-10 h-6 rounded-full relative transition-colors ${d.open ? 'bg-primary' : 'bg-muted'
                  }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${d.open ? 'left-[18px]' : 'left-0.5'
                  }`} />
              </button>
              <span className={`w-24 text-sm font-medium ${d.open ? 'text-foreground' : 'text-q-text-muted'
                }`}>
                {t(`restaurants.days.${day}`, day)}
              </span>
              {d.open ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={d.openTime}
                    onChange={(e) => updateDay(day, { openTime: e.target.value })}
                    className="bg-muted/40 border border-q-border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-q-text-muted">—</span>
                  <input
                    type="time"
                    value={d.closeTime}
                    onChange={(e) => updateDay(day, { closeTime: e.target.value })}
                    className="bg-muted/40 border border-q-border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : (
                <span className="text-sm text-q-text-muted italic">{t('restaurants.closed', 'Closed')}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RestaurantSettingsView = ({ restaurant, onSave }: { restaurant: any; onSave: (data: any) => Promise<void> }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(restaurant);
  const [schedule, setSchedule] = useState<WeekSchedule>(() => parseSchedule(restaurant.hours));
  const [isSaving, setIsSaving] = useState(false);
  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...form, hours: JSON.stringify(schedule) });
      toast.success(t('common.saved', 'Saved'));
    } finally {
      setIsSaving(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <Icon size={22} className="text-primary" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="text-primary w-6 h-6" />
            <h2 className="text-2xl font-bold text-foreground">{t('restaurants.settingsTitle', 'Restaurant Settings')}</h2>
          </div>
          <p className="text-q-text-muted mt-1">{t('restaurants.settingsSubtitle', 'Manage your restaurant profile and operations')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {t('restaurants.saveSettings', 'Save settings')}
        </button>
      </div>

      {/* Section: General Information */}
      <div className="rounded-xl border border-q-border bg-q-surface/50 p-6">
        <SectionHeader icon={Utensils} title={t('restaurants.sectionGeneral', 'General Information')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label={t('restaurants.restaurantName', 'Restaurant name')} value={form.name || ''} onChange={(v) => set('name', v)} />
          <Input label={t('restaurants.cuisineType', 'Cuisine type')} value={form.cuisineType || ''} onChange={(v) => set('cuisineType', v)} />
          <Input label={t('restaurants.phone', 'Phone')} value={form.phone || ''} onChange={(v) => set('phone', v)} />
          <div>
            <span className="text-sm font-medium block mb-1">{t('restaurants.currency', 'Currency')}</span>
            <select
              value={form.currency || 'USD'}
              onChange={(e) => set('currency', e.target.value)}
              className="w-full rounded-lg border border-q-border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="MXN">MXN — Peso Mexicano</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="COP">COP — Peso Colombiano</option>
              <option value="ARS">ARS — Peso Argentino</option>
              <option value="CLP">CLP — Peso Chileno</option>
            </select>
          </div>
          <TextArea className="md:col-span-2" label={t('restaurants.address', 'Address')} value={form.address || ''} onChange={(v) => set('address', v)} />
        </div>
      </div>

      {/* Section: Branding & Images */}
      <div className="rounded-xl border border-q-border bg-q-surface/50 p-6">
        <SectionHeader icon={Star} title={t('restaurants.sectionBranding', 'Branding & Images')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageField
            label={t('restaurants.logoUrl', 'Logo URL')}
            value={form.logoUrl || ''}
            onChange={(v) => set('logoUrl', v)}
          />
          <ImageField
            label={t('restaurants.heroImageUrl', 'Hero image URL')}
            value={form.heroImageUrl || ''}
            onChange={(v) => set('heroImageUrl', v)}
          />
        </div>
      </div>

      {/* Section: Operating Hours */}
      <div className="rounded-xl border border-q-border bg-q-surface/50 p-6">
        <SectionHeader icon={Calendar} title={t('restaurants.sectionSchedule', 'Operating Hours')} />
        <ScheduleEditor schedule={schedule} onChange={setSchedule} />
      </div>

      {/* Section: Reservations */}
      <div className="rounded-xl border border-q-border bg-q-surface/50 p-6">
        <SectionHeader icon={Settings} title={t('restaurants.sectionReservations', 'Reservations')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Input label={t('restaurants.maxPartySize', 'Max party size')} type="number" value={String(form.maxPartySize || 12)} onChange={(v) => set('maxPartySize', Number(v))} />
            <p className="text-xs text-q-text-muted mt-1">{t('restaurants.maxPartySizeHint', 'Maximum guests per reservation')}</p>
          </div>
          <div>
            <Input label={t('restaurants.reservationInterval', 'Reservation interval')} type="number" value={String(form.reservationInterval || 30)} onChange={(v) => set('reservationInterval', Number(v))} />
            <p className="text-xs text-q-text-muted mt-1">{t('restaurants.reservationIntervalHint', 'Time slot interval in minutes')}</p>
          </div>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {t('restaurants.saveSettings', 'Save settings')}
        </button>
      </div>
    </div>
  );
};

const EmptyPanel = ({ title, action, onAction }: { title: string; action: string; onAction: () => void }) => <div className="rounded-xl border border-dashed border-q-border bg-q-surface/40 p-10 text-center"><Utensils className="mx-auto mb-3 text-q-text-muted" /><h3 className="font-semibold mb-3">{title}</h3><button onClick={onAction} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground"><Plus size={18} />{action}</button></div>;
const Input = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <label className="block space-y-1"><span className="text-sm font-medium">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-q-border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-ring" /></label>;
const TextArea = ({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) => <label className={`block space-y-1 ${className}`}><span className="text-sm font-medium">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-lg border border-q-border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-ring" /></label>;
const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) => <label className="block space-y-1"><span className="text-sm font-medium">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-q-border bg-muted/40 px-3 py-2 outline-none focus:ring-2 focus:ring-ring">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;

export default RestaurantsDashboard;
