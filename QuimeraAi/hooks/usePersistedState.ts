import { useState, useCallback } from 'react';

/**
 * usePersistedState
 * 
 * A generic hook for state persisted in localStorage.
 * Eliminates the repetitive pattern of useState + localStorage
 * that was duplicated 6+ times in Dashboard.tsx.
 * 
 * @param key - localStorage key (e.g. 'quimera_news_collapsed')
 * @param defaultValue - default when nothing is stored
 * @param serialize - optional serializer (defaults to String)
 * @param deserialize - optional deserializer (defaults to identity)
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T,
    serialize: (value: T) => string = (v) => String(v),
    deserialize: (raw: string) => T = (raw) => raw as unknown as T,
): [T, (valueOrUpdater: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                return deserialize(stored);
            }
        } catch {
            // localStorage might not be available
        }
        return defaultValue;
    });

    const setPersisted = useCallback(
        (valueOrUpdater: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const next =
                    typeof valueOrUpdater === 'function'
                        ? (valueOrUpdater as (prev: T) => T)(prev)
                        : valueOrUpdater;
                try {
                    localStorage.setItem(key, serialize(next));
                } catch {
                    // Silently fail if localStorage is full/unavailable
                }
                return next;
            });
        },
        [key, serialize],
    );

    return [value, setPersisted];
}

/**
 * Convenience: boolean variant that stores 'true'/'false' strings.
 */
export function usePersistedBoolean(
    key: string,
    defaultValue: boolean,
): [boolean, (v: boolean | ((prev: boolean) => boolean)) => void] {
    return usePersistedState<boolean>(
        key,
        defaultValue,
        String,
        (raw) => raw === 'true',
    );
}

/**
 * Convenience: JSON variant for complex types (arrays, objects).
 */
export function usePersistedJSON<T>(
    key: string,
    defaultValue: T,
    validate?: (parsed: unknown) => parsed is T,
): [T, (v: T | ((prev: T) => T)) => void] {
    return usePersistedState<T>(
        key,
        defaultValue,
        (v) => JSON.stringify(v),
        (raw) => {
            try {
                const parsed = JSON.parse(raw);
                if (validate && !validate(parsed)) {
                    return defaultValue;
                }
                return parsed as T;
            } catch {
                return defaultValue;
            }
        },
    );
}
