import React from 'react';

interface StudioChatPanelProps {
    children: React.ReactNode;
    footer: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    beforeMessages?: React.ReactNode;
}

export const StudioChatPanel: React.FC<StudioChatPanelProps> = ({ children, footer, scrollRef, beforeMessages }) => (
    <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto flex w-full max-w-3xl flex-col space-y-4">
                {beforeMessages}
                {children}
            </div>
        </div>
        <div className="border-t border-q-border/70 bg-q-bg/85 p-3 backdrop-blur-xl lg:p-5">
            {footer}
        </div>
    </div>
);

export default StudioChatPanel;
