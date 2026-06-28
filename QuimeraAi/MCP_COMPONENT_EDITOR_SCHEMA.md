# Esquema del Template Editor — componentes editables vía MCP

Referencia alineada con `types/components.ts` (PageData), `components/controls/sections/*` y `Controls.tsx`. Los agentes MCP deben usar estas **claves y rutas** en `data`, `pages[].sectionData`, `update_project_sections` y `ai_apply_generated_images`.

Guía operativa: [MCP_AGENT_GUIDE.md](./MCP_AGENT_GUIDE.md).

---

## 1. Cómo se estructura un template

```text
projects (fila)
├── component_order: PageSection[]     # orden en home legacy
├── section_visibility: Record<PageSection, boolean>
├── theme: ThemeData                   # tipografía y colores globales
├── brand_identity: BrandIdentity
├── pages[]: SitePage
│   ├── sections: PageSection[]
│   └── sectionData: Partial<PageData>  # mismas claves que data
└── data (columna JSON — snapshot Admin)
    ├── name, status, componentOrder, …
    └── data: PageData                  # ← bloques por sección (hero, features, …)
```

**Clave de sección** = nombre en `componentOrder` / `pages[].sections` (ej. `hero`, `services`, `heroLumina`).

**Ruta MCP** para un campo: `{section}.{path}` — ej. `hero.headline`, `features.items.0.imageUrl`.

**Textos i18n:** muchos campos aceptan `string` o `{ "es": "...", "en": "..." }`.

---

## 2. Controles compartidos (casi todas las secciones)

| Grupo | Campos típicos | Notas |
|-------|----------------|-------|
| Glassmorphism | `glassEffect` | boolean |
| Encabezado | `title`, `description` / `subtitle`, `titleFontSize`, `descriptionFontSize` | I18n |
| Espaciado | `paddingY`, `paddingX` | `sm` \| `md` \| `lg` \| `xl` |
| Colores sección | `colors.background`, `colors.heading`, `colors.text`, `colors.accent`, … | varía por sección |
| Fondo imagen | `backgroundImageUrl`, `backgroundPosition`, `backgroundOverlayEnabled`, `backgroundOverlayOpacity`, `backgroundOverlayColor` | `BackgroundImageControl` |
| Gradiente esquina | `cornerGradient.enabled`, `.position`, `.color`, `.opacity`, `.size` | opcional |
| Animación | `animationType`, `enableCardAnimation` | ver `AnimationControls` |
| Variante layout | `*Variant` (ej. `featuresVariant`, `pricingVariant`) | enum por sección |
| Enlaces CTA | `*Link`, `*LinkType` | `manual` \| `product` \| `collection` \| `section` \| `content` |
| Bordes | `borderRadius`, `buttonBorderRadius`, `cardBorderRadius` | tamaños tema |

**Imágenes MCP:** usar `ai_generate_image` + `ai_apply_generated_images` con `section` + `path` (ver tabla al final).

---

## 3. Globales (fuera de PageData por sección)

### `theme` (columna `theme` + dentro de snapshot)

| Campo | Descripción |
|-------|-------------|
| `pageBackground` | Color fondo página |
| `globalColors.primary` … `success`, `error` | Paleta |
| `fontFamilyHeader`, `fontFamilyBody`, `fontFamilyButton` | Fuentes |
| `fontWeightHeader`, `fontWeightBody`, `fontWeightButton` | 100–900 |
| `fontStyleHeader`, `fontStyleBody`, `fontStyleButton` | normal \| italic |
| `headingsAllCaps`, `buttonsAllCaps`, `navLinksAllCaps` | boolean |
| `cardBorderRadius`, `buttonBorderRadius` | sm \| md \| lg \| xl \| full |
| `paletteColors[]` | hex importados |

### `brand_identity`

| Campo | Descripción |
|-------|-------------|
| `name`, `businessName`, `industry`, `targetAudience` | |
| `toneOfVoice` | Professional \| Playful \| Urgent \| Luxury \| Friendly \| Minimalist |
| `coreValues`, `language`, `logoUrl`, `tagline` | |

### Pseudo-secciones editor

