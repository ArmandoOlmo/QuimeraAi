import type {
    StorefrontEditorBlockKind,
    StorefrontInspectorControl,
} from '../../types/storefrontEditor';
import { BLOCK_INSPECTOR_SCHEMA } from './inspectorSchemas';

export interface StorefrontBlockRegistryItem {
    kind: StorefrontEditorBlockKind;
    label: string;
    defaultSettings: Record<string, unknown>;
    inspectorSchema: StorefrontInspectorControl[];
    renderComponent: string;
}

export const storefrontBlockRegistry: Record<StorefrontEditorBlockKind, StorefrontBlockRegistryItem> = {
    text: {
        kind: 'text',
        label: 'Texto',
        defaultSettings: { text: 'Nuevo texto', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontTextBlock',
    },
    image: {
        kind: 'image',
        label: 'Imagen',
        defaultSettings: { imageUrl: '', alt: '', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontImageBlock',
    },
    button: {
        kind: 'button',
        label: 'Botón',
        defaultSettings: { text: 'Comprar ahora', linkUrl: '/store', style: 'primary', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontButtonBlock',
    },
    collectionCard: {
        kind: 'collectionCard',
        label: 'Tarjeta de colección',
        defaultSettings: { title: 'Colección', collectionId: '', imageUrl: '', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontCollectionCardBlock',
    },
    productCard: {
        kind: 'productCard',
        label: 'Tarjeta de producto',
        defaultSettings: { productId: '', showPrice: true, showBadge: true, enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontProductCardBlock',
    },
    trustItem: {
        kind: 'trustItem',
        label: 'Sello de confianza',
        defaultSettings: { text: 'Compra protegida', icon: 'shield', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontTrustItemBlock',
    },
    menuLink: {
        kind: 'menuLink',
        label: 'Enlace de menú',
        defaultSettings: { text: 'Inicio', linkUrl: '/', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontMenuLinkBlock',
    },
    socialLink: {
        kind: 'socialLink',
        label: 'Social link',
        defaultSettings: { text: 'Instagram', linkUrl: '', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontSocialLinkBlock',
    },
    newsletterField: {
        kind: 'newsletterField',
        label: 'Campo newsletter',
        defaultSettings: { placeholder: 'Email', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontNewsletterFieldBlock',
    },
    richText: {
        kind: 'richText',
        label: 'Texto enriquecido',
        defaultSettings: { body: 'Contenido', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontRichTextBlock',
    },
    badge: {
        kind: 'badge',
        label: 'Badge',
        defaultSettings: { text: 'Nuevo', tone: 'accent', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontBadgeBlock',
    },
    iconText: {
        kind: 'iconText',
        label: 'Icono + texto',
        defaultSettings: { text: 'Beneficio', icon: 'sparkles', enabled: true },
        inspectorSchema: BLOCK_INSPECTOR_SCHEMA,
        renderComponent: 'StorefrontIconTextBlock',
    },
};

export const STOREFRONT_BLOCK_KINDS = Object.keys(storefrontBlockRegistry) as StorefrontEditorBlockKind[];

export function isStorefrontBlockKind(value: unknown): value is StorefrontEditorBlockKind {
    return typeof value === 'string' && STOREFRONT_BLOCK_KINDS.includes(value as StorefrontEditorBlockKind);
}
