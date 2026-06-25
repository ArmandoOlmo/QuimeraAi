import type { RealtyListingsSectionData } from '../types/realty';

export const REALTY_DEFAULT_DIRECTORY_ROUTE = '/listados';
export const REALTY_DEFAULT_DETAIL_ROUTE_PATTERN = '/listados/:slug';

export const REALTY_DEFAULT_ROUTE_SEGMENTS = [
    'listados',
    'listings',
    'properties',
    'propiedades',
    'inmuebles',
    'real-estate',
];

const ABSOLUTE_OR_PROTOCOL_ROUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const stripTrailingSlash = (value: string) => {
    if (value === '/') return value;
    return value.replace(/\/+$/, '');
};

const normalizeRoute = (route: string, fallback: string) => {
    const trimmed = route.trim();
    if (!trimmed || ABSOLUTE_OR_PROTOCOL_ROUTE.test(trimmed) || trimmed.startsWith('#')) return fallback;

    const withoutQuery = trimmed.split(/[?#]/)[0]?.trim() || '';
    if (!withoutQuery || withoutQuery.includes('..')) return fallback;

    const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/');
    return stripTrailingSlash(collapsed) || fallback;
};

export const sanitizeRealtyDirectoryRoute = (route?: string | null) =>
    normalizeRoute(route || '', REALTY_DEFAULT_DIRECTORY_ROUTE);

export const sanitizeRealtyDetailRoutePattern = (route?: string | null) => {
    const normalized = normalizeRoute(route || '', REALTY_DEFAULT_DETAIL_ROUTE_PATTERN);
    if (normalized.includes(':slug')) return normalized;
    return `${stripTrailingSlash(normalized)}/:slug`;
};

export const resolveRealtyDirectoryRoute = (data?: Pick<RealtyListingsSectionData, 'directoryRoute'> | null) =>
    sanitizeRealtyDirectoryRoute(data?.directoryRoute);

export const resolveRealtyDetailRoutePattern = (data?: Pick<RealtyListingsSectionData, 'detailRoutePattern'> | null) =>
    sanitizeRealtyDetailRoutePattern(data?.detailRoutePattern);

export const resolveRealtyDetailPath = (
    data: Pick<RealtyListingsSectionData, 'detailRoutePattern'> | null | undefined,
    slug: string
) => {
    const safeSlug = encodeURIComponent(slug.trim()).replace(/%2F/gi, '-');
    const pattern = resolveRealtyDetailRoutePattern(data);
    return pattern.includes(':slug') ? pattern.replace(':slug', safeSlug) : `${stripTrailingSlash(pattern)}/${safeSlug}`;
};

const routeCandidates = (primary: string, fallback: string) => {
    const values = [primary, fallback].filter(Boolean).map(route => stripTrailingSlash(route));
    return Array.from(new Set(values));
};

const normalizeIncomingPath = (path: string) => {
    const normalized = normalizeRoute(path || '/', '/');
    return stripTrailingSlash(normalized) || '/';
};

export const matchRealtyDirectoryRoute = (
    path: string,
    data?: Pick<RealtyListingsSectionData, 'directoryRoute'> | null
) => {
    const normalizedPath = normalizeIncomingPath(path);
    return routeCandidates(resolveRealtyDirectoryRoute(data), REALTY_DEFAULT_DIRECTORY_ROUTE)
        .some(route => normalizedPath === route);
};

const matchDetailPattern = (path: string, pattern: string) => {
    const normalizedPath = normalizeIncomingPath(path);
    const normalizedPattern = sanitizeRealtyDetailRoutePattern(pattern);
    const tokenIndex = normalizedPattern.indexOf(':slug');
    if (tokenIndex < 0) return null;

    const prefix = normalizedPattern.slice(0, tokenIndex);
    const suffix = normalizedPattern.slice(tokenIndex + ':slug'.length);
    if (!normalizedPath.startsWith(prefix) || (suffix && !normalizedPath.endsWith(suffix))) return null;

    const slugEnd = suffix ? normalizedPath.length - suffix.length : normalizedPath.length;
    const slug = normalizedPath.slice(prefix.length, slugEnd).replace(/^\/+|\/+$/g, '');
    if (!slug || slug.includes('/')) return null;

    try {
        return decodeURIComponent(slug);
    } catch {
        return slug;
    }
};

export const matchRealtyDetailRoute = (
    path: string,
    data?: Pick<RealtyListingsSectionData, 'detailRoutePattern'> | null
) => {
    const candidates = routeCandidates(resolveRealtyDetailRoutePattern(data), REALTY_DEFAULT_DETAIL_ROUTE_PATTERN);
    for (const pattern of candidates) {
        const slug = matchDetailPattern(path, pattern);
        if (slug) return slug;
    }
    return null;
};

const firstPathSegment = (route: string) => route.replace(/^\//, '').split('/')[0] || '';

export const getRealtyRouteSegments = (data?: Pick<RealtyListingsSectionData, 'directoryRoute' | 'detailRoutePattern'> | null) => {
    const segments = [
        ...REALTY_DEFAULT_ROUTE_SEGMENTS,
        firstPathSegment(resolveRealtyDirectoryRoute(data)),
        firstPathSegment(resolveRealtyDetailRoutePattern(data)),
    ].filter(Boolean);

    return Array.from(new Set(segments));
};
