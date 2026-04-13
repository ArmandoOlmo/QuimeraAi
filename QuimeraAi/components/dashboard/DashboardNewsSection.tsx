import React from 'react';
import NewsUpdates from './NewsUpdates';

/**
 * DashboardNewsSection
 *
 * Content for the "News & Updates" draggable section.
 * Simply renders NewsUpdates with maxItems=4 and hideHeader.
 * Extracted from Dashboard.tsx lines 831-862.
 */
const DashboardNewsSection: React.FC = () => {
    return <NewsUpdates maxItems={4} hideHeader />;
};

export default DashboardNewsSection;
