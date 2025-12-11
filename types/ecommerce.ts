/**
 * Ecommerce Types
 * Tipos para el sistema de ecommerce multi-tenant
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type FirebaseTimestamp = { seconds: number; nanoseconds: number };

// =============================================================================
// PRODUCTS
// =============================================================================

export interface ProductImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
}

export interface ProductOption {
    name: string;                   // "Color", "Talla"
    values: string[];               // ["Rojo", "Azul", "Verde"]
}

export interface ProductVariant {
    id: string;
    name: string;                   // "Rojo / XL"
    sku?: string;
    price: number;
    compareAtPrice?: number;
    quantity: number;
    options: Record<string, string>; // { color: "Rojo", talla: "XL" }
    imageId?: string;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    
    // Pricing
    price: number;
    compareAtPrice?: number;        // Precio tachado (descuento)
    costPrice?: number;             // Costo (para calcular margen)
    cost?: number;                  // Alias for costPrice
    currency?: string;              // Defaults to store currency
    
    // Inventory
    sku?: string;
    barcode?: string;
    quantity: number;
    trackInventory: boolean;
    lowStockThreshold?: number;
    
    // Media
    images?: ProductImage[];        // Can start empty
    
    // Categorization
    categoryId?: string;
    tags?: string[];
    
    // Variants (tallas, colores, etc.)
    hasVariants?: boolean;          // Defaults to false
    variants?: ProductVariant[];
    options?: ProductOption[];
    
    // SEO
    metaTitle?: string;
    metaDescription?: string;
    
    // Status
    status: ProductStatus;
    isDigital?: boolean;            // Defaults to false
    isFeatured?: boolean;           // Defaults to false
    
    // Shipping
    weight?: number;
    weightUnit?: 'kg' | 'lb' | 'g' | 'oz';
    
    // Timestamps
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
    publishedAt?: FirebaseTimestamp;
}

// =============================================================================
// CATEGORIES
// =============================================================================

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;              // Para subcategorías
    position: number;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// ADDRESSES
// =============================================================================

export interface Address {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
}

// =============================================================================
// ORDERS
// =============================================================================

export type OrderStatus = 
    | 'pending'           // Pendiente de pago
    | 'paid'              // Pagado
    | 'processing'        // En preparación
    | 'shipped'           // Enviado
    | 'delivered'         // Entregado
    | 'cancelled'         // Cancelado
    | 'refunded';         // Reembolsado

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';

export interface OrderItem {
    id: string;
    productId: string;
    variantId?: string;
    name: string;
    productName?: string;  // Alias for name
    variantName?: string;
    sku?: string;
    imageUrl?: string;
    image?: string;  // Alias for imageUrl
    price?: number;  // Alias for unitPrice
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface Order {
    id: string;
    orderNumber: string;            // ORD-001234
    
    // Customer
    customerId?: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    
    // Items
    items: OrderItem[];
    
    // Totals
    subtotal: number;
    discount: number;
    discountCode?: string;
    discountAmount?: number;        // Calculated discount amount
    shippingCost: number;
    taxAmount: number;
    total: number;
    currency: string;
    
    // Addresses
    shippingAddress: Address;
    billingAddress?: Address;
    
    // Status
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    
    // Payment
    paymentMethod: string;          // "stripe", "paypal", "cash"
    paymentIntentId?: string;       // Stripe Payment Intent ID
    paidAt?: FirebaseTimestamp;
    
    // Shipping
    shippingMethod?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;               // Shipping carrier name
    shippedAt?: FirebaseTimestamp;
    deliveredAt?: FirebaseTimestamp;
    
    // Notes
    notes?: string;                 // General notes (alias for internalNotes)
    customerNotes?: string;
    internalNotes?: string;
    
    // Timestamps
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
    cancelledAt?: FirebaseTimestamp;
    refundedAt?: FirebaseTimestamp;
}

// =============================================================================
// CART
// =============================================================================

export interface CartItem {
    productId: string;
    variantId?: string;
    name?: string;          // Product name (legacy)
    productName?: string;   // Alias for name, used in some components
    variantName?: string;
    imageUrl?: string;
    image?: string;         // Alias for imageUrl, used in some components
    quantity: number;
    price: number;
}

export interface Cart {
    id: string;
    userId?: string;                // User ID if logged in
    storeId?: string;               // Store ID for multi-tenant
    customerId?: string;
    sessionId?: string;
    items: CartItem[];
    subtotal: number;
    discountCode?: string;
    discountAmount?: number;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
    expiresAt?: FirebaseTimestamp;
}

// =============================================================================
// CUSTOMERS
// =============================================================================

export interface Customer {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    
    // Stats
    totalOrders: number;
    totalSpent: number;
    lastOrderAt?: FirebaseTimestamp;
    
    // Addresses
    defaultShippingAddress?: Address;
    defaultBillingAddress?: Address;
    addresses: Address[];
    
    // Marketing
    acceptsMarketing: boolean;
    tags?: string[];
    notes?: string;
    
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// DISCOUNTS
// =============================================================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';

export type DiscountAppliesTo = 'all' | 'specific_products' | 'specific_categories' | 'specific_collections';

export type DiscountCustomerEligibility = 'everyone' | 'specific_customers' | 'customer_groups' | 'first_purchase';

export interface BuyXGetYConfig {
    buyQuantity: number;            // Buy X items
    getQuantity: number;            // Get Y items
    getDiscountPercent: number;     // Discount on Y items (100 = free)
    buyProductIds?: string[];       // Specific products to buy
    getProductIds?: string[];       // Specific products to get free/discounted
}

export interface Discount {
    id: string;
    code: string;
    type: DiscountType;
    value: number;                  // 10 para 10% o $10
    
    // Application rules
    appliesTo: DiscountAppliesTo;
    productIds?: string[];          // For specific_products
    categoryIds?: string[];         // For specific_categories
    collectionIds?: string[];       // For specific_collections
    excludeProductIds?: string[];   // Products to exclude
    excludeCategoryIds?: string[];  // Categories to exclude
    
    // Buy X Get Y config
    buyXGetY?: BuyXGetYConfig;
    
    // Limits
    minimumPurchase?: number;       // Minimum cart value
    minimumQuantity?: number;       // Minimum items in cart
    maxUses?: number;               // Total uses allowed
    maxUsesPerCustomer?: number;    // Uses per customer
    usedCount: number;
    
    // Customer eligibility
    customerEligibility: DiscountCustomerEligibility;
    customerIds?: string[];         // For specific_customers
    customerTags?: string[];        // For customer_groups
    
    // Stacking
    canCombine: boolean;            // Can combine with other discounts
    
    // Date range
    startsAt: FirebaseTimestamp;
    endsAt?: FirebaseTimestamp;
    
    // Status
    isActive: boolean;
    isAutomatic: boolean;           // Apply automatically without code
    
    // Metadata
    description?: string;
    internalNotes?: string;
    
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// REVIEWS
// =============================================================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
    id: string;
    productId: string;
    productName?: string;
    userId?: string;
    customerName: string;
    customerEmail: string;
    rating: number;                  // 1-5
    title: string;
    comment: string;
    verifiedPurchase: boolean;
    status: ReviewStatus;
    helpfulVotes: number;
    images?: string[];
    adminResponse?: string;
    adminResponseAt?: FirebaseTimestamp;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

export interface ReviewStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

// =============================================================================
// SHIPPING
// =============================================================================

export interface ShippingRate {
    id: string;
    name: string;                   // "Envío estándar"
    price: number;
    minOrderAmount?: number;        // Envío gratis desde X
    minOrder?: number;              // Alias for minOrderAmount
    estimatedDays?: string;         // "3-5 días"
}

export interface ShippingZone {
    id: string;
    name: string;
    countries: string[];
    rates: ShippingRate[];
}

// =============================================================================
// STOREFRONT THEME
// =============================================================================

/**
 * Complete storefront theme configuration
 * All colors and visual properties that can be customized
 */
