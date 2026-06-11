import type { StoredTimestamp } from '../types/ecommerce';

/** Normalize any timestamp shape to Unix seconds. */
export function getTimestampSeconds(ts: StoredTimestamp | null | undefined): number {
    if (ts == null) return 0;
    if (typeof ts === 'number') return ts > 1e12 ? Math.floor(ts / 1000) : ts;
    if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
    if (typeof ts === 'string') {
        const parsed = Date.parse(ts);
        return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
    }
    return ts.seconds;
}

/** Convert a StoredTimestamp to a Date. */
export function timestampToDate(ts: StoredTimestamp | null | undefined): Date {
    return new Date(getTimestampSeconds(ts) * 1000);
}

/** Convert a Date to a stored timestamp object. */
export function dateToTimestamp(date: Date): { seconds: number; nanoseconds: number } {
    return {
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
    };
}
