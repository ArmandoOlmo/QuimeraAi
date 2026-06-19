import React from 'react';

interface StorefrontThemeEditorShellProps {
    topbar: React.ReactNode;
    statusBar?: React.ReactNode;
    leftPanel: React.ReactNode;
    canvas: React.ReactNode;
    inspector: React.ReactNode;
}

const StorefrontThemeEditorShell: React.FC<StorefrontThemeEditorShellProps> = ({
    topbar,
    statusBar,
    leftPanel,
    canvas,
    inspector,
}) => (
    <div className="-m-3 flex h-[calc(100vh-7rem)] min-h-[760px] flex-col overflow-hidden bg-q-bg text-foreground sm:-m-6 lg:-m-8">
        {topbar}
        {statusBar}
        <main className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="hidden w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-q-border bg-q-surface/70 md:flex">
                {leftPanel}
            </aside>
            {canvas}
            {inspector}
        </main>
    </div>
);

export default StorefrontThemeEditorShell;