export interface StorefrontThemeSettings {
    // Core Colors
    primaryColor: string;           // Main brand color (buttons, links, accents)
    secondaryColor: string;         // Secondary brand color
    accentColor: string;            // Highlight/accent color (badges, sale tags)
    
    // Background Colors
    backgroundColor: string;        // Page background
    cardBackground: string;         // Product cards, category cards
    headerBackground: string;       // Header/navbar background
    footerBackground: string;       // Footer background
    
    // Text Colors
    textColor: string;              // Primary text (descriptions, content)
    headingColor: string;           // Headings, titles
    mutedTextColor: string;         // Secondary/muted text
    linkColor: string;              // Link color
    
    // Button Colors
    buttonBackground: string;       // Primary button background
    buttonText: string;             // Primary button text
    buttonSecondaryBackground: string;  // Secondary button background
    buttonSecondaryText: string;    // Secondary button text
    buttonHoverBackground: string;  // Button hover state
    
    // Badge & Tag Colors
    badgeBackground: string;        // Badge backgrounds (sale, new, etc)
    badgeText: string;              // Badge text
    saleBadgeBackground: string;    // Sale/discount badge
    saleBadgeText: string;          // Sale badge text
    
    // Price Colors
    priceColor: string;             // Regular price color
    salePriceColor: string;         // Sale/discounted price
    originalPriceColor: string;     // Original price (strikethrough)
    
