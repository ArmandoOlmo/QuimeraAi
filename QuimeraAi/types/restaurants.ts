import { StoredTimestamp } from './ecommerce';

export type DietaryTag = 'vegan' | 'vegetarian' | 'glutenFree' | 'spicy' | 'keto' | 'dairyFree' | 'nutFree';

export type RestaurantReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noShow';
export type RestaurantReservationSource = 'manual' | 'website' | 'qrMenu' | 'aiAssistant';

export interface RestaurantSettings {
  id: string;
  tenantId: string;
  projectId?: string | null;
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
  source?: 'ai-studio' | 'manual' | 'imported';
  syncKey?: string;
  blueprintId?: string;
  generatedByAI?: boolean;
  needsReview?: boolean;
  userModified?: boolean;
  lockedFromRegeneration?: boolean;
  createdAt: StoredTimestamp;
  updatedAt: StoredTimestamp;
}

export interface RestaurantMenuItem {
  id: string;
  tenantId: string;
  projectId?: string | null;
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
  generatedByAI?: boolean;
  needsReview?: boolean;
  userModified?: boolean;
  lockedFromRegeneration?: boolean;
  source?: 'ai-studio' | 'manual' | 'imported';
  blueprintItemId?: string;
  syncKey?: string;
  priceSource?: 'user-provided' | 'ai-suggested' | 'unset';
  publishStatus?: 'not_published' | 'published';
  availabilityStatus?: 'draft' | 'available' | 'unavailable';
  position: number;
  createdAt: StoredTimestamp;
  updatedAt: StoredTimestamp;
}

export interface RestaurantReservation {
  id: string;
  tenantId: string;
  projectId?: string | null;
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
  syncKey?: string;
  canonicalPath?: string;
  publicReservationId?: string;
  needsReview?: boolean;
  createdAt: StoredTimestamp;
  updatedAt: StoredTimestamp;
}

export interface RestaurantMarketingOutput {
  id: string;
  tenantId: string;
  restaurantId: string;
  type: 'instagram' | 'weeklyPromotion' | 'email' | 'smsWhatsapp' | 'birthday' | 'inactiveCustomers';
  prompt: string;
  output: string;
  createdAt: StoredTimestamp;
  createdBy: string;
}

export interface RestaurantReviewTemplate {
  id: string;
  tenantId: string;
  restaurantId: string;
  type: 'request' | 'positiveReply' | 'negativeReply';
  title: string;
  content: string;
  createdAt: StoredTimestamp;
  updatedAt: StoredTimestamp;
}

export interface RestaurantAnalyticsEvent {
  id?: string;
  tenantId: string;
  restaurantId: string;
  eventName:
    | 'menu_viewed'
    | 'qr_menu_viewed'
    | 'dish_clicked'
    | 'category_clicked'
    | 'call_clicked'
    | 'map_clicked'
    | 'reservation_started'
    | 'reservation_created'
    | 'reservation_confirmed'
    | 'reservation_cancelled'
    | 'review_request_generated'
    | 'catering_offer_clicked'
    | 'gift_card_clicked'
    | 'ai_menu_generated'
    | 'ai_description_generated';
  metadata?: Record<string, unknown>;
  createdAt?: StoredTimestamp;
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
