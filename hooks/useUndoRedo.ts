/**
 * useUndoRedo Hook
 * 
 * Generic hook for managing undo/redo history in any module.
 * Uses the Command pattern to track and revert state changes.
 * 
 * @example
 * const { pushAction, undo, redo, canUndo, canRedo } = useUndoRedo<LeadState>({
 *   moduleId: 'leads',
 *   maxHistory: 50,
 *   onUndo: (action) => console.log('Undone:', action.description)
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Represents a single undoable action with before/after state
 */
export interface UndoableAction<T = any> {
    /** Unique identifier for the action */
    id: string;
    /** Type of action (e.g., 'update_lead', 'delete_product') */
    type: string;
    /** Human-readable description (e.g., 'Changed lead status to "contacted"') */
    description: string;
    /** State before the action was performed */
    previousState: T;
    /** State after the action was performed */
    newState: T;
    /** Timestamp when action was recorded */
    timestamp: number;
    /** Module where action occurred */
    moduleId: string;
    /** Optional metadata for the action */
    metadata?: Record<string, any>;
}

export interface UseUndoRedoOptions<T = any> {
    /** Maximum number of actions to keep in history (default: 50) */
    maxHistory?: number;
    /** Unique identifier for the module using this hook */
    moduleId: string;
    /** Callback when an action is undone */
    onUndo?: (action: UndoableAction<T>) => void;
    /** Callback when an action is redone */
    onRedo?: (action: UndoableAction<T>) => void;
    /** Optional: Register with global undo context */
    registerGlobal?: boolean;
}

export interface UseUndoRedoReturn<T = any> {
    /** Add a new action to history */
    pushAction: (action: Omit<UndoableAction<T>, 'id' | 'timestamp' | 'moduleId'>) => void;
    /** Undo the last action, returns the undone action or null */
    undo: () => UndoableAction<T> | null;
    /** Redo the last undone action, returns the redone action or null */
    redo: () => UndoableAction<T> | null;
    /** Whether there are actions to undo */
    canUndo: boolean;
    /** Whether there are actions to redo */
    canRedo: boolean;
    /** Current undo history stack */
    history: UndoableAction<T>[];
    /** Current redo stack */
    redoStack: UndoableAction<T>[];
    /** Clear all history */
    clear: () => void;
    /** Get the last action without undoing it */
    peekUndo: () => UndoableAction<T> | null;
    /** Get the next redo action without redoing it */
    peekRedo: () => UndoableAction<T> | null;
    /** Total number of actions in history */
    historyLength: number;
    /** Get description of last undoable action */
    lastActionDescription: string | null;
}

/**
 * Generate a unique ID for actions
 */
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook for managing undo/redo functionality
 */
export function useUndoRedo<T = any>(
    options: UseUndoRedoOptions<T>
): UseUndoRedoReturn<T> {
    const { maxHistory = 50, moduleId, onUndo, onRedo } = options;

    // Undo stack (past actions)
    const [history, setHistory] = useState<UndoableAction<T>[]>([]);

    // Redo stack (undone actions that can be redone)
    const [redoStack, setRedoStack] = useState<UndoableAction<T>[]>([]);

    // Keep callbacks in refs to avoid stale closures
    const onUndoRef = useRef(onUndo);
    const onRedoRef = useRef(onRedo);

    useEffect(() => {
        onUndoRef.current = onUndo;
        onRedoRef.current = onRedo;
    }, [onUndo, onRedo]);

    /**
     * Push a new action to history
     * Clears redo stack when new action is added
     */
    const pushAction = useCallback(
        (action: Omit<UndoableAction<T>, 'id' | 'timestamp' | 'moduleId'>) => {
            const fullAction: UndoableAction<T> = {
                ...action,
                id: generateId(),
                timestamp: Date.now(),
                moduleId,
            };

            setHistory((prev) => {
                const newHistory = [...prev, fullAction];
                // Trim history if exceeds max
                if (newHistory.length > maxHistory) {
                    return newHistory.slice(-maxHistory);
                }
                return newHistory;
            });

            // Clear redo stack when new action is performed
            setRedoStack([]);
        },
        [moduleId, maxHistory]
    );

    /**
     * Undo the last action
     */
    const undo = useCallback((): UndoableAction<T> | null => {
        if (history.length === 0) return null;

        const lastAction = history[history.length - 1];

        setHistory((prev) => prev.slice(0, -1));
        setRedoStack((prev) => [...prev, lastAction]);

        // Trigger callback
        if (onUndoRef.current) {
            onUndoRef.current(lastAction);
        }

        return lastAction;
    }, [history]);

    /**
     * Redo the last undone action
     */
    const redo = useCallback((): UndoableAction<T> | null => {
        if (redoStack.length === 0) return null;

        const actionToRedo = redoStack[redoStack.length - 1];

        setRedoStack((prev) => prev.slice(0, -1));
        setHistory((prev) => [...prev, actionToRedo]);

        // Trigger callback
        if (onRedoRef.current) {
            onRedoRef.current(actionToRedo);
        }

        return actionToRedo;
    }, [redoStack]);

    /**
     * Clear all history
     */
    const clear = useCallback(() => {
        setHistory([]);
        setRedoStack([]);
    }, []);

    /**
     * Peek at the last action without undoing
     */
    const peekUndo = useCallback((): UndoableAction<T> | null => {
        if (history.length === 0) return null;
        return history[history.length - 1];
    }, [history]);

    /**
     * Peek at the next redo action without redoing
     */
    const peekRedo = useCallback((): UndoableAction<T> | null => {
        if (redoStack.length === 0) return null;
        return redoStack[redoStack.length - 1];
    }, [redoStack]);

    return {
        pushAction,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        history,
        redoStack,
        clear,
        peekUndo,
        peekRedo,
        historyLength: history.length,
        lastActionDescription: history.length > 0 ? history[history.length - 1].description : null,
    };
}

/**
 * Helper to create action descriptions for common operations
 */
export const createActionDescription = {
    update: (entity: string, field: string) => `Updated ${field} in ${entity}`,
    delete: (entity: string, name?: string) => name ? `Deleted ${entity}: ${name}` : `Deleted ${entity}`,
    create: (entity: string, name?: string) => name ? `Created ${entity}: ${name}` : `Created ${entity}`,
    move: (entity: string, from: string, to: string) => `Moved ${entity} from ${from} to ${to}`,
    reorder: (entity: string) => `Reordered ${entity}`,
    statusChange: (entity: string, from: string, to: string) => `Changed ${entity} status from "${from}" to "${to}"`,
};

export default useUndoRedo;
