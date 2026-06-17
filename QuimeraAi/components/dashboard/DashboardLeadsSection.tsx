import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import RecentLeads from './RecentLeads';
import { Users } from 'lucide-react';
import { AppButton } from '../ui/system';

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
        <AppButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.LEADS)}
            className="!h-auto gap-0 !p-0 text-sm font-semibold !text-yellow-400 hover:!bg-transparent hover:!text-yellow-300"
        >
            {t('dashboard.viewAll', 'Ver todos')} <Users className="ml-1 size-3.5" />
        </AppButton>
    );
};

export default DashboardLeadsSection;
