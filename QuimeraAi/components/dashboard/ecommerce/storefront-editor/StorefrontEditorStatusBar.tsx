import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface StorefrontEditorStatusBarProps {
    message?: string | null;
    error?: string | null;
}

const StorefrontEditorStatusBar: React.FC<StorefrontEditorStatusBarProps> = ({ message, error }) => {
    if (!message && !error) return null;

    return (
        <div className={`flex h-9 flex-shrink-0 items-center gap-2 border-b px-4 text-xs font-medium ${
            error
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}>
            {error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span className="truncate">{error || message}</span>
        </div>
    );
};

export default StorefrontEditorStatusBar;
