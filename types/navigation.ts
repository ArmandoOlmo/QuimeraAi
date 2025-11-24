/**
 * Navigation Types
 * Tipos para menús y navegación
 */

// =============================================================================
// NAVIGATION MENU
// =============================================================================
export interface MenuItem {
    id: string;
    text: string;
    href: string;
    type: 'custom' | 'section' | 'page';
}

export interface Menu {
    id: string;
    title: string;
    handle: string;
    items: MenuItem[];
}

