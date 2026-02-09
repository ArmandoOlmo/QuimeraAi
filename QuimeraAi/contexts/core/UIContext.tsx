/**
 * UIContext
 * Maneja el estado de la interfaz de usuario (sidebars, modales, vistas, etc.)
 */

import React, { createContext, useState, useContext, useRef, ReactNode } from 'react';
import { View, AdminView, PreviewDevice, PreviewOrientation, PageSection, ThemeMode, AppTokens } from '../../types';
import { applyAppTokensToCSS, defaultAppTokens } from '../../utils/appTokenApplier';

export interface ActiveSectionItem {
    section: PageSection;
    /**
     * 0-based index for list-like section items (features.items, pricing.tiers, etc).
     */
    index: number;
}

interface UIContextType {
    // Sidebar State
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isDashboardSidebarCollapsed: boolean;
    toggleDashboardSidebar: () => void;

    // View Management
    view: View;
    setView: React.Dispatch<React.SetStateAction<View>>;
    adminView: AdminView;
    setAdminView: React.Dispatch<React.SetStateAction<AdminView>>;

    // Preview
    previewRef: React.RefObject<HTMLDivElement>;
    previewDevice: PreviewDevice;
    setPreviewDevice: React.Dispatch<React.SetStateAction<PreviewDevice>>;
    previewOrientation: PreviewOrientation;
    setPreviewOrientation: React.Dispatch<React.SetStateAction<PreviewOrientation>>;

    // Section Management
    activeSection: PageSection | null;
    onSectionSelect: (section: PageSection) => void;
    activeSectionItem: ActiveSectionItem | null;
    onSectionItemSelect: (section: PageSection, index: number) => void;

    // Modal State
    isProfileModalOpen: boolean;
    openProfileModal: () => void;
    closeProfileModal: () => void;

    // Onboarding
    isOnboardingOpen: boolean;
    setIsOnboardingOpen: React.Dispatch<React.SetStateAction<boolean>>;

    // Theme
    themeMode: ThemeMode;
    setThemeMode: React.Dispatch<React.SetStateAction<ThemeMode>>;

    // App Tokens
    applyAppTokens: (tokens: AppTokens | null) => void;

    // Sidebar Order (User Preferences)
    sidebarOrder: string[];
    setSidebarOrder: React.Dispatch<React.SetStateAction<string[]>>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] = useState(false);

    // View Management
    const [view, setView] = useState<View>('dashboard');
    const [adminView, setAdminView] = useState<AdminView>('main');

    // Preview
    const previewRef = useRef<HTMLDivElement>(null);
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
    const [previewOrientation, setPreviewOrientation] = useState<PreviewOrientation>('portrait');

    // Section Management
    const [activeSection, setActiveSection] = useState<PageSection | null>(null);
    const [activeSectionItem, setActiveSectionItem] = useState<ActiveSectionItem | null>(null);

    // Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Onboarding
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

    // Theme - Load from localStorage (with SSR safety check)
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') return 'dark';
        try {
            const saved = localStorage.getItem('themeMode');
            if (saved && ['light', 'dark', 'black'].includes(saved)) {
                return saved as ThemeMode;
            }
        } catch (e) {
            // localStorage not available
        }
        return 'dark';
    });

    // Sidebar Order - Load from localStorage (with SSR safety check)
    const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem('sidebar-nav-order');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            // localStorage not available or invalid JSON
            return [];
        }
    });

    // Current App Tokens (stored for re-application on theme change)
    const currentAppTokensRef = useRef<AppTokens | null>(null);

    // Functions

    // Apply App Tokens to CSS variables
    const applyAppTokens = React.useCallback((tokens: AppTokens | null) => {
        currentAppTokensRef.current = tokens;
        applyAppTokensToCSS(tokens, themeMode);
    }, [themeMode]);
    const toggleDashboardSidebar = () => {
        setIsDashboardSidebarCollapsed(prev => !prev);
    };

    // Shared scroll helper: retries via requestAnimationFrame until element is in DOM
    const scrollToSection = (section: string, attempts: number = 10) => {
        const element = document.getElementById(section);
        if (element && previewRef.current) {
            const container = previewRef.current;
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
            container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        } else if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (attempts > 0) {
            // Element not in DOM yet (e.g. newly added component) — retry next frame
            requestAnimationFrame(() => scrollToSection(section, attempts - 1));
        }
    };

    const onSectionSelect = (section: PageSection) => {
        console.log('[UIContext] onSectionSelect called with:', section);
        setActiveSection(section);
        setActiveSectionItem(null);
        setIsSidebarOpen(true);

        // Scroll to section in preview — use rAF retry to handle newly-rendered components
        requestAnimationFrame(() => scrollToSection(section));
    };

    const onSectionItemSelect = (section: PageSection, index: number) => {
        setActiveSection(section);
        setActiveSectionItem({ section, index });
        setIsSidebarOpen(true);

        // Scroll to section in preview — use rAF retry to handle newly-rendered components
        requestAnimationFrame(() => scrollToSection(section));
    };

    const openProfileModal = () => {
        setIsProfileModalOpen(true);
    };

    const closeProfileModal = () => {
        setIsProfileModalOpen(false);
    };

    // Persist theme mode to localStorage and apply to document
    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem('themeMode', themeMode);
        } catch (e) {
            // localStorage not available
        }

        // Apply theme class to <html> element
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'black');
        root.classList.add(themeMode);

        // Re-apply app tokens with new theme mode
        applyAppTokensToCSS(currentAppTokensRef.current, themeMode);
    }, [themeMode]);

    // Prevent transition flash on initial page load
    React.useEffect(() => {
        const root = document.documentElement;
        // Add class to disable transitions initially
        root.classList.add('theme-transitioning');

        // Remove after a short delay to enable smooth transitions
        const timer = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                root.classList.remove('theme-transitioning');
            });
        });

        return () => cancelAnimationFrame(timer);
    }, []);

    // Apply default app tokens on initial load
    React.useEffect(() => {
        applyAppTokensToCSS(defaultAppTokens, themeMode);
    }, []); // Only on mount

    const value: UIContextType = {
        isSidebarOpen,
        setIsSidebarOpen,
        isDashboardSidebarCollapsed,
        toggleDashboardSidebar,
        view,
        setView,
        adminView,
        setAdminView,
        previewRef,
        previewDevice,
        setPreviewDevice,
        previewOrientation,
        setPreviewOrientation,
        activeSection,
        onSectionSelect,
        activeSectionItem,
        onSectionItemSelect,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        isOnboardingOpen,
        setIsOnboardingOpen,
        themeMode,
        setThemeMode,
        applyAppTokens,
        sidebarOrder,
        setSidebarOrder,
    };

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

