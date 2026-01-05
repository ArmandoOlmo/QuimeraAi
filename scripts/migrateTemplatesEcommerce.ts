/**
 * Migration Script: Add Ecommerce Components to All Templates
 * 
 * This script:
 * 1. Adds all ecommerce components to existing templates
 * 2. Applies the template's color scheme to each ecommerce component
 * 3. Updates componentOrder and sectionVisibility
 * 
 * Run from admin panel or browser console when logged in as superadmin
 */

import { db, collection, getDocs, doc, updateDoc } from '../firebase';
import { initialData } from '../data/initialData';

// Types
interface GlobalColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  heading: string;
  border: string;
  success: string;
  error: string;
}

// Ecommerce components to add
const ECOMMERCE_COMPONENTS = [
  'products',
  'storeSettings',
  'featuredProducts',
  'categoryGrid',
  'productHero',
  'saleCountdown',
  'trustBadges',
  'recentlyViewed',
  'productReviews',
  'collectionBanner',
  'productBundle',
  'announcementBar',
] as const;

/**
 * Extract colors from existing template
 * Checks globalColors first, then falls back to header/hero colors
 */
function extractTemplateColors(template: any): GlobalColors {
  // Priority 1: globalColors from theme
  if (template.theme?.globalColors) {
    const gc = template.theme.globalColors;
    return {
      primary: gc.primary || '#4f46e5',
      secondary: gc.secondary || '#10b981',
      accent: gc.accent || '#f59e0b',
      background: gc.background || '#0f172a',
      surface: gc.surface || '#1e293b',
      text: gc.text || '#e2e8f0',
      textMuted: gc.textMuted || '#94a3b8',
      heading: gc.heading || '#f8fafc',
      border: gc.border || '#334155',
      success: gc.success || '#10b981',
      error: gc.error || '#ef4444',
    };
  }

  // Fallback: Build from header/hero colors
  const headerColors = template.data?.header?.colors || {};
  const heroColors = template.data?.hero?.colors || {};

  return {
    primary: headerColors.background || heroColors.primary || '#4f46e5',
    secondary: heroColors.secondary || '#10b981',
    accent: headerColors.accent || heroColors.accent || '#f59e0b',
    background: heroColors.background || '#0f172a',
    surface: '#1e293b',
    text: heroColors.text || headerColors.text || '#e2e8f0',
    textMuted: '#94a3b8',
    heading: heroColors.heading || headerColors.text || '#f8fafc',
    border: '#334155',
    success: '#10b981',
    error: '#ef4444',
  };
}

/**
 * Generate ecommerce component data with template colors applied
 */
