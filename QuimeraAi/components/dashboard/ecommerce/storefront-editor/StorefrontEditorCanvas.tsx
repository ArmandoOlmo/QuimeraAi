import React from 'react';
import type { StorefrontEditorPreviewMode } from './StorefrontEditorDeviceSwitch';

const previewWidths: Record<StorefrontEditorPreviewMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
};

interface StorefrontEditorCanvasProps {
    previewUrl: string;
    previewMode: StorefrontEditorPreviewMode;
    displayUrl: string;
}

const StorefrontEditorCanvas: React.FC<StorefrontEditorCanvasProps> = ({
    previewUrl,
    previewMode,
    displayUrl,
}) => (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc] p-4">
        <div
            className="mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition-[width] duration-200"
            style={{
                width: previewWidths[previewMode],
                maxWidth: '100%',
            }}
        >
            <div className="flex h-10 flex-shrink-0 items-center border-b border-slate-200 bg-white px-4">
                <div className="flex gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="flex min-w-0 flex-1 justify-center px-4">
                    <div className="max-w-xl truncate rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-center text-[11px] text-slate-500">
                        {displayUrl}
                    </div>
                </div>
                <div className="w-12" />
            </div>
            <iframe
                title="Vista previa de tienda online"
                src={previewUrl}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                scrolling="yes"
                className="min-h-0 flex-1 border-0 bg-white"
            />
        </div>
    </section>
);

export default StorefrontEditorCanvas;