    // Overlay Colors (for image overlays)
    overlayStart: string;           // Gradient start
    overlayEnd: string;             // Gradient end
    
    // Border Colors
    borderColor: string;            // General borders
    dividerColor: string;           // Section dividers
    inputBorderColor: string;       // Form input borders
    
    // State Colors
    successColor: string;           // Success states (in stock, confirmed)
    warningColor: string;           // Warning states (low stock)
    errorColor: string;             // Error states (out of stock, errors)
    infoColor: string;              // Info states
    
    // Cart & Checkout
    cartBadgeBackground: string;    // Cart item count badge
    cartBadgeText: string;          // Cart badge text
    checkoutAccent: string;         // Checkout step accents
    
    // Typography
    fontFamily: string;             // Primary font family
    headingFontFamily: string;      // Heading font family (optional)
    
    // Coolors.co Integration
    coolorsUrl?: string;            // Saved Coolors palette URL
    coolorsColors?: string[];       // Array of colors from Coolors
}

/**
 * Default storefront theme values
 */
export const DEFAULT_STOREFRONT_THEME: StorefrontThemeSettings = {
    // Core Colors
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    
    // Background Colors
    backgroundColor: '#ffffff',
    cardBackground: '#f8fafc',
    headerBackground: '#ffffff',
    footerBackground: '#1f2937',
    
    // Text Colors
    textColor: '#374151',
    headingColor: '#111827',
    mutedTextColor: '#6b7280',
    linkColor: '#6366f1',
    
    // Button Colors
    buttonBackground: '#6366f1',
    buttonText: '#ffffff',
    buttonSecondaryBackground: '#f3f4f6',
    buttonSecondaryText: '#374151',
    buttonHoverBackground: '#4f46e5',
    
    // Badge Colors
    badgeBackground: '#6366f1',
    badgeText: '#ffffff',
    saleBadgeBackground: '#ef4444',
    saleBadgeText: '#ffffff',
    
    // Price Colors
    priceColor: '#111827',
    salePriceColor: '#ef4444',
    originalPriceColor: '#9ca3af',
    
    // Overlay Colors
    overlayStart: 'transparent',
    overlayEnd: 'rgba(0, 0, 0, 0.7)',
    
    // Border Colors
    borderColor: '#e5e7eb',
    dividerColor: '#f3f4f6',
    inputBorderColor: '#d1d5db',
    
    // State Colors
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    infoColor: '#3b82f6',
    
    // Cart & Checkout
    cartBadgeBackground: '#ef4444',
    cartBadgeText: '#ffffff',
    checkoutAccent: '#6366f1',
    
    // Typography
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFontFamily: 'Inter, system-ui, sans-serif',
};

// =============================================================================
// STORE SETTINGS
// =============================================================================

export interface StoreSettings {
    // General
    storeName: string;
    storeEmail: string;
    storePhone?: string;
    storeLogo?: string;
    currency: string;
    currencySymbol: string;
    
    // Storefront Theme
    storefrontTheme?: StorefrontThemeSettings;
    
