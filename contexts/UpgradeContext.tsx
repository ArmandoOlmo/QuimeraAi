/**
 * UpgradeContext
 * Context global para manejar el modal de upgrade desde cualquier parte de la app.
 * Permite abrir el modal con diferentes triggers y metadata contextual.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import UpgradeModal, { UpgradeTrigger } from '../components/ui/UpgradeModal';
import { SubscriptionPlanId } from '../types/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface UpgradeMetadata {
    creditsRemaining?: number;
    creditsTotal?: number;
    currentProjects?: number;
    maxProjects?: number;
    featureName?: string;
    customTitle?: string;
    customSubtitle?: string;
}

interface UpgradeContextType {
    isModalOpen: boolean;
    trigger: UpgradeTrigger | null;
    metadata: UpgradeMetadata | null;
    openUpgradeModal: (trigger: UpgradeTrigger, metadata?: UpgradeMetadata) => void;
    closeUpgradeModal: () => void;
    // Shortcut methods for common triggers
    showCreditsUpgrade: (creditsRemaining: number, creditsTotal: number) => void;
    showProjectsUpgrade: (currentProjects: number, maxProjects: number) => void;
    showFeatureUpgrade: (featureName: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const UpgradeContext = createContext<UpgradeContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface UpgradeProviderProps {
    children: ReactNode;
    currentPlanId?: SubscriptionPlanId;
}

export const UpgradeProvider: React.FC<UpgradeProviderProps> = ({ 
    children,
    currentPlanId = 'free',
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trigger, setTrigger] = useState<UpgradeTrigger | null>(null);
    const [metadata, setMetadata] = useState<UpgradeMetadata | null>(null);

    const openUpgradeModal = useCallback((
        newTrigger: UpgradeTrigger, 
        newMetadata?: UpgradeMetadata
    ) => {
        setTrigger(newTrigger);
        setMetadata(newMetadata || null);
        setIsModalOpen(true);
    }, []);

    const closeUpgradeModal = useCallback(() => {
        setIsModalOpen(false);
        // Clear state after animation
        setTimeout(() => {
            setTrigger(null);
            setMetadata(null);
        }, 200);
    }, []);

    // Shortcut: Show credits upgrade
    const showCreditsUpgrade = useCallback((creditsRemaining: number, creditsTotal: number) => {
        openUpgradeModal('credits', { creditsRemaining, creditsTotal });
    }, [openUpgradeModal]);

    // Shortcut: Show projects upgrade
    const showProjectsUpgrade = useCallback((currentProjects: number, maxProjects: number) => {
        openUpgradeModal('projects', { currentProjects, maxProjects });
    }, [openUpgradeModal]);

    // Shortcut: Show feature upgrade
    const showFeatureUpgrade = useCallback((featureName: string) => {
        const triggerMap: Record<string, UpgradeTrigger> = {
            'ecommerce': 'ecommerce',
            'e-commerce': 'ecommerce',
            'chatbot': 'chatbot',
            'ai chatbot': 'chatbot',
            'domains': 'domains',
            'custom domains': 'domains',
            'dominios': 'domains',
            'usuarios': 'users',
            'users': 'users',
            'storage': 'storage',
            'almacenamiento': 'storage',
        };
        
        const detectedTrigger = triggerMap[featureName.toLowerCase()] || 'generic';
        openUpgradeModal(detectedTrigger, { featureName });
    }, [openUpgradeModal]);

    const value: UpgradeContextType = {
        isModalOpen,
        trigger,
        metadata,
        openUpgradeModal,
        closeUpgradeModal,
        showCreditsUpgrade,
        showProjectsUpgrade,
        showFeatureUpgrade,
    };

    return (
        <UpgradeContext.Provider value={value}>
            {children}
            
            {/* Render the modal at the top level */}
            <UpgradeModal
                isOpen={isModalOpen}
                onClose={closeUpgradeModal}
                trigger={trigger || 'generic'}
                currentPlanId={currentPlanId}
                metadata={metadata || undefined}
            />
        </UpgradeContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

export function useUpgrade(): UpgradeContextType {
    const context = useContext(UpgradeContext);
    
    if (context === undefined) {
        throw new Error('useUpgrade must be used within an UpgradeProvider');
    }
    
    return context;
}

/**
 * Safe version of useUpgrade that returns null if not in provider
 * Useful for components that might be used outside the upgrade context
 */
export function useSafeUpgrade(): UpgradeContextType | null {
    const context = useContext(UpgradeContext);
    return context ?? null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { UpgradeTrigger } from '../components/ui/UpgradeModal';
export type { UpgradeMetadata };
export default UpgradeContext;