| Clave | Uso |
|-------|-----|
| `colors` | Paleta global (panel Colores) |
| `typography` | Fuentes globales (panel Tipografía) |

### `header` — navegación

| Área | Campos editables |
|------|------------------|
| Layout | `layout`, `style`, `height`, `hoverStyle`, `linkFontSize`, `gradientFadeSize` |
| Logo | `logoType` (text \| image \| both), `logoText`, `logoImageUrl`, `logoWidth`, `logoHeight` |
| Enlaces | `menuId`, `links[]` → `{ text, href, icon }` |
| Login / búsqueda | `showLogin`, `loginText`, `loginUrl`, `showSearch`, `searchPlaceholder`, `showLanguageSelector` |
| CTA barra | `showCta`, `ctaText`, `ctaUrl`, `ctaLinkType`, `buttonBorderRadius` |
| Colores | `colors.background`, `.text`, `.accent`, `.buttonBackground`, `.buttonText`, `.tabActiveColor`, `.tabBorderColor` |

### `footer`

| Área | Campos |
|------|--------|
| Texto | `title`, `description`, `copyrightText`, tamaños fuente |
| Logo | `logoType`, `logoImageUrl` |
| Columnas | `linkColumns[]` → `{ title, links: [{ text, href }], menuId? }` |
| Social | `socialLinks[]` → `{ platform, href }` |
| Contacto | `contactInfo` → address, city, phone, email, `businessHours` por día |
| Estilo | `footerVariant`, `cardGlow`, `hideBranding`, `colors.*` |

### `chatbot` (legacy en PageData; preferir `ai_assistant_config` en fila proyecto)

| Campo | Descripción |
|-------|-------------|
| `welcomeMessage`, `placeholderText`, `knowledgeBase` | |
| `position` | bottom-left \| bottom-right |
| `isActive` | boolean |
| `colors.*` | primary, bubbles, header, input… |

---

## 4. Heroes

### `hero` (clásico)

| Área | Campos |
|------|--------|
| Variante | `heroVariant` — classic, modern, gradient, fitness, editorial, cinematic, minimal, bold, overlap, verticalSplit, glass, stacked |
| Layout texto | `textLayout` — left-top, center, center-bottom, etc. |
| Contenido | `headline`, `subheadline`, `headlineImageUrl`, tamaños fuente |
| CTAs | `primaryCta`, `secondaryCta`, `primaryCtaLink`, `primaryCtaLinkType`, idem secondary |
| Imagen principal | `imageUrl`, `imageStyle`, `imageDropShadow`, `imageBorderRadius`, `imageBorderSize`, `imageBorderColor`, `imageJustification`, `imagePosition`, `imageWidth`, `imageHeight`, `imageHeightEnabled`, `imageAspectRatio`, `imageObjectFit` |
| Fondo | `backgroundImageUrl`, overlay (`backgroundOverlayEnabled`, `backgroundOverlayOpacity`, `backgroundOverlayColor`), `backgroundPosition` |
| Badge | `showBadge`, `badgeText`, `badgeIcon`, `badgeColor`, `badgeBackgroundColor` |
| Altura | `heroHeight` (vh, 0 = auto) |
| Botones | `secondaryButtonStyle`, `secondaryButtonOpacity`, `buttonBorderRadius` |
| Colores | `colors.primary`, `.secondary`, `.background`, `.heading`, `.text`, `.buttonBackground`, `.buttonText`, `.secondaryButtonBackground`, `.secondaryButtonText` |
| Efectos | `gradientOpacity`, `overlayOpacity`, `animationType` |
| Bordes sección | `sectionBorderSize`, `sectionBorderColor`, `paddingY`, `paddingX` |

### `heroSplit`

| Campo | Uso |
|-------|-----|
| `headline`, `subheadline`, `buttonText`, `buttonUrl` | |
| `imageUrl`, `imagePosition` | left \| right |
| `maxHeight`, `angleIntensity` | |
| `colors.textBackground`, `.imageBackground`, `.heading`, `.text`, `.buttonBackground`, `.buttonText` | |
| `cornerGradient` | opcional |
| `backgroundImageUrl` | vía control fondo |

### `heroGallery` / `heroWave` / `heroNova` (slideshow hero)

