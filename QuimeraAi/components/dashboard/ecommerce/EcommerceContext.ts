import React from 'react';

export interface EcommerceContextValue {
    storeId: string;
    engineStoreId?: string;
    publicStoreId?: string | null;
    projectId: string | null;
    projectName: string;
}

export const EcommerceContext = React.createContext<EcommerceContextValue>({
    storeId: 'default',
    engineStoreId: 'default',
    publicStoreId: null,
    projectId: null,
    projectName: '',
});

export const useEcommerceContext = () => React.useContext(EcommerceContext);
