type TimestampLike = {
    seconds?: number;
    nanoseconds?: number;
};

export interface AgencyAnalyticsClientSnapshot {
    id?: string;
    status?: string | null;
    createdAt?: string | Date | TimestampLike | null;
    billing?: {
        mrr?: number | string | null;
        monthlyPrice?: number | string | null;
        checkoutCompletedAt?: string | Date | TimestampLike | null;
        checkoutStartedAt?: string | Date | TimestampLike | null;
    } | null;
    billingInfo?: {
        mrr?: number | string | null;
    } | null;
}

export interface AgencyMrrHistoryPoint {
    month: string;
    mrr: number;
    clients: number;
}

export interface BuildAgencyMrrHistoryOptions {
    now?: Date;
    months?: number;
    locale?: string;
}

function readFiniteAmount(value: unknown): number {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function readAgencyAnalyticsClientMrr(client: AgencyAnalyticsClientSnapshot): number {
    return readFiniteAmount(client.billing?.mrr)
        || readFiniteAmount(client.billing?.monthlyPrice)
        || readFiniteAmount(client.billingInfo?.mrr);
}

export function readAgencyAnalyticsDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'object' && 'seconds' in value) {
        const seconds = Number((value as TimestampLike).seconds);
        if (!Number.isFinite(seconds)) return null;
        const parsed = new Date(seconds * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function resolveClientActivationDate(client: AgencyAnalyticsClientSnapshot, fallback: Date): Date {
    return readAgencyAnalyticsDate(client.billing?.checkoutCompletedAt)
        || readAgencyAnalyticsDate(client.billing?.checkoutStartedAt)
        || readAgencyAnalyticsDate(client.createdAt)
        || fallback;
}

export function buildAgencyMrrHistory(
    clients: AgencyAnalyticsClientSnapshot[],
    options: BuildAgencyMrrHistoryOptions = {},
): AgencyMrrHistoryPoint[] {
    const months = Math.max(1, Math.min(24, Math.round(options.months || 12)));
    const now = options.now && !Number.isNaN(options.now.getTime()) ? options.now : new Date();
    const firstMonth = addMonths(startOfMonth(now), -(months - 1));
    const monthFormatter = new Intl.DateTimeFormat(options.locale || 'es', { month: 'short' });

    const normalizedClients = clients
        .map(client => ({
            activationDate: resolveClientActivationDate(client, firstMonth),
            mrr: readAgencyAnalyticsClientMrr(client),
        }))
        .filter(client => client.mrr > 0);

    return Array.from({ length: months }, (_, index) => {
        const monthStart = addMonths(firstMonth, index);
        const monthEnd = endOfMonth(monthStart);
        const activeClients = normalizedClients.filter(client => client.activationDate <= monthEnd);

        return {
            month: monthFormatter.format(monthStart).replace('.', ''),
            mrr: activeClients.reduce((sum, client) => sum + client.mrr, 0),
            clients: activeClients.length,
        };
    });
}
