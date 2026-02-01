/**
 * UndoContext
 * 
 * Global context for managing undo/redo across the application.
 * Provides:
 * - Module registration for coordinated undo/redo
 * - Global keyboard shortcuts (Ctrl/Cmd + Z, Ctrl/Cmd + Shift + Z)
 * - Active module tracking
 * - Toast notifications for undo/redo actions
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { UndoableAction } from '../../hooks/useUndoRedo';

/**
 * Handlers that each module provides for undo/redo operations
 */
export interface UndoHandlers {
    /** Perform undo in this module */
    undo: () => UndoableAction | null;
    /** Perform redo in this module */
    redo: () => UndoableAction | null;
    /** Check if undo is available */
    canUndo: () => boolean;
    /** Check if redo is available */
    canRedo: () => boolean;
    /** Get description of last action */
    getLastActionDescription: () => string | null;
}

/**
 * Registered module information
 */
interface RegisteredModule {
    moduleId: string;
    handlers: UndoHandlers;
    priority?: number; // Higher priority modules get preference
}

export interface UndoContextType {
    /** Register a module's undo/redo handlers */
    registerModule: (moduleId: string, handlers: UndoHandlers, priority?: number) => void;
    /** Unregister a module */
    unregisterModule: (moduleId: string) => void;
    /** Currently active module (receives keyboard shortcuts) */
    activeModule: string | null;
    /** Set the active module */
    setActiveModule: (moduleId: string | null) => void;
    /** Perform undo on active module */
    globalUndo: () => void;
    /** Perform redo on active module */
    globalRedo: () => void;
    /** Whether active module can undo */
    canUndo: boolean;
    /** Whether active module can redo */
    canRedo: boolean;
    /** Last undone/redone action */
    lastAction: UndoableAction | null;
    /** Last action type ('undo' | 'redo' | null) */
    lastActionType: 'undo' | 'redo' | null;
    /** Description of last available action */
    lastActionDescription: string | null;
    /** Show a toast notification for undo/redo */
    showUndoNotification: (message: string, type: 'undo' | 'redo') => void;
    /** List of registered module IDs */
    registeredModules: string[];
    /** Check if keyboard shortcuts are enabled */
    keyboardShortcutsEnabled: boolean;
    /** Enable/disable keyboard shortcuts */
    setKeyboardShortcutsEnabled: (enabled: boolean) => void;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

/**
 * Hook to use the global undo context
 */
export const useUndo = (): UndoContextType => {
    const context = useContext(UndoContext);
    if (!context) {
        throw new Error('useUndo must be used within an UndoProvider');
    }
    return context;
};

/**
 * Safe version that returns null if not in provider
 */
export const useSafeUndo = (): UndoContextType | null => {
    return useContext(UndoContext) || null;
};

interface UndoProviderProps {
    children: ReactNode;
    /** Show toast notifications for undo/redo (default: true) */
    showNotifications?: boolean;
    /** Custom notification handler */
    onNotification?: (message: string, type: 'undo' | 'redo') => void;
}

/**
 * Provider component for global undo functionality
 */
export const UndoProvider: React.FC<UndoProviderProps> = ({
    children,
    showNotifications = true,
    onNotification,
}) => {
    // Registered modules
    const [modules, setModules] = useState<Map<string, RegisteredModule>>(new Map());

    // Currently active module
    const [activeModule, setActiveModule] = useState<string | null>(null);

    // Last action performed
    const [lastAction, setLastAction] = useState<UndoableAction | null>(null);
    const [lastActionType, setLastActionType] = useState<'undo' | 'redo' | null>(null);

    // Keyboard shortcuts enabled
    const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);

    // Notification state
    const [notification, setNotification] = useState<{ message: string; type: 'undo' | 'redo' } | null>(null);

    // Refs for stable callbacks
    const modulesRef = useRef(modules);
    const activeModuleRef = useRef(activeModule);

    useEffect(() => {
        modulesRef.current = modules;
    }, [modules]);

    useEffect(() => {
        activeModuleRef.current = activeModule;
    }, [activeModule]);

    /**
     * Register a module's undo handlers
     */
    const registerModule = useCallback((
        moduleId: string,
        handlers: UndoHandlers,
        priority: number = 0
    ) => {
        setModules((prev) => {
            const next = new Map(prev);
            next.set(moduleId, { moduleId, handlers, priority });
            return next;
        });
        console.log(`[UndoContext] Module registered: ${moduleId}`);
    }, []);