| Campo | Uso |
|-------|-----|
| `slides[]` | por slide ver abajo |
| Global | `autoPlaySpeed`, `transitionDuration`, `showArrows`, `showDots`, `dotStyle`, `heroHeight`, `overlayOpacity`, `textHorizontalAlign`, `textVerticalAlign`, `buttonBorderRadius`, `colors.*`, `cornerGradient` |
| **Slide** | `headline`, `subheadline`, `primaryCta`, `secondaryCta`, links + linkTypes |
| **Slide imagen** | `backgroundImage` (MCP path: `slides.N.backgroundImage`) |
| **heroWave extra** | `gradientAngle`, `waveShape`, `waveColor`, `gradientColors[]`, `showTextStroke` |
| **heroNova extra** | `displayText`, `showDisplayText`, `mediaType`, `backgroundVideo` por slide |

### `heroLead` (hero + formulario leads)

| Área | Campos |
|------|--------|
| Layout | `formPosition` left \| right, `heroHeight`, `imageUrl`, `imagePosition`, `overlayOpacity` |
| Hero | `headline`, `subheadline`, `badgeText` |
| Formulario | `formTitle`, `formDescription`, placeholders (`namePlaceholder`, `emailPlaceholder`, …), `buttonText`, `successMessage` |
| Campos visibles | `showCompanyField`, `showPhoneField`, `showMessageField` |
| Estilo form | `cardBorderRadius`, `inputBorderRadius`, `buttonBorderRadius`, `formCardOpacity` |
| Colores | `colors.infoBackground`, `.formBackground`, inputs, badge, etc. |
| Fondo | `backgroundImageUrl` en sección |

### `heroLumina`

| Campo | Uso |
|-------|-----|
| `headline`, `subheadline`, `primaryCta`, `secondaryCta`, links | |
| `textLayout`, `glassEffect` | |
| `luminaAnimation` | enabled, colors.bg/primary/accent, pulseSpeed, interactionStrength |
| `colors.*` | panel, botones |
| `backgroundImageUrl` | |

### `heroNeon`

| Campo | Uso |
|-------|-----|
| Fondo global | `backgroundImageUrl`, overlay campos |
| Layout | `textPosition`, `sectionHeight`, `glowIntensity` |
| Slider | `slides[]` → headline, subheadline, `imageUrl`, CTAs + links |
| Decoración | `showTopDots`, `dotColors[]`, `showNeonLines`, `neonLineStyle`, `neonLinePosition`, `neonLineColors[]` |
| Colores | `colors.background`, `.heading`, `.text`, `.neonGlow`, `.cardBackground`, botones |

---

## 5. Contenido marketing (listas y bloques)

### `features`

| Campo | Uso |
|-------|-----|
| `featuresVariant` | classic, modern, bento-premium, bento-overlay, image-overlay, cinematic-gym, neon-glow, press-release, editorial-mosaic |
| Encabezado | `title`, `description`, fuentes |
| Grid | `gridColumns`, `imageHeight`, `imageObjectFit`, `borderRadius` |
| Overlay variant | `overlayTextAlignment`, `showSectionHeader`, `showNumbering`, `layoutAlignment` |
| **items[]** | `title`, `description`, `imageUrl`, `linkUrl`, `linkType`, `linkText` |
| Estilo | `cardGlow`, `animationType`, `enableCardAnimation`, `cornerGradient`, `colors.*`, `backgroundImageUrl` |

### `services`

| Campo | Uso |
|-------|-----|
| `servicesVariant` | cards, grid, minimal, neon-glow |
| Encabezado | `title`, `description` |
| **items[]** | `title`, `description`, `icon` (ServiceIcon enum largo) |
| Estilo | igual patrón compartido |

### `testimonials`

| Campo | Uso |
|-------|-----|
| `testimonialsVariant` | classic, minimal-cards, glassmorphism, gradient-glow, neon-border, floating-cards, gradient-shift, neon-glow, editorial-mosaic |
| **items[]** | `quote`, `name`, `title`, `imageUrl` |
| Tarjetas | `borderRadius`, `cardShadow`, `borderStyle`, `cardPadding`, `cardGlow` |

