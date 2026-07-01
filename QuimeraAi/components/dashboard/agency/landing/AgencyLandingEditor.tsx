import React, { Suspense, useRef } from 'react';
import { AgencyWebEditorProvider } from './AgencyWebEditorProvider';
import Controls from '../../../Controls';
import LandingPage from '../../../LandingPage';
import BrowserPreview from '../../../BrowserPreview';
import QuimeraLoader from '../../../ui/QuimeraLoader';
import { useUI } from '../../../../contexts/core/UIContext';
import { AgencyLandingHeaderControls } from './AgencyLandingHeaderControls';

export const AgencyLandingEditor: React.FC = () => {
    const previewRef = useRef<HTMLDivElement>(null);
    const { isSidebarOpen } = useUI();

    return (
        <AgencyWebEditorProvider>
            <AgencyLandingHeaderControls />
            <div className="flex h-full min-h-0 w-full min-w-0 flex-1 bg-q-bg text-q-text">
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
        </AgencyWebEditorProvider>
    );
};
