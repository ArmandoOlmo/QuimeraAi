import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Globe, Images, Menu, Search, type LucideIcon } from 'lucide-react';
import MobileSearchModal from '../ui/MobileSearchModal';
import HeaderBackButton from '../ui/HeaderBackButton';
import { AppButton, AppIcon } from '../ui/system';
import { AppShellTopbar } from '@/src/design-system/components/AppShell';

interface DashboardHeaderProps {
    isDashboard: boolean;
    isWebsites: boolean;
    isAssets: boolean;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    showMobileSearch: boolean;
    setShowMobileSearch: (show: boolean) => void;
    onNavigateBack: () => void;
}

/**
 * DashboardHeader
 *
 * Sticky top header bar with contextual title, mobile menu toggle,
 * search, and back navigation. Extracted from Dashboard.tsx lines 383-436.
 */
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    isDashboard,
    isWebsites,
    isAssets,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    showMobileSearch,
    setShowMobileSearch,
    onNavigateBack,
}) => {
    const { t } = useTranslation();

    // Header Config
    let HeaderIcon: LucideIcon = LayoutGrid;
    let headerTitle = t('dashboard.title');

    if (isWebsites) {
        HeaderIcon = Globe;
        headerTitle = t('dashboard.myWebsites');
    } else if (isAssets) {
        HeaderIcon = Images;
        headerTitle = t('dashboard.assets.title');
    }

    const leftSectionClasses = 'flex items-center gap-1 sm:gap-4 flex-shrink-0';
    const titleWrapClasses = 'flex items-center gap-1 sm:gap-2';
    const titleClasses = 'text-sm sm:text-xl font-semibold sm:font-bold text-q-text';
    const rightSectionClasses = 'flex items-center gap-2 sm:gap-3 flex-shrink-0 mr-2.5';

    return (
        <>
            <AppShellTopbar
                role="banner"
            >
                {/* Left Section - Logo & Title */}
                <div className={leftSectionClasses}>
                    <AppButton
                        variant="icon"
                        size="icon-md"
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay active:bg-q-surface-overlay touch-manipulation"
                        aria-label="Open navigation menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Menu className="icon-lg" />
                    </AppButton>
                    <div className={titleWrapClasses}>
                        <AppIcon icon={HeaderIcon} size="lg" className="quimera-dashboard-header-icon" strokeWidth={2} />
                        <h1 className={titleClasses}>
                            {headerTitle}
                        </h1>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Section */}
                <div className={rightSectionClasses}>
                    {/* Search Icon */}
                    {(isDashboard || isWebsites) && (
                        <AppButton
                            variant="icon"
                            size="icon-md"
                            onClick={() => setShowMobileSearch(true)}
                            className="text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay"
                            aria-label="Open search"
                        >
                            <Search className="icon-lg" />
                        </AppButton>
                    )}

                    <HeaderBackButton onClick={onNavigateBack} />
                </div>
            </AppShellTopbar>

            {/* Search Modal */}
            <MobileSearchModal
                isOpen={showMobileSearch}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClose={() => setShowMobileSearch(false)}
                placeholder={t('dashboard.searchPlaceholder')}
            />
        </>
    );
};

export default DashboardHeader;