### `pricing` / `pricingLumina` / `pricingNeon`

| Campo | Uso |
|-------|-----|
| `pricingVariant` | dark-saas-cards, featured-plan, voice-credit-columns, dark-plan-cards, finance-comparison, subscription-shop, bi-panels, grouped-plan-grid, workflow-rows, addon-cards |
| Encabezado | `title`, `description`, `cardsAlignment` |
| **tiers[]** | `name`, `price`, `frequency`, `description`, `features[]` (strings), `buttonText`, `buttonLink`, `featured`, `badge`, `eyebrow`, `footerText`, `imageUrl`, `secondaryButtonText`, `secondaryButtonLink` |
| Colores | `background`, `text`, `mutedText`, `heading`, `description`, `accent`, `borderColor`, `cardBackground`, `cardHeading`, `cardText`, `priceColor`, `buttonBackground`, `buttonText`, `checkmarkColor`, `gradientStart`, `gradientEnd`, `panelBackground`, `panelText`, `surfaceAlt`, `featuredBackground`, `featuredText`, `badgeBackground`, `badgeText`, `dividerColor`, `imageOverlay` |
| Lumina | `luminaAnimation` + campos específicos del control Lumina |

### `faq` / `faqLumina` / `faqNeon`

| Campo | Uso |
|-------|-----|
| `faqVariant` | classic, cards, gradient, minimal |
| **items[]** | `question`, `answer` |

### `portfolio` / `portfolioLumina` / `portfolioNeon`

| Campo | Uso |
|-------|-----|
| `portfolioVariant` | classic, image-overlay |
| **items[]** | `title`, `description`, `imageUrl`, `linkUrl`, `linkType`, `linkText` |
| Grid | `gridColumns`, `imageHeight`, `overlayTextAlignment`, `showSectionHeader` |

### `team`

| Campo | Uso |
|-------|-----|
| `teamVariant` | classic, cards, minimal, overlay |
| **items[]** / `members` | `name`, `role`, `imageUrl`, `bio`, `linkUrl`, `linkType` |

### `howItWorks`

| Campo | Uso |
|-------|-----|
| `steps` | número 3 o 4 |
| **items[]** | `title`, `description`, `icon` |
| Colores paso | `colors.stepTitle`, `.iconColor` |

### `slideshow`

| Campo | Uso |
|-------|-----|
| `slideshowVariant` | classic, kenburns, cards3d, thumbnails |
| **items[]** | `imageUrl`, `altText`, `caption` |
| Player | `autoPlaySpeed`, `transitionEffect`, `transitionDuration`, `showArrows`, `showDots`, `arrowStyle`, `dotStyle`, `kenBurnsIntensity`, `thumbnailSize`, `showCaptions`, `slideHeight` |

### `video`

| Campo | Uso |
|-------|-----|
| `title`, `description` | |
| `source` | youtube \| vimeo \| upload |
| `videoId`, `videoUrl` | |
| `autoplay`, `loop`, `showControls` | |

---

## 6. Conversión y formularios

### `leads`

| Campo | Uso |
|-------|-----|
| `leadsVariant` | classic, split-gradient, floating-glass, minimal-border |
| Copy | `title`, `description`, `buttonText` |
| Placeholders | `namePlaceholder`, `emailPlaceholder`, `companyPlaceholder`, `messagePlaceholder` |
| Estilo | `cardBorderRadius`, `inputBorderRadius`, `buttonBorderRadius`, `colors` (inputs, gradientes), `cornerGradient` |

### `newsletter`

| Campo | Uso |
|-------|-----|
| `title`, `description`, `placeholderText`, `buttonText` | |
| `cardOpacity`, `showCardBorder` | |
| Colores tarjeta e inputs | `colors.*` |

### `cta` / `ctaLumina` / `ctaNeon`

| Campo | Uso |
|-------|-----|
| `title` / `headline`, `description` / `subheadline` | |
| `buttonText`, `buttonUrl`, `secondaryText` | |
| `showAccent`, `accentText` | |
| `cardOpacity`, `showCardBorder` | |
| Colores | gradientes (`gradientStart`, `gradientEnd`) o palette Neon/Lumina |

### `signupFloat` (overlay flotante)

