import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Globe, Images, Menu, Search } from 'lucide-react';
import MobileSearchModal from '../ui/MobileSearchModal';
import HeaderBackButton from '../ui/HeaderBackButton';

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
    let HeaderIcon = LayoutGrid;
    let headerTitle = t('dashboard.title');

    if (isWebsites) {
        HeaderIcon = Globe;
        headerTitle = t('dashboard.myWebsites');
    } else if (isAssets) {
        HeaderIcon = Images;
        headerTitle = t('dashboard.assets.title');
    }

    const headerClasses = 'quimera-dashboard-header-bar h-14 px-2 sm:px-6 flex items-center justify-between z-20 sticky top-0';
    const leftSectionClasses = 'flex items-center gap-1 sm:gap-4 flex-shrink-0';
    const mobileMenuButtonClasses = 'lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay active:bg-q-surface-overlay rounded-[var(--q-radius-md)] transition-colors touch-manipulation';
    const titleWrapClasses = 'flex items-center gap-1 sm:gap-2';
    const titleClasses = 'text-sm sm:text-xl font-semibold sm:font-bold text-q-text';
    const rightSectionClasses = 'flex items-center gap-2 sm:gap-3 flex-shrink-0 mr-2.5';
    const searchButtonClasses = 'h-9 w-9 flex items-center justify-center rounded-[var(--q-radius-md)] text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay transition-colors';

    return (
        <>
            <header
                className={headerClasses}
                role="banner"
            >
                {/* Left Section - Logo & Title */}
                <div className={leftSectionClasses}>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className={mobileMenuButtonClasses}
                        aria-label="Open navigation menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Menu className="icon-lg" />
                    </button>
                    <div className={titleWrapClasses}>
                        <HeaderIcon className="icon-lg quimera-dashboard-header-icon" strokeWidth={2} aria-hidden="true" />
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
                        <button
                            onClick={() => setShowMobileSearch(true)}
                            className={searchButtonClasses}
                            aria-label="Open search"
                        >
                            <Search className="icon-lg" />
                        </button>
                    )}

                    <HeaderBackButton onClick={onNavigateBack} />
                </div>
            </header>

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
