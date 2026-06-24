import React from 'react';
import { Sparkles } from 'lucide-react';

interface StudioQuickPromptsProps {
    prompts: string[];
    onSelect: (prompt: string) => void;
    disabled?: boolean;
    title?: string;
}

export const StudioQuickPrompts: React.FC<StudioQuickPromptsProps> = ({ prompts, onSelect, disabled, title }) => (
    <div className="rounded-lg border border-q-border bg-q-surface/70 p-3">
        {title && <div className="mb-2 text-xs font-semibold text-q-text">{title}</div>}
        <div className="flex flex-wrap gap-2">
            {prompts.map(prompt => (
                <button
                    key={prompt}
                    type="button"
                    onClick={() => onSelect(prompt)}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-q-border bg-q-bg px-2.5 py-1.5 text-xs font-medium text-q-text-secondary transition-colors hover:border-q-accent/50 hover:text-q-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Sparkles className="h-3 w-3" />
                    {prompt}
                </button>
            ))}
        </div>
    </div>
);

export default StudioQuickPrompts;
