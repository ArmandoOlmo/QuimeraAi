import { StoredTimestamp } from '../types/ecommerce';

/**
 * Converts a Supabase ISO date string to a StoredTimestamp object
 * for backward compatibility with frontend components expecting timestamp objects.
 */
export const toStoredTimestamp = (isoString?: string | null): StoredTimestamp => {
    if (!isoString) {
        return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    }
    const date = new Date(isoString);
    return { seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 };
};

/**
 * Converts a JavaScript Date or ISO string to a StoredTimestamp
 */
export const dateToTimestamp = (date: Date | string): StoredTimestamp => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
};

export const currentTimestamp = (): StoredTimestamp => {
    return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
};
