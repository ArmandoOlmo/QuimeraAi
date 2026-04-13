import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import RecentLeads from './RecentLeads';
import { Users } from 'lucide-react';

/**
 * DashboardLeadsSection
 *
 * Content for the "Recent Leads" draggable section.
 * Simply renders RecentLeads with maxItems=6.
 * Extracted from Dashboard.tsx lines 789-828.
 */
const DashboardLeadsSection: React.FC = () => {
    return <RecentLeads maxItems={6} />;
};

/**
 * Helper component: "View All" link used as `rightAction` in the draggable section.
 */
export const LeadsViewAllAction: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useRouter();

    return (
        <button
            onClick={() => navigate(ROUTES.LEADS)}
            className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center"
        >
            {t('dashboard.viewAll', 'Ver todos')} <Users size={14} className="ml-1" />
        </button>
    );
};

export default DashboardLeadsSection;
