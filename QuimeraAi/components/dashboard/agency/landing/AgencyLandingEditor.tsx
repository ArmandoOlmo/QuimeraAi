import React, { Suspense, useRef } from 'react';
import { AgencyWebEditorProvider } from './AgencyWebEditorProvider';
import Controls from '../../../Controls';
import LandingPage from '../../../LandingPage';
import BrowserPreview from '../../../BrowserPreview';
import SimpleEditorHeader from '../../../SimpleEditorHeader';
import QuimeraLoader from '../../../ui/QuimeraLoader';
import { useUI } from '../../../../contexts/core/UIContext';

export const AgencyLandingEditor: React.FC = () => {
    const previewRef = useRef<HTMLIFrameElement>(null);
    const { isSidebarOpen, setIsSidebarOpen } = useUI();

    return (
        <AgencyWebEditorProvider>
            <div className="flex flex-col h-full bg-q-bg text-q-text">
                {/* Agregamos el header simple (sin DashboardSidebar para no mostrar Shop/Blog) */}
                <Suspense fallback={<QuimeraLoader />}>
                    <SimpleEditorHeader onOpenMobileMenu={() => setIsSidebarOpen(true)} />
                </Suspense>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Controls/Editor Sidebar */}
                    <Suspense fallback={null}>
                        <Controls />
                    </Suspense>

                    {/* Preview Area - Solo oculto en móvil si el sidebar de controles está abierto */}
                    <main className={`flex-1 min-h-0 p-4 sm:p-8 justify-center overflow-hidden ${isSidebarOpen ? 'hidden md:flex' : 'flex'}`}>
                        <Suspense fallback={<QuimeraLoader />}>
                            <BrowserPreview ref={previewRef}>
                                <LandingPage />
                            </BrowserPreview>
                        </Suspense>
                    </main>
                </div>
            </div>
        </AgencyWebEditorProvider>
    );
};
