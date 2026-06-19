import React from 'react';

export interface EcommerceContextValue {
    storeId: string;
    projectId: string | null;
    projectName: string;
}

export const EcommerceContext = React.createContext<EcommerceContextValue>({
    storeId: 'default',
    projectId: null,
    projectName: '',
});

export const useEcommerceContext = () => React.useContext(EcommerceContext);