function generateEcommerceDataWithColors(colors: GlobalColors) {
  return {
    // Products Grid
    products: {
      title: 'Nuestros Productos',
      subtitle: 'Descubre nuestra selección de productos de alta calidad',
      products: [],
      columns: 4,
      showFilters: true,
      showSearch: true,
      showPagination: true,
      productsPerPage: 12,
      layout: 'grid',
      cardStyle: 'modern',
      showAddToCart: true,
      showQuickView: false,
      showWishlist: false,
      style: 'modern',
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      colors: {
        background: colors.background,
        text: colors.textMuted,
        heading: colors.heading,
        accent: colors.primary,
        cardBackground: colors.surface,
        cardText: colors.textMuted,
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
      },
    },

    // Store Settings
    storeSettings: {
      showFilterSidebar: true,
      showSearchBar: true,
      showSortOptions: true,
      showViewModeToggle: true,
      defaultViewMode: 'grid' as const,
      productsPerPage: 12,
    },

    // Featured Products
    featuredProducts: {
      variant: 'carousel',
      title: 'Productos Destacados',
      description: 'Descubre nuestra selección de productos más populares',
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      sourceType: 'newest',
      categoryId: '',
      productIds: [],
      columns: 4,
      productsToShow: 8,
      autoScroll: true,
      scrollSpeed: 5000,
      showArrows: true,
      showDots: true,
      showBadge: true,
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      showViewAll: true,
      viewAllUrl: '#products',
      cardStyle: 'modern',
      borderRadius: 'xl',
      animationType: 'fade-in-up',
      enableCardAnimation: true,
      colors: {
        background: colors.background,
        heading: colors.heading,
        text: colors.textMuted,
        accent: colors.primary,
        cardBackground: colors.surface,
        cardText: colors.textMuted,
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
        badgeBackground: colors.success,
        badgeText: '#ffffff',
      },
    },

    // Category Grid
    categoryGrid: {
      variant: 'cards',
      title: 'Compra por Categoría',
      description: 'Explora nuestras colecciones',
      categories: [],
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      columns: 4,
      showProductCount: true,
      imageAspectRatio: '1:1',
      imageObjectFit: 'cover',
      borderRadius: 'xl',
      animationType: 'fade-in-up',
      enableCardAnimation: true,
      colors: {
        background: colors.background,
        heading: colors.heading,
        text: colors.textMuted,
        accent: colors.primary,
        cardBackground: colors.surface,
        cardText: '#ffffff',
        overlayStart: 'rgba(0, 0, 0, 0)',
        overlayEnd: 'rgba(0, 0, 0, 0.7)',
      },
    },

    // Product Hero
    productHero: {
      variant: 'featured',
      layout: 'single',
      headline: 'Descubre Nuestra Colección',
      subheadline: 'Productos de alta calidad diseñados para ti',
      buttonText: 'Explorar Ahora',
      buttonUrl: '#products',
      backgroundImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='600' viewBox='0 0 1200 600'%3E%3Crect fill='%231e293b' width='1200' height='600'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 600%3C/text%3E%3C/svg%3E",
      productId: '',
      paddingY: 'lg',
      paddingX: 'md',
      height: 500,
      headlineFontSize: 'xl',
      subheadlineFontSize: 'md',
      overlayStyle: 'gradient',
      overlayOpacity: 50,
      textAlignment: 'left',
      contentPosition: 'left',
      showBadge: true,
      badgeText: '✨ Nuevo',
      buttonBorderRadius: 'xl',
      animationType: 'fade-in-up',
      showAddToCartButton: false,
      addToCartButtonText: 'Añadir al Carrito',
      colors: {
        background: colors.background,
        overlayColor: '#000000',
        heading: '#ffffff',
        text: '#ffffff',
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
        badgeBackground: colors.error,
        badgeText: '#ffffff',
        addToCartBackground: colors.success,
        addToCartText: '#ffffff',
      },
    },

    // Sale Countdown
    saleCountdown: {
      variant: 'banner',
      title: '🔥 ¡Oferta Especial!',
      description: 'No te pierdas nuestras ofertas exclusivas por tiempo limitado',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      paddingY: 'md',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      height: 300,
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
      showProducts: false,
      productsToShow: 4,
      productIds: [],
      badgeText: '🎉 Oferta',
      discountText: 'Hasta 50% OFF',
      borderRadius: 'xl',
      animationType: 'fade-in',
      colors: {
        background: colors.surface,
        heading: '#ffffff',
        text: colors.textMuted,
        accent: colors.error,
        countdownBackground: colors.background,
        countdownText: '#ffffff',
        badgeBackground: colors.error,
        badgeText: '#ffffff',
        buttonBackground: colors.error,
        buttonText: '#ffffff',
      },
    },

    // Trust Badges
    trustBadges: {
      variant: 'horizontal',
      title: '¿Por Qué Elegirnos?',
      badges: [
        { icon: 'truck', title: 'Envío Gratis', description: 'En pedidos superiores a $50' },
        { icon: 'shield', title: 'Pago Seguro', description: 'Transacciones 100% protegidas' },
        { icon: 'refresh-cw', title: 'Devoluciones', description: '30 días de garantía' },
        { icon: 'headphones', title: 'Soporte 24/7', description: 'Atención personalizada' },
      ],
      paddingY: 'md',
      paddingX: 'md',
      titleFontSize: 'md',
      showLabels: true,
      iconSize: 'md',
      borderRadius: 'xl',
      colors: {
        background: colors.surface,
        heading: colors.heading,
        text: colors.textMuted,
        iconColor: colors.primary,
        borderColor: colors.border,
      },
    },

    // Recently Viewed
    recentlyViewed: {
      variant: 'carousel',
      title: 'Vistos Recientemente',
      description: 'Productos que has explorado',
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      maxProducts: 10,
      columns: 5,
      autoScroll: false,
      scrollSpeed: 5000,
      showArrows: true,
      showPrice: true,
      showRating: false,
      cardStyle: 'minimal',
      borderRadius: 'xl',
      animationType: 'fade-in',
      colors: {
        background: colors.background,
        heading: colors.heading,
        text: colors.textMuted,
        accent: colors.primary,
        cardBackground: colors.surface,
        cardText: colors.textMuted,
      },
    },

    // Product Reviews
    productReviews: {
      variant: 'cards',
      title: 'Lo Que Dicen Nuestros Clientes',
      description: 'Opiniones verificadas de compradores reales',
      reviews: [],
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      showRatingDistribution: true,
      showPhotos: true,
      showVerifiedBadge: true,
      showProductInfo: false,
      sortBy: 'newest',
      maxReviews: 6,
      borderRadius: 'xl',
      animationType: 'fade-in-up',
      colors: {
        background: colors.background,
        heading: colors.heading,
        text: colors.textMuted,
        accent: colors.primary,
        cardBackground: colors.surface,
        cardText: colors.textMuted,
        starColor: '#fbbf24',
        verifiedBadgeColor: colors.success,
      },
    },

    // Collection Banner
    collectionBanner: {
      variant: 'hero',
      title: 'Nueva Colección',
      description: 'Descubre lo último en tendencias y estilo',
      backgroundImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='400' viewBox='0 0 1200 400'%3E%3Crect fill='%231e293b' width='1200' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui,sans-serif' font-size='32' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3E1200 × 400%3C/text%3E%3C/svg%3E",
      buttonText: 'Ver Colección',
      buttonUrl: '#products',
      collectionId: '',
      paddingY: 'lg',
      paddingX: 'md',
      height: 400,
      headlineFontSize: 'xl',
      descriptionFontSize: 'md',
      overlayStyle: 'gradient',
      overlayOpacity: 50,
      textAlignment: 'center',
      contentPosition: 'center',
      showButton: true,
      buttonBorderRadius: 'xl',
      animationType: 'fade-in',
      colors: {
        background: colors.background,
        overlayColor: '#000000',
        heading: '#ffffff',
        text: '#ffffff',
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
      },
    },

    // Product Bundle
    productBundle: {
      variant: 'horizontal',
      title: '🎁 Pack Especial',
      description: 'Compra estos productos juntos y ahorra',
      productIds: [],
      discountPercent: 15,
      bundlePrice: 0,
      originalPrice: 0,
      showSavings: true,
      savingsText: 'Ahorra',
      showIndividualPrices: true,
      buttonText: 'Agregar Bundle al Carrito',
      buttonUrl: '',
      showBadge: true,
      badgeText: 'Mejor Precio',
      paddingY: 'lg',
      paddingX: 'md',
      titleFontSize: 'lg',
      descriptionFontSize: 'md',
      borderRadius: 'xl',
      colors: {
        background: colors.surface,
        heading: colors.heading,
        text: colors.textMuted,
        accent: colors.primary,
        cardBackground: colors.background,
        cardText: colors.text,
        priceColor: '#ffffff',
        savingsColor: colors.success,
        buttonBackground: colors.primary,
        buttonText: '#ffffff',
        badgeBackground: colors.success,
        badgeText: '#ffffff',
      },
    },

    // Announcement Bar
    announcementBar: {
      variant: 'static',
      messages: [
        { text: '🚚 ¡Envío gratis en pedidos superiores a $50!', linkText: 'Ver productos', link: '#products' },
        { text: '🎁 Usa el código WELCOME10 para 10% de descuento', linkText: 'Comprar ahora', link: '#products' },
      ],
      paddingY: 'sm',
      paddingX: 'md',
      fontSize: 'sm',
      height: 40,
      showIcon: true,
      icon: 'megaphone',
      dismissible: false,
      speed: 50,
      pauseOnHover: true,
      colors: {
        background: colors.primary,
        text: '#ffffff',
        linkColor: '#ffffff',
        iconColor: '#ffffff',
        borderColor: 'transparent',
      },
    },
  };
}

