import { FirebaseTimestamp } from './ecommerce';

export type DietaryTag = 'vegan' | 'vegetarian' | 'glutenFree' | 'spicy' | 'keto' | 'dairyFree' | 'nutFree';

export type RestaurantReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noShow';
export type RestaurantReservationSource = 'manual' | 'website' | 'qrMenu' | 'aiAssistant';

export interface RestaurantSettings {
  id: string;
  tenantId: string;
  ownerId: string;
  name: string;
  logoUrl?: string;
  heroImageUrl?: string;
  address?: string;
  phone?: string;
  cuisineType?: string;
  hours?: string;
  reservationEnabled: boolean;
  maxPartySize: number;
  reservationInterval: number;
  averageTableDuration: number;
  languagesEnabled: string[];
  currency: string;
  serviceFee?: number;
  taxRate?: number;
  qrMenuEnabled: boolean;
  publicSlug: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface RestaurantMenuItem {
  id: string;
  tenantId: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string;
  dietaryTags: DietaryTag[];
  allergens: string[];
  ingredients: string[];
  preparationTime?: number;
  isAvailable: boolean;
  isFeatured: boolean;
  upsellItems: string[];
  aiGenerated: boolean;
  position: number;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface RestaurantReservation {
  id: string;
  tenantId: string;
  restaurantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  time: string;
  partySize: number;
  tablePreference?: string;
  status: RestaurantReservationStatus;
  notes?: string;
  source: RestaurantReservationSource;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface RestaurantMarketingOutput {
  id: string;
  tenantId: string;
  restaurantId: string;
  type: 'instagram' | 'weeklyPromotion' | 'email' | 'smsWhatsapp' | 'birthday' | 'inactiveCustomers';
  prompt: string;
  output: string;
  createdAt: FirebaseTimestamp;
  createdBy: string;
}

export interface RestaurantReviewTemplate {
  id: string;
  tenantId: string;
  restaurantId: string;
  type: 'request' | 'positiveReply' | 'negativeReply';
  title: string;
  content: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface RestaurantAnalyticsEvent {
  id?: string;
  tenantId: string;
  restaurantId: string;
  eventName:
    | 'menu_viewed'
    | 'qr_menu_viewed'
    | 'dish_clicked'
    | 'reservation_started'
    | 'reservation_created'
    | 'ai_menu_generated'
    | 'ai_description_generated';
  metadata?: Record<string, unknown>;
  createdAt?: FirebaseTimestamp;
}

export interface AiRestaurantMenuInput {
  restaurantType: string;
  location: string;
  cuisineStyle: string;
  priceRange: string;
  audience: string;
  language: string;
  notes?: string;
}

export interface AiGeneratedRestaurantMenu {
  categories: Array<{
    name: string;
    items: Array<Partial<RestaurantMenuItem>>;
  }>;
}

export const RESTAURANT_MENU_CATEGORIES = [
  'Appetizers',
  'Main Courses',
  'Desserts',
  'Drinks',
  'Cocktails',
  'Specials',
  'Kids Menu',
];

export const DIETARY_TAG_LABELS: Record<DietaryTag, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  glutenFree: 'Gluten Free',
  spicy: 'Spicy',
  keto: 'Keto',
  dairyFree: 'Dairy Free',
  nutFree: 'Nut Free',
};
