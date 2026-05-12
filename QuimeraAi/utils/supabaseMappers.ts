import { FirebaseTimestamp } from '../types/ecommerce';

/**
 * Converts a Supabase ISO date string to a FirebaseTimestamp object
 * for backward compatibility with frontend components expecting Firestore dates.
 */
export const toFirebaseTimestamp = (isoString?: string | null): FirebaseTimestamp => {
    if (!isoString) {
        return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
    }
    const date = new Date(isoString);
    return { seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 };
};

/**
 * Converts a JavaScript Date or ISO string to a FirebaseTimestamp
 */
export const dateToTimestamp = (date: Date | string): FirebaseTimestamp => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
};

export const currentTimestamp = (): FirebaseTimestamp => {
    return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
};
