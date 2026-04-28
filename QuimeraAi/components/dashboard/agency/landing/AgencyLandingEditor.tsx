import React, { Suspense, useRef } from 'react';
import { AgencyWebEditorProvider } from './AgencyWebEditorProvider';
import Controls from '../../../Controls';
import LandingPage from '../../../LandingPage';
import BrowserPreview from '../../../BrowserPreview';
import SimpleEditorHeader from '../../../SimpleEditorHeader';
import QuimeraLoader from '../../../ui/QuimeraLoader';

export const AgencyLandingEditor: React.FC = () => {
    const previewRef = useRef<HTMLIFrameElement>(null);

    return (
        <AgencyWebEditorProvider>
            <div className="flex flex-col h-full bg-q-bg text-q-text">
                {/* Agregamos el header simple (sin DashboardSidebar para no mostrar Shop/Blog) */}
                <Suspense fallback={<QuimeraLoader />}>
                    <SimpleEditorHeader onOpenMobileMenu={() => {}} />
                </Suspense>

                <div className="flex flex-1 overflow-hidden relative">
                    {/* Controls/Editor Sidebar */}
                    <Suspense fallback={null}>
                        <Controls />
                    </Suspense>

                    {/* Preview Area */}
                    <main className="flex-1 min-h-0 p-4 sm:p-8 flex justify-center overflow-hidden hidden md:flex">
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
