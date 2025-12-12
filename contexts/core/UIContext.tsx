/**
 * UIContext
 * Maneja el estado de la interfaz de usuario (sidebars, modales, vistas, etc.)
 */

import React, { createContext, useState, useContext, useRef, ReactNode } from 'react';
import { View, AdminView, PreviewDevice, PreviewOrientation, PageSection, ThemeMode } from '../../types';

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
    
    // Theme - Load from localStorage
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('themeMode');
        return (saved as ThemeMode) || 'dark';
    });
    
    // Sidebar Order - Load from localStorage
    const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
        const saved = localStorage.getItem('sidebar-nav-order');
        return saved ? JSON.parse(saved) : [];
    });
    
    // Functions
    const toggleDashboardSidebar = () => {
        setIsDashboardSidebarCollapsed(prev => !prev);
    };
    
    const onSectionSelect = (section: PageSection) => {
        console.log('[UIContext] onSectionSelect called with:', section);
        setActiveSection(section);
        setActiveSectionItem(null);
        setIsSidebarOpen(true);
        console.log('[UIContext] activeSection set to:', section, 'isSidebarOpen: true');
    };

    const onSectionItemSelect = (section: PageSection, index: number) => {
        setActiveSection(section);
        setActiveSectionItem({ section, index });
        setIsSidebarOpen(true);
    };
    
    const openProfileModal = () => {
        setIsProfileModalOpen(true);
    };
    
    const closeProfileModal = () => {
        setIsProfileModalOpen(false);
    };
    
    // Persist theme mode to localStorage and apply to document
    React.useEffect(() => {
        localStorage.setItem('themeMode', themeMode);
        
        // Apply theme class to <html> element
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'black');
        root.classList.add(themeMode);
    }, [themeMode]);
    
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

