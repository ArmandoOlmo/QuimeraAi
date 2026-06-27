import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeTenant } from '../../contexts/tenant';
import QuimeraLoader from '../ui/QuimeraLoader';
import { PortalProvider } from './PortalContext';
import PortalDashboard from './PortalDashboard';
import PortalLayout from './PortalLayout';

const PortalRoute: React.FC = () => {
    const { t } = useTranslation();
    const tenantContext = useSafeTenant();
    const currentTenant = tenantContext?.currentTenant;

    if (tenantContext?.isLoadingTenant) {
        return (
            <div className="min-h-screen bg-q-bg flex items-center justify-center">
                <QuimeraLoader size="md" text={t('common.loading', 'Cargando...')} />
            </div>
        );
    }

    if (!currentTenant?.id) {
        return (
            <div className="min-h-screen bg-q-bg flex items-center justify-center">
                <div className="max-w-md px-6 text-center">
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('portal.notFound', 'Portal not found')}
                    </h1>
                    <p className="mt-2 text-q-text-muted">
                        {t('portal.noActiveWorkspace', 'No client workspace is active for this account.')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PortalProvider tenantId={currentTenant.id}>
            <PortalLayout>
                <PortalDashboard />
            </PortalLayout>
        </PortalProvider>
    );
};

export default PortalRoute;
