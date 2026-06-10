import React, { ReactNode } from 'react';

import { EditorProvider } from './EditorContext';
import { ProjectProvider } from './project';
import { FilesProvider } from './files';
import { MediaProvider } from './media';
import { CRMProvider } from './crm';
import { CMSProvider } from './cms';
import { AdminProvider } from './admin';
import { DomainsProvider } from './domains';
import { AIProvider } from './ai';
import { UpgradeProvider } from './UpgradeContext';
import { AgencyProvider } from './agency/AgencyContext';
import { AgencyContentProvider } from './agency/AgencyContentContext';
import { NewsProvider } from './news';
import { UndoProvider } from './undo';
import { BioPageProvider } from './bioPage';

export const AppFeatureProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AdminProvider>
            <ProjectProvider>
                <FilesProvider>
                    <MediaProvider>
                        <CRMProvider>
                            <CMSProvider>
                                <DomainsProvider>
                                    <AIProvider>
                                        <AgencyProvider>
                                            <AgencyContentProvider>
                                                <NewsProvider>
                                                    <UpgradeProvider>
                                                        <UndoProvider>
                                                            <BioPageProvider>
                                                                <EditorProvider>
                                                                    {children}
                                                                </EditorProvider>
                                                            </BioPageProvider>
                                                        </UndoProvider>
                                                    </UpgradeProvider>
                                                </NewsProvider>
                                            </AgencyContentProvider>
                                        </AgencyProvider>
                                    </AIProvider>
                                </DomainsProvider>
                            </CMSProvider>
                        </CRMProvider>
                    </MediaProvider>
                </FilesProvider>
            </ProjectProvider>
        </AdminProvider>
    );
};

export default AppFeatureProviders;
