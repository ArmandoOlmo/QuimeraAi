import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { REALTY_DEFAULT_DIRECTORY_ROUTE } from '../utils/realtyWebsiteRoutes';

export const REALTY_LISTINGS_SECTION_ID = 'realEstateListings';
export const REALTY_LISTINGS_ANCHOR = `/#${REALTY_LISTINGS_SECTION_ID}`;
export const REALTY_LISTINGS_PATH = REALTY_DEFAULT_DIRECTORY_ROUTE;

export const useRealtyWebsiteNavigation = () => {
    const { t } = useTranslation();

    return useMemo(() => ({
        sectionId: REALTY_LISTINGS_SECTION_ID,
        anchor: REALTY_LISTINGS_ANCHOR,
        path: REALTY_LISTINGS_PATH,
        sectionLink: {
            label: t('realty.website.defaultTitle'),
            value: REALTY_LISTINGS_PATH,
        },
    }), [t]);
};
