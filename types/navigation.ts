/**
 * Navigation Types
 * Tipos para menús y navegación
 */

// =============================================================================
// NAVIGATION MENU
// =============================================================================
export interface NavigationMenuItem {
    id: string;
    text: string;
    href: string;
    type: 'custom' | 'section' | 'page';
}

/** @deprecated Use NavigationMenuItem instead */
export type NavMenuItem = NavigationMenuItem;

export interface NavigationMenu {
    id: string;
    title: string;
    handle: string;
    items: NavigationMenuItem[];
}

/** @deprecated Use NavigationMenu instead */
export type Menu = NavigationMenu;