    // Taxes
    taxEnabled: boolean;
    taxRate: number;
    taxName?: string;
    taxIncluded: boolean;
    taxIncludedInPrice?: boolean;
    
    // Shipping
    shippingZones: ShippingZone[];
    freeShippingThreshold?: number;
    
    // Payments
    stripeEnabled: boolean;
    stripePublishableKey?: string;
    stripeSecretKeyConfigured?: boolean;  // Solo indica si está configurado, no guarda la key
    paypalEnabled: boolean;
    paypalClientId?: string;
    cashOnDeliveryEnabled: boolean;
    
    // Stripe Connect (Multi-tenant)
    stripeConnectAccountId?: string;      // ID de la cuenta conectada del tenant
    stripeConnectStatus?: 'pending' | 'active' | 'restricted'; // Estado de la cuenta
    stripeConnectChargesEnabled?: boolean;  // Puede recibir pagos
    stripeConnectPayoutsEnabled?: boolean;  // Puede recibir transferencias a su banco
    stripeConnectDetailsSubmitted?: boolean; // Completó el onboarding
    stripeConnectCreatedAt?: FirebaseTimestamp;
    
    // Notifications - Admin
    orderNotificationEmail: string;
    lowStockNotifications: boolean;
    lowStockThreshold: number;
    notifyOnNewOrder?: boolean;
    notifyOnLowStock?: boolean;
    
    // Notifications - Customer
    sendOrderConfirmation?: boolean;
    sendShippingNotification?: boolean;
    
    // Checkout
    requirePhone: boolean;
    requireShippingAddress: boolean;
    termsAndConditionsUrl?: string;
    privacyPolicyUrl?: string;
    
    // Timestamps
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

// =============================================================================
// ECOMMERCE ANALYTICS
// =============================================================================

export interface EcommerceStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        totalSold: number;
        revenue: number;
    }>;
    revenueByMonth: Array<{
        month: string;
        revenue: number;
        orders: number;
    }>;
    ordersByStatus: Record<OrderStatus, number>;
}

// =============================================================================
// STOREFRONT COMPONENT (for landing pages)
// =============================================================================

export type ProductsVariant = 'grid' | 'carousel' | 'featured' | 'minimal';

export interface StorefrontProductItem {
    productId: string;
    name: string;
    description: string;
    price: string;
    originalPrice?: string;
    imageUrl: string;
    category?: string;
    inStock?: boolean;
    badgeText?: string;
    buyUrl?: string;
}

// =============================================================================
// ECOMMERCE VIEW TYPES
// =============================================================================

export type EcommerceView = 
    | 'overview'
    | 'products'
    | 'categories'
    | 'orders'
    | 'customers'
    | 'store-users'
    | 'discounts'
    | 'reviews'
    | 'stock_alerts'
    | 'reports'
    | 'analytics'
    | 'settings';

// =============================================================================
// PROJECT ECOMMERCE CONFIG
// =============================================================================

/**
 * Configuración de ecommerce vinculada a un proyecto específico
 * Cada proyecto puede tener su propia tienda de ecommerce
 */
export interface ProjectEcommerceConfig {
    projectId: string;
    projectName: string;
    ecommerceEnabled: boolean;
    storeId: string;              // Igual a projectId para relación 1:1
    storeName: string;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

/**
 * Datos del contexto de ecommerce
 * Usado por el EcommerceContext para pasar info a componentes hijos
 */
export interface EcommerceContextData {
    storeId: string;
    projectId: string | null;
    projectName: string;
}

// =============================================================================
// PUBLIC PRODUCT (for storefront display)
// =============================================================================

/**
 * Public product data for storefront display
 * Simplified version of Product for public access
 */
export interface PublicProduct {
    id: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    price: number;
    compareAtPrice?: number;
    images?: ProductImage[];
    imageUrl?: string;
    categoryId?: string;
    categoryName?: string;          // Populated category name
    tags?: string[];
    status: ProductStatus;
    inStock?: boolean;
    quantity?: number;
    isFeatured?: boolean;
    averageRating?: number;
    reviewCount?: number;
    reviewStats?: ReviewStats;      // Review statistics
    createdAt?: FirebaseTimestamp;
    updatedAt?: FirebaseTimestamp;
}

