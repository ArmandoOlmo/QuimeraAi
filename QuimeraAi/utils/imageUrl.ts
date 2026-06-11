export const LEGACY_REMOTE_IMAGE_HOSTS = [
    ['fire', 'basestorage.googleapis.com'].join(''),
    ['quimeraai.fire', 'basestorage.app'].join(''),
    'quimeraai.appspot.com',
];

export const normalizeImageUrl = (value: unknown): string => {
    if (!value) return '';

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') return '';
        return trimmed;
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return normalizeImageUrl(record.downloadURL || record.url || record.publicUrl || record.imageUrl);
    }

    return '';
};

export const isLegacyStorageUrl = (value: unknown): boolean => {
    const url = normalizeImageUrl(value).toLowerCase();
    return LEGACY_REMOTE_IMAGE_HOSTS.some(host => url.includes(host));
};

export const getUsableImageUrl = (value: unknown): string => {
    const url = normalizeImageUrl(value);
    return isLegacyStorageUrl(url) ? '' : url;
};