| Campo | Uso |
|-------|-----|
| Contenido | `headerText`, `descriptionText`, `imageUrl`, `imagePlacement` |
| Formulario | `showNameField`, `showEmailField`, `showPhoneField`, `showMessageField`, placeholders, `buttonText` |
| Social | `socialLinks[]`, `showSocialLinks` |
| Comportamiento | `floatPosition`, `showOnLoad`, `showCloseButton`, `triggerDelay`, `cooldownDays`, `minimizeOnClose`, `minimizedLabel` |
| CRM | `saveDestination` leads \| audience \| both, `targetAudienceId` |
| Estilo | `width`, `borderRadius`, `buttonBorderRadius`, `imageHeight`, `colors.*` |

---

## 7. Utilidades visuales

### `banner`

| Campo | Uso |
|-------|-----|
| `bannerVariant` | classic, gradient-overlay, side-text, centered |
| `headline`, `subheadline`, `buttonText`, `buttonUrl`, `showButton` | |
| **Imagen** | `backgroundImageUrl` (obligatoria en tipo) |
| `overlayEnabled`, `backgroundOverlayOpacity`, `height`, `textAlignment` |

### `topBar`

| Campo | Uso |
|-------|-----|
| `messages[]` | `text`, `icon`, `link`, `linkText`, `linkType` |
| Scroll | `scrollEnabled`, `scrollSpeed`, `pauseOnHover`, `dismissible` |
| Estilo | `useGradient`, `gradientFrom`, `gradientTo`, `gradientAngle`, `backgroundColor`, `textColor`, `linkColor`, `iconColor`, `fontSize`, `separator`, `height`, `aboveHeader` |

### `logoBanner`

| Campo | Uso |
|-------|-----|
| `title`, `subtitle` | |
| **logos[]** | `imageUrl`, `alt`, `link`, `linkText`, `linkType` |
| Carrusel | `scrollEnabled`, `scrollSpeed`, `logoHeight`, `logoGap`, `grayscale` |
| Fondo | `backgroundImageUrl`, overlay, gradientes |

### `separator1` … `separator5`

| Campo | Uso |
|-------|-----|
| `height` | px |
| `color` / `colors` | |
| `backgroundImageUrl`, overlay, `backgroundPosition` | |

### `map`

| Campo | Uso |
|-------|-----|
| `title`, `description`, `address`, `lat`, `lng`, `zoom` | |
| `mapVariant` | modern, minimal, dark-tech, retro, night, card-overlay |
| `height`, `borderRadius`, `phone`, `email`, `businessHours`, `buttonText` | |
| `apiKey` | override mapa |

### `menu` (restaurante)

| Campo | Uso |
|-------|-----|
| `menuVariant` | classic, modern-grid, elegant-list, full-image, text-only, editorial-mosaic |
| **items[]** | `name`, `description`, `price`, `imageUrl`, `category`, `isSpecial` |
| `dataSource` | manual \| restaurant, `restaurantId` |
| `showCategories`, `showIcon`, `icon` | |

### `restaurantReservation`

| Campo | Uso |
|-------|-----|
| Copy | `title`, `subtitle`, `description`, `buttonText`, `successMessage` |
| Campos | `showPhone`, `showNotes`, `showTablePreference`, `maxPartySize`, `minPartySize` |
| `restaurantId`, `backgroundImageUrl`, overlay, `borderRadius`, `animationType` |

### `products` (grid tienda embebido)

| Campo | Uso |
|-------|-----|
| `title`, `subtitle` | |
| **products[]** | `id`, `name`, `description`, `price`, `compareAtPrice`, `image`, `category`, `inStock`, `rating`, `slug` |
| Layout | `columns`, `layout`, `cardStyle`, `showFilters`, `showSearch`, `showPagination`, `productsPerPage` |
| Acciones | `showAddToCart`, `showQuickView`, `showWishlist`, `style` |

### `cmsFeed` (blog posts del proyecto)

| Campo | Uso |
|-------|-----|
| `title`, `description`, tamaños | |
| `layout` | grid \| list \| carousel \| magazine |
| `columns`, `cardStyle`, `postsToShow`, `showFeaturedImage`, `showExcerpt`, `showDate`, `showAuthor`, `showCategory` | |
| `glassEffect`, colores | |

