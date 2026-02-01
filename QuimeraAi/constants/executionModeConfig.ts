/**
 * Execution Mode Configuration (DORMANT - NOT ACTIVE)
 * 
 * This configuration is for future use. Currently:
 * - executionMode is always "instant"
 * - No logic reads or uses this value
 * - This file exists to prepare infrastructure for future activation
 * 
 * DO NOT connect this to any execution logic.
 */

// =============================================================================
// TYPES (Inactive)
// =============================================================================

export type ExecutionMode = 'instant' | 'safe';

// =============================================================================
// DEFAULT VALUES (Inactive)
// =============================================================================

/**
 * Default execution mode - ALWAYS "instant" (current behavior)
 * This variable is NOT referenced by any logic yet
 */
export const DEFAULT_EXECUTION_MODE: ExecutionMode = 'instant';

// =============================================================================
// PLACEHOLDER CONFIGURATION (Dormant - NOT USED)
// =============================================================================

/**
 * Placeholder prompt identifiers for future use
 * These exist for future prompt switching capability
 * 
 * IMPORTANT: These are NOT loaded or used anywhere
 */
export const EXECUTION_MODE_PROMPTS = {
    'global-assistant-instant': null, // Current behavior - no changes
    'global-assistant-safe': null,    // Future: confirmation-based mode
} as const;

// =============================================================================
// FEATURE FLAGS (All Disabled)
// =============================================================================

export const EXECUTION_MODE_FLAGS = {
    /** Master switch - feature is completely inactive */
    isFeatureEnabled: false,
    /** Show disabled toggle in Super Admin UI */
    showInUI: true,
    /** Allow toggle interaction (false = read-only) */
    allowToggle: false,
} as const;

// =============================================================================
// UI LABELS
// =============================================================================

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
    instant: '⚡ Instant',
    safe: '🛡️ Safe',
};

export const EXECUTION_MODE_DESCRIPTIONS: Record<ExecutionMode, string> = {
    instant: 'Actions execute immediately without confirmation',
    safe: 'Actions require confirmation before execution',
};
