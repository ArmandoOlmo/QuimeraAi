import React from 'react';
import { ChevronDown, Home } from 'lucide-react';

interface StorefrontEditorNavigatorProps {
    pageLabel: string;
}

const StorefrontEditorNavigator: React.FC<StorefrontEditorNavigatorProps> = ({ pageLabel }) => (
    <div className="border-b border-q-border p-3">
        <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-q-border bg-q-bg px-3 text-left text-xs font-semibold text-foreground"
        >
            <span className="flex min-w-0 items-center gap-2">
                <Home size={14} />
                <span className="truncate">{pageLabel}</span>
            </span>
            <ChevronDown size={14} className="text-q-text-muted" />
        </button>
    </div>
);

export default StorefrontEditorNavigator;
