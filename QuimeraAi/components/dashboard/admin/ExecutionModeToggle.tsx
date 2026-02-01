import React from 'react';
import { Zap, Lock, Info } from 'lucide-react';
import {
    DEFAULT_EXECUTION_MODE,
    EXECUTION_MODE_LABELS,
    EXECUTION_MODE_DESCRIPTIONS,
    EXECUTION_MODE_FLAGS
} from '../../../constants/executionModeConfig';

interface ExecutionModeToggleProps {
    onBack: () => void;
}

/**
 * Execution Mode Toggle (DISABLED / Coming Soon)
 * 
 * This component displays a read-only toggle for the future Execution Mode feature.
 * Currently:
 * - Toggle is disabled and cannot be changed
 * - Shows "Instant" as the locked default
 * - Shows "Coming Soon" badge
 * 
 * NO LOGIC IS CONNECTED - this is UI preparation only.
 */
const ExecutionModeToggle: React.FC<ExecutionModeToggleProps> = ({ onBack }) => {
    // Current mode is always the default (instant) - not stored or changeable
    const currentMode = DEFAULT_EXECUTION_MODE;
    const isDisabled = !EXECUTION_MODE_FLAGS.allowToggle;

    return (
        <div className="min-h-screen bg-editor-bg p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-editor-panel-bg border border-editor-border hover:border-editor-accent transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-editor-text-primary">
                            ⚡ Execution Mode
                        </h1>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-full">
                            Coming Soon
                        </span>
                    </div>
                    <p className="text-editor-text-secondary mt-1">
                        Configure how the Global Assistant executes actions
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-blue-400 font-medium">Feature in Development</p>
                    <p className="text-editor-text-secondary text-sm mt-1">
                        This feature is being prepared for a future release. The current behavior (Instant mode) will remain unchanged until this feature is activated.
                    </p>
                </div>
            </div>

            {/* Mode Toggle Card */}
            <div className="bg-editor-panel-bg border border-editor-border rounded-xl p-6 max-w-2xl">
                <h2 className="text-lg font-semibold text-editor-text-primary mb-4">
                    Assistant Execution Behavior
                </h2>

                <div className="space-y-4">
                    {/* Instant Mode (Current/Locked) */}
                    <div
                        className={`
              relative p-4 rounded-lg border-2 transition-all
              ${currentMode === 'instant'
                                ? 'border-editor-accent bg-editor-accent/5'
                                : 'border-editor-border bg-editor-panel-bg opacity-50'}
            `}
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-editor-accent/20">
                                <Zap className="w-6 h-6 text-editor-accent" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-editor-text-primary">
                                        {EXECUTION_MODE_LABELS.instant}
                                    </h3>
                                    <span className="px-2 py-0.5 text-xs font-medium bg-editor-accent/20 text-editor-accent rounded">
                                        Current
                                    </span>
                                    <Lock className="w-4 h-4 text-editor-text-secondary" />
                                </div>
                                <p className="text-sm text-editor-text-secondary mt-1">
                                    {EXECUTION_MODE_DESCRIPTIONS.instant}
                                </p>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-editor-accent bg-editor-accent flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* Safe Mode (Disabled/Future) */}
                    <div
                        className={`
              relative p-4 rounded-lg border-2 transition-all cursor-not-allowed
              border-editor-border bg-editor-panel-bg opacity-40
            `}
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-gray-500/20">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-editor-text-primary">
                                        {EXECUTION_MODE_LABELS.safe}
                                    </h3>
                                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded">
                                        Not Available
                                    </span>
                                </div>
                                <p className="text-sm text-editor-text-secondary mt-1">
                                    {EXECUTION_MODE_DESCRIPTIONS.safe}
                                </p>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-editor-border" />
                        </div>
                    </div>
                </div>

                {/* Disabled State Notice */}
                {isDisabled && (
                    <div className="mt-6 p-3 bg-editor-border/30 rounded-lg text-center">
                        <p className="text-sm text-editor-text-secondary">
                            <Lock className="w-4 h-4 inline-block mr-1 -mt-0.5" />
                            This setting cannot be changed while the feature is in development
                        </p>
                    </div>
                )}
            </div>

            {/* Technical Note */}
            <div className="mt-6 text-xs text-editor-text-secondary max-w-2xl">
                <p>
                    <strong>Note:</strong> When enabled, Safe mode will require confirmation before the assistant performs actions like creating content, modifying settings, or executing tools.
                </p>
            </div>
        </div>
    );
};

export default ExecutionModeToggle;
