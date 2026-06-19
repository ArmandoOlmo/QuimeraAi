import type { StorefrontInspectorControl } from '../../types/storefrontEditor';

export const COMMON_VISIBILITY_CONTROLS: StorefrontInspectorControl[] = [
    {
        key: 'visibleIn',
        label: 'Visible en',
        type: 'select',
        options: [
            { label: 'Landing + tienda', value: 'both' },
            { label: 'Tienda', value: 'store' },
            { label: 'Landing', value: 'landing' },
        ],
    },
    { key: 'enabled', label: 'Activo', type: 'toggle' },
];

export const COMMON_LAYOUT_CONTROLS: StorefrontInspectorControl[] = [
    {
        key: 'width',
        label: 'Ancho',
        type: 'select',
        options: [
            { label: 'Página', value: 'page' },
            { label: 'Completo', value: 'full' },
        ],
    },
    { key: 'paddingTop', label: 'Padding superior', type: 'range', min: 0, max: 120, step: 4 },
    { key: 'paddingBottom', label: 'Padding inferior', type: 'range', min: 0, max: 120, step: 4 },
    { key: 'colorScheme', label: 'Color scheme', type: 'colorScheme' },
];

export const HERO_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'headline', label: 'Título', type: 'text' },
    { key: 'subheadline', label: 'Subtítulo', type: 'textarea' },
    {
        key: 'mediaType',
        label: 'Tipo de media',
        type: 'select',
        options: [
            { label: 'Imagen', value: 'image' },
            { label: 'Video', value: 'video' },
        ],
    },
    { key: 'imageUrl', label: 'Imagen', type: 'image' },
    { key: 'overlayOpacity', label: 'Overlay', type: 'range', min: 0, max: 90, step: 5 },
    {
        key: 'textPosition',
        label: 'Posición texto',
        type: 'alignment',
        options: [
            { label: 'Izquierda', value: 'left' },
            { label: 'Centro', value: 'center' },
            { label: 'Derecha', value: 'right' },
        ],
    },
    { key: 'height', label: 'Altura', type: 'range', min: 320, max: 760, step: 20 },
    { key: 'buttonText', label: 'Texto botón', type: 'text' },
    { key: 'buttonUrl', label: 'Link botón', type: 'link' },
    { key: 'contentWidth', label: 'Ancho de contenido', type: 'range', min: 360, max: 960, step: 20 },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const CATEGORY_TILES_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'description', label: 'Subtítulo', type: 'textarea' },
    {
        key: 'variant',
        label: 'Layout',
        type: 'layout',
        options: [
            { label: 'Grid', value: 'cards' },
            { label: 'Carrusel', value: 'carousel' },
            { label: 'Overlay', value: 'overlay' },
            { label: 'Minimal', value: 'minimal' },
        ],
    },
    { key: 'carouselOnMobile', label: 'Carrusel móvil', type: 'toggle' },
    { key: 'columns', label: 'Columnas desktop', type: 'number', min: 2, max: 6, step: 1 },
    { key: 'mobileColumns', label: 'Columnas móvil', type: 'number', min: 1, max: 2, step: 1 },
    { key: 'horizontalGap', label: 'Gap horizontal', type: 'range', min: 0, max: 48, step: 4 },
    { key: 'verticalGap', label: 'Gap vertical', type: 'range', min: 0, max: 48, step: 4 },
    {
        key: 'carouselNavigationIcon',
        label: 'Navegación',
        type: 'select',
        options: [
            { label: 'Flechas', value: 'arrows' },
            { label: 'Puntos', value: 'dots' },
            { label: 'Ninguna', value: 'none' },
        ],
    },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const FEATURED_COLLECTION_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'title', label: 'Título', type: 'text' },
    {
        key: 'sourceType',
        label: 'Fuente',
        type: 'productSource',
        options: [
            { label: 'Más recientes', value: 'newest' },
            { label: 'Destacados', value: 'featured' },
            { label: 'Colección', value: 'collection' },
            { label: 'Manual', value: 'manual' },
            { label: 'En oferta', value: 'on-sale' },
        ],
    },
    { key: 'collectionId', label: 'Colección', type: 'collection' },
    { key: 'productsToShow', label: 'Límite de productos', type: 'number', min: 1, max: 24, step: 1 },
    {
        key: 'variant',
        label: 'Layout',
        type: 'layout',
        options: [
            { label: 'Grid', value: 'grid' },
            { label: 'Carrusel', value: 'carousel' },
            { label: 'Showcase', value: 'showcase' },
        ],
    },
    {
        key: 'cardStyle',
        label: 'Card',
        type: 'select',
        options: [
            { label: 'Modern', value: 'modern' },
            { label: 'Minimal', value: 'minimal' },
            { label: 'Luxury', value: 'luxury' },
            { label: 'Marketplace', value: 'marketplace' },
        ],
    },
    { key: 'columns', label: 'Columnas desktop', type: 'number', min: 2, max: 5, step: 1 },
    { key: 'mobileColumns', label: 'Columnas móvil', type: 'number', min: 1, max: 2, step: 1 },
    { key: 'showViewAll', label: 'Mostrar ver todo', type: 'toggle' },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const BASIC_CONTENT_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'description', label: 'Descripción', type: 'textarea' },
    { key: 'buttonText', label: 'Texto botón', type: 'text' },
    { key: 'buttonUrl', label: 'Link botón', type: 'link' },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const ANNOUNCEMENT_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    {
        key: 'variant',
        label: 'Variante',
        type: 'select',
        options: [
            { label: 'Static', value: 'static' },
            { label: 'Scrolling', value: 'scrolling' },
            { label: 'Rotating', value: 'rotating' },
        ],
    },
    { key: 'messages', label: 'Mensajes', type: 'textarea', helperText: 'Un mensaje por línea' },
    ...COMMON_VISIBILITY_CONTROLS,
];

export const HEADER_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'logoText', label: 'Nombre / logo', type: 'text' },
    {
        key: 'layout',
        label: 'Layout',
        type: 'layout',
        options: [
            { label: 'Logo izquierda', value: 'left' },
            { label: 'Centrado', value: 'center' },
            { label: 'Compacto', value: 'compact' },
        ],
    },
    { key: 'sticky', label: 'Sticky', type: 'toggle' },
    { key: 'showCart', label: 'Mostrar carrito', type: 'toggle' },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const FOOTER_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'title', label: 'Título', type: 'text' },
    { key: 'description', label: 'Descripción', type: 'textarea' },
    { key: 'showSocialLinks', label: 'Social links', type: 'toggle' },
    { key: 'showNewsletter', label: 'Newsletter', type: 'toggle' },
    ...COMMON_LAYOUT_CONTROLS,
    ...COMMON_VISIBILITY_CONTROLS,
];

export const BLOCK_INSPECTOR_SCHEMA: StorefrontInspectorControl[] = [
    { key: 'text', label: 'Texto', type: 'text' },
    { key: 'body', label: 'Contenido', type: 'textarea' },
    { key: 'imageUrl', label: 'Imagen', type: 'image' },
    { key: 'linkUrl', label: 'Link', type: 'link' },
    { key: 'enabled', label: 'Activo', type: 'toggle' },
];
