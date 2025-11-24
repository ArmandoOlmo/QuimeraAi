/**
 * UIContext
 * Maneja el estado de la interfaz de usuario (sidebars, modales, vistas, etc.)
 */

import React, { createContext, useState, useContext, useRef, ReactNode } from 'react';
import { View, AdminView, PreviewDevice, PageSection, ThemeMode } from '../../types';

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
    
    // Section Management
    activeSection: PageSection | null;
    onSectionSelect: (section: PageSection) => void;
    
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
    
    // Section Management
    const [activeSection, setActiveSection] = useState<PageSection | null>(null);
    
    // Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // Onboarding
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    
    // Theme - Load from localStorage
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('themeMode');
        return (saved as ThemeMode) || 'dark';
    });
    
    // Functions
    const toggleDashboardSidebar = () => {
        setIsDashboardSidebarCollapsed(prev => !prev);
    };
    
    const onSectionSelect = (section: PageSection) => {
        setActiveSection(section);
        setIsSidebarOpen(true);
    };
    
    const openProfileModal = () => {
        setIsProfileModalOpen(true);
    };
    
    const closeProfileModal = () => {
        setIsProfileModalOpen(false);
    };
    
    // Persist theme mode to localStorage
    React.useEffect(() => {
        localStorage.setItem('themeMode', themeMode);
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
        activeSection,
        onSectionSelect,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        isOnboardingOpen,
        setIsOnboardingOpen,
        themeMode,
        setThemeMode,
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

