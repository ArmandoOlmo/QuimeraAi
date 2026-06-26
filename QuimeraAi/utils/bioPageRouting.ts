const BIO_PAGE_ROUTE_PREFIX = '/bio/';

function stripQueryAndHash(pathname: string): string {
    return pathname.split(/[?#]/)[0] || '';
}

function decodePathSegment(segment: string): string | null {
    try {
        return decodeURIComponent(segment);
    } catch {
        return null;
    }
}

export function getBioSlugFromPathname(pathname: string): string {
    const pathOnly = stripQueryAndHash(String(pathname || '').trim());
    const normalizedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

    if (!normalizedPath.startsWith(BIO_PAGE_ROUTE_PREFIX)) return '';

    const rawSegment = normalizedPath
        .slice(BIO_PAGE_ROUTE_PREFIX.length)
        .split('/')
        .find(segment => Boolean(segment.trim()));

    if (!rawSegment) return '';

    const decodedSegment = decodePathSegment(rawSegment);
    if (!decodedSegment) return '';

    return decodedSegment
        .split('/')
        .find(segment => Boolean(segment.trim()))
        ?.trim() || '';
}
