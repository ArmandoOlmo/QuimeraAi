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

    return (
        <>
            <header
                className="h-14 px-2 sm:px-6 border-b border-q-border flex items-center justify-between bg-q-bg z-20 sticky top-0"
                role="banner"
            >
                {/* Left Section - Logo & Title */}
                <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden h-9 w-9 flex items-center justify-center text-q-text-muted hover:text-q-text hover:bg-q-surface-overlay/80 active:bg-q-surface-overlay rounded-lg transition-colors touch-manipulation"
                        aria-label="Open navigation menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <HeaderIcon className="text-q-accent" size={24} aria-hidden="true" />
                        <h1 className="text-sm sm:text-xl font-semibold sm:font-bold text-q-text">
                            {headerTitle}
                        </h1>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Section - Search */}
                <div className="flex items-center gap-3 flex-shrink-0 mr-2.5">
                    {/* Search Icon */}
                    {(isDashboard || isWebsites) && (
                        <button
                            onClick={() => setShowMobileSearch(true)}
                            className="text-q-text-muted hover:text-q-text transition-colors"
                            aria-label="Open search"
                        >
                            <Search size={20} />
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
