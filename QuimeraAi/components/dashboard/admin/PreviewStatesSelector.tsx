
import React, { useState } from 'react';
import { AlertCircle, Loader2, FileQuestion, CheckCircle } from 'lucide-react';

interface PreviewStatesSelectorProps {
    onStateChange: (state: PreviewState) => void;
    currentState: PreviewState;
}

export type PreviewState = 'normal' | 'loading' | 'error' | 'empty' | 'success';

const states: { value: PreviewState; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'normal', label: 'Normal', icon: <CheckCircle size={16} />, color: 'text-editor-text-primary' },
    { value: 'loading', label: 'Loading', icon: <Loader2 size={16} className="animate-spin" />, color: 'text-blue-400' },
    { value: 'error', label: 'Error', icon: <AlertCircle size={16} />, color: 'text-red-400' },
    { value: 'empty', label: 'Empty', icon: <FileQuestion size={16} />, color: 'text-yellow-400' },
    { value: 'success', label: 'Success', icon: <CheckCircle size={16} />, color: 'text-green-400' }
];

const PreviewStatesSelector: React.FC<PreviewStatesSelectorProps> = ({ onStateChange, currentState }) => {
    return (
        <div className="flex items-center gap-2 p-2 bg-editor-panel-bg border border-editor-border rounded-lg">
            <span className="text-xs font-medium text-editor-text-secondary">Preview State:</span>
            <div className="flex gap-1">
                {states.map((state) => (
                    <button
                        key={state.value}
                        onClick={() => onStateChange(state.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentState === state.value
                                ? 'bg-editor-accent text-editor-bg'
                                : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'
                        }`}
                        title={`Preview in ${state.label} state`}
                    >
                        <span className={currentState === state.value ? 'text-editor-bg' : state.color}>
                            {state.icon}
                        </span>
                        <span>{state.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PreviewStatesSelector;

