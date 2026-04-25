import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export const REAL_ESTATE_LISTINGS_SECTION_ID = 'realEstateListings';
export const REAL_ESTATE_LISTINGS_ANCHOR = `/#${REAL_ESTATE_LISTINGS_SECTION_ID}`;
export const REAL_ESTATE_LISTINGS_PATH = '/listados';

export const useRealEstateWebsiteNavigation = () => {
    const { t } = useTranslation();

    return useMemo(() => ({
        sectionId: REAL_ESTATE_LISTINGS_SECTION_ID,
        anchor: REAL_ESTATE_LISTINGS_ANCHOR,
        path: REAL_ESTATE_LISTINGS_PATH,
        sectionLink: {
            label: t('realEstate.websiteListings.navigationLabel'),
            value: REAL_ESTATE_LISTINGS_PATH,
        },
    }), [t]);
};