/**
 * Main migration function
 */
export async function migrateTemplatesWithEcommerce(): Promise<{ updated: number; skipped: number; errors: string[] }> {
  console.log('🚀 Starting ecommerce migration for templates...');
  console.log('📋 Will apply template colors to all ecommerce components\n');

  const results = {
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const templatesCol = collection(db, 'templates');
    const snapshot = await getDocs(templatesCol);

    console.log(`📦 Found ${snapshot.docs.length} templates to process\n`);

    for (const docSnap of snapshot.docs) {
      const template = docSnap.data();
      const templateId = docSnap.id;

      try {
        // Skip deleted templates
        if (template.isDeleted) {
          console.log(`⏭️ Skipping deleted template: ${templateId}`);
          results.skipped++;
          continue;
        }

        console.log(`\n📝 Processing template: "${template.name}" (${templateId})`);

        // 1. Extract colors from template
        const templateColors = extractTemplateColors(template);
        console.log(`   🎨 Extracted colors:`, {
          primary: templateColors.primary,
          secondary: templateColors.secondary,
          background: templateColors.background,
        });

        // 2. Generate ecommerce data with template colors
        const ecommerceData = generateEcommerceDataWithColors(templateColors);

        // 3. Merge with existing data (preserve existing fields)
        const updatedData = {
          ...template.data,
          ...ecommerceData,
        };

        // 4. Update componentOrder (add ecommerce components before footer)
        let updatedComponentOrder = [...(template.componentOrder || initialData.componentOrder)];
        const footerIndex = updatedComponentOrder.indexOf('footer');

        const componentsToAdd = ECOMMERCE_COMPONENTS.filter(
          (c) => !updatedComponentOrder.includes(c)
        );

        if (componentsToAdd.length > 0) {
          if (footerIndex !== -1) {
            updatedComponentOrder.splice(footerIndex, 0, ...componentsToAdd);
          } else {
            updatedComponentOrder.push(...componentsToAdd, 'footer');
          }
          console.log(`   ➕ Added ${componentsToAdd.length} ecommerce components to order`);
        } else {
          console.log(`   ℹ️ Ecommerce components already in order, updating colors only`);
        }

        // 5. Update sectionVisibility - Enable ALL ecommerce components
        const updatedVisibility: Record<string, boolean> = {
          ...(template.sectionVisibility || {}),
        };

        // Enable ALL ecommerce components to be visible
        ECOMMERCE_COMPONENTS.forEach((comp) => {
          updatedVisibility[comp] = true;
        });
        console.log(`   👁️ Enabled visibility for all ${ECOMMERCE_COMPONENTS.length} ecommerce components`);

        // 6. Save to Firestore
        const templateRef = doc(db, 'templates', templateId);
        await updateDoc(templateRef, {
          data: updatedData,
          componentOrder: updatedComponentOrder,
          sectionVisibility: updatedVisibility,
          lastUpdated: new Date().toISOString(),
        });

        console.log(`   ✅ Updated successfully!`);
        results.updated++;

      } catch (templateError: any) {
        console.error(`   ❌ Error processing template ${templateId}:`, templateError.message);
        results.errors.push(`${template.name}: ${templateError.message}`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 Migration complete!`);
    console.log(`   ✅ Updated: ${results.updated} templates`);
    console.log(`   ⏭️ Skipped: ${results.skipped} templates`);
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      results.errors.forEach(err => console.log(`      - ${err}`));
    }
    console.log(`${'='.repeat(50)}`);

    return results;

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    results.errors.push(`Fatal error: ${error.message}`);
    throw error;
  }
}

// Export for use in admin panel
export default migrateTemplatesWithEcommerce;