    /**
     * Unregister a module
     */
    const unregisterModule = useCallback((moduleId: string) => {
        setModules((prev) => {
            const next = new Map(prev);
            next.delete(moduleId);
            return next;
        });

        // Clear active module if it was unregistered
        setActiveModule((current) => current === moduleId ? null : current);
        console.log(`[UndoContext] Module unregistered: ${moduleId}`);
    }, []);

    /**
     * Get the active module's handlers
     */
    const getActiveHandlers = useCallback((): UndoHandlers | null => {
        const currentActive = activeModuleRef.current;
        if (!currentActive) return null;

        const module = modulesRef.current.get(currentActive);
        return module?.handlers || null;
    }, []);

    /**
     * Perform global undo
     */
    const globalUndo = useCallback(() => {
        const handlers = getActiveHandlers();
        if (!handlers || !handlers.canUndo()) return;

        const action = handlers.undo();
        if (action) {
            setLastAction(action);
            setLastActionType('undo');

            if (showNotifications) {
                const message = `✓ Deshecho: ${action.description}`;
                if (onNotification) {
                    onNotification(message, 'undo');
                } else {
                    setNotification({ message, type: 'undo' });
                }
            }
        }
    }, [getActiveHandlers, showNotifications, onNotification]);

    /**
     * Perform global redo
     */
    const globalRedo = useCallback(() => {
        const handlers = getActiveHandlers();
        if (!handlers || !handlers.canRedo()) return;

        const action = handlers.redo();
        if (action) {
            setLastAction(action);
            setLastActionType('redo');

            if (showNotifications) {
                const message = `↻ Rehecho: ${action.description}`;
                if (onNotification) {
                    onNotification(message, 'redo');
                } else {
                    setNotification({ message, type: 'redo' });
                }
            }
        }
    }, [getActiveHandlers, showNotifications, onNotification]);

    /**
     * Show notification manually
     */
    const showUndoNotification = useCallback((message: string, type: 'undo' | 'redo') => {
        if (onNotification) {
            onNotification(message, type);
        } else {
            setNotification({ message, type });
        }
    }, [onNotification]);

    /**
     * Keyboard shortcut handler
     */
    useEffect(() => {
        if (!keyboardShortcutsEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we're in an input/textarea (don't intercept there)
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Allow native undo in text inputs unless explicitly handled
            if (isInput) {
                // Check if module wants to handle inputs
                const handlers = getActiveHandlers();
                if (!handlers) return; // Let native undo work
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            if (modifier && e.key.toLowerCase() === 'z') {
                // Don't prevent default if no active module
                const handlers = getActiveHandlers();
                if (!handlers) return;

                e.preventDefault();

                if (e.shiftKey) {
                    // Ctrl/Cmd + Shift + Z = Redo
                    globalRedo();
                } else {
                    // Ctrl/Cmd + Z = Undo
                    globalUndo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyboardShortcutsEnabled, globalUndo, globalRedo, getActiveHandlers]);

    /**
     * Auto-clear notification after delay
     */
    useEffect(() => {
        if (!notification) return;

        const timer = setTimeout(() => {
            setNotification(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [notification]);

    /**
     * Computed values
     */
    const canUndo = activeModule ? (modules.get(activeModule)?.handlers.canUndo() || false) : false;
    const canRedo = activeModule ? (modules.get(activeModule)?.handlers.canRedo() || false) : false;
    const lastActionDescription = activeModule
        ? (modules.get(activeModule)?.handlers.getLastActionDescription() || null)
        : null;
    const registeredModules = Array.from(modules.keys());

    const value: UndoContextType = {
        registerModule,
        unregisterModule,
        activeModule,
        setActiveModule,
        globalUndo,
        globalRedo,
        canUndo,
        canRedo,
        lastAction,
        lastActionType,
        lastActionDescription,
        showUndoNotification,
        registeredModules,
        keyboardShortcutsEnabled,
        setKeyboardShortcutsEnabled,
    };

    return (
        <UndoContext.Provider value={value}>
            {children}

            {/* Built-in notification toast */}
            {notification && !onNotification && (
                <div
                    className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
                    role="alert"
                >
                    <div className={`
            flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
            ${notification.type === 'undo'
                            ? 'bg-amber-500/90 text-white'
                            : 'bg-blue-500/90 text-white'
                        }
          `}>
                        <span>{notification.type === 'undo' ? '↩' : '↻'}</span>
                        <span>{notification.message}</span>
                    </div>
                </div>
            )}
        </UndoContext.Provider>
    );
};

export default UndoContext;