### `realEstateListings`

| Campo | Uso |
|-------|-----|
| `title`, `subtitle`, `buttonText`, `buttonLink`, `leadLink` | |
| Listado | `maxItems`, `featuredOnly`, `showPrice`, `showLocation`, `showStats`, `showDescription` |
| Estilo | `paddingY`, `paddingX`, `cardBorderRadius`, `buttonBorderRadius`, `colors.*`, `backgroundImageUrl`, overlay |

---

## 8. Ecommerce (secciones tienda)

Todas admiten `visibleIn`: `landing` \| `store` \| `both` salvo nota.

### `announcementBar`

| Campo | Uso |
|-------|-----|
| `variant` | static \| scrolling \| rotating |
| `messages[]` | `text`, `link`, `linkText`, `linkType` |
| `position` | above-header \| in-content |
| `showIcon`, `icon`, `dismissible`, `speed`, `pauseOnHover`, `height`, `colors.*` |

### `featuredProducts`

| Campo | Uso |
|-------|-----|
| `variant` | carousel \| grid \| showcase |
| `sourceType` | manual \| category \| bestsellers \| newest \| on-sale |
| `categoryId`, `productIds[]`, `columns`, `productsToShow` | |
| Carousel | `autoScroll`, `scrollSpeed`, `showArrows`, `showDots` |
| Display | `showBadge`, `showPrice`, `showRating`, `showAddToCart`, `showViewAll`, `viewAllUrl` |
| `cardStyle`, `cardGap`, animación, `colors.*` |

### `categoryGrid`, `productHero`, `saleCountdown`, `trustBadges`, `recentlyViewed`, `productReviews`, `collectionBanner`, `productBundle`

Editables vía paneles en editor (hooks en `Controls.tsx`). Campos principales en `types/components.ts`:

- **categoryGrid:** categorías, columnas, estilo tarjeta, colores.
- **productHero:** imagen hero producto, CTA, overlay.
- **saleCountdown:** fecha fin, copy, urgencia, colores.
- **trustBadges:** badges[] icono + texto.
- **recentlyViewed / productReviews:** toggles visualización, límites, estilo.
- **collectionBanner:** imagen fondo, título, colección destino.
- **productBundle:** `productIds[]`, `discountPercent`, precios bundle, `buttonText`, badge.

### `storeSettings`

Filtros tienda: `showFilterSidebar`, `showSearchBar`, `showSortOptions`, `gridColumns`, `productsPerPage`, `cardStyle`, `infiniteScroll`, `cartDrawerColors`, etc. (ver `StoreSettingsData`).

### Páginas dinámicas (en `pages` + sectionData)

| Sección | Campos clave |
|---------|----------------|
| `productDetail` | showGallery, showVariants, showDescription, showRelatedProducts, galleryLayout, colors |
| `categoryProducts` | showCategoryHero, showFilters, productsPerPage, columns, cardStyle |
| `articleContent` | showFeaturedImage, showAuthor, showDate, showTags, showRelatedArticles, maxWidth |
| `productGrid` | sourceType, categoryId, productIds, filtros, paginación |
| `cart` | showSummary, showSuggestions, showCouponInput, showShippingEstimate |
| `checkout` | showOrderSummary, paymentMethods[], requiredFields, layout |

### `productDetailPage` (colores vista detalle)

`colors.*` para fondo, precios, botones, badges, estrellas.

---

## 9. Suites Lumina y Neon (resumen)

| Sección | Campos extra vs clásico |
|---------|-------------------------|
| `featuresLumina`, `ctaLumina`, etc. | `luminaAnimation` (WebGL), paleta Lumina en `colors` |
| `featuresNeon`, `ctaNeon`, etc. | `cardGlow`, bordes neon, variantes glow |
| `testimonialsLumina` | items + animación Lumina |
| `portfolioLumina` | items con estilo panel Lumina |

Estructura de **items** igual que equivalente clásico (features → items con title/description/imageUrl).

---

## 10. Suite Quimera marketing (`heroQuimera`, `featuresQuimera`, …)

