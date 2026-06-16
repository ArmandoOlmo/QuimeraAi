import React from 'react';

interface CatalogFilterBarProps {
    /** Filter chips or custom filter controls (left side) */
    filters: React.ReactNode;
    /** Sort, view toggle, or other trailing controls */
    trailing?: React.ReactNode;
    /** Optional content before filters (e.g. bulk-select checkbox) */
    leading?: React.ReactNode;
    /** Optional row below the main bar (e.g. "Showing X of Y") */
    footer?: React.ReactNode;
    className?: string;
}

/**
 * Standard layout for catalog/list filter areas — matches WebsitesView structure.
 */
const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
    filters,
    trailing,
    leading,
    footer,
    className = '',
}) => {
    return (
        <div className={`mb-4 md:mb-6 space-y-3 md:space-y-4 ${className}`}>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {leading}
                {filters}
                {trailing && (
                    <>
                        <div className="flex-1 min-w-[1rem]" />
                        {trailing}
                    </>
                )}
            </div>
            {footer}
        </div>
    );
};

export default CatalogFilterBar;
