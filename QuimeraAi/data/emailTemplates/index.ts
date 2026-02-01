/**
 * Email Templates
 * Pre-designed email templates for the visual editor
 */

import { EmailDocument, EmailBlock, DEFAULT_EMAIL_GLOBAL_STYLES } from '../../types/email';
import { v4 as uuidv4 } from 'uuid';

export interface EmailTemplatePreset {
    id: string;
    name: string;
    category: 'newsletter' | 'promotion' | 'announcement' | 'welcome' | 'ecommerce';
    description: string;
    thumbnailEmoji: string;
    document: EmailDocument;
}

// Helper to create blocks with unique IDs
const createBlock = (block: Omit<EmailBlock, 'id'>): EmailBlock => ({
    ...block,
    id: uuidv4(),
});

// =============================================================================
// WELCOME TEMPLATE
// =============================================================================

const welcomeTemplate: EmailTemplatePreset = {
    id: 'welcome',
    name: 'Bienvenida',
    category: 'welcome',
    description: 'Da la bienvenida a nuevos suscriptores',
    thumbnailEmoji: '👋',
    document: {
        id: uuidv4(),
        name: 'Email de Bienvenida',
        subject: '¡Bienvenido a {{storeName}}!',
        previewText: 'Gracias por unirte a nuestra comunidad',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#4f46e5',
        },
        blocks: [
            createBlock({
                type: 'hero',
                visible: true,
                content: {
                    headline: '¡Bienvenido a {{storeName}}!',
                    subheadline: 'Estamos emocionados de tenerte con nosotros. Prepárate para recibir las mejores ofertas y novedades.',
                    showButton: true,
                    buttonText: 'Explorar Tienda',
                    buttonUrl: '{{shopUrl}}',
                },
                styles: {
                    backgroundColor: '#4f46e5',
                    headingColor: '#ffffff',
                    textColor: '#ffffff',
                    buttonColor: '#ffffff',
                    buttonTextColor: '#4f46e5',
                    padding: 'xl',
                    alignment: 'center',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Hola {{firstName}},\n\nGracias por suscribirte a nuestro newsletter. A partir de ahora recibirás:\n\n• Ofertas exclusivas para suscriptores\n• Acceso anticipado a nuevos productos\n• Contenido especial y consejos',
                    isHtml: false,
                },
                styles: {
                    padding: 'lg',
                    textColor: '#374151',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Descubre Nuestros Productos',
                    url: '{{shopUrl}}',
                    fullWidth: false,
                },
                styles: {
                    buttonColor: '#4f46e5',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'divider',
                visible: true,
                content: {
                    style: 'solid',
                    thickness: 1,
                    width: 80,
                },
                styles: {
                    borderColor: '#e5e7eb',
                    padding: 'md',
                },
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '{{storeName}}',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '© 2024 Todos los derechos reservados',
                    showSocialLinks: false,
                },
                styles: {
                    backgroundColor: '#f9fafb',
                    textColor: '#6b7280',
                    padding: 'lg',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
        ],
    },
};

// =============================================================================
// NEWSLETTER TEMPLATE
// =============================================================================

const newsletterTemplate: EmailTemplatePreset = {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'newsletter',
    description: 'Template clásico para newsletters',
    thumbnailEmoji: '📰',
    document: {
        id: uuidv4(),
        name: 'Newsletter',
        subject: 'Las novedades de esta semana',
        previewText: 'Descubre las últimas noticias y ofertas',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#059669',
        },
        blocks: [
            createBlock({
                type: 'image',
                visible: true,
                content: {
                    src: '',
                    alt: 'Header image',
                    width: 100,
                },
                styles: {
                    padding: 'none',
                    alignment: 'center',
                    borderRadius: 'none',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'NEWSLETTER SEMANAL',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#059669',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Hola {{firstName}},\n\nEsta semana tenemos muchas novedades que compartir contigo. Sigue leyendo para descubrir todo lo que hemos preparado.',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#374151',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'divider',
                visible: true,
                content: {
                    style: 'solid',
                    thickness: 1,
                    width: 100,
                },
                styles: {
                    borderColor: '#e5e7eb',
                    padding: 'sm',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '📌 Destacado de la Semana',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#111827',
                    alignment: 'left',
                    fontSize: 'lg',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#6b7280',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Leer Más',
                    url: '#',
                    fullWidth: false,
                },
                styles: {
                    buttonColor: '#059669',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'spacer',
                visible: true,
                content: {
                    height: 24,
                },
                styles: {},
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '{{storeName}}',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '© 2024',
                    showSocialLinks: true,
                },
                styles: {
                    backgroundColor: '#f3f4f6',
                    textColor: '#6b7280',
                    padding: 'lg',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
        ],
    },
};

// =============================================================================
// PROMOTION TEMPLATE
// =============================================================================

const promotionTemplate: EmailTemplatePreset = {
    id: 'promotion',
    name: 'Promoción',
    category: 'promotion',
    description: 'Ideal para ofertas y descuentos',
    thumbnailEmoji: '🏷️',
    document: {
        id: uuidv4(),
        name: 'Promoción',
        subject: '¡Oferta especial! {{discountPercent}}% de descuento',
        previewText: 'No te pierdas esta oferta por tiempo limitado',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#dc2626',
        },
        blocks: [
            createBlock({
                type: 'hero',
                visible: true,
                content: {
                    headline: '¡OFERTA ESPECIAL!',
                    subheadline: 'Por tiempo limitado: {{discountPercent}}% de descuento en toda la tienda',
                    showButton: true,
                    buttonText: 'COMPRAR AHORA',
                    buttonUrl: '{{shopUrl}}',
                },
                styles: {
                    backgroundColor: '#dc2626',
                    headingColor: '#ffffff',
                    textColor: '#ffffff',
                    buttonColor: '#ffffff',
                    buttonTextColor: '#dc2626',
                    padding: 'xl',
                    alignment: 'center',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Usa el código:',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    paddingBottom: 'none',
                    textColor: '#6b7280',
                    alignment: 'center',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '{{discountCode}}',
                    isHtml: false,
                },
                styles: {
                    backgroundColor: '#fef2f2',
                    padding: 'md',
                    textColor: '#dc2626',
                    alignment: 'center',
                    fontSize: 'xl',
                },
            }),
            createBlock({
                type: 'spacer',
                visible: true,
                content: {
                    height: 16,
                },
                styles: {},
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '⏰ Esta oferta termina en 48 horas. ¡No te la pierdas!',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#374151',
                    alignment: 'center',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Ver Productos en Oferta',
                    url: '{{shopUrl}}',
                    fullWidth: true,
                },
                styles: {
                    buttonColor: '#dc2626',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '{{storeName}}',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '© 2024',
                    showSocialLinks: false,
                },
                styles: {
                    backgroundColor: '#f9fafb',
                    textColor: '#6b7280',
                    padding: 'lg',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
        ],
    },
};

// =============================================================================
// ANNOUNCEMENT TEMPLATE
// =============================================================================

const announcementTemplate: EmailTemplatePreset = {
    id: 'announcement',
    name: 'Anuncio',
    category: 'announcement',
    description: 'Para comunicados importantes',
    thumbnailEmoji: '📢',
    document: {
        id: uuidv4(),
        name: 'Anuncio',
        subject: 'Novedades importantes de {{storeName}}',
        previewText: 'Tenemos algo que contarte',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#7c3aed',
        },
        blocks: [
            createBlock({
                type: 'hero',
                visible: true,
                content: {
                    headline: 'Tenemos Novedades',
                    subheadline: 'Algo grande está por llegar',
                    showButton: false,
                },
                styles: {
                    backgroundColor: '#7c3aed',
                    headingColor: '#ffffff',
                    textColor: '#ffffff',
                    padding: 'xl',
                    alignment: 'center',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Hola {{firstName}},\n\nQueremos compartir contigo algunas novedades emocionantes. Hemos estado trabajando en mejoras que creemos que te van a encantar.',
                    isHtml: false,
                },
                styles: {
                    padding: 'lg',
                    textColor: '#374151',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'image',
                visible: true,
                content: {
                    src: '',
                    alt: 'Announcement image',
                    width: 100,
                },
                styles: {
                    padding: 'md',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Mantente atento a las próximas comunicaciones donde revelaremos todos los detalles.',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#6b7280',
                    alignment: 'center',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Saber Más',
                    url: '{{shopUrl}}',
                    fullWidth: false,
                },
                styles: {
                    buttonColor: '#7c3aed',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '{{storeName}}',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '© 2024',
                    showSocialLinks: false,
                },
                styles: {
                    backgroundColor: '#f5f3ff',
                    textColor: '#6b7280',
                    padding: 'lg',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
        ],
    },
};

// =============================================================================
// ABANDONED CART TEMPLATE
// =============================================================================

const abandonedCartTemplate: EmailTemplatePreset = {
    id: 'abandoned-cart',
    name: 'Carrito Abandonado',
    category: 'ecommerce',
    description: 'Recupera ventas perdidas',
    thumbnailEmoji: '🛒',
    document: {
        id: uuidv4(),
        name: 'Carrito Abandonado',
        subject: '¿Olvidaste algo? Tu carrito te espera',
        previewText: 'Completa tu compra antes de que sea tarde',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#f59e0b',
        },
        blocks: [
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '¿Olvidaste algo?',
                    isHtml: false,
                },
                styles: {
                    padding: 'lg',
                    paddingBottom: 'sm',
                    textColor: '#111827',
                    alignment: 'center',
                    fontSize: '2xl',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Hola {{firstName}}, notamos que dejaste algunos productos en tu carrito. ¡No dejes escapar lo que te gusta!',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#6b7280',
                    alignment: 'center',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'divider',
                visible: true,
                content: {
                    style: 'solid',
                    thickness: 1,
                    width: 60,
                },
                styles: {
                    borderColor: '#e5e7eb',
                    padding: 'md',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '{{cartItems}}',
                    isHtml: true,
                },
                styles: {
                    padding: 'md',
                    textColor: '#374151',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Completar Mi Compra',
                    url: '{{cartUrl}}',
                    fullWidth: true,
                },
                styles: {
                    buttonColor: '#f59e0b',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'md',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '💡 Tip: Los productos se reservan por tiempo limitado',
                    isHtml: false,
                },
                styles: {
                    backgroundColor: '#fef3c7',
                    padding: 'md',
                    textColor: '#92400e',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '{{storeName}}',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '© 2024',
                    showSocialLinks: false,
                },
                styles: {
                    backgroundColor: '#f9fafb',
                    textColor: '#6b7280',
                    padding: 'lg',
                    alignment: 'center',
                    fontSize: 'sm',
                },
            }),
        ],
    },
};

// =============================================================================
// MINIMAL TEMPLATE
// =============================================================================

const minimalTemplate: EmailTemplatePreset = {
    id: 'minimal',
    name: 'Minimalista',
    category: 'newsletter',
    description: 'Diseño limpio y simple',
    thumbnailEmoji: '✨',
    document: {
        id: uuidv4(),
        name: 'Email Minimalista',
        subject: 'Actualización de {{storeName}}',
        previewText: '',
        globalStyles: {
            ...DEFAULT_EMAIL_GLOBAL_STYLES,
            primaryColor: '#18181b',
            bodyBackgroundColor: '#ffffff',
        },
        blocks: [
            createBlock({
                type: 'spacer',
                visible: true,
                content: {
                    height: 32,
                },
                styles: {},
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: '{{storeName}}',
                    isHtml: false,
                },
                styles: {
                    padding: 'md',
                    textColor: '#18181b',
                    alignment: 'center',
                    fontSize: 'lg',
                },
            }),
            createBlock({
                type: 'divider',
                visible: true,
                content: {
                    style: 'solid',
                    thickness: 1,
                    width: 40,
                },
                styles: {
                    borderColor: '#e5e7eb',
                    padding: 'md',
                },
            }),
            createBlock({
                type: 'text',
                visible: true,
                content: {
                    text: 'Hola {{firstName}},\n\nEsperamos que este mensaje te encuentre bien. Queríamos compartir contigo algunas novedades.',
                    isHtml: false,
                },
                styles: {
                    padding: 'lg',
                    textColor: '#52525b',
                    alignment: 'left',
                    fontSize: 'md',
                },
            }),
            createBlock({
                type: 'button',
                visible: true,
                content: {
                    text: 'Ver más',
                    url: '{{shopUrl}}',
                    fullWidth: false,
                },
                styles: {
                    buttonColor: '#18181b',
                    buttonTextColor: '#ffffff',
                    padding: 'lg',
                    alignment: 'center',
                    borderRadius: 'sm',
                },
            }),
            createBlock({
                type: 'spacer',
                visible: true,
                content: {
                    height: 48,
                },
                styles: {},
            }),
            createBlock({
                type: 'footer',
                visible: true,
                content: {
                    companyName: '',
                    showUnsubscribe: true,
                    unsubscribeText: 'Cancelar suscripción',
                    copyrightText: '',
                    showSocialLinks: false,
                },
                styles: {
                    backgroundColor: 'transparent',
                    textColor: '#a1a1aa',
                    padding: 'md',
                    alignment: 'center',
                    fontSize: 'xs',
                },
            }),
        ],
    },
};

// =============================================================================
// EXPORT ALL TEMPLATES
// =============================================================================

export const emailTemplates: EmailTemplatePreset[] = [
    welcomeTemplate,
    newsletterTemplate,
    promotionTemplate,
    announcementTemplate,
    abandonedCartTemplate,
    minimalTemplate,
];

export const getTemplateById = (id: string): EmailTemplatePreset | undefined => {
    return emailTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: EmailTemplatePreset['category']): EmailTemplatePreset[] => {
    return emailTemplates.filter(t => t.category === category);
};

export default emailTemplates;