Tipos en `PageSection` para landing de producto Quimera. Controles detallados en `components/controls/landing/LandingQuimeraControls.tsx` (editor landing, no siempre en árbol template estándar).

Si el template incluye estas claves en `componentOrder`, el agente puede poblar:

- **heroQuimera:** `badgeText`, `title`, `subtitle`, `buttonText`, `buttonLink`, `secondaryButtonText`, `secondaryButtonLink`, `sectionHeight`, alineación, `showDecoration`, `showParticles`, `glassEffect`, `textDropShadow`, colores y overlay.
- Secciones hermanas (`featuresQuimera`, `pricingQuimera`, `testimonialsQuimera`, `faqQuimera`, `ctaQuimera`, `platformShowcaseQuimera`, …): seguir patrones del control landing (título, items[], CTAs, overlays).

Consultar `LandingQuimeraControls.tsx` para lista exacta por bloque marketing.

---

## 11. Rutas de imagen para `ai_apply_generated_images`

| Sección | path MCP frecuentes |
|---------|---------------------|
| `hero` | `imageUrl`, `headlineImageUrl`, `backgroundImageUrl` |
| `heroSplit` | `imageUrl`, `backgroundImageUrl` |
| `heroGallery` / `heroWave` | `slides.0.backgroundImage` |
| `heroNova` | `slides.0.backgroundImage` o `slides.0.backgroundVideo` (URL video) |
| `heroLead` | `imageUrl`, `backgroundImageUrl` |
| `heroNeon` | `backgroundImageUrl`, `slides.N.imageUrl` |
| `features` | `items.N.imageUrl`, `backgroundImageUrl` |
| `services` | `backgroundImageUrl` (sin imagen por ítem salvo variantes) |
| `testimonials` | `items.N.imageUrl` |
| `team` | `items.N.imageUrl` |
| `portfolio` | `items.N.imageUrl` |
| `slideshow` | `items.N.imageUrl` |
| `menu` | `items.N.imageUrl` |
| `banner` | `backgroundImageUrl` |
| `logoBanner` | `logos.N.imageUrl`, `backgroundImageUrl` |
| `header` / `footer` | `logoImageUrl` |
| `separator*` | `backgroundImageUrl` |
| `realEstateListings` | `backgroundImageUrl` |
| `restaurantReservation` | `backgroundImageUrl` |
| `signupFloat` | `imageUrl` |
| Template metadata | usar `update_template` → `thumbnailUrl` (no `ai_apply`) |

---

## 12. Patrones MCP recomendados

### Merge parcial de sección

```json
{
  "tenantId": "...",
  "projectId": "...",
  "sections": {
    "hero": {
      "headline": { "es": "Bienvenido", "en": "Welcome" },
      "imageUrl": "https://..."
    }
  }
}
```

Tool: `update_project_sections` o `update_template` con `data` = objeto PageData parcial.

### Añadir ítem a lista

1. `get_template` / `get_project` → leer `features.items.length`
2. Enviar sección completa con `items` actualizado o merge profundo manual
3. Para índice N: path `features.items.N.title`

### Orden y visibilidad

```json
{
  "componentOrder": ["header", "hero", "services", "testimonials", "leads", "footer"],
  "sectionVisibility": { "header": true, "hero": true, "map": false }
}
```

---

## 13. Verificación

Tras editar, `get_template` debe mostrar:

- Cada clave en `componentOrder` presente en `data.data` (o `pages[].sectionData`)
- Campos de imagen con URL https (no `pending:placeholder` en producción)
- `contentSummary.dataKeyCount` coherente con secciones visibles

---

## Fuente de verdad en código

| Recurso | Ubicación |
|---------|-----------|
| Tipos PageData | `types/components.ts` → `PageData` |
| Tipos sección | mismas interfaces (`HeroData`, `FeaturesData`, …) |
| Controles UI | `components/controls/sections/*Controls.tsx` |
| Registro editor | `components/controls/Controls.tsx` → `sectionConfig` + `switch` |
| Asistente global (rutas dot) | `GlobalAiAssistant.tsx` → `DATA_SCHEMA_HINT` |

Actualizar este documento cuando se añadan secciones nuevas a `PageSection` y sus controles.
